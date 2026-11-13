import { resolveLoginIdentifierEmail } from "./username-signin-index";

type ResetResult = "requested" | "rate_limited" | "send_failed";

// Where a reset email started from Fitness sends the person back: Fitness's own /reset-password page, whose
// RecoverySessionBridge reads the implicit-flow tokens from the URL fragment (supabase-js' default flow for the server
// client that requests the reset).
//
// Do NOT point this at the account portal's recovery URL (https://account.fawxzzy.com/reset-password?recovery=1&app=fitness).
// That page accepts only a PKCE `code` exchanged with a code verifier its own browser stored (parseRecoveryPayload
// rejects any URL fragment and any token_hash), so a link requested here would land on "Recovery link invalid."
// The URL below must also be an exact entry on the Supabase Auth redirect allow-list (a Dashboard setting); until it
// is listed Supabase falls back to the site URL.
export const FITNESS_RECOVERY_PATH = "/reset-password?recovery=1";

export function buildFitnessRecoveryRedirectUrl(origin: string) {
  return `${origin.replace(/\/+$/, "")}${FITNESS_RECOVERY_PATH}`;
}

export async function requestResetForIdentifier(args: {
  identifier: string;
  resolveUsername: (username: string) => Promise<string | null>;
  sendReset: (email: string) => Promise<{ error?: { message?: string } | null }>;
  onSendError?: (code: Exclude<ResetResult, "requested">) => void;
}): Promise<ResetResult> {
  const email = await resolveLoginIdentifierEmail(args.identifier, args.resolveUsername);
  // An unknown, ambiguous, or temporarily unavailable identity has the same public response.
  if (!email) return "requested";

  const { error } = await args.sendReset(email);
  if (!error) return "requested";
  const code = error.message?.toLowerCase().includes("rate limit") ? "rate_limited" : "send_failed";
  args.onSendError?.(code);
  return code;
}
