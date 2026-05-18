const ROUTE_LOADING_RECOVERY_MAX_AGE_MS = 5 * 60 * 1000;

export const ROUTE_LOADING_RECOVERY_STORAGE_KEY = "fawxzzy:fitness:route-loading:recovery";
export const ROUTE_LOADING_RECOVERY_QUERY_PARAM = "route-loading-recovery";
export const ROUTE_LOADING_RECOVERY_RELOAD_QUERY_PARAM = "route-loading-reload";
export const ROUTE_LOADING_RECOVERY_TIMEOUT_MS = 15_000;

type StorageLike = Pick<Storage, "getItem" | "removeItem" | "setItem">;

export type StoredRouteLoadingRecoveryState = {
  attemptCount: number;
  buildId: string;
  routeKey: string;
  updatedAt: number;
};

type ParsedRecord = Record<string, unknown>;

function isRecord(value: unknown): value is ParsedRecord {
  return typeof value === "object" && value !== null;
}

function parseFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getStorage(storage?: StorageLike | null) {
  if (storage) {
    return storage;
  }

  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage;
}

export function normalizeRouteLoadingRecoveryRouteKey(currentHref: string) {
  const url = new URL(currentHref, "https://fawxzzy.local");
  url.searchParams.delete(ROUTE_LOADING_RECOVERY_QUERY_PARAM);
  url.searchParams.delete(ROUTE_LOADING_RECOVERY_RELOAD_QUERY_PARAM);
  return `${url.pathname}${url.search}`;
}

export function serializeStoredRouteLoadingRecoveryState(state: StoredRouteLoadingRecoveryState) {
  return JSON.stringify(state);
}

export function parseStoredRouteLoadingRecoveryState(
  rawValue: string | null,
  now = Date.now(),
): StoredRouteLoadingRecoveryState | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (
      !isRecord(parsed)
      || typeof parsed.buildId !== "string"
      || typeof parsed.routeKey !== "string"
    ) {
      return null;
    }

    const attemptCount = parseFiniteNumber(parsed.attemptCount);
    const updatedAt = parseFiniteNumber(parsed.updatedAt);
    if (attemptCount === null || updatedAt === null || attemptCount < 0) {
      return null;
    }

    if (now - updatedAt > ROUTE_LOADING_RECOVERY_MAX_AGE_MS) {
      return null;
    }

    return {
      attemptCount,
      buildId: parsed.buildId,
      routeKey: parsed.routeKey,
      updatedAt,
    };
  } catch {
    return null;
  }
}

export function readRouteLoadingRecoveryAttempt(
  storage: StorageLike | null | undefined,
  buildId: string,
  routeKey: string,
  now = Date.now(),
) {
  const resolvedStorage = getStorage(storage);
  if (!resolvedStorage) {
    return null;
  }

  try {
    const state = parseStoredRouteLoadingRecoveryState(
      resolvedStorage.getItem(ROUTE_LOADING_RECOVERY_STORAGE_KEY),
      now,
    );

    if (!state) {
      return null;
    }

    if (state.buildId !== buildId || state.routeKey !== routeKey) {
      return null;
    }

    return state;
  } catch {
    return null;
  }
}

export function markRouteLoadingRecoveryAttempt(
  storage: StorageLike | null | undefined,
  state: StoredRouteLoadingRecoveryState,
) {
  const resolvedStorage = getStorage(storage);
  if (!resolvedStorage) {
    return;
  }

  try {
    resolvedStorage.setItem(
      ROUTE_LOADING_RECOVERY_STORAGE_KEY,
      serializeStoredRouteLoadingRecoveryState(state),
    );
  } catch {
    // Ignore storage failures and continue with the route-loading fallback.
  }
}

export function clearRouteLoadingRecoveryAttempt(storage?: StorageLike | null) {
  const resolvedStorage = getStorage(storage);
  if (!resolvedStorage) {
    return;
  }

  try {
    resolvedStorage.removeItem(ROUTE_LOADING_RECOVERY_STORAGE_KEY);
  } catch {
    // Ignore storage failures and continue with route rendering.
  }
}

export function buildRouteLoadingRecoveryHref(currentHref: string) {
  const url = new URL(currentHref);
  url.searchParams.set(ROUTE_LOADING_RECOVERY_QUERY_PARAM, "1");
  url.searchParams.set(ROUTE_LOADING_RECOVERY_RELOAD_QUERY_PARAM, String(Date.now()));
  return url.toString();
}
