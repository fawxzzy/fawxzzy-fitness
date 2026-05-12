const APP_LAUNCH_RECOVERY_MAX_AGE_MS = 5 * 60 * 1000;

export const APP_LAUNCH_RECOVERY_STORAGE_KEY = "fawxzzy:fitness:app-launch:recovery";
export const APP_LAUNCH_RECOVERY_QUERY_PARAM = "app-launch-recovery";

type StorageLike = Pick<Storage, "getItem" | "removeItem" | "setItem">;

export type StoredAppLaunchRecoveryState = {
  buildId: string;
  targetHref: string;
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

export function serializeStoredAppLaunchRecoveryState(state: StoredAppLaunchRecoveryState) {
  return JSON.stringify(state);
}

export function parseStoredAppLaunchRecoveryState(
  rawValue: string | null,
  now = Date.now(),
): StoredAppLaunchRecoveryState | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!isRecord(parsed) || typeof parsed.buildId !== "string" || typeof parsed.targetHref !== "string") {
      return null;
    }

    const updatedAt = parseFiniteNumber(parsed.updatedAt);
    if (updatedAt === null) {
      return null;
    }

    if (now - updatedAt > APP_LAUNCH_RECOVERY_MAX_AGE_MS) {
      return null;
    }

    return {
      buildId: parsed.buildId,
      targetHref: parsed.targetHref,
      updatedAt,
    };
  } catch {
    return null;
  }
}

export function shouldAttemptAppLaunchRecovery(
  storage: StorageLike | null | undefined,
  buildId: string,
  targetHref: string,
  now = Date.now(),
) {
  const resolvedStorage = getStorage(storage);
  if (!resolvedStorage) {
    return true;
  }

  try {
    const previousAttempt = parseStoredAppLaunchRecoveryState(
      resolvedStorage.getItem(APP_LAUNCH_RECOVERY_STORAGE_KEY),
      now,
    );

    return !previousAttempt
      || previousAttempt.buildId !== buildId
      || previousAttempt.targetHref !== targetHref;
  } catch {
    return true;
  }
}

export function markAppLaunchRecoveryAttempt(
  storage: StorageLike | null | undefined,
  state: StoredAppLaunchRecoveryState,
) {
  const resolvedStorage = getStorage(storage);
  if (!resolvedStorage) {
    return;
  }

  try {
    resolvedStorage.setItem(
      APP_LAUNCH_RECOVERY_STORAGE_KEY,
      serializeStoredAppLaunchRecoveryState(state),
    );
  } catch {
    // Ignore storage failures and continue with the recovery path.
  }
}

export function clearAppLaunchRecoveryAttempt(storage?: StorageLike | null) {
  const resolvedStorage = getStorage(storage);
  if (!resolvedStorage) {
    return;
  }

  try {
    resolvedStorage.removeItem(APP_LAUNCH_RECOVERY_STORAGE_KEY);
  } catch {
    // Ignore storage failures and continue with the app launch path.
  }
}

export function buildAppLaunchRecoveryHref(
  currentHref: string,
  buildId: string,
  targetHref: string,
) {
  const url = new URL(currentHref);
  url.searchParams.set(APP_LAUNCH_RECOVERY_QUERY_PARAM, "1");
  url.searchParams.set("app-build", buildId);
  url.searchParams.set("app-target", targetHref);
  url.searchParams.set("app-reload", String(Date.now()));
  return url.toString();
}
