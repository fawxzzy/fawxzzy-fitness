import { revalidatePath } from "next/cache";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { EXERCISE_OPTIONS, getExerciseName } from "@/lib/exercise-options";
import { createRoutineDaySeeds } from "@/lib/routines";
import { supabaseServer } from "@/lib/supabase/server";
import type { RoutineDayExerciseRow, RoutineDayRow, RoutineRow } from "@/types/db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    id: string;
  };
  searchParams?: {
    error?: string;
  };
};

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Request failed";
}

async function updateRoutineAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();

  const routineId = String(formData.get("routineId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  const cycleLengthDays = Number(formData.get("cycleLengthDays"));

  if (!routineId || !name || !timezone || !startDate) {
    throw new Error("Missing required fields");
  }

  if (!Number.isInteger(cycleLengthDays) || cycleLengthDays < 1 || cycleLengthDays > 365) {
    throw new Error("Cycle length must be between 1 and 365.");
  }

  const { data: existingRoutine } = await supabase
    .from("routines")
    .select("cycle_length_days")
    .eq("id", routineId)
    .eq("user_id", user.id)
    .single();

  if (!existingRoutine) {
    throw new Error("Routine not found");
  }

  const { error: routineError } = await supabase
    .from("routines")
    .update({ name, timezone, start_date: startDate, cycle_length_days: cycleLengthDays, updated_at: new Date().toISOString() })
    .eq("id", routineId)
    .eq("user_id", user.id);

  if (routineError) {
    throw new Error(routineError.message);
  }

  if (cycleLengthDays !== existingRoutine.cycle_length_days) {
    const { data: existingDays, error: daysError } = await supabase
      .from("routine_days")
      .select("id, day_index")
      .eq("routine_id", routineId)
      .eq("user_id", user.id)
      .order("day_index", { ascending: true });

    if (daysError) {
      throw new Error(daysError.message);
    }

    const existingDayIndexes = new Set((existingDays ?? []).map((day) => day.day_index));

    if (cycleLengthDays > existingRoutine.cycle_length_days) {
      const missingSeeds = createRoutineDaySeeds(cycleLengthDays, user.id, routineId).filter(
        (seed) => !existingDayIndexes.has(seed.day_index),
      );

      if (missingSeeds.length > 0) {
        const { error: insertError } = await supabase.from("routine_days").insert(missingSeeds);

        if (insertError) {
          throw new Error(insertError.message);
        }
      }
    }

    if (cycleLengthDays < existingRoutine.cycle_length_days) {
      const dayIdsToDelete = (existingDays ?? [])
        .filter((day) => day.day_index > cycleLengthDays)
        .map((day) => day.id);

      if (dayIdsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from("routine_days")
          .delete()
          .in("id", dayIdsToDelete)
          .eq("user_id", user.id);

        if (deleteError) {
          throw new Error(deleteError.message);
        }
      }
    }
  }

  revalidatePath(`/routines/${routineId}/edit`);
  revalidatePath("/routines");
  revalidatePath("/today");
}

async function updateRoutineDayAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();

  const routineId = String(formData.get("routineId") ?? "");
  const routineDayId = String(formData.get("routineDayId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const isRest = formData.get("isRest") === "on";

  if (!routineId || !routineDayId) {
    throw new Error("Missing day info");
  }

  const { error } = await supabase
    .from("routine_days")
    .update({ name: name || null, is_rest: isRest })
    .eq("id", routineDayId)
    .eq("user_id", user.id)
    .eq("routine_id", routineId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/routines/${routineId}/edit`);
  revalidatePath("/today");
}

async function addRoutineExerciseAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();

  const routineId = String(formData.get("routineId") ?? "");
  const routineDayId = String(formData.get("routineDayId") ?? "");
  const exerciseId = String(formData.get("exerciseId") ?? "").trim();
  const repRangeMinValue = String(formData.get("repRangeMin") ?? "").trim();
  const repRangeMaxValue = String(formData.get("repRangeMax") ?? "").trim();

  if (!routineId || !routineDayId || !exerciseId) {
    redirect(`/routines/${routineId}/edit?error=${encodeURIComponent("Missing exercise info")}`);
  }

  const { count } = await supabase
    .from("routine_day_exercises")
    .select("id", { head: true, count: "exact" })
    .eq("routine_day_id", routineDayId)
    .eq("user_id", user.id);

  const repRangeMin = repRangeMinValue ? Number(repRangeMinValue) : null;
  const repRangeMax = repRangeMaxValue ? Number(repRangeMaxValue) : null;

  try {
    const { error } = await supabase.from("routine_day_exercises").insert({
      user_id: user.id,
      routine_day_id: routineDayId,
      exercise_id: exerciseId,
      position: count ?? 0,
      rep_range_min: Number.isFinite(repRangeMin) ? repRangeMin : null,
      rep_range_max: Number.isFinite(repRangeMax) ? repRangeMax : null,
    });

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    redirect(`/routines/${routineId}/edit?error=${encodeURIComponent(toErrorMessage(error))}`);
  }

  revalidatePath(`/routines/${routineId}/edit`);
  revalidatePath("/today");
}

async function deleteRoutineExerciseAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();

  const routineId = String(formData.get("routineId") ?? "");
  const exerciseRowId = String(formData.get("exerciseRowId") ?? "");

  if (!routineId || !exerciseRowId) {
    throw new Error("Missing delete info");
  }

  const { error } = await supabase
    .from("routine_day_exercises")
    .delete()
    .eq("id", exerciseRowId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/routines/${routineId}/edit`);
  revalidatePath("/today");
}

export default async function EditRoutinePage({ params, searchParams }: PageProps) {
  const user = await requireUser();
  const supabase = supabaseServer();

  const { data: routine } = await supabase
    .from("routines")
    .select("id, user_id, name, cycle_length_days, start_date, timezone, updated_at")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!routine) {
    notFound();
  }

  const { data: days } = await supabase
    .from("routine_days")
    .select("id, user_id, routine_id, day_index, name, is_rest, notes")
    .eq("routine_id", params.id)
    .eq("user_id", user.id)
    .order("day_index", { ascending: true });

  const routineDays = (days ?? []) as RoutineDayRow[];

  const routineDayIds = routineDays.map((day) => day.id);
  const { data: exercises } = routineDayIds.length
    ? await supabase
        .from("routine_day_exercises")
        .select(
          "id, user_id, routine_day_id, exercise_id, position, target_sets, rep_range_min, rep_range_max, notes",
        )
        .in("routine_day_id", routineDayIds)
        .eq("user_id", user.id)
        .order("position", { ascending: true })
    : { data: [] };

  const exerciseRows = (exercises ?? []) as RoutineDayExerciseRow[];
  const exerciseMap = new Map<string, RoutineDayExerciseRow[]>();

  for (const exercise of exerciseRows) {
    const current = exerciseMap.get(exercise.routine_day_id) ?? [];
    current.push(exercise);
    exerciseMap.set(exercise.routine_day_id, current);
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit Routine</h1>
        <Link href="/routines" className="text-sm underline">
          Back
        </Link>
      </div>

      {searchParams?.error ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{searchParams.error}</p>
      ) : null}

      <form action={updateRoutineAction} className="space-y-3 rounded-md bg-white p-4 shadow-sm">
        <input type="hidden" name="routineId" value={routine.id} />

        <label className="block text-sm">
          Name
          <input
            name="name"
            required
            defaultValue={(routine as RoutineRow).name}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          Cycle length (days)
          <input
            type="number"
            name="cycleLengthDays"
            min={1}
            max={365}
            required
            defaultValue={(routine as RoutineRow).cycle_length_days}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          Timezone
          <input
            name="timezone"
            required
            defaultValue={(routine as RoutineRow).timezone}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          Start date
          <input
            type="date"
            name="startDate"
            required
            defaultValue={(routine as RoutineRow).start_date}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>

        <button type="submit" className="w-full rounded-md bg-slate-900 px-3 py-2 text-white">
          Save Routine Details
        </button>
      </form>

      <div className="space-y-3">
        {routineDays.map((day) => {
          const dayExercises = exerciseMap.get(day.id) ?? [];

          return (
            <article key={day.id} className="space-y-3 rounded-md bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold">Day {day.day_index}</p>
              <form action={updateRoutineDayAction} className="space-y-2">
                <input type="hidden" name="routineId" value={routine.id} />
                <input type="hidden" name="routineDayId" value={day.id} />
                <input
                  name="name"
                  defaultValue={day.name ?? ""}
                  placeholder={`Day ${day.day_index}`}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="isRest" defaultChecked={day.is_rest} />
                  Rest day
                </label>
                <button type="submit" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                  Save Day
                </button>
              </form>

              <ul className="space-y-1">
                {dayExercises.map((exercise) => (
                  <li key={exercise.id} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-xs">
                    <span>
                      {getExerciseName(exercise.exercise_id)}{" "}
                      {exercise.rep_range_min ? `(${exercise.rep_range_min}-${exercise.rep_range_max ?? exercise.rep_range_min} reps)` : ""}
                    </span>
                    <form action={deleteRoutineExerciseAction}>
                      <input type="hidden" name="routineId" value={routine.id} />
                      <input type="hidden" name="exerciseRowId" value={exercise.id} />
                      <button type="submit" className="text-red-600">Remove</button>
                    </form>
                  </li>
                ))}
                {dayExercises.length === 0 ? (
                  <li className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">No exercises yet.</li>
                ) : null}
              </ul>

              <form action={addRoutineExerciseAction} className="space-y-2 border-t border-slate-200 pt-3">
                <input type="hidden" name="routineId" value={routine.id} />
                <input type="hidden" name="routineDayId" value={day.id} />
                <select name="exerciseId" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                  {EXERCISE_OPTIONS.map((exercise) => (
                    <option key={exercise.id} value={exercise.id}>
                      {exercise.name}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={1}
                    name="repRangeMin"
                    placeholder="Rep min"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    min={1}
                    name="repRangeMax"
                    placeholder="Rep max"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <button type="submit" className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm text-white">
                  Add Exercise
                </button>
              </form>
            </article>
          );
        })}
      </div>
    </section>
  );
}
