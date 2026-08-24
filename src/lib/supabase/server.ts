import "server-only";
import { cookies, headers } from "next/headers";
import { CURRENT_APP_BUILD_ID } from "@/lib/app-build";
import { recordServerBootDiagnostic } from "@/lib/boot-diagnostics";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { recoverSupabaseSessionFromCookies } from "@/lib/supabase/session-recovery";
import { isTrustedLocalDevHost } from "@/lib/supabase/local-dev-host";
import { createFitnessSupabaseClient } from "@/lib/supabase/schema";

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

export function supabaseServer() {
  const { accessToken } = getRequestAuthTokens();
  return createSupabaseServerClient(accessToken);
}

export async function supabaseServerWithSession() {
  const { accessToken, refreshToken } = getRequestAuthTokens();
  const recovery = await recoverSupabaseSessionFromCookies({
    accessToken,
    refreshToken,
  });

  if (recovery.status === "anonymous") {
    return createSupabaseServerClient(accessToken);
  }
  if (recovery.status === "existing") {
    return createSupabaseServerClient(recovery.session.accessToken);
  }

  if (recovery.status === "refreshed") {
    recordServerBootDiagnostic({
      tag: "[boot.auth]",
      source: "server",
      route: null,
      stage: `restore-session-${recovery.authState}`,
      buildId: CURRENT_APP_BUILD_ID,
      authState: recovery.authState,
    });
    return createSupabaseServerClient(recovery.session.accessToken);
  }

  recordServerBootDiagnostic({
    tag: "[boot.auth]",
    source: "server",
    route: null,
    stage: `restore-session-${recovery.status === "failed" ? recovery.failure.reason : recovery.status}`,
    buildId: CURRENT_APP_BUILD_ID,
    authState: recovery.status === "failed" ? "auth-error" : null,
    errorName: recovery.status === "unexpected-error" && recovery.error instanceof Error ? recovery.error.name : null,
    errorMessage:
      recovery.status === "unexpected-error" && recovery.error instanceof Error
        ? recovery.error.message
        : null,
  }, "error");
  return createSupabaseServerClient(accessToken);
}
