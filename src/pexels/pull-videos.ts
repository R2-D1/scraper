import { promises as fs } from "node:fs";
import path from "node:path";

import {
  getPexelsVideoDir,
  MEDIA_COLLECTION_REGISTRY_PATH,
  PEXELS_VIDEOS_ROOT,
} from "../config/paths";
import {
  loadMediaCollectionRegistry,
  type MediaCollectionDefinition,
} from "../media-import/media-collections";
import type { MediaMetadata } from "../unsplash/import-utils";
import { MEDIA_META_FILE } from "../unsplash/library-paths";

const API_ROOT = "https://api.pexels.com/v1";
const PAGE_SIZE = 80;
const MAX_DIMENSION = 1920;

export type PexelsVideoFile = {
  id?: number;
  quality?: string;
  file_type?: string;
  width?: number | null;
  height?: number | null;
  link?: string;
};

type PexelsVideo = {
  id: number;
  width: number;
  height: number;
  duration: number;
  url: string;
  image?: string;
  user?: { name?: string; url?: string };
  video_files?: PexelsVideoFile[];
  type?: string;
};

type CollectionPage = { media: PexelsVideo[]; next_page?: string };
type Mapping = { collectionId: string; collectionSlugs: string[] };
type CliOptions = { collection?: string; limitPerCollection?: number };

export function selectPexelsVideoFile(
  files: readonly PexelsVideoFile[],
): PexelsVideoFile | null {
  const candidates = files.filter((file) => {
    const width = file.width ?? 0;
    const height = file.height ?? 0;
    return (
      file.file_type?.toLowerCase() === "video/mp4" &&
      typeof file.link === "string" &&
      file.link.length > 0 &&
      width > 0 &&
      height > 0 &&
      Math.max(width, height) <= MAX_DIMENSION
    );
  });
  return (
    candidates.sort((left, right) => {
      const leftPixels = (left.width ?? 0) * (left.height ?? 0);
      const rightPixels = (right.width ?? 0) * (right.height ?? 0);
      return rightPixels - leftPixels || (right.id ?? 0) - (left.id ?? 0);
    })[0] ?? null
  );
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") continue;
    if (arg === "--collection" || arg === "-c") {
      options.collection = argv[++index]?.trim();
      if (!options.collection)
        throw new Error("Потрібно вказати внутрішній slug після --collection.");
    } else if (arg === "--limit-per-collection") {
      const value = Number(argv[++index]);
      if (!Number.isInteger(value) || value < 1)
        throw new Error("Некоректний --limit-per-collection.");
      options.limitPerCollection = value;
    } else if (arg === "--help" || arg === "-h") {
      console.log(
        "pnpm run pexels:pull-videos -- [--collection <slug>] [--limit-per-collection <n>]",
      );
      process.exit(0);
    } else {
      throw new Error(`Невідомий аргумент "${arg}".`);
    }
  }
  return options;
}

function mappingsFor(
  registry: Awaited<ReturnType<typeof loadMediaCollectionRegistry>>,
  selectedSlug?: string,
): Mapping[] {
  const selected = selectedSlug
    ? [registry.get(selectedSlug)].filter(
        (item): item is MediaCollectionDefinition => Boolean(item),
      )
    : [...registry.values()];
  if (selectedSlug && selected.length === 0)
    throw new Error(`Не знайдено колекцію "${selectedSlug}".`);
  const grouped = new Map<string, string[]>();
  for (const collection of selected) {
    if (collection.category !== "videos") continue;
    for (const link of collection.providerCollections ?? []) {
      const slugs = grouped.get(link.collectionId) ?? [];
      slugs.push(collection.slug);
      grouped.set(link.collectionId, slugs);
    }
  }
  if (selectedSlug && grouped.size === 0)
    throw new Error(`Колекція "${selectedSlug}" не має Pexels-мапінгу відео.`);
  return [...grouped].map(([collectionId, collectionSlugs]) => ({
    collectionId,
    collectionSlugs,
  }));
}

async function fetchPage(
  collectionId: string,
  page: number,
  apiKey: string,
): Promise<CollectionPage> {
  const url = new URL(
    `${API_ROOT}/collections/${encodeURIComponent(collectionId)}`,
  );
  url.searchParams.set("type", "videos");
  url.searchParams.set("per_page", String(PAGE_SIZE));
  url.searchParams.set("page", String(page));
  const response = await fetch(url, {
    headers: { Authorization: apiKey, Accept: "application/json" },
  });
  if (!response.ok)
    throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());
  const payload = (await response.json()) as CollectionPage;
  if (!Array.isArray(payload.media))
    throw new Error("Pexels повернув колекцію без media.");
  return payload;
}

async function download(
  urlValue: string,
  expectedPrefix: string,
): Promise<Buffer> {
  const url = new URL(urlValue);
  if (url.protocol !== "https:")
    throw new Error(`Pexels URL має використовувати HTTPS: ${url.hostname}.`);
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(
      `Не вдалося завантажити ${url.hostname}: HTTP ${response.status}.`,
    );
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith(expectedPrefix))
    throw new Error(`Неочікуваний MIME ${contentType || "unknown"}.`);
  return Buffer.from(await response.arrayBuffer());
}

async function writeAsset(
  video: PexelsVideo,
  collectionSlugs: string[],
): Promise<"downloaded" | "skipped"> {
  const slug = `pexels-video-${video.id}`;
  const directory = getPexelsVideoDir(slug);
  const videoPath = path.join(directory, `${slug}.mp4`);
  const posterPath = path.join(directory, `${slug}_poster.jpeg`);
  const metaPath = path.join(directory, MEDIA_META_FILE);
  const videoExists = await fs
    .stat(videoPath)
    .then(() => true)
    .catch(() => false);
  if (videoExists) return "skipped";

  const file = selectPexelsVideoFile(video.video_files ?? []);
  if (!file?.link || !file.width || !file.height) {
    throw new Error(
      `Pexels video ${video.id} не має MP4 у межах ${MAX_DIMENSION}px.`,
    );
  }
  const existing = await fs
    .readFile(metaPath, "utf8")
    .then((value) => JSON.parse(value) as MediaMetadata)
    .catch(() => null);
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(videoPath, await download(file.link, "video/mp4"));
  if (
    video.image &&
    !(await fs
      .stat(posterPath)
      .then(() => true)
      .catch(() => false))
  ) {
    await fs.writeFile(posterPath, await download(video.image, "image/"));
  }
  const nameEn = existing?.i18n.name.en || `Pexels video ${video.id}`;
  const metadata: MediaMetadata = {
    slug,
    mediaKey: `pexels:video:${video.id}`,
    i18n: existing?.i18n ?? {
      name: { en: nameEn, uk: "" },
      alt: { en: nameEn, uk: "" },
      tags: [],
      keywords: { en: [], uk: [] },
    },
    category: { key: "videos", en: "Videos", uk: "Відео" },
    collectionSlugs: [
      ...new Set([...(existing?.collectionSlugs ?? []), ...collectionSlugs]),
    ],
    pinned: existing?.pinned === true,
    source: video.url,
    sourceName: "Pexels",
    authorName: video.user?.name?.trim() || undefined,
    authorUrl: video.user?.url,
    licenseName: "Pexels License",
    licenseUrl: "https://www.pexels.com/license/",
    tier: "free",
    downloadSource: "pexels-api",
    taggingStatus: existing?.taggingStatus ?? "pending",
    width: file.width,
    height: file.height,
    duration: video.duration,
    mimeType: "video/mp4",
    container: "mp4",
  };
  const temporary = `${metaPath}.${process.pid}.tmp`;
  await fs.writeFile(
    temporary,
    `${JSON.stringify(metadata, null, 2)}\n`,
    "utf8",
  );
  await fs.rename(temporary, metaPath);
  return "downloaded";
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const apiKey = process.env.PEXELS_API_KEY?.trim();
  if (!apiKey)
    throw new Error("Не задано PEXELS_API_KEY у середовищі scraper.");
  const registry = await loadMediaCollectionRegistry(
    MEDIA_COLLECTION_REGISTRY_PATH,
  );
  const mappings = mappingsFor(registry, options.collection);
  if (!mappings.length)
    throw new Error("У реєстрі немає Pexels-колекції відео.");
  const collected = new Map<
    number,
    { video: PexelsVideo; collectionSlugs: Set<string> }
  >();
  for (const mapping of mappings) {
    let page = 1;
    let count = 0;
    while (true) {
      const response = await fetchPage(mapping.collectionId, page, apiKey);
      for (const video of response.media) {
        if (options.limitPerCollection && count >= options.limitPerCollection)
          break;
        if (
          typeof video.id === "number" &&
          (!video.type || video.type.toLowerCase() === "video")
        ) {
          const item = collected.get(video.id) ?? {
            video,
            collectionSlugs: new Set<string>(),
          };
          mapping.collectionSlugs.forEach((slug) =>
            item.collectionSlugs.add(slug),
          );
          collected.set(video.id, item);
          count += 1;
        }
      }
      if (
        !response.next_page ||
        (options.limitPerCollection && count >= options.limitPerCollection)
      )
        break;
      page += 1;
    }
  }
  await fs.mkdir(PEXELS_VIDEOS_ROOT, { recursive: true });
  let downloaded = 0;
  let skipped = 0;
  const rejected: string[] = [];
  for (const item of collected.values()) {
    try {
      const outcome = await writeAsset(item.video, [...item.collectionSlugs]);
      if (outcome === "downloaded") downloaded += 1;
      else skipped += 1;
    } catch (error) {
      rejected.push(
        `${item.video.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  if (rejected.length) {
    const rejectPath = path.join(PEXELS_VIDEOS_ROOT, "rejected.json");
    await fs.writeFile(
      rejectPath,
      `${JSON.stringify({ version: 1, assets: rejected }, null, 2)}\n`,
      "utf8",
    );
  }
  console.log(
    `Готово: завантажено ${downloaded}, пропущено наявних локально ${skipped}, відхилено ${rejected.length}.`,
  );
}

if (require.main === module) {
  void main().catch((error) => {
    console.error(
      `Помилка імпорту Pexels video: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  });
}
