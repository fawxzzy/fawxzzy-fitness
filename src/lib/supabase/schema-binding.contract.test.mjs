import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
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

const currentProjectScriptClientPaths = [
  ["scripts/qa/fitness-qa-config.mjs", 2],
  ["scripts/qa/fitness-codex-seed.mjs", 1],
  ["scripts/qa/seed-zac-llel-routine.mjs", 1],
  ["scripts/migration/parity-report.mjs", 1],
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

test("every current-project script client binds the sealed Fitness schema", () => {
  for (const [path, expectedConstructors] of currentProjectScriptClientPaths) {
    const source = readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8");
    const constructors = source.match(/createClient\(/g) ?? [];
    const schemaBindings = source.match(/db:\s*\{\s*schema:\s*["']fitness["']\s*,?\s*\}/g) ?? [];

    assert.equal(constructors.length, expectedConstructors, `${path} client inventory drifted`);
    assert.equal(schemaBindings.length, expectedConstructors, `${path} must bind every client to fitness`);
  }
});

test("the canonical binding is an exact non-secret fitness schema literal", () => {
  const source = readFileSync(new URL("./schema.ts", import.meta.url), "utf8");
  const generatedTypes = readFileSync(
    new URL("./database.types.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /FITNESS_DATABASE_SCHEMA = "fitness" as const/);
  assert.match(
    source,
    /import type \{ Database \} from "@\/lib\/supabase\/database\.types";/,
  );
  assert.match(source, /SupabaseClient<\s*Database,\s*typeof FITNESS_DATABASE_SCHEMA\s*>/);
  assert.match(source, /createClient<Database, typeof FITNESS_DATABASE_SCHEMA>/);
  assert.match(source, /db: \{\s*schema: FITNESS_DATABASE_SCHEMA,/);
  assert.doesNotMatch(source, /\bany\b|process\.env|NEXT_PUBLIC|SUPABASE_/);

  assert.match(generatedTypes, /export type Database = \{/);
  assert.match(generatedTypes, /\sfitness: \{\s*Tables: \{/);
  assert.match(generatedTypes, /\sauth_handoffs: \{/);
  assert.match(generatedTypes, /\sbegin_fitness_auth_handoff: \{/);
  assert.match(generatedTypes, /\sconsume_fitness_auth_handoff: \{/);
});

const repoRoot = new URL("../../../", import.meta.url);

test("the retired legacy snapshot routes and bridge stay removed", () => {
  assert.equal(existsSync(new URL("src/app/api/migration", repoRoot)), false);
  assert.equal(existsSync(new URL("src/lib/migration", repoRoot)), false);
  assert.equal(existsSync(new URL("src/components/settings/LegacyMigrationSettings.tsx", repoRoot)), false);
});

// Shapes that put a build live on production or move production traffic: a production deploy,
// a promote/rollback, an alias change, a deploy-hook call, or a production target/environment.
const PRODUCTION_DEPLOY_PATTERNS = [
  /vercel[^\n]*[\s"']--prod\b/,
  /--target[= ]production/,
  /\bvercel\s+(?:promote|rollback)\b/,
  /\bvercel\s+alias\b/,
  /integrations\/deploy\//,
  /deploy[-_ ]?hook/i,
  /VERCEL_(?:TARGET|ENV)\s*[:=]\s*["']?production/,
  /["']?target["']?\s*[:=]\s*["']?production/,
];

function findProductionDeployShape(source) {
  return PRODUCTION_DEPLOY_PATTERNS.find((pattern) => pattern.test(source)) ?? null;
}

test("the production-deploy patterns catch every known shape and leave preview steps alone", () => {
  for (const sample of [
    "run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}",
    "run: vercel deploy --prebuilt --prod",
    "run: vercel deploy --target=production",
    "run: vercel deploy --target production",
    "run: vercel promote https://example.vercel.app",
    "run: vercel rollback",
    "run: vercel alias set example.vercel.app fitness.example.com",
    "run: vercel alias example.vercel.app fitness.example.com",
    "run: curl -X POST https://api.vercel.com/v1/integrations/deploy/prj_abc/hook",
    "run: curl -X POST \"$VERCEL_DEPLOY_HOOK\"",
    "run: VERCEL_TARGET=production vercel build",
    "env:\n  VERCEL_TARGET: production",
    "env:\n  VERCEL_ENV: \"production\"",
    "with:\n  vercel-args: '--prod'",
  ]) {
    assert.ok(findProductionDeployShape(sample), sample);
  }

  for (const sample of [
    "run: npm install -g vercel",
    "run: vercel pull --yes --environment=preview",
    "run: vercel build",
    "run: vercel deploy --prebuilt",
    "uses: actions/checkout@v4",
    "run: npm run build",
  ]) {
    assert.equal(findProductionDeployShape(sample), null, sample);
  }
});

test("no workflow runs a production deploy", () => {
  const workflowDir = new URL(".github/workflows/", repoRoot);
  const workflows = readdirSync(workflowDir).filter((name) => /\.ya?ml$/.test(name));

  assert.ok(workflows.length > 0);
  for (const name of workflows) {
    const source = readFileSync(new URL(name, workflowDir), "utf8");
    const shape = findProductionDeployShape(source);

    assert.equal(shape, null, `${name} matches ${shape}`);
  }
});
