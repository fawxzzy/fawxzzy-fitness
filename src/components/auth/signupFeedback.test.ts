import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { NEW_PASSWORD_REQUIREMENT } from "@/lib/password-policy";
import { USERNAME_VALIDATION_MESSAGE } from "@/lib/username-policy";
import {
  buildSignupRedirectHref,
  classifySignupProviderError,
  isExistingAccountSignupResponse,
  isSignupErrorCode,
  resolveSignupRouteMessages,
  SIGNUP_ERROR_COPY,
  SIGNUP_INFO_COPY,
} from "./signupFeedback.ts";
import {
  forgetStashedRememberedLogin,
  restoreRememberedLoginAfterFailedSignup,
  stashRememberedLoginBeforeSignup,
} from "./signupRememberedLogin.ts";
import { readRememberedLoginState, writeRememberedLoginState } from "@/lib/remembered-login";

const read = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), "utf8");

test("the error-code table is the small fixed allow-list, with the shared password and username rules as copy", () => {
  assert.deepEqual(Object.keys(SIGNUP_ERROR_COPY).sort(), [
    "email_exists",
    "email_invalid",
    "password_too_short",
    "rate_limited",
    "signup_failed",
    "username_invalid",
    "username_taken",
    "weak_password",
  ]);
  assert.deepEqual(Object.keys(SIGNUP_INFO_COPY), ["check_email"]);
  assert.equal(SIGNUP_ERROR_COPY.password_too_short, NEW_PASSWORD_REQUIREMENT);
  assert.match(NEW_PASSWORD_REQUIREMENT, /at least 10 characters/);
  assert.equal(SIGNUP_ERROR_COPY.username_invalid, USERNAME_VALIDATION_MESSAGE);
  assert.match(USERNAME_VALIDATION_MESSAGE, /2-15 characters/);
});

test("route messages resolve only allow-listed codes; arbitrary query text renders nothing", () => {
  assert.deepEqual(resolveSignupRouteMessages({ errorCode: "signup_failed", infoCode: "check_email" }), {
    error: SIGNUP_ERROR_COPY.signup_failed,
    info: SIGNUP_INFO_COPY.check_email,
  });
  for (const hostile of [
    "Your account is locked. Call 555-0100 to unlock it.",
    "User already registered",
    "<script>alert(1)</script>",
    "",
    "SIGNUP_FAILED",
    " signup_failed",
    "constructor",
    "__proto__",
    "toString",
    "hasOwnProperty",
    ["signup_failed"],
    { signup_failed: true },
    42,
    null,
    undefined,
  ]) {
    assert.deepEqual(
      resolveSignupRouteMessages({ errorCode: hostile, infoCode: hostile }),
      { error: undefined, info: undefined },
      `must not resolve: ${JSON.stringify(hostile)}`,
    );
    assert.equal(isSignupErrorCode(hostile), false);
  }
});

test("redirect hrefs carry exactly one allow-listed code and nothing else", () => {
  assert.equal(buildSignupRedirectHref({ error: "password_too_short" }), "/signup?error=password_too_short");
  assert.equal(buildSignupRedirectHref({ info: "check_email" }), "/signup?info=check_email");
});

// Owner decision 2026-11-15 (Web #177 parity): an email that already has an account gets its own code, decided by
// the provider's machine code only. Message text alone, however explicit, still falls to the generic code.
test("a provider rejection never turns into text from the provider; an existing email is decided by machine code only", () => {
  const providerMessages = [
    "User already registered",
    "A user with this email address has already been registered",
    "Password should contain at least one character of each",
    "Database error saving new user",
    "Signups not allowed for this instance",
  ];
  for (const message of providerMessages) {
    for (const extra of [{}, { status: 500 }, { status: 422 }]) {
      const code = classifySignupProviderError({ message, ...extra });
      assert.equal(code, "signup_failed", `${message} ${JSON.stringify(extra)}`);
      assert.ok(!SIGNUP_ERROR_COPY[code].toLowerCase().includes("already registered"));
      assert.ok(!SIGNUP_ERROR_COPY[code].toLowerCase().includes("email address"));
    }
    for (const extra of [{ code: "user_already_exists", status: 422 }, { code: "email_exists", status: 422 }]) {
      assert.equal(classifySignupProviderError({ message, ...extra }), "email_exists", `${message} ${JSON.stringify(extra)}`);
    }
  }
  assert.equal(SIGNUP_ERROR_COPY.email_exists, "That email already has an account.");
  assert.equal(buildSignupRedirectHref({ error: "email_exists" }), "/signup?error=email_exists");
  assert.equal(classifySignupProviderError(null), "signup_failed");
  assert.equal(classifySignupProviderError(undefined), "signup_failed");
  assert.equal(classifySignupProviderError({}), "signup_failed");
});

test("rate limits and the public username guard get their own safe codes", () => {
  assert.equal(classifySignupProviderError({ status: 429, message: "anything" }), "rate_limited");
  assert.equal(classifySignupProviderError({ code: "over_request_rate_limit", status: 429 }), "rate_limited");
  assert.equal(classifySignupProviderError({ code: "over_email_send_rate_limit" }), "rate_limited");
  assert.equal(classifySignupProviderError({ message: "email rate limit exceeded" }), "rate_limited");
  assert.equal(classifySignupProviderError({ message: "duplicate key ACCOUNT_USERNAME_TAKEN" }), "username_taken");
  assert.equal(classifySignupProviderError({ details: "ACCOUNT_USERNAME_TAKEN", status: 409 }), "username_taken");
  // An email-duplicate rejection must not read as a username problem.
  assert.equal(classifySignupProviderError({ code: "user_already_exists", message: "User already registered" }), "email_exists");
  // Rate limits still win over an existing-email code, so the captcha/rate-limit path is unchanged.
  assert.equal(classifySignupProviderError({ code: "user_already_exists", status: 429 }), "rate_limited");
});

test("the provider's weak-password code gets its own safe code; message text alone never decides it", () => {
  assert.equal(classifySignupProviderError({ code: "weak_password", status: 422, message: "Password is known to be weak" }), "weak_password");
  assert.equal(classifySignupProviderError({ message: "Password is known to be weak and easy to guess" }), "signup_failed");
  assert.equal(SIGNUP_ERROR_COPY.weak_password, "That password is too easy to guess. Try another.");
  assert.equal(buildSignupRedirectHref({ error: "weak_password" }), "/signup?error=weak_password");
});

test("the confirmation-on fake success (user with no identities, no session) reads as an existing email", () => {
  assert.equal(isExistingAccountSignupResponse({ user: { id: "x", identities: [] }, session: null }), true);
  // A real new account has one identity; a signed-in result has a session; anything malformed is not a match.
  assert.equal(isExistingAccountSignupResponse({ user: { id: "x", identities: [{ provider: "email" }] }, session: null }), false);
  assert.equal(isExistingAccountSignupResponse({ user: { id: "x", identities: [] }, session: { access_token: "t" } }), false);
  assert.equal(isExistingAccountSignupResponse({ user: { id: "x" }, session: null }), false);
  assert.equal(isExistingAccountSignupResponse({ user: null, session: null }), false);
  for (const value of [null, undefined, {}, "x", 42, []]) {
    assert.equal(isExistingAccountSignupResponse(value), false, JSON.stringify(value));
  }
});

function memoryStore() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    map,
  };
}

test("a failed sign-up does not leave its address as the remembered login", () => {
  const local = memoryStore();
  const session = memoryStore();
  // No remembered login before the attempt: a failure clears the one the attempt wrote.
  stashRememberedLoginBeforeSignup({ local, session });
  writeRememberedLoginState({ email: "new@example.com", displayName: "newbie" }, local);
  restoreRememberedLoginAfterFailedSignup({ local, session });
  assert.equal(readRememberedLoginState(local), null);
  assert.equal(session.map.size, 0);

  // An earlier remembered login is put back on failure.
  writeRememberedLoginState({ email: "old@example.com", displayName: "oldie", sessionState: "ready" }, local);
  stashRememberedLoginBeforeSignup({ local, session });
  writeRememberedLoginState({ email: "new@example.com", displayName: "newbie" }, local);
  restoreRememberedLoginAfterFailedSignup({ local, session });
  assert.equal(readRememberedLoginState(local)?.email, "old@example.com");
  assert.equal(readRememberedLoginState(local)?.sessionState, "ready");

  // A success keeps the new address and drops the stash.
  stashRememberedLoginBeforeSignup({ local, session });
  writeRememberedLoginState({ email: "new@example.com", displayName: "newbie" }, local);
  forgetStashedRememberedLogin({ session });
  assert.equal(readRememberedLoginState(local)?.email, "new@example.com");
  assert.equal(session.map.size, 0);

  // An error link opened without an attempt from this tab leaves the remembered login alone.
  restoreRememberedLoginAfterFailedSignup({ local, session });
  assert.equal(readRememberedLoginState(local)?.email, "new@example.com");

  const form = read("./SignupForm.tsx");
  assert.match(form, /stashRememberedLoginBeforeSignup\(\);\s*writeRememberedLoginState\(/);
  assert.match(form, /restoreRememberedLoginAfterFailedSignup\(\);/);
});

// Auth Surface v2: the code shows once, in the form's reserved notice slot. The global bridge never toasts on /signup
// (no second copy of the message, no query text), it only clears the query.
test("the /signup page and the sign-up form route through the allow-list; the global bridge never toasts there", () => {
  const page = read("../../app/signup/page.tsx");
  assert.match(page, /resolveSignupRouteMessages\(\{\s*errorCode: searchParams\?\.error,\s*infoCode: searchParams\?\.info,?\s*\}\)/);
  assert.match(page, /<SignupForm error=\{routeMessages\.error\} info=\{routeMessages\.info\} \/>/);
  assert.doesNotMatch(page, /<SignupForm error=\{searchParams/);

  const bridge = read("../ActionFeedbackToasts.tsx");
  assert.match(bridge, /const INLINE_NOTICE_ROUTES = new Set\(\["\/login", "\/signup"\]\)/);
  assert.match(bridge, /const success = inlineNoticeRoute \? null : searchParams\.get\("success"\)/);
  assert.match(bridge, /if \(error && !inlineNoticeRoute\) \{\s*toast\.error\(error\);/);

  const form = read("./SignupForm.tsx");
  assert.match(form, /signupErrorNoticeId\(error\)/);
  assert.match(form, /<AuthNoticeSlot notice=\{notice\}/);
  assert.doesNotMatch(form, /useToastMessageEffect|useToast\b/);
});

test("the sign-up action keeps provider text and free text out of the redirect", () => {
  const actions = read("../../app/auth/actions.ts");
  const signup = actions.slice(actions.indexOf("export async function signup("), actions.indexOf("export async function requestPasswordReset("));
  assert.ok(signup.length > 200);
  assert.doesNotMatch(signup, /error\.message/);
  assert.doesNotMatch(signup, /encodeURIComponent/);
  assert.doesNotMatch(signup, /redirect\(`/);
  assert.match(signup, /buildSignupRedirectHref\(\{ error: classifySignupProviderError\(error\) \}\)/);
  // The fake-success check runs after the session branch and before the check-your-email redirect.
  const sessionAt = signup.indexOf("if (data.session)");
  const existingAt = signup.indexOf("if (isExistingAccountSignupResponse(data))");
  const sentAt = signup.indexOf('buildSignupRedirectHref({ info: "check_email" })');
  assert.ok(sessionAt > 0 && existingAt > sessionAt && sentAt > existingAt);
  assert.match(signup, /isExistingAccountSignupResponse\(data\)\) \{\s*redirect\(buildSignupRedirectHref\(\{ error: "email_exists" \}\)\);/);
});
