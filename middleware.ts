import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

const ACCESS_COOKIE = "sb-access-token";
const REFRESH_COOKIE = "sb-refresh-token";
const REFRESH_WINDOW_SECONDS = 60;
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;

const PROTECTED_PATHS = ["/today", "/session", "/history", "/routines", "/exercises"];

function isProtectedPath(pathname: string) {
  return PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function getCookieOptions(maxAge?: number) {
  return {
    path: "/",
    sameSite: "lax" as const,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    ...(typeof maxAge === "number" ? { maxAge } : {}),
  };
}

function decodeJwtExp(token: string): number | null {
  const tokenParts = token.split(".");
  if (tokenParts.length < 2) return null;

  const base64Url = tokenParts[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`;

  try {
    const payloadText = atob(padded);
    const payload = JSON.parse(payloadText) as { exp?: unknown };

    if (typeof payload.exp !== "number") {
      return null;
    }

    return payload.exp;
  } catch {
    return null;
  }
}

async function refreshSession(refreshToken: string) {
  const response = await fetch(`${SUPABASE_URL()}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY(),
      Authorization: `Bearer ${SUPABASE_ANON_KEY()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
  };

  if (!json.access_token || !json.refresh_token) {
    return null;
  }

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
  };
}

function redirectToLogin(request: NextRequest, error?: string) {
  const url = new URL("/login", request.url);
  if (error) {
    url.searchParams.set("error", error);
  }

  const response = NextResponse.redirect(url);
  response.cookies.set(ACCESS_COOKIE, "", getCookieOptions(0));
  response.cookies.set(REFRESH_COOKIE, "", getCookieOptions(0));
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    return redirectToLogin(request);
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  const exp = accessToken ? decodeJwtExp(accessToken) : null;

  if (accessToken && exp && exp > nowInSeconds + REFRESH_WINDOW_SECONDS) {
    return NextResponse.next();
  }

  const refreshedSession = await refreshSession(refreshToken);
  if (!refreshedSession) {
    return redirectToLogin(request, "session_expired");
  }

  const response = NextResponse.next();
  response.cookies.set(ACCESS_COOKIE, refreshedSession.accessToken, getCookieOptions());
  response.cookies.set(REFRESH_COOKIE, refreshedSession.refreshToken, getCookieOptions(REFRESH_MAX_AGE));
  return response;
}

export const config = {
  matcher: [
    "/today",
    "/session/:path*",
    "/history/:path*",
    "/routines/:path*",
    "/exercises/:path*",
  ],
};
