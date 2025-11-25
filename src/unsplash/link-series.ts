import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { MEDIA_META_FILE, LibraryEntryKind, listLibraryEntries } from './library-paths';
import type { MediaMetadata } from './pull-media';
import { extractPhotoSlugFromUrl, sanitizeSegment } from './utils';

type CliOptions = {
  slug?: string;
};

type LoadedMeta = {
  slug: string;
  kind: LibraryEntryKind;
  meta: MediaMetadata;
  filePath: string;
};

type SeriesFetchResult = {
  remoteSlug: string;
  members: string[];
};

function parseArgs(argv: string[]): CliOptions {
  let slug: string | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--slug' || arg === '-s') {
      slug = argv[index + 1];
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      showUsage();
      process.exit(0);
    } else if (arg === '--') {
      continue;
    } else if (!arg.startsWith('-') && !slug) {
      slug = arg;
    } else {
      throw new Error(`Невідомий аргумент "${arg}".`);
    }
  }
  return { slug };
}

function showUsage(): void {
  console.log(
    [
      'Використання:',
      '  pnpm run unsplash:link-series [--slug <media-slug>]',
      '',
      'Заповнює поле seriesId у media-meta.json, орієнтуючись на блок "From this series" на Unsplash.',
      'За замовчуванням обробляє всю бібліотеку, або один slug при передачі --slug.',
    ].join('\n')
  );
}

function buildFallbackSource(slug: string, kind: LibraryEntryKind): string {
  if (kind === 'illustration' || kind === 'pattern') {
    return `https://unsplash.com/illustrations/${slug}`;
  }
  return `https://unsplash.com/photos/${slug}`;
}

function computeSeriesId(slugs: string[]): string {
  const sorted = [...slugs].sort((a, b) => a.localeCompare(b));
  const hash = createHash('sha1').update(sorted.join('|')).digest('hex').slice(0, 16);
  return `series-${hash}`;
}

function extractRemoteSlug(meta: MediaMetadata, fallbackSlug: string): string {
  if (meta.source) {
    try {
      return extractPhotoSlugFromUrl(meta.source);
    } catch {
      // ignore, fallback below
    }
  }
  return fallbackSlug;
}

function decodeDehydratedData(html: string): unknown {
  const match = html.match(/window.__DEHYDRATED_DATA__ = (.*?);<\/script>/s);
  if (!match) {
    throw new Error('Не знайдено window.__DEHYDRATED_DATA__ у HTML.');
  }
  let payload = match[1].trim();
  if (payload.startsWith('"')) {
    payload = JSON.parse(payload) as string;
  }
  return JSON.parse(payload) as unknown;
}

function collectSeriesMembers(data: unknown, remoteSlug: string): string[] {
  if (
    typeof data !== 'object' ||
    data === null ||
    !('reduxInitialState' in data) ||
    typeof (data as Record<string, unknown>).reduxInitialState !== 'object' ||
    (data as { reduxInitialState: Record<string, unknown> }).reduxInitialState === null
  ) {
    return [];
  }
  const redux = (data as { reduxInitialState: Record<string, unknown> }).reduxInitialState;
  const feeds = redux.feeds as { photoFeeds?: unknown } | undefined;
  if (!feeds || !Array.isArray(feeds.photoFeeds)) {
    return [];
  }
  for (const entry of feeds.photoFeeds) {
    if (!Array.isArray(entry) || entry.length < 2) {
      continue;
    }
    const [key, payload] = entry;
    if (typeof key !== 'string' || !key.includes('PhotosInSameSeries')) {
      continue;
    }
    if (remoteSlug && !key.includes(remoteSlug)) {
      // Бувають випадки, коли ключ не містить slug — тоді пропускаємо перевірку.
    }
    const pages = (payload as { pages?: Array<{ results?: unknown[] }> }).pages ?? [];
    const members: string[] = [];
    for (const page of pages) {
      if (!page || !Array.isArray(page.results)) {
        continue;
      }
      for (const result of page.results) {
        if (result && typeof (result as { slug?: unknown }).slug === 'string') {
          members.push(((result as { slug: string }).slug));
        }
      }
    }
    if (members.length > 0) {
      return members;
    }
  }
  return [];
}

async function fetchSeries(sourceUrl: string, remoteSlug: string): Promise<SeriesFetchResult | null> {
  const response = await fetch(sourceUrl, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
      'accept-language': 'en-US,en;q=0.9',
    },
  });
  if (!response.ok) {
    throw new Error(`Unsplash повернув ${response.status} ${response.statusText} для ${sourceUrl}.`);
  }
  const html = await response.text();
  const data = decodeDehydratedData(html);
  const members = collectSeriesMembers(data, remoteSlug);
  if (members.length === 0) {
    return null;
  }
  return { remoteSlug, members };
}

async function loadMetas(filterSlug?: string): Promise<Map<string, LoadedMeta>> {
  const entries = await listLibraryEntries();
  const metas = new Map<string, LoadedMeta>();
  for (const entry of entries) {
    if (filterSlug && entry.slug !== filterSlug) {
      continue;
    }
    const filePath = path.join(entry.dir, MEDIA_META_FILE);
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      const meta = JSON.parse(raw) as MediaMetadata;
      metas.set(entry.slug, { slug: entry.slug, kind: entry.kind, meta, filePath });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.warn(`⚠️  Пропущено ${entry.slug}: немає media-meta.json.`);
        continue;
      }
      throw error;
    }
  }
  return metas;
}

async function main(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));
    const metas = await loadMetas(options.slug);
    if (metas.size === 0) {
      console.log('Не знайдено жодного медіа для обробки.');
      return;
    }

    const seriesBySlug = new Map<string, string>();
    for (const [slug, info] of metas) {
      if (info.meta.seriesId) {
        seriesBySlug.set(slug, info.meta.seriesId);
      }
    }

    const cache = new Map<string, SeriesFetchResult | null>();
    const processed = new Set<string>();
    let updatedFiles = 0;

    const slugsToVisit = Array.from(metas.keys()).filter(slug => !seriesBySlug.has(slug));
    for (const slug of slugsToVisit) {
      if (processed.has(slug)) {
        continue;
      }
      const info = metas.get(slug);
      if (!info) {
        continue;
      }
      const remoteSlug = extractRemoteSlug(info.meta, slug);
      const sourceUrl = info.meta.source || buildFallbackSource(remoteSlug, info.kind);

      if (!cache.has(remoteSlug)) {
        console.log(`Перевіряю серію для ${slug} (${sourceUrl})...`);
        try {
          const series = await fetchSeries(sourceUrl, remoteSlug);
          cache.set(remoteSlug, series);
        } catch (error) {
          console.warn(`⚠️  Не вдалося отримати серію для ${slug}: ${(error as Error).message}`);
          cache.set(remoteSlug, null);
        }
      }
      const series = cache.get(remoteSlug);
      processed.add(slug);
      if (!series) {
        continue;
      }
      const normalized = new Set<string>();
      for (const member of series.members) {
        const normalizedSlug = sanitizeSegment(member);
        if (metas.has(normalizedSlug)) {
          normalized.add(normalizedSlug);
        }
      }
      normalized.add(slug);
      const localMembers = Array.from(normalized).filter(memberSlug => metas.has(memberSlug));
      if (localMembers.length < 2) {
        continue;
      }
      let seriesId: string | undefined;
      for (const memberSlug of localMembers) {
        const existing = seriesBySlug.get(memberSlug);
        if (existing) {
          seriesId = existing;
          break;
        }
      }
      if (!seriesId) {
        seriesId = computeSeriesId(localMembers);
        console.log(`  ↳ Створено нову серію ${seriesId} (${localMembers.join(', ')})`);
      } else {
        console.log(`  ↳ Використано існуючу серію ${seriesId} (${localMembers.join(', ')})`);
      }
      for (const memberSlug of localMembers) {
        const metaInfo = metas.get(memberSlug);
        if (!metaInfo) {
          continue;
        }
        processed.add(memberSlug);
        if (metaInfo.meta.seriesId === seriesId) {
          continue;
        }
        const nextMeta: MediaMetadata = { ...metaInfo.meta, seriesId };
        await fs.writeFile(metaInfo.filePath, `${JSON.stringify(nextMeta, null, 2)}\n`, 'utf-8');
        metas.set(memberSlug, { ...metaInfo, meta: nextMeta });
        seriesBySlug.set(memberSlug, seriesId);
        updatedFiles += 1;
        console.log(`    · Оновлено ${memberSlug}`);
      }
    }

    console.log(`Готово. Оновлено файлів: ${updatedFiles}.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Помилка: ${message}`);
    showUsage();
    process.exit(1);
  }
}

void main();
