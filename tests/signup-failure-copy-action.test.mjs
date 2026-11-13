import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

// Drives the real signup() server action with only its external boundaries substituted (Supabase, next/navigation,
// headers, cookies). Guards the call site: if signup() ever forwards the provider's error text again, an address
// that already has an account becomes distinguishable by message and these tests fail.
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const unexpected = () => { throw new Error("Unexpected dependency call in signup failure test"); };

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
    process: { env: { NEXT_PUBLIC_APP_URL: "https://fitness.example.test" } },
    URL, URLSearchParams,
    console: { error() {} },
    ...globals,
  }, { filename: file });
  return exports;
}

const passwordPolicy = load("src/lib/password-policy.ts", {});
const usernamePolicy = load("src/lib/username-policy.ts", {});
const feedback = load("src/components/auth/signupFeedback.ts", {
  "@/lib/password-policy": passwordPolicy,
  "@/lib/username-policy": usernamePolicy,
});

const PROVIDER_ALREADY_REGISTERED = "User already registered";

function harness({ signUpResult }) {
  const calls = { signUp: [], logged: [], cookies: 0 };
  const dependencies = {
    "next/headers": { cookies: () => ({}), headers: () => ({ get: () => null }) },
    "next/navigation": { redirect(href) { throw { redirect: href }; } },
    "@/lib/auth-session": { setSessionCookies() { calls.cookies += 1; } },
    "@/lib/env": { SUPABASE_URL: unexpected },
    "@/lib/navigation-return": { isSafeAppPath: () => false },
    "@/lib/supabase/admin": { hasSupabaseAdminCredential: unexpected, resolveSupabaseAdminCredential: unexpected, supabaseAdmin: unexpected },
    "@/lib/supabase/server": {
      supabaseServer: () => ({
        auth: {
          async signUp(input) {
            calls.signUp.push(input);
            return signUpResult;
          },
        },
      }),
    },
    "@/lib/username-policy": usernamePolicy,
    "@/lib/username-signin-index": { resolveLoginIdentifierEmail: unexpected, resolveUsernameEmailFromIndex: unexpected, getLoginResolutionFailureMessage: unexpected, getLoginSignInFailureMessage: unexpected },
    "@/lib/login-failure-floor": { enforceLoginFailureFloor: unexpected },
    "@/lib/password-reset-request": { requestResetForIdentifier: unexpected, buildFitnessRecoveryRedirectUrl: unexpected },
    "@/lib/password-policy": passwordPolicy,
    "@/components/auth/signupFeedback": feedback,
  };
  const auth = load("src/app/auth/actions.ts", dependencies, {
    console: { error: (...args) => calls.logged.push(args) },
  });
  return {
    calls,
    async submit({ email = "member@example.test", username = "member-1", password = "a long enough passphrase" } = {}) {
      const data = new FormData();
      data.set("email", email);
      data.set("username", username);
      data.set("password", password);
      try {
        await auth.signup(data);
      } catch (thrown) {
        assert.ok(thrown?.redirect, "signup() should redirect");
        return thrown.redirect;
      }
      throw new Error("signup() did not redirect");
    },
  };
}

function failing(error) {
  return harness({ signUpResult: { data: { user: null, session: null }, error } });
}

const alreadyRegistered = { name: "AuthApiError", code: "user_already_exists", status: 422, message: PROVIDER_ALREADY_REGISTERED };

test("an already-registered address redirects with the generic code, not the provider's message", async () => {
  const existing = await failing(alreadyRegistered).submit({ email: "member@example.test" });
  assert.equal(existing, "/signup?error=signup_failed");
  assert.ok(!existing.includes("registered"));
  assert.ok(!decodeURIComponent(existing).includes(PROVIDER_ALREADY_REGISTERED));
});

test("every non-rate-limit provider failure is indistinguishable from an already-registered address", async () => {
  const baseline = await failing(alreadyRegistered).submit();
  for (const error of [
    { code: "email_exists", status: 422, message: "A user with this email address has already been registered" },
    { code: "weak_password", status: 422, message: "Password is known to be weak" },
    { code: "unexpected_failure", status: 500, message: "Database error saving new user" },
    { code: "signup_disabled", status: 422, message: "Signups not allowed for this instance" },
    { status: 502, message: "Bad gateway" },
    { message: "fetch failed" },
  ]) {
    assert.equal(await failing(error).submit(), baseline, JSON.stringify(error));
  }
});

test("rate limits and the public username guard keep their own fixed codes", async () => {
  assert.equal(await failing({ code: "over_request_rate_limit", status: 429, message: "Request rate limit reached" }).submit(), "/signup?error=rate_limited");
  assert.equal(await failing({ code: "unexpected_failure", status: 500, message: "ACCOUNT_USERNAME_TAKEN" }).submit(), "/signup?error=username_taken");
});

test("only the provider's machine code and status are logged: no message, no address", async () => {
  const h = failing({ ...alreadyRegistered, message: "User member@example.test already registered" });
  await h.submit({ email: "member@example.test" });
  // JSON compare: the action runs in a separate vm realm, so strict deepEqual would reject its object prototypes.
  assert.equal(JSON.stringify(h.calls.logged), JSON.stringify([["Sign-up failed", { code: "user_already_exists", status: 422 }]]));
  assert.ok(!JSON.stringify(h.calls.logged).includes("member@example.test"));
  assert.equal(h.calls.cookies, 0);
});

test("local validation redirects with codes before any provider call and keeps the password and username rules", async () => {
  const h = harness({ signUpResult: unexpected });
  assert.equal(await h.submit({ password: "x".repeat(9) }), "/signup?error=password_too_short");
  assert.equal(await h.submit({ username: "a" }), "/signup?error=username_invalid");
  assert.equal(await h.submit({ username: "sixteen-chars-xxx" }), "/signup?error=username_invalid");
  assert.equal(await h.submit({ username: "bad name!" }), "/signup?error=username_invalid");
  assert.equal(await h.submit({ email: "not-an-email" }), "/signup?error=email_invalid");
  assert.equal(h.calls.signUp.length, 0);

  const ok = harness({ signUpResult: { data: { user: { id: "u" }, session: null }, error: null } });
  for (const username of ["ab", "a".repeat(15), "A.b_c-9"]) {
    assert.equal(await ok.submit({ username, password: "x".repeat(10) }), "/signup?info=check_email", username);
  }
  assert.equal(ok.calls.signUp.length, 3);
});

test("a session from the provider still signs the person in and goes to /entry", async () => {
  const h = harness({ signUpResult: { data: { user: { id: "u" }, session: { access_token: "a", refresh_token: "r" } }, error: null } });
  assert.equal(await h.submit(), "/entry");
  assert.equal(h.calls.cookies, 1);
});
