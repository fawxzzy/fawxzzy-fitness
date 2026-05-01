import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

function getRequestAuthTokens() {
  const cookieStore = cookies();
  const accessTokenCookie = cookieStore.get("sb-access-token")?.value;
  const refreshTokenCookie = cookieStore.get("sb-refresh-token")?.value;
  const requestHeaders = headers();
  const hostHeader = (requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "").trim().toLowerCase();
  const hostname = hostHeader.split(":")[0] ?? "";
  const localhostHeaderToken = requestHeaders.get("x-atlas-access-token")?.trim() ?? "";

  const accessToken = accessTokenCookie || (
    (hostname === "127.0.0.1" || hostname === "localhost") && localhostHeaderToken
      ? localhostHeaderToken
      : null
  );

  return {
    accessToken,
    refreshToken: refreshTokenCookie ?? null,
  };
}

function createSupabaseServerClient(accessToken?: string | null) {
  return createClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
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

export function supabaseServer() {
  const { accessToken } = getRequestAuthTokens();
  return createSupabaseServerClient(accessToken);
}

export async function supabaseServerWithSession() {
  const { accessToken, refreshToken } = getRequestAuthTokens();

  if (!accessToken || !refreshToken) {
    return createSupabaseServerClient(accessToken);
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (!error) {
    return supabase;
  }

  console.error("Failed to restore Supabase server session", {
    message: error.message,
    status: error.status,
    name: error.name,
  });

  return createSupabaseServerClient(accessToken);
}
