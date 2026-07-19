import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  hasSupabaseAdminCredential,
  resolveSupabaseAdminCredential,
} from "@/lib/supabase/admin";

const MODERN_VALUE = "modern-test-value";
const LEGACY_VALUE = "legacy-test-value";

test("Supabase admin credential resolution prefers the modern credential", () => {
  assert.equal(resolveSupabaseAdminCredential({
    SUPABASE_SECRET_KEY: MODERN_VALUE,
    SUPABASE_SERVICE_ROLE_KEY: LEGACY_VALUE,
  }), MODERN_VALUE);
});

test("Supabase admin credential resolution accepts each staged source independently", () => {
  assert.equal(resolveSupabaseAdminCredential({
    SUPABASE_SECRET_KEY: MODERN_VALUE,
  }), MODERN_VALUE);
  assert.equal(resolveSupabaseAdminCredential({
    SUPABASE_SERVICE_ROLE_KEY: LEGACY_VALUE,
  }), LEGACY_VALUE);
});

test("blank modern input does not shadow the bounded legacy fallback", () => {
  assert.equal(resolveSupabaseAdminCredential({
    SUPABASE_SECRET_KEY: "  \r\n ",
    SUPABASE_SERVICE_ROLE_KEY: `  ${LEGACY_VALUE}  `,
  }), LEGACY_VALUE);
});

test("missing or blank Supabase admin credentials fail closed with a sanitized error", () => {
  for (const env of [
    {},
    { SUPABASE_SECRET_KEY: "  ", SUPABASE_SERVICE_ROLE_KEY: "\t" },
  ]) {
    assert.equal(hasSupabaseAdminCredential(env), false);
    assert.throws(
      () => resolveSupabaseAdminCredential(env),
      (error: unknown) => {
        assert.equal(error instanceof Error, true);
        const message = error instanceof Error ? error.message : String(error);
        assert.equal(
          message,
          "Supabase admin credential is not configured. Set SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY.",
        );
        assert.equal(message.includes(MODERN_VALUE), false);
        assert.equal(message.includes(LEGACY_VALUE), false);
        return true;
      },
    );
  }
});

test("credential resolution does not log or serialize source values", () => {
  const calls: unknown[][] = [];
  const originalMethods = {
    debug: console.debug,
    error: console.error,
    info: console.info,
    log: console.log,
    warn: console.warn,
  };

  for (const name of Object.keys(originalMethods) as (keyof typeof originalMethods)[]) {
    console[name] = (...args: unknown[]) => {
      calls.push(args);
    };
  }

  try {
    assert.equal(resolveSupabaseAdminCredential({
      SUPABASE_SECRET_KEY: MODERN_VALUE,
      SUPABASE_SERVICE_ROLE_KEY: LEGACY_VALUE,
    }), MODERN_VALUE);
  } finally {
    Object.assign(console, originalMethods);
  }

  assert.deepEqual(calls, []);
});

test("the resolver stays server-only and owns all production credential selection", () => {
  const adminSource = readFileSync(new URL("./supabase/admin.ts", import.meta.url), "utf8");
  const envSource = readFileSync(new URL("./env.ts", import.meta.url), "utf8");
  const consumerSources = [
    new URL("../app/auth/actions.ts", import.meta.url),
    new URL("./atlas-contracts.ts", import.meta.url),
    new URL("./discord/message-command-claims.ts", import.meta.url),
  ].map((url) => readFileSync(url, "utf8"));

  assert.match(adminSource, /^import "server-only";/);
  assert.doesNotMatch(adminSource, /NEXT_PUBLIC_SUPABASE_SECRET_KEY/);
  assert.doesNotMatch(adminSource, /console\.|JSON\.stringify|createHash|subtle\.digest/);
  assert.doesNotMatch(envSource, /SUPABASE_SERVICE_ROLE_KEY/);
  for (const source of consumerSources) {
    assert.doesNotMatch(source, /optionalEnv\("SUPABASE_SERVICE_ROLE_KEY"\)/);
  }
});
