import { notFound } from "next/navigation";
import { AppShell } from "@/components/ui/app/AppShell";
import { ScreenScaffold } from "@/components/ui/app/ScreenScaffold";
import { RoutineEditorSection } from "@/components/routines/RoutineEditorShared";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { reorderRoutineDayExercisesAction, updateRoutineDayExerciseAction, deleteRoutineDayExerciseAction } from "@/app/routines/[id]/edit/day/actions";
import { EditableRoutineDayExerciseList } from "@/app/routines/[id]/edit/day/[dayId]/EditableRoutineDayExerciseList";
import { EditDaySettingsAutosaveForm } from "@/app/routines/[id]/edit/day/[dayId]/EditDaySettingsAutosaveForm";
import { requireUser } from "@/lib/auth";
import { normalizeExerciseDisplayName } from "@/lib/exercise-display";
import { listExercises } from "@/lib/exercises";
import { isCardioExercise } from "@/lib/exercise-metadata";
import { getExerciseStatsForExercises } from "@/lib/exercise-stats";
import { mapExerciseStatsForPicker } from "@/lib/exercise-picker-stats";
import { formatGoalSummaryText } from "@/lib/measurement-display";
import { getRoutineDayEditHref, resolveRoutineDayEditBackHref } from "@/lib/routine-day-navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getRestDayExerciseCountSummaryFromInputs } from "@/lib/day-summary";
import type { RoutineDayExerciseRow, RoutineDayRow, RoutineRow } from "@/types/db";

export const dynamic = "force-dynamic";

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

  const { data: routine } = await supabase
    .from("routines")
    .select("id, user_id, name, weight_unit")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();
  if (!routine) notFound();

  const { data: routineDays } = await supabase
    .from("routine_days")
    .select("id, user_id, routine_id, day_index, name, is_rest, notes")
    .eq("routine_id", params.id)
    .eq("user_id", user.id)
    .order("day_index", { ascending: true });

  const day = (routineDays ?? []).find((routineDay) => routineDay.id === params.dayId) as RoutineDayRow | undefined;
  if (!day) notFound();

  const { data: exercises } = await supabase
    .from("routine_day_exercises")
    .select("id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, measurement_type, default_unit, notes")
    .in("routine_day_id", (routineDays ?? []).map((routineDay) => routineDay.id))
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  const allRoutineDayExercises = (exercises ?? []) as RoutineDayExerciseRow[];
  const dayExercises = allRoutineDayExercises.filter((exercise) => exercise.routine_day_id === params.dayId);
  const exerciseOptions = await listExercises();
  const exerciseNameMap = new Map(exerciseOptions.map((exercise) => [exercise.id, exercise.name]));
  const exerciseMeasurementMap = new Map(exerciseOptions.map((exercise) => [exercise.id, exercise.measurement_type]));
  const exerciseUnitMap = new Map(exerciseOptions.map((exercise) => [exercise.id, exercise.default_unit]));
  const exerciseStatsByExerciseId = await getExerciseStatsForExercises(user.id, exerciseOptions.map((exercise) => exercise.id));
  const backHref = resolveRoutineDayEditBackHref(params.id, params.dayId, searchParams?.returnTo);
  const addExerciseHref = `${getRoutineDayEditHref(params.id, params.dayId)}/add-exercise`;
  const editableExercises = dayExercises.map((exercise) => {
    const measurementType = exercise.measurement_type ?? exerciseMeasurementMap.get(exercise.exercise_id) ?? "reps";
    const matchingExercise = exerciseOptions.find((option) => option.id === exercise.exercise_id);
    const isCardio = isCardioExercise({
      measurement_type: exercise.measurement_type ?? matchingExercise?.measurement_type ?? null,
      equipment: matchingExercise?.equipment ?? null,
      movement_pattern: matchingExercise?.movement_pattern ?? null,
    });
    const defaultDistanceUnit: "mi" | "km" | "m" = exercise.default_unit === "km" || exercise.default_unit === "m"
      ? exercise.default_unit
      : (exerciseUnitMap.get(exercise.exercise_id) === "km" || exerciseUnitMap.get(exercise.exercise_id) === "m"
        ? (exerciseUnitMap.get(exercise.exercise_id) as "km" | "m")
        : "mi");
    const name = normalizeExerciseDisplayName({
      exerciseId: exercise.exercise_id,
      fallbackName: exerciseNameMap.get(exercise.exercise_id) ?? null,
    });

    return {
      id: exercise.id,
      exerciseId: matchingExercise?.id ?? exercise.exercise_id,
      name,
      measurementType,
      equipment: matchingExercise?.equipment ?? null,
      targetSummary: formatGoalSummaryText({
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
      },
    };
  });
  const activeExerciseCountSummary = getRestDayExerciseCountSummaryFromInputs(
    editableExercises.map((exercise) => ({
      measurement_type: exercise.measurementType,
      isCardio: exercise.isCardio,
    })),
    day.is_rest,
  );
  return (
    <AppShell topNavMode="none" className="h-[100dvh]">
      <ScrollScreenWithBottomActions className="px-4 pb-0">
        <ScreenScaffold recipe="editDay" className="mx-auto w-full max-w-md">
          <EditDaySettingsAutosaveForm
            routineId={params.id}
            daySummaryCounts={activeExerciseCountSummary}
            backHref={backHref}
            routineDayId={params.dayId}
            dayIndex={day.day_index}
            name={(day as RoutineDayRow).name}
            isRest={(day as RoutineDayRow).is_rest}
          />

          <RoutineEditorSection
            action={<div id="planned-workout-header-action-slot" />}
          >
            <EditableRoutineDayExerciseList
              routineId={params.id}
              routineDayId={params.dayId}
              weightUnit={(routine as RoutineRow).weight_unit}
              exercises={editableExercises}
              updateAction={updateRoutineDayExerciseAction}
              deleteAction={deleteRoutineDayExerciseAction}
              reorderAction={reorderRoutineDayExercisesAction}
              initialIsRest={(day as RoutineDayRow).is_rest}
              addExerciseHref={addExerciseHref}
              headerActionSlotId="planned-workout-header-action-slot"
            />
          </RoutineEditorSection>
        </ScreenScaffold>
      </ScrollScreenWithBottomActions>
    </AppShell>
  );
}
