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
    "Sign in",
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

// Auth Surface v2: a login route code shows once, in the screen's reserved notice slot; the bridge never toasts it and
// a repeat redirect (the bridge clears the query) updates the box through the [error, info] effect.
test("login route errors show in the inline notice slot, never as a toast", async () => {
  const { readFileSync } = await import("node:fs");
  const bridge = readFileSync(new URL("../../components/ActionFeedbackToasts.tsx", import.meta.url), "utf8");
  const screen = readFileSync(new URL("./LoginScreen.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(screen, /useToast|login-route-error/);
  assert.match(screen, /<AuthNoticeSlot notice=\{notice\} \/>/);
  assert.match(screen, /const nextNotice = resolveRouteNotice\(error, info, false\);/);
  assert.doesNotMatch(bridge, /login-route-error/);
  assert.match(bridge, /const INLINE_NOTICE_ROUTES = new Set\(\["\/login", "\/signup"\]\)/);
  assert.match(bridge, /if \(pathname === "\/reset-password"\) \{\s*return;/);
});

test("magic_link_sent and unknown error codes never leave the sign-in notice silent", () => {
  assert.equal(resolveLoginRouteMessages({ infoCode: "magic_link_sent" }).info, "Check your email for the sign-in link.");
  const unknown = resolveLoginRouteMessages({ errorCode: "totally_made_up" });
  assert.equal(unknown.error, "Could not finish signing in. Please try again.");
  // The URL never chooses the words.
  assert.doesNotMatch(unknown.error ?? "", /made_up/);
  assert.equal(resolveLoginRouteMessages({ errorCode: "" }).error, undefined);
  assert.equal(resolveLoginRouteMessages({}).error, undefined);
});
