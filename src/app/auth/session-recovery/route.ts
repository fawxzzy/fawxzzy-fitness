import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookies, SESSION_EXPIRED_LOGIN_ERROR } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

function getSafeLoginErrorCode(value: string | null) {
  return value === SESSION_EXPIRED_LOGIN_ERROR ? value : null;
}

export async function GET(request: NextRequest) {
  const responseUrl = new URL("/login", request.url);
  const loginErrorCode = getSafeLoginErrorCode(request.nextUrl.searchParams.get("error"));

  if (loginErrorCode) {
    responseUrl.searchParams.set("error", loginErrorCode);
  }

  const response = NextResponse.redirect(responseUrl);
  clearSessionCookies(response.cookies);
  return response;
}
