import { createHash } from "node:crypto";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME = /^[a-z0-9._-]{2,15}$/;
const LEGACY_JWT = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

type ResolvedUser = { email?: string | null } | null;

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
  onLookupFailure?: (code: "resolver_unavailable" | "invalid_resolver_response" | "auth_user_unavailable") => void;
}): Promise<string | null> {
  if (!USERNAME.test(args.identifier)) return null;
  const modernSecret = args.serviceCredential.startsWith("sb_secret_");
  if (!modernSecret && !LEGACY_JWT.test(args.serviceCredential)) return null;
  const digest = (value: string) => createHash("sha256").update(value).digest("hex");
  const fetchImpl = args.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(new URL("/rest/v1/rpc/account_resolve_username_signin_v2", args.supabaseUrl), {
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
    });
    if (!response.ok) {
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

    const email = (await args.getUserById(id))?.email?.trim().toLowerCase();
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
