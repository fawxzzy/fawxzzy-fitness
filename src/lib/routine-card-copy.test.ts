import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRoutineWeekCell,
  normalizeRoutineSummaryPart,
  normalizeRoutineSummaryParts,
} from "./routine-card-copy.ts";

test("routine summary parts use canonical terms: day, session (never workout plan or log)", () => {
  assert.deepEqual(
    normalizeRoutineSummaryParts(["16 exercises", "4 workout plans", "1 rest", "3 sessions logged", "Last Nov 5"]),
    ["16 exercises", "4 days", "1 rest day", "3 sessions", "Last Nov 5"],
  );
  assert.equal(normalizeRoutineSummaryPart("1 workout plan"), "1 day");
  assert.equal(normalizeRoutineSummaryPart("1 session logged"), "1 session");
  assert.equal(normalizeRoutineSummaryPart("No sessions logged"), "No sessions yet");
  assert.equal(normalizeRoutineSummaryPart("Not started"), "Not started");
});

test("cached mobile abbreviations (plans, train, logs, New) normalize to the same canonical copy", () => {
  assert.deepEqual(
    normalizeRoutineSummaryParts(["7 plans", "4 train", "0 rest", "2 logs", "New", "No logs"]),
    ["7 days", "4 training days", "0 rest days", "2 sessions", "Not started", "No sessions yet"],
  );
});

test("week cell: training day shows weekday and exercise count with a full-sentence description", () => {
  assert.deepEqual(
    buildRoutineWeekCell({ dayIndex: 2, weekdayLabel: "Tuesday", isRest: false, exerciseCount: 8 }),
    { label: "Tue", value: "8", glyph: null, description: "Day 2, Tuesday: 8 exercises", isRest: false },
  );
});

test("week cell: rest and empty days read as text, and done or skipped add a glyph", () => {
  assert.equal(buildRoutineWeekCell({ dayIndex: 3, weekdayLabel: "Wed", isRest: true, exerciseCount: 0 }).value, "Rest");
  const empty = buildRoutineWeekCell({ dayIndex: 4, weekdayLabel: "Thu", isRest: false, exerciseCount: 0 });
  assert.equal(empty.value, "–");
  assert.equal(empty.description, "Day 4, Thu: no exercises");
  assert.equal(buildRoutineWeekCell({ dayIndex: 1, weekdayLabel: "Mon", isRest: false, exerciseCount: 1, isCompleted: true }).glyph, "✓");
  assert.equal(buildRoutineWeekCell({ dayIndex: 1, weekdayLabel: "Mon", isRest: false, exerciseCount: 1, isSkipped: true }).glyph, "⊘");
});

test("week cell: a routine without a start weekday labels cells Day N", () => {
  const cell = buildRoutineWeekCell({ dayIndex: 5, weekdayLabel: "Day 5", isRest: false, exerciseCount: 3 });
  assert.equal(cell.label, "Day 5");
  assert.equal(cell.description, "Day 5: 3 exercises");
});
