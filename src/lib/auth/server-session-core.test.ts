import test from "node:test";
import assert from "node:assert/strict";
import { resolveRequireUserRedirectPath, resolveServerSessionTokens } from "@/lib/auth/server-session-core";

test("resolveServerSessionTokens prefers cookie auth over local-dev headers", () => {
  const tokens = resolveServerSessionTokens({
    cookieAccessToken: " cookie-access ",
    cookieRefreshToken: " cookie-refresh ",
    headerAccessToken: "header-access",
    headerRefreshToken: "header-refresh",
    hostHeader: "127.0.0.1:3000",
  });

  assert.deepEqual(tokens, {
    accessToken: "cookie-access",
    refreshToken: "cookie-refresh",
    accessTokenSource: "cookie",
    refreshTokenSource: "cookie",
    canTrustLocalDevHeaders: true,
    hasSessionCookies: true,
    hostname: "127.0.0.1",
  });
});

test("resolveServerSessionTokens accepts local-dev headers only for trusted hosts", () => {
  const trustedTokens = resolveServerSessionTokens({
    headerAccessToken: "header-access",
    headerRefreshToken: "header-refresh",
    hostHeader: "10.0.0.24:3000",
  });
  const untrustedTokens = resolveServerSessionTokens({
    headerAccessToken: "header-access",
    headerRefreshToken: "header-refresh",
    hostHeader: "app.example.com",
  });

  assert.equal(trustedTokens.accessToken, "header-access");
  assert.equal(trustedTokens.refreshToken, "header-refresh");
  assert.equal(trustedTokens.accessTokenSource, "trusted-local-dev-header");
  assert.equal(trustedTokens.refreshTokenSource, "trusted-local-dev-header");
  assert.equal(untrustedTokens.accessToken, null);
  assert.equal(untrustedTokens.refreshToken, null);
  assert.equal(untrustedTokens.canTrustLocalDevHeaders, false);
});

test("resolveRequireUserRedirectPath sends cookie-bearing anonymous users through session recovery", () => {
  const redirectPath = resolveRequireUserRedirectPath({
    session: {
      hasSessionCookies: true,
    },
  });

  assert.equal(redirectPath, "/auth/session-recovery?error=session_expired");
});

test("resolveRequireUserRedirectPath sends missing sessions to login", () => {
  const redirectPath = resolveRequireUserRedirectPath({
    session: {
      hasSessionCookies: false,
    },
  });

  assert.equal(redirectPath, "/login");
});
