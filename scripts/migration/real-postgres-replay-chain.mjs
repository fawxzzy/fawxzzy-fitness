// Second, independent replay backend for supabase/migrations/*.sql, against
// a REAL Postgres server -- not the WASM approximation in
// replay-clean-chain.mjs. This exists because that PGlite lane, while a
// useful fast supplementary check, was reviewed and found NOT sufficient as
// migration-parity authority: a real hosted Supabase development branch
// failed replaying this exact migration chain with
// `column "slug" does not exist` after reaching the migration-042-era
// schema, and the PGlite lane did not reproduce that failure. See
// "INVESTIGATION" below for what was actually found chasing that down.
//
// *** THIS LANE IS ALSO A STAND-IN, NOT THE REAL THING. *** A real Postgres
// server -- including the `postgres:` GitHub Actions service container this
// module is designed to run against -- is much closer to Supabase's actual
// execution engine than PGlite (real WAL, real MVCC/catalog visibility
// rules, a real network round trip per statement, a real connection you can
// route through a pooler if you choose to), but it is still not literally
// Supabase's hosted platform. Supabase layers its own infrastructure on top
// of vanilla Postgres -- PgBouncer connection pooling in front of the
// database, its own migration-ledger/branching machinery
// (`supabase_migrations.schema_migrations`, branch-from-snapshot creation),
// and platform-specific extensions/config -- none of which a bare
// `postgres:` service container reproduces. So: PGlite is the fast
// supplementary contract; this real-Postgres lane is the migration-parity
// *authority* for this repo's CI; and even this lane cannot claim to be
// hosted-Supabase-identical. Only an actual Supabase development branch can
// settle that with finality, and per this task's hard limits, this repo's
// automated lanes are not allowed to create or touch one.
//
// === INVESTIGATION: why did the hosted branch see "column slug does not
// exist", and could this lane reproduce it? ===
//
// `slug` on `public.exercises` is touched by four migrations, in replay
// order:
//   1. 043_hide_standalone_stretch_catalog_rows.sql -- the EARLIEST one,
//      and it both adds the column (`alter table ... add column if not
//      exists slug text null;`) AND immediately reads it in the very next
//      statement (`update ... where slug in (...)`), in the same file, with
//      nothing else in between.
//   2. 20260505065000_exercise_optional_metadata_columns.sql -- re-adds it
//      idempotently (`add column if not exists`) and creates
//      `exercises_slug_idx`.
//   3. 20260508090000_remove_zone_2_cardio_catalog_exercise.sql -- reads it.
//   4. 20260729000000_planner_persistence_adapter_v1.sql -- reads it,
//      creates a unique index on it.
// No migration anywhere in the chain reads `slug` before migration 043
// creates it. Migration 042 (042_global_exercises_canonical_upsert.sql)
// never references `slug` at all -- it upserts global exercises keyed by
// `name`. So the migration *files*, replayed in the committed order, are
// self-consistent: nothing reads a column before something upstream of it
// created it. Both this lane and the PGlite lane replay the full 104-file
// chain, and the isolated 042-snapshot-then-043 proof below, with zero
// errors -- confirmed by running both (see the comparison report emitted by
// compare-replay-backends.mjs). That means **this investigation did not
// find a migration-ordering or dependency bug in the committed SQL**, and
// neither harness -- including this real-Postgres one -- reproduces the
// hosted branch's failure.
//
// One genuine, if narrower, anomaly is worth recording: migration 042 wraps
// its work in an explicit `BEGIN; ... COMMIT;` block; migration 043 does
// not -- it is two bare top-level statements (the `alter table` and the
// `update`) relying on Postgres's normal per-statement autocommit. That is
// not incorrect on a single, unpooled, sequential connection (which is
// exactly what both this lane and PGlite are) -- each statement commits in
// order on the same session, and the `update` sees the `alter`'s column
// immediately. But it is the one structural difference from 042's pattern,
// and it is exactly the kind of gap that would matter on Supabase's actual
// execution path if that path were ever routed through PgBouncer's
// *transaction-mode* pooling without an explicit transaction wrapping both
// statements: transaction-mode pooling only pins a backend connection to a
// client for the duration of one transaction, so two bare autocommit
// statements sent back-to-back are not guaranteed to land on the same
// backend session, and any tool that pipelines/dispatches them without
// confirming the first one's commit could -- in principle -- have the
// second statement planned or routed against a connection/catalog snapshot
// that predates the `alter table`. This is a plausible, well-known class of
// Postgres/pgbouncer hazard (Supabase's own docs warn that migrations
// should run over the *direct* connection, not the pooled one, for related
// reasons) and it would explain a transient "column does not exist" that no
// single-connection replay -- PGlite or this real-Postgres lane -- could
// ever reproduce. It was NOT possible to confirm this against the actual
// hosted branch under this task's hard limits (no production/staging
// Supabase connection of any kind), so it is reported as the most plausible
// explanation found, not a proven root cause. As a low-risk, no-downside
// hardening (independent of whether the pooler theory is correct),
// migration 043 would be safer wrapped in an explicit `BEGIN; ... COMMIT;`
// to match 042's own pattern -- flagged here as a recommendation, not
// applied as a fix, since supabase/migrations/*.sql was out of scope to
// edit for this task and the actual root cause is still unconfirmed.
//
// Another candidate explanation that was considered and set aside: a
// migration-ledger mismatch on the hosted branch (e.g. a branch created
// from a snapshot/template whose `supabase_migrations.schema_migrations`
// table already listed 043 as applied without the column actually existing,
// so `db push` would skip re-running it). This cannot be ruled in or out
// from the committed migration files alone -- it is a property of the
// hosted branch's actual database state, which this task's hard limits
// forbid connecting to. It is recorded here as a second plausible
// explanation, not dismissed.
//
// === What this module actually does ===
//
// Shares the exact same ordered file list and replay-loop/error-reporting
// logic as the PGlite lane (`listMigrationFiles`,
// `replayMigrationsAgainstDatabase` from ./replay-clean-chain.mjs) and the
// exact same minimal Supabase-platform preamble
// (`applySupabasePlatformPreamble` from ./supabase-platform-preamble.mjs,
// corrected there to be idempotent against a reused real Postgres server --
// see that module's own comment). Only the database backend differs: a real
// `pg` connection to a real (but disposable, local-only) Postgres server,
// never a Supabase project of any kind.
//
// Connection safety: this module refuses to connect to anything whose host
// is not loopback/a same-Docker-network service-container hostname. There
// is no default that points at any real project, staging or otherwise, and
// no code path here ever reads a Supabase URL, anon key, or service-role
// key.

import { pathToFileURL } from "node:url";
import pg from "pg";
import {
  DEFAULT_MIGRATIONS_DIR,
  listMigrationFiles,
  replayMigrationsAgainstDatabase,
} from "./replay-clean-chain.mjs";
import { applySupabasePlatformPreamble } from "./supabase-platform-preamble.mjs";

const { Client } = pg;

// Hosts this module will ever connect to. Intentionally narrow: a real
// Postgres service container in CI listens on localhost (the runner and the
// service container share network namespace via the `services:` mapping),
// and local manual testing against `docker run -p 5432:5432 postgres` also
// lands on localhost. Nothing here can resolve to a real Supabase project
// host (`*.supabase.co`) because those hostnames are simply never accepted.
const ALLOWED_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "postgres"]);

/**
 * Builds the admin connection config (points at the server's default
 * `postgres` maintenance database, used only to CREATE/DROP disposable
 * databases and, when needed, CREATE DATABASE ... TEMPLATE clones).
 * Reads connection details from REAL_POSTGRES_* env vars with safe,
 * loopback-only defaults matching the standard `postgres:` Docker image and
 * this repo's own CI workflow -- never a Supabase project.
 *
 * @returns {{ host: string, port: number, user: string, password: string }}
 */
export function getRealPostgresConnectionConfig() {
  const host = process.env.REAL_POSTGRES_HOST || "localhost";
  const port = Number(process.env.REAL_POSTGRES_PORT || 5432);
  const user = process.env.REAL_POSTGRES_USER || "postgres";
  const password = process.env.REAL_POSTGRES_PASSWORD || "postgres";

  if (!ALLOWED_HOSTS.has(host)) {
    throw new Error(
      `Refusing to connect the real-Postgres migration replay lane to host "${host}". ` +
        `This lane is only allowed to talk to a loopback/service-container Postgres ` +
        `(one of: ${[...ALLOWED_HOSTS].join(", ")}) -- never a remote host, and never a ` +
        `Supabase project of any kind. Set REAL_POSTGRES_HOST to one of the allowed values.`,
    );
  }

  return { host, port, user, password };
}

async function connect(database) {
  const config = getRealPostgresConnectionConfig();
  const client = new Client({ ...config, database });
  await client.connect();
  return client;
}

/**
 * Thin adapter so a `pg` Client satisfies the same `{ exec(sql) }` shape
 * replayMigrationsAgainstDatabase expects (matching PGlite's own `.exec`).
 * `pg`'s `query(text)` with no parameters uses the simple query protocol,
 * which -- like PGlite's `.exec` -- runs a possibly-multi-statement SQL
 * string as a sequence of statements on one session, in order.
 *
 * @param {pg.Client} client
 */
function toExecAdapter(client) {
  return {
    exec: (sql) => client.query(sql),
    query: (sql) => client.query(sql),
    close: () => client.end(),
  };
}

/**
 * Drops (if present) and recreates a disposable database on the real
 * Postgres server, then applies the shared platform preamble to it, and
 * returns a ready-to-use `{ exec, query, close }` adapter connected to it.
 *
 * @param {string} databaseName
 * @returns {Promise<{ exec(sql: string): Promise<unknown>, query(sql: string): Promise<unknown>, close(): Promise<void> }>}
 */
export async function createCleanRealPostgresDatabase(databaseName) {
  assertSafeDatabaseName(databaseName);

  const admin = await connect("postgres");
  try {
    // Terminate any lingering connections from a previous run before
    // dropping -- DROP DATABASE fails if anything is still connected.
    await admin.query(
      `select pg_terminate_backend(pid) from pg_stat_activity
       where datname = $1 and pid <> pg_backend_pid();`,
      [databaseName],
    );
    await admin.query(`drop database if exists ${quoteIdent(databaseName)};`);
    await admin.query(`create database ${quoteIdent(databaseName)};`);
  } finally {
    await admin.end();
  }

  const client = await connect(databaseName);
  const db = toExecAdapter(client);
  try {
    await applySupabasePlatformPreamble(db);
  } catch (error) {
    // Preamble application failed -- close the just-opened client before
    // rethrowing so we never leak a live Postgres connection on this path.
    // Without this, a preamble failure left `client` connected forever
    // (nothing else in the call chain holds a reference to close it).
    await client.end();
    throw error;
  }
  return db;
}

/**
 * Clones `sourceDatabaseName` into a brand-new `snapshotDatabaseName` using
 * Postgres's own `CREATE DATABASE ... TEMPLATE` -- a real, server-side
 * snapshot of exact on-disk state, not a re-replay. `sourceDb` must be
 * closed (Postgres refuses to use a database with active connections as a
 * template) before this is called.
 *
 * @param {string} sourceDatabaseName
 * @param {string} snapshotDatabaseName
 */
export async function snapshotRealPostgresDatabase(sourceDatabaseName, snapshotDatabaseName) {
  assertSafeDatabaseName(sourceDatabaseName);
  assertSafeDatabaseName(snapshotDatabaseName);

  const admin = await connect("postgres");
  try {
    await admin.query(
      `select pg_terminate_backend(pid) from pg_stat_activity
       where datname = $1 and pid <> pg_backend_pid();`,
      [sourceDatabaseName],
    );
    await admin.query(
      `select pg_terminate_backend(pid) from pg_stat_activity
       where datname = $1 and pid <> pg_backend_pid();`,
      [snapshotDatabaseName],
    );
    await admin.query(`drop database if exists ${quoteIdent(snapshotDatabaseName)};`);
    await admin.query(
      `create database ${quoteIdent(snapshotDatabaseName)} template ${quoteIdent(sourceDatabaseName)};`,
    );
  } finally {
    await admin.end();
  }
}

function assertSafeDatabaseName(name) {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(name)) {
    throw new Error(
      `Refusing to use "${name}" as a disposable database name -- expected a lowercase ` +
        `identifier (this is interpolated into DDL, so it is restricted to a safe charset ` +
        `rather than parameterized).`,
    );
  }
}

function quoteIdent(name) {
  // assertSafeDatabaseName already restricts the charset; this just adds
  // standard double-quoting so the identifier can't collide with a
  // reserved word.
  return `"${name}"`;
}

/**
 * Replays every migration in migrationsDir, in order, against a brand new
 * disposable database on a real Postgres server, and reports
 * success/failure with the exact same shape replayMigrationsFromClean
 * (PGlite) does. Always closes the connection before returning or throwing.
 *
 * @param {object} [options]
 * @param {string} [options.migrationsDir]
 * @param {string} [options.databaseName]
 * @param {(db: { query(sql: string): Promise<unknown> }) => Promise<void> | void} [options.onComplete]
 * @returns {Promise<{ migrationsDir: string, appliedMigrations: string[], totalMigrations: number }>}
 */
export async function replayMigrationsFromCleanRealPostgres({
  migrationsDir = DEFAULT_MIGRATIONS_DIR,
  databaseName = "fitness_migration_replay_full_chain",
  onComplete,
} = {}) {
  const db = await createCleanRealPostgresDatabase(databaseName);

  try {
    const result = await replayMigrationsAgainstDatabase({ db, migrationsDir });

    if (typeof onComplete === "function") {
      await onComplete(db);
    }

    return result;
  } finally {
    await db.close();
  }
}

/**
 * The migration-042/043 snapshot-and-verify proof requested by the PR #151
 * review: materializes the schema through migration 042 on a real Postgres
 * database, takes a real server-side snapshot of that exact state (via
 * CREATE DATABASE ... TEMPLATE), then applies migration 043 alone against
 * the snapshot and asserts the column it adds, and the update it runs,
 * both actually happen.
 *
 * @param {object} [options]
 * @param {string} [options.migrationsDir]
 * @returns {Promise<{
 *   preSnapshotFiles: string[],
 *   snapshotDatabaseName: string,
 *   slugColumnExistedBeforeMigration043: boolean,
 *   migration043Applied: boolean,
 *   slugColumnExistsAfterMigration043: boolean,
 *   slugColumnIsNullable: boolean,
 * }>}
 */
export async function snapshotAfter042AndReplay043({
  migrationsDir = DEFAULT_MIGRATIONS_DIR,
} = {}) {
  const allFiles = await listMigrationFiles(migrationsDir);
  const migration042Name = "042_global_exercises_canonical_upsert.sql";
  const migration043Name = "043_hide_standalone_stretch_catalog_rows.sql";
  const index042 = allFiles.indexOf(migration042Name);
  const index043 = allFiles.indexOf(migration043Name);

  if (index042 === -1 || index043 === -1 || index043 !== index042 + 1) {
    throw new Error(
      `Expected "${migration042Name}" immediately followed by "${migration043Name}" in ` +
        `the replay order, but found them at indices ${index042} and ${index043}. The ` +
        `042/043 snapshot proof assumes this adjacency and needs updating if the chain's ` +
        `file layout changes.`,
    );
  }

  const preSnapshotFiles = allFiles.slice(0, index042 + 1);
  const baseDatabaseName = "fitness_migration_replay_pre043_base";
  const snapshotDatabaseName = "fitness_migration_replay_snapshot_042";

  // 1. Replay everything through migration 042 (inclusive) on a fresh db.
  const baseDb = await createCleanRealPostgresDatabase(baseDatabaseName);
  let slugColumnExistedBeforeMigration043;
  try {
    await replayMigrationsAgainstDatabase({
      db: baseDb,
      migrationsDir,
      files: preSnapshotFiles,
    });

    const columnCheck = await baseDb.query(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = 'exercises' and column_name = 'slug';`,
    );
    slugColumnExistedBeforeMigration043 = columnCheck.rows.length > 0;
  } finally {
    await baseDb.close();
  }

  // 2. Take a real server-side snapshot of that exact post-042 state.
  await snapshotRealPostgresDatabase(baseDatabaseName, snapshotDatabaseName);

  // 3. Apply migration 043 alone against the snapshot, and inspect the
  //    result -- proving the ALTER ... ADD COLUMN slug + UPDATE ... slug
  //    sequence the review flagged actually runs correctly under real
  //    Postgres.
  const snapshotClient = await connect(snapshotDatabaseName);
  const snapshotDb = toExecAdapter(snapshotClient);
  let migration043Applied = false;
  let slugColumnExistsAfterMigration043 = false;
  let slugColumnIsNullable = false;
  try {
    await replayMigrationsAgainstDatabase({
      db: snapshotDb,
      migrationsDir,
      files: [migration043Name],
    });
    migration043Applied = true;

    const columnCheck = await snapshotDb.query(
      `select is_nullable from information_schema.columns
       where table_schema = 'public' and table_name = 'exercises' and column_name = 'slug';`,
    );
    slugColumnExistsAfterMigration043 = columnCheck.rows.length > 0;
    slugColumnIsNullable = columnCheck.rows[0]?.is_nullable === "YES";
  } finally {
    await snapshotDb.close();
  }

  // Cleanup: drop both disposable databases so re-runs within the same CI
  // job (or repeated local runs) don't collide with stale leftovers.
  const admin = await connect("postgres");
  try {
    for (const name of [baseDatabaseName, snapshotDatabaseName]) {
      await admin.query(
        `select pg_terminate_backend(pid) from pg_stat_activity
         where datname = $1 and pid <> pg_backend_pid();`,
        [name],
      );
      await admin.query(`drop database if exists ${quoteIdent(name)};`);
    }
  } finally {
    await admin.end();
  }

  return {
    preSnapshotFiles,
    snapshotDatabaseName,
    slugColumnExistedBeforeMigration043,
    migration043Applied,
    slugColumnExistsAfterMigration043,
    slugColumnIsNullable,
  };
}

async function main() {
  try {
    console.log("Running the migration-042/043 snapshot-and-verify proof against real Postgres...");
    const snapshotResult = await snapshotAfter042AndReplay043();
    console.log(
      `  slug column present before migration 043: ${snapshotResult.slugColumnExistedBeforeMigration043} (expected false)`,
    );
    console.log(
      `  migration 043 applied cleanly against the post-042 snapshot: ${snapshotResult.migration043Applied}`,
    );
    console.log(
      `  slug column present after migration 043: ${snapshotResult.slugColumnExistsAfterMigration043} (expected true)`,
    );

    console.log("\nReplaying the full 104-file chain against real Postgres...");
    const result = await replayMigrationsFromCleanRealPostgres();
    console.log(
      `Replayed ${result.appliedMigrations.length}/${result.totalMigrations} ` +
        `migrations against a real Postgres server with no errors.`,
    );
    console.log(`last applied: ${result.appliedMigrations.at(-1)}`);
    process.exit(0);
  } catch (error) {
    console.error(error.message);
    if (error.cause) {
      console.error(`underlying error: ${error.cause.message} (sqlstate: ${error.cause.code ?? "n/a"})`);
    }
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
