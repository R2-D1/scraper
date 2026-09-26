import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { UnsplashMediaKind } from "../config/paths";
import type { LocalizedTag } from "./tag-utils";
import { MEDIA_META_FILE } from "./library-paths";
import { sanitizeSegment } from "./utils";

const UNSPLASH_ACCESS_KEY = "FbJ_V9wfIxoSvB634Ls9akSrYcmJpHMduY5J3J14AoY";

let officialApiBlocked = false;
let officialApiBlockMessage: string | null = null;

class UnsplashApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "UnsplashApiError";
  }
}

export const CATEGORY_LABELS_BY_KIND: Record<
  UnsplashMediaKind,
  { en: string; uk: string }
> = {
  image: { en: "Images", uk: "Зображення" },
  illustration: { en: "Illustrations", uk: "Ілюстрації" },
};

export const CATEGORY_BY_KIND: Record<UnsplashMediaKind, string> =
  Object.fromEntries(
    Object.entries(CATEGORY_LABELS_BY_KIND).map(([key, labels]) => [
      key,
      labels.uk,
    ]),
  ) as Record<UnsplashMediaKind, string>;

export type Tier = "free" | "plus";

export type DownloadSource = "downloads" | "pexels-api" | "ctrlv" | "undraw";

export type UnsplashPhoto = {
  id: string;
  slug: string;
  description: string | null;
  alt_description: string | null;
  width: number;
  height: number;
  color: string | null;
  blur_hash?: string | null;
  created_at?: string;
  updated_at?: string;
  asset_type?: string;
  premium?: boolean;
  plus?: boolean;
  urls: {
    raw?: string;
    full?: string;
    regular?: string;
    small?: string;
  };
  links: {
    html: string;
    download: string;
    download_location: string;
  };
  tags?: Array<{ title?: string }>;
  tags_preview?: Array<{ title?: string }>;
  user: {
    name?: string;
    username?: string;
    links?: { html?: string };
    portfolio_url?: string | null;
  };
};

export type LocalizedText = {
  en: string;
  uk: string;
};

export type LocalizedList = {
  en: string[];
  uk: string[];
};

export type MediaI18n = {
  name: LocalizedText;
  alt: LocalizedText;
  tags: LocalizedTag[];
  keywords: LocalizedList;
};

export type MediaCategoryKey = "images" | "illustrations" | "videos";

export type MediaCategory = {
  key: MediaCategoryKey;
  en: string;
  uk: string;
};

export type MediaMetadata = {
  slug: string;
  mediaKey: string;
  i18n: MediaI18n;
  category: MediaCategory;
  collectionSlugs?: string[];
  pinned: boolean;
  source: string;
  sourceName?: string;
  authorName?: string;
  authorUrl?: string;
  description?: string;
  licenseName: string;
  licenseUrl: string;
  tier: Tier;
  downloadSource: DownloadSource;
  taggingStatus?: "pending" | "complete";
  width?: number;
  height?: number;
  duration?: number;
  mimeType?: string;
  container?: string;
};

export function buildCategory(kind: UnsplashMediaKind): MediaCategory {
  const labels = CATEGORY_LABELS_BY_KIND[kind];
  const key: MediaCategoryKey =
    kind === "illustration" ? "illustrations" : "images";
  return { key, en: labels.en, uk: labels.uk };
}

async function fetchPhotoApi(identifier: string): Promise<UnsplashPhoto> {
  if (officialApiBlocked) {
    throw new UnsplashApiError(
      officialApiBlockMessage ??
        "Unsplash API тимчасово вимкнено для цієї пачки.",
      429,
    );
  }

  const accessKey =
    process.env.UNSPLASH_ACCESS_KEY?.trim() || UNSPLASH_ACCESS_KEY;

  const apiResponse = await fetch(
    `https://api.unsplash.com/photos/${identifier}`,
    {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        "Accept-Version": "v1",
      },
    },
  );
  if (!apiResponse.ok) {
    throw new UnsplashApiError(
      `Unsplash API повернув ${apiResponse.status} ${apiResponse.statusText} для ${identifier}.`,
      apiResponse.status,
    );
  }
  return (await apiResponse.json()) as UnsplashPhoto;
}

export async function fetchPhoto(identifier: string): Promise<UnsplashPhoto> {
  try {
    return await fetchPhotoApi(identifier);
  } catch (apiError) {
    if (
      apiError instanceof UnsplashApiError &&
      [401, 403, 429].includes(apiError.status) &&
      !officialApiBlocked
    ) {
      officialApiBlocked = true;
      officialApiBlockMessage = apiError.message;
      console.warn(
        `⚠ Офіційний Unsplash API вимкнено до кінця пачки після помилки: ${apiError.message}`,
      );
    }

    const response = await fetch(
      `https://unsplash.com/napi/photos/${identifier}`,
    );
    if (response.ok) {
      return (await response.json()) as UnsplashPhoto;
    }

    const apiMessage =
      apiError instanceof Error ? apiError.message : String(apiError);
    throw new Error(
      `${apiMessage}; Unsplash NAPI повернув ${response.status} ${response.statusText} для ${identifier}.`,
    );
  }
}

export function getOfficialApiBlockMessage(): string | null {
  return officialApiBlockMessage;
}

export function decideTier(photo: UnsplashPhoto, fallbackTier: Tier): Tier {
  if (photo.premium || photo.plus) {
    return "plus";
  }
  return fallbackTier;
}

export function collectTags(photo: UnsplashPhoto): string[] {
  const buckets = [
    photo.tags?.map((tag) => tag.title ?? "").filter(Boolean) ?? [],
    photo.tags_preview?.map((tag) => tag.title ?? "").filter(Boolean) ?? [],
  ];
  const merged = buckets
    .flat()
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
  return Array.from(new Set(merged));
}

export function dedupeStrings(
  values: string[],
  normalize: (value: string) => string = (value) => value,
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const key = normalize(value);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(value);
  }
  return result;
}

export const MAX_IMAGE_NAME_WORDS = 10;

function normalizeImageName(value: string | null | undefined): string | null {
  const words = value?.trim().replace(/\s+/gu, " ").split(" ").filter(Boolean) ?? [];
  return words.length > 0 ? words.slice(0, MAX_IMAGE_NAME_WORDS).join(" ") : null;
}

export function buildDefaultName(photo: UnsplashPhoto): string {
  const slugSuffix = `-${photo.id}`.toLowerCase();
  const slug = photo.slug?.trim() ?? "";
  const descriptiveSlug = slug.toLowerCase().endsWith(slugSuffix)
    ? slug.slice(0, -slugSuffix.length).replace(/-/g, " ")
    : "";
  const candidates = [
    photo.alt_description,
    descriptiveSlug,
    photo.description,
  ];
  for (const candidate of candidates) {
    const normalized = normalizeImageName(candidate);
    if (normalized) return normalized;
  }
  throw new Error(`Unsplash ${photo.id} не має змістовної англійської назви.`);
}

export async function readExistingMetadata(
  dir: string,
): Promise<MediaMetadata | null> {
  const metaPath = path.join(dir, MEDIA_META_FILE);
  try {
    const raw = await fs.readFile(metaPath, "utf-8");
    return JSON.parse(raw) as MediaMetadata;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export function buildMetadata(
  photo: UnsplashPhoto,
  i18n: MediaI18n,
  category: MediaCategory,
  tier: Tier,
  downloadSource: DownloadSource,
  existingMeta?: MediaMetadata | null,
): MediaMetadata {
  const width = existingMeta?.width ?? photo.width;
  const height = existingMeta?.height ?? photo.height;

  const meta: MediaMetadata = {
    slug: sanitizeSegment(photo.slug || photo.id),
    mediaKey: existingMeta?.mediaKey ?? randomUUID(),
    i18n,
    category,
    ...(category.key === "images"
      ? {
          collectionSlugs: existingMeta?.collectionSlugs?.length
            ? existingMeta.collectionSlugs
            : ["other"],
        }
      : existingMeta?.collectionSlugs
        ? { collectionSlugs: existingMeta.collectionSlugs }
        : {}),
    source: photo.links.html,
    sourceName: "Unsplash",
    authorName: photo.user.name?.trim(),
    authorUrl: photo.user.links?.html,
    description: photo.description ?? undefined,
    licenseName: "Unsplash License",
    licenseUrl: "https://unsplash.com/license",
    tier,
    downloadSource,
    pinned: existingMeta?.pinned === true,
  };
  if (typeof width === "number") {
    meta.width = width;
  }
  if (typeof height === "number") {
    meta.height = height;
  }
  return meta;
}
