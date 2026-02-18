"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    document.cookie = "sb-access-token=; Path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleSignOut}
      className="rounded-md bg-red-600 px-4 py-2 text-white"
    >
      Sign out
    </button>
  );
}
