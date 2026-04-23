import test from "node:test";
import assert from "node:assert/strict";

import {
  getLoginHelperText,
  getLoginSubmitLabel,
  getRememberedAccountPromptState,
  getSyncedLoginFieldState,
  shouldStartCredentialStepOpenForLogin,
} from "./loginScreenState.ts";

test("remembered account CTA reveals credentials instead of taking an auth shortcut", () => {
  assert.deepEqual(
    getRememberedAccountPromptState({
      hasRememberedAccount: true,
      showCredentialStep: false,
    }),
    {
      action: "reveal-credentials",
      label: "Continue",
    },
  );
});

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
    "Enter Gym",
  );
});

test("hidden email sync preserves remembered email in password-only mode", () => {
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

test("remembered-account password step falls back to normal helper copy", () => {
  assert.equal(
    getLoginHelperText({
      hasRememberedAccount: true,
      showCredentialStep: true,
      requiresReauth: false,
    }),
    null,
  );
});

test("reauth path reuses the same remembered-password helper copy", () => {
  assert.equal(
    getLoginHelperText({
      hasRememberedAccount: true,
      showCredentialStep: true,
      requiresReauth: true,
    }),
    null,
  );
});
