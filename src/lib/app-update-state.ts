const APP_UPDATE_RELOAD_STATE_MAX_AGE_MS = 5 * 60 * 1000;

export const APP_UPDATE_RELOAD_STATE_KEY = "fawxzzy:fitness:app-update:reload-state";
export const APP_UPDATE_NOTICE_KEY = "fawxzzy:fitness:app-update:notice";
export const APP_UPDATE_STATUS_EVENT = "fawxzzy:fitness:app-update-status";
export const APP_UPDATE_STATUS_WINDOW_KEY = "__FAWXZZY_APP_UPDATE_STATUS__";

export type StoredAppUpdateReloadState = {
  href: string;
  scrollX: number;
  scrollY: number;
  targetBuildId: string | null;
  updatedAt: number;
};

export type AppUpdatePhase = "idle" | "checking" | "update-queued" | "applying-update" | "error";

export type AppUpdateStatus = {
  currentBuildId: string;
  phase: AppUpdatePhase;
  remoteBuildId: string | null;
  route: string | null;
  serviceWorkerControlled: boolean | null;
  updatedAt: number;
};

type ParsedRecord = Record<string, unknown>;

declare global {
  interface Window {
    __FAWXZZY_APP_UPDATE_STATUS__?: AppUpdateStatus;
  }
}

function isRecord(value: unknown): value is ParsedRecord {
  return typeof value === "object" && value !== null;
}

function parseFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function parseStoredAppUpdateReloadState(
  rawValue: string | null,
  now = Date.now(),
): StoredAppUpdateReloadState | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!isRecord(parsed) || typeof parsed.href !== "string") {
      return null;
    }

    const scrollX = parseFiniteNumber(parsed.scrollX);
    const scrollY = parseFiniteNumber(parsed.scrollY);
    const updatedAt = parseFiniteNumber(parsed.updatedAt);
    const targetBuildId = typeof parsed.targetBuildId === "string" ? parsed.targetBuildId : null;

    if (scrollX === null || scrollY === null || updatedAt === null) {
      return null;
    }

    if (now - updatedAt > APP_UPDATE_RELOAD_STATE_MAX_AGE_MS) {
      return null;
    }

    return {
      href: parsed.href,
      scrollX,
      scrollY,
      targetBuildId,
      updatedAt,
    };
  } catch {
    return null;
  }
}

export function serializeStoredAppUpdateReloadState(
  state: StoredAppUpdateReloadState,
) {
  return JSON.stringify(state);
}

export function shouldRestoreReloadState(
  storedHref: string,
  currentHref: string,
) {
  try {
    const storedUrl = new URL(storedHref);
    const currentUrl = new URL(currentHref);

    return storedUrl.pathname === currentUrl.pathname
      && storedUrl.search === currentUrl.search
      && storedUrl.hash === currentUrl.hash;
  } catch {
    return false;
  }
}

export function shouldShowAppUpdateNotice(
  rawValue: string | null,
  currentBuildId: string,
) {
  if (!rawValue) {
    return false;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!isRecord(parsed)) {
      return false;
    }

    return parsed.targetBuildId === currentBuildId;
  } catch {
    return false;
  }
}

export function publishAppUpdateStatus(status: AppUpdateStatus) {
  if (typeof window === "undefined") {
    return status;
  }

  window[APP_UPDATE_STATUS_WINDOW_KEY] = status;
  window.dispatchEvent(new CustomEvent<AppUpdateStatus>(APP_UPDATE_STATUS_EVENT, {
    detail: status,
  }));
  return status;
}

export function readPublishedAppUpdateStatus() {
  if (typeof window === "undefined") {
    return null;
  }

  return window[APP_UPDATE_STATUS_WINDOW_KEY] ?? null;
}
