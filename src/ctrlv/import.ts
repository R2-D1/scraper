import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { markMediaPendingForMetadata } from "../media-import/media-sync-state";

import { CTRLV_ILLUSTRATIONS_ROOT } from "../config/paths";
import { updateImageTranslations } from "../scripts/update-unsplash-translations";
import type { MediaMetadata } from "../unsplash/import-utils";

const SITE_URL = "https://ctrlv.design/";
const LICENSE_URL = "https://ctrlv.design/LICENSE";
const STATIC_COLLECTION = "ctrlv-illustrations";
const FIXED_COLORS: Record<string, string> = {
  "--charcoal": "#334155",
  "--bg-surface": "#ffffff",
  "--bg-main": "#f8fafc",
};

type CtrlvIllustration = { id: string; title: string; tags: string[]; svg: string };
type SelectedIllustration = { item: CtrlvIllustration; slug: string };
type ImportSelection = { all: boolean; ids: string[] };

function parseArgs(args: string[]): ImportSelection {
  const ids: string[] = [];
  let all = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--") continue;
    if (arg === "--id") {
      const id = args[index + 1];
      if (!id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
        throw new Error("--id потребує CtrlV illustration id у kebab-case.");
      }
      ids.push(id);
      index += 1;
      continue;
    }
    if (arg === "--all") {
      all = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      console.log("Використання: pnpm run ctrlv:import -- (--all | --id <ctrlv-id> [--id <ctrlv-id>])");
      process.exit(0);
    }
    throw new Error(`Невідомий аргумент "${arg}".`);
  }
  if (!all && !ids.length) throw new Error("Вкажи --all або хоча б один CtrlV illustration id через --id.");
  if (all && ids.length) throw new Error("--all не можна поєднувати з --id.");
  if (new Set(ids).size !== ids.length) throw new Error("Список --id містить дубль.");
  return { all, ids };
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`CtrlV повернув HTTP ${response.status} для ${url}.`);
  return response.text();
}

function parseCatalog(script: string): CtrlvIllustration[] {
  const match = script.match(/^\s*const\s+illustrationsCodebase\s*=\s*([\s\S]*?);\s*window\.illustrationsCodebase\s*=\s*illustrationsCodebase;?\s*$/);
  if (!match?.[1]) throw new Error("Не вдалося розібрати CtrlV catalog payload.");
  const parsed: unknown = JSON.parse(match[1]);
  if (!Array.isArray(parsed)) throw new Error("CtrlV catalog payload має бути масивом.");
  return parsed.map((item, index) => {
    const valid = item !== null && typeof item === "object"
      && typeof item.id === "string" && typeof item.title === "string"
      && Array.isArray(item.tags) && item.tags.every((tag: unknown) => typeof tag === "string")
      && typeof item.svg === "string" && item.svg.trimStart().startsWith("<svg ");
    if (!valid) throw new Error(`Некоректний запис CtrlV catalog за індексом ${index}.`);
    const record = item as CtrlvIllustration;
    return { ...record, svg: record.svg.trim() };
  });
}

function replaceColors(svg: string, colors: Record<string, string>): string {
  const aliases: Record<string, string> = {
    "--primary-color": colors.primary,
    "--secondary-color": colors.secondary,
    "--accent-color": colors.accent,
    ...FIXED_COLORS,
  };
  let output = svg;
  for (const [variable, color] of Object.entries(aliases)) {
    output = output.replaceAll(`var(${variable})`, color);
  }
  return output;
}

function disableSvgAnimation(svg: string): string {
  return svg.replace(">", "><style><![CDATA[*{animation:none!important}]]></style>");
}

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function assignUniqueSlugs(items: CtrlvIllustration[]): SelectedIllustration[] {
  const totals = new Map<string, number>();
  for (const item of items) totals.set(item.id, (totals.get(item.id) ?? 0) + 1);
  const seen = new Map<string, number>();
  const used = new Set<string>();
  return items.map((item) => {
    const index = seen.get(item.id) ?? 0;
    seen.set(item.id, index + 1);
    const total = totals.get(item.id) ?? 1;
    let slug = item.id;
    if (total > 1 && index < total - 1) {
      const titleSlug = slugify(item.title);
      const qualifier = titleSlug && titleSlug !== item.id
        ? titleSlug
        : item.tags.map(slugify).find((tag) => tag && !item.id.includes(tag)) ?? `variant-${index + 1}`;
      slug = `${item.id}-${qualifier}`;
    }
    let uniqueSlug = slug;
    let suffix = 2;
    while (used.has(uniqueSlug)) {
      uniqueSlug = `${slug}-${suffix}`;
      suffix += 1;
    }
    used.add(uniqueSlug);
    return { item, slug: uniqueSlug };
  });
}

function defaultColors(html: string): { primary: string; secondary: string; accent: string } {
  const color = (id: string): string => {
    const match = html.match(new RegExp(`<input[^>]*id=["']${id}["'][^>]*value=["'](#[a-fA-F0-9]{6})["']`));
    if (!match) throw new Error(`Не знайдено CtrlV default color ${id}.`);
    return match[1];
  };
  return { primary: color("primaryColor"), secondary: color("secondaryColor"), accent: color("accentColor") };
}

async function existingMetadata(slug: string): Promise<Partial<MediaMetadata>> {
  try {
    const raw = await fs.readFile(path.join(CTRLV_ILLUSTRATIONS_ROOT, slug, "media-meta.json"), "utf8");
    return JSON.parse(raw) as Partial<MediaMetadata>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return {};
}

async function writeRecord(item: CtrlvIllustration, slug: string, svg: string, collectionSlug: string): Promise<void> {
  const existing = await existingMetadata(slug);
  const sourceUrl = new URL(`/i/${item.id}`, SITE_URL).toString();
  const tags = [...new Set(item.tags.map((tag) => tag.trim()).filter(Boolean))];
  const metadata: MediaMetadata = {
    slug,
    mediaKey: existing.mediaKey ?? randomUUID(),
    i18n: {
      name: { en: item.title, uk: item.title },
      alt: { en: item.title, uk: item.title },
      tags: tags.map((tag) => ({ key: tag.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), i18n: { en: tag, uk: tag } })),
      keywords: { en: [], uk: [] },
    },
    category: { key: "illustrations", en: "Illustrations", uk: "Ілюстрації" },
    collectionSlugs: [collectionSlug],
    pinned: false,
    source: sourceUrl,
    sourceName: "CtrlV",
    authorName: "CtrlV",
    authorUrl: SITE_URL,
    licenseName: "CC0 1.0 Universal",
    licenseUrl: LICENSE_URL,
    tier: "free",
    downloadSource: "ctrlv",
    taggingStatus: "pending",
    mimeType: "image/svg+xml",
    ...(existing.width ? { width: existing.width } : {}),
    ...(existing.height ? { height: existing.height } : {}),
  };
  const dir = path.join(CTRLV_ILLUSTRATIONS_ROOT, slug);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${slug}.svg`), svg, "utf8");
  await fs.writeFile(path.join(dir, "media-meta.json"), `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  await markMediaPendingForMetadata(path.join(dir, "media-meta.json"), "file");
}

async function main(): Promise<void> {
  const selection = parseArgs(process.argv.slice(2));
  const html = await fetchText(SITE_URL);
  const catalogPath = html.match(/<script\b[^>]*src=["']([^"']*illustrations-data\.js)["']/i)?.[1];
  if (!catalogPath) throw new Error("CtrlV page не містить очікуваного catalog asset.");
  const baseUrl = new URL(SITE_URL);
  const catalogText = await fetchText(new URL(catalogPath, baseUrl).toString());
  const catalog = parseCatalog(catalogText);
  const selectedItems = selection.all
    ? catalog
    : selection.ids.flatMap((id) => {
      const matches = catalog.filter((item) => item.id === id);
      if (!matches.length) throw new Error(`Не знайдено CtrlV illustration id "${id}".`);
      return matches;
    });
  const items = assignUniqueSlugs(selectedItems);
  const colors = defaultColors(html);
  const slugs: string[] = [];
  for (const [index, selected] of items.entries()) {
    const { item, slug } = selected;
    const staticSvg = replaceColors(disableSvgAnimation(item.svg), colors);
    await writeRecord(item, slug, staticSvg, STATIC_COLLECTION);
    slugs.push(slug);
    if ((index + 1) % 100 === 0 || index + 1 === items.length) {
      console.log(`CtrlV SVG: ${index + 1}/${items.length} ілюстрацій.`);
    }
  }
  await updateImageTranslations({ slugs, source: "ctrlv", pendingOnly: true, translateMissing: true });
  console.log(`CtrlV імпортовано: ${items.length} статичних SVG.`);
}

main().catch((error) => {
  console.error(`CtrlV import помилка: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
