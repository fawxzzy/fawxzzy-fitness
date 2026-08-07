// Fully local, offline, credential-free proof that supabase/migrations/*.sql
// replays cleanly from an empty database up to the current head, in order.
//
// This does not talk to any Supabase project (real or staging) and needs no
// Supabase credentials -- it runs the actual migration SQL against a
// disposable, in-process WASM Postgres (@electric-sql/pglite) that lives
// only for the duration of one call. That is a deliberate contrast with the
// repo's existing scripts/migration/validate-supabase-chain.mjs and
// parity-report.mjs, which both require a real linked Supabase project and
// network access (`supabase migration list --linked`, `supabase db push
// --dry-run --linked`) -- useful for confirming the linked project's remote
// ledger matches local history, but unable to say anything about whether
// the migration chain is internally self-consistent from nothing, and
// unusable in an environment that must not contact a real Supabase project
// at all.
//
// See supabase-platform-preamble.mjs for what minimal scaffolding this
// module adds before replaying the chain, and why.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { applySupabasePlatformPreamble } from "./supabase-platform-preamble.mjs";

const currentFilePath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFilePath), "..", "..");
export const DEFAULT_MIGRATIONS_DIR = path.join(repoRoot, "supabase", "migrations");

/**
 * Lists every migration file in migrationsDir in the same order Supabase
 * itself applies them: ascending lexicographic order of the full filename.
 * Supabase's migration version key is a string, not a parsed integer, and
 * this repo's filenames (mixing 3-digit legacy prefixes like "001_" and
 * "021_" with a later 4-digit prefix pair "0221_"/"0222_", and eventually
 * 14-digit timestamp prefixes) only land in the intended chronological
 * order under lexicographic string comparison of the full filename -- which
 * is exactly what a plain `Array.prototype.sort()` over filenames, or
 * `ls | sort`, both give for this character set. This was verified against
 * the repo's own supabase/migrations/ directory before relying on it here.
 *
 * @param {string} migrationsDir
 * @returns {Promise<string[]>}
 */
export async function listMigrationFiles(migrationsDir = DEFAULT_MIGRATIONS_DIR) {
  const entries = await readdir(migrationsDir);
  return entries.filter((entry) => entry.endsWith(".sql")).sort();
}

/**
 * Creates a fresh, disposable, in-process PGlite database with the pgcrypto
 * contrib extension loaded and the minimal Supabase-platform preamble
 * applied. Caller owns the returned instance and must call `.close()`.
 *
 * @returns {Promise<PGlite>}
 */
export async function createCleanSupabaseLikeDatabase() {
  const db = new PGlite({ extensions: { pgcrypto } });
  await applySupabasePlatformPreamble(db);
  return db;
}

/**
 * Replays every migration in migrationsDir, in order, against a brand new
 * clean database, and reports success/failure. Always closes the database
 * before returning or throwing.
 *
 * On failure, throws an Error whose `.failedMigration` is the exact
 * filename that failed, `.appliedMigrations` is the ordered list of
 * filenames that succeeded before it, and `.cause` is the underlying
 * Postgres error.
 *
 * @param {object} [options]
 * @param {string} [options.migrationsDir]
 * @param {(db: PGlite) => Promise<void> | void} [options.onComplete] Invoked
 *   with the live database connection after every migration has applied
 *   successfully, before the connection is closed. Useful for asserting
 *   final schema state in tests.
 * @returns {Promise<{ migrationsDir: string, appliedMigrations: string[], totalMigrations: number }>}
 */
export async function replayMigrationsFromClean({
  migrationsDir = DEFAULT_MIGRATIONS_DIR,
  onComplete,
} = {}) {
  const files = await listMigrationFiles(migrationsDir);
  const db = await createCleanSupabaseLikeDatabase();
  const appliedMigrations = [];

  try {
    for (const file of files) {
      const sql = await readFile(path.join(migrationsDir, file), "utf8");
      try {
        await db.exec(sql);
      } catch (cause) {
        const error = new Error(
          `Clean-database migration replay failed at "${file}" ` +
            `(migration ${appliedMigrations.length + 1} of ${files.length}): ${cause.message}`,
        );
        error.failedMigration = file;
        error.appliedMigrations = [...appliedMigrations];
        error.cause = cause;
        throw error;
      }
      appliedMigrations.push(file);
    }

    if (typeof onComplete === "function") {
      await onComplete(db);
    }
  } finally {
    await db.close();
  }

  return { migrationsDir, appliedMigrations, totalMigrations: files.length };
}

async function main() {
  try {
    const result = await replayMigrationsFromClean();
    console.log(
      `Replayed ${result.appliedMigrations.length}/${result.totalMigrations} ` +
        `migrations from an empty database with no errors.`,
    );
    console.log(`migrations dir: ${result.migrationsDir}`);
    console.log(`last applied: ${result.appliedMigrations.at(-1)}`);
    process.exit(0);
  } catch (error) {
    console.error(error.message);
    if (error.cause) {
      console.error(`underlying error: ${error.cause.message}`);
    }
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
