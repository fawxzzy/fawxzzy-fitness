import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { RoutineBackButton } from "@/components/RoutineBackButton";
import { NavigationReturnInput } from "@/components/ui/NavigationReturnInput";
import { RoutineSaveButton } from "@/app/routines/[id]/edit/RoutineSaveButton";
import { DeleteRoutineButton } from "@/app/routines/[id]/edit/DeleteRoutineButton";
import { EditRoutineStickyActions } from "@/app/routines/[id]/edit/EditRoutineStickyActions";
import { AppShell } from "@/components/ui/app/AppShell";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { SubtitleText } from "@/components/ui/text-roles";
import { RoutineEditorPageHeader, RoutineEditorSection } from "@/components/routines/RoutineEditorShared";
import { controlClassName, dateControlClassName } from "@/components/ui/formClasses";
import { FIXED_CTA_RESERVE_CLASS } from "@/components/ui/BottomActionBar";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { requireUser } from "@/lib/auth";
import { createRoutineDaySeedsFromStartDate } from "@/lib/routines";
import { getRoutineEditPath, revalidateRoutinesViews } from "@/lib/revalidation";
import { resolveReturnHref } from "@/lib/navigation-return";
import { supabaseServer } from "@/lib/supabase/server";
import { ROUTINE_TIMEZONE_OPTIONS, getRoutineTimezoneLabel, normalizeRoutineTimezone, toCanonicalRoutineTimezone } from "@/lib/timezones";
import type { RoutineRow } from "@/types/db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    id: string;
  };
  searchParams?: {
    error?: string;
    success?: string;
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

  const routineTimezoneDefault = normalizeRoutineTimezone((routine as RoutineRow).timezone);

  return (
    <AppShell topNavMode="none" className="h-[100dvh]">
      <ScrollScreenWithBottomActions className={FIXED_CTA_RESERVE_CLASS}>
        <section className="space-y-4 px-1 pb-4">
          <RoutineEditorPageHeader
            eyebrow="Edit Routine"
            title={(routine as RoutineRow).name}
            subtitle="Update routine identity, schedule, and defaults without leaking day-level editing into this parent screen."
            subtitleRight={`${(routine as RoutineRow).cycle_length_days} ${(routine as RoutineRow).cycle_length_days === 1 ? "day" : "days"}`}
            action={<RoutineBackButton href="/routines" />}
            actionClassName="-mt-1"
          />

          {searchParams?.error ? <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{searchParams.error}</p> : null}
          {searchParams?.success ? <p className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">{searchParams.success}</p> : null}

          <form id="routine-update-form" action={updateRoutineAction} className="space-y-4">
            <input type="hidden" name="routineId" value={routine.id} />
            <NavigationReturnInput fallbackHref="/routines" />

            <RoutineEditorSection title="Identity" description="Keep the routine name recognizable wherever the plan appears.">
              <label className="block text-sm font-medium text-text">Routine name
                <input name="name" required defaultValue={(routine as RoutineRow).name} className={controlClassName} />
              </label>
            </RoutineEditorSection>

            <RoutineEditorSection title="Schedule" description="Day 1 and cycle length define how this routine repeats.">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-text">Cycle length (days)
                  <input type="number" name="cycleLengthDays" min={1} max={365} required defaultValue={(routine as RoutineRow).cycle_length_days} className={controlClassName} />
                </label>
                <label className="block text-sm font-medium text-text">Start date
                  <input type="date" name="startDate" required defaultValue={(routine as RoutineRow).start_date} className={dateControlClassName} />
                </label>
              </div>
            </RoutineEditorSection>

            <RoutineEditorSection title="Timezone & defaults" description="Use the same rollover timezone and base weight unit the rest of the app expects.">
              <div className="grid gap-3">
                <label className="block text-sm font-medium text-text">Timezone
                  <select name="timezone" required defaultValue={routineTimezoneDefault} className={controlClassName}>
                    {ROUTINE_TIMEZONE_OPTIONS.map((timeZoneOption) => (<option key={timeZoneOption} value={timeZoneOption}>{getRoutineTimezoneLabel(timeZoneOption)}</option>))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-text">Weight unit
                  <select name="weightUnit" defaultValue={(routine as RoutineRow).weight_unit ?? "lbs"} className={controlClassName}>
                    <option value="lbs">lbs</option>
                    <option value="kg">kg</option>
                  </select>
                </label>
              </div>
            </RoutineEditorSection>
          </form>

          <AppPanel className="space-y-3 border-red-500/25 p-4">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-red-300/90">Danger zone</p>
              <h3 className="text-base font-semibold text-text">Delete this routine</h3>
              <SubtitleText>Remove the routine only if you want to permanently delete its attached days and exercises.</SubtitleText>
            </div>
            <DeleteRoutineButton routineId={routine.id} routineName={(routine as RoutineRow).name} />
          </AppPanel>
        </section>

        <EditRoutineStickyActions
          primary={<RoutineSaveButton formId="routine-update-form" originalCycleLength={(routine as RoutineRow).cycle_length_days} />}
        />
      </ScrollScreenWithBottomActions>
    </AppShell>
  );
}
