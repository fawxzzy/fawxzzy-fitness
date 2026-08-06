import assert from "node:assert/strict";
import test from "node:test";

import {
  buildStrengthPrReviewEvents,
  classifyStrengthBestSets,
  selectSessionBestRow,
  selectStrengthPrRowIds,
  type StrengthPrSet,
} from "./exercise-strength-pr-summaries";

function row(overrides: Partial<StrengthPrSet> & Pick<StrengthPrSet, "sessionId" | "performedAt" | "setIndex">): StrengthPrSet {
  return { weight: null, reps: null, weightUnit: "lbs", ...overrides };
}

test("selectStrengthPrRowIds flags a valid weighted set that beats the running best", () => {
  const rows = [
    row({ sessionId: "s1", performedAt: "2026-01-01T10:00:00Z", setIndex: 0, weight: 100, reps: 5 }),
    row({ sessionId: "s1", performedAt: "2026-01-01T10:01:00Z", setIndex: 1, weight: 110, reps: 5 }),
  ];
  assert.deepEqual([...selectStrengthPrRowIds(rows)], ["s1-0", "s1-1"]);
});

test("selectStrengthPrRowIds flags a valid bodyweight set that beats the running best reps", () => {
  const rows = [
    row({ sessionId: "s1", performedAt: "2026-01-01T10:00:00Z", setIndex: 0, weight: 0, reps: 8 }),
    row({ sessionId: "s1", performedAt: "2026-01-01T10:01:00Z", setIndex: 1, weight: 0, reps: 12 }),
  ];
  assert.deepEqual([...selectStrengthPrRowIds(rows)], ["s1-0", "s1-1"]);
});

test("selectStrengthPrRowIds excludes a negative-weight row entirely, instead of crediting it as a bodyweight PR", () => {
  // Reproduced empirically against the pre-fix inline logic that used to live
  // in exercise-info.ts: this exact input used to add "s1-0" to the PR-row
  // id set, highlighting a corrupted -135lb set as a 20-rep bodyweight PR.
  const rows = [row({ sessionId: "s1", performedAt: "2026-01-01T10:00:00Z", setIndex: 0, weight: -135, reps: 20 })];
  assert.deepEqual([...selectStrengthPrRowIds(rows)], []);
});

test("selectStrengthPrRowIds skips an invalid row surrounded by valid rows without disturbing their evaluation", () => {
  const rows = [
    row({ sessionId: "s1", performedAt: "2026-01-01T10:00:00Z", setIndex: 0, weight: 100, reps: 5 }),
    row({ sessionId: "s1", performedAt: "2026-01-01T10:01:00Z", setIndex: 1, weight: -50, reps: 30 }),
    row({ sessionId: "s1", performedAt: "2026-01-01T10:02:00Z", setIndex: 2, weight: 110, reps: 5 }),
  ];
  assert.deepEqual([...selectStrengthPrRowIds(rows)], ["s1-0", "s1-2"]);
});

test("selectStrengthPrRowIds treats null, undefined, and non-finite weight as bodyweight (0), not invalid", () => {
  const rows = [
    row({ sessionId: "s1", performedAt: "2026-01-01T10:00:00Z", setIndex: 0, weight: null, reps: 5 }),
    row({ sessionId: "s1", performedAt: "2026-01-01T10:01:00Z", setIndex: 1, weight: undefined as unknown as null, reps: 8 }),
    row({ sessionId: "s1", performedAt: "2026-01-01T10:02:00Z", setIndex: 2, weight: Number.NaN, reps: 10 }),
  ];
  assert.deepEqual([...selectStrengthPrRowIds(rows)], ["s1-0", "s1-1", "s1-2"]);
});

test("selectStrengthPrRowIds treats zero and negative reps as zero rather than crashing or counting", () => {
  const rows = [
    row({ sessionId: "s1", performedAt: "2026-01-01T10:00:00Z", setIndex: 0, weight: 0, reps: 0 }),
    row({ sessionId: "s1", performedAt: "2026-01-01T10:01:00Z", setIndex: 1, weight: 0, reps: -5 }),
  ];
  assert.deepEqual([...selectStrengthPrRowIds(rows)], []);
});

test("selectStrengthPrRowIds sorts out-of-order input chronologically before evaluating, and does not mutate the input array", () => {
  const rows = [
    row({ sessionId: "s1", performedAt: "2026-01-01T10:01:00Z", setIndex: 1, weight: 120, reps: 5 }),
    row({ sessionId: "s1", performedAt: "2026-01-01T10:00:00Z", setIndex: 0, weight: 100, reps: 5 }),
  ];
  const snapshot = rows.map((r) => ({ ...r }));

  assert.deepEqual([...selectStrengthPrRowIds(rows)], ["s1-0", "s1-1"]);
  assert.deepEqual(rows, snapshot);
});

test("selectStrengthPrRowIds is deterministic across repeated calls on the same input", () => {
  const rows = [
    row({ sessionId: "s1", performedAt: "2026-01-01T10:00:00Z", setIndex: 0, weight: 100, reps: 5 }),
    row({ sessionId: "s1", performedAt: "2026-01-01T10:01:00Z", setIndex: 1, weight: -20, reps: 15 }),
    row({ sessionId: "s1", performedAt: "2026-01-01T10:02:00Z", setIndex: 2, weight: 0, reps: 12 }),
  ];
  const first = [...selectStrengthPrRowIds(rows)];
  const second = [...selectStrengthPrRowIds(rows)];
  assert.deepEqual(first, second);
});

test("buildStrengthPrReviewEvents excludes a negative-weight row and returns events most-recent-first", () => {
  const rows = [
    row({ sessionId: "s1", performedAt: "2026-01-01T10:00:00Z", setIndex: 0, weight: 100, reps: 5 }),
    row({ sessionId: "s1", performedAt: "2026-01-01T10:01:00Z", setIndex: 1, weight: -50, reps: 30 }),
    row({ sessionId: "s1", performedAt: "2026-01-01T10:02:00Z", setIndex: 2, weight: 0, reps: 8 }),
  ];
  const events = buildStrengthPrReviewEvents(rows);
  assert.deepEqual(events, [
    { kind: "reps", reps: 8, performedAt: "2026-01-01T10:02:00Z" },
    { kind: "weight", weight: 100, reps: 5, weightUnit: "lbs", performedAt: "2026-01-01T10:00:00Z" },
  ]);
});

test("classifyStrengthBestSets excludes invalid rows from every aggregate: totals, splits, and best-set selection", () => {
  const rows = [
    row({ sessionId: "s1", performedAt: "2026-01-01T10:00:00Z", setIndex: 0, weight: 100, reps: 5 }),
    row({ sessionId: "s1", performedAt: "2026-01-01T10:01:00Z", setIndex: 1, weight: -135, reps: 20 }),
    row({ sessionId: "s1", performedAt: "2026-01-01T10:02:00Z", setIndex: 2, weight: 0, reps: 12 }),
  ];
  const result = classifyStrengthBestSets(rows);

  assert.equal(result.totalReps, 17);
  assert.equal(result.weightedRows.length, 1);
  assert.equal(result.bodyweightRows.length, 1);
  assert.equal(result.bestWeight, 100);
  assert.equal(result.bestWeightedReps, 5);
  assert.equal(result.bestRepsAtBestWeight, 5);
  assert.equal(result.bestWeightedSet?.setIndex, 0);
  assert.equal(result.bestBodyweightReps, 12);
  assert.equal(result.bestBodyweightSet?.setIndex, 2);
});

test("classifyStrengthBestSets on an all-invalid input returns fully zeroed, empty aggregates", () => {
  const rows = [row({ sessionId: "s1", performedAt: "2026-01-01T10:00:00Z", setIndex: 0, weight: -135, reps: 20 })];
  const result = classifyStrengthBestSets(rows);

  assert.deepEqual(result, {
    totalReps: 0,
    weightedRows: [],
    bodyweightRows: [],
    bestWeight: 0,
    bestWeightedReps: 0,
    bestRepsAtBestWeight: 0,
    bestWeightedSet: null,
    bestBodyweightReps: 0,
    bestBodyweightSet: null,
  });
});

test("classifyStrengthBestSets does not mutate its input array", () => {
  const rows = [
    row({ sessionId: "s1", performedAt: "2026-01-01T10:00:00Z", setIndex: 0, weight: 100, reps: 5 }),
    row({ sessionId: "s1", performedAt: "2026-01-01T10:01:00Z", setIndex: 1, weight: 0, reps: 8 }),
  ];
  const snapshot = rows.map((r) => ({ ...r }));
  classifyStrengthBestSets(rows);
  assert.deepEqual(rows, snapshot);
});

test("selectSessionBestRow picks the highest-weight row and excludes an invalid-weight row from both the pick and bodyweightReps", () => {
  const rows = [
    row({ sessionId: "s1", performedAt: "2026-01-01T10:00:00Z", setIndex: 0, weight: -135, reps: 20 }),
    row({ sessionId: "s1", performedAt: "2026-01-01T10:01:00Z", setIndex: 1, weight: 90, reps: 5 }),
    row({ sessionId: "s1", performedAt: "2026-01-01T10:02:00Z", setIndex: 2, weight: 0, reps: 12 }),
  ];
  const { bestRow, bodyweightReps } = selectSessionBestRow(rows);

  assert.equal(bestRow?.setIndex, 1);
  assert.equal(bodyweightReps, 12);
});

test("selectSessionBestRow returns a null bestRow and zero bodyweightReps when every row is invalid or empty", () => {
  const rows = [row({ sessionId: "s1", performedAt: "2026-01-01T10:00:00Z", setIndex: 0, weight: -10, reps: 3 })];
  const { bestRow, bodyweightReps } = selectSessionBestRow(rows);
  assert.equal(bestRow, null);
  assert.equal(bodyweightReps, 0);
});

test("all four functions agree with pr-evaluator's isInvalidWeight boundary: negative excluded, non-finite treated as bodyweight", () => {
  const negativeRows = [row({ sessionId: "s1", performedAt: "2026-01-01T10:00:00Z", setIndex: 0, weight: -1, reps: 1 })];
  assert.deepEqual([...selectStrengthPrRowIds(negativeRows)], []);
  assert.deepEqual(buildStrengthPrReviewEvents(negativeRows), []);
  assert.equal(classifyStrengthBestSets(negativeRows).totalReps, 0);
  assert.equal(selectSessionBestRow(negativeRows).bestRow, null);

  const infiniteRows = [row({ sessionId: "s1", performedAt: "2026-01-01T10:00:00Z", setIndex: 0, weight: Number.POSITIVE_INFINITY, reps: 1 })];
  assert.deepEqual([...selectStrengthPrRowIds(infiniteRows)], ["s1-0"]);
  assert.equal(classifyStrengthBestSets(infiniteRows).bodyweightRows.length, 1);
});
