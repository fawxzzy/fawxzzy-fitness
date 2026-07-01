import test from "node:test";
import assert from "node:assert/strict";
import {
  ACCESS_COOKIE_NAME,
  buildAccessTokenCookieLifetime,
  buildSessionRecoveryPath,
  classifyAuthSessionFailure,
  clearSessionCookies,
  PERSISTENT_SESSION_COOKIE_MAX_AGE_SECONDS,
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
  assert.equal(shouldRefreshAuthSession("/dev/stretch-session-preview"), false);
  assert.equal(shouldRefreshAuthSession("/dev/stretch-card-pass"), false);
  assert.equal(shouldRefreshAuthSession("/install"), false);
  assert.equal(shouldRefreshAuthSession("/api/app-version"), false);
  assert.equal(shouldRefreshAuthSession("/api/billing/webhook/stripe"), false);
  assert.equal(shouldRefreshAuthSession("/api/discord/interactions"), false);
  assert.equal(shouldRefreshAuthSession("/api/discord/message-commands/poll"), false);
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
  assert.deepEqual(classifyAuthSessionFailure(new Error("Refresh token is not valid")), {
    reason: "refresh-token-invalid",
    loginErrorCode: SESSION_EXPIRED_LOGIN_ERROR,
  });
});

test("classifyAuthSessionFailure ignores unrelated server failures", () => {
  assert.equal(classifyAuthSessionFailure(new Error("connection timeout talking to profiles table")), null);
  assert.equal(classifyAuthSessionFailure({ message: "unexpected server error", status: 500 }), null);
});

test("setSessionCookies writes both auth cookies with secure session settings", () => {
  const { writer, writes } = createCookieWriter();
  const accessToken = buildJwtWithExp(Math.floor(Date.now() / 1000) + 3_600);

  setSessionCookies(writer, {
    accessToken,
    refreshToken: "refresh-456",
  });

  assert.equal(writes.length, 2);
  assert.equal(writes[0]?.name, ACCESS_COOKIE_NAME);
  assert.equal(writes[0]?.value, accessToken);
  assert.equal(writes[1]?.name, REFRESH_COOKIE_NAME);
  assert.equal(writes[1]?.value, "refresh-456");
  assert.equal(writes[1]?.options.maxAge, PERSISTENT_SESSION_COOKIE_MAX_AGE_SECONDS);
  assert.ok(writes[1]?.options.expires instanceof Date);
  assert.equal(typeof writes[0]?.options.maxAge, "number");
  assert.ok((writes[0]?.options.maxAge as number) > 0);
  assert.ok(writes[0]?.options.expires instanceof Date);
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

test("buildSessionRecoveryPath preserves a safe returnTo path", () => {
  assert.equal(
    buildSessionRecoveryPath(SESSION_EXPIRED_LOGIN_ERROR, "/session/abc123"),
    "/auth/session-recovery?error=session_expired&returnTo=%2Fsession%2Fabc123",
  );
});

test("buildAccessTokenCookieLifetime aligns the access cookie to JWT expiry", () => {
  const exp = Math.floor(Date.now() / 1000) + 1_800;
  const lifetime = buildAccessTokenCookieLifetime(buildJwtWithExp(exp));

  assert.ok(lifetime);
  assert.equal(lifetime?.expires?.toISOString(), new Date(exp * 1000).toISOString());
  assert.ok((lifetime?.maxAge ?? 0) > 0);
  assert.ok((lifetime?.maxAge ?? 0) <= 1_800);
});
