import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { markMediaPendingForMetadata } from './media-sync-state';

import { CUSTOM_IMAGES_ROOT, MEDIA_COLLECTION_REGISTRY_PATH } from '../config/paths';
import { normalizeCustomImageAsset } from './custom-image-normalizer';
import {
  CUSTOM_IMAGE_KIND,
  CUSTOM_IMAGE_META_FILE,
  CUSTOM_IMAGE_SCHEMA_VERSION,
  customImageCategoryDir,
  loadCustomImageLibrary,
  type CustomImageCategoryKey,
  type CustomImageMeta,
} from './custom-images';

export const CUSTOM_COLLECTION_MANIFEST = '_collection.json';
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.svg']);
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type LocalizedText = { en: string; uk: string };
type Link = { name: string; url: string };
type ItemOverride = { title?: string; tags?: string[]; pinned?: boolean };
type CollectionPackage = {
  schemaVersion: 1;
  collection: { slug: string; name: LocalizedText };
  category: CustomImageCategoryKey;
  source: Link;
  author: Link;
  license: Link;
  tags: string[];
  pinned: boolean;
  items?: Record<string, ItemOverride>;
};

export type CustomCollectionIngestResult = {
  collectionSlug: string;
  slugs: string[];
  items: number;
  created: number;
  updated: number;
  dryRun: boolean;
};

function fail(message: string): never { throw new Error(message); }
function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) fail(`${label} не може бути порожнім.`);
  return value.trim();
}
function url(value: unknown, label: string): string {
  const result = text(value, label);
  if (!/^https?:\/\//i.test(result)) fail(`${label} має бути HTTP(S) URL.`);
  return result;
}
function slug(value: unknown, label: string): string {
  const result = text(value, label).toLowerCase();
  if (!SLUG_PATTERN.test(result)) fail(`${label} має бути slug у kebab-case.`);
  return result;
}
function strings(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) fail(`${label} має бути масивом.`);
  return [...new Set(value.map((item, index) => text(item, `${label}[${index}]`)))];
}
function link(value: unknown, label: string): Link {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} має бути об'єктом.`);
  const item = value as Record<string, unknown>;
  return { name: text(item.name, `${label}.name`), url: url(item.url, `${label}.url`) };
}
function localized(value: unknown, label: string): LocalizedText {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} має бути об'єктом.`);
  const item = value as Record<string, unknown>;
  return { en: text(item.en, `${label}.en`), uk: text(item.uk, `${label}.uk`) };
}

function parsePackage(raw: unknown): CollectionPackage {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail(`${CUSTOM_COLLECTION_MANIFEST} має бути об'єктом.`);
  const value = raw as Record<string, unknown>;
  const allowed = new Set(['schemaVersion', 'collection', 'category', 'source', 'author', 'license', 'tags', 'pinned', 'items']);
  const unknown = Object.keys(value).filter(key => !allowed.has(key));
  if (unknown.length) fail(`${CUSTOM_COLLECTION_MANIFEST} має невідомі поля: ${unknown.join(', ')}.`);
  if (value.schemaVersion !== 1) fail('schemaVersion має дорівнювати 1.');
  if (!value.collection || typeof value.collection !== 'object' || Array.isArray(value.collection)) fail('collection має бути об’єктом.');
  const collection = value.collection as Record<string, unknown>;
  const category = text(value.category, 'category');
  if (category !== 'images' && category !== 'illustrations') fail('category має бути images або illustrations.');
  if (typeof value.pinned !== 'boolean') fail('pinned має бути boolean.');
  const items: Record<string, ItemOverride> = {};
  if (value.items !== undefined) {
    if (!value.items || typeof value.items !== 'object' || Array.isArray(value.items)) fail('items має бути об’єктом.');
    for (const [fileName, rawOverride] of Object.entries(value.items as Record<string, unknown>)) {
      if (!rawOverride || typeof rawOverride !== 'object' || Array.isArray(rawOverride)) fail(`items.${fileName} має бути об’єктом.`);
      const override = rawOverride as Record<string, unknown>;
      const allowedOverride = new Set(['title', 'tags', 'pinned']);
      const unknownOverride = Object.keys(override).filter(key => !allowedOverride.has(key));
      if (unknownOverride.length) fail(`items.${fileName} має невідомі поля: ${unknownOverride.join(', ')}.`);
      items[fileName] = {
        ...(override.title === undefined ? {} : { title: text(override.title, `items.${fileName}.title`) }),
        ...(override.tags === undefined ? {} : { tags: strings(override.tags, `items.${fileName}.tags`) }),
        ...(override.pinned === undefined ? {} : typeof override.pinned === 'boolean' ? { pinned: override.pinned } : fail(`items.${fileName}.pinned має бути boolean.`)),
      };
    }
  }
  return {
    schemaVersion: 1,
    collection: { slug: slug(collection.slug, 'collection.slug'), name: localized(collection.name, 'collection.name') },
    category,
    source: link(value.source, 'source'),
    author: link(value.author, 'author'),
    license: link(value.license, 'license'),
    tags: strings(value.tags, 'tags'),
    pinned: value.pinned,
    ...(Object.keys(items).length ? { items } : {}),
  };
}

function humanizeFileName(fileName: string): string {
  return path.basename(fileName, path.extname(fileName))
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\bDoddle\b/g, 'Doodle')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(value: string): string {
  const result = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!result) fail(`Не вдалося створити slug з назви "${value}".`);
  return result;
}

function tagKey(value: string): string { return slugify(value); }

async function readPackage(folderDir: string): Promise<CollectionPackage> {
  const raw = JSON.parse(await fs.readFile(path.join(folderDir, CUSTOM_COLLECTION_MANIFEST), 'utf-8')) as unknown;
  return parsePackage(raw);
}

async function registerCollection(manifest: CollectionPackage, registryPath: string, dryRun: boolean): Promise<void> {
  const raw = JSON.parse(await fs.readFile(registryPath, 'utf-8')) as { schemaVersion: number; collections: Record<string, unknown> };
  const expected = { name: manifest.collection.name, category: manifest.category };
  const existing = raw.collections[manifest.collection.slug];
  if (existing && JSON.stringify(existing) !== JSON.stringify(expected)) {
    fail(`Колекція "${manifest.collection.slug}" вже має інше визначення.`);
  }
  if (!existing && !dryRun) {
    raw.collections[manifest.collection.slug] = expected;
    await fs.writeFile(registryPath, `${JSON.stringify(raw, null, 2)}\n`, 'utf-8');
  }
}

export async function hasCustomCollectionManifest(folderDir: string): Promise<boolean> {
  try { await fs.access(path.join(folderDir, CUSTOM_COLLECTION_MANIFEST)); return true; } catch { return false; }
}

export async function ingestCustomCollectionFolder(options: {
  folderDir: string;
  targetRoot?: string;
  registryPath?: string;
  dryRun?: boolean;
}): Promise<CustomCollectionIngestResult> {
  const folderDir = path.resolve(options.folderDir);
  const targetRoot = path.resolve(options.targetRoot ?? CUSTOM_IMAGES_ROOT);
  const registryPath = path.resolve(options.registryPath ?? MEDIA_COLLECTION_REGISTRY_PATH);
  const manifest = await readPackage(folderDir);
  const files = (await fs.readdir(folderDir, { withFileTypes: true }))
    .filter(entry => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map(entry => entry.name).sort((a, b) => a.localeCompare(b));
  if (!files.length) fail(`У ${folderDir} немає підтримуваних зображень.`);
  for (const overrideName of Object.keys(manifest.items ?? {})) {
    if (!files.includes(overrideName)) fail(`items містить відсутній файл "${overrideName}".`);
  }
  await registerCollection(manifest, registryPath, Boolean(options.dryRun));
  const library = await loadCustomImageLibrary(targetRoot, registryPath);
  const existingByKey = new Map(library.images.map(record => [record.meta.mediaKey, record]));
  const existingBySlug = new Map(library.images.map(record => [record.meta.slug, record]));
  const planned: Array<{ sourcePath: string; slug: string; meta: CustomImageMeta; existingDir?: string }> = [];
  const plannedSlugs = new Set<string>();

  for (const fileName of files) {
    const sourcePath = path.join(folderDir, fileName);
    const contentHash = createHash('sha256').update(await fs.readFile(sourcePath)).digest('hex');
    const mediaKey = `custom:content:${contentHash}`;
    const override = manifest.items?.[fileName];
    const title = override?.title ?? humanizeFileName(fileName);
    const baseSlug = slugify(title);
    const collision = existingBySlug.get(baseSlug);
    const itemSlug = collision && collision.meta.mediaKey !== mediaKey ? `${baseSlug}-${contentHash.slice(0, 10)}` : baseSlug;
    if (plannedSlugs.has(itemSlug)) fail(`Дубль slug "${itemSlug}" у package.`);
    plannedSlugs.add(itemSlug);
    const tags = [...new Set([...(override?.tags ?? []), ...humanizeFileName(fileName).split(' '), ...manifest.tags])]
      .filter(tag => tag.length > 1);
    const meta: CustomImageMeta = {
      schemaVersion: CUSTOM_IMAGE_SCHEMA_VERSION,
      kind: CUSTOM_IMAGE_KIND,
      slug: itemSlug,
      mediaKey,
      collectionSlugs: [manifest.collection.slug],
      pinned: override?.pinned ?? manifest.pinned,
      sourceContentHash: contentHash,
      i18n: {
        name: { en: title, uk: title },
        alt: { en: title, uk: title },
        tags: tags.map(tag => ({ key: tagKey(tag), i18n: { en: tag, uk: tag } })),
        keywords: { en: tags, uk: tags },
      },
      category: manifest.category === 'illustrations'
        ? { key: 'illustrations', en: 'Illustrations', uk: 'Ілюстрації' }
        : { key: 'images', en: 'Images', uk: 'Зображення' },
      source: manifest.source.url,
      sourceName: manifest.source.name,
      authorName: manifest.author.name,
      authorUrl: manifest.author.url,
      licenseName: manifest.license.name,
      licenseUrl: manifest.license.url,
      taggingStatus: 'pending',
    };
    const existing = existingByKey.get(mediaKey);
    if (existing && existing.meta.category.key !== manifest.category) fail(`Asset "${fileName}" вже є в іншій категорії.`);
    const targetDir = path.join(targetRoot, customImageCategoryDir(manifest.category), itemSlug);
    if (existing && existing.sourceDir !== targetDir) {
      try {
        await fs.access(targetDir);
        fail(`Не можна перейменувати "${existing.sourceDir}" у вже існуючу теку "${targetDir}".`);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
    planned.push({ sourcePath, slug: itemSlug, meta, ...(existing ? { existingDir: existing.sourceDir } : {}) });
  }

  if (!options.dryRun) {
    for (const item of planned) {
      const targetDir = path.join(targetRoot, customImageCategoryDir(manifest.category), item.slug);
      if (item.existingDir && item.existingDir !== targetDir) await fs.rename(item.existingDir, targetDir);
      await normalizeCustomImageAsset(item.sourcePath, targetDir, item.slug);
      await fs.writeFile(path.join(targetDir, CUSTOM_IMAGE_META_FILE), `${JSON.stringify(item.meta, null, 2)}\n`, 'utf-8');
      await markMediaPendingForMetadata(path.join(targetDir, CUSTOM_IMAGE_META_FILE), 'file');
    }
  }
  return {
    collectionSlug: manifest.collection.slug,
    slugs: planned.map(item => item.slug),
    items: planned.length,
    created: planned.filter(item => !item.existingDir).length,
    updated: planned.filter(item => item.existingDir).length,
    dryRun: Boolean(options.dryRun),
  };
}
