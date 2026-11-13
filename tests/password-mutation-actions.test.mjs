import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { createClient } from "@supabase/supabase-js";
import ts from "typescript";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const unexpected = () => { throw new Error("Unexpected dependency call in password test"); };

// Execute the actual server actions; substitute only their external boundaries.
// No application environment, network client, credentials or live Auth calls load.
function load(file, dependencies = {}) {
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
    process: { env: { NEXT_PUBLIC_APP_URL: "https://fitness.example.test" } },
    URLSearchParams,
    console: { error: unexpected },
  }, { filename: file });
  return exports;
}

const policy = load("src/lib/password-policy.ts");

function fixture({ signedIn = true, updateError = null } = {}) {
  const calls = { clients: 0, users: 0, signup: [], update: [], login: [], cookies: 0 };
  const client = { auth: {
    async signUp(input) { calls.signup.push(input); return { data: { session: null }, error: null }; },
    async getUser() { calls.users += 1; return { data: { user: signedIn ? { id: "synthetic-user" } : null } }; },
    async updateUser(input) { calls.update.push(input); return { error: updateError }; },
    async signInWithPassword(input) {
      calls.login.push(input);
      return { data: { session: { access_token: "synthetic-access", refresh_token: "synthetic-refresh" } }, error: null };
    },
  } };
  const makeClient = () => { calls.clients += 1; return client; };
  const dependencies = {
    "next/headers": { cookies: () => ({}), headers: unexpected },
    "next/navigation": { redirect(href) { throw { redirect: href }; } },
    "@/lib/auth-session": { setSessionCookies() { calls.cookies += 1; } },
    "@/lib/env": { SUPABASE_URL: unexpected, SUPABASE_ANON_KEY: unexpected },
    "@/lib/navigation-return": { isSafeAppPath: () => false },
    "@/lib/supabase/admin": { hasSupabaseAdminCredential: unexpected, resolveSupabaseAdminCredential: unexpected, supabaseAdmin: unexpected },
    "@/lib/supabase/server": { supabaseServer: makeClient, supabaseServerWithSession: makeClient },
    "@/lib/username-policy": { isUsernameIdentifier: (name) => name === "synthetic-user", USERNAME_VALIDATION_MESSAGE: "Invalid username" },
    "@/lib/username-signin-index": { resolveLoginIdentifierEmail: async (value) => value, resolveUsernameEmailFromIndex: unexpected },
    "@/lib/login-failure-floor": { enforceLoginFailureFloor: async () => 0 },
    "@/lib/password-reset-request": { requestResetForIdentifier: unexpected },
    "@/lib/supabase/schema": { createFitnessSupabaseClient: unexpected },
    "@/lib/password-policy": policy,
  };
  return {
    calls,
    auth: load("src/app/auth/actions.ts", dependencies),
    reset: load("src/app/reset-password/actions.ts", dependencies),
  };
}

function form(password, confirmation = password) {
  const data = new FormData();
  data.set("email", "synthetic@example.test");
  if (password !== null) data.set("password", password);
  if (confirmation !== null) data.set("confirmPassword", confirmation);
  return data;
}

async function redirected(promise, expected) {
  await assert.rejects(promise, (error) => {
    assert.equal(error?.redirect, expected);
    return true;
  });
}

for (const [label, value] of [["empty", ""], ["six characters", "x".repeat(6)], ["nine characters", "x".repeat(9)], ["missing", null], ["file", new Blob(["synthetic long content"]) ]]) {
  test(`signup and reset form reject ${label} before creating an Auth client`, async () => {
    const { auth, reset, calls } = fixture();
    const message = encodeURIComponent(policy.NEW_PASSWORD_REQUIREMENT);
    await redirected(auth.signup(form(value)), `/signup?error=${message}`);
    await redirected(reset.updatePasswordAction(form(value)), `/reset-password?error=${message}`);
    assert.equal(calls.clients, 0);
    assert.equal(calls.cookies, 0);
  });
}

test("direct password update rejects short and non-string inputs without coercion or Auth calls", async () => {
  const { reset, calls } = fixture();
  const object = { toString: unexpected, get length() { return unexpected(); } };
  for (const value of ["", "x".repeat(9), null, undefined, 1234567890, object]) {
    const result = await reset.updatePassword(value);
    assert.equal(result.ok, false);
    assert.equal(result.error, policy.NEW_PASSWORD_REQUIREMENT);
  }
  assert.equal(calls.clients, 0);
});

for (const [label, value] of [["exact minimum", "x".repeat(10)], ["spaces", "  passphrase  "], ["decomposed Unicode", "e\u0301".repeat(10)], ["64 characters", "x".repeat(64)], ["128 characters", "x".repeat(128)], ["long passphrase", "x".repeat(1024)]]) {
  test(`signup and reset preserve ${label} exactly at the SDK boundary`, async () => {
    const { auth, reset, calls } = fixture();
    await redirected(auth.signup(form(value)), `/signup?info=${encodeURIComponent("Check your email to confirm your account.")}`);
    await redirected(reset.updatePasswordAction(form(value)), "/today");
    assert.equal(calls.signup.length, 1);
    assert.equal(calls.update.length, 1);
    assert.equal(calls.signup[0].password, value);
    assert.equal(calls.update[0].password, value);
    assert.equal(calls.signup[0].options.emailRedirectTo, "https://fitness.example.test/auth/confirm");
    assert.equal(calls.users, 1);
    assert.equal(calls.clients, 2);
  });
}

test("confirmation remains an exact match, including whitespace and non-string values", async () => {
  const { reset, calls } = fixture();
  for (const confirmation of ["passphrase", null, new Blob(["  passphrase  "])]) {
    await redirected(reset.updatePasswordAction(form("  passphrase  ", confirmation)), "/reset-password?error=Passwords%20must%20match");
  }
  assert.equal(calls.clients, 0);
});

test("valid direct update preserves the password and requires a recovery user", async () => {
  const value = "  passphrase  ";
  const valid = fixture();
  assert.equal((await valid.reset.updatePassword(value)).ok, true);
  assert.equal(valid.calls.update[0].password, value);
  const signedOut = fixture({ signedIn: false });
  const result = await signedOut.reset.updatePassword(value);
  assert.equal(result.ok, false);
  assert.equal(result.error, "Reset link expired. Request a new password reset.");
  assert.equal(signedOut.calls.update.length, 0);
});

test("reset provider errors keep fixed user-facing messages", async () => {
  for (const [message, expected] of [["JWT expired", "Reset link expired. Request a new password reset."], ["synthetic provider failure", "Could not update password. Please try again."]]) {
    const { reset } = fixture({ updateError: { message } });
    const result = await reset.updatePassword("synthetic passphrase");
    assert.equal(result.ok, false);
    assert.equal(result.error, expected);
  }
});

test("existing-password login still accepts a six-character password unchanged", async () => {
  const { auth, calls } = fixture();
  await redirected(auth.login(form(" xxyy ")), "/entry");
  assert.equal(calls.login.length, 1);
  assert.equal(calls.login[0].password, " xxyy ");
  assert.equal(calls.cookies, 1);
});

test("signup retains username validation and metadata", async () => {
  const { auth, calls } = fixture();
  const data = form("synthetic passphrase");
  data.set("username", "invalid");
  await redirected(auth.signup(data), "/signup?error=Invalid%20username");
  assert.equal(calls.clients, 0);
  data.set("username", "synthetic-user");
  await redirected(auth.signup(data), `/signup?info=${encodeURIComponent("Check your email to confirm your account.")}`);
  assert.equal(calls.signup[0].options.data.username, "synthetic-user");
});

test("both new-password forms use the shared policy and matching HTML minimum", () => {
  for (const [file, expectedInputs] of [["src/components/auth/SignupForm.tsx", 1], ["src/app/reset-password/ResetPasswordForm.tsx", 2]]) {
    const source = read(file);
    assert.match(source, /from "@\/lib\/password-policy"/);
    assert.match(source, /isValidNewPassword\(password\)/);
    assert.equal((source.match(/minLength=\{NEW_PASSWORD_MINIMUM\}/g) ?? []).length, expectedInputs);
    const passwordInputs = source.match(/<PasswordInput\b[\s\S]*?\/>/g) ?? [];
    assert.equal(passwordInputs.length, expectedInputs);
    for (const input of passwordInputs) assert.doesNotMatch(input, /maxLength=/);
  }
});

// ---- Change password while signed in (FF-ACCOUNT-003) -------------------------------------------------------------
// Runs the real changePasswordAction through the real @supabase/supabase-js auth client; only the network (a stub
// fetch that records requests and never leaves the process) and the Next/app boundaries are substituted. This is what
// proves the sign-in -> updateUser -> local sign-out sequence works on a client that holds its session in memory,
// where updateUser on the request-bound server client would fail with "Auth session missing".
const CHANGE_URL = "https://synthetic.supabase.test";
const b64url = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const FRESH_JWT = `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({ sub: "synthetic-user", session_id: "fresh-session", aud: "authenticated", role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`;
const CURRENT_PASSWORD = "  current passphrase \u00e9\u0301  ";
const NEW_PASSWORD = "  brand new passphrase \u00e9\u0301  ";

function loadSettingsActions(dependencies, logs) {
  const { outputText } = ts.transpileModule(read("src/app/settings/actions.ts"), {
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
    URLSearchParams,
    console: { error: (...args) => logs.push(args) },
  }, { filename: "src/app/settings/actions.ts" });
  return exports;
}

function providerError(status, errorCode, msg) {
  return new Response(JSON.stringify({ code: status, error_code: errorCode, msg }), { status, headers: { "content-type": "application/json" } });
}

function changeFixture({ user = { id: "synthetic-user", email: "member@example.test", user_metadata: {} }, tokenResponse, userResponse, logoutResponse, throwOnFetch = false } = {}) {
  const requests = [];
  const logs = [];
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  const stubFetch = async (url, init) => {
    const target = new URL(String(url));
    const headers = new Headers(init?.headers);
    requests.push({
      method: init?.method ?? "GET",
      path: target.pathname,
      query: target.search,
      bearer: (headers.get("authorization") ?? "").replace(/^Bearer /, ""),
      body: init?.body ? JSON.parse(init.body) : null,
    });
    if (throwOnFetch) throw new TypeError("fetch failed");
    if (target.pathname.endsWith("/token")) {
      return tokenResponse ?? json({ access_token: FRESH_JWT, refresh_token: "fresh-refresh", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: user.id, email: user.email } });
    }
    if (target.pathname.endsWith("/user")) return userResponse ?? json({ id: user.id, email: user.email });
    if (target.pathname.endsWith("/logout")) return logoutResponse ?? new Response(null, { status: 204 });
    return json({}, 404);
  };
  let required = 0;
  const actions = loadSettingsActions({
    "next/cache": { revalidatePath: unexpected },
    "next/headers": { cookies: unexpected },
    "@/lib/auth": { requireUser: async () => { required += 1; return user; } },
    "@/lib/env": { SUPABASE_URL: () => CHANGE_URL, SUPABASE_ANON_KEY: () => "anon-synthetic" },
    "@/lib/password-policy": policy,
    "@/lib/qa-data-visibility": { QA_LLEL_VISIBILITY_COOKIE: "synthetic" },
    // The request-bound clients must never be used: updateUser on them has no stored session.
    "@/lib/supabase/server": { supabaseServer: unexpected, supabaseServerWithSession: unexpected },
    "@/lib/supabase/schema": {
      createFitnessSupabaseClient: (url, key, options) => createClient(url, key, { ...options, global: { ...(options?.global ?? {}), fetch: stubFetch } }),
    },
    "@/lib/username-policy": { isUsernameIdentifier: () => true, USERNAME_VALIDATION_MESSAGE: "Invalid username" },
  }, logs);
  return {
    requests, logs, required: () => required,
    run(fields = {}) {
      const data = new FormData();
      const values = { currentPassword: CURRENT_PASSWORD, newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD, ...fields };
      for (const [key, value] of Object.entries(values)) data.set(key, value);
      return actions.changePasswordAction(data);
    },
  };
}

const copy = policy.CHANGE_PASSWORD_COPY;

test("change password verifies the current password, updates with the fresh session, then revokes only that session", async () => {
  const f = changeFixture();
  const result = await f.run();
  assert.equal(result.status, "success");
  assert.equal(result.message, "Password updated.");
  assert.equal(f.required(), 1);
  assert.equal(JSON.stringify(f.requests.map((r) => `${r.method} ${r.path}${r.query}`)), JSON.stringify([
    "POST /auth/v1/token?grant_type=password",
    "PUT /auth/v1/user",
    "POST /auth/v1/logout?scope=local",
  ]));
  const [signIn, update, logout] = f.requests;
  // Exact bytes, including spaces and combining characters.
  assert.equal(signIn.body.email, "member@example.test");
  assert.equal(signIn.body.password, CURRENT_PASSWORD);
  assert.equal(update.body.password, NEW_PASSWORD);
  // The write is performed by the session the verification just created, not by an ambient bearer.
  assert.equal(update.bearer, FRESH_JWT);
  assert.equal(logout.bearer, FRESH_JWT);
  assert.ok(!f.requests.some((r) => r.query.includes("scope=global") || r.query.includes("scope=others")));
  assert.equal(f.logs.length, 0);
});

for (const [label, fields, problem] of [
  ["missing current password", { currentPassword: "" }, "current_missing"],
  ["non-string current password", { currentPassword: new Blob(["x"]) }, "current_missing"],
  ["nine-character new password", { newPassword: "x".repeat(9), confirmPassword: "x".repeat(9) }, "new_too_short"],
  ["mismatched confirmation", { confirmPassword: `${NEW_PASSWORD} ` }, "confirmation_mismatch"],
  ["new password equal to the current one", { newPassword: CURRENT_PASSWORD, confirmPassword: CURRENT_PASSWORD }, "same_password"],
]) {
  test(`change password rejects ${label} before any network call`, async () => {
    const f = changeFixture();
    const result = await f.run(fields);
    assert.equal(result.status, "error");
    assert.equal(result.message, copy[problem]);
    assert.equal(f.requests.length, 0);
  });
}

test("a wrong current password is reported with fixed copy and nothing is written", async () => {
  const providerMessage = "Invalid login credentials";
  const f = changeFixture({ tokenResponse: providerError(400, "invalid_credentials", providerMessage) });
  const result = await f.run();
  assert.equal(result.status, "error");
  assert.equal(result.message, copy.current_incorrect);
  assert.ok(!result.message.includes(providerMessage));
  assert.equal(JSON.stringify(f.requests.map((r) => r.method)), JSON.stringify(["POST"]));
  // Machine code and status only: no message, no address, no password.
  assert.equal(JSON.stringify(f.logs), JSON.stringify([["Change-password verification failed", { code: "invalid_credentials", status: 400 }]]));
});

test("provider rejections map to fixed copy and never expose the provider's text", async () => {
  const cases = [
    ["rate limited on verify", { tokenResponse: providerError(429, "over_request_rate_limit", "Request rate limit reached") }, "rate_limited"],
    ["provider outage on verify", { tokenResponse: providerError(503, undefined, "upstream down") }, "update_failed"],
    ["weak password on update", { userResponse: providerError(422, "weak_password", "Password is known to be weak") }, "password_rejected"],
    ["same password on update", { userResponse: providerError(422, "same_password", "New password should be different from the old password.") }, "same_password"],
    ["rate limited on update", { userResponse: providerError(429, "over_request_rate_limit", "rate limit") }, "rate_limited"],
    ["server error on update", { userResponse: providerError(500, "unexpected_failure", "Database error updating user") }, "update_failed"],
    ["network failure", { throwOnFetch: true }, "update_failed"],
  ];
  for (const [label, options, problem] of cases) {
    const f = changeFixture(options);
    const result = await f.run();
    assert.equal(result.status, "error", label);
    assert.equal(result.message, copy[problem], label);
    for (const text of ["Database error", "known to be weak", "upstream down", "Request rate limit", "should be different", "fetch failed"]) {
      assert.ok(!result.message.includes(text), `${label}: ${text}`);
    }
    assert.ok(!JSON.stringify(f.logs).includes("member@example.test"), label);
  }
});

test("a failed update still revokes the throwaway session, and a failed revoke never changes the outcome", async () => {
  const failedUpdate = changeFixture({ userResponse: providerError(500, "unexpected_failure", "x") });
  await failedUpdate.run();
  assert.equal(failedUpdate.requests.at(-1).path, "/auth/v1/logout");
  assert.equal(failedUpdate.requests.at(-1).query, "?scope=local");

  const failedRevoke = changeFixture({ logoutResponse: new Response("{}", { status: 500 }) });
  const result = await failedRevoke.run();
  assert.equal(result.status, "success");
});

test("an account without an email cannot verify a password and fails safely", async () => {
  const f = changeFixture({ user: { id: "synthetic-user", email: null, user_metadata: {} } });
  const result = await f.run();
  assert.equal(result.status, "error");
  assert.equal(result.message, copy.update_failed);
  assert.equal(f.requests.length, 0);
});
