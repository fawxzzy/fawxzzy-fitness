import test from "node:test";
import assert from "node:assert/strict";
import { DELETE, POST } from "@/app/auth/session-sync/route";

test("session sync rejects invalid JSON payloads", async () => {
  const response = await POST(new Request("https://example.com/auth/session-sync", {
    body: "{not-json",
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  }));

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: "Invalid session payload.",
  });
  assert.equal(response.headers.get("cache-control"), "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
});

test("session sync rejects missing or empty tokens after trimming", async () => {
  const response = await POST(new Request("https://example.com/auth/session-sync", {
    body: JSON.stringify({
      accessToken: "   ",
      refreshToken: "refresh-token",
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  }));

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: "Missing session tokens.",
  });
  assert.equal(response.headers.get("set-cookie"), null);
});

test("session sync writes durable auth cookies for valid browser session handoff", async () => {
  const response = await POST(new Request("https://example.com/auth/session-sync", {
    body: JSON.stringify({
      accessToken: "  access-token  ",
      refreshToken: " refresh-token ",
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  }));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(response.headers.get("cache-control"), "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /sb-access-token=access-token/);
  assert.match(setCookie, /sb-refresh-token=refresh-token/);
});

test("session sync delete clears auth cookies and is not cacheable", async () => {
  const response = await DELETE();

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(response.headers.get("cache-control"), "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /sb-access-token=;/);
  assert.match(setCookie, /sb-refresh-token=;/);
});
