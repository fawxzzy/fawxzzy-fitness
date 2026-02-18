import "client-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

let browserSupabase: ReturnType<typeof createClient> | null = null;

export function createBrowserSupabase() {
  if (!browserSupabase) {
    browserSupabase = createClient(SUPABASE_URL(), SUPABASE_ANON_KEY());
  }

  return browserSupabase;
}
