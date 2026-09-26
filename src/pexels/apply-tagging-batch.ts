import { promises as fs } from "node:fs";
import path from "node:path";

import {
  IMAGE_TAG_KEY_BLACKLIST_PATH,
  IMAGE_TAG_BLACKLIST_PATH,
  MEDIA_COLLECTION_REGISTRY_PATH,
  PEXELS_IMAGES_ROOT,
  PEXELS_VIDEOS_ROOT,
} from "../config/paths";
import { loadMediaCollectionRegistry } from "../media-import/media-collections";
import { MEDIA_META_FILE } from "../unsplash/library-paths";
import { assertImageDisplayNames } from "../media-import/image-name-validation";
import type { MediaMetadata } from "../unsplash/import-utils";
import { createImageTagStore } from "../unsplash/translation-stores";

type TaggingItem = {
  slug: string;
  nameEn: string;
  tagsEn: string[];
};

type TaggingBatch = {
  schemaVersion: number;
  collectionSlug: string;
  items: TaggingItem[];
};

type CliOptions = { inputPath: string; dryRun: boolean };

function parseArgs(args: string[]): CliOptions {
  let inputPath: string | undefined;
  let dryRun = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--input" || arg === "-i") {
      inputPath = args[index + 1]?.trim();
      if (!inputPath) throw new Error("Після --input вкажи JSON-файл пачки.");
      index += 1;
    } else if (arg === "--") {
      continue;
    } else if (arg === "--help" || arg === "-h") {
      console.log(
        [
          "Використання:",
          "  pnpm run pexels:tagging:apply -- --input <batch.json> [--dry-run]",
          "",
          "Застосовує перевірені англійські теги й назви та ставить у чергу лише відсутні переклади тегів.",
        ].join("\n"),
      );
      process.exit(0);
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else {
      throw new Error(`Невідомий аргумент "${arg}".`);
    }
  }
  if (!inputPath)
    throw new Error("Не вказано вхідний JSON-файл через --input.");
  return { inputPath: path.resolve(inputPath), dryRun };
}

async function readStringSet(filePath: string): Promise<Set<string>> {
  const values = JSON.parse(await fs.readFile(filePath, "utf-8")) as unknown;
  if (!Array.isArray(values))
    throw new Error(`${filePath} має містити JSON-масив рядків.`);
  return new Set(
    values
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim().toLowerCase()),
  );
}

function validateText(value: unknown, label: string, maxWords: number): string {
  if (typeof value !== "string" || !value.trim())
    throw new Error(`${label} має бути непорожнім рядком.`);
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.split(" ").length > maxWords)
    throw new Error(`${label} має містити не більше ${maxWords} слів.`);
  return normalized;
}

function validateTags(
  value: unknown,
  slug: string,
  blacklists: Set<string>[],
): string[] {
  if (!Array.isArray(value) || value.length < 4 || value.length > 8) {
    throw new Error(`${slug}: вкажи від 4 до 8 точних англійських тегів.`);
  }
  const tags = value.map((tag, index) =>
    validateText(tag, `${slug}: тег ${index + 1}`, 4).toLocaleLowerCase("en"),
  );
  const seen = new Set<string>();
  for (const tag of tags) {
    if (!/^[A-Za-z0-9][A-Za-z0-9 &'’-]*$/.test(tag))
      throw new Error(
        `${slug}: тег "${tag}" має бути англійською пошуковою фразою без URL чи пунктуації.`,
      );
    const normalized = tag.trim().toLocaleLowerCase("en");
    if (seen.has(normalized))
      throw new Error(`${slug}: дубльований тег "${tag}".`);
    if (blacklists.some((blacklist) => blacklist.has(tag.toLowerCase())))
      throw new Error(`${slug}: тег "${tag}" є в blacklist.`);
    seen.add(normalized);
  }
  return tags;
}

async function readBatch(filePath: string): Promise<TaggingBatch> {
  const raw = JSON.parse(
    await fs.readFile(filePath, "utf-8"),
  ) as Partial<TaggingBatch>;
  if (
    raw.schemaVersion !== 1 ||
    !Array.isArray(raw.items) ||
    raw.items.length === 0
  ) {
    throw new Error("Очікується непорожня пачка schemaVersion: 1.");
  }
  if (typeof raw.collectionSlug !== "string" || !raw.collectionSlug.trim())
    throw new Error("Пачка має містити collectionSlug.");

  const slugs = new Set<string>();
  const items = raw.items.map((item, index) => {
    if (!item || typeof item !== "object")
      throw new Error(`Некоректний запис у позиції ${index + 1}.`);
    const candidate = item as Partial<TaggingItem>;
    if (
      typeof candidate.slug !== "string" ||
      !/^pexels-(?:video-)?\d+$/.test(candidate.slug)
    ) {
      throw new Error(`Некоректний Pexels slug у позиції ${index + 1}.`);
    }
    if (slugs.has(candidate.slug))
      throw new Error(`Пачка містить повторний slug ${candidate.slug}.`);
    slugs.add(candidate.slug);
    return {
      slug: candidate.slug,
      nameEn: validateText(candidate.nameEn, `${candidate.slug}: nameEn`, 10),
      tagsEn: candidate.tagsEn as string[],
    };
  });
  return { schemaVersion: 1, collectionSlug: raw.collectionSlug, items };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const inputPath = options.inputPath;
  const [batch, registry, tagStore, tagBlacklist, tagKeyBlacklist] =
    await Promise.all([
      readBatch(inputPath),
      loadMediaCollectionRegistry(MEDIA_COLLECTION_REGISTRY_PATH),
      createImageTagStore(),
      readStringSet(IMAGE_TAG_BLACKLIST_PATH),
      readStringSet(IMAGE_TAG_KEY_BLACKLIST_PATH),
    ]);
  const blacklists = [tagBlacklist, tagKeyBlacklist];
  const batchCollection = registry.get(batch.collectionSlug);
  if (
    !batchCollection ||
    !["images", "videos"].includes(batchCollection.category)
  ) {
    throw new Error(`Невідома медіаколекція пачки "${batch.collectionSlug}".`);
  }
  const prepared: Array<{
    item: TaggingItem;
    metadataPath: string;
    next: MediaMetadata;
  }> = [];
  const missingTags = new Map<string, string>();
  const changedSlugs: string[] = [];
  let knownTagOccurrences = 0;

  for (const item of batch.items) {
    const isVideo = item.slug.startsWith("pexels-video-");
    const directory = path.join(
      isVideo ? PEXELS_VIDEOS_ROOT : PEXELS_IMAGES_ROOT,
      item.slug,
    );
    const metadataPath = path.join(directory, MEDIA_META_FILE);
    const metadata = JSON.parse(
      await fs.readFile(metadataPath, "utf-8"),
    ) as MediaMetadata;
    if (metadata.sourceName !== "Pexels")
      throw new Error(`${item.slug} не є Pexels-зображенням.`);
    if (metadata.taggingStatus !== "pending")
      throw new Error(
        `${item.slug} вже не має статусу pending; не перезаписую його.`,
      );
    if (!metadata.collectionSlugs?.includes(batch.collectionSlug)) {
      throw new Error(
        `${item.slug} не належить до початкової колекції пачки "${batch.collectionSlug}".`,
      );
    }
    if (
      !metadata.collectionSlugs?.length ||
      metadata.collectionSlugs.some((collectionSlug) => {
        const collection = registry.get(collectionSlug);
        return !collection || collection.category !== batchCollection.category;
      })
    )
      throw new Error(
        `${item.slug}: початкові Pexels-призначення колекцій некоректні.`,
      );

    const tagsEn = validateTags(item.tagsEn, item.slug, blacklists);
    for (const tag of tagsEn) {
      if (tagStore.has(tag)) {
        knownTagOccurrences += 1;
      } else {
        missingTags.set(tag, tag);
        tagStore.resolve(tag, tag);
      }
    }

    const next: MediaMetadata = {
      ...metadata,
      i18n: {
        ...metadata.i18n,
        name: { ...metadata.i18n.name, en: item.nameEn, uk: "" },
        keywords: { en: tagsEn, uk: [] },
      },
      taggingStatus: "pending",
    };
    assertImageDisplayNames(next, `Pexels "${item.slug}"`);
    prepared.push({ item, metadataPath, next });
  }

  if (!options.dryRun) {
    for (const { item, metadataPath, next } of prepared) {
      const temporaryPath = `${metadataPath}.${process.pid}.tmp`;
      await fs.writeFile(
        temporaryPath,
        `${JSON.stringify(next, null, 2)}\n`,
        "utf-8",
      );
      await fs.rename(temporaryPath, metadataPath);
      changedSlugs.push(item.slug);
    }
    await tagStore.writeMissingRecords();
  }

  console.log(
    `${options.dryRun ? "Перевірено" : "Застосовано англійські назви й теги до"} ${options.dryRun ? prepared.length : changedSlugs.length} Pexels-фото; статус лишається pending до локалізації.`,
  );
  console.log(
    `Теги з наявним перекладом у словнику: ${knownTagOccurrences}. Нових унікальних тегів для перекладу: ${missingTags.size}.`,
  );
  if (missingTags.size > 0) {
    console.log(
      "Переклади лише цих нових тегів у translations/images/missing-tag-translations/:",
    );
    for (const tag of [...missingTags.keys()].sort((a, b) =>
      a.localeCompare(b, "en"),
    ))
      console.log(`  ${tag}`);
  }
}

void main().catch((error) => {
  console.error(
    `Помилка застосування Pexels-тегування: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
