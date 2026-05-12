import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { renderServiceWorkerSource } from "../scripts/generate-service-worker.mjs";

const repoRoot = process.cwd();

test("package build flow always regenerates the app build manifest before Next compiles", () => {
  const packageJson = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));

  assert.match(packageJson.scripts.prebuild, /build:prepare/);
  assert.match(packageJson.scripts["build:prepare"], /generate-app-build-manifest\.mjs/);
  assert.match(packageJson.scripts["build:prepare"], /generate-service-worker\.mjs/);
});

test("service worker source includes a version marker and skip-waiting recovery hook", () => {
  const firstBuild = renderServiceWorkerSource("build-a");
  const secondBuild = renderServiceWorkerSource("build-b");

  assert.notEqual(firstBuild, secondBuild);
  assert.match(firstBuild, /const APP_BUILD_ID = "build-a";/);
  assert.match(firstBuild, /event\.data\?\.type === "SKIP_WAITING"/);
  assert.match(firstBuild, /self\.skipWaiting\(\)/);
  assert.match(firstBuild, /self\.clients\.claim\(\)/);
});
