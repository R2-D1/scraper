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

async function readLibraryFile(filePath: string): Promise<string[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeLibraryFile(filePath: string, urls: string[]): Promise<void> {
  const normalized = urls.map(normalizeUrlForList);
  const unique = Array.from(new Set(normalized)).sort();
  const content = unique.length > 0 ? `${unique.join('\n')}\n` : '';
  await fs.writeFile(filePath, content, 'utf-8');
}

async function main(): Promise<void> {
  try {
    console.log('Видалення дублікатів між файлами бібліотеки Unsplash...\n');

    const [imagesRaw, illustrationsRaw] = await Promise.all([
      readLibraryFile(UNSPLASH_LIBRARY_LIST_PATH),
      readLibraryFile(UNSPLASH_ILLUSTRATIONS_LIBRARY_LIST_PATH),
    ]);

    const images = new Set(imagesRaw.map(normalizeUrlForList));
    const illustrations = new Set(illustrationsRaw.map(normalizeUrlForList));

    console.log(`Початкові кількості:`);
    console.log(`  images: ${images.size}`);
    console.log(`  illustrations: ${illustrations.size}`);
    console.log();

    // Знаходимо дублікати
    const imagesIllustrationsDupes = new Set<string>();
    for (const url of images) {
      if (illustrations.has(url)) {
        imagesIllustrationsDupes.add(url);
      }
    }

    // Видаляємо дублікати з images, залишаючи їх в illustrations.
    for (const url of imagesIllustrationsDupes) {
      images.delete(url);
    }
    // Зберігаємо оновлені файли
    await Promise.all([
      writeLibraryFile(UNSPLASH_LIBRARY_LIST_PATH, Array.from(images)),
      writeLibraryFile(UNSPLASH_ILLUSTRATIONS_LIBRARY_LIST_PATH, Array.from(illustrations)),
    ]);

    console.log('Оновлені кількості:');
    console.log(`  images: ${images.size} (видалено ${imagesRaw.length - images.size})`);
    console.log(`  illustrations: ${illustrations.size} (видалено ${illustrationsRaw.length - illustrations.size})`);
    console.log();

    const totalRemoved =
      imagesRaw.length - images.size + illustrationsRaw.length - illustrations.size;

    console.log('═══════════════════════════════════════');
    console.log(`Всього видалено дублікатів: ${totalRemoved}`);
    console.log('═══════════════════════════════════════');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Помилка: ${message}`);
    process.exit(1);
  }
}

void main();
