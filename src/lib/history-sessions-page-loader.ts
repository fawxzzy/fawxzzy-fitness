import "server-only";

import { EMPTY_PR_COUNTS, evaluatePrSummaries, type PrEvaluationSet } from "@/lib/pr-evaluator";
import { buildSessionSummary, type SessionSummary } from "@/app/history/session-summary";
import type { SessionExerciseRow, SessionRow } from "@/types/db";

const PAGE_SIZE = 20;
const SAFE_CURSOR_FRAGMENT = /^[A-Za-z0-9:._-]+$/;

export type HistoryCursor = {
  performedAt: string;
  id: string;
};

export type HistorySearchParams = {
  cursor?: string | string[] | null;
  selected?: string | string[] | null;
  tab?: string | string[] | null;
};

export type HistorySessionsPageData = {
  nextCursor: string | null;
  selectedSessionId?: string;
  sessionItems: SessionSummary[];
  subtitle: string;
};

export type HistorySessionsRouteState<TData, TFallback> =
  | { kind: "ready"; data: TData }
  | { kind: "fallback"; fallback: TFallback };

type ConsoleLike = Pick<Console, "warn">;
type QueryResult<T> = { data: T[] | null; error?: { message?: string | null } | null };
type SupabaseLike = { from: (table: string) => any };
type SessionExerciseSummaryRow = Pick<SessionExerciseRow, "id" | "session_id" | "exercise_id" | "is_skipped">;
type SessionSetSummaryRow = {
  session_exercise_id: string;
  weight: number;
  reps: number;
  weight_unit: "kg" | "lb" | "lbs" | null;
};

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
  searchParams,
  supabase,
  userId,
}: {
  logger?: ConsoleLike;
  searchParams?: HistorySearchParams;
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
    .order("id", { ascending: false })
    .limit(PAGE_SIZE + 1);

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
  const hasMore = fetchedSessions.length > PAGE_SIZE;
  const sessions = hasMore ? fetchedSessions.slice(0, PAGE_SIZE) : fetchedSessions;
  const sessionIds = sessions.map((session) => session.id);
  const routineIds = Array.from(new Set(
    sessions
      .map((session) => session.routine_id)
      .filter((routineId): routineId is string => Boolean(routineId)),
  ));
  const lastSession = sessions[sessions.length - 1];
  const nextCursor = hasMore && lastSession
    ? encodeHistoryCursor({ performedAt: lastSession.performed_at, id: lastSession.id })
    : null;

  const [routineRows, routineDayRows, sessionExerciseRows] = await Promise.all([
    loadOptionalRows({
      enabled: routineIds.length > 0,
      label: "routine titles",
      load: () => supabase
        .from("routines")
        .select("id, name")
        .in("id", routineIds)
        .eq("user_id", userId),
      logger,
    }),
    loadOptionalRows({
      enabled: routineIds.length > 0,
      label: "routine day metadata",
      load: () => supabase
        .from("routine_days")
        .select("routine_id, day_index, name")
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
  ]);

  const sessionExercises = sessionExerciseRows
    .map(normalizeSessionExerciseRow)
    .filter((row): row is SessionExerciseSummaryRow => Boolean(row));
  const sessionExerciseIds = sessionExercises.map((row) => row.id);
  const exerciseIds = Array.from(new Set(sessionExercises.map((row) => row.exercise_id)));

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
        .select("id, name")
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

  const routineNameById = normalizeRoutineNames(routineRows);
  const routineDayNameByKey = normalizeRoutineDayNames(routineDayRows);
  const exerciseNameById = normalizeExerciseNameRows(exerciseNameRows);
  const prEvaluationSets = normalizePrEvaluationSets(historicalSetRows);
  const { sessionCountsById } = evaluatePrSummaries(prEvaluationSets);

  const exercisesBySessionId = new Map<string, SessionExerciseSummaryRow[]>();
  for (const row of sessionExercises) {
    const current = exercisesBySessionId.get(row.session_id) ?? [];
    current.push(row);
    exercisesBySessionId.set(row.session_id, current);
  }

  const setsBySessionExerciseId = new Map<string, SessionSetSummaryRow[]>();
  for (const row of setRows.map(normalizeSessionSetRow).filter((set): set is SessionSetSummaryRow => Boolean(set))) {
    const current = setsBySessionExerciseId.get(row.session_exercise_id) ?? [];
    current.push(row);
    setsBySessionExerciseId.set(row.session_exercise_id, current);
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

    return buildSessionSummary({
      sessionRow: session,
      routineTitle,
      dayTitle,
      sessionExercises: exercisesBySessionId.get(session.id) ?? [],
      setsBySessionExerciseId,
      exerciseNameById,
      prCounts: sessionCountsById.get(session.id) ?? { ...EMPTY_PR_COUNTS },
    });
  });

  return {
    nextCursor,
    selectedSessionId: getSingleSearchParam(searchParams?.selected) ?? undefined,
    sessionItems,
    subtitle: `${sessionItems.length} logged sessions`,
  };
}
