import test from "node:test";
import assert from "node:assert/strict";

import { normalizeHistoryLogExercises } from "./history-log-normalization.ts";

test("normalizes standard exercise payload", () => {
  const result = normalizeHistoryLogExercises({
    exercises: [{
      id: "se-1",
      exercise_id: "ex-1",
      exercise_name: "Bench Press",
      measurement_type: "reps",
      default_unit: "lbs",
      sets: [{ id: "set-1", set_index: 0, reps: 8, weight: 135 }],
    }],
  });

  assert.equal(result.length, 1);
  assert.deepEqual(result[0], {
    id: "se-1",
    exercise_id: "ex-1",
    exercise_name: "Bench Press",
    exercise_slug: null,
    exercise_image_path: null,
    exercise_image_icon_path: null,
    exercise_image_howto_path: null,
    notes: null,
    measurement_type: "reps",
    default_unit: "lbs",
    sets: [{
      id: "set-1",
      set_index: 0,
      reps: 8,
      weight: 135,
      duration_seconds: null,
      distance: null,
      distance_unit: null,
      calories: null,
      weight_unit: null,
    }],
  });
});

test("normalizes alias-based payload drift and media aliases", () => {
  const result = normalizeHistoryLogExercises({
    logExercises: [{
      exerciseId: "ex-2",
      exerciseName: "Incline Walk",
      name: "ignored fallback",
      slug: "incline-walk",
      media: {
        image_path: "/img/main.png",
        image_icon_path: "/img/icon.png",
        image_howto_path: "/img/howto.png",
      },
      logged_sets: [{ setId: "legacy-set", index: 3, durationSeconds: 600, distanceUnit: "mi" }],
      measurement_type: "time_distance",
      default_unit: "mi",
    }],
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].id, "ex-2");
  assert.equal(result[0].exercise_id, "ex-2");
  assert.equal(result[0].exercise_name, "Incline Walk");
  assert.equal(result[0].exercise_slug, "incline-walk");
  assert.equal(result[0].exercise_image_path, "/img/main.png");
  assert.equal(result[0].exercise_image_icon_path, "/img/icon.png");
  assert.equal(result[0].exercise_image_howto_path, "/img/howto.png");
  assert.deepEqual(result[0].sets[0], {
    id: "legacy-set",
    set_index: 3,
    weight: null,
    reps: null,
    duration_seconds: 600,
    distance: null,
    distance_unit: "mi",
    calories: null,
    weight_unit: null,
  });
});

test("returns deterministic empty list when exercise collections are nullish", () => {
  assert.deepEqual(normalizeHistoryLogExercises({ exercises: undefined }), []);
  assert.deepEqual(normalizeHistoryLogExercises({ exercises: null }), []);
  assert.deepEqual(normalizeHistoryLogExercises({ sessionExercises: undefined, workoutExercises: null }), []);
});

test("normalizes exercises with null or empty set arrays", () => {
  const nullSets = normalizeHistoryLogExercises({ exercises: [{ id: "se-a", exercise_id: "ex-a", sets: null }] });
  const emptySets = normalizeHistoryLogExercises({ exercises: [{ id: "se-b", exercise_id: "ex-b", sets: [] }] });

  assert.deepEqual(nullSets[0].sets, []);
  assert.deepEqual(emptySets[0].sets, []);
});

test("keeps valid exercises when neighboring records are partial or malformed", () => {
  const result = normalizeHistoryLogExercises({
    exercises: [
      null as unknown as never,
      { id: "valid", exercise_id: "ex-valid", exercise_name: "Row", sets: [{ id: "set-1", set_index: 0, reps: 10 }] },
      { exercise_name: "Partial", sets: [{ index: 0 }] },
      42 as unknown as never,
    ],
  });

  assert.equal(result.length, 2);
  assert.equal(result[0].exercise_id, "ex-valid");
  assert.equal(result[1].id, "exercise-1");
  assert.equal(result[1].exercise_id, "exercise-1");
  assert.equal(result[1].exercise_name, "Partial");
});

test("uses first available inbound collection alias in precedence order", () => {
  const result = normalizeHistoryLogExercises({
    exercises: [],
    sessionExercises: [{ id: "session-ex", exercise_id: "ex-session" }],
    logExercises: [{ id: "log-ex", exercise_id: "ex-log" }],
    workoutExercises: [{ id: "workout-ex", exercise_id: "ex-workout" }],
  });

  assert.equal(result.length, 0);

  const fallbackResult = normalizeHistoryLogExercises({
    sessionExercises: [{ id: "session-ex", exercise_id: "ex-session" }],
    logExercises: [{ id: "log-ex", exercise_id: "ex-log" }],
  });

  assert.equal(fallbackResult.length, 1);
  assert.equal(fallbackResult[0].id, "session-ex");
});
