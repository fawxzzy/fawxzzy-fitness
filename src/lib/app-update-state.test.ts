import test from "node:test";
import assert from "node:assert/strict";
import {
  APP_UPDATE_HIDDEN_RELOAD_STATE_MAX_AGE_MS,
  APP_UPDATE_RELOAD_STATE_MAX_AGE_MS,
  parseStoredAppUpdateReloadState,
  serializeStoredAppUpdateReloadState,
  shouldRestoreReloadState,
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

test("parseStoredAppUpdateReloadState keeps the session id and form drafts", () => {
  const rawValue = serializeStoredAppUpdateReloadState({
    href: "https://fitness.fawxzzy.com/session/abc",
    scrollX: 0,
    scrollY: 40,
    targetBuildId: "build-2",
    updatedAt: 1_000,
    sessionId: "abc",
    drafts: [{ key: "#note", value: "felt strong" }, { key: "[name]rpe", value: "8", checked: true }],
  });

  const parsed = parseStoredAppUpdateReloadState(rawValue, 1_500);
  assert.equal(parsed?.sessionId, "abc");
  assert.deepEqual(parsed?.drafts, [{ key: "#note", value: "felt strong" }, { key: "[name]rpe", value: "8", checked: true }]);
});

test("parseStoredAppUpdateReloadState drops malformed drafts and still reads old records", () => {
  const legacy = JSON.stringify({ href: "https://fitness.fawxzzy.com/today", scrollX: 0, scrollY: 0, targetBuildId: null, updatedAt: 1_000 });
  assert.deepEqual(parseStoredAppUpdateReloadState(legacy, 1_000), {
    href: "https://fitness.fawxzzy.com/today",
    scrollX: 0,
    scrollY: 0,
    targetBuildId: null,
    updatedAt: 1_000,
  });

  const malformed = JSON.stringify({
    href: "https://fitness.fawxzzy.com/today",
    scrollX: 0,
    scrollY: 0,
    targetBuildId: null,
    updatedAt: 1_000,
    drafts: [{ key: 1, value: "x" }, "bad", { key: "#ok", value: "kept" }],
  });
  assert.deepEqual(parseStoredAppUpdateReloadState(malformed, 1_000)?.drafts, [{ key: "#ok", value: "kept" }]);
});

test("a reload started while hidden keeps its drafts long enough for a suspended iOS page to finish reloading", () => {
  const state = {
    href: "https://fitness.fawxzzy.com/routines/new",
    scrollX: 0,
    scrollY: 40,
    targetBuildId: "build-2",
    updatedAt: 0,
    drafts: [{ key: "#routine-name", value: "Push day" }],
  };
  const afterShortWindow = APP_UPDATE_RELOAD_STATE_MAX_AGE_MS + 60_000;
  assert.equal(APP_UPDATE_HIDDEN_RELOAD_STATE_MAX_AGE_MS, 30 * 60 * 1000);

  const hidden = parseStoredAppUpdateReloadState(serializeStoredAppUpdateReloadState({ ...state, boundary: "hidden" }), afterShortWindow);
  assert.deepEqual(hidden?.drafts, [{ key: "#routine-name", value: "Push day" }]);
  assert.equal(hidden?.boundary, "hidden");
  assert.equal(parseStoredAppUpdateReloadState(serializeStoredAppUpdateReloadState({ ...state, boundary: "hidden" }), APP_UPDATE_HIDDEN_RELOAD_STATE_MAX_AGE_MS + 1), null);

  // Cold-launch and older records without a boundary keep the short window.
  assert.equal(parseStoredAppUpdateReloadState(serializeStoredAppUpdateReloadState({ ...state, boundary: "cold-launch" }), afterShortWindow), null);
  assert.equal(parseStoredAppUpdateReloadState(serializeStoredAppUpdateReloadState(state), afterShortWindow), null);
  assert.equal(parseStoredAppUpdateReloadState(JSON.stringify({ ...state, boundary: "visible" }), afterShortWindow), null);
});
