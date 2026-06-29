import { NextRequest, NextResponse } from "next/server.js";
import { clearSessionCookies, SESSION_EXPIRED_LOGIN_ERROR } from "@/lib/auth-session";
import { isSafeAppPath } from "@/lib/navigation-return";
import { buildRequestScopedUrl } from "@/lib/request-origin";

export const dynamic = "force-dynamic";

function getSafeLoginErrorCode(value: string | null) {
  return value === SESSION_EXPIRED_LOGIN_ERROR ? value : null;
}

export async function GET(request: NextRequest) {
  const responseUrl = buildRequestScopedUrl(request, "/login");
  const loginErrorCode = getSafeLoginErrorCode(request.nextUrl.searchParams.get("error"));
  const returnTo = request.nextUrl.searchParams.get("returnTo");

  if (loginErrorCode) {
    responseUrl.searchParams.set("error", loginErrorCode);
  }
  if (isSafeAppPath(returnTo)) {
    responseUrl.searchParams.set("returnTo", returnTo);
  }

  const response = NextResponse.redirect(responseUrl);
  clearSessionCookies(response.cookies);
  return response;
}
