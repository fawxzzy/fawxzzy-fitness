import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  DEFAULT_MIGRATIONS_DIR,
  listMigrationFiles,
  replayMigrationsFromClean,
} from "./replay-clean-chain.mjs";

test("supabase/migrations/*.sql replays from an empty database to head with no errors", async () => {
  const expectedFiles = await listMigrationFiles(DEFAULT_MIGRATIONS_DIR);
  assert.ok(
    expectedFiles.length > 0,
    "expected at least one migration file under supabase/migrations/",
  );

  let finalTableNames = null;
  let finalFunctionNames = null;
  let finalIndexNames = null;

  const result = await replayMigrationsFromClean({
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
    },
  });

  assert.deepEqual(
    result.appliedMigrations,
    expectedFiles,
    "every migration file under supabase/migrations/ should have applied, in order",
  );
  assert.equal(result.totalMigrations, expectedFiles.length);

  // Confirm the chain actually reaches and applies the atomicity migration
  // (20260804000000_session_start_atomicity_v1.sql) rather than merely not
  // erroring out somewhere upstream of it.
  assert.ok(
    result.appliedMigrations.includes("20260804000000_session_start_atomicity_v1.sql"),
    "expected the session-start-atomicity migration to be part of the replayed chain",
  );
  assert.equal(result.appliedMigrations.at(-1), "20260804000000_session_start_atomicity_v1.sql");

  assert.ok(finalTableNames.includes("sessions"));
  assert.ok(finalTableNames.includes("routines"));
  assert.deepEqual(finalFunctionNames, ["start_session_from_day_v1"]);
  assert.deepEqual(finalIndexNames, ["sessions_user_routine_active_uq"]);
});

test("listMigrationFiles orders 3-digit and 4-digit legacy prefixes the same way Supabase's own string-keyed version ordering would", async () => {
  const files = await listMigrationFiles(DEFAULT_MIGRATIONS_DIR);

  const indexOf = (name) => files.findIndex((file) => file.includes(name));

  assert.ok(indexOf("021_exercise_measurement_and_set_distance") < indexOf("0221_routine_day_exercise_cardio_targets"));
  assert.ok(indexOf("0221_routine_day_exercise_cardio_targets") < indexOf("0222_profile_unit_preferences"));
  assert.ok(indexOf("0222_profile_unit_preferences") < indexOf("023_routine_session_exercise_measurement_overrides"));
});

test("replayMigrationsFromClean reports the exact failing file and preserves already-applied history, rather than always reporting success", async () => {
  const fixtureDir = await mkdtemp(path.join(tmpdir(), "fitness-migration-replay-fixture-"));

  try {
    await writeFile(
      path.join(fixtureDir, "001_ok.sql"),
      "create table public.fixture_ok (id uuid primary key default gen_random_uuid());\n",
      "utf8",
    );
    await writeFile(
      path.join(fixtureDir, "002_broken.sql"),
      "select * from this_table_does_not_exist_anywhere;\n",
      "utf8",
    );
    await writeFile(
      path.join(fixtureDir, "003_never_reached.sql"),
      "create table public.fixture_never_reached (id uuid primary key default gen_random_uuid());\n",
      "utf8",
    );

    await assert.rejects(
      () => replayMigrationsFromClean({ migrationsDir: fixtureDir }),
      (error) => {
        assert.equal(error.failedMigration, "002_broken.sql");
        assert.deepEqual(error.appliedMigrations, ["001_ok.sql"]);
        assert.match(error.message, /002_broken\.sql/);
        assert.match(error.cause.message, /this_table_does_not_exist_anywhere/);
        return true;
      },
    );
  } finally {
    await rm(fixtureDir, { recursive: true, force: true });
  }
});
