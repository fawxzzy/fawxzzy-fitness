// Auth Surface v2 copy matrix: the ONE source of every message an auth, account, install or error screen shows.
//
// Approved by Zac on 2026-11-15 (shared Fawxzzy copy matrix, Fitness subset). Screens never write message text
// themselves: they pick an id here and render it in the one reserved notice slot (AuthNoticeSlot). The lint test
// authMessages.test.ts fails when a screen file contains user-facing text that is neither a matrix message nor one of
// the fixed screen labels below.
//
// Route codes stay allow-listed in src/lib/auth-route-feedback.ts and src/components/auth/signupFeedback.ts; the
// mappers below turn those codes (or their fixed sentences) into matrix ids, so a crafted URL still cannot choose text.
import {
  LOGIN_ERROR_COPY,
  LOGIN_FAILURE_MESSAGES,
  LOGIN_INFO_COPY,
  LOGIN_UNKNOWN_ERROR_COPY,
  RESET_PASSWORD_ERROR_COPY,
  type LoginErrorCode,
  type ResetPasswordErrorCode,
} from "@/lib/auth-route-feedback";
import { SIGNUP_ERROR_COPY, SIGNUP_INFO_COPY, type SignupErrorCode } from "@/components/auth/signupFeedback";

export type AuthNoticeTone = "error" | "success" | "info";

export const AUTH_MESSAGES = {
  "signin.empty": { tone: "error", text: "Enter your email or username and your password." },
  "signin.wrong": { tone: "error", text: "Wrong email, username or password. Try again." },
  "signin.throttled": { tone: "error", text: "Too many attempts. Wait a few minutes, or sign in with your email." },
  "signin.unavailable": { tone: "error", text: "Sign-in is unavailable right now. Try again in a minute." },
  "signin.unconfirmed": { tone: "error", text: "Confirm your email first. Check your inbox for the link." },
  "signin.session": { tone: "error", text: "Your session ended. Sign in again to continue." },
  "signin.offline": { tone: "error", text: "No connection. Check your internet and try again." },
  "signin.confirmed": { tone: "success", text: "Email confirmed. Sign in to continue." },
  "signin.resetdone": { tone: "success", text: "Password saved. Sign in with your new password." },
  "signin.callback": { tone: "error", text: "We could not finish signing you in. Sign in again." },
  "signup.taken": { tone: "error", text: "That username is taken. Try another." },
  "signup.userinvalid": { tone: "error", text: "Use 2 to 15 letters, numbers, periods, underscores or hyphens." },
  "signup.emailinvalid": { tone: "error", text: "Enter a valid email address." },
  "signup.pwshort": { tone: "error", text: "Use at least 10 characters. A longer phrase works well." },
  "signup.pwweak": { tone: "error", text: "That password is too easy to guess. Try another." },
  "signup.rate": { tone: "error", text: "Too many sign-up attempts. Wait a few minutes and try again." },
  // Owner decision 2026-11-15 (same message as the account portal, Web #177): the email already has an account.
  "signup.emailexists": { tone: "error", text: "That email already has an account.", action: "Sign in" },
  "signup.sent": { tone: "success", text: "Check {e} for a link to confirm your account." },
  "reset.sent": { tone: "success", text: "Reset link sent to {e}. It expires in 1 hour." },
  // Web's canonical line for the signed-out username request (FawxzzyWeb copy-matrix `reset.sentuser`).
  "reset.sentany": { tone: "success", text: "If that username has an account, we sent a reset link to its email." },
  "reset.emailneeded": { tone: "error", text: "Use your email to reset your password." },
  "signin.linksent": { tone: "info", text: "Check your email for the sign-in link." },
  "reset.expired": { tone: "error", text: "That reset link expired. Send a new one." },
  "reset.invalid": { tone: "error", text: "That reset link is not valid. Send a new one." },
  "reset.rate": { tone: "error", text: "Too many reset requests. Wait a few minutes and try again." },
  "reset.sendfail": { tone: "error", text: "Could not send the email. Try again in a few minutes." },
  "reset.mismatch": { tone: "error", text: "The two passwords do not match." },
  "reset.same": { tone: "error", text: "Choose a password different from your current one." },
  "reset.savefail": { tone: "error", text: "Could not save your password. Try again." },
  "account.loadfail": { tone: "error", text: "Could not load your account. Try again.", action: "Retry" },
  "account.signoutfail": { tone: "error", text: "Could not sign out. Try again." },
  "page.crash": { tone: "error", text: "Check your connection and try again." },
  "page.offline": { tone: "error", text: "You are offline. We will reconnect when you are back." },
} as const satisfies Record<string, { tone: AuthNoticeTone; text: string; action?: string }>;

export type AuthMessageId = keyof typeof AUTH_MESSAGES;

export type AuthNotice = {
  id: AuthMessageId;
  tone: AuthNoticeTone;
  text: string;
  action?: string;
};

/** `j•••@icloud.com`: first character, three dots, then the domain. Never the full address. */
export function maskEmail(email: string | null | undefined): string {
  const value = String(email ?? "").trim();
  const at = value.lastIndexOf("@");
  if (at < 1) {
    return "your email";
  }
  return `${value.slice(0, 1)}•••${value.slice(at)}`;
}

/** Builds a notice from a matrix id. `{e}` is always the masked form of the email shown on that screen. */
export function authNotice(id: AuthMessageId, options: { email?: string | null } = {}): AuthNotice {
  const entry: { tone: AuthNoticeTone; text: string; action?: string } = AUTH_MESSAGES[id];
  return {
    id,
    tone: entry.tone,
    text: entry.text.replace("{e}", maskEmail(options.email)),
    ...(entry.action ? { action: entry.action } : {}),
  };
}

const LOGIN_ERROR_NOTICE: Record<LoginErrorCode | "unknown", AuthMessageId> = {
  confirm_failed: "signin.callback",
  recovery_session_missing: "reset.expired",
  rate_limited: "reset.rate",
  send_failed: "reset.sendfail",
  session_expired: "signin.session",
  identifier_required: "signup.userinvalid",
  // The username lookup has no server credential, so the reset by username cannot go out: say to use the email.
  email_required: "reset.emailneeded",
  unknown: "signin.callback",
};

// The fixed sign-in failure sentences (username-signin-index.ts), in LOGIN_FAILURE_MESSAGES order.
const LOGIN_FAILURE_NOTICE: readonly AuthMessageId[] = [
  "signin.wrong",
  "signin.unavailable",
  "signin.throttled",
  "signin.throttled",
  "signin.unavailable",
  "signin.unconfirmed",
];

/** Maps the already allow-listed /login `error` text (see resolveLoginRouteMessages) to a matrix id. */
export function loginErrorNoticeId(resolvedError: string | null | undefined): AuthMessageId | null {
  if (!resolvedError) {
    return null;
  }
  for (const [code, text] of Object.entries(LOGIN_ERROR_COPY) as [LoginErrorCode, string][]) {
    if (text === resolvedError) {
      return LOGIN_ERROR_NOTICE[code];
    }
  }
  if (resolvedError === LOGIN_UNKNOWN_ERROR_COPY) {
    return LOGIN_ERROR_NOTICE.unknown;
  }
  const failureIndex = LOGIN_FAILURE_MESSAGES.indexOf(resolvedError);
  if (failureIndex >= 0) {
    return LOGIN_FAILURE_NOTICE[failureIndex] ?? "signin.wrong";
  }
  return null;
}

/** Maps the already allow-listed /login `info` text to a matrix id. */
export function loginInfoNoticeId(resolvedInfo: string | null | undefined): AuthMessageId | null {
  if (resolvedInfo === LOGIN_INFO_COPY.confirmed) {
    return "signin.confirmed";
  }
  if (resolvedInfo === LOGIN_INFO_COPY.reset_requested) {
    return "reset.sentany";
  }
  if (resolvedInfo === LOGIN_INFO_COPY.magic_link_sent) {
    return "signin.linksent";
  }
  return null;
}

/** Reset request results (requestPasswordResetInline codes) to matrix ids. */
export function resetRequestNoticeId(code: string | null | undefined): AuthMessageId {
  if (code === "rate_limited") {
    return "reset.rate";
  }
  if (code === "identifier_required") {
    return "signup.userinvalid";
  }
  if (code === "email_required") {
    return "reset.emailneeded";
  }
  return "reset.sendfail";
}

const RESET_PASSWORD_ERROR_NOTICE: Record<ResetPasswordErrorCode, AuthMessageId> = {
  password_requirement: "signup.pwshort",
  passwords_must_match: "reset.mismatch",
  session_expired: "reset.expired",
  not_recovery_session: "reset.invalid",
  rate_limited: "reset.rate",
  same_password: "reset.same",
  weak_password: "signup.pwweak",
  failed: "reset.savefail",
};

/** Maps the already allow-listed /reset-password `error` text to a matrix id. */
export function resetPasswordErrorNoticeId(resolvedError: string | null | undefined): AuthMessageId | null {
  if (!resolvedError) {
    return null;
  }
  for (const [code, text] of Object.entries(RESET_PASSWORD_ERROR_COPY) as [ResetPasswordErrorCode, string][]) {
    if (text === resolvedError) {
      return RESET_PASSWORD_ERROR_NOTICE[code];
    }
  }
  return null;
}

// `email_exists` (provider machine code or the confirmation-on fake success) gets "That email already has an account."
// (owner decision 2026-11-15). `signup_failed` is the generic code (network, unknown): the portal shows its crash line
// (`page.crash`) for that case, so Fitness does too (copy identical to FawxzzyWeb src/lib/auth/copy-matrix.ts).
const SIGNUP_ERROR_NOTICE: Record<SignupErrorCode, AuthMessageId> = {
  password_too_short: "signup.pwshort",
  username_invalid: "signup.userinvalid",
  email_invalid: "signup.emailinvalid",
  username_taken: "signup.taken",
  rate_limited: "signup.rate",
  weak_password: "signup.pwweak",
  email_exists: "signup.emailexists",
  signup_failed: "page.crash",
};

/** Maps the already allow-listed /signup `error` text to a matrix id. */
export function signupErrorNoticeId(resolvedError: string | null | undefined): AuthMessageId | null {
  if (!resolvedError) {
    return null;
  }
  for (const [code, text] of Object.entries(SIGNUP_ERROR_COPY) as [SignupErrorCode, string][]) {
    if (text === resolvedError) {
      return SIGNUP_ERROR_NOTICE[code];
    }
  }
  return null;
}

export function isSignupCheckEmailInfo(resolvedInfo: string | null | undefined) {
  return resolvedInfo === SIGNUP_INFO_COPY.check_email;
}

/**
 * Fixed screen text that is not a message: kicker, titles, leads, field labels, buttons (idle / working / waiting),
 * links and install steps. Anything a screen shows must be one of these or a matrix message.
 */
export const AUTH_SCREEN_LABELS = [
  // Kicker and titles
  "Fitness",
  "Welcome",
  "Welcome back",
  "Create account",
  "Reset password",
  "New password",
  "Account",
  "Install Fitness",
  "Signing you in…",
  "Opening Fitness…",
  "Checking your account…",
  "Page not found",
  "Could not load",
  "You are offline",
  "Fitness is installed",
  // Leads
  "We will email a reset link to the address on your account.",
  "Choose a password of at least 10 characters.",
  "Using your Fawxzzy account.",
  "That page does not exist.",
  "Your account works in Fitness and Mazer.",
  "Add it to your home screen to use it as an app.",
  "Open this page in Safari to install.",
  "Install it for quick access, even offline.",
  "Open it from your home screen.",
  "Open this page in Safari, Chrome or Edge to install.",
  "Install it to use it as an app on this computer.",
  "This browser cannot install apps. Open this page in Chrome or Edge.",
  "This error did not sign you out.",
  // Accessible names (screen readers only)
  "Fitness account sign in",
  "Fitness account creation",
  "Fitness password reset",
  "Fitness password update",
  "Account links",
  "Legal",
  "More",
  "Menu",
  // Field labels
  "Email or username",
  "Password",
  "Username",
  "Email",
  "Confirm password",
  // Buttons
  "Sign in",
  "Send reset link",
  "Save password",
  "Sign out",
  "Try again",
  "Install",
  "Open Fitness",
  "Copy link",
  "Link copied",
  "Go to Today",
  "Not now",
  "Signing in…",
  "Creating account…",
  "Sending…",
  "Saving…",
  "Signing out…",
  "Resend in",
  // Links
  "Not you?",
  "Wrong email?",
  "Back to account",
  "Open the sign-in page",
  "Privacy",
  "Terms",
  // Install steps (icons sit between the words)
  "Tap Share",
  "in Safari.",
  "Choose Add to Home Screen",
  "Open the app from your home screen.",
  "Tap",
  "then Open in Safari.",
  ", then Add to Home Screen.",
  "in your browser.",
  "Choose Install app.",
  // Computer steps (the same words as Mazer's install copy)
  "Click the install icon at the end of the address bar.",
  "Choose Install.",
  "Open the app from your desktop or Start menu.",
  "Copy the link and open it in Chrome or Edge.",
  "Click the install icon in the address bar.",
] as const;

export const AUTH_FORBIDDEN_TEXT = [
  "Working…",
  "Working...",
  "Could not create account",
  "Something went wrong",
  "Wrong details",
  "Log In",
  "Log in",
  "Create Account",
  "Choose Sign in",
] as const;

export function formatResendCountdown(seconds: number) {
  const clamped = Math.max(0, Math.ceil(seconds));
  return `Resend in ${Math.floor(clamped / 60)}:${String(clamped % 60).padStart(2, "0")}`;
}
