import test from "node:test";
import assert from "node:assert/strict";
import {
  getProgressionEvaluationFingerprint,
  getProgressionTargetFingerprint,
} from "@/lib/progression-history-scope";
import type { ProgressionTargetPlan } from "@/lib/progression-playbooks";

function target(overrides: Partial<ProgressionTargetPlan> = {}): ProgressionTargetPlan {
  return {
    measurementType: "time",
    setsMin: 1,
    setsMax: 1,
    repsMin: null,
    repsMax: null,
    weightMin: null,
    weightMax: null,
    weightUnit: null,
    durationSeconds: 180,
    distance: null,
    distanceUnit: null,
    calories: null,
    ...overrides,
  };
}

test("target fingerprint links same exercise target and config only", () => {
  const first = getProgressionTargetFingerprint({
    exerciseId: "treadmill",
    target: target({ durationSeconds: 180 }),
    progressionMethod: "cardio_progression",
    progressionStep: 60,
    setFlow: "straight_sets",
    regressionPolicy: "none",
  });
  const same = getProgressionTargetFingerprint({
    exerciseId: "treadmill",
    target: target({ durationSeconds: 180 }),
    progressionMethod: "cardio_progression",
    progressionStep: 60,
    setFlow: "straight_sets",
    regressionPolicy: "none",
  });
  const differentDuration = getProgressionTargetFingerprint({
    exerciseId: "treadmill",
    target: target({ durationSeconds: 240 }),
    progressionMethod: "cardio_progression",
    progressionStep: 60,
    setFlow: "straight_sets",
    regressionPolicy: "none",
  });
  const differentStep = getProgressionTargetFingerprint({
    exerciseId: "treadmill",
    target: target({ durationSeconds: 180 }),
    progressionMethod: "cardio_progression",
    progressionStep: 120,
    setFlow: "straight_sets",
    regressionPolicy: "none",
  });

  assert.equal(first, same);
  assert.notEqual(first, differentDuration);
  assert.notEqual(first, differentStep);
});

test("target fingerprint separates same exercise with different rep targets", () => {
  const strength = target({
    measurementType: "reps",
    setsMin: 3,
    setsMax: 3,
    repsMin: 4,
    repsMax: 6,
    weightMin: 225,
    weightMax: 225,
    weightUnit: "lbs",
    durationSeconds: null,
  });

  const heavy = getProgressionTargetFingerprint({
    exerciseId: "bench",
    target: strength,
    progressionMethod: "double_progression",
    progressionStep: 5,
    setFlow: "descending_backoff",
    regressionPolicy: "none",
  });
  const volume = getProgressionTargetFingerprint({
    exerciseId: "bench",
    target: { ...strength, repsMin: 8, repsMax: 12, weightMin: 185, weightMax: 185 },
    progressionMethod: "double_progression",
    progressionStep: 5,
    setFlow: "straight_sets",
    regressionPolicy: "none",
  });

  assert.notEqual(heavy, volume);
});

test("evaluation fingerprint changes when target, step, or history changes", () => {
  const baseTarget = getProgressionTargetFingerprint({
    exerciseId: "pullup",
    target: target({ measurementType: "reps", repsMin: 5, repsMax: 8, weightMin: 25, weightMax: 25, weightUnit: "lbs", durationSeconds: null }),
    progressionMethod: "double_progression",
    progressionStep: 5,
    setFlow: "straight_sets",
    regressionPolicy: "none",
  });
  const changedTarget = getProgressionTargetFingerprint({
    exerciseId: "pullup",
    target: target({ measurementType: "reps", repsMin: 5, repsMax: 8, weightMin: 30, weightMax: 30, weightUnit: "lbs", durationSeconds: null }),
    progressionMethod: "double_progression",
    progressionStep: 5,
    setFlow: "straight_sets",
    regressionPolicy: "none",
  });
  const first = getProgressionEvaluationFingerprint({
    routineDayExerciseId: "rde-1",
    targetFingerprint: baseTarget,
    progressionConfigFingerprint: { loadIncrement: 5 },
    historySource: "routine_day_exercise",
    latestCompletedSessionTimestamp: "2026-05-04T10:00:00.000Z",
    completedSetCount: 3,
  });
  const targetChanged = getProgressionEvaluationFingerprint({
    routineDayExerciseId: "rde-1",
    targetFingerprint: changedTarget,
    progressionConfigFingerprint: { loadIncrement: 5 },
    historySource: "routine_day_exercise",
    latestCompletedSessionTimestamp: "2026-05-04T10:00:00.000Z",
    completedSetCount: 3,
  });
  const stepChanged = getProgressionEvaluationFingerprint({
    routineDayExerciseId: "rde-1",
    targetFingerprint: baseTarget,
    progressionConfigFingerprint: { loadIncrement: 10 },
    historySource: "routine_day_exercise",
    latestCompletedSessionTimestamp: "2026-05-04T10:00:00.000Z",
    completedSetCount: 3,
  });
  const historyChanged = getProgressionEvaluationFingerprint({
    routineDayExerciseId: "rde-1",
    targetFingerprint: baseTarget,
    progressionConfigFingerprint: { loadIncrement: 5 },
    historySource: "routine_day_exercise",
    latestCompletedSessionTimestamp: "2026-05-06T10:00:00.000Z",
    completedSetCount: 6,
  });

  assert.notEqual(first, targetChanged);
  assert.notEqual(first, stepChanged);
  assert.notEqual(first, historyChanged);
});
