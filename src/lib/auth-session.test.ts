import test from "node:test";
import assert from "node:assert/strict";
import {
  ACCESS_COOKIE_NAME,
  buildSessionRecoveryPath,
  classifyAuthSessionFailure,
  clearSessionCookies,
  REFRESH_COOKIE_NAME,
  serializeRequestCookiesWithSession,
  SESSION_EXPIRED_LOGIN_ERROR,
  setSessionCookies,
  shouldRefreshAuthSession,
} from "./auth-session.ts";

function createCookieWriter() {
  const writes: Array<{
    name: string;
    options: Record<string, unknown>;
    value: string;
  }> = [];

  return {
    writes,
    writer: {
      set(name: string, value: string, options: Record<string, unknown>) {
        writes.push({ name, value, options });
      },
    },
  };
}

test("shouldRefreshAuthSession protects app boot and authenticated routes", () => {
  assert.equal(shouldRefreshAuthSession("/"), true);
  assert.equal(shouldRefreshAuthSession("/entry"), true);
  assert.equal(shouldRefreshAuthSession("/today"), true);
  assert.equal(shouldRefreshAuthSession("/session/abc123"), true);
  assert.equal(shouldRefreshAuthSession("/curated-onboarding"), true);
});

test("shouldRefreshAuthSession skips public auth and install routes", () => {
  assert.equal(shouldRefreshAuthSession("/login"), false);
  assert.equal(shouldRefreshAuthSession("/signup"), false);
  assert.equal(shouldRefreshAuthSession("/forgot-password"), false);
  assert.equal(shouldRefreshAuthSession("/auth/confirm"), false);
  assert.equal(shouldRefreshAuthSession("/install"), false);
  assert.equal(shouldRefreshAuthSession("/api/app-version"), false);
});

test("classifyAuthSessionFailure treats expired and invalid tokens as session-expired logins", () => {
  assert.deepEqual(classifyAuthSessionFailure(new Error("JWT expired")), {
    reason: "jwt-expired",
    loginErrorCode: SESSION_EXPIRED_LOGIN_ERROR,
  });
  assert.deepEqual(classifyAuthSessionFailure(new Error("Invalid Refresh Token: Refresh Token Not Found")), {
    reason: "refresh-token-invalid",
    loginErrorCode: SESSION_EXPIRED_LOGIN_ERROR,
  });
  assert.deepEqual(classifyAuthSessionFailure(new Error("Auth session missing!")), {
    reason: "auth-session-missing",
    loginErrorCode: SESSION_EXPIRED_LOGIN_ERROR,
  });
  assert.deepEqual(classifyAuthSessionFailure(new Error("invalid JWT: token contains an invalid number of segments")), {
    reason: "jwt-invalid",
    loginErrorCode: SESSION_EXPIRED_LOGIN_ERROR,
  });
});

test("classifyAuthSessionFailure ignores unrelated server failures", () => {
  assert.equal(classifyAuthSessionFailure(new Error("connection timeout talking to profiles table")), null);
  assert.equal(classifyAuthSessionFailure({ message: "unexpected server error", status: 500 }), null);
});

test("setSessionCookies writes both auth cookies with secure session settings", () => {
  const { writer, writes } = createCookieWriter();

  setSessionCookies(writer, {
    accessToken: "access-123",
    refreshToken: "refresh-456",
  });

  assert.equal(writes.length, 2);
  assert.equal(writes[0]?.name, ACCESS_COOKIE_NAME);
  assert.equal(writes[0]?.value, "access-123");
  assert.equal(writes[1]?.name, REFRESH_COOKIE_NAME);
  assert.equal(writes[1]?.value, "refresh-456");
  assert.equal(writes[1]?.options.maxAge, 60 * 60 * 24 * 30);
});

test("clearSessionCookies expires both auth cookies", () => {
  const { writer, writes } = createCookieWriter();

  clearSessionCookies(writer);

  assert.equal(writes.length, 2);
  assert.equal(writes[0]?.name, ACCESS_COOKIE_NAME);
  assert.equal(writes[1]?.name, REFRESH_COOKIE_NAME);
  assert.equal(writes[0]?.value, "");
  assert.equal(writes[1]?.value, "");
  assert.ok(writes[0]?.options.expires instanceof Date);
  assert.ok(writes[1]?.options.expires instanceof Date);
});

test("serializeRequestCookiesWithSession preserves unrelated cookies and replaces auth cookies", () => {
  const cookieHeader = serializeRequestCookiesWithSession([
    { name: "theme", value: "rose" },
    { name: ACCESS_COOKIE_NAME, value: "stale-access" },
    { name: REFRESH_COOKIE_NAME, value: "stale-refresh" },
  ], {
    accessToken: "fresh access",
    refreshToken: "fresh/refresh",
  });

  assert.equal(cookieHeader, "theme=rose; sb-access-token=fresh%20access; sb-refresh-token=fresh%2Frefresh");
});

test("buildSessionRecoveryPath targets the cookie-clearing auth recovery route", () => {
  assert.equal(
    buildSessionRecoveryPath(),
    "/auth/session-recovery?error=session_expired",
  );
});
