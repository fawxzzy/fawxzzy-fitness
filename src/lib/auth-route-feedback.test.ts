import test from "node:test";
import assert from "node:assert/strict";
import {
  LOGIN_FAILURE_MESSAGES,
  resolveLoginErrorCopy,
  resolveLoginInfoCopy,
  resolveResetPasswordErrorCopy,
} from "@/lib/auth-route-feedback";
import { resolveLoginRouteMessages } from "@/app/login/loginScreenState";
import {
  LOGIN_EMAIL_NOT_CONFIRMED_MESSAGE,
  LOGIN_INVALID_CREDENTIALS_MESSAGE,
  LOGIN_PROVIDER_UNAVAILABLE_MESSAGE,
  LOGIN_RATE_LIMITED_MESSAGE,
  LOGIN_USERNAME_NOT_RECOGNIZED_MESSAGE,
  LOGIN_USERNAME_UNAVAILABLE_MESSAGE,
} from "@/lib/username-signin-index";

const CRAFTED = "Your account is locked, call 555-0100";

test("the sign-in failure allow-list stays identical to the sentences the sign-in action emits", () => {
  assert.deepEqual(
    [...LOGIN_FAILURE_MESSAGES].sort(),
    [
      LOGIN_EMAIL_NOT_CONFIRMED_MESSAGE,
      LOGIN_INVALID_CREDENTIALS_MESSAGE,
      LOGIN_PROVIDER_UNAVAILABLE_MESSAGE,
      LOGIN_RATE_LIMITED_MESSAGE,
      LOGIN_USERNAME_NOT_RECOGNIZED_MESSAGE,
      LOGIN_USERNAME_UNAVAILABLE_MESSAGE,
    ].sort(),
  );
});

test("login route resolves known codes and drops crafted text", () => {
  assert.equal(resolveLoginRouteMessages({ errorCode: CRAFTED }).error, undefined);
  assert.equal(resolveLoginRouteMessages({ infoCode: CRAFTED }).info, undefined);
  assert.equal(resolveLoginRouteMessages({ errorCode: "toString" }).error, undefined);
  assert.equal(resolveLoginRouteMessages({ errorCode: "__proto__" }).error, undefined);
  assert.equal(resolveLoginRouteMessages({ errorCode: "session_expired" }).requiresReauth, true);
  assert.match(resolveLoginRouteMessages({ errorCode: "rate_limited" }).error ?? "", /Too many reset requests/);
  assert.equal(resolveLoginRouteMessages({ infoCode: "reset_requested" }).info, "Reset email sent. Check your inbox.");
  assert.equal(resolveLoginRouteMessages({ verified: "1" }).info, "Email verified. You can log in now.");
  assert.equal(resolveLoginRouteMessages({ errorCode: LOGIN_INVALID_CREDENTIALS_MESSAGE }).error, LOGIN_INVALID_CREDENTIALS_MESSAGE);
});

test("reset-password route resolves known codes only and takes the first of repeated params", () => {
  assert.equal(resolveResetPasswordErrorCopy(CRAFTED), undefined);
  assert.equal(resolveResetPasswordErrorCopy(undefined), undefined);
  assert.equal(resolveResetPasswordErrorCopy("constructor"), undefined);
  assert.equal(resolveResetPasswordErrorCopy("passwords_must_match"), "Passwords must match");
  assert.equal(resolveResetPasswordErrorCopy(["weak_password", CRAFTED]), "That password is too easy to guess. Choose a different one.");
  assert.equal(resolveLoginErrorCopy([CRAFTED]), undefined);
  assert.equal(resolveLoginInfoCopy("confirmed"), "Email verified. You can log in now.");
});
