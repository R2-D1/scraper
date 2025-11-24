import { promises as fs, Dirent, Stats } from 'node:fs';
import path from 'node:path';

import { MEDIA_META_FILE, findMediaDir, listLibraryEntries } from './library-paths';
import { getPhotoIdentifierCandidates } from './utils';

const DEFAULT_UNSPLASH_ACCESS_KEY = 'FbJ_V9wfIxoSvB634Ls9akSrYcmJpHMduY5J3J14AoY';
const DEFAULT_DOWNLOADS_DIR = path.resolve(process.env.HOME ?? '~', 'Downloads');
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

type CliOptions = {
  downloadsDir: string;
  apply: boolean;
  onlySlug?: string;
};

type MediaMeta = {
  slug: string;
  source: string;
};

type UnsplashPhoto = {
  urls?: { raw?: string; full?: string; regular?: string };
  links?: { download?: string };
};

type IndexedFile = {
  path: string;
  name: string;
  size: number;
  ext: string;
};

function parseArgs(argv: string[]): CliOptions {
  let downloadsDir = DEFAULT_DOWNLOADS_DIR;
  let apply = false;
  let onlySlug: string | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--downloads':
      case '-d': {
        const next = argv[i + 1];
        if (!next) {
          throw new Error('Потрібно вказати шлях після --downloads.');
        }
        downloadsDir = path.resolve(next);
        i += 1;
        break;
      }
      case '--apply':
        apply = true;
        break;
      case '--only':
        onlySlug = argv[i + 1];
        if (!onlySlug) {
          throw new Error('Потрібно вказати slug після --only.');
        }
        i += 1;
        break;
      case '--help':
      case '-h':
        console.log(
          [
            'Використання:',
            '  pnpm ts-node --project tsconfig.json src/unsplash/replace-with-downloads.ts [--downloads <dir>] [--apply] [--only <slug>]',
            '',
            '  За замовчуванням працює у dry-run режимі (тільки показує відповідники).',
            '  --apply    — реально замінити файл у бібліотеці.',
            '  --only     — обробити лише конкретний slug із бібліотеки.',
          ].join('\n')
        );
        process.exit(0);
        break;
      case '--':
        break;
      default:
        throw new Error(`Невідомий аргумент "${arg}".`);
    }
  }

  return { downloadsDir, apply, onlySlug };
}

function ensureAccessKey(): string {
  return process.env.UNSPLASH_ACCESS_KEY?.trim() || DEFAULT_UNSPLASH_ACCESS_KEY;
}

async function fetchPhoto(identifier: string, accessKey: string): Promise<UnsplashPhoto> {
  const response = await fetch(`https://api.unsplash.com/photos/${identifier}`, {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
      'Accept-Version': 'v1',
    },
  });
  if (!response.ok) {
    throw new Error(`Unsplash API повернув ${response.status} ${response.statusText} для "${identifier}".`);
  }
  return (await response.json()) as UnsplashPhoto;
}

function extractAssetId(rawUrl?: string): string | null {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (!last) return null;
    const clean = last.split('.')[0];
    return clean || null;
  } catch {
    return null;
  }
}

async function readMeta(mediaDir: string): Promise<MediaMeta | null> {
  const metaPath = path.join(mediaDir, MEDIA_META_FILE);
  try {
    const raw = await fs.readFile(metaPath, 'utf-8');
    const meta = JSON.parse(raw) as MediaMeta;
    if (!meta.slug || !meta.source) {
      return null;
    }
    return meta;
  } catch {
    return null;
  }
}

async function listLibraryDirs(): Promise<Array<{ slug: string; dir: string }>> {
  const entries = await listLibraryEntries();
  return entries.map(entry => ({ slug: entry.slug, dir: entry.dir }));
}

async function walkDownloads(root: string): Promise<IndexedFile[]> {
  const results: IndexedFile[] = [];
  async function walk(dir: string): Promise<void> {
    let entries: Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return;
      }
      throw error;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      if (!IMAGE_EXTENSIONS.has(ext)) {
        continue;
      }
      let stat: Stats;
      try {
        stat = await fs.stat(fullPath);
      } catch {
        continue;
      }
      results.push({
        path: fullPath,
        name: entry.name,
        size: stat.size,
        ext,
      });
    }
  }

  await walk(root);
  return results;
}

function findExistingMediaFile(mediaDir: string): string | null {
  try {
    const entries = fs.readdirSync(mediaDir, { withFileTypes: true });
    const file = entries.find(
      entry => entry.isFile() && entry.name !== MEDIA_META_FILE && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
    );
    return file ? path.join(mediaDir, file.name) : null;
  } catch {
    return null;
  }
}

function chooseDownloadFile(assetId: string, downloadFiles: IndexedFile[]): IndexedFile | null {
  const normalized = assetId.toLowerCase();
  const matches = downloadFiles.filter(file => file.name.toLowerCase().includes(normalized));
  if (matches.length === 0) {
    return null;
  }
  matches.sort((a, b) => b.size - a.size);
  return matches[0];
}

async function copyFileWithLogging(source: string, destination: string, apply: boolean): Promise<void> {
  if (!apply) {
    console.log(`  ↳ dry-run: замінив би на ${source}`);
    return;
  }

  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(source, destination);
  console.log(`  ↳ замінено на ${source}`);
}

async function processEntry(
  slug: string,
  mediaDir: string,
  meta: MediaMeta,
  downloadFiles: IndexedFile[],
  accessKey: string,
  apply: boolean
): Promise<void> {
  const identifiers = getPhotoIdentifierCandidates(meta.source);
  let photo: UnsplashPhoto | null = null;
  let lastError: Error | null = null;

  for (const candidate of identifiers) {
    try {
      photo = await fetchPhoto(candidate, accessKey);
      break;
    } catch (error) {
      lastError = error as Error;
    }
  }

  if (!photo) {
    console.log(`• ${slug}: не вдалося отримати дані з API (${lastError?.message ?? 'невідома помилка'}).`);
    return;
  }

  const assetId =
    extractAssetId(photo.urls?.raw) ??
    extractAssetId(photo.urls?.full) ??
    extractAssetId(photo.urls?.regular) ??
    null;

  if (!assetId) {
    console.log(`• ${slug}: не вдалося визначити ідентифікатор із URLs.`);
    return;
  }

  const match = chooseDownloadFile(assetId, downloadFiles);
  if (!match) {
    console.log(`• ${slug}: у Downloads не знайдено файл із ідентифікатором "${assetId}".`);
    return;
  }

  const existingFile = findExistingMediaFile(mediaDir);
  const targetName = existingFile ? path.basename(existingFile) : `${slug}${match.ext}`;
  const targetPath = path.join(mediaDir, targetName);

  console.log(`• ${slug}: знайдено ${match.name} (розмір ${match.size} байт), заміна ${path.basename(targetPath)}.`);
  await copyFileWithLogging(match.path, targetPath, apply);
}

async function main(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));
    const accessKey = ensureAccessKey();
    const downloadFiles = await walkDownloads(options.downloadsDir);

    if (downloadFiles.length === 0) {
      console.log(`У каталозі ${options.downloadsDir} не знайдено жодного зображення.`);
      process.exit(0);
    }

    const entries = await listLibraryDirs();
    if (entries.length === 0) {
      console.log('Бібліотека пуста, нічого обробляти.');
      return;
    }

    for (const entry of entries) {
      const { slug, dir } = entry;
      if (options.onlySlug && options.onlySlug !== slug) {
        continue;
      }
      const located = await findMediaDir(slug);
      const mediaDir = located?.dir ?? dir;
      const meta = await readMeta(mediaDir);
      if (!meta) {
        console.log(`• ${slug}: пропущено (немає валідного media-meta.json).`);
        continue;
      }
      await processEntry(slug, mediaDir, meta, downloadFiles, accessKey, options.apply);
    }

    if (!options.apply) {
      console.log('\nDry-run завершено. Додайте --apply, щоб виконати копіювання.');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Помилка: ${message}`);
    process.exit(1);
  }
}

void main();
