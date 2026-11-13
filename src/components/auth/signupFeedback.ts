import { NEW_PASSWORD_REQUIREMENT } from "@/lib/password-policy";
import { USERNAME_VALIDATION_MESSAGE } from "@/lib/username-policy";

// Sign-up feedback is code-based on purpose.
//
// 1. The identity provider's raw error text never reaches the screen. "User already registered" would confirm that
//    an address has an account; every provider failure collapses to one fixed sentence (same rule as the account
//    portal's `safeAuthError("signup")` and as the sign-in copy verified identical for existing and unknown
//    identifiers).
// 2. /signup never renders arbitrary `?error=` / `?info=` text. The URL carries one allow-listed code and the screen
//    owns the copy, so a crafted link cannot put attacker-chosen words in a toast on this origin.
//
// Keep this module free of server-only imports: the server action, the /signup page and the global toast bridge
// all read it.

export const SIGNUP_ERROR_COPY = {
  password_too_short: NEW_PASSWORD_REQUIREMENT,
  username_invalid: USERNAME_VALIDATION_MESSAGE,
  email_invalid: "Enter a valid email address.",
  // Usernames are public (shown on leaderboards), so naming this one is not a secret. Same sentence as the portal.
  username_taken: "That username is taken. Pick another one.",
  rate_limited: "Too many sign-up attempts. Please wait a few minutes and try again.",
  // One fixed sentence for every other failure (already registered, weak password, network, unknown).
  signup_failed:
    "We could not finish creating your account. If you already made one, sign in with it instead.",
} as const;

export const SIGNUP_INFO_COPY = {
  check_email: "Check your email to confirm your account.",
} as const;

export type SignupErrorCode = keyof typeof SIGNUP_ERROR_COPY;
export type SignupInfoCode = keyof typeof SIGNUP_INFO_COPY;

export const SIGNUP_ROUTE_ERROR_TOAST_ID = "signup-route-error";
export const SIGNUP_ROUTE_INFO_TOAST_ID = "signup-route-info";

export function isSignupErrorCode(value: unknown): value is SignupErrorCode {
  return typeof value === "string" && Object.hasOwn(SIGNUP_ERROR_COPY, value);
}

export function isSignupInfoCode(value: unknown): value is SignupInfoCode {
  return typeof value === "string" && Object.hasOwn(SIGNUP_INFO_COPY, value);
}

/** The only place a /signup redirect href is built, so an arbitrary string cannot be put in the query. */
export function buildSignupRedirectHref(args: { error: SignupErrorCode } | { info: SignupInfoCode }) {
  const params = new URLSearchParams();
  if ("error" in args) {
    params.set("error", args.error);
  } else {
    params.set("info", args.info);
  }
  return `/signup?${params.toString()}`;
}

/** Maps route codes to fixed copy. Anything that is not an allow-listed code resolves to nothing. */
export function resolveSignupRouteMessages(args: { errorCode?: unknown; infoCode?: unknown }) {
  return {
    error: isSignupErrorCode(args.errorCode) ? SIGNUP_ERROR_COPY[args.errorCode] : undefined,
    info: isSignupInfoCode(args.infoCode) ? SIGNUP_INFO_COPY[args.infoCode] : undefined,
  };
}

const RATE_LIMIT_CODES = new Set([
  "over_request_rate_limit",
  "over_email_send_rate_limit",
  "over_sms_send_rate_limit",
]);

// Shared account contract: the duplicate-username guard puts this machine code in the provider error. It looks at the
// provider's text fields only, never at the email, so an email-duplicate rejection can not turn into this message.
const USERNAME_TAKEN_MACHINE_CODE = "ACCOUNT_USERNAME_TAKEN";
const PROVIDER_TEXT_KEYS = ["message", "msg", "error", "error_description", "code", "details", "hint"] as const;

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function carriesUsernameTakenCode(record: Record<string, unknown>) {
  return PROVIDER_TEXT_KEYS.some((key) => {
    const value = record[key];
    return typeof value === "string" && value.includes(USERNAME_TAKEN_MACHINE_CODE);
  });
}

/**
 * Classifies a provider sign-up rejection into a safe code. The provider's message is read only to classify; it is
 * never returned. Rate limits and the public username guard get their own copy; every other rejection, including
 * "already registered", shares the one generic code.
 */
export function classifySignupProviderError(error: unknown): SignupErrorCode {
  const record = asRecord(error);
  if (carriesUsernameTakenCode(record)) {
    return "username_taken";
  }

  const code = typeof record.code === "string" ? record.code : "";
  const message = typeof record.message === "string" ? record.message.toLowerCase() : "";
  if (record.status === 429 || RATE_LIMIT_CODES.has(code) || message.includes("rate limit")) {
    return "rate_limited";
  }

  return "signup_failed";
}
