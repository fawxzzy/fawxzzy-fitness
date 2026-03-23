import { notFound } from "next/navigation";
import { DeleteRoutineButton } from "@/app/routines/[id]/edit/DeleteRoutineButton";
import { EditRoutineAutosaveForm } from "@/app/routines/[id]/edit/EditRoutineAutosaveForm";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { AppShell } from "@/components/ui/app/AppShell";
import { FIXED_CTA_RESERVE_CLASS } from "@/components/ui/BottomActionBar";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { resolveReturnHref } from "@/lib/navigation-return";
import { ROUTINE_START_WEEKDAYS, getRoutineStartWeekdayFromDate } from "@/lib/routines";
import { supabaseServer } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { normalizeRoutineTimezone } from "@/lib/timezones";
import type { RoutineRow } from "@/types/db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
  searchParams?: { error?: string; success?: string; returnTo?: string };
};

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

  const returnHref = resolveReturnHref(searchParams?.returnTo, "/routines");
  const routineTimezoneDefault = normalizeRoutineTimezone((routine as RoutineRow).timezone);
  const startWeekdayDefault = getRoutineStartWeekdayFromDate((routine as RoutineRow).start_date) ?? ROUTINE_START_WEEKDAYS[0];

  return (
    <AppShell topNavMode="none" className="h-[100dvh]">
      <ScrollScreenWithBottomActions className={FIXED_CTA_RESERVE_CLASS}>
        <EditRoutineAutosaveForm
          routineId={routine.id}
          existingStartDate={(routine as RoutineRow).start_date}
          returnHref={returnHref}
          name={(routine as RoutineRow).name}
          cycleLengthDays={(routine as RoutineRow).cycle_length_days}
          startWeekday={startWeekdayDefault}
          timezone={routineTimezoneDefault}
          weightUnit={(routine as RoutineRow).weight_unit ?? "lbs"}
          success={searchParams?.success}
          error={searchParams?.error}
        />

        <PublishBottomActions>
          <BottomActionSingle>
            <DeleteRoutineButton routineId={routine.id} routineName={(routine as RoutineRow).name} />
          </BottomActionSingle>
        </PublishBottomActions>
      </ScrollScreenWithBottomActions>
    </AppShell>
  );
}
