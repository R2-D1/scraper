import { promises as fs, Dirent } from 'node:fs';
import path from 'node:path';

import {
  UNSPLASH_IMAGES_ROOT,
  UNSPLASH_ILLUSTRATIONS_ROOT,
  UNSPLASH_LIBRARY_LIST_PATH,
  UNSPLASH_ILLUSTRATIONS_LIBRARY_LIST_PATH,
  UnsplashMediaKind,
} from '../config/paths';
import { MEDIA_META_FILE } from './library-paths';
import { MediaMetadata } from './import-utils';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

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

async function removeFromLibraryFile(url: string, filePath: string): Promise<void> {
  const normalized = normalizeUrlForList(url);
  try {
    const existing = await fs.readFile(filePath, 'utf-8');
    const lines = existing
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .filter(line => normalizeUrlForList(line) !== normalized);
    const content = lines.length > 0 ? `${lines.join('\n')}\n` : '';
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    throw error;
  }
}

async function appendToLibraryFile(url: string, kind: UnsplashMediaKind): Promise<boolean> {
  const normalized = normalizeUrlForList(url);
  let libraryPath: string;
  const otherPaths: string[] = [];
  
  switch (kind) {
    case 'illustration':
      libraryPath = UNSPLASH_ILLUSTRATIONS_LIBRARY_LIST_PATH;
      otherPaths.push(UNSPLASH_LIBRARY_LIST_PATH);
      break;
    case 'image':
    default:
      libraryPath = UNSPLASH_LIBRARY_LIST_PATH;
      otherPaths.push(UNSPLASH_ILLUSTRATIONS_LIBRARY_LIST_PATH);
      break;
  }

  // Видаляємо URL з інших файлів, щоб уникнути дублікатів
  await Promise.all(otherPaths.map(path => removeFromLibraryFile(url, path)));

  try {
    const existing = await fs.readFile(libraryPath, 'utf-8');
    const lines = new Set(
      existing
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
    );
    if (lines.has(normalized)) {
      return false;
    }
    lines.add(normalized);
    const content = `${Array.from(lines).sort().join('\n')}\n`;
    await fs.writeFile(libraryPath, content, 'utf-8');
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      await fs.writeFile(libraryPath, `${normalized}\n`, 'utf-8');
      return true;
    }
    throw error;
  }
}

async function processDirectory(
  rootDir: string,
  kind: UnsplashMediaKind
): Promise<{ processed: number; added: number; errors: number }> {
  let processed = 0;
  let added = 0;
  let errors = 0;

  async function walk(dir: string): Promise<void> {
    let entries: Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return;
      }
      throw error;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (entry.name !== MEDIA_META_FILE) {
        continue;
      }

      try {
        const metaContent = await fs.readFile(fullPath, 'utf-8');
        const meta = JSON.parse(metaContent) as MediaMetadata;

        if (!meta.source) {
          console.warn(`  ⚠ Пропущено ${fullPath}: відсутнє поле source`);
          errors += 1;
          continue;
        }

        processed += 1;
        const wasAdded = await appendToLibraryFile(meta.source, kind);
        if (wasAdded) {
          added += 1;
          const relativePath = path.relative(PROJECT_ROOT, fullPath);
          console.log(`  ✔ Додано: ${relativePath}`);
        }
      } catch (error) {
        const relativePath = path.relative(PROJECT_ROOT, fullPath);
        console.error(`  ✖ Помилка для ${relativePath}: ${(error as Error).message}`);
        errors += 1;
      }
    }
  }

  await walk(rootDir);
  return { processed, added, errors };
}

async function main(): Promise<void> {
  try {
    console.log('Початок обробки бібліотеки Unsplash...\n');

    console.log('Обробка зображень (images)...');
    const imagesResult = await processDirectory(UNSPLASH_IMAGES_ROOT, 'image');
    console.log(`  Оброблено: ${imagesResult.processed}, додано: ${imagesResult.added}, помилок: ${imagesResult.errors}\n`);

    console.log('Обробка ілюстрацій (Illustration)...');
    const illustrationsResult = await processDirectory(UNSPLASH_ILLUSTRATIONS_ROOT, 'illustration');
    console.log(
      `  Оброблено: ${illustrationsResult.processed}, додано: ${illustrationsResult.added}, помилок: ${illustrationsResult.errors}\n`
    );

    const totalProcessed = imagesResult.processed + illustrationsResult.processed;
    const totalAdded = imagesResult.added + illustrationsResult.added;
    const totalErrors = imagesResult.errors + illustrationsResult.errors;

    console.log('═══════════════════════════════════════');
    console.log(`Всього оброблено: ${totalProcessed}`);
    console.log(`Всього додано: ${totalAdded}`);
    console.log(`Всього помилок: ${totalErrors}`);
    console.log('═══════════════════════════════════════');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Помилка: ${message}`);
    process.exit(1);
  }
}

void main();
