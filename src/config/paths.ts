import path from 'node:path';

const projectRoot = path.resolve(__dirname, '..', '..');

export const LIBRARY_ROOT = path.join(projectRoot, 'library');
export const ICONIFY_LIBRARY_ROOT = path.join(LIBRARY_ROOT, 'iconify');
export const UNSPLASH_LIBRARY_ROOT = path.join(LIBRARY_ROOT, 'unsplash');
export const UNSPLASH_IMAGES_ROOT = path.join(UNSPLASH_LIBRARY_ROOT, 'images');
export const UNSPLASH_ILLUSTRATIONS_ROOT = path.join(UNSPLASH_LIBRARY_ROOT, 'Illustration');
export const UNSPLASH_PATTERNS_ROOT = path.join(UNSPLASH_LIBRARY_ROOT, 'patterns');
export const UNSPLASH_LIBRARY_LIST_PATH = path.join(LIBRARY_ROOT, 'unsplash-library.txt');
export const UNSPLASH_ILLUSTRATIONS_LIBRARY_LIST_PATH = path.join(
  LIBRARY_ROOT,
  'unsplash-illustrations-library.txt'
);
export const UNSPLASH_PATTERNS_LIBRARY_LIST_PATH = path.join(
  LIBRARY_ROOT,
  'unsplash-patterns-library.txt'
);
export const UNSPLASH_MISSING_DOWNLOADS_PATH = path.join(LIBRARY_ROOT, 'unsplash-missing-downloads.txt');

export const TRANSLATIONS_ROOT = path.join(projectRoot, 'translations');
const ICONS_TRANSLATIONS_ROOT = path.join(TRANSLATIONS_ROOT, 'icons');
export const ICON_TRANSLATIONS_ROOT = path.join(ICONS_TRANSLATIONS_ROOT, 'icon-translations');
export const MISSING_SYNONYMS_ROOT = path.join(ICONS_TRANSLATIONS_ROOT, 'missing-synonyms');
export const TAG_TRANSLATIONS_PATH = path.join(TRANSLATIONS_ROOT, 'tag-translations.json');

export const MISSING_NAME_TRANSLATIONS_DIR = path.join(ICONS_TRANSLATIONS_ROOT, 'missing-translations', 'names');
export const MISSING_KEY_TRANSLATIONS_DIR = path.join(ICONS_TRANSLATIONS_ROOT, 'missing-translations', 'keys');

export const IMAGES_TRANSLATIONS_ROOT = path.join(TRANSLATIONS_ROOT, 'images');
export const IMAGE_MISSING_TAG_TRANSLATIONS_DIR = path.join(IMAGES_TRANSLATIONS_ROOT, 'missing-tag-translations');
export const IMAGE_TAG_BLACKLIST_PATH = path.join(IMAGES_TRANSLATIONS_ROOT, 'tag-blacklist.json');
export const IMAGE_NAME_TRANSLATIONS_PATH = path.join(IMAGES_TRANSLATIONS_ROOT, 'name-translations.json');
export const IMAGE_MISSING_NAME_TRANSLATIONS_DIR = path.join(IMAGES_TRANSLATIONS_ROOT, 'missing-name-translations');

export function getIconifyCollectionDir(slug: string): string {
  return path.join(ICONIFY_LIBRARY_ROOT, slug);
}

export type UnsplashMediaKind = 'image' | 'illustration' | 'pattern';

export function getUnsplashMediaDir(identifier: string, kind: UnsplashMediaKind = 'image'): string {
  const base =
    kind === 'illustration'
      ? UNSPLASH_ILLUSTRATIONS_ROOT
      : kind === 'pattern'
        ? UNSPLASH_PATTERNS_ROOT
        : UNSPLASH_IMAGES_ROOT;
  return path.join(base, identifier);
}
