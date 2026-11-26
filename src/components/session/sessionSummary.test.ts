import test from "node:test";
import assert from "node:assert/strict";

import { buildSessionSummaryDetails, buildSessionSummaryRows, type SessionSummaryExercise } from "./sessionSummary";

const bench: SessionSummaryExercise = {
  name: "Bench Press",
  loggedSetCount: 3,
  isSkipped: false,
  sets: [
    { weight: 135, reps: 10, weightUnit: "lbs" },
    { weight: 185, reps: 5, weightUnit: "lbs" },
    { weight: 185, reps: 6, weightUnit: "lbs" },
  ],
};

test("volume sums weight x reps across logged sets and names the unit", () => {
  const details = buildSessionSummaryDetails([bench]);
  // 1350 + 925 + 1110
  assert.equal(details.volumeLabel, "3,385 lbs lifted");
});

test("top set follows History's rule: heaviest weight, then most reps at that weight", () => {
  const details = buildSessionSummaryDetails([bench]);
  assert.deepEqual(details.topSet, { exerciseName: "Bench Press", display: "185 lbs x 6" });
});

test("bodyweight-only work has no volume line and the top set is the most reps", () => {
  const details = buildSessionSummaryDetails([
    { name: "Pull-up", loggedSetCount: 2, isSkipped: false, sets: [{ weight: null, reps: 8, weightUnit: null }, { weight: null, reps: 10, weightUnit: null }] },
  ]);
  assert.equal(details.volumeLabel, null);
  assert.deepEqual(details.topSet, { exerciseName: "Pull-up", display: "10 reps" });
});

test("mixed lbs and kg never sum into one number", () => {
  const details = buildSessionSummaryDetails([
    bench,
    { name: "Row", loggedSetCount: 1, isSkipped: false, sets: [{ weight: 60, reps: 8, weightUnit: "kg" }] },
  ]);
  assert.equal(details.volumeLabel, null);
  assert.ok(details.topSet);
});

test("cardio-only sessions (no weight, no reps) have neither volume nor top set", () => {
  const details = buildSessionSummaryDetails([
    { name: "Run", loggedSetCount: 1, isSkipped: false, sets: [{ weight: null, reps: null, weightUnit: null }] },
  ]);
  assert.equal(details.volumeLabel, null);
  assert.equal(details.topSet, null);
  assert.deepEqual(details.rows, [{ name: "Run", detail: "1 set", state: "done" }]);
});

test("rows: done, skipped, skipped-with-sets is partial, untouched exercises are left out", () => {
  assert.deepEqual(
    buildSessionSummaryRows([
      { name: "Squat", loggedSetCount: 4, isSkipped: false, sets: [] },
      { name: "Lunge", loggedSetCount: 0, isSkipped: true, sets: [] },
      { name: "Curl", loggedSetCount: 1, isSkipped: true, sets: [] },
      { name: "Plank", loggedSetCount: 0, isSkipped: false, sets: [] },
    ]),
    [
      { name: "Squat", detail: "4 sets", state: "done" },
      { name: "Lunge", detail: "Skipped", state: "skipped" },
      { name: "Curl", detail: "Skipped · 1 set logged", state: "partial" },
    ],
  );
});

test("an empty session yields an empty summary", () => {
  assert.deepEqual(buildSessionSummaryDetails([]), { volumeLabel: null, topSet: null, rows: [] });
});
