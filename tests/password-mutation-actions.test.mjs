import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
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
    // Sign-up validates the submitted FormData value (catches autofill that skipped onChange), reset its field state.
    assert.match(source, /isValidNewPassword\((?:password|nextPassword)\)/);
    assert.equal((source.match(/minLength=\{NEW_PASSWORD_MINIMUM\}/g) ?? []).length, expectedInputs);
    const passwordInputs = source.match(/<PasswordInput\b[\s\S]*?\/>/g) ?? [];
    assert.equal(passwordInputs.length, expectedInputs);
    for (const input of passwordInputs) assert.doesNotMatch(input, /maxLength=/);
  }
});
