import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSkipToggleQueueKey,
  isSkipToggleQueueItemPendingSync,
  isTerminalSkipToggleError,
  planSkipToggleUpsert,
} from "./skip-toggle-reconciliation.ts";
import type { SkipToggleQueueItem } from "./skip-toggle-queue.ts";

function buildQueueItem(overrides: Partial<SkipToggleQueueItem> = {}): SkipToggleQueueItem {
  return {
    key: "session-skip:session-1:exercise-1",
    userId: "user-1",
    sessionId: "session-1",
    sessionExerciseId: "exercise-1",
    desiredSkipped: true,
    schemaVersion: 1,
    sequence: 1,
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
    retryCount: 0,
    status: "queued",
    ...overrides,
  };
}

test("buildSkipToggleQueueKey composes a stable (sessionId, exerciseId) supersession key", () => {
  assert.equal(buildSkipToggleQueueKey("session-1", "exercise-1"), "session-skip:session-1:exercise-1");
  // Different sessions/exercises never collide.
  assert.notEqual(buildSkipToggleQueueKey("session-2", "exercise-1"), buildSkipToggleQueueKey("session-1", "exercise-1"));
  assert.notEqual(buildSkipToggleQueueKey("session-1", "exercise-2"), buildSkipToggleQueueKey("session-1", "exercise-1"));
});

test("isSkipToggleQueueItemPendingSync treats queued/failed/syncing as pending", () => {
  assert.equal(isSkipToggleQueueItemPendingSync({ status: "queued" }), true);
  assert.equal(isSkipToggleQueueItemPendingSync({ status: "failed" }), true);
  assert.equal(isSkipToggleQueueItemPendingSync({ status: "syncing" }), true);
});

test("isTerminalSkipToggleError matches only the existing guardLiveSessionMutation error strings", () => {
  assert.equal(isTerminalSkipToggleError("Can only edit the current active session."), true);
  assert.equal(isTerminalSkipToggleError("Exercise does not belong to the current active session."), true);
  assert.equal(isTerminalSkipToggleError("Network request failed"), false);
  assert.equal(isTerminalSkipToggleError(undefined), false);
  assert.equal(isTerminalSkipToggleError(null), false);
  assert.equal(isTerminalSkipToggleError(""), false);
});

test("planSkipToggleUpsert starts a fresh command at sequence 1 when nothing is queued yet", () => {
  const planned = planSkipToggleUpsert({
    existing: null,
    userId: "user-1",
    sessionId: "session-1",
    sessionExerciseId: "exercise-1",
    desiredSkipped: true,
    schemaVersion: 1,
    nowIso: "2026-08-01T10:00:00.000Z",
  });

  assert.equal(planned.changed, true);
  assert.equal(planned.item.sequence, 1);
  assert.equal(planned.item.desiredSkipped, true);
  assert.equal(planned.item.retryCount, 0);
  assert.equal(planned.item.status, "queued");
  assert.equal(planned.item.key, "session-skip:session-1:exercise-1");
});

test("planSkipToggleUpsert is a genuine no-op for a repeated identical desired value (does not bump sequence or reset backoff)", () => {
  const existing = buildQueueItem({ sequence: 3, retryCount: 2, status: "failed", desiredSkipped: true });

  const planned = planSkipToggleUpsert({
    existing,
    userId: "user-1",
    sessionId: "session-1",
    sessionExerciseId: "exercise-1",
    desiredSkipped: true,
    schemaVersion: 1,
    nowIso: "2026-08-01T10:05:00.000Z",
  });

  assert.equal(planned.changed, false);
  // Returned item is the existing one, byte-for-byte -- no restart of
  // backoff bookkeeping for a re-tap that doesn't change the outcome.
  assert.equal(planned.item, existing);
  assert.equal(planned.item.sequence, 3);
  assert.equal(planned.item.retryCount, 2);
});

test("planSkipToggleUpsert bumps the sequence monotonically per-key on a genuine flip (skip-then-unskip coalescing)", () => {
  const skip = planSkipToggleUpsert({
    existing: null,
    userId: "user-1",
    sessionId: "session-1",
    sessionExerciseId: "exercise-1",
    desiredSkipped: true,
    schemaVersion: 1,
    nowIso: "2026-08-01T10:00:00.000Z",
  });
  assert.equal(skip.item.sequence, 1);

  const unskip = planSkipToggleUpsert({
    existing: skip.item,
    userId: "user-1",
    sessionId: "session-1",
    sessionExerciseId: "exercise-1",
    desiredSkipped: false,
    schemaVersion: 1,
    nowIso: "2026-08-01T10:00:05.000Z",
  });

  assert.equal(unskip.changed, true);
  assert.equal(unskip.item.sequence, 2);
  assert.equal(unskip.item.desiredSkipped, false);
  // There is only ever one queued row per key -- coalescing collapses to
  // just the final desired state, never two rows.
  assert.equal(unskip.item.key, skip.item.key);
  // retryCount resets for a genuinely new intent, since the previous
  // command's failure history no longer applies to a different desired value.
  assert.equal(unskip.item.retryCount, 0);
});

test("planSkipToggleUpsert preserves the original createdAt across a genuine flip but updates updatedAt", () => {
  const first = planSkipToggleUpsert({
    existing: null,
    userId: "user-1",
    sessionId: "session-1",
    sessionExerciseId: "exercise-1",
    desiredSkipped: true,
    schemaVersion: 1,
    nowIso: "2026-08-01T10:00:00.000Z",
  });

  const second = planSkipToggleUpsert({
    existing: first.item,
    userId: "user-1",
    sessionId: "session-1",
    sessionExerciseId: "exercise-1",
    desiredSkipped: false,
    schemaVersion: 1,
    nowIso: "2026-08-01T10:10:00.000Z",
  });

  assert.equal(second.item.createdAt, "2026-08-01T10:00:00.000Z");
  assert.equal(second.item.updatedAt, "2026-08-01T10:10:00.000Z");
});

test("planSkipToggleUpsert keeps different exercises fully independent", () => {
  const exerciseA = planSkipToggleUpsert({
    existing: null,
    userId: "user-1",
    sessionId: "session-1",
    sessionExerciseId: "exercise-a",
    desiredSkipped: true,
    schemaVersion: 1,
    nowIso: "2026-08-01T10:00:00.000Z",
  });
  const exerciseB = planSkipToggleUpsert({
    existing: null,
    userId: "user-1",
    sessionId: "session-1",
    sessionExerciseId: "exercise-b",
    desiredSkipped: true,
    schemaVersion: 1,
    nowIso: "2026-08-01T10:00:00.000Z",
  });

  assert.notEqual(exerciseA.item.key, exerciseB.item.key);
  // Both can independently be at sequence 1 -- sequence comparison only
  // ever matters within the same key, never across keys.
  assert.equal(exerciseA.item.sequence, 1);
  assert.equal(exerciseB.item.sequence, 1);
});
