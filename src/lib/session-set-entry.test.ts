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

  assert.equal(summary, "185 lb x 5");
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

  assert.equal(toast, "Weight PR: 185 lb x 5");
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
