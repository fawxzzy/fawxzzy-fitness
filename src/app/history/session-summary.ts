import type { SessionRow } from "@/types/db";
import { formatSetDisplay } from "@/lib/formatting";
import { formatPrBreakdown, type PrCountByCategory } from "@/lib/pr-evaluator";
import { deriveSessionAnalytics } from "@/lib/session-analytics";

export type SessionSummary = {
  id: string;
  startedAt: string;
  routineTitle: string;
  dayTitle?: string;
  durationSec?: number;
  exerciseCount: number;
  setCount: number;
  prCounts: PrCountByCategory;
  prLabel: string;
  topSet?: {
    exerciseName: string;
    display: string;
  };
  bestLift?: {
    exerciseName: string;
    display: string;
  };
  totalVolume: number;
  completionRate?: number;
  hasNote: boolean;
  hasSetData: boolean;
};

type SessionExerciseSummaryRow = {
  id: string;
  session_id: string;
  exercise_id: string;
  is_skipped?: boolean | null;
};

type SessionSetSummaryRow = {
  session_exercise_id: string;
  weight: number;
  reps: number;
  weight_unit: "lbs" | "kg" | "lb" | null;
};

type BuildSummaryInput = {
  sessionRow: SessionRow;
  routineTitle?: string | null;
  dayTitle?: string | null;
  sessionExercises: SessionExerciseSummaryRow[];
  setsBySessionExerciseId: Map<string, SessionSetSummaryRow[]>;
  exerciseNameById: Map<string, string>;
  prCounts: PrCountByCategory;
};

export function buildSessionSummary({
  sessionRow,
  routineTitle,
  dayTitle,
  sessionExercises,
  setsBySessionExerciseId,
  exerciseNameById,
  prCounts,
}: BuildSummaryInput): SessionSummary {
  const exerciseCount = sessionExercises.length;
  const analytics = deriveSessionAnalytics(
    sessionExercises.map((exercise) => ({
      exerciseId: exercise.exercise_id,
      isSkipped: exercise.is_skipped,
      sets: (setsBySessionExerciseId.get(exercise.id) ?? []).map((set) => ({
        weight: set.weight,
        reps: set.reps,
        weightUnit: set.weight_unit ?? null,
      })),
    })),
  );

  let topSet: SessionSummary["topSet"];
  if (analytics.bestLift?.weight) {
    const display = formatSetDisplay({ weight: analytics.bestLift.weight, reps: analytics.bestLift.reps, unit: analytics.bestLift.unit });
    if (display) {
      topSet = {
        exerciseName: exerciseNameById.get(analytics.bestLift.exerciseId) ?? "Exercise",
        display,
      };
    }
  } else if (analytics.bestLift?.reps) {
    const display = formatSetDisplay({ reps: analytics.bestLift.reps });
    if (display) {
      topSet = {
        exerciseName: exerciseNameById.get(analytics.bestLift.exerciseId) ?? "Exercise",
        display,
      };
    }
  }

  const durationSec = typeof sessionRow.duration_seconds === "number" && sessionRow.duration_seconds > 0
    ? sessionRow.duration_seconds
    : undefined;

  return {
    id: sessionRow.id,
    startedAt: sessionRow.performed_at,
    routineTitle: (routineTitle ?? sessionRow.name ?? "").trim() || "Unknown routine",
    dayTitle: dayTitle?.trim() || undefined,
    durationSec,
    exerciseCount,
    setCount: analytics.setCount,
    prCounts,
    prLabel: formatPrBreakdown(prCounts),
    topSet,
    bestLift: topSet,
    totalVolume: analytics.totalVolume,
    completionRate: analytics.completionRate,
    hasNote: Boolean(sessionRow.notes?.trim()),
    hasSetData: analytics.hasSetData,
  };
}
