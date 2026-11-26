import assert from "node:assert/strict";
import test from "node:test";
import { formatLastTimeLine } from "./lastTimeLine.ts";

test("Last time line reads reps first, then weight, then the date", () => {
  assert.equal(formatLastTimeLine("225 lbs x 5", "Nov 19"), "Last time: 5 × 225 lbs · Nov 19");
  assert.equal(formatLastTimeLine("100 kg x 8", null), "Last time: 8 × 100 kg");
});

test("Last time line keeps a weight-only or reps-only summary as is", () => {
  assert.equal(formatLastTimeLine("225 lbs", "Nov 19"), "Last time: 225 lbs · Nov 19");
  assert.equal(formatLastTimeLine("12 reps", "Oct 2"), "Last time: 12 reps · Oct 2");
});

test("Last time line is absent without a last summary", () => {
  assert.equal(formatLastTimeLine(null, "Nov 19"), null);
  assert.equal(formatLastTimeLine("   ", "Nov 19"), null);
  assert.equal(formatLastTimeLine(undefined, undefined), null);
});
