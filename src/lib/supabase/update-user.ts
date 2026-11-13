// Update the signed-in member's auth record (email, password, user metadata) with their access token.
//
// Why this exists: `supabase.auth.updateUser` reads its session from the client's own storage. The request-bound
// server client (`supabaseServerWithSession`) only forwards the access token as a bearer header, so on it `updateUser`
// fails with `AuthSessionMissingError` ("Auth session missing!") before any request is sent (since 595642d8 replaced
// the old `setSession` with the recovery layer). This helper makes the same `PUT /auth/v1/user` call the SDK makes,
// authorised by the access token alone.
//
// It deliberately never touches the refresh token: `setSession` would refresh a token with under ~90 s left and rotate
// the member's real refresh token without any way to write the new cookie. An expired or revoked access token simply
// returns `session_expired`. DEPENDENCY: authenticated routes (/account, /settings) rely on the middleware to keep the
// request's access token fresh (it refreshes within 60 s of expiry and forwards the new cookie to the action);
// /reset-password is a public authless path, so there the token is the recovery session as issued by the email link.
//
// The provider's message is never returned; callers map `reason` to fixed copy.

export type UserUpdateAttributes = {
  email?: string;
  password?: string;
  data?: Record<string, unknown>;
};

export type UserUpdateFailureReason =
  | "session_expired"
  | "rate_limited"
  | "same_password"
  | "weak_password"
  | "username_taken"
  | "failed";

export type UserUpdateResult =
  | { ok: true }
  | { ok: false; reason: UserUpdateFailureReason; code: string | null; status: number | null };

export type UserUpdateDeps = {
  supabaseUrl: string;
  anonKey: string;
  accessToken: string | null | undefined;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 10_000;
// Same header the SDK sends so the provider answers with the same error shapes.
const AUTH_API_VERSION = "2024-01-01";
const USERNAME_TAKEN_MACHINE_CODE = "ACCOUNT_USERNAME_TAKEN";
const RATE_LIMIT_CODES = new Set(["over_request_rate_limit", "over_email_send_rate_limit", "over_sms_send_rate_limit"]);
const SESSION_CODES = new Set(["bad_jwt", "no_authorization", "session_not_found", "session_expired", "user_not_found", "invalid_jwt"]);

/** Claims of a JWT access token WITHOUT verifying it (the provider verifies the token on the write). */
export function decodeJwtClaims(token: string | null | undefined): Record<string, unknown> | null {
  if (typeof token !== "string") return null;
  const parts = token.trim().split(".");
  if (parts.length !== 3 || !parts[1]) return null;
  const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`;
  try {
    const payload: unknown = JSON.parse(atob(padded));
    return typeof payload === "object" && payload !== null && !Array.isArray(payload) ? (payload as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function readProviderFailure(status: number, body: unknown): { reason: UserUpdateFailureReason; code: string | null } {
  const record = asRecord(body);
  const code =
    typeof record.error_code === "string" ? record.error_code : typeof record.code === "string" ? record.code : null;
  const text = ["msg", "message", "error", "error_description", "hint", "details"]
    .map((key) => (typeof record[key] === "string" ? (record[key] as string) : ""))
    .join(" ");
  const lowered = text.toLowerCase();

  if (text.includes(USERNAME_TAKEN_MACHINE_CODE)) {
    return { reason: "username_taken", code };
  }
  if (status === 429 || (code !== null && RATE_LIMIT_CODES.has(code)) || lowered.includes("rate limit")) {
    return { reason: "rate_limited", code };
  }
  if (code === "same_password") {
    return { reason: "same_password", code };
  }
  if (code === "weak_password") {
    return { reason: "weak_password", code };
  }
  if (status === 401 || (code !== null && SESSION_CODES.has(code)) || lowered.includes("jwt")) {
    return { reason: "session_expired", code };
  }
  return { reason: "failed", code };
}

export async function updateUserWithAccessToken(
  attributes: UserUpdateAttributes,
  deps: UserUpdateDeps,
): Promise<UserUpdateResult> {
  const accessToken = typeof deps.accessToken === "string" ? deps.accessToken.trim() : "";
  if (!accessToken) {
    return { ok: false, reason: "session_expired", code: "no_access_token", status: null };
  }
  // An undecodable or already-expired token cannot succeed: fail fast without a request.
  const claims = decodeJwtClaims(accessToken);
  if (!claims) {
    return { ok: false, reason: "session_expired", code: "undecodable_access_token", status: null };
  }
  if (typeof claims.exp === "number" && claims.exp <= Math.floor(Date.now() / 1000)) {
    return { ok: false, reason: "session_expired", code: "expired_access_token", status: null };
  }

  const body: UserUpdateAttributes = {};
  if (attributes.email !== undefined) body.email = attributes.email;
  if (attributes.password !== undefined) body.password = attributes.password;
  if (attributes.data !== undefined) body.data = attributes.data;
  if (Object.keys(body).length === 0) {
    return { ok: true };
  }

  const fetchImpl = deps.fetchImpl ?? fetch;
  const url = `${deps.supabaseUrl.replace(/\/+$/, "")}/auth/v1/user`;

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "PUT",
      headers: {
        apikey: deps.anonKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json;charset=UTF-8",
        "X-Supabase-Api-Version": AUTH_API_VERSION,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(deps.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
  } catch {
    // Network failure or timeout: nothing about the provider's state is known.
    return { ok: false, reason: "failed", code: null, status: null };
  }

  if (response.ok) {
    return { ok: true };
  }

  let parsed: unknown = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }
  const failure = readProviderFailure(response.status, parsed);
  return { ok: false, reason: failure.reason, code: failure.code, status: response.status };
}
