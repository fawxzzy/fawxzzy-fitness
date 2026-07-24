import assert from "node:assert/strict";
import test from "node:test";
import { loadSessionExercisesWithSchemaFallback } from "@/lib/session-exercise-schema-fallback";

const selects = {
  rich: "rich",
  effort: "effort",
  timer: "timer",
  legacy: "legacy",
};

const missingEffort = { message: "column copilot_feedback_effort does not exist" };
const missingTimer = { message: "column exercise_timer_enabled does not exist" };
const isMissingEffortColumnError = (error: { message?: string } | null) => error?.message === missingEffort.message;
const isMissingTimerColumnError = (error: { message?: string } | null) => error?.message === missingTimer.message;

test("falls through effort and timer optional schemas to the legacy session exercise select", async () => {
  const calls: string[] = [];
  const result = await loadSessionExercisesWithSchemaFallback({
    selects,
    isMissingEffortColumnError,
    isMissingTimerColumnError,
    runSelect: async (select) => {
      calls.push(select);
      if (select === selects.rich) return { data: null, error: missingEffort };
      if (select === selects.timer) return { data: null, error: missingTimer };
      return { data: [{ id: "legacy-exercise" }], error: null };
    },
  });

  assert.deepEqual(calls, [selects.rich, selects.timer, selects.legacy]);
  assert.deepEqual(result.data, [{ id: "legacy-exercise" }]);
  assert.equal(result.error, null);
});

test("keeps the richer session exercise result without fallback", async () => {
  const calls: string[] = [];
  const result = await loadSessionExercisesWithSchemaFallback({
    selects,
    isMissingEffortColumnError,
    isMissingTimerColumnError,
    runSelect: async (select) => {
      calls.push(select);
      return { data: [{ id: "rich-exercise" }], error: null };
    },
  });

  assert.deepEqual(calls, [selects.rich]);
  assert.deepEqual(result.data, [{ id: "rich-exercise" }]);
});

test("preserves unrelated query errors without widening the fallback", async () => {
  const unrelatedError = { message: "permission denied" };
  const calls: string[] = [];
  const result = await loadSessionExercisesWithSchemaFallback({
    selects,
    isMissingEffortColumnError,
    isMissingTimerColumnError,
    runSelect: async (select) => {
      calls.push(select);
      return { data: null, error: unrelatedError };
    },
  });

  assert.deepEqual(calls, [selects.rich]);
  assert.equal(result.error, unrelatedError);
});
