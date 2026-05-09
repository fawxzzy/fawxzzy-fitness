import test from "node:test";
import assert from "node:assert/strict";
import {
  formatProgressionAuditRejectionReason,
  inferProgressionAuditRejectionReason,
  type ProgressionAuditRejectionReason,
} from "@/lib/progression-candidate-audit";
import type { ProgressionReviewCandidate } from "@/lib/progression-playbooks";

function buildNoneCandidate(reason: string): ProgressionReviewCandidate {
  return {
    type: "none",
    playbookId: "double_progression",
    label: "Double Progression",
    currentTarget: null,
    proposedTarget: null,
    reason,
  };
}

function buildPromoteCandidate(): ProgressionReviewCandidate {
  return {
    type: "promote",
    playbookId: "double_progression",
    label: "Double Progression",
    currentTarget: null,
    proposedTarget: null,
    reason: "Double Progression: top range reached - increase load next cycle.",
  };
}

test("formats progression audit rejection reasons", () => {
  const cases: Array<[ProgressionAuditRejectionReason | null, string]> = [
    ["manual_method", "Manual method"],
    ["duplicate_catalog_exercise_requires_routine_day_exercise_id", "Duplicate catalog exercise requires routine-day exercise history"],
    ["no_completed_history", "No completed history"],
    ["top_range_not_met", "Top range not met"],
    [null, "Candidate ready"],
  ];

  for (const [reason, label] of cases) {
    assert.equal(formatProgressionAuditRejectionReason(reason), label);
  }
});

test("does not return a rejection reason for a live candidate", () => {
  assert.equal(inferProgressionAuditRejectionReason({
    candidate: buildPromoteCandidate(),
    hasConfiguredPlaybook: true,
    hasValidSelection: true,
    historySource: "routine_day_exercise_id",
    completedSetCount: 3,
    completedSessionCount: 1,
    measurementType: "reps",
  }), null);
});

test("classifies manual and invalid progression configs", () => {
  assert.equal(inferProgressionAuditRejectionReason({
    candidate: buildNoneCandidate("Manual target: no progression review candidate."),
    hasConfiguredPlaybook: false,
    hasValidSelection: false,
    historySource: "none",
    completedSetCount: 0,
    completedSessionCount: 0,
    measurementType: "reps",
  }), "manual_method");

  assert.equal(inferProgressionAuditRejectionReason({
    candidate: buildNoneCandidate("Manual target: no progression review candidate."),
    hasConfiguredPlaybook: true,
    hasValidSelection: false,
    historySource: "none",
    completedSetCount: 0,
    completedSessionCount: 0,
    measurementType: "reps",
  }), "invalid_config");
});

test("classifies duplicate fallback and empty history before generic candidate reasons", () => {
  assert.equal(inferProgressionAuditRejectionReason({
    candidate: buildNoneCandidate("Double Progression: no completed history yet."),
    hasConfiguredPlaybook: true,
    hasValidSelection: true,
    historySource: "blocked_duplicate_catalog_fallback",
    completedSetCount: 0,
    completedSessionCount: 0,
    measurementType: "reps",
  }), "duplicate_catalog_exercise_requires_routine_day_exercise_id");

  assert.equal(inferProgressionAuditRejectionReason({
    candidate: buildNoneCandidate("Double Progression: no completed history yet."),
    hasConfiguredPlaybook: true,
    hasValidSelection: true,
    historySource: "none",
    completedSetCount: 0,
    completedSessionCount: 0,
    measurementType: "reps",
  }), "no_completed_history");
});

test("classifies common engine rejection reasons", () => {
  assert.equal(inferProgressionAuditRejectionReason({
    candidate: buildNoneCandidate("Double Progression: range is not complete yet."),
    hasConfiguredPlaybook: true,
    hasValidSelection: true,
    historySource: "routine_day_exercise_id",
    completedSetCount: 3,
    completedSessionCount: 1,
    measurementType: "reps",
  }), "top_range_not_met");

  assert.equal(inferProgressionAuditRejectionReason({
    candidate: buildNoneCandidate("Double Progression: current target is incomplete, so no review candidate was created."),
    hasConfiguredPlaybook: true,
    hasValidSelection: true,
    historySource: "routine_day_exercise_id",
    completedSetCount: 3,
    completedSessionCount: 1,
    measurementType: "reps",
  }), "incomplete_target");

  assert.equal(inferProgressionAuditRejectionReason({
    candidate: buildNoneCandidate("Double Progression does not support this exercise yet; use current goal."),
    hasConfiguredPlaybook: true,
    hasValidSelection: true,
    historySource: "routine_day_exercise_id",
    completedSetCount: 1,
    completedSessionCount: 1,
    measurementType: "time",
  }), "unsupported_measurement");
});
