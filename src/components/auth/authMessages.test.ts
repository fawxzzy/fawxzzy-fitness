import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { LOGIN_ERROR_COPY, LOGIN_FAILURE_MESSAGES, LOGIN_INFO_COPY, RESET_PASSWORD_ERROR_COPY } from "@/lib/auth-route-feedback";
import { SIGNUP_ERROR_COPY } from "@/components/auth/signupFeedback";
import { AUTH_MODE_COPY, PASSWORD_LOGIN_UI_COPY } from "@/components/auth/authCopy";
import {
  AUTH_FORBIDDEN_TEXT,
  AUTH_MESSAGES,
  AUTH_SCREEN_LABELS,
  authNotice,
  formatResendCountdown,
  loginErrorNoticeId,
  loginInfoNoticeId,
  maskEmail,
  resetPasswordErrorNoticeId,
  resetRequestNoticeId,
  signupErrorNoticeId,
} from "./authMessages.ts";

// Auth Surface v2 copy lint (Zac 2026-11-15): every word an auth, account, install or error screen shows is either a
// copy-matrix message (AUTH_MESSAGES) or a fixed screen label (AUTH_SCREEN_LABELS). New text fails here until it is
// added to the matrix on purpose.
const SCREEN_FILES = [
  "../../app/login/LoginScreen.tsx",
  "../../app/login/AccountPortalRedirect.tsx",
  "../../app/forgot-password/ForgotPasswordFormClient.tsx",
  "../../app/reset-password/ResetPasswordForm.tsx",
  "../../app/reset-password/page.tsx",
  "./SignupForm.tsx",
  "./AuthShell.tsx",
  "../install/InstallGateChrome.tsx",
];
// The not-found page and app-error screen take their words from src/components/error/errorCopy.ts (FF-DESIGN-004,
// pinned by errorScreens.contract.test.tsx), so they are outside this matrix until one copy source is chosen.

const read = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), "utf8");
const allowed = new Set<string>([
  ...AUTH_SCREEN_LABELS,
  ...Object.values(AUTH_MESSAGES).flatMap((entry) => ("action" in entry ? [entry.text, entry.action] : [entry.text])),
]);

function stripComments(source: string) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1").replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "");
}

/** Visible text: JSX text nodes plus the string props that render as words. */
function visibleStrings(source: string) {
  const code = stripComments(source);
  const found: string[] = [];
  // JSX text between a closing `>` and the next `<` or `{`, on tags only (not arrows or generics).
  for (const match of code.matchAll(/<\/?[A-Za-z][\w.]*(?:\s[^<>]*?)?>([^<>{}]+)(?=[<{])/g)) {
    const text = match[1].replace(/\s+/g, " ").trim();
    if (text && /[A-Za-z]/.test(text) && !/[;=(){}]|\?\s|^[):]/.test(text) && !/^[\w.]+\)?;?$/.test(text) && !text.includes("=>")) {
      found.push(text);
    }
  }
  for (const match of code.matchAll(/\b(?:title|lead|label|busyLabel|placeholder|aria-label|loadingLabel)=(?:"([^"]+)"|\{"([^"]+)"\})/g)) {
    found.push(match[1] ?? match[2]);
  }
  for (const match of code.matchAll(/\b(?:title|lead|label|busyLabel)=\{[^}]*\?\s*"([^"]+)"\s*:\s*"([^"]+)"\s*\}/g)) {
    found.push(match[1], match[2]);
  }
  return found;
}

test("every screen shows only copy-matrix messages or fixed screen labels", () => {
  const unknown: string[] = [];
  for (const file of SCREEN_FILES) {
    for (const text of visibleStrings(read(file))) {
      if (!allowed.has(text)) {
        unknown.push(`${file}: ${JSON.stringify(text)}`);
      }
    }
  }
  assert.deepEqual(unknown, [], "add new text to authMessages.ts on purpose, or use a matrix id");
});

test("shared copy constants a screen renders are matrix labels too", () => {
  const unknown: string[] = [];
  let resolved = 0;
  for (const file of SCREEN_FILES) {
    const source = stripComments(read(file));
    for (const match of source.matchAll(/PASSWORD_LOGIN_UI_COPY\.([\w.]+)/g)) {
      const value = match[1].split(".").reduce<unknown>((node, key) => (node as Record<string, unknown>)?.[key], PASSWORD_LOGIN_UI_COPY);
      if (typeof value === "string" && value) {
        resolved += 1;
        if (!allowed.has(value)) unknown.push(`${file}: PASSWORD_LOGIN_UI_COPY.${match[1]} = ${JSON.stringify(value)}`);
      }
    }
    for (const match of source.matchAll(/AUTH_MODE_COPY\["([\w-]+)"\]\.title/g)) {
      const value = AUTH_MODE_COPY[match[1] as keyof typeof AUTH_MODE_COPY].title;
      resolved += 1;
      if (!allowed.has(value)) unknown.push(`${file}: AUTH_MODE_COPY.${match[1]}.title = ${JSON.stringify(value)}`);
    }
  }
  assert.ok(resolved > 0);
  assert.deepEqual(unknown, []);
});

test("the lint actually reads text from the screens (no vacuous pass)", () => {
  const login = visibleStrings(read("../../app/login/LoginScreen.tsx"));
  const install = visibleStrings(read("../install/InstallGateChrome.tsx"));
  assert.ok(login.length >= 3, `login strings: ${JSON.stringify(login)}`);
  assert.ok(install.includes("Install Fitness"), `install strings: ${JSON.stringify(install)}`);
  assert.equal(visibleStrings('<p className="x">Something brand new</p>').includes("Something brand new"), true);
  assert.equal(allowed.has("Something brand new"), false);
});

test("retired wording never comes back on a screen", () => {
  for (const file of [...SCREEN_FILES, "../ActionFeedbackToasts.tsx", "../../app/global-error.tsx"]) {
    const source = stripComments(read(file));
    for (const phrase of AUTH_FORBIDDEN_TEXT) {
      assert.ok(!source.includes(`"${phrase}"`) && !source.includes(`>${phrase}<`), `${file} contains ${phrase}`);
    }
  }
});

test("messages only render through the one notice slot; screens never inline matrix text", () => {
  for (const file of SCREEN_FILES.filter((f) => !f.endsWith("AuthShell.tsx"))) {
    const source = stripComments(read(file));
    for (const entry of Object.values(AUTH_MESSAGES)) {
      assert.ok(!source.includes(entry.text.split("{e}")[0].slice(0, 24)), `${file} inlines "${entry.text}"`);
    }
  }
});

test("every allow-listed route code maps to a matrix message, so no screen falls back to raw text", () => {
  for (const text of Object.values(LOGIN_ERROR_COPY)) {
    assert.ok(loginErrorNoticeId(text), text);
  }
  for (const text of LOGIN_FAILURE_MESSAGES) {
    assert.ok(loginErrorNoticeId(text), text);
  }
  assert.equal(loginErrorNoticeId(LOGIN_FAILURE_MESSAGES[0]), "signin.wrong");
  assert.equal(loginInfoNoticeId(LOGIN_INFO_COPY.confirmed), "signin.confirmed");
  assert.equal(loginInfoNoticeId(LOGIN_INFO_COPY.reset_requested), "reset.sentany");
  for (const text of Object.values(RESET_PASSWORD_ERROR_COPY)) {
    assert.ok(resetPasswordErrorNoticeId(text), text);
  }
  assert.equal(resetPasswordErrorNoticeId(RESET_PASSWORD_ERROR_COPY.session_expired), "reset.expired");
  for (const text of Object.values(SIGNUP_ERROR_COPY)) {
    assert.ok(signupErrorNoticeId(text), text);
  }
  assert.equal(signupErrorNoticeId(SIGNUP_ERROR_COPY.username_taken), "signup.taken");
  assert.equal(resetRequestNoticeId("rate_limited"), "reset.rate");
  assert.equal(resetRequestNoticeId("anything"), "reset.sendfail");
  // No server credential for a username lookup: the portal's "could not send" line (FawxzzyWeb copy-matrix parity).
  assert.equal(resetRequestNoticeId("email_required"), "reset.sendfail");
  assert.equal(loginErrorNoticeId(LOGIN_ERROR_COPY.email_required), "reset.sendfail");
  // The generic sign-up failure shows the portal's crash line and never claims the email has an account; that case
  // has its own message (owner decision 2026-11-15, Web #177 parity).
  assert.equal(signupErrorNoticeId(SIGNUP_ERROR_COPY.signup_failed), "page.crash");
  assert.doesNotMatch(AUTH_MESSAGES["page.crash"].text, /sign-in|already|exists|registered/i);
  assert.equal(signupErrorNoticeId(SIGNUP_ERROR_COPY.email_exists), "signup.emailexists");
  assert.equal(AUTH_MESSAGES["signup.emailexists"].text, "That email already has an account.");
  assert.equal(AUTH_MESSAGES["signup.emailexists"].action, "Sign in");
  assert.equal(signupErrorNoticeId(SIGNUP_ERROR_COPY.weak_password), "signup.pwweak");
});

test("crafted query text never selects a message", () => {
  for (const hostile of ["<script>alert(1)</script>", "Call 555-0100", "constructor", "__proto__", "", null, undefined]) {
    assert.equal(loginErrorNoticeId(hostile as string), null);
    assert.equal(loginInfoNoticeId(hostile as string), null);
    assert.equal(resetPasswordErrorNoticeId(hostile as string), null);
    assert.equal(signupErrorNoticeId(hostile as string), null);
  }
});

test("emails are always masked in messages and the masked form never leaks the local part", () => {
  assert.equal(maskEmail("jordan@icloud.com"), "j•••@icloud.com");
  assert.equal(maskEmail("  a@b.co "), "a•••@b.co");
  assert.equal(maskEmail("not-an-email"), "your email");
  assert.equal(maskEmail("@nolocal.com"), "your email");
  assert.equal(maskEmail(null), "your email");
  const notice = authNotice("reset.sent", { email: "jordan@icloud.com" });
  assert.equal(notice.text, "Reset link sent to j•••@icloud.com. It expires in 1 hour.");
  assert.ok(!notice.text.includes("jordan"));
  assert.equal(authNotice("account.loadfail").action, "Retry");
  assert.equal(authNotice("signin.wrong").tone, "error");
  assert.equal(formatResendCountdown(65), "Resend in 1:05");
  assert.equal(formatResendCountdown(-3), "Resend in 0:00");
});

test("matrix text is plain sentence case with no exclamation marks or ellipses", () => {
  for (const [id, entry] of Object.entries(AUTH_MESSAGES)) {
    assert.match(entry.text, /^[A-Z]/, id);
    assert.match(entry.text, /[.]$/, id);
    assert.doesNotMatch(entry.text, /!|\.\.\.|…/, id);
  }
});
