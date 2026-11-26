import assert from "node:assert/strict";
import test from "node:test";
import { archiveRoutineMutation, restoreRoutineMutation, type RoutineArchiveClient } from "@/lib/dal/routine-archive";

type Call = { table: string; op: "select" | "update"; arg: unknown; filters: Array<[string, string, unknown]> };
type Result = { data: unknown; error: { message?: string; code?: string } | null };

const MISSING_COLUMN = { message: "column routines.archived_at does not exist", code: "42703" };

/** A tiny fake PostgREST client: every select/update returns the next queued result for "table.op". */
function fakeClient(results: Record<string, Result[]>) {
  const calls: Call[] = [];
  const client: RoutineArchiveClient = {
    from(table) {
      const start = (op: "select" | "update", arg: unknown) => {
        const call: Call = { table, op, arg, filters: [] };
        calls.push(call);
        const chain = {
          eq(column: string, value: string) { call.filters.push(["eq", column, value]); return chain; },
          is(column: string, value: null) { call.filters.push(["is", column, value]); return chain; },
          limit(count: number) { call.filters.push(["limit", "", count]); return chain; },
          then(resolve: (value: Result) => unknown, reject?: (reason: unknown) => unknown) {
            const queue = results[`${table}.${op}`] ?? [];
            const next = queue.shift() ?? { data: op === "select" ? [] : null, error: null };
            return Promise.resolve(next).then(resolve, reject);
          },
        };
        return chain as never;
      };
      return {
        select: (columns: string) => start("select", columns),
        update: (values: Record<string, unknown>) => start("update", values),
      };
    },
  };
  return { client, calls };
}

const NOW = "2026-11-26T15:00:00.000Z";

test("archive sets archived_at only on a listed routine and never deletes anything", async () => {
  const { client, calls } = fakeClient({
    "routines.select": [{ data: [{ id: "r1", archived_at: null }], error: null }],
    "sessions.select": [{ data: [], error: null }],
    "profiles.select": [{ data: [{ active_routine_id: "other" }], error: null }],
  });

  const result = await archiveRoutineMutation({ routineId: "r1", userId: "u1", supabase: client, nowIso: NOW });

  assert.deepEqual(result, { ok: true, alreadyArchived: false, clearedActiveRoutine: false });
  const updates = calls.filter((call) => call.op === "update");
  assert.equal(updates.length, 1, "only the routine is updated; the profile pointer is untouched");
  assert.equal(updates[0].table, "routines");
  assert.deepEqual(updates[0].arg, { archived_at: NOW });
  assert.deepEqual(updates[0].filters, [["eq", "id", "r1"], ["eq", "user_id", "u1"], ["is", "archived_at", null]]);
});

test("archiving the active routine clears the profile pointer first, guarded on it still pointing here", async () => {
  const { client, calls } = fakeClient({
    "routines.select": [{ data: [{ id: "r1", archived_at: null }], error: null }],
    "sessions.select": [{ data: [], error: null }],
    "profiles.select": [{ data: [{ active_routine_id: "r1" }], error: null }],
  });

  const result = await archiveRoutineMutation({ routineId: "r1", userId: "u1", supabase: client, nowIso: NOW });

  assert.deepEqual(result, { ok: true, alreadyArchived: false, clearedActiveRoutine: true });
  const updates = calls.filter((call) => call.op === "update");
  assert.deepEqual(updates.map((call) => call.table), ["profiles", "routines"]);
  assert.deepEqual(updates[0].arg, { active_routine_id: null });
  assert.deepEqual(updates[0].filters, [["eq", "id", "u1"], ["eq", "active_routine_id", "r1"]]);
});

test("archive is blocked while the routine has a workout in progress, and changes nothing", async () => {
  const { client, calls } = fakeClient({
    "routines.select": [{ data: [{ id: "r1", archived_at: null }], error: null }],
    "sessions.select": [{ data: [{ id: "s1" }], error: null }],
  });

  const result = await archiveRoutineMutation({ routineId: "r1", userId: "u1", supabase: client, nowIso: NOW });

  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.reason, "in-progress-session");
  assert.equal(calls.filter((call) => call.op === "update").length, 0);
  const sessionCall = calls.find((call) => call.table === "sessions");
  assert.deepEqual(sessionCall?.filters.slice(0, 3), [["eq", "user_id", "u1"], ["eq", "routine_id", "r1"], ["eq", "status", "in_progress"]]);
});

test("archiving an archived routine is a no-op success", async () => {
  const { client, calls } = fakeClient({
    "routines.select": [{ data: [{ id: "r1", archived_at: "2026-11-20T00:00:00Z" }], error: null }],
  });

  const result = await archiveRoutineMutation({ routineId: "r1", userId: "u1", supabase: client });

  assert.deepEqual(result, { ok: true, alreadyArchived: true, clearedActiveRoutine: false });
  assert.equal(calls.length, 1);
});

test("archive and restore report archive-unsupported when the column is missing (migration not applied)", async () => {
  const archive = await archiveRoutineMutation({
    routineId: "r1",
    userId: "u1",
    supabase: fakeClient({ "routines.select": [{ data: null, error: MISSING_COLUMN }] }).client,
  });
  assert.equal(archive.ok === false && archive.reason, "archive-unsupported");

  const restore = await restoreRoutineMutation({
    routineId: "r1",
    userId: "u1",
    accessState: "free",
    supabase: fakeClient({ "routines.select": [{ data: null, error: MISSING_COLUMN }] }).client,
  });
  assert.equal(restore.ok === false && restore.reason, "archive-unsupported");
});

test("archive of an unknown routine is not found; other lookup errors are failures, not unsupported", async () => {
  const missing = await archiveRoutineMutation({ routineId: "nope", userId: "u1", supabase: fakeClient({}).client });
  assert.equal(missing.ok === false && missing.reason, "routine-not-found");

  const failed = await archiveRoutineMutation({
    routineId: "r1",
    userId: "u1",
    supabase: fakeClient({ "routines.select": [{ data: null, error: { message: "timeout" } }] }).client,
  });
  assert.equal(failed.ok === false && failed.reason, "routine-lookup-failed");
});

const threeListedPlusArchived = [
  { id: "a", archived_at: null },
  { id: "b", archived_at: null },
  { id: "c", archived_at: null },
  { id: "old", archived_at: "2026-11-01T00:00:00Z" },
];

test("Free restore is refused at 3 listed routines and changes nothing", async () => {
  const { client, calls } = fakeClient({ "routines.select": [{ data: threeListedPlusArchived, error: null }] });

  const result = await restoreRoutineMutation({ routineId: "old", userId: "u1", accessState: "free", supabase: client });

  assert.equal(result.ok === false && result.reason, "routine-limit");
  assert.equal(calls.filter((call) => call.op === "update").length, 0);
});

test("Pro restore ignores the Free limit and clears archived_at, bumping updated_at, without making it active", async () => {
  const { client, calls } = fakeClient({ "routines.select": [{ data: threeListedPlusArchived, error: null }] });

  const result = await restoreRoutineMutation({ routineId: "old", userId: "u1", accessState: "pro", supabase: client, nowIso: NOW });

  assert.deepEqual(result, { ok: true, alreadyListed: false });
  const updates = calls.filter((call) => call.op === "update");
  assert.equal(updates.length, 1);
  assert.equal(updates[0].table, "routines");
  assert.deepEqual(updates[0].arg, { archived_at: null, updated_at: NOW });
  assert.equal(calls.some((call) => call.table === "profiles"), false);
});

test("Free restore under the limit succeeds; restoring a listed routine is a no-op", async () => {
  const twoListed = [{ id: "a", archived_at: null }, { id: "b", archived_at: null }, { id: "old", archived_at: "2026-11-01T00:00:00Z" }];
  const restored = await restoreRoutineMutation({
    routineId: "old",
    userId: "u1",
    accessState: "free",
    supabase: fakeClient({ "routines.select": [{ data: twoListed, error: null }] }).client,
  });
  assert.deepEqual(restored, { ok: true, alreadyListed: false });

  const noop = await restoreRoutineMutation({
    routineId: "a",
    userId: "u1",
    accessState: "free",
    supabase: fakeClient({ "routines.select": [{ data: threeListedPlusArchived, error: null }] }).client,
  });
  assert.deepEqual(noop, { ok: true, alreadyListed: true });
});
