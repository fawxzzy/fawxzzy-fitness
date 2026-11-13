// FP-MAN-012: new passwords match the shared account portal minimum.
// Passwords are opaque: never trim, normalize, truncate or coerce them.
export const NEW_PASSWORD_MINIMUM = 10;
export const NEW_PASSWORD_REQUIREMENT = `Use at least ${NEW_PASSWORD_MINIMUM} characters. Longer passphrases are welcome.`;

export function isValidNewPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= NEW_PASSWORD_MINIMUM;
}

// FF-ACCOUNT-003: changing the password while signed in (Settings > Account).
// Same new-password rule as sign-up and reset, plus proof of the current password. Every outcome is a code with fixed
// copy, so the provider's message never reaches the screen.
export const CHANGE_PASSWORD_COPY = {
  current_missing: "Enter your current password.",
  new_too_short: NEW_PASSWORD_REQUIREMENT,
  confirmation_mismatch: "New passwords must match.",
  same_password: "Choose a new password that is different from your current one.",
  current_incorrect: "Your current password is not correct.",
  password_rejected: "That password is too easy to guess. Choose a different one.",
  rate_limited: "Too many attempts. Please wait a few minutes and try again.",
  update_failed: "We could not update your password. Please try again in a few minutes.",
} as const;

export type ChangePasswordProblem = keyof typeof CHANGE_PASSWORD_COPY;

export const CHANGE_PASSWORD_SUCCESS_MESSAGE = "Password updated.";

export type ChangePasswordInput =
  | { ok: true; current: string; next: string }
  | { ok: false; problem: ChangePasswordProblem };

/** Exact-match comparisons only: passwords are opaque, so nothing is trimmed, normalised or coerced. */
export function validateChangePasswordInput(input: {
  current: unknown;
  next: unknown;
  confirmation: unknown;
}): ChangePasswordInput {
  const { current, next, confirmation } = input;
  if (typeof current !== "string" || current.length === 0) {
    return { ok: false, problem: "current_missing" };
  }
  if (!isValidNewPassword(next)) {
    return { ok: false, problem: "new_too_short" };
  }
  if (confirmation !== next) {
    return { ok: false, problem: "confirmation_mismatch" };
  }
  if (next === current) {
    return { ok: false, problem: "same_password" };
  }
  return { ok: true, current, next };
}

function readProviderError(error: unknown) {
  const record = typeof error === "object" && error !== null ? (error as Record<string, unknown>) : {};
  return {
    code: typeof record.code === "string" ? record.code : "",
    status: record.status,
    message: typeof record.message === "string" ? record.message.toLowerCase() : "",
  };
}

/**
 * Maps a provider rejection to a safe code. `verify` is the current-password check, `update` is the password write.
 * The provider's message is read only to classify; it is never returned.
 */
export function classifyChangePasswordProviderError(stage: "verify" | "update", error: unknown): ChangePasswordProblem {
  const { code, status, message } = readProviderError(error);
  if (status === 429 || code === "over_request_rate_limit" || code === "over_email_send_rate_limit" || message.includes("rate limit")) {
    return "rate_limited";
  }
  if (stage === "verify") {
    return code === "invalid_credentials" ? "current_incorrect" : "update_failed";
  }
  if (code === "same_password") {
    return "same_password";
  }
  if (code === "weak_password") {
    return "password_rejected";
  }
  return "update_failed";
}
