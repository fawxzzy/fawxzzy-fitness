import type { ActionResult } from "@/lib/action-result";
import {
  readPendingSetLogs,
  removeSetLogQueueItem,
  updateSetLogQueueItem,
  type SetLogQueueItem,
} from "@/lib/offline/set-log-queue";

type SyncSetLogResult = {
  queueItemId: string;
  ok: boolean;
  serverSetId?: string;
  error?: string;
};

const BASE_DELAY_MS = 2000;
const MAX_DELAY_MS = 30000;

type SetLogSyncEngineOptions = {
  userId: string;
  syncSetLogsAction: (payload: { items: SetLogQueueItem[] }) => Promise<ActionResult<{ results: SyncSetLogResult[] }>>;
  onQueueUpdate?: () => void;
  onItemSynced?: (payload: { item: SetLogQueueItem; serverSetId?: string }) => void;
};

export function createSetLogSyncEngine({ userId, syncSetLogsAction, onQueueUpdate, onItemSynced }: SetLogSyncEngineOptions) {
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

  const processItem = async (item: SetLogQueueItem) => {
    const nowIso = new Date().toISOString();
    await updateSetLogQueueItem({ ...item, status: "syncing", lastAttemptAt: nowIso });

    const response = await syncSetLogsAction({ items: [{ ...item, status: "syncing", lastAttemptAt: nowIso }] });
    const result = response.ok ? response.data?.results[0] : undefined;

    if (response.ok && result?.ok) {
      onItemSynced?.({ item, serverSetId: result.serverSetId });
      await removeSetLogQueueItem(item.id);
      onQueueUpdate?.();
      return true;
    }

    const nextRetryCount = item.retryCount + 1;
    const nextRetryAt = new Date(Date.now() + applyBackoff(nextRetryCount)).toISOString();
    await updateSetLogQueueItem({
      ...item,
      status: "failed",
      retryCount: nextRetryCount,
      nextRetryAt,
      lastError: result?.error ?? "Sync failed",
      lastAttemptAt: nowIso,
    });
    onQueueUpdate?.();
    return false;
  };

  const tick = async () => {
    if (isRunning || typeof navigator !== "undefined" && !navigator.onLine) {
      return;
    }

    isRunning = true;
    try {
      const items = await readPendingSetLogs(userId);
      for (const item of items) {
        if (item.nextRetryAt && new Date(item.nextRetryAt).getTime() > Date.now()) {
          continue;
        }
        await processItem(item);
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
