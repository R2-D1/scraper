import { promises as fs } from "node:fs";
import path from "node:path";

import {
  CTRLV_LIBRARY_ROOT,
  UNDRAW_LIBRARY_ROOT,
  CUSTOM_IMAGES_ROOT,
  MEDIA_COLLECTION_REGISTRY_PATH,
  LUMMI_LIBRARY_ROOT,
  PEXELS_LIBRARY_ROOT,
  UNSPLASH_LIBRARY_ROOT,
} from "../config/paths";

export type MediaCollectionCategoryKey = "images" | "illustrations" | "videos";
export type MediaCollectionProvider = "pexels";
export type MediaCollectionProviderDefinition = {
  provider: MediaCollectionProvider;
  collectionId: string;
};
export type MediaCollectionDefinition = {
  slug: string;
  name: { en: string; uk: string };
  category: MediaCollectionCategoryKey;
  previewMediaKeys?: string[];
  providerCollections?: MediaCollectionProviderDefinition[];
};
export type MediaCollectionRegistry = Map<string, MediaCollectionDefinition>;

const CATEGORY_LABELS: Record<
  MediaCollectionCategoryKey,
  { key: MediaCollectionCategoryKey; en: string; uk: string }
> = {
  images: { key: "images", en: "Images", uk: "Зображення" },
  illustrations: {
    key: "illustrations",
    en: "Illustrations",
    uk: "Ілюстрації",
  },
  videos: { key: "videos", en: "Videos", uk: "Відео" },
};
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim())
    throw new Error(`${label} не може бути порожнім.`);
  return value.trim();
}

function optionalPreviewMediaKeys(
  value: unknown,
  label: string,
): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length === 0 || value.length > 3)
    throw new Error(`${label} має містити від 1 до 3 media keys.`);
  const keys = value.map((item, index) =>
    requiredString(item, `${label}[${index}]`),
  );
  if (new Set(keys).size !== keys.length)
    throw new Error(`${label} містить дубль media key.`);
  return keys;
}

function optionalProviderCollections(
  value: unknown,
  label: string,
): MediaCollectionProviderDefinition[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new Error(`${label} має бути масивом.`);
  const links: MediaCollectionProviderDefinition[] = value.map(
    (item, index) => {
      if (item === null || typeof item !== "object" || Array.isArray(item)) {
        throw new Error(`${label}[${index}] має бути об'єктом.`);
      }
      const record = item as Record<string, unknown>;
      const provider = requiredString(
        record.provider,
        `${label}[${index}].provider`,
      );
      if (provider !== "pexels")
        throw new Error(`${label}[${index}].provider не підтримується.`);
      return {
        provider: "pexels",
        collectionId: requiredString(
          record.collectionId,
          `${label}[${index}].collectionId`,
        ),
      };
    },
  );
  const keys = links.map((link) => `${link.provider}:${link.collectionId}`);
  if (new Set(keys).size !== keys.length)
    throw new Error(`${label} містить дубль зв'язку провайдера.`);
  return links;
}

export async function loadMediaCollectionRegistry(
  registryPath = MEDIA_COLLECTION_REGISTRY_PATH,
): Promise<MediaCollectionRegistry> {
  const raw = JSON.parse(await fs.readFile(registryPath, "utf-8")) as Record<
    string,
    unknown
  >;
  if (
    raw.schemaVersion !== 1 ||
    raw.collections === null ||
    typeof raw.collections !== "object" ||
    Array.isArray(raw.collections)
  ) {
    throw new Error(`Некоректний реєстр колекцій: ${registryPath}.`);
  }
  const registry: MediaCollectionRegistry = new Map();
  for (const [slug, value] of Object.entries(
    raw.collections as Record<string, unknown>,
  )) {
    if (!SLUG_PATTERN.test(slug))
      throw new Error(`Некоректний slug колекції "${slug}".`);
    if (value === null || typeof value !== "object" || Array.isArray(value))
      throw new Error(`Некоректна колекція "${slug}".`);
    const record = value as Record<string, unknown>;
    const nameRaw = record.name;
    if (
      nameRaw === null ||
      typeof nameRaw !== "object" ||
      Array.isArray(nameRaw)
    )
      throw new Error(`Колекція "${slug}" не має name.`);
    const nameRecord = nameRaw as Record<string, unknown>;
    const category = requiredString(
      record.category,
      `collections.${slug}.category`,
    ) as MediaCollectionCategoryKey;
    if (!(category in CATEGORY_LABELS))
      throw new Error(`Некоректна категорія колекції "${slug}".`);
    const providerCollections = optionalProviderCollections(
      record.providerCollections,
      `collections.${slug}.providerCollections`,
    );
    if (category === "illustrations" && providerCollections?.length) {
      throw new Error(
        `Колекція ілюстрацій "${slug}" не може використовувати Pexels.`,
      );
    }
    registry.set(slug, {
      slug,
      name: {
        en: requiredString(nameRecord.en, `collections.${slug}.name.en`),
        uk: requiredString(nameRecord.uk, `collections.${slug}.name.uk`),
      },
      category,
      previewMediaKeys: optionalPreviewMediaKeys(
        record.previewMediaKeys,
        `collections.${slug}.previewMediaKeys`,
      ),
      providerCollections,
    });
  }
  return registry;
}

export function requireMediaCollection(
  registry: MediaCollectionRegistry,
  slug: string,
  category?: MediaCollectionCategoryKey,
): MediaCollectionDefinition {
  const collection = registry.get(slug);
  if (!collection) throw new Error(`Невідома колекція "${slug}".`);
  if (category && collection.category !== category)
    throw new Error(
      `Категорія колекції "${slug}" не збігається з категорією зображення.`,
    );
  return collection;
}

export function requireAssignedMediaCollections(
  registry: MediaCollectionRegistry,
  collectionSlugs: string[],
  category: MediaCollectionCategoryKey,
  imageSlug: string,
): MediaCollectionDefinition[] {
  if (collectionSlugs.length === 0) {
    throw new Error(
      `Зображення "${imageSlug}" не можна експортувати без колекції.`,
    );
  }
  return collectionSlugs.map((collectionSlug) =>
    requireMediaCollection(registry, collectionSlug, category),
  );
}

export function archiveMediaCollection(
  collection: MediaCollectionDefinition,
): Record<string, unknown> {
  return {
    slug: collection.slug,
    name: collection.name.en,
    i18n: collection.name,
    category: CATEGORY_LABELS[collection.category],
    ...(collection.previewMediaKeys
      ? { previewMediaKeys: [...collection.previewMediaKeys] }
      : {}),
  };
}

export type MediaCollectionCurationItem = {
  mediaKey: string;
  category: MediaCollectionCategoryKey;
  collectionSlugs: string[];
};

export function validateMediaCollectionCuration(
  registry: MediaCollectionRegistry,
  items: readonly MediaCollectionCurationItem[],
): void {
  const byMediaKey = new Map<string, MediaCollectionCurationItem>();
  for (const item of items) {
    if (byMediaKey.has(item.mediaKey))
      throw new Error(`Дубль mediaKey "${item.mediaKey}" у бібліотеці.`);
    byMediaKey.set(item.mediaKey, item);
  }
  for (const collection of registry.values()) {
    for (const mediaKey of collection.previewMediaKeys ?? []) {
      const item = byMediaKey.get(mediaKey);
      if (!item)
        throw new Error(
          `Колекція "${collection.slug}" посилається на невідомий preview mediaKey "${mediaKey}".`,
        );
      if (item.category !== collection.category) {
        throw new Error(
          `Preview mediaKey "${mediaKey}" має іншу категорію, ніж колекція "${collection.slug}".`,
        );
      }
      if (!item.collectionSlugs.includes(collection.slug)) {
        throw new Error(
          `Preview mediaKey "${mediaKey}" не належить до колекції "${collection.slug}".`,
        );
      }
    }
  }
}

async function collectMediaMetaFiles(root: string): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const files: string[] = [];
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory())
      files.push(...(await collectMediaMetaFiles(entryPath)));
    else if (entry.isFile() && entry.name === "media-meta.json")
      files.push(entryPath);
  }
  return files;
}

export async function loadMediaCollectionCurationItems(
  roots: readonly string[] = [
    UNSPLASH_LIBRARY_ROOT,
    PEXELS_LIBRARY_ROOT,
    LUMMI_LIBRARY_ROOT,
    CTRLV_LIBRARY_ROOT,
    UNDRAW_LIBRARY_ROOT,
    CUSTOM_IMAGES_ROOT,
  ],
): Promise<MediaCollectionCurationItem[]> {
  const files = (await Promise.all(roots.map(collectMediaMetaFiles))).flat();
  return Promise.all(
    files.map(async (filePath) => {
      const raw = JSON.parse(await fs.readFile(filePath, "utf-8")) as Record<
        string,
        unknown
      >;
      const categoryRaw = raw.category;
      if (
        !categoryRaw ||
        typeof categoryRaw !== "object" ||
        Array.isArray(categoryRaw)
      ) {
        throw new Error(`Некоректна category у ${filePath}.`);
      }
      const category = requiredString(
        (categoryRaw as Record<string, unknown>).key,
        `category.key у ${filePath}`,
      ) as MediaCollectionCategoryKey;
      if (!(category in CATEGORY_LABELS))
        throw new Error(`Некоректна category.key у ${filePath}.`);
      const collectionSlugsRaw = raw.collectionSlugs ?? [];
      if (!Array.isArray(collectionSlugsRaw))
        throw new Error(`Некоректний collectionSlugs у ${filePath}.`);
      const collectionSlugs = collectionSlugsRaw.map((value, index) =>
        requiredString(value, `collectionSlugs[${index}] у ${filePath}`),
      );
      if (typeof raw.pinned !== "boolean")
        throw new Error(`Некоректний pinned у ${filePath}.`);
      return {
        mediaKey: requiredString(raw.mediaKey, `mediaKey у ${filePath}`),
        category,
        collectionSlugs,
      };
    }),
  );
}

export function collectionCategory(collection: MediaCollectionDefinition): {
  key: MediaCollectionCategoryKey;
  en: string;
  uk: string;
} {
  return CATEGORY_LABELS[collection.category];
}
