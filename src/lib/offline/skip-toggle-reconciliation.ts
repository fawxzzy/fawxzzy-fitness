import { LIVE_SESSION_EXERCISE_ERROR, LIVE_SESSION_MUTATION_ERROR } from "@/lib/session-live-mutation";
import type { SkipToggleQueueItem } from "@/lib/offline/skip-toggle-queue";

// Pure, IndexedDB-free helpers shared by skip-toggle-queue.ts (the storage
// layer) and skip-toggle-sync-engine.ts (the replay worker). Mirrors the role
// set-log-reconciliation.ts plays for set-log-queue.ts / sync-engine.ts.

/**
 * Stable supersession key for a skip/unskip command: one queued command per
 * (sessionId, exerciseId) pair, ever. This is the IndexedDB store's keyPath,
 * so enqueueing is always an upsert-by-key rather than an append.
 */
export function buildSkipToggleQueueKey(sessionId: string, sessionExerciseId: string): string {
  return `session-skip:${sessionId}:${sessionExerciseId}`;
}

export function isSkipToggleQueueItemPendingSync(item: Pick<SkipToggleQueueItem, "status">): boolean {
  return item.status === "queued" || item.status === "failed" || item.status === "syncing";
}

/**
 * A server-resolved `{ ok: false }` rejection is "terminal" (do not retry,
 * roll back, notify the user with a specific reason) when it comes from the
 * existing, unmodified `guardLiveSessionMutation` backstop -- i.e. the
 * session was completed/no longer active, or the exercise no longer belongs
 * to the current active session. Any other resolved failure, or a thrown
 * transport error, is treated as transient and retried with backoff (see
 * SKIP_TOGGLE_MAX_RETRY_ATTEMPTS for the bounded fallback when an unknown
 * error keeps recurring).
 */
export function isTerminalSkipToggleError(error?: string | null): boolean {
  if (!error) {
    return false;
  }
  return error === LIVE_SESSION_MUTATION_ERROR || error === LIVE_SESSION_EXERCISE_ERROR;
}

export type PlannedSkipToggleUpsert = {
  item: SkipToggleQueueItem;
  /**
   * false when this enqueue call is a genuine no-op re-tap: the same
   * `desiredSkipped` value is already the current queued/pending command for
   * this key. In that case the existing item (same sequence, retryCount,
   * createdAt) is returned unchanged -- we deliberately do not bump the
   * sequence or reset backoff bookkeeping for a repeated tap that doesn't
   * change the desired outcome.
   */
  changed: boolean;
};

/**
 * Computes the next queue-item state for an upsert-by-key enqueue.
 *
 * Conflict/command model (see task brief): the command is an ABSOLUTE
 * desired state (`desiredSkipped`), never a "flip current state" intent, so
 * replaying it any number of times converges deterministically. Ordering
 * between repeated local commands for the same key is decided by a
 * monotonic `sequence` counter derived from the store itself (existing
 * item's sequence + 1) -- NOT wall-clock time -- so it survives a page
 * reload correctly (the counter's source of truth is the persisted item,
 * not an in-memory/epoch-seeded counter that could restart lower than an
 * old still-queued item's sequence).
 */
export function planSkipToggleUpsert(params: {
  existing: SkipToggleQueueItem | null;
  userId: string;
  sessionId: string;
  sessionExerciseId: string;
  desiredSkipped: boolean;
  schemaVersion: number;
  nowIso: string;
}): PlannedSkipToggleUpsert {
  const key = buildSkipToggleQueueKey(params.sessionId, params.sessionExerciseId);

  if (params.existing && params.existing.desiredSkipped === params.desiredSkipped) {
    return { item: params.existing, changed: false };
  }

  const nextSequence = (params.existing?.sequence ?? 0) + 1;

  const item: SkipToggleQueueItem = {
    key,
    userId: params.userId,
    sessionId: params.sessionId,
    sessionExerciseId: params.sessionExerciseId,
    desiredSkipped: params.desiredSkipped,
    schemaVersion: params.schemaVersion,
    sequence: nextSequence,
    createdAt: params.existing?.createdAt ?? params.nowIso,
    updatedAt: params.nowIso,
    retryCount: 0,
    status: "queued",
  };

  return { item, changed: true };
}
