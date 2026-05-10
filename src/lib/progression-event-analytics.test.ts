import assert from "node:assert/strict";
import test from "node:test";

import {
  bucketProgressionEventsByTime,
  countDeloadAppliedEvents,
  countManualTargetChangeEvents,
  countProgressionEvents,
  countProgressionEventsByMethod,
  countProgressionEventsByType,
  countProgressionEventsByVector,
  countPromotionAppliedEvents,
  countPromotionRevertedEvents,
  getLatestProgressionEventByExercise,
  getTopProgressedExercisesByPromotionCount,
  summarizeProgressionEventAnalytics,
  summarizeProgressionEventNumericDeltas,
} from "@/lib/progression-event-analytics";
import type { ProgressionEventRow } from "@/types/db";

function buildEvent(overrides: Partial<ProgressionEventRow> = {}): ProgressionEventRow {
  return {
    id: "event-1",
    user_id: "user-1",
    routine_id: "routine-1",
    routine_day_exercise_id: "rde-1",
    exercise_id: "exercise-1",
    event_type: "promotion_applied",
    from_target: {
      measurementType: "reps",
      setsMin: 3,
      setsMax: 3,
      repsTarget: null,
      repsMin: 8,
      repsMax: 12,
      weightMin: 100,
      weightMax: 100,
      weightUnit: "lbs",
      durationSeconds: null,
      distance: null,
      distanceUnit: null,
      calories: null,
    },
    to_target: {
      measurementType: "reps",
      setsMin: 3,
      setsMax: 3,
      repsTarget: null,
      repsMin: 8,
      repsMax: 8,
      weightMin: 105,
      weightMax: 105,
      weightUnit: "lbs",
      durationSeconds: null,
      distance: null,
      distanceUnit: null,
      calories: null,
    },
    method: "double_progression",
    vector: "coupled_load_reps",
    step: {
      vector: "coupled_load_reps",
      loadDelta: 5,
      repsTargetDelta: null,
      repsMinDelta: 0,
      repsMaxDelta: -4,
      setsDelta: 0,
      durationSecondsDelta: null,
      distanceDelta: null,
      caloriesDelta: null,
    },
    reason: "Promotion applied.",
    source_session_id: "session-1",
    created_at: "2026-05-10T10:00:00.000Z",
    ...overrides,
  };
}

test("empty analytics summary returns stable zero values", () => {
  const summary = summarizeProgressionEventAnalytics([]);

  assert.equal(summary.totalEvents, 0);
  assert.equal(summary.promotionsAppliedCount, 0);
  assert.equal(summary.deloadsAppliedCount, 0);
  assert.equal(summary.manualTargetChangesCount, 0);
  assert.equal(summary.revertsCount, 0);
  assert.deepEqual(summary.byType, []);
  assert.deepEqual(summary.byRoutine, []);
  assert.deepEqual(summary.byExercise, []);
  assert.deepEqual(summary.byVector, []);
  assert.deepEqual(summary.byMethod, []);
  assert.deepEqual(summary.topProgressedExercises, []);
  assert.deepEqual(summary.deloadFrequencyByExercise, []);
  assert.deepEqual(summary.manualChangeFrequencyByExercise, []);
});

test("type, method, and vector counts summarize durable events correctly", () => {
  const events = [
    buildEvent(),
    buildEvent({
      id: "event-2",
      exercise_id: "exercise-2",
      event_type: "deload_applied",
      method: "double_progression",
      vector: "load",
    }),
    buildEvent({
      id: "event-3",
      exercise_id: "exercise-2",
      event_type: "manual_target_change",
      method: "manual",
      vector: "distance",
    }),
    buildEvent({
      id: "event-4",
      exercise_id: "exercise-3",
      event_type: "promotion_reverted",
      method: "double_progression",
      vector: "reps",
    }),
  ];

  assert.equal(countProgressionEvents(events), 4);
  assert.deepEqual(countProgressionEventsByType(events), [
    { key: "deload_applied", count: 1 },
    { key: "manual_target_change", count: 1 },
    { key: "promotion_applied", count: 1 },
    { key: "promotion_reverted", count: 1 },
  ]);
  assert.deepEqual(countProgressionEventsByMethod(events), [
    { key: "double_progression", count: 3 },
    { key: "manual", count: 1 },
  ]);
  assert.deepEqual(countProgressionEventsByVector(events), [
    { key: "coupled_load_reps", count: 1 },
    { key: "distance", count: 1 },
    { key: "load", count: 1 },
    { key: "reps", count: 1 },
  ]);
  assert.equal(countPromotionAppliedEvents(events), 1);
  assert.equal(countDeloadAppliedEvents(events), 1);
  assert.equal(countManualTargetChangeEvents(events), 1);
  assert.equal(countPromotionRevertedEvents(events), 1);
});

test("top progressed exercises sort by promotion count and stable exercise id", () => {
  const events = [
    buildEvent({ id: "event-a", exercise_id: "exercise-b" }),
    buildEvent({ id: "event-b", exercise_id: "exercise-a" }),
    buildEvent({ id: "event-c", exercise_id: "exercise-a" }),
    buildEvent({ id: "event-d", exercise_id: "exercise-c", event_type: "deload_applied" }),
  ];

  assert.deepEqual(getTopProgressedExercisesByPromotionCount(events), [
    { exerciseId: "exercise-a", promotionCount: 2 },
    { exerciseId: "exercise-b", promotionCount: 1 },
  ]);
});

test("latest event per exercise uses newest created_at and stable id tie-breaker", () => {
  const events = [
    buildEvent({ id: "event-b", exercise_id: "exercise-1", created_at: "2026-05-10T10:00:00.000Z" }),
    buildEvent({ id: "event-a", exercise_id: "exercise-1", created_at: "2026-05-10T10:00:00.000Z", reason: "Earlier id wins latest tie." }),
    buildEvent({ id: "event-c", exercise_id: "exercise-2", created_at: "2026-05-11T10:00:00.000Z" }),
  ];

  const latestByExercise = getLatestProgressionEventByExercise(events);

  assert.equal(latestByExercise.get("exercise-1")?.id, "event-b");
  assert.equal(latestByExercise.get("exercise-2")?.id, "event-c");
});

test("day and month buckets are stable and sorted in the requested timezone", () => {
  const events = [
    buildEvent({ id: "event-1", created_at: "2026-05-01T23:30:00.000Z" }),
    buildEvent({ id: "event-2", created_at: "2026-05-02T01:30:00.000Z" }),
    buildEvent({ id: "event-3", created_at: "2026-06-03T10:00:00.000Z" }),
  ];

  assert.deepEqual(bucketProgressionEventsByTime({
    events,
    granularity: "day",
    timeZone: "America/New_York",
  }), [
    { bucket: "2026-05-01", count: 2, eventIds: ["event-1", "event-2"] },
    { bucket: "2026-06-03", count: 1, eventIds: ["event-3"] },
  ]);

  assert.deepEqual(bucketProgressionEventsByTime({
    events,
    granularity: "month",
    timeZone: "America/New_York",
  }), [
    { bucket: "2026-05", count: 2, eventIds: ["event-1", "event-2"] },
    { bucket: "2026-06", count: 1, eventIds: ["event-3"] },
  ]);
});

test("week buckets reuse timezone-safe ISO week boundaries", () => {
  const events = [
    buildEvent({ id: "event-sunday-local", created_at: "2026-05-04T06:30:00.000Z" }),
    buildEvent({ id: "event-monday-local", created_at: "2026-05-04T07:30:00.000Z" }),
  ];

  assert.deepEqual(bucketProgressionEventsByTime({
    events,
    granularity: "week",
    timeZone: "America/Los_Angeles",
  }), [
    { bucket: "2026-04-27", count: 1, eventIds: ["event-sunday-local"] },
    { bucket: "2026-05-04", count: 1, eventIds: ["event-monday-local"] },
  ]);
});

test("numeric target deltas compute conservatively for recognized numeric fields", () => {
  const event = buildEvent({
    from_target: {
      measurementType: "time_distance",
      setsMin: 1,
      setsMax: 1,
      repsTarget: null,
      repsMin: null,
      repsMax: null,
      weightMin: null,
      weightMax: null,
      weightUnit: null,
      durationSeconds: 1200,
      distance: 2,
      distanceUnit: "mi",
      calories: 200,
    },
    to_target: {
      measurementType: "time_distance",
      setsMin: 2,
      setsMax: 2,
      repsTarget: null,
      repsMin: null,
      repsMax: null,
      weightMin: null,
      weightMax: null,
      weightUnit: null,
      durationSeconds: 1500,
      distance: 2.5,
      distanceUnit: "mi",
      calories: 250,
    },
  });

  assert.deepEqual(summarizeProgressionEventNumericDeltas(event), {
    weight: null,
    reps: null,
    durationSeconds: { from: 1200, to: 1500, delta: 300, unit: "seconds" },
    distance: { from: 2, to: 2.5, delta: 0.5, unit: "mi" },
    sets: { from: 1, to: 2, delta: 1, unit: "sets" },
    calories: { from: 200, to: 250, delta: 50, unit: "calories" },
  });
});

test("unknown target shapes do not throw or invent deltas", () => {
  const event = buildEvent({
    from_target: { weird: "shape" },
    to_target: { weird: "other" },
  });

  assert.deepEqual(summarizeProgressionEventNumericDeltas(event), {
    weight: null,
    reps: null,
    durationSeconds: null,
    distance: null,
    sets: null,
    calories: null,
  });
});

test("analytics helpers do not mutate input rows", () => {
  const events = [
    buildEvent(),
    buildEvent({ id: "event-2", event_type: "manual_target_change", vector: "load" }),
  ];
  const snapshot = JSON.parse(JSON.stringify(events));

  void summarizeProgressionEventAnalytics(events);
  void bucketProgressionEventsByTime({
    events,
    granularity: "day",
    timeZone: "UTC",
  });
  void summarizeProgressionEventNumericDeltas(events[0]!);

  assert.deepEqual(events, snapshot);
});
