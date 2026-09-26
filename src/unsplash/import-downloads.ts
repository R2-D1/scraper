import { promises as fs, Dirent } from 'node:fs';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

import {
  getUnsplashMediaDir,
  UNSPLASH_INTAKE_ROOT,
  UnsplashMediaKind,
  UNSPLASH_LIBRARY_LIST_PATH,
  UNSPLASH_ILLUSTRATIONS_LIBRARY_LIST_PATH,
} from '../config/paths';
import { MEDIA_META_FILE } from './library-paths';
import { resolveForcedLibraryKind } from './library-overrides';
import {
  createImageNameStore,
  createImageTagStore,
  filterBlacklistedTokens,
  readImageTagBlacklist,
  readImageTagKeyBlacklist,
} from './translation-stores';
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
  getOfficialApiBlockMessage,
  readExistingMetadata,
} from './import-utils';
import { assertImageDisplayNames } from '../media-import/image-name-validation';
import { storeUnsplashSource } from './store-source';
import { sanitizeSegment } from './utils';
import { excludeTokens, splitTokens } from '../i18n/utils';
import { buildLocalizedTagEntries, extractTagLists } from './tag-utils';
import { isUnsplashAuthorBlacklisted, readUnsplashAuthorBlacklist } from './author-blacklist';

const execFileAsync = promisify(execFile);

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_IMPORT_DIR = UNSPLASH_INTAKE_ROOT;
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.svg']);

type CliOptions = {
  dir: string;
  clean: boolean;
  rasterOnly: boolean;
};

type DownloadFile = {
  path: string;
  name: string;
  ext: string;
};

function showUsage(): void {
  console.log(
    [
      'Використання:',
      '  pnpm run unsplash:import-downloads [--dir <шлях>] [--keep] [--raster-only]',
      '',
      'Параметри:',
      '  --dir, -d    Тека з файлами, завантаженими з Unsplash (дефолт — intake/unsplash).',
      '  --keep       Не очищати директорію призначення перед імпортом.',
      '  --raster-only Імпортувати лише raster-файли, пропускаючи SVG.',
    ].join('\n')
  );
}

function parseArgs(argv: string[]): CliOptions {
  let dir = DEFAULT_IMPORT_DIR;
  let clean = true;
  let rasterOnly = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--dir':
      case '-d': {
        const value = argv[index + 1];
        if (!value) {
          throw new Error('Потрібно вказати шлях після прапорця --dir.');
        }
        dir = path.resolve(PROJECT_ROOT, value);
        index += 1;
        break;
      }
      case '--keep': {
        clean = false;
        break;
      }
      case '--raster-only': {
        rasterOnly = true;
        break;
      }
      case '--help':
      case '-h': {
        showUsage();
        process.exit(0);
      }
      case '--':
        break;
      default: {
        if (arg.startsWith('-')) {
          throw new Error(`Невідомий аргумент "${arg}".`);
        }
        dir = path.resolve(PROJECT_ROOT, arg);
      }
    }
  }

  return { dir, clean, rasterOnly };
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

async function listDownloadFiles(root: string, rasterOnly: boolean): Promise<DownloadFile[]> {
  const results: DownloadFile[] = [];

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
      if (rasterOnly && ext === '.svg') {
        continue;
      }
      results.push({ path: fullPath, name: entry.name, ext });
    }
  }

  await walk(root);
  results.sort((a, b) => a.path.localeCompare(b.path, 'uk'));
  return results;
}

function extractSlugCandidate(fileName: string): string | null {
  const baseName = fileName.replace(/\.[^.]+$/, '');
  const match = baseName.match(/(.+?)-unsplash(?:-[0-9]+)?$/i);
  if (!match) {
    return null;
  }
  return match[1];
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

async function removeFromLibraryFile(url: string, filePath: string): Promise<void> {
  const normalized = normalizeUrlForList(url);
  try {
    const existing = await fs.readFile(filePath, 'utf-8');
    const lines = existing
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .filter(line => normalizeUrlForList(line) !== normalized);
    const content = lines.length > 0 ? `${lines.join('\n')}\n` : '';
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    throw error;
  }
}

async function appendToLibraryFile(url: string, kind: UnsplashMediaKind): Promise<void> {
  const normalized = normalizeUrlForList(url);
  let libraryPath: string;
  const otherPaths: string[] = [];
  
  switch (kind) {
    case 'illustration':
      libraryPath = UNSPLASH_ILLUSTRATIONS_LIBRARY_LIST_PATH;
      otherPaths.push(UNSPLASH_LIBRARY_LIST_PATH);
      break;
    case 'image':
    default:
      libraryPath = UNSPLASH_LIBRARY_LIST_PATH;
      otherPaths.push(UNSPLASH_ILLUSTRATIONS_LIBRARY_LIST_PATH);
      break;
  }

  // Видаляємо URL з інших файлів, щоб уникнути дублікатів
  await Promise.all(otherPaths.map(path => removeFromLibraryFile(url, path)));

  try {
    const existing = await fs.readFile(libraryPath, 'utf-8');
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
    const content = `${Array.from(lines).sort().join('\n')}\n`;
    await fs.writeFile(libraryPath, content, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      await fs.writeFile(libraryPath, `${normalized}\n`, 'utf-8');
      return;
    }
    throw error;
  }
}

const localPhotoIndexes = new Map<string, Promise<Map<string, UnsplashPhoto>>>();

async function readLocalPhotoMetadata(filePath: string, identifier: string): Promise<UnsplashPhoto | null> {
  const root = path.dirname(filePath);
  let indexPromise = localPhotoIndexes.get(root);
  if (!indexPromise) {
    indexPromise = (async () => {
      const index = new Map<string, UnsplashPhoto>();
      const entries = await fs.readdir(root, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.json') {
          continue;
        }
        const raw = await fs.readFile(path.join(root, entry.name), 'utf-8');
        const photo = JSON.parse(raw) as UnsplashPhoto;
        if (photo.id && photo.links?.html && photo.user) {
          index.set(photo.id, photo);
        }
      }
      return index;
    })();
    localPhotoIndexes.set(root, indexPromise);
  }
  return (await indexPromise).get(identifier) ?? null;
}

async function resolvePhotoFromFile(file: DownloadFile): Promise<{ photo: UnsplashPhoto; identifier: string | null }> {
  const fileName = file.name;
  const slugCandidate = extractSlugCandidate(fileName);
  if (!slugCandidate) {
    throw new Error('Не вдалося визначити slug з назви файлу. Очікується формат <slug>-unsplash.<ext>.');
  }
  const identifierMatch = slugCandidate.match(/([a-zA-Z0-9_-]{11})$/);
  const identifier = identifierMatch?.[1];
  if (!identifier) {
    throw new Error('Не вдалося визначити ID фото з кінця slug.');
  }
  const photo = await readLocalPhotoMetadata(file.path, identifier) ?? await fetchPhoto(identifier);
  return { photo, identifier };
}

async function removeMatchingSidecars(filePath: string, photoId: string): Promise<void> {
  const root = path.dirname(filePath);
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.json') continue;
    const sidecarPath = path.join(root, entry.name);
    try {
      const metadata = JSON.parse(await fs.readFile(sidecarPath, 'utf8')) as UnsplashPhoto;
      if (metadata.id === photoId) await fs.rm(sidecarPath, { force: true });
    } catch (error) {
      console.warn(`  ⚠ Не вдалося очистити метадані ${entry.name}: ${(error as Error).message}`);
    }
  }
}

async function processDownloadFile(
  file: DownloadFile,
  options: CliOptions,
  stores: {
    tagStore: Awaited<ReturnType<typeof createImageTagStore>>;
    nameStore: Awaited<ReturnType<typeof createImageNameStore>>;
    tagBlacklist: Set<string>;
    tagKeyBlacklist: Set<string>;
    authorBlacklist: Set<string>;
    importedSlugs: string[];
  }
): Promise<boolean> {
  const relativePath = path.relative(PROJECT_ROOT, file.path);
  console.log(`→ ${relativePath}`);

  const { photo, identifier } = await resolvePhotoFromFile(file);
  console.log(`  Unsplash ID: ${identifier ?? photo.id}`);
  if (isUnsplashAuthorBlacklisted(photo.user, stores.authorBlacklist)) {
    await fs.rm(file.path, { force: true });
    console.log('  ↳ Пропущено: автор у blacklist.');
    return false;
  }

  const slug = sanitizeSegment(photo.slug || photo.id);
  const isIllustration = photo.asset_type === 'illustration' || photo.links.html.includes('/illustrations/');
  const forcedKind = await resolveForcedLibraryKind(slug);
  const libraryKind: UnsplashMediaKind = forcedKind ?? (isIllustration ? 'illustration' : 'image');
  const outputDir = getUnsplashMediaDir(slug, libraryKind);
  const previousMeta = await readExistingMetadata(outputDir);

  await ensureDirectory(outputDir, options.clean);

  const { name: targetName, raster } = await storeUnsplashSource(file.path, outputDir, slug);
  const targetPath = path.join(outputDir, targetName);
  const stat = await fs.stat(targetPath);

  const tagStore = stores.tagStore;
  const nameStore = stores.nameStore;
  const tagBlacklist = stores.tagBlacklist;
  const tagKeyBlacklist = stores.tagKeyBlacklist;

  const tier: Tier = decideTier(photo, 'free');
  const downloadSource: DownloadSource = 'downloads';
  const rawTags = dedupeStrings(collectTags(photo), tag => tag.toLowerCase());
  const filteredTags = filterBlacklistedTokens(rawTags, tagKeyBlacklist, tagBlacklist);
  const resolveTagTranslation = (tag: string): string => tagStore.resolve(tag, tag);
  const tagEntries = buildLocalizedTagEntries(filteredTags, resolveTagTranslation);
  const tagLists = extractTagLists(tagEntries);
  const translatedTagSet = new Set(tagLists.uk.map(tag => tag.toLowerCase()));
  const keySourceTokens = filterBlacklistedTokens(rawTags, tagKeyBlacklist);
  const keyCandidates = keySourceTokens
    .flatMap(tag => [tag, resolveTagTranslation(tag)])
    .filter(tag => !translatedTagSet.has(tag.toLowerCase()));
  const sanitizedKeyCandidates = filterBlacklistedTokens(keyCandidates, tagKeyBlacklist);
  const uniqueKeyCandidates = dedupeStrings(sanitizedKeyCandidates, value => value.toLowerCase());
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

  const metaPath = path.join(outputDir, MEDIA_META_FILE);
  await fs.writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf-8');

  // Додаємо посилання у відповідний файл ресурсів
  await appendToLibraryFile(photo.links.html, libraryKind);

  try {
    await fs.rm(file.path, { force: true });
    await removeMatchingSidecars(file.path, photo.id);
  } catch (error) {
    console.warn(`  ⚠ Не вдалося видалити вихідний файл ${file.name}: ${(error as Error).message}`);
  }

  console.log(`  ✔ Збережено ${targetName} (${stat.size} байт) та ${MEDIA_META_FILE}.`);
  stores.importedSlugs.push(slug);
  return true;
}

async function translateImportedImages(slugs: string[]): Promise<void> {
  if (slugs.length === 0) {
    return;
  }
  const scriptPath = path.resolve(__dirname, '../scripts/update-unsplash-translations.ts');
  const args = [
    '-r',
    'ts-node/register',
    scriptPath,
    '--source',
    'unsplash',
    '--translate-missing',
    ...Array.from(new Set(slugs)).flatMap(slug => ['--slug', slug]),
  ];
  const result = await execFileAsync(process.execPath, args, { cwd: PROJECT_ROOT, maxBuffer: 10 * 1024 * 1024 });
  if (result.stdout.trim()) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr.trim()) {
    process.stderr.write(result.stderr);
  }
}

async function main(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));
    const files = await listDownloadFiles(options.dir, options.rasterOnly);
    if (files.length === 0) {
      console.log('У вказаній теці немає підтримуваних файлів.');
      return;
    }

    console.log(`Знайдено ${files.length} файл(и) для імпорту.`);

    const importedSlugs: string[] = [];
    const [tagStore, nameStore, tagBlacklist, tagKeyBlacklist, authorBlacklist] = await Promise.all([
      createImageTagStore(),
      createImageNameStore(),
      readImageTagBlacklist(),
      readImageTagKeyBlacklist(),
      readUnsplashAuthorBlacklist(),
    ]);

    let successCount = 0;
    let skippedCount = 0;
    for (const file of files) {
      try {
        if (await processDownloadFile(file, options, { tagStore, nameStore, tagBlacklist, tagKeyBlacklist, authorBlacklist, importedSlugs })) {
          successCount += 1;
        } else {
          skippedCount += 1;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`  ✖ Помилка для ${file.name}: ${message}`);
      }
    }

    await Promise.all([tagStore.writeMissingRecords(), nameStore.writeMissingRecords()]);

    await translateImportedImages(importedSlugs);

    console.log(`Готово: імпортовано ${successCount} з ${files.length} файлів, тихо пропущено ${skippedCount}.`);
    const apiBlockMessage = getOfficialApiBlockMessage();
    if (apiBlockMessage) {
      console.log(`Офіційний API більше не викликався після першої лімітної/авторизаційної помилки: ${apiBlockMessage}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Помилка: ${message}`);
    showUsage();
    process.exit(1);
  }
}

void main();
