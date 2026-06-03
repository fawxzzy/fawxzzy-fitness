import test from "node:test";
import assert from "node:assert/strict";
import {
  buildProgressionStatusSurfaceItem,
  formatProgressionStatusDisplayItem,
  getProgressionTargetFingerprint,
} from "@/lib/progression-status-display";
import type {
  ProgressionHistorySetRow,
  ProgressionPlaybookSelection,
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

function buildNoneCandidate(
  reason: string,
  target = buildTarget(),
  overrides: Partial<ProgressionReviewCandidate> = {},
): ProgressionReviewCandidate {
  return {
    type: "none",
    playbookId: "double_progression",
    label: "Double Progression",
    currentTarget: target,
    proposedTarget: null,
    reason,
    ...overrides,
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

function buildSelection(overrides: Partial<Extract<ProgressionPlaybookSelection, { id: "double_progression" }>["config"]> = {}): ProgressionPlaybookSelection {
  return {
    id: "double_progression",
    config: {
      version: 1,
      loadIncrement: 5,
      promotionBasis: "weight_and_reps",
      repPromotionThreshold: "top_of_range",
      ...overrides,
    },
  };
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

test("surfaces qualification-window progress when present on a non-ready candidate", () => {
  const item = formatProgressionStatusDisplayItem({
    id: "bench-window",
    exerciseName: "Barbell Bench Press",
    candidate: buildNoneCandidate(
      "Double Progression: 1 of 2 qualifying sessions complete.",
      buildTarget({ setsMin: 3, setsMax: 3, repsMin: 8, repsMax: 12, weightMin: 225, weightMax: 225 }),
      { qualificationWindowLine: "1 of 2 qualifying sessions complete" },
    ),
    rejectionReason: "top_range_not_met",
    historyRows: buildRows([12, 11, 10], 225),
    plan: buildTarget({ setsMin: 3, setsMax: 3, repsMin: 8, repsMax: 12, weightMin: 225, weightMax: 225 }),
  });

  assert.ok(item);
  assert.equal(item.detailLine, "1 of 2 qualifying sessions complete");
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

test("manual progression rows stay hidden from exercise-card fill consumers", () => {
  const item = formatProgressionStatusDisplayItem({
    id: "manual-bench",
    exerciseName: "Barbell Bench Press",
    candidate: buildNoneCandidate("Manual progression: targets update manually."),
    rejectionReason: "manual_method",
    historyRows: buildRows([6, 6, 6], 185),
    plan: buildTarget(),
  });

  assert.ok(item);
  assert.equal(item.statusType, "manual");
  assert.equal(item.progress?.percent, 0);
  assert.equal(item.progress?.state, "manual_hidden");
});

test("invalid progression config does not emit promotion-goal fill", () => {
  const item = formatProgressionStatusDisplayItem({
    id: "invalid-config",
    exerciseName: "Barbell Bench Press",
    candidate: buildNoneCandidate("Progression config is invalid."),
    rejectionReason: "invalid_config",
    historyRows: buildRows([6, 6, 6], 185),
    plan: buildTarget(),
  });

  assert.ok(item);
  assert.equal(item.progress?.percent, 0);
  assert.equal(item.progress?.state, "unsupported");
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

test("builds a ready status surface row with top-half rep guidance", () => {
  const item = buildProgressionStatusSurfaceItem({
    id: "bench-ready",
    exerciseName: "Barbell Bench Press",
    candidate: {
      type: "promote",
      playbookId: "double_progression",
      label: "Double Progression",
      currentTarget: buildTarget({ setsMin: 3, setsMax: 3, repsMin: 8, repsMax: 12, weightMin: 225, weightMax: 225 }),
      proposedTarget: buildTarget({ setsMin: 3, setsMax: 3, repsMin: 8, repsMax: 12, weightMin: 230, weightMax: 230 }),
      reason: "Double Progression: top-half rep target complete - increase load next cycle.",
      sourceSession: {
        sessionId: "session-exercise-1",
        performedAt: "2026-05-07T12:00:00.000Z",
        isLatest: true,
      },
    },
    rejectionReason: null,
    historyRows: buildRows([12, 11, 10], 225),
    plan: buildTarget({ setsMin: 3, setsMax: 3, repsMin: 8, repsMax: 12, weightMin: 225, weightMax: 225 }),
    selection: buildSelection({ repPromotionThreshold: "top_half_of_range" }),
  });

  assert.equal(item.readinessState, "ready");
  assert.equal(item.readinessLabel, "Ready");
  assert.equal(item.promotionBasisLabel, "Weight + reps");
  assert.equal(item.repTargetLine, "Rep target for promotion: Top half of range · 8-12 => 10+ reps");
  assert.equal(item.nextUpdateLine, "Next update: 12 reps • 230 lbs");
});

test("builds a weight-only status surface row that explains reps do not block readiness", () => {
  const item = buildProgressionStatusSurfaceItem({
    id: "press-weight-only",
    exerciseName: "Strict Press",
    candidate: buildNoneCandidate("Double Progression: no completed target-load session is ready for cycle review.", buildTarget({
      setsMin: 3,
      setsMax: 3,
      repsMin: 5,
      repsMax: 8,
      weightMin: 135,
      weightMax: 135,
    })),
    rejectionReason: "incomplete_sets",
    historyRows: buildRows([6, 6], 135),
    plan: buildTarget({
      setsMin: 3,
      setsMax: 3,
      repsMin: 5,
      repsMax: 8,
      weightMin: 135,
      weightMax: 135,
    }),
    selection: buildSelection({ promotionBasis: "weight_only" }),
  });

  assert.equal(item.readinessState, "not_ready");
  assert.equal(item.promotionBasisLabel, "Weight only");
  assert.equal(item.promotionBasisDetail, "Weight-only promotion: reps are tracked for guidance but do not block readiness.");
  assert.equal(item.repTargetLine, null);
});

test("builds a reps-only status surface row that explains load does not block readiness", () => {
  const item = buildProgressionStatusSurfaceItem({
    id: "rehab-reps-only",
    exerciseName: "Heel Raise",
    candidate: buildNoneCandidate("Double Progression: range is not complete yet.", buildTarget({
      setsMin: 3,
      setsMax: 3,
      repsMin: 12,
      repsMax: 15,
      weightMin: null,
      weightMax: null,
      weightUnit: null,
    })),
    rejectionReason: "top_range_not_met",
    historyRows: buildRows([14, 13, 12], 0),
    plan: buildTarget({
      setsMin: 3,
      setsMax: 3,
      repsMin: 12,
      repsMax: 15,
      weightMin: null,
      weightMax: null,
      weightUnit: null,
    }),
    selection: buildSelection({ promotionBasis: "reps_only", repPromotionThreshold: "custom", customRepPromotionTarget: 14 }),
  });

  assert.equal(item.readinessState, "not_ready");
  assert.equal(item.promotionBasisLabel, "Reps only");
  assert.equal(item.promotionBasisDetail, "Reps-only promotion: load is tracked for context but does not block readiness.");
  assert.equal(item.repTargetLine, "Rep target for promotion: Custom rep target · 12-15 => 14+ reps");
});

test("builds an insufficient-evidence surface row for legacy config defaults", () => {
  const item = buildProgressionStatusSurfaceItem({
    id: "legacy-defaults",
    exerciseName: "Machine Row",
    candidate: buildNoneCandidate("Double Progression: no completed history yet.", buildTarget({
      setsMin: 3,
      setsMax: 3,
      repsMin: 8,
      repsMax: 12,
      weightMin: 140,
      weightMax: 140,
    })),
    rejectionReason: "no_completed_history",
    historyRows: [],
    plan: buildTarget({
      setsMin: 3,
      setsMax: 3,
      repsMin: 8,
      repsMax: 12,
      weightMin: 140,
      weightMax: 140,
    }),
    selection: buildSelection(),
  });

  assert.equal(item.readinessState, "insufficient_evidence");
  assert.equal(item.readinessLabel, "Insufficient evidence");
  assert.equal(item.promotionBasisLabel, "Weight + reps");
  assert.equal(item.repTargetLine, "Rep target for promotion: Top of range · 8-12 => 12+ reps");
});

test("builds a manual surface row without progress fill", () => {
  const item = buildProgressionStatusSurfaceItem({
    id: "manual-surface",
    exerciseName: "Barbell Bench Press",
    candidate: buildNoneCandidate("Manual progression: targets update manually."),
    rejectionReason: "manual_method",
    historyRows: buildRows([6, 6, 6], 185),
    plan: buildTarget(),
    selection: null,
  });

  assert.equal(item.readinessState, "manual");
  assert.equal(item.readinessLabel, "Manual");
  assert.equal(item.progress?.percent, 0);
  assert.equal(item.progress?.state, "manual_hidden");
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
