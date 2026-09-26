import { promises as fs } from 'node:fs';

import { PEXELS_AUTHOR_BLACKLIST_PATH } from '../config/paths';

function normalize(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const raw = value.trim().toLowerCase();
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const url = new URL(raw);
      if (url.hostname !== 'pexels.com' && url.hostname !== 'www.pexels.com') return null;
      return url.pathname.match(/^\/@([^/]+)\/?$/)?.[1]?.toLowerCase() ?? null;
    } catch {
      return null;
    }
  }
  return raw.replace(/^@/, '').replace(/^\/+|\/+$/g, '') || null;
}

export async function readPexelsAuthorBlacklist(
  filePath = PEXELS_AUTHOR_BLACKLIST_PATH,
): Promise<Set<string>> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return new Set();
    throw error;
  }
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error(`Pexels author blacklist має бути масивом рядків: ${filePath}.`);
  return new Set(parsed.map(normalize).filter((value): value is string => Boolean(value)));
}

export function isPexelsAuthorBlacklisted(
  author: { authorName?: string; authorUrl?: string; photographer?: string; photographer_url?: string },
  blacklist: ReadonlySet<string>,
): boolean {
  const identifiers = [author.authorName, author.photographer, author.authorUrl, author.photographer_url]
    .map(normalize)
    .filter((value): value is string => Boolean(value));
  return identifiers.some(identifier => blacklist.has(identifier));
}
