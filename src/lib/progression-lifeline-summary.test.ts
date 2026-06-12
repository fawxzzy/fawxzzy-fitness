import assert from "node:assert/strict";
import test from "node:test";

import {
  buildExerciseProgressionLifelineSummary,
  buildProgressionAnalyticsDigest,
  buildStructuredProgressionActivityItem,
  buildSessionProgressionSummary,
} from "./progression-lifeline-summary";
import type { ProgressionEventRow } from "@/types/db";

function buildEvent(overrides: Partial<ProgressionEventRow> = {}): ProgressionEventRow {
  return {
    id: "event-1",
    user_id: "user-1",
    routine_id: "routine-1",
    routine_day_exercise_id: "rde-1",
    exercise_id: "exercise-1",
    event_type: "promotion_applied",
    from_target: { measurementType: "reps", repsMin: 8, repsMax: 10, weightMin: 135, weightMax: 135, weightUnit: "lbs" },
    to_target: { measurementType: "reps", repsMin: 10, repsMax: 12, weightMin: 135, weightMax: 135, weightUnit: "lbs" },
    method: "double_progression",
    vector: "reps",
    step: { repsDelta: 2 },
    reason: "Completed the target range.",
    source_session_id: "session-1",
    created_at: "2026-05-01T12:00:00.000Z",
    ...overrides,
  };
}

test("buildProgressionAnalyticsDigest counts event families and linked sessions", () => {
  const digest = buildProgressionAnalyticsDigest([
    buildEvent(),
    buildEvent({
      id: "event-2",
      event_type: "manual_target_change",
      source_session_id: null,
      created_at: "2026-05-03T12:00:00.000Z",
    }),
    buildEvent({
      id: "event-3",
      event_type: "deload_applied",
      source_session_id: "session-2",
      created_at: "2026-05-05T12:00:00.000Z",
    }),
    buildEvent({
      id: "event-4",
      event_type: "watch_applied",
      source_session_id: null,
      created_at: "2026-05-06T12:00:00.000Z",
    }),
  ]);

  assert.equal(digest.eventCount, 4);
  assert.equal(digest.promotionCount, 1);
  assert.equal(digest.manualChangeCount, 1);
  assert.equal(digest.watchCount, 1);
  assert.equal(digest.deloadCount, 1);
  assert.equal(digest.linkedSessionCount, 2);
  assert.equal(digest.latestChangeAt, "2026-05-06T12:00:00.000Z");
});

test("buildExerciseProgressionLifelineSummary formats the target path", () => {
  const summary = buildExerciseProgressionLifelineSummary([
    buildEvent(),
    buildEvent({
      id: "event-2",
      created_at: "2026-05-10T12:00:00.000Z",
      from_target: { measurementType: "reps", repsMin: 10, repsMax: 12, weightMin: 135, weightMax: 135, weightUnit: "lbs" },
      to_target: { measurementType: "reps", repsMin: 12, repsMax: 12, weightMin: 140, weightMax: 140, weightUnit: "lbs" },
    }),
  ]);

  assert.ok(summary);
  assert.equal(summary?.promotionCount, 2);
  assert.match(summary?.firstTargetLabel ?? "", /10 reps/i);
  assert.match(summary?.currentTargetLabel ?? "", /12 reps/i);
  assert.match(summary?.latestChangeSummary ?? "", /140 lbs/i);
  assert.equal(summary?.lifelineItems[0]?.startsWith("Latest:"), true);
  assert.equal(summary?.lifelineItems[1]?.startsWith("Target Path:"), true);
  assert.equal(summary?.recentWindowDays, 30);
  assert.equal(summary?.recentEventCount, 2);
  assert.equal(summary?.recentPromotionCount, 2);
  assert.equal(summary?.recentActivitySummary, "2 updates | 2 promotions");
  assert.equal(summary?.recentFocusSummary, null);
  assert.deepEqual((summary?.chartSections ?? []).map((section) => section.title), [
    "Progression Activity",
    "Change Mix",
  ]);
  assert.deepEqual(summary?.activityDays?.map((day) => `${day.label}:${day.eventCount}`), [
    "May 1:1",
    "May 10:1",
  ]);
  assert.deepEqual(
    summary?.activityDays?.[1]?.items.map((item) => (
      typeof item === "string" ? item : `${item.primary}|${item.value ?? ""}|${item.signals ?? ""}`
    )),
    [
      "Weight|135 lbs → 140 lbs|promotion",
    ],
  );
});

test("buildExerciseProgressionLifelineSummary condenses shared cardio target segments in latest change", () => {
  const summary = buildExerciseProgressionLifelineSummary([
    buildEvent({
      event_type: "manual_target_change",
      from_target: { measurementType: "time_distance", durationSeconds: 180, distance: 1, distanceUnit: "mi" },
      to_target: { measurementType: "time", durationSeconds: 180 },
    }),
  ]);

  assert.equal(summary?.latestChangeSummary, "Distance removed");
});

test("buildExerciseProgressionLifelineSummary labels single-measurement reductions clearly", () => {
  const summary = buildExerciseProgressionLifelineSummary([
    buildEvent({
      event_type: "manual_target_change",
      from_target: { measurementType: "time_distance", durationSeconds: 180, distance: 2, distanceUnit: "mi" },
      to_target: { measurementType: "time_distance", durationSeconds: 180, distance: 1, distanceUnit: "mi" },
    }),
  ]);

  assert.equal(summary?.latestChangeSummary, "Distance reduced | 2 mi → 1 mi");
});

test("buildStructuredProgressionActivityItem marks promotion reverts as regressions", () => {
  const item = buildStructuredProgressionActivityItem({
    event: buildEvent({
      event_type: "promotion_reverted",
      from_target: { measurementType: "reps", repsMin: 10, repsMax: 12, weightMin: 135, weightMax: 135, weightUnit: "lbs" },
      to_target: { measurementType: "reps", repsMin: 8, repsMax: 10, weightMin: 135, weightMax: 135, weightUnit: "lbs" },
    }),
  });

  assert.equal(item.signals, "regression");
  assert.notEqual(item.primary, "Promotion reverted");
});

test("buildSessionProgressionSummary rolls session updates into a session headline", () => {
  const exerciseNameById = new Map([
    ["exercise-1", "Back Squat"],
    ["exercise-2", "Bench Press"],
  ]);
  const summary = buildSessionProgressionSummary([
    buildEvent(),
    buildEvent({
      id: "event-2",
      exercise_id: "exercise-2",
      source_session_id: "session-1",
      created_at: "2026-05-02T12:00:00.000Z",
    }),
  ], exerciseNameById);

  assert.ok(summary);
  assert.equal(summary?.promotionCount, 2);
  assert.equal(summary?.headline, "2 promotions applied");
  assert.equal(summary?.affectedExerciseNames.length, 2);
});

test("buildExerciseProgressionLifelineSummary reports mixed recent activity when no event type dominates", () => {
  const summary = buildExerciseProgressionLifelineSummary([
    buildEvent(),
    buildEvent({
      id: "event-2",
      event_type: "manual_target_change",
      created_at: "2026-05-12T12:00:00.000Z",
    }),
    buildEvent({
      id: "event-3",
      event_type: "deload_applied",
      created_at: "2026-05-14T12:00:00.000Z",
    }),
  ]);

  assert.equal(summary?.recentEventCount, 3);
  assert.equal(summary?.recentPromotionCount, 1);
  assert.equal(summary?.recentDeloadCount, 1);
  assert.equal(summary?.recentManualChangeCount, 1);
  assert.equal(summary?.recentFocusSummary, null);
});

test("buildExerciseProgressionLifelineSummary keeps recent focus only when one signal leads a mixed window", () => {
  const summary = buildExerciseProgressionLifelineSummary([
    buildEvent(),
    buildEvent({
      id: "event-2",
      created_at: "2026-05-10T12:00:00.000Z",
    }),
    buildEvent({
      id: "event-3",
      event_type: "manual_target_change",
      created_at: "2026-05-14T12:00:00.000Z",
    }),
  ]);

  assert.equal(summary?.recentEventCount, 3);
  assert.equal(summary?.recentPromotionCount, 2);
  assert.equal(summary?.recentManualChangeCount, 1);
  assert.equal(summary?.recentFocusSummary, "2 promotions led recent changes");
});
