import { promises as fs } from "node:fs";
import path from "node:path";

import {
  CTRLV_ILLUSTRATIONS_ROOT,
  UNDRAW_ILLUSTRATIONS_ROOT,
  CUSTOM_IMAGES_ROOT,
  UNSPLASH_ILLUSTRATIONS_ROOT,
  UNSPLASH_IMAGES_ROOT,
  UNSPLASH_LIBRARY_ROOT,
  PEXELS_IMAGES_ROOT,
  LUMMI_IMAGES_ROOT,
  PEXELS_VIDEOS_ROOT,
  UnsplashMediaKind,
  getUnsplashMediaDir,
  getPexelsMediaDir,
  getLummiMediaDir,
  getPexelsVideoDir,
  getCtrlvIllustrationDir,
  getUndrawIllustrationDir,
} from "../config/paths";

export type LibraryEntryKind = UnsplashMediaKind | "video" | "legacy";

export const MEDIA_META_FILE = "media-meta.json";

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listDirectories(root: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function findMediaDir(
  slug: string,
): Promise<{ dir: string; kind: LibraryEntryKind } | null> {
  const candidates: Array<{ dir: string; kind: LibraryEntryKind }> = [
    { dir: getUnsplashMediaDir(slug, "image"), kind: "image" },
    { dir: getUnsplashMediaDir(slug, "illustration"), kind: "illustration" },
    { dir: path.join(UNSPLASH_LIBRARY_ROOT, slug), kind: "legacy" },
    { dir: getPexelsMediaDir(slug), kind: "image" },
    { dir: getLummiMediaDir(slug), kind: "image" },
    { dir: getPexelsVideoDir(slug), kind: "video" },
    { dir: getCtrlvIllustrationDir(slug), kind: "illustration" },
    { dir: getUndrawIllustrationDir(slug), kind: "illustration" },
    { dir: path.join(CUSTOM_IMAGES_ROOT, "images", slug), kind: "image" },
    { dir: path.join(CUSTOM_IMAGES_ROOT, "illustrations", slug), kind: "illustration" },
  ];

  for (const candidate of candidates) {
    if (await pathExists(path.join(candidate.dir, MEDIA_META_FILE))) {
      return candidate;
    }
  }

  for (const candidate of candidates) {
    if (await pathExists(candidate.dir)) {
      return candidate;
    }
  }

  return null;
}

export async function listLibraryEntries(): Promise<
  Array<{ slug: string; dir: string; kind: LibraryEntryKind }>
> {
  const entries: Array<{ slug: string; dir: string; kind: LibraryEntryKind }> =
    [];
  const categoryRoots: Array<{ root: string; kind: UnsplashMediaKind }> = [
    { root: UNSPLASH_IMAGES_ROOT, kind: "image" },
    { root: UNSPLASH_ILLUSTRATIONS_ROOT, kind: "illustration" },
  ];

  for (const { root, kind } of categoryRoots) {
    const slugs = await listDirectories(root);
    for (const slug of slugs) {
      entries.push({ slug, dir: path.join(root, slug), kind });
    }
  }

  const categoryNames = new Set(
    categoryRoots.map((entry) => path.basename(entry.root)),
  );
  const legacySlugs = (await listDirectories(UNSPLASH_LIBRARY_ROOT)).filter(
    (slug) => !categoryNames.has(slug),
  );
  for (const slug of legacySlugs) {
    entries.push({
      slug,
      dir: path.join(UNSPLASH_LIBRARY_ROOT, slug),
      kind: "legacy",
    });
  }

  return entries;
}

export async function listPexelsLibraryEntries(): Promise<
  Array<{ slug: string; dir: string; kind: "image" | "video" }>
> {
  const images = (await listDirectories(PEXELS_IMAGES_ROOT)).map((slug) => ({
    slug,
    dir: path.join(PEXELS_IMAGES_ROOT, slug),
    kind: "image" as const,
  }));
  const videos = (await listDirectories(PEXELS_VIDEOS_ROOT)).map((slug) => ({
    slug,
    dir: path.join(PEXELS_VIDEOS_ROOT, slug),
    kind: "video" as const,
  }));
  return [...images, ...videos];
}

export async function listLummiLibraryEntries(): Promise<
  Array<{ slug: string; dir: string; kind: "image" }>
> {
  return (await listDirectories(LUMMI_IMAGES_ROOT)).map((slug) => ({
    slug,
    dir: path.join(LUMMI_IMAGES_ROOT, slug),
    kind: "image" as const,
  }));
}

export async function listCtrlvLibraryEntries(): Promise<
  Array<{ slug: string; dir: string; kind: "illustration" }>
> {
  return (await listDirectories(CTRLV_ILLUSTRATIONS_ROOT)).map((slug) => ({
    slug,
    dir: path.join(CTRLV_ILLUSTRATIONS_ROOT, slug),
    kind: "illustration" as const,
  }));
}

export async function listUndrawLibraryEntries(): Promise<
  Array<{ slug: string; dir: string; kind: "illustration" }>
> {
  return (await listDirectories(UNDRAW_ILLUSTRATIONS_ROOT)).map((slug) => ({
    slug,
    dir: path.join(UNDRAW_ILLUSTRATIONS_ROOT, slug),
    kind: "illustration" as const,
  }));
}

export async function listCustomImageLibraryEntries(): Promise<
  Array<{ slug: string; dir: string; kind: "image" | "illustration" }>
> {
  const images = (await listDirectories(path.join(CUSTOM_IMAGES_ROOT, "images"))).map((slug) => ({
    slug,
    dir: path.join(CUSTOM_IMAGES_ROOT, "images", slug),
    kind: "image" as const,
  }));
  const illustrations = (await listDirectories(path.join(CUSTOM_IMAGES_ROOT, "illustrations"))).map((slug) => ({
    slug,
    dir: path.join(CUSTOM_IMAGES_ROOT, "illustrations", slug),
    kind: "illustration" as const,
  }));
  return [...images, ...illustrations];
}
