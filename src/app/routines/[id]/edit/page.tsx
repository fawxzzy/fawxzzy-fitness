import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { RoutineBackButton } from "@/components/RoutineBackButton";
import { AppButton } from "@/components/ui/AppButton";
import { ConfirmedServerFormButton } from "@/components/destructive/ConfirmedServerFormButton";
import { RoutineSaveButton } from "@/app/routines/[id]/edit/RoutineSaveButton";
import { RestDayToggleCheckbox } from "@/app/routines/[id]/edit/RestDayToggleCheckbox";
import { DeleteRoutineButton } from "@/app/routines/[id]/edit/DeleteRoutineButton";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { controlClassName, dateControlClassName } from "@/components/ui/formClasses";
import { requireUser } from "@/lib/auth";
import { createRoutineDaySeedsFromStartDate } from "@/lib/routines";
import { getRoutineEditPath, revalidateRoutinesViews } from "@/lib/revalidation";
import { supabaseServer } from "@/lib/supabase/server";
import { ROUTINE_TIMEZONE_OPTIONS, getRoutineTimezoneLabel, normalizeRoutineTimezone, toCanonicalRoutineTimezone } from "@/lib/timezones";
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
    copiedDayId?: string;
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

  const canonicalTimezone = toCanonicalRoutineTimezone(timezone);

  if (!canonicalTimezone) {
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
      timezone: canonicalTimezone,
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


function buildRoutineEditQuery(params: { error?: string; success?: string; copiedDayId?: string }) {
  const query = new URLSearchParams();

  if (params.error) {
    query.set("error", params.error);
  }

  if (params.success) {
    query.set("success", params.success);
  }

  if (params.copiedDayId) {
    query.set("copiedDayId", params.copiedDayId);
  }

  const value = query.toString();
  return value ? `?${value}` : "";
}

async function copyRoutineDayAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();

  const routineId = String(formData.get("routineId") ?? "");
  const dayId = String(formData.get("dayId") ?? "");

  if (!routineId || !dayId) {
    redirect(`/routines/${routineId}/edit${buildRoutineEditQuery({ error: "Missing day to copy." })}`);
  }

  const { data: day } = await supabase
    .from("routine_days")
    .select("id")
    .eq("id", dayId)
    .eq("routine_id", routineId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!day) {
    redirect(`/routines/${routineId}/edit${buildRoutineEditQuery({ error: "Day not found." })}`);
  }

  redirect(`/routines/${routineId}/edit${buildRoutineEditQuery({ success: "Day copied. Choose another day to paste it.", copiedDayId: dayId })}`);
}

async function pasteRoutineDayAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();

  const routineId = String(formData.get("routineId") ?? "");
  const sourceDayId = String(formData.get("sourceDayId") ?? "");
  const targetDayId = String(formData.get("targetDayId") ?? "");

  if (!routineId || !sourceDayId || !targetDayId) {
    redirect(`/routines/${routineId}/edit${buildRoutineEditQuery({ error: "Missing day copy info.", copiedDayId: sourceDayId || undefined })}`);
  }

  if (sourceDayId === targetDayId) {
    redirect(`/routines/${routineId}/edit${buildRoutineEditQuery({ error: "Choose a different day to paste into.", copiedDayId: sourceDayId })}`);
  }

  const { data: routineDays, error: routineDaysError } = await supabase
    .from("routine_days")
    .select("id")
    .eq("routine_id", routineId)
    .eq("user_id", user.id)
    .in("id", [sourceDayId, targetDayId]);

  if (routineDaysError || (routineDays?.length ?? 0) !== 2) {
    redirect(`/routines/${routineId}/edit${buildRoutineEditQuery({ error: "Unable to validate source/target day.", copiedDayId: sourceDayId })}`);
  }

  const { data: sourceExercises, error: sourceError } = await supabase
    .from("routine_day_exercises")
    .select("exercise_id, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, notes, position")
    .eq("routine_day_id", sourceDayId)
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  if (sourceError) {
    redirect(`/routines/${routineId}/edit${buildRoutineEditQuery({ error: sourceError.message, copiedDayId: sourceDayId })}`);
  }

  const { error: clearError } = await supabase
    .from("routine_day_exercises")
    .delete()
    .eq("routine_day_id", targetDayId)
    .eq("user_id", user.id);

  if (clearError) {
    redirect(`/routines/${routineId}/edit${buildRoutineEditQuery({ error: clearError.message, copiedDayId: sourceDayId })}`);
  }

  if ((sourceExercises ?? []).length > 0) {
    const payload = (sourceExercises ?? []).map((exercise, index) => ({
      user_id: user.id,
      routine_day_id: targetDayId,
      exercise_id: exercise.exercise_id,
      target_sets: exercise.target_sets,
      target_reps: exercise.target_reps,
      target_reps_min: exercise.target_reps_min,
      target_reps_max: exercise.target_reps_max,
      target_weight: exercise.target_weight,
      target_weight_unit: exercise.target_weight_unit,
      target_duration_seconds: exercise.target_duration_seconds,
      notes: exercise.notes,
      position: index,
    }));

    const { error: insertError } = await supabase.from("routine_day_exercises").insert(payload);

    if (insertError) {
      redirect(`/routines/${routineId}/edit${buildRoutineEditQuery({ error: insertError.message, copiedDayId: sourceDayId })}`);
    }
  }

  revalidateRoutinesViews();
  revalidatePath(getRoutineEditPath(routineId));
  revalidatePath(`/routines/${routineId}/edit/day/${targetDayId}`);
  redirect(`/routines/${routineId}/edit${buildRoutineEditQuery({ success: "Day pasted.", copiedDayId: sourceDayId })}`);
}

async function toggleRoutineDayRestAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();

  const routineId = String(formData.get("routineId") ?? "");
  const dayId = String(formData.get("dayId") ?? "");
  const isRest = formData.get("isRest") === "on";

  if (!routineId || !dayId) {
    redirect(`/routines/${routineId}/edit${buildRoutineEditQuery({ error: "Missing day info." })}`);
  }

  const { error } = await supabase
    .from("routine_days")
    .update({ is_rest: isRest })
    .eq("id", dayId)
    .eq("routine_id", routineId)
    .eq("user_id", user.id);

  if (error) {
    redirect(`/routines/${routineId}/edit${buildRoutineEditQuery({ error: error.message })}`);
  }

  revalidateRoutinesViews();
  revalidatePath(getRoutineEditPath(routineId));
  revalidatePath(`/routines/${routineId}/edit/day/${dayId}`);
  redirect(`/routines/${routineId}/edit${buildRoutineEditQuery({ success: "Rest day updated." })}`);
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
  const copiedDayId = searchParams?.copiedDayId ?? "";

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit Routine</h1>
        <RoutineBackButton href="/routines" />
      </div>

      {searchParams?.error ? <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{searchParams.error}</p> : null}
      {searchParams?.success ? <p className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">{searchParams.success}</p> : null}
      {copiedDayId ? <p className="rounded-md border border-border bg-surface-2-soft px-3 py-2 text-xs text-muted">Day copy is ready. Tap “Replace Day” on a target day card.</p> : null}

      <form id="routine-update-form" action={updateRoutineAction} className="space-y-3">
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
              <p className="mt-1 text-xs text-muted">Includes workout and rest days in the repeat cycle.</p>
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
              <p className="mt-1 text-xs text-muted">Sets which calendar day is Day 1 for this cycle.</p>
              <input type="date" name="startDate" required defaultValue={(routine as RoutineRow).start_date} className={dateControlClassName} />
            </label>
          </div>
        </CollapsibleCard>
        <RoutineSaveButton formId="routine-update-form" originalCycleLength={(routine as RoutineRow).cycle_length_days} />
      </form>

      <div className="space-y-2">
        {routineDays.map((day) => {
          const count = dayExerciseCount.get(day.id) ?? 0;
          const preview = dayExercisePreview.get(day.id) ?? [];

          return (
            <div
              key={day.id}
              className="rounded-xl border border-border/70 bg-[rgb(var(--bg)/0.45)] p-4"
            >
              <Link
                href={`/routines/${params.id}/edit/day/${day.id}`}
                className="block cursor-pointer transition-colors hover:text-text"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{formatRoutineDayLabel(day.day_index, day.name)}</p>
                  <span className="text-xs text-muted">Tap to edit</span>
                </div>
                <p className="mt-1 text-xs text-muted">{day.is_rest ? "Rest day" : `${count} exercise${count === 1 ? "" : "s"}`}</p>
                {!day.is_rest && preview.length > 0 ? (
                  <p className="mt-1 truncate text-xs text-muted">
                    {preview.join(" • ")}
                    {count > preview.length ? " • …" : ""}
                  </p>
                ) : null}
              </Link>

              <form action={toggleRoutineDayRestAction} className="mt-3">
                <input type="hidden" name="routineId" value={params.id} />
                <input type="hidden" name="dayId" value={day.id} />
                <label className="inline-flex items-center gap-2 text-xs text-muted">
                  <RestDayToggleCheckbox defaultChecked={day.is_rest} />
                  Rest day
                </label>
              </form>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <form action={copyRoutineDayAction}>
                  <input type="hidden" name="routineId" value={params.id} />
                  <input type="hidden" name="dayId" value={day.id} />
                  <AppButton type="submit" variant="secondary" size="sm" fullWidth>Copy day</AppButton>
                </form>
                <ConfirmedServerFormButton
                  action={pasteRoutineDayAction}
                  hiddenFields={{ routineId: params.id, sourceDayId: copiedDayId, targetDayId: day.id }}
                  triggerLabel="Replace Day"
                  triggerClassName="w-full disabled:border-border/40 disabled:bg-[rgb(var(--bg)/0.25)]"
                  modalTitle="Replace target day?"
                  modalDescription="Replacing this day will delete the exercises currently on the target day."
                  confirmLabel="Replace"
                  details={`${dayExerciseCount.get(day.id) ?? 0} exercises currently on target day.`}
                  size="sm"
                  disabled={!copiedDayId || copiedDayId === day.id}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-2 rounded-xl border border-red-500/35 bg-red-950/20 p-4">
        <h2 className="text-sm font-semibold text-red-200">Danger Zone</h2>
        <p className="text-xs text-red-100/80">Delete this routine permanently. This removes all routine days and exercises and cannot be undone.</p>
        <DeleteRoutineButton routineId={routine.id} routineName={(routine as RoutineRow).name} />
      </div>
    </section>
  );
}
