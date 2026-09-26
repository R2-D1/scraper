import { promises as fs } from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';

import { prepareStoredRaster } from './lossless-raster';

sharp.concurrency(1);
sharp.cache(false);

const PARALLEL = 4;

const ROOT = path.resolve(__dirname, '..', '..', 'library');
const SOURCES = [
  'lummi/images',
  'unsplash/images',
  'unsplash/Illustration',
  'pexels/images',
  'custom-images/images',
  'custom-images/illustrations',
];

async function collectRasters(dir: string): Promise<string[]> {
  const paths: string[] = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) paths.push(...await collectRasters(entryPath));
    else if (entry.isFile() && /\.(jpg|jpeg|png|webp|avif)$/i.test(entry.name)) paths.push(entryPath);
  }
  return paths;
}

async function convertOne(sourcePath: string, apply: boolean): Promise<{ changed: boolean; saved: number }> {
  const original = await fs.readFile(sourcePath);
  const candidate = await prepareStoredRaster(original, sourcePath);
  const targetPath = sourcePath.slice(0, -path.extname(sourcePath).length) + candidate.extension;
  if (candidate.buffer.equals(original) && targetPath === sourcePath) return { changed: false, saved: 0 };
  let targetAlreadyWritten = false;
  if (targetPath !== sourcePath) {
    try {
      const existing = await fs.readFile(targetPath);
      if (!existing.equals(candidate.buffer)) throw new Error(`Цільовий файл уже існує і відрізняється: ${targetPath}`);
      targetAlreadyWritten = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  if (!apply) return { changed: true, saved: original.length - candidate.buffer.length };

  const temporaryPath = `${targetPath}.${process.pid}.tmp`;
  if (!targetAlreadyWritten) await fs.writeFile(temporaryPath, candidate.buffer);
  const stored = await sharp(targetAlreadyWritten ? targetPath : temporaryPath).metadata();
  const expectedFormat = candidate.extension === '.jpg' || candidate.extension === '.jpeg'
    ? 'jpeg'
    : candidate.extension.slice(1);
  if (stored.format !== expectedFormat || stored.width !== candidate.width || stored.height !== candidate.height) {
    if (!targetAlreadyWritten) await fs.rm(temporaryPath, { force: true });
    throw new Error(`Перевірка збереженого raster не пройшла: ${sourcePath}`);
  }
  if (!targetAlreadyWritten) await fs.rename(temporaryPath, targetPath);

  const metaPath = path.join(path.dirname(sourcePath), 'media-meta.json');
  try {
    const meta = JSON.parse(await fs.readFile(metaPath, 'utf8')) as Record<string, unknown>;
    if ('mimeType' in meta) meta.mimeType = candidate.mimeType;
    meta.width = candidate.width;
    meta.height = candidate.height;
    const metaTemp = `${metaPath}.${process.pid}.tmp`;
    await fs.writeFile(metaTemp, `${JSON.stringify(meta, null, 2)}\n`);
    await fs.rename(metaTemp, metaPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  if (targetPath !== sourcePath) await fs.rm(sourcePath);
  return { changed: true, saved: original.length - candidate.buffer.length };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const limitIndex = args.indexOf('--limit');
  const limit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : Infinity;
  if (!Number.isInteger(limit) || limit < 1) {
    if (limit !== Infinity) throw new Error('--limit має бути додатним цілим числом.');
  }
  if (args.some((arg, index) => arg !== '--apply' && arg !== '--limit' && index !== limitIndex + 1)) {
    throw new Error('Дозволені лише --apply та --limit N.');
  }
  let scanned = 0;
  let changed = 0;
  let saved = 0;
  let errors = 0;
  const paths: string[] = [];
  for (const source of SOURCES) {
    const dir = path.join(ROOT, source);
    paths.push(...await collectRasters(dir));
  }
  const total = Math.min(paths.length, limit);
  let nextIndex = 0;
  async function worker(): Promise<void> {
    while (nextIndex < total) {
      const sourcePath = paths[nextIndex++];
      let result: { result: { changed: boolean; saved: number }; error: string | null };
      try { result = { result: await convertOne(sourcePath, apply), error: null }; }
      catch (error) { result = { result: { changed: false, saved: 0 }, error: `${sourcePath}: ${error instanceof Error ? error.message : String(error)}` }; }
      scanned++;
      if (result.result.changed) { changed++; saved += result.result.saved; }
      if (result.error) { errors++; console.error(result.error); }
      if (scanned % 80 === 0) console.log(`${scanned} raster, ${changed} ${apply ? 'замінено' : 'кандидатів'}, економія ${(saved / 2 ** 30).toFixed(2)} GiB, помилок ${errors}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(PARALLEL, total) }, () => worker()));
  console.log(`Готово: ${scanned} raster, ${changed} ${apply ? 'замінено' : 'кандидатів'}, економія ${(saved / 2 ** 30).toFixed(2)} GiB, помилок ${errors}`);
  if (errors) process.exitCode = 1;
}

if (require.main === module) void main().catch(error => { console.error(error); process.exitCode = 1; });
