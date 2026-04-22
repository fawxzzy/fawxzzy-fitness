import test from "node:test";
import assert from "node:assert/strict";

import {
  getLoginSubmitLabel,
  getRememberedAccountPromptState,
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
      isReauthFlow: true,
      isSubmitting: false,
    }),
    "Re-enter password",
  );
  assert.equal(
    getLoginSubmitLabel({
      formReady: true,
      isReauthFlow: false,
      isSubmitting: false,
    }),
    "Enter Gym",
  );
});
