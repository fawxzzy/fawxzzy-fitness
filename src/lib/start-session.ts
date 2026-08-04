import { requireUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-result";
import { ensureProfile } from "@/lib/profile";
import { buildCanonicalDaySummaries } from "@/lib/routine-day-loader";
import { getSessionStartErrorMessage } from "@/lib/runnable-day";
import { createSessionAtomicallyFromDay } from "@/lib/session-start-activation";
import { formatRoutineDayDisplayName, getRoutineDayComputation } from "@/lib/routines";
import { supabaseServer } from "@/lib/supabase/server";
import type { RoutineDayExerciseRow, RoutineDayRow } from "@/types/db";

type ServerSupabase = ReturnType<typeof supabaseServer>;

type SessionStartContext = {
  supabase: ServerSupabase;
  userId: string;
  routineId: string;
  routineName: string;
  routineStartDate: string | null;
  day: RoutineDayRow;
  context: string;
};

async function createSessionFromDay(context: SessionStartContext): Promise<ActionResult<{ sessionId: string }>> {
  const { supabase, userId, routineId, routineName, routineStartDate, day, context: logContext } = context;

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

  const routineDayName = formatRoutineDayDisplayName({
    name: day.name,
    dayIndex: day.day_index,
    startDate: routineStartDate,
  });

  return createSessionAtomicallyFromDay({
    // supabase-js's .rpc(...) returns a thenable PostgrestFilterBuilder, not
    // a native Promise; wrapping in an async function (matching the
    // convention already used in planner-routine-executor.ts for the
    // sibling create_planner_routine_v1 RPC) normalizes it to a real Promise
    // so it satisfies the adapter's client type.
    supabase: { rpc: async (name, args) => await supabase.rpc(name, args) },
    routineId,
    dayId: day.id,
    routineName,
    routineDayName,
    runnableExercises,
    context: logContext,
  });
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
    routineStartDate: activeRoutine.start_date,
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
    .select("id, user_id, name, start_date")
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
    routineStartDate: routine.start_date,
    day: day as RoutineDayRow,
    context: "startSessionForRoutineDay",
  });
}
