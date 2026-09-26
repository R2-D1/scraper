import { promises as fs, Dirent } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { ICONIFY_LIBRARY_ROOT } from '../config/paths';
import { normalizeIconSvg, optimizeSvg, sanitizeSvg } from './svg-optimizer';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_OUTPUT_DIR = path.join(PROJECT_ROOT, 'tmp', 'icons');
const CPU_COUNT = os.cpus().length || 4;
const FILE_CONCURRENCY = Math.min(8, Math.max(2, CPU_COUNT));
const COLLECTION_CONCURRENCY = Math.min(4, Math.max(2, Math.floor(CPU_COUNT / 2)));

type CliOptions = {
  outDir: string;
  keep: boolean;
  collection?: string;
};

function parseArgs(argv: string[]): CliOptions {
  let outDir = DEFAULT_OUTPUT_DIR;
  let keep = true;
  let collection: string | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--out':
      case '-o': {
        const value = argv[i + 1];
        if (!value) {
          throw new Error('Потрібно вказати шлях після --out.');
        }
        outDir = path.resolve(PROJECT_ROOT, value);
        i += 1;
        break;
      }
      case '--collection':
      case '-c': {
        const value = argv[i + 1];
        if (!value) {
          throw new Error('Потрібно вказати код колекції після --collection.');
        }
        collection = value;
        i += 1;
        break;
      }
      case '--clean':
        keep = false;
        break;
      case '--keep':
        keep = true;
        break;
      case '--help':
      case '-h':
        console.log(
          [
            'Використання:',
            '  pnpm run media:prepare:icons [--out <шлях/до/tmp/icons>] [--collection <slug>] [--clean]',
            '',
            'Параметри:',
            '  --out, -o         Тека призначення (дефолт — tmp/icons).',
            '  --collection, -c  Обробити лише одну колекцію (slug каталогу).',
            '  --clean           Очистити теку перед копіюванням (за замовчуванням не очищаємо).',
          ].join('\n')
        );
        process.exit(0);
      default:
        if (!arg.startsWith('-')) {
          outDir = path.resolve(PROJECT_ROOT, arg);
        } else {
          throw new Error(`Невідомий аргумент "${arg}".`);
        }
    }
  }

  return { outDir, keep, collection };
}

async function ensureOutputDir(outDir: string, keep: boolean): Promise<void> {
  if (!keep) {
    await fs.rm(outDir, { recursive: true, force: true });
  }
  await fs.mkdir(outDir, { recursive: true });
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function runWithLimit<T>(tasks: Array<() => Promise<T>>, limit: number): Promise<T[]> {
  if (tasks.length === 0) {
    return [];
  }

  const results: T[] = new Array(tasks.length);
  let index = 0;
  let active = 0;

  return new Promise<T[]>((resolve, reject) => {
    const launch = () => {
      if (index === tasks.length && active === 0) {
        resolve(results);
        return;
      }

      while (active < limit && index < tasks.length) {
        const current = index;
        index += 1;
        active += 1;

        Promise.resolve()
          .then(() => tasks[current]())
          .then(result => {
            results[current] = result;
            active -= 1;
            launch();
          })
          .catch(error => reject(error));
      }
    };

    launch();
  });
}

async function listCollections(filter?: string): Promise<string[]> {
  let entries: Dirent[];
  try {
    entries = await fs.readdir(ICONIFY_LIBRARY_ROOT, { withFileTypes: true });
  } catch (error) {
    const message = (error as Error).message;
    throw new Error(`Не вдалося прочитати ${ICONIFY_LIBRARY_ROOT}: ${message}`);
  }

  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .filter(name => !filter || name.toLowerCase() === filter.toLowerCase())
    .sort((a, b) => a.localeCompare(b, 'uk'));
}

async function processIconFile(sourcePath: string, targetPath: string): Promise<boolean> {
  if (await fileExists(targetPath)) {
    return false;
  }

  const raw = await fs.readFile(sourcePath, 'utf-8');
  const sanitized = sanitizeSvg(raw);
  const stat = await fs.stat(sourcePath);
  const optimized = optimizeSvg(sanitized, stat.size);
  const normalized = normalizeIconSvg(optimized);
  await fs.writeFile(targetPath, normalized, 'utf-8');
  return true;
}

async function copyCollection(
  name: string,
  outDir: string
): Promise<{ processed: number; skipped: number; total: number }> {
  const sourceDir = path.join(ICONIFY_LIBRARY_ROOT, name);
  const targetDir = path.join(outDir, name);
  await fs.mkdir(targetDir, { recursive: true });

  const filesToCopy = ['collection-meta.json', 'icons.json'];
  for (const fileName of filesToCopy) {
    const src = path.join(sourceDir, fileName);
    const dest = path.join(targetDir, fileName);
    await fs.copyFile(src, dest);
  }

  const filesDir = path.join(sourceDir, 'files');
  const targetFilesDir = path.join(targetDir, 'files');
  await fs.mkdir(targetFilesDir, { recursive: true });

  const entries = await fs.readdir(filesDir, { withFileTypes: true });

  const tasks = entries
    .filter(entry => entry.isFile() && path.extname(entry.name).toLowerCase() === '.svg')
    .map(entry => {
      const sourcePath = path.join(filesDir, entry.name);
      const targetPath = path.join(targetFilesDir, entry.name);
      return async () => processIconFile(sourcePath, targetPath);
    });

  const results = await runWithLimit(tasks, FILE_CONCURRENCY);
  const processed = results.filter(Boolean).length;
  const total = results.length;

  return {
    processed,
    skipped: total - processed,
    total,
  };
}

export async function prepareIcons(options: CliOptions): Promise<{ copied: number; total: number }> {
  await ensureOutputDir(options.outDir, options.keep);
  const collections = await listCollections(options.collection);

  if (collections.length === 0) {
    console.log('Не знайдено колекцій для експорту з library/iconify.');
    return { copied: 0, total: 0 };
  }

  console.log(
    `Готуємо ${collections.length} колекцій у ${path.relative(PROJECT_ROOT, options.outDir)}${
      options.keep ? ' (без очищення)' : ''
    }... (колекцій паралельно: ${COLLECTION_CONCURRENCY}, файлів: ${FILE_CONCURRENCY})`
  );

  const tasks = collections.map((name, index) => {
    const step = `${index + 1}/${collections.length}`;
    return async () => {
      const started = Date.now();
      console.log(`[${step}] ${name} — обробка...`);
      const { processed, skipped, total } = await copyCollection(name, options.outDir);
      const duration = Math.round((Date.now() - started) / 1000);
      console.log(
        `[${step}] ${name} — готово. Оброблено ${processed}/${total}, пропущено ${skipped}, потік файлів ${FILE_CONCURRENCY}x, час ${duration}s.`
      );
      return true;
    };
  });

  await runWithLimit(tasks, COLLECTION_CONCURRENCY);

  return { copied: collections.length, total: collections.length };
}

async function main(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = await prepareIcons(options);
    console.log(`Готово: скопійовано ${result.copied} колекцій у ${path.relative(PROJECT_ROOT, options.outDir)}.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Помилка: ${message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  void main();
}
