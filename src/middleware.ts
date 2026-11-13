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
import { FITNESS_CANONICAL_ORIGIN } from "@/lib/app-origin";
import { buildRequestScopedUrl } from "@/lib/request-origin";
import { hostnamesOf, isDevOnlyPath, isDevRouteWithdrawn } from "@/lib/dev-route-guard";
import {
  isDocumentNavigation,
  shouldAnswerDetailRouteWithNotFound,
  type DetailRecordLookup,
} from "@/lib/detail-route-guard";

// A path no route serves, so Next answers the rewrite with the app's standard 404 page and a real 404 status.
export const DETAIL_NOT_FOUND_REWRITE_PATH = "/__detail-not-found";

export const FITNESS_LEGACY_STABLE_HOSTNAME = "fawxzzy-fitness-local.vercel.app";

export function shouldRedirectLegacyFitnessNavigation(request: NextRequest) {
  const method = request.method.toUpperCase();

  if (method !== "GET" && method !== "HEAD") {
    return false;
  }

  if (request.nextUrl.hostname.toLowerCase() !== FITNESS_LEGACY_STABLE_HOSTNAME) {
    return false;
  }

  return !request.nextUrl.pathname.startsWith("/api/");
}

function buildCanonicalHostRedirect(request: NextRequest) {
  const destination = new URL(request.nextUrl.pathname, FITNESS_CANONICAL_ORIGIN);
  destination.search = request.nextUrl.search;
  destination.searchParams.set("compatibility", "fitness_legacy_origin");
  return NextResponse.redirect(destination, 308);
}

function getLoginReturnTo(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname !== "/account" && !pathname.startsWith("/account/")) {
    return null;
  }

  return `${pathname}${search}`;
}

function buildLoginRedirectResponse(request: NextRequest, errorCode?: string) {
  const responseUrl = buildRequestScopedUrl(request, "/login");

  if (errorCode) {
    responseUrl.searchParams.set("error", errorCode);
  }

  const returnTo = getLoginReturnTo(request);
  if (returnTo) {
    responseUrl.searchParams.set("returnTo", returnTo);
  }

  const response = NextResponse.redirect(responseUrl);
  clearSessionCookies(response.cookies);
  return response;
}

type AuthSessionMiddlewareDependencies = {
  lookupDetailRecord?: DetailRecordLookup;
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

async function buildDetailNotFoundResponse(
  request: NextRequest,
  accessToken: string,
  deps: AuthSessionMiddlewareDependencies,
) {
  if (!isDocumentNavigation(request)) {
    return null;
  }

  const notFound = await shouldAnswerDetailRouteWithNotFound({
    pathname: request.nextUrl.pathname,
    accessToken,
    lookup: deps.lookupDetailRecord,
  });
  if (!notFound) {
    return null;
  }

  const url = request.nextUrl.clone();
  url.pathname = DETAIL_NOT_FOUND_REWRITE_PATH;
  url.search = "";
  return NextResponse.rewrite(url, { status: 404 });
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
    return (await buildDetailNotFoundResponse(request, recovery.session.accessToken, deps)) ?? NextResponse.next();
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

  const detailNotFound = await buildDetailNotFoundResponse(request, recovery.session.accessToken, deps);
  if (detailNotFound) {
    setSessionCookies(detailNotFound.cookies, recovery.session);
    return detailNotFound;
  }

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

export function buildDevRouteUnavailableResponse() {
  return NextResponse.json(
    { ok: false, error: "Not found." },
    { status: 404, headers: { "cache-control": "no-store" } },
  );
}

export async function middleware(request: NextRequest) {
  // Dev fixtures and diagnostics never run on a production deployment, or on a server that
  // cannot show it is a local run (see src/lib/dev-route-guard.ts). The environment snapshot uses
  // literal reads: Next inlines only the literal `process.env.NODE_ENV` expression.
  if (isDevOnlyPath(request.nextUrl.pathname)) {
    const devGuardEnv = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      HISTORY_QA_PREVIEW_ENABLED: process.env.HISTORY_QA_PREVIEW_ENABLED,
    };
    if (isDevRouteWithdrawn({ hostnames: hostnamesOf(request), env: devGuardEnv })) {
      return buildDevRouteUnavailableResponse();
    }
  }

  if (shouldRedirectLegacyFitnessNavigation(request)) {
    return buildCanonicalHostRedirect(request);
  }

  return handleAuthSessionMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt|woff|woff2|webmanifest)$).*)",
  ],
};
