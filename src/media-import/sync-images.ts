import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import {
  buildFullSyncSelection,
  assertResumePlan,
  buildSyncSelection,
  classifyPreparedAssetFiles,
  chunk,
  includeFilesForMetadata,
  mergeMediaDeleteList,
  parseGitNameStatus,
  runCheckpointedSync,
  type SyncAssetKind,
  type SyncInventoryItem,
} from "./sync-images-plan";
import { mediaSettings } from "../config/media-settings";
import { MEDIA_DELETE_LIST_PATH } from "../config/paths";
import { readMediaDeleteList, writeMediaDeleteList } from "./media-delete-list";

const ROOT = path.resolve(__dirname, "..", "..");
const PREPARED = path.join(ROOT, "tmp", "images");
const PACKAGES_ROOT = path.join(ROOT, "tmp", "images-sync-packages");
const CHECKPOINTS = path.join(ROOT, "tmp", "images-sync-checkpoints");
const TRANSPORT = path.join(ROOT, "scripts", "divnex-media-sync-transport.sh");
const META = "media-meta.json";
const OVERSIZE_MANIFEST = path.join(ROOT, "tmp", "oversize.json");
const RESULT_PREFIX = "MEDIA_SYNC_RESULT=";

type Target = "dev" | "stage" | "prod";
type Options = {
  send: boolean;
  full: boolean;
  target: Target;
  divnexProject?: string;
  baseRef?: string;
  batchSize: number;
  batchMaxBytes: number;
  fromBatch: number;
  withFiles: boolean;
};
export type Asset = {
  slug: string;
  mediaKey: string;
  mediaType?: "raster" | "svg" | "video";
  contentHash: string;
  metadataHash: string;
  directory: string;
  hasCollectionPreviews: boolean;
  sizeBytes: number;
};
export type Batch = {
  number: number;
  id: string;
  mode: "metadata" | "files" | "tombstones" | "collection-previews";
  overwriteFiles: boolean;
  assets: Asset[];
  tombstones: string[];
};
type BatchResult = {
  batchId: string;
  status: "completed";
  imported: number;
  updated: number;
  skipped: number;
  deleted: number;
  failed: number;
  archiveChecksum?: string;
};
type Checkpoint = {
  version: 1;
  target: Target;
  sourceCommit: string;
  baseCommit: string | null;
  planHash: string;
  results: Record<string, BatchResult>;
  reindex: "pending" | "completed";
  completed: boolean;
};

type StoredPlan = {
  version: 3;
  target: Target;
  baseCommit: string | null;
  sourceCommit: string;
  planHash: string;
  batches: Array<{
    number: number;
    id: string;
    mode: Batch["mode"];
    overwriteFiles: boolean;
    assets: Array<Omit<Asset, "directory">>;
    tombstones: string[];
  }>;
};

const targetPackagesRoot = (target: Target) => path.join(PACKAGES_ROOT, target);
const packagesFor = (target: Target, planHash: string) =>
  path.join(targetPackagesRoot(target), planHash);
const planFile = (target: Target, planHash: string) =>
  path.join(packagesFor(target, planHash), "plan.json");

function parseArgs(argv: readonly string[]): Options {
  const value: Options = {
    send: false,
    full: false,
    target: "dev",
    batchSize: 100,
    batchMaxBytes: 256 * 1024 * 1024,
    fromBatch: 1,
    withFiles: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--") continue;
    if (arg === "--send") value.send = true;
    else if (arg === "--full") value.full = true;
    else if (arg === "--with-files") value.withFiles = true;
    else if (arg === "--target") {
      const target = argv[++i];
      if (target !== "dev" && target !== "stage" && target !== "prod")
        throw new Error("Невірний target.");
      value.target = target;
    } else if (arg === "--divnex-project") value.divnexProject = argv[++i];
    else if (arg === "--base" || arg === "--since") value.baseRef = argv[++i];
    else if (
      arg === "--batch-size" ||
      arg === "--from-batch" ||
      arg === "--batch-max-bytes"
    ) {
      const parsed = Number(argv[++i]);
      if (!Number.isInteger(parsed) || parsed < 1)
        throw new Error(`${arg} має бути додатним числом.`);
      if (arg === "--batch-size") value.batchSize = parsed;
      else if (arg === "--batch-max-bytes") value.batchMaxBytes = parsed;
      else value.fromBatch = parsed;
    } else if (arg === "--help" || arg === "-h") {
      console.log(
        [
          "Використання:",
          "  pnpm run media:sync:images -- --target dev|stage|prod --divnex-project <path> [--send]",
          "  Додай --full для повного metadata sync із файлами лише для відсутніх assets; звичайний запуск бере Git diff від checkpoint.",
          "  Додатково: --base <commit>, --batch-size <n>, --from-batch <n>, --with-files.",
          "  У повному режимі з --with-files план містить лише растрові зображення та їхні collection previews; SVG і відео не додаються.",
        ].join("\n"),
      );
      process.exit(0);
    } else throw new Error(`Невідомий аргумент "${arg}".`);
  }
  if (value.full && value.baseRef)
    throw new Error("--full не можна поєднувати з --base.");
  return value;
}

function execute(
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
  capture = false,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout?.on("data", (data) => stdout.push(data as Buffer));
    child.stderr?.on("data", (data) => stderr.push(data as Buffer));
    child.once("error", reject);
    child.once("close", (code) => {
      const out = Buffer.concat(stdout).toString("utf8");
      const error = Buffer.concat(stderr).toString("utf8");
      if (code === 0) resolve(out);
      else
        reject(
          new Error(
            error.trim() ||
              out.trim() ||
              `${command} завершився з кодом ${code}.`,
          ),
        );
    });
  });
}

const git = (args: string[]) =>
  execute("git", args, ROOT, process.env, true).then((value) => value.trim());

async function readEnv(file: string): Promise<NodeJS.ProcessEnv> {
  const values: NodeJS.ProcessEnv = {};
  for (const line of (await fs.readFile(file, "utf8")).split(/\r?\n/)) {
    const match = line.match(
      /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/,
    );
    if (!match) continue;
    values[match[1]] = match[2]
      .trim()
      .replace(/^(['"])(.*)\1$/, "$2")
      .replace(/\s+#.*$/, "");
  }
  return values;
}

async function listFiles(root: string): Promise<string[]> {
  const found: string[] = [];
  const visit = async (directory: string) => {
    for (const entry of (
      await fs.readdir(directory, { withFileTypes: true })
    ).sort((a, b) => a.name.localeCompare(b.name, "en"))) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(target);
      else if (entry.isFile()) found.push(target);
    }
  };
  await visit(root);
  return found;
}

async function readAssetContent(
  directory: string,
  slug: string,
): Promise<{ hash: string; mediaType: Asset["mediaType"] }> {
  const hash = createHash("sha256");
  const binary = (await listFiles(directory)).filter(
    (file) => path.basename(file) !== META,
  );
  if (!binary.length)
    throw new Error(`Asset ${directory} не містить підготовленого файла.`);
  const { main, thumbnails, variants } = classifyPreparedAssetFiles(
    binary,
    slug,
    mediaSettings.thumbSuffix,
  );
  if (main.length !== 1)
    throw new Error(
      `Asset ${directory} має неочікуваний набір основних файлів.`,
    );
  for (const [label, file] of [
    ["main", main[0]],
    ...thumbnails.map((file) => ["thumbnail", file]),
    ...variants.map((file, index) => [`variant:${index}`, file]),
  ] as Array<[string, string]>) {
    hash.update(label);
    hash.update(await fs.readFile(file));
  }
  const extension = path.extname(main[0]).toLowerCase();
  const mediaType =
    extension === ".svg"
      ? "svg"
      : extension === ".mp4"
        ? "video"
        : "raster";
  return { hash: hash.digest("hex"), mediaType };
}

async function assetSizeBytes(directory: string): Promise<number> {
  const sizes = await Promise.all(
    (await listFiles(directory)).map((file) =>
      fs.stat(file).then((stats) => stats.size),
    ),
  );
  return sizes.reduce((sum, value) => sum + value, 0);
}

function sourceMetadata(
  meta: Record<string, unknown>,
): Record<string, unknown> {
  const {
    sourceContentHash: _contentHash,
    sourceMetadataHash: _metadataHash,
    ...source
  } = meta;
  return source;
}

function metadataHash(meta: Record<string, unknown>): string {
  return createHash("sha256")
    .update(JSON.stringify(sourceMetadata(meta)))
    .digest("hex");
}

async function readAssets(): Promise<Map<string, Asset>> {
  const result = new Map<string, Asset>();
  for (const entry of (
    await fs.readdir(PREPARED, { withFileTypes: true })
  ).sort((a, b) => a.name.localeCompare(b.name, "en"))) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const directory = path.join(PREPARED, entry.name);
    const meta = JSON.parse(
      await fs.readFile(path.join(directory, META), "utf8"),
    ) as {
      slug?: string;
      mediaKey?: string;
      collections?: Array<{ previewMediaKeys?: unknown }>;
    } & Record<string, unknown>;
    const slug = meta.slug?.trim() || entry.name;
    const content = await readAssetContent(directory, slug);
    result.set(slug, {
      slug,
      mediaKey: meta.mediaKey?.trim() || slug,
      mediaType: content.mediaType,
      directory,
      contentHash: content.hash,
      metadataHash: metadataHash(meta),
      hasCollectionPreviews: Boolean(
        meta.collections?.some(
          (collection) =>
            Array.isArray(collection.previewMediaKeys) &&
            collection.previewMediaKeys.length > 0,
        ),
      ),
      sizeBytes: await assetSizeBytes(directory),
    });
  }
  return result;
}

async function readRejectedAssetSlugs(): Promise<Set<string>> {
  const raw = await fs.readFile(OVERSIZE_MANIFEST, "utf8").catch((error) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  });
  if (!raw) return new Set();
  const parsed = JSON.parse(raw) as {
    version?: unknown;
    assets?: Array<{ slug?: unknown }>;
  };
  if (parsed.version !== 1 || !Array.isArray(parsed.assets)) {
    throw new Error("Oversize manifest має несумісний формат.");
  }
  return new Set(
    parsed.assets
      .map((asset) => (typeof asset.slug === "string" ? asset.slug.trim() : ""))
      .filter(Boolean),
  );
}

async function assertCommittedLibrarySnapshot(): Promise<void> {
  const dirty = await git([
    "status",
    "--porcelain",
    "--untracked-files=all",
    "--",
    "library",
  ]);
  if (dirty) {
    throw new Error(
      "Remote sync потребує чистого закоміченого library snapshot; sourceCommit не може описувати незакомічені дані.",
    );
  }
}

async function readStoredPlan(
  target: Target,
  planHash: string,
): Promise<StoredPlan | null> {
  const raw = await fs
    .readFile(planFile(target, planHash), "utf8")
    .catch((error) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    });
  if (!raw) return null;
  const value = JSON.parse(raw) as StoredPlan;
  if (value.version !== 3 || value.target !== target) {
    throw new Error(`Збережений plan для ${target} має несумісний формат.`);
  }
  return value;
}

async function hydrateStoredPlan(stored: StoredPlan, checkpoint: Checkpoint) {
  if (
    stored.planHash !== checkpoint.planHash ||
    stored.sourceCommit !== checkpoint.sourceCommit
  ) {
    throw new Error("Збережений plan не відповідає незавершеному checkpoint.");
  }
  const batches: Batch[] = stored.batches.map((batch) => ({
    ...batch,
    assets: batch.assets.map((asset) => ({
      ...asset,
      directory: path.join(PREPARED, asset.slug),
    })),
  }));
  for (const batch of batches) {
    if (checkpoint.results[batch.id]) continue;
    for (const asset of batch.assets) {
      const raw = JSON.parse(
        await fs.readFile(path.join(asset.directory, META), "utf8"),
      ) as Record<string, unknown>;
      if (metadataHash(raw) !== asset.metadataHash) {
        throw new Error(
          `Prepared metadata змінилися після створення plan: ${asset.slug}.`,
        );
      }
      if (
        batch.mode === "files" &&
        (await readAssetContent(asset.directory, asset.slug)).hash !==
        asset.contentHash
      ) {
        throw new Error(
          `Prepared файл змінився після створення plan: ${asset.slug}.`,
        );
      }
    }
  }
  return { batches, hash: stored.planHash };
}

const checkpointFile = (target: Target) =>
  path.join(CHECKPOINTS, `${target}.json`);

async function readCheckpoint(target: Target): Promise<Checkpoint | null> {
  const raw = await fs
    .readFile(checkpointFile(target), "utf8")
    .catch((error) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    });
  return raw ? (JSON.parse(raw) as Checkpoint) : null;
}

async function saveCheckpoint(value: Checkpoint) {
  await fs.mkdir(CHECKPOINTS, { recursive: true });
  const target = checkpointFile(value.target);
  const temporary = `${target}.${process.pid}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(temporary, target);
}

async function transport<T>(
  options: Options,
  config: NodeJS.ProcessEnv,
  action: string,
  extra: NodeJS.ProcessEnv = {},
): Promise<T> {
  if (!options.divnexProject) throw new Error("Потрібен --divnex-project.");
  const cwd =
    options.target === "dev" ? path.resolve(options.divnexProject) : ROOT;
  const stdout = await execute(
    "bash",
    [TRANSPORT],
    cwd,
    {
      ...process.env,
      ...config,
      ...extra,
      MEDIA_SYNC_ACTION: action,
      MEDIA_IMPORT_MODE: options.target === "dev" ? "local" : "remote",
      ...(options.target === "dev"
        ? {}
        : { MEDIA_IMPORT_PROFILE: options.target }),
    },
    true,
  );
  const line = stdout
    .split(/\r?\n/)
    .reverse()
    .find((item) => item.startsWith(RESULT_PREFIX));
  if (!line)
    throw new Error(`Transport не повернув terminal result.\n${stdout.trim()}`);
  return JSON.parse(line.slice(RESULT_PREFIX.length)) as T;
}

async function incrementalSelection(base: string, slugs: readonly string[]) {
  await git(["rev-parse", "--verify", `${base}^{commit}`]);
  const diff = await git([
    "diff",
    "--name-status",
    "--find-renames",
    base,
    "HEAD",
    "--",
    "library/unsplash",
    "library/pexels",
    "library/lummi",
    "library/custom-images",
    "library/collections.json",
    "library/related-image-groups.json",
  ]);
  const changes = parseGitNameStatus(diff);
  const selection = buildSyncSelection(changes, slugs);
  selection.deletions = await Promise.all(
    selection.deletions.map(async (slug) => {
      const candidates = changes.flatMap((change) => [
        change.previousPath,
        change.path,
      ]);
      const root = candidates
        .filter((value): value is string => Boolean(value))
        .map((value) => value.replace(/\\/g, "/"))
        .find(
          (value) =>
            value.includes(`/${slug}/`) &&
            /^library\/(?:unsplash|pexels|lummi|custom-images)\/(?:images|illustrations|videos)\//.test(
              value,
            ),
        )
        ?.match(
          /^(library\/(?:unsplash|pexels|lummi|custom-images)\/(?:images|illustrations|videos)\/[^/]+)\//,
        )?.[1];
      if (!root)
        throw new Error(`Не знайдено base metadata для tombstone "${slug}".`);
      const raw = await git(["show", `${base}:${root}/${META}`]);
      const meta = JSON.parse(raw) as { mediaKey?: unknown };
      if (typeof meta.mediaKey !== "string" || !meta.mediaKey.trim()) {
        throw new Error(
          `Base metadata не містить mediaKey для tombstone "${slug}".`,
        );
      }
      return meta.mediaKey.trim();
    }),
  );
  return selection;
}

function rawBatchId(
  value: Omit<Batch, "id" | "number">,
  source: string,
  target: Target,
): string {
  const hash = createHash("sha256");
  hash.update(`${target}:${source}:${value.mode}:${value.overwriteFiles}\n`);
  value.assets.forEach((asset) =>
    hash.update(
      `${asset.mediaKey}:${asset.contentHash}:${asset.metadataHash}\n`,
    ),
  );
  value.tombstones.forEach((key) => hash.update(`delete:${key}\n`));
  return hash.digest("hex").slice(0, 24);
}

export function buildPlan(
  selection: { assets: Map<string, SyncAssetKind>; deletions: string[] },
  assets: Map<string, Asset>,
  size: number,
  source: string,
  target: Target,
  maxBytes = 256 * 1024 * 1024,
) {
  const groups: Array<{
    mode: "metadata" | "files";
    overwriteFiles: boolean;
    slugs: string[];
  }> = [
    { mode: "metadata", overwriteFiles: false, slugs: [] },
    { mode: "files", overwriteFiles: false, slugs: [] },
    { mode: "files", overwriteFiles: true, slugs: [] },
  ];
  for (const [slug, kind] of selection.assets)
    groups[kind === "metadata" ? 0 : kind === "new-file" ? 1 : 2].slugs.push(
      slug,
    );
  const chunkSlugs = (slugs: string[]): string[][] => {
    const batches: string[][] = [];
    let current: string[] = [];
    let currentBytes = 0;
    for (const slug of slugs.sort()) {
      const asset = assets.get(slug);
      if (!asset) throw new Error(`Не знайдено prepared asset "${slug}".`);
      if (asset.sizeBytes > maxBytes) {
        throw new Error(
          `Asset "${slug}" (${asset.sizeBytes} bytes) перевищує ліміт sync-пакета ${maxBytes} bytes.`,
        );
      }
      if (
        current.length &&
        (current.length >= size || currentBytes + asset.sizeBytes > maxBytes)
      ) {
        batches.push(current);
        current = [];
        currentBytes = 0;
      }
      current.push(slug);
      currentBytes += asset.sizeBytes;
    }
    if (current.length) batches.push(current);
    return batches;
  };
  const raw: Array<Omit<Batch, "id" | "number">> = groups.flatMap((group) =>
    chunkSlugs(group.slugs).map((slugs) => ({
      mode: group.mode,
      overwriteFiles: group.overwriteFiles,
      assets: slugs.map((slug) => {
        const asset = assets.get(slug);
        if (!asset) throw new Error(`Не знайдено prepared asset "${slug}".`);
        return asset;
      }),
      tombstones: [],
    })),
  );
  chunk(selection.deletions, size).forEach((keys) =>
    raw.push({
      mode: "tombstones",
      overwriteFiles: false,
      assets: [],
      tombstones: keys,
    }),
  );
  const previewAssets = Array.from(selection.assets.keys())
    .sort((left, right) => left.localeCompare(right, "en"))
    .map((slug) => {
      const asset = assets.get(slug);
      if (!asset) throw new Error(`Не знайдено prepared asset "${slug}".`);
      return asset;
    })
    .filter((asset) => asset.hasCollectionPreviews);
  if (previewAssets.length) {
    raw.push({
      mode: "collection-previews",
      overwriteFiles: false,
      assets: previewAssets,
      tombstones: [],
    });
  }
  const batches = raw.map((value, index) => ({
    ...value,
    number: index + 1,
    id: rawBatchId(value, source, target),
  }));
  const hash = createHash("sha256")
    .update(
      JSON.stringify(
        batches.map((batch) => ({
          id: batch.id,
          number: batch.number,
          mode: batch.mode,
          assets: batch.assets.map((asset) => asset.mediaKey),
          tombstones: batch.tombstones,
        })),
      ),
    )
    .digest("hex");
  return { batches, hash };
}

export function metadataForBatch(
  meta: Record<string, unknown>,
  includeCollectionPreviews: boolean,
): Record<string, unknown> {
  if (includeCollectionPreviews) return meta;
  const { relatedGroup: _relatedGroup, ...withoutRelatedGroup } = meta;
  if (!Array.isArray(meta.collections)) return withoutRelatedGroup;
  return {
    ...withoutRelatedGroup,
    collections: meta.collections.map((collection) => {
      if (
        !collection ||
        typeof collection !== "object" ||
        Array.isArray(collection)
      )
        return collection;
      const { previewMediaKeys: _previewMediaKeys, ...rest } =
        collection as Record<string, unknown>;
      return rest;
    }),
  };
}

async function createArchive(
  batch: Batch,
  sourceCommit: string,
  targetEnvironment: Target,
  packages: string,
) {
  await fs.mkdir(packages, { recursive: true });
  const archive = path.join(packages, `${batch.id}.zip`);
  const orphans = (await fs.readdir(packages)).filter(
    (name) => name.endsWith(".zip") && name !== path.basename(archive),
  );
  if (orphans.length)
    throw new Error(
      `Знайдено orphan sync archive: ${orphans.join(", ")}. Потрібне окреме очищення.`,
    );
  const directory = path.join(packages, batch.id);
  await fs.rm(directory, { recursive: true, force: true });
  await fs.mkdir(directory, { recursive: true });
  try {
    for (const asset of batch.assets) {
      const target = path.join(directory, asset.slug);
      await fs.mkdir(target, { recursive: true });
      const includeCollectionPreviews = batch.mode === "collection-previews";
      if (batch.mode === "metadata" || includeCollectionPreviews) {
        const meta = JSON.parse(
          await fs.readFile(path.join(asset.directory, META), "utf8"),
        ) as Record<string, unknown>;
        const preparedMetadata = metadataForBatch(
          sourceMetadata(meta),
          includeCollectionPreviews,
        );
        await fs.writeFile(
          path.join(target, META),
          `${JSON.stringify({ ...preparedMetadata, sourceMetadataHash: asset.metadataHash }, null, 2)}\n`,
          "utf8",
        );
      } else {
        await fs.cp(asset.directory, target, { recursive: true });
        const metaPath = path.join(target, META);
        const meta = sourceMetadata(
          JSON.parse(await fs.readFile(metaPath, "utf8")) as Record<
            string,
            unknown
          >,
        );
        await fs.writeFile(
          metaPath,
          `${JSON.stringify({ ...metadataForBatch(meta, false), sourceContentHash: asset.contentHash, sourceMetadataHash: asset.metadataHash }, null, 2)}\n`,
          "utf8",
        );
      }
    }
    await fs.writeFile(
      path.join(directory, ".media-import.json"),
      `${JSON.stringify({ version: 1, batchId: batch.id, mode: batch.mode === "collection-previews" ? "metadata" : batch.mode, overwriteFiles: batch.overwriteFiles, reindexOnComplete: false, sourceCommit, targetEnvironment }, null, 2)}\n`,
      "utf8",
    );
    await fs.rm(archive, { force: true });
    await execute("zip", ["-rq", archive, "."], directory, process.env);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
  return {
    path: archive,
    checksum: createHash("sha256")
      .update(await fs.readFile(archive))
      .digest("hex"),
  };
}

async function main() {
  const startedAt = Date.now();
  const options = parseArgs(process.argv.slice(2));
  const prior = await readCheckpoint(options.target);
  const config = options.divnexProject
    ? await readEnv(path.join(path.resolve(options.divnexProject), ".env"))
    : {};
  let packages: string;
  let recoveredBatches = 0;
  let plan: { batches: Batch[]; hash: string };
  let sourceCommit: string;
  let base: string | null;

  if (options.send && prior && !prior.completed) {
    const stored = await readStoredPlan(options.target, prior.planHash);
    if (!stored)
      throw new Error(
        `Немає збереженого plan для незавершеного ${options.target} checkpoint.`,
      );
    plan = await hydrateStoredPlan(stored, prior);
    sourceCommit = stored.sourceCommit;
    base = stored.baseCommit;
    packages = packagesFor(options.target, plan.hash);
    console.log(
      `[images] Відновлено plan ${plan.hash} без prepare та inventory.`,
    );
  } else {
    base = options.full
      ? null
      : (options.baseRef ?? prior?.sourceCommit ?? null);
    if (!options.full && !base) {
      throw new Error(
        "Немає checkpoint. Для першого повного sync використай --full.",
      );
    }
    if (options.send) await assertCommittedLibrarySnapshot();
    sourceCommit = await git(["rev-parse", "HEAD"]);
    if (options.send) {
      await transport<{ status: string }>(options, config, "cleanup");
    }
    await execute(
      "pnpm",
      ["run", "media:prepare:images", "--keep", "--no-archive"],
      ROOT,
      process.env,
    );
    const assets = await readAssets();
    const rejectedAssetSlugs = await readRejectedAssetSlugs();
    let selection;
    if (options.full) {
      const inventory = await transport<{ assets: SyncInventoryItem[] }>(
        options,
        config,
        "inventory",
      );
      selection = buildFullSyncSelection(
        Array.from(assets.values()),
        inventory.assets,
      );
      if (options.withFiles) {
        for (const slug of selection.assets.keys()) {
          if (assets.get(slug)?.mediaType !== "raster") {
            selection.assets.delete(slug);
          }
        }
        for (const asset of assets.values()) {
          if (asset.mediaType === "raster") {
            selection.assets.set(asset.slug, "changed-file");
          }
        }
      }
    } else {
      selection = await incrementalSelection(
        base as string,
        Array.from(assets.keys()),
      );
      if (options.withFiles) selection = includeFilesForMetadata(selection);
    }
    const deleteList = await readMediaDeleteList(MEDIA_DELETE_LIST_PATH);
    selection = mergeMediaDeleteList(selection, deleteList);
    const rejectedSelected = Array.from(selection.assets.keys()).filter(
      (slug) => rejectedAssetSlugs.has(slug),
    );
    for (const slug of rejectedSelected) selection.assets.delete(slug);
    if (rejectedSelected.length) {
      console.log(
        `[images] Gate відхилив ${rejectedSelected.length} assets; їх виключено з sync plan: ${rejectedSelected.join(", ")}.`,
      );
    }
    plan = buildPlan(
      selection,
      assets,
      options.batchSize,
      sourceCommit,
      options.target,
      options.batchMaxBytes,
    );
    packages = packagesFor(options.target, plan.hash);
    await fs.mkdir(packages, { recursive: true });
    if (options.send) {
      for (const name of await fs.readdir(packages)) {
        if (
          name.endsWith(".zip") ||
          (name.endsWith(".json") && name !== "plan.json")
        ) {
          await fs.rm(path.join(packages, name), { force: true });
        }
      }
    }
    const stored: StoredPlan = {
      version: 3,
      target: options.target,
      baseCommit: base,
      sourceCommit,
      planHash: plan.hash,
      batches: plan.batches.map((batch) => ({
        number: batch.number,
        id: batch.id,
        mode: batch.mode,
        overwriteFiles: batch.overwriteFiles,
        assets: batch.assets.map(
          ({ directory: _directory, ...asset }) => asset,
        ),
        tombstones: batch.tombstones,
      })),
    };
    await fs.writeFile(
      planFile(options.target, plan.hash),
      `${JSON.stringify(stored, null, 2)}\n`,
      "utf8",
    );
  }

  console.log(
    `[images] План: ${plan.batches.length} пакетів; hash ${plan.hash}.`,
  );
  if (!options.send) {
    console.log("[images] Відправку не виконано.");
    return;
  }
  assertResumePlan(prior, plan.hash);
  const checkpoint: Checkpoint =
    prior?.planHash === plan.hash
      ? prior
      : {
          version: 1,
          target: options.target,
          sourceCommit,
          baseCommit: base,
          planHash: plan.hash,
          results: {},
          reindex: "pending",
          completed: false,
        };
  await saveCheckpoint(checkpoint);
  await runCheckpointedSync(plan.batches, checkpoint, {
    processBatch: async (batch) => {
      let result = await transport<BatchResult | null>(
        options,
        config,
        "result",
        {
          MEDIA_SYNC_BATCH_ID: batch.id,
        },
      );
      if (result?.status === "completed" && result.failed === 0) {
        recoveredBatches += 1;
        console.log(
          `[images] Пакет ${batch.number}/${plan.batches.length} відновлено з durable result.`,
        );
        return result;
      }
      if (batch.number < options.fromBatch) {
        throw new Error(
          `--from-batch не може пропустити пакет без terminal success: ${batch.id}.`,
        );
      }
      try {
        if (batch.mode === "tombstones") {
          const file = path.join(packages, `${batch.id}.json`);
          await fs.writeFile(
            file,
            `${JSON.stringify(batch.tombstones)}\n`,
            "utf8",
          );
          try {
            result = await transport(options, config, "tombstones", {
              MEDIA_SYNC_BATCH_ID: batch.id,
              MEDIA_SYNC_TOMBSTONES_FILE: file,
            });
          } finally {
            await fs.rm(file, { force: true });
          }
        } else {
          const archive = await createArchive(
            batch,
            sourceCommit,
            options.target,
            packages,
          );
          result = await transport(options, config, "batch", {
            MEDIA_SYNC_BATCH_ID: batch.id,
            MEDIA_SYNC_ARCHIVE: archive.path,
            MEDIA_SYNC_CHECKSUM: archive.checksum,
          });
          if (!result)
            throw new Error(`Пакет ${batch.id} не повернув результат.`);
          result.archiveChecksum = archive.checksum;
        }
      } catch (error) {
        const recovered = await transport<BatchResult | null>(
          options,
          config,
          "result",
          {
            MEDIA_SYNC_BATCH_ID: batch.id,
          },
        ).catch(() => null);
        if (
          !recovered ||
          recovered.status !== "completed" ||
          recovered.failed > 0
        )
          throw error;
        recoveredBatches += 1;
        result = recovered;
      }
      if (!result) throw new Error(`Пакет ${batch.id} не повернув результат.`);
      console.log(
        `[images] Пакет ${batch.number}/${plan.batches.length} завершено.`,
      );
      return result;
    },
    persist: saveCheckpoint,
    reindex: async () => {
      const result = await transport<{ status: string }>(
        options,
        config,
        "reindex",
      );
      if (result.status !== "completed")
        throw new Error("Переіндексація не завершена.");
    },
  });
  await writeMediaDeleteList([], MEDIA_DELETE_LIST_PATH);
  const totals = Object.values(checkpoint.results).reduce(
    (sum, item) => ({
      imported: sum.imported + item.imported,
      updated: sum.updated + item.updated,
      skipped: sum.skipped + item.skipped,
      deleted: sum.deleted + item.deleted,
      failed: sum.failed + item.failed,
    }),
    { imported: 0, updated: 0, skipped: 0, deleted: 0, failed: 0 },
  );
  console.log(
    `[images] Sync завершено: ${JSON.stringify({ target: options.target, planHash: plan.hash, recoveredBatches, ...totals, packages: Object.keys(checkpoint.results).length, reindex: checkpoint.reindex, durationMs: Date.now() - startedAt })}`,
  );
}

if (require.main === module)
  main().catch((error) => {
    console.error(
      `[images] Помилка: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  });
