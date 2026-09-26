export type TokenTranslationEntry = string | string[];

export type TokenTranslations = Record<string, TokenTranslationEntry>;

export function normalizeTranslationEntry(entry?: TokenTranslationEntry): string[] {
  if (entry === undefined || entry === null) {
    return [];
  }

  const list = Array.isArray(entry) ? entry : [entry];

  return list
    .map(value => value.trim())
    .filter(value => value.length > 0);
}

export function getPrimaryTranslation(entry?: TokenTranslationEntry): string | undefined {
  const normalized = normalizeTranslationEntry(entry);
  return normalized.length > 0 ? normalized[0] : undefined;
}

export function hasDistinctTranslation(
  token: string,
  entry?: TokenTranslationEntry
): boolean {
  const normalized = normalizeTranslationEntry(entry);
  if (normalized.length === 0) {
    return false;
  }
  const base = token.toLowerCase();
  return normalized.some(value => value.toLowerCase() !== base);
}
