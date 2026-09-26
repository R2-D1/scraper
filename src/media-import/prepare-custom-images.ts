import { promises as fs, Dirent } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import sharp from 'sharp';

import {
  CUSTOM_IMAGES_ROOT,
  MEDIA_COLLECTION_REGISTRY_PATH,
  RELATED_IMAGE_GROUPS_PATH,
} from '../config/paths';
import { mediaSettings } from '../config/media-settings';
import { CUSTOM_IMAGE_META_FILE, loadCustomImageLibrary, type CustomImageMeta } from './custom-images';
import {
  archiveMediaCollection,
  loadMediaCollectionCurationItems,
  requireAssignedMediaCollections,
  type MediaCollectionDefinition,
  validateMediaCollectionCuration,
} from './media-collections';
import {
  buildRelatedImageGroupByMediaKey,
  loadRelatedImageGroupRegistry,
  validateRelatedImageGroups,
} from './related-image-groups';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.svg']);
const { thumbWidth, thumbSuffix, thumbQuality, webpQuality, variantWidths, variantThresholdRatio, maxSvgBytes, minSvgThumbBytes } = mediaSettings;

export type CustomImageExportOptions = {
  outDir: string;
  root?: string;
  registryPath?: string;
  relatedGroupsPath?: string;
  includeSlugs?: ReadonlySet<string>;
};
type PreparedImage = { mainFile: string; width: number; height: number };

function isPositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isInside(child: string, parent: string): boolean {
  const relative = path.relative(parent, child);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function assertSafeOutputDir(outDir: string): void {
  const resolved = path.resolve(outDir);
  const safe = isInside(resolved, path.join(PROJECT_ROOT, 'tmp')) || isInside(resolved, os.tmpdir());
  if (!safe) throw new Error('Вихідна тека має бути всередині tmp проєкту або системної тимчасової теки.');
}

function variantName(slug: string, width: number): string {
  return `${slug}_w${width}.webp`;
}

function isVariant(name: string, slug: string): boolean {
  const base = name.toLowerCase().endsWith('.webp') ? name.slice(0, -5) : '';
  return base.startsWith(`${slug.toLowerCase()}_w`) && /_w\d+$/i.test(base);
}

function parseDimension(value: string): number | null {
  const match = value.trim().match(/^([0-9]+(?:\.[0-9]+)?)(px)?$/i);
  return match ? Number(match[1]) : null;
}

async function measureSvg(filePath: string): Promise<{ width: number; height: number }> {
  const content = await fs.readFile(filePath, 'utf-8');
  const viewBox = content.match(/\bviewBox\s*=\s*['"]([^'"]+)['"]/i)?.[1]?.trim().split(/\s+/);
  if (viewBox?.length === 4 && isPositive(Number(viewBox[2])) && isPositive(Number(viewBox[3]))) {
    return { width: Number(viewBox[2]), height: Number(viewBox[3]) };
  }
  const width = parseDimension(content.match(/\bwidth\s*=\s*['"]([^'"]+)['"]/i)?.[1] ?? '');
  const height = parseDimension(content.match(/\bheight\s*=\s*['"]([^'"]+)['"]/i)?.[1] ?? '');
  if (isPositive(width) && isPositive(height)) return { width, height };
  throw new Error('Не вдалося визначити розміри SVG: потрібен viewBox або width/height.');
}

async function findPrimary(sourceDir: string, slug: string): Promise<string> {
  const entries: Dirent[] = await fs.readdir(sourceDir, { withFileTypes: true });
  const candidates: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || entry.name === CUSTOM_IMAGE_META_FILE || entry.name.includes(thumbSuffix) || isVariant(entry.name, slug)) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(ext)) continue;
    if (entry.name.slice(0, -ext.length) === slug) return path.join(sourceDir, entry.name);
    candidates.push(path.join(sourceDir, entry.name));
  }
  if (!candidates[0]) throw new Error(`Не знайдено файл біля ${CUSTOM_IMAGE_META_FILE}.`);
  return candidates[0];
}

async function writeRaster(sourcePath: string, targetDir: string, slug: string): Promise<PreparedImage> {
  const metadata = await sharp(sourcePath).metadata();
  const maxWidth = variantWidths[variantWidths.length - 1];
  let pipeline = sharp(sourcePath);
  if (Number.isFinite(maxWidth) && maxWidth > 0) {
    pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true });
  }
  const output = await pipeline
    .webp({ quality: webpQuality, smartSubsample: true })
    .toBuffer({ resolveWithObject: true });
  await fs.writeFile(path.join(targetDir, `${slug}.webp`), output.data);
  const thumb = await sharp(sourcePath).resize({ width: thumbWidth, withoutEnlargement: true }).webp({ quality: thumbQuality }).toBuffer();
  await fs.writeFile(path.join(targetDir, `${slug}${thumbSuffix}.webp`), thumb);
  const sourceWidth = metadata.width ?? output.info.width;
  for (const width of variantWidths.filter(value => value > 0 && value < sourceWidth && sourceWidth / value >= variantThresholdRatio)) {
    const variant = width === output.info.width
      ? output.data
      : await sharp(sourcePath).resize({ width, withoutEnlargement: true }).webp({ quality: webpQuality, smartSubsample: true }).toBuffer();
    await fs.writeFile(path.join(targetDir, variantName(slug, width)), variant);
  }
  return { mainFile: `${slug}.webp`, width: output.info.width, height: output.info.height };
}

async function writeSvg(sourcePath: string, targetDir: string, slug: string): Promise<PreparedImage> {
  const stats = await fs.stat(sourcePath);
  if (stats.size > maxSvgBytes) throw new Error(`SVG перевищує ліміт ${maxSvgBytes} байт.`);
  const dimensions = await measureSvg(sourcePath);
  await fs.copyFile(sourcePath, path.join(targetDir, `${slug}.svg`));
  if (stats.size > minSvgThumbBytes) {
    const thumb = await sharp(sourcePath).resize({ width: thumbWidth, withoutEnlargement: true }).webp({ quality: thumbQuality }).toBuffer();
    if (thumb.length < stats.size * 0.8) await fs.writeFile(path.join(targetDir, `${slug}${thumbSuffix}.webp`), thumb);
  }
  return { mainFile: `${slug}.svg`, ...dimensions };
}

function buildArchiveMeta(
  meta: CustomImageMeta,
  collections: Map<string, MediaCollectionDefinition>,
  relatedGroup?: { key: string; position: number },
): Record<string, unknown> {
  const archiveCollections = requireAssignedMediaCollections(
    collections,
    meta.collectionSlugs,
    meta.category.key,
    meta.slug,
  ).map(archiveMediaCollection);
  const { collectionSlugs: _collectionSlugs, ...rest } = meta;
  return {
    ...rest,
    pinned: meta.pinned === true,
    collections: archiveCollections,
    relatedGroup: relatedGroup ?? null,
  };
}

export async function appendCustomImagesToExport(options: CustomImageExportOptions): Promise<{ copied: number; total: number }> {
  assertSafeOutputDir(options.outDir);
  const library = await loadCustomImageLibrary(
    options.root ?? CUSTOM_IMAGES_ROOT,
    options.registryPath ?? MEDIA_COLLECTION_REGISTRY_PATH,
  );
  const curationItems = options.root
    ? library.images.map(({ meta }) => ({
        mediaKey: meta.mediaKey,
        category: meta.category.key,
        collectionSlugs: meta.collectionSlugs,
      }))
    : await loadMediaCollectionCurationItems();
  validateMediaCollectionCuration(
    new Map(library.collections.map(collection => [collection.slug, collection])),
    curationItems,
  );
  const relatedGroupsPath = options.relatedGroupsPath
    ?? (options.root
      ? path.join(path.dirname(options.root), 'related-image-groups.json')
      : RELATED_IMAGE_GROUPS_PATH);
  const relatedGroups = await loadRelatedImageGroupRegistry(relatedGroupsPath);
  validateRelatedImageGroups(relatedGroups, curationItems.map(item => ({
    mediaKey: item.mediaKey,
    category: item.category,
  })));
  const relatedGroupByMediaKey = buildRelatedImageGroupByMediaKey(relatedGroups);
  await fs.mkdir(options.outDir, { recursive: true });
  const collections = new Map(library.collections.map(collection => [collection.slug, collection]));

  let copied = 0;
  const selectedImages = options.includeSlugs
    ? library.images.filter(record => options.includeSlugs?.has(record.meta.slug))
    : library.images;
  for (const record of selectedImages) {
    if (record.meta.taggingStatus === 'pending') {
      throw new Error(`Custom image "${record.meta.slug}" ще не завершив локалізацію.`);
    }
    const sourcePath = await findPrimary(record.sourceDir, record.meta.slug);
    const target = path.join(options.outDir, record.meta.slug);
    let prepared: PreparedImage;
    try {
      await fs.access(target);
      const existingMeta = JSON.parse(
        await fs.readFile(path.join(target, CUSTOM_IMAGE_META_FILE), 'utf-8'),
      ) as { mediaKey?: string };
      if (existingMeta.mediaKey !== record.meta.mediaKey) {
        throw new Error(`Дубль slug "${record.meta.slug}" між джерелами зображень.`);
      }
      const existingPrimary = await findPrimary(target, record.meta.slug);
      const dimensions = path.extname(existingPrimary).toLowerCase() === '.svg'
        ? await measureSvg(existingPrimary)
        : await sharp(existingPrimary).metadata();
      if (!isPositive(dimensions.width) || !isPositive(dimensions.height)) {
        throw new Error(`Не вдалося визначити розміри "${record.meta.slug}".`);
      }
      prepared = {
        mainFile: path.basename(existingPrimary),
        width: dimensions.width,
        height: dimensions.height,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      await fs.mkdir(target, { recursive: true });
      prepared = path.extname(sourcePath).toLowerCase() === '.svg'
        ? await writeSvg(sourcePath, target, record.meta.slug)
        : await writeRaster(sourcePath, target, record.meta.slug);
    }
    await fs.writeFile(path.join(target, CUSTOM_IMAGE_META_FILE), `${JSON.stringify({
      ...buildArchiveMeta(
        record.meta,
        collections,
        relatedGroupByMediaKey.get(record.meta.mediaKey),
      ),
      width: prepared.width,
      height: prepared.height,
    }, null, 2)}\n`, 'utf-8');
    copied += 1;
  }
  return { copied, total: selectedImages.length };
}
