import Link from "next/link";
import { notFound } from "next/navigation";
import { ExercisePicker } from "@/components/ExercisePicker";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { createCustomExerciseAction, deleteCustomExerciseAction, renameCustomExerciseAction } from "@/app/actions/exercises";
import { addRoutineDayExerciseAction, deleteRoutineDayExerciseAction, saveRoutineDayAction, updateRoutineDayExerciseAction } from "@/app/routines/[id]/edit/day/actions";
import { requireUser } from "@/lib/auth";
import { listExercises } from "@/lib/exercises";
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
  repsMin: number | null;
  repsMax: number | null;
  repsFallback: number | null;
  weight: number | null;
  durationSeconds: number | null;
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
  if (durationText) {
    parts.push(`Time ${durationText}`);
  }

  return parts.join(" · ");
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
    .select("id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, notes")
    .eq("routine_day_id", params.dayId)
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  const dayExercises = (exercises ?? []) as RoutineDayExerciseRow[];
  const dayTitle = formatDayTitle(day.day_index, (day as RoutineDayRow).name);
  const exerciseOptions = await listExercises();
  const customExercises = exerciseOptions.filter((exercise) => !exercise.is_global && exercise.user_id === user.id);
  const exerciseNameMap = new Map(exerciseOptions.map((exercise) => [exercise.id, exercise.name]));
  const returnTo = `/routines/${params.id}/edit/day/${params.dayId}`;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{dayTitle}</h1>
        <TopRightBackButton href={`/routines/${params.id}/edit`} />
      </div>

      {searchParams?.error ? <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{searchParams.error}</p> : null}
      {searchParams?.success ? <p className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">{searchParams.success}</p> : null}

      <details className="rounded-md border border-slate-300 bg-white transition-colors hover:border-[rgb(var(--border)/0.8)]">
        <summary className="cursor-pointer list-none rounded-md px-4 py-3 text-sm font-semibold transition-colors hover:bg-surface-2-soft active:bg-surface-2-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 [&::-webkit-details-marker]:hidden">+ Add custom exercise</summary>
        <div className="space-y-3 px-4 pb-4">
          <form action={createCustomExerciseAction} className="space-y-2">
            <input type="hidden" name="returnTo" value={returnTo} />
            <input name="name" required minLength={2} maxLength={80} placeholder="Exercise name" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input name="primaryMuscle" placeholder="Primary muscle (optional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <input name="equipment" placeholder="Equipment (optional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <button type="submit" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">Save Custom Exercise</button>
          </form>
          {customExercises.length > 0 ? (
            <ul className="space-y-2">
              {customExercises.map((exercise) => (
                <li key={exercise.id} className="rounded-md bg-slate-50 p-2">
                  <p className="text-xs font-semibold">{exercise.name}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <form action={renameCustomExerciseAction} className="flex gap-2">
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <input type="hidden" name="exerciseId" value={exercise.id} />
                      <input name="name" defaultValue={exercise.name} minLength={2} maxLength={80} className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs" />
                      <button type="submit" className="rounded-md border border-slate-300 px-2 py-1 text-xs">Rename</button>
                    </form>
                    <form action={deleteCustomExerciseAction}>
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <input type="hidden" name="exerciseId" value={exercise.id} />
                      <button type="submit" className="w-full rounded-md border border-red-600 bg-red-600 px-2 py-1 text-xs text-white transition-colors hover:bg-red-700">Delete</button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </details>

      <form action={saveRoutineDayAction} className="space-y-3 rounded-md bg-white p-4 shadow-sm">
        <input type="hidden" name="routineId" value={params.id} />
        <input type="hidden" name="routineDayId" value={params.dayId} />
        <label className="block text-sm">Day name
          <input name="name" defaultValue={(day as RoutineDayRow).name ?? ""} placeholder={`Day ${day.day_index}`} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isRest" defaultChecked={(day as RoutineDayRow).is_rest} />Rest day</label>
        <button type="submit" className="w-full rounded-md bg-accent px-3 py-2 text-white transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25">Save Day</button>
      </form>

      {(day as RoutineDayRow).is_rest ? (
        <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">Rest day enabled. Routine exercises stay saved but are ignored until you turn rest day off.</p>
      ) : (
        <>
          <section className="space-y-2 rounded-xl border-2 border-accent/40 bg-accent/5 p-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-text">Currently added workouts</h2>
              <span className="rounded-full border border-accent/30 bg-white px-2 py-0.5 text-xs font-medium text-text">{dayExercises.length}</span>
            </div>
            <ul className="space-y-2">
              {dayExercises.map((exercise) => {
              const targetSummary = formatExerciseTargetSummary({
                sets: exercise.target_sets,
                repsMin: exercise.target_reps_min,
                repsMax: exercise.target_reps_max,
                repsFallback: exercise.target_reps,
                weight: exercise.target_weight,
                durationSeconds: exercise.target_duration_seconds,
                weightUnit: exercise.target_weight_unit ?? (routine as RoutineRow).weight_unit,
              }) || "No target";

              return (
                <li key={exercise.id} className="rounded-md border border-accent/15 bg-white shadow-sm">
                  <details>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs [&::-webkit-details-marker]:hidden">
                      <span>
                        <span className="font-semibold">{exerciseNameMap.get(exercise.exercise_id) ?? exercise.exercise_id}</span>
                        <span className="text-slate-500"> · {targetSummary}</span>
                      </span>
                      <span className="rounded-md border border-slate-300 px-2 py-1 text-[11px]">
                        <span className="details-edit-label">Edit</span>
                        <span className="details-close-label">Close</span>
                      </span>
                    </summary>

                    <div className="space-y-2 border-t border-slate-100 px-3 pb-3 pt-2">
                      <form action={updateRoutineDayExerciseAction} className="space-y-2">
                        <input type="hidden" name="routineId" value={params.id} />
                        <input type="hidden" name="routineDayId" value={params.dayId} />
                        <input type="hidden" name="exerciseRowId" value={exercise.id} />
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          <input type="number" min={1} name="targetSets" defaultValue={exercise.target_sets ?? 1} placeholder="Sets" required className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
                          <input type="number" min={1} name="targetRepsMin" defaultValue={exercise.target_reps_min ?? ""} placeholder="Min reps" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
                          <input type="number" min={1} name="targetRepsMax" defaultValue={exercise.target_reps_max ?? ""} placeholder="Max reps" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
                          <input type="number" min={0} step="0.5" name="targetWeight" defaultValue={exercise.target_weight ?? ""} placeholder={`Weight (${(routine as RoutineRow).weight_unit})`} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
                          <select name="targetWeightUnit" defaultValue={exercise.target_weight_unit ?? (routine as RoutineRow).weight_unit} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
                            <option value="lbs">lbs</option>
                            <option value="kg">kg</option>
                          </select>
                          <input
                            name="targetDuration"
                            defaultValue={exercise.target_duration_seconds ?? ""}
                            placeholder="Time (sec or mm:ss)"
                            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <button type="submit" className="rounded-md border border-slate-300 px-3 py-1.5 text-xs">Save</button>
                          <button
                            type="submit"
                            formAction={deleteRoutineDayExerciseAction}
                            className="text-xs font-medium text-red-700 hover:text-red-800"
                          >
                            Remove
                          </button>
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
            <form action={addRoutineDayExerciseAction} className="space-y-2">
              <input type="hidden" name="routineId" value={params.id} />
              <input type="hidden" name="routineDayId" value={params.dayId} />
              <ExercisePicker exercises={exerciseOptions} name="exerciseId" initialSelectedId={searchParams?.exerciseId} />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <input type="number" min={1} name="targetSets" placeholder="Sets" required className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
                <input type="number" min={1} name="targetRepsMin" placeholder="Min reps" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
                <input type="number" min={1} name="targetRepsMax" placeholder="Max reps" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
                <input type="number" min={0} step="0.5" name="targetWeight" placeholder={`Weight (${(routine as RoutineRow).weight_unit})`} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
                <select name="targetWeightUnit" defaultValue={(routine as RoutineRow).weight_unit} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <option value="lbs">lbs</option>
                  <option value="kg">kg</option>
                </select>
                <input name="targetDuration" placeholder="Time (sec or mm:ss)" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <button type="submit" className="w-full rounded-md bg-accent px-3 py-2 text-sm text-white transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25">Add Exercise</button>
            </form>
          </CollapsibleCard>
        </>
      )}
    </section>
  );
}
