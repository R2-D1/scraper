import { promises as fs } from 'node:fs';
import path from 'node:path';

import {
  IMAGE_MISSING_NAME_TRANSLATIONS_DIR,
  IMAGE_MISSING_TAG_TRANSLATIONS_DIR,
  IMAGE_NAME_TRANSLATIONS_PATH,
  IMAGE_TAG_TRANSLATIONS_PATH,
} from '../config/paths';
import { normalizeStringValue } from '../iconify/translation-manager';

type Dictionary = Record<string, string>;
type Normalizer<T> = (value: unknown) => T | null;

function normalizeToken(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function readJsonFile(filePath: string): Promise<Dictionary> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as Dictionary;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

async function writeSortedJson(filePath: string, data: Dictionary): Promise<void> {
  const sortedEntries = Object.entries(data).sort((a, b) => a[0].localeCompare(b[0], 'en'));
  await fs.writeFile(filePath, `${JSON.stringify(Object.fromEntries(sortedEntries), null, 2)}\n`, 'utf-8');
}

async function readShardedRecords<T>(dir: string, normalizeValue: Normalizer<T>): Promise<Record<string, T>> {
  const result: Record<string, T> = {};
  let dirEntries: Array<{ name: string; isFile(): boolean }>;

  try {
    dirEntries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return result;
    }
    throw error;
  }

  const files = dirEntries
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b, 'en'));

  for (const file of files) {
    const filePath = path.join(dir, file);
    const raw = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(raw) as Record<string, unknown>;
    for (const [rawToken, rawValue] of Object.entries(data)) {
      const token = normalizeToken(rawToken);
      if (!token) {
        continue;
      }
      const normalized = normalizeValue(rawValue);
      if (normalized === null) {
        continue;
      }
      result[token] = normalized;
    }
  }

  return result;
}

function mergeStringEntries(target: Dictionary, additions: Dictionary): number {
  let applied = 0;
  for (const [token, value] of Object.entries(additions)) {
    if (target[token] === value) {
      continue;
    }
    target[token] = value;
    applied += 1;
  }
  return applied;
}

async function resetMissingDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'part-0001.json'), '{}\n', 'utf-8');
}

async function promote(): Promise<void> {
  const [nameAdditions, tagAdditions] = await Promise.all([
    readShardedRecords(IMAGE_MISSING_NAME_TRANSLATIONS_DIR, normalizeStringValue),
    readShardedRecords(IMAGE_MISSING_TAG_TRANSLATIONS_DIR, normalizeStringValue),
  ]);

  const [nameMaster, tagMaster] = await Promise.all([
    readJsonFile(IMAGE_NAME_TRANSLATIONS_PATH),
    readJsonFile(IMAGE_TAG_TRANSLATIONS_PATH),
  ]);

  const nameUpdates = mergeStringEntries(nameMaster, nameAdditions);
  const tagUpdates = mergeStringEntries(tagMaster, tagAdditions);

  await Promise.all([
    nameUpdates > 0 ? writeSortedJson(IMAGE_NAME_TRANSLATIONS_PATH, nameMaster) : Promise.resolve(),
    tagUpdates > 0 ? writeSortedJson(IMAGE_TAG_TRANSLATIONS_PATH, tagMaster) : Promise.resolve(),
  ]);

  await Promise.all([resetMissingDir(IMAGE_MISSING_NAME_TRANSLATIONS_DIR), resetMissingDir(IMAGE_MISSING_TAG_TRANSLATIONS_DIR)]);

  console.log(
    [
      `✅ Додано/оновлено ${nameUpdates} записів у name-translations.json (images)`,
      `✅ Додано/оновлено ${tagUpdates} записів у tag-translations.json (images)`,
    ].join('\n')
  );
}

promote().catch(error => {
  console.error('❌ Не вдалося застосувати переклади з missing для зображень:', error);
  process.exitCode = 1;
});
