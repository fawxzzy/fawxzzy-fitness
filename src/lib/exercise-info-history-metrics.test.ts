import assert from "node:assert/strict";
import test from "node:test";
import { buildHistoryPointComparisonMetric } from "@/lib/exercise-info-history-metrics";

const setPoints = [
  {
    id: "set-oldest",
    type: "set" as const,
    performedAt: "2026-06-01T12:00:00.000Z",
    numericValue: 135,
    values: [{ label: "Weight", value: "135 lbs", numericValue: 135 }],
  },
  {
    id: "set-middle",
    type: "set" as const,
    performedAt: "2026-06-05T12:00:00.000Z",
    numericValue: 145,
    values: [{ label: "Weight", value: "145 lbs", numericValue: 145 }],
  },
  {
    id: "set-latest",
    type: "set" as const,
    performedAt: "2026-06-08T12:00:00.000Z",
    numericValue: 155,
    values: [{ label: "Weight", value: "155 lbs", numericValue: 155 }],
  },
];

test("buildHistoryPointComparisonMetric compares latest logged set to previous set by default", () => {
  assert.deepEqual(buildHistoryPointComparisonMetric({ points: setPoints }), {
    label: "Vs Previous",
    value: "10 lbs",
    valuePrefix: "\u2191",
    valueTone: "success",
  });
});

test("buildHistoryPointComparisonMetric compares a selected set point to the set before it", () => {
  assert.deepEqual(buildHistoryPointComparisonMetric({ points: setPoints, selectedPoint: setPoints[1] }), {
    label: "Vs Previous",
    value: "10 lbs",
    valuePrefix: "\u2191",
    valueTone: "success",
  });
});

test("buildHistoryPointComparisonMetric compares a selected day point to the day before it", () => {
  const dayPoints = [
    {
      id: "day-1",
      type: "day" as const,
      performedAt: "2026-06-01T12:00:00.000Z",
      numericValue: 120,
      values: [{ label: "Time", value: "2:00", numericValue: 120 }],
    },
    {
      id: "day-2",
      type: "day" as const,
      performedAt: "2026-06-08T12:00:00.000Z",
      numericValue: 180,
      values: [{ label: "Time", value: "3:00", numericValue: 180 }],
    },
  ];

  assert.deepEqual(buildHistoryPointComparisonMetric({ points: dayPoints, selectedPoint: dayPoints[1] }), {
    label: "Vs Previous",
    value: "1:00",
    valuePrefix: "\u2191",
    valueTone: "success",
  });
});

test("buildHistoryPointComparisonMetric returns a decrease when the selected point is below the previous point", () => {
  const dayPoints = [
    {
      id: "day-1",
      type: "day" as const,
      performedAt: "2026-06-01T12:00:00.000Z",
      numericValue: 180,
      values: [{ label: "Time", value: "3:00", numericValue: 180 }],
    },
    {
      id: "day-2",
      type: "day" as const,
      performedAt: "2026-06-08T12:00:00.000Z",
      numericValue: 120,
      values: [{ label: "Time", value: "2:00", numericValue: 120 }],
    },
  ];

  assert.deepEqual(buildHistoryPointComparisonMetric({ points: dayPoints, selectedPoint: dayPoints[1] }), {
    label: "Vs Previous",
    value: "1:00",
    valuePrefix: "\u2193",
    valueTone: "danger",
  });
});
