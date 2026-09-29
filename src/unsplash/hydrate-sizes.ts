import { promises as fs, Dirent } from 'node:fs';
import path from 'node:path';
import { markMediaPendingForMetadata } from '../media-import/media-sync-state';

import sharp from 'sharp';

import {
  PEXELS_IMAGES_ROOT,
  UNSPLASH_ILLUSTRATIONS_ROOT,
  UNSPLASH_IMAGES_ROOT,
} from '../config/paths';
import { MEDIA_META_FILE } from './library-paths';
import type { MediaMetadata } from './import-utils';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.svg']);

type HydrationResult = 'updated' | 'skipped-existing' | 'skipped-missing-file';

export type HydrationSummary = {
  total: number;
  updated: number;
  skippedExisting: number;
  missingFile: number;
  failed: number;
};

function isPositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function parseDimension(value: string): number | null {
  const match = value.trim().match(/^([0-9]+(?:\.[0-9]+)?)(px)?$/i);
  if (!match) {
    return null;
  }
  return parseFloat(match[1]);
}

async function measureSvg(filePath: string): Promise<{ width: number; height: number }> {
  const content = await fs.readFile(filePath, 'utf-8');

  const viewBoxMatch = content.match(/\bviewBox\s*=\s*['"]([^'"]+)['"]/i);
  if (viewBoxMatch) {
    const [, raw] = viewBoxMatch;
    const parts = raw.trim().split(/\s+/);
    if (parts.length === 4) {
      const width = parseFloat(parts[2]);
      const height = parseFloat(parts[3]);
      if (isPositive(width) && isPositive(height)) {
        return { width, height };
      }
    }
  }

  const widthMatch = content.match(/\bwidth\s*=\s*['"]([^'"]+)['"]/i);
  const heightMatch = content.match(/\bheight\s*=\s*['"]([^'"]+)['"]/i);
  const width = widthMatch ? parseDimension(widthMatch[1]) : null;
  const height = heightMatch ? parseDimension(heightMatch[1]) : null;
  if (isPositive(width) && isPositive(height)) {
    return { width, height };
  }

  throw new Error('Не вдалося визначити розміри SVG (відсутні viewBox/width/height).');
}

async function measureMedia(filePath: string): Promise<{ width: number; height: number }> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.svg') {
    return measureSvg(filePath);
  }

  const meta = await sharp(filePath).metadata();
  if (!isPositive(meta.width) || !isPositive(meta.height)) {
    throw new Error('Sharp не повернув ширину/висоту.');
  }
  return { width: meta.width, height: meta.height };
}

async function findPrimaryMediaFile(dir: string, slug: string): Promise<string | null> {
  let entries: Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }

  const candidates: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    if (entry.name === MEDIA_META_FILE || entry.name.includes('_thumb')) {
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(ext)) {
      continue;
    }
    const baseName = entry.name.slice(0, -ext.length);
    if (baseName === slug) {
      return path.join(dir, entry.name);
    }
    candidates.push(path.join(dir, entry.name));
  }

  return candidates[0] ?? null;
}

async function hydrateMeta(metaPath: string): Promise<HydrationResult> {
  const raw = await fs.readFile(metaPath, 'utf-8');
  const meta = JSON.parse(raw) as MediaMetadata;

  if (isPositive(meta.width) && isPositive(meta.height)) {
    return 'skipped-existing';
  }

  const dir = path.dirname(metaPath);
  const slug = meta.slug || path.basename(dir);
  const mediaFile = await findPrimaryMediaFile(dir, slug);

  if (!mediaFile) {
    console.warn(`  ⚠ Не знайдено файл медіа для ${metaPath}`);
    return 'skipped-missing-file';
  }

  const { width, height } = await measureMedia(mediaFile);
  const next: MediaMetadata = {
    ...meta,
    width: Math.round(width),
    height: Math.round(height),
  };

  const serialized = `${JSON.stringify(next, null, 2)}\n`;
  await fs.writeFile(metaPath, serialized, 'utf-8');
  await markMediaPendingForMetadata(metaPath, 'metadata');
  return 'updated';
}

export async function collectMetaFiles(
  roots: readonly string[] = [UNSPLASH_IMAGES_ROOT, UNSPLASH_ILLUSTRATIONS_ROOT],
): Promise<string[]> {
  const metaFiles: string[] = [];

  for (const root of roots) {
    const stack = [root];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) {
        break;
      }
      let entries: Dirent[];
      try {
        entries = await fs.readdir(current, { withFileTypes: true });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          continue;
        }
        throw error;
      }

      for (const entry of entries) {
        const fullPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(fullPath);
          continue;
        }
        if (entry.isFile() && entry.name === MEDIA_META_FILE) {
          metaFiles.push(fullPath);
        }
      }
    }
  }

  metaFiles.sort((a, b) => a.localeCompare(b, 'uk'));
  return metaFiles;
}

export async function hydrateSizes(
  roots: readonly string[] = [UNSPLASH_IMAGES_ROOT, UNSPLASH_ILLUSTRATIONS_ROOT],
): Promise<HydrationSummary> {
  const metaFiles = await collectMetaFiles(roots);
  let updated = 0;
  let skippedExisting = 0;
  let missingFile = 0;
  let failed = 0;

  for (const metaPath of metaFiles) {
    const relative = path.relative(PROJECT_ROOT, metaPath);
    try {
      const result = await hydrateMeta(metaPath);
      if (result === 'updated') {
        updated += 1;
        console.log(`  ✔ Оновлено ${relative}`);
      } else if (result === 'skipped-existing') {
        skippedExisting += 1;
      } else if (result === 'skipped-missing-file') {
        missingFile += 1;
      }
    } catch (error) {
      failed += 1;
      console.error(`  ✖ Помилка для ${relative}: ${(error as Error).message}`);
    }
  }

  return {
    total: metaFiles.length,
    updated,
    skippedExisting,
    missingFile,
    failed,
  };
}

async function main(): Promise<void> {
  try {
    const metaFiles = await collectMetaFiles();
    if (metaFiles.length === 0) {
      console.log('Не знайдено жодного media-meta.json у бібліотеці Unsplash.');
      return;
    }

    console.log(`Знайдено ${metaFiles.length} meta-файлів. Починаю гідрацію width/height...\n`);
    const summary = await hydrateSizes();

    console.log('\nРезультат:');
    console.log(`  Оновлено: ${summary.updated}`);
    console.log(`  Пропущено (вже були розміри): ${summary.skippedExisting}`);
    console.log(`  Пропущено (немає файла медіа): ${summary.missingFile}`);
    console.log(`  Помилок: ${summary.failed}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Помилка: ${message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  void main();
}
