import "server-only";

import * as XLSX from "xlsx";
import type {
  ExerciseRow,
  ProfileRow,
  RoutineDayExerciseRow,
  RoutineDayRow,
  RoutineRow,
  SessionExerciseRow,
  SessionRow,
  SetRow,
} from "@/types/db";

export type AccountWorkoutExportFileType = "csv" | "json" | "xlsx";
export type AccountWorkoutExportScope = "all" | "completed_only" | "current_routine";

export type AccountWorkoutExportOptions = {
  fileType: AccountWorkoutExportFileType;
  exportName?: string | null;
  scope: AccountWorkoutExportScope;
  dateFrom?: string | null;
  dateTo?: string | null;
};

export type AccountWorkoutExportSuggestedDateRange = {
  dateFrom: string;
  dateTo: string;
};

export type AccountWorkoutExportProfileRow = ProfileRow & {
  created_at: string | null;
  updated_at: string | null;
};

export type AccountWorkoutExportRoutineRow = RoutineRow & {
  progression_mode: string | null;
  temperament: string | null;
  created_at: string | null;
};

export type AccountWorkoutExportRoutineDayRow = RoutineDayRow & {
  created_at: string | null;
};

export type AccountWorkoutExportRoutineDayExerciseRow = RoutineDayExerciseRow & {
  created_at: string | null;
};

export type AccountWorkoutExportSessionExerciseRow = SessionExerciseRow & {
  target_reps?: number | null;
  target_weight?: number | null;
  target_duration_seconds?: number | null;
  target_distance?: number | null;
  target_calories?: number | null;
};

export type AccountWorkoutExportExerciseRow = ExerciseRow & {
  primary_muscles?: string[] | null;
  secondary_muscles?: string[] | null;
  image_muscles_path?: string | null;
};

export type AccountWorkoutExportPayload = {
  metadata: {
    snapshotVersion: "fitness-account-export-v1";
    sourceApp: "fawxzzy-fitness";
    sourceBackend: "primary-supabase";
    exportedAt: string;
    scope: AccountWorkoutExportScope;
    dateFrom: string | null;
    dateTo: string | null;
    activeRoutineId: string | null;
    canonicalTables: readonly string[];
    excludedTables: readonly string[];
    counts: {
      profile: number;
      sessions: number;
      completedSessions: number;
      sessionExercises: number;
      sets: number;
      routines: number;
      routineDays: number;
      routineDayExercises: number;
      exercises: number;
      globalExercises: number;
      userOwnedExercises: number;
    };
  };
  profile: AccountWorkoutExportProfileRow | null;
  sessions: SessionRow[];
  sessionExercises: AccountWorkoutExportSessionExerciseRow[];
  sets: SetRow[];
  routines: AccountWorkoutExportRoutineRow[];
  routineDays: AccountWorkoutExportRoutineDayRow[];
  routineDayExercises: AccountWorkoutExportRoutineDayExerciseRow[];
  exercises: AccountWorkoutExportExerciseRow[];
};

export type AccountWorkoutExportCsvRow = {
  session_id: string;
  performed_at: string;
  session_status: string;
  session_duration_seconds: number | null;
  routine_id: string | null;
  routine_name: string | null;
  routine_day_index: number | null;
  routine_day_name: string | null;
  session_exercise_id: string | null;
  routine_day_exercise_id: string | null;
  session_exercise_position: number | null;
  session_exercise_performed_index: number | null;
  session_exercise_is_skipped: boolean | null;
  session_exercise_measurement_type: string | null;
  session_exercise_default_unit: string | null;
  exercise_id: string | null;
  exercise_name: string | null;
  target_sets_min: number | null;
  target_sets_max: number | null;
  target_reps: number | null;
  target_reps_min: number | null;
  target_reps_max: number | null;
  target_weight: number | null;
  target_weight_min: number | null;
  target_weight_max: number | null;
  target_weight_unit: string | null;
  target_duration_seconds: number | null;
  target_time_seconds_min: number | null;
  target_time_seconds_max: number | null;
  target_distance: number | null;
  target_distance_min: number | null;
  target_distance_max: number | null;
  target_distance_unit: string | null;
  target_calories: number | null;
  target_calories_min: number | null;
  target_calories_max: number | null;
  set_id: string | null;
  client_log_id: string | null;
  set_index: number | null;
  reps: number | null;
  weight: number | null;
  weight_unit: string | null;
  duration_seconds: number | null;
  distance: number | null;
  distance_unit: string | null;
  calories: number | null;
  rpe: number | null;
  is_warmup: boolean | null;
  session_notes: string | null;
  session_exercise_notes: string | null;
  set_notes: string | null;
};

type QueryError = { message?: string } | null | undefined;
type WorkbookSheetRow = Record<string, string | number | boolean | null>;
type AccountWorkoutExportWorkbookSheet = {
  name:
    | "Metadata"
    | "Profile"
    | "Sessions"
    | "Completed Sessions"
    | "Session Exercises"
    | "Sets"
    | "Exercises"
    | "Routines"
    | "Routine Days"
    | "Routine Day Exercises"
    | "Progression Summary";
  headers: string[];
  rows: WorkbookSheetRow[];
};

const ACCOUNT_WORKOUT_EXPORT_SNAPSHOT_VERSION = "fitness-account-export-v1" as const;
const ACCOUNT_WORKOUT_EXPORT_CANONICAL_TABLES = [
  "profiles",
  "exercises",
  "routines",
  "routine_days",
  "routine_day_exercises",
  "sessions",
  "session_exercises",
  "sets",
] as const;
const ACCOUNT_WORKOUT_EXPORT_EXCLUDED_TABLES = [
  "exercise_stats",
  "session_follow_up_jobs",
] as const;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ACCOUNT_WORKOUT_EXPORT_CSV_HEADERS = [
  "session_id",
  "performed_at",
  "session_status",
  "session_duration_seconds",
  "routine_id",
  "routine_name",
  "routine_day_index",
  "routine_day_name",
  "session_exercise_id",
  "routine_day_exercise_id",
  "session_exercise_position",
  "session_exercise_performed_index",
  "session_exercise_is_skipped",
  "session_exercise_measurement_type",
  "session_exercise_default_unit",
  "exercise_id",
  "exercise_name",
  "target_sets_min",
  "target_sets_max",
  "target_reps",
  "target_reps_min",
  "target_reps_max",
  "target_weight",
  "target_weight_min",
  "target_weight_max",
  "target_weight_unit",
  "target_duration_seconds",
  "target_time_seconds_min",
  "target_time_seconds_max",
  "target_distance",
  "target_distance_min",
  "target_distance_max",
  "target_distance_unit",
  "target_calories",
  "target_calories_min",
  "target_calories_max",
  "set_id",
  "client_log_id",
  "set_index",
  "reps",
  "weight",
  "weight_unit",
  "duration_seconds",
  "distance",
  "distance_unit",
  "calories",
  "rpe",
  "is_warmup",
  "session_notes",
  "session_exercise_notes",
  "set_notes",
] as const satisfies ReadonlyArray<keyof AccountWorkoutExportCsvRow>;

function escapeCsvValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = typeof value === "string" ? value : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }

  return text;
}

function compareNullableStrings(left: string | null | undefined, right: string | null | undefined) {
  if (left === right) {
    return 0;
  }

  if (!left) {
    return 1;
  }

  if (!right) {
    return -1;
  }

  return left.localeCompare(right);
}

function compareNullableNumbers(left: number | null | undefined, right: number | null | undefined) {
  if (left === right) {
    return 0;
  }

  if (left === null || left === undefined) {
    return 1;
  }

  if (right === null || right === undefined) {
    return -1;
  }

  return left - right;
}

function ensureQueryRows<T>(result: { data: T[] | null; error?: QueryError }, table: string) {
  if (result.error) {
    throw new Error(`${table}: ${result.error.message ?? "Query failed."}`);
  }

  return Array.isArray(result.data) ? result.data : [];
}

function ensureMaybeSingle<T>(result: { data: T | null; error?: QueryError }, table: string) {
  if (result.error) {
    throw new Error(`${table}: ${result.error.message ?? "Query failed."}`);
  }

  return result.data ?? null;
}

function serializeWorkbookValue(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  return JSON.stringify(value);
}

function normalizeDateOnly(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function resolveValidatedDateOnly(label: "From" | "To", value: string | null | undefined) {
  if (!value) {
    return null;
  }

  if (!DATE_ONLY_PATTERN.test(value)) {
    throw new Error(`${label} date must use YYYY-MM-DD.`);
  }

  return value;
}

function resolveAccountWorkoutExportDateFilters(options: Pick<AccountWorkoutExportOptions, "dateFrom" | "dateTo">) {
  const dateFrom = resolveValidatedDateOnly("From", options.dateFrom);
  const dateTo = resolveValidatedDateOnly("To", options.dateTo);

  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new Error("From date must be on or before To date.");
  }

  return {
    dateFrom,
    dateTo,
    dateFromBoundary: dateFrom ? `${dateFrom}T00:00:00.000Z` : null,
    dateToBoundary: dateTo ? `${dateTo}T23:59:59.999Z` : null,
  };
}

export function sanitizeAccountWorkoutExportName(value: string | null | undefined) {
  const normalized = typeof value === "string" ? value.trim() : "";
  const safe = normalized
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return safe || `fitness-export-${new Date().toISOString().slice(0, 10)}`;
}

export function buildAccountWorkoutExportFilename(options: {
  exportName?: string | null;
  fileType: AccountWorkoutExportFileType;
}) {
  const basename = sanitizeAccountWorkoutExportName(options.exportName);
  return `${basename}.${options.fileType}`;
}

export function getAccountWorkoutExportContentType(fileType: AccountWorkoutExportFileType) {
  if (fileType === "csv") {
    return "text/csv; charset=utf-8";
  }

  if (fileType === "xlsx") {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }

  return "application/json; charset=utf-8";
}

export function resolveAccountWorkoutExportSuggestedDateRange(args: {
  today: string;
  oldestSessionPerformedAt?: string | null;
  oldestRoutineStartDate?: string | null;
}): AccountWorkoutExportSuggestedDateRange {
  const today = normalizeDateOnly(args.today) ?? new Date().toISOString().slice(0, 10);
  const oldestCandidates = [
    normalizeDateOnly(args.oldestSessionPerformedAt),
    normalizeDateOnly(args.oldestRoutineStartDate),
  ].filter((value): value is string => Boolean(value));
  const dateFrom = oldestCandidates.sort((left, right) => left.localeCompare(right))[0] ?? today;

  return {
    dateFrom,
    dateTo: today,
  };
}

export async function getAccountWorkoutExportSuggestedDateRange(args: {
  supabase: any;
  userId: string;
  today?: string;
}): Promise<AccountWorkoutExportSuggestedDateRange> {
  const { supabase, userId } = args;
  const today = normalizeDateOnly(args.today) ?? new Date().toISOString().slice(0, 10);

  const oldestSessionRows = ensureQueryRows(
    await supabase
      .from("sessions")
      .select("performed_at")
      .eq("user_id", userId)
      .order("performed_at", { ascending: true }),
    "sessions",
  ) as Array<{ performed_at?: string | null }>;
  const oldestSessionPerformedAt = oldestSessionRows[0]?.performed_at ?? null;

  const oldestRoutineRows = ensureQueryRows(
    await supabase
      .from("routines")
      .select("start_date")
      .eq("user_id", userId)
      .order("start_date", { ascending: true }),
    "routines",
  ) as Array<{ start_date?: string | null }>;
  const oldestRoutineStartDate = oldestRoutineRows[0]?.start_date ?? null;

  return resolveAccountWorkoutExportSuggestedDateRange({
    today,
    oldestSessionPerformedAt,
    oldestRoutineStartDate,
  });
}

export function buildAccountWorkoutExportCsvRows(payload: AccountWorkoutExportPayload): AccountWorkoutExportCsvRow[] {
  const routineNameById = new Map(payload.routines.map((routine) => [routine.id, routine.name] as const));
  const exerciseNameById = new Map(payload.exercises.map((exercise) => [exercise.id, exercise.name] as const));
  const sessionExercisesBySessionId = new Map<string, AccountWorkoutExportSessionExerciseRow[]>();
  const setsBySessionExerciseId = new Map<string, SetRow[]>();

  for (const sessionExercise of payload.sessionExercises) {
    const current = sessionExercisesBySessionId.get(sessionExercise.session_id) ?? [];
    current.push(sessionExercise);
    sessionExercisesBySessionId.set(sessionExercise.session_id, current);
  }

  for (const set of payload.sets) {
    const current = setsBySessionExerciseId.get(set.session_exercise_id) ?? [];
    current.push(set);
    setsBySessionExerciseId.set(set.session_exercise_id, current);
  }

  const buildBaseRow = (
    session: SessionRow,
    sessionExercise: AccountWorkoutExportSessionExerciseRow | null,
  ): Omit<
    AccountWorkoutExportCsvRow,
    | "set_id"
    | "client_log_id"
    | "set_index"
    | "reps"
    | "weight"
    | "weight_unit"
    | "duration_seconds"
    | "distance"
    | "distance_unit"
    | "calories"
    | "rpe"
    | "is_warmup"
    | "set_notes"
  > => ({
    session_id: session.id,
    performed_at: session.performed_at,
    session_status: session.status,
    session_duration_seconds: session.duration_seconds ?? null,
    routine_id: session.routine_id ?? null,
    routine_name: session.routine_id
      ? (routineNameById.get(session.routine_id) ?? session.name ?? null)
      : (session.name ?? null),
    routine_day_index: session.routine_day_index ?? null,
    routine_day_name: session.day_name_override ?? session.routine_day_name ?? null,
    session_exercise_id: sessionExercise?.id ?? null,
    routine_day_exercise_id: sessionExercise?.routine_day_exercise_id ?? null,
    session_exercise_position: sessionExercise?.position ?? null,
    session_exercise_performed_index: sessionExercise?.performed_index ?? null,
    session_exercise_is_skipped: sessionExercise?.is_skipped ?? null,
    session_exercise_measurement_type: sessionExercise?.measurement_type ?? null,
    session_exercise_default_unit: sessionExercise?.default_unit ?? null,
    exercise_id: sessionExercise?.exercise_id ?? null,
    exercise_name: sessionExercise ? (exerciseNameById.get(sessionExercise.exercise_id) ?? null) : null,
    target_sets_min: sessionExercise?.target_sets_min ?? null,
    target_sets_max: sessionExercise?.target_sets_max ?? null,
    target_reps: sessionExercise?.target_reps ?? null,
    target_reps_min: sessionExercise?.target_reps_min ?? null,
    target_reps_max: sessionExercise?.target_reps_max ?? null,
    target_weight: sessionExercise?.target_weight ?? null,
    target_weight_min: sessionExercise?.target_weight_min ?? null,
    target_weight_max: sessionExercise?.target_weight_max ?? null,
    target_weight_unit: sessionExercise?.target_weight_unit ?? null,
    target_duration_seconds: sessionExercise?.target_duration_seconds ?? null,
    target_time_seconds_min: sessionExercise?.target_time_seconds_min ?? null,
    target_time_seconds_max: sessionExercise?.target_time_seconds_max ?? null,
    target_distance: sessionExercise?.target_distance ?? null,
    target_distance_min: sessionExercise?.target_distance_min ?? null,
    target_distance_max: sessionExercise?.target_distance_max ?? null,
    target_distance_unit: sessionExercise?.target_distance_unit ?? null,
    target_calories: sessionExercise?.target_calories ?? null,
    target_calories_min: sessionExercise?.target_calories_min ?? null,
    target_calories_max: sessionExercise?.target_calories_max ?? null,
    session_notes: session.notes ?? null,
    session_exercise_notes: sessionExercise?.notes ?? null,
  });

  return payload.sessions.flatMap((session) => {
    const sessionExercises = sessionExercisesBySessionId.get(session.id) ?? [];
    if (sessionExercises.length === 0) {
      return [{
        ...buildBaseRow(session, null),
        set_id: null,
        client_log_id: null,
        set_index: null,
        reps: null,
        weight: null,
        weight_unit: null,
        duration_seconds: null,
        distance: null,
        distance_unit: null,
        calories: null,
        rpe: null,
        is_warmup: null,
        set_notes: null,
      } satisfies AccountWorkoutExportCsvRow];
    }

    return sessionExercises.flatMap((sessionExercise): AccountWorkoutExportCsvRow[] => {
      const setRows = setsBySessionExerciseId.get(sessionExercise.id) ?? [];
      if (setRows.length === 0) {
        return [{
          ...buildBaseRow(session, sessionExercise),
          set_id: null,
          client_log_id: null,
          set_index: null,
          reps: null,
          weight: null,
          weight_unit: null,
          duration_seconds: null,
          distance: null,
          distance_unit: null,
          calories: null,
          rpe: null,
          is_warmup: null,
          set_notes: null,
        } satisfies AccountWorkoutExportCsvRow];
      }

      return setRows.map((set): AccountWorkoutExportCsvRow => ({
        ...buildBaseRow(session, sessionExercise),
        set_id: set.id,
        client_log_id: set.client_log_id ?? null,
        set_index: set.set_index,
        reps: set.reps ?? null,
        weight: set.weight ?? null,
        weight_unit: set.weight_unit ?? null,
        duration_seconds: set.duration_seconds ?? null,
        distance: set.distance ?? null,
        distance_unit: set.distance_unit ?? null,
        calories: set.calories ?? null,
        rpe: set.rpe ?? null,
        is_warmup: set.is_warmup,
        set_notes: set.notes ?? null,
      }));
    });
  });
}

export function serializeAccountWorkoutExportCsv(rows: AccountWorkoutExportCsvRow[]) {
  const lines = [
    ACCOUNT_WORKOUT_EXPORT_CSV_HEADERS.join(","),
    ...rows.map((row) =>
      ACCOUNT_WORKOUT_EXPORT_CSV_HEADERS
        .map((header) => escapeCsvValue(row[header]))
        .join(",")),
  ];

  return `${lines.join("\n")}\n`;
}

function buildWorkbookSheetRows(payload: AccountWorkoutExportPayload): AccountWorkoutExportWorkbookSheet[] {
  const routineNameById = new Map(payload.routines.map((routine) => [routine.id, routine.name] as const));
  const routineDayById = new Map(payload.routineDays.map((day) => [day.id, day] as const));
  const routineDayExerciseById = new Map(payload.routineDayExercises.map((exercise) => [exercise.id, exercise] as const));
  const exerciseNameById = new Map(payload.exercises.map((exercise) => [exercise.id, exercise.name] as const));

  const metadataRows: WorkbookSheetRow[] = [{
    snapshot_version: payload.metadata.snapshotVersion,
    source_app: payload.metadata.sourceApp,
    source_backend: payload.metadata.sourceBackend,
    exported_at: payload.metadata.exportedAt,
    scope: payload.metadata.scope,
    date_from: payload.metadata.dateFrom,
    date_to: payload.metadata.dateTo,
    active_routine_id: payload.metadata.activeRoutineId,
    canonical_tables: payload.metadata.canonicalTables.join(","),
    excluded_tables: payload.metadata.excludedTables.join(","),
    profile_count: payload.metadata.counts.profile,
    sessions_count: payload.metadata.counts.sessions,
    completed_sessions_count: payload.metadata.counts.completedSessions,
    session_exercises_count: payload.metadata.counts.sessionExercises,
    sets_count: payload.metadata.counts.sets,
    routines_count: payload.metadata.counts.routines,
    routine_days_count: payload.metadata.counts.routineDays,
    routine_day_exercises_count: payload.metadata.counts.routineDayExercises,
    exercises_count: payload.metadata.counts.exercises,
    global_exercises_count: payload.metadata.counts.globalExercises,
    user_owned_exercises_count: payload.metadata.counts.userOwnedExercises,
  }];

  const profileRows = payload.profile
    ? [Object.fromEntries(
      Object.entries(payload.profile).map(([key, value]) => [key, serializeWorkbookValue(value)]),
    )]
    : [];

  const sessionRows = payload.sessions.map((session) => ({
    id: session.id,
    user_id: session.user_id,
    performed_at: session.performed_at,
    status: session.status,
    duration_seconds: session.duration_seconds,
    routine_id: session.routine_id,
    routine_name: session.routine_id ? (routineNameById.get(session.routine_id) ?? session.name) : session.name,
    routine_day_index: session.routine_day_index,
    routine_day_name: session.routine_day_name,
    day_name_override: session.day_name_override,
    name: session.name,
    notes: session.notes,
  }));
  const completedSessionRows = sessionRows.filter((session) => session.status === "completed");
  const sessionExerciseRows = payload.sessionExercises.map((sessionExercise) => {
    const routineDayExercise = sessionExercise.routine_day_exercise_id
      ? (routineDayExerciseById.get(sessionExercise.routine_day_exercise_id) ?? null)
      : null;

    return {
      id: sessionExercise.id,
      session_id: sessionExercise.session_id,
      user_id: sessionExercise.user_id,
      exercise_id: sessionExercise.exercise_id,
      exercise_name: exerciseNameById.get(sessionExercise.exercise_id) ?? null,
      routine_day_exercise_id: sessionExercise.routine_day_exercise_id ?? null,
      routine_day_id: routineDayExercise?.routine_day_id ?? null,
      position: sessionExercise.position,
      performed_index: sessionExercise.performed_index ?? null,
      is_skipped: sessionExercise.is_skipped,
      measurement_type: sessionExercise.measurement_type ?? null,
      default_unit: sessionExercise.default_unit ?? null,
      target_reps: sessionExercise.target_reps ?? null,
      target_reps_min: sessionExercise.target_reps_min ?? null,
      target_reps_max: sessionExercise.target_reps_max ?? null,
      target_sets_min: sessionExercise.target_sets_min ?? null,
      target_sets_max: sessionExercise.target_sets_max ?? null,
      target_weight: sessionExercise.target_weight ?? null,
      target_weight_min: sessionExercise.target_weight_min ?? null,
      target_weight_max: sessionExercise.target_weight_max ?? null,
      target_weight_unit: sessionExercise.target_weight_unit ?? null,
      target_duration_seconds: sessionExercise.target_duration_seconds ?? null,
      target_time_seconds_min: sessionExercise.target_time_seconds_min ?? null,
      target_time_seconds_max: sessionExercise.target_time_seconds_max ?? null,
      target_distance: sessionExercise.target_distance ?? null,
      target_distance_min: sessionExercise.target_distance_min ?? null,
      target_distance_max: sessionExercise.target_distance_max ?? null,
      target_distance_unit: sessionExercise.target_distance_unit ?? null,
      target_calories: sessionExercise.target_calories ?? null,
      target_calories_min: sessionExercise.target_calories_min ?? null,
      target_calories_max: sessionExercise.target_calories_max ?? null,
      notes: sessionExercise.notes ?? null,
    };
  });
  const setRows = payload.sets.map((set) => ({
    id: set.id,
    client_log_id: set.client_log_id ?? null,
    session_exercise_id: set.session_exercise_id,
    user_id: set.user_id,
    set_index: set.set_index,
    weight: set.weight,
    reps: set.reps,
    weight_unit: set.weight_unit ?? null,
    duration_seconds: set.duration_seconds ?? null,
    distance: set.distance ?? null,
    distance_unit: set.distance_unit ?? null,
    calories: set.calories ?? null,
    rpe: set.rpe ?? null,
    is_warmup: set.is_warmup,
    notes: set.notes ?? null,
  }));
  const exerciseRows = payload.exercises.map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
    user_id: exercise.user_id,
    is_global: exercise.is_global,
    primary_muscle: exercise.primary_muscle,
    primary_muscles: serializeWorkbookValue(exercise.primary_muscles ?? null),
    secondary_muscles: serializeWorkbookValue(exercise.secondary_muscles ?? null),
    equipment: exercise.equipment,
    movement_pattern: exercise.movement_pattern,
    measurement_type: exercise.measurement_type,
    default_unit: exercise.default_unit,
    calories_estimation_method: exercise.calories_estimation_method,
    image_path: exercise.image_path ?? null,
    image_icon_path: exercise.image_icon_path ?? null,
    image_howto_path: exercise.image_howto_path,
    image_muscles_path: exercise.image_muscles_path ?? null,
    slug: exercise.slug ?? null,
    kind: exercise.kind ?? null,
    type: exercise.type ?? null,
    tags: serializeWorkbookValue(exercise.tags ?? null),
    categories: serializeWorkbookValue(exercise.categories ?? null),
    how_to_short: exercise.how_to_short,
    curation_tags: serializeWorkbookValue(exercise.curation_tags ?? null),
    created_at: exercise.created_at,
  }));
  const routineRows = payload.routines.map((routine) => ({
    id: routine.id,
    user_id: routine.user_id,
    name: routine.name,
    cycle_length_days: routine.cycle_length_days,
    start_date: routine.start_date,
    timezone: routine.timezone,
    progression_mode: routine.progression_mode,
    temperament: routine.temperament,
    weight_unit: routine.weight_unit,
    default_progression_playbook_id: routine.default_progression_playbook_id ?? null,
    default_progression_playbook_config: serializeWorkbookValue(routine.default_progression_playbook_config ?? null),
    created_at: routine.created_at,
    updated_at: routine.updated_at,
  }));
  const routineDayRows = payload.routineDays.map((day) => ({
    id: day.id,
    user_id: day.user_id,
    routine_id: day.routine_id,
    routine_name: routineNameById.get(day.routine_id) ?? null,
    day_index: day.day_index,
    name: day.name,
    is_rest: day.is_rest,
    notes: day.notes,
    created_at: day.created_at,
  }));
  const routineDayExerciseRows = payload.routineDayExercises.map((exercise) => {
    const routineDay = routineDayById.get(exercise.routine_day_id) ?? null;
    return {
      id: exercise.id,
      user_id: exercise.user_id,
      routine_day_id: exercise.routine_day_id,
      routine_id: routineDay?.routine_id ?? null,
      routine_name: routineDay ? (routineNameById.get(routineDay.routine_id) ?? null) : null,
      routine_day_name: routineDay?.name ?? null,
      routine_day_index: routineDay?.day_index ?? null,
      exercise_id: exercise.exercise_id,
      exercise_name: exerciseNameById.get(exercise.exercise_id) ?? null,
      position: exercise.position,
      measurement_type: exercise.measurement_type ?? null,
      default_unit: exercise.default_unit ?? null,
      target_sets: exercise.target_sets ?? null,
      target_reps: exercise.target_reps ?? null,
      target_reps_min: exercise.target_reps_min ?? null,
      target_reps_max: exercise.target_reps_max ?? null,
      target_weight: exercise.target_weight ?? null,
      target_weight_unit: exercise.target_weight_unit ?? null,
      target_duration_seconds: exercise.target_duration_seconds ?? null,
      target_distance: exercise.target_distance ?? null,
      target_distance_unit: exercise.target_distance_unit ?? null,
      target_calories: exercise.target_calories ?? null,
      progression_playbook_id: exercise.progression_playbook_id ?? null,
      progression_playbook_config: serializeWorkbookValue(exercise.progression_playbook_config ?? null),
      notes: exercise.notes ?? null,
      created_at: exercise.created_at,
    };
  });
  const progressionSummaryRows = payload.routineDayExercises
    .filter((exercise) => Boolean(exercise.progression_playbook_id || exercise.progression_playbook_config))
    .map((exercise) => {
      const routineDay = routineDayById.get(exercise.routine_day_id) ?? null;
      return {
        routine_id: routineDay?.routine_id ?? null,
        routine_name: routineDay ? (routineNameById.get(routineDay.routine_id) ?? null) : null,
        routine_day_id: exercise.routine_day_id,
        routine_day_name: routineDay?.name ?? null,
        routine_day_index: routineDay?.day_index ?? null,
        routine_day_exercise_id: exercise.id,
        exercise_id: exercise.exercise_id,
        exercise_name: exerciseNameById.get(exercise.exercise_id) ?? null,
        measurement_type: exercise.measurement_type ?? null,
        target_sets: exercise.target_sets ?? null,
        target_reps: exercise.target_reps ?? null,
        target_reps_min: exercise.target_reps_min ?? null,
        target_reps_max: exercise.target_reps_max ?? null,
        target_weight: exercise.target_weight ?? null,
        target_weight_unit: exercise.target_weight_unit ?? null,
        target_duration_seconds: exercise.target_duration_seconds ?? null,
        target_distance: exercise.target_distance ?? null,
        target_distance_unit: exercise.target_distance_unit ?? null,
        target_calories: exercise.target_calories ?? null,
        progression_playbook_id: exercise.progression_playbook_id ?? null,
        progression_playbook_config: serializeWorkbookValue(exercise.progression_playbook_config ?? null),
      };
    });

  const toHeaders = (rows: WorkbookSheetRow[], fallbackHeaders: string[] = []) => {
    const discovered = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
    return discovered.length > 0 ? discovered : fallbackHeaders;
  };

  return [
    {
      name: "Metadata",
      rows: metadataRows,
      headers: toHeaders(metadataRows, [
        "snapshot_version",
        "source_app",
        "source_backend",
        "exported_at",
        "scope",
        "date_from",
        "date_to",
        "active_routine_id",
      ]),
    },
    {
      name: "Profile",
      rows: profileRows,
      headers: toHeaders(profileRows, [
        "id",
        "timezone",
        "active_routine_id",
        "preferred_weight_unit",
        "preferred_distance_unit",
        "show_qa_llel_data",
        "user_number",
        "user_kind",
        "user_number_assigned_at",
        "created_at",
        "updated_at",
      ]),
    },
    { name: "Sessions", rows: sessionRows, headers: toHeaders(sessionRows) },
    { name: "Completed Sessions", rows: completedSessionRows, headers: toHeaders(sessionRows) },
    { name: "Session Exercises", rows: sessionExerciseRows, headers: toHeaders(sessionExerciseRows) },
    { name: "Sets", rows: setRows, headers: toHeaders(setRows) },
    { name: "Exercises", rows: exerciseRows, headers: toHeaders(exerciseRows) },
    { name: "Routines", rows: routineRows, headers: toHeaders(routineRows) },
    { name: "Routine Days", rows: routineDayRows, headers: toHeaders(routineDayRows) },
    { name: "Routine Day Exercises", rows: routineDayExerciseRows, headers: toHeaders(routineDayExerciseRows) },
    { name: "Progression Summary", rows: progressionSummaryRows, headers: toHeaders(progressionSummaryRows) },
  ];
}

export function buildAccountWorkoutExportWorkbookBuffer(payload: AccountWorkoutExportPayload) {
  const workbook = XLSX.utils.book_new();

  for (const sheet of buildWorkbookSheetRows(payload)) {
    const worksheet = sheet.rows.length > 0
      ? XLSX.utils.json_to_sheet(sheet.rows, { header: sheet.headers })
      : XLSX.utils.aoa_to_sheet([sheet.headers]);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  }

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

export async function buildAccountWorkoutExportPayload(args: {
  supabase: any;
  userId: string;
  options: AccountWorkoutExportOptions;
}): Promise<AccountWorkoutExportPayload> {
  const { supabase, userId, options } = args;
  const completedOnly = options.scope === "completed_only";
  const currentRoutineOnly = options.scope === "current_routine";
  const { dateFrom, dateTo, dateFromBoundary, dateToBoundary } = resolveAccountWorkoutExportDateFilters(options);

  const profile = ensureMaybeSingle(
    await supabase
      .from("profiles")
      .select("id, timezone, active_routine_id, preferred_weight_unit, preferred_distance_unit, show_qa_llel_data, user_number, user_kind, user_number_assigned_at, created_at, updated_at")
      .eq("id", userId)
      .maybeSingle(),
    "profiles",
  ) as AccountWorkoutExportProfileRow | null;

  if (currentRoutineOnly && !profile?.active_routine_id) {
    throw new Error("No active routine is set for this account.");
  }

  const currentRoutineId = currentRoutineOnly ? (profile?.active_routine_id ?? null) : null;

  let routinesQuery = supabase
    .from("routines")
    .select("id, user_id, name, cycle_length_days, start_date, timezone, progression_mode, temperament, created_at, updated_at, weight_unit, default_progression_playbook_id, default_progression_playbook_config")
    .eq("user_id", userId);
  if (currentRoutineId) {
    routinesQuery = routinesQuery.eq("id", currentRoutineId);
  }
  const routines = ensureQueryRows(await routinesQuery, "routines") as AccountWorkoutExportRoutineRow[];
  routines.sort((left, right) =>
    compareNullableStrings(left.created_at, right.created_at)
    || compareNullableStrings(left.updated_at, right.updated_at)
    || left.name.localeCompare(right.name)
    || left.id.localeCompare(right.id));
  const routineIds = routines.map((routine) => routine.id);

  const routineDays = (
    routineIds.length > 0
      ? ensureQueryRows(
        await supabase
          .from("routine_days")
          .select("id, user_id, routine_id, day_index, name, is_rest, notes, created_at")
          .in("routine_id", routineIds)
          .eq("user_id", userId),
        "routine_days",
      )
      : []
  ) as AccountWorkoutExportRoutineDayRow[];
  routineDays.sort((left, right) =>
    left.routine_id.localeCompare(right.routine_id)
    || compareNullableNumbers(left.day_index, right.day_index)
    || left.id.localeCompare(right.id));
  const routineDayIds = routineDays.map((day) => day.id);

  const routineDayExercises = (
    routineDayIds.length > 0
      ? ensureQueryRows(
        await supabase
          .from("routine_day_exercises")
          .select("id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, progression_playbook_id, progression_playbook_config, measurement_type, default_unit, notes, created_at")
          .in("routine_day_id", routineDayIds)
          .eq("user_id", userId),
        "routine_day_exercises",
      )
      : []
  ) as AccountWorkoutExportRoutineDayExerciseRow[];
  routineDayExercises.sort((left, right) =>
    left.routine_day_id.localeCompare(right.routine_day_id)
    || compareNullableNumbers(left.position, right.position)
    || left.id.localeCompare(right.id));

  let sessionsQuery = supabase
    .from("sessions")
    .select("id, user_id, performed_at, notes, routine_id, routine_day_index, name, routine_day_name, day_name_override, duration_seconds, status")
    .eq("user_id", userId);
  if (completedOnly) {
    sessionsQuery = sessionsQuery.eq("status", "completed");
  }
  if (currentRoutineId) {
    sessionsQuery = sessionsQuery.eq("routine_id", currentRoutineId);
  }
  if (dateFromBoundary) {
    sessionsQuery = sessionsQuery.gte("performed_at", dateFromBoundary);
  }
  if (dateToBoundary) {
    sessionsQuery = sessionsQuery.lte("performed_at", dateToBoundary);
  }
  const sessions = ensureQueryRows(await sessionsQuery, "sessions") as SessionRow[];
  sessions.sort((left, right) =>
    compareNullableStrings(left.performed_at, right.performed_at)
    || left.id.localeCompare(right.id));
  const sessionIds = sessions.map((session) => session.id);

  const sessionExercises = (
    sessionIds.length > 0
      ? ensureQueryRows(
        await supabase
          .from("session_exercises")
          .select("id, session_id, user_id, exercise_id, routine_day_exercise_id, position, performed_index, notes, is_skipped, measurement_type, default_unit, target_reps, target_reps_min, target_reps_max, target_sets_min, target_sets_max, target_weight, target_weight_min, target_weight_max, target_weight_unit, target_duration_seconds, target_time_seconds_min, target_time_seconds_max, target_distance, target_distance_min, target_distance_max, target_distance_unit, target_calories, target_calories_min, target_calories_max")
          .in("session_id", sessionIds)
          .eq("user_id", userId),
        "session_exercises",
      )
      : []
  ) as AccountWorkoutExportSessionExerciseRow[];
  sessionExercises.sort((left, right) =>
    left.session_id.localeCompare(right.session_id)
    || compareNullableNumbers(left.position, right.position)
    || compareNullableNumbers(left.performed_index, right.performed_index)
    || left.id.localeCompare(right.id));
  const sessionExerciseIds = sessionExercises.map((row) => row.id);

  const sets = (
    sessionExerciseIds.length > 0
      ? ensureQueryRows(
        await supabase
          .from("sets")
          .select("id, client_log_id, session_exercise_id, user_id, set_index, weight, reps, is_warmup, notes, duration_seconds, distance, distance_unit, calories, rpe, weight_unit")
          .in("session_exercise_id", sessionExerciseIds)
          .eq("user_id", userId),
        "sets",
      )
      : []
  ) as SetRow[];
  sets.sort((left, right) =>
    left.session_exercise_id.localeCompare(right.session_exercise_id)
    || compareNullableNumbers(left.set_index, right.set_index)
    || left.id.localeCompare(right.id));

  const referencedExerciseIds = Array.from(new Set(
    [...routineDayExercises.map((row) => row.exercise_id), ...sessionExercises.map((row) => row.exercise_id)]
      .filter((exerciseId): exerciseId is string => Boolean(exerciseId)),
  ));
  const exercises = (
    referencedExerciseIds.length > 0
      ? ensureQueryRows(
        await supabase
          .from("exercises")
          .select("id, name, user_id, is_global, primary_muscle, primary_muscles, secondary_muscles, equipment, movement_pattern, measurement_type, default_unit, calories_estimation_method, image_path, image_icon_path, image_howto_path, image_muscles_path, slug, kind, type, tags, categories, how_to_short, curation_tags, created_at")
          .in("id", referencedExerciseIds),
        "exercises",
      )
      : []
  ) as AccountWorkoutExportExerciseRow[];
  exercises.sort((left, right) =>
    left.name.localeCompare(right.name)
    || left.id.localeCompare(right.id));

  return {
    metadata: {
      snapshotVersion: ACCOUNT_WORKOUT_EXPORT_SNAPSHOT_VERSION,
      sourceApp: "fawxzzy-fitness",
      sourceBackend: "primary-supabase",
      exportedAt: new Date().toISOString(),
      scope: options.scope,
      dateFrom,
      dateTo,
      activeRoutineId: profile?.active_routine_id ?? null,
      canonicalTables: ACCOUNT_WORKOUT_EXPORT_CANONICAL_TABLES,
      excludedTables: ACCOUNT_WORKOUT_EXPORT_EXCLUDED_TABLES,
      counts: {
        profile: profile ? 1 : 0,
        sessions: sessions.length,
        completedSessions: sessions.filter((session) => session.status === "completed").length,
        sessionExercises: sessionExercises.length,
        sets: sets.length,
        routines: routines.length,
        routineDays: routineDays.length,
        routineDayExercises: routineDayExercises.length,
        exercises: exercises.length,
        globalExercises: exercises.filter((exercise) => exercise.is_global).length,
        userOwnedExercises: exercises.filter((exercise) => !exercise.is_global).length,
      },
    },
    profile,
    sessions,
    sessionExercises,
    sets,
    routines,
    routineDays,
    routineDayExercises,
    exercises,
  };
}
