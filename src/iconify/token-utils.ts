import { lookupCollection, lookupCollections } from '@iconify/json';

type IconEntry = {
  tags?: string[];
  categories?: string[];
};

type IconAlias = {
  parent: string;
  tags?: string[];
  categories?: string[];
};

type RawCollection = {
  icons?: Record<string, IconEntry>;
  aliases?: Record<string, IconAlias>;
  tags?: Record<string, string[]>;
  categories?: Record<string, string[]>;
};

export function tokenizeLabel(label: string): string[] {
  return label
    .split(/[^a-zA-Z0-9]+/g)
    .map(part => part.toLowerCase())
    .filter(Boolean);
}

function collectTokensFromRawCollection(data: RawCollection): string[] {
  const tokens = new Set<string>();
  const icons = data.icons ?? {};
  const aliases = data.aliases ?? {};
  const tags = data.tags ?? {};
  const categories = data.categories ?? {};

  for (const [iconName, icon] of Object.entries(icons)) {
    tokenizeLabel(iconName).forEach(token => tokens.add(token));
    icon.tags?.forEach(tag => tokenizeLabel(tag).forEach(token => tokens.add(token)));
    icon.categories?.forEach(category => tokenizeLabel(category).forEach(token => tokens.add(token)));
  }

  for (const [aliasName, alias] of Object.entries(aliases)) {
    tokenizeLabel(aliasName).forEach(token => tokens.add(token));
    alias.tags?.forEach(tag => tokenizeLabel(tag).forEach(token => tokens.add(token)));
    alias.categories?.forEach(category => tokenizeLabel(category).forEach(token => tokens.add(token)));
  }

  for (const [tag, iconNames] of Object.entries(tags)) {
    tokenizeLabel(tag).forEach(token => tokens.add(token));
    iconNames?.forEach(iconName => tokenizeLabel(iconName).forEach(token => tokens.add(token)));
  }

  for (const category of Object.keys(categories)) {
    tokenizeLabel(category).forEach(token => tokens.add(token));
  }

  return Array.from(tokens);
}

export async function gatherTokensForCollection(collectionName: string): Promise<string[]> {
  const data = (await lookupCollection(collectionName)) as RawCollection | undefined;
  if (!data) {
    throw new Error(`Колекція "${collectionName}" не знайдена.`);
  }
  return collectTokensFromRawCollection(data).sort((a, b) => a.localeCompare(b, 'en'));
}

export async function gatherAllTokens(): Promise<string[]> {
  const tokens = new Set<string>();
  const collections = await lookupCollections();
  const names = Object.keys(collections).sort();

  for (const name of names) {
    try {
      const data = (await lookupCollection(name)) as RawCollection | undefined;
      if (!data) {
        continue;
      }
      collectTokensFromRawCollection(data).forEach(token => tokens.add(token));
    } catch (error) {
      console.warn(`Не вдалося обробити колекцію "${name}":`, error);
    }
  }

  return Array.from(tokens).sort((a, b) => a.localeCompare(b, 'en'));
}
