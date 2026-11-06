import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  getLoginResolutionFailureMessage,
  LOGIN_INVALID_CREDENTIALS_MESSAGE,
  LOGIN_USERNAME_NOT_RECOGNIZED_MESSAGE,
  LOGIN_USERNAME_UNAVAILABLE_MESSAGE,
  resolveLoginIdentifierEmail,
  resolveUsernameEmailFromIndex,
} from "./username-signin-index.ts";

const USER_ID = "11111111-2222-3333-4444-555555555555";
const sha = (value: string) => createHash("sha256").update(value).digest("hex");

test("email login preserves the direct path without invoking username resolution", async () => {
  let resolverCalls = 0;
  const email = await resolveLoginIdentifierEmail("user@example.com", async () => {
    resolverCalls++;
    return null;
  });
  assert.equal(email, "user@example.com");
  assert.equal(resolverCalls, 0);
});

test("username login resolves one indexed user without enumerating Auth users", async () => {
  let requestedId = "";
  let observedUrl = "";
  let observedInit: RequestInit | undefined;
  const email = await resolveUsernameEmailFromIndex({
    identifier: "fawxzzy",
    clientAddress: "192.0.2.5",
    supabaseUrl: "https://example.supabase.co",
    serviceCredential: "sb_secret_test-only",
    fetchImpl: async (url, init) => {
      observedUrl = String(url);
      observedInit = init;
      return Response.json([{ resolved_user_id: USER_ID }]);
    },
    getUserById: async (id) => {
      requestedId = id;
      return { email: "User@Example.com" };
    },
  });
  assert.equal(observedUrl, "https://example.supabase.co/rest/v1/rpc/account_resolve_username_signin_v2");
  assert.equal(observedInit?.method, "POST");
  assert.equal(new Headers(observedInit?.headers).get("Content-Profile"), "account_api");
  assert.equal(new Headers(observedInit?.headers).get("apikey"), "sb_secret_test-only");
  assert.equal(new Headers(observedInit?.headers).get("Authorization"), null);
  assert.deepEqual(JSON.parse(String(observedInit?.body)), {
    p_normalized_username: "fawxzzy",
    p_attempt_key: sha("username:fawxzzy"),
    p_client_attempt_key: sha("client:192.0.2.5"),
  });
  assert.equal(requestedId, USER_ID);
  assert.equal(email, "user@example.com");
});

test("a unique legacy display-name alias uses the same rate-limited resolver contract", async () => {
  const identifiers: string[] = [];
  const email = await resolveUsernameEmailFromIndex({
    identifier: "legacyalias",
    clientAddress: "192.0.2.6",
    supabaseUrl: "https://example.supabase.co",
    serviceCredential: "sb_secret_test-only",
    fetchImpl: async (_url, init) => {
      identifiers.push(JSON.parse(String(init?.body)).p_normalized_username);
      return Response.json([{ resolved_user_id: USER_ID }]);
    },
    getUserById: async () => ({ email: "Alias@Example.com" }),
  });
  assert.deepEqual(identifiers, ["legacyalias"]);
  assert.equal(email, "alias@example.com");
});

test("an ambiguous legacy alias fails closed without selecting an account", async () => {
  let userReads = 0;
  const email = await resolveUsernameEmailFromIndex({
    identifier: "sharedalias",
    clientAddress: "192.0.2.7",
    supabaseUrl: "https://example.supabase.co",
    serviceCredential: "sb_secret_test-only",
    fetchImpl: async () => Response.json([
      { resolved_user_id: USER_ID },
      { resolved_user_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" },
    ]),
    getUserById: async () => {
      userReads++;
      return { email: "wrong@example.com" };
    },
  });
  assert.equal(email, null);
  assert.equal(userReads, 0);
});

test("an indexed identity missing from Auth fails closed", async () => {
  assert.equal(await resolveUsernameEmailFromIndex({
    identifier: "fawxzzy",
    clientAddress: "unknown",
    supabaseUrl: "https://example.supabase.co",
    serviceCredential: "sb_secret_test-only",
    fetchImpl: async () => Response.json([{ resolved_user_id: USER_ID }]),
    getUserById: async () => null,
  }), null);
});

test("username lookup fails closed on provider errors, ambiguity, or malformed identity", async () => {
  let userReads = 0;
  const failures: string[] = [];
  for (const response of [
    new Response(null, { status: 500 }),
    Response.json([]),
    Response.json([{ resolved_user_id: USER_ID }, { resolved_user_id: USER_ID }]),
    Response.json([{ resolved_user_id: "not-a-uuid" }]),
  ]) {
    assert.equal(await resolveUsernameEmailFromIndex({
      identifier: "fawxzzy",
      clientAddress: "unknown",
      supabaseUrl: "https://example.supabase.co",
      serviceCredential: "sb_secret_test-only",
      fetchImpl: async () => response,
      onLookupFailure: (code) => failures.push(code),
      getUserById: async () => {
        userReads++;
        return { email: "user@example.com" };
      },
    }), null);
  }
  assert.equal(userReads, 0);
  assert.deepEqual(failures, ["resolver_unavailable", "invalid_resolver_response"]);
});

test("single-user lookup must return a valid email", async () => {
  assert.equal(await resolveUsernameEmailFromIndex({
    identifier: "fawxzzy",
    clientAddress: "unknown",
    supabaseUrl: "https://example.supabase.co",
    serviceCredential: "sb_secret_test-only",
    fetchImpl: async () => Response.json([{ resolved_user_id: USER_ID }]),
    getUserById: async () => ({ email: null }),
  }), null);
});

test("invalid usernames never reach the resolver", async () => {
  let calls = 0;
  assert.equal(await resolveUsernameEmailFromIndex({
    identifier: "User@Example.com",
    clientAddress: "unknown",
    supabaseUrl: "https://example.supabase.co",
    serviceCredential: "sb_secret_test-only",
    fetchImpl: async () => {
      calls++;
      return Response.json([]);
    },
    getUserById: async () => null,
  }), null);
  assert.equal(calls, 0);
});

test("legacy service-role JWT is sent in both API-key and Bearer headers", async () => {
  let authorization: string | null = null;
  const credential = "header.payload.signature";
  await resolveUsernameEmailFromIndex({
    identifier: "fawxzzy",
    clientAddress: "unknown",
    supabaseUrl: "https://example.supabase.co",
    serviceCredential: credential,
    fetchImpl: async (_url, init) => {
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("apikey"), credential);
      authorization = headers.get("Authorization");
      return Response.json([]);
    },
    getUserById: async () => null,
  });
  assert.equal(authorization, `Bearer ${credential}`);
});

const resolverArgs = {
  identifier: "fawxzzy",
  clientAddress: "192.0.2.9",
  supabaseUrl: "https://example.supabase.co",
  serviceCredential: "sb_secret_test-only",
  getUserById: async () => ({ email: "user@example.com" }),
};

test("the resolver is called exactly once per sign-in, whatever it returns, so the DB throttle is never double counted", async () => {
  for (const respond of [
    () => Response.json([]),
    () => new Response(null, { status: 401 }),
    () => new Response(null, { status: 503 }),
    () => {
      throw new TypeError("fetch failed");
    },
  ]) {
    let calls = 0;
    const failures: string[] = [];
    const email = await resolveUsernameEmailFromIndex({
      ...resolverArgs,
      onLookupFailure: (code) => failures.push(code),
      fetchImpl: async () => {
        calls++;
        return respond();
      },
    });
    assert.equal(email, null);
    assert.equal(calls, 1);
    assert.ok(failures.length <= 1);
  }
});

test("transport failures and 5xx are reported as resolver_unavailable", async () => {
  for (const respond of [() => new Response(null, { status: 502 }), () => { throw new TypeError("fetch failed"); }]) {
    const failures: string[] = [];
    await resolveUsernameEmailFromIndex({
      ...resolverArgs,
      onLookupFailure: (code) => failures.push(code),
      fetchImpl: async () => respond(),
    });
    assert.deepEqual(failures, ["resolver_unavailable"]);
  }
});

test("a throw from the Auth user read is auth_user_unavailable, not resolver_unavailable", async () => {
  const failures: string[] = [];
  const email = await resolveUsernameEmailFromIndex({
    ...resolverArgs,
    onLookupFailure: (code) => failures.push(code),
    fetchImpl: async () => Response.json([{ resolved_user_id: USER_ID }]),
    getUserById: async () => {
      throw new Error("auth admin down");
    },
  });
  assert.equal(email, null);
  assert.deepEqual(failures, ["auth_user_unavailable"]);
});

test("each resolver request is time bounded", async () => {
  let signal: AbortSignal | null | undefined;
  await resolveUsernameEmailFromIndex({
    ...resolverArgs,
    fetchImpl: async (_url, init) => {
      signal = init?.signal;
      return Response.json([]);
    },
  });
  assert.ok(signal instanceof AbortSignal);
});

test("login failure copy separates provider outages from throttled or unknown usernames without confirming accounts", () => {
  assert.equal(
    getLoginResolutionFailureMessage({ identifier: "fawxzzy", lookupFailure: "resolver_unavailable" }),
    LOGIN_USERNAME_UNAVAILABLE_MESSAGE,
  );
  assert.equal(
    getLoginResolutionFailureMessage({ identifier: "fawxzzy", lookupFailure: null }),
    LOGIN_USERNAME_NOT_RECOGNIZED_MESSAGE,
  );
  assert.equal(
    getLoginResolutionFailureMessage({ identifier: "not a username!", lookupFailure: null }),
    LOGIN_INVALID_CREDENTIALS_MESSAGE,
  );
  // Failures that only occur after the resolver returned a row (existing username) must not be distinguishable.
  for (const code of ["auth_user_unavailable", "invalid_resolver_response"] as const) {
    assert.equal(
      getLoginResolutionFailureMessage({ identifier: "fawxzzy", lookupFailure: code }),
      getLoginResolutionFailureMessage({ identifier: "ghost-user", lookupFailure: null }),
    );
  }
  // Unknown and throttled usernames share one message.
  assert.equal(
    getLoginResolutionFailureMessage({ identifier: "ghost-user", lookupFailure: null }),
    getLoginResolutionFailureMessage({ identifier: "fawxzzy", lookupFailure: null }),
  );
});
