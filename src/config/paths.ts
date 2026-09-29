import path from "node:path";

const projectRoot = path.resolve(__dirname, "..", "..");

export const LIBRARY_ROOT = path.join(projectRoot, "library");
export const MEDIA_COLLECTION_REGISTRY_PATH = path.join(
  LIBRARY_ROOT,
  "collections.json",
);
export const RELATED_IMAGE_GROUPS_PATH = path.join(
  LIBRARY_ROOT,
  "related-image-groups.json",
);
export const UNSPLASH_AUTHOR_BLACKLIST_PATH = path.join(
  LIBRARY_ROOT,
  "unsplash-author-blacklist.json",
);
export const PEXELS_AUTHOR_BLACKLIST_PATH = path.join(
  LIBRARY_ROOT,
  "pexels-author-blacklist.json",
);
export const ICONIFY_LIBRARY_ROOT = path.join(LIBRARY_ROOT, "iconify");
export const CUSTOM_IMAGES_INTAKE_ROOT = path.join(
  projectRoot,
  "intake",
  "custom-images",
);
export const UNSPLASH_INTAKE_ROOT = path.join(
  projectRoot,
  "intake",
  "unsplash",
);
export const LUMMI_INTAKE_ROOT = path.join(projectRoot, "intake", "lummi");
export const CUSTOM_IMAGES_ROOT = path.join(LIBRARY_ROOT, "custom-images");
export const UNSPLASH_LIBRARY_ROOT = path.join(LIBRARY_ROOT, "unsplash");
export const PEXELS_LIBRARY_ROOT = path.join(LIBRARY_ROOT, "pexels");
export const LUMMI_LIBRARY_ROOT = path.join(LIBRARY_ROOT, "lummi");
export const CTRLV_LIBRARY_ROOT = path.join(LIBRARY_ROOT, "ctrlv");
export const UNDRAW_LIBRARY_ROOT = path.join(LIBRARY_ROOT, "undraw");
export const CTRLV_ILLUSTRATIONS_ROOT = path.join(
  CTRLV_LIBRARY_ROOT,
  "illustrations",
);
export const UNDRAW_ILLUSTRATIONS_ROOT = path.join(
  UNDRAW_LIBRARY_ROOT,
  "illustrations",
);
export const PEXELS_IMAGES_ROOT = path.join(PEXELS_LIBRARY_ROOT, "images");
export const LUMMI_IMAGES_ROOT = path.join(LUMMI_LIBRARY_ROOT, "images");
export const PEXELS_VIDEOS_ROOT = path.join(PEXELS_LIBRARY_ROOT, "videos");
export const UNSPLASH_IMAGES_ROOT = path.join(UNSPLASH_LIBRARY_ROOT, "images");
export const UNSPLASH_ILLUSTRATIONS_ROOT = path.join(
  UNSPLASH_LIBRARY_ROOT,
  "Illustration",
);
export const UNSPLASH_LIBRARY_LIST_PATH = path.join(
  LIBRARY_ROOT,
  "unsplash-library.txt",
);
export const UNSPLASH_ILLUSTRATIONS_LIBRARY_LIST_PATH = path.join(
  LIBRARY_ROOT,
  "unsplash-illustrations-library.txt",
);
export const UNSPLASH_MISSING_DOWNLOADS_PATH = path.join(
  LIBRARY_ROOT,
  "unsplash-missing-downloads.txt",
);

export const TRANSLATIONS_ROOT = path.join(projectRoot, "translations");
const ICONS_TRANSLATIONS_ROOT = path.join(TRANSLATIONS_ROOT, "icons");
export const ICON_TRANSLATIONS_ROOT = path.join(
  ICONS_TRANSLATIONS_ROOT,
  "icon-translations",
);
export const MISSING_SYNONYMS_ROOT = path.join(
  ICONS_TRANSLATIONS_ROOT,
  "missing-synonyms",
);
export const TAG_TRANSLATIONS_PATH = path.join(
  TRANSLATIONS_ROOT,
  "tag-translations.json",
);

export const MISSING_NAME_TRANSLATIONS_DIR = path.join(
  ICONS_TRANSLATIONS_ROOT,
  "missing-translations",
  "names",
);
export const MISSING_KEY_TRANSLATIONS_DIR = path.join(
  ICONS_TRANSLATIONS_ROOT,
  "missing-translations",
  "keys",
);

export const IMAGES_TRANSLATIONS_ROOT = path.join(TRANSLATIONS_ROOT, "images");
export const IMAGE_MISSING_TAG_TRANSLATIONS_DIR = path.join(
  IMAGES_TRANSLATIONS_ROOT,
  "missing-tag-translations",
);
export const IMAGE_TAG_BLACKLIST_PATH = path.join(
  IMAGES_TRANSLATIONS_ROOT,
  "tag-blacklist.json",
);
export const IMAGE_TAG_KEY_BLACKLIST_PATH = path.join(
  IMAGES_TRANSLATIONS_ROOT,
  "tag-key-blacklist.json",
);
export const IMAGE_NAME_TRANSLATIONS_PATH = path.join(
  IMAGES_TRANSLATIONS_ROOT,
  "name-translations.json",
);
export const IMAGE_MISSING_NAME_TRANSLATIONS_DIR = path.join(
  IMAGES_TRANSLATIONS_ROOT,
  "missing-name-translations",
);

export function getIconifyCollectionDir(slug: string): string {
  return path.join(ICONIFY_LIBRARY_ROOT, slug);
}

export type UnsplashMediaKind = "image" | "illustration";

export function getUnsplashMediaDir(
  identifier: string,
  kind: UnsplashMediaKind = "image",
): string {
  const base =
    kind === "illustration"
      ? UNSPLASH_ILLUSTRATIONS_ROOT
      : UNSPLASH_IMAGES_ROOT;
  return path.join(base, identifier);
}

export function getPexelsMediaDir(identifier: string): string {
  return path.join(PEXELS_IMAGES_ROOT, identifier);
}

export function getLummiMediaDir(identifier: string): string {
  return path.join(LUMMI_IMAGES_ROOT, identifier);
}

export function getPexelsVideoDir(identifier: string): string {
  return path.join(PEXELS_VIDEOS_ROOT, identifier);
}

export function getCtrlvIllustrationDir(identifier: string): string {
  return path.join(CTRLV_ILLUSTRATIONS_ROOT, identifier);
}

export function getUndrawIllustrationDir(identifier: string): string {
  return path.join(UNDRAW_ILLUSTRATIONS_ROOT, identifier);
}
