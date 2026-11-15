import assert from "node:assert/strict";
import test from "node:test";

import { buildSessionSummary } from "../app/history/session-summary.ts";
import { buildWeeklyProgressSummary } from "./history-weekly-progress.ts";
import { computeSessionCompletion, deriveSessionAnalytics, resolvePlannedSetCount } from "./session-analytics.ts";

test("computeSessionCompletion is logged sets over planned sets", () => {
  assert.equal(computeSessionCompletion([
    { plannedSets: 2, loggedSets: 1 },
    { plannedSets: 2, loggedSets: 0 },
  ]), 0.25);
});

test("a skipped exercise is excluded from numerator and denominator", () => {
  assert.equal(computeSessionCompletion([
    { plannedSets: 2, loggedSets: 1 },
    { plannedSets: 2, loggedSets: 0, isSkipped: true },
  ]), 0.5);
  assert.equal(computeSessionCompletion([{ plannedSets: 2, loggedSets: 0, isSkipped: true }]), undefined);
});

test("logged sets beyond the plan are capped so the rate never exceeds 1", () => {
  assert.equal(computeSessionCompletion([{ plannedSets: 3, loggedSets: 5 }, { plannedSets: 1, loggedSets: 1 }]), 1);
});

test("exercises without a planned count are planned at max(logged, 1)", () => {
  assert.equal(computeSessionCompletion([{ plannedSets: null, loggedSets: 3 }, { plannedSets: undefined, loggedSets: 0 }]), 0.75);
  assert.equal(computeSessionCompletion([{ plannedSets: null, loggedSets: 2 }]), 1);
});

test("nothing planned returns undefined", () => {
  assert.equal(computeSessionCompletion([]), undefined);
});

test("resolvePlannedSetCount prefers max, then min, else null", () => {
  assert.equal(resolvePlannedSetCount({ targetSetsMin: 2, targetSetsMax: 4 }), 4);
  assert.equal(resolvePlannedSetCount({ targetSetsMin: 3, targetSetsMax: null }), 3);
  assert.equal(resolvePlannedSetCount({ targetSetsMin: 0, targetSetsMax: 0 }), null);
  assert.equal(resolvePlannedSetCount({}), null);
});

test("deriveSessionAnalytics uses planned sets (list and detail share the helper)", () => {
  const set = { weight: 100, reps: 5, weightUnit: "lbs" as const };
  const analytics = deriveSessionAnalytics([
    { exerciseId: "squat", plannedSets: 2, sets: [set] },
    { exerciseId: "pushup", plannedSets: 2, sets: [] },
  ]);
  assert.equal(analytics.completionRate, 0.25);
});

function buildSummary(durationSeconds: number | null) {
  const sessionRow = {
    id: "s1",
    user_id: "u1",
    performed_at: "2026-11-06T10:00:00.000Z",
    notes: null,
    routine_id: "routine-1",
    routine_day_index: null,
    name: "QA Routine",
    duration_seconds: durationSeconds,
    status: "completed",
  } as unknown as Parameters<typeof buildSessionSummary>[0]["sessionRow"];
  return buildSessionSummary({
    sessionRow,
    sessionExercises: [
      { id: "se1", session_id: "s1", exercise_id: "goblet", target_sets_min: 2, target_sets_max: 2 },
      { id: "se2", session_id: "s1", exercise_id: "pushup", target_sets_min: 2, target_sets_max: 2 },
    ],
    setsBySessionExerciseId: new Map([["se1", [{ session_exercise_id: "se1", weight: 40, reps: 10, weight_unit: "lbs" as const }]]]),
    exerciseNameById: new Map([["goblet", "Goblet Squat"], ["pushup", "Close-Grip Push-Up"]]),
    prCounts: { total: 0, weight: 0, reps: 0 },
  });
}

test("146h / 100% regression: 1 of 2 and 0 of 2 sets is 25% and the 146h duration is hidden", () => {
  const summary = buildSummary(525_990);
  assert.equal(summary.completionRate, 0.25);
  assert.equal(summary.durationSec, undefined);
});

test("a plausible stored duration is kept", () => {
  assert.equal(buildSummary(3_300).durationSec, 3_300);
});

test("weekly progress averages the same planned-set completion", () => {
  const summary = buildSummary(3_300);
  const week = buildWeeklyProgressSummary({
    sessions: [{ ...summary, startedAt: "2026-05-05T13:00:00.000Z" }],
    sessionExercisesBySessionId: new Map(),
    setsBySessionExerciseId: new Map(),
    exerciseMetaById: new Map(),
    routineDayCountByRoutineId: new Map([["routine-1", 1]]),
    timezone: "America/New_York",
    now: "2026-05-08T14:00:00.000Z",
  });
  assert.equal(week.cycleCompletionRate, 0.25);
});
