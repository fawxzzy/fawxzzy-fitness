import assert from "node:assert/strict";
import test from "node:test";

import {
  FITNESS_DEFAULT_EXPECTED_SUPABASE_HOST,
  FITNESS_EXPECT_SUPABASE_HOST_ENV,
  getSupabaseTargetDiagnostic,
  resolveExpectedSupabaseHost,
} from "./dev-supabase-target.ts";

test("expected Supabase host accepts the launcher-provided loopback host", () => {
  assert.equal(resolveExpectedSupabaseHost("127.0.0.1:54321"), "127.0.0.1:54321");
  assert.equal(resolveExpectedSupabaseHost("http://127.0.0.1:54321"), "127.0.0.1:54321");
});

test("expected Supabase host falls back to the canonical hosted project", () => {
  assert.equal(resolveExpectedSupabaseHost(null), FITNESS_DEFAULT_EXPECTED_SUPABASE_HOST);
  assert.equal(resolveExpectedSupabaseHost("not a host"), FITNESS_DEFAULT_EXPECTED_SUPABASE_HOST);
});

test("diagnostic compares the active URL to FITNESS_EXPECT_SUPABASE_HOST", () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousExpectedHost = process.env[FITNESS_EXPECT_SUPABASE_HOST_ENV];

  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env[FITNESS_EXPECT_SUPABASE_HOST_ENV] = "127.0.0.1:54321";

    assert.deepEqual(getSupabaseTargetDiagnostic(), {
      expectedHost: "127.0.0.1:54321",
      host: "127.0.0.1:54321",
      rawUrl: "http://127.0.0.1:54321",
      matchesExpected: true,
    });
  } finally {
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;

    if (previousExpectedHost === undefined) delete process.env[FITNESS_EXPECT_SUPABASE_HOST_ENV];
    else process.env[FITNESS_EXPECT_SUPABASE_HOST_ENV] = previousExpectedHost;
  }
});
