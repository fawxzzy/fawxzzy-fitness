import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { NEW_PASSWORD_REQUIREMENT } from "@/lib/password-policy";
import { USERNAME_VALIDATION_MESSAGE } from "@/lib/username-policy";
import {
  buildSignupRedirectHref,
  classifySignupProviderError,
  isSignupErrorCode,
  resolveSignupRouteMessages,
  SIGNUP_ERROR_COPY,
  SIGNUP_INFO_COPY,
} from "./signupFeedback.ts";

const read = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), "utf8");

test("the error-code table is the small fixed allow-list, with the shared password and username rules as copy", () => {
  assert.deepEqual(Object.keys(SIGNUP_ERROR_COPY).sort(), [
    "email_invalid",
    "password_too_short",
    "rate_limited",
    "signup_failed",
    "username_invalid",
    "username_taken",
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

test("a provider rejection never turns into text from the provider, and already-registered shares the generic code", () => {
  const providerMessages = [
    "User already registered",
    "A user with this email address has already been registered",
    "Password should contain at least one character of each",
    "Database error saving new user",
    "Signups not allowed for this instance",
  ];
  for (const message of providerMessages) {
    for (const extra of [{}, { code: "user_already_exists", status: 422 }, { code: "email_exists", status: 422 }, { code: "weak_password", status: 422 }, { status: 500 }]) {
      const code = classifySignupProviderError({ message, ...extra });
      assert.equal(code, "signup_failed", `${message} ${JSON.stringify(extra)}`);
      assert.ok(!SIGNUP_ERROR_COPY[code].toLowerCase().includes("already registered"));
      assert.ok(!SIGNUP_ERROR_COPY[code].toLowerCase().includes("email address"));
    }
  }
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
  assert.equal(classifySignupProviderError({ code: "user_already_exists", message: "User already registered" }), "signup_failed");
});

test("the /signup page, the sign-up form and the global toast bridge all route through the allow-list", () => {
  const page = read("../../app/signup/page.tsx");
  assert.match(page, /resolveSignupRouteMessages\(\{\s*errorCode: searchParams\?\.error,\s*infoCode: searchParams\?\.info,?\s*\}\)/);
  assert.match(page, /<SignupForm error=\{routeMessages\.error\} info=\{routeMessages\.info\} \/>/);
  assert.doesNotMatch(page, /<SignupForm error=\{searchParams/);

  const bridge = read("../ActionFeedbackToasts.tsx");
  assert.match(bridge, /pathname === "\/signup"/);
  assert.match(bridge, /resolveSignupRouteMessages\(\{ errorCode: error \}\)/);
  assert.match(bridge, /SIGNUP_ROUTE_ERROR_TOAST_ID/);
  // /signup never shows ?success= text.
  assert.match(bridge, /const success = pathname === "\/signup" \? null : searchParams\.get\("success"\)/);

  const form = read("./SignupForm.tsx");
  assert.match(form, /SIGNUP_ROUTE_ERROR_TOAST_ID/);
  assert.match(form, /SIGNUP_ROUTE_INFO_TOAST_ID/);
});

test("the sign-up action keeps provider text and free text out of the redirect", () => {
  const actions = read("../../app/auth/actions.ts");
  const signup = actions.slice(actions.indexOf("export async function signup("), actions.indexOf("export async function requestPasswordReset("));
  assert.ok(signup.length > 200);
  assert.doesNotMatch(signup, /error\.message/);
  assert.doesNotMatch(signup, /encodeURIComponent/);
  assert.doesNotMatch(signup, /redirect\(`/);
  assert.match(signup, /buildSignupRedirectHref\(\{ error: classifySignupProviderError\(error\) \}\)/);
});
