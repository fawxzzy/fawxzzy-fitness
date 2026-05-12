import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server.js";
import { handleSessionKeepaliveRequest } from "@/lib/session-keepalive";

test("session keepalive returns anonymous when no auth cookies exist", async () => {
  const request = new NextRequest("https://example.com/auth/session-keepalive");
  const response = await handleSessionKeepaliveRequest(request, {
    async recoverSession() {
      return {
        status: "anonymous",
        authState: "no-cookies",
      };
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    authState: "anonymous",
    recoveryState: "no-cookies",
  });
});

test("session keepalive refreshes the durable session cookies", async () => {
  const request = new NextRequest("https://example.com/auth/session-keepalive", {
    headers: {
      cookie: "sb-refresh-token=refresh-123",
    },
  });
  const response = await handleSessionKeepaliveRequest(request, {
    async recoverSession() {
      return {
        status: "refreshed",
        authState: "missing-access-cookie-recovered",
        session: {
          accessToken: "new-access",
          refreshToken: "new-refresh",
        },
      };
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    authState: "refreshed",
    recoveryState: "missing-access-cookie-recovered",
  });
  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /sb-access-token=new-access/);
  assert.match(setCookie, /sb-refresh-token=new-refresh/);
});

test("session keepalive clears cookies when refresh recovery fails", async () => {
  const request = new NextRequest("https://example.com/auth/session-keepalive", {
    headers: {
      cookie: "sb-refresh-token=bad-refresh",
    },
  });
  const response = await handleSessionKeepaliveRequest(request, {
    async recoverSession() {
      return {
        status: "failed",
        failure: {
          reason: "refresh-token-invalid",
          loginErrorCode: "session_expired",
        },
        error: new Error("Invalid Refresh Token: Refresh Token Not Found"),
      };
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    authState: "expired",
    recoveryState: "refresh-token-invalid",
  });
  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /sb-access-token=;/);
  assert.match(setCookie, /sb-refresh-token=;/);
});
