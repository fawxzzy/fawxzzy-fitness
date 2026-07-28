import test from "node:test";
import assert from "node:assert/strict";

import {
  applyAnonymousRegistryGuards,
  applyDeterministicCaptureStyle,
  assertVisualCatalogCountLedger,
  buildAnonymousLocalDevAutoLoginBypassUrl,
  buildVisualCatalogManifest,
  buildQaBrowserStorageStateFromSessionCookies,
  hasUsableQaStorageState,
  resolveQaBrowserStorageState,
  resolveViewport,
  runVisualFitnessSuites,
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

test("catalog count ledger returns reconciled coverage", () => {
  const result = assertVisualCatalogCountLedger();

  assert.equal(result.coverage.semanticStates, 111);
  assert.equal(result.coverage.rawCaptures, 313);
  assert.equal(result.countDelta.reconciled, true);
});

test("smoke and full catalog runs reject accepted count drift before browser launch", async () => {
  const countLedgerOptions = {
    buildCatalogCoverage: () => ({
      semanticStates: 110,
      rawCaptures: 312,
    }),
    buildCatalogCountDelta: (coverage) => ({
      accepted: { semanticStates: 111, rawCaptures: 313 },
      current: coverage,
      delta: { semanticStates: -1, rawCaptures: -1 },
      reconciled: false,
      explanations: [],
    }),
  };

  for (const tier of ["smoke", "full"]) {
    await assert.rejects(
      runVisualFitnessSuites(["--registry-tier", tier], countLedgerOptions),
      /Visual catalog count ledger drifted: accepted 111 states\/313 captures; current 110 states\/312 captures\. Catalog capture aborted before browser launch\./,
    );
  }
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

test("resolved-route pattern permits only the local boot freshness marker", () => {
  const expectedResolvedRoute = {
    kind: "pattern",
    value: "^/dev/mobile-regression\\?scenario=history-sessions-detailed(?:&__fresh=[a-z0-9][a-z0-9._-]{0,63})?$",
  };
  assert.equal(validateResolvedRoute({
    requestedRoute: "/dev/mobile-regression?scenario=history-sessions-detailed",
    resolvedUrl: "http://127.0.0.1:3002/dev/mobile-regression?scenario=history-sessions-detailed&__fresh=1.0.1-local",
    expectedResolvedRoute,
    baseUrl: "http://127.0.0.1:3002",
  }).valid, true);
  assert.equal(validateResolvedRoute({
    requestedRoute: "/dev/mobile-regression?scenario=history-sessions-detailed",
    resolvedUrl: "http://127.0.0.1:3002/dev/mobile-regression?scenario=history-sessions-detailed&unexpected=1",
    expectedResolvedRoute,
    baseUrl: "http://127.0.0.1:3002",
  }).valid, false);
});

test("anonymous registry guard converts only local auto-login requests into manual login", async () => {
  assert.equal(
    buildAnonymousLocalDevAutoLoginBypassUrl({
      requestUrl: "http://127.0.0.1:3002/auth/local-dev-auto-login?returnTo=%2Ftoday",
      baseUrl: "http://127.0.0.1:3002",
    }),
    "http://127.0.0.1:3002/login?manual=1&returnTo=%2Ftoday",
  );
  assert.equal(
    buildAnonymousLocalDevAutoLoginBypassUrl({
      requestUrl: "http://localhost:3002/auth/local-dev-auto-login?returnTo=%2Ftoday",
      baseUrl: "http://127.0.0.1:3002",
    }),
    "http://localhost:3002/login?manual=1&returnTo=%2Ftoday",
  );
  assert.equal(
    buildAnonymousLocalDevAutoLoginBypassUrl({
      requestUrl: "http://localhost:3003/auth/local-dev-auto-login",
      baseUrl: "http://127.0.0.1:3002",
    }),
    null,
  );
  assert.equal(
    buildAnonymousLocalDevAutoLoginBypassUrl({
      requestUrl: "https://example.test/auth/local-dev-auto-login",
      baseUrl: "http://127.0.0.1:3002",
    }),
    null,
  );

  const registrations = [];
  await applyAnonymousRegistryGuards({
    route: async (pattern, handler) => registrations.push({ pattern, handler }),
  }, { authState: "anonymous" }, "http://127.0.0.1:3002");
  assert.equal(registrations.length, 1);
  assert.equal(registrations[0].pattern, "**/auth/local-dev-auto-login**");

  const fulfillCalls = [];
  await registrations[0].handler({
    request: () => ({ url: () => "http://127.0.0.1:3002/auth/local-dev-auto-login" }),
    fulfill: async (options) => fulfillCalls.push(options),
    continue: async () => assert.fail("same-origin local auto-login should be bypassed"),
  });
  assert.deepEqual(fulfillCalls, [{
    status: 302,
    headers: { location: "http://127.0.0.1:3002/login?manual=1" },
    body: "",
  }]);
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
