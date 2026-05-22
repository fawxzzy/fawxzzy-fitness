import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { listExercises } from "@/lib/exercises";
import type { ProgressionHistorySetRow } from "@/lib/progression-playbooks";
import { applyEffortScheduleToRoutineDayExercise } from "@/lib/progression-effective-target";
import { isMissingProgressionPlaybookColumnError, isMissingRoutineDefaultProgressionColumnError } from "@/lib/progression-schema-compat";
import { buildSessionTargetsFromRows } from "@/lib/session-targets";
import { getExerciseStatsForExercises } from "@/lib/exercise-stats";
import { isFitnessDistanceUnit, type FitnessDistanceUnit } from "@/lib/fitness-distance-units";
import type { LoadingDiagnosticsCollector } from "@/lib/loading-diagnostics";
import { supabaseServer } from "@/lib/supabase/server";
import type { SessionExerciseRow, SessionRow, SetRow } from "@/types/db";

type ProgressionHistorySetRowWithRoutineDayIndex = ProgressionHistorySetRow & {
  routineDayIndex?: number | null;
};

type MeasurementType = "reps" | "time" | "distance" | "time_distance" | "none";
type DistanceUnit = FitnessDistanceUnit;
type RoutineDayExerciseTargetRow = {
  id: string;
  exercise_id: string;
  position: number;
  measurement_type: MeasurementType | null;
  default_unit: DistanceUnit | null;
  target_sets: number | null;
  target_reps: number | null;
  target_reps_min: number | null;
  target_reps_max: number | null;
  target_weight: number | null;
  target_weight_unit: "lbs" | "kg" | null;
  target_duration_seconds: number | null;
  target_distance: number | null;
  target_distance_unit: DistanceUnit | null;
  target_calories: number | null;
  progression_playbook_id?: string | null;
  progression_playbook_config?: Record<string, unknown> | null;
};

const ROUTINE_DAY_EXERCISE_SELECT_LEGACY = "id, exercise_id, position, measurement_type, default_unit, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories";
const ROUTINE_DAY_EXERCISE_SELECT_WITH_PROGRESSION = "id, exercise_id, position, measurement_type, default_unit, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, progression_playbook_id, progression_playbook_config";
const ROUTINE_SELECT_LEGACY = "name, weight_unit";
const ROUTINE_SELECT_WITH_PROGRESSION = `${ROUTINE_SELECT_LEGACY}, default_progression_playbook_id, default_progression_playbook_config`;

function resolveMeasurementType(value: unknown): MeasurementType | null {
  return value === "reps" || value === "time" || value === "distance" || value === "time_distance" || value === "none" ? value : null;
}

function resolveDistanceUnit(value: unknown): DistanceUnit | null {
  return isFitnessDistanceUnit(value) ? value : null;
}

export async function getSessionPageData(
  sessionId: string,
  options?: {
    diagnostics?: LoadingDiagnosticsCollector;
  },
) {
  const diagnostics = options?.diagnostics;
  const user = await requireUser({
    gate: "session.auth.session",
    route: `/session/${sessionId}`,
    blockingReason: "Waiting for authenticated session before opening the session log.",
    timeoutMs: 5000,
    collector: diagnostics ?? null,
  });
  const supabase = supabaseServer();

  const { data: session } = diagnostics
    ? await diagnostics.measure("session.record.fetch", async () => await supabase
      .from("sessions")
      .select("id, user_id, performed_at, notes, routine_id, routine_day_index, name, routine_day_name, duration_seconds, status")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single(), {
      blockingReason: "Waiting for the requested session record.",
      metadata: {
        sessionId,
        userId: user.id,
      },
      timeoutMs: 7000,
    })
    : await supabase
      .from("sessions")
      .select("id, user_id, performed_at, notes, routine_id, routine_day_index, name, routine_day_name, duration_seconds, status")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

  if (!session) {
    notFound();
  }

  const { data: routineWithProgression, error: routineWithProgressionError } = session.routine_id
    ? await supabase
        .from("routines")
        .select(ROUTINE_SELECT_WITH_PROGRESSION)
        .eq("id", session.routine_id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null, error: null };
  const { data: legacyRoutine } = session.routine_id && routineWithProgressionError && isMissingRoutineDefaultProgressionColumnError(routineWithProgressionError)
    ? await supabase
        .from("routines")
        .select(ROUTINE_SELECT_LEGACY)
        .eq("id", session.routine_id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };
  const routine = routineWithProgression ?? legacyRoutine ?? null;

  const { data: sessionExercisesData } = await supabase
    .from("session_exercises")
    .select("id, session_id, user_id, exercise_id, routine_day_exercise_id, position, notes, is_skipped, measurement_type, default_unit, target_sets_min, target_sets_max, target_reps_min, target_reps_max, target_weight_min, target_weight_max, target_weight_unit, target_time_seconds_min, target_time_seconds_max, target_distance_min, target_distance_max, target_distance_unit, target_calories_min, target_calories_max, exercise:exercises(name, measurement_type, default_unit), routine_day_exercise:routine_day_exercises(id, exercise_id, position, measurement_type, default_unit)")
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

  const { data: routineDayExercisesWithProgression, error: routineDayExercisesWithProgressionError } = routineDay?.id
    ? await supabase
        .from("routine_day_exercises")
        .select(ROUTINE_DAY_EXERCISE_SELECT_WITH_PROGRESSION)
        .eq("routine_day_id", routineDay.id)
        .eq("user_id", user.id)
    : { data: [], error: null };
  const { data: legacyRoutineDayExercises } = routineDay?.id && routineDayExercisesWithProgressionError && isMissingProgressionPlaybookColumnError(routineDayExercisesWithProgressionError)
    ? await supabase
        .from("routine_day_exercises")
        .select(ROUTINE_DAY_EXERCISE_SELECT_LEGACY)
        .eq("routine_day_id", routineDay.id)
        .eq("user_id", user.id)
    : { data: null };

  const routineRows = ((routineDayExercisesWithProgression ?? legacyRoutineDayExercises ?? []) as RoutineDayExerciseTargetRow[])
    .map((row) => applyEffortScheduleToRoutineDayExercise({
      exercise: row,
      routineDayIndex: session.routine_day_index ?? null,
    }));
  const routineRowsById = new Map(routineRows.map((row) => [row.id, row]));

  const sessionExercises = ((sessionExercisesData ?? []) as Array<SessionExerciseRow & {
    exercise?: {
      name?: string | null;
      measurement_type?: "reps" | "time" | "distance" | "time_distance" | "none";
      default_unit?: FitnessDistanceUnit | null;
    } | null | Array<{
      name?: string | null;
      measurement_type?: "reps" | "time" | "distance" | "time_distance" | "none";
      default_unit?: FitnessDistanceUnit | null;
    }>;
    routine_day_exercise?: {
      id: string;
      exercise_id: string;
      position: number;
      measurement_type: "reps" | "time" | "distance" | "time_distance" | "none" | null;
      default_unit: FitnessDistanceUnit | null;
    } | null | Array<{
      id: string;
      exercise_id: string;
      position: number;
      measurement_type: "reps" | "time" | "distance" | "time_distance" | "none" | null;
      default_unit: FitnessDistanceUnit | null;
    }>;
  }>).map((item) => {
    const exerciseRow = Array.isArray(item.exercise) ? (item.exercise[0] ?? null) : (item.exercise ?? null);
    const linkedRoutine = item.routine_day_exercise_id
      ? (routineRowsById.get(item.routine_day_exercise_id) ?? null)
      : null;

    const effectiveMeasurementType = resolveMeasurementType(item.measurement_type)
      ?? resolveMeasurementType(linkedRoutine?.measurement_type)
      ?? resolveMeasurementType(exerciseRow?.measurement_type)
      ?? "reps";
    const effectiveDefaultUnit = resolveDistanceUnit(item.default_unit)
      ?? resolveDistanceUnit(linkedRoutine?.default_unit)
      ?? resolveDistanceUnit(exerciseRow?.default_unit)
      ?? (effectiveMeasurementType === "none" ? null : "mi");

    const hasSessionGoal = item.target_sets_min !== null
      || item.target_sets_max !== null
      || item.target_reps_min !== null
      || item.target_reps_max !== null
      || item.target_weight_min !== null
      || item.target_weight_max !== null
      || item.target_time_seconds_min !== null
      || item.target_time_seconds_max !== null
      || item.target_distance_min !== null
      || item.target_distance_max !== null
      || item.target_calories_min !== null
      || item.target_calories_max !== null;

    const inheritedGoalColumns = !hasSessionGoal && linkedRoutine
      ? {
          target_sets_min: linkedRoutine.target_sets ?? null,
          target_sets_max: linkedRoutine.target_sets ?? null,
          target_reps_min: linkedRoutine.target_reps_min ?? linkedRoutine.target_reps ?? null,
          target_reps_max: linkedRoutine.target_reps_max ?? linkedRoutine.target_reps ?? null,
          target_weight_min: linkedRoutine.target_weight ?? null,
          target_weight_max: linkedRoutine.target_weight ?? null,
          target_weight_unit: linkedRoutine.target_weight_unit ?? null,
          target_time_seconds_min: linkedRoutine.target_duration_seconds ?? null,
          target_time_seconds_max: linkedRoutine.target_duration_seconds ?? null,
          target_distance_min: linkedRoutine.target_distance ?? null,
          target_distance_max: linkedRoutine.target_distance ?? null,
          target_distance_unit: linkedRoutine.target_distance_unit ?? null,
          target_calories_min: linkedRoutine.target_calories ?? null,
          target_calories_max: linkedRoutine.target_calories ?? null,
        }
      : null;
    const goalSource = hasSessionGoal ? item : linkedRoutine ?? item;
    const hasSetsTarget = ("target_sets_min" in goalSource && goalSource.target_sets_min !== null) || ("target_sets_max" in goalSource && goalSource.target_sets_max !== null) || ("target_sets" in goalSource && goalSource.target_sets !== null);
    const enabledMetrics = {
      reps: ("target_reps_min" in goalSource && goalSource.target_reps_min !== null) || ("target_reps_max" in goalSource && goalSource.target_reps_max !== null) || ("target_reps" in goalSource && goalSource.target_reps !== null),
      weight: ("target_weight_min" in goalSource && goalSource.target_weight_min !== null) || ("target_weight_max" in goalSource && goalSource.target_weight_max !== null) || ("target_weight" in goalSource && goalSource.target_weight !== null),
      time: ("target_time_seconds_min" in goalSource && goalSource.target_time_seconds_min !== null) || ("target_time_seconds_max" in goalSource && goalSource.target_time_seconds_max !== null) || ("target_duration_seconds" in goalSource && goalSource.target_duration_seconds !== null),
      distance: ("target_distance_min" in goalSource && goalSource.target_distance_min !== null) || ("target_distance_max" in goalSource && goalSource.target_distance_max !== null) || ("target_distance" in goalSource && goalSource.target_distance !== null),
      calories: ("target_calories_min" in goalSource && goalSource.target_calories_min !== null) || ("target_calories_max" in goalSource && goalSource.target_calories_max !== null) || ("target_calories" in goalSource && goalSource.target_calories !== null),
      sets: hasSetsTarget,
    };

    return {
      ...item,
      exercise_name: exerciseRow?.name ?? null,
      ...(inheritedGoalColumns ?? {}),
      target_reps: linkedRoutine?.target_reps ?? null,
      measurement_type: effectiveMeasurementType,
      default_unit: effectiveDefaultUnit,
      enabled_metrics: enabledMetrics,
      progression_playbook_id: linkedRoutine?.progression_playbook_id ?? null,
      progression_playbook_config: linkedRoutine?.progression_playbook_config ?? null,
    };
  });
  const exerciseIds = sessionExercises.map((exercise) => exercise.id);

  const { data: setsData } = exerciseIds.length
    ? await supabase
        .from("sets")
        .select("id, client_log_id, session_exercise_id, user_id, set_index, weight, reps, is_warmup, notes, duration_seconds, distance, distance_unit, calories, rpe, weight_unit")
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

  const sessionTargets = buildSessionTargetsFromRows({
    sessionExercises: (sessionExercisesData ?? []) as Array<SessionExerciseRow>,
    routineDayExercises: routineRows,
  });
  const exerciseOptions = diagnostics
    ? await diagnostics.measure("session.exercise-catalog.fetch", () => listExercises(), {
      blockingReason: "Waiting for exercise catalog metadata for the session page.",
      metadata: {
        sessionId,
        userId: user.id,
      },
      timeoutMs: 7000,
    })
    : await listExercises();
  const exerciseNameMap = new Map(exerciseOptions.map((exercise) => [exercise.id, exercise.name]));
  // exercise_stats is keyed by canonical exercises.id UUIDs (never session_exercises.id / routine_day_exercises.id / slug).
  const canonicalExerciseIds = Array.from(new Set(sessionExercises.map((exercise) => exercise.exercise_id).filter((exerciseId): exerciseId is string => Boolean(exerciseId))));
  const exerciseStatsByExerciseId = diagnostics
    ? await diagnostics.measure("session.exercise-stats.fetch", () => getExerciseStatsForExercises(user.id, canonicalExerciseIds), {
      blockingReason: "Waiting for session exercise stats.",
      metadata: {
        canonicalExerciseCount: canonicalExerciseIds.length,
        sessionId,
        userId: user.id,
      },
      timeoutMs: 7000,
    })
    : await getExerciseStatsForExercises(user.id, canonicalExerciseIds);

  const progressionExerciseIds = Array.from(new Set(
    sessionExercises
      .filter((exercise) => Boolean(exercise.progression_playbook_id && exercise.exercise_id))
      .map((exercise) => exercise.exercise_id)
      .filter((exerciseId): exerciseId is string => Boolean(exerciseId)),
  ));

  const { data: progressionSessionExercisesData } = progressionExerciseIds.length
    ? await supabase
        .from("session_exercises")
        .select("id, exercise_id, routine_day_exercise_id, session:sessions!inner(performed_at, status, routine_day_index)")
        .eq("user_id", user.id)
        .in("exercise_id", progressionExerciseIds)
        .eq("session.status", "completed")
    : { data: [] };

  const progressionSessionExerciseMetaById = new Map<string, { exerciseId: string; routineDayExerciseId: string | null; performedAt: string; routineDayIndex: number | null }>();
  for (const row of (progressionSessionExercisesData ?? []) as Array<{
    id: string;
    exercise_id: string;
    routine_day_exercise_id?: string | null;
    session?: { performed_at?: string | null; status?: "completed" | "in_progress"; routine_day_index?: number | null } | Array<{ performed_at?: string | null; status?: "completed" | "in_progress"; routine_day_index?: number | null }> | null;
  }>) {
    const sessionRow = Array.isArray(row.session) ? (row.session[0] ?? null) : (row.session ?? null);
    if (!row.id || !row.exercise_id || !sessionRow?.performed_at || sessionRow.status !== "completed") {
      continue;
    }

    progressionSessionExerciseMetaById.set(row.id, {
      exerciseId: row.exercise_id,
      routineDayExerciseId: row.routine_day_exercise_id ?? null,
      performedAt: sessionRow.performed_at,
      routineDayIndex: typeof sessionRow.routine_day_index === "number" ? sessionRow.routine_day_index : null,
    });
  }

  const progressionSessionExerciseIds = [...progressionSessionExerciseMetaById.keys()];
  const { data: progressionSetsData } = progressionSessionExerciseIds.length
    ? await supabase
        .from("sets")
        .select("session_exercise_id, set_index, weight, reps, weight_unit, duration_seconds, distance, distance_unit, calories, is_warmup")
        .in("session_exercise_id", progressionSessionExerciseIds)
        .eq("user_id", user.id)
        .order("set_index", { ascending: true })
    : { data: [] };

  const progressionHistoryByExerciseId = new Map<string, ProgressionHistorySetRowWithRoutineDayIndex[]>();
  const progressionHistoryByRoutineDayExerciseId = new Map<string, ProgressionHistorySetRowWithRoutineDayIndex[]>();
  for (const row of (progressionSetsData ?? []) as Array<{
    session_exercise_id: string;
    set_index: number;
    weight: number | null;
    reps: number | null;
    weight_unit: "lbs" | "kg" | null;
    duration_seconds: number | null;
    distance: number | null;
    distance_unit: FitnessDistanceUnit | null;
    calories: number | null;
    is_warmup: boolean;
  }>) {
    const meta = progressionSessionExerciseMetaById.get(row.session_exercise_id);
    if (!meta) {
      continue;
    }

    const historyRow = {
      sessionId: row.session_exercise_id,
      performedAt: meta.performedAt,
      routineDayIndex: meta.routineDayIndex,
      setIndex: row.set_index,
      weight: row.weight ?? null,
      reps: row.reps ?? null,
      weightUnit: row.weight_unit ?? null,
      durationSeconds: row.duration_seconds ?? null,
      distance: row.distance ?? null,
      distanceUnit: row.distance_unit ?? null,
      calories: row.calories ?? null,
      isWarmup: row.is_warmup,
    };
    const current = progressionHistoryByExerciseId.get(meta.exerciseId) ?? [];
    current.push(historyRow);
    progressionHistoryByExerciseId.set(meta.exerciseId, current);

    if (meta.routineDayExerciseId) {
      const routineDayRows = progressionHistoryByRoutineDayExerciseId.get(meta.routineDayExerciseId) ?? [];
      routineDayRows.push(historyRow);
      progressionHistoryByRoutineDayExerciseId.set(meta.routineDayExerciseId, routineDayRows);
    }
  }

  return {
    sessionRow: session as SessionRow,
    routineDayId: routineDay?.id ?? null,
    routine,
    sessionExercises,
    setsByExercise,
    sessionTargets,
    exerciseOptions,
    exerciseNameMap,
    exerciseStatsByExerciseId,
    progressionHistoryByExerciseId,
    progressionHistoryByRoutineDayExerciseId,
  };
}
