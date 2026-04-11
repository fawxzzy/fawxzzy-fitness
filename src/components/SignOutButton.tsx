"use client";

import { useRouter } from "next/navigation";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { createBrowserSupabase } from "@/lib/supabase/client";

const AUTH_ENTRY_PATH = "/login";

export function SignOutButton() {
  const router = useRouter();
  const supabase = createBrowserSupabase();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    document.cookie = "sb-access-token=; Path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
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
