import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server.js";
import {
  config,
  handleAuthSessionMiddleware,
  middleware,
  shouldRedirectLegacyFitnessNavigation,
} from "@/middleware";

test("middleware permanently redirects legacy browser routes to the branded origin", async () => {
  for (const method of ["GET", "HEAD"]) {
    const request = new NextRequest(
      "https://fawxzzy-fitness-local.vercel.app/history?tab=recent&source=bookmark",
      { method },
    );

    const response = await middleware(request);

    assert.equal(response.status, 308);
    assert.equal(
      response.headers.get("location"),
      "https://fitness.fawxzzy.com/history?tab=recent&source=bookmark&compatibility=fitness_legacy_origin",
    );
  }
});

test("legacy-host migration keeps API traffic compatible during provider cutover", () => {
  const legacyWebhook = new NextRequest(
    "https://fawxzzy-fitness-local.vercel.app/api/billing/webhook/stripe",
    { method: "POST" },
  );
  const legacyApiRead = new NextRequest(
    "https://fawxzzy-fitness-local.vercel.app/api/health",
  );

  assert.equal(shouldRedirectLegacyFitnessNavigation(legacyWebhook), false);
  assert.equal(shouldRedirectLegacyFitnessNavigation(legacyApiRead), false);
});

test("legacy-host migration never redirects branded, preview, or spoofed hosts", () => {
  const requests = [
    new NextRequest("https://fitness.fawxzzy.com/today"),
    new NextRequest("https://fawxzzy-fitness-abc123-fawxzzy.vercel.app/today"),
    new NextRequest("https://fitness.fawxzzy.com/today", {
      headers: { "x-forwarded-host": "fawxzzy-fitness-local.vercel.app" },
    }),
  ];

  for (const request of requests) {
    assert.equal(shouldRedirectLegacyFitnessNavigation(request), false);
  }
});

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

test("middleware matcher excludes the web manifest route from auth-session interception", () => {
  const matcher = config.matcher[0];

  assert.equal(typeof matcher, "string");
  assert.match(matcher, /manifest\\\.webmanifest/);
  assert.match(matcher, /webmanifest/);
});

test("middleware leaves legal documents public without session cookies", async () => {
  for (const route of ["/privacy", "/terms"]) {
    const response = await handleAuthSessionMiddleware(new NextRequest(`https://example.com${route}`));

    assert.equal(response.status, 200, `${route} should not redirect to login`);
    assert.equal(response.headers.get("location"), null);
  }
});

test("middleware leaves the shared account portal redirect public without session cookies", async () => {
  const response = await handleAuthSessionMiddleware(new NextRequest("https://example.com/account"));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
});

test("middleware leaves the optional day review fixture public without session cookies", async () => {
  const response = await handleAuthSessionMiddleware(
    new NextRequest("https://example.com/review/optional-planned-day"),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
});

test("middleware leaves discord verify api public without session cookies", async () => {
  const response = await handleAuthSessionMiddleware(
    new NextRequest("https://example.com/api/discord/verify", {
      method: "POST",
    }),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
});
