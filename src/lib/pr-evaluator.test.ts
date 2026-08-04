import assert from "node:assert/strict";
import test from "node:test";

import {
  EMPTY_PR_COUNTS,
  emptyPrCounts,
  evaluatePrSummaries,
  formatPrBreakdown,
  incrementPrCount,
  type PrEvaluationSet,
} from "./pr-evaluator";

function set(overrides: Partial<PrEvaluationSet> & Pick<PrEvaluationSet, "exerciseId" | "sessionId" | "performedAt" | "setIndex">): PrEvaluationSet {
  return { weight: null, reps: null, ...overrides };
}

test("emptyPrCounts returns a fresh zeroed object each call", () => {
  const first = emptyPrCounts();
  const second = emptyPrCounts();
  assert.deepEqual(first, { reps: 0, weight: 0, total: 0 });
  assert.notEqual(first, second);
  first.reps = 5;
  assert.equal(second.reps, 0);
});

test("EMPTY_PR_COUNTS is a frozen, shared zero-value sentinel", () => {
  assert.deepEqual(EMPTY_PR_COUNTS, { reps: 0, weight: 0, total: 0 });
  assert.equal(Object.isFrozen(EMPTY_PR_COUNTS), true);
});

test("incrementPrCount bumps both the named category and the total", () => {
  const counts = emptyPrCounts();
  incrementPrCount(counts, "reps");
  incrementPrCount(counts, "weight");
  incrementPrCount(counts, "weight");
  assert.deepEqual(counts, { reps: 1, weight: 2, total: 3 });
});

test("evaluatePrSummaries counts a weight PR only when weight strictly increases beyond the prior best", () => {
  // Verified empirically against the real implementation: the very first
  // positive-weight set for an exercise is itself a PR (no prior best to
  // beat), a tie is not a PR, and only a strictly larger weight counts again.
  const sets = [
    set({ exerciseId: "ex1", sessionId: "s1", performedAt: "2026-01-01T10:00:00Z", setIndex: 0, weight: 100, reps: 5 }),
    set({ exerciseId: "ex1", sessionId: "s1", performedAt: "2026-01-01T10:01:00Z", setIndex: 1, weight: 110, reps: 5 }),
    set({ exerciseId: "ex1", sessionId: "s1", performedAt: "2026-01-01T10:02:00Z", setIndex: 2, weight: 105, reps: 5 }),
    set({ exerciseId: "ex1", sessionId: "s1", performedAt: "2026-01-01T10:03:00Z", setIndex: 3, weight: 110, reps: 5 }),
  ];

  const { sessionCountsById, exerciseSummaryById, sessionPrExerciseIdsById } = evaluatePrSummaries(sets);

  assert.deepEqual(sessionCountsById.get("s1"), { reps: 0, weight: 2, total: 2 });
  const exerciseSummary = exerciseSummaryById.get("ex1");
  assert.deepEqual(exerciseSummary?.counts, { reps: 0, weight: 2, total: 2 });
  assert.equal(exerciseSummary?.bestWeight, 110);
  assert.equal(exerciseSummary?.bestBodyweightReps, 0);
  assert.deepEqual([...(sessionPrExerciseIdsById.get("s1") ?? [])], ["ex1"]);
});

test("evaluatePrSummaries counts a rep PR only for zero-weight (bodyweight) sets, and only on strict improvement", () => {
  const sets = [
    set({ exerciseId: "ex2", sessionId: "s1", performedAt: "2026-01-01T10:00:00Z", setIndex: 0, weight: 0, reps: 8 }),
    set({ exerciseId: "ex2", sessionId: "s1", performedAt: "2026-01-01T10:01:00Z", setIndex: 1, weight: 0, reps: 10 }),
    set({ exerciseId: "ex2", sessionId: "s1", performedAt: "2026-01-01T10:02:00Z", setIndex: 2, weight: 0, reps: 9 }),
    set({ exerciseId: "ex2", sessionId: "s1", performedAt: "2026-01-01T10:03:00Z", setIndex: 3, weight: 0, reps: 0 }),
  ];

  const { exerciseSummaryById } = evaluatePrSummaries(sets);
  const summary = exerciseSummaryById.get("ex2");

  assert.deepEqual(summary?.counts, { reps: 2, weight: 0, total: 2 });
  assert.equal(summary?.bestBodyweightReps, 10);
  assert.equal(summary?.bestWeight, 0);
});

test("evaluatePrSummaries treats a weighted PR and a bodyweight-reps PR on the same exercise independently", () => {
  const sets = [
    set({ exerciseId: "ex3", sessionId: "s1", performedAt: "2026-01-01T10:00:00Z", setIndex: 0, weight: 135, reps: 5 }),
    set({ exerciseId: "ex3", sessionId: "s1", performedAt: "2026-01-01T10:01:00Z", setIndex: 1, weight: 0, reps: 8 }),
  ];

  const { exerciseSummaryById } = evaluatePrSummaries(sets);
  const summary = exerciseSummaryById.get("ex3");

  assert.deepEqual(summary?.counts, { reps: 1, weight: 1, total: 2 });
  assert.equal(summary?.bestWeight, 135);
  assert.equal(summary?.bestBodyweightReps, 8);
});

test("evaluatePrSummaries treats null, undefined, non-finite, and non-positive reps as zero rather than crashing or counting", () => {
  const sets = [
    set({ exerciseId: "ex4", sessionId: "s1", performedAt: "2026-01-01T10:00:00Z", setIndex: 0, weight: null, reps: null }),
    set({ exerciseId: "ex4", sessionId: "s1", performedAt: "2026-01-01T10:01:00Z", setIndex: 1, weight: undefined as unknown as null, reps: Number.NaN }),
    set({ exerciseId: "ex4", sessionId: "s1", performedAt: "2026-01-01T10:02:00Z", setIndex: 2, weight: 0, reps: -5 }),
    set({ exerciseId: "ex4", sessionId: "s1", performedAt: "2026-01-01T10:03:00Z", setIndex: 3, weight: null, reps: 5 }),
  ];

  const { exerciseSummaryById } = evaluatePrSummaries(sets);
  const summary = exerciseSummaryById.get("ex4");

  // Null/undefined/non-finite weight and negative reps are all genuinely
  // no-weight/no-improvement signals, so these sets are all evaluated in the
  // bodyweight-reps lane; only the last (reps: 5, first positive value seen)
  // registers as a PR.
  assert.deepEqual(summary?.counts, { reps: 1, weight: 0, total: 1 });
  assert.equal(summary?.bestBodyweightReps, 5);
  assert.equal(summary?.bestWeight, 0);
});

test("evaluatePrSummaries excludes a negative-weight set from PR evaluation entirely, instead of crediting it as a bodyweight PR", () => {
  // A negative weight is never a value the live set-logging action would
  // accept (src/app/session/[id]/actions.ts explicitly rejects weight < 0);
  // it can only reach here via corrupted/malformed legacy-import data
  // (src/lib/migration/fitness-legacy-bridge.ts has no sign validation on
  // import). Reproduced empirically against the pre-fix implementation: this
  // exact input used to produce counts.reps === 1 and bestBodyweightReps ===
  // 20 -- a real, user-visible "1 Rep PR" badge manufactured from a set that
  // may actually have been a weighted set with a garbled weight field.
  const sets = [
    set({ exerciseId: "ex8", sessionId: "s1", performedAt: "2026-01-01T10:00:00Z", setIndex: 0, weight: -135, reps: 20 }),
  ];

  const { exerciseSummaryById, sessionCountsById, sessionPrExerciseIdsById } = evaluatePrSummaries(sets);

  assert.equal(exerciseSummaryById.get("ex8"), undefined);
  assert.equal(sessionCountsById.get("s1"), undefined);
  assert.equal(sessionPrExerciseIdsById.get("s1"), undefined);
});

test("evaluatePrSummaries skips a negative-weight set without disturbing PR evaluation for surrounding valid sets", () => {
  const sets = [
    set({ exerciseId: "ex9", sessionId: "s1", performedAt: "2026-01-01T10:00:00Z", setIndex: 0, weight: 100, reps: 5 }),
    set({ exerciseId: "ex9", sessionId: "s1", performedAt: "2026-01-01T10:01:00Z", setIndex: 1, weight: -50, reps: 30 }),
    set({ exerciseId: "ex9", sessionId: "s1", performedAt: "2026-01-01T10:02:00Z", setIndex: 2, weight: 110, reps: 5 }),
  ];

  const { exerciseSummaryById, sessionCountsById } = evaluatePrSummaries(sets);
  const summary = exerciseSummaryById.get("ex9");

  // Only the two valid weighted sets count; the corrupted middle set
  // contributes neither a weight PR nor a spurious bodyweight PR, and does
  // not reset or otherwise affect the running best-weight comparison.
  assert.deepEqual(summary?.counts, { reps: 0, weight: 2, total: 2 });
  assert.equal(summary?.bestWeight, 110);
  assert.equal(summary?.bestBodyweightReps, 0);
  assert.deepEqual(sessionCountsById.get("s1"), { reps: 0, weight: 2, total: 2 });
});

test("evaluatePrSummaries still credits a weight PR when reps is corrupted (negative) but weight is valid", () => {
  // Unlike weight, a corrupted reps value never independently produces a
  // spurious badge: reps is not read at all in the weight-PR lane, and in
  // the bodyweight lane a negative reps value normalizes to 0, which can
  // never exceed a non-negative prior best. So only weight needs the
  // exclude-entirely treatment; reps normalization is left unchanged.
  const sets = [
    set({ exerciseId: "ex10", sessionId: "s1", performedAt: "2026-01-01T10:00:00Z", setIndex: 0, weight: 135, reps: -8 }),
  ];

  const { exerciseSummaryById } = evaluatePrSummaries(sets);
  const summary = exerciseSummaryById.get("ex10");

  assert.deepEqual(summary?.counts, { reps: 0, weight: 1, total: 1 });
  assert.equal(summary?.bestWeight, 135);
});

test("evaluatePrSummaries sorts out-of-order input chronologically by performedAt before evaluating PRs", () => {
  const sets = [
    set({ exerciseId: "ex5", sessionId: "s1", performedAt: "2026-01-01T10:02:00Z", setIndex: 2, weight: 130, reps: 5 }),
    set({ exerciseId: "ex5", sessionId: "s1", performedAt: "2026-01-01T10:00:00Z", setIndex: 0, weight: 100, reps: 5 }),
    set({ exerciseId: "ex5", sessionId: "s1", performedAt: "2026-01-01T10:01:00Z", setIndex: 1, weight: 120, reps: 5 }),
  ];

  const { exerciseSummaryById } = evaluatePrSummaries(sets);
  const summary = exerciseSummaryById.get("ex5");

  // Every set is a strict increase over the previous once correctly ordered
  // (100 -> 120 -> 130), so all three should count.
  assert.deepEqual(summary?.counts, { reps: 0, weight: 3, total: 3 });
  assert.equal(summary?.bestWeight, 130);
});

test("evaluatePrSummaries breaks ties on identical performedAt using setIndex", () => {
  const sets = [
    set({ exerciseId: "ex6", sessionId: "s1", performedAt: "2026-01-01T10:00:00Z", setIndex: 1, weight: 120, reps: 5 }),
    set({ exerciseId: "ex6", sessionId: "s1", performedAt: "2026-01-01T10:00:00Z", setIndex: 0, weight: 100, reps: 5 }),
  ];

  const { exerciseSummaryById } = evaluatePrSummaries(sets);
  const summary = exerciseSummaryById.get("ex6");

  // Regardless of input array order, setIndex 0 (weight 100) is evaluated
  // before setIndex 1 (weight 120), so both count as successive PRs.
  assert.deepEqual(summary?.counts, { reps: 0, weight: 2, total: 2 });
  assert.equal(summary?.bestWeight, 120);
});

test("evaluatePrSummaries aggregates session-level counts across multiple exercises and sessions independently", () => {
  const sets = [
    set({ exerciseId: "exA", sessionId: "sessA", performedAt: "2026-01-01T10:00:00Z", setIndex: 0, weight: 100, reps: 5 }),
    set({ exerciseId: "exB", sessionId: "sessA", performedAt: "2026-01-01T10:01:00Z", setIndex: 0, weight: 0, reps: 12 }),
    set({ exerciseId: "exA", sessionId: "sessB", performedAt: "2026-01-02T10:00:00Z", setIndex: 0, weight: 90, reps: 5 }),
    set({ exerciseId: "exA", sessionId: "sessB", performedAt: "2026-01-02T10:01:00Z", setIndex: 1, weight: 105, reps: 5 }),
  ];

  const { sessionCountsById, sessionPrExerciseIdsById } = evaluatePrSummaries(sets);

  assert.deepEqual(sessionCountsById.get("sessA"), { reps: 1, weight: 1, total: 2 });
  // 90 does not beat the 100 established in sessA, so only the 105 set PRs.
  assert.deepEqual(sessionCountsById.get("sessB"), { reps: 0, weight: 1, total: 1 });
  assert.deepEqual([...(sessionPrExerciseIdsById.get("sessA") ?? [])].sort(), ["exA", "exB"]);
  assert.deepEqual([...(sessionPrExerciseIdsById.get("sessB") ?? [])], ["exA"]);
});

test("evaluatePrSummaries adds an exercise to a session's PR set only once even with multiple PRs in that session", () => {
  const sets = [
    set({ exerciseId: "ex7", sessionId: "s1", performedAt: "2026-01-01T10:00:00Z", setIndex: 0, weight: 100, reps: 5 }),
    set({ exerciseId: "ex7", sessionId: "s1", performedAt: "2026-01-01T10:01:00Z", setIndex: 1, weight: 110, reps: 5 }),
  ];

  const { sessionPrExerciseIdsById } = evaluatePrSummaries(sets);
  const ids = sessionPrExerciseIdsById.get("s1");

  assert.equal(ids?.size, 1);
  assert.deepEqual([...(ids ?? [])], ["ex7"]);
});

test("evaluatePrSummaries returns empty maps for an empty input", () => {
  const { sessionCountsById, exerciseSummaryById, sessionPrExerciseIdsById } = evaluatePrSummaries([]);
  assert.equal(sessionCountsById.size, 0);
  assert.equal(exerciseSummaryById.size, 0);
  assert.equal(sessionPrExerciseIdsById.size, 0);
});

test("formatPrBreakdown returns an empty string when there are no PRs", () => {
  assert.equal(formatPrBreakdown({ reps: 0, weight: 0, total: 0 }), "");
});

test("formatPrBreakdown pluralizes each category independently and orders reps before weight", () => {
  assert.equal(formatPrBreakdown({ reps: 1, weight: 0, total: 1 }), "1 Rep PR");
  assert.equal(formatPrBreakdown({ reps: 2, weight: 0, total: 2 }), "2 Rep PRs");
  assert.equal(formatPrBreakdown({ reps: 0, weight: 1, total: 1 }), "1 Weight PR");
  assert.equal(formatPrBreakdown({ reps: 0, weight: 2, total: 2 }), "2 Weight PRs");
  assert.equal(formatPrBreakdown({ reps: 1, weight: 1, total: 2 }), "1 Rep PR • 1 Weight PR");
  assert.equal(formatPrBreakdown({ reps: 2, weight: 3, total: 5 }), "2 Rep PRs • 3 Weight PRs");
});
