import type { SetRow } from "@/types/db";
import type { SetLogQueueItem, SetLogQueueStatus } from "@/lib/offline/set-log-queue";

export type StableSetLike = {
  id: string;
  client_log_id?: string | null;
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
