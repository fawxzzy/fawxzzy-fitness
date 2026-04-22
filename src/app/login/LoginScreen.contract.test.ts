import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRememberedLoginState,
  readRememberedLoginState,
  syncRememberedLoginFromAuthenticatedSession,
  writeRememberedLoginState,
  type RememberedLoginStorage,
} from "@/lib/remembered-login";

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
