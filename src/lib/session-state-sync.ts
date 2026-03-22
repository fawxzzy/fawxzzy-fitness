export const ACTIVE_SESSION_HINT_KEY = "today:active-session";
export const ACTIVE_SESSION_EVENT = "today:active-session-change";

export type ActiveSessionHint = {
  sessionId: string;
  updatedAt: number;
};

function isBrowser() {
  return typeof window !== "undefined";
}

function emitActiveSessionChange() {
  window.dispatchEvent(new CustomEvent(ACTIVE_SESSION_EVENT));
}

export function readActiveSessionHint(): ActiveSessionHint | null {
  if (!isBrowser()) {
    return null;
  }

  const raw = window.localStorage.getItem(ACTIVE_SESSION_HINT_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ActiveSessionHint>;
    if (typeof parsed.sessionId !== "string" || !parsed.sessionId.trim()) {
      return null;
    }

    return {
      sessionId: parsed.sessionId,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function writeActiveSessionHint(sessionId: string) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(
    ACTIVE_SESSION_HINT_KEY,
    JSON.stringify({ sessionId, updatedAt: Date.now() } satisfies ActiveSessionHint),
  );
  emitActiveSessionChange();
}

export function clearActiveSessionHint(sessionId?: string | null) {
  if (!isBrowser()) {
    return;
  }

  const current = readActiveSessionHint();
  if (sessionId && current?.sessionId && current.sessionId !== sessionId) {
    return;
  }

  window.localStorage.removeItem(ACTIVE_SESSION_HINT_KEY);
  emitActiveSessionChange();
}
