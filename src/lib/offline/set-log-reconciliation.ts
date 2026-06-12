import type { SetRow } from "@/types/db";
import type { SetLogQueueItem, SetLogQueueStatus } from "@/lib/offline/set-log-queue";

export type StableSetLike = {
  id: string;
  client_log_id?: string | null;
};

export type ComparableSetLike = StableSetLike & Pick<
  SetRow,
  | "session_exercise_id"
  | "user_id"
  | "set_index"
  | "weight"
  | "reps"
  | "is_warmup"
  | "notes"
  | "duration_seconds"
  | "distance"
  | "distance_unit"
  | "calories"
  | "rpe"
  | "weight_unit"
> & {
  stableId?: string;
  queueItemId?: string;
  pending?: boolean;
  queueStatus?: SetLogQueueStatus;
};

export type RestorableQueueSet = {
  stableId: string;
  queueItemId: string;
  sessionExerciseId: string;
  status: SetLogQueueStatus;
  createdAt: string;
  payload: SetLogQueueItem["payload"];
};

export function createStableSetId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `set-${Date.now()}`;
}

export function resolveStableSetId(set: StableSetLike) {
  return set.client_log_id?.trim() || set.id;
}

export function buildSetQueueDedupeKey(clientLogId: string) {
  return clientLogId.trim();
}

export function isQueueItemPendingSync(item: Pick<SetLogQueueItem, "status" | "syncedAt">) {
  return item.status === "queued" || item.status === "failed" || (item.status === "syncing" && !item.syncedAt);
}

export function toRestorableQueueSet(item: SetLogQueueItem): RestorableQueueSet | null {
  if (!isQueueItemPendingSync(item)) {
    return null;
  }

  return {
    stableId: item.clientLogId,
    queueItemId: item.id,
    sessionExerciseId: item.sessionExerciseId,
    status: item.status,
    createdAt: item.createdAt,
    payload: item.payload,
  };
}

export function mergeByStableSetId<T extends StableSetLike>(baseSets: T[], incomingSets: T[]) {
  const merged = new Map<string, T>();

  for (const set of baseSets) {
    merged.set(resolveStableSetId(set), set);
  }

  for (const set of incomingSets) {
    const stableId = resolveStableSetId(set);
    const current = merged.get(stableId);
    merged.set(stableId, current ? { ...current, ...set } : set);
  }

  return Array.from(merged.values());
}

export function mapStableSetIds(sets: Array<StableSetLike>) {
  return new Set(sets.map((set) => resolveStableSetId(set)));
}

export function hasMatchingStableSet(sets: Array<StableSetLike>, candidate: StableSetLike) {
  return mapStableSetIds(sets).has(resolveStableSetId(candidate));
}

export function sortSetsByIndex<T extends Pick<SetRow, "set_index">>(sets: T[]) {
  return [...sets].sort((left, right) => left.set_index - right.set_index);
}

export function areSetsEquivalent(left: ComparableSetLike, right: ComparableSetLike) {
  return (
    (left.stableId ?? resolveStableSetId(left)) === (right.stableId ?? resolveStableSetId(right))
    && left.id === right.id
    && left.client_log_id === right.client_log_id
    && left.session_exercise_id === right.session_exercise_id
    && left.user_id === right.user_id
    && left.set_index === right.set_index
    && left.weight === right.weight
    && left.reps === right.reps
    && left.is_warmup === right.is_warmup
    && left.notes === right.notes
    && left.duration_seconds === right.duration_seconds
    && left.distance === right.distance
    && left.distance_unit === right.distance_unit
    && left.calories === right.calories
    && left.rpe === right.rpe
    && left.weight_unit === right.weight_unit
    && left.queueItemId === right.queueItemId
    && left.pending === right.pending
    && left.queueStatus === right.queueStatus
  );
}

export function areSetListsEquivalent(left: ComparableSetLike[], right: ComparableSetLike[]) {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (!areSetsEquivalent(left[index], right[index])) {
      return false;
    }
  }

  return true;
}
