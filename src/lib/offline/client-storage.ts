const TODAY_CACHE_LOCALSTORAGE_PREFIX = "fawxzzy:fitness:today-cache:v1:";
const SESSION_DRAFT_LOCALSTORAGE_PREFIX = "fawxzzy:fitness:session-draft:v1:";
const ACTIVE_SESSION_HINT_KEY = "today:active-session";
const LEGACY_TODAY_CACHE_KEY = "offline:today-cache";
const LEGACY_SESSION_DRAFT_PREFIX = "session-sets:";
const OFFLINE_DB_NAME = "fawxzzy-fitness-offline";

export const OFFLINE_SNAPSHOT_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

function isBrowser() {
  return typeof window !== "undefined";
}

export function buildTodayCacheStorageKey(userId: string) {
  return `${TODAY_CACHE_LOCALSTORAGE_PREFIX}${userId}`;
}

export function buildTodayCacheDbKey(userId: string) {
  return `today:${userId}`;
}

export function buildSessionDraftStorageKey(userId: string, sessionId: string, sessionExerciseId: string) {
  return `${SESSION_DRAFT_LOCALSTORAGE_PREFIX}${userId}:${sessionId}:${sessionExerciseId}`;
}

export function isOfflineSnapshotStale(updatedAt: number | string | null | undefined, maxAgeMs = OFFLINE_SNAPSHOT_MAX_AGE_MS) {
  const updatedAtMs = typeof updatedAt === "number"
    ? updatedAt
    : typeof updatedAt === "string"
      ? Date.parse(updatedAt)
      : Number.NaN;

  if (!Number.isFinite(updatedAtMs)) {
    return true;
  }

  return Date.now() - updatedAtMs > maxAgeMs;
}

export function pruneStaleSessionDrafts(maxAgeMs = OFFLINE_SNAPSHOT_MAX_AGE_MS) {
  if (!isBrowser()) {
    return;
  }

  const keysToDelete: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || !key.startsWith(SESSION_DRAFT_LOCALSTORAGE_PREFIX)) {
      continue;
    }

    const raw = window.localStorage.getItem(key);
    if (!raw) {
      keysToDelete.push(key);
      continue;
    }

    try {
      const parsed = JSON.parse(raw) as { updatedAt?: number | string };
      if (isOfflineSnapshotStale(parsed.updatedAt, maxAgeMs)) {
        keysToDelete.push(key);
      }
    } catch {
      keysToDelete.push(key);
    }
  }

  for (const key of keysToDelete) {
    window.localStorage.removeItem(key);
  }
}

export function clearPersistedWorkoutClientState() {
  if (!isBrowser()) {
    return;
  }

  const keysToDelete: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key) {
      continue;
    }

    if (
      key === ACTIVE_SESSION_HINT_KEY
      || key === LEGACY_TODAY_CACHE_KEY
      || key.startsWith(TODAY_CACHE_LOCALSTORAGE_PREFIX)
      || key.startsWith(SESSION_DRAFT_LOCALSTORAGE_PREFIX)
      || key.startsWith(LEGACY_SESSION_DRAFT_PREFIX)
    ) {
      keysToDelete.push(key);
    }
  }

  for (const key of keysToDelete) {
    window.localStorage.removeItem(key);
  }

  try {
    window.indexedDB.deleteDatabase(OFFLINE_DB_NAME);
  } catch {
    // Ignore storage cleanup failures during sign-out.
  }
}
