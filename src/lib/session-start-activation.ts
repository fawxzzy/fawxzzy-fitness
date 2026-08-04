import type { ActionResult } from "@/lib/action-result";
import { mapRoutineDayGoalToSessionColumns } from "@/lib/exercise-goal-payload";
import type { CanonicalDayExercise } from "@/lib/routine-day-loader";
import {
  defaultUnitForSessionExerciseMeasurementType,
  resolveSessionExerciseMeasurementType,
  warnOnSessionExerciseUnitMismatch,
} from "@/lib/session-exercise-measurement";
import {
  startSessionFromDayAtomicV1,
  type SessionStartExerciseIntentV1,
  type SessionStartFromDayRpcClient,
} from "@/lib/session-start-atomicity";

// Kept free of @/lib/auth (or other Next.js request-scoped) imports so this
// module is directly unit-testable outside the Next.js runtime, matching
// session-start-atomicity.ts's constraint. This is where start-session.ts's
// exercise-mapping + RPC-invocation logic actually lives now, so the
// activation behavior itself (not just the adapter/migration in isolation)
// has direct regression coverage.

export type RunnableExerciseForSessionStart = CanonicalDayExercise;

export function buildSessionStartExerciseIntents(args: {
  runnableExercises: RunnableExerciseForSessionStart[];
  context: string;
}): SessionStartExerciseIntentV1[] {
  return args.runnableExercises.map((exercise) => {
    const mappedGoalColumns = mapRoutineDayGoalToSessionColumns({
      target_sets: exercise.target_sets,
      target_reps: exercise.target_reps,
      target_reps_min: exercise.target_reps_min,
      target_reps_max: exercise.target_reps_max,
      target_weight: exercise.target_weight,
      target_weight_unit: exercise.target_weight_unit,
      target_duration_seconds: exercise.target_duration_seconds,
      target_distance: exercise.target_distance,
      target_distance_unit: exercise.target_distance_unit,
      target_calories: exercise.target_calories,
      measurement_type: exercise.measurement_type ?? null,
      default_unit: exercise.default_unit ?? null,
    });

    const measurementType = resolveSessionExerciseMeasurementType(
      mappedGoalColumns.measurement_type ?? exercise.details?.measurement_type,
    );
    const defaultUnit = defaultUnitForSessionExerciseMeasurementType(measurementType);
    warnOnSessionExerciseUnitMismatch({ measurementType, defaultUnit, context: args.context });

    return {
      exerciseId: exercise.exercise_id,
      routineDayExerciseId: exercise.id,
      position: exercise.position,
      measurementType,
      defaultUnit,
      targetSetsMin: mappedGoalColumns.target_sets_min,
      targetSetsMax: mappedGoalColumns.target_sets_max,
      targetRepsMin: mappedGoalColumns.target_reps_min,
      targetRepsMax: mappedGoalColumns.target_reps_max,
      targetWeightMin: mappedGoalColumns.target_weight_min,
      targetWeightMax: mappedGoalColumns.target_weight_max,
      targetWeightUnit: mappedGoalColumns.target_weight_unit,
      targetTimeSecondsMin: mappedGoalColumns.target_time_seconds_min,
      targetTimeSecondsMax: mappedGoalColumns.target_time_seconds_max,
      targetDistanceMin: mappedGoalColumns.target_distance_min,
      targetDistanceMax: mappedGoalColumns.target_distance_max,
      targetDistanceUnit: mappedGoalColumns.target_distance_unit,
      targetCaloriesMin: mappedGoalColumns.target_calories_min,
      targetCaloriesMax: mappedGoalColumns.target_calories_max,
    };
  });
}

// No manual rollback path exists here: start_session_from_day_v1 creates the
// session and every session_exercises row inside one function invocation, so
// a failure partway through rolls back automatically. A missing/failed RPC
// surfaces as a plain ActionResult error -- it never falls back to a direct
// table insert, which would silently reintroduce the concurrent-duplicate-
// session race the RPC exists to close.
export async function createSessionAtomicallyFromDay(args: {
  supabase: SessionStartFromDayRpcClient;
  routineId: string;
  dayId: string;
  routineName: string;
  routineDayName: string;
  runnableExercises: RunnableExerciseForSessionStart[];
  context: string;
}): Promise<ActionResult<{ sessionId: string }>> {
  const exercises = buildSessionStartExerciseIntents({
    runnableExercises: args.runnableExercises,
    context: args.context,
  });

  const result = await startSessionFromDayAtomicV1({
    supabase: args.supabase,
    routineId: args.routineId,
    dayId: args.dayId,
    routineName: args.routineName,
    routineDayName: args.routineDayName,
    exercises,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true, data: { sessionId: result.sessionId } };
}
