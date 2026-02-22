export const SET_LOG_QUEUE_SCHEMA_VERSION = 1;

const OFFLINE_DB_NAME = "fawxzzy-fitness-offline";
const OFFLINE_DB_VERSION = 2;
const SET_LOG_QUEUE_STORE = "set-log-queue";

export type OfflineSetPayload = {
  weight: number;
  reps: number;
  durationSeconds: number | null;
  rpe: number | null;
  isWarmup: boolean;
  notes: string | null;
};

export type SetLogQueueStatus = "queued" | "syncing" | "failed" | "synced";

export type SetLogQueueItem = {
  id: string;
  dedupeKey: string;
  schemaVersion: number;
  sessionId: string;
  sessionExerciseId: string;
  payload: OfflineSetPayload;
  createdAt: string;
  retryCount: number;
  status: SetLogQueueStatus;
  serverSetId?: string;
};

function canUseIndexedDb() {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("today-cache")) {
        db.createObjectStore("today-cache");
      }

      const store = db.objectStoreNames.contains(SET_LOG_QUEUE_STORE)
        ? request.transaction?.objectStore(SET_LOG_QUEUE_STORE)
        : db.createObjectStore(SET_LOG_QUEUE_STORE, { keyPath: "id" });

      if (store && !store.indexNames.contains("bySessionExerciseId")) {
        store.createIndex("bySessionExerciseId", "sessionExerciseId", { unique: false });
      }
      if (store && !store.indexNames.contains("byDedupeKey")) {
        store.createIndex("byDedupeKey", "dedupeKey", { unique: true });
      }
      if (store && !store.indexNames.contains("byCreatedAt")) {
        store.createIndex("byCreatedAt", "createdAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open offline database."));
  });
}

function buildDedupeKey(item: Omit<SetLogQueueItem, "dedupeKey">): string {
  return [
    item.sessionExerciseId,
    item.payload.weight,
    item.payload.reps,
    item.payload.durationSeconds ?? "",
    item.payload.rpe ?? "",
    item.payload.isWarmup ? "1" : "0",
    item.payload.notes ?? "",
    item.createdAt,
  ].join("|");
}

export async function enqueueSetLog(input: {
  sessionId: string;
  sessionExerciseId: string;
  payload: OfflineSetPayload;
}): Promise<SetLogQueueItem | null> {
  if (!canUseIndexedDb()) {
    return null;
  }

  const now = new Date().toISOString();
  const baseItem: Omit<SetLogQueueItem, "dedupeKey"> = {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `queued-${Date.now()}`,
    schemaVersion: SET_LOG_QUEUE_SCHEMA_VERSION,
    sessionId: input.sessionId,
    sessionExerciseId: input.sessionExerciseId,
    payload: input.payload,
    createdAt: now,
    retryCount: 0,
    status: "queued",
  };

  const item: SetLogQueueItem = {
    ...baseItem,
    dedupeKey: buildDedupeKey(baseItem),
  };

  const db = await openOfflineDb();
  try {
    return await new Promise<SetLogQueueItem>((resolve, reject) => {
      const tx = db.transaction(SET_LOG_QUEUE_STORE, "readwrite");
      const store = tx.objectStore(SET_LOG_QUEUE_STORE);
      const index = store.index("byDedupeKey");
      const existingRequest = index.get(item.dedupeKey);

      existingRequest.onsuccess = () => {
        const existing = existingRequest.result as SetLogQueueItem | undefined;
        if (existing) {
          resolve(existing);
          return;
        }
        store.put(item);
      };

      existingRequest.onerror = () => {
        reject(existingRequest.error ?? new Error("Unable to read dedupe index."));
      };

      tx.oncomplete = () => resolve(item);
      tx.onerror = () => reject(tx.error ?? new Error("Unable to enqueue set log."));
      tx.onabort = () => reject(tx.error ?? new Error("Set log queue transaction aborted."));
    });
  } finally {
    db.close();
  }
}

export async function readQueuedSetLogsBySessionExerciseId(sessionExerciseId: string): Promise<SetLogQueueItem[]> {
  if (!canUseIndexedDb()) {
    return [];
  }

  const db = await openOfflineDb();
  try {
    const items = await new Promise<SetLogQueueItem[]>((resolve, reject) => {
      const tx = db.transaction(SET_LOG_QUEUE_STORE, "readonly");
      const index = tx.objectStore(SET_LOG_QUEUE_STORE).index("bySessionExerciseId");
      const request = index.getAll(sessionExerciseId);

      request.onsuccess = () => {
        resolve((request.result as SetLogQueueItem[] | undefined) ?? []);
      };
      request.onerror = () => reject(request.error ?? new Error("Unable to read queued set logs."));
    });

    return items
      .filter((item) => item.schemaVersion === SET_LOG_QUEUE_SCHEMA_VERSION)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } finally {
    db.close();
  }
}
