import { promises as fs, Dirent } from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';

import { getUnsplashMediaDir, UNSPLASH_MISSING_DOWNLOADS_PATH } from '../config/paths';
import {
  buildOriginalImageKeys,
  createImageNameStore,
  createImageTagStore,
  filterBlacklistedTags,
  readImageTagBlacklist,
  translateImageTags,
} from './translation-stores';
import { getPhotoIdentifierCandidates, sanitizeSegment } from './utils';

const DEFAULT_UNSPLASH_ACCESS_KEY = 'FbJ_V9wfIxoSvB634Ls9akSrYcmJpHMduY5J3J14AoY';
const DEFAULT_UNSPLASH_SECRET_KEY = 'Flm3oVCDQV5xCjqDbJC7_dNENLNQlb7_mv55u6ODN4c';
const DEFAULT_BINARY_MIME_TYPE = 'application/octet-stream';
const DEFAULT_DOWNLOADS_DIR = path.resolve(process.env.HOME ?? '~', 'Downloads');
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

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

type DownloadSource = 'api' | 'downloads';

export type MediaMetadata = {
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
  tier: Tier;
  downloadSource: DownloadSource;
};

type DownloadRegistrationResult = {
  ok: boolean;
  status: number | null;
  url: string | null;
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
      '  pnpm run unsplash:pull -- --url <https://unsplash.com/photos/...> [--out <шлях>] [--downloads <шлях>] [--keep]',
      '',
      'Параметри:',
      '  --url, -u          Повний URL фото на Unsplash.',
      '  --out, -o          Каталог призначення. За замовчуванням library/unsplash/<slug>.',
      '  --downloads, -d    Каталог, де шукати ручні завантаження (дефолт — ~/Downloads).',
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
    let details = '';
    try {
      const bodyText = await response.text();
      if (bodyText) {
        details = ` Деталі: ${bodyText}`;
      }
    } catch {
      // ignore
    }
    throw new Error(
      `Unsplash API повернув ${response.status} ${response.statusText} для photo ${photoId}.${details}`
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

async function registerDownload(downloadLocation: string, accessKey: string): Promise<DownloadRegistrationResult> {
  try {
    const response = await fetch(withClientId(downloadLocation, accessKey));
    const status = response.status;
    if (!response.ok) {
      return { ok: false, status, url: null };
    }
    const payload = (await response.json()) as { url?: string };
    return { ok: true, status, url: typeof payload.url === 'string' ? payload.url : null };
  } catch {
    return { ok: false, status: null, url: null };
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

function pickAssetId(photo: UnsplashPhoto, downloadUrl: string): string | null {
  return (
    extractAssetId(photo.urls.raw) ||
    extractAssetId(photo.urls.full) ||
    extractAssetId(photo.urls.regular) ||
    extractAssetId(downloadUrl)
  );
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

async function downloadMedia(url: string, targetDir: string, slug: string): Promise<DownloadedFile> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Не вдалося завантажити медіа-файл (${response.status} ${response.statusText}).`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const mimeType = response.headers.get('content-type');
  const extension = guessExtension(mimeType, url);
  const safeSlug = sanitizeSegment(slug);
  const fileName = `${safeSlug}.${extension}`;
  const destination = path.join(targetDir, fileName);
  await fs.writeFile(destination, buffer);

  return {
    relativePath: fileName,
    size: buffer.length,
    mimeType: mimeType ?? DEFAULT_BINARY_MIME_TYPE,
  };
}

async function tryReplaceWithManualDownload(
  photo: UnsplashPhoto,
  downloadUrl: string,
  downloadsDir: string,
  targetPath: string,
  slug: string
): Promise<boolean> {
  const assetId = pickAssetId(photo, downloadUrl);
  const needles = [assetId, photo.slug, photo.id, slug].filter(Boolean) as string[];

  if (needles.length === 0) {
    console.log('  ↳ Фолбек: не вдалося визначити жоден ідентифікатор для пошуку у Downloads.');
    return false;
  }

  const match = await findDownloadedFile(needles, downloadsDir);
  if (!match) {
    console.log(
      `  ↳ Фолбек: у ${downloadsDir} немає файлів, що містять ${needles.map(n => `"${n}"`).join(', ')} у назві.`
    );
    return false;
  }

  await fs.copyFile(match.path, targetPath);
  console.log(`  ↳ Фолбек: замінено на локальний файл із Downloads (${match.name}, ${match.size} байт).`);
  return true;
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

function buildMetadata(
  photo: UnsplashPhoto,
  name: string,
  tags: string[],
  keys: string[],
  tier: Tier,
  downloadSource: DownloadSource
): MediaMetadata {
  return {
    slug: sanitizeSegment(photo.slug || photo.id),
    name,
    category: 'Зображення',
    source: photo.links.html,
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
}

async function main(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));
    const accessKey = ensureAccessKey();
    ensureSecretKey();
    const identifierCandidates = getPhotoIdentifierCandidates(options.url);
    let photo: UnsplashPhoto | null = null;
    let usedIdentifier: string | null = null;
    let lastError: Error | null = null;

    for (const candidate of identifierCandidates) {
      try {
        photo = await fetchPhoto(candidate, accessKey);
        usedIdentifier = candidate;
        break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    if (!photo) {
      throw lastError ?? new Error('Не вдалося завантажити метадані фото.');
    }

    console.log(`Фото: ${usedIdentifier ?? photo.slug ?? photo.id}`);

    const slug = sanitizeSegment(photo.slug || photo.id);
    const outputDir = path.resolve(options.outputDir ?? getUnsplashMediaDir(slug));

    console.log(`Цільовий каталог: ${outputDir}`);
    await ensureDirectory(outputDir, options.clean);
    const downloadsDir = resolveDownloadsDir(options.downloadsDir);

    const tagStore = await createImageTagStore();
    const nameStore = await createImageNameStore();
    const tagBlacklist = await readImageTagBlacklist();

    const downloadAttempt = await registerDownload(photo.links.download_location, accessKey);
    let tier: Tier = 'free';
    let downloadSource: DownloadSource = 'api';
    let usedFallback = false;
    let downloadUrl = downloadAttempt.ok ? downloadAttempt.url : null;

    if (!downloadUrl) {
      tier = 'plus';
      usedFallback = true;
      if (!downloadAttempt.ok) {
        console.log(
          `Основний download_location недоступний (${downloadAttempt.status ?? 'невідомо'}), переходимо у фолбек.`
        );
      }
      downloadUrl =
        photo.urls.raw ??
        photo.urls.full ??
        photo.urls.regular ??
        photo.links.download;
    }

    if (!downloadUrl) {
      throw new Error('Не вдалося визначити URL для завантаження зображення.');
    }

    const file = await downloadMedia(downloadUrl, outputDir, slug);
    if (usedFallback) {
      const targetPath = path.join(outputDir, file.relativePath);
      const replaced = await tryReplaceWithManualDownload(photo, downloadUrl, downloadsDir, targetPath, slug);
      if (!replaced) {
        console.log('  ↳ Фолбек: локальний файл не знайдено, залишено копію з API (можливо з водяним знаком).');
        await appendMissingDownload(options.url);
      } else {
        downloadSource = 'downloads';
        await removeMissingDownload(options.url);
      }
    } else {
      await removeMissingDownload(options.url);
    }

    const rawTags = collectTags(photo);
    const filteredTags = filterBlacklistedTags(rawTags, tagBlacklist);
    const uniqueFilteredTags = dedupeStrings(filteredTags, tag => tag.toLowerCase());
    const translatedTags = translateImageTags(uniqueFilteredTags, tagStore);
    const uniqueTranslatedTags = dedupeStrings(translatedTags, tag => tag.toLowerCase());
    const keys = buildOriginalImageKeys(uniqueFilteredTags);
    const defaultName = buildDefaultName(photo);
    const translatedName = nameStore.resolve(slug, defaultName);
    const meta = buildMetadata(photo, translatedName, uniqueTranslatedTags, keys, tier, downloadSource);
    const metaPath = path.join(outputDir, 'media-meta.json');
    await fs.writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf-8');

    await Promise.all([tagStore.writeMissingRecords(), nameStore.writeMissingRecords()]);

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
