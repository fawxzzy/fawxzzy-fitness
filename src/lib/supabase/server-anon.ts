import "server-only";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { createFitnessSupabaseClient } from "@/lib/supabase/schema";

let anonServerClient: ReturnType<typeof createFitnessSupabaseClient> | null = null;

export function supabaseServerAnon() {
  if (!anonServerClient) {
    anonServerClient = createFitnessSupabaseClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return anonServerClient;
}
