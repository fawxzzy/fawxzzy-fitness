"use client";

import { useRouter } from "next/navigation";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { clearPersistedWorkoutClientState } from "@/lib/offline/client-storage";
import { createBrowserSupabase } from "@/lib/supabase/client";

const AUTH_ENTRY_PATH = "/login";

export function SignOutButton() {
  const router = useRouter();
  const supabase = createBrowserSupabase();

  const handleSignOut = async () => {
    clearPersistedWorkoutClientState();
    await supabase.auth.signOut();
    try {
      await fetch("/auth/session-sync", {
        method: "DELETE",
        credentials: "same-origin",
        keepalive: true,
      });
    } catch {
      // Ignore cookie cleanup failures and continue to the login screen.
    }
    router.replace(AUTH_ENTRY_PATH);
    window.location.assign(AUTH_ENTRY_PATH);
  };

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
