import { resolveLoginIdentifierEmail } from "./username-signin-index";

type ResetResult = "requested" | "rate_limited" | "send_failed";

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
