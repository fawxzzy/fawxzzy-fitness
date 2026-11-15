import {
  clearRememberedLoginState,
  readRememberedLoginState,
  writeRememberedLoginState,
  type RememberedLoginStorage,
} from "@/lib/remembered-login";

// The sign-up form saves the typed username and email as the remembered login at submit, so the "Check your email"
// screen can show them after the server redirect. When the sign-up fails instead, that address must not stay
// remembered (the next sign-in screen would offer an account that does not exist). The remembered login from before
// the attempt is kept in sessionStorage for the length of the round trip and put back on failure.

const PREVIOUS_KEY = "fawxzzy:signup-previous-remembered-login";
const NONE = "none";

type SessionStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function sessionStore(storage?: SessionStore): SessionStore | null {
  if (storage) {
    return storage;
  }
  return typeof window === "undefined" ? null : window.sessionStorage;
}

/** Call at submit, before the attempt overwrites the remembered login. */
export function stashRememberedLoginBeforeSignup(options: { local?: RememberedLoginStorage; session?: SessionStore } = {}) {
  const store = sessionStore(options.session);
  if (!store) {
    return;
  }
  const previous = readRememberedLoginState(options.local);
  try {
    store.setItem(PREVIOUS_KEY, previous ? JSON.stringify(previous) : NONE);
  } catch {}
}

/** Call when the sign-up came back with an error: restores the earlier remembered login, or clears it. */
export function restoreRememberedLoginAfterFailedSignup(options: { local?: RememberedLoginStorage; session?: SessionStore } = {}) {
  const store = sessionStore(options.session);
  if (!store) {
    return;
  }
  let raw: string | null = null;
  try {
    raw = store.getItem(PREVIOUS_KEY);
    store.removeItem(PREVIOUS_KEY);
  } catch {}
  if (raw === null) {
    // No attempt from this tab is in flight (a shared or reloaded error link): leave the remembered login alone.
    return;
  }
  if (raw === NONE) {
    clearRememberedLoginState(options.local);
    return;
  }
  try {
    writeRememberedLoginState(JSON.parse(raw), options.local);
  } catch {
    clearRememberedLoginState(options.local);
  }
}

/** Call when the sign-up succeeded: the new address stays remembered. */
export function forgetStashedRememberedLogin(options: { session?: SessionStore } = {}) {
  try {
    sessionStore(options.session)?.removeItem(PREVIOUS_KEY);
  } catch {}
}
