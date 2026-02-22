export const TODAY_CACHE_SCHEMA_VERSION = 1;
const TODAY_CACHE_DB_NAME = "fawxzzy-fitness-offline";
const TODAY_CACHE_STORE_NAME = "today-cache";
const TODAY_CACHE_KEY = "today";
const TODAY_CACHE_LOCALSTORAGE_KEY = "offline:today-cache";

export type CachedTodayRoutineSummary = {
  id: string;
  name: string;
  dayIndex: number;
  dayName: string;
  isRest: boolean;
};

export type CachedTodayExercise = {
  id: string;
  name: string;
  targets: string | null;
  notes: string | null;
};

export type CachedTodayHints = {
  inProgressSessionId: string | null;
  completedTodayCount: number;
  recentExerciseIds: string[];
};

export type TodayCacheSnapshot = {
  schemaVersion: number;
  capturedAt: string;
  routine: CachedTodayRoutineSummary;
  exercises: CachedTodayExercise[];
  hints: CachedTodayHints;
};

function isBrowser() {
  return typeof window !== "undefined";
}

function supportsIndexedDb() {
  return isBrowser() && typeof window.indexedDB !== "undefined";
}

function openTodayCacheDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(TODAY_CACHE_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(TODAY_CACHE_STORE_NAME)) {
        db.createObjectStore(TODAY_CACHE_STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Unable to open today cache database."));
    };
  });
}

async function writeIndexedDb(snapshot: TodayCacheSnapshot): Promise<void> {
  const db = await openTodayCacheDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(TODAY_CACHE_STORE_NAME, "readwrite");
    transaction.objectStore(TODAY_CACHE_STORE_NAME).put(snapshot, TODAY_CACHE_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Unable to write today cache."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Today cache write aborted."));
  });
  db.close();
}

async function readIndexedDb(): Promise<TodayCacheSnapshot | null> {
  const db = await openTodayCacheDb();
  const result = await new Promise<TodayCacheSnapshot | null>((resolve, reject) => {
    const transaction = db.transaction(TODAY_CACHE_STORE_NAME, "readonly");
    const request = transaction.objectStore(TODAY_CACHE_STORE_NAME).get(TODAY_CACHE_KEY);

    request.onsuccess = () => {
      resolve((request.result as TodayCacheSnapshot | undefined) ?? null);
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Unable to read today cache."));
    };
  });
  db.close();
  return result;
}

function writeLocalStorage(snapshot: TodayCacheSnapshot) {
  window.localStorage.setItem(TODAY_CACHE_LOCALSTORAGE_KEY, JSON.stringify(snapshot));
}

function readLocalStorage(): TodayCacheSnapshot | null {
  const raw = window.localStorage.getItem(TODAY_CACHE_LOCALSTORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as TodayCacheSnapshot;
  } catch {
    return null;
  }
}

function isSnapshotCompatible(snapshot: TodayCacheSnapshot | null): snapshot is TodayCacheSnapshot {
  return Boolean(snapshot && snapshot.schemaVersion === TODAY_CACHE_SCHEMA_VERSION && snapshot.routine?.id);
}

export async function writeTodayCache(snapshot: TodayCacheSnapshot): Promise<void> {
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

export async function readTodayCache(): Promise<TodayCacheSnapshot | null> {
  if (!isBrowser()) {
    return null;
  }

  if (supportsIndexedDb()) {
    try {
      const snapshot = await readIndexedDb();
      if (isSnapshotCompatible(snapshot)) {
        return snapshot;
      }
    } catch {
      // Continue to localStorage fallback.
    }
  }

  try {
    const snapshot = readLocalStorage();
    return isSnapshotCompatible(snapshot) ? snapshot : null;
  } catch {
    return null;
  }
}
