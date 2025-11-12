import { promises as fs } from 'node:fs';
import path from 'node:path';

import { IconSet } from '@iconify/tools';

import {
  IconCollectionInfo,
  LoadedCollection,
  buildIconKeys,
  buildIconNames,
  collectIconTokens,
  collectNamePhrases,
  loadCollection,
  writeIconKeysFile,
  writeIconNamesFile,
} from './collection-translations';
import {
  TranslationStore,
  mergeUniqueStringArrays,
  normalizeStringArrayValue,
  normalizeStringValue,
} from './translation-manager';
import {
  ICON_TRANSLATIONS_ROOT,
  MISSING_KEY_TRANSLATIONS_DIR,
  MISSING_NAME_TRANSLATIONS_DIR,
  MISSING_SYNONYMS_ROOT,
  getIconifyCollectionDir,
} from '../config/paths';

type CliOptions = {
  collection: string;
  outputDir: string;
  clean: boolean;
};

function showUsage(): void {
  console.log(
    [
      'Використання:',
      '  pnpm run iconify:pull -- --collection <колекція> [--out <шлях>] [--keep]',
      '',
      'Параметри:',
      '  --collection, -c   Код колекції Iconify (наприклад, mdi, tabler, material-symbols).',
      '  --out, -o          Каталог призначення. За замовчуванням tmp/iconify/<колекція>.',
      '  --keep             Не очищати теку перед імпортом (файли будуть перезаписані).',
    ].join('\n')
  );
}

function parseArgs(argv: string[]): CliOptions {
  let collection = '';
  let output: string | undefined;
  let clean = true;

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
      case '--out':
      case '-o': {
        const value = argv[index + 1];
        if (!value) {
          throw new Error('Потрібно вказати шлях після прапорця --out.');
        }
        output = value;
        index += 1;
        break;
      }
      case '--keep': {
        clean = false;
        break;
      }
      case '--': {
        // Розділювач аргументів командного рядка
        break;
      }
      case '--help':
      case '-h': {
        showUsage();
        process.exit(0);
      }
      default: {
        if (!collection && !arg.startsWith('-')) {
          collection = arg;
        } else {
          throw new Error(`Невідомий аргумент "${arg}".`);
        }
      }
    }
  }

  if (!collection) {
    throw new Error('Необхідно вказати колекцію Iconify (наприклад, --collection mdi).');
  }

  const resolvedOutput = path.resolve(output ?? getIconifyCollectionDir(collection));

  return {
    collection,
    outputDir: resolvedOutput,
    clean,
  };
}

function ensureSafeRemoval(targetDir: string): void {
  const resolved = path.resolve(targetDir);
  const { root } = path.parse(resolved);

  if (resolved === root) {
    throw new Error(
      `Очищення каталогу "${resolved}" заблоковано: ціль збігається з кореневою директорією.`
    );
  }
}

async function prepareOutputDirectory(targetDir: string, clean: boolean): Promise<void> {
  if (clean) {
    ensureSafeRemoval(targetDir);
    await fs.rm(targetDir, { recursive: true, force: true });
  }
  await fs.mkdir(targetDir, { recursive: true });
}

function listIconNames(collection: IconSet): string[] {
  return collection.list().sort();
}

async function exportIcons(
  collection: IconSet,
  iconNames: string[],
  targetDir: string
): Promise<{
  written: number;
  skipped: number;
}> {
  let written = 0;
  let skipped = 0;

  for (const iconName of iconNames) {
    const svg = collection.toSVG(iconName);

    if (!svg) {
      skipped += 1;
      continue;
    }

    const svgContent = svg.toString({ width: '1em', height: '1em' });

    const destination = path.join(targetDir, `${iconName}.svg`);
    await fs.writeFile(destination, svgContent, 'utf-8');
    written += 1;
  }

  return { written, skipped };
}

async function writeMetadataFile(
  collectionName: string,
  info: IconCollectionInfo | null,
  targetDir: string
): Promise<void> {
  const slug = collectionName.trim();
  const metadata: {
    name: string;
    slug: string;
    category: string;
    source: string;
    tags: string[];
    keys: string[];
    authorName?: string;
    authorUrl?: string;
    licenseName?: string;
    licenseUrl?: string;
  } = {
    name: info?.name?.trim() || slug,
    slug,
    category: 'Іконки',
    source: `https://icon-sets.iconify.design/${slug}/`,
    tags: [],
    keys: [],
  };

  const authorName = info?.author?.name?.trim();
  if (authorName) {
    metadata.authorName = authorName;
  }
  const authorUrl = info?.author?.url?.trim();
  if (authorUrl) {
    metadata.authorUrl = authorUrl;
  }

  const licenseName = info?.license?.title?.trim() ?? info?.license?.spdx?.trim();
  if (licenseName) {
    metadata.licenseName = licenseName;
  }
  const licenseUrl = info?.license?.url?.trim();
  if (licenseUrl) {
    metadata.licenseUrl = licenseUrl;
  }

  const metaPath = path.join(targetDir, 'collection-meta.json');
  const serialized = `${JSON.stringify(metadata, null, 2)}\n`;
  await fs.writeFile(metaPath, serialized, 'utf-8');
}

async function main(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));

    console.log(`Колекція: ${options.collection}`);
    console.log(`Цільовий каталог: ${options.outputDir}`);

    await prepareOutputDirectory(options.outputDir, options.clean);
    const filesDir = path.join(options.outputDir, 'files');
    await fs.mkdir(filesDir, { recursive: true });

    const { iconSet, info, raw } = await loadCollection(options.collection);
    const iconList = listIconNames(iconSet);

    let written = 0;
    let skipped = 0;

    const result = await exportIcons(iconSet, iconList, filesDir);
    written = result.written;
    skipped = result.skipped;

    await writeMetadataFile(options.collection, info, options.outputDir);

    const nameStore = await TranslationStore.create<string>({
      masterPath: path.join(ICON_TRANSLATIONS_ROOT, 'name-translations.json'),
      missingDir: MISSING_NAME_TRANSLATIONS_DIR,
      chunkSize: 1000,
      normalizeValue: normalizeStringValue,
    });

    const keywordStore = await TranslationStore.create<string>({
      masterPath: path.join(ICON_TRANSLATIONS_ROOT, 'key-translations.json'),
      missingDir: MISSING_KEY_TRANSLATIONS_DIR,
      chunkSize: 1000,
      normalizeValue: normalizeStringValue,
    });

    const synonymStore = await TranslationStore.create<string[]>({
      masterPath: path.join(ICON_TRANSLATIONS_ROOT, 'synonyms.json'),
      missingDir: MISSING_SYNONYMS_ROOT,
      chunkSize: 500,
      normalizeValue: normalizeStringArrayValue,
      mergeValues: mergeUniqueStringArrays,
    });

    const iconBags = collectIconTokens(raw, iconList);
    const namePhrases = collectNamePhrases(iconList);

    const iconNames = buildIconNames(namePhrases, nameStore);
    await writeIconNamesFile(options.outputDir, iconNames);

    const iconKeys = buildIconKeys(iconBags, keywordStore, synonymStore);
    await writeIconKeysFile(options.outputDir, iconKeys);

    await Promise.all([
      nameStore.writeMissingRecords(),
      keywordStore.writeMissingRecords(),
      synonymStore.writeMissingRecords(),
    ]);

    console.log(
      `Готово: збережено ${written} іконок у "${path.join(options.outputDir, 'files')}".` +
        (skipped > 0 ? ` Пропущено: ${skipped}.` : '') +
        ' Оновлені словники: icon-names.json, icon-keys.json, а також списки відсутніх перекладів у каталозі library/iconify.'
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Помилка: ${message}`);
    showUsage();
    process.exit(1);
  }
}

void main();
