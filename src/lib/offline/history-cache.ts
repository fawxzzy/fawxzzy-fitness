import type { SessionSummary } from "@/app/history/session-summary";
import type { HistoryScopeSummary } from "@/lib/history-scope-summary";
import type { WeeklyProgressSummary } from "@/lib/history-weekly-progress";
import {
  buildTodayCacheDbKey,
  isOfflineSnapshotStale,
} from "@/lib/offline/client-storage";

export const HISTORY_CACHE_SCHEMA_VERSION = 1;
const HISTORY_CACHE_DB_NAME = "fawxzzy-fitness-offline";
const HISTORY_CACHE_STORE_NAME = "history-cache";
const HISTORY_CACHE_LOCALSTORAGE_PREFIX = "fawxzzy:fitness:history-cache:v1:";

export type HistoryCacheSnapshot = {
  schemaVersion: number;
  userId: string;
  capturedAt: string;
  sessionItems: SessionSummary[];
  activeRoutineTitle: string | null;
  scopeSummary: HistoryScopeSummary;
  weeklyProgress: WeeklyProgressSummary;
  weeklyProgressByWeek: WeeklyProgressSummary[];
};

function isBrowser() {
  return typeof window !== "undefined";
}

function supportsIndexedDb() {
  return isBrowser() && typeof window.indexedDB !== "undefined";
}

function buildHistoryCacheStorageKey(userId: string) {
  return `${HISTORY_CACHE_LOCALSTORAGE_PREFIX}${userId}`;
}

function buildHistoryCacheDbKey(userId: string) {
  return buildTodayCacheDbKey(`${userId}:history`);
}

function openHistoryCacheDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(HISTORY_CACHE_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(HISTORY_CACHE_STORE_NAME)) {
        db.createObjectStore(HISTORY_CACHE_STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open history cache database."));
  });
}

async function writeIndexedDb(snapshot: HistoryCacheSnapshot): Promise<void> {
  const db = await openHistoryCacheDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(HISTORY_CACHE_STORE_NAME, "readwrite");
    transaction.objectStore(HISTORY_CACHE_STORE_NAME).put(snapshot, buildHistoryCacheDbKey(snapshot.userId));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Unable to write history cache."));
    transaction.onabort = () => reject(transaction.error ?? new Error("History cache write aborted."));
  });
  db.close();
}

async function readIndexedDb(userId: string): Promise<HistoryCacheSnapshot | null> {
  const db = await openHistoryCacheDb();
  const result = await new Promise<HistoryCacheSnapshot | null>((resolve, reject) => {
    const transaction = db.transaction(HISTORY_CACHE_STORE_NAME, "readonly");
    const request = transaction.objectStore(HISTORY_CACHE_STORE_NAME).get(buildHistoryCacheDbKey(userId));

    request.onsuccess = () => resolve((request.result as HistoryCacheSnapshot | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Unable to read history cache."));
  });
  db.close();
  return result;
}

function writeLocalStorage(snapshot: HistoryCacheSnapshot) {
  window.localStorage.setItem(buildHistoryCacheStorageKey(snapshot.userId), JSON.stringify(snapshot));
}

function readLocalStorage(userId: string): HistoryCacheSnapshot | null {
  const raw = window.localStorage.getItem(buildHistoryCacheStorageKey(userId));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as HistoryCacheSnapshot;
  } catch {
    return null;
  }
}

function isSnapshotCompatible(snapshot: HistoryCacheSnapshot | null): snapshot is HistoryCacheSnapshot {
  return Boolean(
    snapshot
    && snapshot.schemaVersion === HISTORY_CACHE_SCHEMA_VERSION
    && snapshot.userId
    && Array.isArray(snapshot.sessionItems)
    && snapshot.scopeSummary
    && snapshot.weeklyProgress
    && Array.isArray(snapshot.weeklyProgressByWeek)
    && !isOfflineSnapshotStale(snapshot.capturedAt),
  );
}

export async function writeHistoryCache(snapshot: HistoryCacheSnapshot): Promise<void> {
  if (!isBrowser()) {
    return;
  }

  if (supportsIndexedDb()) {
    try {
      await writeIndexedDb(snapshot);
      return;
    } catch {
      // Fallback to localStorage.
    }
  }

  try {
    writeLocalStorage(snapshot);
  } catch {
    // Ignore storage failures to avoid UI regressions.
  }
}

export async function readHistoryCache(userId: string): Promise<HistoryCacheSnapshot | null> {
  if (!isBrowser()) {
    return null;
  }

  if (supportsIndexedDb()) {
    try {
      const snapshot = await readIndexedDb(userId);
      if (isSnapshotCompatible(snapshot)) {
        return snapshot;
      }
    } catch {
      // Continue to localStorage fallback.
    }
  }

  try {
    const snapshot = readLocalStorage(userId);
    return isSnapshotCompatible(snapshot) ? snapshot : null;
  } catch {
    return null;
  }
}
