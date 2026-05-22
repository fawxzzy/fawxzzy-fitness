import "server-only";

import * as XLSX from "xlsx";
import type { ProfileRow, ProgressionEventRow, RoutineDayExerciseRow, RoutineDayRow, RoutineRow, SessionExerciseRow, SessionRow, SetRow } from "@/types/db";

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

export type AccountWorkoutExportPayload = {
  metadata: {
    exportedAt: string;
    scope: AccountWorkoutExportScope;
    dateFrom: string | null;
    dateTo: string | null;
    counts: {
      sessions: number;
      completedSessions: number;
      sessionExercises: number;
      sets: number;
      routines: number;
      routineDays: number;
      routineDayExercises: number;
      exercises: number;
      progressionEvents: number;
    };
  };
  profile: ProfileRow | null;
  sessions: SessionRow[];
  sessionExercises: SessionExerciseRow[];
  sets: SetRow[];
  routines: RoutineRow[];
  routineDays: RoutineDayRow[];
  routineDayExercises: RoutineDayExerciseRow[];
  progressionEvents: ProgressionEventRow[];
  exercises: Array<{
    id: string;
    name: string;
    user_id: string | null;
    is_global: boolean;
    primary_muscle: string | null;
    equipment: string | null;
    movement_pattern: string | null;
    measurement_type: "reps" | "time" | "distance" | "time_distance";
    default_unit: string | null;
    calories_estimation_method: string | null;
    image_path?: string | null;
    image_icon_path?: string | null;
    image_howto_path: string | null;
    slug?: string | null;
    how_to_short: string | null;
    curation_tags?: Record<string, string[]> | null;
    created_at: string;
  }>;
};

export type AccountWorkoutExportCsvRow = {
  session_id: string;
  performed_at: string;
  session_status: string;
  routine_id: string | null;
  routine_name: string | null;
  routine_day_index: number | null;
  routine_day_name: string | null;
  session_exercise_id: string | null;
  exercise_id: string | null;
  exercise_name: string | null;
  set_index: number | null;
  reps: number | null;
  weight: number | null;
  weight_unit: string | null;
  duration_seconds: number | null;
  distance: number | null;
  distance_unit: string | null;
  calories: number | null;
  is_warmup: boolean | null;
  session_notes: string | null;
  set_notes: string | null;
};

export type AccountWorkoutExportProgressionEventCsvRow = {
  event_id: string;
  created_at: string;
  event_type: string;
  routine_id: string;
  routine_name: string | null;
  routine_day_exercise_id: string;
  exercise_id: string;
  exercise_name: string | null;
  source_session_id: string | null;
  method: string;
  vector: string;
  step: string | null;
  reason: string;
  from_target_json: string;
  to_target_json: string;
};

type WorkbookSheetRow = Record<string, string | number | boolean | null>;
export type AccountWorkoutExportWorkbookSheetName =
  | "Sessions"
  | "Completed Sessions"
  | "Session Exercises"
  | "Sets"
  | "Exercises"
  | "Routines"
  | "Routine Days"
  | "Routine Day Exercises"
  | "Progression Events"
  | "Progression Summary";

export type AccountWorkoutExportWorkbookSheet = {
  name:
    | AccountWorkoutExportWorkbookSheetName;
  headers: string[];
  rows: WorkbookSheetRow[];
};

type AccountWorkoutExportCsvTable =
  | {
      name: "workout_log";
      headers: Array<keyof AccountWorkoutExportCsvRow>;
      rows: AccountWorkoutExportCsvRow[];
    }
  | {
      name: "progression_events";
      headers: Array<keyof AccountWorkoutExportProgressionEventCsvRow>;
      rows: AccountWorkoutExportProgressionEventCsvRow[];
    };

export const ACCOUNT_WORKOUT_EXPORT_JSON_TABLE_NAMES = [
  "profile",
  "sessions",
  "sessionExercises",
  "sets",
  "exercises",
  "routines",
  "routineDays",
  "routineDayExercises",
  "progressionEvents",
] as const;

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
  const extension = options.fileType;
  return `${basename}.${extension}`;
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

function normalizeDateBoundaryStart(value: string | null | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : null;
}

function normalizeDateBoundaryEnd(value: string | null | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.999Z` : null;
}

function normalizeDateOnly(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
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

  const { data: oldestSessionRows } = await supabase
    .from("sessions")
    .select("performed_at")
    .eq("user_id", userId)
    .order("performed_at", { ascending: true });
  const oldestSessionPerformedAt = Array.isArray(oldestSessionRows)
    ? (oldestSessionRows[0]?.performed_at as string | undefined) ?? null
    : null;

  const { data: oldestRoutineRows } = await supabase
    .from("routines")
    .select("start_date")
    .eq("user_id", userId)
    .order("start_date", { ascending: true });
  const oldestRoutineStartDate = Array.isArray(oldestRoutineRows)
    ? (oldestRoutineRows[0]?.start_date as string | undefined) ?? null
    : null;

  return resolveAccountWorkoutExportSuggestedDateRange({
    today,
    oldestSessionPerformedAt,
    oldestRoutineStartDate,
  });
}

export function buildAccountWorkoutExportCsvRows(payload: AccountWorkoutExportPayload): AccountWorkoutExportCsvRow[] {
  const routineNameById = new Map(payload.routines.map((routine) => [routine.id, routine.name] as const));
  const exerciseNameById = new Map(payload.exercises.map((exercise) => [exercise.id, exercise.name] as const));
  const sessionExerciseBySessionId = new Map<string, SessionExerciseRow[]>();
  const setsBySessionExerciseId = new Map<string, SetRow[]>();

  for (const sessionExercise of payload.sessionExercises) {
    const current = sessionExerciseBySessionId.get(sessionExercise.session_id) ?? [];
    current.push(sessionExercise);
    sessionExerciseBySessionId.set(sessionExercise.session_id, current);
  }

  for (const set of payload.sets) {
    const current = setsBySessionExerciseId.get(set.session_exercise_id) ?? [];
    current.push(set);
    setsBySessionExerciseId.set(set.session_exercise_id, current);
  }

  return payload.sessions.flatMap((session) => {
    const sessionExercises = sessionExerciseBySessionId.get(session.id) ?? [];
    if (sessionExercises.length === 0) {
      return [{
        session_id: session.id,
        performed_at: session.performed_at,
        session_status: session.status,
        routine_id: session.routine_id ?? null,
        routine_name: session.routine_id ? (routineNameById.get(session.routine_id) ?? session.name ?? null) : (session.name ?? null),
        routine_day_index: session.routine_day_index ?? null,
        routine_day_name: session.day_name_override ?? session.routine_day_name ?? null,
        session_exercise_id: null,
        exercise_id: null,
        exercise_name: null,
        set_index: null,
        reps: null,
        weight: null,
        weight_unit: null,
        duration_seconds: null,
        distance: null,
        distance_unit: null,
        calories: null,
        is_warmup: null,
        session_notes: session.notes ?? null,
        set_notes: null,
      } satisfies AccountWorkoutExportCsvRow];
    }

    return sessionExercises.flatMap((sessionExercise): AccountWorkoutExportCsvRow[] => {
      const setRows = setsBySessionExerciseId.get(sessionExercise.id) ?? [];
      if (setRows.length === 0) {
        return [{
          session_id: session.id,
          performed_at: session.performed_at,
          session_status: session.status,
          routine_id: session.routine_id ?? null,
          routine_name: session.routine_id ? (routineNameById.get(session.routine_id) ?? session.name ?? null) : (session.name ?? null),
          routine_day_index: session.routine_day_index ?? null,
          routine_day_name: session.day_name_override ?? session.routine_day_name ?? null,
          session_exercise_id: sessionExercise.id,
          exercise_id: sessionExercise.exercise_id,
          exercise_name: exerciseNameById.get(sessionExercise.exercise_id) ?? null,
          set_index: null,
          reps: null,
          weight: null,
          weight_unit: null,
          duration_seconds: null,
          distance: null,
          distance_unit: null,
          calories: null,
          is_warmup: null,
          session_notes: session.notes ?? null,
          set_notes: null,
        } satisfies AccountWorkoutExportCsvRow];
      }

      return setRows.map((set): AccountWorkoutExportCsvRow => ({
        session_id: session.id,
        performed_at: session.performed_at,
        session_status: session.status,
        routine_id: session.routine_id ?? null,
        routine_name: session.routine_id ? (routineNameById.get(session.routine_id) ?? session.name ?? null) : (session.name ?? null),
        routine_day_index: session.routine_day_index ?? null,
        routine_day_name: session.day_name_override ?? session.routine_day_name ?? null,
        session_exercise_id: sessionExercise.id,
        exercise_id: sessionExercise.exercise_id,
        exercise_name: exerciseNameById.get(sessionExercise.exercise_id) ?? null,
        set_index: set.set_index,
        reps: set.reps ?? null,
        weight: set.weight ?? null,
        weight_unit: set.weight_unit ?? null,
        duration_seconds: set.duration_seconds ?? null,
        distance: set.distance ?? null,
        distance_unit: set.distance_unit ?? null,
        calories: set.calories ?? null,
        is_warmup: set.is_warmup,
        session_notes: session.notes ?? null,
        set_notes: set.notes ?? null,
      } satisfies AccountWorkoutExportCsvRow));
    });
  });
}

function getAccountWorkoutExportCsvHeaders() {
  return [
    "session_id",
    "performed_at",
    "session_status",
    "routine_id",
    "routine_name",
    "routine_day_index",
    "routine_day_name",
    "session_exercise_id",
    "exercise_id",
    "exercise_name",
    "set_index",
    "reps",
    "weight",
    "weight_unit",
    "duration_seconds",
    "distance",
    "distance_unit",
    "calories",
    "is_warmup",
    "session_notes",
    "set_notes",
  ] as const;
}

function getProgressionEventCsvHeaders() {
  return [
    "event_id",
    "created_at",
    "event_type",
    "routine_id",
    "routine_name",
    "routine_day_exercise_id",
    "exercise_id",
    "exercise_name",
    "source_session_id",
    "method",
    "vector",
    "step",
    "reason",
    "from_target_json",
    "to_target_json",
  ] as const;
}

function getProgressionEventWorkbookHeaders() {
  return [
    "event_id",
    "created_at",
    "event_type",
    "routine_id",
    "routine_name",
    "routine_day_exercise_id",
    "exercise_id",
    "exercise_name",
    "source_session_id",
    "method",
    "vector",
    "step",
    "reason",
    "from_target_json",
    "to_target_json",
  ];
}

export function buildAccountWorkoutExportProgressionEventCsvRows(payload: AccountWorkoutExportPayload): AccountWorkoutExportProgressionEventCsvRow[] {
  const routineNameById = new Map(payload.routines.map((routine) => [routine.id, routine.name] as const));
  const exerciseNameById = new Map(payload.exercises.map((exercise) => [exercise.id, exercise.name] as const));

  return payload.progressionEvents.map((event) => ({
    event_id: event.id,
    created_at: event.created_at,
    event_type: event.event_type,
    routine_id: event.routine_id,
    routine_name: routineNameById.get(event.routine_id) ?? null,
    routine_day_exercise_id: event.routine_day_exercise_id,
    exercise_id: event.exercise_id,
    exercise_name: exerciseNameById.get(event.exercise_id) ?? null,
    source_session_id: event.source_session_id ?? null,
    method: event.method,
    vector: event.vector,
    step: JSON.stringify(event.step ?? null),
    reason: event.reason,
    from_target_json: JSON.stringify(event.from_target ?? null),
    to_target_json: JSON.stringify(event.to_target ?? null),
  }));
}

export function buildAccountWorkoutExportCsvTables(payload: AccountWorkoutExportPayload): AccountWorkoutExportCsvTable[] {
  return [
    {
      name: "workout_log",
      headers: [...getAccountWorkoutExportCsvHeaders()],
      rows: buildAccountWorkoutExportCsvRows(payload),
    },
    {
      name: "progression_events",
      headers: [...getProgressionEventCsvHeaders()],
      rows: buildAccountWorkoutExportProgressionEventCsvRows(payload),
    },
  ];
}

function serializeCsvSection<Row extends Record<string, unknown>>(args: {
  name: string;
  headers: readonly string[];
  rows: Row[];
}) {
  const sectionLines = [
    `table,${escapeCsvValue(args.name)}`,
    args.headers.join(","),
    ...args.rows.map((row) => args.headers.map((header) => escapeCsvValue(row[header])).join(",")),
  ];

  return sectionLines.join("\n");
}

export function serializeAccountWorkoutExportCsv(input: AccountWorkoutExportCsvRow[] | AccountWorkoutExportCsvTable[]) {
  const tables = Array.isArray(input) && input.length > 0 && "name" in input[0]
    ? input as AccountWorkoutExportCsvTable[]
    : [{
        name: "workout_log" as const,
        headers: [...getAccountWorkoutExportCsvHeaders()],
        rows: input as AccountWorkoutExportCsvRow[],
      }];

  const sections = tables.map((table) => serializeCsvSection({
    name: table.name,
    headers: table.headers,
    rows: table.rows as Array<Record<string, unknown>>,
  }));

  return `${sections.join("\n\n")}\n`;
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

export function buildAccountWorkoutExportWorkbookSheets(payload: AccountWorkoutExportPayload): AccountWorkoutExportWorkbookSheet[] {
  const routineNameById = new Map(payload.routines.map((routine) => [routine.id, routine.name] as const));
  const routineDayById = new Map(payload.routineDays.map((day) => [day.id, day] as const));
  const routineDayExerciseById = new Map(payload.routineDayExercises.map((exercise) => [exercise.id, exercise] as const));
  const exerciseNameById = new Map(payload.exercises.map((exercise) => [exercise.id, exercise.name] as const));

  const sessionRows = payload.sessions.map((session) => ({
    session_id: session.id,
    user_id: session.user_id,
    performed_at: session.performed_at,
    status: session.status,
    duration_seconds: session.duration_seconds,
    routine_id: session.routine_id,
    routine_name: session.routine_id ? (routineNameById.get(session.routine_id) ?? session.name) : session.name,
    routine_day_index: session.routine_day_index,
    routine_day_name: session.routine_day_name,
    day_name_override: session.day_name_override,
    notes: session.notes,
  }));
  const completedSessionRows = sessionRows.filter((session) => session.status === "completed");
  const sessionExerciseRows = payload.sessionExercises.map((sessionExercise) => {
    const routineDayExercise = sessionExercise.routine_day_exercise_id
      ? (routineDayExerciseById.get(sessionExercise.routine_day_exercise_id) ?? null)
      : null;

    return {
      session_exercise_id: sessionExercise.id,
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
      target_sets_min: sessionExercise.target_sets_min ?? null,
      target_sets_max: sessionExercise.target_sets_max ?? null,
      target_reps_min: sessionExercise.target_reps_min ?? null,
      target_reps_max: sessionExercise.target_reps_max ?? null,
      target_weight_min: sessionExercise.target_weight_min ?? null,
      target_weight_max: sessionExercise.target_weight_max ?? null,
      target_weight_unit: sessionExercise.target_weight_unit ?? null,
      target_time_seconds_min: sessionExercise.target_time_seconds_min ?? null,
      target_time_seconds_max: sessionExercise.target_time_seconds_max ?? null,
      target_distance_min: sessionExercise.target_distance_min ?? null,
      target_distance_max: sessionExercise.target_distance_max ?? null,
      target_distance_unit: sessionExercise.target_distance_unit ?? null,
      target_calories_min: sessionExercise.target_calories_min ?? null,
      target_calories_max: sessionExercise.target_calories_max ?? null,
      notes: sessionExercise.notes ?? null,
    };
  });
  const setRows = payload.sets.map((set) => ({
    set_id: set.id,
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
    exercise_id: exercise.id,
    name: exercise.name,
    user_id: exercise.user_id,
    is_global: exercise.is_global,
    primary_muscle: exercise.primary_muscle,
    equipment: exercise.equipment,
    movement_pattern: exercise.movement_pattern,
    measurement_type: exercise.measurement_type,
    default_unit: exercise.default_unit,
    calories_estimation_method: exercise.calories_estimation_method,
    slug: exercise.slug ?? null,
    how_to_short: exercise.how_to_short,
    curation_tags: serializeWorkbookValue(exercise.curation_tags ?? null),
    created_at: exercise.created_at,
  }));
  const routineRows = payload.routines.map((routine) => ({
    routine_id: routine.id,
    user_id: routine.user_id,
    name: routine.name,
    cycle_length_days: routine.cycle_length_days,
    start_date: routine.start_date,
    timezone: routine.timezone,
    weight_unit: routine.weight_unit,
    default_progression_playbook_id: routine.default_progression_playbook_id ?? null,
    default_progression_playbook_config: serializeWorkbookValue(routine.default_progression_playbook_config ?? null),
    updated_at: routine.updated_at,
  }));
  const routineDayRows = payload.routineDays.map((day) => ({
    routine_day_id: day.id,
    user_id: day.user_id,
    routine_id: day.routine_id,
    routine_name: routineNameById.get(day.routine_id) ?? null,
    day_index: day.day_index,
    name: day.name,
    is_rest: day.is_rest,
    notes: day.notes,
  }));
  const routineDayExerciseRows = payload.routineDayExercises.map((exercise) => {
    const routineDay = routineDayById.get(exercise.routine_day_id) ?? null;
    return {
      routine_day_exercise_id: exercise.id,
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
    };
  });
  const progressionEventRows = payload.progressionEvents.map((event) => ({
    event_id: event.id,
    created_at: event.created_at,
    event_type: event.event_type,
    routine_id: event.routine_id,
    routine_name: routineNameById.get(event.routine_id) ?? null,
    routine_day_exercise_id: event.routine_day_exercise_id,
    exercise_id: event.exercise_id,
    exercise_name: exerciseNameById.get(event.exercise_id) ?? null,
    source_session_id: event.source_session_id ?? null,
    method: event.method,
    vector: event.vector,
    step: serializeWorkbookValue(event.step ?? null),
    reason: event.reason,
    from_target_json: serializeWorkbookValue(event.from_target ?? null),
    to_target_json: serializeWorkbookValue(event.to_target ?? null),
  }));
  const progressionSummaryRows = payload.routineDayExercises
    .filter((exercise) => Boolean(exercise.progression_playbook_id || exercise.progression_playbook_config))
    .map((exercise) => {
      const routineDay = routineDayById.get(exercise.routine_day_id) ?? null;
      const routineName = routineDay ? (routineNameById.get(routineDay.routine_id) ?? null) : null;

      return {
        routine_id: routineDay?.routine_id ?? null,
        routine_name: routineName,
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

  const toHeaders = (rows: WorkbookSheetRow[]) => Array.from(new Set(rows.flatMap((row) => Object.keys(row))));

  return [
    { name: "Sessions", rows: sessionRows, headers: toHeaders(sessionRows) },
    { name: "Completed Sessions", rows: completedSessionRows, headers: toHeaders(sessionRows) },
    { name: "Session Exercises", rows: sessionExerciseRows, headers: toHeaders(sessionExerciseRows) },
    { name: "Sets", rows: setRows, headers: toHeaders(setRows) },
    { name: "Exercises", rows: exerciseRows, headers: toHeaders(exerciseRows) },
    { name: "Routines", rows: routineRows, headers: toHeaders(routineRows) },
    { name: "Routine Days", rows: routineDayRows, headers: toHeaders(routineDayRows) },
    { name: "Routine Day Exercises", rows: routineDayExerciseRows, headers: toHeaders(routineDayExerciseRows) },
    { name: "Progression Events", rows: progressionEventRows, headers: progressionEventRows.length > 0 ? toHeaders(progressionEventRows) : getProgressionEventWorkbookHeaders() },
    { name: "Progression Summary", rows: progressionSummaryRows, headers: toHeaders(progressionSummaryRows) },
  ];
}

export function buildAccountWorkoutExportWorkbookBuffer(payload: AccountWorkoutExportPayload) {
  const workbook = XLSX.utils.book_new();

  for (const sheet of buildAccountWorkoutExportWorkbookSheets(payload)) {
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
  const dateFrom = normalizeDateBoundaryStart(options.dateFrom);
  const dateTo = normalizeDateBoundaryEnd(options.dateTo);

  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, timezone, active_routine_id, preferred_weight_unit, preferred_distance_unit, show_qa_llel_data, user_number, user_kind, user_number_assigned_at")
    .eq("id", userId)
    .maybeSingle();
  const profile = (profileData ?? null) as ProfileRow | null;
  const currentRoutineId = currentRoutineOnly ? profile?.active_routine_id ?? null : null;

  let routinesQuery = supabase
    .from("routines")
    .select("id, user_id, name, cycle_length_days, start_date, timezone, updated_at, weight_unit, default_progression_playbook_id, default_progression_playbook_config")
    .eq("user_id", userId);
  if (currentRoutineId) {
    routinesQuery = routinesQuery.eq("id", currentRoutineId);
  }
  const { data: routinesData } = await routinesQuery.order("updated_at", { ascending: false });
  const routines = ((routinesData ?? []) as RoutineRow[]);
  const routineIds = routines.map((routine) => routine.id);

  const { data: routineDaysData } = routineIds.length > 0
    ? await supabase
      .from("routine_days")
      .select("id, user_id, routine_id, day_index, name, is_rest, notes")
      .in("routine_id", routineIds)
      .eq("user_id", userId)
    : { data: [] };
  const routineDays = ((routineDaysData ?? []) as RoutineDayRow[]);
  const routineDayIds = routineDays.map((day) => day.id);

  const { data: routineDayExercisesData } = routineDayIds.length > 0
    ? await supabase
      .from("routine_day_exercises")
      .select("id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, progression_playbook_id, progression_playbook_config, measurement_type, default_unit, notes")
      .in("routine_day_id", routineDayIds)
      .eq("user_id", userId)
      .order("position", { ascending: true })
    : { data: [] };
  const routineDayExercises = ((routineDayExercisesData ?? []) as RoutineDayExerciseRow[]);
  let progressionEventsQuery = supabase
    .from("progression_events")
    .select("id, user_id, routine_id, routine_day_exercise_id, exercise_id, event_type, from_target, to_target, method, vector, step, reason, source_session_id, created_at")
    .eq("user_id", userId);
  if (currentRoutineId) {
    progressionEventsQuery = progressionEventsQuery.eq("routine_id", currentRoutineId);
  }
  if (dateFrom) {
    progressionEventsQuery = progressionEventsQuery.gte("created_at", dateFrom);
  }
  if (dateTo) {
    progressionEventsQuery = progressionEventsQuery.lte("created_at", dateTo);
  }
  const { data: progressionEventsData } = await progressionEventsQuery;
  const progressionEvents = ((progressionEventsData ?? []) as ProgressionEventRow[])
    .sort((left, right) => {
      if (left.created_at === right.created_at) {
        return left.id.localeCompare(right.id);
      }
      return left.created_at.localeCompare(right.created_at);
    });

  let sessionsQuery = supabase
    .from("sessions")
    .select("id, user_id, performed_at, notes, routine_id, routine_day_index, name, routine_day_name, day_name_override, duration_seconds, status")
    .eq("user_id", userId)
    .order("performed_at", { ascending: false });
  if (completedOnly) {
    sessionsQuery = sessionsQuery.eq("status", "completed");
  }
  if (currentRoutineId) {
    sessionsQuery = sessionsQuery.eq("routine_id", currentRoutineId);
  }
  if (dateFrom) {
    sessionsQuery = sessionsQuery.gte("performed_at", dateFrom);
  }
  if (dateTo) {
    sessionsQuery = sessionsQuery.lte("performed_at", dateTo);
  }
  const { data: sessionsData } = await sessionsQuery;
  const sessions = ((sessionsData ?? []) as SessionRow[]);
  const sessionIds = sessions.map((session) => session.id);

  const { data: sessionExercisesData } = sessionIds.length > 0
    ? await supabase
      .from("session_exercises")
      .select("id, session_id, user_id, exercise_id, routine_day_exercise_id, position, performed_index, notes, is_skipped, measurement_type, default_unit, target_sets_min, target_sets_max, target_reps_min, target_reps_max, target_weight_min, target_weight_max, target_weight_unit, target_time_seconds_min, target_time_seconds_max, target_distance_min, target_distance_max, target_distance_unit, target_calories_min, target_calories_max")
      .in("session_id", sessionIds)
      .eq("user_id", userId)
      .order("position", { ascending: true })
    : { data: [] };
  const sessionExercises = ((sessionExercisesData ?? []) as SessionExerciseRow[]);
  const sessionExerciseIds = sessionExercises.map((row) => row.id);

  const { data: setsData } = sessionExerciseIds.length > 0
    ? await supabase
      .from("sets")
      .select("id, client_log_id, session_exercise_id, user_id, set_index, weight, reps, is_warmup, notes, duration_seconds, distance, distance_unit, calories, rpe, weight_unit")
      .in("session_exercise_id", sessionExerciseIds)
      .eq("user_id", userId)
      .order("set_index", { ascending: true })
    : { data: [] };
  const sets = ((setsData ?? []) as SetRow[]);

  const referencedExerciseIds = Array.from(new Set(
    [...routineDayExercises.map((row) => row.exercise_id), ...sessionExercises.map((row) => row.exercise_id)]
      .filter((exerciseId): exerciseId is string => Boolean(exerciseId)),
  ));
  const { data: exercisesData } = referencedExerciseIds.length > 0
    ? await supabase
      .from("exercises")
      .select("id, name, user_id, is_global, primary_muscle, equipment, movement_pattern, measurement_type, default_unit, calories_estimation_method, image_path, image_icon_path, image_howto_path, slug, how_to_short, curation_tags, created_at")
      .in("id", referencedExerciseIds)
    : { data: [] };
  const exercises = (exercisesData ?? []) as AccountWorkoutExportPayload["exercises"];

  return {
    metadata: {
      exportedAt: new Date().toISOString(),
      scope: options.scope,
      dateFrom: options.dateFrom ?? null,
      dateTo: options.dateTo ?? null,
      counts: {
        sessions: sessions.length,
        completedSessions: sessions.filter((session) => session.status === "completed").length,
        sessionExercises: sessionExercises.length,
        sets: sets.length,
        routines: routines.length,
        routineDays: routineDays.length,
        routineDayExercises: routineDayExercises.length,
        exercises: exercises.length,
        progressionEvents: progressionEvents.length,
      },
    },
    profile,
    sessions,
    sessionExercises,
    sets,
    routines,
    routineDays,
    routineDayExercises,
    progressionEvents,
    exercises,
  };
}
