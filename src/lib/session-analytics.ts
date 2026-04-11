export type SessionAnalyticsExerciseInput = {
  exerciseId: string;
  isSkipped?: boolean | null;
  sets: Array<{
    weight: number;
    reps: number;
    weightUnit: "lbs" | "kg" | "lb" | null;
  }>;
};

export type DerivedSessionAnalytics = {
  setCount: number;
  totalVolume: number;
  completionRate?: number;
  hasSetData: boolean;
  bestLift?: {
    exerciseId: string;
    weight?: number;
    reps: number;
    unit: "lbs" | "kg" | "lb" | null;
  };
};

export function deriveSessionAnalytics(sessionExercises: SessionAnalyticsExerciseInput[]): DerivedSessionAnalytics {
  const exerciseCount = sessionExercises.length;
  let setCount = 0;
  let totalVolume = 0;
  let completedOrSkippedExerciseCount = 0;

  let bestWeighted: { weight: number; reps: number; exerciseId: string; unit: "lbs" | "kg" | "lb" | null } | null = null;
  let bestReps: { reps: number; exerciseId: string; unit: "lbs" | "kg" | "lb" | null } | null = null;

  for (const exercise of sessionExercises) {
    setCount += exercise.sets.length;
    if (exercise.sets.length > 0 || exercise.isSkipped) {
      completedOrSkippedExerciseCount += 1;
    }

    for (const set of exercise.sets) {
      const reps = Number.isFinite(set.reps) ? set.reps : 0;
      const weight = Number.isFinite(set.weight) ? set.weight : 0;

      if (weight > 0 && reps > 0) {
        totalVolume += weight * reps;
      }

      if (weight > 0 && reps > 0) {
        if (!bestWeighted || weight > bestWeighted.weight || (weight === bestWeighted.weight && reps > bestWeighted.reps)) {
          bestWeighted = { weight, reps, exerciseId: exercise.exerciseId, unit: set.weightUnit ?? null };
        }
      } else if (reps > 0) {
        if (!bestReps || reps > bestReps.reps) {
          bestReps = { reps, exerciseId: exercise.exerciseId, unit: set.weightUnit ?? null };
        }
      }
    }
  }

  return {
    setCount,
    totalVolume,
    completionRate: exerciseCount > 0 ? completedOrSkippedExerciseCount / exerciseCount : undefined,
    hasSetData: setCount > 0,
    bestLift: bestWeighted
      ? { exerciseId: bestWeighted.exerciseId, weight: bestWeighted.weight, reps: bestWeighted.reps, unit: bestWeighted.unit }
      : bestReps
        ? { exerciseId: bestReps.exerciseId, reps: bestReps.reps, unit: bestReps.unit }
        : undefined,
  };
}
