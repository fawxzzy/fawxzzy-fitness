import { getRestDayExerciseCountSummaryFromCanonicalDayOrFallback } from "@/lib/day-summary";
import { buildCanonicalDaySummaries } from "@/lib/routine-day-loader";
import { buildRoutinePlanRecapExercises, selectRoutinePlanPreviewExercises } from "@/lib/routine-plan-preview";
import { formatRoutineDayStableDisplayName, getRoutineDayResolvedWeekdayLabel } from "@/lib/routines";
import { supabaseServer } from "@/lib/supabase/server";
import { dedupeWorkoutPlanSourceItemsByTitle, selectCanonicalWorkoutPlanSourceDays } from "@/lib/workout-plan-source-list-utils";
import {
  isMissingWorkoutPlanTemplateTableError,
  loadRoutineDaysWithTemplateCompat,
  loadRoutineDayExercisesWithTemplateCompat,
  WORKOUT_PLAN_TEMPLATE_EXERCISE_SELECT,
  WORKOUT_PLAN_TEMPLATE_SELECT,
} from "@/lib/workout-plan-templates";
import type {
  RoutineDayExerciseRow,
  RoutineDayRow,
  RoutineRow,
  WorkoutPlanTemplateExerciseRow,
  WorkoutPlanTemplateRow,
} from "@/types/db";

export type WorkoutPlanSourceListItem = {
  id: string;
  workoutPlanTemplateId?: string | null;
  sourceRoutineDayId?: string | null;
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

type LoadWorkoutPlanSourceListArgs = {
  supabase: ReturnType<typeof supabaseServer>;
  userId: string;
  routineId: string;
  excludeDayId?: string | null;
};

const SOURCE_ROUTINE_SELECT = "id, user_id, name, cycle_length_days, schedule_mode, start_date, timezone, updated_at";

function chooseRepresentativeTemplateDay(args: {
  linkedDays: RoutineDayRow[];
  currentRoutineId: string;
  sourceRoutineDayId?: string | null;
}) {
  if (args.linkedDays.length === 0) {
    return null;
  }

  const explicitSourceDay = args.sourceRoutineDayId
    ? args.linkedDays.find((day) => day.id === args.sourceRoutineDayId) ?? null
    : null;
  if (explicitSourceDay) {
    return explicitSourceDay;
  }

  const currentRoutineDay = args.linkedDays.find((day) => day.routine_id === args.currentRoutineId) ?? null;
  if (currentRoutineDay) {
    return currentRoutineDay;
  }

  return args.linkedDays
    .slice()
    .sort((left, right) => left.day_index - right.day_index)[0] ?? null;
}

async function buildTemplateBackedWorkoutPlanSourceList(args: LoadWorkoutPlanSourceListArgs): Promise<{
  items: WorkoutPlanSourceListItem[];
  hasUntemplatedSourceDays: boolean;
} | null> {
  const { supabase, userId, routineId } = args;

  const { data: templatesData, error: templatesError } = await supabase
    .from("workout_plan_templates")
    .select(WORKOUT_PLAN_TEMPLATE_SELECT)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (templatesError && isMissingWorkoutPlanTemplateTableError(templatesError)) {
    return null;
  }

  if (templatesError) {
    return null;
  }

  const templates = (templatesData ?? []) as WorkoutPlanTemplateRow[];
  if (templates.length === 0) {
    return null;
  }

  const templateIds = templates.map((template) => template.id);
  const { data: templateExercisesData, error: templateExercisesError } = await supabase
    .from("workout_plan_template_exercises")
    .select(WORKOUT_PLAN_TEMPLATE_EXERCISE_SELECT)
    .in("workout_plan_template_id", templateIds)
    .eq("user_id", userId)
    .order("position", { ascending: true });

  if (templateExercisesError) {
    return null;
  }

  const { data: sourceRoutinesData } = await supabase
    .from("routines")
    .select(SOURCE_ROUTINE_SELECT)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  const sourceRoutines = (sourceRoutinesData ?? []) as Array<Pick<RoutineRow, "id" | "user_id" | "name" | "cycle_length_days" | "schedule_mode" | "start_date" | "timezone" | "updated_at">>;
  const sourceRoutineById = new Map(sourceRoutines.map((routine) => [routine.id, routine]));

  const routineDaysResult = await loadRoutineDaysWithTemplateCompat({
    supabase,
    userId,
    routineIds: sourceRoutines.map((routine) => routine.id),
  });
  if (routineDaysResult.error) {
    return null;
  }

  const linkedDaysByTemplateId = new Map<string, RoutineDayRow[]>();
  let hasUntemplatedSourceDays = false;
  for (const day of routineDaysResult.data as RoutineDayRow[]) {
    if (!day.is_rest && !day.workout_plan_template_id) {
      hasUntemplatedSourceDays = true;
    }
    if (!day.workout_plan_template_id) {
      continue;
    }
    const current = linkedDaysByTemplateId.get(day.workout_plan_template_id) ?? [];
    current.push(day);
    linkedDaysByTemplateId.set(day.workout_plan_template_id, current);
  }

  const pseudoDays = templates.map((template, index) => {
    const linkedDays = linkedDaysByTemplateId.get(template.id) ?? [];
    const representativeDay = chooseRepresentativeTemplateDay({
      linkedDays,
      currentRoutineId: routineId,
      sourceRoutineDayId: template.source_routine_day_id ?? null,
    });
    return {
      id: template.id,
      user_id: template.user_id,
      routine_id: representativeDay?.routine_id ?? "",
      day_index: representativeDay?.day_index ?? (index + 1),
      name: template.name,
      is_rest: template.is_rest,
      notes: null,
      duplicate_source_routine_day_id: representativeDay?.duplicate_source_routine_day_id ?? null,
      workout_plan_template_id: template.id,
      workout_plan_template_edit_choice_required: false,
    } satisfies RoutineDayRow;
  });

  const pseudoExercises = ((templateExercisesData ?? []) as WorkoutPlanTemplateExerciseRow[]).map((exercise) => ({
    id: exercise.id,
    user_id: exercise.user_id,
    routine_day_id: exercise.workout_plan_template_id,
    exercise_id: exercise.exercise_id,
    position: exercise.position,
    target_sets: exercise.target_sets,
    target_reps: exercise.target_reps,
    target_reps_min: exercise.target_reps_min,
    target_reps_max: exercise.target_reps_max,
    target_weight: exercise.target_weight,
    target_weight_unit: exercise.target_weight_unit,
    target_duration_seconds: exercise.target_duration_seconds,
    target_distance: exercise.target_distance,
    target_distance_unit: exercise.target_distance_unit,
    target_calories: exercise.target_calories,
    measurement_type: exercise.measurement_type,
    default_unit: exercise.default_unit,
    notes: exercise.notes,
    progression_playbook_id: exercise.progression_playbook_id ?? null,
    progression_playbook_config: exercise.progression_playbook_config ?? null,
    workout_plan_template_exercise_id: exercise.id,
  } satisfies RoutineDayExerciseRow));

  const canonicalDays = pseudoDays.length > 0
    ? await buildCanonicalDaySummaries({
      supabase,
      routineDays: pseudoDays,
      allDayExercises: pseudoExercises,
      metadataMode: "preview",
    })
    : { summaries: [] };

  const canonicalSummaryByDayId = new Map(canonicalDays.summaries.map((summary) => [summary.day.id, summary]));
  const orderedItems = templates
    .filter((template) => !template.is_rest)
    .map((template): WorkoutPlanSourceListItem | null => {
      const summary = canonicalSummaryByDayId.get(template.id);
      const runnableExercises = summary?.runnableExercises ?? [];
      if (runnableExercises.length <= 0) {
        return null;
      }

      const previewExercises = selectRoutinePlanPreviewExercises(runnableExercises);
      const recapExercises = buildRoutinePlanRecapExercises(runnableExercises);
      const representativeDay = chooseRepresentativeTemplateDay({
        linkedDays: linkedDaysByTemplateId.get(template.id) ?? [],
        currentRoutineId: routineId,
        sourceRoutineDayId: template.source_routine_day_id ?? null,
      });
      const sourceRoutine = representativeDay ? sourceRoutineById.get(representativeDay.routine_id) : null;

      return {
        id: template.id,
        workoutPlanTemplateId: template.id,
        sourceRoutineDayId: representativeDay?.id ?? template.source_routine_day_id ?? null,
        sourceRoutineId: representativeDay?.routine_id ?? "",
        sourceRoutineName: sourceRoutine?.name?.trim() || "Template",
        isCurrentRoutine: representativeDay?.routine_id === routineId,
        dayIndex: representativeDay?.day_index ?? 1,
        title: template.name,
        weekdayLabel: representativeDay
          ? getRoutineDayResolvedWeekdayLabel({
              dayIndex: representativeDay.day_index,
              startDate: sourceRoutine?.start_date,
              cycleLengthDays: sourceRoutine?.cycle_length_days,
              scheduleMode: sourceRoutine?.schedule_mode,
              profileTimeZone: sourceRoutine?.timezone,
              weekday: "short",
            })
          : "",
        isRest: template.is_rest,
        splitSummary: getRestDayExerciseCountSummaryFromCanonicalDayOrFallback(summary, false),
        previewExercises,
        recapExercises,
        remainingExerciseCount: Math.max(
          runnableExercises.length - previewExercises.length,
          0,
        ),
      };
    })
    .filter((item): item is WorkoutPlanSourceListItem => item !== null)
    .sort((left, right) => {
      const leftTemplate = templates.find((template) => template.id === left.id);
      const rightTemplate = templates.find((template) => template.id === right.id);
      const leftUpdatedAt = leftTemplate?.updated_at ?? "";
      const rightUpdatedAt = rightTemplate?.updated_at ?? "";
      if (leftUpdatedAt !== rightUpdatedAt) {
        return leftUpdatedAt < rightUpdatedAt ? 1 : -1;
      }
      return left.title.localeCompare(right.title);
    });

  return {
    items: dedupeWorkoutPlanSourceItemsByTitle(orderedItems),
    hasUntemplatedSourceDays,
  };
}

async function buildLegacyWorkoutPlanSourceList(args: LoadWorkoutPlanSourceListArgs): Promise<WorkoutPlanSourceListItem[]> {
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
  const routineDaysResult = await loadRoutineDaysWithTemplateCompat({
    supabase,
    userId,
    routineIds: sourceRoutineIds,
  });
  if (routineDaysResult.error) {
    return [];
  }

  const routineDays = routineDaysResult.data as RoutineDayRow[];
  const routineDayIds = routineDays.map((day) => day.id);
  const dayExerciseRowsResult = await loadRoutineDayExercisesWithTemplateCompat({
    supabase,
    userId,
    routineDayIds,
  });
  if (dayExerciseRowsResult.error) {
    return [];
  }

  const canonicalDays = routineDays.length > 0
    ? await buildCanonicalDaySummaries({
      supabase,
      routineDays,
      allDayExercises: dayExerciseRowsResult.data,
      metadataMode: "preview",
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
        workoutPlanTemplateId: day.workout_plan_template_id ?? null,
        sourceRoutineDayId: day.id,
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
      } satisfies WorkoutPlanSourceListItem;
    });

  return dedupeWorkoutPlanSourceItemsByTitle(orderedItems);
}

export async function loadWorkoutPlanSourceList(args: LoadWorkoutPlanSourceListArgs): Promise<WorkoutPlanSourceListItem[]> {
  const templateBackedList = await buildTemplateBackedWorkoutPlanSourceList(args);

  if (templateBackedList === null) {
    return await buildLegacyWorkoutPlanSourceList(args);
  }

  if (!templateBackedList.hasUntemplatedSourceDays) {
    return templateBackedList.items;
  }

  const legacyList = await buildLegacyWorkoutPlanSourceList(args);
  return dedupeWorkoutPlanSourceItemsByTitle([
    ...templateBackedList.items,
    ...legacyList,
  ]);
}
