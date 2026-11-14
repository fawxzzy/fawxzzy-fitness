import { NEW_PASSWORD_REQUIREMENT } from "@/lib/password-policy";

// Login and reset-password route feedback is code-based on purpose (same rule as signupFeedback.ts).
//
// The URL carries one allow-listed code and the screen owns the copy, so a crafted link such as
// /login?error=<attacker words> or /reset-password?error=<attacker words> cannot put chosen text in a toast on this
// origin. An unknown code resolves to nothing.
//
// Keep this module free of server-only imports: server actions, route pages and client bridges all read it.

export const LOGIN_ERROR_COPY = {
  confirm_failed: "Could not verify your link. Please request a new one.",
  recovery_session_missing: "Your reset link expired. Please request a new one.",
  rate_limited: "Too many reset requests. Please wait a few minutes and try again.",
  send_failed: "Could not send reset email. Please try again in a few minutes.",
  session_expired: "Session refresh failed. Re-enter your password to continue.",
  identifier_required: "Enter your email or username to reset your password.",
  email_required: "Use your email to reset your password.",
} as const;

// Fixed sentences the sign-in action puts in /login?error= after a failed password sign-in
// (username-signin-index.ts owns the wording; auth-route-feedback.test.ts keeps this list identical to it). They are
// still an exact allow-list: any other text resolves to nothing.
export const LOGIN_FAILURE_MESSAGES: readonly string[] = [
  "Invalid email, username, or password",
  "Username sign-in is temporarily unavailable. Sign in with your email or try again in a moment.",
  "Invalid email, username, or password. Username sign-in is limited after several recent attempts, so try your email or wait a few minutes.",
  "Too many sign-in attempts. Please wait a few minutes and try again.",
  "Sign-in is temporarily unavailable. Please try again in a moment.",
  "Confirm your email address before signing in. Check your inbox for the confirmation link.",
];

export const LOGIN_INFO_COPY = {
  confirmed: "Email verified. You can log in now.",
  reset_requested: "Reset email sent. Check your inbox.",
} as const;

export const RESET_PASSWORD_ERROR_COPY = {
  password_requirement: NEW_PASSWORD_REQUIREMENT,
  passwords_must_match: "Passwords must match",
  session_expired: "Reset link expired. Request a new password reset.",
  not_recovery_session: "To change your password while signed in, use Account > Change password.",
  rate_limited: "Too many attempts. Please wait a few minutes and try again.",
  same_password: "Choose a new password that is different from your current one.",
  weak_password: "That password is too easy to guess. Choose a different one.",
  failed: "Could not update password. Please try again.",
} as const;

export type LoginErrorCode = keyof typeof LOGIN_ERROR_COPY;
export type LoginInfoCode = keyof typeof LOGIN_INFO_COPY;
export type ResetPasswordErrorCode = keyof typeof RESET_PASSWORD_ERROR_COPY;

function firstValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

export function isLoginErrorCode(value: unknown): value is LoginErrorCode {
  return typeof value === "string" && Object.hasOwn(LOGIN_ERROR_COPY, value);
}

export function isLoginInfoCode(value: unknown): value is LoginInfoCode {
  return typeof value === "string" && Object.hasOwn(LOGIN_INFO_COPY, value);
}

export function isResetPasswordErrorCode(value: unknown): value is ResetPasswordErrorCode {
  return typeof value === "string" && Object.hasOwn(RESET_PASSWORD_ERROR_COPY, value);
}

export function resolveLoginErrorCopy(code: unknown): string | undefined {
  const candidate = firstValue(code);
  if (isLoginErrorCode(candidate)) {
    return LOGIN_ERROR_COPY[candidate];
  }
  return typeof candidate === "string" && LOGIN_FAILURE_MESSAGES.includes(candidate) ? candidate : undefined;
}

export function resolveLoginInfoCopy(code: unknown): string | undefined {
  const candidate = firstValue(code);
  return isLoginInfoCode(candidate) ? LOGIN_INFO_COPY[candidate] : undefined;
}

export function resolveResetPasswordErrorCopy(code: unknown): string | undefined {
  const candidate = firstValue(code);
  return isResetPasswordErrorCode(candidate) ? RESET_PASSWORD_ERROR_COPY[candidate] : undefined;
}

export function buildResetPasswordErrorHref(code: ResetPasswordErrorCode) {
  return `/reset-password?error=${encodeURIComponent(code)}`;
}
