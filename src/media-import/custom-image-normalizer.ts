import { promises as fs } from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';
import { optimize } from 'svgo';

import { prepareStoredRaster } from './lossless-raster';

const RASTER_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function stripPngAncillaryChunks(buffer: Buffer): Buffer {
  if (!buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error('Нормалізований PNG має некоректний signature.');
  }

  const chunks = [buffer.subarray(0, PNG_SIGNATURE.length)];
  let offset = PNG_SIGNATURE.length;
  let foundEnd = false;
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const end = offset + 12 + length;
    if (end > buffer.length) throw new Error('Нормалізований PNG має пошкоджений chunk.');
    const chunk = buffer.subarray(offset, end);
    const type = chunk.toString('ascii', 4, 8);
    if ((type.charCodeAt(0) & 0x20) === 0) chunks.push(chunk);
    offset = end;
    if (type === 'IEND') {
      foundEnd = true;
      break;
    }
  }

  if (!foundEnd) throw new Error('Нормалізований PNG не має IEND chunk.');
  return Buffer.concat(chunks);
}

function stripSvgMetadata(source: string): string {
  const result = optimize(source, {
    js2svg: { pretty: false },
    plugins: ['removeXMLProcInst', 'removeComments', 'removeMetadata', 'removeEditorsNSData'],
  });
  if (!('data' in result)) throw new Error('SVGO не повернув нормалізований SVG.');
  return `${result.data.trim()}\n`;
}

export async function normalizeCustomImageAssetToBuffer(sourcePath: string): Promise<Buffer> {
  const extension = path.extname(sourcePath).toLowerCase();
  if (RASTER_EXTENSIONS.has(extension)) {
    // Sharp writes the original format without carrying metadata forward. rotate() applies EXIF orientation before it is stripped.
    const normalized = await sharp(sourcePath).rotate().toBuffer();
    return extension === '.png' ? stripPngAncillaryChunks(normalized) : normalized;
  }

  if (extension === '.svg') {
    const source = await fs.readFile(sourcePath, 'utf-8');
    return Buffer.from(stripSvgMetadata(source), 'utf-8');
  }

  throw new Error(`Непідтримуваний custom image asset: ${sourcePath}.`);
}

export async function normalizeCustomImageAsset(sourcePath: string, targetDir: string, slug: string): Promise<string> {
  const extension = path.extname(sourcePath).toLowerCase();
  const normalized = await normalizeCustomImageAssetToBuffer(sourcePath);
  const raster = extension === '.svg' ? null : await prepareStoredRaster(normalized, sourcePath);
  const targetPath = path.join(targetDir, `${slug}${raster?.extension ?? extension}`);
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(targetPath, raster?.buffer ?? normalized);
  for (const entry of await fs.readdir(targetDir)) {
    if (entry !== path.basename(targetPath) && entry.startsWith(`${slug}.`) && (RASTER_EXTENSIONS.has(path.extname(entry).toLowerCase()) || path.extname(entry).toLowerCase() === '.svg')) {
      await fs.rm(path.join(targetDir, entry));
    }
  }
  return targetPath;
}
