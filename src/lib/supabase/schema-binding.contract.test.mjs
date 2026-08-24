import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const currentProjectClientPaths = [
  "src/lib/supabase/client.ts",
  "src/lib/supabase/server.ts",
  "src/lib/supabase/server-anon.ts",
  "src/lib/supabase/admin.ts",
  "src/lib/supabase/session-recovery.ts",
  "src/lib/auth/server-session.ts",
  "src/app/reset-password/actions.ts",
  "src/app/dev/history-sessions-live/page.tsx",
  "src/app/dev/history-exercises-live/page.tsx",
  "src/app/dev/history-session-detail-live/page.tsx",
];

test("every current-project client binds the sealed Fitness schema", () => {
  for (const path of currentProjectClientPaths) {
    const source = readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8");
    const constructors = source.match(/createFitnessSupabaseClient\(/g) ?? [];

    assert.equal(constructors.length, 1, `${path} must contain exactly one client constructor`);
    assert.match(
      source,
      /import \{ createFitnessSupabaseClient \} from "@\/lib\/supabase\/schema";/,
      `${path} must import the typed canonical factory`,
    );
    assert.doesNotMatch(source, /createClient\(/, `${path} must not bypass the canonical factory`);
  }
});

test("the canonical binding is an exact non-secret fitness schema literal", () => {
  const source = readFileSync(new URL("./schema.ts", import.meta.url), "utf8");

  assert.match(source, /FITNESS_DATABASE_SCHEMA = "fitness" as const/);
  assert.match(source, /createClient<FitnessDatabase, typeof FITNESS_DATABASE_SCHEMA>/);
  assert.match(source, /db: \{\s*schema: FITNESS_DATABASE_SCHEMA,/);
  assert.doesNotMatch(source, /process\.env|NEXT_PUBLIC|SUPABASE_/);
});

test("the legacy bridge remains isolated from the master schema binding", () => {
  const source = readFileSync(
    new URL("../migration/fitness-legacy-bridge.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /LEGACY_SUPABASE_URL/);
  assert.match(source, /LEGACY_SUPABASE_ANON_KEY/);
  assert.doesNotMatch(source, /FITNESS_DATABASE_OPTIONS|FITNESS_DATABASE_SCHEMA/);
});
