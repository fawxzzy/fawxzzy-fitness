import test from "node:test";
import assert from "node:assert/strict";
import {
  formatProgressionStepValue,
  inferProgressionStepEquipmentFamily,
  inferProgressionStepPolicy,
} from "@/lib/progression-step-policy";

test("infers barbell load step defaults", () => {
  const policy = inferProgressionStepPolicy({
    measurementType: "reps",
    equipment: "Barbell",
    weightUnit: "lbs",
    routineDefaultValue: 5,
  });

  assert.equal(policy.kind, "load");
  assert.equal(policy.equipmentFamily, "barbell");
  assert.equal(policy.defaultValue, 10);
  assert.equal(policy.unit, "lbs");
  assert.equal(policy.source, "equipment_default");
});

test("infers dumbbell load step defaults per dumbbell", () => {
  const policy = inferProgressionStepPolicy({
    measurementType: "reps",
    equipment: "Dumbbell",
    weightUnit: "lbs",
  });

  assert.equal(policy.kind, "load");
  assert.equal(policy.equipmentFamily, "dumbbell");
  assert.equal(policy.defaultValue, 5);
  assert.match(policy.description, /per dumbbell/i);
});

test("infers machine and cable load step defaults", () => {
  assert.equal(inferProgressionStepPolicy({
    measurementType: "reps",
    equipment: "Machine",
    weightUnit: "lbs",
  }).defaultValue, 15);
  assert.equal(inferProgressionStepPolicy({
    measurementType: "reps",
    equipment: "Cable",
    weightUnit: "kg",
  }).defaultValue, 15);
});

test("bodyweight uses rep step instead of load", () => {
  const policy = inferProgressionStepPolicy({
    measurementType: "reps",
    equipment: "Bodyweight",
    weightUnit: "lbs",
  });

  assert.equal(policy.kind, "reps");
  assert.equal(policy.defaultValue, 5);
  assert.equal(policy.unit, "reps");
});

test("time and distance steps are measurement-aware", () => {
  const timePolicy = inferProgressionStepPolicy({
    measurementType: "time",
    exerciseOverrideValue: 5,
  });
  const distancePolicy = inferProgressionStepPolicy({
    measurementType: "distance",
    distanceUnit: "km",
  });

  assert.equal(timePolicy.kind, "duration");
  assert.equal(timePolicy.label, "Duration step");
  assert.equal(timePolicy.defaultValue, 30);
  assert.equal(timePolicy.unit, "seconds");
  assert.equal(timePolicy.source, "incompatible_override_ignored");
  assert.equal(distancePolicy.kind, "distance");
  assert.equal(distancePolicy.defaultValue, 0.5);
  assert.equal(distancePolicy.unit, "km");
});

test("distance and time-distance ignore incompatible legacy load overrides", () => {
  const distancePolicy = inferProgressionStepPolicy({
    measurementType: "distance",
    distanceUnit: "mi",
    exerciseOverrideValue: 5,
  });
  const timeDistancePolicy = inferProgressionStepPolicy({
    measurementType: "time_distance",
    distanceUnit: "mi",
    exerciseOverrideValue: 5,
  });

  assert.equal(distancePolicy.kind, "distance");
  assert.equal(distancePolicy.defaultValue, 0.5);
  assert.equal(distancePolicy.source, "incompatible_override_ignored");
  assert.equal(timeDistancePolicy.kind, "pace_or_volume");
  assert.equal(timeDistancePolicy.defaultValue, 0.5);
  assert.equal(timeDistancePolicy.source, "incompatible_override_ignored");
});

test("weighted bodyweight with a load target uses load step", () => {
  const policy = inferProgressionStepPolicy({
    measurementType: "reps",
    equipment: "Bodyweight",
    weightUnit: "lbs",
    targetWeight: 25,
    exerciseOverrideValue: 5,
  });

  assert.equal(policy.kind, "load");
  assert.equal(policy.label, "Load step");
  assert.equal(policy.defaultValue, 5);
  assert.equal(policy.unit, "lbs");
  assert.equal(policy.source, "exercise_override");
});

test("reps-only bodyweight ignores incompatible legacy load override", () => {
  const policy = inferProgressionStepPolicy({
    measurementType: "reps",
    equipment: "Bodyweight",
    weightUnit: "lbs",
    targetWeight: null,
    exerciseOverrideValue: 5,
  });

  assert.equal(policy.kind, "reps");
  assert.equal(policy.defaultValue, 5);
  assert.equal(policy.unit, "reps");
  assert.equal(policy.source, "incompatible_override_ignored");
});

test("formats rep step copy", () => {
  const policy = inferProgressionStepPolicy({
    measurementType: "reps",
    equipment: "Bodyweight",
  });

  assert.equal(formatProgressionStepValue(policy), "5 reps");
});

test("formats invalid or missing steps as a dash", () => {
  assert.equal(formatProgressionStepValue({
    kind: "none",
    equipmentFamily: "stretch",
    label: null,
    defaultValue: null,
    unit: null,
    description: "Unsupported",
    source: "unsupported",
  }), "-");
});

test("stretch and none have no progression step", () => {
  const policy = inferProgressionStepPolicy({
    measurementType: "none",
    equipment: "Stretch",
  });

  assert.equal(policy.kind, "none");
  assert.equal(policy.defaultValue, null);
  assert.equal(policy.source, "unsupported");
});

test("exercise override beats equipment default", () => {
  const policy = inferProgressionStepPolicy({
    measurementType: "reps",
    equipment: "Barbell",
    exerciseOverrideValue: 2.5,
    routineDefaultValue: 5,
  });

  assert.equal(policy.defaultValue, 2.5);
  assert.equal(policy.source, "exercise_override");
});

test("equipment default beats routine default", () => {
  const policy = inferProgressionStepPolicy({
    measurementType: "reps",
    equipment: "Barbell",
    routineDefaultValue: 5,
  });

  assert.equal(policy.defaultValue, 10);
  assert.equal(policy.source, "equipment_default");
});

test("advanced step options override equipment defaults", () => {
  const barbellPolicy = inferProgressionStepPolicy({
    measurementType: "reps",
    equipment: "Barbell",
    weightUnit: "lbs",
    exerciseOverrideValue: 5,
    stepOverrides: {
      barbellLoadIncrement: 15,
      dumbbellLoadIncrement: 7.5,
    },
  });
  const dumbbellPolicy = inferProgressionStepPolicy({
    measurementType: "reps",
    equipment: "Dumbbell",
    weightUnit: "lbs",
    stepOverrides: {
      dumbbellLoadIncrement: 7.5,
    },
  });

  assert.equal(barbellPolicy.defaultValue, 15);
  assert.equal(barbellPolicy.source, "step_override");
  assert.equal(dumbbellPolicy.defaultValue, 7.5);
  assert.equal(dumbbellPolicy.source, "step_override");
  assert.match(dumbbellPolicy.description, /per dumbbell/i);
});

test("advanced step options override cardio and bodyweight defaults", () => {
  const durationPolicy = inferProgressionStepPolicy({
    measurementType: "time",
    stepOverrides: { durationSecondsIncrement: 90 },
  });
  const distancePolicy = inferProgressionStepPolicy({
    measurementType: "distance",
    distanceUnit: "mi",
    stepOverrides: { distanceIncrement: 0.25 },
  });
  const bodyweightPolicy = inferProgressionStepPolicy({
    measurementType: "reps",
    equipment: "Bodyweight",
    stepOverrides: { bodyweightRepIncrement: 2 },
  });

  assert.equal(durationPolicy.defaultValue, 90);
  assert.equal(durationPolicy.source, "step_override");
  assert.equal(distancePolicy.defaultValue, 0.25);
  assert.equal(distancePolicy.source, "step_override");
  assert.equal(bodyweightPolicy.defaultValue, 2);
  assert.equal(bodyweightPolicy.source, "step_override");
});

test("routine default beats app fallback when equipment is unknown", () => {
  const policy = inferProgressionStepPolicy({
    measurementType: "reps",
    equipment: null,
    routineDefaultValue: 7.5,
  });

  assert.equal(policy.defaultValue, 7.5);
  assert.equal(policy.source, "routine_default");
});

test("equipment family inference tolerates movement metadata", () => {
  assert.equal(inferProgressionStepEquipmentFamily({
    measurementType: "reps",
    equipment: null,
    movementPattern: "body weight push",
  }), "bodyweight");
});
