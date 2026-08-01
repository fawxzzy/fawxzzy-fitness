import test from "node:test";
import assert from "node:assert/strict";

import {
  claimSkipToggleQueueItemForSync,
  enqueueSkipToggle,
  readPendingSkipToggles,
  readSkipToggleQueueItem,
  removeSkipToggleQueueItem,
  removeSkipToggleQueueItemIfCurrent,
  scheduleSkipToggleRetryIfCurrent,
  SKIP_TOGGLE_QUEUE_SCHEMA_VERSION,
} from "./skip-toggle-queue.ts";

// This repo's `node --test` environment has no `window`/IndexedDB (no
// jsdom/fake-indexeddb dependency -- see set-log-queue.ts's own
// `canUseIndexedDb()` guard, which every exported function here mirrors).
// These tests confirm every exported function degrades safely (no throw,
// sensible empty/false/null default) rather than crashing when IndexedDB
// isn't available, exactly like the existing set-log-queue functions do.
// The actual upsert/CAS decision logic is covered without any IndexedDB
// dependency in skip-toggle-reconciliation.test.ts (planSkipToggleUpsert),
// and the replay engine's use of these CRUD primitives is covered with
// in-memory fakes in skip-toggle-sync-engine.test.ts.

test("SKIP_TOGGLE_QUEUE_SCHEMA_VERSION is a stable, explicit schema version", () => {
  assert.equal(SKIP_TOGGLE_QUEUE_SCHEMA_VERSION, 1);
});

test("enqueueSkipToggle returns null without IndexedDB instead of throwing", async () => {
  const result = await enqueueSkipToggle({
    userId: "user-1",
    sessionId: "session-1",
    sessionExerciseId: "exercise-1",
    desiredSkipped: true,
  });
  assert.equal(result, null);
});

test("readSkipToggleQueueItem returns null without IndexedDB", async () => {
  const result = await readSkipToggleQueueItem("session-1", "exercise-1");
  assert.equal(result, null);
});

test("readPendingSkipToggles returns an empty list without IndexedDB", async () => {
  const result = await readPendingSkipToggles("user-1");
  assert.deepEqual(result, []);
});

test("claimSkipToggleQueueItemForSync returns null without IndexedDB", async () => {
  const result = await claimSkipToggleQueueItemForSync("session-skip:session-1:exercise-1", 1, "2026-08-01T10:00:00.000Z");
  assert.equal(result, null);
});

test("removeSkipToggleQueueItemIfCurrent returns false without IndexedDB", async () => {
  const result = await removeSkipToggleQueueItemIfCurrent("session-skip:session-1:exercise-1", 1);
  assert.equal(result, false);
});

test("scheduleSkipToggleRetryIfCurrent returns false without IndexedDB", async () => {
  const result = await scheduleSkipToggleRetryIfCurrent("session-skip:session-1:exercise-1", 1, {
    retryCount: 1,
    nextRetryAt: "2026-08-01T10:00:02.000Z",
    lastError: "Network error.",
    lastAttemptAt: "2026-08-01T10:00:00.000Z",
  });
  assert.equal(result, false);
});

test("removeSkipToggleQueueItem resolves without throwing without IndexedDB", async () => {
  await assert.doesNotReject(removeSkipToggleQueueItem("session-skip:session-1:exercise-1"));
});
