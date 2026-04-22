import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRememberedLoginState,
  readRememberedLoginState,
  syncRememberedLoginFromAuthenticatedSession,
  writeRememberedLoginState,
  type RememberedLoginStorage,
} from "@/lib/remembered-login";
import { getLoginScreenViewState } from "./loginScreenState.ts";

function createMemoryStorage(initial: Record<string, string> = {}): RememberedLoginStorage {
  const store = new Map(Object.entries(initial));

  return {
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
  };
}

test("remembered login defaults to password-required state until auth is confirmed", () => {
  const storage = createMemoryStorage();

  writeRememberedLoginState(
    buildRememberedLoginState({
      email: "athlete@example.com",
      displayName: "Athlete",
    }),
    storage,
  );

  assert.equal(readRememberedLoginState(storage)?.sessionState, "reauth-required");
});

test("legacy remembered login payloads do not restore a fake ready session", () => {
  const storage = createMemoryStorage({
    "fawxzzy:remembered-login": JSON.stringify({
      email: "legacy@example.com",
      displayName: "Legacy",
    }),
  });

  assert.equal(readRememberedLoginState(storage)?.sessionState, "reauth-required");
});

test("authenticated sync is the only path that marks remembered login ready", () => {
  const storage = createMemoryStorage();

  syncRememberedLoginFromAuthenticatedSession(
    {
      email: "athlete@example.com",
      displayName: "Athlete",
    },
    storage,
  );

  const rememberedLogin = readRememberedLoginState(storage);

  assert.equal(rememberedLogin?.sessionState, "ready");
  assert.equal(rememberedLogin?.email, "athlete@example.com");
});

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
