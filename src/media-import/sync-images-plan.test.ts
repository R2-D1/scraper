import assert from "node:assert/strict";
import test from "node:test";

import { buildPlan, metadataForBatch, type Asset } from "./sync-images";
import { classifyPreparedAssetFiles, runCheckpointedSync } from "./sync-images-plan";
import {
  confirmHistoricalFileVersions,
  emptyMediaSyncState,
  recordExplicitDeletions,
  recordSuccessfulBatch,
  seedTargetFromInventory,
  selectPendingMedia,
} from "./media-sync-state";

const asset = (slug: string, overrides: Partial<Asset> = {}): Asset => ({
  slug,
  mediaKey: `${slug}-key`,
  contentHash: `${slug}-content`,
  metadataHash: `${slug}-metadata`,
  directory: `/tmp/${slug}`,
  hasCollectionPreviews: false,
  needsFinalization: false,
  sizeBytes: 10,
  ...overrides,
});

test("each environment independently selects new, changed file and changed metadata", () => {
  const state = emptyMediaSyncState();
  const first = asset("first");
  assert.equal(selectPendingMedia([first], state, "dev").assets.get("first"), "new-file");
  recordSuccessfulBatch(state, "dev", { mode: "files", assets: [first], tombstones: [] });
  assert.equal(selectPendingMedia([first], state, "dev").assets.size, 0);
  assert.equal(selectPendingMedia([first], state, "stage").assets.get("first"), "new-file");
  assert.equal(selectPendingMedia([{ ...first, metadataHash: "new-metadata" }], state, "dev").assets.get("first"), "metadata");
  assert.equal(selectPendingMedia([{ ...first, contentHash: "new-content" }], state, "dev").assets.get("first"), "changed-file");
});

test("metadata requiring finalization stays pending until its final package succeeds", () => {
  const state = emptyMediaSyncState();
  const first = asset("first", { needsFinalization: true, hasCollectionPreviews: true });
  recordSuccessfulBatch(state, "stage", { mode: "files", assets: [first], tombstones: [] });
  assert.equal(selectPendingMedia([first], state, "stage").assets.get("first"), "metadata");
  recordSuccessfulBatch(state, "stage", { mode: "collection-previews", assets: [first], tombstones: [] });
  assert.equal(selectPendingMedia([first], state, "stage").assets.size, 0);
});

test("deletions are confirmed per environment and persist for the others", () => {
  const state = emptyMediaSyncState();
  const first = asset("first");
  for (const target of ["dev", "stage", "prod"] as const) {
    recordSuccessfulBatch(state, target, { mode: "files", assets: [first], tombstones: [] });
  }
  recordExplicitDeletions(state, [first.mediaKey]);
  const tombstone = { mode: "tombstones" as const, assets: [], tombstones: [first.mediaKey] };
  recordSuccessfulBatch(state, "stage", tombstone);
  assert.deepEqual(selectPendingMedia([], state, "stage").deletions, []);
  assert.deepEqual(selectPendingMedia([], state, "dev").deletions, [first.mediaKey]);
  assert.deepEqual(selectPendingMedia([], state, "prod").deletions, [first.mediaKey]);
});

test("a queued deletion cannot silently remove media still in the library", () => {
  const state = emptyMediaSyncState();
  const first = asset("first");
  assert.throws(() => selectPendingMedia([first], state, "dev", [first.mediaKey]));
});

test("unprepared live media is never mistaken for a deletion", () => {
  const state = emptyMediaSyncState();
  const first = asset("oversize");
  recordSuccessfulBatch(state, "dev", { mode: "files", assets: [first], tombstones: [] });
  assert.deepEqual(selectPendingMedia([], state, "dev", [], new Set([first.mediaKey])).deletions, []);
});

test("bootstrap trusts only server inventory and confirmed file packages", () => {
  const state = emptyMediaSyncState();
  const count = seedTargetFromInventory(
    state,
    "stage",
    [{ mediaKey: "a", hasFile: true, metadataHash: "remote-meta" }, { mediaKey: "b", hasFile: false }, { mediaKey: "unmanaged", hasFile: true }],
    new Set(["a", "b"]),
    { completed: false, results: { ok: { status: "completed", failed: 0 } } },
    [
      { id: "ok", mode: "files", assets: [{ mediaKey: "a", contentHash: "hash-a" }] },
      { id: "pending", mode: "files", assets: [{ mediaKey: "b", contentHash: "hash-b" }] },
    ],
  );
  assert.equal(count, 1);
  assert.deepEqual(state.assets.a.stage, { contentHash: "hash-a", metadataHash: null });
  assert.deepEqual(state.assets.b.stage, { contentHash: null, metadataHash: null });
  assert.equal(state.assets.unmanaged, undefined);
  assert.equal(state.bootstrapped.stage, true);
});

test("historical results recover only an unambiguous confirmed file version", () => {
  const state = emptyMediaSyncState();
  state.assets.a = { dev: { contentHash: null, metadataHash: "m" } };
  state.assets.b = { dev: { contentHash: null, metadataHash: "m" } };
  const count = confirmHistoricalFileVersions(
    state, "dev", [{ mediaKey: "a", hasFile: true }, { mediaKey: "b", hasFile: true }],
    [
      { assets: [{ mediaKey: "a", contentHash: "same" }, { mediaKey: "b", contentHash: "old" }] },
      { assets: [{ mediaKey: "a", contentHash: "same" }, { mediaKey: "b", contentHash: "new" }] },
    ],
  );
  assert.equal(count, 1);
  assert.equal(state.assets.a.dev?.contentHash, "same");
  assert.equal(state.assets.b.dev?.contentHash, null);
});

test("partial failure keeps only confirmed packages in local state", async () => {
  const state = emptyMediaSyncState();
  const first = asset("first");
  const second = asset("second");
  const checkpoint = { results: {} as Record<string, { batchId: string; status: "completed"; failed: number }>, reindex: "pending" as const, completed: false };
  const batches = [
    { id: "first", mode: "files" as const, assets: [first], tombstones: [] },
    { id: "second", mode: "files" as const, assets: [second], tombstones: [] },
  ];
  await assert.rejects(() => runCheckpointedSync(batches, checkpoint, {
    processBatch: async (batch) => ({ batchId: batch.id, status: "completed" as const, failed: batch.id === "second" ? 1 : 0 }),
    persist: async (next) => {
      if (next.results.first) recordSuccessfulBatch(state, "dev", batches[0]);
    },
    reindex: async () => { throw new Error("should not reindex"); },
  }));
  assert.equal(selectPendingMedia([first, second], state, "dev").assets.has("first"), false);
  assert.equal(selectPendingMedia([first, second], state, "dev").assets.get("second"), "new-file");
  assert.deepEqual(Object.keys(checkpoint.results), ["first"]);
});

test("plan bounds file packages and finalizes metadata after ordinary packages", () => {
  const first = asset("first", { sizeBytes: 70 });
  const second = asset("second", { sizeBytes: 70, needsFinalization: true });
  const plan = buildPlan(
    { assets: new Map([["first", "new-file"], ["second", "new-file"]]), deletions: [] },
    new Map([["first", first], ["second", second]]),
    100, "source", "dev", 100,
  );
  assert.deepEqual(plan.batches.map((batch) => batch.mode), ["files", "files", "collection-previews"]);
  assert.deepEqual(plan.batches.at(-1)?.assets.map((item) => item.slug), ["second"]);
});

test("finalization includes every member of a selected related group", () => {
  const first = asset("first", { needsFinalization: true, relatedGroupKey: "group" });
  const second = asset("second", { needsFinalization: true, relatedGroupKey: "group" });
  const plan = buildPlan(
    { assets: new Map([["first", "metadata"]]), deletions: [] },
    new Map([["first", first], ["second", second]]),
    100, "source", "dev",
  );
  assert.deepEqual(plan.batches.at(-1)?.assets.map((item) => item.slug), ["first", "second"]);
});

test("ordinary package omits group and preview metadata", () => {
  const metadata = { slug: "x", relatedGroup: { key: "g" }, collections: [{ slug: "images", previewMediaKeys: ["y"] }] };
  assert.deepEqual(metadataForBatch(metadata, false), { slug: "x", collections: [{ slug: "images" }] });
  assert.deepEqual(metadataForBatch(metadata, true, new Set(["g"])), metadata);
});

test("prepared file layout recognizes main, thumbnail and variants", () => {
  assert.deepEqual(
    classifyPreparedAssetFiles(["/x/a.webp", "/x/a_thumb.webp", "/x/a_w640.webp"], "a", "_thumb"),
    { main: ["/x/a.webp"], thumbnails: ["/x/a_thumb.webp"], variants: ["/x/a_w640.webp"] },
  );
});
