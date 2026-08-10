// The explicit Postgres-GRANT contract for the core Fitness tables' Data API
// reachability. See
// supabase/migrations/20260806090000_explicit_fitness_data_api_grants.sql for
// the full audit trail (application source, RLS policies, QA-seed
// requirements) this matrix is derived from -- this module is only the
// machine-checkable expression of that same matrix, kept deliberately next
// to (not inside) the migration so both can be read side by side.
//
// This is the single source of truth both replay lanes
// (data-api-grants-contract.test.mjs, run against PGlite AND real Postgres)
// assert against, via has_table_privilege() -- operation-level, catalog-truth
// checks, not a comparison of SQL text. A future edit that grants too much,
// too little, or silently drifts from the migration's own stated intent is a
// failing test on both backends.
//
// Deliberately NOT covered here: billing_customers, billing_purchases,
// user_entitlements, and every discord_* table. Those already have their own
// narrower, independently-reviewed grant contracts from earlier migrations
// (20260701174902_billing_lifetime_pro.sql,
// 20260709073257_harden_discord_internal_table_access.sql and related) that
// this migration explicitly does not touch or broaden -- asserting on them
// here would duplicate a contract this change has no authority over.

/** @type {string[]} */
export const FITNESS_CORE_TABLES = [
  "profiles",
  "exercises",
  "routines",
  "routine_days",
  "routine_day_exercises",
  "sessions",
  "session_exercises",
  "sets",
  "exercise_stats",
  "session_follow_up_jobs",
  "progression_events",
  "workout_plan_templates",
  "workout_plan_template_exercises",
];

/** @type {string[]} */
const ALL_OPS = ["select", "insert", "update", "delete"];

const FULL_CRUD = ["select", "insert", "update", "delete"];

// progression_events is a source-of-truth append-only event ledger: only
// "select_own"/"insert_own" RLS policies were ever authored for it (see
// 20260509113000_051_progression_events.sql), and no call site anywhere in
// src/ ever issues an `.update()` against it. `delete` is granted (matching
// production's historical blanket-grant behavior and
// src/lib/dal/routine-delete.ts's real delete-on-routine-removal call sites)
// but is inert at the row level with no RLS delete policy backing it.
const APPEND_ONLY_NO_UPDATE = ["select", "insert", "delete"];

/**
 * The full expected positive-grant matrix: role -> table -> array of
 * privileges that MUST be present. Any (role, table, op) combination not
 * listed here for a table that IS listed is expected to be ABSENT --
 * see buildExpectedAssertions(), which expands that negative space
 * explicitly rather than leaving it implicit.
 */
export const EXPECTED_TABLE_PRIVILEGES = {
  anon: {
    // Only deliberately public read surface: the global exercise catalog.
    // src/lib/exercises.ts's listGlobalExercisesCached() reads this through
    // supabaseServerAnon() (no user session); RLS's own
    // "exercises_select_global_or_own" policy already narrows the visible
    // rows to is_global ones for a null auth.uid().
    exercises: ["select"],
  },
  authenticated: Object.fromEntries(
    FITNESS_CORE_TABLES.map((table) => [
      table,
      table === "progression_events" ? APPEND_ONLY_NO_UPDATE : FULL_CRUD,
    ]),
  ),
  service_role: Object.fromEntries(
    FITNESS_CORE_TABLES.map((table) => [
      table,
      table === "progression_events" ? APPEND_ONLY_NO_UPDATE : FULL_CRUD,
    ]),
  ),
};

const ROLES = ["anon", "authenticated", "service_role"];

/**
 * Expands EXPECTED_TABLE_PRIVILEGES into one row per (role, table, op)
 * combination across every role and every table in FITNESS_CORE_TABLES,
 * with an explicit boolean `expected`. This is what makes "deliberately
 * absent" privileges (e.g. anon should NOT have insert on exercises,
 * authenticated should NOT have update on progression_events) a first-class,
 * asserted fact instead of something only implied by omission.
 *
 * @returns {{ role: string, table: string, op: string, expected: boolean }[]}
 */
export function buildExpectedAssertions() {
  const rows = [];
  for (const role of ROLES) {
    for (const table of FITNESS_CORE_TABLES) {
      const grantedOps = new Set(EXPECTED_TABLE_PRIVILEGES[role]?.[table] ?? []);
      for (const op of ALL_OPS) {
        rows.push({ role, table, op, expected: grantedOps.has(op) });
      }
    }
  }
  return rows;
}

function escapeSqlLiteral(value) {
  return value.replace(/'/g, "''");
}

function matrixKey(role, table, op) {
  return [role, table, op].join("|");
}

/**
 * Builds the single round-trip SQL query that checks every (role, table, op)
 * combination from buildExpectedAssertions() via has_table_privilege().
 * One query instead of one-per-combination specifically so this is cheap
 * enough to run against a real network-connected Postgres server too.
 */
function buildGrantMatrixQuery(assertions) {
  const valuesList = assertions
    .map(
      (row) =>
        `('${escapeSqlLiteral(row.role)}', '${escapeSqlLiteral(row.table)}', '${escapeSqlLiteral(row.op)}')`,
    )
    .join(",\n    ");

  return `
    select
      v.role_name,
      v.table_name,
      v.op,
      has_table_privilege(v.role_name, 'public.' || v.table_name, v.op) as granted
    from (values
    ${valuesList}
    ) as v(role_name, table_name, op);
  `;
}

/**
 * Reads the ACTUAL Data API grant matrix off a live database (via
 * has_table_privilege(), never by parsing SQL text) and compares it against
 * EXPECTED_TABLE_PRIVILEGES. Works against both PGlite and the real-Postgres
 * `pg` adapter -- both expose `{ query(sql): Promise<{ rows }> }`.
 *
 * @param {{ query(sql: string): Promise<{ rows: any[] }> }} db
 * @returns {Promise<{
 *   results: { role: string, table: string, op: string, expected: boolean, actual: boolean }[],
 *   mismatches: { role: string, table: string, op: string, expected: boolean, actual: boolean }[],
 * }>}
 */
export async function readDataApiGrantMatrix(db) {
  const assertions = buildExpectedAssertions();
  const { rows } = await db.query(buildGrantMatrixQuery(assertions));

  const actualByKey = new Map();
  for (const row of rows) {
    actualByKey.set(matrixKey(row.role_name, row.table_name, row.op), row.granted === true);
  }

  const results = assertions.map((row) => ({
    ...row,
    actual: actualByKey.has(matrixKey(row.role, row.table, row.op))
      ? actualByKey.get(matrixKey(row.role, row.table, row.op))
      : null,
  }));

  const mismatches = results.filter((row) => row.actual !== row.expected);

  return { results, mismatches };
}

/**
 * Formats a human-readable failure summary for a non-empty `mismatches`
 * array, for use in assertion messages.
 *
 * @param {{ role: string, table: string, op: string, expected: boolean, actual: boolean }[]} mismatches
 */
export function formatMismatches(mismatches) {
  return mismatches
    .map((row) => {
      const expectedLabel = row.expected ? "GRANTED" : "absent";
      const actualLabel = row.actual ? "GRANTED" : "absent";
      return (
        "  " +
        row.role +
        " " +
        row.op +
        " on " +
        row.table +
        ": expected " +
        expectedLabel +
        ", actual " +
        actualLabel
      );
    })
    .join("\n");
}

/**
 * Confirms row level security is still enabled (relrowsecurity = true) on
 * every table in FITNESS_CORE_TABLES. GRANTs alone are never sufficient --
 * this is the other half of the dual-layer contract this migration exists to
 * document, and a regression here (someone disabling RLS while "fixing" a
 * permission error) would be exactly the kind of change this suite must
 * catch.
 *
 * @param {{ query(sql: string): Promise<{ rows: any[] }> }} db
 * @returns {Promise<{ table: string, rlsEnabled: boolean }[]>}
 */
export async function readRowLevelSecurityStatus(db) {
  const { rows } = await db.query(`
    select relname as table_name, relrowsecurity as rls_enabled
    from pg_class
    where relnamespace = 'public'::regnamespace
      and relname in (${FITNESS_CORE_TABLES.map((t) => `'${escapeSqlLiteral(t)}'`).join(", ")});
  `);

  return rows.map((row) => ({ table: row.table_name, rlsEnabled: row.rls_enabled === true }));
}
