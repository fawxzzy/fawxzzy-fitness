import test from "node:test";
import assert from "node:assert/strict";
import {
  buildClientBundleRecoveryHref,
  buildClientBundleRecoveryMarker,
  getStaleClientAssetSignature,
  markClientBundleRecoveryAttempt,
  shouldAttemptClientBundleRecovery,
} from "./client-bundle-recovery.ts";

function createStorageStub() {
  const store = new Map<string, string>();

  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

test("getStaleClientAssetSignature recognizes stale chunk and dynamic import failures", () => {
  assert.equal(getStaleClientAssetSignature(new Error("ChunkLoadError: Loading chunk 42 failed.")), "chunk-load-error");
  assert.equal(getStaleClientAssetSignature(new Error("Failed to fetch dynamically imported module: https://example.com/_next/static/chunk.js")), "dynamic-import-failed");
  assert.equal(getStaleClientAssetSignature(new Error("Importing a module script failed.")), "dynamic-import-failed");
  assert.equal(getStaleClientAssetSignature(new Error("Script error for /_next/static/chunks/app.js")), "next-static-asset-failed");
  assert.equal(getStaleClientAssetSignature(new Error("Unrelated runtime error")), null);
});

test("bundle recovery loop guard only reloads once per build and signature", () => {
  const storage = createStorageStub();

  assert.equal(shouldAttemptClientBundleRecovery(storage, "build-1", "chunk-load-error"), true);
  markClientBundleRecoveryAttempt(storage, "build-1", "chunk-load-error");
  assert.equal(shouldAttemptClientBundleRecovery(storage, "build-1", "chunk-load-error"), false);
  assert.equal(shouldAttemptClientBundleRecovery(storage, "build-2", "chunk-load-error"), true);
  assert.equal(buildClientBundleRecoveryMarker("build-2", "dynamic-import-failed"), "build-2:dynamic-import-failed");
});

test("bundle recovery reload href adds a cache-busting recovery signature", () => {
  assert.equal(
    buildClientBundleRecoveryHref("https://fitness.fawxzzy.com/today?tab=current", "build-9", "chunk-load-error"),
    "https://fitness.fawxzzy.com/today?tab=current&app-recovery=chunk-load-error&app-build=build-9",
  );
});
