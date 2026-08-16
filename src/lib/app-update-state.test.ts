import test from "node:test";
import assert from "node:assert/strict";
import {
  parseStoredAppUpdateReloadState,
  serializeStoredAppUpdateReloadState,
  shouldRestoreReloadState,
  shouldShowAppUpdateNotice,
} from "@/lib/app-update-state";

test("parseStoredAppUpdateReloadState accepts fresh valid state", () => {
  const rawValue = serializeStoredAppUpdateReloadState({
    href: "https://fitness.fawxzzy.com/history?tab=recent#top",
    scrollX: 4,
    scrollY: 180,
    targetBuildId: "build-123",
    updatedAt: 1_000,
  });

  assert.deepEqual(parseStoredAppUpdateReloadState(rawValue, 2_000), {
    href: "https://fitness.fawxzzy.com/history?tab=recent#top",
    scrollX: 4,
    scrollY: 180,
    targetBuildId: "build-123",
    updatedAt: 1_000,
  });
});

test("parseStoredAppUpdateReloadState rejects stale state", () => {
  const rawValue = serializeStoredAppUpdateReloadState({
    href: "https://fitness.fawxzzy.com/today",
    scrollX: 0,
    scrollY: 0,
    targetBuildId: null,
    updatedAt: 0,
  });

  assert.equal(parseStoredAppUpdateReloadState(rawValue, 301_000), null);
});

test("shouldRestoreReloadState only restores the same document location", () => {
  assert.equal(
    shouldRestoreReloadState(
      "https://fitness.fawxzzy.com/history?tab=recent#top",
      "https://fitness.fawxzzy.com/history?tab=recent#top",
    ),
    true,
  );
  assert.equal(
    shouldRestoreReloadState(
      "https://fitness.fawxzzy.com/history?tab=recent#top",
      "https://fitness.fawxzzy.com/history?tab=favorites#top",
    ),
    false,
  );
});

test("shouldShowAppUpdateNotice only fires for the applied build id", () => {
  const rawValue = JSON.stringify({ targetBuildId: "build-123" });

  assert.equal(shouldShowAppUpdateNotice(rawValue, "build-123"), true);
  assert.equal(shouldShowAppUpdateNotice(rawValue, "build-456"), false);
  assert.equal(shouldShowAppUpdateNotice("not-json", "build-123"), false);
});
