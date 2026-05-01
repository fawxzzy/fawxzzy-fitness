import assert from "node:assert/strict";
import test from "node:test";

import type { ExerciseBrowserRow } from "./exercises-browser.ts";
import {
  buildExerciseIdentityChips,
  buildHistoryExerciseCardViewModel,
  buildPlannedExerciseDetailMetrics,
  resolveWorkoutCardPresentationKind,
  buildStrengthVolumeMetric,
  mergeWorkoutCardChips,
} from "./workout-card-view-models.ts";

function makeExerciseBrowserRow(overrides: Partial<ExerciseBrowserRow> = {}): ExerciseBrowserRow {
  return {
    exerciseId: "exercise-1",
    name: "Exercise",
    slug: "exercise",
    image_path: null,
    image_icon_path: null,
    image_howto_path: null,
    how_to_short: null,
    primary_muscle: null,
    equipment: null,
    movement_pattern: null,
    last_performed_at: null,
    last_weight: null,
    last_reps: null,
    last_unit: null,
    pr_weight: null,
    pr_reps: null,
    pr_est_1rm: null,
    actual_pr_weight: null,
    actual_pr_reps: null,
    actual_pr_at: null,
    kind: "strength",
    lastSummary: null,
    bestSummary: null,
    prLabel: "",
    prCount: 0,
    sessionCount: 0,
    deltaFromBest: null,
    tagsSummary: null,
    ...overrides,
  };
}

test("buildExerciseIdentityChips preserves taxonomy order and compact clamping", () => {
  const detailed = buildExerciseIdentityChips({
    measurementType: "reps",
    equipment: "barbell",
    movementPattern: "squat",
    primaryMuscle: "quads",
  });
  const compact = buildExerciseIdentityChips({
    measurementType: "reps",
    equipment: "barbell",
    movementPattern: "squat",
    primaryMuscle: "quads",
  }, { maxChips: 2 });

  assert.deepEqual(detailed.map((chip) => chip.label), ["Strength", "Barbell", "Squat"]);
  assert.deepEqual(compact.map((chip) => chip.label), ["Strength", "Barbell"]);
});

test("buildExerciseIdentityChips falls back to primary muscle when metadata is sparse", () => {
  const chips = buildExerciseIdentityChips({
    measurementType: "reps",
    equipment: "barbell",
    movementPattern: null,
    primaryMuscle: "quads",
  });

  assert.deepEqual(chips.map((chip) => chip.label), ["Strength", "Barbell", "Quads"]);
});

test("buildExerciseIdentityChips stays empty when no identity signal exists", () => {
  const chips = buildExerciseIdentityChips({});

  assert.deepEqual(chips, []);
});

test("buildExerciseIdentityChips gives Stretch a dedicated hub identity", () => {
  const chips = buildExerciseIdentityChips({
    name: "Stretch",
    slug: "stretch",
    primaryMuscle: "recovery",
    equipment: "bodyweight",
    movementPattern: "mobility",
  });

  assert.deepEqual(chips.map((chip) => chip.label), ["Mobility", "Recovery", "Bodyweight"]);
});

test("resolveWorkoutCardPresentationKind keeps cardio, bodyweight, and timed buckets distinct", () => {
  assert.equal(resolveWorkoutCardPresentationKind({
    measurementType: "reps",
    equipment: "Barbell",
    movementPattern: "Squat",
  }), "strength");

  assert.equal(resolveWorkoutCardPresentationKind({
    measurementType: "time_distance",
    primaryMuscle: "Cardio",
    equipment: "Treadmill",
  }), "cardio");

  assert.equal(resolveWorkoutCardPresentationKind({
    measurementType: "reps",
    equipment: "Bodyweight",
    movementPattern: "Vertical Pull",
  }), "bodyweight");

  assert.equal(resolveWorkoutCardPresentationKind({
    measurementType: "time",
    equipment: "Bodyweight",
    movementPattern: "Brace",
  }), "timed");
});

test("mergeWorkoutCardChips dedupes labels and respects the shared max-chip cap", () => {
  const merged = mergeWorkoutCardChips(
    [{ label: "Strength" }, { label: "Barbell" }],
    [{ label: "Barbell" }, { label: "Squat" }],
    [{ label: "Logged" }],
  );

  assert.deepEqual(merged.map((chip) => chip.label), ["Strength", "Barbell", "Squat"]);
});

test("buildPlannedExerciseDetailMetrics keeps the shared ready-state metric row shape", () => {
  const metrics = buildPlannedExerciseDetailMetrics({
    measurementType: "reps",
    equipment: "barbell",
    movementPattern: "squat",
    targetSetsMin: 4,
    targetSetsMax: 4,
  });

  assert.deepEqual(metrics.map((metric) => metric.label), ["Status", "Next", "Tracking"]);
  assert.equal(metrics[0]?.value, "Ready");
  assert.equal(metrics[1]?.value, "4 sets planned");
  assert.equal(metrics[2]?.value, "Reps + Load");
});

test("buildPlannedExerciseDetailMetrics swaps to logged progress without changing row order", () => {
  const metrics = buildPlannedExerciseDetailMetrics({
    measurementType: "time_distance",
    equipment: "treadmill",
    movementPattern: "gait",
    loggedSetCount: 1,
    targetSetsMin: 1,
    targetSetsMax: 1,
  });

  assert.deepEqual(metrics.map((metric) => metric.label), ["Logged", "Next", "Tracking"]);
  assert.equal(metrics[0]?.value, "1 of 1");
  assert.equal(metrics[1]?.value, "1 effort planned");
  assert.equal(metrics[2]?.value, "Time + Distance");
});

test("buildPlannedExerciseDetailMetrics keeps skipped cards to next and tracking only", () => {
  const metrics = buildPlannedExerciseDetailMetrics({
    measurementType: "time",
    equipment: "bodyweight",
    movementPattern: "brace",
    isSkipped: true,
    targetSetsMin: 3,
    targetSetsMax: 3,
  });

  assert.deepEqual(metrics.map((metric) => metric.label), ["Next", "Tracking"]);
  assert.equal(metrics[0]?.value, "3 efforts planned");
  assert.equal(metrics[1]?.value, "Time");
});

test("buildPlannedExerciseDetailMetrics gives Stretch a reference-only metric set", () => {
  const metrics = buildPlannedExerciseDetailMetrics({
    name: "Stretch",
    slug: "stretch",
    primaryMuscle: "recovery",
    equipment: "bodyweight",
    movementPattern: "mobility",
  });

  assert.deepEqual(metrics, []);
});

test("buildHistoryExerciseCardViewModel keeps bodyweight history cards on the shared identity and metric contract", () => {
  const viewModel = buildHistoryExerciseCardViewModel(makeExerciseBrowserRow({
    name: "Pull-Up",
    equipment: "Pull-Up Bar",
    movement_pattern: "Vertical Pull",
    primary_muscle: "Back",
    last_performed_at: "2026-04-08T13:00:00.000Z",
    last_weight: 0,
    last_reps: 9,
    actual_pr_weight: 0,
    actual_pr_reps: 12,
    kind: "strength",
    lastSummary: "9 reps",
    bestSummary: "Best: 12 reps",
    prLabel: "Rep PR",
    prCount: 1,
    sessionCount: 9,
    deltaFromBest: "-3 reps vs best",
  }));

  assert.equal(viewModel.presentationKind, "bodyweight");
  assert.equal(viewModel.semanticTone, "logged");
  assert.deepEqual(viewModel.chips.map((chip) => chip.label), ["Bodyweight", "Pull Up Bar", "Vertical Pull"]);
  assert.deepEqual(viewModel.detailedMetrics.map((metric) => metric.label), ["Best Reps", "Vs Best", "PRs", "Last"]);
});

test("buildHistoryExerciseCardViewModel keeps cardio history cards on the shared identity and metric contract", () => {
  const viewModel = buildHistoryExerciseCardViewModel(makeExerciseBrowserRow({
    name: "Incline Walk",
    equipment: "Treadmill",
    movement_pattern: "Gait",
    primary_muscle: "Cardio",
    last_performed_at: "2026-04-09T13:00:00.000Z",
    kind: "cardio",
    lastSummary: "22m | 1.7 mi | 12:56/mi",
    bestSummary: "Best: 2.1 mi",
    sessionCount: 12,
    deltaFromBest: "-0.4mi vs best",
  }));

  assert.equal(viewModel.presentationKind, "cardio");
  assert.equal(viewModel.semanticTone, "logged");
  assert.deepEqual(viewModel.chips.map((chip) => chip.label), ["Cardio", "Treadmill", "Gait"]);
  assert.deepEqual(viewModel.detailedMetrics.map((metric) => metric.label), ["Best", "Vs Best", "Sessions", "Last"]);
});

test("buildHistoryExerciseCardViewModel gives Stretch a library-first history card", () => {
  const viewModel = buildHistoryExerciseCardViewModel(makeExerciseBrowserRow({
    name: "Stretch",
    slug: "stretch",
    primary_muscle: "recovery",
    equipment: "bodyweight",
    movement_pattern: "mobility",
    kind: "strength",
  }));

  assert.equal(viewModel.summaryLabel, "");
  assert.deepEqual(viewModel.chips.map((chip) => chip.label), ["Mobility", "Recovery", "Bodyweight"]);
  assert.deepEqual(viewModel.detailedMetrics, []);
});

test("buildStrengthVolumeMetric preserves fitness-native unit wording", () => {
  const now = new Date().toISOString();
  const fortyDaysAgo = new Date(Date.now() - (40 * 24 * 60 * 60 * 1000)).toISOString();

  const metric = buildStrengthVolumeMetric([
    { weight: 225, reps: 5, performedAt: now },
    { weight: 185, reps: 8, performedAt: now },
    { weight: 315, reps: 2, performedAt: fortyDaysAgo },
  ], 28, "lb");

  assert.equal(metric, "2,605 lbs");
});
