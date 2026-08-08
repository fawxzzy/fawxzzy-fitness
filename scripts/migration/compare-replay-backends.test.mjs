// node --test suite for compareReplayBackends()'s own agreement/disagreement
// logic, in isolation from either real replay backend. Fully offline: no
// PGlite instance and no real Postgres connection is created anywhere in
// this file.
//
// Why this exists: prior to this test, the `!agree` branch in
// compare-replay-backends.mjs had no dedicated test at all -- it was only
// ever exercised indirectly in CI, where both real backends happen to agree
// (see compare-replay-backends.mjs's own module comment and
// real-postgres-replay-chain.mjs's investigation writeup: this task did not
// find a reproducible disagreement between the two real backends). That
// means the actual disagreement-detection code path -- the one thing this
// script exists to catch -- was unverified by any test. If a future edit
// silently broke the `agree` computation (e.g. flipped a comparison, or
// stopped comparing `firstFailingFile` at all), CI would only ever show it
// as "still green" instead of failing loudly, exactly the failure mode this
// script is supposed to prevent.
//
// compareReplayBackends() takes optional `runPglite`/`runRealPostgres`
// overrides specifically so this can be tested: each test below injects two
// synthetic "replay functions" that resolve or reject with the same shape
// the real replayMigrationsFromClean()/replayMigrationsFromCleanRealPostgres()
// calls do (a `{ appliedMigrations, totalMigrations }` result on success, or
// an Error with `.failedMigration`/`.appliedMigrations`/`.cause` on failure),
// and asserts on the real, non-mocked `compareReplayBackends()` /
// `agree` computation.

import assert from "node:assert/strict";
import test from "node:test";
import { compareReplayBackends } from "./compare-replay-backends.mjs";

function syntheticSuccess(appliedMigrations) {
  return async () => ({
    appliedMigrations,
    totalMigrations: appliedMigrations.length,
  });
}

function syntheticFailure(failedMigration, appliedMigrations, { message, code } = {}) {
  return async () => {
    const cause = new Error(message ?? `synthetic failure at ${failedMigration}`);
    if (code) cause.code = code;

    const error = new Error(
      `Migration replay failed at "${failedMigration}" (synthetic test failure)`,
    );
    error.failedMigration = failedMigration;
    error.appliedMigrations = appliedMigrations;
    error.cause = cause;
    throw error;
  };
}

test("compareReplayBackends: agrees when both backends replay clean", async () => {
  const files = ["001_init.sql", "002_next.sql"];
  const { pglite, realPostgres, agree } = await compareReplayBackends({
    runPglite: syntheticSuccess(files),
    runRealPostgres: syntheticSuccess(files),
  });

  assert.equal(agree, true);
  assert.equal(pglite.failed, false);
  assert.equal(realPostgres.failed, false);
});

test("compareReplayBackends: agrees when both backends fail at the exact same file", async () => {
  const { agree, pglite, realPostgres } = await compareReplayBackends({
    runPglite: syntheticFailure("043_hide_standalone_stretch_catalog_rows.sql", ["001_init.sql"], {
      code: "42703",
    }),
    runRealPostgres: syntheticFailure(
      "043_hide_standalone_stretch_catalog_rows.sql",
      ["001_init.sql"],
      { code: "42703" },
    ),
  });

  assert.equal(agree, true, "both backends failing at the same file is agreement, not disagreement");
  assert.equal(pglite.failed, true);
  assert.equal(realPostgres.failed, true);
  assert.equal(pglite.firstFailingFile, realPostgres.firstFailingFile);
});

test("compareReplayBackends: DISAGREES when one backend fails and the other replays clean", async () => {
  // This is the core regression this test file exists to guard: previously
  // untested, and exactly the scenario that matters for this script's
  // purpose (one backend silently masking a problem the other caught).
  const files = ["001_init.sql", "002_next.sql", "043_hide_standalone_stretch_catalog_rows.sql"];

  const { pglite, realPostgres, agree } = await compareReplayBackends({
    runPglite: syntheticSuccess(files),
    runRealPostgres: syntheticFailure(
      "043_hide_standalone_stretch_catalog_rows.sql",
      ["001_init.sql", "002_next.sql"],
      { message: 'column "slug" does not exist', code: "42703" },
    ),
  });

  assert.equal(agree, false, "one backend clean and the other failed must be reported as a disagreement");
  assert.equal(pglite.failed, false);
  assert.equal(realPostgres.failed, true);
  assert.equal(realPostgres.firstFailingFile, "043_hide_standalone_stretch_catalog_rows.sql");
  assert.equal(realPostgres.sqlstate, "42703");
  assert.match(realPostgres.message, /slug/);
});

test("compareReplayBackends: DISAGREES when both backends fail but at different files", async () => {
  const { pglite, realPostgres, agree } = await compareReplayBackends({
    runPglite: syntheticFailure("020_something.sql", ["001_init.sql"], { code: "42P01" }),
    runRealPostgres: syntheticFailure(
      "043_hide_standalone_stretch_catalog_rows.sql",
      ["001_init.sql", "..."],
      { code: "42703" },
    ),
  });

  assert.equal(
    agree,
    false,
    "both backends failing, but at different files, must still be reported as a disagreement",
  );
  assert.equal(pglite.failed, true);
  assert.equal(realPostgres.failed, true);
  assert.notEqual(pglite.firstFailingFile, realPostgres.firstFailingFile);
});
