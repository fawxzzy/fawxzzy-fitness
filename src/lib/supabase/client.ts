import "client-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

let browserSupabase: ReturnType<typeof createClient> | null = null;
let hasDevAuthLogging = false;

export function createBrowserSupabase() {
  if (!browserSupabase) {
    browserSupabase = createClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
      },
    });
  }

  if (process.env.NODE_ENV !== "production" && !hasDevAuthLogging) {
    hasDevAuthLogging = true;
    browserSupabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED") {
        console.debug("[supabase-auth] token refreshed", { hasSession: Boolean(session) });
      }

      if (event === "SIGNED_OUT") {
        console.warn("[supabase-auth] signed out", { hasSession: Boolean(session) });
      }
    });
  }

  return browserSupabase;
}
