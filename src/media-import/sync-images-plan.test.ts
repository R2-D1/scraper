import assert from "node:assert/strict";
import test from "node:test";

import {
  assertResumePlan,
  buildFullSyncSelection,
  buildSyncPrepareOptions,
  buildSyncSelection,
  classifyPreparedAssetFiles,
  chunk,
  includeFilesForMetadata,
  mergeMediaDeleteList,
  parseGitNameStatus,
  runCheckpointedSync,
  runSequentially,
} from "./sync-images-plan";
import { buildPlan, metadataForBatch, type Asset } from "./sync-images";

const preparedAsset = (slug: string, hasCollectionPreviews = false): Asset => ({
  slug,
  mediaKey: `${slug}-key`,
  contentHash: `${slug}-hash`,
  metadataHash: `${slug}-meta-hash`,
  directory: `/tmp/${slug}`,
  hasCollectionPreviews,
  sizeBytes: 10,
});

test("classifies metadata, new files, changed files and deletions", () => {
  const changes = parseGitNameStatus(
    [
      "M\tlibrary/unsplash/images/meta-only/media-meta.json",
      "A\tlibrary/unsplash/images/new-one/new-one.jpg",
      "M\tlibrary/custom-images/images/replaced/replaced.png",
      "A\tlibrary/lummi/images/lummi-new/lummi-new.png",
      "D\tlibrary/unsplash/illustrations/removed/media-meta.json",
    ].join("\n"),
  );
  const selection = buildSyncSelection(changes, [
    "meta-only",
    "new-one",
    "replaced",
    "lummi-new",
  ]);

  assert.deepEqual(Object.fromEntries(selection.assets), {
    "meta-only": "metadata",
    "new-one": "new-file",
    replaced: "changed-file",
    "lummi-new": "new-file",
  });
  assert.deepEqual(selection.deletions, ["removed"]);
});

test("orchestration waits for terminal success and stops before the next package on failure", async () => {
  const events: string[] = [];
  let finishFirst: (() => void) | undefined;
  const firstTerminal = new Promise<void>((resolve) => {
    finishFirst = resolve;
  });
  const running = runSequentially(["first", "second"], async (item) => {
    events.push(`start:${item}`);
    if (item === "first") await firstTerminal;
    events.push(`finish:${item}`);
  });
  await Promise.resolve();
  assert.deepEqual(events, ["start:first"]);
  finishFirst?.();
  await running;
  assert.deepEqual(events, [
    "start:first",
    "finish:first",
    "start:second",
    "finish:second",
  ]);

  const failed: string[] = [];
  await assert.rejects(() =>
    runSequentially(["first", "second"], async (item) => {
      failed.push(item);
      throw new Error("worker failed");
    }),
  );
  assert.deepEqual(failed, ["first"]);
});

test("full sync updates existing metadata and uploads only missing file sets", () => {
  const selection = buildFullSyncSelection(
    [
      {
        slug: "same",
        mediaKey: "same-key",
        contentHash: "hash-a",
        metadataHash: "meta-a",
      },
      {
        slug: "missing",
        mediaKey: "missing-key",
        contentHash: "hash-b",
        metadataHash: "meta-b",
      },
      {
        slug: "record-without-file",
        mediaKey: "without-file-key",
        contentHash: "hash-c",
        metadataHash: "meta-c",
      },
    ],
    [
      { mediaKey: "same-key", hasFile: true, metadataHash: "meta-a" },
      { mediaKey: "without-file-key", hasFile: false },
    ],
  );

  assert.deepEqual(Object.fromEntries(selection.assets), {
    missing: "new-file",
    "record-without-file": "changed-file",
  });
});

test("collection previews are finalized only after every ordinary package", () => {
  const referenced = preparedAsset("referenced");
  const declaring = preparedAsset("declaring", true);
  const assets = new Map([
    [referenced.slug, referenced],
    [declaring.slug, declaring],
  ]);
  const plan = buildPlan(
    {
      assets: new Map([
        [referenced.slug, "new-file"],
        [declaring.slug, "metadata"],
      ]),
      deletions: [],
    },
    assets,
    1,
    "source-commit",
    "stage",
  );

  assert.deepEqual(
    plan.batches.map((batch) => batch.mode),
    ["metadata", "files", "collection-previews"],
  );
  assert.deepEqual(
    plan.batches.at(-1)?.assets.map((asset) => asset.slug),
    ["declaring"],
  );
});

test("file packages are bounded by total bytes as well as item count", () => {
  const first = { ...preparedAsset("first"), sizeBytes: 70 };
  const second = { ...preparedAsset("second"), sizeBytes: 70 };
  const assets = new Map([
    [first.slug, first],
    [second.slug, second],
  ]);
  const plan = buildPlan(
    {
      assets: new Map([
        [first.slug, "new-file"],
        [second.slug, "new-file"],
      ]),
      deletions: [],
    },
    assets,
    100,
    "source-commit",
    "dev",
    100,
  );

  assert.deepEqual(
    plan.batches.map((batch) => batch.assets.map((asset) => asset.slug)),
    [["first"], ["second"]],
  );
});

test("ordinary packages omit collection previews and related groups; finalization preserves them", () => {
  const metadata = {
    slug: "declaring",
    relatedGroup: { key: "group-a", position: 0 },
    collections: [
      { slug: "architecture", previewMediaKeys: ["referenced-key"] },
      { slug: "abstract" },
    ],
  };

  assert.deepEqual(metadataForBatch(metadata, false), {
    slug: "declaring",
    collections: [{ slug: "architecture" }, { slug: "abstract" }],
  });
  assert.deepEqual(metadataForBatch(metadata, true), metadata);
});

test("resume rejects a different plan hash but accepts the same plan", () => {
  assert.doesNotThrow(() =>
    assertResumePlan({ completed: false, planHash: "same" }, "same"),
  );
  assert.throws(() =>
    assertResumePlan({ completed: false, planHash: "old" }, "new"),
  );
});

test("global collection changes select all current assets as metadata-only", () => {
  const selection = buildSyncSelection(
    [{ status: "M", path: "library/collections.json" }],
    ["first", "second"],
  );

  assert.deepEqual(Object.fromEntries(selection.assets), {
    first: "metadata",
    second: "metadata",
  });
});

test("chunks deterministically and rejects invalid sizes", () => {
  assert.deepEqual(chunk(["a", "b", "c"], 2), [["a", "b"], ["c"]]);
  assert.throws(() => chunk(["a"], 0));
});

test("can include files for metadata-only bootstrap without overwriting changed files", () => {
  const selection = includeFilesForMetadata({
    assets: new Map([
      ["metadata-only", "metadata"],
      ["changed", "changed-file"],
    ]),
    deletions: ["removed"],
  });

  assert.deepEqual(Object.fromEntries(selection.assets), {
    "metadata-only": "new-file",
    changed: "changed-file",
  });
  assert.deepEqual(selection.deletions, ["removed"]);
});

test("merges explicit media delete requests into tombstones without selecting assets", () => {
  const selection = mergeMediaDeleteList(
    {
      assets: new Map([["kept", "metadata"]]),
      deletions: ["old-key"],
    },
    ["new-key", "old-key"],
  );

  assert.deepEqual(Object.fromEntries(selection.assets), { kept: "metadata" });
  assert.deepEqual(selection.deletions, ["new-key", "old-key"]);
});

test("sync preserves prepared files and only fills missing assets", () => {
  const options = buildSyncPrepareOptions("/tmp/prepared-images", {
    assets: new Map([["missing", "new-file"]]),
    deletions: [],
  });

  assert.equal(options.keep, true);
  assert.equal(options.createArchive, false);
  assert.deepEqual(Array.from(options.includeSlugs ?? []), ["missing"]);
});

test("classifies the canonical flat prepared image file layout", () => {
  assert.deepEqual(
    classifyPreparedAssetFiles(
      [
        "/tmp/asset/asset.webp",
        "/tmp/asset/asset_thumb.webp",
        "/tmp/asset/asset_w1600.webp",
        "/tmp/asset/asset_w512.webp",
      ],
      "asset",
      "_thumb",
    ),
    {
      main: ["/tmp/asset/asset.webp"],
      thumbnails: ["/tmp/asset/asset_thumb.webp"],
      variants: ["/tmp/asset/asset_w512.webp", "/tmp/asset/asset_w1600.webp"],
    },
  );
});

const terminal = (batchId: string) => ({
  batchId,
  status: "completed" as const,
  failed: 0,
});

const checkpoint = () => ({
  results: {} as Record<string, ReturnType<typeof terminal>>,
  reindex: "pending" as const,
  completed: false,
});

test("lost response resumes the same batch from its terminal server result", async () => {
  const state = checkpoint();
  let attempts = 0;
  let serverResult: ReturnType<typeof terminal> | null = null;
  const processBatch = async ({ id }: { id: string }) => {
    attempts += 1;
    if (!serverResult) {
      serverResult = terminal(id);
      throw new Error("response lost");
    }
    return serverResult;
  };
  await assert.rejects(() =>
    runCheckpointedSync([{ id: "batch-1" }], state, {
      processBatch,
      persist: async () => undefined,
      reindex: async () => undefined,
    }),
  );
  assert.deepEqual(state.results, {});

  await runCheckpointedSync([{ id: "batch-1" }], state, {
    processBatch,
    persist: async () => undefined,
    reindex: async () => undefined,
  });
  assert.equal(attempts, 2);
  assert.equal(state.completed, true);
});

test("checkpoint write failure does not advance in-memory progress and retries safely", async () => {
  const state = checkpoint();
  let attempts = 0;
  await assert.rejects(() =>
    runCheckpointedSync([{ id: "batch-1" }], state, {
      processBatch: async ({ id }) => {
        attempts += 1;
        return terminal(id);
      },
      persist: async () => {
        throw new Error("checkpoint write failed");
      },
      reindex: async () => undefined,
    }),
  );
  assert.deepEqual(state.results, {});

  await runCheckpointedSync([{ id: "batch-1" }], state, {
    processBatch: async ({ id }) => {
      attempts += 1;
      return terminal(id);
    },
    persist: async () => undefined,
    reindex: async () => undefined,
  });
  assert.equal(attempts, 2);
  assert.equal(state.completed, true);
});

test("retry after reindex failure skips completed batches and only reindexes", async () => {
  const state = {
    results: { "batch-1": terminal("batch-1") },
    reindex: "pending" as const,
    completed: false,
  };
  let batches = 0;
  let reindexes = 0;
  await assert.rejects(() =>
    runCheckpointedSync([{ id: "batch-1" }], state, {
      processBatch: async ({ id }) => {
        batches += 1;
        return terminal(id);
      },
      persist: async () => undefined,
      reindex: async () => {
        reindexes += 1;
        throw new Error("reindex failed");
      },
    }),
  );
  await runCheckpointedSync([{ id: "batch-1" }], state, {
    processBatch: async ({ id }) => {
      batches += 1;
      return terminal(id);
    },
    persist: async () => undefined,
    reindex: async () => {
      reindexes += 1;
    },
  });
  assert.equal(batches, 0);
  assert.equal(reindexes, 2);
  assert.equal(state.completed, true);
});

test("enqueue failure stops before the next package and does not advance checkpoint", async () => {
  const state = checkpoint();
  const attempted: string[] = [];
  await assert.rejects(() =>
    runCheckpointedSync([{ id: "batch-1" }, { id: "batch-2" }], state, {
      processBatch: async ({ id }): Promise<ReturnType<typeof terminal>> => {
        attempted.push(id);
        throw new Error("enqueue failed");
      },
      persist: async () => undefined,
      reindex: async () => undefined,
    }),
  );
  assert.deepEqual(attempted, ["batch-1"]);
  assert.deepEqual(state.results, {});
});
