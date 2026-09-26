import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { UNDRAW_ILLUSTRATIONS_ROOT } from "../config/paths";
import { updateImageTranslations } from "../scripts/update-unsplash-translations";
import type { MediaMetadata } from "../unsplash/import-utils";

const SITE_URL = "https://undraw.co/";
const CATALOG_URL = new URL("/illustrations", SITE_URL).toString();
const LICENSE_URL = new URL("/license", SITE_URL).toString();
const COLLECTION = "undraw-illustrations";

type UndrawItem = { _id: string; title: string; media: string; newSlug: string };
type PageProps = { illustrations: UndrawItem[]; totalPages: number; currentPage?: number };
type NextData = { buildId: string; props: { pageProps: PageProps } };
type Selection = { all: boolean; limit?: number };
type ImportResult = { slug: string } | { skipped: string; reason: string };

function parseArgs(args: string[]): Selection {
  let all = false;
  let limit: number | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--") continue;
    if (arg === "--all") {
      all = true;
      continue;
    }
    if (arg === "--limit") {
      const value = Number(args[index + 1]);
      if (!Number.isInteger(value) || value < 1) throw new Error("--limit потребує додатне ціле число.");
      limit = value;
      index += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      console.log("Використання: pnpm run undraw:import -- (--all | --limit <кількість>)");
      process.exit(0);
    }
    throw new Error(`Невідомий аргумент "${arg}".`);
  }
  if (all === Boolean(limit)) throw new Error("Вкажи рівно один режим: --all або --limit <кількість>.");
  return { all, limit };
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`unDraw повернув HTTP ${response.status} для ${url}.`);
  return response.text();
}

function parseNextData(html: string): NextData {
  const raw = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)?.[1];
  if (!raw) throw new Error("Не знайдено __NEXT_DATA__ на сторінці unDraw.");
  const data = JSON.parse(raw) as NextData;
  if (!data.buildId || !Array.isArray(data.props?.pageProps?.illustrations) || !Number.isInteger(data.props.pageProps.totalPages)) {
    throw new Error("Некоректний каталог unDraw.");
  }
  return data;
}

function validateItem(item: UndrawItem): void {
  const media = new URL(item.media);
  if (!item._id || !item.title.trim() || !/^[a-z0-9-]+_[a-z0-9]+$/i.test(item.newSlug)
    || media.hostname !== "cdn.undraw.co" || !media.pathname.endsWith(".svg")) {
    throw new Error(`Некоректний запис unDraw: ${JSON.stringify(item)}`);
  }
}

async function loadCatalog(limit?: number): Promise<UndrawItem[]> {
  const first = parseNextData(await fetchText(CATALOG_URL));
  const items = [...first.props.pageProps.illustrations];
  for (let page = 2; page <= first.props.pageProps.totalPages && (!limit || items.length < limit); page += 1) {
    const url = new URL(`/_next/data/${first.buildId}/illustrations/${page}.json`, SITE_URL);
    url.searchParams.set("page", String(page));
    const payload = JSON.parse(await fetchText(url.toString())) as { pageProps?: PageProps };
    if (!Array.isArray(payload.pageProps?.illustrations)) throw new Error(`Некоректна сторінка каталогу unDraw: ${page}.`);
    items.push(...payload.pageProps.illustrations);
  }
  const selected = limit ? items.slice(0, limit) : items;
  selected.forEach(validateItem);
  if (new Set(selected.map((item) => item._id)).size !== selected.length) throw new Error("Каталог unDraw містить дублікати _id.");
  return selected;
}

function localSlug(item: UndrawItem): string {
  return item.newSlug.toLowerCase().replaceAll("_", "-");
}

function titleTags(title: string): string[] {
  const stopWords = new Set(["a", "an", "and", "at", "for", "in", "of", "on", "the", "to", "with"]);
  const words = title.toLowerCase().match(/[a-z0-9]+/g)?.filter((word) => word.length > 1 && !stopWords.has(word)) ?? [];
  const tags: string[] = [];
  const seen = new Set<string>();
  for (const tag of [title.trim(), ...words]) {
    const normalized = tag.toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      tags.push(tag);
    }
  }
  return tags;
}

function dimensions(svg: string): { width?: number; height?: number } {
  const root = svg.match(/<svg\b[^>]*>/i)?.[0] ?? "";
  const width = Number(root.match(/\bwidth=["']([0-9.]+)/i)?.[1]);
  const height = Number(root.match(/\bheight=["']([0-9.]+)/i)?.[1]);
  return {
    ...(Number.isFinite(width) && width > 0 ? { width: Math.round(width) } : {}),
    ...(Number.isFinite(height) && height > 0 ? { height: Math.round(height) } : {}),
  };
}

async function existingMetadata(slug: string): Promise<Partial<MediaMetadata>> {
  try {
    return JSON.parse(await fs.readFile(path.join(UNDRAW_ILLUSTRATIONS_ROOT, slug, "media-meta.json"), "utf8")) as Partial<MediaMetadata>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return {};
  }
}

async function writeItem(item: UndrawItem): Promise<ImportResult> {
  const slug = localSlug(item);
  const candidates = [...new Set([item.media, item.media.replace("/illustration/", "/illustrations/")])];
  let svg: string | undefined;
  let source = item.media;
  const failures: string[] = [];
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, { signal: AbortSignal.timeout(120_000) });
      if (!response.ok) {
        failures.push(`${candidate}: HTTP ${response.status}`);
        continue;
      }
      const body = (await response.text()).trim();
      const root = body.replace(/^<\?xml[^>]*>\s*/i, "");
      if (!root.startsWith("<svg")) {
        failures.push(`${candidate}: отримано ${response.headers.get("content-type") ?? "невідомий формат"} замість SVG`);
        continue;
      }
      if (/<(?:script|foreignObject)\b/i.test(body)) return { skipped: slug, reason: "SVG містить заборонений активний вміст" };
      svg = body;
      source = candidate;
      break;
    } catch (error) {
      failures.push(`${candidate}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (!svg) return { skipped: slug, reason: failures.join("; ") };
  const existing = await existingMetadata(slug);
  const tags = titleTags(item.title);
  const metadata: MediaMetadata & { providerId: string } = {
    slug,
    mediaKey: existing.mediaKey ?? randomUUID(),
    providerId: item._id,
    i18n: {
      name: { en: item.title, uk: item.title },
      alt: { en: item.title, uk: item.title },
      tags: tags.map((tag) => ({ key: tag.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), i18n: { en: tag, uk: tag } })),
      keywords: { en: [], uk: [] },
    },
    category: { key: "illustrations", en: "Illustrations", uk: "Ілюстрації" },
    collectionSlugs: [COLLECTION],
    pinned: false,
    source,
    sourceName: "unDraw",
    authorName: "unDraw",
    authorUrl: SITE_URL,
    licenseName: "unDraw License",
    licenseUrl: LICENSE_URL,
    tier: "free",
    downloadSource: "undraw",
    taggingStatus: "pending",
    mimeType: "image/svg+xml",
    ...dimensions(svg),
  };
  const dir = path.join(UNDRAW_ILLUSTRATIONS_ROOT, slug);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${slug}.svg`), `${svg}\n`, "utf8");
  await fs.writeFile(path.join(dir, "media-meta.json"), `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  return { slug };
}

async function main(): Promise<void> {
  const selection = parseArgs(process.argv.slice(2));
  const items = await loadCatalog(selection.limit);
  const slugs: string[] = [];
  const skipped: Array<{ slug: string; reason: string }> = [];
  for (const [index, item] of items.entries()) {
    const result = await writeItem(item);
    if ("slug" in result) slugs.push(result.slug);
    else skipped.push({ slug: result.skipped, reason: result.reason });
    if ((index + 1) % 100 === 0 || index + 1 === items.length) console.log(`unDraw SVG: ${index + 1}/${items.length}.`);
  }
  await updateImageTranslations({ slugs, source: "undraw", pendingOnly: true, translateMissing: true });
  console.log(`unDraw імпортовано: ${slugs.length} статичних SVG.`);
  if (skipped.length > 0) {
    console.log(`unDraw пропущено: ${skipped.length}.`);
    skipped.forEach(({ slug, reason }) => console.log(`- ${slug}: ${reason}`));
  }
}

main().catch((error) => {
  console.error(`unDraw import помилка: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
