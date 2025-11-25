import { promises as fs } from 'node:fs';

import {
  UNSPLASH_ILLUSTRATIONS_LIBRARY_LIST_PATH,
  UNSPLASH_PATTERNS_LIBRARY_LIST_PATH,
  UnsplashMediaKind,
} from '../config/paths';
import { extractPhotoSlugFromUrl, sanitizeSegment } from './utils';

type OverrideSource = {
  filePath: string;
  kind: UnsplashMediaKind;
};

const OVERRIDE_SOURCES: OverrideSource[] = [
  { filePath: UNSPLASH_PATTERNS_LIBRARY_LIST_PATH, kind: 'pattern' },
  { filePath: UNSPLASH_ILLUSTRATIONS_LIBRARY_LIST_PATH, kind: 'illustration' },
];

let cachedOverrides: Map<string, UnsplashMediaKind> | null = null;

async function readFileSafe(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return '';
    }
    throw error;
  }
}

function parseSlug(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }
  try {
    return sanitizeSegment(extractPhotoSlugFromUrl(trimmed));
  } catch {
    if (!trimmed.includes('://')) {
      return sanitizeSegment(trimmed);
    }
    return null;
  }
}

async function loadOverrides(): Promise<Map<string, UnsplashMediaKind>> {
  if (cachedOverrides) {
    return cachedOverrides;
  }

  const overrides = new Map<string, UnsplashMediaKind>();
  for (const source of OVERRIDE_SOURCES) {
    const content = await readFileSafe(source.filePath);
    if (!content) {
      continue;
    }
    const lines = content.split(/\r?\n/);
    for (const rawLine of lines) {
      const slug = parseSlug(rawLine);
      if (!slug || overrides.has(slug)) {
        continue;
      }
      overrides.set(slug, source.kind);
    }
  }

  cachedOverrides = overrides;
  return overrides;
}

export function resetLibraryOverrideCache(): void {
  cachedOverrides = null;
}

export async function resolveForcedLibraryKind(slug: string): Promise<UnsplashMediaKind | null> {
  const normalized = sanitizeSegment(slug);
  const overrides = await loadOverrides();
  return overrides.get(normalized) ?? null;
}
