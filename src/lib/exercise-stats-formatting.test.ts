import test from "node:test";
import assert from "node:assert/strict";
import { formatDistance } from "@/lib/exercise-stats-formatting";

test("formats distance with enough precision for small progression steps", () => {
  assert.equal(formatDistance(2.1, "mi"), "2.1 mi");
  assert.equal(formatDistance(0.75, "mi"), "0.75 mi");
  assert.equal(formatDistance(0.85, "mi"), "0.85 mi");
});
