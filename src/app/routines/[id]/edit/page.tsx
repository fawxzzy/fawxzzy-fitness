import { notFound } from "next/navigation";
import { EditRoutineAutosaveForm } from "@/app/routines/[id]/edit/EditRoutineAutosaveForm";
import { RoutineDetailsScreenShell } from "@/components/routines/RoutineEditorShared";
import { ROUTINE_START_WEEKDAYS, getRoutineStartWeekdayFromDate } from "@/lib/routines";
import { supabaseServer } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { ensureProfile } from "@/lib/profile";
import { normalizeRoutineTimezone } from "@/lib/timezones";
import { isMissingRoutineDefaultProgressionColumnError } from "@/lib/progression-schema-compat";
import { getRoutineHomeHref, resolveRoutineEditBackHref } from "@/lib/routine-day-navigation";
import { loadAccessibleRoutineIdsForCurrentTier } from "@/lib/pro-tier-access";
import type { RoutineRow } from "@/types/db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string; returnTo?: string }>;
};

const ROUTINE_SELECT_LEGACY = "id, user_id, name, cycle_length_days, schedule_mode, start_date, timezone, updated_at, weight_unit";
const ROUTINE_SELECT_WITH_PROGRESSION = `${ROUTINE_SELECT_LEGACY}, default_progression_playbook_id, default_progression_playbook_config`;

export default async function EditRoutinePage(props: PageProps) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const user = await requireUser();
  const profile = await ensureProfile(user.id);
  const supabase = await supabaseServer();
  const accessResult = await loadAccessibleRoutineIdsForCurrentTier({
    supabase,
    userId: user.id,
  });
  if (accessResult.error || !accessResult.routineIds.has(params.id)) {
    notFound();
  }

  const { data: routineWithProgression, error: routineWithProgressionError } = await supabase
    .from("routines")
    .select(ROUTINE_SELECT_WITH_PROGRESSION)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();
  const { data: legacyRoutine } = routineWithProgressionError && isMissingRoutineDefaultProgressionColumnError(routineWithProgressionError)
    ? await supabase
        .from("routines")
        .select(ROUTINE_SELECT_LEGACY)
        .eq("id", params.id)
        .eq("user_id", user.id)
        .single()
    : { data: null };
  const routine = routineWithProgression ?? legacyRoutine;

  if (!routine) notFound();

  const returnHref = getRoutineHomeHref(params.id);
  // Back honours a safe in-app returnTo (Today's "Edit routine" passes /today); autosave keeps the routine home.
  const backHref = resolveRoutineEditBackHref(params.id, searchParams?.returnTo);
  const routineTimezoneDefault = normalizeRoutineTimezone((routine as RoutineRow).timezone);
  const startWeekdayDefault = getRoutineStartWeekdayFromDate((routine as RoutineRow).start_date) ?? ROUTINE_START_WEEKDAYS[0];

  return (
    <RoutineDetailsScreenShell backHref={backHref} title="Edit routine" subtitle={(routine as RoutineRow).name}>
      <EditRoutineAutosaveForm
        routineId={routine.id}
        existingStartDate={(routine as RoutineRow).start_date}
        returnHref={returnHref}
        name={(routine as RoutineRow).name}
        cycleLengthDays={(routine as RoutineRow).cycle_length_days}
        scheduleMode={(routine as RoutineRow).schedule_mode === "rolling_n_day" ? "rolling_n_day" : "weekday_anchored"}
        startDate={(routine as RoutineRow).start_date}
        startWeekday={startWeekdayDefault}
        timezone={routineTimezoneDefault}
        weightUnit={(routine as RoutineRow).weight_unit ?? "lbs"}
        distanceUnit={profile.preferred_distance_unit ?? "mi"}
        defaultProgressionPlaybookId={(routine as RoutineRow).default_progression_playbook_id ?? null}
        defaultProgressionPlaybookConfig={(routine as RoutineRow).default_progression_playbook_config ?? null}
        error={searchParams?.error}
      />
    </RoutineDetailsScreenShell>
  );
}
