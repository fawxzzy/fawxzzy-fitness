import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  buildRememberedLoginState,
  readRememberedLoginState,
  syncRememberedLoginFromAuthenticatedSession,
  writeRememberedLoginState,
  type RememberedLoginStorage,
} from "@/lib/remembered-login";
import { getLoginScreenViewState } from "./loginScreenState.ts";

const loginScreenSource = readFileSync(new URL("./LoginScreen.tsx", import.meta.url), "utf8");

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

test("remembered account prefills the normal email-and-password login form", () => {
  const viewState = getLoginScreenViewState({
    email: "athlete@example.com",
    password: "secret12",
    isSubmitting: false,
    requiresReauth: false,
  });

  assert.equal(viewState.formReady, true);
  assert.equal(viewState.submitLabel, "Log in");
  assert.equal(viewState.showEmailField, true);
});

test("normal login form validates the visible remembered email", () => {
  const viewState = getLoginScreenViewState({
    email: "athlete@example.com",
    password: "secret12",
    isSubmitting: false,
    requiresReauth: false,
  });

  assert.equal(viewState.emailValid, true);
  assert.equal(viewState.formReady, true);
});

test("login state never renders a remembered-account decision card", () => {
  const viewState = getLoginScreenViewState({
    email: "athlete@example.com",
    password: "",
    isSubmitting: false,
    requiresReauth: false,
  });

  assert.equal(viewState.showManualAuth, true);
  assert.equal(viewState.showEmailField, true);
});

test("normal login path does not add a redundant remembered-account prompt", () => {
  const viewState = getLoginScreenViewState({
    email: "athlete@example.com",
    password: "secret12",
    isSubmitting: false,
    requiresReauth: false,
  });

  assert.equal(viewState.submitLabel, "Log in");
  assert.equal(viewState.helperText, null);
});

test("session-expired path still keeps explicit helper messaging", () => {
  const viewState = getLoginScreenViewState({
    email: "athlete@example.com",
    password: "secret12",
    isSubmitting: false,
    requiresReauth: true,
  });

  assert.equal(viewState.submitLabel, "Log in");
  assert.equal(viewState.helperText, "Your session ended. Enter your password to continue.");
});

test("login screen always renders the credential form instead of a remembered-account choice", () => {
  assert.match(loginScreenSource, /label="Email or username"/);
  assert.match(loginScreenSource, /name="password"/);
  assert.doesNotMatch(loginScreenSource, /BottomActionSplit/);
  assert.doesNotMatch(loginScreenSource, /handleRevealCredentialStep|handleSwitchAccount|clearRememberedLoginState/);
});

test("remembered email synchronization never steals focus from an editable credential field", () => {
  assert.doesNotMatch(loginScreenSource, /focusTarget\.focus\(\)/);
  assert.doesNotMatch(loginScreenSource, /passwordInput\.focus\(\)/);
});
