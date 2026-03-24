import { notFound } from "next/navigation";
import { AppButton } from "@/components/ui/AppButton";
import { ConfirmedServerFormButton } from "@/components/destructive/ConfirmedServerFormButton";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { AppShell } from "@/components/ui/app/AppShell";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { RoutineEditorSection } from "@/components/routines/RoutineEditorShared";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { controlClassName } from "@/components/ui/formClasses";
import { createCustomExerciseAction, deleteCustomExerciseAction, renameCustomExerciseAction } from "@/app/actions/exercises";
import { addRoutineDayExerciseAction, reorderRoutineDayExercisesAction, updateRoutineDayExerciseAction, deleteRoutineDayExerciseAction } from "@/app/routines/[id]/edit/day/actions";
import { EditableRoutineDayExerciseList } from "@/app/routines/[id]/edit/day/[dayId]/EditableRoutineDayExerciseList";
import { EditDaySettingsAutosaveForm } from "@/app/routines/[id]/edit/day/[dayId]/EditDaySettingsAutosaveForm";
import { RoutineDayAddExerciseForm } from "@/app/routines/[id]/edit/day/[dayId]/RoutineDayAddExerciseForm";
import { SubtitleText, TitleText } from "@/components/ui/text-roles";
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
    exerciseId?: string;
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
  const customExercises = exerciseOptions.filter((exercise) => !exercise.is_global && exercise.user_id === user.id);
  const exerciseNameMap = new Map(exerciseOptions.map((exercise) => [exercise.id, exercise.name]));
  const exerciseMeasurementMap = new Map(exerciseOptions.map((exercise) => [exercise.id, exercise.measurement_type]));
  const exerciseUnitMap = new Map(exerciseOptions.map((exercise) => [exercise.id, exercise.default_unit]));
  const exerciseStatsByExerciseId = await getExerciseStatsForExercises(user.id, exerciseOptions.map((exercise) => exercise.id));
  const returnTo = getRoutineDayEditHref(params.id, params.dayId);
  const backHref = resolveRoutineDayEditBackHref(params.id, searchParams?.returnTo);
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
  const activeExerciseSummary = getRestDayExerciseCountSummaryFromInputs(editableExercises.map((exercise) => ({ isCardio: exercise.isCardio })), day.is_rest).label;

  return (
    <AppShell topNavMode="none" className="h-[100dvh]">
      <ScrollScreenWithBottomActions className="px-4 pb-0 pt-0">
        <section className="mx-auto w-full max-w-md space-y-3 pb-4 pt-0">
          <EditDaySettingsAutosaveForm
            routineId={params.id}
            routineName={routine.name}
            daySummary={activeExerciseSummary}
            backHref={backHref}
            routineDayId={params.dayId}
            dayIndex={day.day_index}
            name={(day as RoutineDayRow).name}
            isRest={(day as RoutineDayRow).is_rest}
          />

          {day.is_rest ? (
            <AppPanel className="p-4">
              <div className="space-y-1">
                <TitleText as="h2" className="text-base">Rest Day</TitleText>
                <SubtitleText>Planned exercises stay saved until you turn rest day off.</SubtitleText>
              </div>
            </AppPanel>
          ) : (
            <>
              <RoutineEditorSection
                title="Planned Workout"
              >
                <EditableRoutineDayExerciseList
                  routineId={params.id}
                  routineDayId={params.dayId}
                  weightUnit={(routine as RoutineRow).weight_unit}
                  exercises={editableExercises}
                  updateAction={updateRoutineDayExerciseAction}
                  deleteAction={deleteRoutineDayExerciseAction}
                  reorderAction={reorderRoutineDayExercisesAction}
                />
              </RoutineEditorSection>

              <RoutineEditorSection
                title="Add Exercise"
                description="Choose a movement, confirm the target, and add it to this day."
              >
                <RoutineDayAddExerciseForm
                  customExerciseSection={(
                    <CollapsibleCard
                      title="Custom Exercise Tool"
                      summary={customExercises.length > 0 ? `${customExercises.length} saved` : "Optional"}
                      defaultOpen={false}
                      className="border border-border/40 bg-[rgb(var(--bg)/0.12)] shadow-none"
                      bodyClassName="space-y-3 bg-transparent"
                    >
                      <p className="text-xs text-muted">Use this only when the picker does not already have what you need.</p>
                      <form action={createCustomExerciseAction} className="space-y-2">
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <input name="name" required minLength={2} maxLength={80} placeholder="Exercise name" className={controlClassName} />
                        <AppButton type="submit" variant="secondary" fullWidth>Save Custom Exercise</AppButton>
                      </form>
                      {customExercises.length > 0 ? (
                        <ul className="space-y-2 border-t border-border/40 pt-3">
                          {customExercises.map((exercise) => (
                            <li key={exercise.id} className="rounded-xl border border-border/45 bg-[rgb(var(--bg)/0.18)] p-3">
                              <p className="text-xs font-semibold">{exercise.name}</p>
                              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <form action={renameCustomExerciseAction} className="flex gap-2">
                                  <input type="hidden" name="returnTo" value={returnTo} />
                                  <input type="hidden" name="exerciseId" value={exercise.id} />
                                  <input name="name" defaultValue={exercise.name} minLength={2} maxLength={80} className={controlClassName} />
                                  <AppButton type="submit" variant="secondary" size="sm">Rename</AppButton>
                                </form>
                                <ConfirmedServerFormButton
                                  action={deleteCustomExerciseAction}
                                  hiddenFields={{ returnTo, exerciseId: exercise.id }}
                                  triggerLabel="Delete"
                                  triggerClassName="w-full"
                                  modalTitle="Delete custom exercise?"
                                  modalDescription="This permanently deletes this custom exercise from your library."
                                  confirmLabel="Delete"
                                  details={`Exercise: ${exercise.name}`}
                                />
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </CollapsibleCard>
                  )}
                  routineId={params.id}
                  routineDayId={params.dayId}
                  exercises={exerciseOptions}
                  initialSelectedId={searchParams?.exerciseId}
                  weightUnit={(routine as RoutineRow).weight_unit}
                  addExerciseAction={addRoutineDayExerciseAction}
                  exerciseStats={mapExerciseStatsForPicker(exerciseOptions, exerciseStatsByExerciseId)}
                />
              </RoutineEditorSection>
            </>
          )}
        </section>
      </ScrollScreenWithBottomActions>
    </AppShell>
  );
}
