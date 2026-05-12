import test from "node:test";
import assert from "node:assert/strict";

import {
  deriveRepeatLastSetDraft,
  deriveSimpleSessionPrToast,
  formatSessionSetSummary,
} from "./session-set-entry.ts";

test("formatSessionSetSummary prefers strength-style summaries when reps and weight exist", () => {
  const summary = formatSessionSetSummary({
    weight: 185,
    reps: 5,
    duration_seconds: null,
    distance: null,
    distance_unit: null,
    calories: null,
    is_warmup: false,
    weight_unit: "lbs",
    set_index: 3,
  }, "lbs");

  assert.equal(summary, "185 lbs x 5");
});

test("deriveRepeatLastSetDraft preserves the last logged set values", () => {
  const draft = deriveRepeatLastSetDraft({
    weight: 135,
    reps: 8,
    duration_seconds: null,
    distance: null,
    distance_unit: null,
    calories: null,
    is_warmup: true,
    weight_unit: "kg",
    set_index: 2,
  }, "lbs");

  assert.deepEqual(draft, {
    weight: "135",
    reps: "8",
    duration: "",
    distance: "",
    distanceUnit: "mi",
    calories: "",
    weightUnit: "kg",
    isWarmup: true,
    summaryText: "135 kg x 8",
  });
});

test("deriveSimpleSessionPrToast reports a weight PR against prior weight sets", () => {
  const toast = deriveSimpleSessionPrToast({
    previousSets: [
      {
        weight: 135,
        reps: 5,
        duration_seconds: null,
        distance: null,
        distance_unit: null,
        calories: null,
        is_warmup: false,
        weight_unit: "lbs",
        set_index: 0,
      },
    ],
    candidate: {
      weight: 185,
      reps: 5,
      duration_seconds: null,
      distance: null,
      distance_unit: null,
      calories: null,
      is_warmup: false,
      weight_unit: "lbs",
      set_index: 1,
    },
    fallbackWeightUnit: "lbs",
  });

  assert.equal(toast, "Weight PR: 185 lbs x 5");
});

test("deriveSimpleSessionPrToast reports a rep PR for bodyweight sets", () => {
  const toast = deriveSimpleSessionPrToast({
    previousSets: [
      {
        weight: 0,
        reps: 10,
        duration_seconds: null,
        distance: null,
        distance_unit: null,
        calories: null,
        is_warmup: false,
        weight_unit: "lbs",
        set_index: 0,
      },
    ],
    candidate: {
      weight: 0,
      reps: 12,
      duration_seconds: null,
      distance: null,
      distance_unit: null,
      calories: null,
      is_warmup: false,
      weight_unit: "lbs",
      set_index: 1,
    },
    fallbackWeightUnit: "lbs",
  });

  assert.equal(toast, "Rep PR: 12 reps");
});

test("deriveRepeatLastSetDraft preserves cardio measurement values for Apply Last", () => {
  const source = {
    weight: 0,
    reps: 0,
    duration_seconds: 780,
    distance: 2.25,
    distance_unit: "km" as const,
    calories: 315,
    is_warmup: false,
    weight_unit: "lbs" as const,
    set_index: 0,
  };

  const draft = deriveRepeatLastSetDraft(source, "lbs");

  assert.deepEqual(draft, {
    weight: "",
    reps: "",
    duration: "13:00 s",
    distance: "2.25",
    distanceUnit: "km",
    calories: "315",
    weightUnit: "lbs",
    isWarmup: false,
    summaryText: "13:00 s • 2.3 km • 315 cal",
  });
  assert.deepEqual(source, {
    weight: 0,
    reps: 0,
    duration_seconds: 780,
    distance: 2.25,
    distance_unit: "km",
    calories: 315,
    is_warmup: false,
    weight_unit: "lbs",
    set_index: 0,
  });
});
