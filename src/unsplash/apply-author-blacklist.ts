import { promises as fs } from 'node:fs';
import path from 'node:path';

import {
  RELATED_IMAGE_GROUPS_PATH,
} from '../config/paths';
import { markMediaPendingInProject } from '../media-import/media-sync-state';
import {
  loadRelatedImageGroupRegistry,
  normalizeRelatedImageGroup,
  serializeRelatedImageGroups,
  RELATED_IMAGE_GROUP_MIN_ITEMS,
} from '../media-import/related-image-groups';
import { isUnsplashAuthorBlacklisted, readUnsplashAuthorBlacklist } from './author-blacklist';
import { MEDIA_META_FILE, listLibraryEntries } from './library-paths';
import type { MediaMetadata } from './import-utils';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

async function main(): Promise<void> {
  const blacklist = await readUnsplashAuthorBlacklist();
  const entries = await listLibraryEntries();
  const matched: Array<{ slug: string; dir: string; mediaKey: string }> = [];

  for (const entry of entries) {
    try {
      const meta = JSON.parse(await fs.readFile(path.join(entry.dir, MEDIA_META_FILE), 'utf8')) as MediaMetadata;
      if (!isUnsplashAuthorBlacklisted(meta, blacklist)) continue;
      matched.push({ slug: entry.slug, dir: entry.dir, mediaKey: meta.mediaKey });
    } catch {
      // Пошкоджені або неповні записи не можна безпечно визначити за автором.
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
  console.log(`Готово: очищено ${matched.length} зображень заблокованих авторів.`);
}

void main().catch(error => {
  console.error(`Помилка: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
