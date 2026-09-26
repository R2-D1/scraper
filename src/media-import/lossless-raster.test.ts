import assert from 'node:assert/strict';
import test from 'node:test';

import sharp from 'sharp';

import { prepareStoredRaster } from './lossless-raster';

test('stores a smaller lossless WebP without changing pixels or dimensions', async () => {
  const png = await sharp({ create: { width: 64, height: 64, channels: 4, background: '#12345680' } }).png().toBuffer();
  const stored = await prepareStoredRaster(png, 'example.png');

  assert.equal(stored.extension, '.webp');
  assert.equal(stored.mimeType, 'image/webp');
  assert.equal(stored.width, 64);
  assert.equal(stored.height, 64);
  assert.ok(stored.buffer.length < png.length);
  assert.deepEqual(await sharp(stored.buffer).raw().toBuffer(), await sharp(png).raw().toBuffer());
});

test('keeps PNG when lossless WebP would be larger', async () => {
  const pixels = Buffer.alloc(64 * 64 * 4);
  let seed = 1;
  for (let index = 0; index < pixels.length; index++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    pixels[index] = seed >>> 24;
  }
  pixels.fill(0, 0, 64 * 64 * 3);
  const png = await sharp(pixels, { raw: { width: 64, height: 64, channels: 4 } }).png().toBuffer();
  const stored = await prepareStoredRaster(png, 'noise.png');

  assert.equal(stored.extension, '.png');
  assert.deepEqual(stored.buffer, png);
});

test('keeps an already compressed JPEG unchanged at full resolution', async () => {
  const jpeg = await sharp({ create: { width: 80, height: 60, channels: 3, background: '#123456' } }).jpeg().toBuffer();
  const stored = await prepareStoredRaster(jpeg, 'example.jpg');

  assert.equal(stored.extension, '.jpg');
  assert.equal(stored.mimeType, 'image/jpeg');
  assert.equal(stored.width, 80);
  assert.equal(stored.height, 60);
  assert.deepEqual(stored.buffer, jpeg);
});

test('uses the real format when a JPEG was named PNG', async () => {
  const jpeg = await sharp({ create: { width: 80, height: 60, channels: 3, background: '#123456' } }).jpeg().toBuffer();
  const stored = await prepareStoredRaster(jpeg, 'incorrect.png');

  assert.equal(stored.extension, '.jpg');
  assert.equal(stored.mimeType, 'image/jpeg');
  assert.deepEqual(stored.buffer, jpeg);
});

test('reduces oversized PNG to 2400 pixels wide without cropping', async () => {
  const png = await sharp({ create: { width: 3000, height: 1200, channels: 3, background: '#123456' } }).png().toBuffer();
  const stored = await prepareStoredRaster(png, 'wide.png');

  assert.equal(stored.width, 2400);
  assert.equal(stored.height, 960);
  const actual = await sharp(stored.buffer).raw().toBuffer();
  const expected = await sharp(png).resize({ width: 2400 }).raw().toBuffer();
  assert.deepEqual(actual, expected);
});

test('reduces oversized JPEG to a 2400 pixel WebP master at quality 95', async () => {
  const jpeg = await sharp({ create: { width: 3000, height: 1200, channels: 3, background: '#123456' } }).jpeg().toBuffer();
  const stored = await prepareStoredRaster(jpeg, 'wide.jpg');

  assert.equal(stored.extension, '.webp');
  assert.equal(stored.mimeType, 'image/webp');
  assert.equal(stored.width, 2400);
  assert.equal(stored.height, 960);
  assert.equal((await sharp(stored.buffer).metadata()).format, 'webp');
});

test('reduces a lossless WebP master without lossy re-encoding', async () => {
  const source = await sharp({ create: { width: 3000, height: 1200, channels: 3, background: '#123456' } })
    .webp({ lossless: true }).toBuffer();
  const stored = await prepareStoredRaster(source, 'wide.webp');

  assert.equal(stored.width, 2400);
  assert.equal(stored.height, 960);
  assert.deepEqual(
    await sharp(stored.buffer).raw().toBuffer(),
    await sharp(source).resize({ width: 2400 }).raw().toBuffer(),
  );
});
