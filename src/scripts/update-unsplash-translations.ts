import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { markMediaPendingForMetadata } from '../media-import/media-sync-state';

import { CUSTOM_IMAGES_ROOT, IMAGE_NAME_TRANSLATIONS_PATH, TAG_TRANSLATIONS_PATH } from '../config/paths';
import { MEDIA_META_FILE, findMediaDir, listCtrlvLibraryEntries, listCustomImageLibraryEntries, listLibraryEntries, listLummiLibraryEntries, listPexelsLibraryEntries, listUndrawLibraryEntries } from '../unsplash/library-paths';
import {
  createImageNameStore,
  createImageTagStore,
  filterBlacklistedTokens,
  readImageTagBlacklist,
  readImageTagKeyBlacklist,
  translateImageTags,
} from '../unsplash/translation-stores';
import type { MediaMetadata } from '../unsplash/import-utils';
import { excludeTokens } from '../i18n/utils';
import { buildLocalizedTagEntries, extractTagLists } from '../unsplash/tag-utils';
import { translateEnglishToUkrainian } from '../translation/deepl';

export type ImageTranslationOptions = {
  slugs?: string[];
  source?: 'ctrlv' | 'custom-images' | 'lummi' | 'pexels' | 'undraw' | 'unsplash';
  pendingOnly: boolean;
  translateMissing: boolean;
};

function dedupeStrings(values: string[], normalize: (value: string) => string = value => value): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const key = normalize(value);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(value);
  }
  return result;
}

function parseArgs(argv: string[]): ImageTranslationOptions {
  const slugs: string[] = [];
  let source: ImageTranslationOptions['source'];
  let pendingOnly = false;
  let translateMissing = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--slug' || arg === '-s') {
      const slug = argv[index + 1]?.trim();
      if (!slug) throw new Error('Після --slug вкажи media slug.');
      slugs.push(slug);
      index += 1;
    } else if (arg === '--source') {
      const value = argv[index + 1]?.trim().toLowerCase();
      if (value !== 'ctrlv' && value !== 'custom-images' && value !== 'lummi' && value !== 'pexels' && value !== 'undraw' && value !== 'unsplash') throw new Error('--source приймає ctrlv, custom-images, lummi, pexels, undraw або unsplash.');
      source = value;
      index += 1;
    } else if (arg === '--pending-only') {
      pendingOnly = true;
    } else if (arg === '--translate-missing') {
      translateMissing = true;
    } else if (arg === '--') {
      continue;
    } else if (arg === '--help' || arg === '-h') {
      showUsage();
      process.exit(0);
    } else if (arg.startsWith('--')) {
      throw new Error(`Невідомий аргумент "${arg}".`);
    } else {
      slugs.push(arg);
    }
  }
  if (pendingOnly && source !== 'ctrlv' && source !== 'custom-images' && source !== 'pexels' && source !== 'undraw') throw new Error('--pending-only доступний лише для ctrlv, custom-images, pexels або undraw.');
  return { slugs: slugs.length > 0 ? [...new Set(slugs)] : undefined, source, pendingOnly, translateMissing };
}

function showUsage(): void {
  console.log(
    [
      'Використання:',
      '  pnpm run images:update-translations [--slug <media-slug> ...] [--source <ctrlv|custom-images|lummi|pexels|undraw|unsplash> [--pending-only] [--translate-missing]]',
      '',
      'Оновлює CtrlV, unDraw, custom images, Unsplash та Pexels за останніми перекладами тегів і назв.',
      '--pending-only обмежує CtrlV/unDraw/custom images/Pexels записами, що чекають локалізації.',
      '--translate-missing перекладає лише відсутні значення і зберігає їх у спільних словниках.',
    ].join('\n')
  );
}

async function listMetaFiles(options: ImageTranslationOptions): Promise<string[]> {
  let entries: Array<{ slug: string; dir: string }>;
  if (options.slugs?.length) {
    entries = [];
    const sourceEntries = options.source === 'custom-images'
      ? await listCustomImageLibraryEntries()
      : options.source === 'lummi'
        ? await listLummiLibraryEntries()
        : [];
    const sourceBySlug = new Map(sourceEntries.map(entry => [entry.slug, entry]));
    for (const slug of options.slugs) {
      const located = options.source === 'custom-images' || options.source === 'lummi' ? sourceBySlug.get(slug) : await findMediaDir(slug);
      if (!located) throw new Error(`Не знайдено медіа для slug "${slug}".`);
      entries.push({ slug, dir: located.dir });
    }
  } else {
    const libraryEntries = options.source === 'ctrlv'
      ? await listCtrlvLibraryEntries()
      : options.source === 'undraw'
      ? await listUndrawLibraryEntries()
      : options.source === 'custom-images'
      ? await listCustomImageLibraryEntries()
      : options.source === 'pexels'
      ? await listPexelsLibraryEntries()
      : options.source === 'lummi'
      ? await listLummiLibraryEntries()
      : options.source === 'unsplash'
        ? await listLibraryEntries()
        : [...await listLibraryEntries(), ...await listPexelsLibraryEntries(), ...await listLummiLibraryEntries(), ...await listCtrlvLibraryEntries(), ...await listUndrawLibraryEntries(), ...await listCustomImageLibraryEntries()];
    entries = libraryEntries.map(({ slug, dir }) => ({ slug, dir }));
  }

  const files: string[] = [];
  for (const entry of entries) {
    const filePath = path.join(entry.dir, MEDIA_META_FILE);
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      const metadata = JSON.parse(raw) as MediaMetadata;
      if (options.source === 'pexels' && metadata.sourceName !== 'Pexels') {
        if (options.slugs?.length) throw new Error(`Slug "${entry.slug}" не належить Pexels.`);
        continue;
      }
      if (options.source === 'lummi' && metadata.sourceName !== 'Lummi') {
        if (options.slugs?.length) throw new Error(`Slug "${entry.slug}" не належить Lummi.`);
        continue;
      }
      if (options.source === 'ctrlv' && metadata.sourceName !== 'CtrlV') {
        if (options.slugs?.length) throw new Error(`Slug "${entry.slug}" не належить CtrlV.`);
        continue;
      }
      if (options.source === 'undraw' && metadata.sourceName !== 'unDraw') {
        if (options.slugs?.length) throw new Error(`Slug "${entry.slug}" не належить unDraw.`);
        continue;
      }
      if (options.source === 'unsplash' && metadata.sourceName !== 'Unsplash') {
        if (options.slugs?.length) throw new Error(`Slug "${entry.slug}" не належить Unsplash.`);
        continue;
      }
      if (options.source === 'custom-images' && !entry.dir.startsWith(path.resolve(CUSTOM_IMAGES_ROOT) + path.sep)) {
        if (options.slugs?.length) throw new Error(`Slug "${entry.slug}" не належить custom images.`);
        continue;
      }
      if (options.pendingOnly && metadata.taggingStatus !== 'pending') continue;
      files.push(filePath);
    } catch {
      if (options.slugs?.length) throw new Error(`Не вдалося прочитати media-meta.json для "${entry.slug}".`);
    }
  }
  return files;
}

function normalizeKeyList(source: unknown): string[] {
  if (!Array.isArray(source)) {
    return [];
  }
  const normalized = source
    .map(entry => (typeof entry === 'string' ? entry : String(entry)))
    .map(entry => entry.trim())
    .filter(entry => entry.length > 0);
  return Array.from(new Set(normalized));
}

function extractTagsEn(meta: MediaMetadata): string[] {
  const tags = meta.i18n?.tags as unknown;
  if (Array.isArray(tags)) {
    const values = tags
      .map(entry => (typeof entry === 'object' && entry ? (entry as { i18n?: { en?: string } }).i18n?.en : undefined))
      .filter((value): value is string => Boolean(value));
    return normalizeKeyList(values);
  }
  if (tags && typeof tags === 'object') {
    return normalizeKeyList((tags as { en?: unknown }).en);
  }
  return [];
}

type TranslationDictionary = Record<string, string>;

function dictionaryHas(dictionary: TranslationDictionary, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(dictionary, key);
}

async function readTranslationDictionary(filePath: string): Promise<TranslationDictionary> {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf-8')) as TranslationDictionary;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

async function writeTranslationDictionary(
  filePath: string,
  dictionary: TranslationDictionary
): Promise<void> {
  const sorted = Object.fromEntries(Object.entries(dictionary).sort(([left], [right]) => left.localeCompare(right, 'en')));
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(temporaryPath, `${JSON.stringify(sorted, null, 2)}\n`, 'utf-8');
  await fs.rename(temporaryPath, filePath);
}

function normalizeEnglishTags(
  meta: MediaMetadata,
  tagBlacklist: Set<string>,
  tagKeyBlacklist: Set<string>
): string[] {
  const existingTagsEn = filterBlacklistedTokens(extractTagsEn(meta), tagKeyBlacklist, tagBlacklist);
  const existingKeywordsEn = normalizeKeyList(meta.i18n?.keywords?.en ?? []);
  return filterBlacklistedTokens(
    dedupeStrings([...existingTagsEn, ...existingKeywordsEn], value => value.toLocaleLowerCase('en')),
    tagKeyBlacklist,
    tagBlacklist
  );
}

async function translateMissingImageMetadata(
  metaFiles: string[],
  tagBlacklist: Set<string>,
  tagKeyBlacklist: Set<string>
): Promise<{ translatedTexts: number; translatedAltFields: number }> {
  const [tagDictionary, nameDictionary] = await Promise.all([
    readTranslationDictionary(TAG_TRANSLATIONS_PATH),
    readTranslationDictionary(IMAGE_NAME_TRANSLATIONS_PATH),
  ]);
  let tagDictionaryChanged = false;
  let nameDictionaryChanged = false;
  const missingTexts = new Set<string>();
  const missingNames = new Map<string, string>();
  const missingTags = new Map<string, string>();
  const records: Array<{ filePath: string; metadata: MediaMetadata }> = [];

  for (const filePath of metaFiles) {
    const metadata = JSON.parse(await fs.readFile(filePath, 'utf-8')) as MediaMetadata;
    records.push({ filePath, metadata });
    const slug = metadata.slug || path.basename(path.dirname(filePath));
    const nameEn = metadata.i18n?.name?.en?.trim() || slug;
    const nameUk = metadata.i18n?.name?.uk?.trim();
    if (!dictionaryHas(nameDictionary, slug) && (!nameUk || nameUk === nameEn)) {
      missingNames.set(slug, nameEn);
      missingTexts.add(nameEn);
    }

    const altEn = metadata.i18n?.alt?.en?.trim() || nameEn;
    const altUk = metadata.i18n?.alt?.uk?.trim();
    const storedNameTranslation = nameDictionary[slug]?.trim();
    const canReuseNameTranslation = altEn === nameEn
      && dictionaryHas(nameDictionary, slug)
      && Boolean(storedNameTranslation);
    if ((!altUk || altUk === altEn) && !canReuseNameTranslation) {
      missingTexts.add(altEn);
    }

    for (const tagEn of normalizeEnglishTags(metadata, tagBlacklist, tagKeyBlacklist)) {
      if (dictionaryHas(tagDictionary, tagEn)) {
        continue;
      }
      const existingTag = metadata.i18n.tags.find(
        entry => entry.i18n.en.trim().toLocaleLowerCase('en') === tagEn.toLocaleLowerCase('en')
      );
      const existingTagUk = existingTag?.i18n.uk.trim();
      if (existingTagUk && existingTagUk !== existingTag?.i18n.en.trim()) {
        tagDictionary[tagEn] = existingTagUk;
        tagDictionaryChanged = true;
      } else {
        missingTags.set(tagEn, tagEn);
        missingTexts.add(tagEn);
      }
    }
  }

  const texts = [...missingTexts];
  const results = await translateEnglishToUkrainian(texts);
  const translatedByEnglish = new Map(texts.map((text, index) => [text, results[index]]));

  for (const [slug, source] of missingNames) {
    const translation = translatedByEnglish.get(source);
    if (!translation) throw new Error(`DeepL не повернув переклад назви для "${slug}".`);
    nameDictionary[slug] = translation;
    nameDictionaryChanged = true;
  }
  for (const [tag, source] of missingTags) {
    const translation = translatedByEnglish.get(source);
    if (!translation) throw new Error(`DeepL не повернув переклад тегу "${tag}".`);
    tagDictionary[tag] = translation;
    tagDictionaryChanged = true;
  }

  await Promise.all([
    tagDictionaryChanged ? writeTranslationDictionary(TAG_TRANSLATIONS_PATH, tagDictionary) : Promise.resolve(),
    nameDictionaryChanged ? writeTranslationDictionary(IMAGE_NAME_TRANSLATIONS_PATH, nameDictionary) : Promise.resolve(),
  ]);

  let translatedAltFields = 0;
  for (const { filePath, metadata } of records) {
    const slug = metadata.slug || path.basename(path.dirname(filePath));
    const nameEn = metadata.i18n?.name?.en?.trim() || slug;
    const altEn = metadata.i18n?.alt?.en?.trim() || metadata.i18n.name.en;
    const altUk = metadata.i18n?.alt?.uk?.trim();
    if (!altUk || altUk === altEn) {
      const translation = altEn === nameEn
        ? nameDictionary[slug] ?? translatedByEnglish.get(altEn)
        : translatedByEnglish.get(altEn);
      if (translation) {
        metadata.i18n.alt.uk = translation;
        translatedAltFields += 1;
      }
    }
    if (metadata.i18n.alt.uk === altUk) {
      continue;
    }
    const serialized = `${JSON.stringify(metadata, null, 2)}\n`;
    const temporaryPath = `${filePath}.${process.pid}.tmp`;
    await fs.writeFile(temporaryPath, serialized, 'utf-8');
    await fs.rename(temporaryPath, filePath);
  }

  return { translatedTexts: texts.length, translatedAltFields };
}

async function processMetaFile(
  filePath: string,
  nameStore: Awaited<ReturnType<typeof createImageNameStore>>,
  tagStore: Awaited<ReturnType<typeof createImageTagStore>>,
  tagBlacklist: Set<string>,
  tagKeyBlacklist: Set<string>
): Promise<boolean> {
  const raw = await fs.readFile(filePath, 'utf-8');
  const meta = JSON.parse(raw) as MediaMetadata;
  const slug = meta.slug || path.basename(path.dirname(filePath));
  if (!meta.i18n) {
    return false;
  }
  const existingTagsEn = filterBlacklistedTokens(extractTagsEn(meta), tagKeyBlacklist, tagBlacklist);
  const existingKeywordsEn = normalizeKeyList(meta.i18n.keywords?.en ?? []);
  const baseTokens = existingKeywordsEn.length > 0 ? existingKeywordsEn : existingTagsEn;
  if (baseTokens.length === 0 && !nameStore.get(slug)) {
    return false;
  }

  const tagCandidates = filterBlacklistedTokens(baseTokens, tagKeyBlacklist, tagBlacklist);
  const resolveTagTranslation = (tag: string): string => {
    const translation = tagStore.get(tag);
    if (!translation) {
      throw new Error(`Відсутній переклад для тегу \"${tag}\".`);
    }
    return translation;
  };
  const translatedName = nameStore.resolve(slug, meta.i18n.name?.uk ?? slug);
  const nextTagsEn = existingTagsEn.length > 0 ? existingTagsEn : tagCandidates;
  const tagEntries = buildLocalizedTagEntries(nextTagsEn, resolveTagTranslation);
  const normalizedTags = extractTagLists(tagEntries);
  const keywordSourceTokens = filterBlacklistedTokens(baseTokens, tagKeyBlacklist, tagBlacklist);
  const keywordTranslations = translateImageTags(keywordSourceTokens, tagStore);
  const nextKeywordsUk = excludeTokens(
    dedupeStrings(keywordTranslations, value => value.toLowerCase()),
    normalizedTags.uk
  );
  const nextKeywordsEn = excludeTokens(
    dedupeStrings(keywordSourceTokens, value => value.toLowerCase()),
    normalizedTags.en
  );
  const mediaKey = meta.mediaKey ?? randomUUID();
  const updated: MediaMetadata = {
    ...meta,
    slug,
    mediaKey,
    sourceName: meta.sourceName ?? 'Unsplash',
    i18n: {
      ...meta.i18n,
      name: { en: meta.i18n.name?.en ?? slug, uk: translatedName },
      alt: {
        en: meta.i18n.alt?.en ?? meta.i18n.name?.en ?? slug,
        uk: meta.i18n.alt?.uk === meta.i18n.alt?.en ? translatedName : (meta.i18n.alt?.uk ?? translatedName),
      },
      tags: tagEntries,
      keywords: { en: nextKeywordsEn, uk: nextKeywordsUk },
    },
    ...(meta.taggingStatus !== undefined && nextTagsEn.length > 0
      ? { taggingStatus: 'complete' as const }
      : {}),
  };

  const serialized = `${JSON.stringify(updated, null, 2)}\n`;
  const previous = raw.endsWith('\n') ? raw : `${raw}\n`;
  if (serialized === previous) {
    return false;
  }
  await fs.writeFile(filePath, serialized, 'utf-8');
  await markMediaPendingForMetadata(filePath, 'metadata');
  return true;
}

export async function updateImageTranslations(options: ImageTranslationOptions): Promise<void> {
  const metaFiles = await listMetaFiles(options);
  if (metaFiles.length === 0) {
    console.log('Не знайдено жодного media-meta.json для оновлення.');
    return;
  }

  const [tagBlacklist, tagKeyBlacklist] = await Promise.all([
    readImageTagBlacklist(),
    readImageTagKeyBlacklist(),
  ]);
  if (options.translateMissing) {
    const summary = await translateMissingImageMetadata(metaFiles, tagBlacklist, tagKeyBlacklist);
    console.log(`DeepL переклав ${summary.translatedTexts} унікальних текстів; оновлено alt для ${summary.translatedAltFields} записів.`);
  }

  const [tagStore, nameStore] = await Promise.all([
    createImageTagStore(),
    createImageNameStore(),
  ]);

  let updatedCount = 0;
  for (const filePath of metaFiles) {
    const updated = await processMetaFile(filePath, nameStore, tagStore, tagBlacklist, tagKeyBlacklist);
    if (updated) {
      updatedCount += 1;
      console.log(`Оновлено ${filePath}`);
    }
  }

  await Promise.all([tagStore.writeMissingRecords(), nameStore.writeMissingRecords()]);
  console.log(`Готово. Оновлено файлів: ${updatedCount}/${metaFiles.length}.`);
}

async function main(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));
    await updateImageTranslations(options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Помилка: ${message}`);
    showUsage();
    process.exit(1);
  }
}

if (require.main === module) {
  void main();
}
