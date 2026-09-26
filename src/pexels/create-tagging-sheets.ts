import { promises as fs } from "node:fs";
import path from "node:path";

import sharp from "sharp";

import {
  MEDIA_COLLECTION_REGISTRY_PATH,
  PEXELS_IMAGES_ROOT,
  PEXELS_VIDEOS_ROOT,
} from "../config/paths";
import { loadMediaCollectionRegistry } from "../media-import/media-collections";
import type { MediaMetadata } from "../unsplash/import-utils";
import { MEDIA_META_FILE } from "../unsplash/library-paths";

const ITEMS_PER_SHEET = 20;
const COLUMNS = 5;
const TILE_WIDTH = 240;
const TILE_HEIGHT = 196;
const IMAGE_WIDTH = 224;
const IMAGE_HEIGHT = 164;

type PendingPexelsImage = {
  slug: string;
  filePath: string;
  collectionSlugs: string[];
};

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function labelSvg(slug: string): Buffer {
  return Buffer.from(
    `<svg width="${TILE_WIDTH}" height="28" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#fff"/><text x="8" y="19" font-family="Arial,sans-serif" font-size="14" fill="#111827">${escapeXml(slug)}</text></svg>`,
  );
}

function runId(): string {
  return new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
}

function showUsage(): void {
  console.log(
    [
      "Використання:",
      "  pnpm run pexels:tagging:sheets [--collection <slug>]",
      "",
      "Створює контактні аркуші та JSON-шаблони для Pexels-фото зі статусом pending.",
    ].join("\n"),
  );
}

async function readPendingImages(
  selectedCollection?: string,
): Promise<Map<string, PendingPexelsImage[]>> {
  const registry = await loadMediaCollectionRegistry(
    MEDIA_COLLECTION_REGISTRY_PATH,
  );
  const groups = new Map<string, PendingPexelsImage[]>();
  const roots = [PEXELS_IMAGES_ROOT, PEXELS_VIDEOS_ROOT];

  for (const root of roots)
    for (const entry of (
      await fs.readdir(root, { withFileTypes: true }).catch((error) => {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
        throw error;
      })
    ).filter((candidate) => candidate.isDirectory())) {
      const slug = entry.name;
      const directory = path.join(root, slug);
      const metaPath = path.join(directory, MEDIA_META_FILE);
      const metadata = JSON.parse(
        await fs.readFile(metaPath, "utf-8"),
      ) as MediaMetadata;
      if (
        metadata.sourceName !== "Pexels" ||
        metadata.taggingStatus !== "pending"
      )
        continue;

      const collectionSlugs = [...new Set(metadata.collectionSlugs ?? [])];
      if (collectionSlugs.length === 0)
        throw new Error(`${slug} не має призначеної колекції.`);
      for (const collectionSlug of collectionSlugs) {
        const collection = registry.get(collectionSlug);
        if (!collection || collection.category !== metadata.category.key) {
          throw new Error(`${slug} має невідому колекцію "${collectionSlug}".`);
        }
      }

      const primaryCollection = collectionSlugs[0];
      if (selectedCollection && selectedCollection !== primaryCollection)
        continue;
      const imageFile = (await fs.readdir(directory, { withFileTypes: true }))
        .filter(
          (candidate) =>
            candidate.isFile() && candidate.name !== MEDIA_META_FILE,
        )
        .filter(
          (candidate) =>
            metadata.category.key !== "videos" ||
            candidate.name.includes("_poster."),
        )
        .map((candidate) => path.join(directory, candidate.name));
      if (imageFile.length !== 1)
        throw new Error(`${slug} має містити рівно один оригінальний файл.`);

      const batch = groups.get(primaryCollection) ?? [];
      batch.push({ slug, filePath: imageFile[0], collectionSlugs });
      groups.set(primaryCollection, batch);
    }

  for (const images of groups.values())
    images.sort((a, b) => a.slug.localeCompare(b.slug, "en"));
  return groups;
}

async function buildSheet(
  images: PendingPexelsImage[],
  outputPath: string,
): Promise<void> {
  const rows = Math.ceil(images.length / COLUMNS);
  const sheetWidth = COLUMNS * TILE_WIDTH;
  const sheetHeight = rows * TILE_HEIGHT;
  const overlays: sharp.OverlayOptions[] = [];

  for (const [index, image] of images.entries()) {
    const left = (index % COLUMNS) * TILE_WIDTH;
    const top = Math.floor(index / COLUMNS) * TILE_HEIGHT;
    const thumbnail = await sharp(image.filePath)
      .rotate()
      .resize(IMAGE_WIDTH, IMAGE_HEIGHT, {
        fit: "contain",
        background: "#eef1f5",
      })
      .jpeg({ quality: 78, mozjpeg: true })
      .toBuffer();
    overlays.push({ input: thumbnail, left: left + 8, top: top + 4 });
    overlays.push({
      input: labelSvg(image.slug),
      left,
      top: top + IMAGE_HEIGHT + 8,
    });
  }

  await sharp({
    create: {
      width: sheetWidth,
      height: sheetHeight,
      channels: 3,
      background: "#eef1f5",
    },
  })
    .composite(overlays)
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(outputPath);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let collectionFilter: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--collection" || arg === "-c") {
      collectionFilter = args[index + 1]?.trim();
      if (!collectionFilter)
        throw new Error("Після --collection вкажи slug колекції.");
      index += 1;
    } else if (arg === "--") {
      continue;
    } else if (arg === "--help" || arg === "-h") {
      showUsage();
      return;
    } else {
      throw new Error(`Невідомий аргумент "${arg}".`);
    }
  }

  const groups = await readPendingImages(collectionFilter);
  const total = [...groups.values()].reduce(
    (sum, images) => sum + images.length,
    0,
  );
  if (total === 0)
    throw new Error("Не знайдено Pexels-фото зі статусом pending.");

  const outputRoot = path.resolve("tmp", "pexels-tagging", `run-${runId()}`);
  await fs.mkdir(outputRoot, { recursive: true });
  let sheetCount = 0;

  for (const [collectionSlug, images] of [...groups].sort(([a], [b]) =>
    a.localeCompare(b, "en"),
  )) {
    for (let start = 0; start < images.length; start += ITEMS_PER_SHEET) {
      const page = Math.floor(start / ITEMS_PER_SHEET) + 1;
      const batch = images.slice(start, start + ITEMS_PER_SHEET);
      const stem = `${collectionSlug}-${String(page).padStart(2, "0")}`;
      await buildSheet(batch, path.join(outputRoot, `${stem}.jpg`));
      await fs.writeFile(
        path.join(outputRoot, `${stem}.json`),
        `${JSON.stringify(
          {
            schemaVersion: 1,
            collectionSlug,
            items: batch.map((image) => ({
              slug: image.slug,
              nameEn: "",
              tagsEn: [],
              reviewVideoPath: image.slug.startsWith("pexels-video-")
                ? path.relative(
                    outputRoot,
                    path.join(
                      PEXELS_VIDEOS_ROOT,
                      image.slug,
                      `${image.slug}.mp4`,
                    ),
                  )
                : undefined,
            })),
          },
          null,
          2,
        )}\n`,
        "utf-8",
      );
      sheetCount += 1;
    }
  }

  console.log(
    `Створено ${sheetCount} контактних аркушів для ${total} Pexels-фото.`,
  );
  console.log(`Папка: ${outputRoot}`);
  console.log(
    "У JSON-файлах заповни лише nameEn і tagsEn. Колекції визначаються Pexels-мапінгом.",
  );
}

void main().catch((error) => {
  console.error(
    `Помилка створення контактних аркушів: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
