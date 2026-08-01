import type { ActionResult } from "@/lib/action-result";
import { isTerminalSkipToggleError } from "@/lib/offline/skip-toggle-reconciliation";
import type { SkipToggleQueueItem } from "@/lib/offline/skip-toggle-queue";

// Replay worker for the skip-toggle offline queue. Mirrors
// src/lib/offline/sync-engine.ts's shape (start/stop/tick, online-event +
// periodic-poll triggers, single-flight `isRunning` guard, exponential
// backoff) but is NOT a copy-paste: it fixes two gaps the existing engine
// has (see FITNESS_SKIP_OFFLINE_QUEUE_IMPLEMENTATION_PACKET.md, decision #8):
//   1. An explicit try/catch around the replay call itself, so a thrown
//      error (e.g. expired-auth `redirect()`, dropped connection) degrades
//      to the same transient-retry handling as a resolved failure, instead
//      of leaving the item wedged in "syncing" forever.
//   2. A bounded retry count with terminal classification, instead of
//      retrying an unknown, permanently-failing error every 30s forever.
//
// Queue CRUD is dependency-injected (not hard-imported like the existing
// engine) so this engine's tick/processItem/backoff/terminal-classification
// logic is fully unit-testable with in-memory fakes -- this repo's node:test
// setup has no jsdom/fake-indexeddb, so a real-IndexedDB-backed engine would
// otherwise be untestable at the unit level (the existing sync-engine.ts has
// no test file at all, for exactly this reason).

const BASE_DELAY_MS = 2000;
const MAX_DELAY_MS = 30000;

/**
 * Bounded retry fallback for an unknown, non-terminal-by-message error that
 * keeps recurring. This is a deliberate improvement over the existing
 * set-log sync engine, which retries forever with no cap. Kept small (5)
 * since each attempt already backs off exponentially up to 30s, so 5
 * attempts spans a few minutes before giving up and surfacing a clear
 * "could not sync" notification instead of silently spinning forever.
 */
export const SKIP_TOGGLE_MAX_RETRY_ATTEMPTS = 5;

export type SkipToggleSyncEngineDeps = {
  userId: string;
  toggleSkipAction: (formData: FormData) => Promise<ActionResult>;
  readPendingSkipToggles: (userId?: string) => Promise<SkipToggleQueueItem[]>;
  claimSkipToggleQueueItemForSync: (key: string, expectedSequence: number, attemptIso: string) => Promise<SkipToggleQueueItem | null>;
  removeSkipToggleQueueItemIfCurrent: (key: string, expectedSequence: number) => Promise<boolean>;
  scheduleSkipToggleRetryIfCurrent: (
    key: string,
    expectedSequence: number,
    patch: { retryCount: number; nextRetryAt: string; lastError: string; lastAttemptAt: string },
  ) => Promise<boolean>;
  onItemSynced?: (payload: { item: SkipToggleQueueItem }) => void;
  onTerminalFailure?: (payload: { item: SkipToggleQueueItem; error: string }) => void;
  onQueueUpdate?: () => void;
  /**
   * Fired when something in the replay pipeline itself throws unexpectedly
   * (i.e. not the classified toggleSkipAction transport failure, which is
   * always caught and handled as a normal transient/terminal outcome).
   * Intentionally observable rather than a bare empty catch, so an
   * unexpected failure is never silently swallowed.
   */
  onUnexpectedError?: (error: unknown) => void;
};

export function createSkipToggleSyncEngine(deps: SkipToggleSyncEngineDeps) {
  let timer: number | null = null;
  let isRunning = false;

  const schedule = (delayMs: number) => {
    if (timer !== null || typeof window === "undefined") {
      return;
    }
    timer = window.setTimeout(() => {
      timer = null;
      void tick();
    }, delayMs);
  };

  const applyBackoff = (retryCount: number) => Math.min(BASE_DELAY_MS * 2 ** retryCount, MAX_DELAY_MS);

  const processItem = async (item: SkipToggleQueueItem) => {
    const nowIso = new Date().toISOString();
    const claimed = await deps.claimSkipToggleQueueItemForSync(item.key, item.sequence, nowIso);
    if (!claimed) {
      // Superseded by a newer local command, or already claimed by a
      // concurrent replay attempt (e.g. another tab). Do nothing -- the
      // current queue state (whatever it now is) will be picked up
      // correctly on a later tick.
      return;
    }

    let result: ActionResult;
    try {
      const formData = new FormData();
      formData.set("sessionId", item.sessionId);
      formData.set("sessionExerciseId", item.sessionExerciseId);
      formData.set("nextSkipped", String(item.desiredSkipped));
      result = await deps.toggleSkipAction(formData);
    } catch (thrown) {
      // Transport/thrown failure (network unavailable, timeout, expired-auth
      // redirect throw, etc.) degrades to the same transient-retry handling
      // as a resolved `{ ok: false }` -- this is the explicit catch the
      // existing set-log engine lacks.
      result = { ok: false, error: thrown instanceof Error ? thrown.message : "Network error." };
    }

    if (result.ok) {
      // Idempotent success: if the store's row is still at this exact
      // sequence, remove it and report success. If it was superseded while
      // this call was in flight, this success is for a now-stale desired
      // value -- do not touch the newer queued row, do not report success
      // for it (the newer command is still pending and will replay next).
      const removed = await deps.removeSkipToggleQueueItemIfCurrent(item.key, item.sequence);
      if (removed) {
        deps.onItemSynced?.({ item });
      }
      deps.onQueueUpdate?.();
      return;
    }

    const nextRetryCount = item.retryCount + 1;
    const isTerminal = isTerminalSkipToggleError(result.error) || nextRetryCount >= SKIP_TOGGLE_MAX_RETRY_ATTEMPTS;

    if (isTerminal) {
      const removed = await deps.removeSkipToggleQueueItemIfCurrent(item.key, item.sequence);
      if (removed) {
        deps.onTerminalFailure?.({ item, error: result.error ?? "Sync failed." });
      }
      deps.onQueueUpdate?.();
      return;
    }

    const nextRetryAt = new Date(Date.now() + applyBackoff(nextRetryCount)).toISOString();
    await deps.scheduleSkipToggleRetryIfCurrent(item.key, item.sequence, {
      retryCount: nextRetryCount,
      nextRetryAt,
      lastError: result.error ?? "Sync failed",
      lastAttemptAt: nowIso,
    });
    deps.onQueueUpdate?.();
  };

  const tick = async () => {
    // Explicit `=== false` (not a bare falsy check) so an environment where
    // `navigator.onLine` is merely undefined (e.g. Node's own built-in
    // `navigator` global, which this repo's `node --test` runs under and
    // which has no real `onLine` signal) is treated as "proceed," not
    // "offline." Mirrors the same explicit check already used in
    // SessionExerciseFocus.tsx's handleSkipToggle offline precheck.
    if (isRunning || (typeof navigator !== "undefined" && navigator.onLine === false)) {
      return;
    }

    isRunning = true;
    try {
      const items = await deps.readPendingSkipToggles(deps.userId);
      for (const item of items) {
        if (item.nextRetryAt && new Date(item.nextRetryAt).getTime() > Date.now()) {
          continue;
        }
        try {
          await processItem(item);
        } catch (error) {
          // Never let one item's unexpected failure (e.g. a genuine
          // IndexedDB error) kill the rest of this tick's batch or leak as
          // an unhandled rejection. The item's persisted status is
          // untouched by a failure here, so it remains pending and will be
          // retried on a later tick; the failure is still surfaced via
          // onUnexpectedError rather than silently dropped.
          deps.onUnexpectedError?.(error);
        }
      }
    } finally {
      isRunning = false;
      schedule(BASE_DELAY_MS);
    }
  };

  const handleOnline = () => {
    void tick();
  };

  const start = () => {
    if (typeof window === "undefined") {
      return;
    }

    window.addEventListener("online", handleOnline);
    schedule(250);
  };

  const stop = () => {
    if (typeof window === "undefined") {
      return;
    }

    window.removeEventListener("online", handleOnline);
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
  };

  return { start, stop, tick };
}
