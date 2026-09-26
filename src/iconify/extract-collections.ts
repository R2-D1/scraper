import { promises as fs } from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(__dirname, '..', '..');
const jsonPath = path.join(projectRoot, 'docs', 'iconify-collections.json');

type CollectionRecord = {
  id: string;
  count: number;
  license: string;
};

async function main(): Promise<void> {
  try {
    const raw = await fs.readFile(jsonPath, 'utf-8');
    const records = JSON.parse(raw) as CollectionRecord[];

    if (!Array.isArray(records)) {
      throw new Error('JSON файл не містить масиву колекцій.');
    }

    // Сортуємо за id для стабільності
    records.sort((a, b) => a.id.localeCompare(b.id, 'en'));

    await fs.writeFile(jsonPath, JSON.stringify(records, null, 2) + '\n', 'utf-8');
    console.log(`Відсортовано ${records.length} записів у ${path.relative(projectRoot, jsonPath)}`);
  } catch (error) {
    if ((error as { code?: string })?.code === 'ENOENT') {
      console.error(`Файл ${jsonPath} не знайдено. Створіть його вручну або використайте iconify:pull-all для автоматичного створення.`);
      process.exit(1);
    }
    throw error;
  }
}

void main();

