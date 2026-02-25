import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { RoutineBackButton } from "@/components/RoutineBackButton";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { controlClassName, dateControlClassName } from "@/components/ui/formClasses";
import { requireUser } from "@/lib/auth";
import { createRoutineDaySeedsFromStartDate } from "@/lib/routines";
import { getRoutineEditPath, revalidateRoutinesViews } from "@/lib/revalidation";
import { supabaseServer } from "@/lib/supabase/server";
import { ROUTINE_TIMEZONE_OPTIONS, getRoutineTimezoneLabel, isRoutineTimezone, normalizeRoutineTimezone } from "@/lib/timezones";
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

function formatRoutineDayLabel(dayIndex: number, dayName: string | null) {
  const fallback = `Day ${dayIndex}`;
  const trimmedName = dayName?.trim() ?? "";
  if (!trimmedName) {
    return fallback;
  }

  if (trimmedName.toLowerCase() === fallback.toLowerCase()) {
    return fallback;
  }

  return `${fallback}: ${trimmedName}`;
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
      const missingSeeds = createRoutineDaySeedsFromStartDate(cycleLengthDays, user.id, routineId, startDate).filter(
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

  revalidateRoutinesViews();
  revalidatePath(getRoutineEditPath(routineId));
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
        .select("id, user_id, routine_day_id, exercise_id, position")
        .in("routine_day_id", routineDayIds)
        .eq("user_id", user.id)
        .order("position", { ascending: true })
    : { data: [] };

  const exerciseRows = (exercises ?? []) as Pick<RoutineDayExerciseRow, "id" | "routine_day_id" | "exercise_id">[];
  const exerciseIds = Array.from(new Set(exerciseRows.map((row) => row.exercise_id)));

  const { data: exerciseData } = exerciseIds.length
    ? await supabase
        .from("exercises")
        .select("id, name")
        .in("id", exerciseIds)
    : { data: [] };

  const exerciseNameById = new Map((exerciseData ?? []).map((exercise) => [exercise.id, exercise.name]));
  const dayExerciseCount = new Map<string, number>();
  const dayExercisePreview = new Map<string, string[]>();

  for (const row of exerciseRows) {
    dayExerciseCount.set(row.routine_day_id, (dayExerciseCount.get(row.routine_day_id) ?? 0) + 1);
    const preview = dayExercisePreview.get(row.routine_day_id) ?? [];
    if (preview.length < 3) {
      preview.push(exerciseNameById.get(row.exercise_id) ?? "Exercise");
      dayExercisePreview.set(row.routine_day_id, preview);
    }
  }

  const routineTimezoneDefault = normalizeRoutineTimezone((routine as RoutineRow).timezone);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit Routine</h1>
        <RoutineBackButton href="/routines" />
      </div>

      {searchParams?.error ? <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{searchParams.error}</p> : null}
      {searchParams?.success ? <p className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">{searchParams.success}</p> : null}

      <form action={updateRoutineAction} className="space-y-3">
        <input type="hidden" name="routineId" value={routine.id} />
        <CollapsibleCard
          title="Routine details"
          summary={`${(routine as RoutineRow).name} · ${(routine as RoutineRow).cycle_length_days} day${(routine as RoutineRow).cycle_length_days === 1 ? "" : "s"}`}
          defaultOpen={false}
        >
          <div className="space-y-3">
            <label className="block text-sm">Name
              <input name="name" required defaultValue={(routine as RoutineRow).name} className={controlClassName} />
            </label>
            <label className="block text-sm">Cycle length (days)
              <p className="mt-1 text-xs text-slate-500">Includes workout and rest days in the repeat cycle.</p>
              <input type="number" name="cycleLengthDays" min={1} max={365} required defaultValue={(routine as RoutineRow).cycle_length_days} className={controlClassName} />
            </label>
            <label className="block text-sm">Units
              <select name="weightUnit" defaultValue={(routine as RoutineRow).weight_unit ?? "lbs"} className={controlClassName}>
                <option value="lbs">lbs</option>
                <option value="kg">kg</option>
              </select>
            </label>
            <label className="block text-sm">Timezone
              <select name="timezone" required defaultValue={routineTimezoneDefault} className={controlClassName}>
                {ROUTINE_TIMEZONE_OPTIONS.map((timeZoneOption) => (<option key={timeZoneOption} value={timeZoneOption}>{getRoutineTimezoneLabel(timeZoneOption)}</option>))}
              </select>
            </label>
            <label className="block text-sm">Start date
              <p className="mt-1 text-xs text-slate-500">Sets which calendar day is Day 1 for this cycle.</p>
              <input type="date" name="startDate" required defaultValue={(routine as RoutineRow).start_date} className={dateControlClassName} />
            </label>
          </div>
        </CollapsibleCard>
        <button type="submit" className="w-full rounded-md bg-accent px-3 py-2 text-white transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25">Save Routine</button>
      </form>

      <div className="space-y-2">
        {routineDays.map((day) => {
          const count = dayExerciseCount.get(day.id) ?? 0;
          const preview = dayExercisePreview.get(day.id) ?? [];

          return (
            <Link
              key={day.id}
              href={`/routines/${params.id}/edit/day/${day.id}`}
              className="block cursor-pointer rounded-md border border-slate-300 bg-surface-soft p-4 transition-colors hover:border-[rgb(var(--border)/0.8)] hover:bg-surface-2-soft active:bg-surface-2-active"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{formatRoutineDayLabel(day.day_index, day.name)}</p>
                <span className="text-xs text-slate-500">Tap to edit</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{day.is_rest ? "Rest day" : `${count} exercise${count === 1 ? "" : "s"}`}</p>
              {!day.is_rest && preview.length > 0 ? (
                <p className="mt-1 truncate text-xs text-slate-500">
                  {preview.join(" • ")}
                  {count > preview.length ? " • …" : ""}
                </p>
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
