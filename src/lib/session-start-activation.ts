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
  type SessionStartFromDayArgsV1,
  type SessionStartFromDayResultV1,
} from "@/lib/session-start-atomicity";

// Kept free of @/lib/auth (or other Next.js request-scoped imports) so this
// module is directly unit-testable outside the Next.js runtime. This is where
// start-session.ts's exercise-mapping and RPC-invocation logic lives, so the
// activation behavior itself (not just the adapter/migration in isolation)
// has direct regression coverage.

export type RunnableExerciseForSessionStart = CanonicalDayExercise;

type SessionStartExecutor = (args: SessionStartFromDayArgsV1) => Promise<SessionStartFromDayResultV1>;

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
//
// `execute` exists only so tests can observe the exact RPC arguments without
// reaching the privileged provider client; production callers never pass it,
// and it cannot supply identity or a database client (those stay owned by the
// session-start-atomicity adapter).
export async function createSessionAtomicallyFromDay(
  args: {
    routineId: string;
    dayId: string;
    routineName: string;
    routineDayName: string;
    runnableExercises: RunnableExerciseForSessionStart[];
    context: string;
  },
  execute: SessionStartExecutor = startSessionFromDayAtomicV1,
): Promise<ActionResult<{ sessionId: string }>> {
  const exercises = buildSessionStartExerciseIntents({
    runnableExercises: args.runnableExercises,
    context: args.context,
  });

  const result = await execute({
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
