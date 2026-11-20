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

test("zero reads as 0:00", () => {
  assert.equal(formatDurationClock(0), "0:00");
  assert.equal(formatDurationPreview(0), "0:00");
});

test("an hour or more stays m:ss with whole minutes (60:00, not 1:00:00)", () => {
  // Decision: these strings are prefilled into the duration inputs, whose parsers accept "m:ss" or plain seconds
  // only, so an "h:mm:ss" value would not round-trip. Minutes keep counting past 59 instead.
  assert.equal(formatDurationClock(3600), "60:00");
  assert.equal(formatDurationClock(3601), "60:01");
  assert.equal(formatDurationClock(3661), "61:01");
  assert.equal(formatDurationPreview(90 * 60), "90:00");
  assert.match(formatDurationClock(4 * 3600 + 5), /^\d+:\d{2}$/);
});
