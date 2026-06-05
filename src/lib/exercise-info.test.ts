import assert from "node:assert/strict";
import test from "node:test";

import { buildExerciseInfoReviewSections, buildExerciseInfoSurfaceMetrics } from "@/lib/exercise-info-presentation";

test("exercise info surface metrics prefer focused performance metrics plus scale", () => {
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
    ["Top Set", "Max Estimate", "Sessions", "Sets"],
  );
});

test("exercise info review sections explain progression in plain language", () => {
  const sections = buildExerciseInfoReviewSections({
    kind: "strength",
    lastSummary: "225 lbs x 5",
    bestSummary: "245 lbs x 3",
    prLabel: "Weight PR + Rep PR",
    prCount: 2,
    progressMetrics: [
      { label: "REPS", value: "2", valuePrefix: "\u2191", valueTone: "success" },
      { label: "30 Days", value: "4 sessions" },
    ],
  });

  assert.deepEqual(sections, [
    {
      title: "Last",
      items: ["225 lbs x 5"],
    },
    {
      title: "Best",
      items: ["245 lbs x 3"],
    },
    {
      title: "Progress",
      items: [
        "Weight PR + Rep PR",
        "Up 2 reps vs previous",
        "4 sessions in recent history",
      ],
    },
  ]);
});
