import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layoutUrl = new URL("./layout.tsx", import.meta.url);
const mobileViewportGuardUrl = new URL("../components/ui/MobileViewportGuard.tsx", import.meta.url);

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
