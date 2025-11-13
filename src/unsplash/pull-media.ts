import { promises as fs } from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';

import {
  ICON_TRANSLATIONS_ROOT,
  MISSING_KEY_TRANSLATIONS_DIR,
  MISSING_SYNONYMS_ROOT,
  getUnsplashMediaDir,
} from '../config/paths';
import {
  TranslationStore,
  mergeUniqueStringArrays,
  normalizeStringArrayValue,
  normalizeStringValue,
} from '../iconify/translation-manager';

const DEFAULT_UNSPLASH_ACCESS_KEY = 'FbJ_V9wfIxoSvB634Ls9akSrYcmJpHMduY5J3J14AoY';
const DEFAULT_UNSPLASH_SECRET_KEY = 'Flm3oVCDQV5xCjqDbJC7_dNENLNQlb7_mv55u6ODN4c';
const OPTIMIZED_IMAGE_MAX_WIDTH = 2400;
const OPTIMIZED_IMAGE_QUALITY = 82;
const DEFAULT_BINARY_MIME_TYPE = 'application/octet-stream';
const WEBP_EXTENSION = 'webp';
const WEBP_MIME_TYPE = 'image/webp';

type CliOptions = {
  url: string;
  outputDir?: string;
  clean: boolean;
};

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

type MediaMetadata = {
  slug: string;
  name: string;
  category: string;
  source: string;
  authorName?: string;
  authorUrl?: string;
  description?: string;
  keys: string[];
  tags: string[];
  licenseName: string;
  licenseUrl: string;
};

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

function showUsage(): void {
  console.log(
    [
      'Використання:',
      '  pnpm run unsplash:pull -- --url <https://unsplash.com/photos/...> [--out <шлях>] [--keep]',
      '',
      'Параметри:',
      '  --url, -u          Повний URL фото на Unsplash.',
      '  --out, -o          Каталог призначення. За замовчуванням library/unsplash/<slug>.',
      '  --keep             Не очищати теку перед експортом (файли будуть перезаписані).',
    ].join('\n')
  );
}

function parseArgs(argv: string[]): CliOptions {
  let url = '';
  let outputDir: string | undefined;
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

  return { url, outputDir, clean };
}

function sanitizeSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'media';
}

function extractPhotoIdFromUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`Невалідний URL: "${rawUrl}".`);
  }

  const segments = parsed.pathname.split('/').filter(Boolean);
  const photosIndex = segments.findIndex(segment => segment === 'photos' || segment === 'photo');
  if (photosIndex === -1 || photosIndex === segments.length - 1) {
    throw new Error('Не вдалося визначити ідентифікатор фото з URL.');
  }

  const candidate = segments[photosIndex + 1];
  if (!candidate) {
    throw new Error('Не вдалося визначити ідентифікатор фото з URL.');
  }
  const normalized = candidate.split('?')[0];
  const parts = normalized.split('-');
  const id = parts[parts.length - 1];
  if (!id || id.length < 6) {
    return normalized;
  }
  return id;
}

function ensureAccessKey(): string {
  const key = process.env.UNSPLASH_ACCESS_KEY?.trim() || DEFAULT_UNSPLASH_ACCESS_KEY;
  if (!key) {
    throw new Error('Не задано доступ до Unsplash API. Додайте UNSPLASH_ACCESS_KEY до середовища виконання.');
  }
  return key;
}

function ensureSecretKey(): string {
  const key = process.env.UNSPLASH_SECRET_KEY?.trim() || DEFAULT_UNSPLASH_SECRET_KEY;
  if (!key) {
    throw new Error('Не задано секрет Unsplash API. Додайте UNSPLASH_SECRET_KEY до середовища виконання.');
  }
  return key;
}

async function fetchPhoto(photoId: string, accessKey: string): Promise<UnsplashPhoto> {
  const response = await fetch(`https://api.unsplash.com/photos/${photoId}`, {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
      'Accept-Version': 'v1',
    },
  });
  if (!response.ok) {
    throw new Error(
      `Unsplash API повернув ${response.status} ${response.statusText} для photo ${photoId}.`
    );
  }

  const data = (await response.json()) as UnsplashPhoto;
  return data;
}

function withClientId(urlString: string, accessKey: string): string {
  const parsed = new URL(urlString);
  parsed.searchParams.set('client_id', accessKey);
  return parsed.toString();
}

async function registerDownload(downloadLocation: string, accessKey: string): Promise<string | null> {
  try {
    const response = await fetch(withClientId(downloadLocation, accessKey));
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as { url?: string };
    return typeof payload.url === 'string' ? payload.url : null;
  } catch {
    return null;
  }
}

function guessExtension(mime: string | null, fallbackUrl: string): string {
  if (mime) {
    const normalized = mime.split(';')[0]?.trim().toLowerCase();
    if (normalized && normalized in MIME_EXTENSION_MAP) {
      return MIME_EXTENSION_MAP[normalized];
    }
  }
  const urlWithoutQuery = fallbackUrl.split('?')[0];
  const match = urlWithoutQuery.match(/\.([a-z0-9]+)$/i);
  if (match) {
    return match[1].toLowerCase();
  }
  return 'jpg';
}

function tokenizeLabel(label: string): string[] {
  return label
    .split(/[^a-zA-Z0-9]+/g)
    .map(part => part.toLowerCase())
    .filter(part => part.length > 0);
}

type OptimizedImage = {
  buffer: Buffer;
  extension: string;
  mimeType: string;
};

async function optimizeImageBuffer(
  buffer: Buffer,
  mime: string | null,
  sourceUrl: string
): Promise<OptimizedImage> {
  if (!mime?.startsWith('image/')) {
    return {
      buffer,
      extension: guessExtension(mime, sourceUrl),
      mimeType: mime ?? DEFAULT_BINARY_MIME_TYPE,
    };
  }

  try {
    const optimizedBuffer = await sharp(buffer, { failOnError: false })
      .rotate()
      .resize({ width: OPTIMIZED_IMAGE_MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: OPTIMIZED_IMAGE_QUALITY })
      .toBuffer();

    return {
      buffer: optimizedBuffer,
      extension: WEBP_EXTENSION,
      mimeType: WEBP_MIME_TYPE,
    };
  } catch (error) {
    console.warn('⚠️  Не вдалося стиснути зображення, використовую оригінальний файл.', error);
    return {
      buffer,
      extension: guessExtension(mime, sourceUrl),
      mimeType: mime ?? DEFAULT_BINARY_MIME_TYPE,
    };
  }
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

async function downloadMedia(url: string, targetDir: string, slug: string): Promise<DownloadedFile> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Не вдалося завантажити медіа-файл (${response.status} ${response.statusText}).`);
  }

  const sourceBuffer = Buffer.from(await response.arrayBuffer());
  const optimized = await optimizeImageBuffer(sourceBuffer, response.headers.get('content-type'), url);
  const safeSlug = sanitizeSegment(slug);
  const fileName = `${safeSlug}.${optimized.extension}`;
  const destination = path.join(targetDir, fileName);
  await fs.writeFile(destination, optimized.buffer);

  return {
    relativePath: fileName,
    size: optimized.buffer.length,
    mimeType: optimized.mimeType,
  };
}

function collectTags(photo: UnsplashPhoto): string[] {
  const buckets = [
    photo.tags?.map(tag => tag.title ?? '').filter(Boolean) ?? [],
    photo.tags_preview?.map(tag => tag.title ?? '').filter(Boolean) ?? [],
  ];
  const merged = buckets.flat().map(tag => tag.trim()).filter(tag => tag.length > 0);
  return Array.from(new Set(merged));
}

async function createKeywordStores(): Promise<{
  keyStore: TranslationStore<string>;
  synonymStore: TranslationStore<string[]>;
}> {
  const [keyStore, synonymStore] = await Promise.all([
    TranslationStore.create<string>({
      masterPath: path.join(ICON_TRANSLATIONS_ROOT, 'key-translations.json'),
      missingDir: MISSING_KEY_TRANSLATIONS_DIR,
      chunkSize: 1000,
      normalizeValue: normalizeStringValue,
    }),
    TranslationStore.create<string[]>({
      masterPath: path.join(ICON_TRANSLATIONS_ROOT, 'synonyms.json'),
      missingDir: MISSING_SYNONYMS_ROOT,
      chunkSize: 500,
      normalizeValue: normalizeStringArrayValue,
      mergeValues: mergeUniqueStringArrays,
    }),
  ]);

  return { keyStore, synonymStore };
}

function buildKeysFromTags(
  rawTags: string[],
  keyStore: TranslationStore<string>,
  synonymStore: TranslationStore<string[]>
): string[] {
  const tokenSet = new Set<string>();
  rawTags.forEach(tag => tokenizeLabel(tag).forEach(token => tokenSet.add(token)));
  const englishTokens = Array.from(tokenSet).sort((a, b) => a.localeCompare(b, 'en'));

  const result = new Set<string>();
  for (const token of englishTokens) {
    if (!token) {
      continue;
    }
    result.add(token);
    const translated = keyStore.resolve(token, token);
    result.add(translated);
    synonymStore.resolve(token, [translated]).forEach(value => result.add(value));
  }

  return Array.from(result).sort((a, b) => a.localeCompare(b, 'uk'));
}

function buildMetadata(photo: UnsplashPhoto, tags: string[]): MediaMetadata {
  const name =
    photo.description?.trim() ||
    photo.alt_description?.trim() ||
    photo.slug?.trim() ||
    photo.id;

  return {
    slug: sanitizeSegment(photo.slug || photo.id),
    name,
    category: 'Зображення',
    source: photo.links.html,
    authorName: photo.user.name?.trim(),
    authorUrl: photo.user.links?.html,
    description: photo.description ?? undefined,
    keys: [],
    tags,
    licenseName: 'Unsplash License',
    licenseUrl: 'https://unsplash.com/license',
  };
}

async function main(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));
    const accessKey = ensureAccessKey();
    ensureSecretKey();
    const photoId = extractPhotoIdFromUrl(options.url);
    console.log(`Фото: ${photoId}`);

    const photo = await fetchPhoto(photoId, accessKey);
    const slug = sanitizeSegment(photo.slug || photo.id);
    const outputDir = path.resolve(options.outputDir ?? getUnsplashMediaDir(slug));

    console.log(`Цільовий каталог: ${outputDir}`);
    await ensureDirectory(outputDir, options.clean);

    const { keyStore, synonymStore } = await createKeywordStores();

    const downloadUrl =
      (await registerDownload(photo.links.download_location, accessKey)) ??
      photo.links.download ??
      photo.urls.full ??
      photo.urls.raw;
    if (!downloadUrl) {
      throw new Error('Не вдалося визначити URL для завантаження зображення.');
    }

    const file = await downloadMedia(downloadUrl, outputDir, slug);
    const rawTags = collectTags(photo);
    buildKeysFromTags(rawTags, keyStore, synonymStore);
    const meta = buildMetadata(photo, rawTags);
    const metaPath = path.join(outputDir, 'media-meta.json');
    await fs.writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf-8');

    await Promise.all([keyStore.writeMissingRecords(), synonymStore.writeMissingRecords()]);

    console.log(
      `Готово: збережено ${file.relativePath} (${file.mimeType ?? 'невідомий формат'}, ${file.size} байт) та media-meta.json.`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Помилка: ${message}`);
    showUsage();
    process.exit(1);
  }
}

void main();
