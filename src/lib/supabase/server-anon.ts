import "server-only";

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

let anonServerClient: ReturnType<typeof createClient> | null = null;

export function supabaseServerAnon() {
  if (!anonServerClient) {
    anonServerClient = createClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return anonServerClient;
}
