"use client";

import { useRouter } from "next/navigation";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { createBrowserSupabase } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const supabase = createBrowserSupabase();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    document.cookie = "sb-access-token=; Path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleSignOut}
      className={getAppButtonClassName({
        variant: "destructive",
        fullWidth: true,
        className: "bg-red-500/10 text-red-200 border-red-400/35 shadow-none hover:bg-red-500/16",
      })}
    >
      Sign out
    </button>
  );
}
