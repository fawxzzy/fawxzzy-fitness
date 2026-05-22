import { buildProgressionHistoryDisplayModel, type ProgressionHistoryDisplayModel } from "@/lib/progression-history-display";
import {
  buildProgressionHistoryFilterOptions,
  getProgressionHistoryDateRangeEndIso,
  getProgressionHistoryDateRangeStartIso,
  parseProgressionHistoryFilters,
  type ProgressionHistorySearchParams,
} from "@/lib/progression-history-filters";
import type { supabaseServer } from "@/lib/supabase/server";
import type { ExerciseRow, ProgressionEventRow, RoutineRow } from "@/types/db";

export type ProgressionHistoryPageData = ProgressionHistoryDisplayModel;
type ProgressionEventOptionRow = Pick<ProgressionEventRow, "event_type" | "routine_id" | "exercise_id">;

function toNameMap<T extends { id: string; name?: string | null }>(rows: T[] | null | undefined) {
  return new Map(
    (rows ?? [])
      .map((row) => [row.id, row.name?.trim() || null] as const)
      .filter((entry): entry is [string, string] => Boolean(entry[0] && entry[1])),
  );
}

export async function loadProgressionHistoryPageData(args: {
  supabase: ReturnType<typeof supabaseServer>;
  userId: string;
  searchParams?: ProgressionHistorySearchParams;
}): Promise<ProgressionHistoryPageData> {
  const filters = parseProgressionHistoryFilters(args.searchParams);
  const { data: allEventsData, error: allEventsError } = await args.supabase
    .from("progression_events")
    .select("event_type, routine_id, exercise_id")
    .eq("user_id", args.userId);

  if (allEventsError) {
    throw allEventsError;
  }

  let visibleEventsQuery = args.supabase
    .from("progression_events")
    .select("id, user_id, routine_id, routine_day_exercise_id, exercise_id, event_type, from_target, to_target, method, vector, step, reason, source_session_id, created_at")
    .eq("user_id", args.userId);

  if (filters.eventType) {
    visibleEventsQuery = visibleEventsQuery.eq("event_type", filters.eventType);
  }
  if (filters.routineId) {
    visibleEventsQuery = visibleEventsQuery.eq("routine_id", filters.routineId);
  }
  if (filters.exerciseId) {
    visibleEventsQuery = visibleEventsQuery.eq("exercise_id", filters.exerciseId);
  }

  const dateFromIso = getProgressionHistoryDateRangeStartIso(filters.dateFrom);
  const dateToIso = getProgressionHistoryDateRangeEndIso(filters.dateTo);
  if (dateFromIso) {
    visibleEventsQuery = visibleEventsQuery.gte("created_at", dateFromIso);
  }
  if (dateToIso) {
    visibleEventsQuery = visibleEventsQuery.lte("created_at", dateToIso);
  }

  const { data: eventsData, error: eventsError } = await visibleEventsQuery
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (eventsError) {
    throw eventsError;
  }

  const allEvents = (allEventsData ?? []) as ProgressionEventOptionRow[];
  const events = (eventsData ?? []) as ProgressionEventRow[];
  const routineIds = Array.from(new Set(allEvents.map((event) => event.routine_id).filter(Boolean)));
  const exerciseIds = Array.from(new Set(allEvents.map((event) => event.exercise_id).filter(Boolean)));

  const { data: routinesData, error: routinesError } = routineIds.length > 0
    ? await args.supabase
        .from("routines")
        .select("id, name")
        .eq("user_id", args.userId)
        .in("id", routineIds)
    : { data: [], error: null };

  if (routinesError) {
    throw routinesError;
  }

  const { data: exercisesData, error: exercisesError } = exerciseIds.length > 0
    ? await args.supabase
        .from("exercises")
        .select("id, name")
        .in("id", exerciseIds)
    : { data: [], error: null };

  if (exercisesError) {
    throw exercisesError;
  }

  const routineNameById = toNameMap((routinesData ?? []) as Pick<RoutineRow, "id" | "name">[]);
  const exerciseNameById = toNameMap((exercisesData ?? []) as Pick<ExerciseRow, "id" | "name">[]);

  return buildProgressionHistoryDisplayModel({
    events,
    routineNameById,
    exerciseNameById,
    filters,
    filterOptions: buildProgressionHistoryFilterOptions({
      events: allEvents,
      routineNameById,
      exerciseNameById,
      filters,
    }),
    totalEventCount: allEvents.length,
  });
}
