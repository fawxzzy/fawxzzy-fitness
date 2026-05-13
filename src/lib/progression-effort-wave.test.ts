import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeEffortWaveConfig,
  resolveEffectiveTargetForCycleDay,
  type EffortWaveConfig,
} from "@/lib/progression-effort-wave";
import type { ProgressionTargetPlan } from "@/lib/progression-playbooks";

function buildStrengthPlan(): ProgressionTargetPlan {
  return {
    measurementType: "reps",
    setsMin: 3,
    setsMax: 3,
    repsTarget: 8,
    repsMin: 8,
    repsMax: 12,
    weightMin: 135,
    weightMax: 135,
    weightUnit: "lbs",
  };
}

function buildTimePlan(): ProgressionTargetPlan {
  return {
    measurementType: "time",
    durationSeconds: 1200,
  };
}

function buildDistancePlan(): ProgressionTargetPlan {
  return {
    measurementType: "distance",
    distance: 2,
    distanceUnit: "mi",
  };
}

const ONE_STEP_CONFIG: EffortWaveConfig = {
  enabled: true,
  anchor: "routine_cycle",
  days: [
    { cycleDayIndex: 1, direction: "baseline" },
    { cycleDayIndex: 2, direction: "up" },
    { cycleDayIndex: 3, direction: "down" },
  ],
};

test("normalizeEffortWaveConfig keeps valid cycle days, defaults magnitude, and drops invalid rows", () => {
  assert.deepEqual(
    normalizeEffortWaveConfig({
      enabled: true,
      anchor: "routine_cycle",
      days: [
        { cycleDayIndex: 3, direction: "down" },
        { cycleDayIndex: 1, direction: "up", magnitude: "percent", percent: 10 },
        { cycleDayIndex: 0, direction: "baseline" },
      ],
    }),
    {
      enabled: true,
      anchor: "routine_cycle",
      days: [
        { cycleDayIndex: 1, direction: "up", magnitude: "percent", percent: 0.1 },
        { cycleDayIndex: 3, direction: "down", magnitude: "one_step", percent: null },
      ],
    },
  );
});

test("baseline day returns the stored baseline target unchanged", () => {
  const baseline = buildStrengthPlan();
  const result = resolveEffectiveTargetForCycleDay({
    plan: baseline,
    config: ONE_STEP_CONFIG,
    cycleDayIndex: 1,
    loadStep: 5,
    repStep: 1,
  });

  assert.deepEqual(result.effectiveTarget, baseline);
  assert.equal(result.changed, false);
  assert.equal(result.status, "baseline");
});

test("up day increases weighted strength targets by one load and rep step", () => {
  const baseline = buildStrengthPlan();
  const result = resolveEffectiveTargetForCycleDay({
    plan: baseline,
    config: ONE_STEP_CONFIG,
    cycleDayIndex: 2,
    loadStep: 5,
    repStep: 1,
  });

  assert.equal(result.effectiveTarget.weightMin, 140);
  assert.equal(result.effectiveTarget.weightMax, 140);
  assert.equal(result.effectiveTarget.repsMin, 9);
  assert.equal(result.effectiveTarget.repsMax, 13);
  assert.equal(result.changed, true);
  assert.deepEqual(baseline, buildStrengthPlan());
});

test("down day reduces weighted strength targets safely without mutating the baseline", () => {
  const baseline = buildStrengthPlan();
  const result = resolveEffectiveTargetForCycleDay({
    plan: baseline,
    config: ONE_STEP_CONFIG,
    cycleDayIndex: 3,
    loadStep: 5,
    repStep: 1,
  });

  assert.equal(result.effectiveTarget.weightMin, 130);
  assert.equal(result.effectiveTarget.weightMax, 130);
  assert.equal(result.effectiveTarget.repsMin, 7);
  assert.equal(result.effectiveTarget.repsMax, 11);
  assert.deepEqual(baseline, buildStrengthPlan());
});

test("percent wave mode adjusts supported primary targets without mutating the stored baseline", () => {
  const baseline = buildTimePlan();
  const result = resolveEffectiveTargetForCycleDay({
    plan: baseline,
    config: {
      enabled: true,
      anchor: "routine_cycle",
      days: [{ cycleDayIndex: 2, direction: "up", magnitude: "percent", percent: 10 }],
    },
    cycleDayIndex: 2,
  });

  assert.equal(result.effectiveTarget.durationSeconds, 1320);
  assert.equal(result.changed, true);
  assert.deepEqual(baseline, buildTimePlan());
});

test("distance waves use distance-safe precision for one-step changes", () => {
  const result = resolveEffectiveTargetForCycleDay({
    plan: buildDistancePlan(),
    config: ONE_STEP_CONFIG,
    cycleDayIndex: 2,
    distanceStep: 0.5,
  });

  assert.equal(result.effectiveTarget.distance, 2.5);
});

test("custom magnitude defers safely without mutating the baseline target", () => {
  const baseline = buildStrengthPlan();
  const result = resolveEffectiveTargetForCycleDay({
    plan: baseline,
    config: {
      enabled: true,
      anchor: "routine_cycle",
      days: [{ cycleDayIndex: 4, direction: "up", magnitude: "custom" }],
    },
    cycleDayIndex: 4,
    loadStep: 5,
    repStep: 1,
  });

  assert.equal(result.status, "unsupported");
  assert.equal(result.changed, false);
  assert.deepEqual(result.effectiveTarget, baseline);
});

test("invalid config or cycle day falls back to the baseline plan safely", () => {
  const baseline = buildStrengthPlan();
  const result = resolveEffectiveTargetForCycleDay({
    plan: baseline,
    config: {
      enabled: true,
      anchor: "routine_cycle",
      days: [{ cycleDayIndex: 2, direction: "up" }],
    },
    cycleDayIndex: null,
    loadStep: 5,
  });

  assert.equal(result.status, "baseline");
  assert.deepEqual(result.effectiveTarget, baseline);
});
