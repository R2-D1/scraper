import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import {
  ICONIFY_LIBRARY_ROOT,
  IMAGE_NAME_TRANSLATIONS_PATH,
  TAG_TRANSLATIONS_PATH,
} from "../config/paths";
import {
  findMediaDir,
  listLibraryEntries,
  MEDIA_META_FILE,
} from "../unsplash/library-paths";
import type {
  DownloadSource,
  MediaMetadata,
  Tier,
} from "../unsplash/import-utils";
import { buildCategory } from "../unsplash/import-utils";
import {
  buildReverseTranslationMap,
  dedupeStrings,
  excludeTokens,
  humanizeKey,
  normalizeToken,
  splitTokens,
} from "../i18n/utils";
import {
  buildLocalizedTagEntries,
  extractTagLists,
} from "../unsplash/tag-utils";

type CliOptions = {
  scope: "all" | "unsplash" | "icons";
  limit?: number;
  dryRun: boolean;
  slug?: string;
  collection?: string;
};

type LegacyMediaMetadata = {
  slug?: string;
  mediaKey?: string;
  name?: string;
  category?: string;
  source?: string;
  sourceName?: string;
  authorName?: string;
  authorUrl?: string;
  description?: string;
  keys?: string[];
  tags?: string[];
  licenseName?: string;
  licenseUrl?: string;
  tier?: Tier;
  downloadSource?: DownloadSource;
  width?: number;
  height?: number;
  i18n?: MediaMetadata["i18n"];
};

type IconLegacyEntry = {
  mediaKey?: string;
  name?: string;
  keys?: string[];
  i18n?: {
    name?: { en?: string; uk?: string };
    alt?: { en?: string; uk?: string };
    tags?: { en?: string[]; uk?: string[] };
    keywords?: { en?: string[]; uk?: string[] };
  };
};

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_SOURCE_NAME = "Unsplash";
const DEFAULT_LICENSE_NAME = "Unsplash License";
const DEFAULT_LICENSE_URL = "https://unsplash.com/license";

function parseArgs(argv: string[]): CliOptions {
  let scope: CliOptions["scope"] = "all";
  let limit: number | undefined;
  let dryRun = false;
  let slug: string | undefined;
  let collection: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") {
      continue;
    }
    if (arg === "--scope") {
      const value = argv[index + 1];
      if (!value || !["all", "unsplash", "icons"].includes(value)) {
        throw new Error("Потрібно вказати --scope all|unsplash|icons.");
      }
      scope = value as CliOptions["scope"];
      index += 1;
      continue;
    }
    if (arg === "--slug") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Потрібно вказати --slug <media-slug>.");
      }
      slug = value;
      index += 1;
      continue;
    }
    if (arg === "--collection") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Потрібно вказати --collection <slug>.");
      }
      collection = value;
      index += 1;
      continue;
    }
    if (arg === "--limit") {
      const raw = argv[index + 1];
      const parsed = raw ? Number(raw) : Number.NaN;
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`Невалідне значення --limit: "${raw}".`);
      }
      limit = Math.trunc(parsed);
      index += 1;
      continue;
    }
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      showUsage();
      process.exit(0);
    }
    if (arg.startsWith("--")) {
      throw new Error(`Невідомий аргумент "${arg}".`);
    }
  }

  return { scope, limit, dryRun, slug, collection };
}

function showUsage(): void {
  console.log(
    [
      "Використання:",
      "  pnpm run library:migrate-i18n [--scope all|unsplash|icons] [--limit <n>] [--slug <media-slug>] [--collection <slug>] [--dry-run]",
      "",
      "Перезаписує метадані у формат i18n (en/uk) прямо в бібліотеці.",
      "  --scope     Що мігрувати (за замовчуванням all).",
      "  --limit     Ліміт на кількість Unsplash записів (для тесту).",
      "  --slug      Мігрувати лише конкретний Unsplash slug.",
      "  --collection Мігрувати лише одну колекцію іконок.",
      "  --dry-run   Не записувати файли, лише звіт.",
    ].join("\n"),
  );
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

function buildTagEntriesFromLegacy(
  rawTags: string[],
  tagTranslations: Record<string, string>,
  reverseTagMap: Map<string, string>,
): ReturnType<typeof buildLocalizedTagEntries> {
  const tagsEn: string[] = [];
  const tagsUk: string[] = [];

  for (const tag of rawTags) {
    const value = tag.trim();
    if (!value) {
      continue;
    }
    const hasCyrillic = /[А-Яа-яЁёІіЇїЄєҐґ]/.test(value);
    const hasLatin = /[A-Za-z]/.test(value);
    if (hasLatin) {
      tagsEn.push(value);
      const translated = tagTranslations[normalizeToken(value)];
      if (translated) {
        tagsUk.push(translated);
      }
    }
    if (hasCyrillic) {
      tagsUk.push(value);
    }
    if (!hasLatin && !hasCyrillic) {
      tagsEn.push(value);
      tagsUk.push(value);
    }
  }

  for (const tag of tagsUk) {
    const mapped = reverseTagMap.get(normalizeToken(tag));
    if (mapped) {
      tagsEn.push(mapped);
    }
  }

  const normalizedEn = dedupeStrings(tagsEn);
  const resolveTranslation = (tag: string): string => {
    const translation = tagTranslations[normalizeToken(tag)];
    if (!translation) {
      throw new Error(`Відсутній переклад для тегу \"${tag}\".`);
    }
    return translation;
  };
  return buildLocalizedTagEntries(normalizedEn, resolveTranslation);
}

async function migrateUnsplash(options: CliOptions): Promise<void> {
  const entries = options.slug
    ? (() => {
        return findMediaDir(options.slug).then((found) =>
          found
            ? [
                {
                  slug: options.slug ?? found.dir,
                  dir: found.dir,
                  kind: found.kind,
                },
              ]
            : [],
        );
      })()
    : listLibraryEntries();
  const resolvedEntries = await entries;
  const nameTranslations = await readJson<Record<string, string>>(
    IMAGE_NAME_TRANSLATIONS_PATH,
    {},
  );
  const tagTranslations = await readJson<Record<string, string>>(
    TAG_TRANSLATIONS_PATH,
    {},
  );
  const reverseTagMap = buildReverseTranslationMap(tagTranslations);

  let processed = 0;
  let updated = 0;
  let skipped = 0;

  for (const entry of resolvedEntries) {
    if (entry.kind === "video") {
      continue;
    }
    if (options.limit && processed >= options.limit) {
      break;
    }
    const metaPath = path.join(entry.dir, MEDIA_META_FILE);
    let raw: string;
    try {
      raw = await fs.readFile(metaPath, "utf-8");
    } catch {
      continue;
    }

    processed += 1;
    const legacy = JSON.parse(raw) as LegacyMediaMetadata;
    if (legacy.i18n) {
      skipped += 1;
      continue;
    }

    const kind = entry.kind === "legacy" ? "image" : entry.kind;
    const slug = legacy.slug?.trim() || entry.slug;
    const mediaKey = legacy.mediaKey ?? randomUUID();
    const nameUk =
      legacy.name?.trim() || nameTranslations[slug] || humanizeKey(slug);
    const nameEn = legacy.description?.trim() || humanizeKey(slug);
    const tagEntries = buildTagEntriesFromLegacy(
      Array.isArray(legacy.tags) ? legacy.tags : [],
      tagTranslations,
      reverseTagMap,
    );
    const tagLists = extractTagLists(tagEntries);
    const keywordTokens = splitTokens(
      Array.isArray(legacy.keys) ? legacy.keys : [],
    );
    const keywordsEn = excludeTokens(keywordTokens.en, tagLists.en);
    const keywordsUk = excludeTokens(keywordTokens.uk, tagLists.uk);

    if (!legacy.source) {
      skipped += 1;
      continue;
    }

    const next: MediaMetadata = {
      slug,
      mediaKey,
      pinned: false,
      i18n: {
        name: { en: nameEn, uk: nameUk },
        alt: { en: nameEn, uk: nameUk },
        tags: tagEntries,
        keywords: { en: keywordsEn, uk: keywordsUk },
      },
      category: buildCategory(kind),
      source: legacy.source,
      sourceName: legacy.sourceName ?? DEFAULT_SOURCE_NAME,
      authorName: legacy.authorName,
      authorUrl: legacy.authorUrl,
      description: legacy.description ?? undefined,
      licenseName: legacy.licenseName ?? DEFAULT_LICENSE_NAME,
      licenseUrl: legacy.licenseUrl ?? DEFAULT_LICENSE_URL,
      tier: legacy.tier ?? "free",
      downloadSource: legacy.downloadSource ?? "downloads",
      width: legacy.width,
      height: legacy.height,
    };

    if (!options.dryRun) {
      await fs.writeFile(
        metaPath,
        `${JSON.stringify(next, null, 2)}\n`,
        "utf-8",
      );
    }
    updated += 1;
  }

  console.log(
    [
      "Unsplash:",
      `  Оброблено: ${processed}`,
      `  Оновлено: ${updated}`,
      `  Пропущено: ${skipped}`,
    ].join("\n"),
  );
}

async function migrateIcons(options: CliOptions): Promise<void> {
  let processed = 0;
  let updated = 0;
  let skipped = 0;

  const collections = await fs.readdir(ICONIFY_LIBRARY_ROOT, {
    withFileTypes: true,
  });
  for (const entry of collections) {
    if (!entry.isDirectory()) {
      continue;
    }
    if (options.collection && entry.name !== options.collection) {
      continue;
    }
    const collectionDir = path.join(ICONIFY_LIBRARY_ROOT, entry.name);
    const iconsPath = path.join(collectionDir, "icons.json");

    let raw: string;
    try {
      raw = await fs.readFile(iconsPath, "utf-8");
    } catch {
      continue;
    }

    const parsed = JSON.parse(raw) as Record<string, IconLegacyEntry>;
    const keys = Object.keys(parsed).sort((a, b) => a.localeCompare(b, "en"));
    const next: Record<string, IconLegacyEntry> = {};
    let changed = false;

    for (const iconKey of keys) {
      const entryData = parsed[iconKey];
      processed += 1;
      if (entryData?.i18n) {
        next[iconKey] = entryData;
        skipped += 1;
        continue;
      }

      const nameEn = humanizeKey(iconKey);
      const nameUk = entryData?.name?.trim() || nameEn;
      const tokenSource = dedupeStrings([...(entryData?.keys ?? []), iconKey]);
      const tokens = splitTokens(tokenSource);
      next[iconKey] = {
        mediaKey: entryData?.mediaKey ?? randomUUID(),
        i18n: {
          name: { en: nameEn, uk: nameUk },
          alt: { en: nameEn, uk: nameUk },
          tags: { en: [], uk: [] },
          keywords: tokens,
        },
      };
      updated += 1;
      changed = true;
    }

    if (changed && !options.dryRun) {
      await fs.writeFile(
        iconsPath,
        `${JSON.stringify(next, null, 2)}\n`,
        "utf-8",
      );
    }
  }

  console.log(
    [
      "Iconify:",
      `  Оброблено: ${processed}`,
      `  Оновлено: ${updated}`,
      `  Пропущено: ${skipped}`,
    ].join("\n"),
  );
}

async function main(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));

    if (options.scope === "all" || options.scope === "unsplash") {
      await migrateUnsplash(options);
    }
    if (options.scope === "all" || options.scope === "icons") {
      await migrateIcons(options);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Помилка: ${message}`);
    showUsage();
    process.exit(1);
  }
}

void main();
