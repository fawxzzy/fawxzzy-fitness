/**
 * Sign out on THIS device, as one ordered flow with its boundaries injected (the button wires the real ones).
 *
 * 1. Choose the destination (portal /signout in a browser tab, /login in the installed app).
 * 2. Server revoke: `DELETE /auth/session-sync` revokes the auth session behind the cookies and clears them (#263).
 *    A network error or a non-2xx response is a failure: the person stays on the screen, signed in, and sees
 *    `account.signoutfail`. Nothing local has been cleared yet, so an unsynced workout is not lost.
 * 3. Browser-local sign-out (`scope: "local"`). A throw here is also a failure (no navigation).
 * 4. Clear the persisted workout state, best-effort: storage can be unavailable (a `SecurityError` in private modes),
 *    and then there is nothing persisted to clear, so it never blocks the sign-out.
 * 5. ONE navigation.
 *
 * Any throw in steps 1, 2, 3 or 5 resolves to `{ ok: false }` (never a rejection), so the caller always leaves its
 * pending state on failure. On success the page is unloading, so the caller keeps its pending label until it goes.
 */
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
