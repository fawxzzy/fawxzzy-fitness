import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { DeleteRoutineButton } from "@/app/routines/[id]/edit/DeleteRoutineButton";
import { EditRoutineDaysSection } from "@/app/routines/[id]/edit/EditRoutineDaysSection";
import { EditRoutineStickyActions } from "@/app/routines/[id]/edit/EditRoutineStickyActions";
import { RoutineSaveButton } from "@/app/routines/[id]/edit/RoutineSaveButton";
import { RoutineBackButton } from "@/components/RoutineBackButton";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { NavigationReturnInput } from "@/components/ui/NavigationReturnInput";
import { AppShell } from "@/components/ui/app/AppShell";
import { controlClassName, dateControlClassName } from "@/components/ui/formClasses";
import { AccentSubtitleText, SubtitleText, TitleText } from "@/components/ui/text-roles";
import { FIXED_CTA_RESERVE_CLASS } from "@/components/ui/BottomActionBar";
import { RoutineEditorPageHeader, RoutineEditorSection } from "@/components/routines/RoutineEditorShared";
import { getRestDayExerciseCountSummaryFromInputs } from "@/lib/day-summary";
import { resolveReturnHref } from "@/lib/navigation-return";
import { createRoutineDaySeedsFromStartDate } from "@/lib/routines";
import { getRoutineEditPath, revalidateRoutinesViews } from "@/lib/revalidation";
import { supabaseServer } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
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
    returnTo?: string;
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
  const rawReturnTo = String(formData.get("returnTo") ?? "").trim();
  const returnTo = resolveReturnHref(rawReturnTo, "/routines");

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
  redirect(returnTo);
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

  const { data: routineDays } = await supabase
    .from("routine_days")
    .select("id, user_id, routine_id, day_index, name, is_rest, notes")
    .eq("routine_id", params.id)
    .eq("user_id", user.id)
    .order("day_index", { ascending: true });

  const sortedRoutineDays = (routineDays ?? []) as RoutineDayRow[];
  const routineDayExercises = sortedRoutineDays.length > 0
    ? ((await supabase
      .from("routine_day_exercises")
      .select("id, routine_day_id, exercise_id, measurement_type")
      .in("routine_day_id", sortedRoutineDays.map((day) => day.id))
      .eq("user_id", user.id)).data ?? [])
    : [];

  const exerciseRows = routineDayExercises as Pick<RoutineDayExerciseRow, "id" | "routine_day_id" | "exercise_id" | "measurement_type">[];
  const daySummaries = new Map<string, string>();
  for (const day of sortedRoutineDays) {
    const summary = getRestDayExerciseCountSummaryFromInputs(
      exerciseRows
        .filter((exercise) => exercise.routine_day_id === day.id)
        .map((exercise) => ({ measurement_type: exercise.measurement_type ?? null })),
      day.is_rest,
    ).label;

    daySummaries.set(day.id, summary);
  }

  const routineTimezoneDefault = normalizeRoutineTimezone((routine as RoutineRow).timezone);
  const totalDays = sortedRoutineDays.length;
  const trainingDays = sortedRoutineDays.filter((day) => !day.is_rest).length;
  const restDays = Math.max(totalDays - trainingDays, 0);
  const returnHref = resolveReturnHref(searchParams?.returnTo, "/routines");

  return (
    <AppShell topNavMode="none" className="h-[100dvh]">
      <ScrollScreenWithBottomActions className={FIXED_CTA_RESERVE_CLASS}>
        <section className="space-y-4 px-1 pb-4">
          <RoutineEditorPageHeader
            eyebrow="Edit Routine"
            title={(routine as RoutineRow).name}
            subtitle={`${trainingDays} training • ${restDays} rest`}
            subtitleRight={`${(routine as RoutineRow).cycle_length_days} ${(routine as RoutineRow).cycle_length_days === 1 ? "Day" : "Days"}`}
            action={<RoutineBackButton href={returnHref} hasUnsavedChanges={false} />}
            actionClassName="-mt-1"
            className="space-y-3"
          >
            <SubtitleText>
              Update routine identity, schedule, and defaults here. Open a day below when you need day-level changes.
            </SubtitleText>
          </RoutineEditorPageHeader>

          {searchParams?.error ? <AccentSubtitleText className="rounded-[1rem] border border-red-300/40 bg-red-50/10 px-3 py-2 text-red-200">{searchParams.error}</AccentSubtitleText> : null}
          {searchParams?.success ? <AccentSubtitleText className="rounded-[1rem] border border-accent/40 bg-accent/10 px-3 py-2 text-accent">{searchParams.success}</AccentSubtitleText> : null}

          <form id="routine-update-form" action={updateRoutineAction} className="space-y-4">
            <input type="hidden" name="routineId" value={routine.id} />
            <NavigationReturnInput fallbackHref="/routines" value={returnHref} />

            <RoutineEditorSection title="Routine Details" description="Keep the plan recognizable and aligned with the defaults used everywhere else in the app.">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-text sm:col-span-2">Routine Name
                  <input name="name" required defaultValue={(routine as RoutineRow).name} className={controlClassName} />
                </label>
                <label className="block text-sm font-medium text-text">Cycle Length
                  <input type="number" name="cycleLengthDays" min={1} max={365} required defaultValue={(routine as RoutineRow).cycle_length_days} className={controlClassName} />
                </label>
                <label className="block text-sm font-medium text-text">Start Date
                  <input type="date" name="startDate" required defaultValue={(routine as RoutineRow).start_date} className={dateControlClassName} />
                </label>
              </div>
            </RoutineEditorSection>

            <RoutineEditorSection title="Defaults" description="Use the same rollover timezone and base weight unit the rest of the routine family expects.">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-text">Timezone
                  <select name="timezone" required defaultValue={routineTimezoneDefault} className={controlClassName}>
                    {ROUTINE_TIMEZONE_OPTIONS.map((timeZoneOption) => (<option key={timeZoneOption} value={timeZoneOption}>{getRoutineTimezoneLabel(timeZoneOption)}</option>))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-text">Weight Unit
                  <select name="weightUnit" defaultValue={(routine as RoutineRow).weight_unit ?? "lbs"} className={controlClassName}>
                    <option value="lbs">lbs</option>
                    <option value="kg">kg</option>
                  </select>
                </label>
              </div>
            </RoutineEditorSection>
          </form>

          <EditRoutineDaysSection
            routineId={routine.id}
            routineName={(routine as RoutineRow).name}
            days={sortedRoutineDays.map((day) => ({
              id: day.id,
              dayIndex: day.day_index,
              title: day.name?.trim() ? day.name : `Day ${day.day_index}`,
              isRest: day.is_rest,
              summary: daySummaries.get(day.id) ?? getRestDayExerciseCountSummaryFromInputs([], day.is_rest).label,
              notes: day.notes,
              href: `/routines/${routine.id}/edit/day/${day.id}`,
            }))}
          />

          <RoutineEditorSection title="Delete Routine" description="Remove this routine only if you want to permanently delete its attached days and exercises." className="border-red-500/25">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <TitleText as="h3" className="text-base">Routine Removal</TitleText>
                <SubtitleText>This permanently removes the routine, its days, and any planned exercises.</SubtitleText>
              </div>
              <Link href={returnHref} className="text-sm font-medium text-muted underline-offset-4 hover:text-text hover:underline">
                Keep Routine
              </Link>
            </div>
          </RoutineEditorSection>
        </section>

        <EditRoutineStickyActions
          primary={<RoutineSaveButton formId="routine-update-form" originalCycleLength={(routine as RoutineRow).cycle_length_days} />}
          secondary={<DeleteRoutineButton routineId={routine.id} routineName={(routine as RoutineRow).name} />}
          cancelHref={returnHref}
        />
      </ScrollScreenWithBottomActions>
    </AppShell>
  );
}
