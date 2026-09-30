import { promises as fs } from 'node:fs';
import path from 'node:path';

import {
  RELATED_IMAGE_GROUPS_PATH,
  PEXELS_IMAGES_ROOT,
} from '../config/paths';
import { markMediaPendingInProject } from '../media-import/media-sync-state';
import {
  loadRelatedImageGroupRegistry,
  normalizeRelatedImageGroup,
  serializeRelatedImageGroups,
  RELATED_IMAGE_GROUP_MIN_ITEMS,
} from '../media-import/related-image-groups';
import { isPexelsAuthorBlacklisted, readPexelsAuthorBlacklist } from './author-blacklist';
import { MEDIA_META_FILE } from '../unsplash/library-paths';
import type { MediaMetadata } from '../unsplash/import-utils';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

async function main(): Promise<void> {
  const blacklist = await readPexelsAuthorBlacklist();
  const entries = await fs.readdir(PEXELS_IMAGES_ROOT, { withFileTypes: true }).catch(error => {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  });
  const matched: Array<{ slug: string; dir: string; mediaKey: string }> = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(PEXELS_IMAGES_ROOT, entry.name);
    try {
      const meta = JSON.parse(await fs.readFile(path.join(dir, MEDIA_META_FILE), 'utf8')) as MediaMetadata;
      if (!isPexelsAuthorBlacklisted(meta, blacklist) || typeof meta.mediaKey !== 'string' || !meta.mediaKey.trim()) continue;
      matched.push({ slug: entry.name, dir, mediaKey: meta.mediaKey });
    } catch {
      // Неповні записи не можна безпечно визначити за автором.
    }
  }

  for (const item of matched) {
    await markMediaPendingInProject(PROJECT_ROOT, item.mediaKey, 'delete', path.join(item.dir, MEDIA_META_FILE));
    await fs.rm(item.dir, { recursive: true, force: true });
    await fs.rm(path.join(PROJECT_ROOT, 'tmp', 'images', item.slug), { recursive: true, force: true });
  }

  const groupsPath = path.join(PROJECT_ROOT, path.relative(PROJECT_ROOT, RELATED_IMAGE_GROUPS_PATH));
  const groups = await loadRelatedImageGroupRegistry(groupsPath);
  const removedKeys = new Set(matched.map(item => item.mediaKey));
  for (const group of groups.values()) {
    if (group.mediaKeys.some(key => removedKeys.has(key))) {
      for (const key of group.mediaKeys) {
        if (!removedKeys.has(key)) await markMediaPendingInProject(PROJECT_ROOT, key, 'metadata');
      }
    }
  }
  const nextGroups = new Map<string, ReturnType<typeof normalizeRelatedImageGroup>>();
  for (const [key, group] of groups) {
    const mediaKeys = group.mediaKeys.filter(mediaKey => !removedKeys.has(mediaKey));
    if (mediaKeys.length < RELATED_IMAGE_GROUP_MIN_ITEMS) continue;
    const primaryMediaKey = removedKeys.has(group.primaryMediaKey) ? mediaKeys[0] : group.primaryMediaKey;
    nextGroups.set(key, normalizeRelatedImageGroup(key, { primaryMediaKey, mediaKeys }));
  }
  await fs.writeFile(groupsPath, serializeRelatedImageGroups(nextGroups), 'utf8');
  console.log(`Готово: очищено ${matched.length} зображень авторів у Pexels blacklist.`);
}

void main().catch(error => {
  console.error(`Помилка очищення Pexels blacklist: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
