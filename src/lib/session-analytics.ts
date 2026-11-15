export type SessionAnalyticsExerciseInput = {
  exerciseId: string;
  isSkipped?: boolean | null;
  /** Planned set count for this exercise in the session (target_sets_max, else target_sets_min). */
  plannedSets?: number | null;
  sets: Array<{
    weight: number;
    reps: number;
    weightUnit: "lbs" | "kg" | "lb" | null;
  }>;
};

export type SessionCompletionExerciseInput = {
  plannedSets: number | null | undefined;
  loggedSets: number;
  isSkipped?: boolean | null;
};

/**
 * Resolves the planned set count of a session exercise from its target range.
 * Max wins (matches the "2/3" badge on session detail), then min; otherwise unknown (null).
 */
export function resolvePlannedSetCount(args: {
  targetSetsMin?: number | null;
  targetSetsMax?: number | null;
}): number | null {
  for (const value of [args.targetSetsMax, args.targetSetsMin]) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return Math.floor(value);
    }
  }
  return null;
}

/**
 * The one completion formula used by History list, session detail and weekly progress:
 * logged sets / planned sets, over exercises that were not skipped.
 *
 * - Logged sets beyond the plan do not count (capped per exercise), so a rate never exceeds 1.
 * - Skipped exercises are excluded from both numerator and denominator.
 * - An exercise with no planned count (legacy rows) is planned at max(logged, 1): it is expected to
 *   have at least one set, so an exercise with nothing logged still lowers the rate.
 * - Returns undefined when nothing is planned (no exercises, or all skipped).
 */
export function computeSessionCompletion(exercises: SessionCompletionExerciseInput[]): number | undefined {
  const { plannedSets, loggedSets } = summarizeSessionSetProgress(exercises);
  return plannedSets > 0 ? loggedSets / plannedSets : undefined;
}

/**
 * Planned and counted-logged sets behind computeSessionCompletion (same rules: skipped excluded, logged capped at the
 * plan, unplanned exercises planned at max(logged, 1)). The Finish confirm uses it to say "3 of 5 sets logged".
 */
export function summarizeSessionSetProgress(exercises: SessionCompletionExerciseInput[]): { plannedSets: number; loggedSets: number } {
  let planned = 0;
  let logged = 0;

  for (const exercise of exercises) {
    if (exercise.isSkipped) {
      continue;
    }

    const loggedSets = Number.isFinite(exercise.loggedSets) && exercise.loggedSets > 0 ? Math.floor(exercise.loggedSets) : 0;
    const plannedSets = typeof exercise.plannedSets === "number" && Number.isFinite(exercise.plannedSets) && exercise.plannedSets > 0
      ? Math.floor(exercise.plannedSets)
      : Math.max(loggedSets, 1);

    planned += plannedSets;
    logged += Math.min(loggedSets, plannedSets);
  }

  return { plannedSets: planned, loggedSets: logged };
}

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
  let setCount = 0;
  let totalVolume = 0;

  let bestWeighted: { weight: number; reps: number; exerciseId: string; unit: "lbs" | "kg" | "lb" | null } | null = null;
  let bestReps: { reps: number; exerciseId: string; unit: "lbs" | "kg" | "lb" | null } | null = null;

  for (const exercise of sessionExercises) {
    setCount += exercise.sets.length;

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
    completionRate: computeSessionCompletion(
      sessionExercises.map((exercise) => ({
        plannedSets: exercise.plannedSets,
        loggedSets: exercise.sets.length,
        isSkipped: exercise.isSkipped,
      })),
    ),
    hasSetData: setCount > 0,
    bestLift: bestWeighted
      ? { exerciseId: bestWeighted.exerciseId, weight: bestWeighted.weight, reps: bestWeighted.reps, unit: bestWeighted.unit }
      : bestReps
        ? { exerciseId: bestReps.exerciseId, reps: bestReps.reps, unit: bestReps.unit }
        : undefined,
  };
}
