import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  ACCESS_COOKIE_NAME,
  classifyAuthSessionFailure,
  clearSessionCookies,
  REFRESH_COOKIE_NAME,
  serializeRequestCookiesWithSession,
  setSessionCookies,
  shouldRefreshAuthSession,
} from "@/lib/auth-session";
import { recordServerBootDiagnostic } from "@/lib/boot-diagnostics";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { isTrustedLocalDevHost } from "@/lib/supabase/local-dev-host";

const REFRESH_WINDOW_SECONDS = 60;

function decodeJwtExp(token: string): number | null {
  const tokenParts = token.split(".");
  if (tokenParts.length < 2) {
    return null;
  }

  const base64Url = tokenParts[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`;

  try {
    const payloadText = atob(padded);
    const payload = JSON.parse(payloadText) as { exp?: unknown };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

function buildLoginRedirectResponse(request: NextRequest, errorCode?: string) {
  const responseUrl = new URL("/login", request.url);

  if (errorCode) {
    responseUrl.searchParams.set("error", errorCode);
  }

  const response = NextResponse.redirect(responseUrl);
  clearSessionCookies(response.cookies);
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostHeader = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").trim().toLowerCase();
  const hostname = hostHeader.split(":")[0] ?? "";
  const shouldAttachLocalDevHeaders = isTrustedLocalDevHost(hostname);

  if (!shouldRefreshAuthSession(pathname)) {
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
        authState: "has-access-cookie",
      }, "warn");
      return buildLoginRedirectResponse(request, "session_expired");
    }

    recordServerBootDiagnostic({
      tag: "[boot.middleware]",
      source: "server",
      route: pathname,
      stage: "redirect-login-no-refresh-cookie",
      authState: "no-cookies",
    }, "info");
    return buildLoginRedirectResponse(request);
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  const accessTokenExp = accessToken ? decodeJwtExp(accessToken) : null;

  if (accessToken && accessTokenExp && accessTokenExp > nowInSeconds + REFRESH_WINDOW_SECONDS) {
    return NextResponse.next();
  }

  const supabase = createClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  const session = data.session;
  if (error) {
    const failure = classifyAuthSessionFailure(error);

    if (!failure) {
      recordServerBootDiagnostic({
        tag: "[boot.middleware]",
        source: "server",
        route: pathname,
        stage: "refresh-session-unexpected",
        authState: "auth-error",
        errorName: error.name,
        errorMessage: error.message,
      }, "error");
      return NextResponse.next();
    }

    recordServerBootDiagnostic({
      tag: "[boot.middleware]",
      source: "server",
      route: pathname,
      stage: `redirect-login-${failure.reason}`,
      authState: "redirected-login",
      errorName: error.name,
      errorMessage: error.message,
    }, "warn");
    return buildLoginRedirectResponse(request, failure.loginErrorCode);
  }

  if (!session?.access_token || !session.refresh_token) {
    recordServerBootDiagnostic({
      tag: "[boot.middleware]",
      source: "server",
      route: pathname,
      stage: "redirect-login-refresh-returned-no-session",
      authState: "redirected-login",
    }, "warn");
    return buildLoginRedirectResponse(request, "session_expired");
  }

  recordServerBootDiagnostic({
    tag: "[boot.middleware]",
    source: "server",
    route: pathname,
    stage: "session-refreshed",
    authState: "refreshed",
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("cookie", serializeRequestCookiesWithSession(request.cookies.getAll(), {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
  }));

  if (shouldAttachLocalDevHeaders) {
    requestHeaders.set("x-atlas-access-token", session.access_token);
    requestHeaders.set("x-atlas-refresh-token", session.refresh_token);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (session.access_token !== accessToken || session.refresh_token !== refreshToken) {
    setSessionCookies(response.cookies, {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt|woff|woff2)$).*)",
  ],
};
