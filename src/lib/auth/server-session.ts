import "server-only";
import { cookies, headers } from "next/headers";
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from "@/lib/auth-session";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { resolveServerSessionTokens, type ServerSessionTokenSnapshot } from "@/lib/auth/server-session-core";
import { recoverSupabaseSessionFromCookies, type SessionRecoveryResult } from "@/lib/supabase/session-recovery";
import { createFitnessSupabaseClient } from "@/lib/supabase/schema";

type RecoverSessionArgs = {
  accessToken?: string | null;
  refreshToken?: string | null;
};

type RecoverSession = (args: RecoverSessionArgs) => Promise<SessionRecoveryResult>;

export function createSupabaseServerClient(accessToken?: string | null) {
  return createFitnessSupabaseClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : {},
  });
}

export function readCurrentRequestServerSessionTokens(): ServerSessionTokenSnapshot {
  const cookieStore = cookies();
  const requestHeaders = headers();

  return resolveServerSessionTokens({
    cookieAccessToken: cookieStore.get(ACCESS_COOKIE_NAME)?.value,
    cookieRefreshToken: cookieStore.get(REFRESH_COOKIE_NAME)?.value,
    headerAccessToken: requestHeaders.get("x-atlas-access-token"),
    headerRefreshToken: requestHeaders.get("x-atlas-refresh-token"),
    hostHeader: requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
  });
}

export async function recoverCurrentRequestServerSession(
  recoverSession: RecoverSession = recoverSupabaseSessionFromCookies,
) {
  const session = readCurrentRequestServerSessionTokens();
  const recovery = await recoverSession({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  });

  return {
    recovery,
    session,
  };
}
