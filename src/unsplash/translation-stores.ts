import { promises as fs } from 'node:fs';
import type { Dirent } from 'node:fs';
import path from 'node:path';

import {
  IMAGE_MISSING_NAME_TRANSLATIONS_DIR,
  IMAGE_MISSING_TAG_TRANSLATIONS_DIR,
  IMAGE_NAME_TRANSLATIONS_PATH,
  IMAGE_TAG_BLACKLIST_PATH,
  IMAGE_TAG_TRANSLATIONS_PATH,
} from '../config/paths';
import { TranslationStore, normalizeStringValue } from '../iconify/translation-manager';

function isNotFound(error: unknown): error is { code?: string } {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'ENOENT');
}

export async function createImageTagStore(): Promise<TranslationStore<string>> {
  return TranslationStore.create<string>({
    masterPath: IMAGE_TAG_TRANSLATIONS_PATH,
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

type TagCleanupResult = {
  masterRemoved: number;
  missingRemoved: number;
};

export async function cleanupImageTagTranslations(blacklist: Set<string>): Promise<TagCleanupResult> {
  if (blacklist.size === 0) {
    return { masterRemoved: 0, missingRemoved: 0 };
  }

  const [masterRemoved, missingRemoved] = await Promise.all([
    removeBlacklistedMasterEntries(blacklist),
    removeBlacklistedMissingEntries(blacklist),
  ]);

  return { masterRemoved, missingRemoved };
}

async function removeBlacklistedMasterEntries(blacklist: Set<string>): Promise<number> {
  let raw: string;
  try {
    raw = await fs.readFile(IMAGE_TAG_TRANSLATIONS_PATH, 'utf-8');
  } catch (error) {
    if (isNotFound(error)) {
      return 0;
    }
    throw error;
  }

  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('tag-translations.json має містити об\'єкт ключ-значення.');
  }
  const data = parsed as Record<string, unknown>;
  const entries = Object.entries(data);
  if (entries.length === 0) {
    return 0;
  }

  let removed = 0;
  const preserved: Array<[string, unknown]> = [];
  for (const entry of entries) {
    const [token, value] = entry;
    const normalized = normalizeBlacklistToken(token);
    if (normalized && blacklist.has(normalized)) {
      removed += 1;
      continue;
    }
    preserved.push([token, value]);
  }

  if (removed === 0) {
    return 0;
  }

  const next: Record<string, unknown> = {};
  for (const [token, value] of preserved) {
    next[token] = value;
  }
  await fs.writeFile(IMAGE_TAG_TRANSLATIONS_PATH, `${JSON.stringify(next, null, 2)}\n`, 'utf-8');
  return removed;
}

async function removeBlacklistedMissingEntries(blacklist: Set<string>): Promise<number> {
  let entries: Dirent[];
  try {
    entries = await fs.readdir(IMAGE_MISSING_TAG_TRANSLATIONS_DIR, { withFileTypes: true });
  } catch (error) {
    if (isNotFound(error)) {
      return 0;
    }
    throw error;
  }

  let totalRemoved = 0;
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) {
      continue;
    }
    const filePath = path.join(IMAGE_MISSING_TAG_TRANSLATIONS_DIR, entry.name);
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`Файл ${entry.name} має містити об\'єкт ключ-значення.`);
    }
    const data = parsed as Record<string, unknown>;
    let removed = 0;
    for (const token of Object.keys(data)) {
      const normalized = normalizeBlacklistToken(token);
      if (normalized && blacklist.has(normalized)) {
        delete data[token];
        removed += 1;
      }
    }
    if (removed === 0) {
      continue;
    }
    totalRemoved += removed;
    await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
  }

  return totalRemoved;
}
