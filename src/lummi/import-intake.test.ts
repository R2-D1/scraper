import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";

import {
  buildLummiMetadata,
  downloadLummiAsset,
  isAllowedLummiAssetUrl,
  listIntakeItems,
  validateLummiSidecar,
} from "./import-intake";

const sidecar = {
  id: "438d7b4b-c02c-48e9-b8f9-f8f670b1ac87",
  slug: "elderly-rider-in-style-dbnrq",
  name: "Elderly Rider in Style",
  description: "An elderly person rides a scooter.",
  contentType: "image/png",
  url: "https://assets.lummi.ai/assets/example",
  free: true,
  sourceUrl: "https://www.lummi.ai/photo/elderly-rider-in-style-dbnrq",
  author: {
    name: "Helen St",
    attributionUrl: "https://www.lummi.ai/creator/hest",
  },
  license: {
    name: "Lummi License",
    url: "https://www.lummi.ai/license",
  },
  tags: [{ name: "Minimalist" }, { name: "Elderly" }],
};

test("validates a complete Lummi sidecar", () => {
  assert.equal(validateLummiSidecar(sidecar).slug, sidecar.slug);
  assert.throws(
    () => validateLummiSidecar({ ...sidecar, tags: [] }),
    /не містить тегів/,
  );
});

test("builds library metadata from the actual intake asset dimensions", () => {
  const tags = [
    { key: "minimalist", i18n: { en: "Minimalist", uk: "Мінімалізм" } },
  ];
  const metadata = buildLummiMetadata(
    sidecar,
    { width: 904, height: 1200, mimeType: "image/png" },
    "Стильна літня жінка на самокаті",
    tags,
    null,
  );

  assert.equal(metadata.sourceName, "Lummi");
  assert.equal(metadata.width, 904);
  assert.equal(metadata.height, 1200);
  assert.equal(metadata.mimeType, "image/png");
  assert.equal(metadata.tier, "free");
  assert.equal(metadata.taggingStatus, "pending");
  assert.deepEqual(metadata.collectionSlugs, ["other"]);
  assert.deepEqual(metadata.i18n.tags, tags);
});

test("downloads and validates the asset referenced by Lummi JSON", async () => {
  const png = await sharp({
    create: { width: 2, height: 3, channels: 3, background: "#ffffff" },
  }).png().toBuffer();
  const calls: string[] = [];
  const fetcher = (async (input: string | URL | Request) => {
    calls.push(String(input));
    const body = png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer;
    return new Response(body, { status: 200, headers: { "content-type": "image/png" } });
  }) as typeof fetch;

  const asset = await downloadLummiAsset(sidecar, fetcher);
  assert.deepEqual(calls, [sidecar.url]);
  assert.equal(asset.extension, ".webp");
  assert.equal(asset.mimeType, "image/webp");
  assert.equal(asset.width, 2);
  assert.equal(asset.height, 3);
  assert.ok(asset.buffer.length < png.length);
  assert.deepEqual(await sharp(asset.buffer).raw().toBuffer(), await sharp(png).raw().toBuffer());
});

test("rejects asset URLs outside the Lummi CDN", async () => {
  await assert.rejects(
    () => downloadLummiAsset({ ...sidecar, url: "https://example.com/image.png" }),
    /Недозволений Lummi asset URL/,
  );
});

test("deletes unsupported asset sidecars before importing the batch", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "lummi-intake-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const validPath = path.join(root, "valid.json");
  const rejectedPath = path.join(root, "rejected.json");
  await fs.writeFile(validPath, JSON.stringify(sidecar));
  await fs.writeFile(
    rejectedPath,
    JSON.stringify({ ...sidecar, slug: "pro-image", url: "https://www.lummi.ai/api/pro/image/example" }),
  );

  const items = await listIntakeItems(root);

  assert.equal(items.length, 1);
  assert.equal(items[0].jsonPath, validPath);
  assert.equal(isAllowedLummiAssetUrl(items[0].sidecar), true);
  await assert.rejects(() => fs.access(rejectedPath), { code: "ENOENT" });
});

test("preserves curation fields when the same slug is re-imported", () => {
  const first = buildLummiMetadata(sidecar, { width: 904, height: 1200, mimeType: "image/png" }, "Назва", [], null);
  const existing = { ...first, mediaKey: "stable-key", pinned: true, collectionSlugs: ["people"] };
  const next = buildLummiMetadata(sidecar, { width: 482, height: 640, mimeType: "image/png" }, "Назва", [], existing);

  assert.equal(next.mediaKey, "stable-key");
  assert.equal(next.pinned, true);
  assert.deepEqual(next.collectionSlugs, ["people"]);
  assert.equal(next.width, 482);
});
