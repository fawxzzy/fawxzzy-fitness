"use client";

import { useState } from "react";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { AppButton } from "@/components/ui/AppButton";
import { getFitnessAccountSignOutUrl } from "@/lib/account-portal";
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

/** Sign out on THIS device only. "Sign out everywhere" is a separate link to the account portal. */
export function SignOutButton({ placement = "dock" }: { placement?: "dock" | "body" } = {}) {
  const [pending, setPending] = useState(false);

  const handleSignOut = async () => {
    if (pending) {
      return;
    }
    setPending(true);
    const destination = resolveSignOutDestination(getInstallContext().isStandalone);
    clearPersistedWorkoutClientState();
    // The server revokes the auth session from the cookies first: this browser client usually holds no session of
    // its own (sign-in happens on the server / portal), so its signOut() alone never reaches the auth server.
    try {
      await fetch("/auth/session-sync", {
        method: "DELETE",
        credentials: "same-origin",
        keepalive: true,
      });
    } catch {
      // Ignore cookie cleanup failures and continue to the sign-in screen.
    }
    try {
      // Local scope: drop any browser-held session without a second, redundant revoke (the server already did it).
      await createBrowserSupabase().auth.signOut({ scope: "local" });
    } catch {
      // The cookie mirror is already cleared; still continue to the sign-in screen.
    }
    // ONE full navigation (no client route change first), so no signed-in screen flashes in between.
    window.location.assign(destination);
  };

  const label = pending ? "Signing out…" : "Sign out";

  if (placement === "body") {
    // Settings body (not the dock): the dock is for the screen's primary action, and signing out is not that.
    return (
      <AppButton
        type="button"
        variant="secondary"
        fullWidth
        onClick={handleSignOut}
        disabled={pending}
        data-settings-sign-out="true"
        data-sign-out-state={pending ? "pending" : "ready"}
      >
        {label}
      </AppButton>
    );
  }

  return (
    <BottomDockButton type="button" intent="danger" onClick={handleSignOut} disabled={pending}>
      {label}
    </BottomDockButton>
  );
}
