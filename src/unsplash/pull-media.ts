import { randomUUID } from 'node:crypto';
import { promises as fs, Dirent } from 'node:fs';
import path from 'node:path';

import { getUnsplashMediaDir, UNSPLASH_MISSING_DOWNLOADS_PATH, UnsplashMediaKind } from '../config/paths';
import {
  createImageNameStore,
  createImageTagStore,
  filterBlacklistedTags,
  readImageTagBlacklist,
  translateImageTags,
} from './translation-stores';
import { resolveForcedLibraryKind } from './library-overrides';
import { getPhotoIdentifierCandidates, sanitizeSegment } from './utils';

const DEFAULT_BINARY_MIME_TYPE = 'application/octet-stream';
const DEFAULT_DOWNLOADS_DIR = path.resolve(process.env.HOME ?? '~', 'Downloads');
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.svg']);
const CATEGORY_BY_KIND: Record<UnsplashMediaKind, string> = {
  image: 'Зображення',
  illustration: 'Ілюстрації',
  pattern: 'Патерни',
};

type CliOptions = {
  url: string;
  outputDir?: string;
  downloadsDir?: string;
  clean: boolean;
};

type Tier = 'free' | 'plus';

type UnsplashPhoto = {
  id: string;
  slug: string;
  description: string | null;
  alt_description: string | null;
  width: number;
  height: number;
  color: string | null;
  blur_hash?: string | null;
  created_at?: string;
  updated_at?: string;
  asset_type?: string;
  premium?: boolean;
  plus?: boolean;
  urls: {
    raw?: string;
    full?: string;
    regular?: string;
    small?: string;
  };
  links: {
    html: string;
    download: string;
    download_location: string;
  };
  tags?: Array<{ title?: string }>;
  tags_preview?: Array<{ title?: string }>;
  user: {
    name?: string;
    username?: string;
    links?: { html?: string };
    portfolio_url?: string | null;
  };
};

type DownloadedFile = {
  relativePath: string;
  size: number;
  mimeType: string;
};

type DownloadSource = 'downloads';

export type MediaMetadata = {
  slug: string;
  mediaKey: string;
  name: string;
  seriesId?: string;
  category: string;
  source: string;
  sourceName?: string;
  authorName?: string;
  authorUrl?: string;
  description?: string;
  keys: string[];
  tags: string[];
  licenseName: string;
  licenseUrl: string;
  tier: Tier;
  downloadSource: DownloadSource;
};

function showUsage(): void {
  console.log(
    [
      'Використання (внутрішній скрипт unsplash:pull-library):',
      '  ts-node src/unsplash/pull-media.ts -- --url <https://unsplash.com/photos/...> [--out <шлях>] [--downloads <шлях>] [--keep]',
      '',
      'Параметри:',
      '  --url, -u          Повний URL фото на Unsplash.',
      '  --out, -o          Каталог призначення. За замовчуванням library/unsplash/<slug>.',
      '  --downloads, -d    Каталог з вже завантаженими вручну файлами (дефолт — ~/Downloads).',
      '  --keep             Не очищати теку перед експортом (файли будуть перезаписані).',
    ].join('\n')
  );
}

function parseArgs(argv: string[]): CliOptions {
  let url = '';
  let outputDir: string | undefined;
  let downloadsDir: string | undefined;
  let clean = true;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--url':
      case '-u': {
        const value = argv[index + 1];
        if (!value) {
          throw new Error('Потрібно вказати URL після прапорця --url.');
        }
        url = value;
        index += 1;
        break;
      }
      case '--out':
      case '-o': {
        const value = argv[index + 1];
        if (!value) {
          throw new Error('Потрібно вказати шлях після прапорця --out.');
        }
        outputDir = value;
        index += 1;
        break;
      }
      case '--downloads':
      case '-d': {
        const value = argv[index + 1];
        if (!value) {
          throw new Error('Потрібно вказати шлях після прапорця --downloads.');
        }
        downloadsDir = value;
        index += 1;
        break;
      }
      case '--keep': {
        clean = false;
        break;
      }
      case '--help':
      case '-h': {
        showUsage();
        process.exit(0);
      }
      case '--': {
        break;
      }
      default: {
        if (!url && !arg.startsWith('-')) {
          url = arg;
        } else {
          throw new Error(`Невідомий аргумент "${arg}".`);
        }
      }
    }
  }

  if (!url) {
    throw new Error('Необхідно вказати URL фото на Unsplash (наприклад, --url https://unsplash.com/photos/eV180K41pFs).');
  }

  return { url, outputDir, downloadsDir, clean };
}

async function fetchPhotoNapi(identifier: string): Promise<UnsplashPhoto> {
  const response = await fetch(`https://unsplash.com/napi/photos/${identifier}`);
  if (!response.ok) {
    throw new Error(`Unsplash napi повернув ${response.status} ${response.statusText} для ${identifier}.`);
  }
  return (await response.json()) as UnsplashPhoto;
}

function resolveDownloadsDir(customDir?: string): string {
  return path.resolve(customDir || DEFAULT_DOWNLOADS_DIR);
}

async function ensureDirectory(targetDir: string, clean: boolean): Promise<void> {
  if (clean) {
    const resolved = path.resolve(targetDir);
    const root = path.parse(resolved).root;
    if (resolved === root) {
      throw new Error('Неможливо очистити кореневу директорію файлової системи.');
    }
    await fs.rm(resolved, { recursive: true, force: true });
  }
  await fs.mkdir(targetDir, { recursive: true });
}

function extractAssetId(urlString?: string | null): string | null {
  if (!urlString) {
    return null;
  }
  try {
    const parsed = new URL(urlString);
    const lastSegment = parsed.pathname.split('/').filter(Boolean).pop();
    if (!lastSegment) {
      return null;
    }
    const clean = lastSegment.split('.')[0];
    return clean || null;
  } catch {
    return null;
  }
}

async function findDownloadedFile(
  needles: string[],
  downloadsDir: string
): Promise<{ path: string; size: number; name: string } | null> {
  const matches: Array<{ path: string; size: number; name: string }> = [];
  const queue: string[] = [downloadsDir];
  const normalizedNeedles = needles.map(value => value.toLowerCase());

  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) {
      break;
    }
    let entries: Dirent[];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        continue;
      }
      throw error;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      if (!IMAGE_EXTENSIONS.has(ext)) {
        continue;
      }
      const normalizedName = entry.name.toLowerCase();
      if (!normalizedNeedles.some(needle => normalizedName.includes(needle))) {
        continue;
      }
      try {
        const stat = await fs.stat(fullPath);
        matches.push({ path: fullPath, size: stat.size, name: entry.name });
      } catch {
        // ignore files that disappeared
      }
    }
  }

  if (matches.length === 0) {
    return null;
  }
  matches.sort((a, b) => b.size - a.size);
  return matches[0];
}

function normalizeUrlForList(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return rawUrl.trim();
  }
}

async function appendMissingDownload(url: string): Promise<void> {
  const normalized = normalizeUrlForList(url);
  try {
    const existing = await fs.readFile(UNSPLASH_MISSING_DOWNLOADS_PATH, 'utf-8');
    const lines = new Set(
      existing
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
    );
    if (lines.has(normalized)) {
      return;
    }
    lines.add(normalized);
    const content = `${Array.from(lines).join('\n')}\n`;
    await fs.writeFile(UNSPLASH_MISSING_DOWNLOADS_PATH, content, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      await fs.writeFile(UNSPLASH_MISSING_DOWNLOADS_PATH, `${normalized}\n`, 'utf-8');
      return;
    }
    throw error;
  }
}

async function removeMissingDownload(url: string): Promise<void> {
  const normalized = normalizeUrlForList(url);
  try {
    const existing = await fs.readFile(UNSPLASH_MISSING_DOWNLOADS_PATH, 'utf-8');
    const lines = existing
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);
    const filtered = lines.filter(line => line !== normalized);
    if (filtered.length === lines.length) {
      return;
    }
    const content = filtered.length > 0 ? `${filtered.join('\n')}\n` : '';
    await fs.writeFile(UNSPLASH_MISSING_DOWNLOADS_PATH, content, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    throw error;
  }
}

function decideTier(photo: UnsplashPhoto, fallbackTier: Tier): Tier {
  if (photo.premium || photo.plus) {
    return 'plus';
  }
  return fallbackTier;
}

function collectTags(photo: UnsplashPhoto): string[] {
  const buckets = [
    photo.tags?.map(tag => tag.title ?? '').filter(Boolean) ?? [],
    photo.tags_preview?.map(tag => tag.title ?? '').filter(Boolean) ?? [],
  ];
  const merged = buckets.flat().map(tag => tag.trim()).filter(tag => tag.length > 0);
  return Array.from(new Set(merged));
}

function dedupeStrings(values: string[], normalize: (value: string) => string = value => value): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const key = normalize(value);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(value);
  }
  return result;
}

function buildDefaultName(photo: UnsplashPhoto): string {
  return (
    photo.description?.trim() ||
    photo.alt_description?.trim() ||
    photo.slug?.trim() ||
    photo.id
  );
}

async function readExistingMetadata(dir: string): Promise<MediaMetadata | null> {
  const metaPath = path.join(dir, 'media-meta.json');
  try {
    const raw = await fs.readFile(metaPath, 'utf-8');
    return JSON.parse(raw) as MediaMetadata;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function buildMetadata(
  photo: UnsplashPhoto,
  name: string,
  tags: string[],
  keys: string[],
  tier: Tier,
  downloadSource: DownloadSource,
  category: string,
  existingMediaKey?: string,
  existingSeriesId?: string
): MediaMetadata {
  const meta: MediaMetadata = {
    slug: sanitizeSegment(photo.slug || photo.id),
    mediaKey: existingMediaKey ?? randomUUID(),
    name,
    category,
    source: photo.links.html,
    sourceName: 'Unsplash',
    authorName: photo.user.name?.trim(),
    authorUrl: photo.user.links?.html,
    description: photo.description ?? undefined,
    keys,
    tags,
    licenseName: 'Unsplash License',
    licenseUrl: 'https://unsplash.com/license',
    tier,
    downloadSource,
  };
  if (existingSeriesId) {
    meta.seriesId = existingSeriesId;
  }
  return meta;
}

async function main(): Promise<void> {
  let lastUrl = '';
  try {
    const options = parseArgs(process.argv.slice(2));
    lastUrl = options.url;
    const identifierCandidates = getPhotoIdentifierCandidates(options.url);
    let photo: UnsplashPhoto | null = null;
    let usedIdentifier: string | null = null;
    let lastError: Error | null = null;

    for (const candidate of identifierCandidates) {
      try {
        photo = await fetchPhotoNapi(candidate);
        usedIdentifier = candidate;
        break;
      } catch (napiError) {
        lastError = napiError instanceof Error ? napiError : new Error(String(napiError));
      }
    }

    if (!photo) {
      throw lastError ?? new Error('Не вдалося завантажити метадані фото.');
    }

    console.log(`Фото: ${usedIdentifier ?? photo.slug ?? photo.id}`);

    const isIllustration = photo.asset_type === 'illustration' || photo.links.html.includes('/illustrations/');
    const slug = sanitizeSegment(photo.slug || photo.id);
    const forcedKind = await resolveForcedLibraryKind(slug);
    const libraryKind: UnsplashMediaKind = forcedKind ?? (isIllustration ? 'illustration' : 'image');
    const outputDir = path.resolve(options.outputDir ?? getUnsplashMediaDir(slug, libraryKind));
    const previousMeta = await readExistingMetadata(outputDir);

    console.log(`Цільовий каталог: ${outputDir}`);
    await ensureDirectory(outputDir, options.clean);
    const downloadsDir = resolveDownloadsDir(options.downloadsDir);

    const tagStore = await createImageTagStore();
    const nameStore = await createImageNameStore();
    const tagBlacklist = await readImageTagBlacklist();

    const tier: Tier = decideTier(photo, 'free');
    const downloadSource: DownloadSource = 'downloads';
    const needles = [
      extractAssetId(photo.urls.raw),
      extractAssetId(photo.urls.full),
      extractAssetId(photo.urls.regular),
      photo.slug,
      photo.id,
      slug,
    ].filter(Boolean) as string[];
    const match = await findDownloadedFile(needles, downloadsDir);
    if (!match) {
      console.log('  ↳ Локальний файл у Downloads не знайдено — пропущено.');
      await appendMissingDownload(options.url);
      throw new Error('Потрібен локальний файл у Downloads.');
    }
    const ext = path.extname(match.name) || '.jpg';
    const targetName = `${slug}${ext}`;
    const targetPath = path.join(outputDir, targetName);
    await fs.copyFile(match.path, targetPath);
    const file: DownloadedFile = {
      relativePath: targetName,
      size: (await fs.stat(targetPath)).size,
      mimeType: DEFAULT_BINARY_MIME_TYPE,
    };
    await removeMissingDownload(options.url);

    const rawTags = dedupeStrings(collectTags(photo), tag => tag.toLowerCase());
    const filteredTags = filterBlacklistedTags(rawTags, tagBlacklist);
    const translatedTags = filteredTags.map(tag => tagStore.resolve(tag, tag));
    const uniqueTranslatedTags = dedupeStrings(translatedTags, tag => tag.toLowerCase());
    const translatedTagSet = new Set(uniqueTranslatedTags.map(tag => tag.toLowerCase()));
    const keys = dedupeStrings(
      rawTags
        .flatMap(tag => [tag, tagStore.resolve(tag, tag)])
        .filter(tag => !translatedTagSet.has(tag.toLowerCase())),
      val => val.toLowerCase()
    ).sort((a, b) => a.localeCompare(b, 'uk'));
    const defaultName = buildDefaultName(photo);
    const translatedName = nameStore.resolve(slug, defaultName);
    const category = CATEGORY_BY_KIND[libraryKind];
    const meta = buildMetadata(
      photo,
      translatedName,
      uniqueTranslatedTags,
      keys,
      tier,
      downloadSource,
      category,
      previousMeta?.mediaKey,
      previousMeta?.seriesId
    );
    const metaPath = path.join(outputDir, 'media-meta.json');
    await fs.writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf-8');

    await Promise.all([tagStore.writeMissingRecords(), nameStore.writeMissingRecords()]);

    console.log(
      `Готово: збережено ${file.relativePath} (${file.mimeType ?? 'невідомий формат'}, ${file.size} байт) та media-meta.json.`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (lastUrl) {
      try {
        await appendMissingDownload(lastUrl);
      } catch {
        // ignore logging failure
      }
    }
    console.error(`Помилка: ${message}`);
    showUsage();
    process.exit(1);
  }
}

void main();
