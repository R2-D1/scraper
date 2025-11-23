import { promises as fs, Dirent } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

import {
  getUnsplashMediaDir,
  UNSPLASH_LIBRARY_LIST_PATH,
  UNSPLASH_LIBRARY_ROOT,
} from '../config/paths';
import { extractPhotoSlugFromUrl, sanitizeSegment } from './utils';

const MEDIA_META_FILE = 'media-meta.json';
const DEFAULT_LIST_PATH = UNSPLASH_LIBRARY_LIST_PATH;
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const TS_NODE_REGISTER = require.resolve('ts-node/register/transpile-only');
const PULL_SCRIPT = path.join(__dirname, 'pull-media.ts');
const TSCONFIG_PATH = path.join(PROJECT_ROOT, 'tsconfig.json');

type CliOptions = {
  file: string;
};

type UrlEntry = {
  original: string;
  normalized: string;
  slug: string;
};

type MediaMeta = {
  tier?: 'free' | 'plus';
  downloadSource?: 'api' | 'downloads';
};

function showUsage(): void {
  console.log(
    [
      'Використання:',
      '  pnpm run unsplash:pull-library [--file <path/to/unsplash-library.txt>]',
      '',
      'Файл містить URL-адреси (по одній на рядок). Порожні та ті, що починаються з "#" — ігноруються.',
    ].join('\n')
  );
}

function parseArgs(argv: string[]): CliOptions {
  let file = DEFAULT_LIST_PATH;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--file' || arg === '-f') {
      const next = argv[index + 1];
      if (!next) {
        throw new Error('Потрібно вказати шлях після прапорця --file.');
      }
      file = path.resolve(PROJECT_ROOT, next);
      index += 1;
    } else if (arg === '--' || arg === '') {
      continue;
    } else if (arg === '--help' || arg === '-h') {
      showUsage();
      process.exit(0);
    } else if (arg.startsWith('-')) {
      throw new Error(`Невідомий аргумент "${arg}".`);
    } else {
      file = path.resolve(PROJECT_ROOT, arg);
    }
  }
  return { file };
}

function normalizeUrl(input: string): string {
  const parsed = new URL(input.trim());
  parsed.hash = '';
  parsed.search = '';
  return parsed.toString();
}

function parseList(content: string): UrlEntry[] {
  const lines = content.split(/\r?\n/);
  const entries: UrlEntry[] = [];
  const seenSlugs = new Set<string>();
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    try {
      const normalized = normalizeUrl(line);
      const slug = sanitizeSegment(extractPhotoSlugFromUrl(normalized));
      if (seenSlugs.has(slug)) {
        console.warn(`⚠️  Дублікат "${line}" (slug ${slug}) пропущено.`);
        continue;
      }
      seenSlugs.add(slug);
      entries.push({ original: line, normalized, slug });
    } catch (error) {
      console.warn(`⚠️  Пропущено рядок "${line}": ${(error as Error).message}`);
    }
  }
  return entries;
}

async function readUrlEntries(filePath: string): Promise<UrlEntry[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  return parseList(content);
}

async function readMediaMeta(slug: string): Promise<MediaMeta | null> {
  const metaPath = path.join(getUnsplashMediaDir(slug), MEDIA_META_FILE);
  try {
    const raw = await fs.readFile(metaPath, 'utf-8');
    return JSON.parse(raw) as MediaMeta;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function mediaAlreadyComplete(slug: string): Promise<{ complete: boolean; reason?: string }> {
  const meta = await readMediaMeta(slug);
  if (!meta) {
    return { complete: false };
  }
  if (meta.tier === 'plus' && meta.downloadSource !== 'downloads') {
    return { complete: false, reason: 'Plus без локального файлу, повторна спроба.' };
  }
  return { complete: true, reason: 'Вже завантажено.' };
}

async function removeUnlistedMedia(keepSlugs: Set<string>): Promise<string[]> {
  let entries: Dirent[];
  try {
    entries = await fs.readdir(UNSPLASH_LIBRARY_ROOT, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const removed: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const slug = entry.name;
    if (keepSlugs.has(slug)) {
      continue;
    }
    const mediaDir = getUnsplashMediaDir(slug);
    const metaPath = path.join(mediaDir, MEDIA_META_FILE);
    try {
      await fs.access(metaPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        continue;
      }
      throw error;
    }

    await fs.rm(mediaDir, { recursive: true, force: true });
    removed.push(slug);
  }

  removed.sort();
  return removed;
}

async function runUnsplashPull(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['-r', TS_NODE_REGISTER, PULL_SCRIPT, '--', '--url', url],
      {
        stdio: 'inherit',
        cwd: PROJECT_ROOT,
        env: {
          ...process.env,
          TS_NODE_PROJECT: TSCONFIG_PATH,
        },
      }
    );
    child.on('exit', code => resolve(code ?? 0));
    child.on('error', reject);
  });
}

async function main(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));
    const entries = await readUrlEntries(options.file);
    const keepSlugs = new Set(entries.map(entry => entry.slug));
    const removedSlugs = await removeUnlistedMedia(keepSlugs);
    if (removedSlugs.length > 0) {
      console.log('  Очищено бібліотеку від зайвих записів:');
      for (const slug of removedSlugs) {
        console.log(`    • ${slug}`);
      }
    }

    if (entries.length === 0) {
      console.log('Список URL порожній, нічого завантажувати.');
      return;
    }

    let skipped = 0;
    let completed = 0;
    let failed = 0;

    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      const position = `${index + 1}/${entries.length}`;
      process.stdout.write(`\n[${position}] ${entry.normalized}\n`);

      const completion = await mediaAlreadyComplete(entry.slug);
      if (completion.complete) {
        console.log(`  → Пропущено: ${completion.reason ?? 'вже завантажено.'}`);
        skipped += 1;
        continue;
      } else if (completion.reason) {
        console.log(`  → Продовжуємо: ${completion.reason}`);
      }

      const exitCode = await runUnsplashPull(entry.original);
      if (exitCode === 0) {
        completed += 1;
      } else {
        failed += 1;
        console.warn(`  → Помилка (код ${exitCode}). Продовжую з наступним елементом.`);
      }
    }

    console.log('\nГотово.');
    console.log(`  Успішно: ${completed}`);
    console.log(`  Пропущено: ${skipped}`);
    console.log(`  Помилок: ${failed}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Помилка: ${message}`);
    showUsage();
    process.exit(1);
  }
}

void main();
