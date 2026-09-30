import assert from "node:assert/strict";
import test from "node:test";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { buildPlan, metadataForBatch, type Asset } from "./sync-images";
import { classifyPreparedAssetFiles, runCheckpointedSync } from "./sync-images-plan";
import {
  emptyMediaSyncState,
  markMediaPending,
  markMediaPendingForMetadata,
  readMediaSyncState,
  recordSuccessfulBatch,
  selectPendingMedia,
  updateMediaSyncState,
} from "./media-sync-state";
import { mediaSettings } from "../config/media-settings";

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

test("oversized SVG stays in the library without a sync queue entry", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "media-sync-svg-"));
  try {
    const directory = path.join(root, "library", "unsplash", "Illustration", "sample");
    await fs.mkdir(directory, { recursive: true });
    const metadataPath = path.join(directory, "media-meta.json");
    const svgPath = path.join(directory, "sample.svg");
    await fs.writeFile(metadataPath, JSON.stringify({ mediaKey: "sample-key", slug: "sample" }));
    await fs.writeFile(svgPath, Buffer.alloc(mediaSettings.maxSvgBytes + 1));
    await markMediaPendingForMetadata(metadataPath, "file");
    assert.deepEqual((await readMediaSyncState(path.join(root, "media-sync-state.json"))).pending, {});
    await fs.writeFile(svgPath, Buffer.alloc(mediaSettings.maxSvgBytes));
    await markMediaPendingForMetadata(metadataPath, "file");
    assert.ok((await readMediaSyncState(path.join(root, "media-sync-state.json"))).pending["sample-key"]);
    await fs.writeFile(svgPath, Buffer.alloc(mediaSettings.maxSvgBytes + 1));
    await markMediaPendingForMetadata(metadataPath, "metadata");
    assert.deepEqual((await readMediaSyncState(path.join(root, "media-sync-state.json"))).pending, {});
    assert.equal((await fs.stat(svgPath)).size, mediaSettings.maxSvgBytes + 1);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("new and changed media are tracked only while environments need them", () => {
  const state = emptyMediaSyncState();
  const first = asset("first", { syncRevision: 1 });
  markMediaPending(state, first.mediaKey, "file");
  assert.deepEqual(Object.keys(state.pending), [first.mediaKey]);
  for (const target of ["dev", "stage", "prod"] as const) {
    assert.equal(selectPendingMedia([first], state, target).assets.get("first"), "changed-file");
    recordSuccessfulBatch(state, target, { mode: "files", assets: [first], tombstones: [] });
  }
  assert.deepEqual(state.pending, {});
  markMediaPending(state, first.mediaKey, "metadata");
  assert.equal(selectPendingMedia([first], state, "dev").assets.get("first"), "metadata");
  assert.equal(selectPendingMedia([first], state, "stage").assets.get("first"), "metadata");
});

test("metadata requiring finalization stays pending until its final package succeeds", () => {
  const state = emptyMediaSyncState();
  const first = asset("first", { syncRevision: 1, needsFinalization: true, hasCollectionPreviews: true });
  markMediaPending(state, first.mediaKey, "file");
  recordSuccessfulBatch(state, "stage", { mode: "files", assets: [first], tombstones: [] });
  assert.equal(selectPendingMedia([first], state, "stage").assets.get("first"), "metadata");
  recordSuccessfulBatch(state, "stage", { mode: "collection-previews", assets: [first], tombstones: [] });
  assert.equal(selectPendingMedia([first], state, "stage").assets.size, 0);
});

test("deletions are confirmed separately and removed after the last environment", () => {
  const state = emptyMediaSyncState();
  markMediaPending(state, "deleted-key", "delete");
  const tombstone = { mode: "tombstones" as const, assets: [], tombstones: ["deleted-key"] };
  for (const target of ["dev", "stage", "prod"] as const) {
    assert.deepEqual(selectPendingMedia([], state, target).deletions, ["deleted-key"]);
    recordSuccessfulBatch(state, target, tombstone, new Set(), { "deleted-key": 1 });
  }
  assert.deepEqual(state.pending, {});
});

test("editing during an in-flight package keeps the new revision pending", () => {
  const state = emptyMediaSyncState();
  const first = asset("first", { syncRevision: 1 });
  markMediaPending(state, first.mediaKey, "file");
  markMediaPending(state, first.mediaKey, "metadata");
  recordSuccessfulBatch(state, "dev", { mode: "files", assets: [first], tombstones: [] });
  assert.equal(selectPendingMedia([first], state, "dev").assets.get("first"), "changed-file");
});

test("concurrent edits merge into the small pending queue", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "media-sync-state-"));
  const file = path.join(root, "media-sync-state.json");
  try {
    await Promise.all(Array.from({ length: 10 }, (_, index) =>
      updateMediaSyncState(file, (state) => markMediaPending(state, `asset-${index}`, "metadata"))));
    assert.equal(Object.keys((await readMediaSyncState(file)).pending).length, 10);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("a queued deletion cannot remove media still in the library", () => {
  const state = emptyMediaSyncState();
  const first = asset("first");
  markMediaPending(state, first.mediaKey, "delete");
  assert.throws(() => selectPendingMedia([first], state, "dev"));
});

test("partial failure keeps only unfinished records in the queue", async () => {
  const state = emptyMediaSyncState();
  const first = asset("first", { syncRevision: 1 });
  const second = asset("second", { syncRevision: 1 });
  markMediaPending(state, first.mediaKey, "file");
  markMediaPending(state, second.mediaKey, "file");
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
  assert.equal(selectPendingMedia([first, second], state, "dev").assets.get("second"), "changed-file");
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
