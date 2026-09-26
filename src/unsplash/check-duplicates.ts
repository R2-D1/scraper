import { promises as fs } from 'node:fs';

import {
  UNSPLASH_LIBRARY_LIST_PATH,
  UNSPLASH_ILLUSTRATIONS_LIBRARY_LIST_PATH,
} from '../config/paths';

function normalizeUrlForList(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return rawUrl.trim();
  }
}

async function readLibraryFile(filePath: string): Promise<Set<string>> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .map(normalizeUrlForList);
    return new Set(lines);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return new Set();
    }
    throw error;
  }
}

async function main(): Promise<void> {
  try {
    console.log('Перевірка дублікатів між файлами бібліотеки Unsplash...\n');

    const [images, illustrations] = await Promise.all([
      readLibraryFile(UNSPLASH_LIBRARY_LIST_PATH),
      readLibraryFile(UNSPLASH_ILLUSTRATIONS_LIBRARY_LIST_PATH),
    ]);

    console.log(`Зображення (images): ${images.size} URL`);
    console.log(`Ілюстрації (illustrations): ${illustrations.size} URL`);
    console.log();

    // Перевірка дублікатів між images та illustrations
    const imagesIllustrationsDupes = new Set<string>();
    for (const url of images) {
      if (illustrations.has(url)) {
        imagesIllustrationsDupes.add(url);
      }
    }

    let hasDuplicates = false;

    if (imagesIllustrationsDupes.size > 0) {
      hasDuplicates = true;
      console.log(`⚠ Знайдено ${imagesIllustrationsDupes.size} дублікатів між images та illustrations:`);
      for (const url of Array.from(imagesIllustrationsDupes).slice(0, 10)) {
        console.log(`  - ${url}`);
      }
      if (imagesIllustrationsDupes.size > 10) {
        console.log(`  ... та ще ${imagesIllustrationsDupes.size - 10} дублікатів`);
      }
      console.log();
    }


    if (!hasDuplicates) {
      console.log('✅ Дублікатів не знайдено!');
    } else {
      console.log('═══════════════════════════════════════');
      console.log('Для видалення дублікатів використайте:');
      console.log('  pnpm run unsplash:remove-duplicates');
      console.log('═══════════════════════════════════════');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Помилка: ${message}`);
    process.exit(1);
  }
}

void main();
