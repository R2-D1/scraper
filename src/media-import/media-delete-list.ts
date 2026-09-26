import { promises as fs } from 'node:fs';

import { MEDIA_DELETE_LIST_PATH } from '../config/paths';

const SCHEMA_VERSION = 1;

export async function readMediaDeleteList(
  filePath = MEDIA_DELETE_LIST_PATH,
): Promise<string[]> {
  const raw = await fs.readFile(filePath, 'utf8').catch(error => {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  });
  if (!raw) return [];
  const parsed = JSON.parse(raw) as { schemaVersion?: unknown; mediaKeys?: unknown };
  if (parsed.schemaVersion !== SCHEMA_VERSION || !Array.isArray(parsed.mediaKeys)) {
    throw new Error(`Некоректний список видалення: ${filePath}.`);
  }
  const mediaKeys = parsed.mediaKeys.map((value, index) => {
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error(`Некоректний mediaKey у списку видалення на позиції ${index}.`);
    }
    return value.trim();
  });
  return [...new Set(mediaKeys)];
}

export async function writeMediaDeleteList(
  mediaKeys: readonly string[],
  filePath = MEDIA_DELETE_LIST_PATH,
): Promise<void> {
  const normalized = [...new Set(mediaKeys.map(value => value.trim()).filter(Boolean))].sort();
  await fs.writeFile(filePath, `${JSON.stringify({ schemaVersion: SCHEMA_VERSION, mediaKeys: normalized }, null, 2)}\n`, 'utf8');
}
