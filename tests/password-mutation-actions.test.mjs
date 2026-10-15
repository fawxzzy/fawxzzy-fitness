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
