import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { ADD_EXERCISE_GUIDE_ROWS } from "@/components/exercises/AddExerciseGuide";
import { REST_TIMER_DEFAULT_SECONDS, REST_TIMER_STEP_SECONDS } from "@/components/session/restTimerModel";

const root = path.resolve(import.meta.dirname, "..");
const addFlowFiles = [
  "src/components/exercises/ExerciseChooserAddFlowForm.tsx",
  "src/components/exercises/AddExerciseGuide.tsx",
  "src/components/exercises/ExerciseSearchFilters.tsx",
  "src/components/ExercisePicker.tsx",
  "src/components/exercise-picker/list.tsx",
  "src/components/exercise-picker/custom.tsx",
  "src/components/session/ExerciseTimerSetup.tsx",
  "src/components/ui/measurements/ExerciseGoalForm.tsx",
  "src/components/ui/measurements/StatFieldLabel.tsx",
  "src/components/ui/measurements/MeasurementPanelV2.tsx",
  "src/components/routines/ExerciseProgressionEditorSurface.tsx",
  "src/app/routines/[id]/edit/day/[dayId]/EditDayAddExerciseScreen.tsx",
];

test("the Add exercise flow never shows the word target (any case) to the player", () => {
  for (const file of addFlowFiles) {
    const source = fs.readFileSync(path.join(root, file), "utf8")
      // Styling and prop values that are not shown to anyone.
      .replace(/emphasis(?:=|\s*===\s*)"target"/gu, "")
      .replace(/"default"\s*\|\s*"target"/gu, "");
    // Only quoted strings and JSX text a person can read; identifiers such as exerciseTimerTargetSeconds are fine.
    const quoted = /"[^"]*\btargets?\b[^"]*"|'[^']*\btargets?\b[^']*'|`[^`]*\btargets?\b[^`]*`|>[^<>{}]*\btargets?\b[^<>{}]*</iu;
    const visible = source.split("\n").filter((line) => quoted.test(line));
    assert.deepEqual(visible, [], `${file} shows "target"`);
  }
});

test("the guide explains warm-up, failure and the exercise timer in plain words, in the control's own labels", () => {
  assert.equal(ADD_EXERCISE_GUIDE_ROWS.warmup.term, "Warm-up");
  assert.equal(ADD_EXERCISE_GUIDE_ROWS.failure.term, "Failure", "the toggle reads Failure / Reps");
  assert.match(ADD_EXERCISE_GUIDE_ROWS.failure.body, /Switch back to Reps to set a rep range/u);
  assert.equal(ADD_EXERCISE_GUIDE_ROWS.timer.term, "Exercise Timer");
  assert.match(ADD_EXERCISE_GUIDE_ROWS.timer.body, /separate from the rest timer/u);
});

test("the guide only describes what exists: the workout clock and rest timer row matches what ships (DESIGN #2)", () => {
  const rows = Object.values(ADD_EXERCISE_GUIDE_ROWS);
  assert.equal(rows.length, 4);
  for (const row of rows) {
    assert.doesNotMatch(`${row.term} ${row.body}`, /Till Failure|Reps-Based/u);
  }
  // Numbers in the copy come from the timer model, so the guide cannot drift from the strip.
  assert.match(ADD_EXERCISE_GUIDE_ROWS.clock.body, new RegExp(`${REST_TIMER_DEFAULT_SECONDS}-second rest`, "u"));
  assert.ok(ADD_EXERCISE_GUIDE_ROWS.clock.body.includes(`-${REST_TIMER_STEP_SECONDS} or +${REST_TIMER_STEP_SECONDS}`));
  assert.match(ADD_EXERCISE_GUIDE_ROWS.clock.body, /Skip/u);
  const restTimer = fs.readFileSync(path.join(root, "src/components/session/RestTimer.tsx"), "utf8");
  assert.match(restTimer, /"Skip"/u);
  const header = fs.readFileSync(path.join(root, "src/components/SessionHeaderControls.tsx"), "utf8");
  assert.ok(header.includes("<SessionWorkoutClock elapsedSeconds={elapsedSeconds} />"));
});

test("the old unused SessionAddExerciseForm stays deleted", () => {
  assert.equal(fs.existsSync(path.join(root, "src/components/SessionAddExerciseForm.tsx")), false);
});
