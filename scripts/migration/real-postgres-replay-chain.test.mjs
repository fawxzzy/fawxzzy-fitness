// node --test suite for the real-Postgres migration replay lane. Requires
// an actual, reachable Postgres server -- by design, this only runs where
// one is guaranteed to exist: the `postgres:` service container in
// .github/workflows/migration-clean-replay-contract.yml's
// `real-postgres-replay-contract` job (or a manually started
// `docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16` for
// local iteration, when Docker is available). It intentionally does NOT run
// as part of any environment's default/general test pass -- see
// getRealPostgresConnectionConfig()'s host allowlist, which refuses to
// connect anywhere but loopback/a service-container hostname, so there is
// no way for this to reach a real Supabase project even if misconfigured.
//
// If no Postgres server is reachable at all (e.g. this exact scoped script
// run outside of the dedicated CI job / without Docker locally), every test
// below fails fast on the first connection attempt with a clear
// "connection refused" style error rather than hanging or reporting a false
// pass -- that is the correct, honest behavior for an environment that
// legitimately doesn't have what this lane needs, not a bug to work around.

import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_MIGRATIONS_DIR, listMigrationFiles } from "./replay-clean-chain.mjs";
import {
  replayMigrationsFromCleanRealPostgres,
  snapshotAfter042AndReplay043,
} from "./real-postgres-replay-chain.mjs";

test("supabase/migrations/*.sql replays from an empty real-Postgres database to head with no errors", async () => {
  const expectedFiles = await listMigrationFiles(DEFAULT_MIGRATIONS_DIR);
  assert.ok(
    expectedFiles.length > 0,
    "expected at least one migration file under supabase/migrations/ (shared file-discovery logic with the PGlite lane)",
  );

  let finalTableNames = null;
  let finalFunctionNames = null;
  let finalIndexNames = null;
  let finalSlugColumn = null;

  const result = await replayMigrationsFromCleanRealPostgres({
    databaseName: "fitness_migration_replay_test_full_chain",
    onComplete: async (db) => {
      const tables = await db.query(
        `select table_name from information_schema.tables where table_schema = 'public' order by 1;`,
      );
      finalTableNames = tables.rows.map((row) => row.table_name);

      const functions = await db.query(
        `select routine_name from information_schema.routines
         where routine_schema = 'public' and routine_name = 'start_session_from_day_v1';`,
      );
      finalFunctionNames = functions.rows.map((row) => row.routine_name);

      const indexes = await db.query(
        `select indexname from pg_indexes
         where schemaname = 'public' and indexname = 'sessions_user_routine_active_uq';`,
      );
      finalIndexNames = indexes.rows.map((row) => row.indexname);

      const slugColumn = await db.query(
        `select column_name from information_schema.columns
         where table_schema = 'public' and table_name = 'exercises' and column_name = 'slug';`,
      );
      finalSlugColumn = slugColumn.rows.map((row) => row.column_name);
    },
  });

  assert.deepEqual(
    result.appliedMigrations,
    expectedFiles,
    "every migration file under supabase/migrations/ should have applied, in order, against real Postgres too",
  );
  assert.equal(result.totalMigrations, expectedFiles.length);

  assert.ok(
    result.appliedMigrations.includes("20260804000000_session_start_atomicity_v1.sql"),
    "expected the session-start-atomicity migration to be part of the real-Postgres replayed chain",
  );
  assert.ok(
    result.appliedMigrations.includes("20260806090000_explicit_fitness_data_api_grants.sql"),
    "expected the explicit Data API grants migration to be part of the real-Postgres replayed chain",
  );
  assert.equal(result.appliedMigrations.at(-1), "20260811043408_fitness_integrity_completion_v1.sql");

  // Requirement: assert the final state includes the slug column, the
  // atomicity index, and the RPC -- against the REAL Postgres backend
  // specifically, since that's the one whose fidelity was in question.
  assert.deepEqual(finalSlugColumn, ["slug"], "expected public.exercises.slug to exist after a full real-Postgres replay");
  assert.ok(finalTableNames.includes("sessions"));
  assert.ok(finalTableNames.includes("routines"));
  assert.deepEqual(finalFunctionNames, ["start_session_from_day_v1"]);
  assert.deepEqual(finalIndexNames, ["sessions_user_routine_active_uq"]);
});

test("migration 042 -> real-Postgres snapshot -> migration 043 alone applies the ALTER/UPDATE slug sequence correctly", async () => {
  const result = await snapshotAfter042AndReplay043();

  assert.equal(
    result.slugColumnExistedBeforeMigration043,
    false,
    "the post-042 snapshot should not have a slug column yet -- 043 is what introduces it",
  );
  assert.equal(
    result.migration043Applied,
    true,
    "043_hide_standalone_stretch_catalog_rows.sql should apply cleanly against the real-Postgres post-042 snapshot",
  );
  assert.equal(
    result.slugColumnExistsAfterMigration043,
    true,
    "expected public.exercises.slug to exist immediately after migration 043 runs, under real Postgres",
  );
  assert.equal(result.slugColumnIsNullable, true, "043 adds slug as nullable (`slug text null`)");
});
