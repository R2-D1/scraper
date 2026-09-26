import { promises as fs } from 'node:fs';
import path from 'node:path';

import { stripIconStyleSuffix } from '../icon-style-suffixes';

const projectRoot = path.resolve(__dirname, '..', '..');
const collectionsPath = path.join(projectRoot, 'docs', 'iconify-collections.json');
const iconifyRoot = path.join(projectRoot, 'library', 'iconify');
const nameTranslationsPath = path.join(
  projectRoot,
  'translations',
  'icons',
  'icon-translations',
  'name-translations.json'
);

type CollectionEntry = {
  id: string;
};

async function readJson<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

async function collectIconVariants(): Promise<Map<string, string>> {
  const list = await readJson<CollectionEntry[]>(collectionsPath);
  const iconMap = new Map<string, string>();

  for (const { id } of list) {
    const filesDir = path.join(iconifyRoot, id, 'files');
    let entries: string[];
    try {
      entries = await fs.readdir(filesDir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.toLowerCase().endsWith('.svg')) {
        continue;
      }
      const iconName = entry.slice(0, -4);
      const base = stripIconStyleSuffix(iconName);
      if (base !== iconName && !iconMap.has(iconName)) {
        iconMap.set(iconName, base);
      }
    }
  }

  return iconMap;
}

function sortRecord(record: Record<string, string>): Record<string, string> {
  return Object.keys(record)
    .sort((a, b) => a.localeCompare(b, 'en'))
    .reduce<Record<string, string>>((acc, key) => {
      acc[key] = record[key];
      return acc;
    }, {});
}

async function main(): Promise<void> {
  const iconVariants = await collectIconVariants();
  const translations = await readJson<Record<string, string>>(nameTranslationsPath);

  let added = 0;
  let skippedMissingBase = 0;

  for (const [iconName, base] of iconVariants.entries()) {
    if (translations[iconName]) {
      continue;
    }
    const baseTranslation = translations[base];
    if (!baseTranslation) {
      skippedMissingBase += 1;
      continue;
    }
    translations[iconName] = baseTranslation;
    added += 1;
  }

  if (added === 0) {
    console.log('Нових перекладів не додано: усі потрібні ключі вже присутні.');
    return;
  }

  const sorted = sortRecord(translations);
  await fs.writeFile(nameTranslationsPath, `${JSON.stringify(sorted, null, 2)}\n`, 'utf-8');

  console.log(`Додано ${added} перекладів. Пропущено через відсутність бази: ${skippedMissingBase}.`);
}

void main();
