import assert from "node:assert/strict";
import test from "node:test";

import { buildCustomExerciseInsertPayload } from "./custom-exercise-payload";

test("custom exercise payload stays user-owned and non-global", () => {
  const payload = buildCustomExerciseInsertPayload({
    userId: "user-1",
    name: "Hip Flexor Stretch",
    primaryMuscle: "Recovery",
    equipment: "Bodyweight",
    movementPattern: "Stretch",
    measurementType: "time",
    defaultUnit: "seconds",
  });

  assert.equal(payload.user_id, "user-1");
  assert.equal(payload.is_global, false);
  assert.equal(payload.name, "Hip Flexor Stretch");
  assert.equal(payload.primary_muscle, "Recovery");
  assert.equal(payload.equipment, "Bodyweight");
  assert.equal(payload.movement_pattern, "Stretch");
  assert.equal(payload.measurement_type, "time");
  assert.equal(payload.default_unit, "seconds");
});

test("custom exercise payload falls back measurement_type none to reps", () => {
  const payload = buildCustomExerciseInsertPayload({
    userId: "user-1",
    name: "Open Workout",
    primaryMuscle: null,
    equipment: null,
    movementPattern: null,
    measurementType: "none",
    defaultUnit: null,
  });

  assert.equal(payload.measurement_type, "reps");
});

test("custom exercise payload trims optional taxonomy fields without mutating input", () => {
  const input = {
    userId: "user-2",
    name: "  Custom Row  ",
    primaryMuscle: "  Recovery  ",
    equipment: "  Bodyweight  ",
    movementPattern: "  Stretch  ",
    measurementType: "time" as const,
    defaultUnit: "  seconds  ",
  };
  const snapshot = { ...input };

  const payload = buildCustomExerciseInsertPayload(input);

  assert.deepEqual(input, snapshot);
  assert.equal(payload.name, "Custom Row");
  assert.equal(payload.primary_muscle, "Recovery");
  assert.equal(payload.equipment, "Bodyweight");
  assert.equal(payload.movement_pattern, "Stretch");
  assert.equal(payload.default_unit, "seconds");
});
