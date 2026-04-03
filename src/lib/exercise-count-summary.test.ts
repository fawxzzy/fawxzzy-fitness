import test from "node:test";
import assert from "node:assert/strict";

import { formatExerciseCountSummary, formatRestDayExerciseCountSummary } from "./exercise-count-summary.ts";

test("formatExerciseCountSummary renders mixed strength and cardio totals canonically", () => {
  const summary = formatExerciseCountSummary([
    { measurement_type: "reps" },
    { measurement_type: "reps" },
    { measurement_type: "time" },
  ]);

  assert.equal(summary.label, "3 total • 2 strength • 1 cardio");
});

test("formatExerciseCountSummary renders single-type days without total prefix", () => {
  assert.equal(formatExerciseCountSummary([{ measurement_type: "reps" }, { measurement_type: "reps" }]).label, "2 strength");
  assert.equal(formatExerciseCountSummary([{ measurement_type: "time" }, { measurement_type: "distance" }]).label, "2 cardio");
});

test("formatExerciseCountSummary honors normalized isCardio metadata over fallback reps classification", () => {
  assert.equal(formatExerciseCountSummary([{ measurement_type: "reps", isCardio: true }]).label, "1 cardio");
});

test("formatExerciseCountSummary treats normalized non-cardio rows as strength when metadata is otherwise sparse", () => {
  assert.equal(formatExerciseCountSummary([{ isCardio: false }]).label, "1 strength");
});

test("formatExerciseCountSummary degrades gracefully for unknown-only metadata", () => {
  assert.equal(formatExerciseCountSummary([{ equipment: "sled" }, { movement_pattern: "carry" }]).label, "2 exercises");
});

test("formatExerciseCountSummary uses unknown taxonomy label in mixed summaries", () => {
  assert.equal(
    formatExerciseCountSummary([{ measurement_type: "reps" }, { equipment: "sled" }]).label,
    "2 total • 1 strength • 1 unknown",
  );
});

test("formatExerciseCountSummary preserves taxonomy-aware mixed labels for restored metadata days", () => {
  assert.equal(
    formatExerciseCountSummary([
      { measurement_type: "reps", isCardio: false },
      { measurement_type: "time", isCardio: true },
      { equipment: "bike", isCardio: true },
    ]).label,
    "3 total • 1 strength • 2 cardio",
  );
});

test("formatRestDayExerciseCountSummary keeps explicit rest-day copy", () => {
  assert.equal(formatRestDayExerciseCountSummary([{ measurement_type: "reps" }], true).label, "Rest day");
});
