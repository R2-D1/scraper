import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { promises as fs, createReadStream } from 'node:fs';
import path from 'node:path';

import { CTRLV_LIBRARY_ROOT, LUMMI_IMAGES_ROOT, PEXELS_IMAGES_ROOT, RELATED_IMAGE_GROUPS_PATH, UNDRAW_LIBRARY_ROOT } from '../config/paths';
import {
  buildRelatedImageGroupByMediaKey,
  createRelatedImageGroupKey,
  loadRelatedImageGroupRegistry,
  normalizeRelatedImageGroup,
  serializeRelatedImageGroups,
  validateRelatedImageGroups,
  RELATED_IMAGE_GROUP_MIN_ITEMS,
  type RelatedImageGroupDefinition,
  type RelatedImageGroupRegistry,
} from '../media-import/related-image-groups';
import { markMediaPendingInProject } from '../media-import/media-sync-state';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_PUBLIC_ROOT = path.join(PROJECT_ROOT, 'src', 'media-library-viewer', 'public');
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.svg']);
const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif', '.svg': 'image/svg+xml',
};

export type ViewerOptions = { projectRoot?: string; publicRoot?: string };
type I18nText = { en: string; uk: string };
type MediaMeta = {
  slug: string; mediaKey: string; pinned: boolean; collectionSlugs?: string[];
  taggingStatus?: 'pending' | 'complete';
  i18n?: { name?: I18nText; alt?: I18nText; tags?: Array<{ key?: string; i18n?: I18nText }> };
  category?: { key?: string; en?: string; uk?: string };
  [key: string]: unknown;
};
type Collection = { slug: string; name: I18nText; category: string; previewMediaKeys?: string[] };
type MediaSource = 'ctrlv' | 'undraw' | 'unsplash' | 'pexels' | 'lummi' | 'custom-images';
type MediaItem = MediaMeta & { source: MediaSource; relativeAssetPath: string; metaPath: string; assetPath: string; thumbnailPath?: string };

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as T;
}

async function walk(root: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    return (await Promise.all(entries.map(async entry => {
      const entryPath = path.join(root, entry.name);
      return entry.isDirectory() ? walk(entryPath) : entry.name === 'media-meta.json' ? [entryPath] : [];
    }))).flat();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

async function findAsset(dir: string): Promise<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const asset = entries.find(entry => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()));
  if (!asset) throw new Error(`Не знайдено asset біля ${dir}`);
  return path.join(dir, asset.name);
}

async function findThumbnail(root: string, source: MediaSource, slug: string): Promise<string | undefined> {
  const dir = source === 'custom-images'
    ? path.join(root, 'tmp', 'custom-images', 'images', slug)
    : path.join(root, 'tmp', 'images', slug);
  const thumbnail = path.join(dir, `${slug}_thumb.webp`);
  try { await fs.access(thumbnail); return thumbnail; } catch { return undefined; }
}

async function loadCollections(root: string): Promise<Map<string, Collection>> {
  const raw = await readJson<{ schemaVersion: number; collections: Record<string, Omit<Collection, 'slug'>> }>(path.join(root, 'library', 'collections.json'));
  if (raw.schemaVersion !== 1 || !raw.collections) throw new Error('Некоректний реєстр колекцій.');
  return new Map(Object.entries(raw.collections).map(([slug, value]) => [slug, { slug, ...value }]));
}

async function loadMedia(root: string): Promise<MediaItem[]> {
  const result: MediaItem[] = [];
  const sources: Array<{ source: MediaSource; dir: string }> = [
    { source: 'unsplash', dir: path.join(root, 'library', 'unsplash') },
    { source: 'pexels', dir: path.join(root, path.relative(PROJECT_ROOT, PEXELS_IMAGES_ROOT)) },
    { source: 'lummi', dir: path.join(root, path.relative(PROJECT_ROOT, LUMMI_IMAGES_ROOT)) },
    { source: 'ctrlv', dir: path.join(root, path.relative(PROJECT_ROOT, CTRLV_LIBRARY_ROOT)) },
    { source: 'undraw', dir: path.join(root, path.relative(PROJECT_ROOT, UNDRAW_LIBRARY_ROOT)) },
    { source: 'custom-images', dir: path.join(root, 'library', 'custom-images') },
  ];
  for (const { source, dir } of sources) {
    for (const metaPath of await walk(dir)) {
      const meta = await readJson<MediaMeta>(metaPath);
      if (meta.category?.key !== 'images' && meta.category?.key !== 'illustrations') continue;
      const assetPath = await findAsset(path.dirname(metaPath));
      const thumbnailPath = await findThumbnail(root, source, meta.slug);
      result.push({ ...meta, source, metaPath, assetPath, thumbnailPath, relativeAssetPath: path.relative(root, assetPath) });
    }
  }
  return result.sort((a, b) => String(a.i18n?.name?.uk ?? a.slug).localeCompare(String(b.i18n?.name?.uk ?? b.slug), 'uk'));
}

function publicItem(
  item: MediaItem,
  root: string,
  relatedGroup?: { key: string; position: number },
): Record<string, unknown> {
  return {
    id: `${item.source}/${item.slug}`, source: item.source, slug: item.slug, mediaKey: item.mediaKey,
    pinned: item.pinned, collectionSlugs: item.collectionSlugs ?? [], name: item.i18n?.name ?? { en: item.slug, uk: item.slug },
    taggingStatus: item.taggingStatus ?? null,
    alt: item.i18n?.alt ?? null, tags: item.i18n?.tags ?? [], category: item.category, width: item.width ?? null, height: item.height ?? null,
    sourceName: item.sourceName ?? null, authorName: item.authorName ?? null, authorUrl: item.authorUrl ?? null, licenseName: item.licenseName ?? null,
    imageUrl: `/media/${encodeURIComponent(item.source)}/${encodeURIComponent(item.slug)}`,
    thumbnailUrl: `/thumbnail/${encodeURIComponent(item.source)}/${encodeURIComponent(item.slug)}`,
    relativeAssetPath: path.relative(root, item.assetPath),
    relatedGroupKey: relatedGroup?.key ?? null,
    relatedGroupPrimary: relatedGroup?.position === 0,
  };
}

async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
  let raw = ''; for await (const chunk of req) raw += chunk;
  if (raw.length > 1_000_000) throw new Error('Запит завеликий.');
  return JSON.parse(raw || '{}') as Record<string, unknown>;
}

function validText(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }

async function writeAtomic(filePath: string, content: string): Promise<void> {
  const temp = `${filePath}.viewer-${process.pid}-${Date.now()}.tmp`;
  await fs.writeFile(temp, content, 'utf8');
  await fs.rename(temp, filePath);
}

async function updateItem(item: MediaItem, input: Record<string, unknown>, collections: Map<string, Collection>, root: string): Promise<void> {
  const names = input.name as Record<string, unknown> | undefined;
  const en = names?.en;
  const uk = names?.uk;
  const collectionSlugs = input.collectionSlugs;
  const category = item.category?.key;
  if (!validText(en) || !validText(uk)) throw new Error('Назви EN та UK не можуть бути порожніми.');
  if (!Array.isArray(collectionSlugs) || collectionSlugs.length === 0 || collectionSlugs.some(slug => typeof slug !== 'string')) throw new Error('Потрібна щонайменше одна колекція.');
  const unique = [...new Set(collectionSlugs as string[])];
  if (category !== 'images' && category !== 'illustrations') throw new Error('Некоректна категорія зображення.');
  for (const slug of unique) if (collections.get(slug)?.category !== category) throw new Error(`Некоректна ${category}-колекція: ${slug}`);
  if (typeof input.pinned !== 'boolean') throw new Error('pinned має бути boolean.');
  const previousMeta = await fs.readFile(item.metaPath, 'utf8');
  const next = { ...item } as MediaMeta;
  next.pinned = input.pinned;
  next.collectionSlugs = unique;
  next.i18n = { ...(next.i18n ?? {}), name: { en: en.trim(), uk: uk.trim() } };
  const previousTranslationPath = path.join(root, 'translations', 'images', 'name-translations.json');
  let previousTranslations: string | undefined;
  await markMediaPendingInProject(root, item.mediaKey, 'metadata');
  try {
    if (item.source === 'unsplash' || item.source === 'pexels' || item.source === 'lummi') {
      previousTranslations = await fs.readFile(previousTranslationPath, 'utf8');
      const translations = JSON.parse(previousTranslations) as Record<string, string>;
      translations[item.slug] = uk.trim();
      await writeAtomic(previousTranslationPath, `${JSON.stringify(Object.fromEntries(Object.entries(translations).sort(([a], [b]) => a.localeCompare(b))), null, 2)}\n`);
    }
    await writeAtomic(item.metaPath, `${JSON.stringify(next, null, 2)}\n`);
  } catch (error) {
    await writeAtomic(item.metaPath, previousMeta);
    if (previousTranslations !== undefined) await writeAtomic(previousTranslationPath, previousTranslations);
    throw error;
  }
}

async function deleteItem(
  item: MediaItem,
  relatedGroups: RelatedImageGroupRegistry,
  root: string,
): Promise<void> {
  await markMediaPendingInProject(root, item.mediaKey, 'delete');
  for (const group of relatedGroups.values()) {
    if (group.mediaKeys.includes(item.mediaKey)) {
      for (const mediaKey of group.mediaKeys) {
        if (mediaKey !== item.mediaKey) await markMediaPendingInProject(root, mediaKey, 'metadata');
      }
    }
  }
  await fs.rm(path.dirname(item.metaPath), { recursive: true, force: true });
  await fs.rm(path.join(root, 'tmp', 'images', item.slug), { recursive: true, force: true });
  await fs.rm(path.join(root, 'tmp', 'custom-images', 'images', item.slug), { recursive: true, force: true });

  const nextGroups = new Map<string, RelatedImageGroupDefinition>();
  for (const [key, group] of relatedGroups) {
    const mediaKeys = group.mediaKeys.filter(mediaKey => mediaKey !== item.mediaKey);
    if (mediaKeys.length < RELATED_IMAGE_GROUP_MIN_ITEMS) continue;
    const primaryMediaKey = group.primaryMediaKey === item.mediaKey ? mediaKeys[0] : group.primaryMediaKey;
    nextGroups.set(key, normalizeRelatedImageGroup(key, { primaryMediaKey, mediaKeys }));
  }
  await writeAtomic(path.join(root, path.relative(PROJECT_ROOT, RELATED_IMAGE_GROUPS_PATH)), serializeRelatedImageGroups(nextGroups));
}

export function createViewerServer(options: ViewerOptions = {}) {
  const root = path.resolve(options.projectRoot ?? PROJECT_ROOT);
  const publicRoot = path.resolve(options.publicRoot ?? path.join(root, 'src', 'media-library-viewer', 'public'));
  let collectionsCache: Map<string, Collection> | undefined;
  let mediaCache: MediaItem[] | undefined;
  let relatedGroupsCache: RelatedImageGroupRegistry | undefined;
  const relatedGroupsPath = path.join(root, path.relative(PROJECT_ROOT, RELATED_IMAGE_GROUPS_PATH));
  const loadData = async () => {
    if (!collectionsCache) collectionsCache = await loadCollections(root);
    if (!mediaCache) mediaCache = await loadMedia(root);
    if (!relatedGroupsCache) relatedGroupsCache = await loadRelatedImageGroupRegistry(relatedGroupsPath);
    validateRelatedImageGroups(relatedGroupsCache, mediaCache.map(item => ({
      mediaKey: item.mediaKey,
      category: item.category?.key ?? '',
    })));
    return {
      collections: collectionsCache,
      media: mediaCache,
      relatedGroups: relatedGroupsCache,
      relatedGroupByMediaKey: buildRelatedImageGroupByMediaKey(relatedGroupsCache),
    };
  };
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      if (url.pathname === '/api/reload' && req.method === 'POST') {
        collectionsCache = undefined;
        mediaCache = undefined;
        relatedGroupsCache = undefined;
        return json(res, 200, { ok: true });
      }
      const { collections, media, relatedGroups, relatedGroupByMediaKey } = await loadData();
      if (url.pathname === '/api/related-image-groups' && req.method === 'GET') {
        const mediaByKey = new Map(media.map(item => [item.mediaKey, item]));
        return json(res, 200, [...relatedGroups.values()].map(group => ({
          key: group.key,
          primaryMediaKey: group.primaryMediaKey,
          mediaKeys: group.mediaKeys,
          items: group.mediaKeys.map(mediaKey => publicItem(
            mediaByKey.get(mediaKey) as MediaItem,
            root,
            relatedGroupByMediaKey.get(mediaKey),
          )),
        })));
      }
      if (url.pathname === '/api/related-image-groups' && req.method === 'POST') {
        const input = await body(req);
        if (!Array.isArray(input.mediaKeys)) {
          throw new Error('mediaKeys має бути масивом.');
        }
        const mediaKeys = input.mediaKeys.map((value, index) => {
          if (!validText(value)) throw new Error(`mediaKeys[${index}] не може бути порожнім.`);
          return value.trim();
        });
        if (!validText(input.primaryMediaKey)) {
          throw new Error('Потрібно вибрати головне зображення.');
        }
        const requestedKey = validText(input.key) ? input.key.trim() : null;
        if (requestedKey && !relatedGroups.has(requestedKey)) {
          throw new Error(`Групу "${requestedKey}" не знайдено.`);
        }
        const key = requestedKey ?? createRelatedImageGroupKey(mediaKeys);
        const nextGroups = new Map(relatedGroups);
        // Selected members are moved into the requested group. Keep any unselected
        // members in their old groups, dissolving groups that fall below the minimum.
        const selectedKeys = new Set(mediaKeys);
        for (const [existingKey, group] of nextGroups) {
          if (existingKey === key) continue;
          const remaining = group.mediaKeys.filter(mediaKey => !selectedKeys.has(mediaKey));
          if (remaining.length === group.mediaKeys.length) continue;
          if (remaining.length < RELATED_IMAGE_GROUP_MIN_ITEMS) {
            nextGroups.delete(existingKey);
            continue;
          }
          const primaryMediaKey = remaining.includes(group.primaryMediaKey)
            ? group.primaryMediaKey
            : remaining[0];
          nextGroups.set(existingKey, normalizeRelatedImageGroup(existingKey, {
            primaryMediaKey,
            mediaKeys: remaining,
          }));
        }
        nextGroups.set(key, normalizeRelatedImageGroup(key, {
          primaryMediaKey: input.primaryMediaKey.trim(),
          mediaKeys,
        }));
        validateRelatedImageGroups(nextGroups, media.map(item => ({
          mediaKey: item.mediaKey,
          category: item.category?.key ?? '',
        })));
        const affected = new Set<string>();
        for (const groupKey of new Set([...relatedGroups.keys(), ...nextGroups.keys()])) {
          if (JSON.stringify(relatedGroups.get(groupKey)) === JSON.stringify(nextGroups.get(groupKey))) continue;
          for (const mediaKey of relatedGroups.get(groupKey)?.mediaKeys ?? []) affected.add(mediaKey);
          for (const mediaKey of nextGroups.get(groupKey)?.mediaKeys ?? []) affected.add(mediaKey);
        }
        for (const mediaKey of affected) {
          await markMediaPendingInProject(root, mediaKey, 'metadata');
        }
        await writeAtomic(relatedGroupsPath, serializeRelatedImageGroups(nextGroups));
        relatedGroupsCache = undefined;
        return json(res, 200, { key });
      }
      const relatedGroupMatch = url.pathname.match(/^\/api\/related-image-groups\/([^/]+)$/);
      if (relatedGroupMatch && req.method === 'DELETE') {
        const key = decodeURIComponent(relatedGroupMatch[1]);
        if (!relatedGroups.has(key)) {
          return json(res, 404, { error: 'Групу не знайдено.' });
        }
        const nextGroups = new Map(relatedGroups);
        nextGroups.delete(key);
        for (const mediaKey of relatedGroups.get(key)?.mediaKeys ?? []) await markMediaPendingInProject(root, mediaKey, 'metadata');
        await writeAtomic(relatedGroupsPath, serializeRelatedImageGroups(nextGroups));
        relatedGroupsCache = undefined;
        return json(res, 200, { ok: true });
      }
      const coverMatch = url.pathname.match(/^\/api\/collections\/([^/]+)\/cover$/);
      if (coverMatch && req.method === 'POST') {
        const collectionSlug = decodeURIComponent(coverMatch[1]);
        const collection = collections.get(collectionSlug);
        if (!collection || (collection.category !== 'images' && collection.category !== 'illustrations')) {
          return json(res, 404, { error: 'Колекцію не знайдено.' });
        }
        const input = await body(req);
        if (!validText(input.mediaKey)) throw new Error('Потрібно вибрати зображення.');
        const mediaKey = input.mediaKey.trim();
        const item = media.find(candidate => candidate.mediaKey === mediaKey);
        if (!item || item.category?.key !== collection.category || !(item.collectionSlugs ?? []).includes(collectionSlug)) {
          throw new Error('Зображення не належить цій колекції.');
        }
        const collectionsPath = path.join(root, 'library', 'collections.json');
        const raw = await readJson<{ schemaVersion: number; collections: Record<string, Record<string, unknown>> }>(collectionsPath);
        raw.collections[collectionSlug] = { ...raw.collections[collectionSlug], previewMediaKeys: [item.mediaKey] };
        for (const member of media.filter(candidate => candidate.collectionSlugs?.includes(collectionSlug))) {
          await markMediaPendingInProject(root, member.mediaKey, 'metadata');
        }
        await writeAtomic(collectionsPath, `${JSON.stringify(raw, null, 2)}\n`);
        collectionsCache = undefined;
        return json(res, 200, { ok: true, collectionSlug, mediaKey: item.mediaKey });
      }
      if (url.pathname === '/api/collections' && req.method === 'GET') {
        const items = media.map(item => publicItem(item, root, relatedGroupByMediaKey.get(item.mediaKey)));
        const category = url.searchParams.get('category');
        return json(res, 200, [...collections.values()].filter(c => !category || c.category === category).filter(c => c.category === 'images' || c.category === 'illustrations').map(collection => {
          const members = items.filter(item => (item.collectionSlugs as string[]).includes(collection.slug));
          const previews = (collection.previewMediaKeys ?? []).map(key => items.find(item => item.mediaKey === key)).filter(Boolean).slice(0, 3);
          return { ...collection, count: members.length, previews: previews.length ? previews : members.slice(0, 3) };
        }));
      }
      if (url.pathname === '/api/media' && req.method === 'GET') {
        const collection = url.searchParams.get('collection'); const category = url.searchParams.get('category'); const q = (url.searchParams.get('q') ?? '').trim().toLocaleLowerCase('uk');
        const result = media.filter(item => !collection || (collection === '__uncategorized' ? !(item.collectionSlugs ?? []).length : item.collectionSlugs?.includes(collection))).filter(item => !category || item.category?.key === category).filter(item => {
          if (!q) return true; const haystack = JSON.stringify({ slug: item.slug, name: item.i18n?.name, tags: item.i18n?.tags }).toLocaleLowerCase('uk'); return haystack.includes(q);
        }).map(item => publicItem(item, root, relatedGroupByMediaKey.get(item.mediaKey)));
        return json(res, 200, result);
      }
      if (url.pathname === '/api/media/bulk-collection' && req.method === 'POST') {
        const input = await body(req);
        if (!Array.isArray(input.mediaKeys) || input.mediaKeys.length === 0 || input.mediaKeys.some(value => !validText(value))) {
          throw new Error('Потрібен непорожній масив mediaKeys.');
        }
        if (!Array.isArray(input.collectionSlugs) || input.collectionSlugs.length === 0 || input.collectionSlugs.some(value => !validText(value))) throw new Error('Потрібно вибрати щонайменше одну колекцію.');
        const mediaKeys = [...new Set(input.mediaKeys.map(value => String(value).trim()))];
        const collectionSlugs = [...new Set(input.collectionSlugs.map(value => String(value).trim()))];
        const fromCollectionSlug = validText(input.fromCollectionSlug) ? input.fromCollectionSlug.trim() : null;
        const targetCollections = collectionSlugs.map(slug => collections.get(slug));
        if (targetCollections.some(collection => !collection || (collection.category !== 'images' && collection.category !== 'illustrations'))) throw new Error('Некоректна колекція.');
        const selected = media.filter(item => mediaKeys.includes(item.mediaKey));
        if (selected.length !== mediaKeys.length) throw new Error('Одне або кілька зображень не знайдено.');
        const category = targetCollections[0]!.category;
        if (targetCollections.some(collection => collection!.category !== category) || selected.some(item => item.category?.key !== category)) throw new Error('Колекції мають відповідати категорії зображень.');
        if (fromCollectionSlug && collections.get(fromCollectionSlug)?.category !== category) throw new Error('Початкова колекція має відповідати категорії зображень.');
        const previous = await Promise.all(selected.map(async item => ({ item, raw: await fs.readFile(item.metaPath, 'utf8') })));
        for (const item of selected) await markMediaPendingInProject(root, item.mediaKey, 'metadata');
        try {
          for (const { item } of previous) {
            const next = { ...item, collectionSlugs: [...new Set([...(item.collectionSlugs ?? []).filter(slug => slug !== fromCollectionSlug), ...collectionSlugs])] };
            await writeAtomic(item.metaPath, `${JSON.stringify(next, null, 2)}\n`);
          }
        } catch (error) {
          await Promise.all(previous.map(({ item, raw }) => writeAtomic(item.metaPath, raw)));
          throw error;
        }
        collectionsCache = undefined; mediaCache = undefined;
        return json(res, 200, { ok: true, updated: selected.length });
      }
      const itemMatch = url.pathname.match(/^\/api\/media\/([^/]+)\/([^/]+)$/);
      if (itemMatch && req.method === 'GET') {
        const item = media.find(entry => entry.source === decodeURIComponent(itemMatch[1]) && entry.slug === decodeURIComponent(itemMatch[2]));
        return item
          ? json(res, 200, publicItem(item, root, relatedGroupByMediaKey.get(item.mediaKey)))
          : json(res, 404, { error: 'Зображення не знайдено.' });
      }
      if (itemMatch && req.method === 'POST') {
        const item = media.find(entry => entry.source === decodeURIComponent(itemMatch[1]) && entry.slug === decodeURIComponent(itemMatch[2]));
        if (!item) return json(res, 404, { error: 'Зображення не знайдено.' });
        await updateItem(item, await body(req), collections, root); collectionsCache = undefined; mediaCache = undefined; return json(res, 200, { ok: true });
      }
      if (itemMatch && req.method === 'DELETE') {
        const item = media.find(entry => entry.source === decodeURIComponent(itemMatch[1]) && entry.slug === decodeURIComponent(itemMatch[2]));
        if (!item) return json(res, 404, { error: 'Зображення не знайдено.' });
        await deleteItem(item, relatedGroups, root);
        collectionsCache = undefined; mediaCache = undefined; relatedGroupsCache = undefined;
        return json(res, 200, { ok: true, mediaKey: item.mediaKey });
      }
      const assetMatch = url.pathname.match(/^\/media\/([^/]+)\/([^/]+)$/);
      if (assetMatch && (req.method === 'GET' || req.method === 'HEAD')) {
        const item = media.find(entry => entry.source === decodeURIComponent(assetMatch[1]) && entry.slug === decodeURIComponent(assetMatch[2]));
        if (!item) return json(res, 404, { error: 'Зображення не знайдено.' });
        res.writeHead(200, { 'content-type': MIME_TYPES[path.extname(item.assetPath).toLowerCase()] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
        if (req.method === 'HEAD') return res.end();
        return createReadStream(item.assetPath).pipe(res);
      }
      const thumbnailMatch = url.pathname.match(/^\/thumbnail\/([^/]+)\/([^/]+)$/);
      if (thumbnailMatch && (req.method === 'GET' || req.method === 'HEAD')) {
        const item = media.find(entry => entry.source === decodeURIComponent(thumbnailMatch[1]) && entry.slug === decodeURIComponent(thumbnailMatch[2]));
        if (!item) return json(res, 404, { error: 'Зображення не знайдено.' });
        const thumbnailPath = item.thumbnailPath ?? item.assetPath;
        res.writeHead(200, { 'content-type': MIME_TYPES[path.extname(thumbnailPath).toLowerCase()] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
        if (req.method === 'HEAD') return res.end();
        return createReadStream(thumbnailPath).pipe(res);
      }
      const relative = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
      const filePath = path.resolve(publicRoot, relative);
      if (filePath !== publicRoot && !filePath.startsWith(`${publicRoot}${path.sep}`)) return json(res, 403, { error: 'Forbidden' });
      try { await fs.access(filePath); } catch { return json(res, 404, { error: 'Файл не знайдено.' }); }
      res.writeHead(200, { 'content-type': relative.endsWith('.css') ? 'text/css; charset=utf-8' : relative.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8' });
      return createReadStream(filePath).pipe(res);
    } catch (error) { return json(res, 400, { error: error instanceof Error ? error.message : 'Невідома помилка.' }); }
  });
}

if (require.main === module) {
  const port = Number(process.env.MEDIA_VIEWER_PORT ?? 4173);
  createViewerServer().listen(port, '127.0.0.1', () => console.log(`Media viewer: http://127.0.0.1:${port}`));
}
