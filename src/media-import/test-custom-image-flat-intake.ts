import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import sharp from 'sharp';

import { findCustomImageAssetIntakes, ingestCustomImageAssetFolder, readCustomImageAssetIntake } from './custom-image-intake';
import { loadCustomImageLibrary } from './custom-images';

async function writePng(filePath: string, color: { r: number; g: number; b: number }): Promise<void> {
  await sharp({ create: { width: 2, height: 2, channels: 3, background: color } }).png().toFile(filePath);
}

function manifest(titleEn: string, titleUk = titleEn, pinned = false): Record<string, unknown> {
  return {
    title: { en: titleEn, uk: titleUk },
    category: 'images',
    collections: ['people'],
    tags: [{ en: 'Person', uk: 'Людина' }],
    pinned,
  };
}

async function writeFlatAsset(root: string, fileName: string, value: Record<string, unknown>, color: { r: number; g: number; b: number }): Promise<string> {
  const assetPath = path.join(root, fileName);
  await writePng(assetPath, color);
  await fs.writeFile(`${assetPath}.manifest.json`, `${JSON.stringify(value, null, 2)}\n`, 'utf-8');
  return assetPath;
}

function contentMediaKey(bytes: Buffer): string {
  return `custom:content:${createHash('sha256').update(bytes).digest('hex')}`;
}

async function main(): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'divnex-flat-custom-image-intake-'));
  const targetRoot = path.join(root, 'library');
  const registryPath = path.join(root, 'collections.json');
  try {
    await fs.writeFile(registryPath, `${JSON.stringify({
      schemaVersion: 1,
      collections: { people: { name: { en: 'People', uk: 'Люди' }, category: 'images' } },
    }, null, 2)}\n`, 'utf-8');

    const firstAsset = await writeFlatAsset(root, 'generated-001.png', manifest('Girl with laptop', 'Дівчина з ноутбуком', true), { r: 20, g: 40, b: 80 });
    const firstRaw = await fs.readFile(firstAsset);
    const secondAsset = await writeFlatAsset(root, 'generated-002.png', manifest('Girl with laptop', 'Дівчина з ноутбуком'), { r: 80, g: 40, b: 20 });

    const assets = await findCustomImageAssetIntakes(root);
    assert.deepEqual(assets.map(asset => path.basename(asset)), ['generated-001.png', 'generated-002.png']);
    await fs.writeFile(`${secondAsset}.manifest.json`, `${JSON.stringify({ ...manifest('Girl with laptop'), collections: undefined, collection: 'people' }, null, 2)}\n`, 'utf-8');
    await assert.rejects(
      () => readCustomImageAssetIntake(secondAsset, { registryPath }),
      /невідомі поля: collection/,
    );
    await fs.writeFile(`${secondAsset}.manifest.json`, `${JSON.stringify({ ...manifest('Girl with laptop', 'Дівчина з ноутбуком'), keywords: { en: ['portrait'], uk: ['портрет'] } }, null, 2)}\n`, 'utf-8');
    await assert.rejects(
      () => readCustomImageAssetIntake(secondAsset, { registryPath }),
      /невідомі поля: keywords/,
    );
    await fs.writeFile(`${secondAsset}.manifest.json`, `${JSON.stringify({ ...manifest('Girl with laptop', 'Дівчина з ноутбуком'), pinned: undefined }, null, 2)}\n`, 'utf-8');
    await assert.rejects(
      () => readCustomImageAssetIntake(secondAsset, { registryPath }),
      /pinned має бути boolean/,
    );
    await fs.writeFile(`${secondAsset}.manifest.json`, `${JSON.stringify(manifest('Girl with laptop', 'Дівчина з ноутбуком'), null, 2)}\n`, 'utf-8');
    const first = await ingestCustomImageAssetFolder({ folderDir: root, targetRoot, registryPath });
    assert.deepEqual(first.map(report => ({ created: report.created, updated: report.updated, renamed: report.renamed })), [
      { created: 1, updated: 0, renamed: 0 },
      { created: 1, updated: 0, renamed: 0 },
    ]);
    assert.deepEqual(await fs.readFile(firstAsset), firstRaw);

    let library = await loadCustomImageLibrary(targetRoot, registryPath);
    assert.equal(library.images.length, 2);
    const firstRecord = library.images.find(item => item.meta.sourceContentHash === createHash('sha256').update(firstRaw).digest('hex'));
    assert.ok(firstRecord);
    assert.equal(firstRecord.meta.mediaKey, contentMediaKey(firstRaw));
    assert.match(firstRecord.meta.slug, /^girl-with-laptop-[a-f0-9]{10}$/);
    assert.equal('prompt' in firstRecord.meta, false);
    assert.deepEqual(firstRecord.meta.i18n.name, { en: 'Girl with laptop', uk: 'Дівчина з ноутбуком' });
    assert.deepEqual(firstRecord.meta.i18n.alt, { en: 'Girl with laptop', uk: 'Дівчина з ноутбуком' });
    assert.equal(firstRecord.meta.sourceName, 'Divnex');
    assert.equal(firstRecord.meta.licenseName, 'Divnex Asset License');
    assert.deepEqual(firstRecord.meta.collectionSlugs, ['people']);
    assert.equal(firstRecord.meta.pinned, true);
    assert.deepEqual(firstRecord.meta.i18n.tags, [{ key: 'person', i18n: { en: 'Person', uk: 'Людина' } }]);
    assert.deepEqual(firstRecord.meta.i18n.keywords, { en: ['Person'], uk: ['Людина'] });
    let syncState = JSON.parse(await fs.readFile(path.join(root, 'media-sync-state.json'), 'utf8'));
    assert.equal(Object.keys(syncState.pending).length, 2);
    assert.deepEqual(syncState.pending[firstRecord.meta.mediaKey].file, ['dev', 'stage', 'prod']);
    assert.equal(syncState.pending[firstRecord.meta.mediaKey].reprepare, true);

    const repeat = await ingestCustomImageAssetFolder({ folderDir: root, targetRoot, registryPath });
    assert.equal(repeat.reduce((total, report) => total + report.created, 0), 0);
    assert.equal(repeat.reduce((total, report) => total + report.renamed, 0), 0);
    assert.equal((await loadCustomImageLibrary(targetRoot, registryPath)).images.length, 2);
    syncState = JSON.parse(await fs.readFile(path.join(root, 'media-sync-state.json'), 'utf8'));
    assert.equal(Object.keys(syncState.pending).length, 2);

    await fs.writeFile(path.join(root, 'generated-001.png.manifest.json'), `${JSON.stringify(manifest('Girl with tablet', 'Дівчина з планшетом'), null, 2)}\n`, 'utf-8');
    const renamed = await ingestCustomImageAssetFolder({ folderDir: root, targetRoot, registryPath });
    assert.equal(renamed.reduce((total, report) => total + report.renamed, 0), 2);
    library = await loadCustomImageLibrary(targetRoot, registryPath);
    const renamedRecord = library.images.find(item => item.meta.mediaKey === contentMediaKey(firstRaw));
    assert.ok(renamedRecord);
    assert.equal(renamedRecord.meta.slug, 'girl-with-tablet');
    assert.equal(library.images.some(item => item.meta.slug === 'chatgpt-image-aug-9-2026-01-30-18-pm'), false);

    await writePng(firstAsset, { r: 21, g: 41, b: 81 });
    const changedRaw = await fs.readFile(firstAsset);
    assert.notEqual(changedRaw.equals(firstRaw), true);
    await ingestCustomImageAssetFolder({ folderDir: root, targetRoot, registryPath });
    library = await loadCustomImageLibrary(targetRoot, registryPath);
    assert.equal(library.images.length, 3);
    assert.equal(library.images.some(item => item.meta.mediaKey === contentMediaKey(changedRaw)), true);
    syncState = JSON.parse(await fs.readFile(path.join(root, 'media-sync-state.json'), 'utf8'));
    assert.equal(Object.keys(syncState.pending).length, 3);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
  console.log('Flat custom image intake checks passed.');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
