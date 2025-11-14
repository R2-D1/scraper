import { promises as fs } from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(__dirname, '..', '..');
const markdownPath = path.join(projectRoot, 'docs', 'iconify-collections.md');
const outputJsonPath = path.join(projectRoot, 'docs', 'iconify-collections.json');

type CollectionRecord = {
  id: string;
  count: number;
  license: string;
};

function parseLine(line: string): CollectionRecord | null {
  if (!line.trim().startsWith('- [')) {
    return null;
  }

  // Ідентифікатор колекції
  const idMatch = line.match(/`([^`]+)`/);
  if (!idMatch) {
    return null;
  }
  const id = idMatch[1].trim();

  // Кількість іконок (допускаємо пробіли/непереносні пробіли між цифрами)
  const countMatch = line.match(/—\s*([\d\s\u00A0\u202F]+)\s*іконок/i);
  if (!countMatch) {
    return null;
  }
  const count = parseInt(countMatch[1].replace(/[^\d]/g, ''), 10);

  // Ліцензія: все після "ліцензія:"
  const licenseMatch = line.match(/ліцензія:\s*(.+)$/i);
  if (!licenseMatch) {
    return null;
  }
  const license = licenseMatch[1].trim();

  if (!id || !Number.isFinite(count) || !license) {
    return null;
  }

  return { id, count, license };
}

async function main(): Promise<void> {
  const raw = await fs.readFile(markdownPath, 'utf-8');
  const lines = raw.split(/\r?\n/);
  const records: CollectionRecord[] = [];

  for (const line of lines) {
    const rec = parseLine(line);
    if (rec) {
      records.push(rec);
    }
  }

  // Сортуємо за id для стабільності
  records.sort((a, b) => a.id.localeCompare(b.id, 'en'));

  await fs.writeFile(outputJsonPath, JSON.stringify(records, null, 2) + '\n', 'utf-8');
  console.log(`Збережено ${records.length} записів у ${path.relative(projectRoot, outputJsonPath)}`);
}

void main();

