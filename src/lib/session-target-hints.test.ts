import test from "node:test";
import assert from "node:assert/strict";
import { deriveSessionTargetHint } from "@/lib/session-target-hints";
import type { ExerciseStatsRow } from "@/lib/exercise-stats";

function buildStats(overrides: Partial<ExerciseStatsRow>): ExerciseStatsRow {
  return {
    exercise_id: "exercise-1",
    last_weight: null,
    last_reps: null,
    last_unit: "lbs",
    last_performed_at: null,
    pr_weight: null,
    pr_reps: null,
    pr_est_1rm: null,
    pr_achieved_at: null,
    actual_pr_weight: null,
    actual_pr_reps: null,
    actual_pr_at: null,
    ...overrides,
  };
}

test("planned target wins when no history exists", () => {
  const hint = deriveSessionTargetHint({
    measurementType: "reps",
    fallbackWeightUnit: "lbs",
    stats: null,
    plan: {
      measurementType: "reps",
      repsMin: 8,
      weightMin: 135,
      weightUnit: "lbs",
    },
  });

  assert.equal(hint.source, "planned_target");
  assert.equal(hint.shortLabel, "135 lb x 8");
  assert.match(hint.reason, /planned target/i);
});

test("last completed performance is used when no plan exists", () => {
  const hint = deriveSessionTargetHint({
    measurementType: "reps",
    fallbackWeightUnit: "lbs",
    stats: buildStats({
      last_weight: 185,
      last_reps: 5,
      last_performed_at: "2026-05-01T10:00:00.000Z",
    }),
    plan: null,
  });

  assert.equal(hint.source, "last_performance");
  assert.equal(hint.shortLabel, "Repeat 185 lb x 5");
  assert.equal(hint.lastSummary, "185 lb x 5");
});

test("planned target remains primary when recent best exists", () => {
  const hint = deriveSessionTargetHint({
    measurementType: "reps",
    fallbackWeightUnit: "lbs",
    stats: buildStats({
      last_weight: 185,
      last_reps: 5,
      last_performed_at: "2026-05-01T10:00:00.000Z",
      actual_pr_weight: 195,
      actual_pr_reps: 5,
      actual_pr_at: "2026-04-20T10:00:00.000Z",
    }),
    plan: {
      measurementType: "reps",
      repsMin: 6,
      weightMin: 190,
      weightUnit: "lbs",
    },
  });

  assert.equal(hint.source, "planned_target");
  assert.equal(hint.shortLabel, "190 lb x 6");
  assert.equal(hint.recentBestSummary, "195 lb x 5");
});

test("bodyweight history preserves reps-only summaries", () => {
  const hint = deriveSessionTargetHint({
    measurementType: "reps",
    fallbackWeightUnit: "lbs",
    stats: buildStats({
      last_weight: 0,
      last_reps: 12,
      last_unit: null,
      last_performed_at: "2026-05-01T10:00:00.000Z",
    }),
    plan: null,
  });

  assert.equal(hint.shortLabel, "Repeat 12 reps");
  assert.equal(hint.lastSummary, "12 reps");
});

test("cardio planned target keeps duration and distance context", () => {
  const hint = deriveSessionTargetHint({
    measurementType: "time_distance",
    fallbackWeightUnit: "lbs",
    stats: null,
    plan: {
      measurementType: "time_distance",
      durationSeconds: 900,
      distance: 2,
      distanceUnit: "mi",
    },
  });

  assert.equal(hint.source, "planned_target");
  assert.equal(hint.shortLabel, "15:00 s | 2 mi");
  assert.equal(hint.suggestedValues.durationSeconds, 900);
  assert.equal(hint.suggestedValues.distance, 2);
  assert.equal(hint.suggestedValues.distanceUnit, "mi");
});

test("no history and no plan returns explicit fallback", () => {
  const hint = deriveSessionTargetHint({
    measurementType: "none",
    fallbackWeightUnit: "kg",
    stats: null,
    plan: null,
  });

  assert.equal(hint.source, "no_history");
  assert.equal(hint.shortLabel, "No history yet");
  assert.equal(hint.suggestedValues.weightUnit, "kg");
});
