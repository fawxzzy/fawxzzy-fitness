import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_DISPLAYABLE_SESSION_DURATION_SECONDS,
  SESSION_IDLE_CAP_SECONDS,
  clampSessionDurationSeconds,
  sanitizeStoredSessionDurationSeconds,
} from "./session-duration.ts";

const START = Date.parse("2026-11-06T10:00:00.000Z");
const minutes = (value: number) => value * 60 * 1000;

test("a session left open for 146h is clamped to last logged set + 30 minute idle cap", () => {
  const result = clampSessionDurationSeconds({
    reportedSeconds: 525_990,
    startedAtMs: START,
    lastLoggedAtMs: START + minutes(25),
  });
  assert.equal(result, 25 * 60 + SESSION_IDLE_CAP_SECONDS);
  assert.equal(result, 3_300);
});

test("a reported duration inside the cap is kept as reported", () => {
  assert.equal(
    clampSessionDurationSeconds({ reportedSeconds: 2_400, startedAtMs: START, lastLoggedAtMs: START + minutes(45) }),
    2_400,
  );
});

test("without logged sets the reported duration is kept (nothing to clamp against)", () => {
  assert.equal(clampSessionDurationSeconds({ reportedSeconds: 525_990, startedAtMs: START, lastLoggedAtMs: null }), 525_990);
  assert.equal(clampSessionDurationSeconds({ reportedSeconds: 600, startedAtMs: null, lastLoggedAtMs: START }), 600);
});

test("a set logged before the recorded start (clock skew) still allows the idle cap, never negative", () => {
  assert.equal(
    clampSessionDurationSeconds({ reportedSeconds: 100_000, startedAtMs: START, lastLoggedAtMs: START - minutes(5) }),
    SESSION_IDLE_CAP_SECONDS,
  );
});

test("custom idle cap is honoured", () => {
  assert.equal(
    clampSessionDurationSeconds({ reportedSeconds: 100_000, startedAtMs: START, lastLoggedAtMs: START + minutes(10), idleCapSeconds: 60 }),
    660,
  );
});

test("null, NaN and negative reported values are safe", () => {
  assert.equal(clampSessionDurationSeconds({ reportedSeconds: null, startedAtMs: START, lastLoggedAtMs: START }), null);
  assert.equal(clampSessionDurationSeconds({ reportedSeconds: Number.NaN, startedAtMs: START, lastLoggedAtMs: START }), null);
  assert.equal(clampSessionDurationSeconds({ reportedSeconds: -5, startedAtMs: START, lastLoggedAtMs: null }), 0);
  assert.equal(clampSessionDurationSeconds({ reportedSeconds: 90.9, startedAtMs: START, lastLoggedAtMs: null }), 90);
  assert.equal(clampSessionDurationSeconds({ reportedSeconds: 500, startedAtMs: Number.NaN, lastLoggedAtMs: START }), 500);
});

test("read side hides missing, non-positive and over-24h durations", () => {
  assert.equal(sanitizeStoredSessionDurationSeconds(525_990), undefined);
  assert.equal(sanitizeStoredSessionDurationSeconds(MAX_DISPLAYABLE_SESSION_DURATION_SECONDS + 1), undefined);
  assert.equal(sanitizeStoredSessionDurationSeconds(MAX_DISPLAYABLE_SESSION_DURATION_SECONDS), MAX_DISPLAYABLE_SESSION_DURATION_SECONDS);
  assert.equal(sanitizeStoredSessionDurationSeconds(3_300), 3_300);
  assert.equal(sanitizeStoredSessionDurationSeconds(0), undefined);
  assert.equal(sanitizeStoredSessionDurationSeconds(null), undefined);
  assert.equal(sanitizeStoredSessionDurationSeconds(undefined), undefined);
  assert.equal(sanitizeStoredSessionDurationSeconds(Number.NaN), undefined);
});
