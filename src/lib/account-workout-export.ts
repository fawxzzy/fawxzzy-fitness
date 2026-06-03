import "server-only";

import * as XLSX from "xlsx";
import type {
  ProgressionEventRow,
  RoutineDayExerciseRow,
  RoutineDayRow,
  RoutineRow,
  SessionExerciseRow,
  SessionRow,
  SetRow,
} from "@/types/db";

export type AccountWorkoutExportFileType = "csv" | "json" | "xlsx";
export type AccountWorkoutExportScope = "all" | "history" | "routines";

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

export type AccountWorkoutExportExerciseReference = {
  id: string;
  name: string;
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
      routineExercises: number;
      exercises: number;
      progressionEvents: number;
    };
  };
  sessions: SessionRow[];
  sessionExercises: SessionExerciseRow[];
  sets: SetRow[];
  routines: RoutineRow[];
  routineDays: RoutineDayRow[];
  routineExercises: RoutineDayExerciseRow[];
  progressionEvents: ProgressionEventRow[];
  exercises: AccountWorkoutExportExerciseReference[];
};

type AccountWorkoutExportPrimitive = string | number | boolean | null;
export type AccountWorkoutExportSectionRow = Record<string, unknown>;

export type AccountWorkoutExportSectionKey =
  | "historySessions"
  | "historyExercises"
  | "historySets"
  | "historyProgressionEvents"
  | "routines"
  | "routineDays"
  | "routineExercises";

export const ACCOUNT_WORKOUT_EXPORT_JSON_SECTION_KEYS = [
  "historySessions",
  "historyExercises",
  "historySets",
  "historyProgressionEvents",
  "routines",
  "routineDays",
  "routineExercises",
] as const satisfies readonly AccountWorkoutExportSectionKey[];

type AccountWorkoutExportSectionDefinition = {
  key: AccountWorkoutExportSectionKey;
  label: string;
  csvName: string;
  sheetName: string;
  defaultHeaders: string[];
};

const ACCOUNT_WORKOUT_EXPORT_SECTION_DEFINITIONS: Record<AccountWorkoutExportSectionKey, AccountWorkoutExportSectionDefinition> = {
  historySessions: {
    key: "historySessions",
    label: "History Sessions",
    csvName: "history_sessions",
    sheetName: "History Sessions",
    defaultHeaders: [
      "sessionId",
      "performedAt",
      "status",
      "routineId",
      "routineName",
      "dayIndex",
      "dayName",
      "durationSeconds",
      "notes",
    ],
  },
  historyExercises: {
    key: "historyExercises",
    label: "History Exercises",
    csvName: "history_exercises",
    sheetName: "History Exercises",
    defaultHeaders: [
      "sessionExerciseId",
      "sessionId",
      "exerciseId",
      "exerciseName",
      "routineExerciseId",
      "position",
      "performedIndex",
      "skipped",
      "measurementType",
      "defaultUnit",
      "targetSetsMin",
      "targetSetsMax",
      "targetRepsMin",
      "targetRepsMax",
      "targetWeightMin",
      "targetWeightMax",
      "targetWeightUnit",
      "targetTimeSecondsMin",
      "targetTimeSecondsMax",
      "targetDistMin",
      "targetDistMax",
      "targetDistUnit",
      "targetCaloriesMin",
      "targetCaloriesMax",
      "notes",
    ],
  },
  historySets: {
    key: "historySets",
    label: "History Sets",
    csvName: "history_sets",
    sheetName: "History Sets",
    defaultHeaders: [
      "setId",
      "clientLogId",
      "sessionExerciseId",
      "setIndex",
      "reps",
      "weight",
      "weightUnit",
      "timeSeconds",
      "dist",
      "distUnit",
      "calories",
      "effort",
      "warmup",
      "notes",
    ],
  },
  historyProgressionEvents: {
    key: "historyProgressionEvents",
    label: "History Progression Events",
    csvName: "history_progression_events",
    sheetName: "History Progression",
    defaultHeaders: [
      "progressionEventId",
      "createdAt",
      "eventType",
      "routineId",
      "routineName",
      "routineExerciseId",
      "exerciseId",
      "exerciseName",
      "sourceSessionId",
      "method",
      "vector",
      "step",
      "reason",
      "fromTarget",
      "toTarget",
    ],
  },
  routines: {
    key: "routines",
    label: "Routines",
    csvName: "routines",
    sheetName: "Routines",
    defaultHeaders: [
      "routineId",
      "name",
      "cycleLengthDays",
      "startDate",
      "timezone",
      "weightUnit",
      "defaultProgressionId",
      "defaultProgressionConfig",
      "updatedAt",
    ],
  },
  routineDays: {
    key: "routineDays",
    label: "Routine Days",
    csvName: "routine_days",
    sheetName: "Routine Days",
    defaultHeaders: [
      "routineDayId",
      "routineId",
      "routineName",
      "dayIndex",
      "dayName",
      "restDay",
      "notes",
    ],
  },
  routineExercises: {
    key: "routineExercises",
    label: "Routine Exercises",
    csvName: "routine_exercises",
    sheetName: "Routine Exercises",
    defaultHeaders: [
      "routineExerciseId",
      "routineDayId",
      "routineId",
      "routineName",
      "dayIndex",
      "dayName",
      "exerciseId",
      "exerciseName",
      "position",
      "measurementType",
      "defaultUnit",
      "targetSets",
      "targetReps",
      "targetRepsMin",
      "targetRepsMax",
      "targetWeight",
      "targetWeightUnit",
      "targetTimeSeconds",
      "targetDist",
      "targetDistUnit",
      "targetCalories",
      "progressionId",
      "progressionConfig",
      "notes",
    ],
  },
};

export type AccountWorkoutExportSection = AccountWorkoutExportSectionDefinition & {
  rows: AccountWorkoutExportSectionRow[];
};

export type AccountWorkoutExportJsonDocument = {
  metadata: AccountWorkoutExportPayload["metadata"] & {
    scopeLabel: string;
    includedSections: Array<{
      key: AccountWorkoutExportSectionKey;
      label: string;
      rowCount: number;
    }>;
  };
  data: Partial<Record<AccountWorkoutExportSectionKey, AccountWorkoutExportSectionRow[]>>;
};

export type AccountWorkoutExportCsvTable = {
  name: string;
  headers: string[];
  rows: Array<Record<string, AccountWorkoutExportPrimitive>>;
};

export type AccountWorkoutExportWorkbookSheetName =
  | "History Sessions"
  | "History Exercises"
  | "History Sets"
  | "History Progression"
  | "Routines"
  | "Routine Days"
  | "Routine Exercises";

export type AccountWorkoutExportWorkbookSheet = {
  name: AccountWorkoutExportWorkbookSheetName;
  headers: string[];
  rows: Array<Record<string, AccountWorkoutExportPrimitive>>;
};

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

function cleanExportValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (Array.isArray(value)) {
    const cleanedItems = value
      .map((item) => cleanExportValue(item))
      .filter((item) => item !== undefined);
    return cleanedItems.length > 0 ? cleanedItems : undefined;
  }

  if (typeof value === "object") {
    const cleanedEntries = Object.entries(value as Record<string, unknown>)
      .map(([key, entryValue]) => [key, cleanExportValue(entryValue)] as const)
      .filter(([, entryValue]) => entryValue !== undefined);
    if (cleanedEntries.length === 0) {
      return undefined;
    }
    return Object.fromEntries(cleanedEntries);
  }

  return value;
}

function cleanExportRow<Row extends Record<string, unknown>>(row: Row): AccountWorkoutExportSectionRow {
  return Object.fromEntries(
    Object.entries(row)
      .map(([key, value]) => [key, cleanExportValue(value)] as const)
      .filter(([, value]) => value !== undefined),
  );
}

function toTabularPrimitive(value: unknown): AccountWorkoutExportPrimitive {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  return JSON.stringify(value);
}

function toTabularRows(rows: AccountWorkoutExportSectionRow[]) {
  return rows.map((row) => Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, toTabularPrimitive(value)]),
  ));
}

function getScopeLabel(scope: AccountWorkoutExportScope) {
  switch (scope) {
    case "history":
      return "History";
    case "routines":
      return "Routines";
    default:
      return "All";
  }
}

function getIncludedSectionKeys(scope: AccountWorkoutExportScope): AccountWorkoutExportSectionKey[] {
  if (scope === "history") {
    return [
      "historySessions",
      "historyExercises",
      "historySets",
      "historyProgressionEvents",
    ];
  }

  if (scope === "routines") {
    return [
      "routines",
      "routineDays",
      "routineExercises",
    ];
  }

  return [
    "historySessions",
    "historyExercises",
    "historySets",
    "historyProgressionEvents",
    "routines",
    "routineDays",
    "routineExercises",
  ];
}

function resolveSectionHeaders(args: {
  rows: Array<Record<string, AccountWorkoutExportPrimitive>>;
  defaultHeaders: string[];
}) {
  const presentHeaders = new Set(args.rows.flatMap((row) => Object.keys(row)));
  const orderedHeaders = args.defaultHeaders.filter((header) => presentHeaders.has(header));
  const additionalHeaders = Array.from(presentHeaders)
    .filter((header) => !args.defaultHeaders.includes(header))
    .sort((left, right) => left.localeCompare(right));

  if (orderedHeaders.length === 0 && additionalHeaders.length === 0) {
    return [...args.defaultHeaders];
  }

  return [...orderedHeaders, ...additionalHeaders];
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

export function buildAccountWorkoutExportSections(payload: AccountWorkoutExportPayload): AccountWorkoutExportSection[] {
  const routineNameById = new Map(payload.routines.map((routine) => [routine.id, routine.name] as const));
  const exerciseNameById = new Map(payload.exercises.map((exercise) => [exercise.id, exercise.name] as const));
  const routineDayById = new Map(payload.routineDays.map((day) => [day.id, day] as const));

  const rowsByKey: Record<AccountWorkoutExportSectionKey, AccountWorkoutExportSectionRow[]> = {
    historySessions: payload.sessions.map((session) => cleanExportRow({
      sessionId: session.id,
      performedAt: session.performed_at,
      status: session.status,
      routineId: session.routine_id ?? null,
      routineName: session.routine_id ? (routineNameById.get(session.routine_id) ?? session.name ?? null) : (session.name ?? null),
      dayIndex: session.routine_day_index ?? null,
      dayName: session.day_name_override ?? session.routine_day_name ?? null,
      durationSeconds: session.duration_seconds ?? null,
      notes: session.notes ?? null,
    })),
    historyExercises: payload.sessionExercises.map((sessionExercise) => cleanExportRow({
      sessionExerciseId: sessionExercise.id,
      sessionId: sessionExercise.session_id,
      exerciseId: sessionExercise.exercise_id,
      exerciseName: exerciseNameById.get(sessionExercise.exercise_id) ?? null,
      routineExerciseId: sessionExercise.routine_day_exercise_id ?? null,
      position: sessionExercise.position,
      performedIndex: sessionExercise.performed_index ?? null,
      skipped: sessionExercise.is_skipped,
      measurementType: sessionExercise.measurement_type ?? null,
      defaultUnit: sessionExercise.default_unit ?? null,
      targetSetsMin: sessionExercise.target_sets_min ?? null,
      targetSetsMax: sessionExercise.target_sets_max ?? null,
      targetRepsMin: sessionExercise.target_reps_min ?? null,
      targetRepsMax: sessionExercise.target_reps_max ?? null,
      targetWeightMin: sessionExercise.target_weight_min ?? null,
      targetWeightMax: sessionExercise.target_weight_max ?? null,
      targetWeightUnit: sessionExercise.target_weight_unit ?? null,
      targetTimeSecondsMin: sessionExercise.target_time_seconds_min ?? null,
      targetTimeSecondsMax: sessionExercise.target_time_seconds_max ?? null,
      targetDistMin: sessionExercise.target_distance_min ?? null,
      targetDistMax: sessionExercise.target_distance_max ?? null,
      targetDistUnit: sessionExercise.target_distance_unit ?? null,
      targetCaloriesMin: sessionExercise.target_calories_min ?? null,
      targetCaloriesMax: sessionExercise.target_calories_max ?? null,
      notes: sessionExercise.notes ?? null,
    })),
    historySets: payload.sets.map((set) => cleanExportRow({
      setId: set.id,
      clientLogId: set.client_log_id ?? null,
      sessionExerciseId: set.session_exercise_id,
      setIndex: set.set_index,
      reps: set.reps ?? null,
      weight: set.weight ?? null,
      weightUnit: set.weight_unit ?? null,
      timeSeconds: set.duration_seconds ?? null,
      dist: set.distance ?? null,
      distUnit: set.distance_unit ?? null,
      calories: set.calories ?? null,
      effort: set.rpe ?? null,
      warmup: set.is_warmup,
      notes: set.notes ?? null,
    })),
    historyProgressionEvents: payload.progressionEvents.map((event) => cleanExportRow({
      progressionEventId: event.id,
      createdAt: event.created_at,
      eventType: event.event_type,
      routineId: event.routine_id,
      routineName: routineNameById.get(event.routine_id) ?? null,
      routineExerciseId: event.routine_day_exercise_id,
      exerciseId: event.exercise_id,
      exerciseName: exerciseNameById.get(event.exercise_id) ?? null,
      sourceSessionId: event.source_session_id ?? null,
      method: event.method,
      vector: event.vector,
      step: event.step ?? null,
      reason: event.reason,
      fromTarget: event.from_target ?? null,
      toTarget: event.to_target ?? null,
    })),
    routines: payload.routines.map((routine) => cleanExportRow({
      routineId: routine.id,
      name: routine.name,
      cycleLengthDays: routine.cycle_length_days,
      startDate: routine.start_date,
      timezone: routine.timezone,
      weightUnit: routine.weight_unit,
      defaultProgressionId: routine.default_progression_playbook_id ?? null,
      defaultProgressionConfig: routine.default_progression_playbook_config ?? null,
      updatedAt: routine.updated_at,
    })),
    routineDays: payload.routineDays.map((day) => cleanExportRow({
      routineDayId: day.id,
      routineId: day.routine_id,
      routineName: routineNameById.get(day.routine_id) ?? null,
      dayIndex: day.day_index,
      dayName: day.name,
      restDay: day.is_rest,
      notes: day.notes ?? null,
    })),
    routineExercises: payload.routineExercises.map((exercise) => {
      const routineDay = routineDayById.get(exercise.routine_day_id) ?? null;
      return cleanExportRow({
        routineExerciseId: exercise.id,
        routineDayId: exercise.routine_day_id,
        routineId: routineDay?.routine_id ?? null,
        routineName: routineDay ? (routineNameById.get(routineDay.routine_id) ?? null) : null,
        dayIndex: routineDay?.day_index ?? null,
        dayName: routineDay?.name ?? null,
        exerciseId: exercise.exercise_id,
        exerciseName: exerciseNameById.get(exercise.exercise_id) ?? null,
        position: exercise.position,
        measurementType: exercise.measurement_type ?? null,
        defaultUnit: exercise.default_unit ?? null,
        targetSets: exercise.target_sets ?? null,
        targetReps: exercise.target_reps ?? null,
        targetRepsMin: exercise.target_reps_min ?? null,
        targetRepsMax: exercise.target_reps_max ?? null,
        targetWeight: exercise.target_weight ?? null,
        targetWeightUnit: exercise.target_weight_unit ?? null,
        targetTimeSeconds: exercise.target_duration_seconds ?? null,
        targetDist: exercise.target_distance ?? null,
        targetDistUnit: exercise.target_distance_unit ?? null,
        targetCalories: exercise.target_calories ?? null,
        progressionId: exercise.progression_playbook_id ?? null,
        progressionConfig: exercise.progression_playbook_config ?? null,
        notes: exercise.notes ?? null,
      });
    }),
  };

  return getIncludedSectionKeys(payload.metadata.scope).map((key) => ({
    ...ACCOUNT_WORKOUT_EXPORT_SECTION_DEFINITIONS[key],
    rows: rowsByKey[key],
  }));
}

export function buildAccountWorkoutExportCsvTables(payload: AccountWorkoutExportPayload): AccountWorkoutExportCsvTable[] {
  return buildAccountWorkoutExportSections(payload).map((section) => {
    const rows = toTabularRows(section.rows);
    return {
      name: section.csvName,
      headers: resolveSectionHeaders({
        rows,
        defaultHeaders: section.defaultHeaders,
      }),
      rows,
    };
  });
}

function serializeCsvSection(args: {
  name: string;
  headers: readonly string[];
  rows: Array<Record<string, AccountWorkoutExportPrimitive>>;
}) {
  const sectionLines = [
    `table,${escapeCsvValue(args.name)}`,
    args.headers.join(","),
    ...args.rows.map((row) => args.headers.map((header) => escapeCsvValue(row[header])).join(",")),
  ];

  return sectionLines.join("\n");
}

export function serializeAccountWorkoutExportCsv(input: AccountWorkoutExportCsvTable[]) {
  const sections = input.map((table) => serializeCsvSection({
    name: table.name,
    headers: table.headers,
    rows: table.rows,
  }));

  return `${sections.join("\n\n")}\n`;
}

export function buildAccountWorkoutExportWorkbookSheets(payload: AccountWorkoutExportPayload): AccountWorkoutExportWorkbookSheet[] {
  return buildAccountWorkoutExportSections(payload).map((section) => {
    const rows = toTabularRows(section.rows);
    return {
      name: section.sheetName as AccountWorkoutExportWorkbookSheetName,
      headers: resolveSectionHeaders({
        rows,
        defaultHeaders: section.defaultHeaders,
      }),
      rows,
    };
  });
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

export function buildAccountWorkoutExportJsonDocument(payload: AccountWorkoutExportPayload): AccountWorkoutExportJsonDocument {
  const sections = buildAccountWorkoutExportSections(payload);
  return {
    metadata: {
      ...payload.metadata,
      scopeLabel: getScopeLabel(payload.metadata.scope),
      includedSections: sections.map((section) => ({
        key: section.key,
        label: section.label,
        rowCount: section.rows.length,
      })),
    },
    data: Object.fromEntries(sections.map((section) => [section.key, section.rows])),
  };
}

export async function buildAccountWorkoutExportPayload(args: {
  supabase: any;
  userId: string;
  options: AccountWorkoutExportOptions;
}): Promise<AccountWorkoutExportPayload> {
  const { supabase, userId, options } = args;
  const includeHistory = options.scope !== "routines";
  const includeRoutines = options.scope !== "history";
  const dateFrom = normalizeDateBoundaryStart(options.dateFrom);
  const dateTo = normalizeDateBoundaryEnd(options.dateTo);

  let routines: RoutineRow[] = [];
  let routineDays: RoutineDayRow[] = [];
  let routineExercises: RoutineDayExerciseRow[] = [];
  let sessions: SessionRow[] = [];
  let sessionExercises: SessionExerciseRow[] = [];
  let sets: SetRow[] = [];
  let progressionEvents: ProgressionEventRow[] = [];

  if (includeRoutines) {
    const { data: routinesData } = await supabase
      .from("routines")
      .select("id, user_id, name, cycle_length_days, start_date, timezone, updated_at, weight_unit, default_progression_playbook_id, default_progression_playbook_config")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    routines = (routinesData ?? []) as RoutineRow[];

    const routineIds = routines.map((routine) => routine.id);
    if (routineIds.length > 0) {
      const { data: routineDaysData } = await supabase
        .from("routine_days")
        .select("id, user_id, routine_id, day_index, name, is_rest, notes")
        .in("routine_id", routineIds)
        .eq("user_id", userId);
      routineDays = (routineDaysData ?? []) as RoutineDayRow[];

      const routineDayIds = routineDays.map((day) => day.id);
      if (routineDayIds.length > 0) {
        const { data: routineExercisesData } = await supabase
          .from("routine_day_exercises")
          .select("id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, progression_playbook_id, progression_playbook_config, measurement_type, default_unit, notes")
          .in("routine_day_id", routineDayIds)
          .eq("user_id", userId)
          .order("position", { ascending: true });
        routineExercises = (routineExercisesData ?? []) as RoutineDayExerciseRow[];
      }
    }
  }

  if (includeHistory) {
    let sessionsQuery = supabase
      .from("sessions")
      .select("id, user_id, performed_at, notes, routine_id, routine_day_index, name, routine_day_name, day_name_override, duration_seconds, status")
      .eq("user_id", userId)
      .order("performed_at", { ascending: false });

    if (dateFrom) {
      sessionsQuery = sessionsQuery.gte("performed_at", dateFrom);
    }
    if (dateTo) {
      sessionsQuery = sessionsQuery.lte("performed_at", dateTo);
    }

    const { data: sessionsData } = await sessionsQuery;
    sessions = (sessionsData ?? []) as SessionRow[];
    const sessionIds = sessions.map((session) => session.id);

    if (sessionIds.length > 0) {
      const { data: sessionExercisesData } = await supabase
        .from("session_exercises")
        .select("id, session_id, user_id, exercise_id, routine_day_exercise_id, position, performed_index, notes, is_skipped, measurement_type, default_unit, target_sets_min, target_sets_max, target_reps_min, target_reps_max, target_weight_min, target_weight_max, target_weight_unit, target_time_seconds_min, target_time_seconds_max, target_distance_min, target_distance_max, target_distance_unit, target_calories_min, target_calories_max")
        .in("session_id", sessionIds)
        .eq("user_id", userId)
        .order("position", { ascending: true });
      sessionExercises = (sessionExercisesData ?? []) as SessionExerciseRow[];

      const sessionExerciseIds = sessionExercises.map((row) => row.id);
      if (sessionExerciseIds.length > 0) {
        const { data: setsData } = await supabase
          .from("sets")
          .select("id, client_log_id, session_exercise_id, user_id, set_index, weight, reps, is_warmup, notes, duration_seconds, distance, distance_unit, calories, rpe, weight_unit")
          .in("session_exercise_id", sessionExerciseIds)
          .eq("user_id", userId)
          .order("set_index", { ascending: true });
        sets = (setsData ?? []) as SetRow[];
      }
    }

    let progressionEventsQuery = supabase
      .from("progression_events")
      .select("id, user_id, routine_id, routine_day_exercise_id, exercise_id, event_type, from_target, to_target, method, vector, step, reason, source_session_id, created_at")
      .eq("user_id", userId);

    if (dateFrom) {
      progressionEventsQuery = progressionEventsQuery.gte("created_at", dateFrom);
    }
    if (dateTo) {
      progressionEventsQuery = progressionEventsQuery.lte("created_at", dateTo);
    }

    const { data: progressionEventsData } = await progressionEventsQuery;
    progressionEvents = ((progressionEventsData ?? []) as ProgressionEventRow[])
      .sort((left, right) => {
        if (left.created_at === right.created_at) {
          return left.id.localeCompare(right.id);
        }
        return left.created_at.localeCompare(right.created_at);
      });
  }

  const referencedExerciseIds = Array.from(new Set([
    ...routineExercises.map((row) => row.exercise_id),
    ...sessionExercises.map((row) => row.exercise_id),
    ...progressionEvents.map((row) => row.exercise_id),
  ].filter((exerciseId): exerciseId is string => Boolean(exerciseId))));

  const { data: exercisesData } = referencedExerciseIds.length > 0
    ? await supabase
      .from("exercises")
      .select("id, name")
      .in("id", referencedExerciseIds)
    : { data: [] };
  const exercises = ((exercisesData ?? []) as Array<{ id: string; name: string }>).map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
  }));

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
        routineExercises: routineExercises.length,
        exercises: exercises.length,
        progressionEvents: progressionEvents.length,
      },
    },
    sessions,
    sessionExercises,
    sets,
    routines,
    routineDays,
    routineExercises,
    progressionEvents,
    exercises,
  };
}
