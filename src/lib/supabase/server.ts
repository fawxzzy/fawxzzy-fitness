import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

export function supabaseServer() {
  // NOTE:
  // Token refresh is handled in middleware.ts.
  // This helper only consumes the access token cookie.
  const accessToken = cookies().get("sb-access-token")?.value;

  return createClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : {},
  });
}
