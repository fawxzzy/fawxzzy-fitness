import test from "node:test";
import assert from "node:assert/strict";

import { formatDurationClock, formatDurationPreview } from "./duration.ts";

test("timed targets read as a plain m:ss clock with no stray unit", () => {
  assert.equal(formatDurationPreview(18 * 60), "18:00");
  assert.equal(formatDurationPreview(45), "0:45");
  assert.equal(formatDurationPreview(90), "1:30");
  assert.doesNotMatch(formatDurationPreview(1080), /\ss$/);
});

test("the clock floors and clamps bad input", () => {
  assert.equal(formatDurationClock(59.9), "0:59");
  assert.equal(formatDurationClock(-5), "0:00");
  assert.equal(formatDurationClock(Number.NaN), "0:00");
});
