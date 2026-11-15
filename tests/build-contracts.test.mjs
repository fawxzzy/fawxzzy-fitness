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

test("legacy worker retires old-host caches while the current worker uses a distinct URL", () => {
  const generator = readFileSync(path.join(repoRoot, "scripts", "generate-service-worker.mjs"), "utf8");
  const bootstrap = readFileSync(path.join(repoRoot, "src", "components", "ServiceWorkerBootstrap.tsx"), "utf8");
  const retirementWorker = readFileSync(path.join(repoRoot, "public", "sw.js"), "utf8");

  assert.match(generator, /public", "app-sw\.js"/);
  assert.match(bootstrap, /register\("\/app-sw\.js", \{ scope: "\/" \}\)/);
  assert.match(retirementWorker, /const LEGACY_ORIGIN = "https:\/\/fawxzzy-fitness-local\.vercel\.app";/);
  assert.match(retirementWorker, /const CANONICAL_ORIGIN = "https:\/\/fitness\.fawxzzy\.com";/);
  assert.match(retirementWorker, /await caches\.delete\(cacheName\)/);
  assert.match(retirementWorker, /await self\.registration\.unregister\(\)/);
  assert.match(retirementWorker, /canonicalUrl\.pathname = clientUrl\.pathname/);
  assert.match(retirementWorker, /canonicalUrl\.search = clientUrl\.search/);
});

test("silent update: no overlay, no toast, and a controller change never reloads", () => {
  const bootstrap = readFileSync(path.join(repoRoot, "src", "components", "ServiceWorkerBootstrap.tsx"), "utf8");
  const route = readFileSync(path.join(repoRoot, "src", "app", "api", "app-version", "route.ts"), "utf8");

  assert.doesNotMatch(bootstrap, /Updating FawxzzyFitness/);
  assert.doesNotMatch(bootstrap, /Updated to the latest build/);
  assert.doesNotMatch(bootstrap, /isApplyingUpdate|RouteLoading|useToast/);
  assert.doesNotMatch(bootstrap, /shouldPrioritizeImmediateUpdate|UPDATE_IDLE_THRESHOLD_MS/);

  const controllerChange = bootstrap.slice(
    bootstrap.indexOf("const handleControllerChange"),
    bootstrap.indexOf("const handleVisibilityChange"),
  );
  assert.ok(controllerChange.length > 0);
  assert.doesNotMatch(controllerChange, /reload|tryApply/);

  // Every reload goes through the boundary decision.
  assert.equal((bootstrap.match(/window\.location\.reload\(\)/g) ?? []).length, 1);
  assert.match(bootstrap, /decideAppUpdateApply\(/);
  assert.match(route, /minBuildId: resolveMinBuildId\(CURRENT_APP_BUILD_ID\)/);
});
