"use client";

import { useRef, useState } from "react";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { AuthNoticeSlot } from "@/components/auth/AuthShell";
import { authNotice, type AuthNotice } from "@/components/auth/authMessages";
import { AppButton } from "@/components/ui/AppButton";
import { getFitnessAccountSignOutUrl } from "@/lib/account-portal";
import { DEVICE_SIGN_OUT_FAILURE_NOTICE_ID, runDeviceSignOut } from "@/lib/auth/device-sign-out";
import { getInstallContext } from "@/lib/install/getInstallContext";
import { clearPersistedWorkoutClientState } from "@/lib/offline/client-storage";
import { createBrowserSupabase } from "@/lib/supabase/client";

const AUTH_ENTRY_PATH = "/login";

/**
 * Where sign-out lands, chosen once per tap. A browser tab shares the account.fawxzzy.com session, so it goes to the
 * portal's /signout, which ends THAT session too (local scope: other devices and apps stay signed in); otherwise the
 * Fitness /login redirect would hand the person straight back in with the portal session. The installed app does not
 * share the browser's portal session, so it stays in the app on its own sign-in screen.
 */
export function resolveSignOutDestination(isStandalone: boolean) {
  return isStandalone ? AUTH_ENTRY_PATH : getFitnessAccountSignOutUrl();
}

/**
 * Sign out on THIS device only. "Sign out everywhere" is a separate link to the account portal.
 * The order and the failure rules live in `runDeviceSignOut`: the server revoke must succeed before anything local is
 * cleared or the page moves; on any failure the person stays here, signed in, with `account.signoutfail`.
 */
export function SignOutButton({ placement = "dock" }: { placement?: "dock" | "body" } = {}) {
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<AuthNotice | null>(null);
  const inFlight = useRef(false);

  const handleSignOut = async () => {
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    setPending(true);
    setNotice(null);
    let signedOut = false;
    try {
      const result = await runDeviceSignOut({
        resolveDestination: () => resolveSignOutDestination(getInstallContext().isStandalone),
        // The server revokes the auth session from the cookies: this browser client usually holds no session of its
        // own (sign-in happens on the server / portal), so its signOut() alone never reaches the auth server.
        revoke: () => fetch("/auth/session-sync", { method: "DELETE", credentials: "same-origin" }),
        // Local scope: drop any browser-held session without a second, redundant revoke (the server already did it).
        signOutLocally: () => createBrowserSupabase().auth.signOut({ scope: "local" }),
        clearLocalState: clearPersistedWorkoutClientState,
        // ONE full navigation (no client route change first), so no signed-in screen flashes in between.
        navigate: (destination) => window.location.assign(destination),
      });
      signedOut = result.ok;
    } finally {
      if (!signedOut) {
        setNotice(authNotice(DEVICE_SIGN_OUT_FAILURE_NOTICE_ID));
        setPending(false);
        inFlight.current = false;
      }
    }
  };

  const label = pending ? "Signing out…" : "Sign out";
  // The shared v2 notice box; the wrapper supplies its colour tokens outside the auth/account screens.
  const failureNotice = notice ? (
    <div className="fx-account" data-sign-out-notice="true">
      <AuthNoticeSlot notice={notice} className="!mt-0 !min-h-0" />
    </div>
  ) : null;

  if (placement === "body") {
    // Settings body (not the dock): the dock is for the screen's primary action, and signing out is not that.
    return (
      <div className="space-y-3">
        {failureNotice}
        <AppButton
          type="button"
          variant="secondary"
          fullWidth
          onClick={handleSignOut}
          disabled={pending}
          data-settings-sign-out="true"
          data-sign-out-state={pending ? "pending" : notice ? "failed" : "ready"}
        >
          {label}
        </AppButton>
      </div>
    );
  }

  return (
    <>
      {failureNotice}
      <BottomDockButton type="button" intent="danger" onClick={handleSignOut} disabled={pending}>
        {label}
      </BottomDockButton>
    </>
  );
}
