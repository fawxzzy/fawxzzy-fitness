import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server.js";
import { handleAuthSessionMiddleware } from "@/middleware";

test("middleware recovers when only the refresh cookie is present", async () => {
  const request = new NextRequest("https://example.com/today", {
    headers: {
      cookie: "sb-refresh-token=refresh-123",
    },
  });

  const response = await handleAuthSessionMiddleware(request, {
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
  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /sb-access-token=new-access/);
  assert.match(setCookie, /sb-refresh-token=new-refresh/);
});

test("middleware clears cookies and redirects to login when refresh recovery fails", async () => {
  const request = new NextRequest("https://example.com/today", {
    headers: {
      cookie: "sb-access-token=old-access; sb-refresh-token=bad-refresh",
    },
  });

  const response = await handleAuthSessionMiddleware(request, {
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

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "https://example.com/login?error=session_expired");
  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /sb-access-token=;/);
  assert.match(setCookie, /sb-refresh-token=;/);
});
