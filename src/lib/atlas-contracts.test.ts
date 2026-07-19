import assert from "node:assert/strict";
import test from "node:test";

import { buildAtlasHealthPayload } from "@/lib/atlas-contracts";

function withEnv<T>(overrides: Record<string, string | undefined>, run: () => T): T {
  const previous = new Map<string, string | undefined>();

  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return run();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("buildAtlasHealthPayload reports ok when the canonical auth env is present", () => {
  const payload = withEnv(
    {
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      VERCEL_GIT_COMMIT_SHA: "abcdef1234567890",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      SUPABASE_SECRET_KEY: "modern-secret-key",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      NEXT_PUBLIC_APP_URL: "https://fitness.example.com",
    },
    () => buildAtlasHealthPayload({ checkedAt: "2026-05-09T23:30:00.000Z" }),
  );

  assert.equal(payload.status, "ok");
  assert.equal(payload.environment, "production");
  assert.equal(payload.commit, "abcdef1234567890");
  assert.equal(payload.checks.every((check) => check.status === "ok"), true);
});

test("buildAtlasHealthPayload accepts the bounded legacy admin credential fallback", () => {
  const payload = withEnv(
    {
      NODE_ENV: "production",
      VERCEL_ENV: "preview",
      VERCEL_GIT_COMMIT_SHA: "abcdef1",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      SUPABASE_SECRET_KEY: "   ",
      SUPABASE_SERVICE_ROLE_KEY: "legacy-fallback-key",
      NEXT_PUBLIC_APP_URL: "https://preview.fitness.example.com",
    },
    () => buildAtlasHealthPayload({ checkedAt: "2026-05-09T23:30:00.000Z" }),
  );

  assert.equal(payload.checks.find((check) => check.name === "supabase-admin-env")?.status, "ok");
  assert.equal(payload.checks.find((check) => check.name === "supabase-admin-env")?.summary.includes("legacy"), false);
});

test("buildAtlasHealthPayload degrades when the service-role key is absent", () => {
  const payload = withEnv(
    {
      NODE_ENV: "production",
      VERCEL_ENV: "preview",
      VERCEL_GIT_COMMIT_SHA: "abcdef1",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      SUPABASE_SECRET_KEY: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
      NEXT_PUBLIC_APP_URL: "https://preview.fitness.example.com",
    },
    () => buildAtlasHealthPayload({ checkedAt: "2026-05-09T23:30:00.000Z" }),
  );

  assert.equal(payload.environment, "preview");
  assert.equal(payload.status, "degraded");
  assert.equal(payload.checks.find((check) => check.name === "supabase-admin-env")?.status, "degraded");
});
