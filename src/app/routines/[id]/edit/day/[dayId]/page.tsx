import { notFound } from "next/navigation";
import { ExercisePicker } from "@/components/ExercisePicker";
import { AppButton } from "@/components/ui/AppButton";
import { ConfirmedServerFormButton } from "@/components/destructive/ConfirmedServerFormButton";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { AppShell } from "@/components/ui/app/AppShell";
import { AppHeader } from "@/components/ui/app/AppHeader";
import { ScrollContainer } from "@/components/ui/app/ScrollContainer";
import { controlClassName } from "@/components/ui/formClasses";
import { createCustomExerciseAction, deleteCustomExerciseAction, renameCustomExerciseAction } from "@/app/actions/exercises";
import { addRoutineDayExerciseAction, reorderRoutineDayExercisesAction, saveRoutineDayAction, updateRoutineDayExerciseAction, deleteRoutineDayExerciseAction } from "@/app/routines/[id]/edit/day/actions";
import { EditableRoutineDayExerciseList } from "@/app/routines/[id]/edit/day/[dayId]/EditableRoutineDayExerciseList";
import { requireUser } from "@/lib/auth";
import { normalizeExerciseDisplayName } from "@/lib/exercise-display";
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
  if (params.sets !== null) parts.push(`${params.sets} sets`);
  const repsText = formatRepTarget(params.repsMin, params.repsMax, params.repsFallback).replace("Reps: ", "");
  if (repsText !== "-") parts.push(`${repsText} reps`);
  if (params.weight !== null) parts.push(`@ ${params.weight} ${params.weightUnit ?? "lbs"}`);
  const durationText = formatTargetDuration(params.durationSeconds);
  if ((params.measurementType === "time" || params.measurementType === "time_distance") && durationText) {
    parts.push(`Time ${durationText}`);
  }
  if (params.measurementType === "distance" || params.measurementType === "time_distance") {
    if (params.distance !== null) parts.push(`Distance ${params.distance} ${params.distanceUnit ?? "mi"}`);
    if (params.calories !== null) parts.push(`Calories ${params.calories}`);
  }
  return parts.join(" · ");
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
    if (Array.isArray(value)) return value.some((tag) => tag.toLowerCase() === "cardio");
    if (typeof value === "string") return value.split(",").some((tag) => tag.trim().toLowerCase() === "cardio");
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
  const exerciseStatsByExerciseId = await getExerciseStatsForExercises(user.id, exerciseOptions.map((exercise) => exercise.id));
  const returnTo = `/routines/${params.id}/edit/day/${params.dayId}`;
  const backHref = resolveReturnTo(searchParams?.returnTo) ?? `/routines/${params.id}/edit`;

  const editableExercises = dayExercises.map((exercise) => {
    const measurementType = exercise.measurement_type ?? exerciseMeasurementMap.get(exercise.exercise_id) ?? "reps";
    const matchingExercise = exerciseOptions.find((option) => option.id === exercise.exercise_id);
    const isCardio = hasCardioTag(matchingExercise);
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
      targetSummary: formatExerciseTargetSummary({
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
      }) || "No target",
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

  return (
    <AppShell topNavMode="none">
      <ScrollContainer>
        <section className="space-y-3.5 overflow-x-clip px-1 pb-4">
          <AppHeader
            title={`Edit Day — ${dayTitle}`}
            subtitleLeft={routine.name}
            subtitleRight={(day as RoutineDayRow).is_rest ? "Rest day" : `${dayExercises.length} planned exercise${dayExercises.length === 1 ? "" : "s"}`}
            action={<TopRightBackButton href={backHref} />}
            actionClassName="-mt-1"
          />

          {searchParams?.error ? <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{searchParams.error}</p> : null}
          {searchParams?.success ? <p className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">{searchParams.success}</p> : null}

          <form action={saveRoutineDayAction} className="space-y-3 rounded-[1.4rem] border border-border/40 bg-[rgb(var(--surface-2-soft)/0.62)] p-4 shadow-[0_6px_18px_rgba(0,0,0,0.14)]">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Day settings</p>
              <p className="text-xs text-muted">Name the day, set rest status, and keep the workout list below aligned with the rest of the routine.</p>
            </div>
            <input type="hidden" name="routineId" value={params.id} />
            <input type="hidden" name="routineDayId" value={params.dayId} />
            <label className="block text-sm">Day name
              <input name="name" defaultValue={(day as RoutineDayRow).name ?? ""} placeholder={`Day ${day.day_index}`} className={controlClassName} />
            </label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isRest" defaultChecked={(day as RoutineDayRow).is_rest} />Rest day</label>
            <AppButton type="submit" variant="primary" fullWidth>Save Day</AppButton>
          </form>

          {(day as RoutineDayRow).is_rest ? (
            <p className="rounded-[1.25rem] border border-border/45 bg-[rgb(var(--surface-2-soft)/0.62)] px-3.5 py-3 text-xs text-muted">Rest day enabled. Planned exercises stay saved, but this day will be skipped until you turn rest day off.</p>
          ) : (
            <>
              <section className="space-y-2.5">
                <div className="flex items-start justify-between gap-3 px-1">
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Planned workout</p>
                    <h2 className="text-base font-semibold text-text">Exercises for {dayTitle}</h2>
                    <p className="text-[11px] text-muted">Tap a row for exercise info. Use the handle to reorder. Keep edit and delete in trailing actions.</p>
                  </div>
                  <span className="rounded-full border border-border/45 bg-[rgb(var(--bg)/0.32)] px-2.5 py-1 text-[11px] font-semibold text-text">{dayExercises.length}</span>
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
                summary="Choose a movement, set optional targets, then add it to this day."
                defaultOpen={searchParams?.addExerciseOpen === "1"}
                className="border border-border/40 bg-[rgb(var(--surface-2-soft)/0.58)] shadow-[0_6px_18px_rgba(0,0,0,0.14)]"
                bodyClassName="space-y-3 bg-transparent"
              >
                <div className="rounded-[1rem] border border-border/35 bg-[rgb(var(--bg)/0.14)] px-3 py-2 text-xs text-muted">
                  Search or filter, choose the movement, add any targets you want, then save it to this day.
                </div>
                <CollapsibleCard
                  title="Add custom exercise"
                  summary={`${customExercises.length} saved`}
                  defaultOpen={false}
                  className="border border-border/50 bg-[rgb(var(--bg)/0.16)]"
                  bodyClassName="bg-[rgb(var(--bg)/0.3)]"
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

                <form action={addRoutineDayExerciseAction} className="space-y-2">
                  <input type="hidden" name="routineId" value={params.id} />
                  <input type="hidden" name="routineDayId" value={params.dayId} />
                  <ExercisePicker
                    exercises={exerciseOptions}
                    name="exerciseId"
                    initialSelectedId={searchParams?.exerciseId}
                    routineTargetConfig={{ weightUnit: (routine as RoutineRow).weight_unit }}
                    exerciseStats={mapExerciseStatsForPicker(exerciseOptions, exerciseStatsByExerciseId)}
                  />
                  <AppButton type="submit" variant="primary" fullWidth>Add to day</AppButton>
                </form>
              </CollapsibleCard>
            </>
          )}
        </section>
      </ScrollContainer>
    </AppShell>
  );
}
