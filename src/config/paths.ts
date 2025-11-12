import path from 'node:path';

const projectRoot = path.resolve(__dirname, '..', '..');

export const LIBRARY_ROOT = path.join(projectRoot, 'library');
export const ICONIFY_LIBRARY_ROOT = path.join(LIBRARY_ROOT, 'iconify');
export const UNSPLASH_LIBRARY_ROOT = path.join(LIBRARY_ROOT, 'unsplash');

export const TRANSLATIONS_ROOT = path.join(projectRoot, 'translations');
export const ICON_TRANSLATIONS_ROOT = path.join(TRANSLATIONS_ROOT, 'icon-translations');
export const MISSING_TRANSLATIONS_ROOT = path.join(TRANSLATIONS_ROOT, 'missing-translations');
export const MISSING_SYNONYMS_ROOT = path.join(TRANSLATIONS_ROOT, 'missing-synonyms');

export const MISSING_NAME_TRANSLATIONS_DIR = path.join(MISSING_TRANSLATIONS_ROOT, 'names');
export const MISSING_KEY_TRANSLATIONS_DIR = path.join(MISSING_TRANSLATIONS_ROOT, 'keys');

export function getIconifyCollectionDir(slug: string): string {
  return path.join(ICONIFY_LIBRARY_ROOT, slug);
}

export function getUnsplashMediaDir(identifier: string): string {
  return path.join(UNSPLASH_LIBRARY_ROOT, identifier);
}
