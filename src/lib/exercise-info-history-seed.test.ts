import assert from "node:assert/strict";
import test from "node:test";

import type { ExerciseBrowserRow } from "@/lib/exercises-browser";
import { buildExerciseInfoSeedFromHistoryRow } from "./exercise-info-history-seed.ts";

function makeExerciseBrowserRow(overrides: Partial<ExerciseBrowserRow> = {}): ExerciseBrowserRow {
  return {
    exerciseId: "exercise-1",
    name: "Back Squat",
    slug: "back-squat",
    image_path: null,
    image_icon_path: null,
    image_howto_path: null,
    how_to_short: "Brace and drive through the floor.",
    measurement_type: "reps",
    default_unit: "lbs",
    primary_muscle: "Quads",
    equipment: "Barbell",
    movement_pattern: "Squat",
    curation_tags: null,
    last_performed_at: "2026-06-01T12:00:00.000Z",
    last_weight: 225,
    last_reps: 5,
    last_unit: "lbs",
    pr_weight: 245,
    pr_reps: 3,
    pr_est_1rm: 270,
    actual_pr_weight: 245,
    actual_pr_reps: 3,
    actual_pr_at: "2026-05-25T12:00:00.000Z",
    kind: "strength",
    lastSummary: "225 lbs x 5",
    bestSummary: "Best: 245 lbs x 3",
    prLabel: "1 PR",
    prCount: 1,
    sessionCount: 14,
    setCount: 58,
    sessionsLast30Days: 4,
    detailedMetrics: [
      { label: "Sessions", value: "14" },
      { label: "Sets", value: "58" },
      { label: "Recent", value: "4", timeframe: "recent window" },
      { label: "PRs", value: "1" },
    ],
    detailSections: [
      { title: "Last", items: ["225 lbs x 5"] },
      { title: "Best", items: ["245 lbs x 3"] },
      { title: "Progress", items: ["-20 lbs vs best", "1 PR", "Last trained Jun 1"] },
    ],
    deltaFromBest: "-20 lbs vs best",
    tagsSummary: "Quads | Squat | Barbell",
    analyticsFamily: "strength-loaded",
    progressionSummary: null,
    ...overrides,
  };
}

test("buildExerciseInfoSeedFromHistoryRow seeds only stable summary metrics", () => {
  const seed = buildExerciseInfoSeedFromHistoryRow(makeExerciseBrowserRow());

  assert.equal(seed.exercise.exercise_id, "exercise-1");
  assert.equal(seed.exercise.name, "Back Squat");
  assert.equal(seed.stats?.exercise_id, "exercise-1");
  assert.equal(seed.stats?.presentationKind, "strength");
  assert.deepEqual(seed.stats?.surfaceMetrics?.map((metric) => metric.label), ["Sessions", "Sets", "Last", "Best"]);
  assert.deepEqual(seed.stats?.quickMetrics.map((metric) => metric.label), ["Sessions", "Sets", "Last", "Best"]);
  assert.deepEqual(seed.stats?.performanceMetrics, []);
  assert.deepEqual(seed.stats?.progress?.metrics, []);
  assert.deepEqual(seed.stats?.progress?.reviewSections, []);
  assert.deepEqual(seed.stats?.progress?.performances, []);
  assert.equal(seed.stats?.recent.lastSummary, "225 lbs x 5");
  assert.equal(seed.stats?.prCount, 1);
});
