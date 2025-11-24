import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { UNSPLASH_LIBRARY_LIST_PATH, UNSPLASH_MISSING_DOWNLOADS_PATH } from '../config/paths';
import { MEDIA_META_FILE, findMediaDir, listLibraryEntries } from './library-paths';
import { extractPhotoSlugFromUrl, sanitizeSegment } from './utils';

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

type MissingEntry = {
  url: string;
  slug: string;
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

type ParseResult = {
  entries: UrlEntry[];
  duplicates: Array<{ original: string; slug: string }>;
};

function parseList(content: string): ParseResult {
  const lines = content.split(/\r?\n/);
  const entries: UrlEntry[] = [];
  const duplicates: Array<{ original: string; slug: string }> = [];
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
        duplicates.push({ original: line, slug });
        continue;
      }
      seenSlugs.add(slug);
      entries.push({ original: line, normalized, slug });
    } catch (error) {
      console.warn(`⚠️  Пропущено рядок "${line}": ${(error as Error).message}`);
    }
  }
  return { entries, duplicates };
}

function parseMissing(content: string): UrlEntry[] {
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
        continue;
      }
      seenSlugs.add(slug);
      entries.push({ original: line, normalized, slug });
    } catch {
      continue;
    }
  }
  return entries;
}

async function readUrlEntries(filePath: string): Promise<UrlEntry[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const parsed = parseList(content);
  if (parsed.duplicates.length > 0) {
    const cleanedContent = `${parsed.entries.map(entry => entry.original).join('\n')}\n`;
    await fs.writeFile(filePath, cleanedContent, 'utf-8');
    console.log(`  Очищено дублікати у списку (${parsed.duplicates.length}).`);
  }
  return parsed.entries;
}

async function readMissingEntries(): Promise<UrlEntry[]> {
  try {
    const content = await fs.readFile(UNSPLASH_MISSING_DOWNLOADS_PATH, 'utf-8');
    return parseMissing(content);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function readMediaMeta(slug: string): Promise<{ meta: MediaMeta | null; dir: string | null }> {
  const located = await findMediaDir(slug);
  if (!located) {
    return { meta: null, dir: null };
  }
  const metaPath = path.join(located.dir, MEDIA_META_FILE);
  try {
    const raw = await fs.readFile(metaPath, 'utf-8');
    return { meta: JSON.parse(raw) as MediaMeta, dir: located.dir };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { meta: null, dir: located.dir };
    }
    throw error;
  }
}

async function mediaAlreadyComplete(slug: string, missingSlugs: Set<string>): Promise<{ complete: boolean; reason?: string }> {
  const { meta } = await readMediaMeta(slug);
  if (!meta) {
    return { complete: false };
  }
  if (missingSlugs.has(slug)) {
    return { complete: false, reason: 'У списку несинхронізованих (missing-downloads).' };
  }
  if (meta.tier === 'plus' && meta.downloadSource !== 'downloads') {
    return { complete: false, reason: 'Plus без локального файлу, повторна спроба.' };
  }
  return { complete: true, reason: 'Вже завантажено.' };
}

async function removeUnlistedMedia(keepSlugs: Set<string>): Promise<string[]> {
  const removed: string[] = [];
  const entries = await listLibraryEntries();
  for (const entry of entries) {
    if (keepSlugs.has(entry.slug)) {
      continue;
    }

    await fs.rm(entry.dir, { recursive: true, force: true });
    removed.push(entry.slug);
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
    const missingEntries = await readMissingEntries();
    const missingSlugs = new Set(missingEntries.map(entry => entry.slug));
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

      const completion = await mediaAlreadyComplete(entry.slug, missingSlugs);
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
