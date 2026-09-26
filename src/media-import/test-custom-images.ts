import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { loadCustomImageLibrary, validateImageMeta } from './custom-images';
import { loadMediaCollectionRegistry, validateMediaCollectionCuration } from './media-collections';
import { appendCustomImagesToExport } from './prepare-custom-images';
import { buildImageArchiveMeta } from './prepare-images';
import {
  loadRelatedImageGroupRegistry,
  validateRelatedImageGroups,
} from './related-image-groups';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const FIXTURE_ROOT = path.join(PROJECT_ROOT, 'fixtures', 'custom-image-library');
const FIXTURE_REGISTRY = path.join(PROJECT_ROOT, 'fixtures', 'media-collections.json');

async function main(): Promise<void> {
  const library = await loadCustomImageLibrary(FIXTURE_ROOT, FIXTURE_REGISTRY);
  const fixtureImages = library.images.filter(item => item.meta.mediaKey.startsWith('scraper:fixture:'));
  assert.equal(fixtureImages.length, 3);
  assert.equal(fixtureImages.filter(item => item.meta.collectionSlugs.length === 0).length, 1);
  assert.deepEqual(
    fixtureImages.map(item => item.meta.mediaKey),
    ['scraper:fixture:forest', 'scraper:fixture:postcard', 'scraper:fixture:unassigned']
  );

  assert.throws(() => validateImageMeta({
    ...fixtureImages[0].meta,
    collectionSlugs: ['missing collection'],
  }), /kebab-case/);
  const legacyMeta = { ...fixtureImages[0].meta } as Record<string, unknown>;
  delete legacyMeta.collectionSlugs;
  assert.throws(() => validateImageMeta({
    ...legacyMeta,
    collectionSlug: 'scraper-fixture-nature',
  }), /collectionSlugs/);
  assert.throws(() => validateImageMeta({
    ...fixtureImages[0].meta,
    collectionSlugs: ['scraper-fixture-nature', 'scraper-fixture-nature'],
  }), /дубль/);
  const metaWithoutPinned = { ...fixtureImages[0].meta } as Record<string, unknown>;
  delete metaWithoutPinned.pinned;
  assert.throws(() => validateImageMeta(metaWithoutPinned), /pinned має бути boolean/);

  const registry = await loadMediaCollectionRegistry(FIXTURE_REGISTRY);
  assert.deepEqual(registry.get('scraper-fixture-nature')?.previewMediaKeys, ['scraper:fixture:forest']);
  assert.deepEqual(registry.get('scraper-fixture-nature')?.providerCollections, [
    { provider: 'pexels', collectionId: 'axmxq4a' },
  ]);
  validateMediaCollectionCuration(registry, library.images.map(({ meta }) => ({
    mediaKey: meta.mediaKey,
    category: meta.category.key,
    collectionSlugs: meta.collectionSlugs,
  })));
  assert.throws(() => validateMediaCollectionCuration(registry, library.images
    .filter(item => item.meta.mediaKey !== 'scraper:fixture:forest')
    .map(({ meta }) => ({ mediaKey: meta.mediaKey, category: meta.category.key, collectionSlugs: meta.collectionSlugs }))), /невідомий preview mediaKey/);
  const unsplashArchiveMeta = buildImageArchiveMeta({
    slug: 'shared-image',
    mediaKey: 'unsplash:shared-image',
    i18n: fixtureImages[0].meta.i18n,
    category: fixtureImages[0].meta.category,
    collectionSlugs: ['scraper-fixture-nature', 'scraper-fixture-travel'],
    pinned: false,
    source: 'https://unsplash.com/photos/shared-image',
    licenseName: 'Unsplash License',
    licenseUrl: 'https://unsplash.com/license',
    tier: 'free',
    downloadSource: 'downloads',
  }, { mainFile: 'shared-image.webp', width: 1200, height: 800 }, registry, {
    key: 'group-0123456789abcdef',
    position: 0,
  });
  assert.deepEqual(
    (unsplashArchiveMeta.collections as Array<Record<string, unknown>>).map(collection => collection.slug),
    ['scraper-fixture-nature', 'scraper-fixture-travel'],
  );
  assert.equal('collection' in unsplashArchiveMeta, false);
  assert.equal(unsplashArchiveMeta.pinned, false);
  assert.deepEqual(unsplashArchiveMeta.relatedGroup, {
    key: 'group-0123456789abcdef',
    position: 0,
  });
  assert.deepEqual((unsplashArchiveMeta.collections as Array<Record<string, unknown>>)[0]?.providerCollections, [
    { provider: 'PEXELS', providerCollectionId: 'axmxq4a' },
  ]);
  assert.throws(
    () => buildImageArchiveMeta(
      { ...fixtureImages[0].meta, collectionSlugs: [] } as unknown as Parameters<typeof buildImageArchiveMeta>[0],
      { mainFile: 'shared-image.webp', width: 1200, height: 800 },
      registry,
    ),
    /не можна експортувати без колекції/,
  );

  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'divnex-custom-images-'));
  const movedRoot = path.join(output, 'source');
  try {
    await fs.cp(FIXTURE_ROOT, movedRoot, { recursive: true });
    const movedMetaPath = path.join(movedRoot, 'images', 'scraper-fixture-forest', 'media-meta.json');
    const movedMeta = JSON.parse(await fs.readFile(movedMetaPath, 'utf-8')) as Record<string, unknown>;
    movedMeta.collectionSlugs = ['scraper-fixture-travel', 'scraper-fixture-nature'];
    await fs.writeFile(movedMetaPath, `${JSON.stringify(movedMeta, null, 2)}\n`, 'utf-8');
    const movedLibrary = await loadCustomImageLibrary(movedRoot, FIXTURE_REGISTRY);
    assert.deepEqual(
      movedLibrary.images.find(item => item.meta.slug === 'scraper-fixture-forest')?.meta.collectionSlugs,
      ['scraper-fixture-travel', 'scraper-fixture-nature'],
    );
    const unassignedMetaPath = path.join(movedRoot, 'images', 'scraper-fixture-unassigned', 'media-meta.json');
    const unassignedMeta = JSON.parse(await fs.readFile(unassignedMetaPath, 'utf-8')) as Record<string, unknown>;
    unassignedMeta.collectionSlugs = ['scraper-fixture-nature'];
    await fs.writeFile(unassignedMetaPath, `${JSON.stringify(unassignedMeta, null, 2)}\n`, 'utf-8');

    const relatedGroupsPath = path.join(output, 'related-image-groups.json');
    await fs.writeFile(relatedGroupsPath, `${JSON.stringify({
      schemaVersion: 1,
      groups: {
        'group-fedcba9876543210': {
          primaryMediaKey: 'scraper:fixture:forest',
          mediaKeys: ['scraper:fixture:postcard', 'scraper:fixture:forest'],
        },
      },
    }, null, 2)}\n`, 'utf-8');
    const relatedGroups = await loadRelatedImageGroupRegistry(relatedGroupsPath);
    validateRelatedImageGroups(relatedGroups, movedLibrary.images.map(({ meta }) => ({
      mediaKey: meta.mediaKey,
      category: meta.category.key,
    })));

    const result = await appendCustomImagesToExport({
      outDir: path.join(output, 'archive'),
      root: movedRoot,
      registryPath: FIXTURE_REGISTRY,
      relatedGroupsPath,
    });
    assert.equal(result.copied, movedLibrary.images.length);
    assert.equal(result.total, movedLibrary.images.length);

    const archiveMeta = JSON.parse(await fs.readFile(path.join(output, 'archive', 'scraper-fixture-forest', 'media-meta.json'), 'utf-8')) as Record<string, unknown>;
    const archiveImageCollections = archiveMeta.collections as Array<Record<string, unknown>>;
    assert.deepEqual(archiveImageCollections.map(collection => collection.slug), ['scraper-fixture-travel', 'scraper-fixture-nature']);
    assert.deepEqual(archiveImageCollections[0].i18n, { en: 'Scraper fixture travel', uk: 'Подорож scraper fixture' });
    assert.equal(archiveMeta.pinned, true);
    assert.deepEqual(archiveMeta.relatedGroup, {
      key: 'group-fedcba9876543210',
      position: 0,
    });
    const assignedMeta = JSON.parse(await fs.readFile(path.join(output, 'archive', 'scraper-fixture-unassigned', 'media-meta.json'), 'utf-8')) as Record<string, unknown>;
    assert.deepEqual((assignedMeta.collections as Array<Record<string, unknown>>).map(collection => collection.slug), ['scraper-fixture-nature']);

  } finally {
    await fs.rm(output, { recursive: true, force: true });
  }
  console.log('Custom image collection checks passed.');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
