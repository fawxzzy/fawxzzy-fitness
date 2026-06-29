import test from "node:test";
import assert from "node:assert/strict";

import {
  buildQaBrowserStorageStateFromSessionCookies,
  hasUsableQaStorageState,
  resolveQaBrowserStorageState,
} from "./visual-fitness-runner.mjs";

test("hasUsableQaStorageState rejects expired auth cookies", () => {
  const now = Math.floor(Date.now() / 1000);
  const storageState = {
    cookies: [
      { name: "sb-access-token", value: "access", domain: "127.0.0.1", path: "/", expires: now - 5 },
      { name: "sb-refresh-token", value: "refresh", domain: "127.0.0.1", path: "/", expires: now - 5 },
    ],
    origins: [],
  };

  assert.equal(hasUsableQaStorageState(storageState), false);
});

test("buildQaBrowserStorageStateFromSessionCookies synthesizes fresh browser auth state", () => {
  const now = Math.floor(Date.now() / 1000);
  const storageState = buildQaBrowserStorageStateFromSessionCookies([
    {
      name: "sb-access-token",
      value: "header.eyJleHAiOjE3ODE0NDY3NjQsInN1YiI6InVzZXItMSIsImVtYWlsIjoicWEtdXNlckBleGFtcGxlLmNvbSIsImF1ZCI6ImF1dGhlbnRpY2F0ZWQiLCJyb2xlIjoiYXV0aGVudGljYXRlZCJ9.signature",
      url: "http://127.0.0.1:3002",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      expires: now + 3600,
    },
    {
      name: "sb-refresh-token",
      value: "refresh",
      url: "http://127.0.0.1:3002",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      expires: now + 3600,
    },
  ], "http://127.0.0.1:3002");

  assert.ok(storageState);
  assert.equal(hasUsableQaStorageState(storageState), true);
  assert.equal(storageState.cookies[0]?.domain, "127.0.0.1");
  assert.ok(storageState.origins[0]?.localStorage.some((entry) => entry.name.includes("-auth-token")));
});

test("resolveQaBrowserStorageState prefers fresh session cookies over stored auth state", async () => {
  let storedStateLoadCount = 0;
  const storageState = await resolveQaBrowserStorageState({
    authRequired: true,
    baseUrl: "http://127.0.0.1:3002",
    qaSession: {
      available: true,
      cookies: [
        {
          name: "sb-access-token",
          value: "header.eyJleHAiOjQxMDI0NDQ4MDAsInN1YiI6InVzZXItMSIsImVtYWlsIjoicWEtdXNlckBleGFtcGxlLmNvbSIsImF1ZCI6ImF1dGhlbnRpY2F0ZWQiLCJyb2xlIjoiYXV0aGVudGljYXRlZCJ9.signature",
          url: "http://127.0.0.1:3002",
          path: "/",
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
          expires: 4102444800,
        },
        {
          name: "sb-refresh-token",
          value: "refresh",
          url: "http://127.0.0.1:3002",
          path: "/",
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
          expires: 4102444800,
        },
      ],
    },
    loadStoredState: async () => {
      storedStateLoadCount += 1;
      return { cookies: [], origins: [] };
    },
  });

  assert.equal(storedStateLoadCount, 0);
  assert.ok(storageState);
  assert.equal(hasUsableQaStorageState(storageState), true);
});
