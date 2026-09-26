import { promises as fs, Dirent } from 'node:fs';
import path from 'node:path';

import { TAG_TRANSLATIONS_PATH } from '../config/paths';
import { dedupeStrings, moveCyrillicTokensToUk, normalizeToken } from '../i18n/utils';
import { buildLocalizedTagEntries, extractTagLists, LocalizedTag } from '../unsplash/tag-utils';

type LegacyTagList = {
  en?: unknown;
  uk?: unknown;
};

type LegacyI18n = {
  tags?: unknown;
  keywords?: {
    en?: unknown;
    uk?: unknown;
  };
};

type MediaMetadata = {
  i18n?: LegacyI18n & { tags?: unknown };
};

type CliOptions = {
  rootDir: string;
  dryRun: boolean;
};

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

function parseArgs(argv: string[]): CliOptions {
  let rootDir = path.join(PROJECT_ROOT, 'library', 'unsplash');
  let dryRun = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--root' || arg === '-r') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('Потрібно вказати шлях після --root.');
      }
      rootDir = path.resolve(PROJECT_ROOT, value);
      index += 1;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--') {
      continue;
    } else if (arg === '--help' || arg === '-h') {
      console.log(
        [
          'Використання:',
          '  pnpm run library:migrate-tags [--root <path>] [--dry-run]',
          '',
          'Опції:',
          '  --root, -r  Коренева тека з media-meta.json (дефолт — library/unsplash).',
          '  --dry-run   Лише звіт, без запису файлів.',
        ].join('\n')
      );
      process.exit(0);
    } else if (arg.startsWith('-')) {
      throw new Error(`Невідомий аргумент "${arg}".`);
    } else {
      rootDir = path.resolve(PROJECT_ROOT, arg);
    }
  }

  return { rootDir, dryRun };
}

function normalizeKeyList(source: unknown): string[] {
  if (!Array.isArray(source)) {
    return [];
  }
  const normalized = source
    .map(entry => (typeof entry === 'string' ? entry : String(entry)))
    .map(entry => entry.trim())
    .filter(entry => entry.length > 0);
  return dedupeStrings(normalized);
}

function isLocalizedTagEntry(value: unknown): value is LocalizedTag {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const entry = value as LocalizedTag;
  return Boolean(entry.i18n && typeof entry.i18n.en === 'string' && typeof entry.i18n.uk === 'string');
}

function isTagEntryArray(value: unknown): value is LocalizedTag[] {
  return Array.isArray(value) && value.every(entry => isLocalizedTagEntry(entry));
}

async function collectMetaFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    let entries: Dirent[];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        continue;
      }
      throw error;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name === 'media-meta.json') {
        files.push(fullPath);
      }
    }
  }

  files.sort((a, b) => a.localeCompare(b, 'uk'));
  return files;
}

function buildReverseTranslationMap(entries: Map<string, string>): Map<string, string> {
  const reverse = new Map<string, string>();
  const collisions = new Set<string>();

  for (const [en, uk] of entries.entries()) {
    const ukKey = normalizeToken(uk);
    const enValue = en.trim();
    if (!ukKey || !enValue) {
      continue;
    }
    if (reverse.has(ukKey) && reverse.get(ukKey) !== enValue) {
      collisions.add(ukKey);
      continue;
    }
    reverse.set(ukKey, enValue);
  }

  for (const key of collisions) {
    reverse.delete(key);
  }

  return reverse;
}

async function loadTranslations(): Promise<Map<string, string>> {
  const raw = await fs.readFile(TAG_TRANSLATIONS_PATH, 'utf-8');
  const data = JSON.parse(raw) as Record<string, unknown>;
  const map = new Map<string, string>();
  for (const [key, value] of Object.entries(data)) {
    const normalizedKey = normalizeToken(key);
    if (!normalizedKey || typeof value !== 'string') {
      continue;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }
    map.set(normalizedKey, trimmed);
  }
  return map;
}

function resolveTranslation(map: Map<string, string>, tag: string): string {
  const normalized = normalizeToken(tag);
  if (!normalized) {
    throw new Error(`Порожній тег: "${tag}".`);
  }
  const translation = map.get(normalized);
  if (!translation) {
    throw new Error(`Відсутній переклад для тегу "${tag}".`);
  }
  return translation;
}

function extractLegacyTags(meta: MediaMetadata): { en: string[]; uk: string[] } {
  const tags = meta.i18n?.tags as LegacyTagList | LocalizedTag[] | undefined;
  if (isTagEntryArray(tags)) {
    const lists = extractTagLists(tags);
    return { en: lists.en, uk: lists.uk };
  }
  if (tags && typeof tags === 'object') {
    return {
      en: normalizeKeyList((tags as LegacyTagList).en),
      uk: normalizeKeyList((tags as LegacyTagList).uk),
    };
  }
  return { en: [], uk: [] };
}

function ensureKeywords(meta: MediaMetadata): { en: string[]; uk: string[] } {
  const keywords = meta.i18n?.keywords ?? {};
  return {
    en: normalizeKeyList(keywords.en),
    uk: normalizeKeyList(keywords.uk),
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const metaFiles = await collectMetaFiles(options.rootDir);
  if (metaFiles.length === 0) {
    console.log(`Не знайдено жодного media-meta.json у ${options.rootDir}.`);
    return;
  }

  const translations = await loadTranslations();
  const reverseMap = buildReverseTranslationMap(translations);

  const missingTranslations = new Map<string, number>();

  for (const metaPath of metaFiles) {
    const raw = await fs.readFile(metaPath, 'utf-8');
    const meta = JSON.parse(raw) as MediaMetadata;
    const tags = meta.i18n?.tags as unknown;
    if (isTagEntryArray(tags)) {
      continue;
    }

    const legacy = extractLegacyTags(meta);
    const normalized = moveCyrillicTokensToUk({ en: legacy.en, uk: legacy.uk });
    const mappedFromUk = normalized.uk
      .map(tag => reverseMap.get(normalizeToken(tag)))
      .filter((tag): tag is string => Boolean(tag));
    const uniqueEn = dedupeStrings([...normalized.en, ...mappedFromUk]);
    for (const tag of uniqueEn) {
      const normalized = normalizeToken(tag);
      if (!normalized) {
        continue;
      }
      if (!translations.has(normalized)) {
        missingTranslations.set(normalized, (missingTranslations.get(normalized) ?? 0) + 1);
      }
    }
  }

  if (missingTranslations.size > 0) {
    const sorted = Array.from(missingTranslations.entries()).sort((a, b) => b[1] - a[1]);
    const preview = sorted.slice(0, 20);
    console.error('Знайдено теги без перекладу. Спочатку доповніть translations/tag-translations.json.');
    for (const [tag, count] of preview) {
      console.error(`  ${tag} — ${count}`);
    }
    if (sorted.length > preview.length) {
      console.error(`  ...ще ${sorted.length - preview.length} тегів`);
    }
    process.exit(1);
  }

  let updated = 0;
  let skipped = 0;

  for (const metaPath of metaFiles) {
    const raw = await fs.readFile(metaPath, 'utf-8');
    const meta = JSON.parse(raw) as MediaMetadata;
    if (!meta.i18n) {
      skipped += 1;
      continue;
    }

    const tags = meta.i18n.tags as unknown;
    if (isTagEntryArray(tags)) {
      skipped += 1;
      continue;
    }

    const legacy = extractLegacyTags(meta);
    const normalized = moveCyrillicTokensToUk({ en: legacy.en, uk: legacy.uk });
    const mappedFromUk = normalized.uk
      .map(tag => reverseMap.get(normalizeToken(tag)))
      .filter((tag): tag is string => Boolean(tag));
    const uniqueEn = dedupeStrings([...normalized.en, ...mappedFromUk]);
    if (uniqueEn.length === 0) {
      skipped += 1;
      continue;
    }

    const resolve = (tag: string): string => resolveTranslation(translations, tag);
    const tagEntries = buildLocalizedTagEntries(uniqueEn, resolve);
    const tagLists = extractTagLists(tagEntries);

    const translatedUkSet = new Set(tagLists.uk.map(tag => normalizeToken(tag)));
    const extraUk = normalized.uk.filter(tag => !translatedUkSet.has(normalizeToken(tag)));

    const keywords = ensureKeywords(meta);
    const nextKeywordsUk = dedupeStrings([...keywords.uk, ...extraUk]);

    const nextMeta = {
      ...meta,
      i18n: {
        ...meta.i18n,
        tags: tagEntries,
        keywords: {
          en: keywords.en,
          uk: nextKeywordsUk,
        },
      },
    };

    if (!options.dryRun) {
      await fs.writeFile(metaPath, `${JSON.stringify(nextMeta, null, 2)}\n`, 'utf-8');
    }
    updated += 1;
  }

  console.log('Міграція тегів завершена.');
  console.log(`  Всього файлів: ${metaFiles.length}`);
  console.log(`  Оновлено: ${updated}`);
  console.log(`  Пропущено: ${skipped}`);
  if (options.dryRun) {
    console.log('  Режим dry-run: файли не змінені.');
  }
}

void main();
