import { promises as fs } from 'node:fs';
import path from 'node:path';

import { prepareStoredRaster, type StoredRaster } from '../media-import/lossless-raster';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.svg']);

export async function storeUnsplashSource(sourcePath: string, outputDir: string, slug: string): Promise<{ name: string; raster: StoredRaster | null }> {
  const sourceName = path.basename(sourcePath);
  const extension = path.extname(sourceName).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(extension)) throw new Error(`Непідтримуваний формат: ${sourceName}`);

  const raster = extension === '.svg' ? null : await prepareStoredRaster(await fs.readFile(sourcePath), sourceName);
  const name = `${slug}${raster?.extension ?? extension}`;
  const targetPath = path.join(outputDir, name);
  await fs.mkdir(outputDir, { recursive: true });
  if (raster) {
    const temporaryPath = `${targetPath}.${process.pid}.tmp`;
    await fs.writeFile(temporaryPath, raster.buffer);
    await fs.rename(temporaryPath, targetPath);
    for (const entry of await fs.readdir(outputDir)) {
      if (entry !== name && entry.startsWith(`${slug}.`) && IMAGE_EXTENSIONS.has(path.extname(entry).toLowerCase())) {
        await fs.rm(path.join(outputDir, entry));
      }
    }
  } else {
    await fs.copyFile(sourcePath, targetPath);
  }
  return { name, raster };
}
