import test from "node:test";
import assert from "node:assert/strict";
import {
  APP_UPDATE_APPLY_RETRY_MS,
  APP_UPDATE_COLD_LAUNCH_WINDOW_MS,
  APP_UPDATE_STALE_REQUIRED_MS,
  type AppUpdateDecisionInput,
  collectFormDrafts,
  decideAppUpdateApply,
  isActiveSessionRoute,
  isBelowMinBuild,
  isColdLaunchWindow,
  resolveMinBuildId,
  resolveRequiredSince,
  serializeApplyAttempt,
  shouldAttemptApply,
} from "@/lib/app-update-policy";

const NOW = 10 * APP_UPDATE_STALE_REQUIRED_MS;

function input(overrides: Partial<AppUpdateDecisionInput>): AppUpdateDecisionInput {
  return {
    boundary: "hidden",
    updatePending: true,
    activeSession: false,
    dirtyInput: false,
    belowMinBuild: true,
    requiredSinceMs: NOW - 60_000,
    now: NOW,
    ...overrides,
  };
}

test("no pending update never applies", () => {
  for (const boundary of ["visible", "hidden", "cold-launch", "navigation"] as const) {
    assert.deepEqual(decideAppUpdateApply(input({ boundary, updatePending: false })), { action: "wait", reason: "no-update" });
  }
});

test("a visible page is never reloaded, even when stale and required", () => {
  assert.deepEqual(
    decideAppUpdateApply(input({ boundary: "visible", requiredSinceMs: NOW - 3 * APP_UPDATE_STALE_REQUIRED_MS })),
    { action: "wait", reason: "visible-page" },
  );
});

test("hidden, cold launch and a user-started navigation apply when nothing is in progress", () => {
  for (const boundary of ["hidden", "cold-launch", "navigation"] as const) {
    assert.deepEqual(decideAppUpdateApply(input({ boundary })), { action: "apply", reason: "boundary" });
  }
});

test("an active session defers at every boundary while the update is fresh", () => {
  for (const boundary of ["hidden", "cold-launch", "navigation"] as const) {
    assert.deepEqual(decideAppUpdateApply(input({ boundary, activeSession: true })), { action: "wait", reason: "active-session" });
  }
});

test("dirty input defers at every boundary while the update is fresh", () => {
  for (const boundary of ["hidden", "cold-launch", "navigation"] as const) {
    assert.deepEqual(decideAppUpdateApply(input({ boundary, dirtyInput: true })), { action: "wait", reason: "dirty-input" });
  }
});

test("a client below the minimum for 24h applies at the next hidden moment despite a deferral", () => {
  const stale = { requiredSinceMs: NOW - APP_UPDATE_STALE_REQUIRED_MS };
  assert.deepEqual(decideAppUpdateApply(input({ ...stale, activeSession: true })), { action: "apply", reason: "stale-required-hidden" });
  assert.deepEqual(decideAppUpdateApply(input({ ...stale, dirtyInput: true })), { action: "apply", reason: "stale-required-hidden" });
  // Only at hidden: a stale client never reloads mid-session on navigation or launch.
  assert.deepEqual(decideAppUpdateApply(input({ ...stale, boundary: "navigation", activeSession: true })), { action: "wait", reason: "active-session" });
  // One millisecond short of 24h still waits.
  assert.deepEqual(
    decideAppUpdateApply(input({ requiredSinceMs: NOW - APP_UPDATE_STALE_REQUIRED_MS + 1, activeSession: true })),
    { action: "wait", reason: "active-session" },
  );
  // Not below the minimum: staleness alone does not override a deferral.
  assert.deepEqual(
    decideAppUpdateApply(input({ ...stale, belowMinBuild: false, dirtyInput: true })),
    { action: "wait", reason: "dirty-input" },
  );
});

test("isBelowMinBuild compares the client against the server minimum", () => {
  assert.equal(isBelowMinBuild("a", { buildId: "b", minBuildId: "b" }), true);
  assert.equal(isBelowMinBuild("b", { buildId: "b", minBuildId: "b" }), false);
  assert.equal(isBelowMinBuild("a", { buildId: "c", minBuildId: "a" }), false);
  assert.equal(isBelowMinBuild("a", { buildId: "b" }), false);
  assert.equal(isBelowMinBuild("a", { buildId: null, minBuildId: "b" }), false);
});

test("resolveMinBuildId defaults to the server build and honours an override", () => {
  assert.equal(resolveMinBuildId("server-sha", null), "server-sha");
  assert.equal(resolveMinBuildId("server-sha", "  "), "server-sha");
  assert.equal(resolveMinBuildId("server-sha", "older-sha"), "older-sha");
});

test("cold launch is the first seconds before any interaction", () => {
  assert.equal(isColdLaunchWindow(1_000, 1_000 + APP_UPDATE_COLD_LAUNCH_WINDOW_MS, false), true);
  assert.equal(isColdLaunchWindow(1_000, 1_001 + APP_UPDATE_COLD_LAUNCH_WINDOW_MS, false), false);
  assert.equal(isColdLaunchWindow(1_000, 2_000, true), false);
});

test("session routes count as an active session", () => {
  assert.equal(isActiveSessionRoute("/session/abc"), true);
  assert.equal(isActiveSessionRoute("/session/abc/add-exercise"), true);
  assert.equal(isActiveSessionRoute("/sessions"), false);
  assert.equal(isActiveSessionRoute("/today"), false);
});

test("resolveRequiredSince keeps the first sighting for the same build only", () => {
  const stored = JSON.stringify({ buildId: "a", since: 500 });
  assert.deepEqual(resolveRequiredSince(stored, "a", 9_000), { buildId: "a", since: 500 });
  assert.deepEqual(resolveRequiredSince(stored, "b", 9_000), { buildId: "b", since: 9_000 });
  assert.deepEqual(resolveRequiredSince("not-json", "a", 9_000), { buildId: "a", since: 9_000 });
  assert.deepEqual(resolveRequiredSince(JSON.stringify({ buildId: "a", since: 99_999 }), "a", 9_000), { buildId: "a", since: 9_000 });
});

test("shouldAttemptApply blocks a reload loop for the same build pair", () => {
  const attempt = serializeApplyAttempt("a", "b", 1_000);
  assert.equal(shouldAttemptApply(null, "a", "b", 1_000), true);
  assert.equal(shouldAttemptApply(attempt, "a", "b", 1_000 + APP_UPDATE_APPLY_RETRY_MS - 1), false);
  assert.equal(shouldAttemptApply(attempt, "a", "b", 1_000 + APP_UPDATE_APPLY_RETRY_MS), true);
  assert.equal(shouldAttemptApply(attempt, "a", "c", 1_001), true);
  assert.equal(shouldAttemptApply("garbage", "a", "b", 1_001), true);
});

test("collectFormDrafts never keeps passwords or one-time codes", () => {
  const drafts = collectFormDrafts([
    { tagName: "INPUT", type: "text", id: "routine-name", value: "Push day" },
    { tagName: "INPUT", type: "password", id: "pw", value: "nope" },
    { tagName: "INPUT", type: "text", name: "code", autocomplete: "one-time-code", value: "123456" },
    { tagName: "INPUT", type: "text", name: "current", autocomplete: "current-password", value: "nope" },
    { tagName: "INPUT", type: "hidden", name: "csrf", value: "nope" },
    { tagName: "TEXTAREA", name: "notes", value: "felt strong" },
    { tagName: "INPUT", type: "checkbox", id: "warmup", value: "on", checked: true },
    { tagName: "INPUT", type: "text", value: "no key" },
    { tagName: "DIV", id: "not-a-field", value: "x" },
  ]);

  assert.deepEqual(drafts, [
    { key: "#routine-name", value: "Push day" },
    { key: "[name]notes", value: "felt strong" },
    { key: "#warmup", value: "on", checked: true },
  ]);
});
