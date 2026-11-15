"use client";

import { useRouter } from "next/navigation";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { AppButton } from "@/components/ui/AppButton";
import { clearPersistedWorkoutClientState } from "@/lib/offline/client-storage";
import { createBrowserSupabase } from "@/lib/supabase/client";

const AUTH_ENTRY_PATH = "/login";

export function SignOutButton({ placement = "dock" }: { placement?: "dock" | "body" } = {}) {
  const router = useRouter();
  const supabase = createBrowserSupabase();

  const handleSignOut = async () => {
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
      // Ignore cookie cleanup failures and continue to the login screen.
    }
    try {
      // Local scope: drop any browser-held session without a second, redundant revoke (the server already did it).
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // The cookie mirror is already cleared; still continue to the login screen.
    }
    router.replace(AUTH_ENTRY_PATH);
    window.location.assign(AUTH_ENTRY_PATH);
  };

  if (placement === "body") {
    // Settings body (not the dock): the dock is for the screen's primary action, and signing out is not that.
    return (
      <AppButton type="button" variant="secondary" fullWidth onClick={handleSignOut} data-settings-sign-out="true">
        Sign out
      </AppButton>
    );
  }

  return (
    <BottomDockButton
      type="button"
      intent="danger"
      onClick={handleSignOut}
    >
      Sign out
    </BottomDockButton>
  );
}
