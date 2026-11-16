/**
 * Sign out on THIS device, as one ordered flow with its boundaries injected (the button wires the real ones).
 *
 * 1. Choose the destination (portal /signout in a browser tab, /login in the installed app).
 * 2. Server revoke: `DELETE /auth/session-sync` revokes the auth session behind the cookies and clears them (#263).
 *    "Must succeed" means the request reached the server and came back 2xx. A network error or a non-2xx response is a
 *    failure: the person stays on the screen, signed in, and sees `account.signoutfail`. Nothing local has been
 *    cleared yet, so an unsynced workout is not lost. A 2xx is not proof the auth server confirmed the revoke: the
 *    route answers 200 with `signOut: "failed"` in the body when the upstream revoke failed, but it still clears the
 *    cookies, and this flow treats that 200 as a success.
 * 3. Browser-local sign-out (`scope: "local"`). A throw here is also a failure (no navigation). Retrying after a
 *    throw here is safe: the revoke already succeeded and the cookies are cleared, so the next attempt's revoke
 *    answers 200 (no session) and the local sign-out runs again.
 * 4. Clear the persisted workout state, best-effort: storage can be unavailable (a `SecurityError` in private modes),
 *    and then there is nothing persisted to clear, so it never blocks the sign-out.
 * 5. ONE navigation.
 *
 * Any throw in steps 1, 2, 3 or 5 resolves to `{ ok: false }` (never a rejection), so the caller always leaves its
 * pending state on failure. On success the page is unloading, so the caller keeps its pending label until it goes.
 */
/**
 * After a successful sign-out the button keeps its pending label because the page is unloading. If the browser then restores
 * the page from the back/forward cache, that stale label would stay forever: this calls `reset` when the page is restored from the bfcache (`pageshow` with `persisted`); returns the unsubscribe. */
export function subscribePageShowReset(reset: () => void, target: Pick<Window, "addEventListener" | "removeEventListener"> = window) {
  const onPageShow = (event: Event) => {
    if ((event as PageTransitionEvent).persisted) {
      reset();
    }
  };
  target.addEventListener("pageshow", onPageShow);
  return () => target.removeEventListener("pageshow", onPageShow);
}

export type DeviceSignOutDependencies = {
  resolveDestination: () => string;
  revoke: () => Promise<{ ok: boolean }>;
  signOutLocally: () => Promise<unknown>;
  clearLocalState: () => void;
  navigate: (destination: string) => void;
};

export type DeviceSignOutResult = { ok: true; destination: string } | { ok: false; reason: "revoke" | "local" | "unexpected" };

export const DEVICE_SIGN_OUT_FAILURE_NOTICE_ID = "account.signoutfail" as const;

export async function runDeviceSignOut(dependencies: DeviceSignOutDependencies): Promise<DeviceSignOutResult> {
  let destination: string;
  try {
    destination = dependencies.resolveDestination();
  } catch {
    return { ok: false, reason: "unexpected" };
  }

  try {
    const response = await dependencies.revoke();
    if (!response || !response.ok) {
      return { ok: false, reason: "revoke" };
    }
  } catch {
    return { ok: false, reason: "revoke" };
  }

  try {
    await dependencies.signOutLocally();
  } catch {
    return { ok: false, reason: "local" };
  }

  try {
    dependencies.clearLocalState();
  } catch {
    // Best-effort: unavailable storage holds nothing to clear.
  }

  try {
    dependencies.navigate(destination);
  } catch {
    return { ok: false, reason: "unexpected" };
  }
  return { ok: true, destination };
}
