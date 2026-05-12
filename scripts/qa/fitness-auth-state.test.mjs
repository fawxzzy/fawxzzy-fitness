import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCookieHeaderFromStorageState,
  getAuthEnvReport,
  normalizeStorageCookie,
} from "./fitness-auth-state.mjs";

test("auth storage state normalizes Supabase cookies for the exact local origin", () => {
  const cookie = normalizeStorageCookie({
    name: "sb-access-token",
    value: "token",
    path: "/",
    httpOnly: true,
    secure: false,
    sameSite: "Lax",
    expires: 123,
  }, "http://127.0.0.1:3002");

  assert.deepEqual(cookie, {
    name: "sb-access-token",
    value: "token",
    domain: "127.0.0.1",
    path: "/",
    httpOnly: true,
    secure: false,
    sameSite: "Lax",
    expires: 123,
  });
});

test("auth route smoke builds a safe cookie header without printing secrets separately", () => {
  const header = buildCookieHeaderFromStorageState({
    cookies: [
      { name: "sb-access-token", value: "access" },
      { name: "sb-refresh-token", value: "refresh" },
    ],
  });

  assert.equal(header, "sb-access-token=access; sb-refresh-token=refresh");
});

test("auth env report can target QA or Zac credentials explicitly", () => {
  const qaReport = getAuthEnvReport({ account: "qa" });
  const zacReport = getAuthEnvReport({ account: "zac" });

  assert.ok(qaReport.required.includes("FITNESS_QA_EMAIL"));
  assert.ok(zacReport.required.includes("FITNESS_ZAC_EMAIL"));
  assert.ok(zacReport.required.includes("FITNESS_ZAC_PASSWORD"));
});
