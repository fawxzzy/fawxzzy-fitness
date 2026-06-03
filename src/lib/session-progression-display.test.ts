import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveSessionProgressionSelectedMetrics,
  getSessionVisiblePromotionStepFieldIds,
} from "@/lib/session-progression-display";

test("deriveSessionProgressionSelectedMetrics uses shared active-target detection", () => {
  const selectedMetrics = deriveSessionProgressionSelectedMetrics({
    measurementType: "reps",
    repsTarget: 8,
    weightMin: 225,
    calories: 100,
  });

  assert.deepEqual([...selectedMetrics], ["reps", "weight", "calories"]);
});

test("deriveSessionProgressionSelectedMetrics hides measurements for measurementless targets", () => {
  const selectedMetrics = deriveSessionProgressionSelectedMetrics({
    measurementType: "none",
    repsTarget: 8,
    weightMin: 225,
    durationSeconds: 300,
  });

  assert.deepEqual([...selectedMetrics], []);
});

test("getSessionVisiblePromotionStepFieldIds keeps only active cardio session measurements", () => {
  const visibleFields = getSessionVisiblePromotionStepFieldIds({
    progressionStepPolicy: {
      kind: "pace_or_volume",
      equipmentFamily: "cardio",
      label: "Cardio step",
      defaultValue: 30,
      unit: "pace/volume",
      description: "Cardio progression",
      source: "app_fallback",
    },
    selectedMetrics: new Set(["time"]),
  });

  assert.deepEqual(visibleFields, ["duration"]);
});
