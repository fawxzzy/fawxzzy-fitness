import test from "node:test";
import assert from "node:assert/strict";

import {
  formatDayTaxonomyHeaderSummaryFromCounts,
  getExerciseCountSummaryFromCanonicalExercises,
  getRestDayExerciseCountSummaryFromCanonicalDayOrFallback,
  toExerciseCountSummaryInput,
} from "./day-summary.ts";
import type { CanonicalDayExercise } from "./routine-day-loader";

test("toExerciseCountSummaryInput preserves full cardio classification metadata", () => {
  const summaryInput = toExerciseCountSummaryInput({
    measurement_type: "reps",
    kind: "cardio",
    type: "conditioning",
    tags: ["interval"],
    categories: ["cardio"],
  });

  assert.equal(summaryInput.kind, "cardio");
  assert.equal(summaryInput.type, "conditioning");
  assert.deepEqual(summaryInput.tags, ["interval"]);
  assert.deepEqual(summaryInput.categories, ["cardio"]);
  assert.equal(summaryInput.isCardio, true);
});



test("toExerciseCountSummaryInput treats primary_muscle cardio as cardio when richer metadata is absent", () => {
  const summaryInput = toExerciseCountSummaryInput({
    measurement_type: "reps",
    primary_muscle: "cardio",
  });

  assert.equal(summaryInput.primary_muscle, "cardio");
  assert.equal(summaryInput.isCardio, true);
});

test("canonical day summaries use cardio metadata from canonical details when measurement type alone would look like strength", () => {
  const exercise = {
    id: "day-ex-1",
    user_id: "user-1",
    routine_day_id: "day-1",
    exercise_id: "exercise-1",
    position: 1,
    target_sets: null,
    target_reps: null,
    target_reps_min: null,
    target_reps_max: null,
    target_weight: null,
    target_weight_unit: null,
    target_duration_seconds: null,
    target_distance: null,
    target_distance_unit: null,
    target_calories: null,
    measurement_type: "reps",
    default_unit: null,
    notes: null,
    displayName: "Bike Intervals",
    goalLine: null,
    details: {
      id: "exercise-1",
      primary_muscle: "cardio",
      equipment: "bike",
      movement_pattern: null,
      image_path: null,
      image_howto_path: null,
      image_icon_path: null,
      slug: "bike-intervals",
      how_to_short: null,
      measurement_type: "reps",
      default_unit: null,
      kind: null,
      type: null,
      tags: null,
      categories: null,
    },
  } satisfies CanonicalDayExercise;

  const summary = getExerciseCountSummaryFromCanonicalExercises([exercise]);
  assert.equal(summary.label, "1 cardio");
});

test("today/view-day summary inputs keep strength classification when canonical details are missing", () => {
  const routineRows = [
    toExerciseCountSummaryInput({
      measurement_type: "reps",
      equipment: null,
      movement_pattern: null,
      primary_muscle: null,
      kind: null,
      type: null,
      tags: null,
      categories: null,
    }),
    toExerciseCountSummaryInput({
      measurement_type: "reps",
      primary_muscle: "cardio",
      equipment: "bike",
      movement_pattern: null,
      kind: null,
      type: null,
      tags: null,
      categories: null,
    }),
  ];

  assert.deepEqual(
    routineRows.map((exercise) => exercise.isCardio),
    [false, true],
  );
});

test("today offline payload shape preserves primary muscle cardio classification", () => {
  const summaryInput = toExerciseCountSummaryInput({
    measurement_type: "reps",
    primary_muscle: "cardio",
    equipment: null,
    movement_pattern: null,
    kind: null,
    type: null,
    tags: null,
    categories: null,
  });

  assert.equal(summaryInput.isCardio, true);
});

test("canonical day summaries break out bodyweight metadata from strength totals", () => {
  const exercise = {
    id: "day-ex-2",
    user_id: "user-1",
    routine_day_id: "day-1",
    exercise_id: "exercise-2",
    position: 1,
    target_sets: null,
    target_reps: null,
    target_reps_min: null,
    target_reps_max: null,
    target_weight: null,
    target_weight_unit: null,
    target_duration_seconds: null,
    target_distance: null,
    target_distance_unit: null,
    target_calories: null,
    measurement_type: "reps",
    default_unit: null,
    notes: null,
    displayName: "Pull Up",
    goalLine: null,
    details: {
      id: "exercise-2",
      primary_muscle: "back",
      equipment: "bodyweight",
      movement_pattern: "pull",
      image_path: null,
      image_howto_path: null,
      image_icon_path: null,
      slug: "pull-up",
      how_to_short: null,
      measurement_type: "reps",
      default_unit: null,
      kind: null,
      type: null,
      tags: ["bodyweight"],
      categories: null,
    },
  } satisfies CanonicalDayExercise;

  const summary = getExerciseCountSummaryFromCanonicalExercises([exercise]);
  assert.equal(summary.label, "1 bodyweight");
  assert.equal(summary.bodyweight, 1);
  assert.equal(summary.strength, 0);
});

test("day taxonomy header uses friendly zero-exercise copy for empty training days", () => {
  assert.equal(
    formatDayTaxonomyHeaderSummaryFromCounts({
      dayName: "Travel",
      summary: { strength: 0, cardio: 0, bodyweight: 0, unknown: 0 },
      isRest: false,
    }),
    "Travel | No exercises yet",
  );
});

test("canonical day fallback summary keeps friendly zero-exercise copy for empty training days", () => {
  const summary = getRestDayExerciseCountSummaryFromCanonicalDayOrFallback(null, false);

  assert.equal(summary.label, "No exercises yet");
  assert.equal(summary.strength, 0);
  assert.equal(summary.cardio, 0);
  assert.equal(summary.bodyweight, 0);
  assert.equal(summary.unknown, 0);
});
