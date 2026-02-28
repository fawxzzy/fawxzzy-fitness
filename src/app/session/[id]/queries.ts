import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { listExercises } from "@/lib/exercises";
import { getSessionTargets } from "@/lib/session-targets";
import { getExerciseStatsForExercises } from "@/lib/exercise-stats";
import { supabaseServer } from "@/lib/supabase/server";
import type { SessionExerciseRow, SessionRow, SetRow } from "@/types/db";

type MeasurementType = "reps" | "time" | "distance" | "time_distance";
type DistanceUnit = "mi" | "km" | "m";

function resolveMeasurementType(value: unknown): MeasurementType | null {
  return value === "reps" || value === "time" || value === "distance" || value === "time_distance" ? value : null;
}

function resolveDistanceUnit(value: unknown): DistanceUnit | null {
  return value === "mi" || value === "km" || value === "m" ? value : null;
}

export async function getSessionPageData(sessionId: string) {
  const user = await requireUser();
  const supabase = supabaseServer();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, user_id, performed_at, notes, routine_id, routine_day_index, name, routine_day_name, duration_seconds, status")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) {
    notFound();
  }

  const { data: routine } = session.routine_id
    ? await supabase.from("routines").select("weight_unit").eq("id", session.routine_id).eq("user_id", user.id).maybeSingle()
    : { data: null };

  const { data: sessionExercisesData } = await supabase
    .from("session_exercises")
    .select("id, session_id, user_id, exercise_id, routine_day_exercise_id, position, notes, is_skipped, measurement_type, default_unit, exercise:exercises(name, measurement_type, default_unit), routine_day_exercise:routine_day_exercises(id, exercise_id, position, measurement_type, default_unit, target_reps, target_reps_min, target_reps_max, target_weight, target_duration_seconds, target_distance, target_calories)")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  const { data: routineDay } = session.routine_id && session.routine_day_index
    ? await supabase
        .from("routine_days")
        .select("id")
        .eq("routine_id", session.routine_id)
        .eq("day_index", session.routine_day_index)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  const { data: routineDayExercises } = routineDay?.id
    ? await supabase
        .from("routine_day_exercises")
        .select("id, exercise_id, position, measurement_type, default_unit, target_reps, target_reps_min, target_reps_max, target_weight, target_duration_seconds, target_distance, target_calories")
        .eq("routine_day_id", routineDay.id)
        .eq("user_id", user.id)
    : { data: [] };

  const routineRows = routineDayExercises ?? [];
  const routineRowsById = new Map(routineRows.map((row) => [row.id, row]));
  const routineRowsByPosition = new Map<number, typeof routineRows[number]>();
  const routineRowsByExerciseId = new Map<string, Array<typeof routineRows[number]>>();

  for (const row of routineRows) {
    routineRowsByPosition.set(row.position, row);
    const list = routineRowsByExerciseId.get(row.exercise_id) ?? [];
    list.push(row);
    routineRowsByExerciseId.set(row.exercise_id, list);
  }

  const consumedRoutineIds = new Set<string>();

  const sessionExercises = ((sessionExercisesData ?? []) as Array<SessionExerciseRow & {
    exercise?: {
      name?: string | null;
      measurement_type?: "reps" | "time" | "distance" | "time_distance";
      default_unit?: "mi" | "km" | "m" | null;
    } | null | Array<{
      name?: string | null;
      measurement_type?: "reps" | "time" | "distance" | "time_distance";
      default_unit?: "mi" | "km" | "m" | null;
    }>;
    routine_day_exercise?: {
      id: string;
      exercise_id: string;
      position: number;
      measurement_type: "reps" | "time" | "distance" | "time_distance" | null;
      default_unit: "mi" | "km" | "m" | null;
      target_reps: number | null;
      target_reps_min: number | null;
      target_reps_max: number | null;
      target_weight: number | null;
      target_duration_seconds: number | null;
      target_distance: number | null;
      target_calories: number | null;
    } | null | Array<{
      id: string;
      exercise_id: string;
      position: number;
      measurement_type: "reps" | "time" | "distance" | "time_distance" | null;
      default_unit: "mi" | "km" | "m" | null;
      target_reps: number | null;
      target_reps_min: number | null;
      target_reps_max: number | null;
      target_weight: number | null;
      target_duration_seconds: number | null;
      target_distance: number | null;
      target_calories: number | null;
    }>;
  }>).map((item) => {
    const exerciseRow = Array.isArray(item.exercise) ? (item.exercise[0] ?? null) : (item.exercise ?? null);
    const linkedRoutine = Array.isArray(item.routine_day_exercise) ? (item.routine_day_exercise[0] ?? null) : (item.routine_day_exercise ?? null);

    let matchedRoutine = linkedRoutine ?? (item.routine_day_exercise_id ? (routineRowsById.get(item.routine_day_exercise_id) ?? null) : null);
    if (!matchedRoutine) {
      matchedRoutine = routineRowsByPosition.get(item.position) ?? null;
      if (matchedRoutine?.exercise_id !== item.exercise_id || consumedRoutineIds.has(matchedRoutine.id)) {
        matchedRoutine = null;
        const candidates = routineRowsByExerciseId.get(item.exercise_id) ?? [];
        matchedRoutine = candidates.find((candidate) => !consumedRoutineIds.has(candidate.id)) ?? null;
      }
    }
    if (matchedRoutine) {
      consumedRoutineIds.add(matchedRoutine.id);
    }

    const effectiveMeasurementType = resolveMeasurementType(item.measurement_type)
      ?? resolveMeasurementType(matchedRoutine?.measurement_type)
      ?? resolveMeasurementType(exerciseRow?.measurement_type)
      ?? "reps";
    const effectiveDefaultUnit = resolveDistanceUnit(item.default_unit)
      ?? resolveDistanceUnit(matchedRoutine?.default_unit)
      ?? resolveDistanceUnit(exerciseRow?.default_unit)
      ?? "mi";

    const enabledMetrics = {
      reps: matchedRoutine ? (matchedRoutine.target_reps !== null || matchedRoutine.target_reps_min !== null || matchedRoutine.target_reps_max !== null) : null,
      weight: matchedRoutine ? matchedRoutine.target_weight !== null : null,
      time: matchedRoutine ? matchedRoutine.target_duration_seconds !== null : null,
      distance: matchedRoutine ? matchedRoutine.target_distance !== null : null,
      calories: matchedRoutine ? matchedRoutine.target_calories !== null : null,
    };

    return {
      ...item,
      measurement_type: effectiveMeasurementType,
      default_unit: effectiveDefaultUnit,
      enabled_metrics: enabledMetrics,
    };
  });
  const exerciseIds = sessionExercises.map((exercise) => exercise.id);

  const { data: setsData } = exerciseIds.length
    ? await supabase
        .from("sets")
        .select("id, session_exercise_id, user_id, set_index, weight, reps, is_warmup, notes, duration_seconds, distance, distance_unit, calories, rpe, weight_unit")
        .in("session_exercise_id", exerciseIds)
        .eq("user_id", user.id)
        .order("set_index", { ascending: true })
    : { data: [] };

  const sets = (setsData ?? []) as SetRow[];
  const setsByExercise = new Map<string, SetRow[]>();

  for (const set of sets) {
    const current = setsByExercise.get(set.session_exercise_id) ?? [];
    current.push(set);
    setsByExercise.set(set.session_exercise_id, current);
  }

  const sessionTargets = await getSessionTargets(sessionId);
  const exerciseOptions = await listExercises();
  const exerciseNameMap = new Map(exerciseOptions.map((exercise) => [exercise.id, exercise.name]));
  const customExercises = exerciseOptions.filter((exercise) => !exercise.is_global && exercise.user_id === user.id);
  const exerciseStatsByExerciseId = await getExerciseStatsForExercises(user.id, exerciseOptions.map((exercise) => exercise.id));

  return {
    sessionRow: session as SessionRow,
    routine,
    sessionExercises,
    setsByExercise,
    sessionTargets,
    exerciseOptions,
    exerciseNameMap,
    customExercises,
    exerciseStatsByExerciseId,
  };
}
