import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSteppedTargetSequence,
  clampTargetToRange,
  getNextSteppedTarget,
  isAtRangeTop,
  normalizeMeasurementRange,
  normalizeStepSize,
  resolveRangeStart,
  resolveRangeTop,
} from "@/lib/progression-measurement-steps";

test("normalizes positive step sizes and rejects invalid ones", () => {
  assert.equal(normalizeStepSize(2), 2);
  assert.equal(normalizeStepSize(0.25), 0.25);
  assert.equal(normalizeStepSize(0), null);
  assert.equal(normalizeStepSize(-1), null);
  assert.equal(normalizeStepSize(null), null);
});

test("normalizes measurement ranges and swaps reversed bounds", () => {
  assert.deepEqual(normalizeMeasurementRange({ min: 8, max: 12 }), { min: 8, max: 12 });
  assert.deepEqual(normalizeMeasurementRange({ min: 13, max: 8 }), { min: 8, max: 13 });
  assert.deepEqual(normalizeMeasurementRange({ min: null, max: 10 }), { min: 10, max: 10 });
  assert.equal(normalizeMeasurementRange({ min: 0, max: null }), null);
});

test("resolves range start and top with fallback behavior", () => {
  assert.equal(resolveRangeStart({ min: 8, max: 12 }), 8);
  assert.equal(resolveRangeTop({ min: 8, max: 12 }), 12);
  assert.equal(resolveRangeStart(null, 5), 5);
  assert.equal(resolveRangeTop(null, 7), 7);
});

test("reps 8-12 step 2 returns 10 from 8", () => {
  assert.equal(getNextSteppedTarget({
    current: 8,
    range: { min: 8, max: 12 },
    step: 2,
  }), 10);
});

test("reps 8-13 step 2 sequence clamps at the top", () => {
  assert.deepEqual(buildSteppedTargetSequence({
    start: 8,
    range: { min: 8, max: 13 },
    step: 2,
  }), [8, 10, 12, 13]);
});

test("overshoot clamps to range top", () => {
  assert.equal(getNextSteppedTarget({
    current: 12,
    range: { min: 8, max: 13 },
    step: 2,
  }), 13);
});

test("exact top remains at the top", () => {
  assert.equal(getNextSteppedTarget({
    current: 13,
    range: { min: 8, max: 13 },
    step: 2,
  }), 13);
  assert.equal(isAtRangeTop({
    current: 13,
    range: { min: 8, max: 13 },
  }), true);
});

test("current below range min starts safely at the bottom", () => {
  assert.equal(getNextSteppedTarget({
    current: 6,
    range: { min: 8, max: 13 },
    step: 2,
  }), 10);
});

test("invalid range falls back safely without NaN", () => {
  assert.equal(getNextSteppedTarget({
    current: 10,
    range: { min: 0, max: null },
    step: 2,
    fallback: 9,
  }), 10);
  assert.equal(getNextSteppedTarget({
    current: null,
    range: { min: 0, max: null },
    step: 2,
    fallback: null,
  }), null);
});

test("invalid step keeps the current clamped target", () => {
  assert.equal(getNextSteppedTarget({
    current: 10,
    range: { min: 8, max: 13 },
    step: 0,
  }), 10);
});

test("time stepping works with positive integer targets", () => {
  assert.equal(getNextSteppedTarget({
    current: 30,
    range: { min: 30, max: 60 },
    step: 15,
  }), 45);
});

test("distance stepping supports decimals", () => {
  assert.equal(getNextSteppedTarget({
    current: 1,
    range: { min: 1, max: 1.5 },
    step: 0.25,
  }), 1.25);
});

test("weight stepping supports decimals", () => {
  assert.equal(getNextSteppedTarget({
    current: 22.5,
    range: { min: 22.5, max: 27.5 },
    step: 2.5,
  }), 25);
});

test("calories stepping works", () => {
  assert.equal(getNextSteppedTarget({
    current: 100,
    range: { min: 100, max: 140 },
    step: 20,
  }), 120);
});

test("clampTargetToRange stays within bounds", () => {
  assert.equal(clampTargetToRange({
    value: 6,
    range: { min: 8, max: 12 },
  }), 8);
  assert.equal(clampTargetToRange({
    value: 14,
    range: { min: 8, max: 12 },
  }), 12);
  assert.equal(clampTargetToRange({
    value: 10,
    range: { min: 8, max: 12 },
  }), 10);
});

test("zero follows current target conventions and is treated as inactive", () => {
  assert.equal(resolveRangeStart({ min: 0, max: 12 }), 12);
  assert.equal(getNextSteppedTarget({
    current: 0,
    range: { min: 8, max: 12 },
    step: 2,
  }), 10);
});

test("input objects are not mutated", () => {
  const range = { min: 8, max: 13 };
  const input = {
    current: 8,
    range,
    step: 2,
    fallback: 8,
  };
  const rangeSnapshot = structuredClone(range);
  const inputSnapshot = structuredClone(input);

  void getNextSteppedTarget(input);
  void buildSteppedTargetSequence({ start: 8, range, step: 2 });

  assert.deepEqual(range, rangeSnapshot);
  assert.deepEqual(input, inputSnapshot);
});
