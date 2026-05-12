import test from "node:test";
import assert from "node:assert/strict";
import {
  buildProgressionUpdatesStatusReport,
  collapseLinkedProgressionReadyUpdates,
  isUserFacingProgressionUpdatesExercise,
} from "@/lib/progression-review-loader";
import type { ProgressionReviewDisplayItem } from "@/lib/progression-review-display";
import type { ProgressionStatusDisplayItem } from "@/lib/progression-status-display";
import type { RoutineDayExerciseRow } from "@/types/db";

function buildExercise(overrides: Partial<RoutineDayExerciseRow> = {}): RoutineDayExerciseRow {
  return {
    id: "routine-exercise-1",
    user_id: "user-1",
    routine_day_id: "day-1",
    exercise_id: "exercise-1",
    position: 1,
    target_sets: 3,
    target_reps: null,
    target_reps_min: 8,
    target_reps_max: 10,
    target_weight: 100,
    target_weight_unit: "lbs",
    target_duration_seconds: null,
    target_distance: null,
    target_distance_unit: null,
    target_calories: null,
    progression_playbook_id: "double_progression",
    progression_playbook_config: null,
    measurement_type: "reps",
    default_unit: null,
    notes: null,
    ...overrides,
  };
}

function buildReadyItem(overrides: Partial<ProgressionReviewDisplayItem> = {}): ProgressionReviewDisplayItem {
  const exerciseName = overrides.exerciseName ?? "Treadmill Run";
  return {
    id: "rde-ready",
    exerciseName,
    dayName: "Hunt",
    dayGroupId: "day-hunt",
    type: "promote",
    badgeLabel: "Promote",
    summary: `${exerciseName}: 3:00 -> 4:00`,
    summaryParts: {
      exerciseName,
      currentTarget: "3:00",
      proposedTarget: "4:00",
      fallback: null,
    },
    reason: "Double Progression: time target complete - increase duration next cycle.",
    actionLabel: "Promote",
    currentTarget: null,
    proposedTarget: null,
    ...overrides,
  };
}

test("hides Stretch and measurementless mobility from normal Progression Updates", () => {
  assert.equal(isUserFacingProgressionUpdatesExercise(buildExercise({
    target_sets: 1,
    target_reps_min: null,
    target_reps_max: null,
    target_weight: null,
    progression_playbook_id: null,
    measurement_type: "none",
  })), false);
});

test("hides the standalone Stretch exercise from normal Progression Updates even if legacy rows are measurable", () => {
  assert.equal(isUserFacingProgressionUpdatesExercise({
    ...buildExercise({
      measurement_type: "reps",
      target_sets: 1,
      target_reps: 0,
      target_reps_min: null,
      target_reps_max: null,
      target_weight: null,
      progression_playbook_id: null,
    }),
    exerciseName: "Stretch",
  }), false);
});

test("hides legacy Zone 2 Cardio rows from normal Progression Updates", () => {
  assert.equal(isUserFacingProgressionUpdatesExercise({
    ...buildExercise({
      measurement_type: "time",
      target_sets: 1,
      target_reps: null,
      target_reps_min: null,
      target_reps_max: null,
      target_weight: null,
      target_duration_seconds: 1800,
      progression_playbook_id: "double_progression",
    }),
    exerciseName: "Zone 2 Cardio",
  }), false);
});

test("keeps measurable manual exercises visible as status context", () => {
  assert.equal(isUserFacingProgressionUpdatesExercise(buildExercise({
    progression_playbook_id: null,
    measurement_type: "reps",
  })), true);
});

test("keeps configured progression exercises visible even before targets are complete", () => {
  assert.equal(isUserFacingProgressionUpdatesExercise(buildExercise({
    target_sets: null,
    target_reps_min: null,
    target_reps_max: null,
    target_weight: null,
    progression_playbook_id: "double_progression",
    measurement_type: "reps",
  })), true);
});

test("builds a full Progression Updates status report from ready and status rows", () => {
  const readyItems: ProgressionReviewDisplayItem[] = [{
    id: "rde-ready",
    exerciseName: "Weighted Pull-Up",
    dayName: "Hunt",
    dayGroupId: "day-hunt",
    type: "promote",
    badgeLabel: "Promote",
    summary: "Weighted Pull-Up: 25 lbs x 8 -> 35 lbs x 5",
    summaryParts: {
      exerciseName: "Weighted Pull-Up",
      currentTarget: "25 lbs x 8",
      proposedTarget: "35 lbs x 5",
      fallback: null,
    },
    reason: "Completed top reps above target load.",
    actionLabel: "Promote",
    currentTarget: null,
    proposedTarget: null,
    evidence: {
      usedLine: "Used: May 7 · 30 lbs · 8 / 8 / 8",
      needsLine: "Needs: 3 sets at 8 reps · 25 lbs",
      resultLine: "Result: ready update.",
    },
  }];
  const statusItems: ProgressionStatusDisplayItem[] = [{
    id: "rde-status",
    exerciseName: "Bench Press",
    dayName: "Hunt",
    dayGroupId: "day-hunt",
    statusType: "top_range_not_met",
    label: "Not ready yet",
    detailLine: "Result: 2/3 sets hit the top range.",
    targetLine: "Needs: 3 sets at 6 reps · 225 lbs",
    latestLine: "Used: May 7 · 225 lbs · 8 / 7 / 4",
    reason: "Needs all checked sets at top range.",
  }];

  const report = buildProgressionUpdatesStatusReport({ readyItems, statusItems });

  assert.equal(report.readyCount, 1);
  assert.equal(report.statusCount, 1);
  assert.equal(report.totalCount, 2);
  assert.equal(report.days.length, 1);
  assert.equal(report.days[0]?.dayName, "Hunt");
  assert.equal(report.days[0]?.readyCount, 1);
  assert.equal(report.days[0]?.statusCount, 1);
  assert.deepEqual(report.days[0]?.rows.map((row) => row.lane), ["ready_update", "progress_status"]);
  assert.equal(report.days[0]?.rows[0]?.usedLine, "Used: May 7 · 30 lbs · 8 / 8 / 8");
  assert.equal(report.days[0]?.rows[1]?.resultLine, "Result: 2/3 sets hit the top range.");
});

test("collapses identical ready updates into one linked display row", () => {
  const items = collapseLinkedProgressionReadyUpdates([
    {
      item: buildReadyItem({
        id: "hunt-treadmill",
        dayName: "Hunt",
        dayGroupId: "day-hunt",
      }),
      exerciseId: "treadmill-run",
      targetFingerprint: "treadmill-3-minute-target",
      proposedTargetFingerprint: "treadmill-4-minute-proposal",
      linkedTargets: [
        { routineDayExerciseId: "hunt-treadmill", dayName: "Hunt" },
        { routineDayExerciseId: "shade-treadmill", dayName: "Shade" },
        { routineDayExerciseId: "ghost-treadmill", dayName: "Ghost" },
      ],
    },
    {
      item: buildReadyItem({
        id: "shade-treadmill",
        dayName: "Shade",
        dayGroupId: "day-shade",
      }),
      exerciseId: "treadmill-run",
      targetFingerprint: "treadmill-3-minute-target",
      proposedTargetFingerprint: "treadmill-4-minute-proposal",
      linkedTargets: [
        { routineDayExerciseId: "shade-treadmill", dayName: "Shade" },
        { routineDayExerciseId: "hunt-treadmill", dayName: "Hunt" },
        { routineDayExerciseId: "ghost-treadmill", dayName: "Ghost" },
      ],
    },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0]?.id, "hunt-treadmill");
  assert.equal(items[0]?.linkedUpdate?.count, 3);
  assert.deepEqual(items[0]?.linkedUpdate?.dayNames, ["Hunt", "Shade", "Ghost"]);
  assert.deepEqual(items[0]?.linkedUpdate?.routineDayExerciseIds, ["hunt-treadmill", "shade-treadmill", "ghost-treadmill"]);
  assert.deepEqual(items[0]?.linkedUpdate?.targets, [
    { routineDayExerciseId: "hunt-treadmill", dayName: "Hunt" },
    { routineDayExerciseId: "shade-treadmill", dayName: "Shade" },
    { routineDayExerciseId: "ghost-treadmill", dayName: "Ghost" },
  ]);
  assert.match(items[0]?.reason ?? "", /Same target exists on 3 routine days/);
});

test("does not collapse ready updates when the proposed target differs", () => {
  const items = collapseLinkedProgressionReadyUpdates([
    {
      item: buildReadyItem({
        id: "hunt-treadmill",
        dayName: "Hunt",
        dayGroupId: "day-hunt",
      }),
      exerciseId: "treadmill-run",
      targetFingerprint: "treadmill-3-minute-target",
      proposedTargetFingerprint: "treadmill-4-minute-proposal",
      linkedTargets: [{ routineDayExerciseId: "hunt-treadmill", dayName: "Hunt" }],
    },
    {
      item: buildReadyItem({
        id: "shade-treadmill",
        dayName: "Shade",
        dayGroupId: "day-shade",
        summaryParts: {
          exerciseName: "Treadmill Run",
          currentTarget: "3:00",
          proposedTarget: "5:00",
          fallback: null,
        },
      }),
      exerciseId: "treadmill-run",
      targetFingerprint: "treadmill-3-minute-target",
      proposedTargetFingerprint: "treadmill-5-minute-proposal",
      linkedTargets: [{ routineDayExerciseId: "shade-treadmill", dayName: "Shade" }],
    },
  ]);

  assert.equal(items.length, 2);
  assert.equal(items[0]?.linkedUpdate, undefined);
  assert.equal(items[1]?.linkedUpdate, undefined);
});
