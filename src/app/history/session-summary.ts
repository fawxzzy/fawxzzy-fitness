import type { SessionRow } from "@/types/db";
import { formatSetDisplay } from "@/lib/formatting";
import { formatPrBreakdown, type PrCountByCategory } from "@/lib/pr-evaluator";

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
};

type SessionExerciseSummaryRow = {
  id: string;
  session_id: string;
  exercise_id: string;
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
  let setCount = 0;

  let bestWeighted: { weight: number; reps: number; exerciseId: string; unit: string | null } | null = null;
  let bestReps: { reps: number; exerciseId: string } | null = null;

  for (const exercise of sessionExercises) {
    const sets = setsBySessionExerciseId.get(exercise.id) ?? [];
    setCount += sets.length;

    for (const set of sets) {
      const reps = Number.isFinite(set.reps) ? set.reps : 0;
      const weight = Number.isFinite(set.weight) ? set.weight : 0;

      if (weight > 0 && reps > 0) {
        if (!bestWeighted || weight > bestWeighted.weight || (weight === bestWeighted.weight && reps > bestWeighted.reps)) {
          bestWeighted = { weight, reps, exerciseId: exercise.exercise_id, unit: set.weight_unit ?? null };
        }
      } else if (reps > 0) {
        if (!bestReps || reps > bestReps.reps) {
          bestReps = { reps, exerciseId: exercise.exercise_id };
        }
      }
    }
  }

  let topSet: SessionSummary["topSet"];
  if (bestWeighted) {
    const display = formatSetDisplay({ weight: bestWeighted.weight, reps: bestWeighted.reps, unit: bestWeighted.unit });
    if (display) {
      topSet = {
        exerciseName: exerciseNameById.get(bestWeighted.exerciseId) ?? "Exercise",
        display,
      };
    }
  } else if (bestReps) {
    const display = formatSetDisplay({ reps: bestReps.reps });
    if (display) {
      topSet = {
        exerciseName: exerciseNameById.get(bestReps.exerciseId) ?? "Exercise",
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
    setCount,
    prCounts,
    prLabel: formatPrBreakdown(prCounts),
    topSet,
  };
}
