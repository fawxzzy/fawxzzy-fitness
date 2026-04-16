import "client-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { clearPersistedWorkoutClientState, pruneStaleSessionDrafts } from "@/lib/offline/client-storage";

let browserSupabase: ReturnType<typeof createClient> | null = null;
let hasAuthStateListener = false;

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

  if (!hasAuthStateListener) {
    hasAuthStateListener = true;
    browserSupabase.auth.onAuthStateChange((event, session) => {
      if (process.env.NODE_ENV !== "production" && event === "TOKEN_REFRESHED") {
        console.debug("[supabase-auth] token refreshed", { hasSession: Boolean(session) });
      }

      if (event === "SIGNED_OUT") {
        clearPersistedWorkoutClientState();
        if (process.env.NODE_ENV !== "production") {
          console.warn("[supabase-auth] signed out", { hasSession: Boolean(session) });
        }
      }

      if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
        pruneStaleSessionDrafts();
      }
    });
  }

  return browserSupabase;
}
