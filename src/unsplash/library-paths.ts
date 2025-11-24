import { promises as fs } from 'node:fs';
import path from 'node:path';

import {
  UNSPLASH_ILLUSTRATIONS_ROOT,
  UNSPLASH_IMAGES_ROOT,
  UNSPLASH_LIBRARY_ROOT,
  UnsplashMediaKind,
  getUnsplashMediaDir,
} from '../config/paths';

export type LibraryEntryKind = UnsplashMediaKind | 'legacy';

export const MEDIA_META_FILE = 'media-meta.json';

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listDirectories(root: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    return entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export async function findMediaDir(slug: string): Promise<{ dir: string; kind: LibraryEntryKind } | null> {
  const candidates: Array<{ dir: string; kind: LibraryEntryKind }> = [
    { dir: getUnsplashMediaDir(slug, 'image'), kind: 'image' },
    { dir: getUnsplashMediaDir(slug, 'illustration'), kind: 'illustration' },
    { dir: path.join(UNSPLASH_LIBRARY_ROOT, slug), kind: 'legacy' },
  ];

  for (const candidate of candidates) {
    if (await pathExists(path.join(candidate.dir, MEDIA_META_FILE))) {
      return candidate;
    }
  }

  for (const candidate of candidates) {
    if (await pathExists(candidate.dir)) {
      return candidate;
    }
  }

  return null;
}

export async function listLibraryEntries(): Promise<Array<{ slug: string; dir: string; kind: LibraryEntryKind }>> {
  const entries: Array<{ slug: string; dir: string; kind: LibraryEntryKind }> = [];
  const categoryRoots: Array<{ root: string; kind: UnsplashMediaKind }> = [
    { root: UNSPLASH_IMAGES_ROOT, kind: 'image' },
    { root: UNSPLASH_ILLUSTRATIONS_ROOT, kind: 'illustration' },
  ];

  for (const { root, kind } of categoryRoots) {
    const slugs = await listDirectories(root);
    for (const slug of slugs) {
      entries.push({ slug, dir: path.join(root, slug), kind });
    }
  }

  const categoryNames = new Set(categoryRoots.map(entry => path.basename(entry.root)));
  const legacySlugs = (await listDirectories(UNSPLASH_LIBRARY_ROOT)).filter(slug => !categoryNames.has(slug));
  for (const slug of legacySlugs) {
    entries.push({ slug, dir: path.join(UNSPLASH_LIBRARY_ROOT, slug), kind: 'legacy' });
  }

  return entries;
}
