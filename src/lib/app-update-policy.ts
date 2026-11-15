// Silent update policy (Zac 2026-11-14): an update downloads in the background
// and takes effect only at a boundary the person did not choose to be in:
// the page is hidden, a cold launch, or a full navigation they started.
// A visible page is never reloaded, there is no overlay and no toast.
// An active session or unsaved input always waits, except that a client
// below the minimum build for more than 24h applies at the next hidden moment
// (its href, scroll, session id and form drafts are kept for the reload).

export const APP_UPDATE_STALE_REQUIRED_MS = 24 * 60 * 60 * 1000;
export const APP_UPDATE_COLD_LAUNCH_WINDOW_MS = 10_000;
export const APP_UPDATE_APPLY_RETRY_MS = 10 * 60 * 1000;
export const APP_UPDATE_REQUIRED_SINCE_KEY = "fawxzzy:fitness:app-update:required-since";
export const APP_UPDATE_LAST_APPLY_KEY = "fawxzzy:fitness:app-update:last-apply";

// Set to a build id to enforce only clients older than that build. `null` means
// every deployed build is the minimum: any client not on it must update.
export const APP_MIN_BUILD_ID_OVERRIDE: string | null = null;

export type AppUpdateBoundary = "visible" | "hidden" | "cold-launch" | "navigation";

export type AppUpdateDecisionInput = {
  boundary: AppUpdateBoundary;
  updatePending: boolean;
  activeSession: boolean;
  dirtyInput: boolean;
  belowMinBuild: boolean;
  requiredSinceMs: number | null;
  now: number;
};

export type AppUpdateDecisionReason =
  | "no-update"
  | "visible-page"
  | "active-session"
  | "dirty-input"
  | "boundary"
  | "stale-required-hidden";

export type AppUpdateDecision = {
  action: "apply" | "wait";
  reason: AppUpdateDecisionReason;
};

export type AppVersionManifest = {
  buildId?: string | null;
  minBuildId?: string | null;
};

export function resolveMinBuildId(serverBuildId: string, override: string | null = APP_MIN_BUILD_ID_OVERRIDE) {
  const trimmed = override?.trim();
  return trimmed ? trimmed : serverBuildId;
}

export function isStaleRequiredUpdate(input: Pick<AppUpdateDecisionInput, "belowMinBuild" | "requiredSinceMs" | "now">) {
  return input.belowMinBuild
    && input.requiredSinceMs !== null
    && input.now - input.requiredSinceMs >= APP_UPDATE_STALE_REQUIRED_MS;
}

export function decideAppUpdateApply(input: AppUpdateDecisionInput): AppUpdateDecision {
  if (!input.updatePending) {
    return { action: "wait", reason: "no-update" };
  }

  if (input.boundary === "visible") {
    return { action: "wait", reason: "visible-page" };
  }

  if (input.activeSession || input.dirtyInput) {
    if (input.boundary === "hidden" && isStaleRequiredUpdate(input)) {
      return { action: "apply", reason: "stale-required-hidden" };
    }

    return { action: "wait", reason: input.activeSession ? "active-session" : "dirty-input" };
  }

  return { action: "apply", reason: "boundary" };
}

export function isBelowMinBuild(currentBuildId: string, manifest: AppVersionManifest) {
  const remoteBuildId = manifest.buildId?.trim();
  if (!remoteBuildId || remoteBuildId === currentBuildId) {
    return false;
  }

  const minBuildId = manifest.minBuildId?.trim();
  if (!minBuildId) {
    return false;
  }

  return minBuildId !== currentBuildId;
}

export function isColdLaunchWindow(bootAt: number, now: number, hasInteracted: boolean) {
  return !hasInteracted && now - bootAt <= APP_UPDATE_COLD_LAUNCH_WINDOW_MS;
}

export function isActiveSessionRoute(pathname: string) {
  return pathname === "/session" || pathname.startsWith("/session/");
}

export type NavigationClickInput = {
  defaultPrevented: boolean;
  button: number;
  modifierKey: boolean;
  href: string | null;
  download: boolean;
  target: string | null;
  currentHref: string;
};

/**
 * The full-navigation target for a same-origin link click, or null to leave the click alone. Runs after every page
 * handler (bubble phase), so a click a handler cancelled is respected. next/link also cancels its click to route
 * client-side; those navigations are left to Next, which itself does a full page load when the server build differs.
 */
export function resolveUpdateNavigationTarget(input: NavigationClickInput): string | null {
  if (input.defaultPrevented || input.button !== 0 || input.modifierKey || input.download || !input.href) {
    return null;
  }

  if (input.target && input.target !== "_self") {
    return null;
  }

  let url: URL;
  let current: URL;
  try {
    current = new URL(input.currentHref);
    url = new URL(input.href, current);
  } catch {
    return null;
  }

  if (url.origin !== current.origin) {
    return null;
  }

  if (url.pathname === current.pathname && url.search === current.search) {
    return null;
  }

  return url.href;
}

type StoredRequiredSince = { buildId: string; since: number };

export function resolveRequiredSince(rawValue: string | null, currentBuildId: string, now: number): StoredRequiredSince {
  if (rawValue) {
    try {
      const parsed = JSON.parse(rawValue) as Partial<StoredRequiredSince> | null;
      if (
        parsed
        && parsed.buildId === currentBuildId
        && typeof parsed.since === "number"
        && Number.isFinite(parsed.since)
        && parsed.since <= now
      ) {
        return { buildId: currentBuildId, since: parsed.since };
      }
    } catch {
      // Fall through to a fresh record.
    }
  }

  return { buildId: currentBuildId, since: now };
}

type StoredApplyAttempt = { fromBuildId: string; targetBuildId: string | null; at: number };

// Guards against a reload loop when a reload keeps serving the old build.
export function shouldAttemptApply(rawValue: string | null, currentBuildId: string, targetBuildId: string | null, now: number) {
  if (!rawValue) {
    return true;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<StoredApplyAttempt> | null;
    if (
      !parsed
      || parsed.fromBuildId !== currentBuildId
      || (parsed.targetBuildId ?? null) !== targetBuildId
      || typeof parsed.at !== "number"
    ) {
      return true;
    }

    return now - parsed.at >= APP_UPDATE_APPLY_RETRY_MS;
  } catch {
    return true;
  }
}

export function serializeApplyAttempt(currentBuildId: string, targetBuildId: string | null, now: number) {
  return JSON.stringify({ fromBuildId: currentBuildId, targetBuildId, at: now } satisfies StoredApplyAttempt);
}

export type DraftFieldSnapshot = {
  tagName: string;
  type?: string | null;
  id?: string | null;
  name?: string | null;
  value: string;
  checked?: boolean;
  autocomplete?: string | null;
};

export type StoredFormDraft = {
  key: string;
  value: string;
  checked?: boolean;
};

const DRAFT_MAX_FIELDS = 40;
const DRAFT_MAX_VALUE_LENGTH = 2_000;
const DRAFT_EXCLUDED_TYPES = new Set(["password", "hidden", "file", "submit", "button", "reset", "image"]);

export function draftFieldKey(field: Pick<DraftFieldSnapshot, "id" | "name">) {
  if (field.id) {
    return `#${field.id}`;
  }

  if (field.name) {
    return `[name]${field.name}`;
  }

  return null;
}

// Never keeps passwords or one-time codes; keeps only fields with a stable key.
export function collectFormDrafts(fields: DraftFieldSnapshot[]): StoredFormDraft[] {
  const drafts: StoredFormDraft[] = [];

  for (const field of fields) {
    if (drafts.length >= DRAFT_MAX_FIELDS) {
      break;
    }

    const tagName = field.tagName.toLowerCase();
    if (tagName !== "input" && tagName !== "textarea" && tagName !== "select") {
      continue;
    }

    const type = (field.type ?? "").toLowerCase();
    if (DRAFT_EXCLUDED_TYPES.has(type)) {
      continue;
    }

    const autocomplete = (field.autocomplete ?? "").toLowerCase();
    if (autocomplete.includes("password") || autocomplete.includes("one-time-code")) {
      continue;
    }

    const key = draftFieldKey(field);
    if (!key || field.value.length > DRAFT_MAX_VALUE_LENGTH) {
      continue;
    }

    if (type === "checkbox" || type === "radio") {
      drafts.push({ key, value: field.value, checked: Boolean(field.checked) });
      continue;
    }

    drafts.push({ key, value: field.value });
  }

  return drafts;
}
