import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import sharp from 'sharp';

import { saveOriginal, type PexelsPhoto } from './pull-collections';

test('a downloaded Pexels PNG passes through the lossless storage gate', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pexels-raster-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const png = await sharp({ create: { width: 100, height: 70, channels: 3, background: '#ffaa22' } }).png().toBuffer();
  const photo = {
    id: 123,
    width: 100,
    height: 70,
    url: 'https://www.pexels.com/photo/example-123/',
    src: { original: 'https://images.pexels.com/example.png' },
  } as PexelsPhoto;
  const fetcher = (async () => new Response(new Uint8Array(png), {
    status: 200,
    headers: { 'content-type': 'image/png' },
  })) as typeof fetch;

  const stored = await saveOriginal(photo, dir, 'pexels-123', fetcher);
  assert.equal(stored.mimeType, 'image/webp');
  assert.equal(stored.width, 100);
  assert.equal(stored.height, 70);
  const webp = await fs.readFile(path.join(dir, 'pexels-123.webp'));
  assert.ok(webp.length < png.length);
  assert.deepEqual(await sharp(webp).raw().toBuffer(), await sharp(png).raw().toBuffer());
});

test('a downloaded Pexels JPEG stays byte-for-byte unchanged', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pexels-jpeg-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const jpeg = await sharp({ create: { width: 80, height: 60, channels: 3, background: '#123456' } }).jpeg().toBuffer();
  const photo = {
    id: 456,
    width: 80,
    height: 60,
    url: 'https://www.pexels.com/photo/example-456/',
    src: { original: 'https://images.pexels.com/example.jpg' },
  } as PexelsPhoto;
  const fetcher = (async () => new Response(new Uint8Array(jpeg), {
    status: 200,
    headers: { 'content-type': 'image/jpeg' },
  })) as typeof fetch;

  const stored = await saveOriginal(photo, dir, 'pexels-456', fetcher);
  assert.equal(stored.mimeType, 'image/jpeg');
  assert.deepEqual(await fs.readFile(path.join(dir, 'pexels-456.jpg')), jpeg);
});
