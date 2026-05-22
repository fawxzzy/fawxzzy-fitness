import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PROGRESSION_PROMOTION_BASIS,
  getRepPromotionTarget,
  normalizeProgressionPromotionConfig,
  normalizePromotionBasis,
  normalizeRepPromotionThreshold,
  usesRepsForPromotion,
  usesWeightForPromotion,
} from "@/lib/progression-promotion";

test("top-of-range rep promotion target resolves to the range max", () => {
  assert.equal(getRepPromotionTarget({
    minReps: 8,
    maxReps: 12,
    thresholdType: "top_of_range",
  }), 12);
});

test("top-half rep promotion target rounds up across even and uneven ranges", () => {
  assert.equal(getRepPromotionTarget({
    minReps: 8,
    maxReps: 12,
    thresholdType: "top_half_of_range",
  }), 10);
  assert.equal(getRepPromotionTarget({
    minReps: 4,
    maxReps: 6,
    thresholdType: "top_half_of_range",
  }), 5);
});

test("promotion-basis helpers reflect which dimensions participate in promotion", () => {
  assert.equal(usesRepsForPromotion("weight_only"), false);
  assert.equal(usesWeightForPromotion("weight_only"), true);
  assert.equal(usesRepsForPromotion("reps_only"), true);
  assert.equal(usesWeightForPromotion("reps_only"), false);
  assert.equal(usesRepsForPromotion("weight_and_reps"), true);
  assert.equal(usesWeightForPromotion("weight_and_reps"), true);
});

test("missing promotion basis preserves the double-progression default behavior", () => {
  assert.equal(normalizePromotionBasis(undefined), DEFAULT_PROGRESSION_PROMOTION_BASIS);
  assert.equal(normalizeProgressionPromotionConfig({}).promotionBasis, DEFAULT_PROGRESSION_PROMOTION_BASIS);
});

test("invalid threshold and invalid custom target fall back safely", () => {
  assert.equal(normalizeRepPromotionThreshold("bad-threshold"), "top_of_range");
  assert.equal(getRepPromotionTarget({
    minReps: 8,
    maxReps: 12,
    thresholdType: "custom",
    customTarget: "bad",
  }), 12);
  assert.equal(getRepPromotionTarget({
    minReps: 8,
    maxReps: 12,
    thresholdType: "custom",
    customTarget: 13,
  }), 12);
});

test("custom threshold keeps a valid custom rep target", () => {
  assert.deepEqual(normalizeProgressionPromotionConfig({
    promotionBasis: "reps_only",
    repPromotionThreshold: "custom",
    customRepPromotionTarget: 9,
  }), {
    promotionBasis: "reps_only",
    repPromotionThreshold: "custom",
    customRepPromotionTarget: 9,
  });
  assert.equal(getRepPromotionTarget({
    minReps: 8,
    maxReps: 12,
    thresholdType: "custom",
    customTarget: 9,
  }), 9);
});

test("legacy custom threshold without a usable custom target falls back to top-of-range", () => {
  assert.deepEqual(normalizeProgressionPromotionConfig({
    repPromotionThreshold: "custom",
    customRepPromotionTarget: null,
  }), {
    promotionBasis: "weight_and_reps",
    repPromotionThreshold: "top_of_range",
    customRepPromotionTarget: null,
  });
});
