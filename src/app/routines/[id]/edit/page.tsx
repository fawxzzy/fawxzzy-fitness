import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { RoutineBackButton } from "@/components/RoutineBackButton";
import { createCustomExerciseAction, deleteCustomExerciseAction, renameCustomExerciseAction } from "@/app/actions/exercises";
import { requireUser } from "@/lib/auth";
import { listExercises } from "@/lib/exercises";
import { createRoutineDaySeeds } from "@/lib/routines";
import { supabaseServer } from "@/lib/supabase/server";
import { ROUTINE_TIMEZONE_OPTIONS, isRoutineTimezone } from "@/lib/timezones";
import type { RoutineDayExerciseRow, RoutineDayRow, RoutineRow } from "@/types/db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    id: string;
  };
  searchParams?: {
    error?: string;
    success?: string;
    exerciseId?: string;
  };
};

async function updateRoutineAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();

  const routineId = String(formData.get("routineId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  const cycleLengthDays = Number(formData.get("cycleLengthDays"));
  const weightUnit = String(formData.get("weightUnit") ?? "lbs").trim();

  if (!routineId || !name || !timezone || !startDate) {
    throw new Error("Missing required fields");
  }

  if (!isRoutineTimezone(timezone)) {
    throw new Error("Please select a supported timezone.");
  }

  if (weightUnit !== "lbs" && weightUnit !== "kg") {
    throw new Error("Weight unit must be lbs or kg.");
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
    .update({
      name,
      timezone,
      start_date: startDate,
      cycle_length_days: cycleLengthDays,
      weight_unit: weightUnit,
      updated_at: new Date().toISOString(),
    })
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
        if (insertError) throw new Error(insertError.message);
      }
    }

    if (cycleLengthDays < existingRoutine.cycle_length_days) {
      const dayIdsToDelete = (existingDays ?? []).filter((day) => day.day_index > cycleLengthDays).map((day) => day.id);

      if (dayIdsToDelete.length > 0) {
        const { error: deleteError } = await supabase.from("routine_days").delete().in("id", dayIdsToDelete).eq("user_id", user.id);
        if (deleteError) throw new Error(deleteError.message);
      }
    }
  }

  revalidatePath("/routines");
  revalidatePath(`/routines/${routineId}/edit`);
  revalidatePath("/today");
  redirect("/routines");
}

export default async function EditRoutinePage({ params, searchParams }: PageProps) {
  const user = await requireUser();
  const supabase = supabaseServer();

  const { data: routine } = await supabase
    .from("routines")
    .select("id, user_id, name, cycle_length_days, start_date, timezone, updated_at, weight_unit")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!routine) notFound();

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
        .select("id, user_id, routine_day_id")
        .in("routine_day_id", routineDayIds)
        .eq("user_id", user.id)
    : { data: [] };

  const exerciseRows = (exercises ?? []) as Pick<RoutineDayExerciseRow, "id" | "routine_day_id">[];
  const dayExerciseCount = new Map<string, number>();
  for (const row of exerciseRows) {
    dayExerciseCount.set(row.routine_day_id, (dayExerciseCount.get(row.routine_day_id) ?? 0) + 1);
  }

  const exerciseOptions = await listExercises();
  const customExercises = exerciseOptions.filter((exercise) => !exercise.is_global && exercise.user_id === user.id);
  const routineTimezoneDefault = isRoutineTimezone((routine as RoutineRow).timezone)
    ? (routine as RoutineRow).timezone
    : "America/Toronto";

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit Routine</h1>
        <RoutineBackButton href="/routines" />
      </div>

      {searchParams?.error ? <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{searchParams.error}</p> : null}
      {searchParams?.success ? <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{searchParams.success}</p> : null}

      <details className="rounded-md bg-white p-4 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold">+ Add custom exercise</summary>
        <div className="mt-3 space-y-3">
          <form action={createCustomExerciseAction} className="space-y-2">
            <input type="hidden" name="returnTo" value={`/routines/${params.id}/edit`} />
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
                      <input type="hidden" name="returnTo" value={`/routines/${params.id}/edit`} />
                      <input type="hidden" name="exerciseId" value={exercise.id} />
                      <input name="name" defaultValue={exercise.name} minLength={2} maxLength={80} className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs" />
                      <button type="submit" className="rounded-md border border-slate-300 px-2 py-1 text-xs">Rename</button>
                    </form>
                    <form action={deleteCustomExerciseAction}>
                      <input type="hidden" name="returnTo" value={`/routines/${params.id}/edit`} />
                      <input type="hidden" name="exerciseId" value={exercise.id} />
                      <button type="submit" className="w-full rounded-md border border-red-300 px-2 py-1 text-xs text-red-700">Delete</button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </details>

      <form action={updateRoutineAction} className="space-y-3 rounded-md bg-white p-4 shadow-sm">
        <input type="hidden" name="routineId" value={routine.id} />
        <label className="block text-sm">Name
          <input name="name" required defaultValue={(routine as RoutineRow).name} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
        </label>
        <label className="block text-sm">Cycle length (days)
          <input type="number" name="cycleLengthDays" min={1} max={365} required defaultValue={(routine as RoutineRow).cycle_length_days} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
        </label>
        <label className="block text-sm">Units
          <select name="weightUnit" defaultValue={(routine as RoutineRow).weight_unit ?? "lbs"} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">
            <option value="lbs">lbs</option>
            <option value="kg">kg</option>
          </select>
        </label>
        <label className="block text-sm">Timezone
          <select name="timezone" required defaultValue={routineTimezoneDefault} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">
            {ROUTINE_TIMEZONE_OPTIONS.map((timeZoneOption) => (<option key={timeZoneOption} value={timeZoneOption}>{timeZoneOption}</option>))}
          </select>
        </label>
        <label className="block text-sm">Start date
          <input type="date" name="startDate" required defaultValue={(routine as RoutineRow).start_date} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
        </label>
        <button type="submit" className="w-full rounded-md bg-slate-900 px-3 py-2 text-white">Save Routine</button>
      </form>

      <div className="space-y-2">
        {routineDays.map((day) => {
          const count = dayExerciseCount.get(day.id) ?? 0;
          return (
            <Link key={day.id} href={`/routines/${params.id}/edit/day/${day.id}`} className="block rounded-md bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">Day {day.day_index}: {day.name ?? `Day ${day.day_index}`}</p>
                <span className="text-xs text-slate-500">Edit</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{day.is_rest ? "Rest day" : `${count} exercise${count === 1 ? "" : "s"}`}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
