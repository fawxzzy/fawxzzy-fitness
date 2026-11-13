import assert from "node:assert/strict";
import test from "node:test";
import { resolveSetLoggedAt, SET_LOGGED_AT_MAX_AGE_MS, SET_LOGGED_AT_MAX_FUTURE_SKEW_MS } from "./set-logged-at.ts";

const NOW = "2026-11-13T12:00:00.000Z";

test("a plausible queued tap time is kept so an offline replay keeps real rest between sets", () => {
  assert.equal(resolveSetLoggedAt("2026-11-13T11:52:30.000Z", NOW), "2026-11-13T11:52:30.000Z");
  assert.equal(resolveSetLoggedAt("2026-11-13T11:52:30Z", NOW), "2026-11-13T11:52:30.000Z");
  assert.equal(resolveSetLoggedAt("2026-11-13T06:52:30-05:00", NOW), "2026-11-13T11:52:30.000Z");
});

test("a missing or malformed instant falls back to the server clock", () => {
  for (const candidate of [undefined, null, "", "   ", "yesterday", 12345, {}, [], true]) {
    assert.equal(resolveSetLoggedAt(candidate, NOW), NOW);
  }
});

test("zone-less, non-ISO and oversized strings fall back to the server clock", () => {
  const rejected = [
    "2026-11-13T11:52:30",
    "2026-11-13T11:52:30.000",
    "2026-11-13 11:52:30Z",
    "2026-11-13",
    "Fri, 13 Nov 2026 11:52:30 GMT",
    "Nov 13 2026 11:52:30 UTC",
    "11/13/2026 11:52:30 AM",
    "1794571950000",
    "2026-11-13T11:52:30+0500",
    "2026-11-13T11:52:30." + "0".repeat(60) + "Z",
    "x".repeat(5000),
    " 2026-11-13T11:52:30.000Z",
  ];
  for (const candidate of rejected) {
    assert.equal(resolveSetLoggedAt(candidate, NOW), NOW, "should reject " + candidate.slice(0, 50));
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
