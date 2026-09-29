import { promises as fs, Dirent } from 'node:fs';
import path from 'node:path';
import { markMediaPendingForMetadata } from '../media-import/media-sync-state';

import {
  UNSPLASH_ILLUSTRATIONS_ROOT,
  UNSPLASH_IMAGES_ROOT,
  UNSPLASH_LIBRARY_ROOT,
} from '../config/paths';

type MediaCategoryKind = 'image' | 'illustration';

type MediaCategory = {
  key: string;
  en?: string;
  uk?: string;
};

type MediaMetadata = {
  category?: MediaCategory;
};

type CliOptions = {
  dryRun: boolean;
  rootDir: string;
};

const DEFAULT_ROOT = UNSPLASH_LIBRARY_ROOT;

const CATEGORY_BY_KIND: Record<MediaCategoryKind, { key: string; en: string; uk: string }> = {
  image: { key: 'images', en: 'Images', uk: 'Зображення' },
  illustration: { key: 'illustrations', en: 'Illustrations', uk: 'Ілюстрації' },
};

const KIND_BY_KEY: Record<string, MediaCategoryKind | undefined> = {
  image: 'image',
  images: 'image',
  illustration: 'illustration',
  illustrations: 'illustration',
};

function parseArgs(argv: string[]): CliOptions {
  let dryRun = false;
  let rootDir = DEFAULT_ROOT;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--') {
      continue;
    } else if (arg === '--root' || arg === '-r') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('Потрібно вказати шлях після --root.');
      }
      rootDir = path.resolve(process.cwd(), value);
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      console.log(
        [
          'Використання:',
          '  pnpm run library:normalize-categories [--root <path>] [--dry-run]',
          '',
          'Опції:',
          '  --root, -r  Коренева тека для пошуку media-meta.json (дефолт — library/unsplash).',
          '  --dry-run   Лише звіт, без запису файлів.',
        ].join('\n')
      );
      process.exit(0);
    } else if (arg.startsWith('--')) {
      throw new Error(`Невідомий аргумент "${arg}".`);
    }
  }

  return { dryRun, rootDir };
}

function isWithin(root: string, filePath: string): boolean {
  const relative = path.relative(root, filePath);
  return relative.length > 0 && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function detectKindByPath(metaPath: string): MediaCategoryKind | undefined {
  if (isWithin(UNSPLASH_IMAGES_ROOT, metaPath)) {
    return 'image';
  }
  if (isWithin(UNSPLASH_ILLUSTRATIONS_ROOT, metaPath)) {
    return 'illustration';
  }
  return undefined;
}

function detectKindByMeta(meta: MediaMetadata): MediaCategoryKind | undefined {
  const key = meta.category?.key;
  if (!key) {
    return undefined;
  }
  return KIND_BY_KEY[key];
}

function resolveKind(meta: MediaMetadata, metaPath: string): MediaCategoryKind {
  return detectKindByPath(metaPath) ?? detectKindByMeta(meta) ?? 'image';
}

async function collectMetaFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
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
        stack.push(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name === 'media-meta.json') {
        files.push(fullPath);
      }
    }
  }

  files.sort((a, b) => a.localeCompare(b, 'uk'));
  return files;
}

function normalizeCategory(meta: MediaMetadata, kind: MediaCategoryKind): { next: MediaMetadata; changed: boolean } {
  const canonical = CATEGORY_BY_KIND[kind];
  const current = meta.category;

  const nextCategory: MediaCategory = {
    ...(current ?? {}),
    key: canonical.key,
    en: canonical.en,
    uk: canonical.uk,
  };

  const changed =
    !current ||
    current.key !== nextCategory.key ||
    current.en !== nextCategory.en ||
    current.uk !== nextCategory.uk;

  if (!changed) {
    return { next: meta, changed: false };
  }

  return {
    next: {
      ...meta,
      category: nextCategory,
    },
    changed: true,
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const metaFiles = await collectMetaFiles(options.rootDir);

  if (metaFiles.length === 0) {
    console.log(`Не знайдено жодного media-meta.json у ${options.rootDir}.`);
    return;
  }

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let mismatchedPath = 0;

  for (const metaPath of metaFiles) {
    try {
      const raw = await fs.readFile(metaPath, 'utf-8');
      const meta = JSON.parse(raw) as MediaMetadata;
      const kindByPath = detectKindByPath(metaPath);
      const kindByMeta = detectKindByMeta(meta);
      if (kindByPath && kindByMeta && kindByPath !== kindByMeta) {
        mismatchedPath += 1;
      }
      const kind = resolveKind(meta, metaPath);
      const { next, changed } = normalizeCategory(meta, kind);
      if (!changed) {
        skipped += 1;
        continue;
      }
      if (!options.dryRun) {
        await fs.writeFile(metaPath, `${JSON.stringify(next, null, 2)}\n`, 'utf-8');
        await markMediaPendingForMetadata(metaPath, 'metadata');
      }
      updated += 1;
    } catch (error) {
      failed += 1;
      const relative = path.relative(process.cwd(), metaPath);
      console.error(`  ✖ Помилка для ${relative}: ${(error as Error).message}`);
    }
  }

  console.log('Результат нормалізації категорій:');
  console.log(`  Всього файлів: ${metaFiles.length}`);
  console.log(`  Оновлено: ${updated}`);
  console.log(`  Без змін: ${skipped}`);
  console.log(`  Невідповідність шлях/категорія: ${mismatchedPath}`);
  console.log(`  Помилок: ${failed}`);
  if (options.dryRun) {
    console.log('  Режим dry-run: файли не змінені.');
  }
}

void main();
