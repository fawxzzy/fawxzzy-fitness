import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRouteLoadingRecoveryHref,
  clearRouteLoadingRecoveryAttempt,
  markRouteLoadingRecoveryAttempt,
  normalizeRouteLoadingRecoveryRouteKey,
  parseStoredRouteLoadingRecoveryState,
  readRouteLoadingRecoveryAttempt,
  ROUTE_LOADING_RECOVERY_STORAGE_KEY,
} from "@/lib/route-loading-recovery";

function createMemoryStorage() {
  const values = new Map<string, string>();

  return {
    getItem(key: string) {
      return values.has(key) ? values.get(key)! : null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

test("normalizeRouteLoadingRecoveryRouteKey strips recovery query params", () => {
  assert.equal(
    normalizeRouteLoadingRecoveryRouteKey("https://example.com/today?route-loading-recovery=1&route-loading-reload=123&view=compact"),
    "/today?view=compact",
  );
});

test("parseStoredRouteLoadingRecoveryState rejects stale attempts", () => {
  const stale = JSON.stringify({
    attemptCount: 1,
    buildId: "build-1",
    routeKey: "/today",
    updatedAt: 1000,
  });

  assert.equal(parseStoredRouteLoadingRecoveryState(stale, 1000 + (5 * 60 * 1000) + 1), null);
});

test("readRouteLoadingRecoveryAttempt returns matching attempt for route and build", () => {
  const storage = createMemoryStorage();
  markRouteLoadingRecoveryAttempt(storage, {
    attemptCount: 1,
    buildId: "build-1",
    routeKey: "/today",
    updatedAt: Date.now(),
  });

  assert.deepEqual(readRouteLoadingRecoveryAttempt(storage, "build-1", "/today")?.attemptCount, 1);
  assert.equal(readRouteLoadingRecoveryAttempt(storage, "build-2", "/today"), null);
  assert.equal(readRouteLoadingRecoveryAttempt(storage, "build-1", "/history"), null);
});

test("clearRouteLoadingRecoveryAttempt removes stored attempt", () => {
  const storage = createMemoryStorage();
  markRouteLoadingRecoveryAttempt(storage, {
    attemptCount: 2,
    buildId: "build-1",
    routeKey: "/today",
    updatedAt: Date.now(),
  });

  clearRouteLoadingRecoveryAttempt(storage);

  assert.equal(storage.getItem(ROUTE_LOADING_RECOVERY_STORAGE_KEY), null);
});

test("buildRouteLoadingRecoveryHref appends a cache-busting reload marker", () => {
  const href = buildRouteLoadingRecoveryHref("https://example.com/history?view=compact");
  const url = new URL(href);

  assert.equal(url.searchParams.get("route-loading-recovery"), "1");
  assert.equal(Boolean(url.searchParams.get("route-loading-reload")), true);
  assert.equal(url.searchParams.get("view"), "compact");
});
