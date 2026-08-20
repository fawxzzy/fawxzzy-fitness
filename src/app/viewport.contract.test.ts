import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layoutUrl = new URL("./layout.tsx", import.meta.url);
const mobileViewportGuardUrl = new URL("../components/ui/MobileViewportGuard.tsx", import.meta.url);
const previewImageUrl = new URL("../../public/brand/fitness-app-icon.png", import.meta.url);

test("server and client viewport contracts preserve browser zoom", async () => {
  const [layoutSource, guardSource] = await Promise.all([
    readFile(layoutUrl, "utf8"),
    readFile(mobileViewportGuardUrl, "utf8"),
  ]);

  for (const source of [layoutSource, guardSource]) {
    assert.doesNotMatch(source, /maximum(?:Scale|-scale)/);
    assert.doesNotMatch(source, /user(?:Scalable|-scalable)/);
  }

  assert.match(layoutSource, /width: "device-width"/);
  assert.match(layoutSource, /initialScale: 1/);
  assert.match(layoutSource, /viewportFit: "cover"/);
  assert.match(guardSource, /width=device-width, initial-scale=1, viewport-fit=cover/);
});

test("root metadata does not collapse child routes onto the home canonical", async () => {
  const layoutSource = await readFile(layoutUrl, "utf8");

  assert.match(layoutSource, /metadataBase: resolveMetadataBase\(\)/);
  assert.doesNotMatch(layoutSource, /\balternates\s*:/);
  assert.doesNotMatch(layoutSource, /canonical:\s*["']\/["']/);
});

test("link-preview metadata declares the canonical square app artwork dimensions", async () => {
  const [layoutSource, previewImage] = await Promise.all([
    readFile(layoutUrl, "utf8"),
    readFile(previewImageUrl),
  ]);

  assert.equal(previewImage.subarray(1, 4).toString("ascii"), "PNG");
  assert.equal(previewImage.readUInt32BE(16), 1024);
  assert.equal(previewImage.readUInt32BE(20), 1024);
  assert.match(layoutSource, /const APP_PREVIEW_IMAGE = "\/brand\/fitness-app-icon\.png"/);
  assert.match(layoutSource, /width: 1024/);
  assert.match(layoutSource, /height: 1024/);
  assert.doesNotMatch(layoutSource, /width: 1280|height: 1280/);
  assert.match(layoutSource, /card: "summary_large_image"/);
});
