import { promises as fs } from 'node:fs';
import path from 'node:path';
import { markMediaPendingForMetadata } from '../media-import/media-sync-state';

import { getPexelsMediaDir, MEDIA_COLLECTION_REGISTRY_PATH, PEXELS_IMAGES_ROOT } from '../config/paths';
import { loadMediaCollectionRegistry, type MediaCollectionDefinition } from '../media-import/media-collections';
import { buildCategory, readExistingMetadata, type MediaMetadata } from '../unsplash/import-utils';
import { MEDIA_META_FILE } from '../unsplash/library-paths';
import { assertImageDisplayNames } from '../media-import/image-name-validation';
import { prepareStoredRaster } from '../media-import/lossless-raster';
import { isPexelsAuthorBlacklisted, readPexelsAuthorBlacklist } from './author-blacklist';

const API_ROOT = 'https://api.pexels.com/v1';
const PAGE_SIZE = 80;
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

export type PexelsPhoto = {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer?: string;
  photographer_url?: string;
  alt?: string | null;
  src: { original: string };
  type?: string;
};

type CollectionPage = {
  id: string;
  media: PexelsPhoto[];
  next_page?: string;
};

type CollectionMapping = {
  collectionId: string;
  collectionSlugs: string[];
  collections: MediaCollectionDefinition[];
};

type CliOptions = {
  collection?: string;
  limitPerCollection?: number;
};

type CollectedPhoto = {
  photo: PexelsPhoto;
  collectionSlugs: Set<string>;
};

function parseArgs(argv: string[]): CliOptions {
  let collection: string | undefined;
  let limitPerCollection: number | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--collection' || arg === '-c') {
      collection = argv[index + 1]?.trim();
      if (!collection) throw new Error('Потрібно вказати внутрішній slug після --collection.');
      index += 1;
    } else if (arg === '--limit-per-collection') {
      const raw = argv[index + 1];
      const value = raw ? Number(raw) : Number.NaN;
      if (!Number.isInteger(value) || value < 1) throw new Error(`Некоректне значення --limit-per-collection: "${raw}".`);
      limitPerCollection = value;
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      console.log([
        'Використання:',
        '  pnpm run pexels:pull-collections [--collection <slug>] [--limit-per-collection <n>]',
        '',
        'Завантажує фото з усіх зіставлених Pexels-колекцій або з однієї внутрішньої колекції.',
        'Без --limit-per-collection команда імпортує всі доступні фото.',
      ].join('\n'));
      process.exit(0);
    } else if (arg === '--') {
      continue;
    } else {
      throw new Error(`Невідомий аргумент "${arg}".`);
    }
  }
  return { collection, limitPerCollection };
}

function getCollectionMappings(
  registry: Awaited<ReturnType<typeof loadMediaCollectionRegistry>>,
  selectedSlug?: string,
): CollectionMapping[] {
  const selected = selectedSlug
    ? [registry.get(selectedSlug)].filter((item): item is MediaCollectionDefinition => Boolean(item))
    : [...registry.values()];
  if (selectedSlug && selected.length === 0) throw new Error(`Не знайдено внутрішню колекцію "${selectedSlug}".`);

  const grouped = new Map<string, MediaCollectionDefinition[]>();
  for (const collection of selected) {
    if (collection.category !== 'images') continue;
    for (const link of collection.providerCollections ?? []) {
      if (link.provider !== 'pexels') continue;
      const matches = grouped.get(link.collectionId) ?? [];
      matches.push(collection);
      grouped.set(link.collectionId, matches);
    }
  }
  if (selectedSlug && grouped.size === 0) throw new Error(`Колекція "${selectedSlug}" не має Pexels-мапінгу.`);
  return [...grouped].map(([collectionId, collections]) => ({
    collectionId,
    collections,
    collectionSlugs: collections.map(collection => collection.slug),
  }));
}

async function fetchCollectionPage(collectionId: string, page: number, apiKey: string): Promise<CollectionPage> {
  const url = new URL(`${API_ROOT}/collections/${encodeURIComponent(collectionId)}`);
  url.searchParams.set('type', 'photos');
  url.searchParams.set('per_page', String(PAGE_SIZE));
  url.searchParams.set('page', String(page));
  const response = await fetch(url, { headers: { Authorization: apiKey, Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());
  }
  const payload = await response.json() as CollectionPage;
  if (!Array.isArray(payload.media)) throw new Error('API повернув відповідь колекції без масиву media.');
  return payload;
}

async function preflightCollections(
  mappings: CollectionMapping[],
  apiKey: string,
): Promise<Map<string, CollectionPage>> {
  const firstPages = new Map<string, CollectionPage>();
  const unavailable: string[] = [];
  for (const mapping of mappings) {
    try {
      firstPages.set(mapping.collectionId, await fetchCollectionPage(mapping.collectionId, 1, apiKey));
      console.log(`  ✓ ${mapping.collectionSlugs.join(', ')} (${mapping.collectionId})`);
    } catch (error) {
      unavailable.push(`  • ${mapping.collectionSlugs.join(', ')} (${mapping.collectionId}): ${(error as Error).message}`);
    }
  }
  if (unavailable.length > 0) {
    throw new Error(`Pexels не надав доступ до колекцій. Завантаження не починалося:\n${unavailable.join('\n')}`);
  }
  return firstPages;
}

function isPhoto(value: PexelsPhoto): boolean {
  return typeof value.id === 'number' && (!value.type || value.type.toLowerCase() === 'photo');
}

async function collectPhotos(
  mappings: CollectionMapping[],
  firstPages: Map<string, CollectionPage>,
  apiKey: string,
  authorBlacklist: ReadonlySet<string>,
  limitPerCollection?: number,
): Promise<{ photos: Map<number, CollectedPhoto>; blocked: number }> {
  const photos = new Map<number, CollectedPhoto>();
  let blocked = 0;
  for (const mapping of mappings) {
    let page = 1;
    let collectedInCollection = 0;
    let response = firstPages.get(mapping.collectionId);
    while (response) {
      for (const photo of response.media) {
        if (!isPhoto(photo) || !photo.src?.original || !photo.url) continue;
        if (limitPerCollection && collectedInCollection >= limitPerCollection) break;
        collectedInCollection += 1;
        if (isPexelsAuthorBlacklisted({ photographer: photo.photographer, photographer_url: photo.photographer_url }, authorBlacklist)) {
          blocked += 1;
          continue;
        }
        const item = photos.get(photo.id) ?? { photo, collectionSlugs: new Set<string>() };
        for (const slug of mapping.collectionSlugs) item.collectionSlugs.add(slug);
        photos.set(photo.id, item);
      }
      if (!response.next_page || (limitPerCollection && collectedInCollection >= limitPerCollection)) break;
      page += 1;
      response = await fetchCollectionPage(mapping.collectionId, page, apiKey);
      console.log(`  Отримано сторінку ${page}: ${mapping.collectionSlugs.join(', ')}`);
    }
    console.log(`  Фото у ${mapping.collectionSlugs.join(', ')}: ${collectedInCollection}`);
  }
  return { photos, blocked };
}

function extFromContentType(contentType: string): string | null {
  const type = contentType.split(';', 1)[0].trim().toLowerCase();
  if (type === 'image/jpeg' || type === 'image/jpg') return '.jpeg';
  if (type === 'image/png') return '.png';
  if (type === 'image/webp') return '.webp';
  if (type === 'image/avif') return '.avif';
  return null;
}

async function findExistingOriginal(dir: string, slug: string): Promise<string | null> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
  const entry = entries.find(item => item.isFile()
    && item.name.startsWith(`${slug}.`)
    && IMAGE_EXTENSIONS.has(path.extname(item.name).toLowerCase()));
  return entry ? path.join(dir, entry.name) : null;
}

export async function saveOriginal(photo: PexelsPhoto, dir: string, slug: string, fetcher: typeof fetch = fetch): Promise<{ width: number; height: number; mimeType: string }> {
  const sourceUrl = new URL(photo.src.original);
  if (sourceUrl.protocol !== 'https:' || sourceUrl.hostname !== 'images.pexels.com') {
    throw new Error(`Некоректний домен оригіналу для Pexels photo ${photo.id}.`);
  }
  const response = await fetcher(sourceUrl);
  if (!response.ok) throw new Error(`Не вдалося завантажити Pexels photo ${photo.id}: HTTP ${response.status}.`);
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('image/')) {
    throw new Error(`Pexels photo ${photo.id} повернув не зображення (${contentType || 'невідомий тип'}).`);
  }
  const urlExt = path.extname(sourceUrl.pathname).toLowerCase();
  const ext = IMAGE_EXTENSIONS.has(urlExt) ? urlExt : extFromContentType(contentType);
  if (!ext) throw new Error(`Непідтримуваний формат оригіналу Pexels photo ${photo.id}.`);

  const asset = await prepareStoredRaster(Buffer.from(await response.arrayBuffer()), `${slug}${ext}`);
  await fs.mkdir(dir, { recursive: true });
  const target = path.join(dir, `${slug}${asset.extension}`);
  const temp = `${target}.${process.pid}.tmp`;
  await fs.writeFile(temp, asset.buffer);
  try {
    await fs.rename(temp, target);
  } catch (error) {
    await fs.rm(temp, { force: true });
    throw error;
  }
  return { width: asset.width, height: asset.height, mimeType: asset.mimeType };
}

function buildDefaultName(photo: PexelsPhoto, slug: string): string {
  const pathName = new URL(photo.url).pathname.split('/').filter(Boolean).at(-1) ?? '';
  const words = pathName.replace(/-\d+\/?$/, '').replace(/[-_]+/g, ' ').trim();
  if (words) {
    const title = words.split(' ').slice(0, 10).map(word => word.toLowerCase());
    title[0] = `${title[0][0]?.toUpperCase() ?? ''}${title[0].slice(1)}`;
    return title.join(' ');
  }
  const alt = photo.alt?.trim().replace(/\s+/g, ' ');
  if (alt) return alt.split(' ').slice(0, 10).join(' ');
  throw new Error(`Pexels ${slug} не має змістовної англійської назви.`);
}

function buildMetadata(photo: PexelsPhoto, slug: string, collectionSlugs: string[], existing: MediaMetadata | null): MediaMetadata {
  const nameEn = existing?.i18n?.name?.en || buildDefaultName(photo, slug);
  const nameUk = existing?.i18n?.name?.uk || nameEn;
  const metadata: MediaMetadata = {
    slug,
    mediaKey: existing?.mediaKey ?? `pexels:${photo.id}`,
    i18n: {
      name: { en: nameEn, uk: nameUk },
      alt: {
        en: existing?.i18n?.alt?.en || photo.alt?.trim() || nameEn,
        uk: existing?.i18n?.alt?.uk || photo.alt?.trim() || nameEn,
      },
      tags: existing?.i18n?.tags ?? [],
      keywords: existing?.i18n?.keywords ?? { en: [], uk: [] },
    },
    category: buildCategory('image'),
    collectionSlugs: [...new Set(collectionSlugs)],
    pinned: existing?.pinned === true,
    source: photo.url,
    sourceName: 'Pexels',
    authorName: photo.photographer?.trim() || undefined,
    authorUrl: photo.photographer_url,
    licenseName: 'Pexels License',
    licenseUrl: 'https://www.pexels.com/license/',
    tier: 'free',
    downloadSource: 'pexels-api',
    taggingStatus: existing?.taggingStatus ?? 'pending',
    width: existing?.width ?? photo.width,
    height: existing?.height ?? photo.height,
  };
  assertImageDisplayNames(metadata, `Pexels "${slug}"`);
  return metadata;
}

async function main(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));
    const apiKey = process.env.PEXELS_API_KEY?.trim();
    if (!apiKey) throw new Error('Не задано PEXELS_API_KEY у середовищі scraper.');

    const registry = await loadMediaCollectionRegistry(MEDIA_COLLECTION_REGISTRY_PATH);
    const mappings = getCollectionMappings(registry, options.collection);
    if (mappings.length === 0) throw new Error('У реєстрі немає налаштованих Pexels-колекцій.');

    console.log(`Перевіряю доступність ${mappings.length} Pexels-колекцій через офіційний API...`);
    const firstPages = await preflightCollections(mappings, apiKey);
    console.log('Збираю перелік фото. До завершення збору файли бібліотеки не змінюватимуться.');
    const authorBlacklist = await readPexelsAuthorBlacklist();
    const { photos, blocked } = await collectPhotos(mappings, firstPages, apiKey, authorBlacklist, options.limitPerCollection);
    if (photos.size === 0) throw new Error('У доступних Pexels-колекціях не знайдено фото.');
    if (blocked > 0) console.log(`Відсіяно фото авторів із blacklist: ${blocked}.`);

    await fs.mkdir(PEXELS_IMAGES_ROOT, { recursive: true });
    let downloaded = 0;
    let skipped = 0;
    for (const [photoId, item] of photos) {
      const slug = `pexels-${photoId}`;
      const dir = getPexelsMediaDir(slug);
      if (await findExistingOriginal(dir, slug)) {
        skipped += 1;
        console.log(`  Пропущено локальне фото ${slug}.`);
        continue;
      }

      const existing = await readExistingMetadata(dir);
      const asset = await saveOriginal(item.photo, dir, slug);
      downloaded += 1;
      const metadata = buildMetadata(item.photo, slug, [...item.collectionSlugs], existing);
      metadata.width = asset.width;
      metadata.height = asset.height;
      metadata.mimeType = asset.mimeType;
      const metaPath = path.join(dir, MEDIA_META_FILE);
      const tempPath = `${metaPath}.${process.pid}.tmp`;
      await fs.writeFile(tempPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf-8');
      await fs.rename(tempPath, metaPath);
      await markMediaPendingForMetadata(metaPath, 'file');
      console.log(`  ${existing ? 'Оновлено колекції' : 'Імпортовано'} ${slug} → ${metadata.collectionSlugs?.join(', ')}`);
    }

    console.log(`Готово: ${photos.size} унікальних фото, завантажено ${downloaded}, пропущено наявних локально ${skipped}.`);
    console.log('Нові фото позначені як pending до візуального тегування; повторний запуск збереже готові теги.');
  } catch (error) {
    console.error(`Помилка імпорту Pexels: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

if (require.main === module) void main();
