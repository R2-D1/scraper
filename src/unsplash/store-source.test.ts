import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import sharp from 'sharp';

import { storeUnsplashSource } from './store-source';

test('an imported Unsplash PNG is saved as smaller lossless WebP and replaces the old raster', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'unsplash-raster-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const sourcePath = path.join(root, 'download.png');
  const outputDir = path.join(root, 'library');
  await fs.mkdir(outputDir);
  await fs.writeFile(path.join(outputDir, 'example.jpg'), 'old');
  const png = await sharp({ create: { width: 100, height: 70, channels: 3, background: '#ffaa22' } }).png().toBuffer();
  await fs.writeFile(sourcePath, png);

  const stored = await storeUnsplashSource(sourcePath, outputDir, 'example');
  assert.equal(stored.name, 'example.webp');
  assert.equal(stored.raster?.mimeType, 'image/webp');
  const webp = await fs.readFile(path.join(outputDir, stored.name));
  assert.ok(webp.length < png.length);
  assert.deepEqual(await sharp(webp).raw().toBuffer(), await sharp(png).raw().toBuffer());
  await assert.rejects(fs.access(path.join(outputDir, 'example.jpg')), { code: 'ENOENT' });
});

test('an imported Unsplash JPEG stays byte-for-byte unchanged', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'unsplash-jpeg-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const sourcePath = path.join(root, 'download.jpg');
  const jpeg = await sharp({ create: { width: 80, height: 60, channels: 3, background: '#123456' } }).jpeg().toBuffer();
  await fs.writeFile(sourcePath, jpeg);

  const stored = await storeUnsplashSource(sourcePath, path.join(root, 'library'), 'example');
  assert.equal(stored.name, 'example.jpg');
  assert.equal(stored.raster?.mimeType, 'image/jpeg');
  assert.deepEqual(await fs.readFile(path.join(root, 'library', stored.name)), jpeg);
});
