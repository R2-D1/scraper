import { promises as fs, Dirent } from 'node:fs';
import path from 'node:path';
import { markMediaPendingForMetadata } from '../media-import/media-sync-state';

import { getUnsplashMediaDir, UNSPLASH_INTAKE_ROOT, UNSPLASH_MISSING_DOWNLOADS_PATH, UnsplashMediaKind } from '../config/paths';
import {
  createImageNameStore,
  createImageTagStore,
  filterBlacklistedTokens,
  readImageTagBlacklist,
  readImageTagKeyBlacklist,
  translateImageTags,
} from './translation-stores';
import { resolveForcedLibraryKind } from './library-overrides';
import {
  buildCategory,
  DownloadSource,
  Tier,
  UnsplashPhoto,
  buildDefaultName,
  buildMetadata,
  collectTags,
  decideTier,
  dedupeStrings,
  fetchPhoto,
  readExistingMetadata,
} from './import-utils';
import { assertImageDisplayNames } from '../media-import/image-name-validation';
import { storeUnsplashSource } from './store-source';
import { getPhotoIdentifierCandidates, sanitizeSegment } from './utils';
import { excludeTokens, splitTokens } from '../i18n/utils';
import { buildLocalizedTagEntries, extractTagLists } from './tag-utils';
import { isUnsplashAuthorBlacklisted, readUnsplashAuthorBlacklist } from './author-blacklist';

const DEFAULT_DOWNLOADS_DIR = UNSPLASH_INTAKE_ROOT;
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.svg']);
type CliOptions = {
  url: string;
  outputDir?: string;
  downloadsDir?: string;
  clean: boolean;
};

type DownloadedFile = {
  relativePath: string;
  size: number;
  mimeType: string;
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
      '  --downloads, -d    Каталог з вже завантаженими вручну файлами (дефолт — intake/unsplash).',
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
        photo = await fetchPhoto(candidate);
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
    if (isUnsplashAuthorBlacklisted(photo.user, await readUnsplashAuthorBlacklist())) {
      await removeMissingDownload(options.url);
      console.log('  ↳ Пропущено: автор у blacklist.');
      return;
    }

    const isIllustration = photo.asset_type === 'illustration' || photo.links.html.includes('/illustrations/');
    const slug = sanitizeSegment(photo.slug || photo.id);
    const forcedKind = await resolveForcedLibraryKind(slug);
    const libraryKind: UnsplashMediaKind = forcedKind ?? (isIllustration ? 'illustration' : 'image');
    const outputDir = path.resolve(options.outputDir ?? getUnsplashMediaDir(slug, libraryKind));
    const previousMeta = await readExistingMetadata(outputDir);

    console.log(`Цільовий каталог: ${outputDir}`);
    await ensureDirectory(outputDir, options.clean);
    const downloadsDir = resolveDownloadsDir(options.downloadsDir);

    const [tagStore, nameStore, tagBlacklist, tagKeyBlacklist] = await Promise.all([
      createImageTagStore(),
      createImageNameStore(),
      readImageTagBlacklist(),
      readImageTagKeyBlacklist(),
    ]);

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
    const { name: targetName, raster } = await storeUnsplashSource(match.path, outputDir, slug);
    const targetPath = path.join(outputDir, targetName);
    const file: DownloadedFile = {
      relativePath: targetName,
      size: (await fs.stat(targetPath)).size,
      mimeType: raster?.mimeType ?? 'image/svg+xml',
    };
    await removeMissingDownload(options.url);

    const rawTags = dedupeStrings(collectTags(photo), tag => tag.toLowerCase());
    const filteredTags = filterBlacklistedTokens(rawTags, tagKeyBlacklist, tagBlacklist);
    const resolveTagTranslation = (tag: string): string => {
      const translation = tagStore.get(tag);
      if (!translation) {
        throw new Error(`Відсутній переклад для тегу "${tag}".`);
      }
      return translation;
    };
    const tagEntries = buildLocalizedTagEntries(filteredTags, resolveTagTranslation);
    const tagLists = extractTagLists(tagEntries);
    const translatedTagSet = new Set(tagLists.uk.map(tag => tag.toLowerCase()));
    const keySourceTokens = filterBlacklistedTokens(rawTags, tagKeyBlacklist);
    const keyCandidates = keySourceTokens
      .flatMap(tag => [tag, resolveTagTranslation(tag)])
      .filter(tag => !translatedTagSet.has(tag.toLowerCase()));
    const sanitizedKeyCandidates = filterBlacklistedTokens(keyCandidates, tagKeyBlacklist);
    const uniqueKeyCandidates = dedupeStrings(sanitizedKeyCandidates, val => val.toLowerCase());
    const keywordTokens = splitTokens(uniqueKeyCandidates);
    const keywordsEn = excludeTokens(keywordTokens.en, tagLists.en);
    const keywordsUk = excludeTokens(keywordTokens.uk, tagLists.uk);
    const defaultName = buildDefaultName(photo);
    const translatedName = nameStore.resolve(slug, defaultName);
    const category = buildCategory(libraryKind);
    const meta = buildMetadata(
      photo,
      {
        name: { en: defaultName, uk: translatedName },
        alt: { en: defaultName, uk: translatedName },
        tags: tagEntries,
        keywords: { en: keywordsEn, uk: keywordsUk },
      },
      category,
      tier,
      downloadSource,
      previousMeta
    );
    if (raster) {
      meta.width = raster.width;
      meta.height = raster.height;
      meta.mimeType = raster.mimeType;
    }
    assertImageDisplayNames(meta, `Unsplash "${slug}"`);
    const metaPath = path.join(outputDir, 'media-meta.json');
    await fs.writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf-8');
    await markMediaPendingForMetadata(metaPath, 'file');

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
