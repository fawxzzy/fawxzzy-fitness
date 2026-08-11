import test from "node:test";
import assert from "node:assert/strict";

import type { ActionResult } from "@/lib/action-result";
import { createSkipToggleSyncEngine, SKIP_TOGGLE_MAX_RETRY_ATTEMPTS } from "./skip-toggle-sync-engine.ts";
import type { SkipToggleQueueItem } from "./skip-toggle-queue.ts";
import {
  isSkipToggleQueueItemClaimable,
  SKIP_TOGGLE_SYNC_ERROR,
  SKIP_TOGGLE_TRANSPORT_ERROR,
} from "./skip-toggle-reconciliation.ts";

const LIVE_SESSION_MUTATION_ERROR = "Can only edit the current active session.";

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

/**
 * In-memory fake implementing the same compare-and-swap contract the real
 * IndexedDB-backed skip-toggle-queue.ts functions provide. This repo's
 * `node --test` setup has no jsdom/fake-indexeddb, so the engine's
 * tick/processItem/backoff/terminal-classification logic is exercised here
 * via dependency injection instead (the constructor already accepts these
 * five operations as plain functions -- see SkipToggleSyncEngineDeps).
 *
 * Crucially, none of these fake functions `await` anything internally
 * before mutating the shared `store` Map, so two functions invoked
 * "concurrently" via Promise.all still serialize at the point of mutation
 * (each async call's synchronous body runs to completion before the other's
 * begins) -- this faithfully mirrors how a real IndexedDB transaction is
 * atomic, which is exactly the property the "duplicate replay" test below
 * depends on.
 */
function createFakeSkipToggleQueue(initialItems: SkipToggleQueueItem[] = []) {
  const store = new Map<string, SkipToggleQueueItem>();
  for (const item of initialItems) {
    store.set(item.key, item);
  }

  return {
    store,
    readPendingSkipToggles: async (userId?: string) => {
      return Array.from(store.values()).filter((item) => !userId || item.userId === userId);
    },
    claimSkipToggleQueueItemForSync: async (key: string, expectedSequence: number, attemptIso: string) => {
      const current = store.get(key);
      if (!current || current.sequence !== expectedSequence || !isSkipToggleQueueItemClaimable(current, attemptIso)) {
        return null;
      }
      const claimed: SkipToggleQueueItem = { ...current, status: "syncing", lastAttemptAt: attemptIso };
      store.set(key, claimed);
      return claimed;
    },
    removeSkipToggleQueueItemIfCurrent: async (key: string, expectedSequence: number) => {
      const current = store.get(key);
      if (!current || current.sequence !== expectedSequence) {
        return false;
      }
      store.delete(key);
      return true;
    },
    scheduleSkipToggleRetryIfCurrent: async (
      key: string,
      expectedSequence: number,
      patch: { retryCount: number; nextRetryAt: string; lastError: string; lastAttemptAt: string },
    ) => {
      const current = store.get(key);
      if (!current || current.sequence !== expectedSequence) {
        return false;
      }
      store.set(key, { ...current, status: "failed", ...patch });
      return true;
    },
  };
}

function readFormData(formData: FormData) {
  return {
    sessionId: String(formData.get("sessionId") ?? ""),
    sessionExerciseId: String(formData.get("sessionExerciseId") ?? ""),
    nextSkipped: formData.get("nextSkipped") === "true",
  };
}

test("successful replay removes the item and reports onItemSynced exactly once", async () => {
  const fake = createFakeSkipToggleQueue([buildQueueItem()]);
  let syncedCount = 0;
  let toggleCalls = 0;

  const engine = createSkipToggleSyncEngine({
    userId: "user-1",
    toggleSkipAction: async () => {
      toggleCalls += 1;
      return { ok: true };
    },
    onItemSynced: () => { syncedCount += 1; },
    ...fake,
  });

  await engine.tick();

  assert.equal(toggleCalls, 1);
  assert.equal(syncedCount, 1);
  assert.equal(fake.store.has("session-skip:session-1:exercise-1"), false);
});

test("replay is idempotent when the server's state already matches the desired value (no-op success, not a duplicate mutation)", async () => {
  // toggleSkipAction's real implementation is a plain `UPDATE ... SET
  // is_skipped = nextSkipped`, which is naturally idempotent -- replaying it
  // when the server already has that value still resolves { ok: true } with
  // no different observable effect. The engine has no special-case "already
  // matches" branch; it just treats the resolved success normally.
  const fake = createFakeSkipToggleQueue([buildQueueItem({ desiredSkipped: false })]);
  const engine = createSkipToggleSyncEngine({
    userId: "user-1",
    toggleSkipAction: async (formData) => {
      const { nextSkipped } = readFormData(formData);
      assert.equal(nextSkipped, false);
      return { ok: true }; // server's row was already is_skipped = false
    },
    ...fake,
  });

  await engine.tick();

  assert.equal(fake.store.size, 0);
});

test("transient failure retries with exponential backoff and does not remove the item", async () => {
  const fake = createFakeSkipToggleQueue([buildQueueItem()]);
  let toggleCalls = 0;

  const engine = createSkipToggleSyncEngine({
    userId: "user-1",
    toggleSkipAction: async () => {
      toggleCalls += 1;
      return { ok: false, error: "Temporary glitch." };
    },
    ...fake,
  });

  await engine.tick();

  const afterFirstAttempt = fake.store.get("session-skip:session-1:exercise-1");
  assert.ok(afterFirstAttempt);
  assert.equal(afterFirstAttempt?.status, "failed");
  assert.equal(afterFirstAttempt?.retryCount, 1);
  assert.ok(afterFirstAttempt?.nextRetryAt && new Date(afterFirstAttempt.nextRetryAt).getTime() > Date.now());

  // Ticking again immediately must not re-attempt yet -- nextRetryAt is in
  // the future.
  await engine.tick();
  assert.equal(toggleCalls, 1);

  // Force the backoff window to have elapsed and tick again.
  fake.store.set("session-skip:session-1:exercise-1", {
    ...afterFirstAttempt!,
    nextRetryAt: "2000-01-01T00:00:00.000Z",
  });
  await engine.tick();
  assert.equal(toggleCalls, 2);
  const afterSecondAttempt = fake.store.get("session-skip:session-1:exercise-1");
  assert.equal(afterSecondAttempt?.retryCount, 2);
});

test("terminal server rejection (session completion) removes the item, does not retry, and reports onTerminalFailure -- the explicit session-completion-vs-pending-skip rule", async () => {
  // The chosen rule: session completion never waits for a pending skip
  // command. `guardLiveSessionMutation` (unmodified) rejects the replay of
  // a skip queued before completion with this exact error once the session
  // is no longer `in_progress`; the engine classifies that resolved
  // rejection as terminal and rolls back instead of retrying it forever.
  const fake = createFakeSkipToggleQueue([buildQueueItem()]);
  let terminalError: string | undefined;
  let toggleCalls = 0;

  const engine = createSkipToggleSyncEngine({
    userId: "user-1",
    toggleSkipAction: async () => {
      toggleCalls += 1;
      return { ok: false, error: LIVE_SESSION_MUTATION_ERROR };
    },
    onTerminalFailure: ({ error }) => { terminalError = error; },
    ...fake,
  });

  await engine.tick();

  assert.equal(toggleCalls, 1);
  assert.equal(terminalError, LIVE_SESSION_MUTATION_ERROR);
  assert.equal(fake.store.has("session-skip:session-1:exercise-1"), false);

  // A second tick must not call toggleSkipAction again -- the item is gone.
  await engine.tick();
  assert.equal(toggleCalls, 1);
});

test("an unknown, persistently-failing error is bounded (terminal fallback) instead of retrying forever like the existing set-log engine", async () => {
  const fake = createFakeSkipToggleQueue([
    buildQueueItem({ retryCount: SKIP_TOGGLE_MAX_RETRY_ATTEMPTS - 1 }),
  ]);
  let terminalError: string | undefined;

  const engine = createSkipToggleSyncEngine({
    userId: "user-1",
    toggleSkipAction: async () => ({ ok: false, error: "Some unknown recurring error." }),
    onTerminalFailure: ({ error }) => { terminalError = error; },
    ...fake,
  });

  await engine.tick();

  assert.equal(terminalError, SKIP_TOGGLE_SYNC_ERROR);
  assert.equal(fake.store.has("session-skip:session-1:exercise-1"), false);
});

test("a stale in-flight reply for a superseded command is discarded -- a superseded command cannot replay", async () => {
  const fake = createFakeSkipToggleQueue([buildQueueItem({ sequence: 1, desiredSkipped: true })]);
  let resolveToggle!: (result: ActionResult) => void;
  const togglePromise = new Promise<ActionResult>((resolve) => { resolveToggle = resolve; });
  let onItemSyncedCalls = 0;

  const engine = createSkipToggleSyncEngine({
    userId: "user-1",
    toggleSkipAction: async () => togglePromise,
    onItemSynced: () => { onItemSyncedCalls += 1; },
    ...fake,
  });

  const tickPromise = engine.tick();

  // While the first replay attempt is still in flight (claimed, status =
  // "syncing"), simulate the user flipping the exercise again before the
  // reply lands -- a real enqueueSkipToggle call would upsert exactly this
  // way (bumped sequence, new desired value, status reset to "queued").
  await Promise.resolve(); // let tick()'s claim step run first
  await Promise.resolve();
  fake.store.set("session-skip:session-1:exercise-1", buildQueueItem({
    sequence: 2,
    desiredSkipped: false,
    status: "queued",
  }));

  // Now let the ORIGINAL (now-stale) call resolve successfully.
  resolveToggle({ ok: true });
  await tickPromise;

  // The stale success must not have touched the newer command: it must
  // still be present, untouched, at sequence 2.
  const current = fake.store.get("session-skip:session-1:exercise-1");
  assert.ok(current);
  assert.equal(current?.sequence, 2);
  assert.equal(current?.desiredSkipped, false);
  assert.equal(current?.status, "queued");
  assert.equal(onItemSyncedCalls, 0);
});

test("duplicate replay of the same command from two concurrent engines never produces a double mutation", async () => {
  const fake = createFakeSkipToggleQueue([buildQueueItem()]);
  let toggleCalls = 0;
  let syncedCalls = 0;

  const makeEngine = () => createSkipToggleSyncEngine({
    userId: "user-1",
    toggleSkipAction: async () => {
      toggleCalls += 1;
      return { ok: true };
    },
    onItemSynced: () => { syncedCalls += 1; },
    ...fake,
  });

  const engineA = makeEngine();
  const engineB = makeEngine();

  // Simulate two tabs' sync engines racing to process the same persisted
  // queue item at (almost) the same time.
  await Promise.all([engineA.tick(), engineB.tick()]);

  assert.equal(toggleCalls, 1, "toggleSkipAction must only ever be invoked once for this command");
  assert.equal(syncedCalls, 1);
  assert.equal(fake.store.size, 0);
});

test("processes multiple independent exercises in one tick; one failing does not affect another succeeding", async () => {
  const itemA = buildQueueItem({ key: "session-skip:session-1:exercise-a", sessionExerciseId: "exercise-a" });
  const itemB = buildQueueItem({
    key: "session-skip:session-1:exercise-b",
    sessionExerciseId: "exercise-b",
    desiredSkipped: false,
  });
  const fake = createFakeSkipToggleQueue([itemA, itemB]);
  const terminalFailures: string[] = [];
  const synced: string[] = [];

  const engine = createSkipToggleSyncEngine({
    userId: "user-1",
    toggleSkipAction: async (formData) => {
      const { sessionExerciseId } = readFormData(formData);
      if (sessionExerciseId === "exercise-a") {
        return { ok: false, error: LIVE_SESSION_MUTATION_ERROR };
      }
      return { ok: true };
    },
    onTerminalFailure: ({ item }) => terminalFailures.push(item.sessionExerciseId),
    onItemSynced: ({ item }) => synced.push(item.sessionExerciseId),
    ...fake,
  });

  await engine.tick();

  assert.deepEqual(terminalFailures, ["exercise-a"]);
  assert.deepEqual(synced, ["exercise-b"]);
  assert.equal(fake.store.size, 0);
});

test("an unexpected error from the queue layer itself is surfaced via onUnexpectedError, not silently swallowed, and does not corrupt the item", async () => {
  const fake = createFakeSkipToggleQueue([buildQueueItem()]);
  const unexpectedErrors: unknown[] = [];

  const engine = createSkipToggleSyncEngine({
    userId: "user-1",
    toggleSkipAction: async () => ({ ok: true }),
    onUnexpectedError: (error) => unexpectedErrors.push(error),
    ...fake,
    claimSkipToggleQueueItemForSync: async () => {
      throw new Error("Simulated IndexedDB failure.");
    },
  });

  await assert.doesNotReject(engine.tick());

  assert.equal(unexpectedErrors.length, 1);
  // The item is untouched -- still queued, not stuck in a bad state.
  const current = fake.store.get("session-skip:session-1:exercise-1");
  assert.equal(current?.status, "queued");
});

test("a thrown network failure during replay degrades to the same transient-retry handling as a resolved failure (explicit catch, unlike the existing set-log engine)", async () => {
  const fake = createFakeSkipToggleQueue([buildQueueItem()]);

  const engine = createSkipToggleSyncEngine({
    userId: "user-1",
    toggleSkipAction: async () => {
      throw new Error("Fetch failed.");
    },
    ...fake,
  });

  await assert.doesNotReject(engine.tick());

  const current = fake.store.get("session-skip:session-1:exercise-1");
  assert.ok(current);
  assert.equal(current?.status, "failed");
  assert.equal(current?.retryCount, 1);
  assert.equal(current?.lastError, SKIP_TOGGLE_TRANSPORT_ERROR);
});

test("an abandoned syncing claim is reclaimed after its lease expires", async () => {
  const fake = createFakeSkipToggleQueue([
    buildQueueItem({
      status: "syncing",
      lastAttemptAt: "2000-01-01T00:00:00.000Z",
    }),
  ]);
  let toggleCalls = 0;

  const engine = createSkipToggleSyncEngine({
    userId: "user-1",
    toggleSkipAction: async () => {
      toggleCalls += 1;
      return { ok: true };
    },
    ...fake,
  });

  await engine.tick();

  assert.equal(toggleCalls, 1);
  assert.equal(fake.store.size, 0);
});

test("returned and thrown credential-shaped failures are never stored or emitted", async () => {
  for (const mode of ["returned", "thrown"] as const) {
    const fake = createFakeSkipToggleQueue([buildQueueItem()]);
    const terminalErrors: string[] = [];
    const engine = createSkipToggleSyncEngine({
      userId: "user-1",
      toggleSkipAction: async () => {
        if (mode === "thrown") {
          throw new Error("SUPABASE_SERVICE_ROLE_KEY=sb_secret_123");
        }
        return { ok: false, error: "postgres://user:password@host/db" };
      },
      onTerminalFailure: ({ error }) => terminalErrors.push(error),
      ...fake,
    });

    await engine.tick();

    const current = fake.store.get("session-skip:session-1:exercise-1");
    assert.ok(current);
    assert.equal(
      current.lastError,
      mode === "thrown" ? SKIP_TOGGLE_TRANSPORT_ERROR : SKIP_TOGGLE_SYNC_ERROR,
    );
    assert.deepEqual(terminalErrors, []);
    assert.doesNotMatch(JSON.stringify(current), /sb_secret|password@host/);
  }
});

test("app-restart scenario: a freshly constructed engine instance picks up and replays a pre-existing persisted item", async () => {
  // Simulate "the browser was closed and reopened": the fake queue's Map
  // stands in for what would be IndexedDB state that survived the reload,
  // and we construct a brand new engine (no shared in-memory state at all)
  // against it.
  const fake = createFakeSkipToggleQueue([buildQueueItem()]);
  let synced = false;

  const restartedEngine = createSkipToggleSyncEngine({
    userId: "user-1",
    toggleSkipAction: async () => ({ ok: true }),
    onItemSynced: () => { synced = true; },
    ...fake,
  });

  await restartedEngine.tick();

  assert.equal(synced, true);
  assert.equal(fake.store.size, 0);
});
