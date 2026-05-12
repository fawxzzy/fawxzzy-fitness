import type { ProgressionTargetPlan } from "@/lib/progression-playbooks";

export type ProgressionHistoryScopeTier =
  | "routine_day_exercise"
  | "unique_active_routine_exercise"
  | "linked_same_fingerprint"
  | "global_exercise_context"
  | "none";

function normalizeFingerprintValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeFingerprintValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, normalizeFingerprintValue(entry)]),
    );
  }

  return value ?? null;
}

function stableFingerprint(value: Record<string, unknown>) {
  return JSON.stringify(normalizeFingerprintValue(value));
}

export function getProgressionTargetFingerprint(args: {
  exerciseId: string | null | undefined;
  target: ProgressionTargetPlan;
  progressionMethod?: string | null;
  progressionStep?: unknown;
  setFlow?: string | null;
  regressionPolicy?: string | null;
}) {
  return stableFingerprint({
    exerciseId: args.exerciseId ?? null,
    measurementType: args.target.measurementType,
    setsMin: args.target.setsMin ?? null,
    setsMax: args.target.setsMax ?? null,
    repsMin: args.target.repsMin ?? null,
    repsMax: args.target.repsMax ?? null,
    weightMin: args.target.weightMin ?? null,
    weightMax: args.target.weightMax ?? null,
    weightUnit: args.target.weightUnit ?? null,
    durationSeconds: args.target.durationSeconds ?? null,
    distance: args.target.distance ?? null,
    distanceUnit: args.target.distanceUnit ?? null,
    calories: args.target.calories ?? null,
    progressionMethod: args.progressionMethod ?? null,
    progressionStep: args.progressionStep ?? null,
    setFlow: args.setFlow ?? null,
    regressionPolicy: args.regressionPolicy ?? null,
  });
}

export function getProgressionEvaluationFingerprint(args: {
  routineDayExerciseId: string | null | undefined;
  targetFingerprint: string;
  progressionConfigFingerprint?: unknown;
  historySource: ProgressionHistoryScopeTier;
  latestCompletedSessionTimestamp?: string | null;
  completedSetCount: number;
  latestHistoryVersion?: string | number | null;
  appliedProgressionEventVersion?: string | number | null;
}) {
  return stableFingerprint({
    routineDayExerciseId: args.routineDayExerciseId ?? null,
    targetFingerprint: args.targetFingerprint,
    progressionConfigFingerprint: args.progressionConfigFingerprint ?? null,
    historySource: args.historySource,
    latestCompletedSessionTimestamp: args.latestCompletedSessionTimestamp ?? null,
    completedSetCount: args.completedSetCount,
    latestHistoryVersion: args.latestHistoryVersion ?? null,
    appliedProgressionEventVersion: args.appliedProgressionEventVersion ?? null,
  });
}
