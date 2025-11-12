import { promises as fs } from 'node:fs';
import path from 'node:path';

import { lookupCollection } from '@iconify/json';
import { IconSet } from '@iconify/tools';

import { stripIconStyleSuffix } from '../icon-style-suffixes';
import { TranslationStore } from './translation-manager';

export type IconCollectionInfo = {
  name?: string;
  version?: string;
  author?: {
    name?: string;
    url?: string;
  };
  license?: {
    title?: string;
    spdx?: string;
    url?: string;
  };
};

type IconEntry = {
  tags?: string[];
  categories?: string[];
};

type IconAlias = {
  parent: string;
};

export type RawCollection = {
  icons: Record<string, IconEntry>;
  aliases?: Record<string, IconAlias>;
  categories?: Record<string, string[]>;
  tags?: Record<string, string[]>;
  info?: IconCollectionInfo | null;
};

export type IconTokenBag = {
  keywordTokens: Set<string>;
  nameTokens: string[];
};

export type LoadedCollection = {
  iconSet: IconSet;
  info: IconCollectionInfo | null;
  raw: RawCollection;
};

function tokenizeLabel(label: string): string[] {
  return label
    .split(/[^a-zA-Z0-9]+/g)
    .map(part => part.toLowerCase())
    .filter(part => part.length > 0);
}

function toDisplayCase(value: string): string {
  if (!value) {
    return value;
  }
  const firstChar = value.charAt(0);
  return firstChar.toUpperCase() + value.slice(1);
}

function slugToPhrase(value: string): string {
  const phrase = value.replace(/[-_]+/g, ' ').trim();
  return phrase.length > 0 ? phrase : value;
}

function sortRecord<T>(record: Record<string, T>): Record<string, T> {
  return Object.keys(record)
    .sort((a, b) => a.localeCompare(b, 'en'))
    .reduce<Record<string, T>>((acc, key) => {
      acc[key] = record[key];
      return acc;
    }, {});
}

export async function loadCollection(collectionName: string): Promise<LoadedCollection> {
  try {
    const collectionJson = (await lookupCollection(collectionName)) as unknown as RawCollection;
    return {
      iconSet: new IconSet(collectionJson as never),
      info: collectionJson.info ?? null,
      raw: collectionJson,
    };
  } catch (error) {
    const message =
      error instanceof Error && 'code' in error && (error as { code: string }).code === 'ENOENT'
        ? `Колекція "${collectionName}" не знайдена. Перевірте назву або встановіть потрібний пакет.`
        : `Не вдалося завантажити колекцію "${collectionName}": ${error instanceof Error ? error.message : String(error)}.`;
    throw new Error(message);
  }
}

export function collectIconTokens(raw: RawCollection, iconNames: string[]): Map<string, IconTokenBag> {
  const iconNameSet = new Set(iconNames);

  const metadataMap = new Map<string, IconTokenBag>();

  const ensureMeta = (name: string): IconTokenBag | null => {
    if (!iconNameSet.has(name)) {
      return null;
    }
    let entry = metadataMap.get(name);
    if (!entry) {
      entry = {
        keywordTokens: new Set<string>(),
        nameTokens: tokenizeLabel(name),
      };
      metadataMap.set(name, entry);
    }
    return entry;
  };

  const addLabelTokens = (name: string, label: string | null | undefined) => {
    if (!label) {
      return;
    }
    const tokens = tokenizeLabel(label);
    if (tokens.length === 0) {
      return;
    }
    const entry = ensureMeta(name);
    if (!entry) {
      return;
    }
    tokens.forEach(token => entry.keywordTokens.add(token));
  };

  const addTokensFromCollection = (name: string, labels?: string[]) => {
    if (!Array.isArray(labels) || labels.length === 0) {
      return;
    }
    labels.forEach(label => addLabelTokens(name, label));
  };

  for (const name of iconNames) {
    const entry = ensureMeta(name);
    if (!entry) {
      continue;
    }
    const slugTokens = tokenizeLabel(name);
    entry.nameTokens = slugTokens;
    slugTokens.forEach(token => entry.keywordTokens.add(token));
    const icon = raw.icons?.[name];
    if (!icon) {
      continue;
    }
    addTokensFromCollection(name, icon.tags);
    addTokensFromCollection(name, icon.categories);
  }

  if (raw.tags) {
    for (const [tag, names] of Object.entries(raw.tags)) {
      if (!Array.isArray(names)) {
        continue;
      }
      for (const name of names) {
        addLabelTokens(name, tag);
      }
    }
  }

  if (raw.categories) {
    for (const [category, names] of Object.entries(raw.categories)) {
      if (!Array.isArray(names)) {
        continue;
      }
      for (const name of names) {
        addLabelTokens(name, category);
      }
    }
  }

  if (raw.aliases) {
    for (const [aliasName, alias] of Object.entries(raw.aliases)) {
      const parentName = alias?.parent;
      if (!parentName || !iconNameSet.has(aliasName)) {
        continue;
      }
      const parentTokens = metadataMap.get(parentName);
      if (!parentTokens) {
        continue;
      }
      const aliasTokens = ensureMeta(aliasName);
      if (!aliasTokens) {
        continue;
      }
      parentTokens.keywordTokens.forEach(token => aliasTokens.keywordTokens.add(token));
    }
  }

  return metadataMap;
}

export function collectNamePhrases(iconNames: string[]): Map<string, string> {
  const phrases = new Map<string, string>();
  for (const iconName of iconNames) {
    const base = stripIconStyleSuffix(iconName);
    if (!phrases.has(base)) {
      const phrase = slugToPhrase(base);
      phrases.set(base, phrase);
    }
  }
  return phrases;
}

export function buildIconNames(
  phrases: Map<string, string>,
  translations: TranslationStore<string>
): Record<string, string> {
  const iconNames: Record<string, string> = {};
  for (const [iconName, phrase] of phrases.entries()) {
    const translated = translations.resolve(iconName, phrase);
    iconNames[iconName] = toDisplayCase(translated);
  }
  return sortRecord(iconNames);
}

export function buildIconKeys(
  iconBags: Map<string, IconTokenBag>,
  keyTranslations: TranslationStore<string>,
  synonymStore: TranslationStore<string[]>
): Record<string, string[]> {
  const iconKeys: Record<string, string[]> = {};
  for (const [iconName, bag] of iconBags.entries()) {
    const englishTokens = Array.from(bag.keywordTokens).sort((a, b) => a.localeCompare(b, 'en'));
    const keySet = new Set<string>(englishTokens);
    englishTokens.forEach(token => {
      const translated = keyTranslations.resolve(token, token);
      keySet.add(translated);
      synonymStore.resolve(token, [translated]).forEach(value => keySet.add(value));
    });
    const keys = Array.from(keySet).sort((a, b) => a.localeCompare(b, 'uk'));
    if (keys.length > 0) {
      iconKeys[iconName] = keys;
    }
  }
  return sortRecord(iconKeys);
}

export async function writeIconNamesFile(
  targetDir: string,
  iconNames: Record<string, string>
): Promise<void> {
  const namesPath = path.join(targetDir, 'icon-names.json');
  await fs.writeFile(namesPath, `${JSON.stringify(iconNames, null, 2)}\n`, 'utf-8');
}

export async function writeIconKeysFile(
  targetDir: string,
  iconKeys: Record<string, string[]>
): Promise<void> {
  const keysPath = path.join(targetDir, 'icon-keys.json');
  await fs.writeFile(keysPath, `${JSON.stringify(iconKeys, null, 2)}\n`, 'utf-8');
}
