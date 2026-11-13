import assert from "node:assert/strict";
import test from "node:test";

import type { ActionResult } from "@/lib/action-result";
import type { SetRow } from "@/types/db";
import {
  applySyncedItemToSnapshotMap,
  markSnapshotSetQueued,
  markSnapshotSetSynced,
  QUICK_LOG_FAILED_MESSAGE,
  QUICK_LOG_OFFLINE_QUEUED_MESSAGE,
  QUICK_LOG_OFFLINE_UNSAVED_MESSAGE,
  QUICK_LOG_REQUEST_FAILED_QUEUED_MESSAGE,
  reconcileSnapshotMapQueueStatuses,
  reconcileSnapshotQueueStatuses,
  seedQueuedSetsIntoSnapshots,
  shouldRunSessionSetLogSync,
  submitQuickLogSet,
  toOfflineSetPayload,
  type QueueAwareSnapshotSet,
} from "./quick-log-queue.ts";
import type { SetLogQueueItem } from "./set-log-queue.ts";

function buildQueueItem(overrides: Partial<SetLogQueueItem> = {}): SetLogQueueItem {
  return {
    id: "queue-1",
    userId: "user-1",
    clientLogId: "log-1",
    dedupeKey: "log-1",
    schemaVersion: 4,
    sessionId: "session-1",
    sessionExerciseId: "exercise-1",
    payload: {
      weight: 135,
      reps: 5,
      durationSeconds: null,
      distance: null,
      distanceUnit: null,
      calories: null,
      rpe: null,
      isWarmup: false,
      notes: null,
      weightUnit: "lbs",
    },
    createdAt: "2026-11-12T23:30:00.000Z",
    retryCount: 0,
    status: "queued",
    ...overrides,
  };
}

function buildSet(overrides: Partial<QueueAwareSnapshotSet> = {}): QueueAwareSnapshotSet {
  return {
    id: "log-1",
    client_log_id: "log-1",
    stableId: "log-1",
    session_exercise_id: "exercise-1",
    user_id: "user-1",
    set_index: 0,
    weight: 135,
    reps: 5,
    is_warmup: false,
    notes: null,
    duration_seconds: null,
    distance: null,
    distance_unit: null,
    calories: null,
    rpe: null,
    weight_unit: "lbs",
    pending: true,
    ...overrides,
  };
}

function buildServerSet(): SetRow {
  return {
    id: "server-set-1",
    client_log_id: "log-1",
    session_exercise_id: "exercise-1",
    user_id: "user-1",
    set_index: 0,
    weight: 135,
    reps: 5,
    is_warmup: false,
    notes: null,
    duration_seconds: null,
    distance: null,
    distance_unit: null,
    calories: null,
    rpe: null,
    weight_unit: "lbs",
  };
}

/** In-memory stand-in for enqueueSetLog: same contract (dedupe by clientLogId, returns the existing row). */
function createFakeSetLogQueue() {
  const store = new Map<string, SetLogQueueItem>();
  return {
    store,
    enqueue: async (clientLogId: string) => {
      const existing = store.get(clientLogId);
      if (existing) {
        return existing;
      }
      const item = buildQueueItem({ id: `queue-${store.size + 1}`, clientLogId, dedupeKey: clientLogId });
      store.set(clientLogId, item);
      return item;
    },
  };
}

test("collapsed quick log while offline queues the set and never calls the server action", async () => {
  const queue = createFakeSetLogQueue();
  let addSetCalls = 0;

  const outcome = await submitQuickLogSet({
    isOffline: true,
    addSet: async () => {
      addSetCalls += 1;
      return { ok: true, data: { set: buildServerSet() } };
    },
    enqueue: () => queue.enqueue("log-1"),
  });

  assert.equal(addSetCalls, 0);
  assert.equal(outcome.kind, "queued");
  assert.equal(queue.store.size, 1);
  if (outcome.kind === "queued") {
    assert.equal(outcome.route, "offline");
    assert.equal(outcome.message, QUICK_LOG_OFFLINE_QUEUED_MESSAGE);
    assert.equal(outcome.queueItem.clientLogId, "log-1");
    assert.equal(outcome.queueItem.status, "queued");
  }
});

test("offline quick log that cannot be written locally is reported as unsaved (not as queued)", async () => {
  const unavailable = await submitQuickLogSet({
    isOffline: true,
    addSet: async () => ({ ok: false, error: "never called" }),
    enqueue: async () => null,
  });
  assert.deepEqual(unavailable, { kind: "unsaved", route: "offline", message: QUICK_LOG_OFFLINE_UNSAVED_MESSAGE });

  const throwing = await submitQuickLogSet({
    isOffline: true,
    addSet: async () => ({ ok: false, error: "never called" }),
    enqueue: async () => {
      throw new Error("IndexedDB blocked");
    },
  });
  assert.deepEqual(throwing, { kind: "unsaved", route: "offline", message: QUICK_LOG_OFFLINE_UNSAVED_MESSAGE });
});

test("a thrown request (dropped connection) queues the set instead of losing it", async () => {
  const queue = createFakeSetLogQueue();

  const outcome = await submitQuickLogSet({
    isOffline: false,
    addSet: async () => {
      throw new TypeError("Failed to fetch");
    },
    enqueue: () => queue.enqueue("log-1"),
  });

  assert.equal(outcome.kind, "queued");
  assert.equal(queue.store.size, 1);
  if (outcome.kind === "queued") {
    assert.equal(outcome.route, "request-failed");
    assert.equal(outcome.message, QUICK_LOG_REQUEST_FAILED_QUEUED_MESSAGE);
  }

  const unsaved = await submitQuickLogSet({
    isOffline: false,
    addSet: async () => {
      throw new TypeError("Failed to fetch");
    },
    enqueue: async () => null,
  });
  assert.deepEqual(unsaved, { kind: "unsaved", route: "request-failed", message: QUICK_LOG_FAILED_MESSAGE });
});

test("online quick log that succeeds is saved and never touches the queue", async () => {
  let enqueueCalls = 0;
  const outcome = await submitQuickLogSet({
    isOffline: false,
    addSet: async () => ({ ok: true, data: { set: buildServerSet() } }),
    enqueue: async () => {
      enqueueCalls += 1;
      return buildQueueItem();
    },
  });

  assert.equal(enqueueCalls, 0);
  assert.equal(outcome.kind, "saved");
  if (outcome.kind === "saved") {
    assert.equal(outcome.result.data?.set.id, "server-set-1");
  }
});

test("a resolved server refusal is rolled back with the server message and is never queued", async () => {
  let enqueueCalls = 0;
  const refused: ActionResult<{ set: SetRow }> = { ok: false, error: "Can only edit the current active session." };
  const outcome = await submitQuickLogSet({
    isOffline: false,
    addSet: async () => refused,
    enqueue: async () => {
      enqueueCalls += 1;
      return buildQueueItem();
    },
  });

  assert.equal(enqueueCalls, 0);
  assert.deepEqual(outcome, { kind: "rejected", message: "Can only edit the current active session." });

  const emptyMessage = await submitQuickLogSet({
    isOffline: false,
    addSet: async () => ({ ok: false, error: "" }),
    enqueue: async () => buildQueueItem(),
  });
  assert.deepEqual(emptyMessage, { kind: "rejected", message: QUICK_LOG_FAILED_MESSAGE });
});

test("repeat taps with the same clientLogId do not create a second queue item (idempotent enqueue key)", async () => {
  const queue = createFakeSetLogQueue();

  const first = await submitQuickLogSet({ isOffline: true, addSet: async () => ({ ok: false, error: "x" }), enqueue: () => queue.enqueue("log-1") });
  const second = await submitQuickLogSet({ isOffline: true, addSet: async () => ({ ok: false, error: "x" }), enqueue: () => queue.enqueue("log-1") });

  assert.equal(queue.store.size, 1);
  assert.equal(first.kind === "queued" && second.kind === "queued" && first.queueItem.id === second.queueItem.id, true);
});

test("offline payload matches the expanded logger shape", () => {
  assert.deepEqual(
    toOfflineSetPayload({
      weight: 20,
      reps: 8,
      durationSeconds: null,
      distance: null,
      distanceUnit: "mi",
      calories: null,
      isWarmup: true,
      notes: "failure",
      weightUnit: "kg",
    }),
    {
      weight: 20,
      reps: 8,
      durationSeconds: null,
      distance: null,
      distanceUnit: null,
      calories: null,
      rpe: null,
      isWarmup: true,
      notes: "failure",
      weightUnit: "kg",
    },
  );

  assert.equal(
    toOfflineSetPayload({
      weight: 0,
      reps: 0,
      durationSeconds: 600,
      distance: 1.5,
      distanceUnit: "km",
      calories: 90,
      isWarmup: false,
      notes: null,
      weightUnit: "lbs",
    }).distanceUnit,
    "km",
  );
});

test("markSnapshotSetQueued flags only the matching optimistic set, with the expanded logger's fields", () => {
  const other = buildSet({ id: "log-0", client_log_id: "log-0", stableId: "log-0", set_index: 0, pending: false });
  const optimistic = buildSet({ set_index: 1 });
  const sets = [other, optimistic];

  const next = markSnapshotSetQueued(sets, "log-1", "queue-9");

  assert.equal(next[0], other);
  assert.deepEqual(
    { pending: next[1]?.pending, queueStatus: next[1]?.queueStatus, queueItemId: next[1]?.queueItemId, user_id: next[1]?.user_id },
    { pending: true, queueStatus: "queued", queueItemId: "queue-9", user_id: "queued" },
  );
  assert.equal(markSnapshotSetQueued(sets, "missing", "queue-9"), sets);
});

test("markSnapshotSetSynced swaps in the server identity and clears the queue flags", () => {
  const queued = buildSet({ queueItemId: "queue-1", queueStatus: "syncing", user_id: "queued" });

  const [synced] = markSnapshotSetSynced([queued], { clientLogId: "log-1", serverSetId: "server-set-1" }, "user-1");

  assert.equal(synced?.id, "server-set-1");
  assert.equal(synced?.client_log_id, "log-1");
  assert.equal(synced?.pending, false);
  assert.equal(synced?.queueStatus, undefined);
  assert.equal(synced?.queueItemId, undefined);
  assert.equal(synced?.user_id, "user-1");

  const [keepsId] = markSnapshotSetSynced([queued], { clientLogId: "log-1" }, "user-1");
  assert.equal(keepsId?.id, "log-1");
});

test("applySyncedItemToSnapshotMap touches only the item's exercise and refreshes a matching set", () => {
  const queued = buildSet({ queueItemId: "queue-1", queueStatus: "queued", user_id: "queued" });
  const snapshots = { "exercise-1": [queued], "exercise-2": [buildSet({ session_exercise_id: "exercise-2", stableId: "log-2", client_log_id: "log-2", id: "log-2" })] };

  const next = applySyncedItemToSnapshotMap(snapshots, buildQueueItem(), "server-set-1", "user-1");

  assert.equal(next["exercise-1"]?.[0]?.id, "server-set-1");
  assert.equal(next["exercise-1"]?.length, 1);
  assert.equal(next["exercise-2"], snapshots["exercise-2"]);
  assert.equal(
    applySyncedItemToSnapshotMap(snapshots, buildQueueItem({ sessionExerciseId: "exercise-9" }), "x", "user-1"),
    snapshots,
    "an exercise outside the session is ignored",
  );
});

test("applySyncedItemToSnapshotMap adds the synced set when the row never held it (cold start)", () => {
  const serverSet = buildSet({ id: "server-0", client_log_id: "log-0", stableId: "log-0", set_index: 0, pending: false });
  const snapshots = { "exercise-1": [serverSet] };

  const next = applySyncedItemToSnapshotMap(snapshots, buildQueueItem({ clientLogId: "log-1" }), "server-set-1", "user-1");

  assert.equal(next["exercise-1"]?.length, 2);
  const added = next["exercise-1"]?.[1];
  assert.equal(added?.id, "server-set-1");
  assert.equal(added?.client_log_id, "log-1");
  assert.equal(added?.set_index, 1);
  assert.equal(added?.pending, false);
  assert.equal(added?.user_id, "user-1");
  assert.equal(added?.weight, 135);
  assert.equal(added?.reps, 5);

  // Falls back to the server sets for an exercise that has no snapshot yet.
  const fromBase = applySyncedItemToSnapshotMap({}, buildQueueItem({ clientLogId: "log-1" }), "server-set-1", "user-1", () => [serverSet]);
  assert.equal(fromBase["exercise-1"]?.length, 2);
});

test("seedQueuedSetsIntoSnapshots restores queued sets into collapsed rows after a cold start", () => {
  // The session page reopened: the server returned 2 sets, the queue still holds the 3rd.
  const serverSets = [
    buildSet({ id: "server-0", client_log_id: "log-0", stableId: "log-0", set_index: 0, pending: false }),
    buildSet({ id: "server-1", client_log_id: "log-1b", stableId: "log-1b", set_index: 1, pending: false }),
  ];
  const queued = [
    buildQueueItem({ id: "queue-3", clientLogId: "log-3", status: "queued" }),
    buildQueueItem({ id: "queue-4", clientLogId: "log-4", status: "failed", retryCount: 2, createdAt: "2026-11-12T23:31:00.000Z" }),
  ];
  const snapshots = { "exercise-1": serverSets };

  const next = seedQueuedSetsIntoSnapshots(snapshots, queued, () => undefined);

  assert.equal(next["exercise-1"]?.length, 4, "the row now counts the queued sets");
  const restored = next["exercise-1"]?.slice(2);
  assert.deepEqual(restored?.map((set) => set.set_index), [2, 3]);
  assert.deepEqual(restored?.map((set) => set.client_log_id), ["log-3", "log-4"]);
  assert.deepEqual(restored?.map((set) => set.queueStatus), ["queued", "failed"]);
  assert.deepEqual(restored?.map((set) => set.pending), [true, true]);
  assert.deepEqual(restored?.map((set) => set.queueItemId), ["queue-3", "queue-4"]);
  assert.equal(restored?.[0]?.user_id, "queued");
  assert.equal(restored?.[0]?.weight, 135);

  // Idempotent: seeding again, or after the queue read repeats, does not duplicate.
  assert.equal(seedQueuedSetsIntoSnapshots(next, queued, () => undefined), next);
});

test("seedQueuedSetsIntoSnapshots never duplicates a set the server already returned, skips foreign and settled items", () => {
  const serverSets = [buildSet({ id: "server-0", client_log_id: "log-0", stableId: "log-0", set_index: 0, pending: false })];
  const snapshots = { "exercise-1": serverSets };

  const unchanged = seedQueuedSetsIntoSnapshots(
    snapshots,
    [
      // The queue item whose set already came back from the server (replayed, queue entry not yet removed).
      buildQueueItem({ id: "queue-0", clientLogId: "log-0" }),
      // An item for an exercise that is not in this session.
      buildQueueItem({ id: "queue-x", clientLogId: "log-x", sessionExerciseId: "exercise-other" }),
      // A settled item is not pending sync.
      buildQueueItem({ id: "queue-s", clientLogId: "log-s", status: "synced", syncedAt: "2026-11-12T23:40:00.000Z" }),
    ],
    () => undefined,
  );
  assert.equal(unchanged, snapshots);

  // An exercise with no snapshot yet is seeded from its server sets.
  const fromBase = seedQueuedSetsIntoSnapshots({}, [buildQueueItem({ clientLogId: "log-3" })], () => serverSets);
  assert.equal(fromBase["exercise-1"]?.length, 2);
  assert.equal(fromBase["exercise-1"]?.[1]?.client_log_id, "log-3");
}); 

test("reconcileSnapshotQueueStatuses follows queue status, releases replayed sets, and spares in-flight online sets", () => {
  const stillQueued = buildSet({ id: "log-1", stableId: "log-1", client_log_id: "log-1", queueStatus: "queued", queueItemId: "queue-1" });
  const replayedElsewhere = buildSet({ id: "log-2", stableId: "log-2", client_log_id: "log-2", set_index: 1, queueStatus: "queued", queueItemId: "queue-2", user_id: "queued" });
  const inFlightOnline = buildSet({ id: "log-3", stableId: "log-3", client_log_id: "log-3", set_index: 2, pending: true });
  const saved = buildSet({ id: "server-4", stableId: "log-4", client_log_id: "log-4", set_index: 3, pending: false });

  const next = reconcileSnapshotQueueStatuses(
    [stillQueued, replayedElsewhere, inFlightOnline, saved],
    [buildQueueItem({ id: "queue-1", clientLogId: "log-1", status: "syncing" })],
  );

  assert.equal(next[0]?.queueStatus, "syncing");
  assert.equal(next[0]?.pending, true);
  assert.equal(next[1]?.queueStatus, undefined);
  assert.equal(next[1]?.queueItemId, undefined);
  assert.equal(next[1]?.pending, false);
  assert.equal(next[2], inFlightOnline);
  assert.equal(next[3], saved);

  const unchanged = [stillQueued, saved];
  assert.equal(
    reconcileSnapshotQueueStatuses(unchanged, [buildQueueItem({ id: "queue-1", clientLogId: "log-1", status: "queued" })]),
    unchanged,
  );

  // A queue read that started before replay finished lists the item; the replayed set (server id) is left alone.
  const replayed = buildSet({ id: "server-5", client_log_id: "log-5", stableId: "log-5", pending: false, user_id: "user-1" });
  assert.equal(
    reconcileSnapshotQueueStatuses([replayed], [buildQueueItem({ id: "queue-5", clientLogId: "log-5", status: "syncing" })])[0],
    replayed,
  );
});

test("reconcileSnapshotMapQueueStatuses returns the same map when no exercise changed", () => {
  const snapshots = { "exercise-1": [buildSet({ pending: false })], "exercise-2": [] as QueueAwareSnapshotSet[] };
  assert.equal(reconcileSnapshotMapQueueStatuses(snapshots, []), snapshots);

  const withQueued = {
    "exercise-1": [buildSet({ queueStatus: "queued", queueItemId: "queue-1" })],
    "exercise-2": snapshots["exercise-2"],
  };
  const next = reconcileSnapshotMapQueueStatuses(withQueued, []);
  assert.notEqual(next, withQueued);
  assert.equal(next["exercise-1"]?.[0]?.queueStatus, undefined);
  assert.equal(next["exercise-2"], withQueued["exercise-2"]);
});

test("only one set-log sync engine runs: session worker is on only when no logger card is mounted", () => {
  const exerciseIds = ["exercise-1", "exercise-2"];

  assert.equal(shouldRunSessionSetLogSync({ selectedExerciseId: null, exerciseIds }), true);
  assert.equal(shouldRunSessionSetLogSync({ selectedExerciseId: "exercise-2", exerciseIds }), false);
  // A stale selection with no matching row renders no SetLoggerCard, so the session worker must take over.
  assert.equal(shouldRunSessionSetLogSync({ selectedExerciseId: "removed-exercise", exerciseIds }), true);
  assert.equal(shouldRunSessionSetLogSync({ selectedExerciseId: null, exerciseIds: [] }), true);
});
