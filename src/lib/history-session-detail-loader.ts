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

const FULL_EXERCISE_METADATA_SELECT = "id, name, slug, image_path, image_icon_path, image_howto_path, measurement_type, default_unit, equipment, movement_pattern, calories_estimation_method";
const LEGACY_EXERCISE_METADATA_SELECT = "id, name, slug";
const OPTIONAL_EXERCISE_METADATA_COLUMNS = [
  "image_path",
  "image_icon_path",
  "image_howto_path",
  "measurement_type",
  "default_unit",
  "equipment",
  "movement_pattern",
  "calories_estimation_method",
] as const;

function nonEmptyLabel(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isOptionalExerciseMetadataColumnError(error: unknown) {
  const message = typeof (error as { message?: unknown } | null)?.message === "string"
    ? (error as { message: string }).message.toLowerCase()
    : "";
  return OPTIONAL_EXERCISE_METADATA_COLUMNS.some((column) => message.includes(column));
}

function hydrateExerciseMetadata(row: Partial<ExerciseMetadata> & { id?: unknown }): ExerciseMetadata | null {
  const id = nonEmptyLabel(row.id);
  if (!id) return null;

  return {
    id,
    name: nonEmptyLabel(row.name),
    slug: nonEmptyLabel(row.slug),
    image_path: nonEmptyLabel(row.image_path),
    image_icon_path: nonEmptyLabel(row.image_icon_path),
    image_howto_path: nonEmptyLabel(row.image_howto_path),
    measurement_type: row.measurement_type ?? null,
    default_unit: nonEmptyLabel(row.default_unit),
    equipment: nonEmptyLabel(row.equipment),
    movement_pattern: nonEmptyLabel(row.movement_pattern),
    calories_estimation_method: nonEmptyLabel(row.calories_estimation_method),
  };
}

export function resolveHistoryExerciseName(options: {
  metadataName?: string | null;
  rowExerciseName?: string | null;
  rowName?: string | null;
  mapExerciseName?: string | null;
}) {
  return nonEmptyLabel(options.metadataName)
    ?? nonEmptyLabel(options.rowExerciseName)
    ?? nonEmptyLabel(options.rowName)
    ?? nonEmptyLabel(options.mapExerciseName)
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
  let fallbackPathUsed = false;
  const baseSessionExerciseSelect = "id, session_id, user_id, exercise_id, routine_day_exercise_id, position, performed_index, notes, copilot_feedback_signal, copilot_feedback_note, copilot_feedback_effort, copilot_feedback_updated_at, is_skipped, measurement_type, default_unit, target_sets_min, target_sets_max, target_reps_min, target_reps_max, target_weight_min, target_weight_max, target_weight_unit, target_time_seconds_min, target_time_seconds_max, target_distance_min, target_distance_max, target_distance_unit, target_calories_min, target_calories_max, routine_day_exercise:routine_day_exercises(id, notes, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, progression_playbook_id, progression_playbook_config, measurement_type, default_unit)";
  const timerSelect = "exercise_timer_enabled, exercise_timer_mode, exercise_timer_target_seconds, exercise_timer_elapsed_seconds, exercise_timer_status, exercise_timer_started_at, exercise_timer_completed_at";

  const createSessionExerciseQuery = (select: string) => supabase
    .from("session_exercises")
    .select(select)
    .eq("session_id", sessionId);
  const sessionExerciseQuery = createSessionExerciseQuery(`${baseSessionExerciseSelect}, ${timerSelect}`);
  if (!sessionFound) {
    sessionExerciseQuery.eq("user_id", userId);
  }
  let sessionExerciseResult = await sessionExerciseQuery.order("position", { ascending: true });
  if (sessionExerciseResult.error?.message?.toLowerCase().includes("exercise_timer_")) {
    fallbackPathUsed = true;
    const fallbackQuery = createSessionExerciseQuery(baseSessionExerciseSelect);
    if (!sessionFound) {
      fallbackQuery.eq("user_id", userId);
    }
    sessionExerciseResult = await fallbackQuery.order("position", { ascending: true });
  }
  const sessionExercises = (sessionExerciseResult.data ?? []) as SessionExerciseWithExercise[];
  const strictSessionExercisesCount = sessionExercises.length;
  const relaxedSessionExercisesCount = sessionFound ? sessionExercises.length : 0;

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
    const createExerciseQuery = (select: string) => supabase
      .from("exercises")
      .select(select)
      .in("id", exerciseIds);
    let exerciseResult = await createExerciseQuery(FULL_EXERCISE_METADATA_SELECT);
    if (isOptionalExerciseMetadataColumnError(exerciseResult.error)) {
      fallbackPathUsed = true;
      exerciseResult = await createExerciseQuery(LEGACY_EXERCISE_METADATA_SELECT);
    }
    const exerciseRows = ((exerciseResult.data ?? []) as Array<Partial<ExerciseMetadata> & { id?: unknown }>)
      .map(hydrateExerciseMetadata)
      .filter((row): row is ExerciseMetadata => row !== null);
    exerciseMetadataById = new Map(exerciseRows.map((row) => [row.id, row]));
  }

  let sets = [] as SetRow[];
  let strictSetsCount = 0;
  let relaxedSetsCount = 0;

  if (sessionExerciseIds.length) {
    const createSetQuery = (select: string) => supabase
      .from("sets")
      .select(select)
      .in("session_exercise_id", sessionExerciseIds);
    const setQuery = createSetQuery("id, session_exercise_id, user_id, set_index, weight, reps, is_warmup, notes, duration_seconds, distance, distance_unit, calories, rpe, weight_unit, logged_at");
    if (!sessionFound) {
      setQuery.eq("user_id", userId);
    }
    let setResult = await setQuery.order("set_index", { ascending: true });
    if (setResult.error?.message?.toLowerCase().includes("logged_at")) {
      fallbackPathUsed = true;
      const fallbackQuery = createSetQuery("id, session_exercise_id, user_id, set_index, weight, reps, is_warmup, notes, duration_seconds, distance, distance_unit, calories, rpe, weight_unit");
      if (!sessionFound) {
        fallbackQuery.eq("user_id", userId);
      }
      setResult = await fallbackQuery.order("set_index", { ascending: true });
    }
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
