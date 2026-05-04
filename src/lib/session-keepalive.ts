import { NextRequest, NextResponse } from "next/server.js";
import {
  ACCESS_COOKIE_NAME,
  clearSessionCookies,
  REFRESH_COOKIE_NAME,
  setSessionCookies,
} from "@/lib/auth-session";
import { CURRENT_APP_BUILD_ID } from "@/lib/app-build";
import { recordServerBootDiagnostic } from "@/lib/boot-diagnostics";
import { recoverSupabaseSessionFromCookies, type SessionRecoveryResult } from "@/lib/supabase/session-recovery";

type SessionKeepaliveDependencies = {
  recoverSession?: (args: {
    accessToken?: string | null;
    forceRefresh?: boolean;
    refreshToken?: string | null;
    refreshWindowSeconds?: number;
  }) => Promise<SessionRecoveryResult>;
};

function buildKeepaliveResponse(body: Record<string, unknown>, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      "cache-control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      ...(init?.headers ?? {}),
    },
  });
}

export async function handleSessionKeepaliveRequest(
  request: NextRequest,
  deps: SessionKeepaliveDependencies = {},
) {
  const accessToken = request.cookies.get(ACCESS_COOKIE_NAME)?.value?.trim() ?? "";
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value?.trim() ?? "";
  const recoverSession = deps.recoverSession ?? recoverSupabaseSessionFromCookies;
  const recovery = await recoverSession({
    accessToken,
    forceRefresh: true,
    refreshToken,
    refreshWindowSeconds: 0,
  });

  if (recovery.status === "anonymous") {
    const authState = recovery.authState === "has-access-cookie" ? "expired" : "anonymous";
    const response = buildKeepaliveResponse({ ok: true, authState, recoveryState: recovery.authState });
    if (authState === "expired") {
      clearSessionCookies(response.cookies);
    }
    return response;
  }

  if (recovery.status === "existing") {
    const response = buildKeepaliveResponse({
      ok: true,
      authState: "refreshed",
      recoveryState: "refreshed-from-refresh-cookie",
    });
    setSessionCookies(response.cookies, recovery.session);
    recordServerBootDiagnostic({
      tag: "[boot.auth]",
      source: "server",
      route: "/auth/session-keepalive",
      stage: "session-keepalive-existing-session-rewritten",
      buildId: CURRENT_APP_BUILD_ID,
      authState: "durable-session-cookie-written",
    });
    return response;
  }

  if (recovery.status === "refreshed") {
    const response = buildKeepaliveResponse({
      ok: true,
      authState: "refreshed",
      recoveryState: recovery.authState,
    });
    setSessionCookies(response.cookies, recovery.session);
    recordServerBootDiagnostic({
      tag: "[boot.auth]",
      source: "server",
      route: "/auth/session-keepalive",
      stage: "session-keepalive-refreshed",
      buildId: CURRENT_APP_BUILD_ID,
      authState: recovery.authState,
    });
    recordServerBootDiagnostic({
      tag: "[boot.auth]",
      source: "server",
      route: "/auth/session-keepalive",
      stage: "session-cookies-written",
      buildId: CURRENT_APP_BUILD_ID,
      authState: "durable-session-cookie-written",
    });
    return response;
  }

  if (recovery.status === "failed" || recovery.status === "missing-session") {
    const response = buildKeepaliveResponse({
      ok: true,
      authState: "expired",
      recoveryState: recovery.status === "failed" ? recovery.failure.reason : "missing-session",
    });
    clearSessionCookies(response.cookies);
    return response;
  }

  return buildKeepaliveResponse(
    {
      ok: false,
      authState: "error",
    },
    { status: 500 },
  );
}
