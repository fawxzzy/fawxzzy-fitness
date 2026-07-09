import { notFound } from "next/navigation";
import { AppShell } from "@/components/ui/app/AppShell";
import {
  loadWorkoutPlanEditDecisionStateAction,
  reorderRoutineDayExercisesAction,
  resolveWorkoutPlanEditDecisionAction,
  updateRoutineDayExerciseAction,
  deleteRoutineDayExerciseAction,
} from "@/app/routines/[id]/edit/day/actions";
import { EditableRoutineDayExerciseList } from "@/app/routines/[id]/edit/day/[dayId]/EditableRoutineDayExerciseList";
import { EditDaySettingsAutosaveForm } from "@/app/routines/[id]/edit/day/[dayId]/EditDaySettingsAutosaveForm";
import { DetailScreenScaffold } from "@/components/routines/day-detail/DetailScreenScaffold";
import { requireUser } from "@/lib/auth";
import { normalizeExerciseDisplayName } from "@/lib/exercise-display";
import { formatExerciseGoalSummary } from "@/lib/exercise-goal-format";
import { getExerciseNameMap } from "@/lib/exercises";
import { isCardioExercise } from "@/lib/exercise-metadata";
import { resolveEditDayAutoProgressionState } from "@/lib/edit-day-progression";
import { isMissingProgressionPlaybookColumnError, isMissingRoutineDefaultProgressionColumnError } from "@/lib/progression-schema-compat";
import { loadAccessibleRoutineIdsForCurrentTier } from "@/lib/pro-tier-access";
import { loadCanonicalExerciseCatalog } from "@/lib/routine-day-loader";
import { getRoutineDayCreateHref, getRoutineDayEditHref, resolveRoutineDayEditBackHref } from "@/lib/routine-day-navigation";
import type { SetFlowDirection } from "@/lib/set-flow-directions";
import { supabaseServer } from "@/lib/supabase/server";
import { getRestDayExerciseCountSummaryFromInputs } from "@/lib/day-summary";
import { normalizeFitnessDistanceUnit, type FitnessDistanceUnit } from "@/lib/fitness-distance-units";
import {
  loadRoutineDayExercisesWithWorkoutPlanCompat,
  loadRoutineDaysWithWorkoutPlanCompat,
  loadWorkoutPlanNames,
} from "@/lib/workout-plan-templates";
import type { RoutineDayExerciseRow, RoutineDayRow, RoutineRow } from "@/types/db";

export const dynamic = "force-dynamic";

const ROUTINE_DAY_EXERCISE_SELECT_LEGACY = "id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, measurement_type, default_unit, notes";
const ROUTINE_DAY_EXERCISE_SELECT_WITH_PROGRESSION = "id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, progression_playbook_id, progression_playbook_config, measurement_type, default_unit, notes";
const ROUTINE_SELECT_LEGACY = "id, user_id, name, weight_unit, start_date, cycle_length_days";
const ROUTINE_SELECT_WITH_PROGRESSION = `${ROUTINE_SELECT_LEGACY}, default_progression_playbook_id, default_progression_playbook_config`;

type PageProps = {
  params: {
    id: string;
    dayId: string;
  };
  searchParams?: {
    error?: string;
    success?: string;
    addExerciseOpen?: string;
    returnTo?: string;
  };
};

export default async function RoutineDayEditorPage({ params, searchParams }: PageProps) {
  const user = await requireUser();
  const supabase = supabaseServer();
  const accessResult = await loadAccessibleRoutineIdsForCurrentTier({
    supabase,
    userId: user.id,
  });
  if (accessResult.error || !accessResult.routineIds.has(params.id)) {
    notFound();
  }

  const { data: routineWithProgression, error: routineWithProgressionError } = await supabase
    .from("routines")
    .select(ROUTINE_SELECT_WITH_PROGRESSION)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();
  const { data: legacyRoutine } = routineWithProgressionError && isMissingRoutineDefaultProgressionColumnError(routineWithProgressionError)
    ? await supabase
        .from("routines")
        .select(ROUTINE_SELECT_LEGACY)
        .eq("id", params.id)
        .eq("user_id", user.id)
        .single()
    : { data: null };
  const routine = routineWithProgression ?? legacyRoutine;
  if (!routine) notFound();

  const routineDaysResult = await loadRoutineDaysWithWorkoutPlanCompat({
    supabase,
    userId: user.id,
    routineId: params.id,
  });
  const routineDays = routineDaysResult.data;

  const day = (routineDays ?? []).find((routineDay) => routineDay.id === params.dayId) as RoutineDayRow | undefined;
  if (!day) notFound();

  const exerciseRowsResult = await loadRoutineDayExercisesWithWorkoutPlanCompat({
    supabase,
    userId: user.id,
    routineDayIds: (routineDays ?? []).map((routineDay) => routineDay.id),
  });
  const exercises = exerciseRowsResult.data;

  const allRoutineDayExercises = exercises as RoutineDayExerciseRow[];
  const dayExercises = allRoutineDayExercises.filter((exercise) => exercise.routine_day_id === params.dayId);
  const existingWorkoutPlanNames = await loadWorkoutPlanNames({
    supabase,
    userId: user.id,
  });
  const exerciseNameMap = await getExerciseNameMap();
  const { canonicalExerciseIdByRawId, exerciseDetailsById } = await loadCanonicalExerciseCatalog({
    supabase,
    exercises: dayExercises,
  });
  const backHref = resolveRoutineDayEditBackHref(params.id, params.dayId, searchParams?.returnTo);
  const addExerciseHref = `${getRoutineDayEditHref(params.id, params.dayId)}/add-exercise`;
  const duplicateWorkoutPlanHref = `${getRoutineDayCreateHref(params.id)}?targetDayId=${encodeURIComponent(params.dayId)}`;
  // NOTE: Edit Day rows own a stable `orderNumber` so ORDER badges remain canonical even when the list is filtered.
  const editableExercises = dayExercises.map((exercise) => {
    const canonicalExerciseId = canonicalExerciseIdByRawId.get(exercise.exercise_id.trim()) ?? exercise.exercise_id;
    const matchingExercise = exerciseDetailsById.get(canonicalExerciseId) ?? null;
    const fallbackName = exerciseNameMap.get(canonicalExerciseId) ?? exerciseNameMap.get(exercise.exercise_id.trim()) ?? null;
    const measurementType = exercise.measurement_type ?? matchingExercise?.measurement_type ?? "reps";
    const isCardio = isCardioExercise({
      measurement_type: exercise.measurement_type ?? matchingExercise?.measurement_type ?? null,
      equipment: matchingExercise?.equipment ?? null,
      movement_pattern: matchingExercise?.movement_pattern ?? null,
      primary_muscle: matchingExercise?.primary_muscle ?? null,
      kind: matchingExercise?.kind ?? null,
      type: matchingExercise?.type ?? null,
      tags: matchingExercise?.tags ?? null,
      categories: matchingExercise?.categories ?? null,
    });
    const defaultDistanceUnit: FitnessDistanceUnit = normalizeFitnessDistanceUnit(
      exercise.default_unit ?? matchingExercise?.default_unit,
      "mi",
    );
    const name = normalizeExerciseDisplayName({
      exerciseId: canonicalExerciseId,
      name: matchingExercise?.name ?? null,
      fallbackName,
    });

    return {
      id: exercise.id,
      exerciseId: matchingExercise?.id ?? canonicalExerciseId,
      orderNumber: exercise.position,
      name,
      measurementType,
      primary_muscle: matchingExercise?.primary_muscle ?? null,
      equipment: matchingExercise?.equipment ?? null,
      movement_pattern: matchingExercise?.movement_pattern ?? null,
      kind: matchingExercise?.kind ?? null,
      type: matchingExercise?.type ?? null,
      tags: matchingExercise?.tags ?? null,
      categories: matchingExercise?.categories ?? null,
      image_path: matchingExercise?.image_path ?? null,
      image_icon_path: matchingExercise?.image_icon_path ?? null,
      image_howto_path: matchingExercise?.image_howto_path ?? null,
      slug: matchingExercise?.slug ?? null,
      targetSummary: formatExerciseGoalSummary({
        sets: exercise.target_sets,
        reps: exercise.target_reps_min ?? exercise.target_reps,
        repsMax: exercise.target_reps_max ?? exercise.target_reps,
        weight: exercise.target_weight,
        weightUnit: exercise.target_weight_unit ?? (routine as RoutineRow).weight_unit,
        durationSeconds: measurementType === "time" || measurementType === "time_distance" ? exercise.target_duration_seconds : null,
        distance: measurementType === "distance" || measurementType === "time_distance" ? exercise.target_distance : null,
        distanceUnit: exercise.target_distance_unit,
        calories: measurementType === "distance" || measurementType === "time_distance" ? exercise.target_calories : null,
        enabledMeasurements: {
          reps: exercise.target_reps_min != null || exercise.target_reps != null || exercise.target_reps_max != null,
          weight: exercise.target_weight != null,
          time: measurementType === "time" || measurementType === "time_distance",
          distance: measurementType === "distance" || measurementType === "time_distance",
          calories: (measurementType === "distance" || measurementType === "time_distance") && exercise.target_calories != null,
        },
        emptyLabel: "Goal missing",
      }),
      isCardio,
      defaultDistanceUnit,
      defaults: {
        targetSets: exercise.target_sets,
        targetReps: exercise.target_reps,
        targetRepsMin: exercise.target_reps_min,
        targetRepsMax: exercise.target_reps_max,
        targetWeight: exercise.target_weight,
        targetWeightUnit: exercise.target_weight_unit,
        targetDurationSeconds: exercise.target_duration_seconds,
        targetDistance: exercise.target_distance,
        targetDistanceUnit: exercise.target_distance_unit,
        targetCalories: exercise.target_calories,
        progressionPlaybookId: exercise.progression_playbook_id ?? null,
        progressionPlaybookConfig: exercise.progression_playbook_config ?? null,
      },
    };
  });
  const activeExerciseCountSummary = getRestDayExerciseCountSummaryFromInputs(
    editableExercises.map((exercise) => ({
      measurement_type: exercise.measurementType,
      equipment: exercise.equipment,
      movement_pattern: exercise.movement_pattern,
      primary_muscle: exercise.primary_muscle,
      isCardio: exercise.isCardio,
      kind: exercise.kind,
      type: exercise.type,
      tags: exercise.tags,
      categories: exercise.categories,
    })),
    day.is_rest,
  );
  const {
    showDayAdjustmentControl,
    initialDayAdjustmentDirection,
  }: {
    showDayAdjustmentControl: boolean;
    initialDayAdjustmentDirection: SetFlowDirection;
  } = resolveEditDayAutoProgressionState({
    exercises: editableExercises.map((exercise) => ({
      playbookId: exercise.defaults.progressionPlaybookId ?? null,
      config: exercise.defaults.progressionPlaybookConfig ?? null,
    })),
    dayIndex: day.day_index,
  });
  return (
    <AppShell topNavMode="none" className="h-[100dvh]" ambientPreset="editDay">
      <DetailScreenScaffold
        recipe="editDay"
        floatingHeader={<div id="edit-day-floating-header-slot" />}
      >
        <EditDaySettingsAutosaveForm
          routineId={params.id}
          daySummaryCounts={activeExerciseCountSummary}
          backHref={backHref}
          routineDayId={params.dayId}
          dayIndex={day.day_index}
          name={(day as RoutineDayRow).name}
          startDate={(routine as RoutineRow).start_date}
          isRest={(day as RoutineDayRow).is_rest}
          showDayAdjustmentControl={showDayAdjustmentControl}
          initialDayAdjustmentDirection={initialDayAdjustmentDirection}
          floatingHeaderSlotId="edit-day-floating-header-slot"
          resolveWorkoutPlanDecisionAction={resolveWorkoutPlanEditDecisionAction}
          workoutPlanId={day.workout_plan_template_id ?? null}
          requiresWorkoutPlanEditDecision={Boolean(day.workout_plan_template_edit_choice_required)}
          existingWorkoutPlanNames={existingWorkoutPlanNames}
        />

        <EditableRoutineDayExerciseList
          routineId={params.id}
          routineDayId={params.dayId}
          dayIndex={day.day_index}
          cycleLengthDays={(routine as RoutineRow).cycle_length_days}
          weightUnit={(routine as RoutineRow).weight_unit}
          exercises={editableExercises}
          updateAction={updateRoutineDayExerciseAction}
          resolveWorkoutPlanDecisionAction={resolveWorkoutPlanEditDecisionAction}
          loadWorkoutPlanDecisionStateAction={loadWorkoutPlanEditDecisionStateAction}
          deleteAction={deleteRoutineDayExerciseAction}
          reorderAction={reorderRoutineDayExercisesAction}
          initialIsRest={(day as RoutineDayRow).is_rest}
          addExerciseHref={addExerciseHref}
          duplicateWorkoutPlanHref={duplicateWorkoutPlanHref}
          routineDefaultProgressionPlaybookId={(routine as RoutineRow).default_progression_playbook_id ?? null}
          routineDefaultProgressionPlaybookConfig={(routine as RoutineRow).default_progression_playbook_config ?? null}
          showDayAdjustmentControl={showDayAdjustmentControl}
          initialDayAdjustmentDirection={initialDayAdjustmentDirection}
          workoutPlanId={day.workout_plan_template_id ?? null}
          requiresWorkoutPlanEditDecision={Boolean(day.workout_plan_template_edit_choice_required)}
          existingWorkoutPlanNames={existingWorkoutPlanNames}
        />
      </DetailScreenScaffold>
    </AppShell>
  );
}
