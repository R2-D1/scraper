import { promises as fs } from "node:fs";
import path from "node:path";
import { createWriteStream } from "node:fs";

import {
  ICONIFY_LIBRARY_ROOT,
  IMAGE_NAME_TRANSLATIONS_PATH,
} from "../config/paths";
import {
  listLibraryEntries,
  listCtrlvLibraryEntries,
  listUndrawLibraryEntries,
  listCustomImageLibraryEntries,
  listPexelsLibraryEntries,
  listLummiLibraryEntries,
  MEDIA_META_FILE,
} from "../unsplash/library-paths";
import type { MediaMetadata } from "../unsplash/import-utils";
import { extractTagLists } from "../unsplash/tag-utils";

type CliOptions = {
  outPath: string;
  limit?: number;
};

type ExportRecord = {
  mediaKey: string;
  source: "ctrlv" | "undraw" | "custom-images" | "unsplash" | "pexels" | "lummi" | "iconify";
  kind: "image" | "illustration" | "video" | "icon";
  slug?: string;
  iconKey?: string;
  collectionKey?: string;
  name_en: string;
  name_uk: string;
  alt_en: string;
  alt_uk: string;
  tags_en: string[];
  tags_uk: string[];
  keywords_en: string[];
  keywords_uk: string[];
  category_key: string;
  category_en?: string;
  category_uk?: string;
  source_url?: string;
  author_name?: string;
  author_url?: string;
  license_name?: string;
  license_url?: string;
};

type NameOverride = {
  key: string;
  value: string;
};

const CYRILLIC_RE = /[А-Яа-яЁёІіЇїЄєҐґ]/;
const LATIN_RE = /[A-Za-z]/;
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_OUTPUT_PATH = path.join(
  PROJECT_ROOT,
  "tmp",
  "i18n-library.jsonl",
);
const EN_CATEGORY_BY_KIND: Record<ExportRecord["kind"], string> = {
  icon: "Icons",
  image: "Images",
  illustration: "Illustrations",
  video: "Videos",
};
const UK_CATEGORY_BY_KIND: Record<ExportRecord["kind"], string> = {
  icon: "Іконки",
  image: "Зображення",
  illustration: "Ілюстрації",
  video: "Відео",
};

function parseArgs(argv: string[]): CliOptions {
  let outPath = DEFAULT_OUTPUT_PATH;
  let limit: number | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--out" || arg === "-o") {
      outPath = argv[index + 1];
      index += 1;
    } else if (arg === "--limit" || arg === "-l") {
      const raw = argv[index + 1];
      const parsed = raw ? Number(raw) : Number.NaN;
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`Невалідне значення --limit: "${raw}".`);
      }
      limit = Math.trunc(parsed);
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      showUsage();
      process.exit(0);
    } else if (arg === "--") {
      continue;
    } else if (arg.startsWith("--")) {
      throw new Error(`Невідомий аргумент "${arg}".`);
    }
  }

  return { outPath, limit };
}

function showUsage(): void {
  console.log(
    [
      "Використання:",
      "  pnpm run library:build-i18n [--out <path>] [--limit <n>]",
      "",
      "Збирає єдину двомовну базу для іконок і Unsplash (en/uk) у форматі JSONL.",
      `За замовчуванням: ${DEFAULT_OUTPUT_PATH}`,
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

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const key = normalizeToken(value);
    if (key.length === 0 || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(value);
  }
  return result;
}

function splitTokens(tokens: string[]): { en: string[]; uk: string[] } {
  const en: string[] = [];
  const uk: string[] = [];

  for (const token of tokens) {
    const trimmed = token.trim();
    if (!trimmed) {
      continue;
    }
    const hasCyr = CYRILLIC_RE.test(trimmed);
    const hasLat = LATIN_RE.test(trimmed);
    if (hasCyr) {
      uk.push(trimmed);
    } else if (hasLat) {
      en.push(trimmed);
    } else {
      en.push(trimmed);
      uk.push(trimmed);
    }
  }

  return { en: dedupeStrings(en), uk: dedupeStrings(uk) };
}

function stripTrailingId(slug: string): string {
  const parts = slug.split("-");
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
  return parts.slice(0, -1).join("-");
}

function humanizeKey(value: string): string {
  const normalized = stripTrailingId(value)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) {
    return value;
  }
  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
}

function buildReverseTagMap(
  entries: Record<string, string>,
): Map<string, string> {
  const reverse = new Map<string, string>();
  const collisions = new Set<string>();

  for (const [en, uk] of Object.entries(entries)) {
    const ukKey = normalizeToken(uk);
    const enValue = en.trim();
    if (!ukKey || !enValue) {
      continue;
    }
    if (reverse.has(ukKey) && reverse.get(ukKey) !== enValue) {
      collisions.add(ukKey);
    } else if (!reverse.has(ukKey)) {
      reverse.set(ukKey, enValue);
    }
  }

  for (const ukKey of collisions) {
    reverse.delete(ukKey);
  }

  return reverse;
}

async function ensureDir(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

async function loadEnglishNameOverrides(): Promise<Map<string, string>> {
  const overridePath = path.join(
    PROJECT_ROOT,
    "tmp",
    "part-0005-missing-latin.json",
  );
  const raw = await readJson<NameOverride[]>(overridePath, []);
  const map = new Map<string, string>();
  for (const entry of raw) {
    if (
      !entry ||
      typeof entry.key !== "string" ||
      typeof entry.value !== "string"
    ) {
      continue;
    }
    const key = entry.key.trim();
    const value = entry.value.trim();
    if (!key || !value) {
      continue;
    }
    map.set(key, value);
  }
  return map;
}

async function buildUnsplashRecords(
  writer: NodeJS.WritableStream,
  options: { limit?: number },
): Promise<{ count: number; fallbackEn: number }> {
  const entries = [
    ...(await listLibraryEntries()).map((entry) => ({
      ...entry,
      source: "unsplash" as const,
    })),
    ...(await listPexelsLibraryEntries()).map((entry) => ({
      ...entry,
      source: "pexels" as const,
    })),
    ...(await listLummiLibraryEntries()).map((entry) => ({
      ...entry,
      source: "lummi" as const,
    })),
    ...(await listCtrlvLibraryEntries()).map((entry) => ({
      ...entry,
      source: "ctrlv" as const,
    })),
    ...(await listUndrawLibraryEntries()).map((entry) => ({
      ...entry,
      source: "undraw" as const,
    })),
    ...(await listCustomImageLibraryEntries()).map((entry) => ({
      ...entry,
      source: "custom-images" as const,
    })),
  ];
  const nameTranslations = await readJson<Record<string, string>>(
    IMAGE_NAME_TRANSLATIONS_PATH,
    {},
  );
  const englishNameOverrides = await loadEnglishNameOverrides();
  let count = 0;
  let fallbackEn = 0;

  for (const entry of entries) {
    if (options.limit && count >= options.limit) {
      break;
    }
    const metaPath = path.join(entry.dir, MEDIA_META_FILE);
    try {
      const raw = await fs.readFile(metaPath, "utf-8");
      const meta = JSON.parse(raw) as MediaMetadata;
      if (!meta.mediaKey || !meta.slug) {
        continue;
      }
      if (meta.taggingStatus === "pending") {
        continue;
      }

      const slug = meta.slug.trim() || entry.slug;
      const nameOverride = englishNameOverrides.get(slug);
      const nameEn = meta.i18n?.name?.en ?? nameOverride ?? humanizeKey(slug);
      const nameUk = meta.i18n?.name?.uk ?? nameTranslations[slug] ?? slug;
      if (!nameOverride) {
        fallbackEn += 1;
      }

      const tagLists = extractTagLists(meta.i18n?.tags);
      const tagsEn = tagLists.en;
      const tagsUk = tagLists.uk;
      const keywordsEn = meta.i18n?.keywords?.en ?? [];
      const keywordsUk = meta.i18n?.keywords?.uk ?? [];

      const kind = entry.kind === "legacy" ? "image" : entry.kind;
      const record: ExportRecord = {
        mediaKey: meta.mediaKey,
        source: entry.source,
        kind,
        slug,
        name_en: nameEn,
        name_uk: nameUk,
        alt_en: nameEn,
        alt_uk: nameUk,
        tags_en: tagsEn,
        tags_uk: tagsUk,
        keywords_en: keywordsEn,
        keywords_uk: keywordsUk,
        category_key: meta.category?.key ?? kind,
        category_en: EN_CATEGORY_BY_KIND[kind],
        category_uk: meta.category?.uk ?? UK_CATEGORY_BY_KIND[kind],
        source_url: meta.source,
        author_name: meta.authorName,
        author_url: meta.authorUrl,
        license_name: meta.licenseName,
        license_url: meta.licenseUrl,
      };

      writer.write(`${JSON.stringify(record)}\n`);
      count += 1;
    } catch {
      // skip invalid meta files
    }
  }

  return { count, fallbackEn };
}

async function buildIconRecords(
  writer: NodeJS.WritableStream,
  options: { limit?: number; offset: number },
): Promise<{ count: number; fallbackEn: number }> {
  const collections = await fs.readdir(ICONIFY_LIBRARY_ROOT, {
    withFileTypes: true,
  });
  let count = 0;
  let fallbackEn = 0;

  for (const entry of collections) {
    if (!entry.isDirectory()) {
      continue;
    }
    if (options.limit && options.offset + count >= options.limit) {
      break;
    }
    const collectionKey = entry.name;
    const collectionDir = path.join(ICONIFY_LIBRARY_ROOT, collectionKey);
    const iconsPath = path.join(collectionDir, "icons.json");
    const collectionMetaPath = path.join(collectionDir, "collection-meta.json");

    let icons: Record<
      string,
      {
        mediaKey?: string;
        i18n?: {
          name?: { en?: string; uk?: string };
          alt?: { en?: string; uk?: string };
          tags?: { en?: string[]; uk?: string[] };
          keywords?: { en?: string[]; uk?: string[] };
        };
      }
    > = {};
    let collectionMeta: { name?: string; source?: string } = {};
    try {
      const raw = await fs.readFile(iconsPath, "utf-8");
      icons = JSON.parse(raw) as Record<
        string,
        { name?: string; mediaKey?: string; keys?: string[] }
      >;
    } catch {
      continue;
    }
    try {
      const rawMeta = await fs.readFile(collectionMetaPath, "utf-8");
      collectionMeta = JSON.parse(rawMeta) as {
        name?: string;
        source?: string;
      };
    } catch {
      collectionMeta = {};
    }

    for (const [iconKey, iconData] of Object.entries(icons)) {
      if (options.limit && options.offset + count >= options.limit) {
        break;
      }
      if (!iconData?.mediaKey) {
        continue;
      }
      if (!iconData.mediaKey) {
        continue;
      }
      const nameEn = iconData.i18n?.name?.en ?? humanizeKey(iconKey);
      const nameUk = iconData.i18n?.name?.uk ?? humanizeKey(iconKey);
      if (!iconData.i18n?.name?.en) {
        fallbackEn += 1;
      }

      const keyGroups = iconData.i18n?.keywords ?? { en: [], uk: [] };
      const keywordsEn = Array.isArray(keyGroups.en) ? keyGroups.en : [];
      const keywordsUk = Array.isArray(keyGroups.uk) ? keyGroups.uk : [];

      const record: ExportRecord = {
        mediaKey: iconData.mediaKey,
        source: "iconify",
        kind: "icon",
        iconKey,
        collectionKey,
        name_en: nameEn,
        name_uk: nameUk,
        alt_en: nameEn,
        alt_uk: nameUk,
        tags_en: [],
        tags_uk: [],
        keywords_en: keywordsEn,
        keywords_uk: keywordsUk,
        category_key: "icon",
        category_en: EN_CATEGORY_BY_KIND.icon,
        category_uk: UK_CATEGORY_BY_KIND.icon,
        source_url: collectionMeta.source,
        author_name: collectionMeta.name,
      };

      writer.write(`${JSON.stringify(record)}\n`);
      count += 1;
    }
  }

  return { count, fallbackEn };
}

async function main(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));
    await ensureDir(options.outPath);
    const writer = createWriteStream(options.outPath, { encoding: "utf-8" });

    let total = 0;
    let fallbackEn = 0;

    const unsplashResult = await buildUnsplashRecords(writer, {
      limit: options.limit,
    });
    total += unsplashResult.count;
    fallbackEn += unsplashResult.fallbackEn;

    const iconsResult = await buildIconRecords(writer, {
      limit: options.limit,
      offset: total,
    });
    total += iconsResult.count;
    fallbackEn += iconsResult.fallbackEn;

    await new Promise<void>((resolve) => writer.end(resolve));
    console.log(
      [
        "Готово.",
        `Файл: ${options.outPath}`,
        `Записів: ${total}`,
        `Fallback англ. назв: ${fallbackEn}`,
      ].join("\n"),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Помилка: ${message}`);
    showUsage();
    process.exit(1);
  }
}

void main();
