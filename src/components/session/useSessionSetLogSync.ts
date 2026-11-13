"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { readPendingSetLogs, type SetLogQueueItem } from "@/lib/offline/set-log-queue";
import { createSetLogSyncEngine } from "@/lib/offline/sync-engine";

type SyncSetLogsAction = Parameters<typeof createSetLogSyncEngine>[0]["syncSetLogsAction"];

/**
 * Session-level replay worker for the offline set-log queue (FF-PWA-002).
 *
 * The set-log sync engine otherwise only runs inside an expanded SetLoggerCard, which is unmounted while every
 * exercise row is collapsed. A set queued from a collapsed row's quick log (or left queued by a row that was
 * just collapsed) therefore needs a worker that lives at the session-list level. `enabled` must be false while a
 * logger card is mounted so only one engine replays the queue at a time (see `shouldRunSessionSetLogSync`).
 *
 * The queue itself is shared and idempotent (`clientLogId` dedupe on both the device and the server), so a set
 * is replayed exactly once whichever worker gets to it.
 *
 * Cold start: on mount (whichever worker owns the replay) the pending queue is read once and handed to
 * `onQueuedSetsRead`, so sets queued before an app kill or a reopened session page are restored into rows that
 * are collapsed. Without this the only restore path was the expanded logger card.
 */
export function useSessionSetLogSync({
  userId,
  enabled,
  syncSetLogsAction,
  onItemSynced,
  onQueuedSetsRead,
}: {
  userId: string;
  enabled: boolean;
  syncSetLogsAction: SyncSetLogsAction;
  onItemSynced: (payload: { item: SetLogQueueItem; serverSetId?: string }) => void;
  onQueuedSetsRead: (queued: SetLogQueueItem[]) => void;
}) {
  const toast = useToast();
  const onItemSyncedRef = useRef(onItemSynced);
  const onQueuedSetsReadRef = useRef(onQueuedSetsRead);
  const lastStatusByClientLogIdRef = useRef<Record<string, SetLogQueueItem["status"]>>({});

  useEffect(() => {
    onItemSyncedRef.current = onItemSynced;
    onQueuedSetsReadRef.current = onQueuedSetsRead;
  }, [onItemSynced, onQueuedSetsRead]);

  useEffect(() => {
    let isCancelled = false;

    void readPendingSetLogs(userId)
      .then((queued) => {
        if (!isCancelled) {
          onQueuedSetsReadRef.current(queued);
        }
      })
      .catch(() => {
        // Keep the session list usable when offline storage is unavailable.
      });

    return () => {
      isCancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let isCancelled = false;

    const readQueue = async (announce: boolean) => {
      try {
        const queued = await readPendingSetLogs(userId);
        if (isCancelled) {
          return;
        }

        const previousStatuses = lastStatusByClientLogIdRef.current;
        if (announce) {
          for (const item of queued) {
            const previousStatus = previousStatuses[item.clientLogId];
            if (item.status === "syncing" && previousStatus !== "syncing") {
              toast.success("Syncing saved sets...");
              break;
            }
            if (item.status === "failed" && previousStatus !== "failed") {
              toast.error("Could not sync a saved set.");
              break;
            }
          }
        }
        lastStatusByClientLogIdRef.current = Object.fromEntries(
          queued.map((item) => [item.clientLogId, item.status] as const),
        );

        onQueuedSetsReadRef.current(queued);
      } catch {
        // Keep the session list usable when offline storage is unavailable.
      }
    };

    const engine = createSetLogSyncEngine({
      userId,
      syncSetLogsAction,
      onItemSynced: (payload) => {
        onItemSyncedRef.current(payload);
        delete lastStatusByClientLogIdRef.current[payload.item.clientLogId];
        toast.success("Saved set synced.");
      },
      onQueueUpdate: () => {
        void readQueue(true);
      },
      onTerminalFailure: () => {
        // The set stays saved on this device (parked in the queue); the status toast above already told the user.
        toast.error("Could not sync a saved set. It stays saved on this device.");
      },
      onUnexpectedError: () => {
        // Offline storage failed mid-replay; the item stays pending and is retried on a later tick.
      },
    });

    engine.start();
    // Seed statuses silently and release any set whose queue entry was already replayed by another worker.
    void readQueue(false);

    return () => {
      isCancelled = true;
      engine.stop();
    };
  }, [enabled, syncSetLogsAction, toast, userId]);
}
