import assert from "node:assert/strict";
import test from "node:test";
import { buildPlannedSetTargetSeriesSummary } from "./session-recap-target-series.ts";
import type { PlannedSetTarget } from "./set-flow-targets.ts";

function target(overrides: Partial<PlannedSetTarget>): PlannedSetTarget {
  return {
    setIndex: 1,
    role: "work",
    label: "Set 1 - Work",
    targetWeight: null,
    targetRepsMin: null,
    targetRepsMax: null,
    durationSeconds: null,
    distance: null,
    calories: null,
    ...overrides,
  };
}

test("formats planned set targets as slash-separated metric series", () => {
  const summary = buildPlannedSetTargetSeriesSummary({
    weightUnit: "lbs",
    targets: [
      target({ setIndex: 1, targetRepsMin: 8, targetRepsMax: 8, targetWeight: 100 }),
      target({ setIndex: 2, targetRepsMin: 8, targetRepsMax: 8, targetWeight: 80 }),
      target({ setIndex: 3, targetRepsMin: 8, targetRepsMax: 8, targetWeight: 75 }),
    ],
  });

  assert.equal(summary, "8 / 8 / 8 reps \u2022 100 / 80 / 75 lbs");
});

test("formats time and distance target series", () => {
  const summary = buildPlannedSetTargetSeriesSummary({
    distanceUnit: "mi",
    targets: [
      target({ setIndex: 1, durationSeconds: 180, distance: 0.5 }),
      target({ setIndex: 2, durationSeconds: 210, distance: 0.6 }),
    ],
  });

  assert.equal(summary, "3:00 / 3:30 \u2022 0.5 / 0.6 mi");
});
