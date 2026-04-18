"use client";

export type RememberedLoginSessionState = "ready" | "reauth-required";

export type RememberedLoginState = {
  email: string;
  firstName: string;
  sessionState: RememberedLoginSessionState;
  updatedAt: string;
};

const REMEMBERED_LOGIN_KEY = "fawxzzy:remembered-login";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function toTitleCaseSegment(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return "";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function deriveRememberedLoginFirstName(email: string) {
  const localPart = normalizeEmail(email).split("@")[0] ?? "";
  const segments = localPart.split(/[._-]+/).filter(Boolean);
  const primarySegment = segments[0] ?? localPart;

  return toTitleCaseSegment(primarySegment) || "Athlete";
}

export function readRememberedLoginState(): RememberedLoginState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(REMEMBERED_LOGIN_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as
      | string
      | {
        email?: string;
        firstName?: string;
        sessionState?: RememberedLoginSessionState;
        updatedAt?: string;
      };
    const email = normalizeEmail(typeof parsed === "string" ? parsed : parsed.email ?? "");
    if (!email) {
      return null;
    }

    return {
      email,
      firstName: typeof parsed === "string"
        ? deriveRememberedLoginFirstName(email)
        : (parsed.firstName?.trim() || deriveRememberedLoginFirstName(email)),
      sessionState: typeof parsed === "string" ? "ready" : (parsed.sessionState ?? "ready"),
      updatedAt: typeof parsed === "string" ? "" : (parsed.updatedAt ?? ""),
    };
  } catch {
    return null;
  }
}

export function writeRememberedLoginState(input: {
  email: string;
  firstName?: string;
  sessionState?: RememberedLoginSessionState;
}) {
  if (typeof window === "undefined") {
    return;
  }

  const email = normalizeEmail(input.email);
  if (!email) {
    return;
  }

  try {
    window.localStorage.setItem(REMEMBERED_LOGIN_KEY, JSON.stringify({
      email,
      firstName: input.firstName?.trim() || deriveRememberedLoginFirstName(email),
      sessionState: input.sessionState ?? "ready",
      updatedAt: new Date().toISOString(),
    } satisfies RememberedLoginState));
  } catch {}
}

export function clearRememberedLoginState() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(REMEMBERED_LOGIN_KEY);
  } catch {}
}
