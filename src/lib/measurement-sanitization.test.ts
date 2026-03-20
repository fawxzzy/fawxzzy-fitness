import test from "node:test";
import assert from "node:assert/strict";

import { sanitizeEnabledMeasurementValues } from "./measurement-sanitization.ts";

test("sanitizeEnabledMeasurementValues clears disabled measurement values", () => {
  const sanitized = sanitizeEnabledMeasurementValues(
    { reps: false, weight: true, time: false, distance: false, calories: true },
    {
      reps: "12",
      weight: "135",
      duration: "8:30",
      distance: "2.5",
      calories: "200",
    },
  );

  assert.deepEqual(sanitized, {
    reps: "",
    weight: "135",
    duration: "",
    distance: "",
    calories: "200",
  });
});

test("sanitizeEnabledMeasurementValues drops stale values when toggling back on later", () => {
  const toggledOff = sanitizeEnabledMeasurementValues(
    { reps: false, weight: false, time: true, distance: false, calories: false },
    { reps: "8", weight: "155", duration: "6:00", distance: "1", calories: "50" },
  );

  const toggledBackOn = sanitizeEnabledMeasurementValues(
    { reps: true, weight: true, time: true, distance: false, calories: false },
    toggledOff,
  );

  assert.equal(toggledBackOn.reps, "");
  assert.equal(toggledBackOn.weight, "");
  assert.equal(toggledBackOn.duration, "6:00");
});


test("formatGoalSummaryText excludes disabled measurements from summaries", async () => {
  const { formatGoalSummaryText } = await import("./measurement-display.ts");
  const summary = formatGoalSummaryText({
    sets: 3,
    reps: 10,
    weight: 135,
    durationSeconds: 600,
    enabledMeasurements: { reps: true, weight: false, time: false, distance: false, calories: false },
  });

  assert.equal(summary, "Goal: 3 sets • 10 reps");
});
