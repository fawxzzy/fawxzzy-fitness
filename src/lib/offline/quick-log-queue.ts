import type { ActionResult } from "@/lib/action-result";
import type { FitnessDistanceUnit } from "@/lib/fitness-distance-units";
import type { OfflineSetPayload, SetLogQueueItem, SetLogQueueStatus } from "@/lib/offline/set-log-queue";
import { resolveStableSetId } from "@/lib/offline/set-log-reconciliation";
import type { SetRow } from "@/types/db";

/**
 * Collapsed-row quick log, offline doctrine (FF-PWA-002).
 *
 * The expanded logger (SetLoggerCard in SessionTimers.tsx) never loses a set to a dropped connection: it
 * applies the set optimistically, and when the device is offline up front or the request throws it writes the
 * set to the IndexedDB set-log queue (`enqueueSetLog`, deduped by `clientLogId`) so the sync engine can replay
 * it. The collapsed-row quick log used to call `addSetAction` directly and, on any failure, roll the optimistic
 * set back and show "Could not quick log set." -- the set was lost. This module holds the decision logic so the
 * collapsed row follows the same route, with the same copy, queue item and idempotency key as the expanded one.
 *
 * Deliberate difference from the expanded logger: a RESOLVED `{ ok: false }` from the server (validation, auth,
 * completed session) is an explicit refusal, not a transport failure. It is rolled back with the server's
 * message and never queued (the set-log sync engine retries forever, so queueing a refused write would loop).
 * Only "offline up front" and "the request threw" are queued.
 */

export type QuickLogQueueRoute = "offline" | "request-failed";

export const QUICK_LOG_OFFLINE_QUEUED_MESSAGE = "Offline: set queued for sync.";
export const QUICK_LOG_OFFLINE_UNSAVED_MESSAGE = "Offline: unable to save set locally.";
export const QUICK_LOG_REQUEST_FAILED_QUEUED_MESSAGE = "Request failed. Set queued for sync.";
export const QUICK_LOG_FAILED_MESSAGE = "Could not quick log set.";

export type QuickLogSetOutcome =
  | { kind: "saved"; result: Extract<ActionResult<{ set: SetRow }>, { ok: true }> }
  | { kind: "queued"; route: QuickLogQueueRoute; queueItem: SetLogQueueItem; message: string }
  | { kind: "rejected"; message: string }
  | { kind: "unsaved"; route: QuickLogQueueRoute; message: string };

export function toOfflineSetPayload(payload: {
  weight: number;
  reps: number;
  durationSeconds: number | null;
  distance: number | null;
  distanceUnit: FitnessDistanceUnit | null;
  calories: number | null;
  isWarmup: boolean;
  notes: string | null;
  weightUnit: "lbs" | "kg";
}): OfflineSetPayload {
  return {
    weight: payload.weight,
    reps: payload.reps,
    durationSeconds: payload.durationSeconds,
    distance: payload.distance,
    // Same rule as the expanded logger: a unit only travels with a distance value.
    distanceUnit: payload.distance !== null ? payload.distanceUnit : null,
    calories: payload.calories,
    rpe: null,
    isWarmup: payload.isWarmup,
    notes: payload.notes,
    weightUnit: payload.weightUnit,
  };
}

export async function submitQuickLogSet(args: {
  isOffline: boolean;
  addSet: () => Promise<ActionResult<{ set: SetRow }>>;
  enqueue: () => Promise<SetLogQueueItem | null>;
}): Promise<QuickLogSetOutcome> {
  const queueSet = async (route: QuickLogQueueRoute): Promise<QuickLogSetOutcome> => {
    let queueItem: SetLogQueueItem | null = null;
    try {
      queueItem = await args.enqueue();
    } catch {
      queueItem = null;
    }

    if (queueItem) {
      return {
        kind: "queued",
        route,
        queueItem,
        message: route === "offline" ? QUICK_LOG_OFFLINE_QUEUED_MESSAGE : QUICK_LOG_REQUEST_FAILED_QUEUED_MESSAGE,
      };
    }

    return {
      kind: "unsaved",
      route,
      message: route === "offline" ? QUICK_LOG_OFFLINE_UNSAVED_MESSAGE : QUICK_LOG_FAILED_MESSAGE,
    };
  };

  if (args.isOffline) {
    return queueSet("offline");
  }

  let result: ActionResult<{ set: SetRow }>;
  try {
    result = await args.addSet();
  } catch {
    return queueSet("request-failed");
  }

  if (result.ok) {
    return { kind: "saved", result };
  }

  return { kind: "rejected", message: result.error || QUICK_LOG_FAILED_MESSAGE };
}

/** Minimal shape of a set held in the session row snapshots (matches SetLoggerSeedSet). */
export type QueueAwareSnapshotSet = SetRow & {
  stableId?: string;
  queueItemId?: string;
  pending?: boolean;
  queueStatus?: SetLogQueueStatus;
};

function isSetForClientLogId(set: QueueAwareSnapshotSet, clientLogId: string) {
  return (set.stableId ?? resolveStableSetId(set)) === clientLogId;
}

/** Marks the optimistic set for `clientLogId` as saved locally in the queue (same fields the expanded logger writes). */
export function markSnapshotSetQueued<T extends QueueAwareSnapshotSet>(sets: T[], clientLogId: string, queueItemId: string | null | undefined): T[] {
  if (!sets.some((set) => isSetForClientLogId(set, clientLogId))) {
    return sets;
  }

  return sets.map((set) => (
    isSetForClientLogId(set, clientLogId)
      ? {
          ...set,
          queueItemId: queueItemId ?? set.queueItemId,
          pending: true,
          queueStatus: "queued" as const,
          user_id: "queued",
        }
      : set
  ));
}

/** Replaces a queued set with its server identity once the sync engine has replayed it. */
export function markSnapshotSetSynced<T extends QueueAwareSnapshotSet>(
  sets: T[],
  synced: { clientLogId: string; serverSetId?: string },
  userId: string,
): T[] {
  if (!sets.some((set) => isSetForClientLogId(set, synced.clientLogId))) {
    return sets;
  }

  return sets.map((set) => (
    isSetForClientLogId(set, synced.clientLogId)
      ? {
          ...set,
          id: synced.serverSetId ?? set.id,
          client_log_id: synced.clientLogId,
          pending: false,
          queueItemId: undefined,
          queueStatus: undefined,
          user_id: userId,
        }
      : set
  ));
}

/** Applies a replayed queue item to the per-exercise snapshot map; returns the same map when nothing matched. */
export function applySyncedItemToSnapshotMap<T extends QueueAwareSnapshotSet>(
  snapshots: Record<string, T[]>,
  item: Pick<SetLogQueueItem, "sessionExerciseId" | "clientLogId">,
  serverSetId: string | undefined,
  userId: string,
): Record<string, T[]> {
  const previous = snapshots[item.sessionExerciseId];
  if (!previous) {
    return snapshots;
  }

  const next = markSnapshotSetSynced(previous, { clientLogId: item.clientLogId, serverSetId }, userId);
  return next === previous ? snapshots : { ...snapshots, [item.sessionExerciseId]: next };
}

/**
 * Re-reads the queue state into a row's set snapshot: a set that is still queued shows its current queue
 * status; a set that carried a queue status but is no longer in the queue is released. Only sets that were
 * queued are touched, so an online set that is merely in flight is never cleared by a queue refresh.
 */
export function reconcileSnapshotQueueStatuses<T extends QueueAwareSnapshotSet>(sets: T[], queued: SetLogQueueItem[]): T[] {
  const queuedByClientLogId = new Map(queued.map((item) => [item.clientLogId, item] as const));
  let changed = false;

  const next = sets.map((set) => {
    const match = queuedByClientLogId.get(set.stableId ?? resolveStableSetId(set));
    if (match) {
      if (set.queueItemId === match.id && set.pending === true && set.queueStatus === match.status) {
        return set;
      }
      changed = true;
      return { ...set, queueItemId: match.id, pending: true, queueStatus: match.status };
    }

    if (set.queueStatus !== undefined || set.queueItemId !== undefined) {
      changed = true;
      return { ...set, pending: false, queueItemId: undefined, queueStatus: undefined };
    }

    return set;
  });

  return changed ? next : sets;
}

/** Applies `reconcileSnapshotQueueStatuses` to every exercise in the snapshot map; returns the same map when nothing changed. */
export function reconcileSnapshotMapQueueStatuses<T extends QueueAwareSnapshotSet>(
  snapshots: Record<string, T[]>,
  queued: SetLogQueueItem[],
): Record<string, T[]> {
  let next: Record<string, T[]> | null = null;
  for (const [sessionExerciseId, sets] of Object.entries(snapshots)) {
    const reconciled = reconcileSnapshotQueueStatuses(sets, queued);
    if (reconciled !== sets) {
      next = next ?? { ...snapshots };
      next[sessionExerciseId] = reconciled;
    }
  }
  return next ?? snapshots;
}

/**
 * Only one set-log sync engine may run per session view. While a row is expanded its SetLoggerCard owns the
 * engine (the card is unmounted when collapsed); when no logger card is mounted the session-level worker
 * takes over so a set queued from a collapsed row (or left queued by a row that was just collapsed) still
 * replays after reconnect.
 */
export function shouldRunSessionSetLogSync(args: {
  selectedExerciseId: string | null;
  exerciseIds: readonly string[];
}) {
  return args.selectedExerciseId === null || !args.exerciseIds.includes(args.selectedExerciseId);
}
