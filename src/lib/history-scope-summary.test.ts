import assert from "node:assert/strict";
import test from "node:test";

import { buildHistoryScopeSummary } from "./history-scope-summary";

test("history summary counts all stored workouts, routines, exercises, and pr moments", () => {
  const summary = buildHistoryScopeSummary({
    timezone: "America/New_York",
    now: "2026-04-30T16:00:00.000Z",
    routineDayCountByRoutineId: new Map([["routine-1", 4]]),
    exerciseNameById: new Map([
      ["exercise-1", "Back Squat"],
      ["exercise-2", "Bench Press"],
    ]),
    progressionEvents: [
      {
        id: "event-1",
        user_id: "user-1",
        routine_id: "routine-1",
        routine_day_exercise_id: "rde-1",
        exercise_id: "exercise-1",
        event_type: "promotion_applied",
        from_target: {},
        to_target: {},
        method: "double_progression",
        vector: "reps",
        step: null,
        reason: "",
        source_session_id: null,
        created_at: "2026-04-29T12:00:00.000Z",
      },
      {
        id: "event-2",
        user_id: "user-1",
        routine_id: "routine-1",
        routine_day_exercise_id: "rde-2",
        exercise_id: "exercise-2",
        event_type: "manual_target_change",
        from_target: {},
        to_target: {},
        method: "manual",
        vector: "none",
        step: null,
        reason: "",
        source_session_id: null,
        created_at: "2026-04-24T12:00:00.000Z",
      },
    ],
    sessions: [
      {
        id: "session-1",
        startedAt: "2026-04-29T12:00:00.000Z",
        routineId: "routine-1",
        routineTitle: "Atlas",
        dayTitle: "Lower A",
        exerciseNames: ["Back Squat", "Walking Lunge"],
        prExerciseNames: ["Back Squat"],
        exerciseCount: 2,
        setCount: 8,
        repCount: 30,
        prCounts: { reps: 1, weight: 0, total: 1 },
        prLabel: "1 PR",
        totalVolume: 1000,
        completionRate: 1,
        hasNote: false,
        hasSetData: true,
      },
      {
        id: "session-2",
        startedAt: "2026-04-24T12:00:00.000Z",
        routineId: "routine-1",
        routineTitle: "Atlas",
        dayTitle: "Upper A",
        exerciseNames: ["Bench Press"],
        prExerciseNames: ["Bench Press"],
        exerciseCount: 1,
        setCount: 6,
        repCount: 24,
        prCounts: { reps: 0, weight: 1, total: 1 },
        prLabel: "1 PR",
        totalVolume: 900,
        completionRate: 1,
        hasNote: false,
        hasSetData: true,
      },
      {
        id: "session-3",
        startedAt: "2026-04-12T12:00:00.000Z",
        routineId: "routine-2",
        routineTitle: "Conditioning",
        dayTitle: "Cardio",
        exerciseNames: ["Incline Walk"],
        prExerciseNames: [],
        exerciseCount: 1,
        setCount: 2,
        repCount: 0,
        prCounts: { reps: 0, weight: 0, total: 0 },
        prLabel: "",
        totalVolume: 0,
        completionRate: 0.8,
        hasNote: false,
        hasSetData: true,
      },
      {
        id: "session-old",
        startedAt: "2026-03-20T12:00:00.000Z",
        routineId: "routine-3",
        routineTitle: "Archived",
        dayTitle: "Old",
        exerciseNames: ["Old Lift"],
        prExerciseNames: ["Old Lift"],
        exerciseCount: 1,
        setCount: 4,
        repCount: 10,
        prCounts: { reps: 0, weight: 1, total: 1 },
        prLabel: "1 PR",
        totalVolume: 400,
        completionRate: 1,
        hasNote: false,
        hasSetData: true,
      },
    ],
  });

  assert.equal(summary.scopeLabel, "All Time");
  assert.equal(summary.completedWorkoutCount, 4);
  assert.equal(summary.activeDayCount, 4);
  assert.equal(summary.exerciseCount, 5);
  assert.equal(summary.routineCount, 3);
  assert.equal(summary.prMomentCount, 3);
  assert.deepEqual(summary.prExerciseNames, ["Back Squat", "Bench Press", "Old Lift"]);
  assert.deepEqual(summary.recapItems?.map((item) => ({
    primary: item.primary,
    value: item.value,
    signals: item.signals,
    tagLabels: item.tagLabels,
  })), [
    { primary: "Back Squat", value: "1 session", signals: ["pr", "promotion"], tagLabels: [] },
    { primary: "Walking Lunge", value: "1 session", signals: [], tagLabels: [] },
    { primary: "Bench Press", value: "1 session", signals: ["pr", "watch"], tagLabels: ["MANUAL"] },
    { primary: "Incline Walk", value: "1 session", signals: [], tagLabels: [] },
    { primary: "Old Lift", value: "1 session", signals: ["pr"], tagLabels: [] },
  ]);
  assert.deepEqual(summary.reviewItems, [
    "4 completed workout days across 3 routines.",
    "Atlas led with 2 workouts.",
    "5 exercises trained.",
  ]);
  assert.deepEqual(summary.hotspotItems, [
    "Back Squat led progress across this scope and drove the most promotions.",
    "Bench Press had the most manual target changes.",
    "Walking Lunge appeared in 1 session without a PR or progression signal.",
  ]);
  assert.equal(summary.plannedWorkoutDayCount, 4);
  assert.equal(summary.completedWorkoutDayCount, 4);
  assert.equal(summary.skippedWorkoutDayCount, 0);
  assert.deepEqual(summary.primaryRoutineCoverage, {
    completedDayCount: 2,
    targetDayCount: 4,
  });
  assert.equal(summary.progressionSummary.totalEventCount, 2);
  assert.equal(summary.progressionSummary.promotionCount, 1);
  assert.deepEqual(summary.progressionSummary.topProgressedExerciseNames, ["Back Squat"]);
  assert.deepEqual(summary.progressionSummary.topAdjustedExerciseNames, ["Bench Press"]);
  assert.deepEqual(summary.progressionSummary.hotspotItems, [
    "Back Squat drove the most promotions.",
    "Bench Press had the most manual target changes.",
  ]);
  assert.deepEqual(summary.progressionSummary.timelineItems, [
    "Active weeks: 2 weeks.",
    "Busiest week: Apr 27 (1 event).",
    "Latest progression: Back Squat on Apr 29.",
  ]);
  assert.deepEqual(summary.progressionSummary.chartSections.map((section) => section.title), [
    "Progression Timeline",
    "Change Mix",
    "Promotion Hotspots",
  ]);
  assert.deepEqual(summary.progressionSummary.chartSections[0]?.bars.map((bar) => `${bar.label}:${bar.value}`), [
    "Apr 20 - Apr 26:1",
    "Apr 27 - May 3:1",
  ]);
  assert.deepEqual(summary.progressionSummary.activityBuckets.map((bucket) => `${bucket.label}:${bucket.eventCount}`), [
    "Apr 20 - Apr 26:1",
    "Apr 27 - May 3:1",
  ]);
});

test("history summary raises plain-language attention flags for inactivity and missed routine coverage", () => {
  const summary = buildHistoryScopeSummary({
    timezone: "America/New_York",
    now: "2026-04-30T16:00:00.000Z",
    routineDayCountByRoutineId: new Map([["routine-1", 4]]),
    progressionEvents: [
      {
        id: "event-1",
        user_id: "user-1",
        routine_id: "routine-1",
        routine_day_exercise_id: "rde-1",
        exercise_id: "exercise-1",
        event_type: "deload_applied",
        from_target: {},
        to_target: {},
        method: "double_progression",
        vector: "reps",
        step: null,
        reason: "",
        source_session_id: null,
        created_at: "2026-04-20T12:00:00.000Z",
      },
      {
        id: "event-2",
        user_id: "user-1",
        routine_id: "routine-1",
        routine_day_exercise_id: "rde-1",
        exercise_id: "exercise-1",
        event_type: "manual_target_change",
        from_target: {},
        to_target: {},
        method: "manual",
        vector: "none",
        step: null,
        reason: "",
        source_session_id: null,
        created_at: "2026-04-21T12:00:00.000Z",
      },
    ],
    sessions: [
      {
        id: "session-1",
        startedAt: "2026-04-20T12:00:00.000Z",
        routineId: "routine-1",
        routineTitle: "Atlas",
        dayTitle: "Lower A",
        exerciseNames: ["Back Squat"],
        prExerciseNames: [],
        exerciseCount: 1,
        setCount: 4,
        repCount: 20,
        prCounts: { reps: 0, weight: 0, total: 0 },
        prLabel: "",
        totalVolume: 500,
        completionRate: 0.75,
        hasNote: false,
        hasSetData: true,
      },
    ],
  });

  assert.deepEqual(summary.attentionItems, [
    "No workouts were logged in the last 7 days.",
    "No PR moments were recorded yet.",
  ]);
  assert.deepEqual(summary.hotspotItems, [
    "Regressions outpaced promotions.",
    "Exercise had the most regressions and manual target changes.",
    "Back Squat appeared in 1 session without a PR or progression signal.",
  ]);
  assert.equal(summary.plannedWorkoutDayCount, 4);
  assert.equal(summary.completedWorkoutDayCount, 1);
  assert.equal(summary.skippedWorkoutDayCount, 3);
  assert.equal(summary.consistencyTrend.direction, "down");
  assert.deepEqual(summary.progressionSummary.attentionItems, [
    "No promotions landed yet.",
  ]);
  assert.deepEqual(summary.progressionSummary.hotspotItems, [
    "Exercise had the most regressions and manual target changes.",
  ]);
  assert.deepEqual(summary.progressionSummary.activityBuckets.map((bucket) => `${bucket.label}:${bucket.eventCount}`), [
    "Apr 20 - Apr 26:2",
  ]);
  assert.deepEqual(
    summary.progressionSummary.activityBuckets[0]?.items.map((item) => (
      typeof item === "string" ? item : `${item.primary}|${item.meta ?? ""}|${item.signals ?? ""}`
    )),
    [
      "Manual change|Atlas|watch",
      "Regression|Atlas|regression",
    ],
  );
});

test("history summary excludes passive recovery exercises from stalled hotspots", () => {
  const summary = buildHistoryScopeSummary({
    timezone: "America/New_York",
    now: "2026-04-30T16:00:00.000Z",
    sessions: [
      {
        id: "session-1",
        startedAt: "2026-04-29T12:00:00.000Z",
        routineId: "routine-1",
        routineTitle: "Atlas",
        dayTitle: "Recovery",
        exerciseNames: ["Stretch"],
        prExerciseNames: [],
        exerciseCount: 1,
        setCount: 1,
        repCount: 0,
        prCounts: { reps: 0, weight: 0, total: 0 },
        prLabel: "",
        totalVolume: 0,
        completionRate: 1,
        hasNote: false,
        hasSetData: true,
      },
    ],
  });

  assert.equal(summary.hotspotItems.some((item) => item.includes("Stretch appeared")), false);
});
