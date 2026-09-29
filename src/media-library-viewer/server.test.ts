import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createViewerServer } from './server';

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'media-viewer-'));
  await fs.mkdir(path.join(root, 'library', 'unsplash', 'images', 'forest'), { recursive: true });
  await fs.mkdir(path.join(root, 'library', 'unsplash', 'images', 'uncategorized'), { recursive: true });
  await fs.mkdir(path.join(root, 'library', 'custom-images', 'images', 'portrait'), { recursive: true });
  await fs.mkdir(path.join(root, 'library', 'iconify', 'token'), { recursive: true });
  await fs.mkdir(path.join(root, 'translations', 'images'), { recursive: true });
  await fs.writeFile(path.join(root, 'library', 'collections.json'), JSON.stringify({ schemaVersion: 1, collections: {
    nature: { name: { en: 'Nature', uk: 'Природа' }, category: 'images', providerCollections: [{ provider: 'pexels', collectionId: 'nature-pexels' }] },
    people: { name: { en: 'People', uk: 'Люди' }, category: 'images' },
    icons: { name: { en: 'Icons', uk: 'Іконки' }, category: 'icons' },
  }}));
  await fs.writeFile(path.join(root, 'library', 'related-image-groups.json'), JSON.stringify({
    schemaVersion: 1,
    groups: {},
  }));
  const meta = (slug: string, source: string, collectionSlugs: string[]) => ({
    slug, mediaKey: `${source}:${slug}`, pinned: false, collectionSlugs,
    i18n: { name: { en: slug, uk: slug }, alt: { en: slug, uk: slug }, tags: [{ key: 'test', i18n: { en: 'test', uk: 'тест' } }] },
    category: { key: 'images', en: 'Images', uk: 'Зображення' }, sourceName: source, licenseName: 'Test',
  });
  await fs.writeFile(path.join(root, 'library', 'unsplash', 'images', 'forest', 'media-meta.json'), JSON.stringify(meta('forest', 'unsplash', ['nature'])));
  await fs.writeFile(path.join(root, 'library', 'unsplash', 'images', 'forest', 'forest.jpg'), 'not-an-image');
  await fs.writeFile(path.join(root, 'library', 'unsplash', 'images', 'uncategorized', 'media-meta.json'), JSON.stringify(meta('uncategorized', 'unsplash', [])));
  await fs.writeFile(path.join(root, 'library', 'unsplash', 'images', 'uncategorized', 'uncategorized.jpg'), 'not-an-image');
  await fs.writeFile(path.join(root, 'library', 'custom-images', 'images', 'portrait', 'media-meta.json'), JSON.stringify(meta('portrait', 'custom-images', ['people'])));
  await fs.writeFile(path.join(root, 'library', 'custom-images', 'images', 'portrait', 'portrait.png'), 'not-an-image');
  await fs.writeFile(path.join(root, 'library', 'iconify', 'token', 'icons.json'), '{}');
  await fs.writeFile(path.join(root, 'translations', 'images', 'name-translations.json'), JSON.stringify({ forest: 'Ліс' }));
  return root;
}

async function running(root: string) {
  const server = createViewerServer({ projectRoot: root });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert(address && typeof address !== 'string');
  return { server, base: `http://127.0.0.1:${address.port}` };
}

test('API returns image collections and excludes icons', async () => {
  const root = await fixture(); const { server, base } = await running(root);
  try {
    const collections = await (await fetch(`${base}/api/collections`)).json() as Array<{ slug: string; count: number; providerCollections?: Array<{ provider: string }> }>;
    assert.deepEqual(collections.map(item => item.slug), ['nature', 'people']);
    assert.equal(collections.find(item => item.slug === 'nature')?.count, 1);
    assert.equal(collections.find(item => item.slug === 'nature')?.providerCollections?.[0]?.provider, 'pexels');
  } finally { server.close(); }
});

test('API filters media by collection and search', async () => {
  const root = await fixture(); const { server, base } = await running(root);
  try {
    const result = await (await fetch(`${base}/api/media?collection=nature&q=forest`)).json() as Array<{ slug: string }>;
    assert.deepEqual(result.map(item => item.slug), ['forest']);
    const fallback = await fetch(`${base}/thumbnail/unsplash/forest`);
    assert.equal(fallback.status, 200);
    assert.match(fallback.headers.get('content-type') ?? '', /image\/jpeg/);
    const empty = await (await fetch(`${base}/api/media?collection=nature&q=portrait`)).json() as unknown[];
    assert.equal(empty.length, 0);
    const uncategorized = await (await fetch(`${base}/api/media?collection=__uncategorized&category=images`)).json() as Array<{ slug: string }>;
    assert.deepEqual(uncategorized.map(item => item.slug), ['uncategorized']);
  } finally { server.close(); }
});

test('API includes Lummi library images', async () => {
  const root = await fixture();
  const dir = path.join(root, 'library', 'lummi', 'images', 'rider');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'media-meta.json'), JSON.stringify({
    slug: 'rider', mediaKey: 'lummi:rider', pinned: false, collectionSlugs: ['people'],
    i18n: { name: { en: 'Rider', uk: 'Вершниця' }, alt: { en: 'Rider', uk: 'Вершниця' }, tags: [] },
    category: { key: 'images', en: 'Images', uk: 'Зображення' }, sourceName: 'Lummi', licenseName: 'Lummi License',
  }));
  await fs.writeFile(path.join(dir, 'rider.png'), 'not-an-image');
  const { server, base } = await running(root);
  try {
    const result = await (await fetch(`${base}/api/media?q=rider`)).json() as Array<{ slug: string; source: string }>;
    assert.deepEqual(result.map(item => ({ slug: item.slug, source: item.source })), [{ slug: 'rider', source: 'lummi' }]);
  } finally { server.close(); }
});

test('Bulk collection assignment updates selected uncategorized media', async () => {
  const root = await fixture(); const { server, base } = await running(root);
  try {
    const response = await fetch(`${base}/api/media/bulk-collection`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mediaKeys: ['unsplash:uncategorized'], collectionSlugs: ['nature', 'people'] }) });
    assert.equal(response.status, 200);
    const meta = JSON.parse(await fs.readFile(path.join(root, 'library', 'unsplash', 'images', 'uncategorized', 'media-meta.json'), 'utf8'));
    assert.deepEqual(meta.collectionSlugs, ['nature', 'people']);
  } finally { server.close(); }
});

test('Bulk collection move removes the source collection', async () => {
  const root = await fixture(); const { server, base } = await running(root);
  try {
    const response = await fetch(`${base}/api/media/bulk-collection`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mediaKeys: ['unsplash:forest'], collectionSlugs: ['people'], fromCollectionSlug: 'nature' }) });
    assert.equal(response.status, 200);
    const meta = JSON.parse(await fs.readFile(path.join(root, 'library', 'unsplash', 'images', 'forest', 'media-meta.json'), 'utf8'));
    assert.deepEqual(meta.collectionSlugs, ['people']);
  } finally { server.close(); }
});

test('Collection cover replaces the previous preview', async () => {
  const root = await fixture(); const { server, base } = await running(root);
  try {
    const response = await fetch(`${base}/api/collections/nature/cover`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mediaKey: 'unsplash:forest' }) });
    assert.equal(response.status, 200);
    const collections = JSON.parse(await fs.readFile(path.join(root, 'library', 'collections.json'), 'utf8'));
    assert.deepEqual(collections.collections.nature.previewMediaKeys, ['unsplash:forest']);
  } finally { server.close(); }
});

test('Save validates collections and updates metadata plus Unsplash translation', async () => {
  const root = await fixture(); const { server, base } = await running(root);
  try {
    const response = await fetch(`${base}/api/media/unsplash/forest`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      name: { en: 'Forest', uk: 'Густий ліс' }, pinned: true, collectionSlugs: ['nature'],
    }) });
    assert.equal(response.status, 200);
    const meta = JSON.parse(await fs.readFile(path.join(root, 'library', 'unsplash', 'images', 'forest', 'media-meta.json'), 'utf8'));
    const translations = JSON.parse(await fs.readFile(path.join(root, 'translations', 'images', 'name-translations.json'), 'utf8'));
    assert.equal(meta.pinned, true); assert.equal(meta.i18n.name.uk, 'Густий ліс'); assert.equal(translations.forest, 'Густий ліс');
    const syncState = JSON.parse(await fs.readFile(path.join(root, 'media-sync-state.json'), 'utf8'));
    assert.deepEqual(syncState.pending['unsplash:forest'].metadata, ['dev', 'stage', 'prod']);
    assert.deepEqual(syncState.pending['unsplash:forest'].file, []);
    const invalid = await fetch(`${base}/api/media/unsplash/forest`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: { en: 'x', uk: 'x' }, pinned: false, collectionSlugs: [] }) });
    assert.equal(invalid.status, 400);
  } finally { server.close(); }
});

test('Delete queues a media key in sync state and removes the local asset', async () => {
  const root = await fixture(); const { server, base } = await running(root);
  try {
    const response = await fetch(`${base}/api/media/unsplash/forest`, { method: 'DELETE' });
    assert.equal(response.status, 200);
    const state = JSON.parse(await fs.readFile(path.join(root, 'media-sync-state.json'), 'utf8'));
    assert.deepEqual(state.pending['unsplash:forest'].delete, ['dev', 'stage', 'prod']);
    await assert.rejects(() => fs.access(path.join(root, 'library', 'unsplash', 'images', 'forest')));
    assert.equal((await (await fetch(`${base}/api/media`)).json() as unknown[]).length, 2);
  } finally { server.close(); }
});

test('Related image groups can be created, updated and disbanded', async () => {
  const root = await fixture(); const { server, base } = await running(root);
  try {
    const created = await fetch(`${base}/api/related-image-groups`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        mediaKeys: ['unsplash:forest', 'custom-images:portrait'],
        primaryMediaKey: 'custom-images:portrait',
      }),
    });
    assert.equal(created.status, 200);
    const { key } = await created.json() as { key: string };
    assert.match(key, /^group-[a-f0-9]{16}$/);
    const syncState = JSON.parse(await fs.readFile(path.join(root, 'media-sync-state.json'), 'utf8'));
    assert.deepEqual(Object.keys(syncState.pending).sort(), ['custom-images:portrait', 'unsplash:forest']);

    const groups = await (await fetch(`${base}/api/related-image-groups`)).json() as Array<{
      key: string;
      primaryMediaKey: string;
      mediaKeys: string[];
      items: Array<{ relatedGroupKey: string; relatedGroupPrimary: boolean }>;
    }>;
    assert.equal(groups.length, 1);
    assert.equal(groups[0].primaryMediaKey, 'custom-images:portrait');
    assert.deepEqual(groups[0].mediaKeys, ['custom-images:portrait', 'unsplash:forest']);
    assert.equal(groups[0].items[0].relatedGroupPrimary, true);
    assert.equal(groups[0].items[1].relatedGroupKey, key);

    const invalid = await fetch(`${base}/api/related-image-groups`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        mediaKeys: ['unsplash:forest'],
        primaryMediaKey: 'unsplash:forest',
      }),
    });
    assert.equal(invalid.status, 400);

    const removed = await fetch(`${base}/api/related-image-groups/${encodeURIComponent(key)}`, {
      method: 'DELETE',
    });
    assert.equal(removed.status, 200);
    assert.deepEqual(await (await fetch(`${base}/api/related-image-groups`)).json(), []);
  } finally { server.close(); }
});
