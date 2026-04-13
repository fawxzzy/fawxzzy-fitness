import assert from "node:assert/strict";
import test from "node:test";

import { createEditDayExerciseDraft, resolveEditDayExercisePreview } from "./edit-day-exercise-draft.ts";

test("edit-day preview falls back to the saved prescription when no live draft exists", () => {
  const preview = resolveEditDayExercisePreview({
    savedSummary: "4 sets \u2022 5 reps \u2022 225 lbs",
    savedOrderNumber: 2,
    draft: null,
    listLength: 5,
  });

  assert.deepEqual(preview, {
    summary: "4 sets \u2022 5 reps \u2022 225 lbs",
    orderNumber: 2,
  });
});

test("edit-day preview uses the live draft for the disclosure header summary and order badge", () => {
  const draft = createEditDayExerciseDraft({
    defaults: {
      targetSets: 4,
      targetReps: 5,
      targetWeight: 225,
      targetWeightUnit: "lbs",
    },
    distanceUnit: "mi",
    weightUnit: "lbs",
    orderNumber: 2,
    modality: "strength",
  });

  draft.goalState.repsMin = "8";
  draft.goalState.repsMax = "10";
  draft.goalState.weight = "70";
  draft.manualOrder = "4";

  const preview = resolveEditDayExercisePreview({
    savedSummary: "4 sets \u2022 5 reps \u2022 225 lbs",
    savedOrderNumber: 2,
    draft,
    listLength: 5,
  });

  assert.deepEqual(preview, {
    summary: "4 sets \u2022 8\u201310 reps \u2022 70 lbs",
    orderNumber: 4,
  });
});
