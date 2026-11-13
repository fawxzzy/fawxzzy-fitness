import type { ActionResult } from "@/lib/action-result";
import {
  readPendingSetLogs,
  removeSetLogQueueItem,
  updateSetLogQueueItem,
  type SetLogQueueItem,
} from "@/lib/offline/set-log-queue";
import {
  isSetLogQueueItemParked,
  isTerminalSetLogSyncError,
  SET_LOG_TRANSPORT_ERROR,
} from "@/lib/offline/set-log-reconciliation";

// Replay worker for the set-log offline queue. Hardened to the same bar as skip-toggle-sync-engine.ts:
//   1. The replay call is wrapped. A thrown replay (lie-fi, 5xx, expired-auth redirect) is a failure with
//      backoff, not an unhandled rejection that leaves the item "syncing" with no nextRetryAt and gets it
//      re-picked every 2 s in a hot loop that blocks the items behind it.
//   2. Retries are bounded (see set-log-reconciliation.ts). A set is user data, so the terminal state is "parked"
//      (kept in the queue as `failed`, skipped by periodic ticks, one new attempt on restart / `online`),
//      never deleted.
//   3. `stop()` is final: a tick already in flight does not reschedule itself and starts no further item, so a
//      stopped engine cannot keep polling next to its replacement across expand/collapse swaps.
//   4. One item is replayed by one engine at a time per tab (module-level in-flight guard), because the card
//      engine and the session-level engine are swapped as rows expand and collapse.
// Queue operations are injectable so tick/backoff/stop behaviour is unit-testable without IndexedDB.

type SyncSetLogResult = {
  queueItemId: string;
  ok: boolean;
  serverSetId?: string;
  error?: string;
};

const BASE_DELAY_MS = 2000;
const MAX_DELAY_MS = 30000;

/** Item ids currently being replayed by any engine in this tab. */
const inFlightItemIds = new Set<string>();

export type SetLogQueueOps = {
  readPendingSetLogs: (userId?: string) => Promise<SetLogQueueItem[]>;
  updateSetLogQueueItem: (item: SetLogQueueItem) => Promise<void>;
  removeSetLogQueueItem: (id: string) => Promise<void>;
};

const defaultQueueOps: SetLogQueueOps = { readPendingSetLogs, updateSetLogQueueItem, removeSetLogQueueItem };

type SetLogSyncEngineOptions = {
  userId: string;
  syncSetLogsAction: (payload: { items: SetLogQueueItem[] }) => Promise<ActionResult<{ results: SyncSetLogResult[] }>>;
  onQueueUpdate?: () => void;
  onItemSynced?: (payload: { item: SetLogQueueItem; serverSetId?: string }) => void;
  /** Fired once when an item becomes parked (terminal failed state). The item stays in the queue. */
  onTerminalFailure?: (payload: { item: SetLogQueueItem; error: string }) => void;
  /** Something in the replay pipeline itself threw (e.g. an IndexedDB error). The item stays pending. */
  onUnexpectedError?: (error: unknown) => void;
  queue?: SetLogQueueOps;
};

export function createSetLogSyncEngine({
  userId,
  syncSetLogsAction,
  onQueueUpdate,
  onItemSynced,
  onTerminalFailure,
  onUnexpectedError,
  queue = defaultQueueOps,
}: SetLogSyncEngineOptions) {
  let timer: number | null = null;
  let isRunning = false;
  let stopped = false;
  let retryParkedNextTick = false;

  const schedule = (delayMs: number) => {
    if (stopped || timer !== null || typeof window === "undefined") {
      return;
    }
    timer = window.setTimeout(() => {
      timer = null;
      void tick();
    }, delayMs);
  };

  const applyBackoff = (retryCount: number) => Math.min(BASE_DELAY_MS * 2 ** retryCount, MAX_DELAY_MS);

  const processItem = async (item: SetLogQueueItem) => {
    const nowIso = new Date().toISOString();
    await queue.updateSetLogQueueItem({ ...item, status: "syncing", lastAttemptAt: nowIso });

    let result: SyncSetLogResult | undefined;
    let failureError = "Sync failed";
    try {
      const response = await syncSetLogsAction({ items: [{ ...item, status: "syncing", lastAttemptAt: nowIso }] });
      result = response.ok ? response.data?.results[0] : undefined;
      if (!response.ok) {
        failureError = response.error || failureError;
      }
    } catch {
      // Transport/thrown failure degrades to the same backoff handling as a resolved failure.
      result = undefined;
      failureError = SET_LOG_TRANSPORT_ERROR;
    }

    if (result?.ok) {
      onItemSynced?.({ item, serverSetId: result.serverSetId });
      await queue.removeSetLogQueueItem(item.id);
      onQueueUpdate?.();
      return true;
    }

    const error = result?.error ?? failureError;
    const nextRetryCount = item.retryCount + 1;
    const failed: SetLogQueueItem = {
      ...item,
      status: "failed",
      retryCount: nextRetryCount,
      nextRetryAt: new Date(Date.now() + applyBackoff(nextRetryCount)).toISOString(),
      lastError: error,
      lastAttemptAt: nowIso,
    };
    await queue.updateSetLogQueueItem(failed);
    if (isSetLogQueueItemParked(failed) && !isSetLogQueueItemParked(item)) {
      onTerminalFailure?.({ item: failed, error: isTerminalSetLogSyncError(error) ? error : "Sync failed" });
    }
    onQueueUpdate?.();
    return false;
  };

  const tick = async () => {
    // Explicit `=== false`: where `navigator.onLine` is merely undefined (Node's own `navigator`), proceed.
    if (stopped || isRunning || (typeof navigator !== "undefined" && navigator.onLine === false)) {
      return;
    }

    isRunning = true;
    const retryParked = retryParkedNextTick;
    retryParkedNextTick = false;
    try {
      const items = await queue.readPendingSetLogs(userId);
      for (const item of items) {
        if (stopped) {
          break;
        }
        if (inFlightItemIds.has(item.id)) {
          continue;
        }
        if (isSetLogQueueItemParked(item)) {
          if (!retryParked) {
            continue;
          }
        } else if (item.nextRetryAt && new Date(item.nextRetryAt).getTime() > Date.now()) {
          continue;
        }

        inFlightItemIds.add(item.id);
        try {
          await processItem(item);
        } catch (error) {
          // One item's unexpected failure (an IndexedDB error) must not kill the batch or leak as an unhandled
          // rejection. Its persisted state is untouched, so it stays pending and is retried on a later tick.
          onUnexpectedError?.(error);
        } finally {
          inFlightItemIds.delete(item.id);
        }
      }
    } catch (error) {
      onUnexpectedError?.(error);
    } finally {
      isRunning = false;
      schedule(BASE_DELAY_MS);
    }
  };

  const handleOnline = () => {
    retryParkedNextTick = true;
    void tick();
  };

  const start = () => {
    if (typeof window === "undefined") {
      return;
    }

    stopped = false;
    retryParkedNextTick = true;
    window.addEventListener("online", handleOnline);
    schedule(250);
  };

  const stop = () => {
    stopped = true;
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
