import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSetQueueDedupeKey,
  isQueueItemPendingSync,
  mergeByStableSetId,
  resolveStableSetId,
  sortSetsByIndex,
  toRestorableQueueSet,
} from "./set-log-reconciliation.ts";

test("queue dedupe uses the stable client log id", () => {
  assert.equal(buildSetQueueDedupeKey("stable-set-1"), "stable-set-1");
});

test("synced queue items are excluded from restore", () => {
  assert.equal(isQueueItemPendingSync({ status: "synced", syncedAt: "2026-04-16T10:00:00.000Z" }), false);
  assert.equal(isQueueItemPendingSync({ status: "queued", syncedAt: undefined }), true);
  assert.equal(isQueueItemPendingSync({ status: "failed", syncedAt: undefined }), true);
});

test("restore payload uses the stable client log id instead of the queue row id", () => {
  const restored = toRestorableQueueSet({
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
  });

  assert.equal(restored?.stableId, "stable-set-1");
  assert.equal(restored?.queueItemId, "queue-1");
});

test("mergeByStableSetId reconciles the queued and synced copies into one set", () => {
  const merged = mergeByStableSetId(
    [{
      id: "queue-1",
      client_log_id: "stable-set-1",
      set_index: 0,
    }],
    [{
      id: "server-1",
      client_log_id: "stable-set-1",
      set_index: 0,
    }],
  );

  assert.equal(merged.length, 1);
  assert.equal(resolveStableSetId(merged[0]), "stable-set-1");
  assert.equal(merged[0].id, "server-1");
});

test("sorting by set index stays deterministic after repeated restore passes", () => {
  const sorted = sortSetsByIndex([
    { set_index: 2, label: "third" },
    { set_index: 0, label: "first" },
    { set_index: 1, label: "second" },
  ]);

  assert.deepEqual(sorted.map((item) => item.label), ["first", "second", "third"]);
});

test("replaying restore with the same stable set id stays idempotent", () => {
  const firstPass = mergeByStableSetId(
    [],
    [{ id: "queue-1", client_log_id: "stable-set-1", set_index: 0 }],
  );
  const secondPass = mergeByStableSetId(
    firstPass,
    [{ id: "queue-2", client_log_id: "stable-set-1", set_index: 0 }],
  );

  assert.equal(firstPass.length, 1);
  assert.equal(secondPass.length, 1);
  assert.equal(secondPass[0].id, "queue-2");
});
