import { randomUUID } from "node:crypto";
import { promises as fs, Dirent } from "node:fs";
import path from "node:path";

import { getLummiMediaDir, LUMMI_INTAKE_ROOT, MEDIA_COLLECTION_REGISTRY_PATH } from "../config/paths";
import { assertImageDisplayNames } from "../media-import/image-name-validation";
import { prepareStoredRaster } from "../media-import/lossless-raster";
import { updateImageTranslations } from "../scripts/update-unsplash-translations";
import type { MediaMetadata } from "../unsplash/import-utils";
import { MEDIA_META_FILE } from "../unsplash/library-paths";
import {
  createImageNameStore,
  createImageTagStore,
  filterBlacklistedTokens,
  readImageTagBlacklist,
  readImageTagKeyBlacklist,
} from "../unsplash/translation-stores";
import { buildLocalizedTagEntries } from "../unsplash/tag-utils";
import { sanitizeSegment } from "../unsplash/utils";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

type LummiTag = { name?: unknown; slug?: unknown };
type LummiSidecar = {
  id?: unknown;
  slug?: unknown;
  name?: unknown;
  description?: unknown;
  detailedDescription?: unknown;
  width?: unknown;
  height?: unknown;
  contentType?: unknown;
  free?: unknown;
  pro?: unknown;
  sourceUrl?: unknown;
  attributionUrl?: unknown;
  url?: unknown;
  author?: { name?: unknown; username?: unknown; attributionUrl?: unknown };
  license?: { name?: unknown; url?: unknown };
  tags?: unknown;
  categories?: unknown;
};

type CliOptions = { dir: string; collection?: string };
type IntakeItem = {
  jsonPath: string;
  duplicateJsonPaths: string[];
  sidecar: LummiSidecar;
};

function requiredText(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} не може бути порожнім.`);
  }
  return value.trim();
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function tagNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return "";
      const tag = entry as LummiTag;
      return optionalText(tag.name) ?? optionalText(tag.slug) ?? "";
    })
    .filter(Boolean);
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLocaleLowerCase("en");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizedName(value: unknown): string {
  const words = requiredText(value, "Lummi name").split(/\s+/u);
  return words.slice(0, 10).join(" ");
}

export function validateLummiSidecar(value: unknown): LummiSidecar {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Lummi JSON має бути об'єктом.");
  }
  const sidecar = value as LummiSidecar;
  requiredText(sidecar.id, "Lummi id");
  requiredText(sidecar.slug, "Lummi slug");
  normalizedName(sidecar.name);
  requiredText(sidecar.url, "Lummi asset URL");
  requiredText(sidecar.sourceUrl ?? sidecar.attributionUrl, "Lummi source URL");
  requiredText(sidecar.license?.name, "Lummi license name");
  requiredText(sidecar.license?.url, "Lummi license URL");
  if (tagNames(sidecar.tags).length === 0) {
    throw new Error("Lummi JSON не містить тегів.");
  }
  return sidecar;
}

async function readExistingMetadata(outputDir: string): Promise<MediaMetadata | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(outputDir, MEDIA_META_FILE), "utf8")) as MediaMetadata;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export function isAllowedLummiAssetUrl(sidecar: LummiSidecar): boolean {
  try {
    const assetUrl = new URL(requiredText(sidecar.url, "Lummi asset URL"));
    return assetUrl.protocol === "https:" && assetUrl.hostname === "assets.lummi.ai";
  } catch {
    return false;
  }
}

export async function listIntakeItems(root: string): Promise<IntakeItem[]> {
  let entries: Dirent[];
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const resultsBySlug = new Map<string, IntakeItem>();
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== ".json") continue;
    const jsonPath = path.join(root, entry.name);
    const sidecar = validateLummiSidecar(JSON.parse(await fs.readFile(jsonPath, "utf8")));
    if (!isAllowedLummiAssetUrl(sidecar)) {
      await fs.rm(jsonPath, { force: true });
      console.warn(`⚠ Видалено Lummi sidecar з недозволеним asset URL: ${entry.name}.`);
      continue;
    }
    const slug = sanitizeSegment(requiredText(sidecar.slug, "Lummi slug"));
    const existing = resultsBySlug.get(slug);
    if (existing) {
      if (requiredText(existing.sidecar.id, "Lummi id") !== requiredText(sidecar.id, "Lummi id")) {
        throw new Error(`Lummi intake містить різні asset ID для slug "${slug}".`);
      }
      existing.duplicateJsonPaths.push(jsonPath);
      continue;
    }
    resultsBySlug.set(slug, { jsonPath, duplicateJsonPaths: [], sidecar });
  }
  return [...resultsBySlug.values()];
}

function extensionFromContentType(value: string): string | null {
  const contentType = value.split(";", 1)[0].trim().toLowerCase();
  return {
    "image/avif": ".avif",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  }[contentType] ?? null;
}

export async function downloadLummiAsset(
  sidecar: LummiSidecar,
  fetcher: typeof fetch = fetch,
): Promise<{ buffer: Buffer; extension: string; mimeType: string; width: number; height: number }> {
  const rawUrl = requiredText(sidecar.url, "Lummi asset URL");
  const assetUrl = new URL(rawUrl);
  if (!isAllowedLummiAssetUrl(sidecar)) {
    throw new Error(`Недозволений Lummi asset URL: ${assetUrl.origin}.`);
  }
  const response = await fetcher(assetUrl, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) {
    throw new Error(`Lummi asset повернув HTTP ${response.status}.`);
  }
  const responseType = response.headers.get("content-type") ?? "";
  const declaredType = optionalText(sidecar.contentType) ?? "";
  const extension = extensionFromContentType(responseType) ?? extensionFromContentType(declaredType);
  if (!extension) {
    throw new Error(`Lummi asset має непідтримуваний Content-Type: ${responseType || declaredType || "unknown"}.`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) throw new Error("Lummi asset порожній.");
  const asset = await prepareStoredRaster(buffer, `asset${extension}`);
  return asset;
}

export function buildLummiMetadata(
  sidecar: LummiSidecar,
  asset: { width: number; height: number; mimeType: string },
  translatedName: string,
  localizedTags: MediaMetadata["i18n"]["tags"],
  existing: MediaMetadata | null,
): MediaMetadata {
  const slug = sanitizeSegment(requiredText(sidecar.slug, "Lummi slug"));
  const name = normalizedName(sidecar.name);
  const meta: MediaMetadata = {
    slug,
    mediaKey: existing?.mediaKey ?? randomUUID(),
    i18n: {
      name: { en: name, uk: translatedName },
      alt: { en: name, uk: translatedName },
      tags: localizedTags,
      keywords: { en: [], uk: [] },
    },
    category: { key: "images", en: "Images", uk: "Зображення" },
    collectionSlugs: existing?.collectionSlugs?.length ? existing.collectionSlugs : ["other"],
    pinned: existing?.pinned === true,
    source: requiredText(sidecar.sourceUrl ?? sidecar.attributionUrl, "Lummi source URL"),
    sourceName: "Lummi",
    authorName: optionalText(sidecar.author?.name),
    authorUrl: optionalText(sidecar.author?.attributionUrl),
    description: optionalText(sidecar.detailedDescription) ?? optionalText(sidecar.description),
    licenseName: requiredText(sidecar.license?.name, "Lummi license name"),
    licenseUrl: requiredText(sidecar.license?.url, "Lummi license URL"),
    tier: sidecar.free === true ? "free" : "plus",
    downloadSource: "downloads",
    taggingStatus: "pending",
    width: asset.width,
    height: asset.height,
    mimeType: asset.mimeType,
  };
  assertImageDisplayNames(meta, `Lummi "${slug}"`);
  return meta;
}

function parseArgs(argv: string[]): CliOptions {
  let dir = LUMMI_INTAKE_ROOT;
  let collection: string | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dir" || arg === "-d") {
      const value = argv[index + 1];
      if (!value) throw new Error("Після --dir потрібен шлях.");
      dir = path.resolve(PROJECT_ROOT, value);
      index += 1;
    } else if (arg === "--collection") {
      const value = argv[index + 1];
      if (!value) throw new Error("Після --collection потрібен slug колекції.");
      collection = value;
      index += 1;
    } else if (arg !== "--") {
      throw new Error(`Невідомий аргумент "${arg}".`);
    }
  }
  return { dir, collection };
}

async function validateCollection(collection: string): Promise<void> {
  const registry = JSON.parse(await fs.readFile(MEDIA_COLLECTION_REGISTRY_PATH, "utf8")) as {
    collections?: Record<string, { category?: string }>;
  };
  const definition = registry.collections?.[collection];
  if (!definition || definition.category !== "images") {
    throw new Error(`Колекція "${collection}" відсутня або не належить до зображень.`);
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (options.collection) await validateCollection(options.collection);
  const items = await listIntakeItems(options.dir);
  if (items.length === 0) {
    console.log("У intake/lummi немає JSON для імпорту.");
    return;
  }
  const [tagStore, nameStore, tagBlacklist, tagKeyBlacklist] = await Promise.all([
    createImageTagStore(),
    createImageNameStore(),
    readImageTagBlacklist(),
    readImageTagKeyBlacklist(),
  ]);
  const imported: Array<{ slug: string; jsonPath: string }> = [];
  const cleanupPaths: string[] = [];
  const stagedExistingMetadata: Array<{ outputDir: string; metadata: MediaMetadata }> = [];
  let collectionAssignments = 0;
  let skipped = 0;
  let duplicateFiles = 0;
  for (const item of items) {
    const slug = sanitizeSegment(requiredText(item.sidecar.slug, "Lummi slug"));
    const outputDir = getLummiMediaDir(slug);
    const existing = await readExistingMetadata(outputDir);
    const existingFiles = await fs.readdir(outputDir).catch((error) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    });
    const hasExistingAsset = existingFiles.some((name) =>
      IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()),
    );
    duplicateFiles += item.duplicateJsonPaths.length;

    const assignedExisting = existing && options.collection
      ? { ...existing, collectionSlugs: [...new Set([...(existing.collectionSlugs ?? []), options.collection])] }
      : existing;
    if (existing && options.collection && !(existing.collectionSlugs ?? []).includes(options.collection)) {
      collectionAssignments += 1;
    }

    if (existing?.taggingStatus === "complete" && hasExistingAsset) {
      skipped += 1;
      if (assignedExisting !== existing) stagedExistingMetadata.push({ outputDir, metadata: assignedExisting! });
      cleanupPaths.push(item.jsonPath, ...item.duplicateJsonPaths);
      console.log(`↷ Уже є в бібліотеці, пропускаю Lummi ${slug}.`);
      continue;
    }

    const asset = await downloadLummiAsset(item.sidecar);
    const ext = asset.extension;
    await fs.mkdir(outputDir, { recursive: true });
    const targetName = `${slug}${ext}`;
    const targetPath = path.join(outputDir, targetName);
    const existingAssets = existingFiles.filter((name) => IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()) && name !== targetName);
    const temporaryPath = `${targetPath}.${process.pid}.tmp`;
    await fs.writeFile(temporaryPath, asset.buffer);
    await fs.rename(temporaryPath, targetPath);
    for (const oldName of existingAssets) await fs.rm(path.join(outputDir, oldName));

    const rawTags = unique([...tagNames(item.sidecar.tags), ...tagNames(item.sidecar.categories)]);
    const tags = filterBlacklistedTokens(rawTags, tagKeyBlacklist, tagBlacklist);
    const localizedTags = buildLocalizedTagEntries(tags, (tag) => tagStore.resolve(tag, tag));
    const name = normalizedName(item.sidecar.name);
    const metadata = buildLummiMetadata(
      item.sidecar,
      { width: asset.width, height: asset.height, mimeType: asset.mimeType },
      nameStore.resolve(slug, name),
      localizedTags,
      assignedExisting,
    );
    if (options.collection && !metadata.collectionSlugs?.includes(options.collection)) {
      metadata.collectionSlugs = [...(metadata.collectionSlugs ?? []), options.collection];
      collectionAssignments += 1;
    }
    await fs.writeFile(path.join(outputDir, MEDIA_META_FILE), `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
    imported.push({ slug, jsonPath: item.jsonPath });
    cleanupPaths.push(item.jsonPath, ...item.duplicateJsonPaths);
    console.log(`✔ Завантажено та імпортовано Lummi ${slug}.`);
  }

  if (imported.length > 0) {
    await Promise.all([tagStore.writeMissingRecords(), nameStore.writeMissingRecords()]);
    await updateImageTranslations({ slugs: imported.map((item) => item.slug), source: "lummi", pendingOnly: false, translateMissing: true });
  }
  for (const { outputDir, metadata } of stagedExistingMetadata) {
    await fs.writeFile(path.join(outputDir, MEDIA_META_FILE), `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  }
  for (const jsonPath of cleanupPaths) {
    await fs.rm(jsonPath, { force: true });
  }
  console.log(`Готово: нових імпортів ${imported.length}, готових пропущено ${skipped}, дублікатів intake згорнуто ${duplicateFiles}${options.collection ? `, до колекції ${options.collection} додано ${collectionAssignments}` : ""}.`);
}

if (require.main === module) {
  void main().catch((error) => {
    console.error(`Помилка: ${(error as Error).message}`);
    process.exitCode = 1;
  });
}
