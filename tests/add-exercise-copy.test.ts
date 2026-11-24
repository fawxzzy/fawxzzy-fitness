import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { ADD_EXERCISE_GUIDE_ROWS } from "@/components/exercises/AddExerciseGuide";

const root = path.resolve(import.meta.dirname, "..");
const addFlowFiles = [
  "src/components/exercises/ExerciseChooserAddFlowForm.tsx",
  "src/components/exercises/AddExerciseGuide.tsx",
  "src/components/exercises/ExerciseSearchFilters.tsx",
  "src/components/ExercisePicker.tsx",
  "src/components/exercise-picker/list.tsx",
  "src/components/exercise-picker/custom.tsx",
  "src/components/session/ExerciseTimerSetup.tsx",
  "src/app/routines/[id]/edit/day/[dayId]/EditDayAddExerciseScreen.tsx",
];

test("the Add exercise flow never shows the word Target to the player", () => {
  for (const file of addFlowFiles) {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    // Only quoted or JSX text that a person reads; identifiers such as exerciseTimerTargetSeconds are fine.
    const visible = source.match(/"[^"\n]*\bTarget\b[^"\n]*"|>[^<>{}\n]*\bTarget\b[^<>{}\n]*</gu) ?? [];
    assert.deepEqual(visible, [], `${file} shows "Target"`);
  }
});

test("the guide explains warm-up, till failure, the exercise timer and the workout clock in plain words", () => {
  assert.equal(ADD_EXERCISE_GUIDE_ROWS.warmup.term, "Warm-up");
  assert.equal(ADD_EXERCISE_GUIDE_ROWS.failure.term, "Till Failure");
  assert.equal(ADD_EXERCISE_GUIDE_ROWS.timer.term, "Exercise Timer");
  assert.match(ADD_EXERCISE_GUIDE_ROWS.timer.body, /not a rest timer/u);
  assert.match(ADD_EXERCISE_GUIDE_ROWS.clock.body, /whole session/u);
});

test("the old unused SessionAddExerciseForm stays deleted", () => {
  assert.equal(fs.existsSync(path.join(root, "src/components/SessionAddExerciseForm.tsx")), false);
});
