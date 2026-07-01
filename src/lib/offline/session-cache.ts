import type { FitnessDistanceUnit } from "@/lib/fitness-distance-units";
import type { HeaderInfoRailItem } from "@/lib/header-info-rail";
import {
  buildTodayCacheDbKey,
  isOfflineSnapshotStale,
} from "@/lib/offline/client-storage";

export const SESSION_CACHE_SCHEMA_VERSION = 1;
const SESSION_CACHE_DB_NAME = "fawxzzy-fitness-offline";
const SESSION_CACHE_STORE_NAME = "session-cache";
const SESSION_CACHE_LOCALSTORAGE_PREFIX = "fawxzzy:fitness:session-cache:v1:";

export type CachedSessionExercise = {
  id: string;
  exerciseId?: string;
  name: string;
  targets: string | null;
  primary_muscle?: string | null;
  equipment?: string | null;
  movement_pattern?: string | null;
  measurement_type?: "reps" | "time" | "distance" | "time_distance" | "none" | null;
  image_path?: string | null;
  image_icon_path?: string | null;
  image_howto_path?: string | null;
  slug?: string | null;
  loggedSetCount?: number;
  isSkipped?: boolean;
  targetSetsMin?: number | null;
  targetSetsMax?: number | null;
  progressionStateLabel?: string | null;
  defaultUnit?: FitnessDistanceUnit | null;
};

export type SessionCacheSnapshot = {
  schemaVersion: number;
  userId: string;
  sessionId: string;
  capturedAt: string;
  routineName: string;
  sessionDayName: string;
  headerInfoItems: HeaderInfoRailItem[];
  exercises: CachedSessionExercise[];
};

function isBrowser() {
  return typeof window !== "undefined";
}

function supportsIndexedDb() {
  return isBrowser() && typeof window.indexedDB !== "undefined";
}

function buildSessionCacheStorageKey(userId: string, sessionId: string) {
  return `${SESSION_CACHE_LOCALSTORAGE_PREFIX}${userId}:${sessionId}`;
}

function buildSessionCacheDbKey(userId: string, sessionId: string) {
  return buildTodayCacheDbKey(`${userId}:session:${sessionId}`);
}

function openSessionCacheDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(SESSION_CACHE_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SESSION_CACHE_STORE_NAME)) {
        db.createObjectStore(SESSION_CACHE_STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open session cache database."));
  });
}

async function writeIndexedDb(snapshot: SessionCacheSnapshot): Promise<void> {
  const db = await openSessionCacheDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(SESSION_CACHE_STORE_NAME, "readwrite");
    transaction.objectStore(SESSION_CACHE_STORE_NAME).put(snapshot, buildSessionCacheDbKey(snapshot.userId, snapshot.sessionId));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Unable to write session cache."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Session cache write aborted."));
  });
  db.close();
}

async function readIndexedDb(userId: string, sessionId: string): Promise<SessionCacheSnapshot | null> {
  const db = await openSessionCacheDb();
  const result = await new Promise<SessionCacheSnapshot | null>((resolve, reject) => {
    const transaction = db.transaction(SESSION_CACHE_STORE_NAME, "readonly");
    const request = transaction.objectStore(SESSION_CACHE_STORE_NAME).get(buildSessionCacheDbKey(userId, sessionId));

    request.onsuccess = () => resolve((request.result as SessionCacheSnapshot | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Unable to read session cache."));
  });
  db.close();
  return result;
}

function writeLocalStorage(snapshot: SessionCacheSnapshot) {
  window.localStorage.setItem(buildSessionCacheStorageKey(snapshot.userId, snapshot.sessionId), JSON.stringify(snapshot));
}

function readLocalStorage(userId: string, sessionId: string): SessionCacheSnapshot | null {
  const raw = window.localStorage.getItem(buildSessionCacheStorageKey(userId, sessionId));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SessionCacheSnapshot;
  } catch {
    return null;
  }
}

function isSnapshotCompatible(snapshot: SessionCacheSnapshot | null): snapshot is SessionCacheSnapshot {
  return Boolean(
    snapshot
    && snapshot.schemaVersion === SESSION_CACHE_SCHEMA_VERSION
    && snapshot.userId
    && snapshot.sessionId
    && snapshot.routineName
    && snapshot.sessionDayName
    && Array.isArray(snapshot.exercises)
    && !isOfflineSnapshotStale(snapshot.capturedAt),
  );
}

export async function writeSessionCache(snapshot: SessionCacheSnapshot): Promise<void> {
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

export async function readSessionCache(userId: string, sessionId: string): Promise<SessionCacheSnapshot | null> {
  if (!isBrowser()) {
    return null;
  }

  if (supportsIndexedDb()) {
    try {
      const snapshot = await readIndexedDb(userId, sessionId);
      if (isSnapshotCompatible(snapshot)) {
        return snapshot;
      }
    } catch {
      // Continue to localStorage fallback.
    }
  }

  try {
    const snapshot = readLocalStorage(userId, sessionId);
    return isSnapshotCompatible(snapshot) ? snapshot : null;
  } catch {
    return null;
  }
}
