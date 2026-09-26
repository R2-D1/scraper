import { spawn } from "node:child_process";
import { promises as fs, Dirent } from "node:fs";
import path from "node:path";

import sharp from "sharp";

import {
  CTRLV_ILLUSTRATIONS_ROOT,
  UNDRAW_ILLUSTRATIONS_ROOT,
  LUMMI_IMAGES_ROOT,
  PEXELS_IMAGES_ROOT,
  PEXELS_VIDEOS_ROOT,
  UNSPLASH_ILLUSTRATIONS_ROOT,
  UNSPLASH_IMAGES_ROOT,
} from "../config/paths";
import { collectMetaFiles, hydrateSizes } from "../unsplash/hydrate-sizes";
import type { MediaMetadata } from "../unsplash/import-utils";
import { mediaSettings } from "../config/media-settings";
import { appendCustomImagesToExport } from "./prepare-custom-images";
import { assertImageDisplayNames } from "./image-name-validation";
import {
  archiveMediaCollection,
  loadMediaCollectionCurationItems,
  loadMediaCollectionRegistry,
  requireAssignedMediaCollections,
  validateMediaCollectionCuration,
  type MediaCollectionRegistry,
} from "./media-collections";
import {
  buildRelatedImageGroupByMediaKey,
  loadRelatedImageGroupRegistry,
  validateRelatedImageGroups,
} from "./related-image-groups";

sharp.concurrency(2);

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_OUTPUT_DIR = path.join(PROJECT_ROOT, "tmp", "images");
const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ".svg",
]);
const VIDEO_EXTENSIONS = new Set([".mp4"]);
const OVERSIZE_LOG_NAME = "oversize.txt";
const OVERSIZE_MANIFEST_NAME = "oversize.json";
const OVERSIZE_LOG_DIR = path.join(PROJECT_ROOT, "tmp");
const ARCHIVE_EXT = ".zip";
const {
  thumbWidth,
  thumbSuffix,
  thumbQuality,
  webpQuality,
  variantWidths,
  variantThresholdRatio,
  maxSvgBytes,
  minSvgThumbBytes,
} = mediaSettings;

function buildOversizeReference(meta: MediaMetadata): string | undefined {
  return meta.source ?? undefined;
}

async function runZipArchive(
  archiveName: string,
  sourceName: string,
  cwd: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("zip", ["-rq", archiveName, sourceName], {
      cwd,
      stdio: "inherit",
    });

    child.on("error", (error) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        reject(
          new Error(
            "Не знайдено утиліту zip. Встановіть її або створіть архів вручну.",
          ),
        );
        return;
      }
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`zip завершився з кодом ${code ?? "??"}.`));
    });
  });
}

async function createArchive(outDir: string): Promise<string> {
  const parentDir = path.dirname(outDir);
  const baseName = path.basename(outDir);
  const archiveName = `${baseName}${ARCHIVE_EXT}`;
  const archivePath = path.join(parentDir, archiveName);

  await fs.rm(archivePath, { force: true });
  await runZipArchive(archiveName, baseName, parentDir);
  return archivePath;
}

type CliOptions = {
  outDir: string;
  keep: boolean;
  createArchive?: boolean;
  includeSlugs?: ReadonlySet<string>;
};

type ProcessedMedia = {
  mainFile: string;
  width: number;
  height: number;
};

type MediaCandidate = {
  mainFile: string;
  width: number;
  height: number;
  size: number;
  type: "svg" | "raster" | "video";
  commit: (targetDir: string) => Promise<void>;
};

type RasterRenderResult = {
  mainFile: string;
  buffer: Buffer;
  width: number;
  height: number;
  sourceWidth: number;
  size: number;
};

function isOversizeValue(
  size: number,
  type: "svg" | "raster" | "video",
): boolean {
  return type === "svg" && size > maxSvgBytes;
}

async function buildVideoCandidate(
  sourcePath: string,
  sourceDir: string,
  slug: string,
  meta: MediaMetadata,
): Promise<CandidateOutcome> {
  if (!isPositive(meta.width) || !isPositive(meta.height)) {
    throw new Error(`Відео "${slug}" не має валідних width/height у metadata.`);
  }
  const poster = (await fs.readdir(sourceDir, { withFileTypes: true })).find(
    (entry) => entry.isFile() && entry.name.startsWith(`${slug}_poster.`),
  );
  if (!poster) throw new Error(`Відео "${slug}" не має poster sidecar.`);
  const stats = await fs.stat(sourcePath);
  return {
    candidate: {
      mainFile: `${slug}.mp4`,
      width: meta.width,
      height: meta.height,
      size: stats.size,
      type: "video",
      commit: async (targetDir) => {
        await fs.copyFile(sourcePath, path.join(targetDir, `${slug}.mp4`));
        const thumbnail = await buildThumbnailBuffer(
          path.join(sourceDir, poster.name),
        );
        await fs.writeFile(
          path.join(targetDir, `${slug}${thumbSuffix}.webp`),
          thumbnail,
        );
      },
    },
  };
}

async function buildThumbnailBuffer(sourcePath: string): Promise<Buffer> {
  const { data } = await sharp(sourcePath)
    .resize({ width: thumbWidth, withoutEnlargement: true })
    .webp({ quality: thumbQuality })
    .toBuffer({ resolveWithObject: true });
  return data;
}

function resolveVariantWidthsForImage(originalWidth: number): number[] {
  if (!Number.isFinite(originalWidth) || originalWidth <= 0) {
    return [];
  }
  if (!Array.isArray(variantWidths) || variantWidths.length === 0) {
    return [];
  }
  const threshold =
    Number.isFinite(variantThresholdRatio) && variantThresholdRatio > 0
      ? variantThresholdRatio
      : 1.1;
  return variantWidths.filter(
    (width) =>
      width > 0 && width < originalWidth && originalWidth / width >= threshold,
  );
}

function buildVariantFileName(slug: string, width: number): string {
  return `${slug}_w${width}.webp`;
}

function isVariantFileName(fileName: string, slug?: string): boolean {
  if (!fileName.toLowerCase().endsWith(".webp")) {
    return false;
  }
  const base = fileName.slice(0, -".webp".length);
  if (slug) {
    return (
      base.toLowerCase().startsWith(`${slug.toLowerCase()}_w`) &&
      /_w\d+$/i.test(base)
    );
  }
  return /_w\d+$/i.test(base);
}

async function renderRasterMain(
  sourcePath: string,
  slug: string,
): Promise<RasterRenderResult> {
  const metadata = await sharp(sourcePath).metadata();
  const maxWidth = variantWidths[variantWidths.length - 1];
  let pipeline = sharp(sourcePath);
  if (Number.isFinite(maxWidth) && maxWidth > 0) {
    pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true });
  }
  const output = await pipeline
    .webp({ quality: webpQuality, smartSubsample: true })
    .toBuffer({ resolveWithObject: true });
  const buffer = output.data;
  const info = output.info;

  const width = info.width ?? metadata.width ?? 0;
  const height = info.height ?? metadata.height ?? 0;
  return {
    mainFile: `${slug}.webp`,
    buffer,
    width,
    height,
    sourceWidth: metadata.width ?? width,
    size: buffer.length,
  };
}

type CandidateOutcome =
  | { candidate: MediaCandidate }
  | { oversizeSize: number };

async function buildRasterCandidate(
  sourcePath: string,
  slug: string,
): Promise<CandidateOutcome> {
  const render = await renderRasterMain(sourcePath, slug);
  return {
    candidate: {
      mainFile: render.mainFile,
      width: render.width,
      height: render.height,
      size: render.size,
      type: "raster",
      commit: async (targetDir) => {
        await fs.writeFile(
          path.join(targetDir, render.mainFile),
          render.buffer,
        );
        const thumbBuffer = await buildThumbnailBuffer(sourcePath);
        const thumbPath = path.join(targetDir, `${slug}${thumbSuffix}.webp`);
        await fs.writeFile(thumbPath, thumbBuffer);
        const variants = resolveVariantWidthsForImage(render.sourceWidth);
        if (variants.length) {
          for (const width of variants) {
            const resized =
              width === render.width
                ? render.buffer
                : await sharp(sourcePath)
                    .resize({ width, withoutEnlargement: true })
                    .webp({ quality: webpQuality, smartSubsample: true })
                    .toBuffer();
            if (!resized?.length) {
              continue;
            }
            const variantPath = path.join(
              targetDir,
              buildVariantFileName(slug, width),
            );
            await fs.writeFile(variantPath, resized);
          }
        }
      },
    },
  };
}

async function buildSvgCandidate(
  sourcePath: string,
  slug: string,
): Promise<CandidateOutcome> {
  const stats = await fs.stat(sourcePath);
  const size = stats.size;
  if (isOversizeValue(size, "svg")) {
    return { oversizeSize: size };
  }
  const { width, height } = await measureSvg(sourcePath);
  return {
    candidate: {
      mainFile: `${slug}.svg`,
      width,
      height,
      size,
      type: "svg",
      commit: async (targetDir) => {
        const targetPath = path.join(targetDir, `${slug}.svg`);
        await fs.copyFile(sourcePath, targetPath);
        if (size > minSvgThumbBytes) {
          const thumbBuffer = await buildThumbnailBuffer(sourcePath);
          if (thumbBuffer.length < size * 0.8) {
            const thumbPath = path.join(
              targetDir,
              `${slug}${thumbSuffix}.webp`,
            );
            await fs.writeFile(thumbPath, thumbBuffer);
          }
        }
      },
    },
  };
}

function parseArgs(argv: string[]): CliOptions {
  let outDir = DEFAULT_OUTPUT_DIR;
  let keep = true;
  let createArchive = true;
  const includeSlugs = new Set<string>();

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--out":
      case "-o": {
        const value = argv[i + 1];
        if (!value) {
          throw new Error("Потрібно вказати шлях після --out.");
        }
        outDir = path.resolve(PROJECT_ROOT, value);
        i += 1;
        break;
      }
      case "--keep":
        keep = true;
        break;
      case "--clean":
        keep = false;
        break;
      case "--no-archive":
        createArchive = false;
        break;
      case "--slug": {
        const value = argv[i + 1]?.trim();
        if (!value) {
          throw new Error("Потрібно вказати slug після --slug.");
        }
        includeSlugs.add(value);
        i += 1;
        break;
      }
      case "--":
        break;
      case "--help":
      case "-h":
        console.log(
          [
            "Використання:",
            "  pnpm run media:prepare:images [--out <шлях/до/tmp/images>] [--keep] [--slug <slug> ...]",
            "",
            "Параметри:",
            "  --out, -o   Тека призначення (дефолт — tmp/images).",
            "  --clean     Очистити теку перед копіюванням/оптимізацією.",
            "  --no-archive Не створювати загальний ZIP після підготовки.",
            "  --slug      Підготувати лише вказані slug (параметр можна повторити).",
            "  (за замовчуванням файли збережені раніше не перетворюються, оновлюються лише метадані)",
            "",
            "Додатково:",
            "  Після підготовки створюється архів images.zip поруч із текою призначення.",
          ].join("\n"),
        );
        process.exit(0);
      default:
        if (!arg.startsWith("-")) {
          outDir = path.resolve(PROJECT_ROOT, arg);
        } else {
          throw new Error(`Невідомий аргумент "${arg}".`);
        }
    }
  }

  return {
    outDir,
    keep,
    createArchive,
    includeSlugs: includeSlugs.size > 0 ? includeSlugs : undefined,
  };
}

async function ensureOutputDir(outDir: string, keep: boolean): Promise<void> {
  if (!keep) {
    await fs.rm(outDir, { recursive: true, force: true });
  }
  await fs.mkdir(outDir, { recursive: true });
}

function isPositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function parseDimension(value: string): number | null {
  const match = value.trim().match(/^([0-9]+(?:\.[0-9]+)?)(px)?$/i);
  if (!match) {
    return null;
  }
  return parseFloat(match[1]);
}

async function measureSvg(
  filePath: string,
): Promise<{ width: number; height: number }> {
  const content = await fs.readFile(filePath, "utf-8");

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

  throw new Error(
    "Не вдалося визначити розміри SVG (відсутні viewBox/width/height).",
  );
}

async function measureMedia(
  filePath: string,
  meta?: MediaMetadata,
): Promise<{ width: number; height: number }> {
  const ext = path.extname(filePath).toLowerCase();
  if (VIDEO_EXTENSIONS.has(ext)) {
    if (!isPositive(meta?.width) || !isPositive(meta?.height))
      throw new Error("Відео не має width/height у metadata.");
    return { width: meta.width, height: meta.height };
  }
  if (ext === ".svg") {
    return measureSvg(filePath);
  }

  const imageMeta = await sharp(filePath).metadata();
  if (!isPositive(imageMeta.width) || !isPositive(imageMeta.height)) {
    throw new Error("Sharp не повернув ширину/висоту.");
  }
  return { width: imageMeta.width, height: imageMeta.height };
}

async function findPrimaryMediaFile(
  dir: string,
  slug: string,
): Promise<string | null> {
  let entries: Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }

  const candidates: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    if (
      entry.name === "media-meta.json" ||
      entry.name.includes(thumbSuffix) ||
      entry.name.includes("_poster.")
    ) {
      continue;
    }
    if (isVariantFileName(entry.name, slug)) {
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(ext) && !VIDEO_EXTENSIONS.has(ext)) {
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

async function processMediaFile(
  metaPath: string,
  outDir: string,
): Promise<{
  result?: ProcessedMedia;
  meta: MediaMetadata;
  oversizeSource?: string;
  oversizeSize?: number;
}> {
  const sourceDir = path.dirname(metaPath);
  const raw = await fs.readFile(metaPath, "utf-8");
  const meta = JSON.parse(raw) as MediaMetadata;
  const slug = meta.slug || path.basename(sourceDir);
  assertImageDisplayNames(meta, `Медіа "${slug}"`);
  const sourceDirName = path.basename(sourceDir);
  const targetDir = path.join(outDir, sourceDirName);

  const existingPrimary = await findPrimaryMediaFile(targetDir, slug);
  if (existingPrimary) {
    const existingExt = path.extname(existingPrimary).toLowerCase();
    const existingType = VIDEO_EXTENSIONS.has(existingExt)
      ? "video"
      : existingExt === ".svg"
        ? "svg"
        : "raster";
    const existingStat = await fs.stat(existingPrimary);
    if (isOversizeValue(existingStat.size, existingType)) {
      await fs.rm(targetDir, { recursive: true, force: true });
      const oversizeLink = buildOversizeReference(meta);
      if (oversizeLink) {
        return {
          meta,
          oversizeSource: oversizeLink,
          oversizeSize: existingStat.size,
        };
      }
      return { meta };
    }
    const { width, height } = await measureMedia(existingPrimary, meta);
    return {
      meta,
      result: {
        mainFile: path.basename(existingPrimary),
        width,
        height,
      },
    };
  }

  const mediaFile = await findPrimaryMediaFile(sourceDir, slug);
  if (!mediaFile) {
    throw new Error("Не знайдено файл медіа біля media-meta.json");
  }

  const ext = path.extname(mediaFile).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(ext) && !VIDEO_EXTENSIONS.has(ext)) {
    throw new Error(`Непідтримуваний тип файла: ${ext || "без розширення"}`);
  }

  const candidateOutcome = VIDEO_EXTENSIONS.has(ext)
    ? await buildVideoCandidate(mediaFile, sourceDir, slug, meta)
    : ext === ".svg"
      ? await buildSvgCandidate(mediaFile, slug)
      : await buildRasterCandidate(mediaFile, slug);

  if ("oversizeSize" in candidateOutcome) {
    await fs.rm(targetDir, { recursive: true, force: true });
    const oversizeLink = buildOversizeReference(meta);
    if (oversizeLink) {
      return {
        meta,
        oversizeSource: oversizeLink,
        oversizeSize: candidateOutcome.oversizeSize,
      };
    }
    return { meta };
  }

  const finalCandidate = candidateOutcome.candidate;
  await fs.mkdir(targetDir, { recursive: true });
  await finalCandidate.commit(targetDir);

  return {
    meta,
    result: {
      mainFile: finalCandidate.mainFile,
      width: finalCandidate.width,
      height: finalCandidate.height,
    },
  };
}

export function buildImageArchiveMeta(
  original: MediaMetadata,
  processed: ProcessedMedia,
  collections: MediaCollectionRegistry,
  relatedGroup?: { key: string; position: number },
): Record<string, unknown> {
  const {
    tier,
    downloadSource,
    description,
    collectionSlugs = [],
    taggingStatus,
    ...rest
  } = original as MediaMetadata & {
    tier?: unknown;
    downloadSource?: unknown;
    description?: unknown;
    taggingStatus?: unknown;
  };

  if (original.sourceName === "Pexels" || original.sourceName === "Lummi" || original.sourceName === "CtrlV" || original.sourceName === "unDraw") {
    const localizedTags =
      Array.isArray(original.i18n.tags) &&
      original.i18n.tags.length > 0 &&
      original.i18n.tags.every((tag) =>
        Boolean(tag?.i18n?.en?.trim() && tag?.i18n?.uk?.trim()),
      );
    if (taggingStatus !== "complete" || !localizedTags) {
      throw new Error(
        `Медіа ${original.sourceName} "${original.slug}" ще очікує локалізації.`,
      );
    }
  }

  const uniqueCollectionSlugs = Array.from(new Set(collectionSlugs));
  if (uniqueCollectionSlugs.length !== collectionSlugs.length) {
    throw new Error(`Зображення "${original.slug}" містить дубль колекції.`);
  }
  const archiveCollections = requireAssignedMediaCollections(
    collections,
    uniqueCollectionSlugs,
    original.category.key,
    original.slug,
  ).map(archiveMediaCollection);
  const next: Record<string, unknown> = {
    ...rest,
    pinned: original.pinned === true,
    collections: archiveCollections,
    width: processed.width,
    height: processed.height,
    relatedGroup: relatedGroup ?? null,
  };

  return next;
}

async function writeMeta(
  targetDir: string,
  meta: Record<string, unknown>,
): Promise<void> {
  const metaPath = path.join(targetDir, "media-meta.json");
  await fs.writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, "utf-8");
}

export async function prepareImages(
  options: CliOptions,
): Promise<{ copied: number; total: number; archivePath?: string }> {
  const collections = await loadMediaCollectionRegistry();
  const curationItems = await loadMediaCollectionCurationItems();
  validateMediaCollectionCuration(collections, curationItems);
  const relatedGroups = await loadRelatedImageGroupRegistry();
  validateRelatedImageGroups(
    relatedGroups,
    curationItems.map((item) => ({
      mediaKey: item.mediaKey,
      category: item.category,
    })),
  );
  const relatedGroupByMediaKey =
    buildRelatedImageGroupByMediaKey(relatedGroups);
  await ensureOutputDir(options.outDir, options.keep);

  console.log("Гідрація width/height у бібліотеці зображень...");
  const imageRoots = [
    UNSPLASH_IMAGES_ROOT,
    UNSPLASH_ILLUSTRATIONS_ROOT,
    PEXELS_IMAGES_ROOT,
    LUMMI_IMAGES_ROOT,
    CTRLV_ILLUSTRATIONS_ROOT,
    UNDRAW_ILLUSTRATIONS_ROOT,
  ];
  const libraryRoots = [...imageRoots, PEXELS_VIDEOS_ROOT];
  const hydrationSummary = await hydrateSizes(imageRoots);
  if (hydrationSummary.total === 0) {
    console.log(
      "Не знайдено meta-файлів у бібліотеці зображень — копіювання пропущено.",
    );
  } else {
    console.log(
      `Гідрація завершена: оновлено ${hydrationSummary.updated}, пропущено ${hydrationSummary.skippedExisting}, без файла: ${hydrationSummary.missingFile}, помилок: ${hydrationSummary.failed}.`,
    );
  }

  const allMetaFiles = await collectMetaFiles(libraryRoots);
  const metaFiles = options.includeSlugs
    ? allMetaFiles.filter((metaPath) =>
        options.includeSlugs?.has(path.basename(path.dirname(metaPath))),
      )
    : allMetaFiles;
  let copied = 0;
  let failed = 0;
  const oversizeEntries: string[] = [];
  const oversizeAssets: Array<{ slug: string; source: string; size: number }> =
    [];
  const oversizeSet = new Set<string>();
  const processMetaFile = async (metaPath: string): Promise<void> => {
    try {
      const { result, meta, oversizeSource, oversizeSize } =
        await processMediaFile(metaPath, options.outDir);
      if (oversizeSource) {
        const weight =
          typeof oversizeSize === "number"
            ? (oversizeSize / (1024 * 1024)).toFixed(2)
            : "??";
        console.log(`  ⚠ Пропускаємо ${oversizeSource} (${weight} MB).`);
        if (
          !oversizeSet.has(oversizeSource) &&
          typeof oversizeSize === "number"
        ) {
          oversizeSet.add(oversizeSource);
          oversizeEntries.push(`${weight} MB ${oversizeSource}`);
        }
        if (typeof oversizeSize === "number") {
          oversizeAssets.push({
            slug: path.basename(path.dirname(metaPath)),
            source: oversizeSource,
            size: oversizeSize,
          });
        }
        return;
      }
      if (!result) {
        return;
      }
      const targetDir = path.join(
        options.outDir,
        meta.slug || path.basename(path.dirname(metaPath)),
      );
      const updatedMeta = buildImageArchiveMeta(
        meta,
        result,
        collections,
        relatedGroupByMediaKey.get(meta.mediaKey),
      );
      await writeMeta(targetDir, updatedMeta);
      copied += 1;
    } catch (error) {
      failed += 1;
      const relative = path.relative(PROJECT_ROOT, metaPath);
      console.error(
        `  ✖ Помилка для ${relative}: ${(error as Error).message}`,
      );
    }
  };
  const concurrency = 2;
  for (let offset = 0; offset < metaFiles.length; offset += concurrency) {
    await Promise.all(
      metaFiles
        .slice(offset, offset + concurrency)
        .map(processMetaFile),
    );
  }

  const oversizeLogPath = path.join(OVERSIZE_LOG_DIR, OVERSIZE_LOG_NAME);
  const oversizeManifestPath = path.join(
    OVERSIZE_LOG_DIR,
    OVERSIZE_MANIFEST_NAME,
  );
  if (oversizeEntries.length > 0) {
    await fs.mkdir(OVERSIZE_LOG_DIR, { recursive: true });
    await fs.writeFile(
      oversizeLogPath,
      `${oversizeEntries.join("\n")}\n`,
      "utf-8",
    );
    await fs.writeFile(
      oversizeManifestPath,
      `${JSON.stringify({ version: 1, assets: oversizeAssets }, null, 2)}\n`,
      "utf-8",
    );
  } else {
    await fs.rm(oversizeLogPath, { force: true });
    await fs.rm(oversizeManifestPath, { force: true });
  }

  if (failed > 0) {
    throw new Error(
      `Експорт зупинено: ${failed} зображень мають невалідні метадані.`,
    );
  }

  const customResult = await appendCustomImagesToExport({
    outDir: options.outDir,
    includeSlugs: options.includeSlugs,
  });
  copied += customResult.copied;

  let archivePath: string | undefined;
  if (options.createArchive !== false) {
    console.log("Створення архіву з підготовленими файлами...");
    archivePath = await createArchive(options.outDir);
    console.log(`Архів створено: ${path.relative(PROJECT_ROOT, archivePath)}.`);
  }

  return { copied, total: metaFiles.length + customResult.total, archivePath };
}

async function main(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = await prepareImages(options);
    console.log(
      `Готово: оброблено ${result.copied}/${result.total} папок у ${path.relative(PROJECT_ROOT, options.outDir)}.`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Помилка: ${message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  void main();
}
