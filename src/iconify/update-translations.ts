import { promises as fs } from 'node:fs';
import path from 'node:path';

import {
  buildIconKeys,
  buildIconMetadata,
  buildIconNames,
  collectIconTokens,
  collectNamePhrases,
  loadCollection,
  readIconsFile,
  removeLegacyIconFiles,
  writeIconsFile,
} from './collection-translations';
import {
  TranslationStore,
  mergeUniqueStringArrays,
  normalizeStringArrayValue,
  normalizeStringValue,
} from './translation-manager';
import {
  ICON_TRANSLATIONS_ROOT,
  ICONIFY_LIBRARY_ROOT,
  MISSING_KEY_TRANSLATIONS_DIR,
  MISSING_NAME_TRANSLATIONS_DIR,
  MISSING_SYNONYMS_ROOT,
  TAG_TRANSLATIONS_PATH,
} from '../config/paths';

type RefreshOptions = {
  collection?: string;
};

type TranslationStores = {
  names: TranslationStore<string>;
  keywords: TranslationStore<string>;
  synonyms: TranslationStore<string[]>;
};

type LocalCollection = {
  dirName: string;
  code: string;
  absolutePath: string;
  filesDir: string;
};

function showUsage(): void {
  console.log(
    [
      'Використання:',
      '  pnpm run iconify:update-translations [-- --collection <код>]',
      '',
      'Параметри:',
      '  --collection, -c   Оновити лише вказану колекцію (можна вказати назву папки або значення з collection-meta.json).',
      '  Без аргументів     Проходить по всіх колекціях у library/iconify та перегенеровує icons.json з назвами й ключовими словами.',
    ].join('\n')
  );
}

function parseArgs(argv: string[]): RefreshOptions {
  let collection: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--collection':
      case '-c': {
        const value = argv[index + 1];
        if (!value) {
          throw new Error('Потрібно вказати назву колекції після прапорця --collection.');
        }
        collection = value;
        index += 1;
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
        if (arg.startsWith('-')) {
          throw new Error(`Невідомий аргумент "${arg}".`);
        }
        if (!collection) {
          collection = arg;
        } else {
          throw new Error('Можна вказати лише одну колекцію за виклик.');
        }
      }
    }
  }

  return { collection };
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function readCollectionCode(collectionDir: string, fallback: string): Promise<string> {
  const metaPath = path.join(collectionDir, 'collection-meta.json');
  try {
    const raw = await fs.readFile(metaPath, 'utf-8');
    const meta = JSON.parse(raw) as { slug?: string; collection?: string };
    const candidate =
      typeof meta.slug === 'string' && meta.slug.trim().length > 0
        ? meta.slug.trim()
        : typeof meta.collection === 'string'
          ? meta.collection.trim()
          : '';
    const code = candidate || '';
    return code || fallback;
  } catch (error) {
    if ((error as { code?: string })?.code === 'ENOENT') {
      return fallback;
    }
    throw new Error(`Не вдалося прочитати ${metaPath}: ${error instanceof Error ? error.message : String(error)}.`);
  }
}

async function discoverCollections(root: string): Promise<LocalCollection[]> {
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch (error) {
    throw new Error(
      `Не вдалося прочитати каталог з колекціями "${root}": ${error instanceof Error ? error.message : String(error)}.`
    );
  }

  const collections: LocalCollection[] = [];
  const sorted = entries
    .filter(entry => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));

  for (const entry of sorted) {
    const absolutePath = path.join(root, entry.name);
    const filesDir = path.join(absolutePath, 'files');
    if (!(await pathExists(filesDir))) {
      continue;
    }
    const code = await readCollectionCode(absolutePath, entry.name);
    collections.push({
      dirName: entry.name,
      code,
      absolutePath,
      filesDir,
    });
  }

  return collections;
}

async function readIconNames(filesDir: string): Promise<string[]> {
  const entries = await fs.readdir(filesDir, { withFileTypes: true });
  const icons = entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.svg'))
    .map(entry => entry.name.replace(/\.svg$/i, ''));
  return Array.from(new Set(icons)).sort((a, b) => a.localeCompare(b, 'en'));
}

async function createTranslationStores(): Promise<TranslationStores> {
  const [names, keywords, synonyms] = await Promise.all([
    TranslationStore.create<string>({
      masterPath: path.join(ICON_TRANSLATIONS_ROOT, 'name-translations.json'),
      missingDir: MISSING_NAME_TRANSLATIONS_DIR,
      chunkSize: 1000,
      normalizeValue: normalizeStringValue,
    }),
    TranslationStore.create<string>({
      masterPath: TAG_TRANSLATIONS_PATH,
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

  return { names, keywords, synonyms };
}

async function refreshCollection(
  collection: LocalCollection,
  stores: TranslationStores
): Promise<{ icons: number }> {
  const iconNames = await readIconNames(collection.filesDir);
  if (iconNames.length === 0) {
    console.warn(`  • Колекція "${collection.dirName}" не містить SVG-файлів у директорії files — пропускаю.`);
    return { icons: 0 };
  }

  const { raw } = await loadCollection(collection.code);

  const iconBags = collectIconTokens(raw, iconNames);
  const phrases = collectNamePhrases(iconNames);

  const names = buildIconNames(phrases, stores.names);
  const keys = buildIconKeys(iconBags, stores.keywords, stores.synonyms);
  const previousIcons = await readIconsFile(collection.absolutePath);
  const iconsFile = buildIconMetadata(iconNames, names, keys, previousIcons);
  await writeIconsFile(collection.absolutePath, iconsFile);
  await removeLegacyIconFiles(collection.absolutePath);

  return { icons: iconNames.length };
}

async function writeStoreBackups(stores: TranslationStores): Promise<void> {
  await Promise.all([
    stores.names.writeMissingRecords(),
    stores.keywords.writeMissingRecords(),
    stores.synonyms.writeMissingRecords(),
  ]);
}

function filterCollections(
  collections: LocalCollection[],
  target?: string
): LocalCollection[] {
  if (!target) {
    return collections;
  }

  const normalized = target.trim();
  return collections.filter(
    entry =>
      entry.code.toLowerCase() === normalized.toLowerCase() ||
      entry.dirName.toLowerCase() === normalized.toLowerCase()
  );
}

async function main(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));

    const iconsRoot = ICONIFY_LIBRARY_ROOT;
    const allCollections = await discoverCollections(iconsRoot);

    if (allCollections.length === 0) {
      console.log('У каталозі library/iconify не знайдено жодної колекції для оновлення.');
      return;
    }

    const selected = filterCollections(allCollections, options.collection);

    if (options.collection && selected.length === 0) {
      throw new Error(`Колекцію "${options.collection}" не знайдено у каталозі library/iconify.`);
    }

    console.log(
      `Починаю актуалізацію перекладів для ${selected.length} колекцій (усього знайдено ${allCollections.length}).`
    );

    const stores = await createTranslationStores();
    let totalIcons = 0;

    for (const collection of selected) {
      console.log(`- ${collection.code} (${collection.dirName})`);
      const { icons } = await refreshCollection(collection, stores);
      totalIcons += icons;
      console.log(`  ✔ Оновлено icons.json (${icons} іконок).`);
    }

    await writeStoreBackups(stores);

    console.log(
      `Готово: перераховано ${totalIcons} іконок у ${selected.length} колекціях. Файли missing-* теж оновлені.`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Помилка: ${message}`);
    showUsage();
    process.exit(1);
  }
}

void main();
