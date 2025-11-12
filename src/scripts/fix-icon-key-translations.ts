import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Dictionary = Record<string, string>;
type SynonymDictionary = Record<string, string[]>;

const rootDir = resolve(__dirname, '..', '..');
const keyTranslationsPath = resolve(rootDir, 'translations/icon-translations/key-translations.json');
const synonymsPath = resolve(rootDir, 'translations/icon-translations/synonyms.json');
const nameTranslationsPath = resolve(rootDir, 'translations/icon-translations/name-translations.json');

const keyTranslations: Dictionary = JSON.parse(readFileSync(keyTranslationsPath, 'utf8'));
const synonyms: SynonymDictionary = JSON.parse(readFileSync(synonymsPath, 'utf8'));
const nameTranslations: Dictionary = JSON.parse(readFileSync(nameTranslationsPath, 'utf8'));
const brandTranslations = collectBrandTranslations(nameTranslations);

const caseSuffixRules: Array<[RegExp, string]> = [
  [/кою$/u, 'ка'],
  [/ею$/u, 'я'],
  [/єю$/u, 'я'],
  [/ою$/u, 'а'],
  [/істю$/u, 'ість'],
  [/істом$/u, 'іст'],
];

const updatedTranslations: Dictionary = {};
const updatedSynonyms: SynonymDictionary = {};

for (const key of Object.keys(keyTranslations)) {
  const original = keyTranslations[key];
  const normalized = normalizeTranslation(key, original);
  updatedTranslations[key] = normalized;
  updatedSynonyms[key] = buildSynonyms(key, normalized, synonyms[key]);
}

writeFileSync(keyTranslationsPath, `${JSON.stringify(updatedTranslations, null, 2)}\n`, 'utf8');
writeFileSync(synonymsPath, `${JSON.stringify(updatedSynonyms, null, 2)}\n`, 'utf8');

function collectBrandTranslations(source: Dictionary): Dictionary {
  const result: Dictionary = {};
  for (const [key, value] of Object.entries(source)) {
    if (!key.startsWith('brand-')) {
      continue;
    }
    const slug = key.slice('brand-'.length);
    if (slug.includes('-')) {
      continue;
    }
    result[slug] = value;
  }
  return result;
}

function normalizeTranslation(key: string, value: string): string {
  if (brandTranslations[key]) {
    if (translationLooksLikeBrandValue(value, key)) {
      return brandTranslations[key];
    }
  }

  let result = normalizeWhitespace(value);

  if (isSingleWord(result) && containsOnlyUkrainianLetters(result)) {
    result = applyCaseSuffixRules(result);
  }

  return result;
}

function buildSynonyms(key: string, translation: string, current: string[] | undefined): string[] {
  const items = current ? [...current] : [];
  const englishKey = key;
  const ordered: string[] = [];
  const seen = new Set<string>();

  const push = (value: string, place: 'front' | 'back' = 'back') => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    const normalized = trimmed.toLowerCase();
    if (seen.has(normalized)) {
      return;
    }
    if (place === 'front') {
      ordered.unshift(trimmed);
    } else {
      ordered.push(trimmed);
    }
    seen.add(normalized);
  };

  push(translation, 'front');

  for (const item of items) {
    push(item);
  }

  if (!seen.has(englishKey.toLowerCase())) {
    push(englishKey);
  }

  return ordered;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function isSingleWord(value: string): boolean {
  return !/\s/u.test(value);
}

function containsOnlyUkrainianLetters(value: string): boolean {
  return /^[\p{Letter}’ʼ-]+$/u.test(value) && /[а-щьюяіїєґ]/iu.test(value);
}

function containsLatinLetters(value: string): boolean {
  return /[a-z]/i.test(value);
}

function applyCaseSuffixRules(value: string): string {
  for (const [pattern, replacement] of caseSuffixRules) {
    if (pattern.test(value)) {
      const updated = value.replace(pattern, replacement);
      if (updated.length >= 3) {
        return updated;
      }
    }
  }
  return value;
}

function translationLooksLikeBrandValue(value: string, key: string): boolean {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return true;
  }

  if (containsLatinLetters(normalized)) {
    return true;
  }

  const lower = normalized.toLowerCase();
  return lower === key.toLowerCase();
}
