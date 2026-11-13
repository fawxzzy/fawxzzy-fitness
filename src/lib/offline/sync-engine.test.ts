import assert from "node:assert/strict";
import test from "node:test";

import type { ActionResult } from "@/lib/action-result";
import { createSetLogSyncEngine, subscribeToSetLogSynced, type SetLogQueueOps } from "./sync-engine.ts";
import {
  isSetLogQueueItemParked,
  SET_LOG_MAX_RETRY_ATTEMPTS,
  SET_LOG_TRANSPORT_ERROR,
} from "./set-log-reconciliation.ts";
import type { SetLogQueueItem } from "./set-log-queue.ts";
import { applySyncedItemToSnapshotMap, type QueueAwareSnapshotSet } from "./quick-log-queue.ts";

const LIVE_SESSION_MUTATION_ERROR = "Can only edit the current active session.";

type SyncResults = Array<{ queueItemId: string; ok: boolean; serverSetId?: string; error?: string }>;
type SyncAction = (payload: { items: SetLogQueueItem[] }) => Promise<ActionResult<{ results: SyncResults }>>;

function buildItem(overrides: Partial<SetLogQueueItem> = {}): SetLogQueueItem {
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

/** In-memory stand-in for the IndexedDB queue: `put` semantics for update, ordered by createdAt like the real read. */
function createFakeQueue(initial: SetLogQueueItem[] = []) {
  const store = new Map<string, SetLogQueueItem>(initial.map((item) => [item.id, item]));
  const writes: Array<{ id: string; status: SetLogQueueItem["status"]; retryCount: number }> = [];
  const ops: SetLogQueueOps = {
    readPendingSetLogs: async () => [...store.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    updateSetLogQueueItem: async (item) => {
      writes.push({ id: item.id, status: item.status, retryCount: item.retryCount });
      store.set(item.id, item);
    },
    removeSetLogQueueItem: async (id) => {
      store.delete(id);
    },
  };
  return { store, writes, ops };
}

function okResult(items: SetLogQueueItem[]): ActionResult<{ results: SyncResults }> {
  return { ok: true, data: { results: items.map((item) => ({ queueItemId: item.id, ok: true, serverSetId: `server-${item.id}` })) } };
}

type FakeWindow = {
  setTimeout: (callback: () => void, delay: number) => number;
  clearTimeout: (id: number) => void;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
};

function installFakeWindow() {
  const timers = new Map<number, { callback: () => void; delay: number }>();
  const listeners = new Map<string, Set<() => void>>();
  let nextId = 1;
  const fake: FakeWindow = {
    setTimeout: (callback, delay) => {
      const id = nextId;
      nextId += 1;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimeout: (id) => {
      timers.delete(id);
    },
    addEventListener: (type, listener) => {
      listeners.set(type, (listeners.get(type) ?? new Set()).add(listener));
    },
    removeEventListener: (type, listener) => {
      listeners.get(type)?.delete(listener);
    },
  };
  const holder = globalThis as unknown as { window?: FakeWindow };
  const previous = holder.window;
  holder.window = fake;
  return {
    timers,
    listeners,
    restore: () => {
      if (previous === undefined) {
        delete holder.window;
      } else {
        holder.window = previous;
      }
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test("a thrown replay is a failure with backoff, not a hot loop that blocks later items", async () => {
  const first = buildItem({ id: "queue-1", clientLogId: "log-1", createdAt: "2026-11-12T23:30:00.000Z" });
  const second = buildItem({ id: "queue-2", clientLogId: "log-2", createdAt: "2026-11-12T23:31:00.000Z" });
  const queue = createFakeQueue([first, second]);
  const calls: string[] = [];
  const unexpected: unknown[] = [];

  const syncSetLogsAction: SyncAction = async ({ items }) => {
    calls.push(items[0]!.id);
    if (items[0]!.id === "queue-1") {
      throw new TypeError("Failed to fetch");
    }
    return okResult(items);
  };

  const engine = createSetLogSyncEngine({ userId: "user-1", syncSetLogsAction, queue: queue.ops, onUnexpectedError: (error) => unexpected.push(error) });
  await engine.tick();

  // The throw did not reject the tick and did not stop the batch: the later item synced.
  assert.deepEqual(calls, ["queue-1", "queue-2"]);
  assert.equal(queue.store.has("queue-2"), false);
  assert.deepEqual(unexpected, []);

  // The failed item is no longer "syncing": it carries a retry count and a future nextRetryAt.
  const failed = queue.store.get("queue-1");
  assert.equal(failed?.status, "failed");
  assert.equal(failed?.retryCount, 1);
  assert.equal(failed?.lastError, SET_LOG_TRANSPORT_ERROR);
  assert.ok(failed?.nextRetryAt && new Date(failed.nextRetryAt).getTime() > Date.now());

  // The next tick honours the backoff instead of re-picking it immediately.
  await engine.tick();
  assert.deepEqual(calls, ["queue-1", "queue-2"]);
});

test("a resolved failure and an empty result list also back off", async () => {
  const queue = createFakeQueue([buildItem()]);
  let mode: "refused" | "empty" = "refused";
  const syncSetLogsAction: SyncAction = async () => (
    mode === "refused"
      ? { ok: false, error: "Could not log set" }
      : { ok: true, data: { results: [] } }
  );
  const engine = createSetLogSyncEngine({ userId: "user-1", syncSetLogsAction, queue: queue.ops });

  await engine.tick();
  assert.equal(queue.store.get("queue-1")?.retryCount, 1);
  assert.equal(queue.store.get("queue-1")?.lastError, "Could not log set");

  // Make it due again and fail it with an empty results list.
  queue.store.set("queue-1", { ...queue.store.get("queue-1")!, nextRetryAt: new Date(Date.now() - 1000).toISOString() });
  mode = "empty";
  await engine.tick();
  assert.equal(queue.store.get("queue-1")?.retryCount, 2);
  assert.equal(queue.store.get("queue-1")?.status, "failed");
});

test("success removes the item and reports the server id", async () => {
  const queue = createFakeQueue([buildItem()]);
  const synced: Array<{ clientLogId: string; serverSetId?: string }> = [];
  const engine = createSetLogSyncEngine({
    userId: "user-1",
    syncSetLogsAction: async ({ items }) => okResult(items),
    queue: queue.ops,
    onItemSynced: ({ item, serverSetId }) => synced.push({ clientLogId: item.clientLogId, serverSetId }),
  });

  await engine.tick();

  assert.equal(queue.store.size, 0);
  assert.deepEqual(synced, [{ clientLogId: "log-1", serverSetId: "server-queue-1" }]);
});

test("retries are bounded: the last failed attempt parks the item (kept, never deleted, reported once)", async () => {
  const queue = createFakeQueue([buildItem({ status: "failed", retryCount: SET_LOG_MAX_RETRY_ATTEMPTS - 1 })]);
  let calls = 0;
  const terminal: Array<{ id: string; error: string }> = [];
  const engine = createSetLogSyncEngine({
    userId: "user-1",
    syncSetLogsAction: async () => {
      calls += 1;
      throw new TypeError("Failed to fetch");
    },
    queue: queue.ops,
    onTerminalFailure: ({ item, error }) => terminal.push({ id: item.id, error }),
  });

  await engine.tick();

  const parked = queue.store.get("queue-1");
  assert.equal(calls, 1);
  assert.equal(parked?.status, "failed");
  assert.equal(parked?.retryCount, SET_LOG_MAX_RETRY_ATTEMPTS);
  assert.equal(parked !== undefined && isSetLogQueueItemParked(parked), true);
  assert.deepEqual(terminal, [{ id: "queue-1", error: "Sync failed" }]);

  // Periodic ticks skip a parked item even though its backoff has long passed.
  queue.store.set("queue-1", { ...parked!, nextRetryAt: new Date(Date.now() - 60_000).toISOString() });
  await engine.tick();
  await engine.tick();
  assert.equal(calls, 1);
  assert.equal(queue.store.size, 1, "a parked set stays in the queue");
});

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 25));
}

test("a parked item is re-armed on engine start with a fresh bounded burst (retryCount reset), not stranded", async () => {
  const fakeWindow = installFakeWindow();
  try {
    const queue = createFakeQueue([buildItem({ status: "failed", retryCount: SET_LOG_MAX_RETRY_ATTEMPTS, lastError: "Could not reach server." })]);
    let calls = 0;
    const terminal: string[] = [];
    const engine = createSetLogSyncEngine({
      userId: "user-1",
      syncSetLogsAction: async () => {
        calls += 1;
        throw new TypeError("Failed to fetch");
      },
      queue: queue.ops,
      onTerminalFailure: ({ item }) => terminal.push(item.id),
    });

    engine.start();
    assert.equal(fakeWindow.timers.size, 1);
    const [startTimer] = [...fakeWindow.timers.values()];
    fakeWindow.timers.clear();
    startTimer!.callback();
    await settle();

    assert.equal(calls, 1, "start re-arms the parked item");
    const rearmed = queue.store.get("queue-1");
    assert.equal(rearmed?.retryCount, 1, "the count restarted from 0, it did not continue at 9");
    assert.equal(rearmed !== undefined && isSetLogQueueItemParked(rearmed), false, "it is an ordinary backing-off item again");
    assert.ok(rearmed?.nextRetryAt && new Date(rearmed.nextRetryAt).getTime() > Date.now());

    // It keeps retrying on the normal backoff instead of waiting for the next start/online: make it due and tick.
    queue.store.set("queue-1", { ...rearmed!, nextRetryAt: new Date(Date.now() - 1000).toISOString() });
    fakeWindow.timers.clear();
    await engine.tick();
    assert.equal(calls, 2);
    assert.equal(queue.store.get("queue-1")?.retryCount, 2);
    assert.deepEqual(terminal, [], "not parked again yet");
    engine.stop();
  } finally {
    fakeWindow.restore();
  }
});

test("an online event that fires before the radio works re-arms a parked item for a new burst, then it parks again", async () => {
  const fakeWindow = installFakeWindow();
  try {
    const queue = createFakeQueue([buildItem({ status: "failed", retryCount: SET_LOG_MAX_RETRY_ATTEMPTS, lastError: "Sync failed" })]);
    let calls = 0;
    const terminal: string[] = [];
    const engine = createSetLogSyncEngine({
      userId: "user-1",
      syncSetLogsAction: async () => {
        calls += 1;
        throw new TypeError("Failed to fetch");
      },
      queue: queue.ops,
      onTerminalFailure: ({ item }) => terminal.push(item.id),
    });

    // Periodic ticks leave a parked item alone.
    await engine.tick();
    assert.equal(calls, 0);

    engine.start();
    fakeWindow.timers.clear();
    for (const listener of fakeWindow.listeners.get("online") ?? []) {
      listener();
    }
    await settle();
    assert.equal(calls, 1, "online re-arms it");
    assert.equal(queue.store.get("queue-1")?.retryCount, 1);

    // Run the burst to the end: every attempt fails, the item parks again after the cap and is reported once.
    for (let attempt = 2; attempt <= SET_LOG_MAX_RETRY_ATTEMPTS; attempt += 1) {
      queue.store.set("queue-1", { ...queue.store.get("queue-1")!, nextRetryAt: new Date(Date.now() - 1000).toISOString() });
      await engine.tick();
    }
    assert.equal(calls, SET_LOG_MAX_RETRY_ATTEMPTS);
    const parkedAgain = queue.store.get("queue-1");
    assert.equal(parkedAgain !== undefined && isSetLogQueueItemParked(parkedAgain), true);
    assert.deepEqual(terminal, ["queue-1"]);
    engine.stop();
  } finally {
    fakeWindow.restore();
  }
});

test("a terminal parked item (session no longer live) keeps its count and gets one attempt per start or online, never a fresh burst", async () => {
  const fakeWindow = installFakeWindow();
  try {
    const queue = createFakeQueue([buildItem({ status: "failed", retryCount: 1, lastError: LIVE_SESSION_MUTATION_ERROR })]);
    let calls = 0;
    const engine = createSetLogSyncEngine({
      userId: "user-1",
      syncSetLogsAction: async ({ items }) => {
        calls += 1;
        return { ok: true, data: { results: [{ queueItemId: items[0]!.id, ok: false, error: LIVE_SESSION_MUTATION_ERROR }] } };
      },
      queue: queue.ops,
    });

    engine.start();
    const [startTimer] = [...fakeWindow.timers.values()];
    fakeWindow.timers.clear();
    startTimer!.callback();
    await settle();
    assert.equal(calls, 1);
    assert.equal(queue.store.get("queue-1")?.retryCount, 2, "the count was not reset");

    // Periodic ticks skip it.
    await engine.tick();
    assert.equal(calls, 1);

    // Online gives it one more attempt, still without a reset.
    for (const listener of fakeWindow.listeners.get("online") ?? []) {
      listener();
    }
    await settle();
    assert.equal(calls, 2);
    assert.equal(queue.store.get("queue-1")?.retryCount, 3);
    engine.stop();
  } finally {
    fakeWindow.restore();
  }
});

test("a hung replay times out as a thrown replay and releases the in-flight guard", async () => {
  const queue = createFakeQueue([buildItem()]);
  let calls = 0;
  const engine = createSetLogSyncEngine({
    userId: "user-1",
    syncSetLogsAction: () => {
      calls += 1;
      return new Promise<never>(() => {
        // never settles: a hung fetch
      });
    },
    queue: queue.ops,
    replayTimeoutMs: 30,
  });

  const startedAt = Date.now();
  await engine.tick();

  assert.ok(Date.now() - startedAt < 2000, "the tick returned instead of hanging with the item");
  assert.equal(calls, 1);
  const failed = queue.store.get("queue-1");
  assert.equal(failed?.status, "failed");
  assert.equal(failed?.retryCount, 1);
  assert.equal(failed?.lastError, SET_LOG_TRANSPORT_ERROR);

  // The guard was released: another engine can replay the (now due) item right away.
  queue.store.set("queue-1", { ...failed!, nextRetryAt: new Date(Date.now() - 1000).toISOString() });
  const other = createSetLogSyncEngine({
    userId: "user-1",
    syncSetLogsAction: async ({ items }) => okResult(items),
    queue: queue.ops,
  });
  await other.tick();
  assert.equal(queue.store.size, 0);
});

test("a non-numeric stored retryCount is treated as 0 instead of throwing in the backoff math", async () => {
  const queue = createFakeQueue([buildItem({ retryCount: Number.NaN })]);
  const unexpected: unknown[] = [];
  const engine = createSetLogSyncEngine({
    userId: "user-1",
    syncSetLogsAction: async () => {
      throw new TypeError("Failed to fetch");
    },
    queue: queue.ops,
    onUnexpectedError: (error) => unexpected.push(error),
  });

  await engine.tick();

  const failed = queue.store.get("queue-1");
  assert.deepEqual(unexpected, [], "no RangeError from an invalid backoff date");
  assert.equal(failed?.retryCount, 1);
  assert.ok(failed?.nextRetryAt && Number.isFinite(new Date(failed.nextRetryAt).getTime()));

  // The next tick honours the backoff instead of hot-looping.
  let calls = 0;
  const second = createSetLogSyncEngine({
    userId: "user-1",
    syncSetLogsAction: async ({ items }) => {
      calls += 1;
      return okResult(items);
    },
    queue: queue.ops,
  });
  await second.tick();
  assert.equal(calls, 0);
});

test("every successful replay is broadcast to subscribers, whichever engine ran it; a throwing listener changes nothing", async () => {
  const queue = createFakeQueue([buildItem()]);
  const heard: Array<{ clientLogId: string; serverSetId?: string }> = [];
  const unsubscribeBad = subscribeToSetLogSynced(() => {
    throw new Error("listener bug");
  });
  const unsubscribe = subscribeToSetLogSynced(({ item, serverSetId }) => heard.push({ clientLogId: item.clientLogId, serverSetId }));
  const ownCallback: string[] = [];
  const engine = createSetLogSyncEngine({
    userId: "user-1",
    syncSetLogsAction: async ({ items }) => okResult(items),
    queue: queue.ops,
    onItemSynced: ({ item }) => ownCallback.push(item.clientLogId),
  });

  await engine.tick();

  assert.deepEqual(heard, [{ clientLogId: "log-1", serverSetId: "server-queue-1" }]);
  assert.deepEqual(ownCallback, ["log-1"]);
  assert.equal(queue.store.size, 0, "the throwing listener did not affect the bookkeeping");

  unsubscribe();
  unsubscribeBad();
  queue.store.set("queue-2", buildItem({ id: "queue-2", clientLogId: "log-2" }));
  await engine.tick();
  assert.equal(heard.length, 1, "unsubscribed listeners hear nothing");
});

test("a server refusal because the session is no longer live parks the item at once", async () => {
  const queue = createFakeQueue([buildItem()]);
  const terminal: string[] = [];
  const engine = createSetLogSyncEngine({
    userId: "user-1",
    syncSetLogsAction: async ({ items }) => ({
      ok: true,
      data: { results: [{ queueItemId: items[0]!.id, ok: false, error: LIVE_SESSION_MUTATION_ERROR }] },
    }),
    queue: queue.ops,
    onTerminalFailure: ({ error }) => terminal.push(error),
  });

  await engine.tick();

  const parked = queue.store.get("queue-1");
  assert.equal(parked?.retryCount, 1);
  assert.equal(parked !== undefined && isSetLogQueueItemParked(parked), true);
  assert.deepEqual(terminal, [LIVE_SESSION_MUTATION_ERROR]);
});

test("an unexpected queue error on one item neither rejects the tick nor blocks the next item", async () => {
  const first = buildItem({ id: "queue-1", clientLogId: "log-1", createdAt: "2026-11-12T23:30:00.000Z" });
  const second = buildItem({ id: "queue-2", clientLogId: "log-2", createdAt: "2026-11-12T23:31:00.000Z" });
  const queue = createFakeQueue([first, second]);
  const originalUpdate = queue.ops.updateSetLogQueueItem;
  queue.ops.updateSetLogQueueItem = async (item) => {
    if (item.id === "queue-1") {
      throw new Error("IndexedDB blocked");
    }
    return originalUpdate(item);
  };
  const unexpected: unknown[] = [];
  const engine = createSetLogSyncEngine({
    userId: "user-1",
    syncSetLogsAction: async ({ items }) => okResult(items),
    queue: queue.ops,
    onUnexpectedError: (error) => unexpected.push(error),
  });

  await engine.tick();

  assert.equal(unexpected.length, 1);
  assert.equal(queue.store.has("queue-2"), false, "the later item still synced");
  assert.equal(queue.store.has("queue-1"), true, "the failing item stays pending");
});

test("stop() is final: an in-flight tick does not reschedule itself or start the next item", async () => {
  const fakeWindow = installFakeWindow();
  try {
    const first = buildItem({ id: "queue-1", clientLogId: "log-1", createdAt: "2026-11-12T23:30:00.000Z" });
    const second = buildItem({ id: "queue-2", clientLogId: "log-2", createdAt: "2026-11-12T23:31:00.000Z" });
    const queue = createFakeQueue([first, second]);
    const gate = deferred<void>();
    const calls: string[] = [];
    const engine = createSetLogSyncEngine({
      userId: "user-1",
      syncSetLogsAction: async ({ items }) => {
        calls.push(items[0]!.id);
        await gate.promise;
        return okResult(items);
      },
      queue: queue.ops,
    });

    engine.start();
    const [startTimer] = [...fakeWindow.timers.values()];
    fakeWindow.timers.clear();
    startTimer!.callback();
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.deepEqual(calls, ["queue-1"], "first item is in flight");

    engine.stop();
    assert.equal(fakeWindow.listeners.get("online")?.size ?? 0, 0, "the online listener is removed");

    gate.resolve();
    await new Promise((resolve) => setTimeout(resolve, 30));

    assert.deepEqual(calls, ["queue-1"], "no further item starts after stop");
    assert.equal(fakeWindow.timers.size, 0, "the finished tick does not schedule another poll");
    assert.equal(queue.store.has("queue-1"), false, "the in-flight item's bookkeeping still completes");
    assert.equal(queue.store.has("queue-2"), true);

    // A stopped engine ignores direct ticks and online events too.
    await engine.tick();
    assert.deepEqual(calls, ["queue-1"]);
  } finally {
    fakeWindow.restore();
  }
});

test("two engines never replay the same item at once (card engine / session engine swap)", async () => {
  const queue = createFakeQueue([buildItem()]);
  const gate = deferred<void>();
  let calls = 0;
  const syncSetLogsAction: SyncAction = async ({ items }) => {
    calls += 1;
    await gate.promise;
    return okResult(items);
  };
  const engineA = createSetLogSyncEngine({ userId: "user-1", syncSetLogsAction, queue: queue.ops });
  const engineB = createSetLogSyncEngine({ userId: "user-1", syncSetLogsAction, queue: queue.ops });

  const tickA = engineA.tick();
  await new Promise((resolve) => setTimeout(resolve, 10));
  await engineB.tick();
  assert.equal(calls, 1, "B skipped the item A is replaying");

  gate.resolve();
  await tickA;
  assert.equal(queue.store.size, 0);
  assert.equal(calls, 1);
});

test("a collapsed row's snapshot takes the server identity when another row's engine replays its set", async () => {
  // Row B (exercise-2) is collapsed and still marks its set queued; the card engine of the expanded row A replays it.
  const queuedSet: QueueAwareSnapshotSet = {
    id: "log-2",
    client_log_id: "log-2",
    stableId: "log-2",
    session_exercise_id: "exercise-2",
    user_id: "queued",
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
    queueItemId: "queue-2",
    queueStatus: "queued",
  };
  let snapshots: Record<string, QueueAwareSnapshotSet[]> = { "exercise-1": [], "exercise-2": [queuedSet] };
  const unsubscribe = subscribeToSetLogSynced(({ item, serverSetId }) => {
    snapshots = applySyncedItemToSnapshotMap(snapshots, item, serverSetId, "user-1");
  });

  try {
    const queue = createFakeQueue([buildItem({ id: "queue-2", clientLogId: "log-2", sessionExerciseId: "exercise-2" })]);
    const cardEngineOfRowA = createSetLogSyncEngine({
      userId: "user-1",
      syncSetLogsAction: async ({ items }) => okResult(items),
      queue: queue.ops,
    });

    await cardEngineOfRowA.tick();

    const replayed = snapshots["exercise-2"]?.[0];
    assert.equal(replayed?.id, "server-queue-2", "the delete/edit path will send the server id, not the client id");
    assert.equal(replayed?.user_id, "user-1");
    assert.equal(replayed?.pending, false);
    assert.equal(replayed?.queueStatus, undefined);
    assert.equal(snapshots["exercise-2"]?.length, 1, "no duplicate set was added");
  } finally {
    unsubscribe();
  }
});
