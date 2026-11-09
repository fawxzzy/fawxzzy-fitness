import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

// Drives the real login() server action (and the real username resolver / copy mapping) with only the external
// boundaries substituted: Supabase auth, the admin client, next/navigation, headers and the resolver's fetch.
// Guards the call site itself: if login() ever forwards the provider's raw error.message again, an existing username
// with a wrong password becomes distinguishable from an unknown one and these tests fail.
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const unexpected = () => { throw new Error("Unexpected dependency call in login failure test"); };

function load(file, dependencies, globals = {}) {
  const { outputText } = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  runInNewContext(outputText, {
    exports,
    require(name) {
      assert.ok(Object.hasOwn(dependencies, name), `Unstubbed import: ${name}`);
      return dependencies[name];
    },
    process: { env: {} },
    URL, URLSearchParams, AbortSignal, Response, JSON, Array, Promise, Date, Object, String, RegExp, Error,
    console: { error() {} },
    ...globals,
  }, { filename: file });
  return exports;
}

const USER_ID = "123e4567-e89b-42d3-a456-426614174000";
const PROVIDER_MESSAGE = "Invalid login credentials";

function harness({ resolverRows = [], signInError = null, resolverStatus = 200 } = {}) {
  const calls = { floor: 0, signIn: [], resolver: 0 };
  const state = { resolverRows, signInError, resolverStatus };
  const fetchStub = async () => {
    calls.resolver += 1;
    return new Response(JSON.stringify(state.resolverRows), { status: state.resolverStatus });
  };
  const resolverModule = load("src/lib/username-signin-index.ts", { "node:crypto": { createHash } }, { fetch: fetchStub });
  const dependencies = {
    "next/headers": { cookies: () => ({}), headers: () => ({ get: () => "203.0.113.9" }) },
    "next/navigation": { redirect(href) { throw { redirect: href }; } },
    "@/lib/auth-session": { setSessionCookies() {} },
    "@/lib/env": { SUPABASE_URL: () => "https://synthetic.supabase.test" },
    "@/lib/navigation-return": { isSafeAppPath: () => false },
    "@/lib/supabase/admin": {
      hasSupabaseAdminCredential: () => true,
      resolveSupabaseAdminCredential: () => "sb_secret_synthetic",
      supabaseAdmin: () => ({ auth: { admin: { getUserById: async () => ({ data: { user: { email: "member@example.test" } }, error: null }) } } }),
    },
    "@/lib/supabase/server": {
      supabaseServer: () => ({
        auth: {
          async signInWithPassword(input) {
            calls.signIn.push(input);
            return { data: { session: null }, error: state.signInError };
          },
        },
      }),
    },
    "@/lib/username-policy": { isUsernameIdentifier: () => true, USERNAME_VALIDATION_MESSAGE: "Invalid username" },
    "@/lib/username-signin-index": resolverModule,
    "@/lib/login-failure-floor": { enforceLoginFailureFloor: async () => { calls.floor += 1; return 0; } },
    "@/lib/password-reset-request": { requestResetForIdentifier: unexpected },
    "@/lib/password-policy": { isValidNewPassword: () => true, NEW_PASSWORD_REQUIREMENT: "x" },
  };
  const auth = load("src/app/auth/actions.ts", dependencies);
  return {
    calls,
    resolverModule,
    async failure(identifier) {
      const data = new FormData();
      data.set("email", identifier);
      data.set("password", "wrong-password");
      try {
        await auth.login(data);
      } catch (thrown) {
        assert.ok(thrown?.redirect, "login() should redirect on failure");
        const [pathname, query] = thrown.redirect.split("?");
        assert.equal(pathname, "/login");
        return new URLSearchParams(query).get("error");
      }
      throw new Error("login() did not redirect");
    },
  };
}

const credentialError = { name: "AuthApiError", code: "invalid_credentials", status: 400, message: PROVIDER_MESSAGE };

test("username sign-in: existing+wrong password, unknown and throttled usernames produce the identical error", async () => {
  const existing = await harness({ resolverRows: [{ resolved_user_id: USER_ID }], signInError: credentialError }).failure("fawxzzy");
  // The resolver returns no row for both an unknown username and a throttled one.
  const unknown = await harness({ resolverRows: [] }).failure("ghost-user");
  const throttled = await harness({ resolverRows: [] }).failure("fawxzzy");
  assert.equal(existing, unknown);
  assert.equal(existing, throttled);
  assert.equal(existing, harness().resolverModule.LOGIN_USERNAME_NOT_RECOGNIZED_MESSAGE);
  assert.notEqual(existing, PROVIDER_MESSAGE);
});

test("username sign-in: banned and other post-lookup client errors cannot be told apart from bad credentials", async () => {
  const unknown = await harness({ resolverRows: [] }).failure("ghost-user");
  for (const signInError of [
    { code: "user_banned", status: 403, message: "User is banned" },
    { code: "validation_failed", status: 422, message: "other" },
    credentialError,
  ]) {
    assert.equal(
      await harness({ resolverRows: [{ resolved_user_id: USER_ID }], signInError }).failure("fawxzzy"),
      unknown,
      signInError.code,
    );
  }
});

test("email sign-in: existing and unknown emails produce the identical generic error, not the provider message", async () => {
  const existing = await harness({ signInError: credentialError }).failure("member@example.test");
  const unknown = await harness({ signInError: credentialError }).failure("ghost@example.test");
  assert.equal(existing, unknown);
  assert.equal(existing, harness().resolverModule.LOGIN_INVALID_CREDENTIALS_MESSAGE);
  assert.notEqual(existing, PROVIDER_MESSAGE);
});

test("genuine infra and rate-limit failures keep distinct honest copy and never expose the raw provider message", async () => {
  const mod = harness().resolverModule;
  const credential = await harness({ resolverRows: [{ resolved_user_id: USER_ID }], signInError: credentialError }).failure("fawxzzy");
  const rateLimited = await harness({ resolverRows: [{ resolved_user_id: USER_ID }], signInError: { code: "over_request_rate_limit", status: 429, message: PROVIDER_MESSAGE } }).failure("fawxzzy");
  const provider5xx = await harness({ resolverRows: [{ resolved_user_id: USER_ID }], signInError: { status: 502, message: PROVIDER_MESSAGE } }).failure("fawxzzy");
  const resolverDown = await harness({ resolverStatus: 503 }).failure("fawxzzy");
  assert.equal(rateLimited, mod.LOGIN_RATE_LIMITED_MESSAGE);
  assert.equal(provider5xx, mod.LOGIN_PROVIDER_UNAVAILABLE_MESSAGE);
  assert.equal(resolverDown, mod.LOGIN_USERNAME_UNAVAILABLE_MESSAGE);
  assert.equal(new Set([credential, rateLimited, provider5xx, resolverDown]).size, 4);
});

test("every failed outcome waits on the failure latency floor before redirecting", async () => {
  const cases = [
    harness({ resolverRows: [] }),
    harness({ resolverRows: [{ resolved_user_id: USER_ID }], signInError: credentialError }),
    harness({ signInError: credentialError }),
    harness({ resolverStatus: 503 }),
  ];
  const identifiers = ["ghost-user", "fawxzzy", "member@example.test", "fawxzzy"];
  for (const [index, h] of cases.entries()) {
    await h.failure(identifiers[index]);
    assert.equal(h.calls.floor, 1, `case ${index}`);
  }
});
