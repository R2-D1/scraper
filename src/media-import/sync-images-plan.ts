export type SyncAssetKind = "metadata" | "new-file" | "changed-file";

export type SyncSelection = {
  assets: Map<string, SyncAssetKind>;
  deletions: string[];
};

export type SyncInventoryItem = {
  mediaKey: string;
  hasFile: boolean;
  metadataHash?: string | null;
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
