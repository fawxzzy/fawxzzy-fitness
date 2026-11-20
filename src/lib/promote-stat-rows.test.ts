import assert from "node:assert/strict";
import test from "node:test";
import { buildPromoteStatRows } from "./promote-stat-rows.ts";

test("buildPromoteStatRows: reps goal shows Sets, Reps and Weight in order, before -> after", () => {
  assert.deepEqual(
    buildPromoteStatRows(
      { measurementType: "reps", setsMin: 4, setsMax: 4, repsTarget: 5, weightMin: 225, weightMax: 225, weightUnit: "lbs" },
      { measurementType: "reps", setsMin: 4, setsMax: 4, repsTarget: 5, weightMin: 230, weightMax: 230, weightUnit: "lbs" },
    ),
    [
      { label: "Sets", from: "4", to: "4" },
      { label: "Reps", from: "5", to: "5" },
      { label: "Weight", from: "225 lbs", to: "230 lbs" },
    ],
  );
});

test("buildPromoteStatRows: ranges use an en dash, a missing side shows a dash, empty stats are left out", () => {
  assert.deepEqual(
    buildPromoteStatRows(
      { measurementType: "reps", setsMin: 3, setsMax: 3, repsMin: 8, repsMax: 10, weightMin: 60, weightMax: 62.5, weightUnit: "kg" },
      { measurementType: "reps", setsMin: 3, setsMax: 3, repsMin: 10, repsMax: 12 },
    ),
    [
      { label: "Sets", from: "3", to: "3" },
      { label: "Reps", from: "8–10", to: "10–12" },
      { label: "Weight", from: "60–62.5 kg", to: "–" },
    ],
  );
});

test("buildPromoteStatRows: timed and cardio goals use clock, distance and calories; no Target wording", () => {
  const rows = buildPromoteStatRows(
    { measurementType: "time_distance", durationSeconds: 1080, distance: 2, distanceUnit: "mi", calories: 200 },
    { measurementType: "time_distance", durationSeconds: 1110, distance: 2.5, distanceUnit: "mi", calories: 200 },
  );
  assert.deepEqual(rows.map((row) => row.label), ["Time", "Distance", "Calories"]);
  assert.deepEqual(rows[0], { label: "Time", from: "18:00", to: "18:30" });
  assert.equal(rows[1].to.endsWith("mi"), true);
  assert.doesNotMatch(JSON.stringify(rows), /target/i);
});

test("buildPromoteStatRows: no plans gives no rows", () => {
  assert.deepEqual(buildPromoteStatRows(null, null), []);
});
