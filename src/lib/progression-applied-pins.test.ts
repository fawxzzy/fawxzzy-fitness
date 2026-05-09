import test from "node:test";
import assert from "node:assert/strict";
import {
  buildProgressionAppliedPin,
  clearProgressionAppliedPinsForRoutineDay,
  finalizeAppliedPinsForCurrentTargets,
  getPendingProgressionAppliedPinsForRoutineDay,
  markProgressionAppliedPinsSourceDeleted,
  mergeProgressionAppliedPinsWithItems,
  pruneExpiredProgressionAppliedPins,
  removeProgressionAppliedPin,
  upsertProgressionAppliedPin,
} from "@/lib/progression-applied-pins";
import type { ProgressionReviewDisplayItem } from "@/lib/progression-review-display";
import type { ProgressionTargetPlan } from "@/lib/progression-playbooks";

function buildTarget(weight: number): ProgressionTargetPlan {
  return {
    measurementType: "reps",
    setsMin: 3,
    setsMax: 3,
    repsMin: 5,
    repsMax: 8,
    weightMin: weight,
    weightMax: weight,
    weightUnit: "lbs",
  };
}

function buildItem(id = "pull-up"): ProgressionReviewDisplayItem {
  return {
    id,
    exerciseName: "Weighted Pull-Up",
    dayName: "Hunt",
    dayGroupId: "day-1",
    type: "promote",
    badgeLabel: "Promote",
    summary: "Weighted Pull-Up: 25 lbs x 8 -> 35 lbs x 5",
    summaryParts: {
      exerciseName: "Weighted Pull-Up",
      currentTarget: "25 lbs x 8",
      proposedTarget: "35 lbs x 5",
      fallback: null,
    },
    reason: "Double Progression: increase load next cycle.",
    actionLabel: "Promote",
    currentTarget: buildTarget(25),
    proposedTarget: buildTarget(35),
    sourceSession: {
      sessionId: "source-session-1",
      performedAt: "2026-05-04T10:00:00.000Z",
      isLatest: true,
    },
  };
}

test("applied pin preserves exact previous and applied target snapshots", () => {
  const pin = buildProgressionAppliedPin({
    item: buildItem(),
    previousTarget: buildTarget(25),
    appliedTarget: buildTarget(35),
    now: 1000,
  });

  assert.equal(pin.routineDayExerciseId, "pull-up");
  assert.equal(pin.previousTarget.weightMin, 25);
  assert.equal(pin.appliedTarget.weightMin, 35);
  assert.equal(pin.item.actionLabel, "Revert");
  assert.equal(pin.lifecycleState, "pending_revert");
  assert.equal(pin.sourceSessionId, "source-session-1");
  assert.match(pin.item.reason, /Applied/);
});

test("routine-day lock-in helpers find and clear only pins for that day", () => {
  const huntPin = buildProgressionAppliedPin({
    item: buildItem("pull-up"),
    previousTarget: buildTarget(25),
    appliedTarget: buildTarget(35),
    now: Date.now(),
  });
  const shadePin = buildProgressionAppliedPin({
    item: { ...buildItem("row"), dayGroupId: "day-2" },
    previousTarget: buildTarget(100),
    appliedTarget: buildTarget(105),
    now: Date.now(),
  });

  assert.deepEqual(
    getPendingProgressionAppliedPinsForRoutineDay({ pins: [huntPin, shadePin], routineDayId: "day-1" }).map((pin) => pin.routineDayExerciseId),
    ["pull-up"],
  );
  assert.deepEqual(
    clearProgressionAppliedPinsForRoutineDay({ pins: [huntPin, shadePin], routineDayId: "day-1" }).map((pin) => pin.routineDayExerciseId),
    ["row"],
  );
});

test("source-deleted pins become stale review state without mutating targets", () => {
  const pin = buildProgressionAppliedPin({
    item: buildItem("pull-up"),
    previousTarget: buildTarget(25),
    appliedTarget: buildTarget(35),
    now: 1000,
  });

  const [stalePin] = markProgressionAppliedPinsSourceDeleted({
    pins: [pin],
    deletedSessionId: "source-session-1",
  });

  assert.equal(stalePin?.lifecycleState, "stale_source_deleted");
  assert.equal(stalePin?.previousTarget.weightMin, 25);
  assert.equal(stalePin?.appliedTarget.weightMin, 35);
  assert.match(stalePin?.item.reason ?? "", /Source session was removed/);
});

test("applied pin stays visible when server candidate disappears", () => {
  const pin = buildProgressionAppliedPin({
    item: buildItem(),
    previousTarget: buildTarget(25),
    appliedTarget: buildTarget(35),
    now: 1000,
  });

  const merged = mergeProgressionAppliedPinsWithItems({
    items: [],
    pins: [pin],
  });

  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, "pull-up");
});

test("pinned row wins over a refreshed server candidate for the same exercise", () => {
  const pin = buildProgressionAppliedPin({
    item: buildItem(),
    previousTarget: buildTarget(25),
    appliedTarget: buildTarget(35),
    now: 1000,
  });

  const merged = mergeProgressionAppliedPinsWithItems({
    items: [buildItem("pull-up"), buildItem("bench")],
    pins: [pin],
  });

  assert.deepEqual(merged.map((item) => item.id), ["pull-up", "bench"]);
  assert.equal(merged[0].actionLabel, "Revert");
});

test("applied pin finalizes once a refreshed candidate starts from the applied target", () => {
  const pin = buildProgressionAppliedPin({
    item: buildItem(),
    previousTarget: buildTarget(25),
    appliedTarget: buildTarget(35),
    now: 1000,
  });
  const nextCandidate = {
    ...buildItem(),
    currentTarget: buildTarget(35),
    proposedTarget: buildTarget(40),
  };

  const pins = finalizeAppliedPinsForCurrentTargets({
    pins: [pin],
    items: [nextCandidate],
  });

  assert.equal(pins.length, 0);
});

test("revert removes the pinned applied row", () => {
  const pin = buildProgressionAppliedPin({
    item: buildItem(),
    previousTarget: buildTarget(25),
    appliedTarget: buildTarget(35),
    now: 1000,
  });

  assert.deepEqual(removeProgressionAppliedPin([pin], "pull-up"), []);
});

test("expired applied pins are pruned", () => {
  const pin = buildProgressionAppliedPin({
    item: buildItem(),
    previousTarget: buildTarget(25),
    appliedTarget: buildTarget(35),
    now: 1000,
  });

  assert.equal(pruneExpiredProgressionAppliedPins([pin], pin.expiresAt + 1).length, 0);
  assert.equal(pruneExpiredProgressionAppliedPins([pin], pin.expiresAt - 1).length, 1);
});

test("upsert replaces old pin for the same planned exercise", () => {
  const oldPin = buildProgressionAppliedPin({
    item: buildItem(),
    previousTarget: buildTarget(25),
    appliedTarget: buildTarget(35),
    now: 1000,
  });
  const newPin = buildProgressionAppliedPin({
    item: buildItem(),
    previousTarget: buildTarget(35),
    appliedTarget: buildTarget(45),
    now: 2000,
  });

  const pins = upsertProgressionAppliedPin([oldPin], newPin);
  assert.equal(pins.length, 1);
  assert.equal(pins[0].previousTarget.weightMin, 35);
});
