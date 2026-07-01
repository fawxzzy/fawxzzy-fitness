import {
  buildTodayCacheDbKey,
  isOfflineSnapshotStale,
} from "@/lib/offline/client-storage";
import type { RoutineBrowseCardItem } from "@/components/routines/RoutineBrowseCard";

export const ROUTINES_CACHE_SCHEMA_VERSION = 1;
const ROUTINES_CACHE_DB_NAME = "fawxzzy-fitness-offline";
const ROUTINES_CACHE_STORE_NAME = "routines-cache";
const ROUTINES_CACHE_LOCALSTORAGE_PREFIX = "fawxzzy:fitness:routines-cache:v1:";

export type RoutinesCacheSnapshot = {
  schemaVersion: number;
  userId: string;
  capturedAt: string;
  routines: RoutineBrowseCardItem[];
};

function isBrowser() {
  return typeof window !== "undefined";
}

function supportsIndexedDb() {
  return isBrowser() && typeof window.indexedDB !== "undefined";
}

function buildRoutinesCacheStorageKey(userId: string) {
  return `${ROUTINES_CACHE_LOCALSTORAGE_PREFIX}${userId}`;
}

function buildRoutinesCacheDbKey(userId: string) {
  return buildTodayCacheDbKey(`${userId}:routines`);
}

function openRoutinesCacheDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(ROUTINES_CACHE_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ROUTINES_CACHE_STORE_NAME)) {
        db.createObjectStore(ROUTINES_CACHE_STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open routines cache database."));
  });
}

async function writeIndexedDb(snapshot: RoutinesCacheSnapshot): Promise<void> {
  const db = await openRoutinesCacheDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(ROUTINES_CACHE_STORE_NAME, "readwrite");
    transaction.objectStore(ROUTINES_CACHE_STORE_NAME).put(snapshot, buildRoutinesCacheDbKey(snapshot.userId));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Unable to write routines cache."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Routines cache write aborted."));
  });
  db.close();
}

async function readIndexedDb(userId: string): Promise<RoutinesCacheSnapshot | null> {
  const db = await openRoutinesCacheDb();
  const result = await new Promise<RoutinesCacheSnapshot | null>((resolve, reject) => {
    const transaction = db.transaction(ROUTINES_CACHE_STORE_NAME, "readonly");
    const request = transaction.objectStore(ROUTINES_CACHE_STORE_NAME).get(buildRoutinesCacheDbKey(userId));

    request.onsuccess = () => resolve((request.result as RoutinesCacheSnapshot | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Unable to read routines cache."));
  });
  db.close();
  return result;
}

function writeLocalStorage(snapshot: RoutinesCacheSnapshot) {
  window.localStorage.setItem(buildRoutinesCacheStorageKey(snapshot.userId), JSON.stringify(snapshot));
}

function readLocalStorage(userId: string): RoutinesCacheSnapshot | null {
  const raw = window.localStorage.getItem(buildRoutinesCacheStorageKey(userId));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as RoutinesCacheSnapshot;
  } catch {
    return null;
  }
}

function isSnapshotCompatible(snapshot: RoutinesCacheSnapshot | null): snapshot is RoutinesCacheSnapshot {
  return Boolean(
    snapshot
    && snapshot.schemaVersion === ROUTINES_CACHE_SCHEMA_VERSION
    && snapshot.userId
    && Array.isArray(snapshot.routines)
    && !isOfflineSnapshotStale(snapshot.capturedAt),
  );
}

export async function writeRoutinesCache(snapshot: RoutinesCacheSnapshot): Promise<void> {
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

export async function readRoutinesCache(userId: string): Promise<RoutinesCacheSnapshot | null> {
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
