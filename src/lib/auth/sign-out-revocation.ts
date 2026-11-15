import { decodeJwtExp } from "@/lib/auth-session";

/**
 * Server-side revocation of the auth session behind the cookie mirror.
 *
 * Why this exists: the app signs in on the server (and via the portal handoff), so the browser's own Supabase
 * client has no persisted session. `supabase.auth.signOut()` in the browser then has no access token to send, and
 * auth-js skips the `/logout` call entirely (GoTrueClient `_signOut`: `if (accessToken) { admin.signOut(...) }`).
 * The cookies were cleared but the auth session stayed live, so a copy of the cookie kept working until the
 * refresh token expired. The cookies are the only place this app holds the session, so revoking has to happen
 * on the server from the cookies, with the user's own tokens (no service role is involved).
 */

/**
 * `local` revokes only this session. The portal and Fitness share one auth session id, so the portal is signed out
 * too; the user's other devices (own sessions) stay signed in. Change to `global` to end every session of the user.
 */
export const SIGN_OUT_REVOCATION_SCOPE = "local" as const;

export const SIGN_OUT_REVOCATION_TIMEOUT_MS = 4000;

export type SignOutRevocationOutcome =
  /** The auth server accepted the logout for the session behind the cookies. */
  | "revoked"
  /** The auth server already considers the session or token gone; nothing was left to revoke. */
  | "already-invalid"
  /** No session cookies were sent. */
  | "no-session"
  /** Revocation could not be confirmed (network error, timeout, unexpected response). */
  | "failed";

type AuthErrorLike = { status?: number | null; name?: string | null; message?: string | null } | null | undefined;

export type SignOutRevocationClient = {
  auth: {
    admin: {
      signOut(jwt: string, scope: typeof SIGN_OUT_REVOCATION_SCOPE): Promise<{ error: unknown }>;
    };
    refreshSession(session: { refresh_token: string }): Promise<{
      data: { session: { access_token?: string | null } | null };
      error: unknown;
    }>;
  };
};

function isAlreadyInvalid(error: unknown) {
  const candidate = error as AuthErrorLike;
  if (!candidate) {
    return false;
  }

  const status = candidate.status;
  if (status === 400 || status === 401 || status === 403 || status === 404) {
    return true;
  }

  return (candidate.name ?? "") === "AuthSessionMissingError";
}

function isUnexpired(accessToken: string, nowSeconds: number) {
  const exp = decodeJwtExp(accessToken);
  return exp !== null && exp > nowSeconds + 5;
}

async function logout(client: SignOutRevocationClient, accessToken: string): Promise<SignOutRevocationOutcome> {
  const { error } = await client.auth.admin.signOut(accessToken, SIGN_OUT_REVOCATION_SCOPE);
  if (!error) {
    return "revoked";
  }

  return isAlreadyInvalid(error) ? "already-invalid" : "failed";
}

export async function revokeSessionBehindCookies(args: {
  accessToken?: string | null;
  refreshToken?: string | null;
  client: SignOutRevocationClient;
  nowSeconds?: number;
}): Promise<SignOutRevocationOutcome> {
  const accessToken = args.accessToken?.trim() ?? "";
  const refreshToken = args.refreshToken?.trim() ?? "";
  const nowSeconds = args.nowSeconds ?? Math.floor(Date.now() / 1000);

  if (!accessToken && !refreshToken) {
    return "no-session";
  }

  try {
    if (accessToken && isUnexpired(accessToken, nowSeconds)) {
      const outcome = await logout(args.client, accessToken);
      // A 401 for a still-unexpired JWT means the session is already gone; there is nothing to fall back to.
      if (outcome !== "failed" || !refreshToken) {
        return outcome;
      }
    }

    if (!refreshToken) {
      // An expired access token alone cannot reach `/logout`, and it cannot be used for anything else either.
      return "already-invalid";
    }

    // The access cookie is missing or expired: mint a fresh access token from the user's own refresh token, then
    // revoke the session it belongs to. A refresh the auth server refuses means the token is already revoked.
    const refreshed = await args.client.auth.refreshSession({ refresh_token: refreshToken });
    if (refreshed.error) {
      return isAlreadyInvalid(refreshed.error) ? "already-invalid" : "failed";
    }

    const freshAccessToken = refreshed.data.session?.access_token?.trim() ?? "";
    if (!freshAccessToken) {
      return "failed";
    }

    return await logout(args.client, freshAccessToken);
  } catch {
    return "failed";
  }
}

/** Runs the revocation but never lets it hold the sign-out response longer than `timeoutMs`. */
export async function revokeSessionBehindCookiesWithin(
  run: () => Promise<SignOutRevocationOutcome>,
  timeoutMs = SIGN_OUT_REVOCATION_TIMEOUT_MS,
): Promise<SignOutRevocationOutcome> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<SignOutRevocationOutcome>((resolve) => {
    timer = setTimeout(() => resolve("failed"), timeoutMs);
  });

  try {
    return await Promise.race([run().catch((): SignOutRevocationOutcome => "failed"), timeout]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
