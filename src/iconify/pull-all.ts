import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const projectRoot = path.resolve(__dirname, '..', '..');
const jsonListPath = path.join(projectRoot, 'docs', 'iconify-collections.json');
const markdownPath = path.join(projectRoot, 'docs', 'iconify-collections.md');

type CollectionRecord = {
  id: string;
  count: number;
  license: string;
};

function parseLine(line: string): CollectionRecord | null {
  if (!line.trim().startsWith('- [')) {
    return null;
  }
  const idMatch = line.match(/`([^`]+)`/);
  if (!idMatch) return null;
  const id = idMatch[1].trim();
  const countMatch = line.match(/—\s*([\d\s\u00A0\u202F]+)\s*іконок/i);
  if (!countMatch) return null;
  const count = parseInt(countMatch[1].replace(/[^\d]/g, ''), 10);
  const licenseMatch = line.match(/ліцензія:\s*(.+)$/i);
  if (!licenseMatch) return null;
  const license = licenseMatch[1].trim();
  if (!id || !Number.isFinite(count) || !license) return null;
  return { id, count, license };
}

async function readCollections(): Promise<CollectionRecord[]> {
  try {
    const raw = await fs.readFile(jsonListPath, 'utf-8');
    const data = JSON.parse(raw) as CollectionRecord[];
    return Array.isArray(data) ? data : [];
  } catch {
    // Якщо JSON відсутній — парсимо Markdown як запасний варіант
    const rawMd = await fs.readFile(markdownPath, 'utf-8');
    const lines = rawMd.split(/\r?\n/);
    const records: CollectionRecord[] = [];
    for (const line of lines) {
      const rec = parseLine(line);
      if (rec) records.push(rec);
    }
    // Пишемо JSON для подальшого використання
    await fs.writeFile(jsonListPath, JSON.stringify(records, null, 2) + '\n', 'utf-8');
    return records;
  }
}

function runPull(collection: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      process.execPath,
      [
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
  for (const { id } of list) {
    index += 1;
    console.log(`[${index}/${list.length}] Імпорт колекції: ${id}`);
    await runPull(id);
  }
  console.log('Готово: всі колекції з переліку імпортовано.');
}

void main();

