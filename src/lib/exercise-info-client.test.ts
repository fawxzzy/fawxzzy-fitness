import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeExerciseInfoClientPayload,
  normalizeExerciseInfoStats,
} from "@/lib/exercise-info-client";

test("normalizeExerciseInfoStats strips malformed nested analytics entries", () => {
  const stats = normalizeExerciseInfoStats({
    kind: "strength",
    recent: {
      lastPerformedAt: "2026-06-05",
      lastSummary: "225 lbs x 5",
    },
    totals: {
      sessions: 8,
      sets: 24,
    },
    bests: {
      bestSetSummary: "245 lbs x 3",
    },
    prLabel: "Rep PR",
    prCount: 1,
    quickMetrics: [
      { label: "Last", value: "225 lbs x 5" },
      { label: "PRs", value: "1" },
      { label: null, value: "bad" },
    ],
    surfaceMetrics: [
      { label: "Top Set", value: "245 lbs x 3" },
      { label: "Broken", value: { raw: "bad" } },
    ],
    progress: {
      metrics: [
        { label: "Vs Previous", value: "+10 lbs" },
        { label: "Broken", value: { raw: "bad" } },
      ],
      reviewSections: [
        { title: "Progress", items: ["Matched | best", { raw: "bad" }, "1 Rep PR"] },
      ],
      performances: [
        { label: "Wed", value: "225 lbs x 5", context: "4 sets" },
        { label: "Broken", value: { raw: "bad" } },
      ],
    },
    progression: {
      promotionCount: 2,
      currentTargetLabel: "3:00",
      latestChangeSummary: "Promoted by 15s",
      timelineSummary: { raw: "bad" },
    },
  });

  assert.ok(stats);
  assert.deepEqual(stats.surfaceMetrics?.map((item) => item.label), ["Top Set"]);
  assert.deepEqual(stats.progress?.metrics?.map((item) => item.label), ["Vs Previous"]);
  assert.deepEqual(stats.progress?.reviewSections, [
    {
      title: "Progress",
      items: ["Matched | best", "1 Rep PR"],
    },
  ]);
  assert.deepEqual(stats.progress?.performances, [
    {
      label: "Wed",
      value: "225 lbs x 5",
      context: "4 sets",
    },
  ]);
  assert.equal(stats.progression?.promotionCount, 2);
  assert.equal(stats.progression?.currentTargetLabel, "3:00");
  assert.equal(stats.progression?.timelineSummary, null);
});

test("normalizeExerciseInfoClientPayload rejects incomplete exercise payloads", () => {
  assert.equal(
    normalizeExerciseInfoClientPayload({
      exercise: {
        id: "",
        name: "Air Bike",
      },
      stats: null,
    }),
    null,
  );
});
