import { promises as fs } from "node:fs";
import path from "node:path";

import type { SyncAssetKind, SyncSelection } from "./sync-images-plan";

export type SyncTarget = "dev" | "stage" | "prod";
export const SYNC_TARGETS: readonly SyncTarget[] = ["dev", "stage", "prod"];

export type PendingMedia = {
  revision: number;
  file: SyncTarget[];
  metadata: SyncTarget[];
  delete?: SyncTarget[];
  reprepare?: boolean;
};

export type MediaSyncState = { version: 2; pending: Record<string, PendingMedia> };
export type LocalSyncAsset = { slug: string; mediaKey: string; syncRevision?: number };
export const emptyMediaSyncState = (): MediaSyncState => ({ version: 2, pending: {} });

export async function readMediaSyncState(file: string): Promise<MediaSyncState> {
  const state = JSON.parse(await fs.readFile(file, "utf8")) as MediaSyncState;
  if (state.version !== 2 || !state.pending || typeof state.pending !== "object") {
    throw new Error("Некоректний реєстр синхронізації медіа.");
  }
  return state;
}

async function writeMediaSyncState(file: string, state: MediaSyncState): Promise<void> {
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.writeFile(temporary, `${JSON.stringify(state)}\n`, "utf8");
    await fs.rename(temporary, file);
  } catch (error) {
    await fs.rm(temporary, { force: true });
    throw error;
  }
}

// Library writers and the sync process share this short lock. The sync itself has
// a separate long-running lock, so an editor never waits for a server import.
export async function updateMediaSyncState(
  file: string,
  change: (state: MediaSyncState) => void,
): Promise<void> {
  const lockPath = `${file}.update.lock`;
  let lock: Awaited<ReturnType<typeof fs.open>> | undefined;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      lock = await fs.open(lockPath, "wx");
      await lock.writeFile(String(process.pid));
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const owner = Number(await fs.readFile(lockPath, "utf8").catch(() => "0"));
      if (!owner) {
        const stat = await fs.stat(lockPath).catch(() => null);
        if (stat && Date.now() - stat.mtimeMs > 60_000) {
          await fs.rm(lockPath, { force: true });
          continue;
        }
      }
      if (owner && owner !== process.pid) {
        try { process.kill(owner, 0); } catch (checkError) {
          if ((checkError as NodeJS.ErrnoException).code === "ESRCH") {
            await fs.rm(lockPath, { force: true });
            continue;
          }
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  if (!lock) throw new Error("Реєстр синхронізації зайнятий.");
  try {
    const state = await readMediaSyncState(file).catch((error) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyMediaSyncState();
      throw error;
    });
    change(state);
    await writeMediaSyncState(file, state);
  } finally {
    await lock.close();
    await fs.rm(lockPath, { force: true });
  }
}

export function markMediaPending(state: MediaSyncState, key: string, kind: "file" | "metadata" | "delete"): void {
  if (!key.trim()) throw new Error("Порожній mediaKey.");
  const current = state.pending[key] ?? { revision: 0, file: [], metadata: [] };
  current.revision += 1;
  if (kind === "delete") {
    current.file = [];
    current.metadata = [];
    current.delete = [...SYNC_TARGETS];
    delete current.reprepare;
  } else {
    delete current.delete;
    current.metadata = [...new Set([...current.metadata, ...SYNC_TARGETS])];
    if (kind === "file") current.file = [...new Set([...current.file, ...SYNC_TARGETS])];
    if (kind === "file") current.reprepare = true;
  }
  state.pending[key] = current;
}

export async function markMediaPendingInProject(
  root: string,
  key: string,
  kind: "file" | "metadata" | "delete",
): Promise<void> {
  await updateMediaSyncState(path.join(root, "media-sync-state.json"), (state) =>
    markMediaPending(state, key, kind));
}

export async function markMediaPendingForMetadata(
  metadataPath: string,
  kind: "file" | "metadata",
): Promise<void> {
  const resolved = path.resolve(metadataPath);
  const marker = `${path.sep}library${path.sep}`;
  const index = resolved.lastIndexOf(marker);
  if (index < 0) return;
  const root = resolved.slice(0, index);
  const meta = JSON.parse(await fs.readFile(resolved, "utf8")) as { mediaKey?: string; slug?: string };
  const key = meta.mediaKey?.trim() || meta.slug?.trim();
  if (!key) throw new Error(`Медіа без ключа: ${resolved}`);
  await markMediaPendingInProject(root, key, kind);
}

export function selectPendingMedia(
  assets: readonly LocalSyncAsset[],
  state: MediaSyncState,
  target: SyncTarget,
  liveKeys?: ReadonlySet<string>,
): SyncSelection {
  const selected = new Map<string, SyncAssetKind>();
  const live = liveKeys ?? new Set(assets.map((asset) => asset.mediaKey));
  const byKey = new Map(assets.map((asset) => [asset.mediaKey, asset]));
  const deletions: string[] = [];
  for (const [key, pending] of Object.entries(state.pending)) {
    if (pending.delete?.includes(target)) {
      if (live.has(key)) throw new Error(`Запит на видалення суперечить локальній бібліотеці: ${key}`);
      deletions.push(key);
      continue;
    }
    const asset = byKey.get(key);
    if (!asset) continue;
    if (pending.file.includes(target)) selected.set(asset.slug, "changed-file");
    else if (pending.metadata.includes(target)) selected.set(asset.slug, "metadata");
  }
  return { assets: selected, deletions: deletions.sort() };
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
  tombstoneRevisions: Readonly<Record<string, number>> = {},
): void {
  for (const asset of batch.assets) {
    const pending = state.pending[asset.mediaKey];
    if (!pending || pending.revision !== asset.syncRevision) continue;
    if (batch.mode === "files") pending.file = pending.file.filter((item) => item !== target);
    if (
      (batch.mode === "collection-previews" && (!asset.relatedGroupKey || completeRelatedGroups.has(asset.relatedGroupKey))) ||
      (batch.mode !== "collection-previews" && !asset.needsFinalization)
    ) pending.metadata = pending.metadata.filter((item) => item !== target);
    if (!pending.file.length && !pending.metadata.length && !pending.delete?.length) delete state.pending[asset.mediaKey];
  }
  for (const key of batch.tombstones) {
    const pending = state.pending[key];
    if (!pending || pending.revision !== tombstoneRevisions[key]) continue;
    pending.delete = pending.delete?.filter((item) => item !== target);
    if (!pending.file.length && !pending.metadata.length && !pending.delete?.length) delete state.pending[key];
  }
}
