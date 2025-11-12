import { promises as fs } from 'node:fs';
import path from 'node:path';

type NormalizeFn<T> = (value: unknown, token: string) => T | null;
type MergeFn<T> = (current: T, incoming: T) => T;

type TranslationStoreOptions<T> = {
  masterPath: string;
  missingDir: string;
  chunkSize: number;
  normalizeValue: NormalizeFn<T>;
  mergeValues?: MergeFn<T>;
};

function isNotFound(error: unknown): error is { code?: string } {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'ENOENT');
}

async function ensureJsonFile(filePath: string): Promise<void> {
  try {
    await fs.access(filePath);
  } catch (error) {
    if (isNotFound(error)) {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, '{}\n', 'utf-8');
      return;
    }
    throw error;
  }
}

function normalizeToken(token: string): string | null {
  if (typeof token !== 'string') {
    return null;
  }
  const trimmed = token.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isNumericToken(token: string): boolean {
  return /^\d+$/.test(token);
}

async function writeShardedRecords<T>(dir: string, data: Map<string, T>, chunkSize: number): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });

  if (data.size === 0) {
    const filePath = path.join(dir, 'part-0001.json');
    await fs.writeFile(filePath, '{}\n', 'utf-8');
    return;
  }

  const entries = Array.from(data.entries()).sort((a, b) => a[0].localeCompare(b[0], 'en'));
  let chunkIndex = 0;
  for (let start = 0; start < entries.length; start += chunkSize) {
    const chunkEntries = entries.slice(start, start + chunkSize);
    const fileName = `part-${String(++chunkIndex).padStart(4, '0')}.json`;
    const filePath = path.join(dir, fileName);
    await fs.writeFile(filePath, `${JSON.stringify(Object.fromEntries(chunkEntries), null, 2)}\n`, 'utf-8');
  }
}

export class TranslationStore<T> {
  private readonly masterPath: string;
  private readonly missingDir: string;
  private readonly chunkSize: number;
  private readonly normalizeValue: NormalizeFn<T>;
  private readonly mergeValues: MergeFn<T>;
  private readonly master = new Map<string, T>();
  private readonly missing = new Map<string, T>();

  private constructor(options: TranslationStoreOptions<T>) {
    this.masterPath = path.resolve(options.masterPath);
    this.missingDir = path.resolve(options.missingDir);
    this.chunkSize = options.chunkSize;
    this.normalizeValue = options.normalizeValue;
    this.mergeValues = options.mergeValues ?? ((current: T) => current);
  }

  static async create<T>(options: TranslationStoreOptions<T>): Promise<TranslationStore<T>> {
    const store = new TranslationStore(options);
    await store.prepare();
    return store;
  }

  resolve(token: string, fallback: T): T {
    const normalizedToken = normalizeToken(token);
    if (!normalizedToken) {
      return fallback;
    }

    const existing = this.master.get(normalizedToken);
    if (existing !== undefined) {
      return existing;
    }

    if (isNumericToken(normalizedToken)) {
      return this.normalizeValue(fallback, normalizedToken) ?? fallback;
    }

    const normalizedFallback = this.normalizeValue(fallback, normalizedToken) ?? fallback;
    this.mergeMissingValue(normalizedToken, normalizedFallback);
    return normalizedFallback;
  }

  async writeMissingRecords(): Promise<void> {
    await writeShardedRecords(this.missingDir, this.missing, this.chunkSize);
  }

  private async prepare(): Promise<void> {
    await ensureJsonFile(this.masterPath);
    await this.loadMaster();
    await this.loadExistingMissingRecords();
  }

  private mergeMissingValue(token: string, value: T): void {
    const existing = this.missing.get(token);
    if (existing === undefined) {
      this.missing.set(token, value);
      return;
    }
    const merged = this.mergeValues(existing, value);
    this.missing.set(token, merged);
  }

  private async loadMaster(): Promise<void> {
    const raw = await fs.readFile(this.masterPath, 'utf-8');
    const data = JSON.parse(raw) as Record<string, unknown>;

    for (const [rawKey, rawValue] of Object.entries(data)) {
      const token = normalizeToken(rawKey);
      if (!token) {
        continue;
      }
      const normalizedValue = this.normalizeValue(rawValue, token);
      if (normalizedValue !== null) {
        this.master.set(token, normalizedValue);
      }
    }
  }

  private async loadExistingMissingRecords(): Promise<void> {
    try {
      const entries = await fs.readdir(this.missingDir, { withFileTypes: true });
      const files = entries
        .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
        .map(entry => entry.name)
        .sort((a, b) => a.localeCompare(b, 'en'));
      for (const fileName of files) {
        const filePath = path.join(this.missingDir, fileName);
        const raw = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(raw) as Record<string, unknown>;
        this.addMissingRecordsFromObject(data);
      }
    } catch (error) {
      if (isNotFound(error)) {
        return;
      }
      throw error;
    }
  }

  private addMissingRecordsFromObject(data: Record<string, unknown>): void {
    for (const [rawKey, rawValue] of Object.entries(data)) {
      const token = normalizeToken(rawKey);
      if (!token) {
        continue;
      }
      const normalizedValue = this.normalizeValue(rawValue, token);
      if (normalizedValue === null) {
        continue;
      }
      this.mergeMissingValue(token, normalizedValue);
    }
  }
}

export function normalizeStringValue(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeStringArrayValue(value: unknown): string[] | null {
  const source = Array.isArray(value) ? value : typeof value === 'string' ? [value] : null;
  if (!source) {
    return null;
  }
  const normalized = source
    .map(entry => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(entry => entry.length > 0);
  const unique = Array.from(new Set(normalized));
  return unique.length > 0 ? unique : null;
}

export function mergeUniqueStringArrays(current: string[], incoming: string[]): string[] {
  if (incoming.length === 0) {
    return current;
  }
  const seen = new Set(current);
  const merged = [...current];
  for (const value of incoming) {
    if (!seen.has(value)) {
      merged.push(value);
      seen.add(value);
    }
  }
  return merged;
}
