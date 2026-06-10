import { NextResponse, type NextRequest } from "next/server.js";
import {
  ACCESS_COOKIE_NAME,
  clearSessionCookies,
  REFRESH_COOKIE_NAME,
  serializeRequestCookiesWithSession,
  setSessionCookies,
  shouldRefreshAuthSession,
} from "@/lib/auth-session";
import { CURRENT_APP_BUILD_ID } from "@/lib/app-build";
import { recordServerBootDiagnostic } from "@/lib/boot-diagnostics";
import {
  isHistoryPreviewAllowedHost,
  isHistoryPreviewEnabledInEnv,
} from "@/lib/history-preview-config";
import { recoverSupabaseSessionFromCookies, type SessionRecoveryResult } from "@/lib/supabase/session-recovery";
import { isTrustedLocalDevHost } from "@/lib/supabase/local-dev-host";

function buildLoginRedirectResponse(request: NextRequest, errorCode?: string) {
  const responseUrl = new URL("/login", request.url);

  if (errorCode) {
    responseUrl.searchParams.set("error", errorCode);
  }

  const response = NextResponse.redirect(responseUrl);
  clearSessionCookies(response.cookies);
  return response;
}

type AuthSessionMiddlewareDependencies = {
  recoverSession?: (args: {
    accessToken?: string | null;
    refreshToken?: string | null;
    refreshWindowSeconds?: number;
  }) => Promise<SessionRecoveryResult>;
};

function isHistoryPreviewRequest(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/history")) {
    return false;
  }

  return isHistoryPreviewEnabledInEnv() && isHistoryPreviewAllowedHost(request.nextUrl.host);
}

export async function handleAuthSessionMiddleware(
  request: NextRequest,
  deps: AuthSessionMiddlewareDependencies = {},
) {
  const { pathname } = request.nextUrl;
  const hostHeader = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").trim().toLowerCase();
  const hostname = hostHeader.split(":")[0] ?? "";
  const shouldAttachLocalDevHeaders = isTrustedLocalDevHost(hostname);

  if (!shouldRefreshAuthSession(pathname)) {
    return NextResponse.next();
  }

  if (isHistoryPreviewRequest(request)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(ACCESS_COOKIE_NAME)?.value?.trim() ?? "";
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value?.trim() ?? "";

  if (!refreshToken) {
    if (pathname === "/" && !accessToken) {
      return NextResponse.next();
    }

    if (accessToken) {
      recordServerBootDiagnostic({
        tag: "[boot.middleware]",
        source: "server",
        route: pathname,
        stage: "refresh-cookie-missing",
        buildId: CURRENT_APP_BUILD_ID,
        authState: "has-access-cookie",
      }, "warn");
      return buildLoginRedirectResponse(request, "session_expired");
    }

    recordServerBootDiagnostic({
      tag: "[boot.middleware]",
      source: "server",
      route: pathname,
      stage: "redirect-login-no-refresh-cookie",
      buildId: CURRENT_APP_BUILD_ID,
      authState: "no-cookies",
    }, "info");
    return buildLoginRedirectResponse(request);
  }
  const recoverSession = deps.recoverSession ?? recoverSupabaseSessionFromCookies;
  const recovery = await recoverSession({
    accessToken,
    refreshToken,
    refreshWindowSeconds: 60,
  });

  if (recovery.status === "existing") {
    return NextResponse.next();
  }

  if (recovery.status === "failed") {
    recordServerBootDiagnostic({
      tag: "[boot.middleware]",
      source: "server",
      route: pathname,
      stage: `redirect-login-${recovery.failure.reason}`,
      buildId: CURRENT_APP_BUILD_ID,
      authState: "redirected-login",
      errorName: recovery.error instanceof Error ? recovery.error.name : null,
      errorMessage: recovery.error instanceof Error ? recovery.error.message : typeof recovery.error === "string" ? recovery.error : null,
    }, "warn");
    return buildLoginRedirectResponse(request, recovery.failure.loginErrorCode);
  }

  if (recovery.status === "unexpected-error") {
    recordServerBootDiagnostic({
      tag: "[boot.middleware]",
      source: "server",
      route: pathname,
      stage: "refresh-session-unexpected",
      buildId: CURRENT_APP_BUILD_ID,
      authState: "auth-error",
      errorName: recovery.error instanceof Error ? recovery.error.name : null,
      errorMessage: recovery.error instanceof Error ? recovery.error.message : typeof recovery.error === "string" ? recovery.error : null,
    }, "error");
    return NextResponse.next();
  }

  if (recovery.status === "missing-session") {
    recordServerBootDiagnostic({
      tag: "[boot.middleware]",
      source: "server",
      route: pathname,
      stage: "redirect-login-refresh-returned-no-session",
      buildId: CURRENT_APP_BUILD_ID,
      authState: "redirected-login",
    }, "warn");
    return buildLoginRedirectResponse(request, "session_expired");
  }

  if (recovery.status !== "refreshed") {
    return NextResponse.next();
  }

  recordServerBootDiagnostic({
    tag: "[boot.middleware]",
    source: "server",
    route: pathname,
    stage: "session-refreshed",
    buildId: CURRENT_APP_BUILD_ID,
    authState: recovery.authState,
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("cookie", serializeRequestCookiesWithSession(request.cookies.getAll(), {
    accessToken: recovery.session.accessToken,
    refreshToken: recovery.session.refreshToken,
  }));

  if (shouldAttachLocalDevHeaders) {
    requestHeaders.set("x-atlas-access-token", recovery.session.accessToken);
    requestHeaders.set("x-atlas-refresh-token", recovery.session.refreshToken);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  setSessionCookies(response.cookies, recovery.session);
  recordServerBootDiagnostic({
    tag: "[boot.middleware]",
    source: "server",
    route: pathname,
    stage: "session-cookies-written",
    buildId: CURRENT_APP_BUILD_ID,
    authState: "durable-session-cookie-written",
  });

  return response;
}

export async function middleware(request: NextRequest) {
  return handleAuthSessionMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt|woff|woff2|webmanifest)$).*)",
  ],
};
