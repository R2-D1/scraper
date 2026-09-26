import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { getIconifyCollectionDir } from '../config/paths';
import { readIconsFile } from './collection-translations';

const projectRoot = path.resolve(__dirname, '..', '..');
const jsonListPath = path.join(projectRoot, 'docs', 'iconify-collections.json');

type CollectionRecord = {
  id: string;
  count: number;
  license: string;
};

type CollectionMeta = {
  licenseName?: string;
  licenseUrl?: string;
};

async function readCollections(): Promise<CollectionRecord[]> {
  try {
    const raw = await fs.readFile(jsonListPath, 'utf-8');
    const data = JSON.parse(raw) as CollectionRecord[];
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if ((error as { code?: string })?.code === 'ENOENT') {
      console.error(`Файл ${jsonListPath} не знайдено. Створіть його вручну зі списком колекцій.`);
      process.exit(1);
    }
    throw error;
  }
}

async function getCollectionInfo(collectionId: string): Promise<{ count: number; license: string } | null> {
  const collectionDir = getIconifyCollectionDir(collectionId);
  
  // Читаємо кількість іконок з icons.json
  const iconsFile = await readIconsFile(collectionDir);
  if (!iconsFile) {
    return null;
  }
  const count = Object.keys(iconsFile).length;

  // Читаємо ліцензію з collection-meta.json
  let license = 'Unknown';
  try {
    const metaPath = path.join(collectionDir, 'collection-meta.json');
    const metaRaw = await fs.readFile(metaPath, 'utf-8');
    const meta = JSON.parse(metaRaw) as CollectionMeta;
    if (meta.licenseName) {
      license = meta.licenseName;
    }
  } catch {
    // Якщо collection-meta.json відсутній, залишаємо поточну ліцензію
  }

  return { count, license };
}

async function updateCollectionRecord(collectionId: string, newCount: number, newLicense: string): Promise<void> {
  const collections = await readCollections();
  const index = collections.findIndex(c => c.id === collectionId);
  
  if (index === -1) {
    console.warn(`  ⚠ Колекцію "${collectionId}" не знайдено в списку для оновлення.`);
    return;
  }

  const oldRecord = collections[index];
  collections[index] = {
    id: collectionId,
    count: newCount,
    license: newLicense,
  };

  // Сортуємо за id для стабільності
  collections.sort((a, b) => a.id.localeCompare(b.id, 'en'));

  await fs.writeFile(jsonListPath, JSON.stringify(collections, null, 2) + '\n', 'utf-8');
  
  if (oldRecord.count !== newCount || oldRecord.license !== newLicense) {
    console.log(`  ✓ Оновлено в iconify-collections.json: ${oldRecord.count} → ${newCount} іконок, ліцензія: ${newLicense}`);
  }
}

function runPull(collection: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      process.execPath,
      [
        '-r',
        require.resolve('ts-node/register/transpile-only'),
        path.join(projectRoot, 'src', 'iconify', 'pull-collection.ts'),
        '--',
        '--collection',
        collection,
      ],
      {
        stdio: 'inherit',
        env: {
          ...process.env,
          TS_NODE_PROJECT: path.join(projectRoot, 'tsconfig.json'),
        },
      }
    );

    proc.on('error', reject);
    proc.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`iconify:pull завершився з кодом ${code} для "${collection}"`));
    });
  });
}

async function main(): Promise<void> {
  const list = await readCollections();
  if (!list.length) {
    console.error('Список колекцій порожній.');
    process.exit(1);
  }

  console.log(`Починаю імпорт ${list.length} колекцій...`);
  let index = 0;
  const failures: Array<{ id: string; error: unknown }> = [];
  for (const { id } of list) {
    index += 1;
    console.log(`[${index}/${list.length}] Імпорт колекції: ${id}`);
    try {
      await runPull(id);
      
      // Оновлюємо кількість іконок та ліцензію в JSON файлі
      const info = await getCollectionInfo(id);
      if (info) {
        await updateCollectionRecord(id, info.count, info.license);
      } else {
        console.warn(`  ⚠ Не вдалося отримати інформацію про колекцію "${id}" для оновлення.`);
      }
    } catch (error) {
      failures.push({ id, error });
      console.error(`✗ Помилка для "${id}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (failures.length > 0) {
    console.error(`Готово з помилками: не імпортовано ${failures.length} колекцій.`);
    for (const failure of failures) {
      console.error(`  • ${failure.id}`);
    }
    process.exit(1);
  }

  console.log('Готово: всі колекції з переліку імпортовано та оновлено в iconify-collections.json.');
}

void main();
