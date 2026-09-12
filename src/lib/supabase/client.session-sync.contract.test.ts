import assert from "node:assert/strict";
import test from "node:test";

import { syncSessionCookies } from "./client.ts";

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
