import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { classifyAuthSessionFailure } from "@/lib/auth-session";
import { CURRENT_APP_BUILD_ID } from "@/lib/app-build";
import { recordServerBootDiagnostic } from "@/lib/boot-diagnostics";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { isTrustedLocalDevHost } from "@/lib/supabase/local-dev-host";

function getRequestAuthTokens() {
  const cookieStore = cookies();
  const accessTokenCookie = cookieStore.get("sb-access-token")?.value;
  const refreshTokenCookie = cookieStore.get("sb-refresh-token")?.value;
  const requestHeaders = headers();
  const hostHeader = (requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "").trim().toLowerCase();
  const hostname = hostHeader.split(":")[0] ?? "";
  const localhostHeaderToken = requestHeaders.get("x-atlas-access-token")?.trim() ?? "";
  const localhostRefreshHeaderToken = requestHeaders.get("x-atlas-refresh-token")?.trim() ?? "";
  const canTrustLocalDevHeaders = isTrustedLocalDevHost(hostname);

  const accessToken = accessTokenCookie || (
    canTrustLocalDevHeaders && localhostHeaderToken
      ? localhostHeaderToken
      : null
  );
  const refreshToken = refreshTokenCookie || (
    canTrustLocalDevHeaders && localhostRefreshHeaderToken
      ? localhostRefreshHeaderToken
      : null
  );

  return {
    accessToken,
    refreshToken,
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

  const failure = classifyAuthSessionFailure(error);

  recordServerBootDiagnostic({
    tag: "[boot.auth]",
    source: "server",
    route: null,
    stage: `restore-session-${failure?.reason ?? "unexpected"}`,
    buildId: CURRENT_APP_BUILD_ID,
    authState: failure ? "auth-error" : null,
    errorName: error.name,
    errorMessage: error.message,
  }, "error");

  if (failure) {
    return createSupabaseServerClient();
  }

  return createSupabaseServerClient(accessToken);
}
