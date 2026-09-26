const CYRILLIC_RE = /[А-Яа-яЁёІіЇїЄєҐґ]/;
const LATIN_RE = /[A-Za-z]/;

export type SplitTokensResult = {
  en: string[];
  uk: string[];
};

export function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

export function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = normalizeToken(value);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(value);
  }
  return result;
}

export function splitTokens(tokens: string[]): SplitTokensResult {
  const en: string[] = [];
  const uk: string[] = [];

  for (const token of tokens) {
    const trimmed = token.trim();
    if (!trimmed) {
      continue;
    }
    const hasCyrillic = CYRILLIC_RE.test(trimmed);
    const hasLatin = LATIN_RE.test(trimmed);
    if (hasCyrillic) {
      uk.push(trimmed);
    }
    if (hasLatin) {
      en.push(trimmed);
    }
    if (!hasCyrillic && !hasLatin) {
      en.push(trimmed);
      uk.push(trimmed);
    }
  }

  return {
    en: dedupeStrings(en),
    uk: dedupeStrings(uk),
  };
}

export function moveCyrillicTokensToUk(input: { en: string[]; uk: string[] }): SplitTokensResult {
  const en: string[] = [];
  const uk: string[] = [];

  for (const token of Array.isArray(input.uk) ? input.uk : []) {
    const trimmed = token.trim();
    if (trimmed) {
      uk.push(trimmed);
    }
  }

  for (const token of Array.isArray(input.en) ? input.en : []) {
    const trimmed = token.trim();
    if (!trimmed) {
      continue;
    }
    if (CYRILLIC_RE.test(trimmed)) {
      uk.push(trimmed);
      continue;
    }
    en.push(trimmed);
  }

  return { en: dedupeStrings(en), uk: dedupeStrings(uk) };
}

export function stripTrailingId(slug: string): string {
  const parts = slug.split('-');
  if (parts.length <= 1) {
    return slug;
  }
  const last = parts[parts.length - 1];
  const looksLikeId =
    last.length >= 6 &&
    last.length <= 14 &&
    /[0-9]/.test(last) &&
    /[a-zA-Z]/.test(last);
  if (!looksLikeId) {
    return slug;
  }
  return parts.slice(0, -1).join('-');
}

export function humanizeKey(value: string): string {
  const normalized = stripTrailingId(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) {
    return value;
  }
  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
}

export function buildReverseTranslationMap(entries: Record<string, string>): Map<string, string> {
  const reverse = new Map<string, string>();
  const collisions = new Set<string>();

  for (const [enValue, ukValue] of Object.entries(entries)) {
    const ukKey = normalizeToken(ukValue);
    const enKey = enValue.trim();
    if (!ukKey || !enKey) {
      continue;
    }
    if (reverse.has(ukKey) && reverse.get(ukKey) !== enKey) {
      collisions.add(ukKey);
      continue;
    }
    reverse.set(ukKey, enKey);
  }

  for (const key of collisions) {
    reverse.delete(key);
  }

  return reverse;
}

export function excludeTokens(source: string[], blacklist: string[]): string[] {
  if (source.length === 0 || blacklist.length === 0) {
    return dedupeStrings(source);
  }
  const blacklistSet = new Set(blacklist.map(normalizeToken));
  const filtered = source.filter(token => !blacklistSet.has(normalizeToken(token)));
  return dedupeStrings(filtered);
}
