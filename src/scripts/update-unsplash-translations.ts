import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { MEDIA_META_FILE, findMediaDir, listLibraryEntries } from '../unsplash/library-paths';
import {
  createImageNameStore,
  createImageTagStore,
  filterBlacklistedTags,
  readImageTagBlacklist,
  translateImageTags,
} from '../unsplash/translation-stores';
import type { MediaMetadata } from '../unsplash/pull-media';

type CliOptions = {
  slug?: string;
};

function dedupeStrings(values: string[], normalize: (value: string) => string = value => value): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const key = normalize(value);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(value);
  }
  return result;
}

function parseArgs(argv: string[]): CliOptions {
  let slug: string | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--slug' || arg === '-s') {
      slug = argv[index + 1];
      index += 1;
    } else if (arg === '--') {
      continue;
    } else if (arg === '--help' || arg === '-h') {
      showUsage();
      process.exit(0);
    } else if (arg.startsWith('--')) {
      throw new Error(`Невідомий аргумент "${arg}".`);
    } else {
      slug = arg;
    }
  }
  return { slug };
}

function showUsage(): void {
  console.log(
    [
      'Використання:',
      '  pnpm run images:update-translations [--slug <media-slug>]',
      '',
      'Оновлює медіа-файли в library/unsplash за останніми перекладами (теги, ключі, синоніми) і перегенеровує списки missing.',
    ].join('\n')
  );
}

async function listMetaFiles(slug?: string): Promise<string[]> {
  if (slug) {
    const located = await findMediaDir(slug);
    if (!located) {
      throw new Error(`Не знайдено медіа для slug "${slug}".`);
    }
    const filePath = path.join(located.dir, MEDIA_META_FILE);
    await fs.access(filePath);
    return [filePath];
  }

  const entries = await listLibraryEntries();
  const files: string[] = [];
  for (const entry of entries) {
    const filePath = path.join(entry.dir, MEDIA_META_FILE);
    try {
      await fs.access(filePath);
      files.push(filePath);
    } catch {
      // пропускаємо теки без media-meta.json
    }
  }
  return files;
}

function normalizeKeyList(source: unknown): string[] {
  if (!Array.isArray(source)) {
    return [];
  }
  const normalized = source
    .map(entry => (typeof entry === 'string' ? entry : String(entry)))
    .map(entry => entry.trim())
    .filter(entry => entry.length > 0);
  return Array.from(new Set(normalized));
}

function buildImageKeys(tokens: string[], translatedSet: Set<string>): string[] {
  const result = new Set<string>();
  for (const token of tokens) {
    if (translatedSet.has(token.toLowerCase())) {
      continue;
    }
    result.add(token);
  }
  return Array.from(result).sort((a, b) => a.localeCompare(b, 'uk'));
}

async function processMetaFile(
  filePath: string,
  nameStore: Awaited<ReturnType<typeof createImageNameStore>>,
  tagStore: Awaited<ReturnType<typeof createImageTagStore>>,
  blacklist: Set<string>
): Promise<boolean> {
  const raw = await fs.readFile(filePath, 'utf-8');
  const meta = JSON.parse(raw) as MediaMetadata;
  const slug = meta.slug || path.basename(path.dirname(filePath));
  const keys = normalizeKeyList(meta.keys);
  const tags = normalizeKeyList(meta.tags);
  const baseTokens = keys.length > 0 ? keys : tags;

  const translatedTags = translateImageTags(filterBlacklistedTags(baseTokens, blacklist), tagStore);
  const uniqueTranslatedTags = dedupeStrings(translatedTags, value => value.toLowerCase());
  const translatedSet = new Set(uniqueTranslatedTags.map(tag => tag.toLowerCase()));
  const translatedName = nameStore.resolve(slug, meta.name ?? slug);
  const nextKeys = buildImageKeys(
    baseTokens.flatMap(tag => [tag, tagStore.resolve(tag, tag)]),
    translatedSet
  );
  const mediaKey = meta.mediaKey ?? randomUUID();
  const updated: MediaMetadata = {
    ...meta,
    slug,
    mediaKey,
    name: translatedName,
    sourceName: meta.sourceName ?? 'Unsplash',
    tags: uniqueTranslatedTags,
    keys: nextKeys,
  };

  const serialized = `${JSON.stringify(updated, null, 2)}\n`;
  const previous = raw.endsWith('\n') ? raw : `${raw}\n`;
  if (serialized === previous) {
    return false;
  }
  await fs.writeFile(filePath, serialized, 'utf-8');
  return true;
}

async function main(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));
    const blacklist = await readImageTagBlacklist();
    const [tagStore, nameStore] = await Promise.all([
      createImageTagStore(),
      createImageNameStore(),
    ]);
    const metaFiles = await listMetaFiles(options.slug);
    if (metaFiles.length === 0) {
      console.log('Не знайдено жодного media-meta.json для оновлення.');
      return;
    }

    let updatedCount = 0;
    for (const filePath of metaFiles) {
      const updated = await processMetaFile(filePath, nameStore, tagStore, blacklist);
      if (updated) {
        updatedCount += 1;
        console.log(`Оновлено ${filePath}`);
      }
    }

    await Promise.all([tagStore.writeMissingRecords(), nameStore.writeMissingRecords()]);
    console.log(`Готово. Оновлено файлів: ${updatedCount}/${metaFiles.length}.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Помилка: ${message}`);
    showUsage();
    process.exit(1);
  }
}

void main();
