import test from "node:test";
import assert from "node:assert/strict";

import { buildWorkoutRecapArtifact, buildWorkoutRecapStreakAsOf, buildWorkoutRecapStreakCallout } from "./workout-recap.ts";
import type { SessionSummary } from "@/app/history/session-summary";

const baseSummary: SessionSummary = {
  id: "session-1",
  startedAt: "2026-05-08T12:00:00.000Z",
  routineId: "routine-1",
  routineTitle: "Atlas",
  dayTitle: "Hunt",
  exerciseNames: ["Bench Press", "Treadmill Run"],
  prExerciseNames: [],
  durationSec: 3600,
  exerciseCount: 2,
  setCount: 4,
  repCount: 18,
  prCounts: { reps: 0, weight: 0, total: 0 },
  prLabel: "No PRs",
  totalVolume: 1350,
  volumeUnit: "lbs",
  completionRate: 1,
  hasNote: false,
  hasSetData: true,
};

test("workout recap builds deterministic metrics and share text", () => {
  const recap = buildWorkoutRecapArtifact({
    sessionSummary: baseSummary,
    exercises: [
      {
        id: "session-exercise-1",
        exerciseId: "bench",
        exerciseName: "Bench Press",
        sets: [
          { weight: 225, reps: 6, weightUnit: "lbs" },
          { weight: 225, reps: 6, weightUnit: "lbs" },
        ],
      },
      {
        id: "session-exercise-2",
        exerciseId: "run",
        exerciseName: "Treadmill Run",
        sets: [
          { weight: null, reps: null, durationSeconds: 540 },
        ],
      },
    ],
  });

  assert.equal(recap.id, "recap:session-1");
  assert.equal(recap.title, "Atlas | Hunt recap");
  assert.deepEqual(recap.metrics.map((metric) => metric.label), ["Exercises", "Sets", "Duration", "Volume"]);
  assert.deepEqual(recap.topEfforts[0], { exerciseName: "Bench Press", value: "225 lbs x 6" });
  assert.match(recap.shareText, /Atlas \| Hunt recap/);
  assert.match(recap.shareText, /Top efforts:/);
});

test("workout recap includes PR moments when available", () => {
  const recap = buildWorkoutRecapArtifact({
    sessionSummary: {
      ...baseSummary,
      prExerciseNames: ["Bench Press"],
      prCounts: { reps: 0, weight: 1, total: 1 },
      prLabel: "1 PR",
    },
    exercises: [
      {
        id: "session-exercise-1",
        exerciseId: "bench",
        exerciseName: "Bench Press",
        sets: [{ weight: 235, reps: 5, weightUnit: "lbs" }],
      },
    ],
  });

  assert.deepEqual(recap.prMoments, ["Bench Press"]);
  assert.match(recap.shareText, /PRs: Bench Press/);
});

test("workout recap handles empty sessions with stable output", () => {
  const recap = buildWorkoutRecapArtifact({
    sessionSummary: {
      ...baseSummary,
      exerciseNames: [],
      prExerciseNames: [],
      durationSec: undefined,
      exerciseCount: 0,
      setCount: 0,
      repCount: 0,
      totalVolume: 0,
      volumeUnit: undefined,
      hasSetData: false,
    },
    exercises: [],
  });

  assert.deepEqual(recap.metrics, [
    { label: "Exercises", value: "0" },
    { label: "Sets", value: "0" },
  ]);
  assert.deepEqual(recap.topEfforts, []);
  assert.equal(buildWorkoutRecapArtifact({ sessionSummary: { ...baseSummary, setCount: 0 }, exercises: [] }).sessionId, "session-1");
});

test("streak callout needs 2+ sessions and flags a best streak", () => {
  assert.equal(buildWorkoutRecapStreakCallout(null), null);
  assert.equal(buildWorkoutRecapStreakCallout({ currentSessionCount: 1, bestSessionCount: 1 }), null);
  assert.equal(buildWorkoutRecapStreakCallout({ currentSessionCount: 2, bestSessionCount: 2 }), "2 session streak");
  assert.equal(buildWorkoutRecapStreakCallout({ currentSessionCount: 4, bestSessionCount: 4 }), "4 session streak, your best yet");
  assert.equal(buildWorkoutRecapStreakCallout({ currentSessionCount: 3, bestSessionCount: 6 }), "3 session streak");
});

test("recap artifact carries streak callout into share text, and omits it otherwise", () => {
  const withStreak = buildWorkoutRecapArtifact({ sessionSummary: baseSummary, exercises: [], streak: { currentSessionCount: 3, bestSessionCount: 5 } });
  assert.equal(withStreak.streakCallout, "3 session streak");
  assert.match(withStreak.shareText, /Streak: 3 session streak/);
  const without = buildWorkoutRecapArtifact({ sessionSummary: baseSummary, exercises: [] });
  assert.equal(without.streakCallout, null);
  assert.doesNotMatch(without.shareText, /Streak:/);
});

test("streak as of a recap ignores later sessions and later skipped days", () => {
  const day = (id: string, iso: string): SessionSummary => ({ ...baseSummary, id, startedAt: iso });
  const sessions = [
    day("s1", "2026-05-06T15:00:00.000Z"),
    day("s2", "2026-05-07T15:00:00.000Z"),
    day("s3", "2026-05-08T15:00:00.000Z"),
    day("s4", "2026-05-10T15:00:00.000Z"),
  ];
  const asOfS2 = buildWorkoutRecapStreakAsOf({ sessions, sessionId: "s2", timezone: "UTC", skippedDayKeys: ["2026-05-09"] });
  assert.equal(asOfS2?.currentSessionCount, 2);
  const asOfS4 = buildWorkoutRecapStreakAsOf({ sessions, sessionId: "s4", timezone: "UTC", skippedDayKeys: ["2026-05-09"] });
  assert.equal(asOfS4?.currentSessionCount, 1);
  assert.equal(asOfS4?.bestSessionCount, 3);
  assert.equal(buildWorkoutRecapStreakAsOf({ sessions, sessionId: "missing", timezone: "UTC" }), null);
});
