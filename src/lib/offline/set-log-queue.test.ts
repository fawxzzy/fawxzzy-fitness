import test from "node:test";
import assert from "node:assert/strict";

import { isQueueItemReadableForUser, type SetLogQueueItem } from "./set-log-queue.ts";

function buildQueueItem(overrides: Partial<SetLogQueueItem> = {}): SetLogQueueItem {
  return {
    id: "queue-1",
    clientLogId: "stable-set-1",
    dedupeKey: "stable-set-1",
    schemaVersion: 4,
    sessionId: "session-1",
    sessionExerciseId: "exercise-1",
    userId: "user-1",
    payload: {
      weight: 135,
      reps: 8,
      durationSeconds: null,
      distance: null,
      distanceUnit: null,
      calories: null,
      rpe: null,
      isWarmup: false,
      notes: null,
      weightUnit: "lbs",
    },
    createdAt: "2026-04-16T10:00:00.000Z",
    retryCount: 0,
    status: "queued",
    ...overrides,
  };
}

test("queue reads require a user scope before restoring or syncing", () => {
  assert.equal(isQueueItemReadableForUser(buildQueueItem({ userId: undefined }), "user-1"), false);
  assert.equal(isQueueItemReadableForUser(buildQueueItem({ userId: "" }), "user-1"), false);
});

test("queue reads stay isolated to the active user", () => {
  assert.equal(isQueueItemReadableForUser(buildQueueItem({ userId: "user-1" }), "user-1"), true);
  assert.equal(isQueueItemReadableForUser(buildQueueItem({ userId: "user-2" }), "user-1"), false);
});

test("queue reads still exclude already synced rows", () => {
  assert.equal(
    isQueueItemReadableForUser(buildQueueItem({ status: "synced", syncedAt: "2026-04-16T10:05:00.000Z" }), "user-1"),
    false,
  );
});
