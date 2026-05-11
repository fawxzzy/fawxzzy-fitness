import test from "node:test";
import assert from "node:assert/strict";
import { recoverSupabaseSessionFromCookies } from "@/lib/supabase/session-recovery";

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function buildJwtWithExp(exp: number) {
  return [
    encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" })),
    encodeBase64Url(JSON.stringify({ exp })),
    "signature",
  ].join(".");
}

test("recoverSupabaseSessionFromCookies reuses a fresh access token without refreshing", async () => {
  let refreshCalls = 0;
  const result = await recoverSupabaseSessionFromCookies({
    accessToken: buildJwtWithExp(Math.floor(Date.now() / 1000) + 3_600),
    refreshToken: "refresh-123",
    client: {
      auth: {
        async refreshSession() {
          refreshCalls += 1;
          return {
            data: { session: null },
            error: null,
          };
        },
      },
    },
  });

  assert.equal(result.status, "existing");
  assert.equal(refreshCalls, 0);
});

test("recoverSupabaseSessionFromCookies can recover with only a refresh cookie", async () => {
  let refreshArg: { refresh_token: string } | undefined;
  const result = await recoverSupabaseSessionFromCookies({
    refreshToken: "refresh-456",
    client: {
      auth: {
        async refreshSession(currentSession) {
          refreshArg = currentSession;
          return {
            data: {
              session: {
                access_token: "new-access",
                refresh_token: "new-refresh",
              },
            },
            error: null,
          };
        },
      },
    },
  });

  assert.deepEqual(refreshArg, { refresh_token: "refresh-456" });
  assert.deepEqual(result, {
    status: "refreshed",
    authState: "missing-access-cookie-recovered",
    session: {
      accessToken: "new-access",
      refreshToken: "new-refresh",
    },
  });
});

test("recoverSupabaseSessionFromCookies refreshes an expired access token with the refresh cookie", async () => {
  const result = await recoverSupabaseSessionFromCookies({
    accessToken: buildJwtWithExp(Math.floor(Date.now() / 1000) - 60),
    refreshToken: "refresh-789",
    client: {
      auth: {
        async refreshSession() {
          return {
            data: {
              session: {
                access_token: "fresh-access",
                refresh_token: "fresh-refresh",
              },
            },
            error: null,
          };
        },
      },
    },
  });

  assert.deepEqual(result, {
    status: "refreshed",
    authState: "refreshed-from-refresh-cookie",
    session: {
      accessToken: "fresh-access",
      refreshToken: "fresh-refresh",
    },
  });
});

test("recoverSupabaseSessionFromCookies classifies invalid refresh token failures", async () => {
  const result = await recoverSupabaseSessionFromCookies({
    refreshToken: "refresh-bad",
    client: {
      auth: {
        async refreshSession() {
          return {
            data: { session: null },
            error: new Error("Invalid Refresh Token: Refresh Token Not Found"),
          };
        },
      },
    },
  });

  assert.equal(result.status, "failed");
  if (result.status !== "failed") {
    return;
  }

  assert.deepEqual(result.failure, {
    reason: "refresh-token-invalid",
    loginErrorCode: "session_expired",
  });
});

test("recoverSupabaseSessionFromCookies treats whitespace-only tokens as anonymous", async () => {
  const result = await recoverSupabaseSessionFromCookies({
    accessToken: "   ",
    refreshToken: "   ",
  });

  assert.deepEqual(result, {
    status: "anonymous",
    authState: "no-cookies",
  });
});
