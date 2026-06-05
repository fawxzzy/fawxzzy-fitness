import assert from "node:assert/strict";
import test from "node:test";

import type { SessionSummary } from "@/app/history/session-summary";
import type { ExerciseBrowserRow } from "@/lib/exercises-browser";
import {
  buildExerciseMetricTagGroup,
  buildExerciseMetricTagValues,
  buildSessionMetricTagGroup,
  buildSessionMetricTagValues,
} from "./history-metric-filters.ts";

function makeExerciseBrowserRow(overrides: Partial<ExerciseBrowserRow> = {}): ExerciseBrowserRow {
  return {
    exerciseId: "exercise-1",
    name: "Exercise",
    slug: "exercise",
    image_path: null,
    image_icon_path: null,
    image_howto_path: null,
    how_to_short: null,
    measurement_type: null,
    default_unit: null,
    primary_muscle: null,
    equipment: null,
    movement_pattern: null,
    curation_tags: null,
    last_performed_at: null,
    last_weight: null,
    last_reps: null,
    last_unit: null,
    pr_weight: null,
    pr_reps: null,
    pr_est_1rm: null,
    actual_pr_weight: null,
    actual_pr_reps: null,
    actual_pr_at: null,
    kind: "strength",
    lastSummary: null,
    bestSummary: null,
    prLabel: "",
    prCount: 0,
    sessionCount: 0,
    setCount: 0,
    sessionsLast30Days: 0,
    detailedMetrics: [],
    detailSections: [],
    deltaFromBest: null,
    tagsSummary: null,
    analyticsFamily: "strength-loaded",
    progressionSummary: null,
    ...overrides,
  };
}

function makeSessionSummary(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    id: "session-1",
    startedAt: "2026-05-01T12:00:00.000Z",
    routineTitle: "Lower Rotation",
    dayTitle: "Day 1",
    exerciseNames: ["Back Squat"],
    prExerciseNames: [],
    durationSec: 2700,
    exerciseCount: 1,
    setCount: 5,
    repCount: 25,
    prCounts: { weight: 0, reps: 0, total: 0 },
    prLabel: "",
    totalVolume: 4500,
    volumeUnit: "lbs",
    completionRate: 1,
    hasNote: false,
    hasSetData: true,
    progressionSummary: null,
    ...overrides,
  };
}

test("exercise metric tags follow tracked dimensions for each history family", () => {
  assert.deepEqual(
    buildExerciseMetricTagValues(makeExerciseBrowserRow({
      analyticsFamily: "strength-loaded",
      prCount: 1,
      progressionSummary: {
        eventCount: 1,
        promotionCount: 1,
        deloadCount: 0,
        manualChangeCount: 0,
        revertCount: 0,
        lockInCount: 0,
        linkedSessionCount: 1,
        distinctExerciseCount: 1,
        firstChangeAt: "2026-05-01T12:00:00.000Z",
        latestChangeAt: "2026-05-01T12:00:00.000Z",
        lastPromotionAt: "2026-05-01T12:00:00.000Z",
        firstTargetLabel: "10 reps",
        currentTargetLabel: "12 reps",
        latestChangeSummary: "10 reps -> 12 reps",
        latestEventLabel: "Promotion",
        timelineSummary: "10 reps -> 12 reps",
        lifelineItems: ["Latest: 10 reps -> 12 reps"],
      },
    })).sort(),
    ["metric:load", "metric:progression", "metric:prs", "metric:reps"].sort(),
  );

  assert.deepEqual(
    buildExerciseMetricTagValues(makeExerciseBrowserRow({
      analyticsFamily: "cardio-distance",
      kind: "cardio",
    })).sort(),
    ["metric:distance", "metric:duration", "metric:pace"].sort(),
  );

  assert.deepEqual(
    buildExerciseMetricTagValues(makeExerciseBrowserRow({
      analyticsFamily: "cardio-steps",
      kind: "cardio",
    })).sort(),
    ["metric:duration", "metric:steps"].sort(),
  );
});

test("exercise metric group only exposes metrics present in the current rows", () => {
  const group = buildExerciseMetricTagGroup([
    makeExerciseBrowserRow({ analyticsFamily: "strength-bodyweight" }),
    makeExerciseBrowserRow({ analyticsFamily: "timed-hold", kind: "cardio" }),
  ]);

  assert.equal(group?.label, "Metrics");
  assert.deepEqual(group?.tags.map((tag) => tag.label), ["Duration", "Reps"]);
});

test("session metric tags expose only meaningful analytics signals", () => {
  assert.deepEqual(
    buildSessionMetricTagValues(makeSessionSummary({
      prCounts: { weight: 1, reps: 0, total: 1 },
      progressionSummary: {
        eventCount: 2,
        promotionCount: 1,
        deloadCount: 0,
        manualChangeCount: 0,
        revertCount: 0,
        lockInCount: 0,
        linkedSessionCount: 1,
        distinctExerciseCount: 1,
        firstChangeAt: "2026-05-01T12:00:00.000Z",
        latestChangeAt: "2026-05-01T12:00:00.000Z",
        lastPromotionAt: "2026-05-01T12:00:00.000Z",
        affectedExerciseNames: ["Back Squat"],
        headline: "1 promotion applied",
        detail: "Back Squat",
      },
    })).sort(),
    ["metric:completion", "metric:duration", "metric:progression", "metric:prs", "metric:reps", "metric:volume"].sort(),
  );

  assert.deepEqual(
    buildSessionMetricTagValues(makeSessionSummary({
      durationSec: undefined,
      repCount: 0,
      totalVolume: 0,
      completionRate: undefined,
    })),
    [],
  );
});

test("session metric group keeps session metrics separate from highlight tags", () => {
  const group = buildSessionMetricTagGroup([
    makeSessionSummary(),
    makeSessionSummary({ durationSec: undefined, totalVolume: 0, repCount: 0, completionRate: undefined }),
  ]);

  assert.equal(group?.label, "Metrics");
  assert.deepEqual(group?.tags.map((tag) => tag.label), ["Completion", "Duration", "Reps", "Volume"]);
});
