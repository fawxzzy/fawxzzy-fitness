import Link from "next/link";
import { notFound } from "next/navigation";
import { ExercisePicker } from "@/components/ExercisePicker";
import { AppButton } from "@/components/ui/AppButton";
import { ConfirmedServerFormButton } from "@/components/destructive/ConfirmedServerFormButton";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { controlClassName } from "@/components/ui/formClasses";
import { createCustomExerciseAction, deleteCustomExerciseAction, renameCustomExerciseAction } from "@/app/actions/exercises";
import { addRoutineDayExerciseAction, deleteRoutineDayExerciseAction, saveRoutineDayAction, updateRoutineDayExerciseAction } from "@/app/routines/[id]/edit/day/actions";
import { requireUser } from "@/lib/auth";
import { listExercises } from "@/lib/exercises";
import { getExerciseStatsForExercises } from "@/lib/exercise-stats";
import { mapExerciseStatsForPicker } from "@/lib/exercise-picker-stats";
import { formatRepTarget } from "@/lib/routines";
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
  };
};

function formatDayTitle(dayIndex: number, dayName: string | null) {
  const fallback = `Day ${dayIndex}`;
  const trimmedName = dayName?.trim() ?? "";
  if (!trimmedName) {
    return fallback;
  }

  if (trimmedName.toLowerCase() === fallback.toLowerCase()) {
    return fallback;
  }

  return trimmedName;
}

function formatTargetDuration(seconds: number | null) {
  if (seconds === null) return null;
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const secondsPart = seconds % 60;
  return `${minutes}:${String(secondsPart).padStart(2, "0")}`;
}

function formatExerciseTargetSummary(params: {
  sets: number | null;
  measurementType: "reps" | "time" | "distance" | "time_distance";
  repsMin: number | null;
  repsMax: number | null;
  repsFallback: number | null;
  weight: number | null;
  durationSeconds: number | null;
  distance: number | null;
  distanceUnit: "mi" | "km" | "m" | null;
  calories: number | null;
  weightUnit: "lbs" | "kg" | null;
}) {
  const parts: string[] = [];

  if (params.sets !== null) {
    parts.push(`${params.sets} sets`);
  }

  const repsText = formatRepTarget(params.repsMin, params.repsMax, params.repsFallback).replace("Reps: ", "");
  if (repsText !== "-") {
    parts.push(`${repsText} reps`);
  }

  if (params.weight !== null) {
    parts.push(`@ ${params.weight} ${params.weightUnit ?? "lbs"}`);
  }

  const durationText = formatTargetDuration(params.durationSeconds);
  if ((params.measurementType === "time" || params.measurementType === "time_distance") && durationText) {
    parts.push(`Time ${durationText}`);
  }

  if (params.measurementType === "distance" || params.measurementType === "time_distance") {
    if (params.distance !== null) {
      parts.push(`Distance ${params.distance} ${params.distanceUnit ?? "mi"}`);
    }
    if (params.calories !== null) {
      parts.push(`Calories ${params.calories}`);
    }
  }

  return parts.join(" · ");
}

function RoutineTargetInputs({
  weightUnit,
  distanceUnit,
  defaults,
}: {
  weightUnit: "lbs" | "kg";
  distanceUnit: "mi" | "km" | "m";
  defaults?: {
    targetReps?: number | null;
    targetRepsMin?: number | null;
    targetRepsMax?: number | null;
    targetWeight?: number | null;
    targetWeightUnit?: "lbs" | "kg" | null;
    targetDurationSeconds?: number | null;
    targetDistance?: number | null;
    targetDistanceUnit?: "mi" | "km" | "m" | null;
    targetCalories?: number | null;
  };
}) {
  const hasReps = defaults?.targetRepsMin !== null && defaults?.targetRepsMin !== undefined
    || defaults?.targetRepsMax !== null && defaults?.targetRepsMax !== undefined
    || defaults?.targetReps !== null && defaults?.targetReps !== undefined;
  const hasWeight = defaults?.targetWeight !== null && defaults?.targetWeight !== undefined;
  const hasTime = defaults?.targetDurationSeconds !== null && defaults?.targetDurationSeconds !== undefined;
  const hasDistance = defaults?.targetDistance !== null && defaults?.targetDistance !== undefined;
  const hasCalories = defaults?.targetCalories !== null && defaults?.targetCalories !== undefined;

  return (
    <div className="space-y-2">
      <details className="rounded-md border border-border/70 bg-[rgb(var(--bg)/0.35)] px-3 py-2">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
          <span>Add Measurement</span>
          <span aria-hidden="true" className="details-chevron text-xs text-muted">⌄</span>
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" name="measurementSelections" value="reps" defaultChecked={hasReps} />Reps</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="measurementSelections" value="weight" defaultChecked={hasWeight} />Weight</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="measurementSelections" value="time" defaultChecked={hasTime} />Time (duration)</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="measurementSelections" value="distance" defaultChecked={hasDistance} />Distance</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="measurementSelections" value="calories" defaultChecked={hasCalories} />Calories</label>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="col-span-2 grid grid-cols-2 gap-2">
            <input type="number" min={1} name="targetRepsMin" defaultValue={defaults?.targetRepsMin ?? defaults?.targetReps ?? ""} placeholder="Min reps" className={controlClassName} />
            <input type="number" min={1} name="targetRepsMax" defaultValue={defaults?.targetRepsMax ?? ""} placeholder="Max reps" className={controlClassName} />
          </div>
          <div className="col-span-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <input type="number" min={0} step="0.5" name="targetWeight" defaultValue={defaults?.targetWeight ?? ""} placeholder={`Weight (${weightUnit})`} className={controlClassName} />
            <select name="targetWeightUnit" defaultValue={defaults?.targetWeightUnit ?? weightUnit} className={controlClassName}>
              <option value="lbs">lbs</option>
              <option value="kg">kg</option>
            </select>
          </div>
          <input name="targetDuration" defaultValue={defaults?.targetDurationSeconds ?? ""} placeholder="Time (sec or mm:ss)" className={`${controlClassName} col-span-2`} />
          <div className="col-span-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <input type="number" min={0} step="0.01" name="targetDistance" defaultValue={defaults?.targetDistance ?? ""} placeholder="Distance" className={controlClassName} />
            <select name="targetDistanceUnit" defaultValue={defaults?.targetDistanceUnit ?? distanceUnit} className={controlClassName}>
              <option value="mi">mi</option>
              <option value="km">km</option>
              <option value="m">m</option>
            </select>
          </div>
          <input type="number" min={0} step="1" name="targetCalories" defaultValue={defaults?.targetCalories ?? ""} placeholder="Calories" className={`${controlClassName} col-span-2`} />
        </div>
      </details>
      <input type="hidden" name="defaultUnit" value={hasDistance ? (defaults?.targetDistanceUnit ?? distanceUnit) : "mi"} />
    </div>
  );
}

function hasCardioTag(exercise: unknown) {
  if (!exercise || typeof exercise !== "object") return false;
  const rawValues = [
    (exercise as { tags?: string[] | string | null }).tags,
    (exercise as { tag?: string[] | string | null }).tag,
    (exercise as { categories?: string[] | string | null }).categories,
    (exercise as { category?: string[] | string | null }).category,
  ];

  return rawValues.some((value) => {
    if (Array.isArray(value)) {
      return value.some((tag) => tag.toLowerCase() === "cardio");
    }
    if (typeof value === "string") {
      return value.split(",").some((tag) => tag.trim().toLowerCase() === "cardio");
    }
    return false;
  });
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

  const { data: day } = await supabase
    .from("routine_days")
    .select("id, user_id, routine_id, day_index, name, is_rest, notes")
    .eq("id", params.dayId)
    .eq("routine_id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!day) notFound();

  const { data: exercises } = await supabase
    .from("routine_day_exercises")
    .select("id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, measurement_type, default_unit, notes")
    .eq("routine_day_id", params.dayId)
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  const dayExercises = (exercises ?? []) as RoutineDayExerciseRow[];
  const dayTitle = formatDayTitle(day.day_index, (day as RoutineDayRow).name);
  const exerciseOptions = await listExercises();
  const customExercises = exerciseOptions.filter((exercise) => !exercise.is_global && exercise.user_id === user.id);
  const exerciseNameMap = new Map(exerciseOptions.map((exercise) => [exercise.id, exercise.name]));
  const exerciseMeasurementMap = new Map(exerciseOptions.map((exercise) => [exercise.id, exercise.measurement_type]));
  const exerciseUnitMap = new Map(exerciseOptions.map((exercise) => [exercise.id, exercise.default_unit]));
  const exerciseStatsByExerciseId = await getExerciseStatsForExercises(
    user.id,
    exerciseOptions.map((exercise) => exercise.id),
  );
  const returnTo = `/routines/${params.id}/edit/day/${params.dayId}`;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{dayTitle}</h1>
        <TopRightBackButton href={`/routines/${params.id}/edit`} />
      </div>

      {searchParams?.error ? <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{searchParams.error}</p> : null}
      {searchParams?.success ? <p className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">{searchParams.success}</p> : null}

      <form action={saveRoutineDayAction} className="space-y-3 rounded-xl border border-border/70 bg-[rgb(var(--bg)/0.5)] p-4">
        <input type="hidden" name="routineId" value={params.id} />
        <input type="hidden" name="routineDayId" value={params.dayId} />
        <label className="block text-sm">Day name
          <input name="name" defaultValue={(day as RoutineDayRow).name ?? ""} placeholder={`Day ${day.day_index}`} className={controlClassName} />
        </label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isRest" defaultChecked={(day as RoutineDayRow).is_rest} />Rest day</label>
        <AppButton type="submit" variant="primary" fullWidth>Save Day</AppButton>
      </form>

      {(day as RoutineDayRow).is_rest ? (
        <p className="rounded-md border border-border/60 bg-[rgb(var(--bg)/0.4)] px-3 py-2 text-xs text-muted">Rest day enabled. Routine exercises stay saved but are ignored until you turn rest day off.</p>
      ) : (
        <>
          <section className="space-y-2 rounded-xl border border-border/70 bg-[rgb(var(--bg)/0.45)] p-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-text">Currently added workouts</h2>
              <span className="rounded-full border border-border/60 bg-[rgb(var(--bg)/0.45)] px-2 py-0.5 text-xs font-medium text-text">{dayExercises.length}</span>
            </div>
            <ul className="space-y-2">
              {dayExercises.map((exercise) => {
              const measurementType = exercise.measurement_type ?? exerciseMeasurementMap.get(exercise.exercise_id) ?? "reps";
              const matchingExercise = exerciseOptions.find((option) => option.id === exercise.exercise_id);
              const isCardio = hasCardioTag(matchingExercise);
              const defaultDistanceUnit = exercise.default_unit === "km" || exercise.default_unit === "m"
                ? exercise.default_unit
                : (exerciseUnitMap.get(exercise.exercise_id) === "km" || exerciseUnitMap.get(exercise.exercise_id) === "m"
                  ? (exerciseUnitMap.get(exercise.exercise_id) as "km" | "m")
                  : "mi");
              const targetSummary = formatExerciseTargetSummary({
                sets: exercise.target_sets,
                measurementType,
                repsMin: exercise.target_reps_min,
                repsMax: exercise.target_reps_max,
                repsFallback: exercise.target_reps,
                weight: exercise.target_weight,
                durationSeconds: exercise.target_duration_seconds,
                distance: exercise.target_distance,
                distanceUnit: exercise.target_distance_unit,
                calories: exercise.target_calories,
                weightUnit: exercise.target_weight_unit ?? (routine as RoutineRow).weight_unit,
              }) || "No target";

              return (
                <li key={exercise.id} className="rounded-md border border-border/60 bg-[rgb(var(--bg)/0.35)]">
                  <details>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs [&::-webkit-details-marker]:hidden">
                      <span>
                        <span className="font-semibold">{exerciseNameMap.get(exercise.exercise_id) ?? exercise.exercise_id}</span>
                        <span className="text-muted"> · {targetSummary}</span>
                      </span>
                      <span className="rounded-md border border-border/60 bg-[rgb(var(--bg)/0.45)] px-2 py-1 text-[11px]">
                        <span className="details-edit-label">Edit</span>
                        <span className="details-close-label">Close</span>
                        <span aria-hidden="true" className="details-chevron ml-1 text-muted">⌄</span>
                      </span>
                    </summary>

                    <div className="space-y-2 border-t border-border/50 px-3 pb-3 pt-2">
                      <form action={updateRoutineDayExerciseAction} className="space-y-2">
                        <input type="hidden" name="routineId" value={params.id} />
                        <input type="hidden" name="routineDayId" value={params.dayId} />
                        <input type="hidden" name="exerciseRowId" value={exercise.id} />
                        <div className="space-y-2">
                          <input type="number" min={1} name="targetSets" defaultValue={exercise.target_sets ?? 1} placeholder={isCardio ? "Intervals" : "Sets"} required className={controlClassName} />
                          <RoutineTargetInputs
                            weightUnit={(routine as RoutineRow).weight_unit}
                            distanceUnit={defaultDistanceUnit}
                            defaults={{
                              targetReps: exercise.target_reps,
                              targetRepsMin: exercise.target_reps_min,
                              targetRepsMax: exercise.target_reps_max,
                              targetWeight: exercise.target_weight,
                              targetWeightUnit: exercise.target_weight_unit,
                              targetDurationSeconds: exercise.target_duration_seconds,
                              targetDistance: exercise.target_distance,
                              targetDistanceUnit: exercise.target_distance_unit,
                              targetCalories: exercise.target_calories,
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <AppButton type="submit" variant="secondary" size="sm" className="h-8 px-3 text-xs">Save</AppButton>
                          <ConfirmedServerFormButton
                            action={deleteRoutineDayExerciseAction}
                            hiddenFields={{ routineId: params.id, routineDayId: params.dayId, exerciseRowId: exercise.id }}
                            triggerLabel="Delete"
                            triggerClassName="h-8 px-3 text-xs"
                            modalTitle="Delete routine day exercise?"
                            modalDescription="This will remove this exercise from the routine day."
                            confirmLabel="Delete"
                            details={`Exercise: ${exerciseNameMap.get(exercise.exercise_id) ?? exercise.exercise_id}`}
                          />
                        </div>
                      </form>
                    </div>
                  </details>
                </li>
              );
              })}
            </ul>
          </section>

          <CollapsibleCard title="Add exercises" summary={`${dayExercises.length} added`} defaultOpen={searchParams?.addExerciseOpen === "1"}>
            <CollapsibleCard
              title="Add custom exercise"
              summary={`${customExercises.length} saved`}
              defaultOpen={false}
              className="border border-border/60"
              bodyClassName="bg-[rgb(var(--bg)/0.35)]"
            >
              <form action={createCustomExerciseAction} className="space-y-2">
                <input type="hidden" name="returnTo" value={returnTo} />
                <input name="name" required minLength={2} maxLength={80} placeholder="Exercise name" className={controlClassName} />
                <AppButton type="submit" variant="secondary" fullWidth>Save Custom Exercise</AppButton>
              </form>
              {customExercises.length > 0 ? (
                <ul className="mt-3 space-y-2 border-t border-border/50 pt-3">
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
                          hiddenFields={{ returnTo: returnTo, exerciseId: exercise.id }}
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

            <form action={addRoutineDayExerciseAction} className="space-y-2">
              <input type="hidden" name="routineId" value={params.id} />
              <input type="hidden" name="routineDayId" value={params.dayId} />
              <ExercisePicker exercises={exerciseOptions} name="exerciseId" initialSelectedId={searchParams?.exerciseId} routineTargetConfig={{ weightUnit: (routine as RoutineRow).weight_unit }} exerciseStats={mapExerciseStatsForPicker(exerciseOptions, exerciseStatsByExerciseId)} />
              <AppButton type="submit" variant="primary" fullWidth>Add Exercise</AppButton>
            </form>
          </CollapsibleCard>
        </>
      )}
    </section>
  );
}
