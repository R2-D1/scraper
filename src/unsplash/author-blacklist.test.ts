import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  isUnsplashAuthorBlacklisted,
  readUnsplashAuthorBlacklist,
  unsplashAuthorIdentifiers,
} from './author-blacklist';

test('author blacklist normalizes usernames and profile URLs', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'scraper-author-blacklist-'));
  const file = path.join(dir, 'blacklist.json');
  try {
    await writeFile(file, '["@blocked_user", "https://unsplash.com/@other_user/"]\n');
    const blacklist = await readUnsplashAuthorBlacklist(file);
    assert.equal(isUnsplashAuthorBlacklisted({ username: 'blocked_user' }, blacklist), true);
    assert.equal(isUnsplashAuthorBlacklisted({ links: { html: 'https://unsplash.com/@other_user' } }, blacklist), true);
    assert.deepEqual(unsplashAuthorIdentifiers({ username: 'open_user', links: { html: 'https://unsplash.com/@open_user' } }), ['open_user', 'open_user']);
    assert.equal(isUnsplashAuthorBlacklisted({ username: 'open_user' }, blacklist), false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
