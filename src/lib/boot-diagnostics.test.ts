import test from "node:test";
import assert from "node:assert/strict";
import {
  LAST_BOOT_DIAGNOSTIC_STORAGE_KEY,
  recordClientBootDiagnostic,
  sanitizeBootDiagnosticEvent,
  serializeBootDiagnosticEvent,
} from "./boot-diagnostics.ts";

test("sanitizeBootDiagnosticEvent redacts emails ids and token-like values", () => {
  const serialized = serializeBootDiagnosticEvent({
    tag: "[boot.auth]",
    source: "server",
    route: "/entry",
    stage: "jwt-expired-user-123e4567-e89b-12d3-a456-426614174000",
    errorName: "AuthApiError",
    errorMessage: "JWT expired for athlete@example.com token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature",
  });

  assert.equal(serialized.includes("athlete@example.com"), false);
  assert.equal(serialized.includes("123e4567-e89b-12d3-a456-426614174000"), false);
  assert.equal(serialized.includes("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"), false);
  assert.equal(serialized.includes("[redacted-email]"), true);
  assert.equal(serialized.includes("[redacted-id]"), true);
  assert.equal(serialized.includes("[redacted-token]"), true);
});

test("recordClientBootDiagnostic stores the last sanitized client event", () => {
  const writes = new Map<string, string>();
  const storage = {
    setItem(key: string, value: string) {
      writes.set(key, value);
    },
  };

  const payload = recordClientBootDiagnostic({
    tag: "[boot.service-worker]",
    source: "client",
    route: "/today",
    stage: "version-mismatch",
    authState: "authenticated",
    displayMode: "standalone",
    serviceWorkerControlled: true,
    gateStage: "redirecting",
    remoteBuildId: "build-456",
    stageDurationMs: 2400,
    targetHref: "/today",
    errorMessage: "build drift for athlete@example.com",
  }, {
    storage,
  });

  assert.equal(payload.displayMode, "standalone");
  assert.equal(payload.authState, "authenticated");
  assert.equal(payload.serviceWorkerControlled, true);
  assert.equal(payload.gateStage, "redirecting");
  assert.equal(payload.remoteBuildId, "build-456");
  assert.equal(payload.stageDurationMs, 2400);
  assert.equal(payload.targetHref, "/today");
  assert.equal(writes.has(LAST_BOOT_DIAGNOSTIC_STORAGE_KEY), true);
  assert.equal(writes.get(LAST_BOOT_DIAGNOSTIC_STORAGE_KEY)?.includes("athlete@example.com"), false);
});

test("sanitizeBootDiagnosticEvent preserves safe route and stage fields", () => {
  assert.deepEqual(
    sanitizeBootDiagnosticEvent({
      tag: "[boot.entry]",
      source: "server",
      route: "/entry",
      stage: "routine-hint",
      buildId: "build-123",
      authState: "has-refresh-cookie",
      gateStage: "checking-session",
      remoteBuildId: "build-456",
      stageDurationMs: 1500,
      targetHref: "/login?error=session_expired",
    }),
    {
      tag: "[boot.entry]",
      source: "server",
      route: "/entry",
      stage: "routine-hint",
      buildId: "build-123",
      displayMode: "unknown",
      serviceWorkerControlled: null,
      authState: "has-refresh-cookie",
      errorName: null,
      errorMessage: null,
      gateStage: "checking-session",
      remoteBuildId: "build-456",
      stageDurationMs: 1500,
      targetHref: "/login?error=session_expired",
    },
  );
});
