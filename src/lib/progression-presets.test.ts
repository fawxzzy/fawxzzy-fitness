import test from "node:test";
import assert from "node:assert/strict";
import {
  applyProgressionPresetDefaults,
  getProgressionPresetDefaults,
  getProgressionPresetForExercise,
  listProgressionPresets,
} from "@/lib/progression-presets";

test("lists stable progression preset ids", () => {
  const presets = listProgressionPresets();

  assert.deepEqual(
    presets.map((preset) => preset.id),
    [
      "barbell_strength",
      "dumbbell_strength",
      "machine_strength",
      "cable_accessory",
      "bodyweight_reps",
      "cardio_time",
      "cardio_distance",
      "mobility_stretch",
      "pilates_core",
    ],
  );

  assert.deepEqual(
    presets.find((preset) => preset.id === "cardio_time")?.applicability.measurementTypes,
    ["time", "time_distance"],
  );
});

test("barbell strength preset matches reps + barbell metadata", () => {
  const preset = getProgressionPresetForExercise({
    name: "Bench Press",
    equipment: "Barbell",
    measurement_type: "reps",
  });

  assert.equal(preset?.id, "barbell_strength");
  assert.equal(preset?.defaults.trainingGoal, "build_strength");
  assert.equal(preset?.defaults.progressionPlaybookId, "double_progression");
});

test("dumbbell machine and cable presets match supported equipment families", () => {
  assert.equal(getProgressionPresetForExercise({
    name: "Incline Curl",
    equipment: "Dumbbell",
    measurement_type: "reps",
  })?.id, "dumbbell_strength");

  assert.equal(getProgressionPresetForExercise({
    name: "Leg Press",
    equipment: "Machine",
    measurement_type: "reps",
  })?.id, "machine_strength");

  const cable = getProgressionPresetForExercise({
    name: "Face Pull",
    equipment: "Cable",
    measurement_type: "reps",
  });
  assert.equal(cable?.id, "cable_accessory");
  assert.equal(cable?.defaults.progressionPromotionBasis, "reps_only");
  assert.equal(cable?.defaults.progressionRepPromotionThreshold, "top_half_of_range");
});

test("bodyweight reps preset matches bodyweight metadata without mutating input", () => {
  const exercise = {
    name: "Pull-Up",
    equipment: "Bodyweight",
    measurement_type: "reps" as const,
    tags: ["bodyweight", "vertical pull"],
  };
  const before = structuredClone(exercise);

  const preset = getProgressionPresetForExercise(exercise);

  assert.equal(preset?.id, "bodyweight_reps");
  assert.equal(preset?.defaults.progressionPromotionBasis, "reps_only");
  assert.deepEqual(exercise, before);
});

test("cardio presets match time and distance modalities", () => {
  assert.equal(getProgressionPresetForExercise({
    name: "Bike Intervals",
    equipment: "Bike",
    measurement_type: "time",
  })?.id, "cardio_time");

  assert.equal(getProgressionPresetForExercise({
    name: "Rower Distance",
    equipment: "Rower",
    measurement_type: "distance",
  })?.id, "cardio_distance");
});

test("mobility and pilates presets match taxonomy safely", () => {
  const mobility = getProgressionPresetForExercise({
    name: "Hip Mobility Flow",
    equipment: "Bodyweight",
    movement_pattern: "mobility",
    measurement_type: "none",
  });
  assert.equal(mobility?.id, "mobility_stretch");
  assert.equal(mobility?.defaults.progressionPlaybookId, null);

  const pilates = getProgressionPresetForExercise({
    name: "Hundred",
    measurement_type: "reps",
    tags: ["pilates", "core"],
    isCustom: true,
  });
  assert.equal(pilates?.id, "pilates_core");
  assert.equal(pilates?.defaults.progressionPlaybookId, null);
});

test("unknown or sparse custom metadata falls back safely", () => {
  assert.equal(getProgressionPresetForExercise({
    name: "My Custom Thing",
    measurement_type: "reps",
    isCustom: true,
  }), null);
  assert.equal(getProgressionPresetDefaults({
    name: "Mystery Lift",
    measurement_type: "reps",
    equipment: "Unknown",
  }), null);
});

test("preset defaults can be resolved from preset id with cloned config", () => {
  const left = getProgressionPresetDefaults("barbell_strength");
  const right = getProgressionPresetDefaults("barbell_strength");

  assert.ok(left);
  assert.ok(right);
  assert.notEqual(left.progressionPlaybookConfig, right.progressionPlaybookConfig);
  assert.equal(left.progressionSetFlow, "straight_sets");
});

test("applyProgressionPresetDefaults does not overwrite explicit existing config", () => {
  const existing = {
    trainingGoal: "build_strength" as const,
    progressionMethod: "double_progression" as const,
    progressionPlaybookId: "double_progression" as const,
    progressionPlaybookConfig: {
      version: 1 as const,
      loadIncrement: 2.5,
      promotionBasis: "weight_only" as const,
      repPromotionThreshold: "top_of_range" as const,
    },
    progressionSetFlow: "ascending_ramp" as const,
    progressionPromotionBasis: "weight_only" as const,
    progressionRepPromotionThreshold: "top_of_range" as const,
  };
  const before = structuredClone(existing);

  const result = applyProgressionPresetDefaults({
    existing,
    preset: "dumbbell_strength",
  });

  assert.equal(result.presetId, "dumbbell_strength");
  assert.deepEqual(result.next, existing);
  assert.equal(result.appliedFields.length, 0);
  assert.ok(result.skippedFields.some((entry) => entry.field === "progressionPlaybookConfig" && entry.reason === "explicit value already set"));
  assert.deepEqual(existing, before);
});

test("applyProgressionPresetDefaults fills only missing fields from preset defaults", () => {
  const result = applyProgressionPresetDefaults({
    existing: {
      progressionMethod: "cardio_progression",
    },
    exercise: {
      name: "Leg Press",
      equipment: "Machine",
      measurement_type: "reps",
    },
  });

  assert.equal(result.presetId, "machine_strength");
  assert.equal(result.next.trainingGoal, "build_muscle");
  assert.equal(result.next.progressionMethod, "cardio_progression");
  assert.equal(result.next.progressionPlaybookId, "double_progression");
  assert.equal(result.next.progressionSetFlow, "straight_sets");
  assert.ok(result.appliedFields.includes("trainingGoal"));
  assert.ok(result.skippedFields.some((entry) => entry.field === "progressionMethod"));
});
