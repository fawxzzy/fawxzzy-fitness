import "server-only";
import { isRedirectError } from "next/dist/client/components/redirect.js";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

type AuthenticatedUser = Awaited<ReturnType<typeof requireUser>>;

export type ApiUserResult =
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; response: NextResponse };

export const API_SESSION_EXPIRED_MESSAGE = "Your session has expired. Sign in again to continue.";

/**
 * Resolves the signed-in user for a JSON route handler. `requireUser` signals "not signed in" by
 * throwing Next's redirect error, which a route handler's own `try/catch` would turn into a 500 or
 * 400 with the text "NEXT_REDIRECT". Call this BEFORE the handler's `try` block: a missing or
 * expired session becomes a 401 JSON response the client can show, and every other failure is
 * rethrown unchanged.
 */
export async function resolveApiUser(loadUser: () => Promise<AuthenticatedUser> = requireUser): Promise<ApiUserResult> {
  try {
    return { ok: true, user: await loadUser() };
  } catch (error) {
    if (isRedirectError(error)) {
      return {
        ok: false,
        response: NextResponse.json(
          { ok: false, error: API_SESSION_EXPIRED_MESSAGE },
          { status: 401, headers: { "Cache-Control": "no-store" } },
        ),
      };
    }
    throw error;
  }
}
