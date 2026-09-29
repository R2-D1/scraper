import { promises as fs } from "node:fs";

import type { SyncAssetKind, SyncSelection } from "./sync-images-plan";

export type SyncTarget = "dev" | "stage" | "prod";
export const SYNC_TARGETS: readonly SyncTarget[] = ["dev", "stage", "prod"];

export type SyncedVersion = {
  contentHash: string | null;
  metadataHash: string | null;
};

export type MediaSyncState = {
  version: 1;
  bootstrapped: Partial<Record<SyncTarget, true>>;
  assets: Record<string, Partial<Record<SyncTarget, SyncedVersion>>>;
  deletions: Record<string, Partial<Record<SyncTarget, true>>>;
};

export type LocalSyncAsset = {
  slug: string;
  mediaKey: string;
  contentHash: string;
  metadataHash: string;
};

export const emptyMediaSyncState = (): MediaSyncState => ({
  version: 1,
  bootstrapped: {},
  assets: {},
  deletions: {},
});

export async function readMediaSyncState(file: string): Promise<MediaSyncState> {
  const raw = await fs.readFile(file, "utf8");
  const state = JSON.parse(raw) as MediaSyncState;
  if (
    state.version !== 1 ||
    !state.bootstrapped || typeof state.bootstrapped !== "object" ||
    !state.assets || typeof state.assets !== "object" ||
    !state.deletions || typeof state.deletions !== "object"
  ) throw new Error("Некоректний реєстр синхронізації медіа.");
  return state;
}

export async function writeMediaSyncState(file: string, state: MediaSyncState): Promise<void> {
  const temporary = `${file}.${process.pid}.tmp`;
  try {
    await fs.writeFile(temporary, `${JSON.stringify(state)}\n`, "utf8");
    await fs.rename(temporary, file);
  } catch (error) {
    await fs.rm(temporary, { force: true });
    throw error;
  }
}

export function selectPendingMedia(
  assets: readonly LocalSyncAsset[],
  state: MediaSyncState,
  target: SyncTarget,
  explicitDeletions: readonly string[] = [],
  liveKeys?: ReadonlySet<string>,
): SyncSelection {
  const selected = new Map<string, SyncAssetKind>();
  const live = liveKeys ? new Set(liveKeys) : new Set<string>();
  const seen = new Set<string>();
  for (const asset of assets) {
    if (seen.has(asset.mediaKey)) throw new Error(`Дубль mediaKey: ${asset.mediaKey}`);
    seen.add(asset.mediaKey);
    live.add(asset.mediaKey);
    const previous = state.assets[asset.mediaKey]?.[target];
    if (!previous) selected.set(asset.slug, "new-file");
    else if (previous.contentHash !== asset.contentHash) selected.set(asset.slug, "changed-file");
    else if (previous.metadataHash !== asset.metadataHash) selected.set(asset.slug, "metadata");
  }
  const deletions = new Set<string>();
  for (const [key, targets] of Object.entries(state.assets)) {
    if (!live.has(key) && targets[target]) deletions.add(key);
  }
  for (const [key, done] of Object.entries(state.deletions)) {
    if (!done[target]) deletions.add(key);
  }
  for (const key of explicitDeletions) {
    if (!state.deletions[key]?.[target]) deletions.add(key);
  }
  for (const asset of assets) {
    if (deletions.has(asset.mediaKey)) {
      throw new Error(`Запит на видалення суперечить локальній бібліотеці: ${asset.mediaKey}`);
    }
  }
  return { assets: selected, deletions: [...deletions].sort() };
}

export function recordExplicitDeletions(state: MediaSyncState, keys: readonly string[]): void {
  for (const key of keys) state.deletions[key] ??= {};
}

export function seedTargetFromInventory(
  state: MediaSyncState,
  target: SyncTarget,
  inventory: readonly { mediaKey: string; hasFile: boolean; metadataHash?: string | null }[],
  liveKeys: ReadonlySet<string>,
  checkpoint: {
    completed: boolean;
    results: Record<string, { status: "completed"; failed: number }>;
  } | null,
  batches: readonly {
    id: string;
    mode: string;
    assets: readonly { mediaKey: string; contentHash: string }[];
  }[],
): number {
  if (state.bootstrapped[target]) throw new Error(`${target} уже перенесено.`);
  const remote = new Map(inventory.map((asset) => [asset.mediaKey, asset]));
  for (const key of liveKeys) {
    const item = remote.get(key);
    if (!item) continue;
    const targets = state.assets[key] ??= {};
    targets[target] = {
      contentHash: null,
      metadataHash: checkpoint?.completed ? item.metadataHash ?? null : null,
    };
  }
  let confirmedFiles = 0;
  for (const batch of batches) {
    const result = checkpoint?.results[batch.id];
    if (batch.mode !== "files" || result?.status !== "completed" || result.failed !== 0) continue;
    for (const asset of batch.assets) {
      if (!remote.get(asset.mediaKey)?.hasFile) continue;
      const version = state.assets[asset.mediaKey]?.[target];
      if (!version) continue;
      version.contentHash = asset.contentHash;
      confirmedFiles += 1;
    }
  }
  state.bootstrapped[target] = true;
  return confirmedFiles;
}

export function confirmHistoricalFileVersions(
  state: MediaSyncState,
  target: SyncTarget,
  inventory: readonly { mediaKey: string; hasFile: boolean }[],
  successfulBatches: readonly { assets: readonly { mediaKey: string; contentHash: string }[] }[],
): number {
  const existing = new Set(inventory.filter((item) => item.hasFile).map((item) => item.mediaKey));
  const candidates = new Map<string, Set<string>>();
  for (const batch of successfulBatches) {
    for (const asset of batch.assets) {
      if (!existing.has(asset.mediaKey)) continue;
      const hashes = candidates.get(asset.mediaKey) ?? new Set<string>();
      hashes.add(asset.contentHash);
      candidates.set(asset.mediaKey, hashes);
    }
  }
  let count = 0;
  for (const [key, hashes] of candidates) {
    const version = state.assets[key]?.[target];
    if (version && version.contentHash === null && hashes.size === 1) {
      version.contentHash = hashes.values().next().value ?? null;
      count += 1;
    }
  }
  return count;
}

export function recordSuccessfulBatch(
  state: MediaSyncState,
  target: SyncTarget,
  batch: {
    mode: "metadata" | "files" | "tombstones" | "collection-previews";
    assets: readonly (LocalSyncAsset & { needsFinalization?: boolean; relatedGroupKey?: string })[];
    tombstones: readonly string[];
  },
  completeRelatedGroups: ReadonlySet<string> = new Set(),
): void {
  for (const asset of batch.assets) {
    const targets = state.assets[asset.mediaKey] ??= {};
    const previous = targets[target] ?? { contentHash: null, metadataHash: null };
    if (batch.mode === "files") previous.contentHash = asset.contentHash;
    if (
      batch.mode === "collection-previews" &&
      (!asset.relatedGroupKey || completeRelatedGroups.has(asset.relatedGroupKey))
    ) previous.metadataHash = asset.metadataHash;
    if (batch.mode !== "collection-previews" && !asset.needsFinalization) {
      previous.metadataHash = asset.metadataHash;
    }
    targets[target] = previous;
  }
  for (const key of batch.tombstones) {
    const targets = state.assets[key];
    if (targets) {
      delete targets[target];
      if (!SYNC_TARGETS.some((environment) => targets[environment])) delete state.assets[key];
    }
    const deletion = state.deletions[key];
    if (deletion) {
      deletion[target] = true;
      if (SYNC_TARGETS.every((environment) => deletion[environment])) delete state.deletions[key];
    }
  }
}
