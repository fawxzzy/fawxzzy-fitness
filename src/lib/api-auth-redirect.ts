import { NextResponse } from "next/server.js";

export const SESSION_EXPIRED_API_BODY = {
  ok: false,
  error: "Your session has expired. Sign in again.",
  code: "session_expired",
  loginPath: "/login?error=session_expired",
} as const;

export function sessionExpiredApiResponse() {
  return NextResponse.json(SESSION_EXPIRED_API_BODY, { status: 401, headers: { "Cache-Control": "no-store" } });
}

// requireUser() signals "not signed in" by throwing Next's redirect error. JSON endpoints must answer 401 instead.
export function isNextRedirectError(error: unknown) {
  if (typeof error !== "object" || error === null || !("digest" in error)) {
    return false;
  }
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

export async function withSessionExpiredJson(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    if (isNextRedirectError(error)) {
      return sessionExpiredApiResponse();
    }
    throw error;
  }
}
