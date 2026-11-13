import { decodeJwtClaims } from "@/lib/supabase/update-user";

// A password may be set from the reset page only by a session that was just created by a recovery link, never by a
// normal sign-in that happens to be cookie-valid. GoTrue records how a session was authenticated in the access
// token's `amr` claim: [{ method, timestamp }]. A recovery link verified through /auth/v1/verify yields method
// `recovery` (some GoTrue versions label email links `otp`, so both are accepted); a password sign-in yields
// `password`. A signed-in member changes the password with the current-password flow (changePasswordAction).
//
// Verified here: the claim shape is read from real decoded tokens in tests. Assumed, not checked against the live
// provider: that the verify redirect uses `recovery`/`otp` and that a token refresh keeps the original amr entries
// and timestamps (so a refreshed recovery session ages out of the window instead of renewing it).
export const RECOVERY_SESSION_WINDOW_SECONDS = 15 * 60;
const FUTURE_SKEW_SECONDS = 60;
const RECOVERY_AMR_METHODS = new Set(["recovery", "otp"]);

export type RecoverySessionEvaluation =
  | { ok: true; userId: string }
  | { ok: false; reason: "session_expired" | "not_recovery" };

export function evaluateRecoverySessionToken(
  accessToken: string | null | undefined,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): RecoverySessionEvaluation {
  const claims = decodeJwtClaims(accessToken);
  if (!claims) {
    return { ok: false, reason: "session_expired" };
  }
  if (typeof claims.exp !== "number" || claims.exp <= nowSeconds) {
    return { ok: false, reason: "session_expired" };
  }
  const userId = typeof claims.sub === "string" ? claims.sub : "";
  if (!userId || !Array.isArray(claims.amr)) {
    return { ok: false, reason: "not_recovery" };
  }

  let sawRecovery = false;
  for (const entry of claims.amr) {
    const record = typeof entry === "object" && entry !== null ? (entry as Record<string, unknown>) : {};
    if (typeof record.method !== "string" || !RECOVERY_AMR_METHODS.has(record.method)) continue;
    sawRecovery = true;
    const timestamp = record.timestamp;
    if (typeof timestamp === "number" && timestamp <= nowSeconds + FUTURE_SKEW_SECONDS && nowSeconds - timestamp <= RECOVERY_SESSION_WINDOW_SECONDS) {
      return { ok: true, userId };
    }
  }
  // A recovery session that is older than the window is an expired link; anything else is a normal session.
  return { ok: false, reason: sawRecovery ? "session_expired" : "not_recovery" };
}
