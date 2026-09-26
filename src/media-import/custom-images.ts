import { promises as fs, Dirent } from 'node:fs';
import path from 'node:path';

import { CUSTOM_IMAGES_ROOT, MEDIA_COLLECTION_REGISTRY_PATH } from '../config/paths';
import {
  loadMediaCollectionRegistry,
  type MediaCollectionDefinition,
} from './media-collections';
import { assertImageDisplayNames } from './image-name-validation';

export const CUSTOM_IMAGE_SCHEMA_VERSION = 1;
export const CUSTOM_IMAGE_MANIFEST_FORMAT = 'divnex-custom-images';
export const CUSTOM_IMAGE_KIND = 'custom-image';
export const CUSTOM_IMAGE_META_FILE = 'media-meta.json';
export const CUSTOM_IMAGES_CATEGORY_DIRS = ['images', 'illustrations'] as const;

export type CustomImageCategoryKey = 'images' | 'illustrations';
export function customImageCategoryDir(category: CustomImageCategoryKey): string {
  return category;
}
export type CustomImageLocalizedText = { en: string; uk: string };
export type CustomImageLocalizedList = { en: string[]; uk: string[] };
export type CustomImageTag = { key: string; i18n: CustomImageLocalizedText };
export type CustomImageI18n = {
  name: CustomImageLocalizedText;
  alt: CustomImageLocalizedText;
  tags: CustomImageTag[];
  keywords: CustomImageLocalizedList;
};
export type CustomImageCategory = { key: CustomImageCategoryKey; en: string; uk: string };
export type CustomImageMeta = {
  schemaVersion: 1;
  kind: typeof CUSTOM_IMAGE_KIND;
  slug: string;
  mediaKey: string;
  collectionSlugs: string[];
  pinned: boolean;
  sourceContentHash?: string;
  i18n: CustomImageI18n;
  category: CustomImageCategory;
  source: string;
  sourceName: string;
  authorName?: string;
  authorUrl?: string;
  licenseName: string;
  licenseUrl: string;
  width?: number;
  height?: number;
  taggingStatus?: 'pending' | 'complete';
};

export type CustomImageRecord = { metaPath: string; sourceDir: string; meta: CustomImageMeta };
export type CustomImageLibrary = { collections: MediaCollectionDefinition[]; images: CustomImageRecord[] };

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const URL_PATTERN = /^(?:https?:\/\/|mailto:)/i;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertSlug(value: unknown, label: string): asserts value is string {
  assert(typeof value === 'string' && SLUG_PATTERN.test(value), `${label} має бути slug у kebab-case.`);
}

function assertNonEmpty(value: unknown, label: string): asserts value is string {
  assert(typeof value === 'string' && value.trim().length > 0, `${label} не може бути порожнім.`);
}

function assertUrl(value: unknown, label: string): asserts value is string {
  assert(typeof value === 'string' && URL_PATTERN.test(value), `${label} має бути URL.`);
}

function validateLocalizedText(value: unknown, label: string): asserts value is CustomImageLocalizedText {
  assert(value !== null && typeof value === 'object', `${label} має бути об'єктом.`);
  const text = value as Record<string, unknown>;
  assertNonEmpty(text.en, `${label}.en`);
  assertNonEmpty(text.uk, `${label}.uk`);
}

function validateCategory(value: unknown, label: string): asserts value is CustomImageCategory {
  assert(value !== null && typeof value === 'object', `${label} має бути об'єктом.`);
  const category = value as Record<string, unknown>;
  assert(['images', 'illustrations'].includes(String(category.key)), `${label}.key має бути images або illustrations.`);
  assertNonEmpty(category.en, `${label}.en`);
  assertNonEmpty(category.uk, `${label}.uk`);
}

function validateI18n(value: unknown, label: string): asserts value is CustomImageI18n {
  assert(value !== null && typeof value === 'object', `${label} має бути об'єктом.`);
  const i18n = value as Record<string, unknown>;
  validateLocalizedText(i18n.name, `${label}.name`);
  validateLocalizedText(i18n.alt, `${label}.alt`);
  assert(Array.isArray(i18n.tags), `${label}.tags має бути масивом.`);
  for (const [index, tagValue] of i18n.tags.entries()) {
    assert(tagValue !== null && typeof tagValue === 'object', `${label}.tags[${index}] має бути об'єктом.`);
    const tag = tagValue as Record<string, unknown>;
    assertNonEmpty(tag.key, `${label}.tags[${index}].key`);
    validateLocalizedText(tag.i18n, `${label}.tags[${index}].i18n`);
  }
  assert(i18n.keywords !== null && typeof i18n.keywords === 'object', `${label}.keywords має бути об'єктом.`);
  const keywords = i18n.keywords as Record<string, unknown>;
  assert(Array.isArray(keywords.en), `${label}.keywords.en має бути масивом.`);
  assert(Array.isArray(keywords.uk), `${label}.keywords.uk має бути масивом.`);
}

export function validateImageMeta(value: unknown, expectedSlug?: string): CustomImageMeta {
  assert(value !== null && typeof value === 'object', 'Метадані зображення мають бути об\'єктом.');
  const meta = value as Record<string, unknown>;
  assert(meta.schemaVersion === CUSTOM_IMAGE_SCHEMA_VERSION, 'Непідтримувана schemaVersion зображення.');
  assert(meta.kind === CUSTOM_IMAGE_KIND, 'Непідтримуваний kind зображення.');
  assertSlug(meta.slug, 'media-meta.slug');
  if (expectedSlug) assert(meta.slug === expectedSlug, `media-meta.slug має збігатися з текою "${expectedSlug}".`);
  assertNonEmpty(meta.mediaKey, 'media-meta.mediaKey');
  assert(Array.isArray(meta.collectionSlugs), 'media-meta.collectionSlugs має бути масивом slug.');
  const collectionSlugs = meta.collectionSlugs as unknown[];
  const uniqueCollectionSlugs = new Set<string>();
  for (const [index, collectionSlug] of collectionSlugs.entries()) {
    assertSlug(collectionSlug, `media-meta.collectionSlugs[${index}]`);
    assert(!uniqueCollectionSlugs.has(collectionSlug), `media-meta.collectionSlugs містить дубль "${String(collectionSlug)}".`);
    uniqueCollectionSlugs.add(collectionSlug);
  }
  assert(typeof meta.pinned === 'boolean', 'media-meta.pinned має бути boolean.');
  if (meta.sourceContentHash !== undefined) assert(typeof meta.sourceContentHash === 'string' && /^[a-f0-9]{64}$/.test(meta.sourceContentHash), 'media-meta.sourceContentHash має бути SHA-256 hex.');
  validateI18n(meta.i18n, 'media-meta.i18n');
  assertImageDisplayNames(meta as CustomImageMeta, `Зображення "${String(meta.slug)}"`);
  validateCategory(meta.category, 'media-meta.category');
  assertUrl(meta.source, 'media-meta.source');
  assertNonEmpty(meta.sourceName, 'media-meta.sourceName');
  assertNonEmpty(meta.licenseName, 'media-meta.licenseName');
  assertUrl(meta.licenseUrl, 'media-meta.licenseUrl');
  if (meta.authorUrl !== undefined) assertUrl(meta.authorUrl, 'media-meta.authorUrl');
  if (meta.taggingStatus !== undefined) assert(['pending', 'complete'].includes(String(meta.taggingStatus)), 'media-meta.taggingStatus має бути pending або complete.');
  for (const dimension of ['width', 'height']) {
    if (meta[dimension] !== undefined) assert(typeof meta[dimension] === 'number' && Number.isFinite(meta[dimension]) && meta[dimension] > 0, `media-meta.${dimension} має бути додатним числом.`);
  }
  return meta as CustomImageMeta;
}

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await fs.readFile(filePath, 'utf-8')) as unknown;
}

async function listDirectories(root: string): Promise<Dirent[]> {
  try {
    return await fs.readdir(root, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

export async function loadCustomImageLibrary(
  root = CUSTOM_IMAGES_ROOT,
  registryPath = MEDIA_COLLECTION_REGISTRY_PATH,
): Promise<CustomImageLibrary> {
  const collectionRegistry = await loadMediaCollectionRegistry(registryPath);
  const collections = Array.from(collectionRegistry.values());

  const images: CustomImageRecord[] = [];
  const imageSlugs = new Set<string>();
  const mediaKeys = new Set<string>();
  for (const categoryDir of CUSTOM_IMAGES_CATEGORY_DIRS) {
    for (const entry of await listDirectories(path.join(root, categoryDir))) {
      if (!entry.isDirectory()) continue;
      const metaPath = path.join(root, categoryDir, entry.name, CUSTOM_IMAGE_META_FILE);
      const meta = validateImageMeta(await readJson(metaPath), entry.name);
      assert(meta.category.key === categoryDir, `Категорія зображення "${meta.slug}" не збігається з текою "${categoryDir}".`);
      assert(!imageSlugs.has(meta.slug), `Дубль зображення "${meta.slug}".`);
      assert(!mediaKeys.has(meta.mediaKey), `Дубль mediaKey "${meta.mediaKey}".`);
      for (const collectionSlug of meta.collectionSlugs) {
        assert(collectionRegistry.has(collectionSlug), `Зображення "${meta.slug}" посилається на невідому колекцію "${collectionSlug}".`);
        const collection = collectionRegistry.get(collectionSlug);
        assert(collection?.category === meta.category.key, `Категорія зображення "${meta.slug}" не збігається з категорією колекції.`);
      }
      imageSlugs.add(meta.slug);
      mediaKeys.add(meta.mediaKey);
      images.push({ metaPath, sourceDir: path.dirname(metaPath), meta });
    }
  }

  collections.sort((a, b) => a.slug.localeCompare(b.slug));
  images.sort((a, b) => a.meta.slug.localeCompare(b.meta.slug));
  return { collections, images };
}
