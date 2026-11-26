import test from "node:test";
import assert from "node:assert/strict";

import { formatTodayLastPerformance, loadTodayLastPerformanceLines } from "./todayLastPerformance";

test("weight and reps read as reps × weight with a short unit", () => {
  assert.equal(formatTodayLastPerformance({ last_weight: 225, last_reps: 5, last_unit: "lbs" }), "Last: 5 × 225 lb");
  assert.equal(formatTodayLastPerformance({ last_weight: 62.5, last_reps: 8, last_unit: "kg" }), "Last: 8 × 62.5 kg");
  assert.equal(formatTodayLastPerformance({ last_weight: 22.25, last_reps: 10, last_unit: "lb" }), "Last: 10 × 22.3 lb");
});

test("bodyweight or unknown unit falls back to reps only", () => {
  assert.equal(formatTodayLastPerformance({ last_weight: null, last_reps: 12, last_unit: null }), "Last: 12 reps");
  assert.equal(formatTodayLastPerformance({ last_weight: 0, last_reps: 1, last_unit: "lbs" }), "Last: 1 rep");
  assert.equal(formatTodayLastPerformance({ last_weight: 40, last_reps: 8, last_unit: "reps" }), "Last: 8 reps");
});

test("nothing logged shows no line", () => {
  assert.equal(formatTodayLastPerformance(null), null);
  assert.equal(formatTodayLastPerformance({ last_weight: 100, last_reps: null, last_unit: "lbs" }), null);
  assert.equal(formatTodayLastPerformance({ last_weight: null, last_reps: 0, last_unit: null }), null);
});

function fakeClient(result: { data: unknown; error: unknown } | Error) {
  const calls: string[] = [];
  const builder = {
    select(columns: string) { calls.push(`select:${columns}`); return builder; },
    eq(column: string, value: string) { calls.push(`eq:${column}=${value}`); return builder; },
    in(column: string, values: string[]) {
      calls.push(`in:${column}=${values.join(",")}`);
      return result instanceof Error ? Promise.reject(result) : Promise.resolve(result);
    },
  };
  return { calls, client: { from(table: string) { calls.push(`from:${table}`); return builder; } } };
}

test("loader reads exercise_stats once for the unique ids and keys lines by exercise id", async () => {
  const fake = fakeClient({ data: [{ exercise_id: "a", last_weight: 225, last_reps: 5, last_unit: "lbs" }, { exercise_id: "b", last_weight: null, last_reps: null, last_unit: null }], error: null });
  const lines = await loadTodayLastPerformanceLines({ supabase: fake.client as never, userId: "u1", exerciseIds: ["a", "b", "a", ""] });
  assert.deepEqual([...lines.entries()], [["a", "Last: 5 × 225 lb"]]);
  assert.deepEqual(fake.calls, ["from:exercise_stats", "select:exercise_id, last_weight, last_reps, last_unit", "eq:user_id=u1", "in:exercise_id=a,b"]);
});

test("loader never throws and skips the query with no ids", async () => {
  assert.equal((await loadTodayLastPerformanceLines({ supabase: fakeClient(new Error("down")).client as never, userId: "u1", exerciseIds: ["a"] })).size, 0);
  assert.equal((await loadTodayLastPerformanceLines({ supabase: fakeClient({ data: null, error: { message: "x" } }).client as never, userId: "u1", exerciseIds: ["a"] })).size, 0);
  const idle = fakeClient({ data: [], error: null });
  assert.equal((await loadTodayLastPerformanceLines({ supabase: idle.client as never, userId: "u1", exerciseIds: [] })).size, 0);
  assert.deepEqual(idle.calls, []);
});
