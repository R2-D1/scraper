export type SyncAssetKind = "metadata" | "new-file" | "changed-file";

export type GitFileChange = {
  status: string;
  path: string;
  previousPath?: string;
};

export type SyncSelection = {
  assets: Map<string, SyncAssetKind>;
  deletions: string[];
};

export const mergeMediaDeleteList = (
  selection: SyncSelection,
  mediaKeys: readonly string[],
): SyncSelection => ({
  assets: new Map(selection.assets),
  deletions: [...new Set([...selection.deletions, ...mediaKeys])].sort((a, b) =>
    a.localeCompare(b, "en"),
  ),
});

export type SyncInventoryItem = {
  mediaKey: string;
  hasFile: boolean;
  metadataHash?: string | null;
};

export type PreparedSyncAsset = {
  slug: string;
  mediaKey: string;
  contentHash: string;
  metadataHash: string;
};

export type SyncPrepareOptions = {
  outDir: string;
  keep: true;
  createArchive: false;
  includeSlugs?: ReadonlySet<string>;
};

export type CheckpointedResult = {
  batchId: string;
  status: "completed";
  failed: number;
};

export type CheckpointedSyncState<R extends CheckpointedResult> = {
  results: Record<string, R>;
  reindex: "pending" | "completed";
  completed: boolean;
};

export const classifyPreparedAssetFiles = (
  files: readonly string[],
  slug: string,
  thumbnailSuffix: string,
) => {
  const thumbnailName = `${slug}${thumbnailSuffix}.webp`;
  const thumbnails = files.filter(
    (file) => file.replace(/\\/g, "/").split("/").pop() === thumbnailName,
  );
  const variants = files
    .map((file) => {
      const name = file.replace(/\\/g, "/").split("/").pop() ?? "";
      const prefix = `${slug}_w`;
      const width =
        name.startsWith(prefix) && name.endsWith(".webp")
          ? Number(name.slice(prefix.length, -".webp".length))
          : NaN;
      return { file, width };
    })
    .filter((item) => Number.isFinite(item.width) && item.width > 0)
    .sort((left, right) => left.width - right.width)
    .map((item) => item.file);
  const derived = new Set([...thumbnails, ...variants]);
  return {
    main: files.filter((file) => !derived.has(file)),
    thumbnails,
    variants,
  };
};

const GLOBAL_METADATA_PATHS = new Set([
  "library/collections.json",
  "library/related-image-groups.json",
]);

const KIND_PRIORITY: Record<SyncAssetKind, number> = {
  metadata: 1,
  "new-file": 2,
  "changed-file": 3,
};

const assetSlugFromPath = (filePath: string): string | null => {
  const normalized = filePath.replace(/\\/g, "/");
  const match = normalized.match(
    /^library\/(?:unsplash|pexels|lummi|custom-images)\/(?:images|illustrations|videos)\/([^/]+)\//,
  );
  return match?.[1] ?? null;
};

const mergeKind = (
  target: Map<string, SyncAssetKind>,
  slug: string,
  kind: SyncAssetKind,
) => {
  const current = target.get(slug);
  if (!current || KIND_PRIORITY[kind] > KIND_PRIORITY[current]) {
    target.set(slug, kind);
  }
};

export const parseGitNameStatus = (output: string): GitFileChange[] =>
  output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("\t");
      const status = parts[0] ?? "";
      if (status.startsWith("R") || status.startsWith("C")) {
        return {
          status,
          previousPath: parts[1],
          path: parts[2] ?? "",
        };
      }
      return { status, path: parts[1] ?? "" };
    })
    .filter((change) => Boolean(change.status && change.path));

export const buildSyncSelection = (
  changes: readonly GitFileChange[],
  availableSlugs: readonly string[],
): SyncSelection => {
  const assets = new Map<string, SyncAssetKind>();
  const deletions = new Set<string>();
  let allMetadata = false;

  for (const change of changes) {
    if (GLOBAL_METADATA_PATHS.has(change.path)) {
      allMetadata = true;
      continue;
    }

    const slug = assetSlugFromPath(change.path);
    const previousSlug = change.previousPath
      ? assetSlugFromPath(change.previousPath)
      : null;
    const code = change.status[0];

    if (code === "D") {
      if (slug) deletions.add(slug);
      continue;
    }
    if (code === "R" && previousSlug && previousSlug !== slug) {
      deletions.add(previousSlug);
    }
    if (!slug) {
      continue;
    }

    const isMetadata = change.path.endsWith("/media-meta.json");
    const kind: SyncAssetKind =
      code === "A"
        ? "new-file"
        : code === "M" && isMetadata
          ? "metadata"
          : "changed-file";
    mergeKind(assets, slug, kind);
  }

  if (allMetadata) {
    for (const slug of availableSlugs) {
      mergeKind(assets, slug, "metadata");
    }
  }

  for (const slug of deletions) {
    assets.delete(slug);
  }

  return {
    assets,
    deletions: Array.from(deletions).sort((a, b) => a.localeCompare(b, "en")),
  };
};

export const chunk = <T>(items: readonly T[], size: number): T[][] => {
  if (!Number.isInteger(size) || size < 1) {
    throw new Error("Розмір пакета має бути додатним цілим числом.");
  }
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
};

export const includeFilesForMetadata = (
  selection: SyncSelection,
): SyncSelection => ({
  assets: new Map(
    Array.from(selection.assets, ([slug, kind]) => [
      slug,
      kind === "metadata" ? "new-file" : kind,
    ]),
  ),
  deletions: [...selection.deletions],
});

export const buildSyncPrepareOptions = (
  outDir: string,
  selection: SyncSelection | null,
): SyncPrepareOptions => ({
  outDir,
  keep: true,
  createArchive: false,
  includeSlugs: selection ? new Set(selection.assets.keys()) : undefined,
});

export const buildFullSyncSelection = (
  assets: readonly PreparedSyncAsset[],
  inventory: readonly SyncInventoryItem[],
): SyncSelection => {
  const byKey = new Map(inventory.map((item) => [item.mediaKey, item]));
  const selected = new Map<string, SyncAssetKind>();
  for (const asset of assets) {
    const remote = byKey.get(asset.mediaKey);
    if (!remote) {
      selected.set(asset.slug, "new-file");
      continue;
    }
    if (!remote.hasFile) {
      selected.set(asset.slug, "changed-file");
      continue;
    }
    if (remote.metadataHash !== asset.metadataHash) {
      selected.set(asset.slug, "metadata");
    }
  }
  return { assets: selected, deletions: [] };
};

export const runSequentially = async <T>(
  items: readonly T[],
  process: (item: T, index: number) => Promise<void>,
): Promise<void> => {
  for (let index = 0; index < items.length; index += 1) {
    await process(items[index], index);
  }
};

export const assertResumePlan = (
  checkpoint: { completed: boolean; planHash: string } | null,
  planHash: string,
): void => {
  if (checkpoint && !checkpoint.completed && checkpoint.planHash !== planHash) {
    throw new Error("Незавершений checkpoint належить іншому plan hash.");
  }
};

export const runCheckpointedSync = async <
  B extends { id: string },
  R extends CheckpointedResult,
  C extends CheckpointedSyncState<R>,
>(
  batches: readonly B[],
  checkpoint: C,
  actions: {
    processBatch: (batch: B) => Promise<R>;
    persist: (checkpoint: C) => Promise<void>;
    reindex: () => Promise<void>;
  },
): Promise<C> => {
  for (const batch of batches) {
    if (checkpoint.results[batch.id]) continue;
    const result = await actions.processBatch(batch);
    if (result.status !== "completed" || result.failed > 0) {
      throw new Error(`Пакет ${batch.id} не завершений успішно.`);
    }
    const next = {
      ...checkpoint,
      results: { ...checkpoint.results, [batch.id]: result },
    } as C;
    await actions.persist(next);
    Object.assign(checkpoint, next);
  }
  if (checkpoint.reindex !== "completed") {
    await actions.reindex();
    const next = { ...checkpoint, reindex: "completed" as const } as C;
    await actions.persist(next);
    Object.assign(checkpoint, next);
  }
  if (!checkpoint.completed) {
    const next = { ...checkpoint, completed: true } as C;
    await actions.persist(next);
    Object.assign(checkpoint, next);
  }
  return checkpoint;
};
