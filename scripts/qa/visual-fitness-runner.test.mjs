import test from "node:test";
import assert from "node:assert/strict";

import {
  applyDeterministicCaptureStyle,
  buildVisualCatalogManifest,
  buildQaBrowserStorageStateFromSessionCookies,
  hasUsableQaStorageState,
  resolveQaBrowserStorageState,
  resolveViewport,
  sanitizeVisualDiagnosticText,
  validateResolvedRoute,
} from "./visual-fitness-runner.mjs";

test("hasUsableQaStorageState rejects expired auth cookies", () => {
  const now = Math.floor(Date.now() / 1000);
  const storageState = {
    cookies: [
      { name: "sb-access-token", value: "access", domain: "127.0.0.1", path: "/", expires: now - 5 },
      { name: "sb-refresh-token", value: "refresh", domain: "127.0.0.1", path: "/", expires: now - 5 },
    ],
    origins: [],
  };

  assert.equal(hasUsableQaStorageState(storageState), false);
});

test("buildQaBrowserStorageStateFromSessionCookies synthesizes fresh browser auth state", () => {
  const now = Math.floor(Date.now() / 1000);
  const ensureStorageState = (storageState, { baseUrl }) => ({
    ...storageState,
    origins: [{
      origin: baseUrl,
      localStorage: [{
        name: "sb-fitness-test-auth-token",
        value: JSON.stringify({ access_token: "redacted", refresh_token: "redacted" }),
      }],
    }],
  });
  const storageState = buildQaBrowserStorageStateFromSessionCookies([
    {
      name: "sb-access-token",
      value: "header.eyJleHAiOjE3ODE0NDY3NjQsInN1YiI6InVzZXItMSIsImVtYWlsIjoicWEtdXNlckBleGFtcGxlLmNvbSIsImF1ZCI6ImF1dGhlbnRpY2F0ZWQiLCJyb2xlIjoiYXV0aGVudGljYXRlZCJ9.signature",
      url: "http://127.0.0.1:3002",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      expires: now + 3600,
    },
    {
      name: "sb-refresh-token",
      value: "refresh",
      url: "http://127.0.0.1:3002",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      expires: now + 3600,
    },
  ], "http://127.0.0.1:3002", { ensureStorageState });

  assert.ok(storageState);
  assert.equal(hasUsableQaStorageState(storageState), true);
  assert.equal(storageState.cookies[0]?.domain, "127.0.0.1");
  assert.ok(storageState.origins[0]?.localStorage.some((entry) => entry.name.includes("-auth-token")));
});

test("resolveQaBrowserStorageState prefers fresh session cookies over stored auth state", async () => {
  let storedStateLoadCount = 0;
  const ensureStorageState = (candidate, { baseUrl }) => ({
    ...candidate,
    origins: [{
      origin: baseUrl,
      localStorage: [{ name: "sb-fitness-test-auth-token", value: "{}" }],
    }],
  });
  const storageState = await resolveQaBrowserStorageState({
    authRequired: true,
    baseUrl: "http://127.0.0.1:3002",
    qaSession: {
      available: true,
      cookies: [
        {
          name: "sb-access-token",
          value: "header.eyJleHAiOjQxMDI0NDQ4MDAsInN1YiI6InVzZXItMSIsImVtYWlsIjoicWEtdXNlckBleGFtcGxlLmNvbSIsImF1ZCI6ImF1dGhlbnRpY2F0ZWQiLCJyb2xlIjoiYXV0aGVudGljYXRlZCJ9.signature",
          url: "http://127.0.0.1:3002",
          path: "/",
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
          expires: 4102444800,
        },
        {
          name: "sb-refresh-token",
          value: "refresh",
          url: "http://127.0.0.1:3002",
          path: "/",
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
          expires: 4102444800,
        },
      ],
    },
    loadStoredState: async () => {
      storedStateLoadCount += 1;
      return { cookies: [], origins: [] };
    },
    ensureStorageState,
  });

  assert.equal(storedStateLoadCount, 0);
  assert.ok(storageState);
  assert.equal(hasUsableQaStorageState(storageState), true);
});

test("resolveViewport accepts a named registry fallback with numeric dimensions", () => {
  assert.deepEqual(
    resolveViewport(undefined, { label: "mobile-375", width: 375, height: 932 }),
    { label: "mobile-375", width: 375, height: 932 },
  );
});

test("resolveViewport gives an explicit numeric override precedence over the fallback", () => {
  assert.deepEqual(
    resolveViewport("430x932", { label: "mobile-375", width: 375, height: 932 }),
    { label: "430x932", width: 430, height: 932 },
  );
});

test("resolveViewport rejects a malformed explicit override", () => {
  assert.throws(
    () => resolveViewport("mobile-430", { label: "mobile-375", width: 375, height: 932 }),
    /Invalid --viewport "mobile-430"/,
  );
});

test("deterministic capture style is registered as a navigation init script", async () => {
  const calls = [];
  await applyDeterministicCaptureStyle({
    addInitScript: async (callback, payload) => calls.push({ callback, payload }),
  });

  assert.equal(calls.length, 1);
  assert.equal(typeof calls[0].callback, "function");
  assert.equal(calls[0].payload.markerId, "fitness-visual-qa-deterministic-style");
  assert.match(calls[0].payload.content, /animation-duration: 0s/);
  assert.match(calls[0].payload.content, /transition-duration: 0s/);
});

test("resolved-route contract distinguishes requested and final routes", () => {
  const result = validateResolvedRoute({
    requestedRoute: "/",
    resolvedUrl: "http://127.0.0.1:3002/login?next=%2Ftoday",
    expectedResolvedRoute: {
      kind: "one-of",
      values: ["/entry", "/login?next=%2Ftoday"],
    },
    baseUrl: "http://127.0.0.1:3002",
  });
  assert.equal(result.valid, true);
  assert.equal(result.requested, "/");
  assert.equal(result.resolved, "/login?next=%2Ftoday");
});

test("resolved-route contract fails closed on unexpected redirect", () => {
  const result = validateResolvedRoute({
    requestedRoute: "/install",
    resolvedUrl: "http://127.0.0.1:3002/today",
    expectedResolvedRoute: { kind: "exact", value: "/install" },
    baseUrl: "http://127.0.0.1:3002",
  });
  assert.equal(result.valid, false);
  assert.match(result.reason ?? "", /violates the exact contract/);
});

test("diagnostic sanitizer removes credentials and user identifiers", () => {
  const sanitized = sanitizeVisualDiagnosticText(
    "https://example.test/path?token=secret-value&email=zac@example.com eyJaaaaaaaaaaaa.bbbbbbbbbbbb.cccccccc",
  );
  assert.doesNotMatch(sanitized, /secret-value/);
  assert.doesNotMatch(sanitized, /zac@example\.com/);
  assert.doesNotMatch(sanitized, /eyJaaaaaaaa/);
  assert.match(sanitized, /\[redacted\]/);
});

test("catalog manifest records provenance and requested/resolved routes without raw page content", () => {
  const manifest = buildVisualCatalogManifest({
    tier: "smoke",
    generatedAt: "2026-07-27T00:00:00.000Z",
    outputRoot: "C:/tmp/catalog",
    sourceIdentity: { commit: "a".repeat(40), tree: "b".repeat(40) },
    browserVersion: "123.0.0.0",
    results: [
      {
        status: "captured",
        suiteState: "public:privacy",
        registryCaptureId: "public:privacy:mobile:viewport",
        registryFamily: "Public, legal, and install",
        registryIndex: 0,
        registryVariantIndex: 0,
        viewport: "mobile",
        captureMode: "viewport",
        requestedRoute: "/privacy",
        resolvedRoute: "/privacy",
        fixtureOwner: "public-route:privacy",
        registryAuthState: "anonymous",
        screenshotPath: "C:/tmp/catalog/privacy.png",
        screenshotSha256: "c".repeat(64),
        manifestPath: "C:/tmp/catalog/privacy.json",
        tracePath: null,
      },
    ],
  });
  assert.equal(manifest.source.commit, "a".repeat(40));
  assert.equal(manifest.environment.browserVersion, "123.0.0.0");
  assert.equal(manifest.registry.semanticStates, 111);
  assert.equal(manifest.registry.rawCaptures, 313);
  assert.equal(manifest.capturedCount, 1);
  assert.equal(manifest.captures[0]?.requestedRoute, "/privacy");
  assert.equal(manifest.captures[0]?.resolvedRoute, "/privacy");
  assert.equal("bodyPreview" in manifest.captures[0], false);
});
