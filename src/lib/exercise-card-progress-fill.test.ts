import test from "node:test";
import assert from "node:assert/strict";
import { deriveExerciseCardProgressFill, deriveLoggedSetCountProgressFill } from "@/lib/exercise-card-progress-fill";
import type { ProgressionProgressFill } from "@/lib/progression-progress-percent";

function buildFill(overrides: Partial<ProgressionProgressFill> = {}): ProgressionProgressFill {
  return {
    percent: 67,
    state: "partial",
    label: "2/3 sets",
    ...overrides,
  };
}

test("returns none for missing evidence", () => {
  const result = deriveExerciseCardProgressFill({});

  assert.equal(result.progressPercent, 0);
  assert.equal(result.state, "none");
  assert.equal(result.fill, null);
});

test("returns partial progress for canonical partial evidence", () => {
  const sourceFill = buildFill();

  const result = deriveExerciseCardProgressFill({
    progressFill: sourceFill,
  });

  assert.equal(result.progressPercent, 67);
  assert.equal(result.state, "partial");
  assert.notEqual(result.fill, sourceFill);
  assert.deepEqual(result.fill, sourceFill);
});

test("returns ready for promote-ready evidence", () => {
  const result = deriveExerciseCardProgressFill({
    progressFill: buildFill({ percent: 100, state: "ready", label: "Ready" }),
    candidateType: "promote",
  });

  assert.equal(result.progressPercent, 100);
  assert.equal(result.state, "ready");
  assert.equal(result.fill?.percent, 100);
  assert.equal(result.fill?.state, "ready");
});

test("returns stale for review-ready evidence", () => {
  const result = deriveExerciseCardProgressFill({
    progressFill: buildFill({ percent: 100, state: "ready", label: "Ready" }),
    candidateType: "review",
  });

  assert.equal(result.progressPercent, 100);
  assert.equal(result.state, "stale");
  assert.equal(result.fill?.state, "ready");
});

test("returns deload for deload-ready evidence", () => {
  const result = deriveExerciseCardProgressFill({
    progressFill: buildFill({ percent: 100, state: "ready", label: "Ready" }),
    candidateType: "deload",
  });

  assert.equal(result.progressPercent, 100);
  assert.equal(result.state, "deload");
  assert.equal(result.fill?.state, "ready");
});

test("returns none for unsupported or no-history evidence", () => {
  const unsupported = deriveExerciseCardProgressFill({
    progressFill: buildFill({ percent: 80, state: "unsupported", label: "Unsupported" }),
  });
  const noHistory = deriveExerciseCardProgressFill({
    progressFill: buildFill({ percent: 0, state: "no_history", label: "No history" }),
  });

  assert.equal(unsupported.state, "none");
  assert.equal(unsupported.fill, null);
  assert.equal(noHistory.state, "none");
  assert.equal(noHistory.fill, null);
});

test("returns none for manual progression evidence even when percent is present", () => {
  const manual = deriveExerciseCardProgressFill({
    progressFill: buildFill({ percent: 100, state: "manual_hidden", label: "Manual" }),
    candidateType: "promote",
  });

  assert.equal(manual.progressPercent, 0);
  assert.equal(manual.state, "none");
  assert.equal(manual.fill, null);
  assert.equal(manual.label, "Manual");
});

test("does not mutate the input fill object", () => {
  const sourceFill = buildFill({ percent: 68 });
  const sourceSnapshot = structuredClone(sourceFill);

  void deriveExerciseCardProgressFill({
    progressFill: sourceFill,
  });

  assert.deepEqual(sourceFill, sourceSnapshot);
});

test("deriveLoggedSetCountProgressFill returns partial set progress", () => {
  const result = deriveLoggedSetCountProgressFill({
    loggedSetCount: 2,
    goalSetTarget: 4,
  });

  assert.deepEqual(result, {
    percent: 50,
    state: "partial",
    label: "2/4 sets",
  });
});

test("deriveLoggedSetCountProgressFill caps completed set progress at full", () => {
  const result = deriveLoggedSetCountProgressFill({
    loggedSetCount: 6,
    goalSetTarget: 4,
  });

  assert.deepEqual(result, {
    percent: 100,
    state: "ready",
    label: "4/4 sets",
  });
});

test("deriveLoggedSetCountProgressFill returns none when there is no target or no logged sets yet", () => {
  assert.equal(deriveLoggedSetCountProgressFill({
    loggedSetCount: 0,
    goalSetTarget: 4,
  }), null);

  assert.equal(deriveLoggedSetCountProgressFill({
    loggedSetCount: 2,
    goalSetTarget: null,
  }), null);
});
