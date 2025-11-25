import { randomUUID } from 'node:crypto';
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

export type IconMetadata = {
  name: string;
  mediaKey: string;
  keys: string[];
};

export type IconsFile = Record<string, IconMetadata>;

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

export type NamePhraseCollection = {
  basePhrases: Map<string, string>;
  iconToBase: Map<string, string>;
};

export function collectNamePhrases(iconNames: string[]): NamePhraseCollection {
  const basePhrases = new Map<string, string>();
  const iconToBase = new Map<string, string>();

  for (const iconName of iconNames) {
    const base = stripIconStyleSuffix(iconName);
    if (!basePhrases.has(base)) {
      const phrase = slugToPhrase(base);
      basePhrases.set(base, phrase);
    }
    iconToBase.set(iconName, base);
  }

  return { basePhrases, iconToBase };
}

export function buildIconNames(
  phrases: NamePhraseCollection,
  translations: TranslationStore<string>
): Record<string, string> {
  const iconNames: Record<string, string> = {};
  const baseTranslations = new Map<string, string>();

  for (const [base, phrase] of phrases.basePhrases.entries()) {
    const translated = toDisplayCase(translations.resolve(base, phrase));
    baseTranslations.set(base, translated);
  }

  for (const [iconName, base] of phrases.iconToBase.entries()) {
    const fallback = baseTranslations.get(base) ?? toDisplayCase(slugToPhrase(base));
    const translated = toDisplayCase(translations.resolve(iconName, fallback));
    iconNames[iconName] = translated;
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

const ICONS_FILE_NAME = 'icons.json';
const LEGACY_ICON_FILES = ['icon-names.json', 'icon-keys.json'];

export function buildIconMetadata(
  iconNames: string[],
  names: Record<string, string>,
  keys: Record<string, string[]>,
  previous?: IconsFile | null
): IconsFile {
  const result: IconsFile = {};
  const sorted = [...iconNames].sort((a, b) => a.localeCompare(b, 'en'));
  for (const iconName of sorted) {
    const existing = previous?.[iconName];
    const mediaKey = existing?.mediaKey ?? randomUUID();
    result[iconName] = {
      name: names[iconName] ?? toDisplayCase(slugToPhrase(iconName)),
      mediaKey,
      keys: keys[iconName] ?? [],
    };
  }
  return sortRecord(result);
}

export async function readIconsFile(targetDir: string): Promise<IconsFile | null> {
  const iconsPath = path.join(targetDir, ICONS_FILE_NAME);
  try {
    const raw = await fs.readFile(iconsPath, 'utf-8');
    return JSON.parse(raw) as IconsFile;
  } catch (error) {
    if ((error as { code?: string })?.code === 'ENOENT') {
      return null;
    }
    throw new Error(`Не вдалося прочитати ${iconsPath}: ${error instanceof Error ? error.message : String(error)}.`);
  }
}

export async function writeIconsFile(targetDir: string, icons: IconsFile): Promise<void> {
  const iconsPath = path.join(targetDir, ICONS_FILE_NAME);
  await fs.writeFile(iconsPath, `${JSON.stringify(icons, null, 2)}\n`, 'utf-8');
}

export async function removeLegacyIconFiles(targetDir: string): Promise<void> {
  await Promise.all(
    LEGACY_ICON_FILES.map(async fileName => {
      const filePath = path.join(targetDir, fileName);
      await fs.rm(filePath, { force: true });
    })
  );
}
