import test from "node:test";
import assert from "node:assert/strict";

import {
  getLoginScreenViewState,
} from "./loginScreenState.ts";

test("remembered account plus a valid password enables submit", () => {
  const viewState = getLoginScreenViewState({
    email: "",
    password: "secret12",
    rememberedEmail: "athlete@example.com",
    hasHydrated: true,
    showCredentialStep: true,
    isSubmitting: false,
    requiresReauth: false,
  });

  assert.equal(viewState.formReady, true);
  assert.equal(viewState.submitLabel, "Enter Gym");
  assert.equal(viewState.showEmailField, false);
});

test("remembered account mode does not blank auth readiness when the email field is hidden", () => {
  const viewState = getLoginScreenViewState({
    email: "",
    password: "secret12",
    rememberedEmail: "athlete@example.com",
    hasHydrated: true,
    showCredentialStep: true,
    isSubmitting: false,
    requiresReauth: false,
  });

  assert.equal(viewState.emailValid, true);
  assert.equal(viewState.formReady, true);
});

test("remembered account identity is rendered from a single UI slot", () => {
  const viewState = getLoginScreenViewState({
    email: "",
    password: "",
    rememberedEmail: "athlete@example.com",
    hasHydrated: true,
    showCredentialStep: true,
    isSubmitting: false,
    requiresReauth: false,
  });

  assert.equal(viewState.showRememberedAccountCard, true);
  assert.equal(viewState.showReadonlyRememberedAccount, false);
});

test("normal remembered-account login path keeps the CTA and helper text calm", () => {
  const viewState = getLoginScreenViewState({
    email: "",
    password: "secret12",
    rememberedEmail: "athlete@example.com",
    hasHydrated: true,
    showCredentialStep: true,
    isSubmitting: false,
    requiresReauth: false,
  });

  assert.equal(viewState.submitLabel, "Enter Gym");
  assert.equal(viewState.helperText, "Log in to continue your routine.");
});

test("session-expired path still keeps explicit helper messaging", () => {
  const viewState = getLoginScreenViewState({
    email: "",
    password: "secret12",
    rememberedEmail: "athlete@example.com",
    hasHydrated: true,
    showCredentialStep: true,
    isSubmitting: false,
    requiresReauth: true,
  });

  assert.equal(viewState.submitLabel, "Continue");
  assert.equal(viewState.helperText, "Your session ended. Enter your password to continue.");
});
