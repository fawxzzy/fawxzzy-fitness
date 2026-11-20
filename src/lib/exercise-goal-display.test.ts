import assert from "node:assert/strict";
import test from "node:test";
import { formatExerciseGoalDisplay } from "./exercise-goal-display.ts";
import { formatExerciseGoalSummary } from "./exercise-goal-format.ts";
import { splitExerciseTargetValues } from "../components/workout/exerciseRowCardValues.ts";

function text(parts: string[]) {
  return formatExerciseGoalDisplay(parts)?.text ?? null;
}

test("strength goals read sets × reps @ load, with no 'reps' noun after the ×", () => {
  assert.equal(text(["4 sets", "5 reps", "225 lbs"]), "4 × 5 @ 225 lbs");
  assert.equal(text(["3 sets", "8 reps", "60 kg"]), "3 × 8 @ 60 kg");
  assert.equal(text(["4 sets", "8–10 reps", "35 lbs"]), "4 × 8–10 @ 35 lbs");
  // A hyphen range from a hand-typed line still reads with the en dash.
  assert.equal(text(["4 sets", "8-10 reps"]), "4 × 8–10");
  assert.equal(text(["2 sets", "5 reps"]), "2 × 5");
  assert.equal(text(["1 set", "12 reps"]), "1 × 12");
});

test("timed work shows a clean clock: no stray 's', and a single set drops '1 ×'", () => {
  assert.equal(text(["1 set", "18:00 s", "2 km"]), "18:00 · 2 km");
  assert.equal(text(["18:00 s"]), "18:00");
  assert.equal(text(["3 sets", "0:45 s"]), "3 × 0:45");
  assert.equal(text(["1 set", "1:05:00 s"]), "1:05:00");
  for (const value of [text(["1 set", "18:00 s", "2 km"]), text(["3 sets", "0:45 s"])]) {
    assert.doesNotMatch(value ?? "", /\d s\b|\bs$/);
  }
});

test("distance, calories and failure goals; load without reps; sets alone", () => {
  assert.equal(text(["1 set", "2 mi"]), "2 mi");
  assert.equal(text(["5 sets", "400 m"]), "5 × 400 m");
  assert.equal(text(["1 set", "300 cal"]), "300 cal");
  assert.equal(text(["3 sets", "Failure", "100 lbs"]), "3 × failure @ 100 lbs");
  assert.equal(text(["4 sets", "100 lbs"]), "4 sets @ 100 lbs");
  assert.equal(text(["4 sets"]), "4 sets");
  assert.equal(text(["225 lbs"]), "225 lbs");
  // Reps win the × slot; time and distance trail.
  assert.equal(text(["3 sets", "10 reps", "0:30 s", "1 km"]), "3 × 10 · 0:30 · 1 km");
});

test("unknown parts are kept, never dropped; blanks and empty input give null", () => {
  assert.equal(text(["3 sets", "8 reps", "RPE 8"]), "3 × 8 · RPE 8");
  assert.equal(text([]), null);
  assert.equal(text(["  ", ""]), null);
});

test("the spoken form says what the symbols mean", () => {
  assert.equal(formatExerciseGoalDisplay(["4 sets", "5 reps", "225 lbs"])?.spoken, "4 sets of 5 reps at 225 lbs");
  assert.equal(formatExerciseGoalDisplay(["4 sets", "8–10 reps"])?.spoken, "4 sets of 8 to 10 reps");
  assert.equal(formatExerciseGoalDisplay(["1 set", "18:00 s", "2 km"])?.spoken, "18 minutes, 2 km");
  assert.equal(formatExerciseGoalDisplay(["3 sets", "0:45 s"])?.spoken, "3 sets of 45 seconds");
  // Failure reads as plain speech: "3 sets to failure", never "3 sets of to failure".
  assert.equal(formatExerciseGoalDisplay(["3 sets", "Failure", "100 lbs"])?.spoken, "3 sets to failure at 100 lbs");
  assert.equal(formatExerciseGoalDisplay(["1 set", "to failure"])?.spoken, "1 set to failure");
  assert.equal(formatExerciseGoalDisplay(["Failure"])?.spoken, "to failure");
});

test("end to end from the stored goal line the cards receive", () => {
  const strength = formatExerciseGoalSummary({ sets: 4, reps: 5, repsMax: 5, weight: 225, weightUnit: "lbs" });
  assert.equal(text(splitExerciseTargetValues(strength)), "4 × 5 @ 225 lbs");
  const timed = formatExerciseGoalSummary({ sets: 1, durationSeconds: 1080, distance: 2, distanceUnit: "km" });
  assert.equal(text(splitExerciseTargetValues(timed)), "18:00 · 2 km");
  const kilos = formatExerciseGoalSummary({ sets: 3, reps: 8, repsMax: 8, weight: 60, weightUnit: "kg" });
  assert.equal(text(splitExerciseTargetValues(kilos)), "3 × 8 @ 60 kg");
});
