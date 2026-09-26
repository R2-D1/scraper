import { promises as fs } from 'node:fs';
import path from 'node:path';

import { ICONIFY_LIBRARY_ROOT } from '../config/paths';

type CliOptions = {
  collection?: string;
  outputPath: string;
};

type IconMetadataEntry = {
  mediaKey?: string;
};

type ExportMap = Record<string, string>;

const DEFAULT_OUTPUT_PATH = path.join(process.cwd(), 'tmp', 'iconify-media-key-map.json');

function showUsage(): void {
  console.log(
    [
      'Використання:',
      '  pnpm run iconify:export-media-key-map [-- --collection <код>] [--out <шлях>]',
      '',
      'Параметри:',
      '  --collection, -c   Експортувати мапу лише для однієї колекції.',
      '  --out, -o          Куди записати JSON-мапу mediaKey -> iconifyKey.',
    ].join('\n')
  );
}

function parseArgs(argv: string[]): CliOptions {
  let collection: string | undefined;
  let outputPath = DEFAULT_OUTPUT_PATH;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--collection':
      case '-c': {
        const value = argv[index + 1];
        if (!value) {
          throw new Error('Потрібно вказати значення після --collection.');
        }
        collection = value.trim();
        index += 1;
        break;
      }
      case '--out':
      case '-o': {
        const value = argv[index + 1];
        if (!value) {
          throw new Error('Потрібно вказати шлях після --out.');
        }
        outputPath = path.resolve(value);
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
          collection = arg.trim();
        } else {
          throw new Error('Можна вказати лише одну колекцію за запуск.');
        }
      }
    }
  }

  return { collection, outputPath };
}

async function readJson<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

async function discoverCollectionDirs(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(root, entry.name))
    .sort((a, b) => a.localeCompare(b, 'en'));
}

async function readCollectionSlug(collectionDir: string): Promise<string> {
  const metaPath = path.join(collectionDir, 'collection-meta.json');
  const meta = await readJson<{ slug?: string }>(metaPath);
  const slug = typeof meta.slug === 'string' ? meta.slug.trim() : '';
  if (!slug) {
    throw new Error(`У ${metaPath} відсутній slug.`);
  }
  return slug;
}

async function loadCollectionMap(collectionDir: string, expectedCollection?: string): Promise<ExportMap> {
  const slug = await readCollectionSlug(collectionDir);
  if (expectedCollection && slug !== expectedCollection && path.basename(collectionDir) !== expectedCollection) {
    return {};
  }

  const iconsPath = path.join(collectionDir, 'icons.json');
  const icons = await readJson<Record<string, IconMetadataEntry>>(iconsPath);
  const result: ExportMap = {};

  for (const [iconName, entry] of Object.entries(icons)) {
    const mediaKey = typeof entry?.mediaKey === 'string' ? entry.mediaKey.trim() : '';
    if (!mediaKey) {
      continue;
    }
    result[mediaKey] = `${slug}:${iconName}`;
  }

  return result;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const collectionDirs = await discoverCollectionDirs(ICONIFY_LIBRARY_ROOT);
  const result: ExportMap = {};

  for (const collectionDir of collectionDirs) {
    const partial = await loadCollectionMap(collectionDir, options.collection);
    for (const [mediaKey, iconifyKey] of Object.entries(partial)) {
      if (result[mediaKey] && result[mediaKey] !== iconifyKey) {
        throw new Error(
          `Конфлікт mediaKey "${mediaKey}": "${result[mediaKey]}" vs "${iconifyKey}".`
        );
      }
      result[mediaKey] = iconifyKey;
    }
  }

  if (options.collection && Object.keys(result).length === 0) {
    throw new Error(`Колекцію "${options.collection}" не знайдено або вона не містить mediaKey.`);
  }

  await fs.mkdir(path.dirname(options.outputPath), { recursive: true });
  await fs.writeFile(options.outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf-8');

  console.log(
    `Збережено ${Object.keys(result).length} відповідностей у ${options.outputPath}.`
  );
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
