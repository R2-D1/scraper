import { promises as fs } from 'node:fs';

import { UNSPLASH_AUTHOR_BLACKLIST_PATH } from '../config/paths';

function normalize(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const raw = value.trim().toLowerCase();
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const url = new URL(raw);
      if (url.hostname !== 'unsplash.com' && url.hostname !== 'www.unsplash.com') return null;
      return url.pathname.match(/^\/@([^/]+)\/?$/)?.[1]?.toLowerCase() ?? null;
    } catch {
      return null;
    }
  }
  return raw.replace(/^@/, '').replace(/^\/+|\/+$/g, '') || null;
}

export async function readUnsplashAuthorBlacklist(
  filePath = UNSPLASH_AUTHOR_BLACKLIST_PATH,
): Promise<Set<string>> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return new Set();
    throw error;
  }
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error(`Blacklist авторів має містити масив рядків: ${filePath}.`);
  return new Set(parsed.map(normalize).filter((value): value is string => Boolean(value)));
}

export function unsplashAuthorIdentifiers(author: { username?: string; links?: { html?: string } } | { authorUrl?: string }): string[] {
  const username = 'username' in author ? author.username : undefined;
  const html = 'links' in author ? author.links?.html : undefined;
  const authorUrl = 'authorUrl' in author ? author.authorUrl : undefined;
  return [username, html, authorUrl].map(normalize).filter((value): value is string => Boolean(value));
}

export function isUnsplashAuthorBlacklisted(
  author: { username?: string; links?: { html?: string } } | { authorUrl?: string },
  blacklist: ReadonlySet<string>,
): boolean {
  return unsplashAuthorIdentifiers(author).some(identifier => blacklist.has(identifier));
}
