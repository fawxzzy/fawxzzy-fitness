// Enforces the explicit Data API grant contract
// (scripts/migration/data-api-grants-contract.mjs /
// supabase/migrations/20260806090000_explicit_fitness_data_api_grants.sql)
// against BOTH replay backends this repo already maintains -- PGlite
// (fast/offline) and real Postgres (this repo's migration-parity authority,
// see real-postgres-replay-chain.mjs's own module comment for why real
// Postgres is the one that actually settles GRANT/RLS-interaction questions:
// PGlite is a real Postgres engine compiled to WASM, but grant/role
// evaluation is exactly the kind of catalog-level behavior worth confirming
// on both rather than assuming WASM parity).
//
// Every assertion here reads catalog TRUTH via has_table_privilege() and
// pg_class.relrowsecurity -- never SQL text -- so a future migration that
// silently drops a grant, re-enables it via the wrong role, or disables RLS
// "to fix a permission error" fails these tests instead of passing a
// text-only check.

import assert from "node:assert/strict";
import test from "node:test";
import { replayMigrationsFromClean, createCleanSupabaseLikeDatabase, replayMigrationsAgainstDatabase } from "./replay-clean-chain.mjs";
import { replayMigrationsFromCleanRealPostgres } from "./real-postgres-replay-chain.mjs";
import {
  FITNESS_CORE_TABLES,
  formatMismatches,
  readDataApiGrantMatrix,
  readRowLevelSecurityStatus,
} from "./data-api-grants-contract.mjs";

/**
 * Shared assertion battery run against the live, fully-replayed database on
 * both backends: the exact Data API grant matrix, RLS still enabled on every
 * Fitness core table, and the session-start-atomicity RPC/index (the
 * previous migration's own final-state contract) still present -- confirming
 * this migration didn't regress it.
 *
 * @param {{ query(sql: string): Promise<{ rows: any[] }> }} db
 * @param {string} backendLabel
 */
async function assertDataApiGrantContract(db, backendLabel) {
  const { mismatches } = await readDataApiGrantMatrix(db);
  assert.deepEqual(
    mismatches,
    [],
    `[${backendLabel}] Data API grant matrix mismatch:\n${formatMismatches(mismatches)}`,
  );

  const rlsStatus = await readRowLevelSecurityStatus(db);
  assert.equal(
    rlsStatus.length,
    FITNESS_CORE_TABLES.length,
    `[${backendLabel}] expected to find all ${FITNESS_CORE_TABLES.length} Fitness core tables in pg_class`,
  );
  for (const { table, rlsEnabled } of rlsStatus) {
    assert.equal(rlsEnabled, true, `[${backendLabel}] expected RLS enabled on public.${table}`);
  }

  const functions = await db.query(
    `select routine_name from information_schema.routines
     where routine_schema = 'public' and routine_name = 'start_session_from_day_v1';`,
  );
  assert.deepEqual(
    functions.rows.map((row) => row.routine_name),
    ["start_session_from_day_v1"],
    `[${backendLabel}] expected the session-start-atomicity RPC to still be present`,
  );

  const indexes = await db.query(
    `select indexname from pg_indexes
     where schemaname = 'public' and indexname = 'sessions_user_routine_active_uq';`,
  );
  assert.deepEqual(
    indexes.rows.map((row) => row.indexname),
    ["sessions_user_routine_active_uq"],
    `[${backendLabel}] expected the session-start-atomicity partial unique index to still be present`,
  );
}

test("PGlite: full migration replay produces the exact expected Data API grant matrix", async () => {
  let asserted = false;
  await replayMigrationsFromClean({
    onComplete: async (db) => {
      await assertDataApiGrantContract(db, "PGlite");
      asserted = true;
    },
  });
  assert.equal(asserted, true, "onComplete callback should have run");
});

test("real Postgres: full migration replay produces the exact expected Data API grant matrix", async () => {
  let asserted = false;
  await replayMigrationsFromCleanRealPostgres({
    databaseName: "fitness_migration_replay_grants_contract",
    onComplete: async (db) => {
      await assertDataApiGrantContract(db, "real-Postgres");
      asserted = true;
    },
  });
  assert.equal(asserted, true, "onComplete callback should have run");
});

test("negative proof: revoking one required grant makes the contract assertion fail", async () => {
  // This is the "don't let tests merely compare SQL text" requirement made
  // concrete: prove the has_table_privilege()-based check actually reacts to
  // catalog state, not just to the presence of a GRANT statement in the
  // migration file. Uses PGlite directly (not the shared replay-from-clean
  // helper) so the connection stays open between the full replay and the
  // manual revoke below.
  const db = await createCleanSupabaseLikeDatabase();

  try {
    await replayMigrationsAgainstDatabase({ db });

    // Sanity check: the contract holds immediately after a clean replay.
    const { mismatches: mismatchesBeforeRevoke } = await readDataApiGrantMatrix(db);
    assert.deepEqual(
      mismatchesBeforeRevoke,
      [],
      "expected the contract to hold cleanly before the revoke",
    );

    // Remove one specific required grant -- anon's SELECT on exercises,
    // the smallest, most deliberately-public grant this migration adds --
    // and confirm the same assertion now reports exactly that gap.
    await db.exec("revoke select on public.exercises from anon;");

    const { mismatches: mismatchesAfterRevoke } = await readDataApiGrantMatrix(db);
    assert.equal(
      mismatchesAfterRevoke.length,
      1,
      `expected exactly one mismatch after revoking anon's SELECT on exercises, got:\n${formatMismatches(mismatchesAfterRevoke)}`,
    );
    assert.deepEqual(mismatchesAfterRevoke[0], {
      role: "anon",
      table: "exercises",
      op: "select",
      expected: true,
      actual: false,
    });
  } finally {
    await db.close();
  }
});
