import { promises as fs } from 'node:fs';
import path from 'node:path';

const TARGET_DIR = path.resolve(__dirname, '../../translations/missing-synonyms');
const FILES = ['part-0001.json', 'part-0002.json', 'part-0003.json', 'part-0004.json'];
const BAN_LIST = new Set(['гаманець', 'обмін', 'гроші', 'дефі', 'defi', 'money', 'payment']);

async function processFile(fileName: string) {
  const filePath = path.join(TARGET_DIR, fileName);
  const raw = await fs.readFile(filePath, 'utf-8');
  const data = JSON.parse(raw) as Record<string, string[]>;
  let mutated = false;

  for (const key of Object.keys(data)) {
    const original = data[key];
    const filtered = original.filter((value) => !BAN_LIST.has(value));
    if (filtered.length !== original.length) {
      data[key] = filtered;
      mutated = true;
    }
  }

  if (mutated) {
    const serialized = `${JSON.stringify(data, null, 2)}\n`;
    await fs.writeFile(filePath, serialized, 'utf-8');
    console.log(`Updated ${fileName}`);
  } else {
    console.log(`No changes for ${fileName}`);
  }
}

async function main() {
  for (const file of FILES) {
    await processFile(file);
  }
}

main().catch((error) => {
  console.error('Failed to cleanup missing synonyms:', error);
  process.exitCode = 1;
});
