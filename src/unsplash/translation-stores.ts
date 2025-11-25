import { promises as fs } from 'node:fs';

import {
  IMAGE_MISSING_NAME_TRANSLATIONS_DIR,
  IMAGE_MISSING_TAG_TRANSLATIONS_DIR,
  IMAGE_NAME_TRANSLATIONS_PATH,
  IMAGE_TAG_BLACKLIST_PATH,
  TAG_TRANSLATIONS_PATH,
} from '../config/paths';
import { TranslationStore, normalizeStringValue } from '../iconify/translation-manager';

function isNotFound(error: unknown): error is { code?: string } {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'ENOENT');
}

export async function createImageTagStore(): Promise<TranslationStore<string>> {
  return TranslationStore.create<string>({
    masterPath: TAG_TRANSLATIONS_PATH,
    missingDir: IMAGE_MISSING_TAG_TRANSLATIONS_DIR,
    chunkSize: 1000,
    normalizeValue: normalizeStringValue,
  });
}

export async function createImageNameStore(): Promise<TranslationStore<string>> {
  return TranslationStore.create<string>({
    masterPath: IMAGE_NAME_TRANSLATIONS_PATH,
    missingDir: IMAGE_MISSING_NAME_TRANSLATIONS_DIR,
    chunkSize: 1000,
    normalizeValue: normalizeStringValue,
  });
}

function normalizeBlacklistToken(token: string): string | null {
  if (typeof token !== 'string') {
    return null;
  }
  const normalized = token.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function filterBlacklistedTags(rawTags: string[], blacklist: Set<string>): string[] {
  if (blacklist.size === 0) {
    return rawTags;
  }
  return rawTags.filter(tag => {
    const normalized = normalizeBlacklistToken(tag);
    return !normalized || !blacklist.has(normalized);
  });
}

export async function readImageTagBlacklist(): Promise<Set<string>> {
  try {
    const raw = await fs.readFile(IMAGE_TAG_BLACKLIST_PATH, 'utf-8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) {
      throw new Error('tag-blacklist.json має містити масив рядків.');
    }
    const entries = data
      .map(entry => (typeof entry === 'string' ? entry : ''))
      .map(entry => normalizeBlacklistToken(entry))
      .filter((entry): entry is string => Boolean(entry));
    return new Set(entries);
  } catch (error) {
    if (isNotFound(error)) {
      return new Set();
    }
    throw error;
  }
}

export function translateImageTags(rawTags: string[], store: TranslationStore<string>): string[] {
  return rawTags.map(tag => store.resolve(tag, tag));
}

export function buildOriginalImageKeys(rawTags: string[]): string[] {
  return [...rawTags];
}
