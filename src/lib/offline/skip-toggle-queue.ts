import { openOfflineDb, SKIP_TOGGLE_QUEUE_STORE } from "@/lib/offline/set-log-queue";
import {
  buildSkipToggleQueueKey,
  isSkipToggleQueueItemClaimable,
  isSkipToggleQueueItemPendingSync,
  planSkipToggleUpsert,
} from "@/lib/offline/skip-toggle-reconciliation";

// Offline durability queue for the Current Session skip/unskip toggle.
//
// Command model: an ABSOLUTE desired state (`desiredSkipped`), never a "flip
// current state" intent -- mirrors `toggleSkipAction`'s own `nextSkipped`
// contract exactly, so replaying the same command any number of times is a
// no-op past the first successful application.
//
// Storage model: one row per (sessionId, sessionExerciseId), keyed by
// `key` (see buildSkipToggleQueueKey), upserted in place. This is the
// opposite of set-log-queue's append-many-dedupe-by-clientLogId model, which
// is why this lives in its own object store within the SAME
// `fawxzzy-fitness-offline` IndexedDB database rather than being merged into
// `set-log-queue`'s store (see set-log-queue.ts's openOfflineDb for the
// shared schema/version bump, and the implementation packet at
// D:\atlas-tmp\claude-fitness-set-count-sync-20260801\FITNESS_SKIP_OFFLINE_QUEUE_IMPLEMENTATION_PACKET.md,
// decision #9, for the full reasoning).

export const SKIP_TOGGLE_QUEUE_SCHEMA_VERSION = 1;

export type SkipToggleQueueStatus = "queued" | "syncing" | "failed";

export type SkipToggleQueueItem = {
  /** `session-skip:<sessionId>:<sessionExerciseId>` -- the store's keyPath. */
  key: string;
  userId: string;
  sessionId: string;
  sessionExerciseId: string;
  desiredSkipped: boolean;
  schemaVersion: number;
  /**
   * Monotonic per-key sequence, derived from the persisted item itself
   * (existing.sequence + 1), NOT wall-clock time. Used to detect and safely
   * discard a stale in-flight replay result for a command that has since
   * been superseded by a newer local intent for the same key.
   */
  sequence: number;
  createdAt: string;
  updatedAt: string;
  retryCount: number;
  status: SkipToggleQueueStatus;
  lastAttemptAt?: string;
  nextRetryAt?: string;
  lastError?: string;
};

function canUseIndexedDb() {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

function isSupportedSkipToggleQueueSchemaVersion(schemaVersion: number) {
  return schemaVersion === SKIP_TOGGLE_QUEUE_SCHEMA_VERSION;
}

function isSkipToggleQueueItemReadableForUser(item: SkipToggleQueueItem, userId?: string) {
  if (!isSupportedSkipToggleQueueSchemaVersion(item.schemaVersion)) {
    return false;
  }
  if (!item.userId) {
    return false;
  }
  if (userId && item.userId !== userId) {
    return false;
  }
  return isSkipToggleQueueItemPendingSync(item);
}

function sortByKeyOrdering(items: SkipToggleQueueItem[]) {
  return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * Enqueue (upsert) a skip/unskip command. If a command for this exact
 * (sessionId, sessionExerciseId) key is already queued with the SAME
 * `desiredSkipped` value, this is a genuine no-op re-tap: the existing item
 * is returned unchanged (sequence/retryCount/createdAt untouched), matching
 * how a repeated identical set-log dedupe returns the existing row instead
 * of inserting a duplicate. If the value differs (a genuine flip, including
 * skip-then-unskip-before-replay), the row is overwritten in place with a
 * freshly bumped sequence and reset retry bookkeeping -- there is never more
 * than one queued row per exercise.
 */
export async function enqueueSkipToggle(input: {
  userId: string;
  sessionId: string;
  sessionExerciseId: string;
  desiredSkipped: boolean;
}): Promise<SkipToggleQueueItem | null> {
  if (!canUseIndexedDb()) {
    return null;
  }

  const nowIso = new Date().toISOString();
  const key = buildSkipToggleQueueKey(input.sessionId, input.sessionExerciseId);
  const db = await openOfflineDb();
  try {
    return await new Promise<SkipToggleQueueItem>((resolve, reject) => {
      const tx = db.transaction(SKIP_TOGGLE_QUEUE_STORE, "readwrite");
      const store = tx.objectStore(SKIP_TOGGLE_QUEUE_STORE);
      const existingRequest = store.get(key);

      let resultItem: SkipToggleQueueItem | null = null;

      existingRequest.onsuccess = () => {
        const existing = (existingRequest.result as SkipToggleQueueItem | undefined) ?? null;
        const planned = planSkipToggleUpsert({
          existing,
          userId: input.userId,
          sessionId: input.sessionId,
          sessionExerciseId: input.sessionExerciseId,
          desiredSkipped: input.desiredSkipped,
          schemaVersion: SKIP_TOGGLE_QUEUE_SCHEMA_VERSION,
          nowIso,
        });
        resultItem = planned.item;
        if (planned.changed) {
          store.put(planned.item);
        }
      };

      existingRequest.onerror = () => {
        reject(existingRequest.error ?? new Error("Unable to read skip-toggle queue item."));
      };

      tx.oncomplete = () => {
        if (resultItem) {
          resolve(resultItem);
        } else {
          reject(new Error("Unable to enqueue skip toggle."));
        }
      };
      tx.onerror = () => reject(tx.error ?? new Error("Unable to enqueue skip toggle."));
      tx.onabort = () => reject(tx.error ?? new Error("Skip toggle queue transaction aborted."));
    });
  } finally {
    db.close();
  }
}

export async function readSkipToggleQueueItem(
  sessionId: string,
  sessionExerciseId: string,
): Promise<SkipToggleQueueItem | null> {
  if (!canUseIndexedDb()) {
    return null;
  }

  const key = buildSkipToggleQueueKey(sessionId, sessionExerciseId);
  const db = await openOfflineDb();
  try {
    return await new Promise<SkipToggleQueueItem | null>((resolve, reject) => {
      const tx = db.transaction(SKIP_TOGGLE_QUEUE_STORE, "readonly");
      const request = tx.objectStore(SKIP_TOGGLE_QUEUE_STORE).get(key);
      request.onsuccess = () => resolve((request.result as SkipToggleQueueItem | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error("Unable to read skip toggle queue item."));
    });
  } finally {
    db.close();
  }
}

export async function readPendingSkipToggles(userId?: string): Promise<SkipToggleQueueItem[]> {
  if (!canUseIndexedDb()) {
    return [];
  }

  const db = await openOfflineDb();
  try {
    const items = await new Promise<SkipToggleQueueItem[]>((resolve, reject) => {
      const tx = db.transaction(SKIP_TOGGLE_QUEUE_STORE, "readonly");
      const request = tx.objectStore(SKIP_TOGGLE_QUEUE_STORE).getAll();
      request.onsuccess = () => resolve((request.result as SkipToggleQueueItem[] | undefined) ?? []);
      request.onerror = () => reject(request.error ?? new Error("Unable to read skip toggle queue."));
    });

    return sortByKeyOrdering(items.filter((item) => isSkipToggleQueueItemReadableForUser(item, userId)));
  } finally {
    db.close();
  }
}

/**
 * Compare-and-swap claim: marks the item "syncing" only if the store's
 * current row for this key still matches `expectedSequence` and any prior
 * claim is either absent or older than the bounded claim lease. Returns null if the claim could not be made -- the
 * caller must treat that as "skip this attempt, the current queue state
 * will be picked up correctly on a later tick."
 */
export async function claimSkipToggleQueueItemForSync(
  key: string,
  expectedSequence: number,
  attemptIso: string,
): Promise<SkipToggleQueueItem | null> {
  if (!canUseIndexedDb()) {
    return null;
  }

  const db = await openOfflineDb();
  try {
    return await new Promise<SkipToggleQueueItem | null>((resolve, reject) => {
      const tx = db.transaction(SKIP_TOGGLE_QUEUE_STORE, "readwrite");
      const store = tx.objectStore(SKIP_TOGGLE_QUEUE_STORE);
      const request = store.get(key);
      let claimed: SkipToggleQueueItem | null = null;

      request.onsuccess = () => {
        const current = request.result as SkipToggleQueueItem | undefined;
        if (
          !current
          || current.sequence !== expectedSequence
          || !isSkipToggleQueueItemClaimable(current, attemptIso)
        ) {
          return;
        }
        claimed = { ...current, status: "syncing", lastAttemptAt: attemptIso };
        store.put(claimed);
      };
      request.onerror = () => reject(request.error ?? new Error("Unable to read skip toggle queue item."));

      tx.oncomplete = () => resolve(claimed);
      tx.onerror = () => reject(tx.error ?? new Error("Unable to claim skip toggle queue item."));
      tx.onabort = () => reject(tx.error ?? new Error("Skip toggle claim transaction aborted."));
    });
  } finally {
    db.close();
  }
}

/**
 * Removes the item only if it still matches `expectedSequence` -- i.e. it
 * hasn't been superseded by a newer local command since it was claimed for
 * replay. Returns whether the removal actually happened.
 */
export async function removeSkipToggleQueueItemIfCurrent(key: string, expectedSequence: number): Promise<boolean> {
  if (!canUseIndexedDb()) {
    return false;
  }

  const db = await openOfflineDb();
  try {
    return await new Promise<boolean>((resolve, reject) => {
      const tx = db.transaction(SKIP_TOGGLE_QUEUE_STORE, "readwrite");
      const store = tx.objectStore(SKIP_TOGGLE_QUEUE_STORE);
      const request = store.get(key);
      let didRemove = false;

      request.onsuccess = () => {
        const current = request.result as SkipToggleQueueItem | undefined;
        if (!current || current.sequence !== expectedSequence) {
          return;
        }
        didRemove = true;
        store.delete(key);
      };
      request.onerror = () => reject(request.error ?? new Error("Unable to read skip toggle queue item."));

      tx.oncomplete = () => resolve(didRemove);
      tx.onerror = () => reject(tx.error ?? new Error("Unable to remove skip toggle queue item."));
      tx.onabort = () => reject(tx.error ?? new Error("Skip toggle queue remove aborted."));
    });
  } finally {
    db.close();
  }
}

/**
 * Records a transient-failure retry (bumped retryCount / backoff /
 * lastError) only if the item still matches `expectedSequence`. Returns
 * whether the update actually happened.
 */
export async function scheduleSkipToggleRetryIfCurrent(
  key: string,
  expectedSequence: number,
  patch: { retryCount: number; nextRetryAt: string; lastError: string; lastAttemptAt: string },
): Promise<boolean> {
  if (!canUseIndexedDb()) {
    return false;
  }

  const db = await openOfflineDb();
  try {
    return await new Promise<boolean>((resolve, reject) => {
      const tx = db.transaction(SKIP_TOGGLE_QUEUE_STORE, "readwrite");
      const store = tx.objectStore(SKIP_TOGGLE_QUEUE_STORE);
      const request = store.get(key);
      let didUpdate = false;

      request.onsuccess = () => {
        const current = request.result as SkipToggleQueueItem | undefined;
        if (!current || current.sequence !== expectedSequence) {
          return;
        }
        didUpdate = true;
        store.put({ ...current, status: "failed", ...patch });
      };
      request.onerror = () => reject(request.error ?? new Error("Unable to read skip toggle queue item."));

      tx.oncomplete = () => resolve(didUpdate);
      tx.onerror = () => reject(tx.error ?? new Error("Unable to update skip toggle queue item."));
      tx.onabort = () => reject(tx.error ?? new Error("Skip toggle queue update aborted."));
    });
  } finally {
    db.close();
  }
}

/** Unconditional removal, e.g. for a user-initiated "cancel this queued change" action. */
export async function removeSkipToggleQueueItem(key: string): Promise<void> {
  if (!canUseIndexedDb()) {
    return;
  }

  const db = await openOfflineDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(SKIP_TOGGLE_QUEUE_STORE, "readwrite");
      tx.objectStore(SKIP_TOGGLE_QUEUE_STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Unable to remove skip toggle queue item."));
      tx.onabort = () => reject(tx.error ?? new Error("Skip toggle queue remove aborted."));
    });
  } finally {
    db.close();
  }
}
