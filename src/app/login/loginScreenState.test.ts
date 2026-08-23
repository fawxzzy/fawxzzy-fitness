import test from "node:test";
import assert from "node:assert/strict";

import {
  getLoginHelperText,
  getLoginSubmitLabel,
  getSyncedLoginFieldState,
  resolveLoginRouteMessages,
  shouldStartCredentialStepOpenForLogin,
} from "./loginScreenState.ts";

test("failed login attempts keep the credential step open on the next login render", () => {
  assert.equal(
    shouldStartCredentialStepOpenForLogin({
      error: "Invalid email or password",
      requiresReauth: false,
    }),
    true,
  );
});

test("submit labels stay tied to password auth state", () => {
  assert.equal(
    getLoginSubmitLabel({
      formReady: true,
      isExceptionalReauth: false,
      isSubmitting: false,
    }),
    "Log in",
  );
});

test("remembered email still supports field synchronization when an input is unavailable", () => {
  assert.deepEqual(
    getSyncedLoginFieldState({
      emailInputValue: null,
      passwordInputValue: "secret12",
      rememberedEmail: "athlete@example.com",
      showEmailField: false,
    }),
    {
      email: "athlete@example.com",
      password: "secret12",
    },
  );
});

test("normal login path does not add a remembered-account helper prompt", () => {
  assert.equal(
    getLoginHelperText({
      requiresReauth: false,
    }),
    null,
  );
});

test("reauth path uses explicit session-expired helper copy", () => {
  assert.equal(
    getLoginHelperText({
      requiresReauth: true,
    }),
    "Your session ended. Enter your password to continue.",
  );
});

test("session-expired route params map to the reauth login state", () => {
  assert.deepEqual(
    resolveLoginRouteMessages({
      errorCode: "session_expired",
    }),
    {
      error: "Session refresh failed. Re-enter your password to continue.",
      info: undefined,
      requiresReauth: true,
    },
  );
});

test("verification route params prefer the confirmed success copy", () => {
  assert.deepEqual(
    resolveLoginRouteMessages({
      infoCode: "confirmed",
      verified: "1",
    }),
    {
      error: undefined,
      info: "Email verified. You can log in now.",
      requiresReauth: false,
    },
  );
});

test("reset-password route params map to user-facing reset feedback copy", () => {
  assert.deepEqual(
    resolveLoginRouteMessages({
      errorCode: "rate_limited",
      infoCode: "reset_requested",
    }),
    {
      error: "Too many reset requests. Please wait a few minutes and try again.",
      info: "Reset email sent. Check your inbox.",
      requiresReauth: false,
    },
  );
});

test("reset-password delivery failures avoid leaking raw error codes", () => {
  assert.deepEqual(
    resolveLoginRouteMessages({
      errorCode: "send_failed",
    }),
    {
      error: "Could not send reset email. Please try again in a few minutes.",
      info: undefined,
      requiresReauth: false,
    },
  );
});
