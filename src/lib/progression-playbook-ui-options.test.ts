import assert from "node:assert/strict";
import test from "node:test";

import {
  buildProgressionPromotionUiModel,
  buildProgressionTargetMutationUiModel,
  detectActiveProgressionMeasurementsFromGoal,
  getVisiblePromotionStepFieldsForGoal,
  getVisibleSetStepFieldsForGoal,
} from "@/lib/progression-playbook-ui-options";
import type { GoalModality } from "@/lib/exercise-goal-validation";
import type { ProgressionStepPolicy } from "@/lib/progression-step-policy";

function buildGoalValues(overrides: Partial<{
  repsMin: string;
  repsMax: string;
  failure: boolean;
  weight: string;
  duration: string;
  distance: string;
  calories: string;
}> = {}) {
  return {
    repsMin: "",
    repsMax: "",
    failure: false,
    weight: "",
    duration: "",
    distance: "",
    calories: "",
    ...overrides,
  };
}

function buildLoadPolicy(equipmentFamily: ProgressionStepPolicy["equipmentFamily"] = "barbell"): ProgressionStepPolicy {
  return {
    kind: "load",
    equipmentFamily,
    label: "Barbell step",
    defaultValue: 5,
    unit: "lbs",
    description: "Load step",
    source: "equipment_default",
  };
}

test("routine-default context keeps the full strength promotion surface", () => {
  const model = buildProgressionPromotionUiModel({
    context: "routine-default",
    promotionBasis: "reps_only",
  });

  assert.deepEqual(model.visibleOptions.map((option) => option.id), [
    "weight_only",
    "reps_only",
    "weight_and_reps",
  ]);
  assert.equal(model.selectedOptionId, "reps_only");
  assert.equal(model.showsRepThresholdControls, true);
});

test("reps target shows only reps promotion option", () => {
  const model = buildProgressionPromotionUiModel({
    context: "exercise",
    promotionBasis: "weight_and_reps",
    modality: "strength",
    values: buildGoalValues({ repsMin: "8", repsMax: "12" }),
  });

  assert.deepEqual(model.visibleOptions.map((option) => option.id), ["reps_only"]);
  assert.equal(model.selectedOptionId, "reps_only");
  assert.equal(model.visibleOptions[0]?.isSelectable, false);
  assert.equal(model.showsRepThresholdControls, true);
});

test("weight target shows only weight promotion option", () => {
  const model = buildProgressionPromotionUiModel({
    context: "exercise",
    promotionBasis: "reps_only",
    modality: "strength",
    values: buildGoalValues({ weight: "135" }),
  });

  assert.deepEqual(model.visibleOptions.map((option) => option.id), ["weight_only"]);
  assert.equal(model.selectedOptionId, "weight_only");
  assert.equal(model.showsRepThresholdControls, false);
});

test("reps plus weight targets keep configurable strength options and preserve saved config", () => {
  const model = buildProgressionPromotionUiModel({
    context: "exercise",
    promotionBasis: "reps_only",
    modality: "strength",
    values: buildGoalValues({ repsMin: "8", repsMax: "12", weight: "135" }),
  });

  assert.deepEqual(model.visibleOptions.map((option) => option.id), [
    "weight_only",
    "reps_only",
    "weight_and_reps",
  ]);
  assert.equal(model.selectedOptionId, "reps_only");
  assert.equal(model.showsRepThresholdControls, true);
});

test("time target shows only time promotion option", () => {
  const model = buildProgressionPromotionUiModel({
    context: "exercise",
    promotionBasis: "weight_and_reps",
    modality: "cardio_time",
    values: buildGoalValues({ duration: "12:00" }),
  });

  assert.deepEqual(model.visibleOptions.map((option) => option.id), ["time_only"]);
  assert.equal(model.selectedOptionId, "time_only");
  assert.equal(model.showsRepThresholdControls, false);
});

test("distance target shows only distance promotion option", () => {
  const model = buildProgressionPromotionUiModel({
    context: "exercise",
    promotionBasis: "weight_and_reps",
    modality: "cardio_distance",
    values: buildGoalValues({ distance: "2.5" }),
  });

  assert.deepEqual(model.visibleOptions.map((option) => option.id), ["distance_only"]);
  assert.equal(model.selectedOptionId, "distance_only");
});

test("time plus distance target shows combined cardio option", () => {
  const model = buildProgressionPromotionUiModel({
    context: "exercise",
    promotionBasis: "weight_and_reps",
    modality: "cardio_time_distance",
    values: buildGoalValues({ duration: "12:00", distance: "2.5" }),
  });

  assert.deepEqual(model.visibleOptions.map((option) => option.id), ["time_and_distance"]);
  assert.equal(model.selectedOptionId, "time_and_distance");
});

test("clearing targets removes inactive promotion options without mutating saved config", () => {
  const model = buildProgressionPromotionUiModel({
    context: "exercise",
    promotionBasis: "weight_only",
    modality: "strength",
    values: buildGoalValues(),
  });

  assert.deepEqual(model.visibleOptions, []);
  assert.equal(model.selectedOptionId, null);
  assert.equal(model.showsRepThresholdControls, false);
});

test("calories are detected but not exposed as promotion options", () => {
  const model = buildProgressionPromotionUiModel({
    context: "exercise",
    promotionBasis: "weight_and_reps",
    modality: "cardio_time",
    values: buildGoalValues({ calories: "250" }),
  });

  assert.equal(model.hasDeferredCalories, true);
  assert.deepEqual(model.visibleOptions, []);
  assert.match(model.summary ?? "", /calories-aware promotion controls stay deferred/i);
});

test("legacy routine-default context exposes strength target change options", () => {
  const model = buildProgressionTargetMutationUiModel({
    context: "routine-default",
    targetMutation: "increase_load_reset_reps",
    promotionBasis: "weight_and_reps",
  });

  assert.deepEqual(model.visibleOptions.map((option) => option.id), [
    "increase_load",
    "increase_reps",
    "increase_load_reset_reps",
    "increase_load_and_reps",
  ]);
  assert.equal(model.selectedOptionId, "increase_load_reset_reps");
});

test("reps plus weight targets expose all supported strength target changes", () => {
  const model = buildProgressionTargetMutationUiModel({
    context: "exercise",
    targetMutation: "increase_load_and_reps",
    promotionBasis: "weight_and_reps",
    modality: "strength",
    values: buildGoalValues({ repsMin: "8", repsMax: "12", weight: "135" }),
  });

  assert.deepEqual(model.visibleOptions.map((option) => option.id), [
    "increase_load",
    "increase_reps",
    "increase_load_reset_reps",
    "increase_load_and_reps",
  ]);
  assert.equal(model.selectedOptionId, "increase_load_and_reps");
});

test("time target exposes time-only target changes", () => {
  const model = buildProgressionTargetMutationUiModel({
    context: "exercise",
    targetMutation: "increase_duration",
    promotionBasis: "weight_and_reps",
    modality: "cardio_time",
    values: buildGoalValues({ duration: "12:00" }),
  });

  assert.deepEqual(model.visibleOptions.map((option) => option.id), ["increase_duration"]);
  assert.equal(model.selectedOptionId, "increase_duration");
});

test("time plus distance targets expose all supported cardio target changes", () => {
  const model = buildProgressionTargetMutationUiModel({
    context: "exercise",
    targetMutation: "increase_duration_and_distance",
    promotionBasis: "weight_and_reps",
    modality: "cardio_time_distance",
    values: buildGoalValues({ duration: "12:00", distance: "2.5" }),
  });

  assert.deepEqual(model.visibleOptions.map((option) => option.id), [
    "increase_duration",
    "increase_distance",
    "increase_duration_and_distance",
  ]);
  assert.equal(model.selectedOptionId, "increase_duration_and_distance");
});

test("calories are detected but not exposed as target change options", () => {
  const model = buildProgressionTargetMutationUiModel({
    context: "exercise",
    targetMutation: "increase_duration",
    promotionBasis: "weight_and_reps",
    modality: "cardio_time",
    values: buildGoalValues({ calories: "250" }),
  });

  assert.equal(model.hasDeferredCalories, true);
  assert.deepEqual(model.visibleOptions, []);
  assert.match(model.summary ?? "", /calories-aware target changes stay deferred/i);
});

test("failure targets still register reps as active progression measurements", () => {
  assert.deepEqual(
    detectActiveProgressionMeasurementsFromGoal({
      modality: "strength",
      values: buildGoalValues({ failure: true }),
    }),
    ["reps"],
  );
});

test("promotion step fields use shared active-measurement detection", () => {
  assert.deepEqual(
    getVisiblePromotionStepFieldsForGoal({
      modality: "strength",
      values: buildGoalValues({ repsMin: "8", repsMax: "12", weight: "135" }),
      policy: buildLoadPolicy("dumbbell"),
    }),
    ["dumbbellLoad"],
  );
  assert.deepEqual(
    getVisiblePromotionStepFieldsForGoal({
      modality: "cardio_time_distance",
      values: buildGoalValues({ duration: "12:00", distance: "2.5" }),
      policy: buildLoadPolicy(),
    }),
    ["duration", "distance"],
  );
});

test("set step fields use shared active-measurement detection", () => {
  assert.deepEqual(
    getVisibleSetStepFieldsForGoal({
      modality: "strength",
      values: buildGoalValues({ repsMin: "8", repsMax: "12", weight: "135" }),
    }),
    ["load", "reps"],
  );
  assert.deepEqual(
    getVisibleSetStepFieldsForGoal({
      modality: "cardio_time_distance",
      values: buildGoalValues({ duration: "12:00", distance: "2.5" }),
    }),
    ["duration", "distance"],
  );
});

test("helper input objects are not mutated", () => {
  const values = buildGoalValues({ repsMin: "8", repsMax: "12", weight: "135" });
  const snapshot = JSON.stringify(values);

  buildProgressionPromotionUiModel({
    context: "exercise",
    promotionBasis: "weight_and_reps",
    modality: "strength",
    values,
  });

  assert.equal(JSON.stringify(values), snapshot);
});
