import { getRestDayExerciseCountSummaryFromCanonicalDayOrFallback } from "@/lib/day-summary";
import { buildCanonicalDaySummaries } from "@/lib/routine-day-loader";
import { buildRoutinePlanRecapExercises, selectRoutinePlanPreviewExercises } from "@/lib/routine-plan-preview";
import { formatRoutineDayStableDisplayName, getRoutineDayResolvedWeekdayLabel } from "@/lib/routines";
import { supabaseServer } from "@/lib/supabase/server";
import { selectCanonicalWorkoutPlanSourceDays } from "@/lib/workout-plan-source-list-utils";
import type { RoutineDayRow, RoutineRow } from "@/types/db";

export type WorkoutPlanSourceListItem = {
  id: string;
  sourceRoutineId: string;
  sourceRoutineName: string;
  isCurrentRoutine: boolean;
  dayIndex: number;
  title: string;
  weekdayLabel: string;
  isRest: boolean;
  splitSummary?: {
    total: number;
    strength: number;
    cardio: number;
    bodyweight: number;
    unknown: number;
  };
  previewExercises?: Array<{
    id: string;
    name: string;
    goalLine?: string | null;
  }>;
  recapExercises?: Array<{
    id: string;
    name: string;
    progressionStateLabel?: string | null;
    signatureLabel?: string | null;
    setLabel?: string | null;
    targetLabel?: string | null;
  }>;
  remainingExerciseCount?: number;
};

function normalizeWorkoutPlanSourceTitleKey(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

type LoadWorkoutPlanSourceListArgs = {
  supabase: ReturnType<typeof supabaseServer>;
  userId: string;
  routineId: string;
  excludeDayId?: string | null;
};

const SOURCE_ROUTINE_SELECT = "id, user_id, name, cycle_length_days, schedule_mode, start_date, timezone, updated_at";
const SOURCE_ROUTINE_DAY_EXERCISE_SELECT = "id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, measurement_type, default_unit, notes, progression_playbook_id, progression_playbook_config";
const SOURCE_ROUTINE_DAY_SELECT = "id, user_id, routine_id, day_index, name, is_rest, notes, duplicate_source_routine_day_id";
const SOURCE_ROUTINE_DAY_SELECT_LEGACY = "id, user_id, routine_id, day_index, name, is_rest, notes";

function isMissingDuplicateSourceRoutineDayColumnError(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    message.includes("duplicate_source_routine_day_id")
    && message.includes("routine_days")
    && (message.includes("schema cache") || message.includes("does not exist"))
  );
}

export async function loadWorkoutPlanSourceList(args: LoadWorkoutPlanSourceListArgs): Promise<WorkoutPlanSourceListItem[]> {
  const { supabase, userId, routineId, excludeDayId } = args;

  const { data: sourceRoutinesData } = await supabase
    .from("routines")
    .select(SOURCE_ROUTINE_SELECT)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  const sourceRoutines = (sourceRoutinesData ?? []) as Array<Pick<RoutineRow, "id" | "user_id" | "name" | "cycle_length_days" | "schedule_mode" | "start_date" | "timezone" | "updated_at">>;
  const sourceRoutineIds = sourceRoutines.map((routine) => routine.id);
  if (sourceRoutineIds.length === 0) {
    return [];
  }

  const sourceRoutineById = new Map(sourceRoutines.map((routine) => [routine.id, routine]));

  const { data: routineDaysDataWithSource, error: routineDaysWithSourceError } = await supabase
    .from("routine_days")
    .select(SOURCE_ROUTINE_DAY_SELECT)
    .in("routine_id", sourceRoutineIds)
    .eq("user_id", userId)
    .order("day_index", { ascending: true });
  const routineDaysLegacyFallback = routineDaysWithSourceError && isMissingDuplicateSourceRoutineDayColumnError(routineDaysWithSourceError)
    ? await supabase
        .from("routine_days")
        .select(SOURCE_ROUTINE_DAY_SELECT_LEGACY)
        .in("routine_id", sourceRoutineIds)
        .eq("user_id", userId)
        .order("day_index", { ascending: true })
    : null;

  if (routineDaysWithSourceError && !isMissingDuplicateSourceRoutineDayColumnError(routineDaysWithSourceError)) {
    return [];
  }

  if (routineDaysLegacyFallback?.error) {
    return [];
  }

  const routineDays = ((routineDaysDataWithSource ?? routineDaysLegacyFallback?.data ?? []) as RoutineDayRow[]).map((day) => ({
    ...day,
    duplicate_source_routine_day_id: day.duplicate_source_routine_day_id ?? null,
  }));
  const routineDayIds = routineDays.map((day) => day.id);
  const { data: dayExerciseRows } = routineDayIds.length > 0
    ? await supabase
      .from("routine_day_exercises")
      .select(SOURCE_ROUTINE_DAY_EXERCISE_SELECT)
      .in("routine_day_id", routineDayIds)
      .eq("user_id", userId)
    : { data: [] };

  const canonicalDays = routineDays.length > 0
    ? await buildCanonicalDaySummaries({
      supabase,
      routineDays,
      allDayExercises: dayExerciseRows ?? [],
    })
    : { summaries: [] };
  const canonicalSummaryByDayId = new Map(canonicalDays.summaries.map((summary) => [summary.day.id, summary]));
  const exerciseCountSummaryByDayId = new Map(
    canonicalDays.summaries.map((summary) => [
      summary.day.id,
      getRestDayExerciseCountSummaryFromCanonicalDayOrFallback(summary, Boolean(summary.day.is_rest)),
    ]),
  );
  const runnableExerciseCountByDayId = new Map(
    canonicalDays.summaries.map((summary) => [summary.day.id, summary.runnableExercises.length]),
  );

  const sourceDays = selectCanonicalWorkoutPlanSourceDays({
    routineDays,
    currentRoutineId: routineId,
    excludeDayId,
    runnableExerciseCountByDayId,
  });

  const orderedItems = sourceDays
    .slice()
    .sort((left, right) => {
      const leftIsCurrentRoutine = left.routine_id === routineId;
      const rightIsCurrentRoutine = right.routine_id === routineId;

      if (leftIsCurrentRoutine !== rightIsCurrentRoutine) {
        return leftIsCurrentRoutine ? -1 : 1;
      }

      const leftRoutineUpdatedAt = sourceRoutineById.get(left.routine_id)?.updated_at ?? "";
      const rightRoutineUpdatedAt = sourceRoutineById.get(right.routine_id)?.updated_at ?? "";
      if (leftRoutineUpdatedAt !== rightRoutineUpdatedAt) {
        return leftRoutineUpdatedAt < rightRoutineUpdatedAt ? 1 : -1;
      }

      return left.day_index - right.day_index;
    })
    .map((day) => {
      const sourceRoutine = sourceRoutineById.get(day.routine_id);
      const runnableExercises = canonicalSummaryByDayId.get(day.id)?.runnableExercises ?? [];
      const previewExercises = selectRoutinePlanPreviewExercises(runnableExercises);
      const recapExercises = buildRoutinePlanRecapExercises(runnableExercises);

      return {
        id: day.id,
        sourceRoutineId: day.routine_id,
        sourceRoutineName: sourceRoutine?.name?.trim() || "Routine",
        isCurrentRoutine: day.routine_id === routineId,
        dayIndex: day.day_index,
        title: formatRoutineDayStableDisplayName({
          name: day.name,
          dayIndex: day.day_index,
          startDate: sourceRoutine?.start_date,
        }),
        weekdayLabel: getRoutineDayResolvedWeekdayLabel({
          dayIndex: day.day_index,
          startDate: sourceRoutine?.start_date,
          cycleLengthDays: sourceRoutine?.cycle_length_days,
          scheduleMode: sourceRoutine?.schedule_mode,
          profileTimeZone: sourceRoutine?.timezone,
          weekday: "short",
        }),
        isRest: Boolean(day.is_rest),
        splitSummary: exerciseCountSummaryByDayId.get(day.id),
        previewExercises,
        recapExercises,
        remainingExerciseCount: Math.max(
          runnableExercises.length - previewExercises.length,
          0,
        ),
      };
    });

  const seenTitleKeys = new Set<string>();
  return orderedItems.filter((item) => {
    const titleKey = normalizeWorkoutPlanSourceTitleKey(item.title);
    if (!titleKey) {
      return true;
    }

    if (seenTitleKeys.has(titleKey)) {
      return false;
    }

    seenTitleKeys.add(titleKey);
    return true;
  });
}
