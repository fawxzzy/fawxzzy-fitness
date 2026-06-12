import "server-only";

import { EMPTY_PR_COUNTS, evaluatePrSummaries, type PrEvaluationSet } from "@/lib/pr-evaluator";
import { buildSessionSummary, type SessionRecapSignal, type SessionSummary } from "@/app/history/session-summary";
import {
  buildWeeklyProgressSummary,
  getWeeklyProgressDayKey,
  getWeeklyProgressWeekStart,
  type WeeklyProgressExerciseMeta,
  type WeeklyProgressSessionExercise,
  type WeeklyProgressSet,
  type WeeklyProgressSummary,
} from "@/lib/history-weekly-progress";
import { buildThirtyDayHistorySummary, type ThirtyDayHistorySummary } from "@/lib/history-30-day-summary";
import {
  filterQaLlelRows,
  resolveShowQaLlelDataPreferenceWithOverride,
} from "@/lib/qa-data-visibility";
import { buildSessionProgressionSummary } from "@/lib/progression-lifeline-summary";
import { buildCurrentCycleWindow } from "@/lib/current-cycle-window";
import type { ProgressionEventRow, SessionExerciseRow, SessionRow } from "@/types/db";

const SAFE_CURSOR_FRAGMENT = /^[A-Za-z0-9:._-]+$/;

export type HistoryCursor = {
  performedAt: string;
  id: string;
};

export type HistorySearchParams = {
  cursor?: string | string[] | null;
  selected?: string | string[] | null;
  tab?: string | string[] | null;
  view?: string | string[] | null;
  q?: string | string[] | null;
  tags?: string | string[] | null;
  filters?: string | string[] | null;
};

export type HistorySessionsPageData = {
  nextCursor: string | null;
  selectedSessionId?: string;
  sessionItems: SessionSummary[];
  currentRoutineSessionItems: SessionSummary[];
  currentCycleSessionItems: SessionSummary[];
  subtitle: string;
  activeRoutineTitle: string | null;
  thirtyDaySummary: ThirtyDayHistorySummary;
  currentRoutineThirtyDaySummary: ThirtyDayHistorySummary;
  currentCycleThirtyDaySummary: ThirtyDayHistorySummary;
  weeklyProgress: WeeklyProgressSummary;
  currentRoutineWeeklyProgress: WeeklyProgressSummary;
  currentCycleWeeklyProgress: WeeklyProgressSummary;
  weeklyProgressByWeek: WeeklyProgressSummary[];
  currentRoutineWeeklyProgressByWeek: WeeklyProgressSummary[];
  currentCycleWeeklyProgressByWeek: WeeklyProgressSummary[];
};

export type HistorySessionsRouteState<TData, TFallback> =
  | { kind: "ready"; data: TData }
  | { kind: "fallback"; fallback: TFallback };

type ConsoleLike = Pick<Console, "warn">;
type QueryResult<T> = { data: T[] | null; error?: { message?: string | null } | null };
type SupabaseLike = { from: (table: string) => any };
type SessionExerciseSummaryRow = Pick<SessionExerciseRow, "id" | "session_id" | "exercise_id" | "is_skipped">;
type ProgressionEventSummaryRow = ProgressionEventRow;
type SessionSetSummaryRow = {
  session_exercise_id: string;
  weight: number;
  reps: number;
  weight_unit: "kg" | "lb" | "lbs" | null;
};
type ExerciseMetadataRow = WeeklyProgressExerciseMeta;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asTrimmedString(value: unknown) {
  const nextValue = asString(value);
  if (!nextValue) {
    return null;
  }

  const trimmed = nextValue.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asNullableInteger(value: unknown) {
  const nextValue = asNullableNumber(value);
  return nextValue === null ? null : Math.trunc(nextValue);
}

function asBoolean(value: unknown) {
  return value === true;
}

function getSingleSearchParam(value: string | string[] | null | undefined) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : undefined;
  }

  return typeof value === "string" ? value : undefined;
}

function isSafeCursor(cursor: HistoryCursor | null): cursor is HistoryCursor {
  return Boolean(
    cursor
    && SAFE_CURSOR_FRAGMENT.test(cursor.performedAt)
    && SAFE_CURSOR_FRAGMENT.test(cursor.id),
  );
}

function normalizeSessionRow(row: unknown): SessionRow | null {
  const record = asRecord(row);
  if (!record) {
    return null;
  }

  const id = asTrimmedString(record.id);
  const performedAt = asTrimmedString(record.performed_at);
  const status = record.status === "completed" || record.status === "in_progress"
    ? record.status
    : null;

  if (!id || !performedAt || !status) {
    return null;
  }

  return {
    id,
    user_id: asString(record.user_id) ?? "",
    performed_at: performedAt,
    notes: asString(record.notes),
    routine_id: asTrimmedString(record.routine_id),
    routine_day_index: asNullableInteger(record.routine_day_index),
    name: asString(record.name),
    routine_day_name: asString(record.routine_day_name),
    day_name_override: asString(record.day_name_override),
    duration_seconds: asNullableNumber(record.duration_seconds),
    status,
  };
}

function normalizeSessionExerciseRow(row: unknown): SessionExerciseSummaryRow | null {
  const record = asRecord(row);
  if (!record) {
    return null;
  }

  const id = asTrimmedString(record.id);
  const sessionId = asTrimmedString(record.session_id);
  const exerciseId = asTrimmedString(record.exercise_id);

  if (!id || !sessionId || !exerciseId) {
    return null;
  }

  return {
    id,
    session_id: sessionId,
    exercise_id: exerciseId,
    is_skipped: asBoolean(record.is_skipped),
  };
}

function normalizeSessionSetRow(row: unknown): SessionSetSummaryRow | null {
  const record = asRecord(row);
  if (!record) {
    return null;
  }

  const sessionExerciseId = asTrimmedString(record.session_exercise_id);
  if (!sessionExerciseId) {
    return null;
  }

  const weightUnit = record.weight_unit === "kg" || record.weight_unit === "lb" || record.weight_unit === "lbs"
    ? record.weight_unit
    : null;

  return {
    session_exercise_id: sessionExerciseId,
    weight: asNullableNumber(record.weight) ?? 0,
    reps: asNullableNumber(record.reps) ?? 0,
    weight_unit: weightUnit,
  };
}

function normalizeProgressionEventRow(row: unknown): ProgressionEventSummaryRow | null {
  const record = asRecord(row);
  if (!record) {
    return null;
  }

  const id = asTrimmedString(record.id);
  const userId = asTrimmedString(record.user_id);
  const routineId = asTrimmedString(record.routine_id);
  const routineDayExerciseId = asTrimmedString(record.routine_day_exercise_id);
  const exerciseId = asTrimmedString(record.exercise_id);
  const createdAt = asTrimmedString(record.created_at);
  const eventType = record.event_type === "promotion_applied"
    || record.event_type === "promotion_reverted"
    || record.event_type === "lock_in"
    || record.event_type === "deload_applied"
    || record.event_type === "review_acknowledged"
    || record.event_type === "manual_target_change"
    ? record.event_type
    : null;
  const fromTarget = asRecord(record.from_target);
  const toTarget = asRecord(record.to_target);
  const method = asTrimmedString(record.method);
  const vector = asTrimmedString(record.vector);

  if (
    !id
    || !userId
    || !routineId
    || !routineDayExerciseId
    || !exerciseId
    || !createdAt
    || !eventType
    || !fromTarget
    || !toTarget
    || !method
    || !vector
  ) {
    return null;
  }

  return {
    id,
    user_id: userId,
    routine_id: routineId,
    routine_day_exercise_id: routineDayExerciseId,
    exercise_id: exerciseId,
    event_type: eventType,
    from_target: fromTarget,
    to_target: toTarget,
    method,
    vector,
    step: asRecord(record.step),
    reason: asString(record.reason) ?? "",
    source_session_id: asTrimmedString(record.source_session_id),
    created_at: createdAt,
  };
}

function normalizeExerciseNameRows(rows: unknown[]) {
  const exerciseNameById = new Map<string, string>();

  for (const row of rows) {
    const record = asRecord(row);
    const id = record ? asTrimmedString(record.id) : null;
    if (!id) {
      continue;
    }

    exerciseNameById.set(id, asTrimmedString(record?.name) ?? "Exercise");
  }

  return exerciseNameById;
}

function normalizeExerciseMetadataRows(rows: unknown[]) {
  const exerciseMetaById = new Map<string, ExerciseMetadataRow>();

  for (const row of rows) {
    const record = asRecord(row);
    const id = record ? asTrimmedString(record.id) : null;
    if (!id) {
      continue;
    }

    exerciseMetaById.set(id, {
      name: asTrimmedString(record?.name) ?? "Exercise",
      measurementType: asTrimmedString(record?.measurement_type),
      primaryMuscle: asTrimmedString(record?.primary_muscle),
    });
  }

  return exerciseMetaById;
}

function normalizeProfileSettingsRow(rows: unknown[], showQaLlelDataOverride: boolean | null = null) {
  const record = asRecord(rows[0]);
  return {
    timezone: asTrimmedString(record?.timezone) ?? "America/New_York",
    activeRoutineId: asTrimmedString(record?.active_routine_id),
    showQaLlelData: resolveShowQaLlelDataPreferenceWithOverride({
      show_qa_llel_data: record?.show_qa_llel_data === true ? true : record?.show_qa_llel_data === false ? false : null,
      user_kind: record?.user_kind === "human" || record?.user_kind === "automation" || record?.user_kind === "unknown"
        ? record.user_kind
        : "unknown",
    }, showQaLlelDataOverride),
  };
}

function normalizeRoutineNames(rows: unknown[]) {
  const routineNameById = new Map<string, string>();

  for (const row of rows) {
    const record = asRecord(row);
    const id = record ? asTrimmedString(record.id) : null;
    if (!id) {
      continue;
    }

    routineNameById.set(id, asTrimmedString(record?.name) ?? "");
  }

  return routineNameById;
}

function normalizeRoutineMetadata(rows: unknown[], routineId: string | null | undefined) {
  if (!routineId) {
    return null;
  }

  for (const row of rows) {
    const record = asRecord(row);
    if (asTrimmedString(record?.id) !== routineId) {
      continue;
    }

    return {
      id: routineId,
      name: asTrimmedString(record?.name) ?? "",
      cycleLengthDays: asNullableInteger(record?.cycle_length_days),
      startDate: asTrimmedString(record?.start_date),
      timezone: asTrimmedString(record?.timezone),
    };
  }

  return null;
}

function normalizeRoutineDayNames(rows: unknown[]) {
  const routineDayNameByKey = new Map<string, string>();

  for (const row of rows) {
    const record = asRecord(row);
    const routineId = record ? asTrimmedString(record.routine_id) : null;
    const dayIndex = record ? asNullableInteger(record.day_index) : null;

    if (!routineId || dayIndex === null) {
      continue;
    }

    routineDayNameByKey.set(`${routineId}:${dayIndex}`, asTrimmedString(record?.name) ?? "");
  }

  return routineDayNameByKey;
}

function normalizeRoutineDayCounts(rows: unknown[]) {
  const routineDayIndexesByRoutineId = new Map<string, Set<number>>();

  for (const row of rows) {
    const record = asRecord(row);
    const routineId = record ? asTrimmedString(record.routine_id) : null;
    const dayIndex = record ? asNullableInteger(record.day_index) : null;
    const isRest = record?.is_rest === true;

    if (!routineId || dayIndex === null || isRest) {
      continue;
    }

    const current = routineDayIndexesByRoutineId.get(routineId) ?? new Set<number>();
    current.add(dayIndex);
    routineDayIndexesByRoutineId.set(routineId, current);
  }

  return new Map<string, number>(
    Array.from(routineDayIndexesByRoutineId.entries()).map(([routineId, dayIndexes]) => [routineId, dayIndexes.size]),
  );
}

function unwrapRelationRecord(value: unknown) {
  if (Array.isArray(value)) {
    return asRecord(value[0]);
  }

  return asRecord(value);
}

function normalizePrEvaluationSets(rows: unknown[]) {
  return rows.flatMap((row): PrEvaluationSet[] => {
    const record = asRecord(row);
    const setIndex = record ? asNullableInteger(record.set_index) : null;
    if (!record || setIndex === null) {
      return [];
    }

    const sessionExercise = unwrapRelationRecord(record.session_exercise);
    const session = unwrapRelationRecord(sessionExercise?.session);
    const exerciseId = sessionExercise ? asTrimmedString(sessionExercise.exercise_id) : null;
    const sessionId = sessionExercise ? asTrimmedString(sessionExercise.session_id) : null;
    const performedAt = session ? asTrimmedString(session.performed_at) : null;
    const status = session?.status === "completed" || session?.status === "in_progress"
      ? session.status
      : null;

    if (!exerciseId || !sessionId || !performedAt || status !== "completed") {
      return [];
    }

    return [{
      exerciseId,
      sessionId,
      performedAt,
      setIndex,
      weight: asNullableNumber(record.weight),
      reps: asNullableNumber(record.reps),
    }];
  });
}

function buildSessionRecapSignals(args: {
  exerciseNames: string[];
  bestExerciseName?: string | null;
  exerciseNameById: Map<string, string>;
  prExerciseIds: Set<string>;
  progressionEvents: ProgressionEventSummaryRow[];
}) {
  const prExerciseNames = new Set(
    Array.from(args.prExerciseIds)
      .map((exerciseId) => args.exerciseNameById.get(exerciseId)?.trim())
      .filter((value): value is string => Boolean(value)),
  );
  const progressionSignalsByExerciseName = new Map<string, Set<"promotion" | "regression" | "watch">>();

  for (const event of args.progressionEvents) {
    const exerciseName = args.exerciseNameById.get(event.exercise_id)?.trim();
    if (!exerciseName) {
      continue;
    }

    const current = progressionSignalsByExerciseName.get(exerciseName) ?? new Set<"promotion" | "regression" | "watch">();
    if (event.event_type === "promotion_applied") {
      current.add("promotion");
    } else if (event.event_type === "deload_applied") {
      current.add("regression");
    } else if (event.event_type === "manual_target_change" || event.event_type === "promotion_reverted") {
      current.add("watch");
    }
    progressionSignalsByExerciseName.set(exerciseName, current);
  }

  return args.exerciseNames.map((exerciseName) => {
    const signals = [
      prExerciseNames.has(exerciseName) ? "pr" : null,
      ...(Array.from(progressionSignalsByExerciseName.get(exerciseName) ?? [])),
    ].filter((value, index, values): value is "pr" | "promotion" | "regression" | "watch" => Boolean(value) && values.indexOf(value) === index);

    const tagLabels = [
      args.bestExerciseName?.trim() === exerciseName ? "BEST" : null,
    ].filter((value): value is string => Boolean(value));

    return {
      exerciseName,
      signals,
      tagLabels,
    } satisfies SessionRecapSignal;
  });
}

async function loadOptionalRows<T>({
  enabled,
  label,
  load,
  logger,
}: {
  enabled: boolean;
  label: string;
  load: () => Promise<QueryResult<T>>;
  logger: ConsoleLike;
}) {
  if (!enabled) {
    return [] as T[];
  }

  try {
    const { data, error } = await load();
    if (error) {
      logger.warn(`[history/sessions] ${label} unavailable`, error);
      return [] as T[];
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    logger.warn(`[history/sessions] ${label} unavailable`, error);
    return [] as T[];
  }
}

export function encodeHistoryCursor(cursor: HistoryCursor) {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

export function decodeHistoryCursor(value?: string | null): HistoryCursor | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<HistoryCursor>;
    const performedAt = asTrimmedString(parsed.performedAt);
    const id = asTrimmedString(parsed.id);
    if (!performedAt || !id) {
      return null;
    }

    return {
      performedAt,
      id,
    };
  } catch {
    return null;
  }
}

export async function resolveHistorySessionsRouteState<TData, TFallback>({
  fallback,
  load,
  onError,
  shouldPassthroughError,
}: {
  fallback: TFallback;
  load: () => Promise<TData>;
  onError?: (error: unknown) => void;
  shouldPassthroughError?: (error: unknown) => boolean;
}): Promise<HistorySessionsRouteState<TData, TFallback>> {
  try {
    return { kind: "ready", data: await load() };
  } catch (error) {
    if (shouldPassthroughError?.(error)) {
      throw error;
    }

    onError?.(error);
    return { kind: "fallback", fallback };
  }
}

export async function loadHistorySessionsPageData({
  logger = console,
  now,
  searchParams,
  showQaLlelDataOverride = null,
  supabase,
  userId,
}: {
  logger?: ConsoleLike;
  now?: string;
  searchParams?: HistorySearchParams;
  showQaLlelDataOverride?: boolean | null;
  supabase: SupabaseLike;
  userId: string;
}): Promise<HistorySessionsPageData> {
  const cursor = decodeHistoryCursor(getSingleSearchParam(searchParams?.cursor));

  let query = supabase
    .from("sessions")
    .select("id, user_id, performed_at, notes, routine_id, routine_day_index, name, routine_day_name, day_name_override, duration_seconds, status")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("performed_at", { ascending: false })
    .order("id", { ascending: false });

  if (isSafeCursor(cursor)) {
    query = query.or(
      `performed_at.lt.${cursor.performedAt},and(performed_at.eq.${cursor.performedAt},id.lt.${cursor.id})`,
    );
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`failed to load history sessions: ${error.message ?? "unknown error"}`);
  }

  const fetchedSessions = (Array.isArray(data) ? data : [])
    .map(normalizeSessionRow)
    .filter((session): session is SessionRow => Boolean(session));
  const sessions = fetchedSessions;
  const sessionIds = sessions.map((session) => session.id);
  const routineIds = Array.from(new Set(
    sessions
      .map((session) => session.routine_id)
      .filter((routineId): routineId is string => Boolean(routineId)),
  ));
  const nextCursor = null;

  const [profileRows, routineRows, routineDayRows, sessionExerciseRows, progressionEventRows] = await Promise.all([
    loadOptionalRows({
      enabled: true,
      label: "profile timezone",
      load: () => supabase
        .from("profiles")
        .select("timezone, active_routine_id, show_qa_llel_data, user_kind")
        .eq("id", userId),
      logger,
    }),
    loadOptionalRows({
      enabled: routineIds.length > 0,
      label: "routine metadata",
      load: () => supabase
        .from("routines")
        .select("id, name, cycle_length_days, start_date, timezone")
        .in("id", routineIds)
        .eq("user_id", userId),
      logger,
    }),
    loadOptionalRows({
      enabled: routineIds.length > 0,
      label: "routine day metadata",
      load: () => supabase
        .from("routine_days")
        .select("routine_id, day_index, name, is_rest")
        .in("routine_id", routineIds)
        .eq("user_id", userId),
      logger,
    }),
    loadOptionalRows({
      enabled: sessionIds.length > 0,
      label: "session exercise rows",
      load: () => supabase
        .from("session_exercises")
        .select("id, session_id, exercise_id, is_skipped")
        .in("session_id", sessionIds)
        .eq("user_id", userId),
      logger,
    }),
    loadOptionalRows({
      enabled: true,
      label: "progression event rows",
      load: () => supabase
        .from("progression_events")
        .select("id, user_id, routine_id, routine_day_exercise_id, exercise_id, event_type, from_target, to_target, method, vector, step, reason, source_session_id, created_at")
        .eq("user_id", userId),
      logger,
    }),
  ]);

  const profileSettings = normalizeProfileSettingsRow(profileRows, showQaLlelDataOverride);
  const profileTimezone = profileSettings.timezone;
  const activeRoutineRows = await loadOptionalRows({
    enabled: Boolean(profileSettings.activeRoutineId) && !routineIds.includes(profileSettings.activeRoutineId ?? ""),
    label: "active routine metadata",
    load: () => supabase
      .from("routines")
      .select("id, name, cycle_length_days, start_date, timezone")
      .eq("id", profileSettings.activeRoutineId)
      .eq("user_id", userId),
    logger,
  });
  const allRoutineRows = [...routineRows, ...activeRoutineRows];

  const sessionExercises = sessionExerciseRows
    .map(normalizeSessionExerciseRow)
    .filter((row): row is SessionExerciseSummaryRow => Boolean(row));
  const progressionEvents = progressionEventRows
    .map(normalizeProgressionEventRow)
    .filter((row): row is ProgressionEventSummaryRow => Boolean(row));
  const progressionEventsBySessionId = new Map<string, ProgressionEventSummaryRow[]>();
  for (const event of progressionEvents) {
    if (!event.source_session_id) {
      continue;
    }
    const current = progressionEventsBySessionId.get(event.source_session_id) ?? [];
    current.push(event);
    progressionEventsBySessionId.set(event.source_session_id, current);
  }
  const sessionExerciseIds = sessionExercises.map((row) => row.id);
  const exerciseIds = Array.from(new Set([
    ...sessionExercises.map((row) => row.exercise_id),
    ...progressionEvents.map((row) => row.exercise_id),
  ]));

  const [setRows, exerciseNameRows, historicalSetRows] = await Promise.all([
    loadOptionalRows({
      enabled: sessionExerciseIds.length > 0,
      label: "session set rows",
      load: () => supabase
        .from("sets")
        .select("session_exercise_id, weight, reps, weight_unit")
        .in("session_exercise_id", sessionExerciseIds)
        .eq("user_id", userId),
      logger,
    }),
    loadOptionalRows({
      enabled: exerciseIds.length > 0,
      label: "exercise names",
      load: () => supabase
        .from("exercises")
        .select("id, name, primary_muscle, measurement_type")
        .in("id", exerciseIds),
      logger,
    }),
    loadOptionalRows({
      enabled: exerciseIds.length > 0,
      label: "historical PR rows",
      load: () => supabase
        .from("sets")
        .select("set_index, weight, reps, session_exercise:session_exercises!inner(session_id, exercise_id, session:sessions!inner(performed_at, status))")
        .eq("user_id", userId)
        .eq("session_exercise.user_id", userId)
        .eq("session_exercise.session.status", "completed")
        .in("session_exercise.exercise_id", exerciseIds),
      logger,
    }),
  ]);

  const routineNameById = normalizeRoutineNames(allRoutineRows);
  const activeRoutineTitle = profileSettings.activeRoutineId
    ? (routineNameById.get(profileSettings.activeRoutineId) ?? null)
    : null;
  const activeRoutineMetadata = normalizeRoutineMetadata(allRoutineRows, profileSettings.activeRoutineId);
  const currentCycleWindow = buildCurrentCycleWindow({
    cycleLengthDays: activeRoutineMetadata?.cycleLengthDays,
    startDate: activeRoutineMetadata?.startDate,
    profileTimeZone: activeRoutineMetadata?.timezone ?? profileTimezone,
    referenceDate: now,
  });
  const routineDayNameByKey = normalizeRoutineDayNames(routineDayRows);
  const routineDayCountByRoutineId = normalizeRoutineDayCounts(routineDayRows);
  const exerciseNameById = normalizeExerciseNameRows(exerciseNameRows);
  const exerciseMetaById = normalizeExerciseMetadataRows(exerciseNameRows);
  const prEvaluationSets = normalizePrEvaluationSets(historicalSetRows);
  const { sessionCountsById, sessionPrExerciseIdsById } = evaluatePrSummaries(prEvaluationSets);

  const exercisesBySessionId = new Map<string, SessionExerciseSummaryRow[]>();
  const weeklyProgressExercisesBySessionId = new Map<string, WeeklyProgressSessionExercise[]>();
  for (const row of sessionExercises) {
    const current = exercisesBySessionId.get(row.session_id) ?? [];
    current.push(row);
    exercisesBySessionId.set(row.session_id, current);

    const weeklyProgressCurrent = weeklyProgressExercisesBySessionId.get(row.session_id) ?? [];
    weeklyProgressCurrent.push({
      id: row.id,
      sessionId: row.session_id,
      exerciseId: row.exercise_id,
    });
    weeklyProgressExercisesBySessionId.set(row.session_id, weeklyProgressCurrent);
  }

  const setsBySessionExerciseId = new Map<string, SessionSetSummaryRow[]>();
  const weeklyProgressSetsBySessionExerciseId = new Map<string, WeeklyProgressSet[]>();
  for (const row of setRows.map(normalizeSessionSetRow).filter((set): set is SessionSetSummaryRow => Boolean(set))) {
    const current = setsBySessionExerciseId.get(row.session_exercise_id) ?? [];
    current.push(row);
    setsBySessionExerciseId.set(row.session_exercise_id, current);

    const weeklyProgressCurrent = weeklyProgressSetsBySessionExerciseId.get(row.session_exercise_id) ?? [];
    weeklyProgressCurrent.push({
      weight: row.weight,
      reps: row.reps,
    });
    weeklyProgressSetsBySessionExerciseId.set(row.session_exercise_id, weeklyProgressCurrent);
  }

  const sessionItems = sessions.map((session) => {
    const dayTitle = session.day_name_override
      || (
        session.routine_id && session.routine_day_index !== null
          ? routineDayNameByKey.get(`${session.routine_id}:${session.routine_day_index}`) ?? null
          : null
      )
      || session.routine_day_name
      || (session.routine_day_index !== null ? `Day ${session.routine_day_index}` : null);
    const routineTitle = (session.routine_id ? routineNameById.get(session.routine_id) : null) ?? session.name;

    const baseSummary = buildSessionSummary({
      sessionRow: session,
      routineTitle,
      dayTitle,
      sessionExercises: exercisesBySessionId.get(session.id) ?? [],
      setsBySessionExerciseId,
      exerciseNameById,
      prCounts: sessionCountsById.get(session.id) ?? { ...EMPTY_PR_COUNTS },
      prExerciseNames: Array.from(sessionPrExerciseIdsById.get(session.id) ?? [])
        .map((exerciseId) => exerciseNameById.get(exerciseId) ?? "")
        .filter(Boolean),
    });
    const prExerciseIds = sessionPrExerciseIdsById.get(session.id) ?? new Set<string>();
    const recapSignals = buildSessionRecapSignals({
      exerciseNames: baseSummary.exerciseNames ?? [],
      bestExerciseName: baseSummary.bestLift?.exerciseName,
      exerciseNameById,
      prExerciseIds,
      progressionEvents: progressionEventsBySessionId.get(session.id) ?? [],
    });

    return {
      ...baseSummary,
      recapSignals,
      progressionSummary: buildSessionProgressionSummary(
        progressionEventsBySessionId.get(session.id) ?? [],
        exerciseNameById,
      ),
    } satisfies SessionSummary;
  });
  const visibleSessionItems = profileSettings.showQaLlelData
    ? sessionItems
    : filterQaLlelRows(sessionItems, (session) => [session.routineTitle, session.dayTitle]);
  const currentRoutineSessionItems = profileSettings.activeRoutineId
    ? visibleSessionItems.filter((session) => session.routineId === profileSettings.activeRoutineId)
    : [];
  const currentRoutineProgressionEvents = profileSettings.activeRoutineId
    ? progressionEvents.filter((event) => event.routine_id === profileSettings.activeRoutineId)
    : [];
  const currentCycleSessionItems = profileSettings.activeRoutineId && currentCycleWindow
    ? currentRoutineSessionItems.filter((session) => {
      const dayKey = getWeeklyProgressDayKey(session.startedAt, profileTimezone);
      return Boolean(dayKey && dayKey >= currentCycleWindow.startDate && dayKey <= currentCycleWindow.endDate);
    })
    : [];
  const currentCycleProgressionEvents = profileSettings.activeRoutineId && currentCycleWindow
    ? currentRoutineProgressionEvents.filter((event) => {
      const dayKey = getWeeklyProgressDayKey(event.created_at, profileTimezone);
      return Boolean(dayKey && dayKey >= currentCycleWindow.startDate && dayKey <= currentCycleWindow.endDate);
    })
    : [];

  const weeklyProgress = buildWeeklyProgressSummary({
    sessions: visibleSessionItems,
    progressionEvents,
    sessionExercisesBySessionId: weeklyProgressExercisesBySessionId,
    setsBySessionExerciseId: weeklyProgressSetsBySessionExerciseId,
    exerciseMetaById,
    routineDayCountByRoutineId,
    timezone: profileTimezone,
    now,
  });
  const currentRoutineWeeklyProgress = buildWeeklyProgressSummary({
    sessions: currentRoutineSessionItems,
    progressionEvents: currentRoutineProgressionEvents,
    sessionExercisesBySessionId: weeklyProgressExercisesBySessionId,
    setsBySessionExerciseId: weeklyProgressSetsBySessionExerciseId,
    exerciseMetaById,
    routineDayCountByRoutineId,
    timezone: profileTimezone,
    now,
  });
  const currentCycleWeeklyProgress = buildWeeklyProgressSummary({
    sessions: currentCycleSessionItems,
    progressionEvents: currentCycleProgressionEvents,
    sessionExercisesBySessionId: weeklyProgressExercisesBySessionId,
    setsBySessionExerciseId: weeklyProgressSetsBySessionExerciseId,
    exerciseMetaById,
    routineDayCountByRoutineId,
    timezone: profileTimezone,
    now,
    weekStart: currentCycleWindow?.startDate,
  });
  const weeklyProgressByWeek = Array.from(
    new Set(
      visibleSessionItems
        .map((session) => getWeeklyProgressWeekStart(session.startedAt, profileTimezone))
        .filter((weekStart): weekStart is string => Boolean(weekStart)),
    ),
  )
    .sort((left, right) => right.localeCompare(left))
    .map((weekStart) => buildWeeklyProgressSummary({
      sessions: visibleSessionItems,
      progressionEvents,
      sessionExercisesBySessionId: weeklyProgressExercisesBySessionId,
      setsBySessionExerciseId: weeklyProgressSetsBySessionExerciseId,
      exerciseMetaById,
      routineDayCountByRoutineId,
      timezone: profileTimezone,
      now,
      weekStart,
    }));
  const currentRoutineWeeklyProgressByWeek = Array.from(
    new Set(
      currentRoutineSessionItems
        .map((session) => getWeeklyProgressWeekStart(session.startedAt, profileTimezone))
        .filter((weekStart): weekStart is string => Boolean(weekStart)),
    ),
  )
    .sort((left, right) => right.localeCompare(left))
    .map((weekStart) => buildWeeklyProgressSummary({
      sessions: currentRoutineSessionItems,
      progressionEvents: currentRoutineProgressionEvents,
      sessionExercisesBySessionId: weeklyProgressExercisesBySessionId,
      setsBySessionExerciseId: weeklyProgressSetsBySessionExerciseId,
      exerciseMetaById,
      routineDayCountByRoutineId,
      timezone: profileTimezone,
      now,
      weekStart,
    }));
  const currentCycleWeeklyProgressByWeek = Array.from(
    new Set(
      currentCycleSessionItems
        .map((session) => getWeeklyProgressWeekStart(session.startedAt, profileTimezone))
        .filter((weekStart): weekStart is string => Boolean(weekStart)),
    ),
  )
    .sort((left, right) => right.localeCompare(left))
    .map((weekStart) => buildWeeklyProgressSummary({
      sessions: currentCycleSessionItems,
      progressionEvents: currentCycleProgressionEvents,
      sessionExercisesBySessionId: weeklyProgressExercisesBySessionId,
      setsBySessionExerciseId: weeklyProgressSetsBySessionExerciseId,
      exerciseMetaById,
      routineDayCountByRoutineId,
      timezone: profileTimezone,
      now,
      weekStart,
    }));
  const thirtyDaySummary = buildThirtyDayHistorySummary({
    sessions: visibleSessionItems,
    progressionEvents,
    exerciseNameById,
    routineDayCountByRoutineId,
    timezone: profileTimezone,
    now,
  });
  const currentRoutineThirtyDaySummary = buildThirtyDayHistorySummary({
    sessions: currentRoutineSessionItems,
    progressionEvents: currentRoutineProgressionEvents,
    exerciseNameById,
    routineDayCountByRoutineId,
    timezone: profileTimezone,
    now,
    scopeLabel: activeRoutineTitle?.trim()
      ? `Current Routine: ${activeRoutineTitle.trim()}`
      : "Current Routine",
  });
  const currentCycleThirtyDaySummary = buildThirtyDayHistorySummary({
    sessions: currentCycleSessionItems,
    progressionEvents: currentCycleProgressionEvents,
    exerciseNameById,
    routineDayCountByRoutineId,
    timezone: profileTimezone,
    now,
    scopeLabel: currentCycleWindow
      ? `Current Cycle: ${currentCycleWindow.label}`
      : "Current Cycle",
  });

  return {
    nextCursor,
    selectedSessionId: getSingleSearchParam(searchParams?.selected) ?? undefined,
    sessionItems: visibleSessionItems,
    currentRoutineSessionItems,
    currentCycleSessionItems,
    subtitle: `${visibleSessionItems.length} completed sessions`,
    activeRoutineTitle,
    thirtyDaySummary,
    currentRoutineThirtyDaySummary,
    currentCycleThirtyDaySummary,
    weeklyProgress,
    currentRoutineWeeklyProgress,
    currentCycleWeeklyProgress,
    weeklyProgressByWeek,
    currentRoutineWeeklyProgressByWeek,
    currentCycleWeeklyProgressByWeek,
  };
}
