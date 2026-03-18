import test from "node:test";
import assert from "node:assert/strict";
import { aggregateCardioSessions, aggregateExerciseStatsFromSets, type HistoricalSetRow } from "./exercise-history-aggregation";

const completed = (performedAt: string) => ({ performed_at: performedAt, status: "completed" as const });

function row(args: {
  exerciseId: string;
  sessionId: string;
  performedAt: string;
  setIndex: number;
  weight?: number | null;
  reps?: number | null;
  weightUnit?: "lb" | "lbs" | "kg" | null;
  durationSeconds?: number | null;
  distance?: number | null;
  distanceUnit?: "mi" | "km" | "m" | null;
  calories?: number | null;
}): HistoricalSetRow {
  return {
    set_index: args.setIndex,
    weight: args.weight ?? null,
    reps: args.reps ?? null,
    weight_unit: args.weightUnit ?? null,
    duration_seconds: args.durationSeconds ?? null,
    distance: args.distance ?? null,
    distance_unit: args.distanceUnit ?? null,
    calories: args.calories ?? null,
    session_exercise: {
      session_id: args.sessionId,
      exercise_id: args.exerciseId,
      session: completed(args.performedAt),
    },
  };
}

test("aggregateExerciseStatsFromSets batches per canonical exercise id without cross-talk", () => {
  const stats = aggregateExerciseStatsFromSets([
    row({ exerciseId: "exercise-a", sessionId: "session-1", performedAt: "2026-03-10T10:00:00Z", setIndex: 1, weight: 100, reps: 5, weightUnit: "lb" }),
    row({ exerciseId: "exercise-a", sessionId: "session-2", performedAt: "2026-03-12T10:00:00Z", setIndex: 2, weight: 90, reps: 8, weightUnit: "lb" }),
    row({ exerciseId: "exercise-b", sessionId: "session-3", performedAt: "2026-03-11T10:00:00Z", setIndex: 1, weight: 50, reps: 10, weightUnit: "kg" }),
  ]);

  assert.equal(stats.size, 2);
  assert.deepEqual(stats.get("exercise-a"), {
    exercise_id: "exercise-a",
    last_weight: 90,
    last_reps: 8,
    last_unit: "lb",
    last_performed_at: "2026-03-12T10:00:00Z",
    pr_weight: 100,
    pr_reps: 5,
    pr_est_1rm: 116.66666666666667,
    pr_achieved_at: "2026-03-10T10:00:00Z",
    actual_pr_weight: 100,
    actual_pr_reps: 5,
    actual_pr_at: "2026-03-10T10:00:00Z",
  });
  assert.equal(stats.get("exercise-b")?.last_unit, "kg");
  assert.equal(stats.get("exercise-b")?.last_performed_at, "2026-03-11T10:00:00Z");
});

test("aggregateCardioSessions separates raw aggregation from presentation-ready selection", () => {
  const sessions = aggregateCardioSessions({
    rows: [
      row({ exerciseId: "cardio-a", sessionId: "session-1", performedAt: "2026-03-10T10:00:00Z", setIndex: 1, durationSeconds: 600, distance: 1, distanceUnit: "mi", calories: 100 }),
      row({ exerciseId: "cardio-a", sessionId: "session-1", performedAt: "2026-03-10T10:00:00Z", setIndex: 2, durationSeconds: 300, distance: 0.5, distanceUnit: "mi", calories: 50 }),
      row({ exerciseId: "cardio-a", sessionId: "session-2", performedAt: "2026-03-12T10:00:00Z", setIndex: 1, durationSeconds: 900, distance: 2, distanceUnit: "mi", calories: 150 }),
    ],
    measurementType: "time_distance",
    defaultUnit: "mi",
  });

  assert.deepEqual(sessions, [
    {
      performedAt: "2026-03-12T10:00:00Z",
      setIndex: 1,
      durationSeconds: 900,
      distance: 2,
      distanceUnit: "mi",
      calories: 150,
    },
    {
      performedAt: "2026-03-10T10:00:00Z",
      setIndex: 2,
      durationSeconds: 900,
      distance: 1.5,
      distanceUnit: "mi",
      calories: 150,
    },
  ]);
});
