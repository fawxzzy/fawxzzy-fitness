import test from "node:test";
import assert from "node:assert/strict";
import {
  buildProgressionExampleSequence,
  classifyProgressionExampleMetricChange,
  parseComparableProgressionExampleValue,
  splitProgressionExampleMetricPart,
} from "@/lib/progression-example-visuals";

test("classifies higher lower and same numeric example values", () => {
  assert.equal(classifyProgressionExampleMetricChange("12 reps", "10 reps"), "higher");
  assert.equal(classifyProgressionExampleMetricChange("8 reps", "10 reps"), "lower");
  assert.equal(classifyProgressionExampleMetricChange("10 reps", "10 reps"), "same");
});

test("classifies mm:ss example values using comparable seconds", () => {
  assert.equal(parseComparableProgressionExampleValue("10:30 time"), 630);
  assert.equal(classifyProgressionExampleMetricChange("10:30 time", "9:45 time"), "higher");
  assert.equal(classifyProgressionExampleMetricChange("8:00 time", "8:00 time"), "same");
  assert.equal(parseComparableProgressionExampleValue("10m 30s"), 630);
  assert.equal(classifyProgressionExampleMetricChange("10m 45s", "10m 30s"), "higher");
  assert.equal(classifyProgressionExampleMetricChange("9m 45s", "10m 30s"), "lower");
});

test("splits numeric text from measurement labels", () => {
  assert.deepEqual(splitProgressionExampleMetricPart("140 lbs"), {
    valueText: "140",
    labelText: "lbs",
  });
  assert.deepEqual(splitProgressionExampleMetricPart("10:30 time"), {
    valueText: "10:30",
    labelText: "time",
  });
  assert.deepEqual(splitProgressionExampleMetricPart("10m 30s"), {
    valueText: "10m 30s",
    labelText: "",
  });
});

test("builds session-count-driven example sequencing before measurement focus changes", () => {
  const sequence = buildProgressionExampleSequence({
    cycleLengthDays: 4,
    groups: [
      { measurements: ["time"], sessionCount: 3 },
      { measurements: ["distance"], sessionCount: 1 },
    ],
  });

  assert.deepEqual(
    sequence.map((step) => ({
      day: step.dayNumber,
      session: step.sessionIndex,
      measurement: step.measurements.join("+"),
    })),
    [
      { day: 1, session: 1, measurement: "time" },
      { day: 2, session: 2, measurement: "time" },
      { day: 3, session: 3, measurement: "time" },
      { day: 4, session: 1, measurement: "distance" },
    ],
  );
});

test("repeats promotion order when the cycle has more days than one promotion round", () => {
  const sequence = buildProgressionExampleSequence({
    cycleLengthDays: 7,
    groups: [
      { measurements: ["time"], sessionCount: 3 },
      { measurements: ["distance"], sessionCount: 1 },
    ],
  });

  assert.equal(sequence.length, 7);
  assert.deepEqual(
    sequence.slice(4).map((step) => ({
      day: step.dayNumber,
      session: step.sessionIndex,
      measurement: step.measurements.join("+"),
    })),
    [
      { day: 5, session: 1, measurement: "time" },
      { day: 6, session: 2, measurement: "time" },
      { day: 7, session: 3, measurement: "time" },
    ],
  );
});

test("repeats cycle days when one promotion round outlasts the routine cycle", () => {
  const sequence = buildProgressionExampleSequence({
    cycleLengthDays: 3,
    groups: [
      { measurements: ["time"], sessionCount: 2 },
      { measurements: ["distance"], sessionCount: 2 },
    ],
  });

  assert.deepEqual(
    sequence.map((step) => step.dayNumber),
    [1, 2, 3, 1],
  );
});
