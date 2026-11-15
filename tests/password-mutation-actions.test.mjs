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
function load(file, dependencies = {}, globals = {}) {
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
    ...globals,
  }, { filename: file });
  return exports;
}

const policy = load("src/lib/password-policy.ts");
const signupFeedback = load("src/components/auth/signupFeedback.ts", {
  "@/lib/password-policy": policy,
  "@/lib/username-policy": { USERNAME_VALIDATION_MESSAGE: "Invalid username" },
});

const authRouteFeedback = load("src/lib/auth-route-feedback.ts", { "@/lib/password-policy": policy });

const b64urlJson = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const nowSeconds = () => Math.floor(Date.now() / 1000);
// A decodable access token carrying GoTrue's amr claim. The default is a session created by a recovery link just now.
function makeToken(overrides = {}) {
  const claims = { sub: "synthetic-user", aud: "authenticated", role: "authenticated", session_id: "s1", exp: nowSeconds() + 3600, amr: [{ method: "recovery", timestamp: nowSeconds() - 30 }], ...overrides };
  return `${b64urlJson({ alg: "HS256", typ: "JWT" })}.${b64urlJson(claims)}.sig`;
}
const REQUEST_ACCESS_TOKEN = makeToken();

// `updateError` is the HTTP failure the stub provider returns for the password write: { status, error_code, msg }.
function fixture({ token = REQUEST_ACCESS_TOKEN, updateError = null } = {}) {
  const calls = { clients: 0, users: 0, signup: [], update: [], login: [], cookies: 0, requests: [], logged: [] };
  const stubFetch = async (url, init) => {
    const headers = new Headers(init.headers);
    calls.requests.push({ method: init.method, url: String(url), bearer: (headers.get("authorization") ?? "").replace(/^Bearer /, ""), body: init.body });
    calls.update.push(JSON.parse(init.body));
    if (updateError) {
      return new Response(JSON.stringify({ code: updateError.status, error_code: updateError.error_code, msg: updateError.msg }), { status: updateError.status, headers: { "content-type": "application/json" } });
    }
    return new Response(JSON.stringify({ id: "synthetic-user" }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const updateUserModule = load("src/lib/supabase/update-user.ts", {}, { fetch: stubFetch, AbortSignal, atob });
  const recoverySession = load("src/lib/recovery-session.ts", { "@/lib/supabase/update-user": updateUserModule });
  const client = { auth: {
    async signUp(input) { calls.signup.push(input); return { data: { session: null }, error: null }; },
    // The reset save step must not verify through the request-bound client (that path refreshes and rotates).
    async getUser() { calls.users += 1; throw new Error("getUser must not be used by the reset save step"); },
    // The request-bound client has no stored session: the real updateUser fails on it, so nothing may call it.
    async updateUser() { throw new Error("updateUser must not be used on the request-bound client"); },
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
    "@/lib/env": { SUPABASE_URL: () => "https://synthetic.supabase.test", SUPABASE_ANON_KEY: () => "anon-synthetic" },
    "@/lib/navigation-return": { isSafeAppPath: () => false },
    "@/lib/supabase/admin": { hasSupabaseAdminCredential: unexpected, resolveSupabaseAdminCredential: unexpected, supabaseAdmin: unexpected },
    "@/lib/supabase/server": { supabaseServer: makeClient, supabaseServerWithSession: unexpected, getRequestAccessToken: () => token },
    "@/lib/supabase/update-user": updateUserModule,
    "@/lib/recovery-session": recoverySession,
    "@/lib/username-policy": { isUsernameIdentifier: (name) => name === "synthetic-user", USERNAME_VALIDATION_MESSAGE: "Invalid username" },
    "@/lib/username-signin-index": { resolveLoginIdentifierEmail: async (value) => value, resolveUsernameEmailFromIndex: unexpected },
    "@/lib/login-failure-floor": { enforceLoginFailureFloor: async () => 0 },
    "@/lib/password-reset-request": { requestResetForIdentifier: unexpected },
    "@/lib/supabase/schema": { createFitnessSupabaseClient: unexpected },
    "@/lib/password-policy": policy,
    "@/components/auth/signupFeedback": signupFeedback,
    "@/lib/auth-route-feedback": authRouteFeedback,
  };
  return {
    calls,
    auth: load("src/app/auth/actions.ts", dependencies),
    reset: load("src/app/reset-password/actions.ts", dependencies, { console: { error: (...args) => calls.logged.push(args) } }),
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
    await redirected(auth.signup(form(value)), "/signup?error=password_too_short");
    await redirected(reset.updatePasswordAction(form(value)), "/reset-password?error=password_requirement");
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
    await redirected(auth.signup(form(value)), "/signup?info=check_email");
    await redirected(reset.updatePasswordAction(form(value)), "/today");
    assert.equal(calls.signup.length, 1);
    assert.equal(calls.update.length, 1);
    assert.equal(calls.signup[0].password, value);
    assert.equal(calls.update[0].password, value);
    assert.equal(calls.signup[0].options.emailRedirectTo, "https://fitness.example.test/auth/confirm");
    assert.equal(calls.users, 0);
    assert.equal(calls.clients, 1);
  });
}

test("confirmation remains an exact match, including whitespace and non-string values", async () => {
  const { reset, calls } = fixture();
  for (const confirmation of ["passphrase", null, new Blob(["  passphrase  "])]) {
    await redirected(reset.updatePasswordAction(form("  passphrase  ", confirmation)), "/reset-password?error=passwords_must_match");
  }
  assert.equal(calls.clients, 0);
});

test("valid direct update preserves the password", async () => {
  const value = "  passphrase  ";
  const valid = fixture();
  assert.equal((await valid.reset.updatePassword(value)).ok, true);
  assert.equal(valid.calls.update[0].password, value);
});

const SESSION_EXPIRED_COPY = "Reset link expired. Request a new password reset.";
const NOT_RECOVERY_COPY = "To change your password while signed in, use Account > Change password.";

test("only a fresh recovery session may set a password: a normal sign-in token is refused without a write", async () => {
  const normalSignIn = makeToken({ amr: [{ method: "password", timestamp: nowSeconds() - 30 }] });
  const noAmr = makeToken({ amr: undefined });
  for (const token of [normalSignIn, noAmr, makeToken({ amr: [] })]) {
    const f = fixture({ token });
    const result = await f.reset.updatePassword("synthetic passphrase");
    assert.equal(result.ok, false);
    assert.equal(result.error, NOT_RECOVERY_COPY);
    assert.equal(f.calls.requests.length, 0);
    assert.equal(f.calls.clients, 0);
    assert.equal(f.calls.users, 0);
  }
  // The form action refuses it the same way and redirects with the same fixed copy.
  const f = fixture({ token: normalSignIn });
  await redirected(f.reset.updatePasswordAction(form("synthetic passphrase")), "/reset-password?error=not_recovery_session");
  assert.equal(f.calls.requests.length, 0);
});

test("a recovery session older than the window, an expired token and an undecodable token are session-expired with no request", async () => {
  const stale = makeToken({ amr: [{ method: "recovery", timestamp: nowSeconds() - 16 * 60 }] });
  const expired = makeToken({ exp: nowSeconds() - 5 });
  for (const token of [stale, expired, "not-a-jwt", "", null]) {
    const f = fixture({ token });
    const result = await f.reset.updatePassword("synthetic passphrase");
    assert.equal(result.ok, false);
    assert.equal(result.error, SESSION_EXPIRED_COPY);
    assert.equal(f.calls.requests.length, 0);
    // No refresh, no rotation, no request-bound client at all.
    assert.equal(f.calls.clients, 0);
    assert.equal(f.calls.users, 0);
  }
});

test("a recovery session inside the window (otp label included) is accepted and writes with that same token", async () => {
  for (const method of ["recovery", "otp"]) {
    const token = makeToken({ amr: [{ method: "password", timestamp: nowSeconds() - 86400 }, { method, timestamp: nowSeconds() - 10 * 60 }] });
    const f = fixture({ token });
    assert.equal((await f.reset.updatePassword("synthetic passphrase")).ok, true, method);
    assert.equal(f.calls.requests.length, 1);
    assert.equal(f.calls.requests[0].bearer, token);
  }
});

test("reset provider errors keep fixed user-facing messages and never carry the provider's text", async () => {
  const cases = [
    [{ status: 401, error_code: "bad_jwt", msg: "invalid JWT: token is expired" }, "Reset link expired. Request a new password reset."],
    [{ status: 403, error_code: "session_not_found", msg: "Session from session_id claim in JWT does not exist" }, "Reset link expired. Request a new password reset."],
    [{ status: 422, error_code: "same_password", msg: "New password should be different from the old password." }, "Choose a new password that is different from your current one."],
    [{ status: 422, error_code: "weak_password", msg: "Password is known to be weak and easy to guess" }, "That password is too easy to guess. Choose a different one."],
    [{ status: 429, error_code: "over_request_rate_limit", msg: "Request rate limit reached" }, "Too many attempts. Please wait a few minutes and try again."],
    [{ status: 500, error_code: "unexpected_failure", msg: "synthetic provider failure" }, "Could not update password. Please try again."],
  ];
  for (const [updateError, expected] of cases) {
    const { reset, calls } = fixture({ updateError });
    const result = await reset.updatePassword("synthetic passphrase");
    assert.equal(result.ok, false);
    assert.equal(result.error, expected);
    for (const text of ["JWT", "session_id", "should be different", "known to be weak", "rate limit", "synthetic provider failure"]) {
      assert.ok(!result.error.includes(text), `${updateError.error_code}: ${text}`);
    }
    // Machine code and status only; never the message or the password.
    assert.equal(JSON.stringify(calls.logged), JSON.stringify([["Password reset update failed", { code: updateError.error_code, status: updateError.status }]]));
  }
});

test("the reset save step writes with the request's access token, never the refresh token, and never via updateUser", async () => {
  const { reset, calls } = fixture();
  const result = await reset.updatePassword("  passphrase \u00e9\u0301 ");
  assert.equal(result.ok, true);
  assert.equal(calls.requests.length, 1);
  const [request] = calls.requests;
  assert.equal(request.method, "PUT");
  assert.equal(request.url, "https://synthetic.supabase.test/auth/v1/user");
  assert.equal(request.bearer, REQUEST_ACCESS_TOKEN);
  assert.equal(JSON.stringify(JSON.parse(request.body)), JSON.stringify({ password: "  passphrase \u00e9\u0301 " }));
  assert.ok(!request.body.includes("refresh"));
  assert.equal(calls.logged.length, 0);
});

test("a rejected password makes no provider request at all", async () => {
  const { reset, calls } = fixture();
  const result = await reset.updatePassword("short");
  assert.equal(result.ok, false);
  assert.equal(calls.requests.length, 0);
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
  await redirected(auth.signup(data), "/signup?error=username_invalid");
  assert.equal(calls.clients, 0);
  data.set("username", "synthetic-user");
  await redirected(auth.signup(data), "/signup?info=check_email");
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
  const floorCalls = [];
  const clientOptions = [];
  let floorDone = 0;
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
    if (throwOnFetch === true || (typeof throwOnFetch === "string" && target.pathname.endsWith(throwOnFetch))) throw new TypeError("fetch failed");
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
    // The shared sign-in latency floor; the stub records when it was entered and when its wait finished.
    "@/lib/login-failure-floor": {
      enforceLoginFailureFloor: async (startedAt) => { floorCalls.push(startedAt); await Promise.resolve(); floorDone += 1; return 0; },
    },
    "@/lib/password-policy": policy,
    "@/lib/qa-data-visibility": { QA_LLEL_VISIBILITY_COOKIE: "synthetic" },
    // The request-bound clients must never be used: updateUser on them has no stored session.
    "@/lib/supabase/server": { supabaseServer: unexpected, supabaseServerWithSession: unexpected },
    // Used by the account-details save in the same module, never by change password.
    "@/lib/supabase/update-user": { updateUserWithAccessToken: unexpected },
    "@/lib/supabase/schema": {
      createFitnessSupabaseClient: (url, key, options) => {
        clientOptions.push(options);
        return createClient(url, key, { ...options, global: { ...(options?.global ?? {}), fetch: stubFetch } });
      },
    },
    "@/lib/username-policy": { isUsernameIdentifier: () => true, USERNAME_VALIDATION_MESSAGE: "Invalid username" },
  }, logs);
  return {
    requests, logs, floorCalls, clientOptions, floorDone: () => floorDone, required: () => required,
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

test("the verification always uses the signed-in session's email, never a posted email or username field", async () => {
  const f = changeFixture();
  const result = await f.run({ email: "attacker@example.test", username: "attacker", userEmail: "attacker@example.test" });
  assert.equal(result.status, "success");
  const signIn = f.requests.find((r) => r.path.endsWith("/token"));
  assert.equal(signIn.body.email, "member@example.test");
  assert.ok(!JSON.stringify(f.requests).includes("attacker"));

  // Surrounding whitespace on the session email is trimmed; a hostile field still cannot replace it.
  const padded = changeFixture({ user: { id: "synthetic-user", email: "  member@example.test  ", user_metadata: {} } });
  await padded.run({ email: "attacker@example.test" });
  assert.equal(padded.requests.find((r) => r.path.endsWith("/token")).body.email, "member@example.test");
});

test("a verification that proves a different account writes nothing and still revokes its session", async () => {
  const otherAccount = new Response(JSON.stringify({ access_token: FRESH_JWT, refresh_token: "fresh-refresh", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: "someone-else", email: "member@example.test" } }), { status: 200, headers: { "content-type": "application/json" } });
  const f = changeFixture({ tokenResponse: otherAccount });
  const result = await f.run();
  assert.equal(result.status, "error");
  assert.equal(result.message, copy.update_failed);
  assert.equal(JSON.stringify(f.requests.map((r) => `${r.method} ${r.path}${r.query}`)), JSON.stringify([
    "POST /auth/v1/token?grant_type=password",
    "POST /auth/v1/logout?scope=local",
  ]));
  assert.equal(JSON.stringify(f.logs), JSON.stringify([["Change-password verification matched a different account"]]));
  assert.equal(f.floorCalls.length, 0);
});

test("a failed current-password verification waits on the sign-in latency floor before it answers", async () => {
  const cases = [
    ["wrong password", { tokenResponse: providerError(400, "invalid_credentials", "Invalid login credentials") }],
    ["rate limited", { tokenResponse: providerError(429, "over_request_rate_limit", "rate limit") }],
    ["provider outage", { tokenResponse: providerError(503, undefined, "down") }],
    ["network failure", { throwOnFetch: true }],
  ];
  for (const [label, options] of cases) {
    const f = changeFixture(options);
    const before = Date.now();
    const result = await f.run();
    assert.equal(result.status, "error", label);
    assert.equal(f.floorCalls.length, 1, label);
    assert.equal(f.floorDone(), 1, `${label}: the floor wait finished before the answer`);
    assert.ok(typeof f.floorCalls[0] === "number" && f.floorCalls[0] >= before - 1 && f.floorCalls[0] <= Date.now(), `${label}: measured from the start of the attempt`);
  }
});

test("the latency floor is not applied to success, local validation, or a failed write", async () => {
  const success = changeFixture();
  await success.run();
  assert.equal(success.floorCalls.length, 0);

  const invalid = changeFixture();
  await invalid.run({ newPassword: "short", confirmPassword: "short" });
  assert.equal(invalid.floorCalls.length, 0);

  const failedWrite = changeFixture({ userResponse: providerError(500, "unexpected_failure", "x") });
  await failedWrite.run();
  assert.equal(failedWrite.floorCalls.length, 0);
});

test("the throwaway client is pinned: no persisted session, no auto refresh, no ambient credentials", async () => {
  const f = changeFixture();
  await f.run();
  assert.equal(f.clientOptions.length, 1);
  const [options] = f.clientOptions;
  assert.equal(options.auth.persistSession, false);
  assert.equal(options.auth.autoRefreshToken, false);
  assert.equal(JSON.stringify(Object.keys(options.auth).sort()), JSON.stringify(["autoRefreshToken", "persistSession"]));
  // Not bound to the member's cookie session: no global Authorization header is supplied.
  assert.ok(options.global === undefined || !JSON.stringify(options.global).toLowerCase().includes("authorization"));
});

test("a failed session revoke is logged by machine code and status only, and never changes the outcome", async () => {
  const failedRevoke = changeFixture({ logoutResponse: providerError(500, "unexpected_failure", "secret provider text") });
  const result = await failedRevoke.run();
  assert.equal(result.status, "success");
  assert.equal(failedRevoke.logs.length, 1);
  assert.equal(failedRevoke.logs[0][0], "Change-password session revoke failed");
  assert.equal(failedRevoke.logs[0][1].status, 500);
  assert.ok(!JSON.stringify(failedRevoke.logs).includes("secret provider text"));
  assert.ok(!JSON.stringify(failedRevoke.logs).includes("member@example.test"));

  const thrown = changeFixture({ throwOnFetch: "/logout" });
  const outcome = await thrown.run();
  assert.equal(outcome.status, "success");
  assert.ok(thrown.logs.some((entry) => entry[0] === "Change-password session revoke failed"));
  assert.ok(!JSON.stringify(thrown.logs).includes("fetch failed"));
});
