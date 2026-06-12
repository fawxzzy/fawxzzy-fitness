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
        {
          sessionId: "session-1",
          performedAt: "2026-06-04T12:00:00.000Z",
          label: "Wed",
          value: "225 lbs x 5",
          summary: "225 lbs x 5",
          context: "4 sets",
          setCount: 4,
          setSummaries: ["225 lbs x 5", "205 lbs x 8"],
          displayKind: "condensed-session",
        },
        { label: "Broken", value: { raw: "bad" } },
      ],
    },
    progression: {
      promotionCount: 2,
      currentTargetLabel: "3:00",
      latestChangeSummary: "Promoted by 15s",
      recentWindowDays: 30,
      recentEventCount: 2,
      recentPromotionCount: 2,
      recentActivitySummary: "2 updates | 2 promotions",
      recentFocusSummary: "2 promotions led recent changes",
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
      sessionId: "session-1",
      performedAt: "2026-06-04T12:00:00.000Z",
      label: "Wed",
      value: "225 lbs x 5",
      summary: "225 lbs x 5",
      context: "4 sets",
      setCount: 4,
      setSummaries: ["225 lbs x 5", "205 lbs x 8"],
      displayKind: "condensed-session",
    },
  ]);
  assert.equal(stats.progression?.promotionCount, 2);
  assert.equal(stats.progression?.currentTargetLabel, "3:00");
  assert.equal(stats.progression?.timelineSummary, null);
  assert.equal(stats.progression?.recentEventCount, 2);
  assert.equal(stats.progression?.recentActivitySummary, "2 updates | 2 promotions");
  assert.equal(stats.progression?.recentFocusSummary, "2 promotions led recent changes");
});

test("normalizeExerciseInfoStats preserves event-only regression history days", () => {
  const stats = normalizeExerciseInfoStats({
    kind: "strength",
    recent: {},
    totals: {},
    bests: {},
    prLabel: "",
    prCount: 0,
    quickMetrics: [],
    surfaceMetrics: [],
    progress: {
      graphMetricKey: "time",
      metrics: [],
      reviewSections: [],
      performances: [],
      historyGroups: [
        {
          id: "history-day-2026-05-01",
          dayKey: "2026-05-01",
          label: "May 1",
          performedAt: "2026-05-01T12:00:00.000Z",
          routineTitles: ["Base Routine"],
          signals: ["regression"],
          tagLabels: ["UPDATE", "MANUAL"],
          rows: [],
        },
      ],
      historyPoints: [
        {
          id: "day-2026-05-01",
          type: "day",
          performedAt: "2026-05-01T12:00:00.000Z",
          dayKey: "2026-05-01",
          label: "May 1",
          summary: "0 sets",
          numericValue: null,
          values: [{ label: "Sets", value: "0", numericValue: 0 }],
          signals: ["regression"],
          tagLabels: ["UPDATE", "MANUAL"],
        },
      ],
    },
  });

  assert.deepEqual(stats?.progress?.historyGroups?.[0], {
    id: "history-day-2026-05-01",
    dayKey: "2026-05-01",
    label: "May 1",
    performedAt: "2026-05-01T12:00:00.000Z",
    routineTitles: ["Base Routine"],
    signals: ["regression"],
    tagLabels: ["MANUAL"],
    rows: [],
  });
  assert.equal(stats?.progress?.graphMetricKey, "time");
  assert.equal(stats?.progress?.historyPoints?.[0]?.signals?.[0], "regression");
  assert.deepEqual(stats?.progress?.historyPoints?.[0]?.tagLabels, ["MANUAL"]);
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
