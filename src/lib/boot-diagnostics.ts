export type BootDiagnosticSource = "client" | "server";
export type BootDiagnosticDisplayMode = "browser" | "standalone" | "unknown";
export type BootDiagnosticTag =
  | "[boot.auth]"
  | "[boot.entry]"
  | "[boot.middleware]"
  | "[boot.service-worker]"
  | "[entry.boot.unexpected]";
export type BootDiagnosticAuthState =
  | "authenticated"
  | "auth-error"
  | "durable-session-cookie-written"
  | "has-access-cookie"
  | "has-refresh-cookie"
  | "missing-access-cookie-recovered"
  | "no-cookies"
  | "refreshed-from-refresh-cookie"
  | "redirected-login"
  | "refreshed"
  | null;

export type BootDiagnosticEvent = {
  authState?: BootDiagnosticAuthState;
  buildId?: string | null;
  displayMode?: BootDiagnosticDisplayMode;
  errorMessage?: string | null;
  errorName?: string | null;
  gateStage?: string | null;
  remoteBuildId?: string | null;
  route?: string | null;
  serviceWorkerControlled?: boolean | null;
  source: BootDiagnosticSource;
  stage: string;
  stageDurationMs?: number | null;
  tag: BootDiagnosticTag;
  targetHref?: string | null;
};

type BootDiagnosticLevel = "error" | "info" | "warn";
type StorageLike = Pick<Storage, "setItem">;

export const LAST_BOOT_DIAGNOSTIC_STORAGE_KEY = "fawxzzy:boot-diagnostic:last";

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const JWT_PATTERN = /\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+\b/g;
const LONG_TOKEN_PATTERN = /\b[a-zA-Z0-9_-]{24,}\b/g;

function sanitizeText(value: string | null | undefined, maxLength = 180) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed
    .replace(EMAIL_PATTERN, "[redacted-email]")
    .replace(UUID_PATTERN, "[redacted-id]")
    .replace(JWT_PATTERN, "[redacted-token]")
    .replace(LONG_TOKEN_PATTERN, (candidate) => (candidate.includes("[redacted-") ? candidate : "[redacted-token]"))
    .slice(0, maxLength);
}

function getDisplayModeFromWindow(targetWindow: Window) {
  try {
    if (targetWindow.matchMedia("(display-mode: standalone)").matches) {
      return "standalone" as const;
    }
  } catch {
    // Fall through to browser mode detection.
  }

  try {
    if ((targetWindow.navigator as Navigator & { standalone?: boolean }).standalone === true) {
      return "standalone" as const;
    }
  } catch {
    // Fall through to browser mode detection.
  }

  return "browser" as const;
}

function getSessionStorage(storage?: StorageLike | null) {
  if (storage) {
    return storage;
  }

  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage;
}

export function resolveBootDisplayMode() {
  if (typeof window === "undefined") {
    return "unknown" as const;
  }

  return getDisplayModeFromWindow(window);
}

export function sanitizeBootDiagnosticEvent(event: BootDiagnosticEvent) {
  return {
    tag: event.tag,
    source: event.source,
    route: sanitizeText(event.route ?? null, 96),
    stage: sanitizeText(event.stage, 96) ?? "unknown-stage",
    buildId: sanitizeText(event.buildId ?? "unknown-build", 96),
    displayMode: event.displayMode ?? (event.source === "client" ? resolveBootDisplayMode() : "unknown"),
    serviceWorkerControlled:
      typeof event.serviceWorkerControlled === "boolean"
        ? event.serviceWorkerControlled
        : null,
    authState: event.authState ?? null,
    errorName: sanitizeText(event.errorName ?? null, 48),
    errorMessage: sanitizeText(event.errorMessage ?? null),
    gateStage: sanitizeText(event.gateStage ?? null, 96),
    targetHref: sanitizeText(event.targetHref ?? null, 180),
    remoteBuildId: sanitizeText(event.remoteBuildId ?? null, 96),
    stageDurationMs:
      typeof event.stageDurationMs === "number" && Number.isFinite(event.stageDurationMs)
        ? event.stageDurationMs
        : null,
  };
}

export function serializeBootDiagnosticEvent(event: BootDiagnosticEvent) {
  return JSON.stringify(sanitizeBootDiagnosticEvent(event));
}

export function recordServerBootDiagnostic(event: BootDiagnosticEvent, level: BootDiagnosticLevel = "info") {
  const payload = sanitizeBootDiagnosticEvent(event);
  console[level](event.tag, payload);
  return payload;
}

export function recordClientBootDiagnostic(
  event: BootDiagnosticEvent,
  args?: { level?: BootDiagnosticLevel; storage?: StorageLike | null },
) {
  const payload = sanitizeBootDiagnosticEvent({
    ...event,
    displayMode: event.displayMode ?? resolveBootDisplayMode(),
    serviceWorkerControlled:
      typeof event.serviceWorkerControlled === "boolean"
        ? event.serviceWorkerControlled
        : typeof navigator !== "undefined" && "serviceWorker" in navigator
          ? Boolean(navigator.serviceWorker.controller)
          : null,
  });

  const level = args?.level ?? "info";
  console[level](event.tag, payload);

  try {
    getSessionStorage(args?.storage)?.setItem(LAST_BOOT_DIAGNOSTIC_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures and keep the app usable.
  }

  return payload;
}
