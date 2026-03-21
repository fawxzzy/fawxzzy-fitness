import { requireUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-result";
import { mapRoutineDayGoalToSessionColumns } from "@/lib/exercise-goal-payload";
import { ensureProfile } from "@/lib/profile";
import { buildCanonicalDaySummaries } from "@/lib/routine-day-loader";
import { getSessionStartErrorMessage } from "@/lib/runnable-day";
import {
  defaultUnitForSessionExerciseMeasurementType,
  resolveSessionExerciseMeasurementType,
  warnOnSessionExerciseUnitMismatch,
} from "@/lib/session-exercise-measurement";
import { getRoutineDayComputation } from "@/lib/routines";
import { supabaseServer } from "@/lib/supabase/server";
import type { RoutineDayExerciseRow, RoutineDayRow } from "@/types/db";

type ServerSupabase = ReturnType<typeof supabaseServer>;

type SessionStartContext = {
  supabase: ServerSupabase;
  userId: string;
  routineId: string;
  routineName: string;
  day: RoutineDayRow;
  context: string;
};

async function findExistingInProgressSession(args: {
  supabase: ServerSupabase;
  userId: string;
  routineId: string;
}) {
  const { data, error } = await args.supabase
    .from("sessions")
    .select("id")
    .eq("user_id", args.userId)
    .eq("routine_id", args.routineId)
    .eq("status", "in_progress")
    .order("performed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data ?? null;
}

async function createSessionFromDay(context: SessionStartContext): Promise<ActionResult<{ sessionId: string }>> {
  const { supabase, userId, routineId, routineName, day, context: logContext } = context;

  const existingSession = await findExistingInProgressSession({
    supabase,
    userId,
    routineId,
  });

  if (existingSession?.id) {
    return { ok: true, data: { sessionId: existingSession.id } };
  }

  const { data: templateExercises, error: templateError } = await supabase
    .from("routine_day_exercises")
    .select("id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, notes, measurement_type, default_unit")
    .eq("routine_day_id", day.id)
    .eq("user_id", userId)
    .order("position", { ascending: true });

  if (templateError) {
    return { ok: false, error: "Could not load exercises for this day." };
  }

  const { summaries } = await buildCanonicalDaySummaries({
    supabase,
    routineDays: [day],
    allDayExercises: (templateExercises ?? []) as RoutineDayExerciseRow[],
  });
  const canonicalDay = summaries[0] ?? null;
  const runnableExercises = canonicalDay?.runnableExercises ?? [];
  const invalidExercises = canonicalDay?.invalidExercises ?? [];
  const startError = getSessionStartErrorMessage({
    isRest: Boolean(day.is_rest),
    runnableExerciseCount: runnableExercises.length,
    invalidExerciseCount: invalidExercises.length,
  });

  if (startError) {
    return { ok: false, error: startError };
  }

  const routineDayName = day.name || `Day ${day.day_index}`;
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      user_id: userId,
      routine_id: routineId,
      routine_day_index: day.day_index,
      name: routineName,
      routine_day_name: routineDayName,
      status: "in_progress",
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    return { ok: false, error: "Could not create workout session." };
  }

  if (runnableExercises.length > 0) {
    const { error: exerciseError } = await supabase.from("session_exercises").insert(
      runnableExercises.map((exercise) => {
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
        warnOnSessionExerciseUnitMismatch({ measurementType, defaultUnit, context: logContext });

        return {
          session_id: session.id,
          user_id: userId,
          exercise_id: exercise.exercise_id,
          routine_day_exercise_id: exercise.id,
          position: exercise.position,
          notes: exercise.notes,
          is_skipped: false,
          ...mappedGoalColumns,
          measurement_type: measurementType,
          default_unit: defaultUnit,
        };
      }),
    );

    if (exerciseError) {
      await supabase.from("sessions").delete().eq("id", session.id).eq("user_id", userId);
      return { ok: false, error: "Could not start workout for this day." };
    }
  }

  return { ok: true, data: { sessionId: session.id } };
}

export async function startSessionForActiveRoutineDay(payload?: { dayIndex?: number }): Promise<ActionResult<{ sessionId: string }>> {
  const user = await requireUser();
  const supabase = supabaseServer();
  const profile = await ensureProfile(user.id);

  if (!profile.active_routine_id) {
    return { ok: false, error: "No active routine selected" };
  }

  const { data: activeRoutine, error: routineError } = await supabase
    .from("routines")
    .select("id, name, cycle_length_days, start_date, timezone")
    .eq("id", profile.active_routine_id)
    .eq("user_id", user.id)
    .single();

  if (routineError || !activeRoutine) {
    return { ok: false, error: "Your active routine could not be loaded." };
  }

  const defaultDay = getRoutineDayComputation({
    cycleLengthDays: activeRoutine.cycle_length_days,
    startDate: activeRoutine.start_date,
    profileTimeZone: activeRoutine.timezone || profile.timezone,
  });

  const routineDayIndex = payload?.dayIndex && Number.isInteger(payload.dayIndex)
    ? payload.dayIndex
    : defaultDay.dayIndex;

  const { data: routineDay, error: routineDayError } = await supabase
    .from("routine_days")
    .select("id, user_id, routine_id, day_index, name, is_rest, notes")
    .eq("routine_id", activeRoutine.id)
    .eq("day_index", routineDayIndex)
    .eq("user_id", user.id)
    .single();

  if (routineDayError || !routineDay) {
    return { ok: false, error: "That routine day could not be loaded." };
  }

  return createSessionFromDay({
    supabase,
    userId: user.id,
    routineId: activeRoutine.id,
    routineName: activeRoutine.name,
    day: routineDay as RoutineDayRow,
    context: "startSessionForActiveRoutineDay",
  });
}

export async function startSessionForRoutineDay(payload: { routineId: string; dayId: string }): Promise<ActionResult<{ sessionId: string }>> {
  const user = await requireUser();
  const supabase = supabaseServer();
  await ensureProfile(user.id);

  const { data: routine, error: routineError } = await supabase
    .from("routines")
    .select("id, user_id, name")
    .eq("id", payload.routineId)
    .eq("user_id", user.id)
    .single();

  if (routineError || !routine) {
    return { ok: false, error: "That routine could not be loaded." };
  }

  const { data: day, error: dayError } = await supabase
    .from("routine_days")
    .select("id, user_id, routine_id, day_index, name, is_rest, notes")
    .eq("id", payload.dayId)
    .eq("routine_id", payload.routineId)
    .eq("user_id", user.id)
    .single();

  if (dayError || !day) {
    return { ok: false, error: "That routine day could not be loaded." };
  }

  return createSessionFromDay({
    supabase,
    userId: user.id,
    routineId: routine.id,
    routineName: routine.name,
    day: day as RoutineDayRow,
    context: "startSessionForRoutineDay",
  });
}
