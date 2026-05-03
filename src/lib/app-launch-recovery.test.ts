import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAppLaunchRecoveryHref,
  parseStoredAppLaunchRecoveryState,
  serializeStoredAppLaunchRecoveryState,
  shouldAttemptAppLaunchRecovery,
} from "./app-launch-recovery.ts";

test("parseStoredAppLaunchRecoveryState accepts a fresh recovery marker", () => {
  const rawValue = serializeStoredAppLaunchRecoveryState({
    buildId: "build-123",
    targetHref: "/today",
    updatedAt: 1_000,
  });

  assert.deepEqual(parseStoredAppLaunchRecoveryState(rawValue, 2_000), {
    buildId: "build-123",
    targetHref: "/today",
    updatedAt: 1_000,
  });
});

test("shouldAttemptAppLaunchRecovery blocks repeated refresh loops for the same build and target", () => {
  const storage = new Map<string, string>();
  const storageLike = {
    getItem(key: string) {
      return storage.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      storage.set(key, value);
    },
    removeItem(key: string) {
      storage.delete(key);
    },
  };

  storageLike.setItem(
    "fawxzzy:fitness:app-launch:recovery",
    serializeStoredAppLaunchRecoveryState({
      buildId: "build-123",
      targetHref: "/today",
      updatedAt: 1_000,
    }),
  );

  assert.equal(shouldAttemptAppLaunchRecovery(storageLike, "build-123", "/today", 2_000), false);
  assert.equal(shouldAttemptAppLaunchRecovery(storageLike, "build-123", "/login", 2_000), true);
  assert.equal(shouldAttemptAppLaunchRecovery(storageLike, "build-456", "/today", 2_000), true);
});

test("buildAppLaunchRecoveryHref adds a cache-busting recovery marker", () => {
  const href = buildAppLaunchRecoveryHref(
    "https://fawxzzy-fitness-local.vercel.app/today",
    "build-123",
    "/today",
  );
  const url = new URL(href);

  assert.equal(url.pathname, "/today");
  assert.equal(url.searchParams.get("app-launch-recovery"), "1");
  assert.equal(url.searchParams.get("app-build"), "build-123");
  assert.equal(url.searchParams.get("app-target"), "/today");
  assert.ok(url.searchParams.get("app-reload"));
});
