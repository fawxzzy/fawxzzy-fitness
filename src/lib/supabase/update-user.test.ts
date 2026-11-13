import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import { decodeJwtClaims, updateUserWithAccessToken } from "./update-user.ts";

const URL_BASE = "https://synthetic.supabase.test";
const ANON = "anon-synthetic";
const b64url = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
const ACCESS = `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({ sub: "synthetic-user", session_id: "s1", aud: "authenticated", role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`;

type Recorded = { method: string; path: string; search: string; headers: Record<string, string>; body: unknown };

function recorder(respond?: (request: Recorded) => Response | Promise<Response>) {
  const requests: Recorded[] = [];
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const target = new globalThis.URL(String(input));
    const headers: Record<string, string> = {};
    new Headers(init?.headers).forEach((value, key) => { headers[key.toLowerCase()] = value; });
    const request: Recorded = {
      method: init?.method ?? "GET",
      path: target.pathname,
      search: target.search,
      headers,
      body: init?.body ? JSON.parse(String(init.body)) : null,
    };
    requests.push(request);
    if (respond) return respond(request);
    if (request.path.endsWith("/user") && request.method === "GET") return json({ id: "synthetic-user", email: "member@example.test" });
    if (request.path.endsWith("/user")) return json({ id: "synthetic-user", email: "member@example.test" });
    return json({}, 404);
  }) as typeof fetch;
  return { requests, fetchImpl };
}

const deps = (fetchImpl: typeof fetch, accessToken: string | null | undefined = ACCESS) => ({ supabaseUrl: URL_BASE, anonKey: ANON, accessToken, fetchImpl });

test("the write is the same PUT /auth/v1/user the SDK sends (wire parity with the real client)", async () => {
  const attributes = { email: "new@example.test", password: "  a long passphrase \u00e9\u0301 ", data: { username: "member", display_name: "member", theme: "dark" } };

  // Reference: the real SDK client holding a session, against a stub fetch.
  const reference = recorder();
  const client = createClient(URL_BASE, ANON, { auth: { autoRefreshToken: false, persistSession: false }, global: { fetch: reference.fetchImpl } });
  const set = await client.auth.setSession({ access_token: ACCESS, refresh_token: "reference-refresh" });
  assert.equal(set.error, null);
  const updated = await client.auth.updateUser(attributes);
  assert.equal(updated.error, null);
  const sdkPut = reference.requests.find((request) => request.method === "PUT");
  assert.ok(sdkPut);

  const ours = recorder();
  const result = await updateUserWithAccessToken(attributes, deps(ours.fetchImpl));
  assert.deepEqual(result, { ok: true });
  assert.equal(ours.requests.length, 1);
  const [put] = ours.requests;

  assert.equal(put.method, sdkPut.method);
  assert.equal(put.path, sdkPut.path);
  assert.equal(put.search, sdkPut.search);
  for (const name of ["apikey", "authorization", "content-type", "x-supabase-api-version"]) {
    assert.equal(put.headers[name], sdkPut.headers[name], name);
  }
  // The SDK adds null PKCE fields; everything else in the body must be identical.
  const sdkBody = { ...(sdkPut.body as Record<string, unknown>) };
  delete sdkBody.code_challenge;
  delete sdkBody.code_challenge_method;
  assert.deepEqual(put.body, sdkBody);
});

test("it never sends a refresh token and trims a trailing slash from the project URL", async () => {
  const { requests, fetchImpl } = recorder();
  await updateUserWithAccessToken({ password: "synthetic passphrase" }, { supabaseUrl: `${URL_BASE}///`, anonKey: ANON, accessToken: ACCESS, fetchImpl });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].path, "/auth/v1/user");
  assert.ok(!JSON.stringify(requests[0]).toLowerCase().includes("refresh"));
  assert.equal(requests[0].headers.authorization, `Bearer ${ACCESS}`);
});

test("without an access token nothing is sent and the result is session_expired", async () => {
  for (const token of [undefined, null, "", "   "]) {
    const { requests, fetchImpl } = recorder();
    const result = await updateUserWithAccessToken({ password: "synthetic passphrase" }, { supabaseUrl: URL_BASE, anonKey: ANON, accessToken: token, fetchImpl });
    assert.deepEqual(result, { ok: false, reason: "session_expired", code: "no_access_token", status: null });
    assert.equal(requests.length, 0);
  }
});

test("an update with no attributes sends nothing", async () => {
  const { requests, fetchImpl } = recorder();
  assert.deepEqual(await updateUserWithAccessToken({}, deps(fetchImpl)), { ok: true });
  assert.deepEqual(await updateUserWithAccessToken({ email: undefined, data: undefined }, deps(fetchImpl)), { ok: true });
  assert.equal(requests.length, 0);
});

test("provider failures map to a small reason set and never return the provider's text", async () => {
  const cases: Array<[number, Record<string, unknown>, string]> = [
    [401, { code: 401, error_code: "bad_jwt", msg: "invalid JWT: token is expired" }, "session_expired"],
    [403, { code: 403, error_code: "session_not_found", msg: "Session from session_id claim in JWT does not exist" }, "session_expired"],
    [401, { message: "jwt expired" }, "session_expired"],
    [401, { message: "Unauthorized" }, "session_expired"],
    [422, { code: 422, error_code: "same_password", msg: "New password should be different from the old password." }, "same_password"],
    [422, { code: 422, error_code: "weak_password", msg: "Password is known to be weak" }, "weak_password"],
    [429, { code: 429, error_code: "over_request_rate_limit", msg: "Request rate limit reached" }, "rate_limited"],
    [429, { code: 429, error_code: "over_email_send_rate_limit", msg: "email rate limit exceeded" }, "rate_limited"],
    [500, { code: 500, error_code: "unexpected_failure", msg: "ACCOUNT_USERNAME_TAKEN: username already in use" }, "username_taken"],
    // An email already used by another account must not turn into anything distinguishable.
    [422, { code: 422, error_code: "email_exists", msg: "A user with this email address has already been registered" }, "failed"],
    [422, { code: 422, error_code: "user_already_exists", msg: "User already registered" }, "failed"],
    [500, { code: 500, error_code: "unexpected_failure", msg: "Database error updating user" }, "failed"],
    [400, { code: 400, error_code: "validation_failed", msg: "unable to validate email address" }, "failed"],
  ];
  for (const [status, body, reason] of cases) {
    const { fetchImpl } = recorder(() => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));
    const result = await updateUserWithAccessToken({ email: "new@example.test" }, deps(fetchImpl));
    assert.equal(result.ok, false, JSON.stringify(body));
    if (result.ok) continue;
    assert.equal(result.reason, reason, JSON.stringify(body));
    assert.equal(result.status, status);
    const serialized = JSON.stringify(result);
    for (const text of ["already been registered", "User already registered", "token is expired", "Database error", "unable to validate", "known to be weak"]) {
      assert.ok(!serialized.includes(text), `${reason}: ${text}`);
    }
  }
});

test("a non-JSON failure body, a network failure and a timeout all end in a generic failure", async () => {
  const html = recorder(() => new Response("<html>bad gateway</html>", { status: 502 }));
  assert.deepEqual(await updateUserWithAccessToken({ password: "synthetic passphrase" }, deps(html.fetchImpl)), { ok: false, reason: "failed", code: null, status: 502 });

  const network = (async () => { throw new TypeError("fetch failed"); }) as typeof fetch;
  assert.deepEqual(await updateUserWithAccessToken({ password: "synthetic passphrase" }, deps(network)), { ok: false, reason: "failed", code: null, status: null });

  const hanging = ((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("timed out", "TimeoutError")));
  })) as typeof fetch;
  const started = Date.now();
  // AbortSignal.timeout timers are unref'd; keep the loop alive for the duration of the test.
  const keepAlive = setTimeout(() => undefined, 1_000);
  const result = await updateUserWithAccessToken({ password: "synthetic passphrase" }, { ...deps(hanging), timeoutMs: 25 });
  clearTimeout(keepAlive);
  assert.deepEqual(result, { ok: false, reason: "failed", code: null, status: null });
  assert.ok(Date.now() - started < 2_000);
});

test("an undecodable or already-expired token fails fast with no request", async () => {
  const expired = `${b64url({ alg: "HS256" })}.${b64url({ sub: "u", exp: Math.floor(Date.now() / 1000) - 5 })}.sig`;
  for (const [token, code] of [["not-a-jwt", "undecodable_access_token"], ["a.b.c", "undecodable_access_token"], [expired, "expired_access_token"]] as const) {
    const { requests, fetchImpl } = recorder();
    const result = await updateUserWithAccessToken({ password: "synthetic passphrase" }, deps(fetchImpl, token));
    assert.deepEqual(result, { ok: false, reason: "session_expired", code, status: null });
    assert.equal(requests.length, 0);
  }
});

test("decodeJwtClaims reads the payload without verifying and rejects anything that is not a three-part object token", () => {
  assert.equal(decodeJwtClaims(ACCESS)?.sub, "synthetic-user");
  for (const bad of [null, undefined, "", "a.b", "a.b.c.d", `x.${b64url([1, 2])}.y`, `x.${b64url("str")}.y`]) {
    assert.equal(decodeJwtClaims(bad), null, String(bad));
  }
});
