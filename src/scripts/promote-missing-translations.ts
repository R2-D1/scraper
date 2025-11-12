import { promises as fs } from 'node:fs';
import path from 'node:path';

import {
  ICON_TRANSLATIONS_ROOT,
  MISSING_KEY_TRANSLATIONS_DIR,
  MISSING_NAME_TRANSLATIONS_DIR,
  MISSING_SYNONYMS_ROOT,
} from '../config/paths';
import { mergeUniqueStringArrays, normalizeStringArrayValue, normalizeStringValue } from '../iconify/translation-manager';

const NAME_MASTER_PATH = path.join(ICON_TRANSLATIONS_ROOT, 'name-translations.json');
const KEY_MASTER_PATH = path.join(ICON_TRANSLATIONS_ROOT, 'key-translations.json');
const SYNONYM_MASTER_PATH = path.join(ICON_TRANSLATIONS_ROOT, 'synonyms.json');

type Dictionary = Record<string, string>;
type SynonymDictionary = Record<string, string[]>;

type Normalizer<T> = (value: unknown) => T | null;

function normalizeToken(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function readJsonFile<T extends Record<string, unknown>>(filePath: string): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {} as T;
    }
    throw error;
  }
}

async function writeSortedJson<T>(filePath: string, data: Record<string, T>): Promise<void> {
  const sortedEntries = Object.entries(data).sort((a, b) => a[0].localeCompare(b[0], 'en'));
  const sortedObject = Object.fromEntries(sortedEntries);
  await fs.writeFile(filePath, `${JSON.stringify(sortedObject, null, 2)}\n`, 'utf-8');
}

async function readShardedRecords<T>(dir: string, normalizeValue: Normalizer<T>): Promise<Record<string, T>> {
  const result: Record<string, T> = {};
  let entries: Array<{ name: string; isFile(): boolean }>;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return result;
    }
    throw error;
  }

  const files = entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b, 'en'));

  for (const name of files) {
    const filePath = path.join(dir, name);
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

function mergeSynonymEntries(target: SynonymDictionary, additions: SynonymDictionary): number {
  let appended = 0;
  for (const [token, values] of Object.entries(additions)) {
    if (values.length === 0) {
      continue;
    }
    const current = target[token];
    if (!current) {
      target[token] = [...values];
      appended += values.length;
      continue;
    }
    const merged = mergeUniqueStringArrays(current, values);
    if (merged.length !== current.length) {
      appended += merged.length - current.length;
      target[token] = merged;
    }
  }
  return appended;
}

async function resetMissingDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
  const seedFile = path.join(dir, 'part-0001.json');
  await fs.writeFile(seedFile, '{}\n', 'utf-8');
}

async function promote(): Promise<void> {
  const [nameAdditions, keyAdditions, synonymAdditions] = await Promise.all([
    readShardedRecords(MISSING_NAME_TRANSLATIONS_DIR, normalizeStringValue),
    readShardedRecords(MISSING_KEY_TRANSLATIONS_DIR, normalizeStringValue),
    readShardedRecords(MISSING_SYNONYMS_ROOT, normalizeStringArrayValue),
  ]);

  const [nameMaster, keyMaster, synonymMaster] = await Promise.all([
    readJsonFile<Dictionary>(NAME_MASTER_PATH),
    readJsonFile<Dictionary>(KEY_MASTER_PATH),
    readJsonFile<SynonymDictionary>(SYNONYM_MASTER_PATH),
  ]);

  const nameUpdates = mergeStringEntries(nameMaster, nameAdditions);
  const keyUpdates = mergeStringEntries(keyMaster, keyAdditions);
  const synonymUpdates = mergeSynonymEntries(synonymMaster, synonymAdditions);

  await Promise.all([
    nameUpdates > 0 ? writeSortedJson(NAME_MASTER_PATH, nameMaster) : Promise.resolve(),
    keyUpdates > 0 ? writeSortedJson(KEY_MASTER_PATH, keyMaster) : Promise.resolve(),
    synonymUpdates > 0 ? writeSortedJson(SYNONYM_MASTER_PATH, synonymMaster) : Promise.resolve(),
  ]);

  await Promise.all([
    resetMissingDir(MISSING_NAME_TRANSLATIONS_DIR),
    resetMissingDir(MISSING_KEY_TRANSLATIONS_DIR),
    resetMissingDir(MISSING_SYNONYMS_ROOT),
  ]);

  console.log(
    [
      `✅ Додано/оновлено ${nameUpdates} записів у name-translations.json`,
      `✅ Додано/оновлено ${keyUpdates} записів у key-translations.json`,
      `✅ Додано ${synonymUpdates} синонімів у synonyms.json`,
    ].join('\n')
  );
}

promote().catch(error => {
  console.error('❌ Не вдалося застосувати переклади:', error);
  process.exitCode = 1;
});
