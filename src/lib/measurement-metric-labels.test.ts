import test from "node:test";
import assert from "node:assert/strict";

import { resolveDefaultMeasurementMetricLabel } from "./measurement-metric-labels.ts";

test("seconds-only measurement label renders as Time (s)", () => {
  assert.equal(resolveDefaultMeasurementMetricLabel("time", "s"), "Time (s)");
});

test("non-time measurement labels keep their fallback label", () => {
  assert.equal(resolveDefaultMeasurementMetricLabel("distance", "mi"), "mi");
});
