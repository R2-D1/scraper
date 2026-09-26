import path from 'node:path';

import sharp from 'sharp';

const RASTER_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
export const STORED_IMAGE_MAX_WIDTH = 2400;

export type StoredRaster = {
  buffer: Buffer;
  extension: string;
  mimeType: string;
  width: number;
  height: number;
};

export async function prepareStoredRaster(buffer: Buffer, sourceName: string): Promise<StoredRaster> {
  const namedExtension = path.extname(sourceName).toLowerCase();
  if (!RASTER_EXTENSIONS.has(namedExtension)) throw new Error(`Непідтримуваний raster: ${sourceName}`);

  const metadata = await sharp(buffer).metadata();
  if (!metadata.width || !metadata.height) throw new Error(`Raster не має валідних розмірів: ${sourceName}`);
  const extension = metadata.format === 'jpeg' ? '.jpg' : `.${metadata.format}`;
  if (!RASTER_EXTENSIONS.has(extension)) throw new Error(`Непідтримуваний raster: ${sourceName}`);
  if (extension === '.png' && metadata.width > STORED_IMAGE_MAX_WIDTH && metadata.depth !== 'uchar') {
    throw new Error(`PNG з глибиною понад 8 біт потребує окремої обробки: ${sourceName}`);
  }

  if (extension === '.png' && metadata.depth === 'uchar' && (metadata.pages ?? 1) === 1) {
    const needsResize = metadata.width > STORED_IMAGE_MAX_WIDTH;
    const image = needsResize
      ? sharp(buffer).resize({ width: STORED_IMAGE_MAX_WIDTH, withoutEnlargement: true })
      : sharp(buffer);
    const webp = await image.clone().keepIccProfile().webp({ lossless: true, effort: 0 }).toBuffer({ resolveWithObject: true });
    const png = needsResize
      ? await image.clone().keepIccProfile().png().toBuffer()
      : buffer;
    if (webp.data.length < png.length) {
      return { buffer: webp.data, extension: '.webp', mimeType: 'image/webp', width: webp.info.width, height: webp.info.height };
    }
    if (needsResize) return { buffer: png, extension: '.png', mimeType: 'image/png', width: webp.info.width, height: webp.info.height };
  }

  if (metadata.width > STORED_IMAGE_MAX_WIDTH) {
    const lossless = extension === '.webp';
    const output = await sharp(buffer)
      .resize({ width: STORED_IMAGE_MAX_WIDTH, withoutEnlargement: true })
      .keepIccProfile()
      .webp(lossless ? { lossless: true, effort: 0 } : { quality: 95, smartSubsample: true })
      .toBuffer({ resolveWithObject: true });
    return { buffer: output.data, extension: '.webp', mimeType: 'image/webp', width: output.info.width, height: output.info.height };
  }

  return {
    buffer,
    extension,
    mimeType: extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg' : `image/${extension.slice(1)}`,
    width: metadata.width,
    height: metadata.height,
  };
}
