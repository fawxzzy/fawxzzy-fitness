import Link from "next/link";
import { notFound } from "next/navigation";
import { AppButton } from "@/components/ui/AppButton";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { NavigationReturnInput } from "@/components/ui/NavigationReturnInput";
import { ConfirmedServerFormButton } from "@/components/destructive/ConfirmedServerFormButton";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { AppShell } from "@/components/ui/app/AppShell";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { controlClassName } from "@/components/ui/formClasses";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { createCustomExerciseAction, deleteCustomExerciseAction, renameCustomExerciseAction } from "@/app/actions/exercises";
import { addRoutineDayExerciseAction, reorderRoutineDayExercisesAction, saveRoutineDayAction, updateRoutineDayExerciseAction, deleteRoutineDayExerciseAction } from "@/app/routines/[id]/edit/day/actions";
import { EditableRoutineDayExerciseList } from "@/app/routines/[id]/edit/day/[dayId]/EditableRoutineDayExerciseList";
import { EditDayHeaderSwitcher } from "@/app/routines/[id]/edit/day/[dayId]/EditDayHeaderSwitcher";
import { RoutineDayAddExerciseForm } from "@/app/routines/[id]/edit/day/[dayId]/RoutineDayAddExerciseForm";
import { requireUser } from "@/lib/auth";
import { normalizeExerciseDisplayName } from "@/lib/exercise-display";
import { listExercises } from "@/lib/exercises";
import { formatRestDayExerciseCountSummary } from "@/lib/exercise-count-summary";
import { isCardioExercise } from "@/lib/exercise-metadata";
import { getExerciseStatsForExercises } from "@/lib/exercise-stats";
import { mapExerciseStatsForPicker } from "@/lib/exercise-picker-stats";
import { formatGoalSummaryText } from "@/lib/measurement-display";
import { supabaseServer } from "@/lib/supabase/server";
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

function resolveReturnTo(value: string | undefined) {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function formatDayTitle(dayIndex: number, dayName: string | null) {
  const fallback = `Day ${dayIndex}`;
  const trimmedName = dayName?.trim() ?? "";
  if (!trimmedName) return fallback;
  if (trimmedName.toLowerCase() === fallback.toLowerCase()) return fallback;
  return trimmedName;
}

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
  const dayTitle = formatDayTitle(day.day_index, day.name);
  const exerciseOptions = await listExercises();
  const customExercises = exerciseOptions.filter((exercise) => !exercise.is_global && exercise.user_id === user.id);
  const exerciseNameMap = new Map(exerciseOptions.map((exercise) => [exercise.id, exercise.name]));
  const exerciseMeasurementMap = new Map(exerciseOptions.map((exercise) => [exercise.id, exercise.measurement_type]));
  const exerciseUnitMap = new Map(exerciseOptions.map((exercise) => [exercise.id, exercise.default_unit]));
  const exerciseStatsByExerciseId = await getExerciseStatsForExercises(user.id, exerciseOptions.map((exercise) => exercise.id));
  const returnTo = `/routines/${params.id}/edit/day/${params.dayId}`;
  const backHref = resolveReturnTo(searchParams?.returnTo) ?? `/routines/${params.id}/edit`;
  const exerciseOptionById = new Map(exerciseOptions.map((exercise) => [exercise.id, exercise]));
  const dayExerciseSummaries = new Map<string, string>();
  for (const routineDay of routineDays ?? []) {
    const summaryLabel = formatRestDayExerciseCountSummary(
      allRoutineDayExercises
        .filter((exercise) => exercise.routine_day_id === routineDay.id)
        .map((exercise) => {
          const matchingExercise = exerciseOptionById.get(exercise.exercise_id);
          return {
            measurement_type: exercise.measurement_type ?? matchingExercise?.measurement_type ?? null,
            equipment: matchingExercise?.equipment ?? null,
            movement_pattern: matchingExercise?.movement_pattern ?? null,
          };
        }),
      routineDay.is_rest,
    ).label;

    dayExerciseSummaries.set(routineDay.id, summaryLabel);
  }

  const switcherDays = (routineDays ?? []).map((routineDay) => ({
    id: routineDay.id,
    dayIndex: routineDay.day_index,
    name: formatDayTitle(routineDay.day_index, routineDay.name),
    isRest: routineDay.is_rest,
    exerciseSummary: dayExerciseSummaries.get(routineDay.id) ?? formatRestDayExerciseCountSummary([], routineDay.is_rest).label,
  }));


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
  const activeExerciseSummary = formatRestDayExerciseCountSummary(editableExercises.map((exercise) => ({ isCardio: exercise.isCardio })), day.is_rest).label;

  return (
    <AppShell topNavMode="none">
      <ScrollScreenWithBottomActions>
        <section className="space-y-3.5 overflow-x-clip px-1 pb-4">
          <EditDayHeaderSwitcher
            routineId={params.id}
            routineName={routine.name}
            days={switcherDays}
            activeDayId={params.dayId}
            activeDayTitle={dayTitle}
            activeDaySummary={activeExerciseSummary}
            backHref={backHref}
          />

          {searchParams?.error ? <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{searchParams.error}</p> : null}
          {searchParams?.success ? <p className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">{searchParams.success}</p> : null}

          <form id="routine-day-settings-form" action={saveRoutineDayAction} className="space-y-3 rounded-[1.4rem] border border-border/40 bg-[rgb(var(--surface-2-soft)/0.62)] p-4 shadow-[0_6px_18px_rgba(0,0,0,0.14)]">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Day settings</p>
              <p className="text-xs text-muted">Update the day name or rest state here. Save and cancel stay in the page footer.</p>
            </div>
            <input type="hidden" name="routineId" value={params.id} />
            <input type="hidden" name="routineDayId" value={params.dayId} />
            <NavigationReturnInput fallbackHref={`/routines/${params.id}/edit`} value={backHref} />
            <label className="block text-sm">Day name
              <input name="name" defaultValue={(day as RoutineDayRow).name ?? ""} placeholder={`Day ${day.day_index}`} className={controlClassName} />
            </label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isRest" defaultChecked={(day as RoutineDayRow).is_rest} />Rest day</label>
          </form>

          {day.is_rest ? (
            <p className="rounded-[1.25rem] border border-border/45 bg-[rgb(var(--surface-2-soft)/0.62)] px-3.5 py-3 text-sm text-muted">Rest day enabled. Planned exercises stay saved, but this day stays non-runnable until you turn rest day off.</p>
          ) : (
            <>
              <section className="space-y-2.5">
                <div className="rounded-[1.25rem] border border-border/45 bg-[rgb(var(--surface-2-soft)/0.52)] px-3.5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Planned workout</p>
                      <h2 className="text-base font-semibold text-text">{dayTitle}</h2>
                      <p className="text-sm text-muted">Same row language as Today and View Day, with edit controls kept in the trailing actions.</p>
                    </div>
                    <span className="rounded-full border border-border/45 bg-[rgb(var(--bg)/0.32)] px-2.5 py-1 text-[11px] font-semibold text-text">{activeExerciseSummary}</span>
                  </div>
                </div>
                <EditableRoutineDayExerciseList
                  routineId={params.id}
                  routineDayId={params.dayId}
                  weightUnit={(routine as RoutineRow).weight_unit}
                  exercises={editableExercises}
                  updateAction={updateRoutineDayExerciseAction}
                  deleteAction={deleteRoutineDayExerciseAction}
                  reorderAction={reorderRoutineDayExercisesAction}
                />
              </section>

              <CollapsibleCard
                title="Add exercises"
                summary="Choose a movement, confirm it, add an optional goal, then save it to this day."
                defaultOpen={searchParams?.addExerciseOpen === "1"}
                className="border border-border/40 bg-[rgb(var(--surface-2-soft)/0.58)] shadow-[0_6px_18px_rgba(0,0,0,0.14)]"
                bodyClassName="space-y-3 bg-transparent"
              >
                <RoutineDayAddExerciseForm
                  customExerciseSection={(
                    <CollapsibleCard
                      title="Custom exercise tool"
                      summary={customExercises.length > 0 ? `${customExercises.length} saved` : "Optional"}
                      defaultOpen={false}
                      className="border border-border/50 bg-[rgb(var(--bg)/0.16)]"
                      bodyClassName="space-y-3 bg-[rgb(var(--bg)/0.3)]"
                    >
                      <p className="text-xs text-muted">Use this only when the picker does not already have what you need.</p>
                      <form action={createCustomExerciseAction} className="space-y-2">
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <input name="name" required minLength={2} maxLength={80} placeholder="Exercise name" className={controlClassName} />
                        <AppButton type="submit" variant="secondary" fullWidth>Save Custom Exercise</AppButton>
                      </form>
                      {customExercises.length > 0 ? (
                        <ul className="space-y-2 border-t border-border/50 pt-3">
                          {customExercises.map((exercise) => (
                            <li key={exercise.id} className="rounded-md border border-border/60 bg-[rgb(var(--bg)/0.35)] p-2">
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
              </CollapsibleCard>
            </>
          )}
          <PublishBottomActions>
            <BottomActionSplit
              primary={<AppButton form="routine-day-settings-form" type="submit" variant="primary" fullWidth>Save Day</AppButton>}
              secondary={(
                <Link href={backHref} className={getAppButtonClassName({ variant: "secondary", fullWidth: true })}>
                  Cancel
                </Link>
              )}
            />
          </PublishBottomActions>
        </section>
      </ScrollScreenWithBottomActions>
    </AppShell>
  );
}
