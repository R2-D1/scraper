import { promises as fs } from 'node:fs';
import path from 'node:path';
import { markMediaPendingInProject } from '../media-import/media-sync-state';
import { loadRelatedImageGroupRegistry } from '../media-import/related-image-groups';

import { listLibraryEntries, MEDIA_META_FILE } from './library-paths';
import {
  UNSPLASH_ILLUSTRATIONS_LIBRARY_LIST_PATH,
  UNSPLASH_LIBRARY_LIST_PATH,
  UNSPLASH_MISSING_DOWNLOADS_PATH,
  RELATED_IMAGE_GROUPS_PATH,
} from '../config/paths';
import { MediaMetadata } from './import-utils';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const TMP_ROOT = path.join(PROJECT_ROOT, 'tmp');
const DELETE_LIST_PATH = path.join(TMP_ROOT, 'delete-list.txt');
const IMPORT_IMAGES_DIR = path.join(TMP_ROOT, 'images');
const LIBRARY_LIST_FILES = [
  UNSPLASH_LIBRARY_LIST_PATH,
  UNSPLASH_ILLUSTRATIONS_LIBRARY_LIST_PATH,
  UNSPLASH_MISSING_DOWNLOADS_PATH,
];

type LibraryIndexEntry = {
  slug: string;
  dir: string;
  source: string;
  mediaKey: string;
};

async function readDeleteList(): Promise<string[]> {
  try {
    const raw = await fs.readFile(DELETE_LIST_PATH, 'utf-8');
    return raw
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function buildLibraryIndex(): Promise<Map<string, LibraryIndexEntry>> {
  const entries = await listLibraryEntries();
  const index = new Map<string, LibraryIndexEntry>();

  for (const entry of entries) {
    const metaPath = path.join(entry.dir, MEDIA_META_FILE);
    try {
      const raw = await fs.readFile(metaPath, 'utf-8');
      const meta = JSON.parse(raw) as MediaMetadata;
      const source = meta.source?.trim();
      if (!source) {
        continue;
      }
      if (!index.has(source)) {
        index.set(source, { slug: entry.slug, dir: entry.dir, source, mediaKey: meta.mediaKey || entry.slug });
      }
    } catch {
      continue;
    }
  }

  return index;
}

async function removeLibraryEntry(entry: LibraryIndexEntry): Promise<void> {
  await markMediaPendingInProject(PROJECT_ROOT, entry.mediaKey, 'delete');
  await fs.rm(entry.dir, { recursive: true, force: true });
  const preparedDir = path.join(IMPORT_IMAGES_DIR, entry.slug);
  await fs.rm(preparedDir, { recursive: true, force: true });
}

async function scrubUrlFromLists(url: string): Promise<void> {
  await Promise.all(
    LIBRARY_LIST_FILES.map(async filePath => {
      try {
        const raw = await fs.readFile(filePath, 'utf-8');
        const lines = raw.split(/\r?\n/);
        const filteredLines = lines.filter(line => line.trim() !== url);
        if (filteredLines.length === lines.length) {
          return;
        }
        const content = filteredLines.filter(line => line.length > 0).join('\n');
        await fs.writeFile(filePath, content.length ? `${content}\n` : '', 'utf-8');
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return;
        }
        throw error;
      }
    })
  );
}

async function main(): Promise<void> {
  const deleteList = await readDeleteList();
  if (deleteList.length === 0) {
    console.log('Список видалення порожній — додайте посилання в tmp/delete-list.txt.');
    return;
  }

  const index = await buildLibraryIndex();
  const groups = await loadRelatedImageGroupRegistry(RELATED_IMAGE_GROUPS_PATH);
  let removed = 0;
  let notFound = 0;

  for (const rawUrl of deleteList) {
    const url = rawUrl.trim();
    if (!url) {
      continue;
    }
    const entry = index.get(url);
    if (!entry) {
      notFound += 1;
      console.warn(`Не знайдено ресурс для ${url}.`);
      await scrubUrlFromLists(url);
      continue;
    }
    for (const group of groups.values()) {
      if (group.mediaKeys.includes(entry.mediaKey)) {
        for (const peer of group.mediaKeys) {
          if (peer !== entry.mediaKey) await markMediaPendingInProject(PROJECT_ROOT, peer, 'metadata');
        }
      }
    }
    await removeLibraryEntry(entry);
    removed += 1;
    console.log(`Видалено ${entry.slug} (${url}).`);
    await scrubUrlFromLists(url);
  }

  console.log(
    `Готово: видалено ${removed} записів${notFound ? `, не знайдено ${notFound}` : ''}. Список залишається в ${path.relative(
      PROJECT_ROOT,
      DELETE_LIST_PATH
    )}.`
  );
}

if (require.main === module) {
  void main();
}
