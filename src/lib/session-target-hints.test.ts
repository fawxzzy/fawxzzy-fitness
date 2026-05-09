import test from "node:test";
import assert from "node:assert/strict";
import { deriveSessionTargetHint } from "@/lib/session-target-hints";
import type { ExerciseStatsRow } from "@/lib/exercise-stats";
import { buildProgressionHistorySessions } from "@/lib/progression-playbooks";

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

test("manual target wins when no playbook exists", () => {
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

  assert.equal(hint.source, "manual_target");
  assert.equal(hint.shortLabel, "135 lbs x 8");
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

  assert.equal(hint.source, "fallback_last_successful_set");
  assert.equal(hint.shortLabel, "Repeat 185 lbs x 5");
  assert.equal(hint.lastSummary, "185 lbs x 5");
  assert.equal(hint.lastSuggestedValues?.weight, 185);
  assert.equal(hint.lastSuggestedValues?.reps, 5);
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

  assert.equal(hint.source, "manual_target");
  assert.equal(hint.shortLabel, "190 lbs x 6");
  assert.equal(hint.recentBestSummary, "195 lbs x 5");
  assert.equal(hint.recentBestSuggestedValues?.weight, 195);
  assert.equal(hint.recentBestSuggestedValues?.reps, 5);
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

  assert.equal(hint.source, "manual_target");
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

test("progression playbook can advance a weighted target from stored history", () => {
  const history = buildProgressionHistorySessions({
    rows: [
      { sessionId: "session-1", performedAt: "2026-05-04T10:00:00.000Z", setIndex: 1, weight: 100, reps: 10, weightUnit: "lbs", isWarmup: false },
      { sessionId: "session-1", performedAt: "2026-05-04T10:00:00.000Z", setIndex: 2, weight: 100, reps: 10, weightUnit: "lbs", isWarmup: false },
      { sessionId: "session-1", performedAt: "2026-05-04T10:00:00.000Z", setIndex: 3, weight: 100, reps: 10, weightUnit: "lbs", isWarmup: false },
    ],
    targetSetCount: 3,
    topRepTarget: 10,
  });

  const hint = deriveSessionTargetHint({
    measurementType: "reps",
    fallbackWeightUnit: "lbs",
    stats: buildStats({
      last_weight: 100,
      last_reps: 10,
      last_performed_at: "2026-05-04T10:00:00.000Z",
    }),
    plan: {
      measurementType: "reps",
      setsMin: 3,
      setsMax: 3,
      repsMin: 8,
      repsMax: 10,
      weightMin: 100,
      weightMax: 100,
      weightUnit: "lbs",
    },
    playbook: {
      playbookId: "double_progression",
      config: { version: 1, loadIncrement: 5 },
      history,
    },
  });

  assert.equal(hint.source, "playbook_derived_target");
  assert.equal(hint.shortLabel, "105 lbs x 8");
  assert.equal(hint.suggestedValues.weight, 105);
  assert.equal(hint.suggestedValues.reps, 8);
});

test("double progression builds reps at the same load before top range is reached", () => {
  const history = buildProgressionHistorySessions({
    rows: [
      { sessionId: "session-1", performedAt: "2026-05-04T10:00:00.000Z", setIndex: 1, weight: 100, reps: 8, weightUnit: "lbs", isWarmup: false },
      { sessionId: "session-1", performedAt: "2026-05-04T10:00:00.000Z", setIndex: 2, weight: 100, reps: 8, weightUnit: "lbs", isWarmup: false },
      { sessionId: "session-1", performedAt: "2026-05-04T10:00:00.000Z", setIndex: 3, weight: 100, reps: 8, weightUnit: "lbs", isWarmup: false },
    ],
    targetSetCount: 3,
    topRepTarget: 8,
  });

  const hint = deriveSessionTargetHint({
    measurementType: "reps",
    fallbackWeightUnit: "lbs",
    stats: buildStats({
      last_weight: 100,
      last_reps: 8,
      last_performed_at: "2026-05-04T10:00:00.000Z",
    }),
    plan: {
      measurementType: "reps",
      setsMin: 3,
      setsMax: 3,
      repsTarget: 8,
      repsMin: 8,
      repsMax: 10,
      weightMin: 100,
      weightMax: 100,
      weightUnit: "lbs",
    },
    playbook: {
      playbookId: "double_progression",
      config: { version: 1, loadIncrement: 5 },
      history,
    },
  });

  assert.equal(hint.source, "playbook_derived_target");
  assert.equal(hint.shortLabel, "100 lbs x 9");
  assert.equal(hint.suggestedValues.weight, 100);
  assert.equal(hint.suggestedValues.reps, 9);
  assert.match(hint.reason, /build reps/i);
});

test("fixed-load complete range returns review copy without increasing load", () => {
  const history = buildProgressionHistorySessions({
    rows: [
      { sessionId: "session-1", performedAt: "2026-05-04T10:00:00.000Z", setIndex: 1, weight: 100, reps: 10, weightUnit: "lbs", isWarmup: false },
      { sessionId: "session-1", performedAt: "2026-05-04T10:00:00.000Z", setIndex: 2, weight: 100, reps: 10, weightUnit: "lbs", isWarmup: false },
      { sessionId: "session-1", performedAt: "2026-05-04T10:00:00.000Z", setIndex: 3, weight: 100, reps: 10, weightUnit: "lbs", isWarmup: false },
    ],
    targetSetCount: 3,
    topRepTarget: 10,
  });

  const hint = deriveSessionTargetHint({
    measurementType: "reps",
    fallbackWeightUnit: "lbs",
    stats: buildStats({
      last_weight: 100,
      last_reps: 10,
      last_performed_at: "2026-05-04T10:00:00.000Z",
    }),
    plan: {
      measurementType: "reps",
      setsMin: 3,
      setsMax: 3,
      repsMin: 8,
      repsMax: 10,
      weightMin: 100,
      weightMax: 100,
      weightUnit: "lbs",
    },
    playbook: {
      playbookId: "fixed_load_rep_range_progression",
      config: { version: 1, loadIncrement: 5 },
      history,
    },
  });

  assert.equal(hint.source, "playbook_derived_target");
  assert.equal(hint.shortLabel, "100 lbs x 10");
  assert.equal(hint.suggestedValues.weight, 100);
  assert.equal(hint.suggestedValues.reps, 10);
  assert.match(hint.reason, /review before increasing/i);
});

test("playbook with no usable history uses routine target as seed", () => {
  const hint = deriveSessionTargetHint({
    measurementType: "reps",
    fallbackWeightUnit: "lbs",
    stats: null,
    plan: {
      measurementType: "reps",
      setsMin: 3,
      setsMax: 3,
      repsMin: 8,
      repsMax: 10,
      weightMin: 100,
      weightMax: 100,
      weightUnit: "lbs",
    },
    playbook: {
      playbookId: "double_progression",
      config: { version: 1, loadIncrement: 5 },
      history: [],
    },
  });

  assert.equal(hint.source, "playbook_seed_target");
  assert.equal(hint.shortLabel, "100 lbs x 10");
  assert.equal(hint.suggestedValues.weight, 100);
  assert.equal(hint.suggestedValues.reps, 10);
  assert.match(hint.reason, /playbook seed/i);
});

test("invalid playbook config falls back to routine target without crashing", () => {
  const hint = deriveSessionTargetHint({
    measurementType: "reps",
    fallbackWeightUnit: "lbs",
    stats: null,
    plan: {
      measurementType: "reps",
      setsMin: 3,
      setsMax: 3,
      repsMin: 8,
      repsMax: 10,
      weightMin: 100,
      weightMax: 100,
      weightUnit: "lbs",
    },
    playbook: {
      playbookId: "deload_after_stall",
      config: { version: 1, loadIncrement: 5, stallThreshold: 0, deloadPercent: 10 },
      history: [],
    },
  });

  assert.equal(hint.source, "invalid_playbook_fallback");
  assert.equal(hint.shortLabel, "100 lbs x 10");
  assert.match(hint.reason, /invalid/i);
});

test("unsupported cardio playbook falls back to routine target", () => {
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
    playbook: {
      playbookId: "double_progression",
      config: { version: 1, loadIncrement: 5 },
      history: [],
    },
  });

  assert.equal(hint.source, "unsupported_playbook_fallback");
  assert.equal(hint.shortLabel, "15:00 s | 2 mi");
  assert.match(hint.reason, /does not support/i);
});

test("unsupported bodyweight playbook falls back to reps-only routine target", () => {
  const hint = deriveSessionTargetHint({
    measurementType: "reps",
    fallbackWeightUnit: "lbs",
    stats: buildStats({
      last_weight: 0,
      last_reps: 12,
      last_unit: null,
      last_performed_at: "2026-05-04T10:00:00.000Z",
    }),
    plan: {
      measurementType: "reps",
      setsMin: 3,
      setsMax: 3,
      repsMin: 10,
      repsMax: 15,
      weightMin: null,
      weightMax: null,
      weightUnit: "lbs",
    },
    playbook: {
      playbookId: "double_progression",
      config: { version: 1, loadIncrement: 5 },
      history: [],
    },
  });

  assert.equal(hint.source, "unsupported_playbook_fallback");
  assert.equal(hint.shortLabel, "15 reps");
  assert.equal(hint.suggestedValues.reps, 15);
  assert.equal(hint.suggestedValues.weight, null);
});
