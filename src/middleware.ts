import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { isTrustedLocalDevHost } from "@/lib/supabase/local-dev-host";

function setSessionCookies(response: NextResponse, session: { accessToken: string; refreshToken: string }) {
  response.cookies.set("sb-access-token", session.accessToken, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  response.cookies.set("sb-refresh-token", session.refreshToken, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function middleware(request: NextRequest) {
  const hostHeader = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").trim().toLowerCase();
  const hostname = hostHeader.split(":")[0] ?? "";

  if (!isTrustedLocalDevHost(hostname)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("sb-access-token")?.value?.trim() ?? "";
  const refreshToken = request.cookies.get("sb-refresh-token")?.value?.trim() ?? "";

  if (!accessToken || !refreshToken) {
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
  if (error || !session?.access_token || !session.refresh_token) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-atlas-access-token", session.access_token);
  requestHeaders.set("x-atlas-refresh-token", session.refresh_token);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (session.access_token !== accessToken || session.refresh_token !== refreshToken) {
    setSessionCookies(response, {
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
