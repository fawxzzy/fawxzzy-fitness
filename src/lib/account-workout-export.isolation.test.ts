import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  ACCOUNT_WORKOUT_EXPORT_SCHEMA_VERSION,
  buildAccountWorkoutExportJsonDocument,
  buildAccountWorkoutExportPayload,
  loadAccountWorkoutExportSettings,
} from "@/lib/account-workout-export";

type Row = Record<string, unknown>;
type Tables = Record<string, Row[]>;
type RecordedQuery = { table: string; filters: Array<{ kind: string; column: string }> };

// A tiny in-memory stand-in for the cookie-bound Supabase client: it only returns what the query's own
// filters select, so a missing user filter in the export loader would leak the other user's rows.
function createRecordingSupabase(tables: Tables) {
  const queries: RecordedQuery[] = [];
  const client = {
    from(table: string) {
      const filters: Array<{ kind: string; column: string; test: (row: Row) => boolean }> = [];
      let order: { column: string; ascending: boolean } | null = null;
      let limit: number | null = null;
      const builder = {
        select() { return builder; },
        eq(column: string, value: unknown) { filters.push({ kind: "eq", column, test: (row) => row[column] === value }); return builder; },
        in(column: string, values: unknown[]) { filters.push({ kind: "in", column, test: (row) => values.includes(row[column]) }); return builder; },
        gte(column: string, value: string) { filters.push({ kind: "gte", column, test: (row) => String(row[column]) >= value }); return builder; },
        lte(column: string, value: string) { filters.push({ kind: "lte", column, test: (row) => String(row[column]) <= value }); return builder; },
        order(column: string, options?: { ascending?: boolean }) { order = { column, ascending: options?.ascending !== false }; return builder; },
        limit(count: number) { limit = count; return builder; },
        then(resolve: (value: { data: Row[] }) => unknown, reject?: (reason: unknown) => unknown) {
          queries.push({ table, filters: filters.map(({ kind, column }) => ({ kind, column })) });
          let rows = (tables[table] ?? []).filter((row) => filters.every((filter) => filter.test(row)));
          if (order) {
            const { column, ascending } = order;
            rows = [...rows].sort((a, b) => (String(a[column]) < String(b[column]) ? -1 : String(a[column]) > String(b[column]) ? 1 : 0) * (ascending ? 1 : -1));
          }
          if (limit !== null) {
            rows = rows.slice(0, limit);
          }
          return Promise.resolve({ data: rows }).then(resolve, reject);
        },
      };
      return builder;
    },
  };
  return { client, queries };
}

function twoUserTables(): Tables {
  const make = (user: "user-1" | "user-2"): Tables => ({
    routines: [{ id: `${user}-routine`, user_id: user, name: `${user} routine`, updated_at: "2026-05-04T10:00:00.000Z" }],
    routine_days: [{ id: `${user}-day`, user_id: user, routine_id: `${user}-routine`, day_index: 1, name: "Day" }],
    routine_day_exercises: [{ id: `${user}-rde`, user_id: user, routine_day_id: `${user}-day`, exercise_id: "exercise-shared", position: 1 }],
    sessions: [{ id: `${user}-session`, user_id: user, performed_at: "2026-05-05T10:00:00.000Z", status: "completed", notes: `${user} private note` }],
    session_exercises: [{ id: `${user}-se`, session_id: `${user}-session`, user_id: user, exercise_id: "exercise-shared", position: 1 }],
    sets: [{ id: `${user}-set`, session_exercise_id: `${user}-se`, user_id: user, set_index: 1, weight: 100, reps: 5 }],
    progression_events: [{ id: `${user}-event`, user_id: user, routine_id: `${user}-routine`, exercise_id: "exercise-shared", event_type: "promotion_applied", created_at: "2026-05-06T10:00:00.000Z" }],
    profiles: [{ id: user, timezone: "America/New_York", preferred_weight_unit: "lbs", preferred_distance_unit: "mi", billing_email: `${user}@example.test`, stripe_customer_id: `cus_${user}` }],
  });
  const one = make("user-1");
  const two = make("user-2");
  const merged: Tables = {};
  for (const key of Object.keys(one)) {
    merged[key] = [...one[key], ...two[key]];
  }
  merged.exercises = [{ id: "exercise-shared", name: "Bench Press" }];
  return merged;
}

test("export of user-1 never contains a row, id, note or setting that belongs to user-2", async () => {
  const { client } = createRecordingSupabase(twoUserTables());
  const payload = await buildAccountWorkoutExportPayload({
    supabase: client,
    userId: "user-1",
    options: { fileType: "json", scope: "all" },
  });
  const settings = await loadAccountWorkoutExportSettings({ supabase: client, userId: "user-1" });
  const text = JSON.stringify(buildAccountWorkoutExportJsonDocument(payload, { settings }));

  assert.match(text, /user-1-session/);
  assert.match(text, /user-1-set/);
  assert.doesNotMatch(text, /user-2/);
  assert.deepEqual(payload.metadata.counts, {
    sessions: 1,
    completedSessions: 1,
    sessionExercises: 1,
    sets: 1,
    routines: 1,
    routineDays: 1,
    routineExercises: 1,
    exercises: 1,
    progressionEvents: 1,
  });
});

test("every query against a user-owned table is filtered by the session user id", async () => {
  const { client, queries } = createRecordingSupabase(twoUserTables());
  await buildAccountWorkoutExportPayload({ supabase: client, userId: "user-1", options: { fileType: "json", scope: "all" } });
  await loadAccountWorkoutExportSettings({ supabase: client, userId: "user-1" });

  const owned = ["routines", "routine_days", "routine_day_exercises", "sessions", "session_exercises", "sets", "progression_events"];
  for (const table of owned) {
    const forTable = queries.filter((query) => query.table === table);
    assert.ok(forTable.length > 0, `${table} was queried`);
    for (const query of forTable) {
      assert.ok(query.filters.some((filter) => filter.kind === "eq" && filter.column === "user_id"), `${table} is filtered by user_id`);
    }
  }
  const profileQueries = queries.filter((query) => query.table === "profiles");
  assert.equal(profileQueries.length, 1);
  assert.ok(profileQueries[0].filters.some((filter) => filter.kind === "eq" && filter.column === "id"));
  // The shared exercise catalog is the only table read by id list; it carries names, not user data.
  assert.deepEqual(queries.filter((query) => query.table === "exercises").map((query) => query.filters.map((filter) => filter.kind)), [["in"]]);
});

test("settings carry only the three non-secret preferences, never billing or contact fields", async () => {
  const { client } = createRecordingSupabase(twoUserTables());
  const settings = await loadAccountWorkoutExportSettings({ supabase: client, userId: "user-2" });

  assert.deepEqual(settings, { timezone: "America/New_York", weightUnit: "lbs", distanceUnit: "mi" });
  assert.equal(await loadAccountWorkoutExportSettings({ supabase: client, userId: "nobody" }), null);

  const payload = await buildAccountWorkoutExportPayload({ supabase: client, userId: "user-2", options: { fileType: "json", scope: "all" } });
  const text = JSON.stringify(buildAccountWorkoutExportJsonDocument(payload, { settings }));
  assert.doesNotMatch(text, /stripe|billing|cus_|@example|password|token|secret|cookie|service_role/i);
});

test("the JSON document leads with a schema version, is deterministic and uses ISO timestamps", async () => {
  const { client } = createRecordingSupabase(twoUserTables());
  const payload = await buildAccountWorkoutExportPayload({ supabase: client, userId: "user-1", options: { fileType: "json", scope: "all" } });
  const settings = await loadAccountWorkoutExportSettings({ supabase: client, userId: "user-1" });
  const first = JSON.stringify(buildAccountWorkoutExportJsonDocument(payload, { settings }), null, 2);
  const second = JSON.stringify(buildAccountWorkoutExportJsonDocument(payload, { settings }), null, 2);

  assert.equal(first, second);
  const document = JSON.parse(first) as Record<string, unknown>;
  assert.equal(ACCOUNT_WORKOUT_EXPORT_SCHEMA_VERSION, 1);
  assert.deepEqual(Object.keys(document), ["schemaVersion", "settings", "metadata", "data"]);
  assert.equal(document.schemaVersion, 1);
  const metadata = document.metadata as { exportedAt: string };
  assert.equal(new Date(metadata.exportedAt).toISOString(), metadata.exportedAt);
  assert.equal(buildAccountWorkoutExportJsonDocument(payload).settings, null);
});

test("export routes: signed-out is a 401 before any data access, the user id comes only from the session, no elevated key", () => {
  const route = readFileSync("src/app/api/account/export/route.ts", "utf8");
  const preview = readFileSync("src/app/api/account/export/preview/route.ts", "utf8");

  for (const [name, text] of [["export", route], ["preview", preview]] as const) {
    const authIndex = text.indexOf("await resolveApiUser()");
    assert.ok(authIndex > -1, `${name} authenticates with resolveApiUser`);
    assert.ok(authIndex < text.indexOf("request.json()"), `${name} authenticates before reading the body`);
    assert.ok(authIndex < text.indexOf("supabaseServer()"), `${name} authenticates before touching the database`);
    assert.match(text, /userId: user\.id/);
    assert.doesNotMatch(text, /userId: payload|payload\.userId|payload\.user_id/);
    assert.doesNotMatch(text, /service[_-]?role|SERVICE_ROLE|supabaseAdmin|createClient\(/i);
  }
  assert.match(route, /"Cache-Control": "private, no-store"/);

  const lib = readFileSync("src/lib/account-workout-export.ts", "utf8");
  assert.doesNotMatch(lib, /service[_-]?role|SERVICE_ROLE|supabaseAdmin/i);
  // Every chained read of a user-owned table in the loader scopes by user_id.
  const builderStart = lib.indexOf("export async function buildAccountWorkoutExportPayload");
  for (const table of ["routines", "routine_days", "routine_day_exercises", "sessions", "session_exercises", "sets", "progression_events"]) {
    const start = lib.indexOf(`.from("${table}")`, builderStart);
    assert.ok(start > -1, `${table} is read by the payload builder`);
    assert.match(lib.slice(start, start + 900), /\.eq\("user_id", userId\)/, `${table} read is scoped by user_id`);
  }
});

test("the Settings Data section posts to the export route and shows the route's error text on failure", () => {
  const section = readFileSync("src/components/settings/DataSettingsSection.tsx", "utf8");
  assert.match(section, /fetch\("\/api\/account\/export",/);
  assert.match(section, /if \(!response\.ok\) \{[\s\S]*?response\.json\(\)\.catch\(\(\) => \(\{ error: "Export failed\." \}\)\)/);
});
