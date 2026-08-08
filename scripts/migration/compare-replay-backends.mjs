// Runs the full 104-file supabase/migrations/*.sql chain against BOTH
// replay backends -- PGlite (replay-clean-chain.mjs) and real Postgres
// (real-postgres-replay-chain.mjs) -- and reports a side-by-side
// first-failure comparison for each. This is the PR #151 review's
// requirement #4/#5: "Capture the first failing filename/statement on both
// backends and fail if they disagree" -- so any future divergence between
// the two lanes (one backend starts failing somewhere the other doesn't)
// is immediately visible in CI output, rather than one green lane silently
// masking a problem the other would have caught.
//
// "Disagree" here means: one backend reports a failure and the other
// doesn't, or both fail but at different filenames. Both backends reporting
// "no failure" is agreement (the expected, current state of this chain).
// Both failing at the exact same file is also agreement (would indicate an
// actual migration-content bug, not a backend-fidelity gap) -- this script
// only exits non-zero on an actual disagreement, not merely because
// something failed.

import { pathToFileURL } from "node:url";
import { replayMigrationsFromClean } from "./replay-clean-chain.mjs";
import { replayMigrationsFromCleanRealPostgres } from "./real-postgres-replay-chain.mjs";

/**
 * @param {() => Promise<{ appliedMigrations: string[], totalMigrations: number }>} replayFn
 * @returns {Promise<{ failed: boolean, firstFailingFile: string | null, sqlstate: string | null, message: string | null, appliedCount: number, totalMigrations: number | null }>}
 */
async function runBackend(replayFn) {
  try {
    const result = await replayFn();
    return {
      failed: false,
      firstFailingFile: null,
      sqlstate: null,
      message: null,
      appliedCount: result.appliedMigrations.length,
      totalMigrations: result.totalMigrations,
    };
  } catch (error) {
    return {
      failed: true,
      firstFailingFile: error.failedMigration ?? null,
      sqlstate: error.cause?.code ?? null,
      message: error.cause?.message ?? error.message,
      appliedCount: error.appliedMigrations?.length ?? 0,
      totalMigrations: null,
    };
  }
}

/**
 * @param {object} [options]
 * @param {() => Promise<{ appliedMigrations: string[], totalMigrations: number }>} [options.runPglite]
 *   Defaults to the real PGlite backend. Overridable so tests can force
 *   specific synthetic outcomes (in particular a disagreement between the
 *   two backends) without needing a real Postgres server or PGlite runtime.
 * @param {() => Promise<{ appliedMigrations: string[], totalMigrations: number }>} [options.runRealPostgres]
 *   Defaults to the real real-Postgres backend. Same overridability as
 *   `runPglite`, for the same reason.
 * @returns {Promise<{
 *   pglite: Awaited<ReturnType<typeof runBackend>>,
 *   realPostgres: Awaited<ReturnType<typeof runBackend>>,
 *   agree: boolean,
 * }>}
 */
export async function compareReplayBackends({
  runPglite = () => replayMigrationsFromClean(),
  runRealPostgres = () =>
    replayMigrationsFromCleanRealPostgres({
      databaseName: "fitness_migration_replay_compare_full_chain",
    }),
} = {}) {
  const [pglite, realPostgres] = await Promise.all([
    runBackend(runPglite),
    runBackend(runRealPostgres),
  ]);

  const agree =
    pglite.failed === realPostgres.failed &&
    (!pglite.failed || pglite.firstFailingFile === realPostgres.firstFailingFile);

  return { pglite, realPostgres, agree };
}

function formatRow(label, backend) {
  const status = backend.failed ? "FAILED" : "clean";
  const file = backend.firstFailingFile ?? "(none)";
  const sqlstate = backend.sqlstate ?? "(n/a)";
  return `  ${label.padEnd(14)} status=${status.padEnd(6)} first-failing-file=${file} sqlstate=${sqlstate}`;
}

async function main() {
  console.log("Comparing PGlite and real-Postgres migration replay backends...\n");
  const { pglite, realPostgres, agree } = await compareReplayBackends();

  console.log("Backend comparison (first failure only, or 'clean' if the full chain applied):");
  console.log(formatRow("PGlite", pglite));
  console.log(formatRow("real-Postgres", realPostgres));
  console.log();

  if (!agree) {
    console.error(
      "DISAGREEMENT: the two backends did not reach the same outcome. " +
        "One of them found a problem the other didn't -- treat this as a signal that " +
        "one backend's environment (WASM PGlite vs real Postgres) is masking or " +
        "fabricating a failure, not as noise to ignore.",
    );
    if (pglite.message) console.error(`  PGlite error: ${pglite.message}`);
    if (realPostgres.message) console.error(`  real-Postgres error: ${realPostgres.message}`);
    process.exit(1);
  }

  if (pglite.failed) {
    console.log(
      `Both backends agree: first failure at "${pglite.firstFailingFile}" ` +
        `(PGlite sqlstate=${pglite.sqlstate ?? "n/a"}, real-Postgres sqlstate=${realPostgres.sqlstate ?? "n/a"}).`,
    );
    // Both backends agreeing on a real failure is itself useful signal
    // (a genuine migration-content bug), but is not this script's success
    // condition to silently swallow -- surface it as a failure too.
    process.exit(1);
  }

  console.log(
    `Both backends agree: the full ${pglite.totalMigrations}-file chain replays clean on both.`,
  );
  process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
