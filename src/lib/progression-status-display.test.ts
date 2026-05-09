import test from "node:test";
import assert from "node:assert/strict";
import {
  formatProgressionStatusDisplayItem,
  getProgressionTargetFingerprint,
} from "@/lib/progression-status-display";
import type {
  ProgressionHistorySetRow,
  ProgressionReviewCandidate,
  ProgressionTargetPlan,
} from "@/lib/progression-playbooks";

function buildTarget(overrides: Partial<ProgressionTargetPlan> = {}): ProgressionTargetPlan {
  return {
    measurementType: "reps",
    setsMin: 4,
    setsMax: 4,
    repsMin: 4,
    repsMax: 6,
    weightMin: 225,
    weightMax: 225,
    weightUnit: "lbs",
    durationSeconds: null,
    distance: null,
    distanceUnit: null,
    calories: null,
    ...overrides,
  };
}

function buildNoneCandidate(reason: string, target = buildTarget()): ProgressionReviewCandidate {
  return {
    type: "none",
    playbookId: "double_progression",
    label: "Double Progression",
    currentTarget: target,
    proposedTarget: null,
    reason,
  };
}

function buildRows(reps: number[], weight = 225): ProgressionHistorySetRow[] {
  return reps.map((rep, index) => ({
    sessionId: "session-exercise-1",
    performedAt: "2026-05-07T12:00:00.000Z",
    setIndex: index + 1,
    weight,
    reps: rep,
    weightUnit: "lbs",
    durationSeconds: null,
    distance: null,
    distanceUnit: null,
    calories: null,
    isWarmup: false,
  }));
}

test("formats incomplete strength work as non-actionable Progress Status", () => {
  const item = formatProgressionStatusDisplayItem({
    id: "bench",
    exerciseName: "Barbell Bench Press",
    candidate: buildNoneCandidate("Double Progression: range is not complete yet."),
    rejectionReason: "top_range_not_met",
    historyRows: buildRows([6, 6, 5, 4]),
    plan: buildTarget(),
  });

  assert.ok(item);
  assert.equal(item.statusType, "top_range_not_met");
  assert.equal(item.label, "Not ready yet");
  assert.equal(item.detailLine, "Result: 2/4 sets hit the top range.");
  assert.match(item.latestLine, /Used: May 7 · 225 lbs · 6 \/ 6 \/ 5 \/ 4/);
  assert.match(item.targetLine, /Needs: 4 sets at 6 reps · 225 lbs/);
});

test("formats below-target-load work without creating an update", () => {
  const item = formatProgressionStatusDisplayItem({
    id: "row",
    exerciseName: "Barbell Row",
    candidate: buildNoneCandidate("Double Progression: no completed target-load session is ready for cycle review."),
    rejectionReason: "incomplete_sets",
    historyRows: buildRows([8, 8, 8], 205),
    plan: buildTarget({ setsMin: 3, setsMax: 3, repsMin: 6, repsMax: 8, weightMin: 225, weightMax: 225 }),
  });

  assert.ok(item);
  assert.equal(item.statusType, "below_target_load");
  assert.equal(item.label, "Below target load");
  assert.equal(item.detailLine, "Result: strong work logged below the current target load.");
});

test("formats above-target incomplete work without calling it below target load", () => {
  const item = formatProgressionStatusDisplayItem({
    id: "pullup",
    exerciseName: "Weighted Pull-Up",
    candidate: buildNoneCandidate("Double Progression: range is not complete yet.", buildTarget({
      setsMin: 3,
      setsMax: 3,
      repsMin: 6,
      repsMax: 8,
      weightMin: 25,
      weightMax: 25,
    })),
    rejectionReason: "top_range_not_met",
    historyRows: buildRows([8, 8, 7], 30),
    plan: buildTarget({
      setsMin: 3,
      setsMax: 3,
      repsMin: 6,
      repsMax: 8,
      weightMin: 25,
      weightMax: 25,
    }),
  });

  assert.ok(item);
  assert.equal(item.statusType, "above_target_incomplete");
  assert.equal(item.label, "Above target, not ready");
  assert.equal(item.detailLine, "Result: 2/3 qualified at planned reps and load.");
});

test("formats one-rep max above target as incomplete instead of ready", () => {
  const item = formatProgressionStatusDisplayItem({
    id: "pullup",
    exerciseName: "Weighted Pull-Up",
    candidate: buildNoneCandidate("Double Progression: complete 3 work sets at 25 lbs to evaluate next cycle.", buildTarget({
      setsMin: 3,
      setsMax: 3,
      repsMin: 6,
      repsMax: 8,
      weightMin: 25,
      weightMax: 25,
    })),
    rejectionReason: "incomplete_sets",
    historyRows: buildRows([1], 100),
    plan: buildTarget({
      setsMin: 3,
      setsMax: 3,
      repsMin: 6,
      repsMax: 8,
      weightMin: 25,
      weightMax: 25,
    }),
  });

  assert.ok(item);
  assert.equal(item.statusType, "above_target_incomplete");
  assert.match(item.targetLine, /Needs: 3 sets at 8 reps/);
});

test("formats no-history-anywhere exercises as status only", () => {
  const item = formatProgressionStatusDisplayItem({
    id: "press",
    exerciseName: "Machine Shoulder Press",
    candidate: buildNoneCandidate("Double Progression: no completed history yet."),
    rejectionReason: "no_completed_history",
    historyRows: [],
    plan: buildTarget({ setsMin: 3, setsMax: 3, repsMin: 8, repsMax: 10, weightMin: 100, weightMax: 100 }),
  });

  assert.ok(item);
  assert.equal(item.statusType, "no_history_anywhere");
  assert.equal(item.label, "No history anywhere");
  assert.equal(item.detailLine, "Result: no completed work found for this exercise.");
});

test("formats linked same-fingerprint history as display-only status", () => {
  const linkedTimeRows: ProgressionHistorySetRow[] = [{
    sessionId: "session-exercise-1",
    performedAt: "2026-05-07T12:00:00.000Z",
    setIndex: 1,
    weight: null,
    reps: null,
    weightUnit: null,
    durationSeconds: 180,
    distance: null,
    distanceUnit: null,
    calories: null,
    isWarmup: false,
  }];
  const item = formatProgressionStatusDisplayItem({
    id: "run-day-2",
    exerciseName: "Treadmill Run",
    candidate: buildNoneCandidate("Double Progression: no completed history yet.", buildTarget({ measurementType: "time", durationSeconds: 180, repsMin: null, repsMax: null, weightMin: null, weightMax: null })),
    rejectionReason: "no_completed_history",
    historySource: "linked_same_fingerprint",
    linkedMatchCount: 2,
    historyRows: linkedTimeRows,
    plan: buildTarget({ measurementType: "time", durationSeconds: 180, repsMin: null, repsMax: null, weightMin: null, weightMax: null }),
  });

  assert.ok(item);
  assert.equal(item.statusType, "linked_same_target");
  assert.equal(item.label, "Same target elsewhere");
  assert.match(item.detailLine, /display-only/);
  assert.equal(item.progress?.percent, 96);
  assert.equal(item.progress?.state, "partial");
});

test("formats global exercise history as context-only status", () => {
  const item = formatProgressionStatusDisplayItem({
    id: "bench-new-row",
    exerciseName: "Barbell Bench Press",
    candidate: buildNoneCandidate("Double Progression: no completed history yet."),
    rejectionReason: "no_completed_history",
    historySource: "global_exercise_context",
    historyRows: buildRows([6, 6, 6], 185),
    plan: buildTarget(),
  });

  assert.ok(item);
  assert.equal(item.statusType, "global_history_context");
  assert.equal(item.label, "History exists elsewhere");
  assert.match(item.detailLine, /Context only/);
});

test("formats blocked duplicate active-routine history as context instead of no history", () => {
  const item = formatProgressionStatusDisplayItem({
    id: "bench-duplicate-row",
    exerciseName: "Barbell Bench Press",
    candidate: buildNoneCandidate("Double Progression: no completed history for this planned slot yet."),
    rejectionReason: "duplicate_catalog_exercise_requires_routine_day_exercise_id",
    historySource: "blocked_duplicate_catalog_fallback",
    historyRows: buildRows([6, 6, 6], 185),
    plan: buildTarget(),
  });

  assert.ok(item);
  assert.equal(item.statusType, "global_history_context");
  assert.equal(item.label, "History exists elsewhere");
  assert.match(item.latestLine, /Used: May 7 · 185 lbs · 6 \/ 6 \/ 6/);
});

test("explains above-target Lateral Raise work against the exact planned top-rep target", () => {
  const item = formatProgressionStatusDisplayItem({
    id: "lateral-raise",
    exerciseName: "Lateral Raise",
    candidate: buildNoneCandidate("Double Progression: range is not complete yet.", buildTarget({
      setsMin: 3,
      setsMax: 3,
      repsMin: 15,
      repsMax: 25,
      weightMin: 20,
      weightMax: 20,
    })),
    rejectionReason: "top_range_not_met",
    historyRows: buildRows([8, 8, 8], 30),
    plan: buildTarget({
      setsMin: 3,
      setsMax: 3,
      repsMin: 15,
      repsMax: 25,
      weightMin: 20,
      weightMax: 20,
    }),
  });

  assert.ok(item);
  assert.equal(item.statusType, "above_target_incomplete");
  assert.equal(item.detailLine, "Result: 0/3 qualified at planned reps and load.");
  assert.equal(item.latestLine, "Used: May 7 · 30 lbs · 8 / 8 / 8");
  assert.equal(item.targetLine, "Needs: 3 sets at 25 reps · 20 lbs");
});

test("does not format ready candidates as status rows", () => {
  const item = formatProgressionStatusDisplayItem({
    id: "run",
    exerciseName: "Treadmill Run",
    candidate: {
      type: "promote",
      playbookId: "double_progression",
      label: "Cardio Progression",
      currentTarget: buildTarget({ measurementType: "time", durationSeconds: 180, repsMin: null, repsMax: null, weightMin: null, weightMax: null, weightUnit: null }),
      proposedTarget: buildTarget({ measurementType: "time", durationSeconds: 240, repsMin: null, repsMax: null, weightMin: null, weightMax: null, weightUnit: null }),
      reason: "Cardio Progression: time target complete - increase duration next cycle.",
    },
    rejectionReason: null,
    historyRows: [],
    plan: buildTarget({ measurementType: "time", durationSeconds: 180 }),
  });

  assert.equal(item, null);
});

test("fingerprint links only identical exercise targets and config", () => {
  const base = buildTarget();
  const first = getProgressionTargetFingerprint({
    exerciseId: "treadmill",
    target: base,
    progressionMethod: "cardio_progression",
    progressionStep: 60,
    setFlow: "straight_sets",
    regressionPolicy: "none",
  });
  const same = getProgressionTargetFingerprint({
    exerciseId: "treadmill",
    target: base,
    progressionMethod: "cardio_progression",
    progressionStep: 60,
    setFlow: "straight_sets",
    regressionPolicy: "none",
  });
  const differentTarget = getProgressionTargetFingerprint({
    exerciseId: "treadmill",
    target: buildTarget({ durationSeconds: 240 }),
    progressionMethod: "cardio_progression",
    progressionStep: 60,
    setFlow: "straight_sets",
    regressionPolicy: "none",
  });

  assert.equal(first, same);
  assert.notEqual(first, differentTarget);
});
