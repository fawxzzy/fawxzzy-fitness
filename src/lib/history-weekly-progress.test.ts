import assert from "node:assert/strict";
import test from "node:test";

import type { SessionSummary } from "@/app/history/session-summary";
import { buildWeeklyProgressSummary, getWeeklyProgressWeekStart, type WeeklyProgressExerciseMeta } from "./history-weekly-progress.ts";

function createSession(overrides: Partial<SessionSummary> & Pick<SessionSummary, "id" | "startedAt">): SessionSummary {
  return {
    id: overrides.id,
    startedAt: overrides.startedAt,
    routineId: overrides.routineId ?? null,
    routineTitle: overrides.routineTitle ?? "Routine",
    dayTitle: overrides.dayTitle,
    exerciseNames: overrides.exerciseNames ?? [],
    prExerciseNames: overrides.prExerciseNames ?? [],
    durationSec: overrides.durationSec,
    exerciseCount: overrides.exerciseCount ?? 1,
    setCount: overrides.setCount ?? 1,
    repCount: overrides.repCount ?? 5,
    prCounts: overrides.prCounts ?? { reps: 0, weight: 0, total: 0 },
    prLabel: overrides.prLabel ?? "",
    topSet: overrides.topSet,
    bestLift: overrides.bestLift,
    totalVolume: overrides.totalVolume ?? 0,
    volumeUnit: overrides.volumeUnit,
    completionRate: overrides.completionRate,
    hasNote: overrides.hasNote ?? false,
    hasSetData: overrides.hasSetData ?? true,
  };
}

function createExerciseMeta(entries: Record<string, Partial<WeeklyProgressExerciseMeta>>) {
  return new Map<string, WeeklyProgressExerciseMeta>(
    Object.entries(entries).map(([exerciseId, value]) => [
      exerciseId,
      {
        name: value.name ?? exerciseId,
        measurementType: value.measurementType ?? "reps",
        primaryMuscle: value.primaryMuscle ?? null,
      },
    ]),
  );
}

test("weekly progress returns an empty state when there are no workouts", () => {
  const summary = buildWeeklyProgressSummary({
    sessions: [],
    sessionExercisesBySessionId: new Map(),
    setsBySessionExerciseId: new Map(),
    exerciseMetaById: new Map(),
    timezone: "America/New_York",
    now: "2026-05-08T14:00:00.000Z",
  });

  assert.equal(summary.completedWorkoutCount, 0);
  assert.equal(summary.previousWeekWorkoutCount, 0);
  assert.equal(summary.primaryRoutineTitle, null);
  assert.equal(summary.primaryRoutineTargetCount, 0);
  assert.equal(summary.prMomentCount, 0);
  assert.equal(summary.progressScore.value, 0);
  assert.equal(summary.consistencyTrend.label, "No sessions yet");
  assert.deepEqual(summary.volumeCategories, []);
});

test("weekly progress treats one workout in an otherwise empty comparison week as a new week start", () => {
  const summary = buildWeeklyProgressSummary({
    sessions: [
      createSession({
        id: "session-1",
        startedAt: "2026-05-05T13:00:00.000Z",
        routineId: "routine-1",
        prCounts: { reps: 1, weight: 0, total: 1 },
        prExerciseNames: ["Back Squat"],
      }),
    ],
    sessionExercisesBySessionId: new Map([
      ["session-1", [{ id: "session-exercise-1", sessionId: "session-1", exerciseId: "exercise-1" }]],
    ]),
    setsBySessionExerciseId: new Map([
      ["session-exercise-1", [{ weight: 225, reps: 5 }, { weight: 225, reps: 5 }]],
    ]),
    exerciseMetaById: createExerciseMeta({
      "exercise-1": { name: "Back Squat", measurementType: "reps", primaryMuscle: "Quads" },
    }),
    routineDayCountByRoutineId: new Map([["routine-1", 3]]),
    timezone: "America/New_York",
    now: "2026-05-08T14:00:00.000Z",
  });

  assert.equal(summary.completedWorkoutCount, 1);
  assert.equal(summary.previousWeekWorkoutCount, 0);
  assert.equal(summary.primaryRoutineTitle, "Routine");
  assert.equal(summary.primaryRoutineTargetCount, 3);
  assert.equal(summary.consistencyTrend.direction, "new");
  assert.equal(summary.consistencyTrend.label, "Opened the week");
  assert.equal(summary.prMomentCount, 1);
  assert.deepEqual(summary.prExerciseNames, ["Back Squat"]);
  assert.equal(summary.progressScore.value, 3);
  assert.deepEqual(summary.hotspotItems, [
    "Back Squat had the strongest PR signal.",
  ]);
  assert.deepEqual(summary.attentionItems, [
    "2 planned days are still open this cycle.",
  ]);
});

test("weekly progress aggregates workouts, PR moments, and category volume inside the current week only", () => {
  const sessions = [
      createSession({
        id: "session-1",
        startedAt: "2026-05-05T13:00:00.000Z",
        routineId: "routine-1",
        prCounts: { reps: 1, weight: 1, total: 2 },
        prExerciseNames: ["Back Squat", "Weighted Pull-Up"],
      }),
      createSession({
        id: "session-2",
        startedAt: "2026-05-07T13:00:00.000Z",
        routineId: "routine-1",
        prCounts: { reps: 0, weight: 0, total: 0 },
      }),
      createSession({
        id: "session-previous",
        startedAt: "2026-04-29T13:00:00.000Z",
        routineId: "routine-1",
        prCounts: { reps: 1, weight: 0, total: 1 },
      }),
  ];

  const sessionExercisesBySessionId = new Map([
    ["session-1", [
      { id: "se-1", sessionId: "session-1", exerciseId: "exercise-strength" },
      { id: "se-2", sessionId: "session-1", exerciseId: "exercise-cardio" },
      { id: "se-3", sessionId: "session-1", exerciseId: "exercise-bodyweight" },
    ]],
    ["session-2", [
      { id: "se-4", sessionId: "session-2", exerciseId: "exercise-strength" },
    ]],
  ]);

  const setsBySessionExerciseId = new Map([
    ["se-1", [{ weight: 225, reps: 5 }, { weight: 235, reps: 5 }]],
    ["se-2", [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }]],
    ["se-3", [{ weight: 0, reps: 12 }, { weight: 0, reps: 10 }]],
    ["se-4", [{ weight: 185, reps: 8 }]],
  ]);

  const summary = buildWeeklyProgressSummary({
    sessions,
    sessionExercisesBySessionId,
    setsBySessionExerciseId,
    exerciseMetaById: createExerciseMeta({
      "exercise-strength": { name: "Back Squat", measurementType: "reps", primaryMuscle: "Quads" },
      "exercise-cardio": { name: "Incline Walk", measurementType: "time_distance", primaryMuscle: "Cardio" },
      "exercise-bodyweight": { name: "Push-Up", measurementType: "reps", primaryMuscle: "Chest" },
    }),
    routineDayCountByRoutineId: new Map([["routine-1", 3]]),
    timezone: "America/New_York",
    now: "2026-05-08T14:00:00.000Z",
  });

  assert.equal(summary.completedWorkoutCount, 2);
  assert.equal(summary.cycleCompletionRate, 2 / 3);
  assert.equal(summary.previousWeekWorkoutCount, 1);
  assert.equal(summary.primaryRoutineTitle, "Routine");
  assert.equal(summary.primaryRoutineTargetCount, 3);
  assert.equal(summary.activeDayCount, 2);
  assert.equal(summary.prMomentCount, 2);
  assert.deepEqual(summary.prExerciseNames, ["Back Squat", "Weighted Pull-Up"]);
  assert.equal(summary.consistencyTrend.label, "+1 vs last week");
  assert.deepEqual(
    summary.volumeCategories.map((entry) => ({ key: entry.key, setCount: entry.setCount, exerciseCount: entry.exerciseCount })),
    [
      { key: "strength", setCount: 3, exerciseCount: 1 },
      { key: "bodyweight", setCount: 2, exerciseCount: 1 },
      { key: "cardio", setCount: 2, exerciseCount: 1 },
    ],
  );
  assert.equal(summary.progressScore.value, 6);
  assert.deepEqual(summary.hotspotItems, [
    "Back Squat led the cycle with 2 sessions and had the strongest PR signal.",
  ]);
  assert.deepEqual(summary.attentionItems, [
    "1 planned day is still open this cycle.",
  ]);
});

test("weekly progress summarizes cycle completion from completed days and their internal completion rates", () => {
  const summary = buildWeeklyProgressSummary({
    sessions: [
      createSession({
        id: "session-complete",
        startedAt: "2026-05-05T13:00:00.000Z",
        routineId: "routine-1",
        completionRate: 1,
      }),
      createSession({
        id: "session-partial",
        startedAt: "2026-05-07T13:00:00.000Z",
        routineId: "routine-1",
        completionRate: 0.5,
      }),
      createSession({
        id: "session-previous",
        startedAt: "2026-04-29T13:00:00.000Z",
        routineId: "routine-1",
        completionRate: 1,
      }),
    ],
    sessionExercisesBySessionId: new Map(),
    setsBySessionExerciseId: new Map(),
    exerciseMetaById: new Map(),
    routineDayCountByRoutineId: new Map([["routine-1", 5]]),
    timezone: "America/New_York",
    now: "2026-05-08T14:00:00.000Z",
  });

  assert.equal(summary.completedWorkoutCount, 2);
  assert.equal(summary.primaryRoutineTargetCount, 5);
  assert.equal(summary.cycleCompletionRate, 0.3);
});

test("weekly progress keeps previous-week sessions out of current-week PR and score totals", () => {
  const summary = buildWeeklyProgressSummary({
    sessions: [
      createSession({
        id: "session-current",
        startedAt: "2026-05-06T12:00:00.000Z",
        routineId: "routine-1",
        prCounts: { reps: 0, weight: 0, total: 0 },
      }),
      createSession({
        id: "session-previous-1",
        startedAt: "2026-04-29T12:00:00.000Z",
        routineId: "routine-1",
        prCounts: { reps: 1, weight: 1, total: 2 },
      }),
      createSession({
        id: "session-previous-2",
        startedAt: "2026-04-30T12:00:00.000Z",
        routineId: "routine-1",
        prCounts: { reps: 0, weight: 1, total: 1 },
      }),
    ],
    sessionExercisesBySessionId: new Map([
      ["session-current", [{ id: "se-current", sessionId: "session-current", exerciseId: "exercise-strength" }]],
    ]),
    setsBySessionExerciseId: new Map([
      ["se-current", [{ weight: 205, reps: 5 }]],
    ]),
    exerciseMetaById: createExerciseMeta({
      "exercise-strength": { name: "Bench Press", measurementType: "reps" },
    }),
    routineDayCountByRoutineId: new Map([["routine-1", 3]]),
    timezone: "America/New_York",
    now: "2026-05-08T14:00:00.000Z",
  });

  assert.equal(summary.completedWorkoutCount, 1);
  assert.equal(summary.previousWeekWorkoutCount, 2);
  assert.equal(summary.primaryRoutineTitle, "Routine");
  assert.equal(summary.prMomentCount, 0);
  assert.equal(summary.consistencyTrend.direction, "down");
  assert.equal(summary.progressScore.value, 3);
  assert.deepEqual(summary.attentionItems, [
    "2 planned days are still open this cycle.",
  ]);
});

test("weekly progress resolves week boundaries in the supplied timezone", () => {
  const summary = buildWeeklyProgressSummary({
    sessions: [
      createSession({
        id: "session-sunday-local",
        startedAt: "2026-05-04T06:30:00.000Z",
      }),
      createSession({
        id: "session-monday-local",
        startedAt: "2026-05-04T07:30:00.000Z",
      }),
    ],
    sessionExercisesBySessionId: new Map([
      ["session-monday-local", [{ id: "se-1", sessionId: "session-monday-local", exerciseId: "exercise-strength" }]],
    ]),
    setsBySessionExerciseId: new Map([
      ["se-1", [{ weight: 135, reps: 8 }]],
    ]),
    exerciseMetaById: createExerciseMeta({
      "exercise-strength": { name: "Front Squat", measurementType: "reps" },
    }),
    timezone: "America/Los_Angeles",
    now: "2026-05-08T14:00:00.000Z",
  });

  assert.equal(summary.weekStart, "2026-05-04");
  assert.equal(summary.primaryRoutineTitle, "Routine");
  assert.equal(summary.completedWorkoutCount, 1);
  assert.equal(summary.previousWeekWorkoutCount, 1);
  assert.equal(summary.consistencyTrend.direction, "flat");
});

test("weekly progress can build a historical week summary from an explicit week start", () => {
  const summary = buildWeeklyProgressSummary({
    sessions: [
      createSession({
        id: "session-current-week",
        startedAt: "2026-05-06T12:00:00.000Z",
        prCounts: { reps: 1, weight: 0, total: 1 },
      }),
      createSession({
        id: "session-prior-week",
        startedAt: "2026-04-29T12:00:00.000Z",
        prCounts: { reps: 0, weight: 0, total: 0 },
      }),
    ],
    sessionExercisesBySessionId: new Map(),
    setsBySessionExerciseId: new Map(),
    exerciseMetaById: new Map(),
    timezone: "America/New_York",
    weekStart: getWeeklyProgressWeekStart("2026-04-29T12:00:00.000Z", "America/New_York") ?? undefined,
  });

  assert.equal(summary.weekStart, "2026-04-27");
  assert.equal(summary.primaryRoutineTitle, "Routine");
  assert.equal(summary.completedWorkoutCount, 1);
  assert.equal(summary.previousWeekWorkoutCount, 0);
  assert.equal(summary.consistencyTrend.direction, "new");
});

test("weekly progress builds explicit progression recap, hotspots, and timeline from weekly events", () => {
  const summary = buildWeeklyProgressSummary({
    sessions: [
      createSession({
        id: "session-1",
        startedAt: "2026-05-05T12:00:00.000Z",
        routineId: "routine-1",
      }),
    ],
    progressionEvents: [
      {
        id: "event-1",
        user_id: "user-1",
        routine_id: "routine-1",
        routine_day_exercise_id: "rde-1",
        exercise_id: "exercise-strength",
        event_type: "promotion_applied",
        from_target: {},
        to_target: {},
        method: "double_progression",
        vector: "reps",
        step: null,
        reason: "",
        source_session_id: "session-1",
        created_at: "2026-05-05T12:30:00.000Z",
      },
      {
        id: "event-2",
        user_id: "user-1",
        routine_id: "routine-1",
        routine_day_exercise_id: "rde-2",
        exercise_id: "exercise-cardio",
        event_type: "manual_target_change",
        from_target: {},
        to_target: {},
        method: "manual",
        vector: "none",
        step: null,
        reason: "",
        source_session_id: "session-1",
        created_at: "2026-05-07T12:30:00.000Z",
      },
    ],
    sessionExercisesBySessionId: new Map([
      ["session-1", [{ id: "se-1", sessionId: "session-1", exerciseId: "exercise-strength" }]],
    ]),
    setsBySessionExerciseId: new Map([
      ["se-1", [{ weight: 225, reps: 5 }]],
    ]),
    exerciseMetaById: createExerciseMeta({
      "exercise-strength": { name: "Back Squat", measurementType: "reps" },
      "exercise-cardio": { name: "Incline Walk", measurementType: "time_distance" },
    }),
    timezone: "America/New_York",
    now: "2026-05-08T14:00:00.000Z",
  });

  assert.equal(summary.progressionSummary.totalEventCount, 2);
  assert.equal(summary.progressionSummary.promotionCount, 1);
  assert.equal(summary.progressionSummary.manualChangeCount, 1);
  assert.deepEqual(summary.progressionSummary.topProgressedExerciseNames, ["Back Squat"]);
  assert.deepEqual(summary.progressionSummary.topAdjustedExerciseNames, ["Incline Walk"]);
  assert.deepEqual(summary.progressionSummary.hotspotItems, [
    "Back Squat drove the most promotions.",
    "Incline Walk had the most manual target changes.",
  ]);
  assert.deepEqual(summary.progressionSummary.timelineItems, [
    "Active progression days: 2 days.",
    "Busiest day: May 7 (1 event).",
    "Latest progression: Incline Walk on May 7.",
  ]);
  assert.deepEqual(summary.progressionSummary.attentionItems, []);
  assert.deepEqual(summary.progressionSummary.chartSections.map((section) => section.title), [
    "Progression Activity",
    "Change Mix",
    "Promotion Hotspots",
  ]);
  assert.deepEqual(summary.progressionSummary.chartSections[0]?.bars.map((bar) => `${bar.label}:${bar.value}`), [
    "May 5:1",
    "May 7:1",
  ]);
  assert.deepEqual(summary.progressionSummary.activityBuckets.map((bucket) => `${bucket.label}:${bucket.eventCount}`), [
    "May 5:1",
    "May 7:1",
  ]);
  assert.deepEqual(summary.progressionSummary.activityBuckets[1]?.hotspotItems, [
    "Incline Walk had the most manual target changes.",
  ]);
  assert.deepEqual(summary.recapItems?.map((item) => ({
    primary: item.primary,
    value: item.value,
    signals: item.signals,
    tagLabels: item.tagLabels,
  })), [
    { primary: "Back Squat", value: "1 session", signals: ["promotion"], tagLabels: [] },
    { primary: "Incline Walk", value: "progression", signals: ["watch"], tagLabels: ["MANUAL"] },
  ]);
});
