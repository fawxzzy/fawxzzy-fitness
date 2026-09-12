import assert from "node:assert/strict";
import test from "node:test";

import { clearBrowserSupabaseSession, syncSessionCookies } from "./client.ts";

test("same-origin cookie sync persists the server-rotated pair before a later refresh can revoke its parent", async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const persisted: Array<{ accessToken: string; refreshToken: string }> = [];

  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  globalThis.fetch = async (input, init) => {
    assert.equal(input, "/auth/session-sync");
    assert.equal(init?.method, "POST");
    assert.equal(init?.credentials, "same-origin");
    return new Response(JSON.stringify({
      ok: true,
      session: {
        accessToken: "access-r1",
        refreshToken: "refresh-r1",
      },
    }), { status: 200 });
  };

  try {
    await syncSessionCookies(
      { access_token: "access-r0", refresh_token: "refresh-r0" },
      async (tokens) => { persisted.push(tokens); },
    );
  } finally {
    globalThis.fetch = originalFetch;
    Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
  }

  assert.deepEqual(persisted, [{ accessToken: "access-r1", refreshToken: "refresh-r1" }]);
});

test("a returned browser persistence error clears the sync signature so the parent pair can retry", async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  let attempts = 0;

  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  globalThis.fetch = async () => {
    attempts += 1;
    return new Response(JSON.stringify({
      session: {
        accessToken: "access-persist-error-r1",
        refreshToken: "refresh-persist-error-r1",
      },
    }), { status: 200 });
  };

  try {
    await syncSessionCookies(
      { access_token: "access-persist-error-r0", refresh_token: "refresh-persist-error-r0" },
      async () => ({ error: new Error("storage unavailable") }),
    );
    await syncSessionCookies(
      { access_token: "access-persist-error-r0", refresh_token: "refresh-persist-error-r0" },
      async () => ({ error: new Error("storage unavailable") }),
    );
  } finally {
    globalThis.fetch = originalFetch;
    Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
  }

  assert.equal(attempts, 2);
});

test("a newer session event prevents an older response from overwriting its token lineage", async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const persisted: Array<{ accessToken: string; refreshToken: string }> = [];
  let resolveOlderResponse: ((response: Response) => void) | undefined;
  let fetches = 0;

  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  globalThis.fetch = async (_input, init) => {
    fetches += 1;
    const body = JSON.parse(String(init?.body)) as { accessToken: string };
    if (body.accessToken === "access-older-r0") {
      return new Promise<Response>((resolve) => {
        resolveOlderResponse = resolve;
      });
    }

    return new Response(JSON.stringify({
      session: {
        accessToken: "access-newer-r1",
        refreshToken: "refresh-newer-r1",
      },
    }), { status: 200 });
  };

  try {
    const older = syncSessionCookies(
      { access_token: "access-older-r0", refresh_token: "refresh-older-r0" },
      async (tokens) => { persisted.push(tokens); },
    );
    while (!resolveOlderResponse) {
      await Promise.resolve();
    }

    const newer = syncSessionCookies(
      { access_token: "access-newer-r0", refresh_token: "refresh-newer-r0" },
      async (tokens) => { persisted.push(tokens); },
    );
    resolveOlderResponse(new Response(JSON.stringify({
      session: {
        accessToken: "access-older-r1",
        refreshToken: "refresh-older-r1",
      },
    }), { status: 200 }));

    await Promise.all([older, newer]);
  } finally {
    globalThis.fetch = originalFetch;
    Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
  }

  assert.equal(fetches, 2);
  assert.deepEqual(persisted, [{ accessToken: "access-newer-r1", refreshToken: "refresh-newer-r1" }]);
});

test("an immediate sign-out suppresses a queued stale POST and serializes cookie cleanup", async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const calls: string[] = [];
  let persisted = 0;

  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  globalThis.fetch = async (_input, init) => {
    calls.push(String(init?.method));
    return new Response(JSON.stringify({
      session: {
        accessToken: "access-signout-r1",
        refreshToken: "refresh-signout-r1",
      },
    }), { status: 200 });
  };

  try {
    // Clear state carried by earlier contract tests without making its cleanup
    // part of this test's assertion.
    await syncSessionCookies(null);
    calls.length = 0;

    const staleSync = syncSessionCookies(
      { access_token: "access-signout-r0", refresh_token: "refresh-signout-r0" },
      async () => { persisted += 1; },
    );
    const signOut = syncSessionCookies(null);

    await Promise.all([staleSync, signOut]);
  } finally {
    globalThis.fetch = originalFetch;
    Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
  }

  assert.deepEqual(calls, ["DELETE"]);
  assert.equal(persisted, 0);
});

test("duplicate same-pair syncs are coalesced before the cookie endpoint rotates the pair", async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  let fetches = 0;
  let persisted = 0;

  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  globalThis.fetch = async () => {
    fetches += 1;
    return new Response(JSON.stringify({
      session: {
        accessToken: "access-duplicate-r1",
        refreshToken: "refresh-duplicate-r1",
      },
    }), { status: 200 });
  };

  try {
    await syncSessionCookies(null);
    fetches = 0;

    await Promise.all([
      syncSessionCookies(
        { access_token: "access-duplicate-r0", refresh_token: "refresh-duplicate-r0" },
        async () => { persisted += 1; },
      ),
      syncSessionCookies(
        { access_token: "access-duplicate-r0", refresh_token: "refresh-duplicate-r0" },
        async () => { persisted += 1; },
      ),
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
  }

  assert.equal(fetches, 1);
  assert.equal(persisted, 1);
});

test("the public sign-out path waits for an in-flight sync before deleting cookies", async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const calls: string[] = [];
  let persisted = 0;
  let resolvePost: ((response: Response) => void) | undefined;

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        length: 0,
        key: () => null,
        removeItem: () => undefined,
      },
      indexedDB: {
        deleteDatabase: () => undefined,
      },
    },
  });
  globalThis.fetch = async (_input, init) => {
    const method = String(init?.method);
    calls.push(method);
    if (method === "POST") {
      return new Promise<Response>((resolve) => {
        resolvePost = resolve;
      });
    }

    return new Response(null, { status: 204 });
  };

  try {
    await syncSessionCookies(null);
    calls.length = 0;

    const staleSync = syncSessionCookies(
      { access_token: "access-public-signout-r0", refresh_token: "refresh-public-signout-r0" },
      async () => { persisted += 1; },
    );
    while (!resolvePost) {
      await Promise.resolve();
    }

    const signOut = clearBrowserSupabaseSession(async () => undefined);
    resolvePost(new Response(JSON.stringify({
      session: {
        accessToken: "access-public-signout-r1",
        refreshToken: "refresh-public-signout-r1",
      },
    }), { status: 200 }));

    await Promise.all([staleSync, signOut]);
  } finally {
    globalThis.fetch = originalFetch;
    Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
  }

  assert.deepEqual(calls, ["POST", "DELETE"]);
  assert.equal(persisted, 0);
});
