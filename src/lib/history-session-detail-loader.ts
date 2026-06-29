import type { RoutineDayExerciseRow, SessionExerciseRow, SetRow } from "@/types/db";

type SessionExerciseWithExercise = SessionExerciseRow & {
  routine_day_exercise?: (Partial<RoutineDayExerciseRow> & { notes?: string | null }) | Array<Partial<RoutineDayExerciseRow> & { notes?: string | null }> | null;
};

export type ExerciseMetadata = {
  id: string;
  name: string | null;
  slug: string | null;
  image_path: string | null;
  image_icon_path: string | null;
  image_howto_path: string | null;
  measurement_type: "reps" | "time" | "distance" | "time_distance" | "none" | null;
  default_unit: string | null;
  equipment?: string | null;
  movement_pattern?: string | null;
  calories_estimation_method?: string | null;
};

export function resolveHistoryExerciseName(options: {
  metadataName?: string | null;
  rowExerciseName?: string | null;
  rowName?: string | null;
  mapExerciseName?: string | null;
}) {
  return options.metadataName
    ?? options.rowExerciseName
    ?? options.rowName
    ?? options.mapExerciseName
    ?? "Exercise";
}

function getLinkedRoutineExerciseNotes(row: SessionExerciseWithExercise) {
  const routineExercise = Array.isArray(row.routine_day_exercise)
    ? (row.routine_day_exercise[0] ?? null)
    : (row.routine_day_exercise ?? null);

  return typeof routineExercise?.notes === "string" ? routineExercise.notes.trim() : "";
}

function suppressInheritedRoutineExerciseNote(row: SessionExerciseWithExercise): SessionExerciseWithExercise {
  const loggedNote = typeof row.notes === "string" ? row.notes.trim() : "";
  const routineNote = getLinkedRoutineExerciseNotes(row);
  if (!loggedNote || !routineNote || loggedNote !== routineNote) {
    return row;
  }

  // Older sessions sometimes copied routine-plan notes into the log row.
  // Hide only exact inherited copies so manually edited log notes still show.
  return {
    ...row,
    notes: null,
  };
}

type LoaderSummary = {
  sessionId: string;
  sessionFound: boolean;
  strictSessionExercisesCount: number;
  relaxedSessionExercisesCount: number;
  sessionExercisesCount: number;
  sessionExerciseIdsCount: number;
  strictSetsCount: number;
  relaxedSetsCount: number;
  setsCount: number;
  fallbackPathUsed: boolean;
};

export async function loadHistoryDetailRows({
  supabase,
  sessionId,
  userId,
  sessionFound,
}: {
  supabase: any;
  sessionId: string;
  userId: string;
  sessionFound: boolean;
}) {
  const baseSessionExerciseSelect = "id, session_id, user_id, exercise_id, routine_day_exercise_id, position, performed_index, notes, copilot_feedback_signal, copilot_feedback_note, copilot_feedback_updated_at, is_skipped, measurement_type, default_unit, target_sets_min, target_sets_max, target_reps_min, target_reps_max, target_weight_min, target_weight_max, target_weight_unit, target_time_seconds_min, target_time_seconds_max, target_distance_min, target_distance_max, target_distance_unit, target_calories_min, target_calories_max, routine_day_exercise:routine_day_exercises(id, notes, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, progression_playbook_id, progression_playbook_config, measurement_type, default_unit)";

  const sessionExerciseQuery = supabase
    .from("session_exercises")
    .select(baseSessionExerciseSelect)
    .eq("session_id", sessionId);
  if (!sessionFound) {
    sessionExerciseQuery.eq("user_id", userId);
  }
  const sessionExerciseResult = await sessionExerciseQuery.order("position", { ascending: true });
  const sessionExercises = (sessionExerciseResult.data ?? []) as SessionExerciseWithExercise[];
  const strictSessionExercisesCount = sessionExercises.length;
  const relaxedSessionExercisesCount = sessionFound ? sessionExercises.length : 0;
  let fallbackPathUsed = false;

  const orderedSessionExercises = (() => {
    const performed = sessionExercises
      .filter((exercise) => typeof exercise.performed_index === "number")
      .sort((a, b) => (a.performed_index ?? 0) - (b.performed_index ?? 0));
    const untouched = sessionExercises.filter((exercise) => typeof exercise.performed_index !== "number");
    return [...performed, ...untouched].map(suppressInheritedRoutineExerciseNote);
  })();

  const sessionExerciseIds = orderedSessionExercises.map((row) => String(row.id));
  const exerciseIds = Array.from(new Set(
    orderedSessionExercises
      .map((row) => String(row.exercise_id))
      .filter((id) => id.length > 0),
  ));
  let exerciseMetadataById = new Map<string, ExerciseMetadata>();

  if (exerciseIds.length) {
    const exerciseQuery = await supabase
      .from("exercises")
      .select("id, name, slug, image_path, image_icon_path, image_howto_path, measurement_type, default_unit, equipment, movement_pattern, calories_estimation_method")
      .in("id", exerciseIds);
    const exerciseRows = (exerciseQuery.data ?? []) as ExerciseMetadata[];
    exerciseMetadataById = new Map(exerciseRows.map((row) => [String(row.id), row]));
  }

  let sets = [] as SetRow[];
  let strictSetsCount = 0;
  let relaxedSetsCount = 0;

  if (sessionExerciseIds.length) {
    const setQuery = supabase
      .from("sets")
      .select("id, session_exercise_id, user_id, set_index, weight, reps, is_warmup, notes, duration_seconds, distance, distance_unit, calories, rpe, weight_unit")
      .in("session_exercise_id", sessionExerciseIds);
    if (!sessionFound) {
      setQuery.eq("user_id", userId);
    }
    const setResult = await setQuery.order("set_index", { ascending: true });
    sets = (setResult.data ?? []) as SetRow[];
    strictSetsCount = sets.length;
    relaxedSetsCount = sessionFound ? sets.length : 0;
  }

  const summary: LoaderSummary = {
    sessionId,
    sessionFound,
    strictSessionExercisesCount,
    relaxedSessionExercisesCount,
    sessionExercisesCount: orderedSessionExercises.length,
    sessionExerciseIdsCount: sessionExerciseIds.length,
    strictSetsCount,
    relaxedSetsCount,
    setsCount: sets.length,
    fallbackPathUsed,
  };

  return {
    orderedSessionExercises,
    exerciseMetadataById,
    sessionExerciseIds,
    sets,
    summary,
  };
}
