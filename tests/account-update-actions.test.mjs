import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

// Drives the real updateAccountEmailAction (Settings > Account username/email Save) with only its external
// boundaries substituted. The write goes through the real update-user helper against a stub fetch: the request-bound
// Supabase client has no stored session, so `auth.updateUser` on it fails before any request is sent.
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const unexpected = () => { throw new Error("Unexpected dependency call in account update test"); };

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
    URLSearchParams,
    console: { error: unexpected },
    ...globals,
  }, { filename: file });
  return exports;
}

const usernamePolicy = load("src/lib/username-policy.ts", {});
const ACCESS_TOKEN = "synthetic-request-access-token";
const MEMBER = { id: "synthetic-user", email: "member@example.test", user_metadata: { username: "member", display_name: "member", theme: "dark" } };

function fixture({ failure = null, throwOnFetch = false } = {}) {
  const requests = [];
  const logs = [];
  const revalidated = [];
  const stubFetch = async (url, init) => {
    const headers = new Headers(init.headers);
    requests.push({ method: init.method, url: String(url), bearer: (headers.get("authorization") ?? "").replace(/^Bearer /, ""), body: JSON.parse(init.body) });
    if (throwOnFetch) throw new TypeError("fetch failed");
    if (failure) {
      return new Response(JSON.stringify({ code: failure.status, error_code: failure.error_code, msg: failure.msg }), { status: failure.status, headers: { "content-type": "application/json" } });
    }
    return new Response(JSON.stringify({ id: MEMBER.id }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const updateUserModule = load("src/lib/supabase/update-user.ts", {}, { fetch: stubFetch, AbortSignal });
  const actions = load("src/app/settings/actions.ts", {
    "next/cache": { revalidatePath: (target) => revalidated.push(target) },
    "next/headers": { cookies: unexpected },
    "@/lib/auth": { requireUser: async () => MEMBER },
    "@/lib/env": { SUPABASE_URL: () => "https://synthetic.supabase.test", SUPABASE_ANON_KEY: () => "anon-synthetic" },
    "@/lib/qa-data-visibility": { QA_LLEL_VISIBILITY_COOKIE: "synthetic" },
    // Neither request-bound client may be used for the write.
    "@/lib/supabase/server": { supabaseServer: unexpected, supabaseServerWithSession: unexpected, getRequestAccessToken: () => ACCESS_TOKEN },
    "@/lib/supabase/update-user": updateUserModule,
    "@/lib/username-policy": usernamePolicy,
  }, { console: { error: (...args) => logs.push(args) } });
  return {
    requests, logs, revalidated,
    save(fields) {
      const data = new FormData();
      for (const [key, value] of Object.entries({ email: MEMBER.email, username: "member", ...fields })) data.set(key, value);
      return actions.updateAccountEmailAction(data);
    },
  };
}

test("a username change writes metadata only, with the request's access token, and refreshes Settings and Account", async () => {
  const f = fixture();
  const result = await f.save({ username: "newname" });
  assert.equal(result.status, "success");
  assert.equal(result.message, "Username updated.");
  assert.equal(result.updatedDisplayName, "newname");
  assert.equal(f.requests.length, 1);
  const [request] = f.requests;
  assert.equal(request.method, "PUT");
  assert.equal(request.url, "https://synthetic.supabase.test/auth/v1/user");
  assert.equal(request.bearer, ACCESS_TOKEN);
  assert.equal(JSON.stringify(request.body), JSON.stringify({ data: { username: "newname", display_name: "newname", theme: "dark" } }));
  assert.equal(JSON.stringify(f.revalidated), JSON.stringify(["/settings", "/account"]));
  assert.equal(f.logs.length, 0);
});

test("an email change sends the email only and asks the member to confirm it", async () => {
  const f = fixture();
  const result = await f.save({ email: "  New@Example.TEST " });
  assert.equal(result.status, "success");
  assert.equal(result.message, "Account updated. Check your inbox to confirm the new email if required.");
  assert.equal(JSON.stringify(f.requests.map((r) => r.body)), JSON.stringify([{ email: "new@example.test" }]));
});

test("changing both sends one request carrying both", async () => {
  const f = fixture();
  await f.save({ email: "new@example.test", username: "newname" });
  assert.equal(f.requests.length, 1);
  assert.equal(f.requests[0].body.email, "new@example.test");
  assert.equal(f.requests[0].body.data.username, "newname");
});

test("nothing changed makes no provider request", async () => {
  const f = fixture();
  const result = await f.save({});
  assert.equal(result.status, "success");
  assert.equal(result.message, "Account details are already up to date.");
  assert.equal(f.requests.length, 0);
  assert.equal(f.revalidated.length, 0);
});

test("invalid input is rejected before any provider request", async () => {
  const f = fixture();
  assert.equal((await f.save({ email: "not-an-email" })).message, "Enter a valid email address.");
  assert.equal((await f.save({ username: "x" })).message, usernamePolicy.USERNAME_VALIDATION_MESSAGE);
  assert.equal((await f.save({ username: "has space" })).status, "error");
  assert.equal(f.requests.length, 0);
});

test("provider failures show fixed copy only: an email used by another account reads like any other failure", async () => {
  const generic = "We could not update your account details. Check them and try again.";
  const cases = [
    [{ status: 422, error_code: "email_exists", msg: "A user with this email address has already been registered" }, generic],
    [{ status: 422, error_code: "user_already_exists", msg: "User already registered" }, generic],
    [{ status: 500, error_code: "unexpected_failure", msg: "Database error updating user" }, generic],
    [{ status: 400, error_code: "validation_failed", msg: "unable to validate email address: invalid format" }, generic],
    [{ status: 401, error_code: "bad_jwt", msg: "invalid JWT: token is expired" }, "Your session ended. Sign in again, then try once more."],
    [{ status: 429, error_code: "over_email_send_rate_limit", msg: "email rate limit exceeded" }, "Too many attempts. Please wait a few minutes and try again."],
    [{ status: 500, error_code: "unexpected_failure", msg: "ACCOUNT_USERNAME_TAKEN" }, "That username is taken. Pick another one."],
  ];
  for (const [failure, expected] of cases) {
    const f = fixture({ failure });
    const result = await f.save({ email: "someone.else@example.test" });
    assert.equal(result.status, "error", failure.error_code);
    assert.equal(result.message, expected, failure.error_code);
    for (const text of ["already been registered", "User already registered", "Database error", "unable to validate", "token is expired", "rate limit exceeded"]) {
      assert.ok(!result.message.includes(text), `${failure.error_code}: ${text}`);
    }
    // Machine code and status only: no message, no address.
    assert.equal(JSON.stringify(f.logs), JSON.stringify([["Account update failed", { code: failure.error_code, status: failure.status }]]));
    assert.equal(f.revalidated.length, 0);
  }
});

test("a network failure shows the generic copy and logs no provider text", async () => {
  const f = fixture({ throwOnFetch: true });
  const result = await f.save({ username: "newname" });
  assert.equal(result.status, "error");
  assert.equal(result.message, "We could not update your account details. Check them and try again.");
  assert.ok(!JSON.stringify(f.logs).includes("fetch failed"));
});
