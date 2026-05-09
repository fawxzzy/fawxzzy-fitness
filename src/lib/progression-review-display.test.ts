import test from "node:test";
import assert from "node:assert/strict";
import { formatProgressionReviewDisplayItem } from "@/lib/progression-review-display";
import type { ProgressionReviewCandidate, ProgressionTargetPlan } from "@/lib/progression-playbooks";

function buildTarget(overrides: Partial<ProgressionTargetPlan> = {}): ProgressionTargetPlan {
  return {
    measurementType: "reps",
    setsMin: 3,
    setsMax: 3,
    repsMin: 8,
    repsMax: 10,
    weightMin: 135,
    weightMax: 135,
    weightUnit: "lbs",
    ...overrides,
  };
}

function buildCandidate(overrides: Partial<ProgressionReviewCandidate>): ProgressionReviewCandidate {
  return {
    type: "promote",
    playbookId: "double_progression",
    label: "Double Progression",
    currentTarget: buildTarget(),
    proposedTarget: buildTarget({ repsMin: 8, repsMax: 8, weightMin: 140, weightMax: 140 }),
    reason: "Double Progression: top range reached - increase load next cycle.",
    ...overrides,
  };
}

test("formats promote candidate copy with current and proposed targets", () => {
  const item = formatProgressionReviewDisplayItem({
    id: "bench",
    exerciseName: "Bench Press",
    candidate: buildCandidate({}),
  });

  assert.ok(item);
  assert.equal(item.type, "promote");
  assert.equal(item.badgeLabel, "Promote");
  assert.equal(item.actionLabel, "Promote");
  assert.equal(item.summary, "Bench Press: 135 lbs x 10 -> 140 lbs x 8");
});

test("formats review candidate copy without pretending to increase load", () => {
  const item = formatProgressionReviewDisplayItem({
    id: "raise",
    exerciseName: "Lateral Raise",
    candidate: buildCandidate({
      type: "review",
      playbookId: "fixed_load_rep_range_progression",
      label: "Manual Review",
      proposedTarget: buildTarget(),
      reason: "Manual Review: range complete - review before increasing.",
    }),
  });

  assert.ok(item);
  assert.equal(item.type, "review");
  assert.equal(item.badgeLabel, "Review");
  assert.equal(item.actionLabel, "Review manually");
  assert.equal(item.summary, "Lateral Raise: 135 lbs x 10");
  assert.equal(item.proposedTarget?.weightMin, 135);
  assert.match(item.reason, /review before increasing/i);
});

test("formats deload candidate copy as regression", () => {
  const item = formatProgressionReviewDisplayItem({
    id: "squat",
    exerciseName: "Squat",
    candidate: buildCandidate({
      type: "deload",
      playbookId: "double_progression",
      label: "Double Progression",
      proposedTarget: buildTarget({ repsMin: 8, repsMax: 8, weightMin: 120, weightMax: 120 }),
      reason: "Deload policy: stall detected - reduce load and rebuild.",
    }),
  });

  assert.ok(item);
  assert.equal(item.type, "deload");
  assert.equal(item.badgeLabel, "Regression");
  assert.equal(item.actionLabel, "Apply regression");
  assert.equal(item.summary, "Squat: 135 lbs x 10 -> 120 lbs x 8");
});

test("formats cardio progression candidates without load copy", () => {
  const item = formatProgressionReviewDisplayItem({
    id: "run",
    exerciseName: "Treadmill Run",
    candidate: buildCandidate({
      currentTarget: buildTarget({
        measurementType: "time",
        repsMin: null,
        repsMax: null,
        weightMin: null,
        weightMax: null,
        weightUnit: null,
        durationSeconds: 1200,
      }),
      proposedTarget: buildTarget({
        measurementType: "time",
        repsMin: null,
        repsMax: null,
        weightMin: null,
        weightMax: null,
        weightUnit: null,
        durationSeconds: 1260,
      }),
      reason: "Double Progression: time target complete - increase duration next cycle.",
    }),
  });

  assert.ok(item);
  assert.equal(item.summary, "Treadmill Run: 20:00 -> 21:00");
  assert.doesNotMatch(item.summary, /load|lbs/i);
});

test("formats time distance progression candidates", () => {
  const item = formatProgressionReviewDisplayItem({
    id: "run",
    exerciseName: "Outdoor Run",
    candidate: buildCandidate({
      currentTarget: buildTarget({
        measurementType: "time_distance",
        repsMin: null,
        repsMax: null,
        weightMin: null,
        weightMax: null,
        weightUnit: null,
        durationSeconds: 1200,
        distance: 2,
        distanceUnit: "mi",
      }),
      proposedTarget: buildTarget({
        measurementType: "time_distance",
        repsMin: null,
        repsMax: null,
        weightMin: null,
        weightMax: null,
        weightUnit: null,
        durationSeconds: 1200,
        distance: 2.1,
        distanceUnit: "mi",
      }),
      reason: "Double Progression: time + distance target complete - hold time and increase distance next cycle.",
    }),
  });

  assert.ok(item);
  assert.equal(item.summary, "Outdoor Run: 20:00 | 2 mi -> 20:00 | 2.1 mi");
});

test("does not format empty candidates", () => {
  const item = formatProgressionReviewDisplayItem({
    id: "manual",
    exerciseName: "Curl",
    candidate: buildCandidate({
      type: "none",
      playbookId: null,
      label: null,
      proposedTarget: null,
      reason: "Manual target: no progression review candidate.",
    }),
  });

  assert.equal(item, null);
});
