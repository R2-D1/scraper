import { promises as fs, Dirent } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

import { CUSTOM_IMAGES_INTAKE_ROOT, CUSTOM_IMAGES_ROOT, MEDIA_COLLECTION_REGISTRY_PATH } from '../config/paths';
import { normalizeCustomImageAsset } from './custom-image-normalizer';
import {
  CUSTOM_IMAGE_KIND,
  CUSTOM_IMAGE_META_FILE,
  CUSTOM_IMAGE_SCHEMA_VERSION,
  customImageCategoryDir,
  type CustomImageCategory,
  type CustomImageCategoryKey,
  type CustomImageI18n,
  type CustomImageLocalizedList,
  type CustomImageLocalizedText,
  type CustomImageMeta,
  loadCustomImageLibrary,
} from './custom-images';
import { loadMediaCollectionRegistry, requireMediaCollection } from './media-collections';

export const CUSTOM_IMAGE_INTAKE_PROFILES = {
  'divnex-owned': {
    sourceName: 'Divnex',
    sourceUrl: 'https://divnex.com',
    licenseName: 'Divnex Asset License',
    licenseUrl: 'https://divnex.com/asset-license',
    authorName: 'Divnex',
    authorUrl: 'https://divnex.com',
  },
} as const;
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.svg']);
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CATEGORY_LABELS: Record<CustomImageCategoryKey, CustomImageCategory> = {
  images: { key: 'images', en: 'Images', uk: 'Зображення' },
  illustrations: { key: 'illustrations', en: 'Illustrations', uk: 'Ілюстрації' },
};

type IntakeSource = { name: string; url: string };
type IntakeLicense = { name: string; url: string };
type IntakeAuthor = { name: string; url: string };
export type CustomImageAssetIntakeManifest = {
  title: { en: string; uk: string };
  category: CustomImageCategoryKey;
  collections: string[];
  tags: Array<{ en: string; uk: string }>;
  pinned: boolean;
};
export type CustomImageIntakeReport = {
  collectionSlugs: string[];
  items: number;
  created: number;
  updated: number;
  moved: number;
  detached: number;
  renamed: number;
  dryRun: boolean;
};
export type CustomImageFolderOptions = {
  folderDir: string;
  targetRoot?: string;
  dryRun?: boolean;
  registryPath?: string;
};
type NormalizedCustomImageAsset = {
  filePath: string;
  manifestPath: string;
  contentHash: string;
  mediaKey: string;
  baseSlug: string;
  slug: string;
  collectionSlugs: string[];
  pinned: boolean;
  category: CustomImageCategory;
  tags: Array<{ key: string; i18n: CustomImageLocalizedText }>;
  keywords: CustomImageLocalizedList;
  name: CustomImageLocalizedText;
  alt: CustomImageLocalizedText;
  source: IntakeSource;
  author: IntakeAuthor;
  license: IntakeLicense;
};
export type CustomImageAssetIntakeOptions = {
  assetPath: string;
  targetRoot?: string;
  dryRun?: boolean;
  registryPath?: string;
};

function fail(message: string): never {
  throw new Error(message);
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) fail(`${label} не може бути порожнім.`);
  return value.trim();
}

function validSlug(value: unknown, label: string): string {
  const result = requiredString(value, label).toLowerCase();
  if (!SLUG_PATTERN.test(result)) fail(`${label} має бути slug у kebab-case.`);
  return result;
}

function validCollectionSlugs(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0) fail('collections має бути непорожнім масивом slug.');
  const collectionSlugs = value.map((item, index) => validSlug(item, `collections[${index}]`));
  if (new Set(collectionSlugs).size !== collectionSlugs.length) fail('collections містить дубль slug.');
  return collectionSlugs;
}

function sameCollectionSlugs(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every(collectionSlug => right.includes(collectionSlug));
}

export function slugifyCustomImageTitle(title: string): string {
  const slug = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug) fail('title.en має містити хоча б одну ASCII літеру або цифру для slug.');
  return slug;
}

function collisionSuffix(mediaKey: string): string {
  return createHash('sha256').update(mediaKey).digest('hex').slice(0, 10);
}


function category(value: unknown, label: string): CustomImageCategory {
  const key = requiredString(value, label) as CustomImageCategoryKey;
  if (!(key in CATEGORY_LABELS)) fail(`${label} має бути images або illustrations.`);
  return CATEGORY_LABELS[key];
}

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await fs.readFile(filePath, 'utf-8')) as unknown;
}

async function assertFile(filePath: string): Promise<void> {
  const stat = await fs.stat(filePath);
  if (!stat.isFile()) fail(`Файл не є звичайним файлом: ${filePath}.`);
}

function flatTagKey(value: string): string {
  const key = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!key) return `tag-${createHash('sha256').update(value).digest('hex').slice(0, 10)}`;
  return key;
}

function localizedPair(value: unknown, label: string): CustomImageLocalizedText {
  if (value === null || typeof value !== 'object') fail(`${label} має бути об'єктом з en та uk.`);
  const record = value as Record<string, unknown>;
  return {
    en: requiredString(record.en, `${label}.en`),
    uk: requiredString(record.uk, `${label}.uk`),
  };
}

function flatTags(value: unknown, label: string): Array<{ key: string; i18n: CustomImageLocalizedText }> {
  if (!Array.isArray(value)) fail(`${label} має бути масивом.`);
  const keys = new Set<string>();
  return value.map((rawTag, index) => {
    const text = localizedPair(rawTag, `${label}[${index}]`);
    const key = flatTagKey(text.en);
    if (keys.has(key)) fail(`Дубль tag key "${key}".`);
    keys.add(key);
    return { key, i18n: text };
  });
}

export async function readCustomImageAssetIntake(
  assetPath: string,
  options: { registryPath?: string } = {},
): Promise<NormalizedCustomImageAsset> {
  const filePath = path.resolve(assetPath);
  await assertFile(filePath);
  if (!IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase())) fail(`Непідтримуваний тип файла: ${path.extname(filePath) || 'без розширення'}.`);
  const manifestPath = `${filePath}.manifest.json`;
  const raw = await readJson(manifestPath) as Record<string, unknown>;
  const allowedManifestFields = new Set(['title', 'category', 'collections', 'tags', 'pinned']);
  const unknownFields = Object.keys(raw).filter(field => !allowedManifestFields.has(field));
  if (unknownFields.length > 0) fail(`Flat manifest має невідомі поля: ${unknownFields.join(', ')}.`);
  const contentHash = createHash('sha256').update(await fs.readFile(filePath)).digest('hex');
  const mediaKey = `custom:content:${contentHash}`;
  const collectionSlugs = validCollectionSlugs(raw.collections);
  const categoryValue = category(raw.category, 'category');
  const registry = await loadMediaCollectionRegistry(options.registryPath ?? MEDIA_COLLECTION_REGISTRY_PATH);
  for (const collectionSlug of collectionSlugs) {
    requireMediaCollection(registry, collectionSlug, categoryValue.key);
  }
  const title = localizedPair(raw.title, 'title');
  if (raw.tags === undefined) fail('tags є обов\'язковим.');
  if (typeof raw.pinned !== 'boolean') fail('pinned має бути boolean.');
  const profile = CUSTOM_IMAGE_INTAKE_PROFILES['divnex-owned'];
  const name = title;
  const alt = title;
  const baseSlug = slugifyCustomImageTitle(title.en);
  const tags = flatTags(raw.tags, 'tags');
  return {
    filePath,
    manifestPath,
    contentHash,
    mediaKey,
    baseSlug,
    slug: baseSlug,
    collectionSlugs,
    pinned: raw.pinned,
    category: categoryValue,
    tags,
    keywords: {
      en: tags.map(tag => tag.i18n.en),
      uk: tags.map(tag => tag.i18n.uk),
    },
    name,
    alt,
    source: { name: profile.sourceName, url: profile.sourceUrl },
    author: { name: profile.authorName, url: profile.authorUrl },
    license: { name: profile.licenseName, url: profile.licenseUrl },
  };
}

function buildFlatImageMeta(item: NormalizedCustomImageAsset): CustomImageMeta {
  return {
    schemaVersion: CUSTOM_IMAGE_SCHEMA_VERSION,
    kind: CUSTOM_IMAGE_KIND,
    slug: item.slug,
    mediaKey: item.mediaKey,
    collectionSlugs: item.collectionSlugs,
    pinned: item.pinned,
    sourceContentHash: item.contentHash,
    i18n: { name: item.name, alt: item.alt, tags: item.tags, keywords: item.keywords },
    category: item.category,
    source: item.source.url,
    sourceName: item.source.name,
    authorName: item.author.name,
    authorUrl: item.author.url,
    licenseName: item.license.name,
    licenseUrl: item.license.url,
  };
}

async function listFiles(dir: string): Promise<Dirent[]> {
  try { return await fs.readdir(dir, { withFileTypes: true }); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

const FLAT_MANIFEST_SUFFIX = '.manifest.json';

export async function findCustomImageAssetIntakes(folderDir = CUSTOM_IMAGES_INTAKE_ROOT): Promise<string[]> {
  const root = path.resolve(folderDir);
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files = entries.filter(entry => entry.isFile()).map(entry => entry.name);
  const assets = files
    .filter(file => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
  const assetSet = new Set(assets);
  for (const manifest of files.filter(file => file.endsWith(FLAT_MANIFEST_SUFFIX))) {
    const assetName = manifest.slice(0, -FLAT_MANIFEST_SUFFIX.length);
    if (!assetName || !assetSet.has(assetName)) fail(`Manifest не має paired image asset: ${path.join(root, manifest)}.`);
  }
  for (const asset of assets) {
    const manifestPath = path.join(root, `${asset}${FLAT_MANIFEST_SUFFIX}`);
    try {
      await fs.access(manifestPath);
    } catch {
      fail(`Для flat image asset не знайдено manifest: ${manifestPath}.`);
    }
  }
  return assets.map(asset => path.join(root, asset));
}

function resolveFlatAssetSlugs(
  items: NormalizedCustomImageAsset[],
  library: Awaited<ReturnType<typeof loadCustomImageLibrary>>,
): NormalizedCustomImageAsset[] {
  const mediaKeys = new Set<string>();
  const baseCounts = new Map<string, number>();
  const existingBySlug = new Map(library.images.map(record => [record.meta.slug, record]));
  for (const item of items) {
    if (mediaKeys.has(item.mediaKey)) fail(`Дубль flat mediaKey "${item.mediaKey}".`);
    mediaKeys.add(item.mediaKey);
    baseCounts.set(item.baseSlug, (baseCounts.get(item.baseSlug) ?? 0) + 1);
  }
  const usedSlugs = new Set<string>();
  return items.map(item => {
    const existingAtBase = existingBySlug.get(item.baseSlug);
    const collision = (baseCounts.get(item.baseSlug) ?? 0) > 1
      || Boolean(existingAtBase && existingAtBase.meta.mediaKey !== item.mediaKey);
    const slug = collision ? `${item.baseSlug}-${collisionSuffix(item.mediaKey)}` : item.baseSlug;
    if (usedSlugs.has(slug)) fail(`Collision flat image slug "${slug}"; збільшіть stable media key suffix.`);
    usedSlugs.add(slug);
    return { ...item, slug };
  });
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

export async function ingestCustomImageAssetFolder(options: CustomImageFolderOptions): Promise<CustomImageIntakeReport[]> {
  const folderDir = path.resolve(options.folderDir);
  const assetPaths = await findCustomImageAssetIntakes(folderDir);
  if (assetPaths.length === 0) return [];
  const items = resolveFlatAssetSlugs(
    await Promise.all(assetPaths.map(assetPath => readCustomImageAssetIntake(assetPath, {
      registryPath: options.registryPath,
    }))),
    await loadCustomImageLibrary(path.resolve(options.targetRoot ?? CUSTOM_IMAGES_ROOT)),
  );
  const targetRoot = path.resolve(options.targetRoot ?? CUSTOM_IMAGES_ROOT);
  const library = await loadCustomImageLibrary(targetRoot);
  const byMediaKey = new Map(library.images.map(record => [record.meta.mediaKey, record]));
  const bySlug = new Map(library.images.map(record => [record.meta.slug, record]));
  const existingByItem = new Map<string, Awaited<ReturnType<typeof loadCustomImageLibrary>>['images'][number] | undefined>();
  for (const item of items) {
    const existing = byMediaKey.get(item.mediaKey);
    existingByItem.set(item.mediaKey, existing);
    const existingBySlug = bySlug.get(item.slug);
    if (existingBySlug && existingBySlug.meta.mediaKey !== item.mediaKey) {
      fail(`Slug "${item.slug}" вже належить іншому mediaKey "${existingBySlug.meta.mediaKey}".`);
    }
    const targetDir = path.join(targetRoot, customImageCategoryDir(item.category.key), item.slug);
    if (existing && existing.sourceDir !== targetDir && await pathExists(targetDir)) {
      fail(`Не можна безпечно перейменувати "${existing.sourceDir}" у вже існуючу теку "${targetDir}".`);
    }
    if (!existing && await pathExists(targetDir)) fail(`Target image directory вже існує: ${targetDir}.`);
  }

  if (options.dryRun) {
    return items.map(item => {
      const existing = existingByItem.get(item.mediaKey);
      return {
        collectionSlugs: item.collectionSlugs,
        items: 1,
        created: existing ? 0 : 1,
        updated: existing ? 1 : 0,
        moved: existing && !sameCollectionSlugs(existing.meta.collectionSlugs, item.collectionSlugs) ? 1 : 0,
        detached: 0,
        renamed: existing && existing.meta.slug !== item.slug ? 1 : 0,
        dryRun: true,
      };
    });
  }

  const reports: CustomImageIntakeReport[] = [];
  for (const item of items) {
    const next = buildFlatImageMeta(item);
    const existing = existingByItem.get(item.mediaKey);
    const targetDir = path.join(targetRoot, customImageCategoryDir(item.category.key), item.slug);
    let renamed = 0;
    if (existing && existing.sourceDir !== targetDir) {
      await fs.rename(existing.sourceDir, targetDir);
      renamed = 1;
    }
    await adoptImage(item.filePath, targetDir, item.slug);
    await fs.writeFile(path.join(targetDir, CUSTOM_IMAGE_META_FILE), `${JSON.stringify(next, null, 2)}\n`, 'utf-8');
    reports.push({
      collectionSlugs: item.collectionSlugs,
      items: 1,
      created: existing ? 0 : 1,
      updated: existing ? 1 : 0,
      moved: existing && !sameCollectionSlugs(existing.meta.collectionSlugs, item.collectionSlugs) ? 1 : 0,
      detached: 0,
      renamed,
      dryRun: false,
    });
  }
  return reports;
}

async function adoptImage(sourcePath: string, targetDir: string, slug: string): Promise<void> {
  await fs.mkdir(targetDir, { recursive: true });
  for (const entry of await listFiles(targetDir)) {
    if (entry.isFile() && entry.name !== CUSTOM_IMAGE_META_FILE && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      await fs.rm(path.join(targetDir, entry.name), { force: true });
    }
  }
  await normalizeCustomImageAsset(sourcePath, targetDir, slug);
}

export async function ingestCustomImageFolder(options: CustomImageFolderOptions): Promise<CustomImageIntakeReport[]> {
  const folderDir = path.resolve(options.folderDir);
  const flatAssetPaths = await findCustomImageAssetIntakes(folderDir);
  if (flatAssetPaths.length === 0) fail(`Не знайдено flat image assets у ${folderDir}.`);
  return ingestCustomImageAssetFolder(options);
}
