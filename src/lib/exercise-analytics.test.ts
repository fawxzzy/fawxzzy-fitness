import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCardioDeltaFromBest,
  buildCardioProgressDelta,
  buildStrengthDeltaFromBest,
  buildStrengthProgressDelta,
} from "./exercise-analytics.ts";
import { deriveSessionAnalytics } from "./session-analytics.ts";

test("deriveSessionAnalytics computes volume, completion, and best lift", () => {
  const analytics = deriveSessionAnalytics([
    {
      exerciseId: "squat",
      sets: [
        { weight: 185, reps: 5, weightUnit: "lb" },
        { weight: 205, reps: 3, weightUnit: "lb" },
      ],
    },
    {
      exerciseId: "hinge",
      isSkipped: true,
      sets: [],
    },
    {
      exerciseId: "lunge",
      sets: [],
    },
  ]);

  assert.equal(analytics.totalVolume, (185 * 5) + (205 * 3));
  assert.equal(analytics.completionRate, 2 / 3);
  assert.equal(analytics.hasSetData, true);
  assert.deepEqual(analytics.bestLift, {
    exerciseId: "squat",
    weight: 205,
    reps: 3,
    unit: "lb",
  });
});

test("strength delta helpers compare best and previous performance", () => {
  assert.equal(
    buildStrengthDeltaFromBest({
      bestWeight: 205,
      bestRepsAtBestWeight: 3,
      lastWeight: 210,
      lastReps: 2,
      unit: "lb",
      bestBodyweightReps: 0,
      lastBodyweightReps: 0,
    }),
    "+5lb vs best",
  );

  assert.equal(
    buildStrengthProgressDelta(
      { weight: 210, reps: 2, unit: "lb", bodyweightReps: 0 },
      { weight: 205, reps: 3, unit: "lb", bodyweightReps: 0 },
    ),
    "+5lb vs previous",
  );
});

test("cardio delta helpers compare best and previous performance", () => {
  assert.equal(
    buildCardioDeltaFromBest({
      latest: {
        durationSeconds: 1800,
        distance: 2.1,
        distanceUnit: "mi",
        calories: 240,
      },
      best: {
        durationSeconds: 1700,
        distance: 1.9,
        distanceUnit: "mi",
        calories: 230,
      },
      measurementType: "distance",
    }),
    "+0.2mi vs best",
  );

  assert.equal(
    buildCardioProgressDelta(
      {
        durationSeconds: 1800,
        distance: 2.1,
        distanceUnit: "mi",
        calories: 240,
      },
      {
        durationSeconds: 1500,
        distance: 1.9,
        distanceUnit: "mi",
        calories: 220,
      },
      "time_distance",
    ),
    "+5m vs previous",
  );
});
