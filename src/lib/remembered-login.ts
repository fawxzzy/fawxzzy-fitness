"use client";

export type RememberedLoginSessionState = "ready" | "reauth-required";

export type RememberedLoginState = {
  email: string;
  displayName: string;
  sessionState: RememberedLoginSessionState;
  updatedAt: string;
};

export type RememberedLoginStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type RememberedLoginInput = {
  email: string;
  displayName?: string;
  firstName?: string;
  sessionState?: RememberedLoginSessionState;
  updatedAt?: string;
};

const REMEMBERED_LOGIN_KEY = "fawxzzy:remembered-login";
const DEFAULT_SESSION_STATE: RememberedLoginSessionState = "reauth-required";

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

export function deriveRememberedLoginDisplayName(email: string) {
  const localPart = normalizeEmail(email).split("@")[0] ?? "";
  const segments = localPart.split(/[._-]+/).filter(Boolean);
  const primarySegment = segments[0] ?? localPart;

  return toTitleCaseSegment(primarySegment) || "Athlete";
}

export function deriveRememberedLoginFirstName(email: string) {
  return deriveRememberedLoginDisplayName(email);
}

function getRememberedLoginStorage(storage?: RememberedLoginStorage) {
  if (storage) {
    return storage;
  }

  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function buildRememberedLoginState(input: RememberedLoginInput): RememberedLoginState {
  const email = normalizeEmail(input.email);

  return {
    email,
    displayName: input.displayName?.trim() || input.firstName?.trim() || deriveRememberedLoginDisplayName(email),
    sessionState: input.sessionState ?? DEFAULT_SESSION_STATE,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };
}

export function toReauthRequiredRememberedLoginState(state: RememberedLoginState) {
  if (state.sessionState === "reauth-required") {
    return state;
  }

  return buildRememberedLoginState({
    ...state,
    sessionState: "reauth-required",
  });
}

export function readRememberedLoginState(storage?: RememberedLoginStorage): RememberedLoginState | null {
  const rememberedLoginStorage = getRememberedLoginStorage(storage);

  if (!rememberedLoginStorage) {
    return null;
  }

  try {
    const raw = rememberedLoginStorage.getItem(REMEMBERED_LOGIN_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as
      | string
      | {
        email?: string;
        firstName?: string;
        displayName?: string;
        sessionState?: RememberedLoginSessionState;
        updatedAt?: string;
      };
    const email = normalizeEmail(typeof parsed === "string" ? parsed : parsed.email ?? "");
    if (!email) {
      return null;
    }

    return buildRememberedLoginState({
      email,
      displayName: typeof parsed === "string"
        ? deriveRememberedLoginDisplayName(email)
        : (parsed.displayName?.trim() || parsed.firstName?.trim() || deriveRememberedLoginDisplayName(email)),
      sessionState: typeof parsed === "string" ? DEFAULT_SESSION_STATE : (parsed.sessionState ?? DEFAULT_SESSION_STATE),
      updatedAt: typeof parsed === "string" ? undefined : parsed.updatedAt,
    });
  } catch {
    return null;
  }
}

export function writeRememberedLoginState(input: RememberedLoginInput, storage?: RememberedLoginStorage) {
  const rememberedLoginStorage = getRememberedLoginStorage(storage);

  if (!rememberedLoginStorage) {
    return;
  }

  const email = normalizeEmail(input.email);
  if (!email) {
    return;
  }

  try {
    rememberedLoginStorage.setItem(REMEMBERED_LOGIN_KEY, JSON.stringify(buildRememberedLoginState(input)));
  } catch {}
}

export function syncRememberedLoginFromAuthenticatedSession(
  input: Omit<RememberedLoginInput, "sessionState">,
  storage?: RememberedLoginStorage,
) {
  const nextState = buildRememberedLoginState({
    ...input,
    sessionState: "ready",
  });

  writeRememberedLoginState(nextState, storage);
  return nextState;
}

export function clearRememberedLoginState(storage?: RememberedLoginStorage) {
  const rememberedLoginStorage = getRememberedLoginStorage(storage);

  if (!rememberedLoginStorage) {
    return;
  }

  try {
    rememberedLoginStorage.removeItem(REMEMBERED_LOGIN_KEY);
  } catch {}
}
