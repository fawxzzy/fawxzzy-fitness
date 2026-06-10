import assert from "node:assert/strict";
import test from "node:test";

import { buildCardioPrReviewItems } from "@/lib/cardio-pr-history";
import { curateExerciseInfoPerformanceMetrics } from "@/lib/exercise-info";
import { buildObservedMeasurementMetrics } from "@/lib/exercise-info-measurement-metrics";
import { buildExerciseInfoReviewSections, buildExerciseInfoSurfaceMetrics } from "@/lib/exercise-info-presentation";
import { buildStrengthPerformanceMetrics } from "@/lib/exercise-info-strength-performance";
import { buildStrengthProgressMetrics } from "@/lib/exercise-info-strength-progress";

test("exercise info surface metrics stay on summary-only metrics", () => {
  const metrics = buildExerciseInfoSurfaceMetrics({
    quickMetrics: [
      { label: "Last", value: "225 lbs x 5" },
      { label: "Best", value: "245 lbs x 3" },
      { label: "PRs", value: "2" },
      { label: "Sessions", value: "7" },
      { label: "Sets", value: "32" },
    ],
    performanceMetrics: [
      { label: "Top Set", value: "245 lbs x 3" },
      { label: "Max Estimate", value: "270 lbs" },
      { label: "Last", value: "Jun 4", timeframe: "225 lbs x 5" },
    ],
    progressMetrics: [
      { label: "REPS", value: "2", valuePrefix: "\u2191", valueTone: "success" },
      { label: "30 Days", value: "4 sessions" },
    ],
  });

  assert.deepEqual(
    metrics.map((item) => item.label),
    ["Sessions", "Sets", "Last", "Best"],
  );
});

test("exercise info review sections explain progression in plain language", () => {
  const sections = buildExerciseInfoReviewSections({
    prLabel: "Weight PR + Rep PR",
    prCount: 2,
    prItems: [
      "Weight PR | 225 lbs x 5 | Jun 4",
      "Rep PR | 12 reps | Jun 1",
    ],
  });

  assert.deepEqual(sections, [
    {
      title: "PR History",
      items: [
        {
          id: "pr-history-0",
          primary: "Jun 4 | Weight PR 225 lbs x 5",
          signals: "pr",
          layout: "single-column",
        },
        {
          id: "pr-history-1",
          primary: "Jun 1 | Rep PR 12 reps",
          signals: "pr",
          layout: "single-column",
        },
      ],
    },
  ]);
});

test("exercise info review sections group same-day PR items into a single dated row", () => {
  const sections = buildExerciseInfoReviewSections({
    prLabel: "Time PR + Distance PR",
    prCount: 2,
    prItems: [
      "Distance PR | 2 mi | May 30",
      "Time PR | 9:00 | May 30",
    ],
  });

  assert.deepEqual(sections, [
    {
      title: "PR History",
      items: [
        {
          id: "pr-history-0",
          primary: "May 30 | Distance PR 2 mi | Time PR 9:00",
          signals: "pr",
          layout: "single-column",
        },
      ],
    },
  ]);
});

test("exercise info review sections omit duplicate trend recap rows", () => {
  const sections = buildExerciseInfoReviewSections({
    prLabel: "",
    prCount: 0,
  });

  assert.deepEqual(sections, []);
});

test("exercise info review sections omit generic PR fallback rows when no dated PR history exists", () => {
  const sections = buildExerciseInfoReviewSections({
    prLabel: "1 PR",
    prCount: 1,
  });

  assert.deepEqual(sections, []);
});

test("cardio exercise info builds dated PR history items", () => {
  const items = buildCardioPrReviewItems({
    family: "cardio-endurance",
    sessionAggregates: [
      {
        performedAt: "2026-05-27T12:00:00.000Z",
        durationSeconds: 180,
        distance: 1,
        distanceUnit: "mi",
        calories: 120,
      },
      {
        performedAt: "2026-05-30T12:00:00.000Z",
        durationSeconds: 540,
        distance: 2,
        distanceUnit: "mi",
        calories: 220,
      },
    ],
  });

  assert.deepEqual(items, [
    "Distance PR | 2 mi | May 30",
    "Time PR | 9:00 | May 30",
    "Distance PR | 1 mi | May 27",
    "Time PR | 3:00 | May 27",
    "Pace PR | 3:00/mi | May 27",
  ]);
});

test("loaded strength performance metrics always expose weight and reps dimensions", () => {
  const metrics = buildStrengthPerformanceMetrics({
    family: "strength-loaded",
    rows: [
      {
        performedAt: "2026-05-18T02:32:18.931471+00:00",
        weight: 80,
        reps: 8,
        weightUnit: "lbs",
      },
    ],
    bestWeight: 80,
    bestWeightedReps: 8,
    bestBodyweightReps: 0,
    bestSetSummary: "80 lbs x 8",
    prEst1rm: null,
    unit: "lbs",
  });

  assert.deepEqual(metrics, [
    { label: "Best Weight", value: "80 lbs" },
    { label: "Best Reps", value: "8 reps" },
    { label: "Top Set", value: "80 lbs x 8" },
  ]);
});

test("loaded strength performance metrics keep summary metrics after dimension metrics", () => {
  const metrics = buildStrengthPerformanceMetrics({
    family: "strength-loaded",
    rows: [
      {
        performedAt: "2026-06-02T00:00:33.323414+00:00",
        weight: 225,
        reps: 4,
        weightUnit: "lbs",
      },
      {
        performedAt: "2026-04-28T03:58:18.808350+00:00",
        weight: 135,
        reps: 10,
        weightUnit: "lbs",
      },
    ],
    bestWeight: 225,
    bestWeightedReps: 10,
    bestBodyweightReps: 0,
    bestSetSummary: "225 lbs x 6",
    prEst1rm: 270,
    unit: "lbs",
  });

  assert.deepEqual(metrics, [
    { label: "Best Weight", value: "225 lbs" },
    { label: "Best Reps", value: "10 reps" },
    { label: "Top Set", value: "225 lbs x 6" },
    { label: "Max Estimate", value: "270 lbs" },
  ]);
});

test("bodyweight performance metrics stay on ceilings instead of recent volume totals", () => {
  const metrics = buildStrengthPerformanceMetrics({
    family: "strength-bodyweight",
    rows: [
      {
        performedAt: "2026-06-02T00:00:33.323414+00:00",
        weight: 25,
        reps: 5,
        weightUnit: "lbs",
      },
      {
        performedAt: "2026-05-28T03:58:18.808350+00:00",
        weight: 0,
        reps: 12,
        weightUnit: "lbs",
      },
    ],
    bestWeight: 25,
    bestWeightedReps: 5,
    bestBodyweightReps: 12,
    bestSetSummary: "12 reps",
    prEst1rm: null,
    unit: "lbs",
  });

  assert.deepEqual(metrics, [
    { label: "Best Reps", value: "12 reps" },
    { label: "Added Load", value: "25 lbs" },
  ]);
});

test("loaded strength progress metrics omit raw current values when no previous session exists", () => {
  const metrics = buildStrengthProgressMetrics({
    latest: {
      weight: 80,
      reps: 8,
      unit: "lbs",
      bodyweightReps: 0,
    },
    previous: null,
  });

  assert.deepEqual(metrics, []);
});

test("loaded strength progress metrics show deltas when previous weighted session exists", () => {
  const metrics = buildStrengthProgressMetrics({
    latest: {
      weight: 225,
      reps: 4,
      unit: "lbs",
      bodyweightReps: 0,
    },
    previous: {
      weight: 215,
      reps: 2,
      unit: "lbs",
      bodyweightReps: 0,
    },
  });

  assert.deepEqual(metrics, [
    { label: "Reps", value: "2", valuePrefix: "\u2191", valueTone: "success" },
    { label: "Weight", value: "10 lbs", valuePrefix: "\u2191", valueTone: "success" },
  ]);
});

test("bodyweight strength progress metrics stay empty with only one logged session", () => {
  const metrics = buildStrengthProgressMetrics({
    latest: {
      weight: 0,
      reps: 8,
      unit: "lbs",
      bodyweightReps: 8,
    },
    previous: null,
  });

  assert.deepEqual(metrics, []);
});

test("observed measurement metrics surface logged auxiliary measurements that family metrics do not cover", () => {
  const metrics = buildObservedMeasurementMetrics({
    rows: [
      {
        reps: 10,
        weight: 40,
        weightUnit: "lbs",
        durationSeconds: 300,
        distance: 1,
        distanceUnit: "mi",
        calories: 120,
      },
    ],
    existingMetrics: [
      { label: "Best Time", value: "5:00" },
      { label: "Best Distance", value: "1 mi" },
    ],
  });

  assert.deepEqual(metrics, [
    { label: "Best Weight", value: "40 lbs" },
    { label: "Best Reps", value: "10 reps" },
    { label: "Best Calories", value: "120 cal" },
  ]);
});

test("exercise info performance metrics drop summary duplicates when unique metrics remain", () => {
  const metrics = curateExerciseInfoPerformanceMetrics({
    metrics: [
      { label: "Best Weight", value: "225 lbs" },
      { label: "Best Reps", value: "10 reps" },
      { label: "Top Set", value: "225 lbs x 6" },
      { label: "Max Estimate", value: "270 lbs" },
    ],
    lastSummary: "205 lbs x 5",
    bestSummary: "225 lbs x 6",
  });

  assert.deepEqual(metrics, [
    { label: "Best Weight", value: "225 lbs" },
    { label: "Best Reps", value: "10 reps" },
    { label: "Max Estimate", value: "270 lbs" },
  ]);
});

test("exercise info performance metrics keep duplicate summary values when they are the only signal", () => {
  const metrics = curateExerciseInfoPerformanceMetrics({
    metrics: [
      { label: "Best Reps", value: "8 reps" },
    ],
    lastSummary: "7 reps",
    bestSummary: "8 reps",
  });

  assert.deepEqual(metrics, [
    { label: "Best Reps", value: "8 reps" },
  ]);
});
