import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolveSetLoggedAt, SET_LOGGED_AT_MAX_AGE_MS, SET_LOGGED_AT_MAX_FUTURE_SKEW_MS } from "./set-logged-at.ts";

const NOW = "2026-11-13T12:00:00.000Z";

test("a plausible queued tap time is kept so an offline replay keeps real rest between sets", () => {
  assert.equal(resolveSetLoggedAt("2026-11-13T11:52:30.000Z", NOW), "2026-11-13T11:52:30.000Z");
  assert.equal(resolveSetLoggedAt("2026-11-13T06:52:30-05:00", NOW), "2026-11-13T11:52:30.000Z");
});

test("a missing or malformed instant falls back to the server clock", () => {
  for (const candidate of [undefined, null, "", "   ", "yesterday", 12345, {}]) {
    assert.equal(resolveSetLoggedAt(candidate, NOW), NOW);
  }
});

test("a future or stale instant falls back to the server clock", () => {
  const nowMs = Date.parse(NOW);
  assert.equal(resolveSetLoggedAt(new Date(nowMs + SET_LOGGED_AT_MAX_FUTURE_SKEW_MS + 1000).toISOString(), NOW), NOW);
  assert.equal(resolveSetLoggedAt(new Date(nowMs - SET_LOGGED_AT_MAX_AGE_MS - 1000).toISOString(), NOW), NOW);
});

test("small device clock skew is clamped to the server clock, never in the future", () => {
  const nowMs = Date.parse(NOW);
  assert.equal(resolveSetLoggedAt(new Date(nowMs + 30_000).toISOString(), NOW), NOW);
});

test("addSetAction stamps through resolveSetLoggedAt and the sync action forwards the queue item's createdAt", () => {
  const source = readFileSync(new URL("../app/session/[id]/actions.ts", import.meta.url), "utf8");
  assert.match(source, /resolveSetLoggedAt\(payload\.loggedAt, new Date\(\)\.toISOString\(\)\)/);
  assert.match(source, /loggedAt: item\.createdAt,/);
  assert.doesNotMatch(source, /const loggedAt = new Date\(\)\.toISOString\(\);/);
});
