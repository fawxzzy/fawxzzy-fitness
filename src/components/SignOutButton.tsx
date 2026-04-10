"use client";

import { useRouter } from "next/navigation";
import { AppButton } from "@/components/ui/AppButton";
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
    <AppButton
      type="button"
      variant="destructive"
      fullWidth
      onClick={handleSignOut}
      data-action-chrome-segmented="true"
    >
      Sign out
    </AppButton>
  );
}
