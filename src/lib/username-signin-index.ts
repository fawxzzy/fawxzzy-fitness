import { createHash } from "node:crypto";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME = /^[a-z0-9._-]{2,15}$/;
const LEGACY_JWT = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

type ResolvedUser = { email?: string | null } | null;

export type UsernameLookupFailureCode = "resolver_unavailable" | "invalid_resolver_response" | "auth_user_unavailable";

const RESOLVER_TIMEOUT_MS = 5000;

export const LOGIN_INVALID_CREDENTIALS_MESSAGE = "Invalid email, username, or password";
export const LOGIN_USERNAME_UNAVAILABLE_MESSAGE =
  "Username sign-in is temporarily unavailable. Sign in with your email or try again in a moment.";
// The username resolver is rate limited per username (it counts successful sign-ins too) and a throttled
// lookup is deliberately indistinguishable from an unknown username. Say so without confirming anything.
export const LOGIN_USERNAME_NOT_RECOGNIZED_MESSAGE =
  "Invalid email, username, or password. Username sign-in is limited after several recent attempts, so try your email or wait a few minutes.";

/**
 * Maps a failed identifier-to-email resolution to the message shown on the login screen. Provider/infra
 * failures must not masquerade as bad credentials; everything else for a username stays non-enumerating.
 */
export function getLoginResolutionFailureMessage(args: {
  identifier: string;
  lookupFailure: UsernameLookupFailureCode | null;
}): string {
  // Only failures that happen before any user row is known (transport, timeout, 5xx, missing credential) may
  // say "unavailable". invalid_resolver_response and auth_user_unavailable occur only after the resolver
  // returned a row, i.e. only for an existing username, so they share the unknown-username copy.
  if (args.lookupFailure === "resolver_unavailable") return LOGIN_USERNAME_UNAVAILABLE_MESSAGE;
  return USERNAME.test(args.identifier) ? LOGIN_USERNAME_NOT_RECOGNIZED_MESSAGE : LOGIN_INVALID_CREDENTIALS_MESSAGE;
}

export const LOGIN_RATE_LIMITED_MESSAGE = "Too many sign-in attempts. Please wait a few minutes and try again.";
export const LOGIN_PROVIDER_UNAVAILABLE_MESSAGE = "Sign-in is temporarily unavailable. Please try again in a moment.";
export const LOGIN_EMAIL_NOT_CONFIRMED_MESSAGE = "Confirm your email address before signing in. Check your inbox for the confirmation link.";

/** The subset of a Supabase AuthError that classification may read. Message text is deliberately not part of it. */
export type LoginProviderError = { code?: string | null; status?: number | null } | null | undefined;

/**
 * Maps a failed password sign-in (after the identifier resolved to an email) to the message shown on the login
 * screen. Credential failures must be indistinguishable from an unresolved identifier of the same shape, so a
 * username never reveals whether it exists. Classification uses the provider's error code/status only, never the
 * message text, and the raw provider message is never returned.
 *
 * Only these outcomes keep distinct copy: email_not_confirmed (reported after the password verified), 429 or a
 * rate-limit code, and transport/5xx/unknown failures (no 4xx status and no recognised credential code). Every
 * other client error is treated as a credential failure. In particular GoTrue checks a banned account before it
 * checks the password and answers `user_banned`, so that code must read as bad credentials, never as an outage.
 */
export function getLoginSignInFailureMessage(args: { identifier: string; error: LoginProviderError }): string {
  const code = args.error?.code ?? null;
  const status = args.error?.status ?? null;
  if (code === "email_not_confirmed") return LOGIN_EMAIL_NOT_CONFIRMED_MESSAGE;
  if (status === 429 || (code !== null && code.includes("rate_limit"))) return LOGIN_RATE_LIMITED_MESSAGE;
  const isClientError = status !== null && status >= 400 && status < 500;
  const isKnownCredentialCode = code === "invalid_credentials" || code === "user_not_found" || code === "user_banned";
  if (!isClientError && !isKnownCredentialCode) return LOGIN_PROVIDER_UNAVAILABLE_MESSAGE;
  return USERNAME.test(args.identifier) ? LOGIN_USERNAME_NOT_RECOGNIZED_MESSAGE : LOGIN_INVALID_CREDENTIALS_MESSAGE;
}

export async function resolveLoginIdentifierEmail(
  identifier: string,
  resolveUsername: (username: string) => Promise<string | null>,
): Promise<string | null> {
  if (EMAIL.test(identifier)) return identifier;
  return USERNAME.test(identifier) ? resolveUsername(identifier) : null;
}

export async function resolveUsernameEmailFromIndex(args: {
  identifier: string;
  clientAddress: string;
  supabaseUrl: string;
  serviceCredential: string;
  getUserById: (id: string) => Promise<ResolvedUser>;
  fetchImpl?: typeof fetch;
  onLookupFailure?: (code: UsernameLookupFailureCode) => void;
}): Promise<string | null> {
  if (!USERNAME.test(args.identifier)) return null;
  const modernSecret = args.serviceCredential.startsWith("sb_secret_");
  if (!modernSecret && !LEGACY_JWT.test(args.serviceCredential)) return null;
  const digest = (value: string) => createHash("sha256").update(value).digest("hex");
  const fetchImpl = args.fetchImpl ?? fetch;

  const requestInit: RequestInit = {
    method: "POST",
    redirect: "error",
    headers: {
      Accept: "application/json",
      "Accept-Profile": "account_api",
      apikey: args.serviceCredential,
      ...(modernSecret ? {} : { Authorization: `Bearer ${args.serviceCredential}` }),
      "Content-Type": "application/json",
      "Content-Profile": "account_api",
    },
    body: JSON.stringify({
      p_normalized_username: args.identifier,
      p_attempt_key: digest(`username:${args.identifier}`),
      p_client_attempt_key: digest(`client:${args.clientAddress}`),
    }),
  };
  const resolverUrl = new URL("/rest/v1/rpc/account_resolve_username_signin_v2", args.supabaseUrl);

  try {
    // Deliberately a single bounded attempt, never retried: the RPC counts every call against a per-username
    // limit (10 per 15 minutes), and after a timeout or lost response the caller cannot tell whether the RPC
    // already ran, so a retry could burn a second attempt. A failure is reported as "unavailable" instead.
    let response: Response | null;
    try {
      response = await fetchImpl(resolverUrl, { ...requestInit, signal: AbortSignal.timeout(RESOLVER_TIMEOUT_MS) });
    } catch {
      response = null;
    }
    if (!response || !response.ok) {
      args.onLookupFailure?.("resolver_unavailable");
      return null;
    }

    const rows: unknown = await response.json();
    if (!Array.isArray(rows)) {
      args.onLookupFailure?.("invalid_resolver_response");
      return null;
    }
    // An empty result covers both unknown and ambiguous identifiers. Keep that private.
    if (rows.length !== 1) return null;
    const id = rows[0]?.resolved_user_id;
    if (typeof id !== "string" || !UUID.test(id)) {
      args.onLookupFailure?.("invalid_resolver_response");
      return null;
    }

    // A throw here happens only after the resolver returned a row (an existing username), so it must report the
    // post-row code that shares the unknown-username copy, never resolver_unavailable.
    let email: string | undefined;
    try {
      email = (await args.getUserById(id))?.email?.trim().toLowerCase();
    } catch {
      args.onLookupFailure?.("auth_user_unavailable");
      return null;
    }
    if (!email || !EMAIL.test(email)) {
      args.onLookupFailure?.("auth_user_unavailable");
      return null;
    }
    return email;
  } catch {
    args.onLookupFailure?.("resolver_unavailable");
    return null;
  }
}
