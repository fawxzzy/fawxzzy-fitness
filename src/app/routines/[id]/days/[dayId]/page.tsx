import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/ui/app/AppHeader";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { RoutineDayExerciseList } from "@/app/routines/[id]/days/[dayId]/RoutineDayExerciseList";
import { requireUser } from "@/lib/auth";
import { buildCanonicalDaySummaries } from "@/lib/routine-day-loader";
import { isRunnableDayState } from "@/lib/runnable-day";
import { getRoutineDayEditHref, getRoutineDayViewHref, resolveRoutineDayViewBackHref } from "@/lib/routine-day-navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getExerciseCountSummaryFromCanonicalExercises } from "@/lib/day-summary";
import type { RoutineDayExerciseRow, RoutineDayRow, RoutineRow } from "@/types/db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    id: string;
    dayId: string;
  };
  searchParams?: {
    returnTo?: string;
  };
};


export default async function RoutineDayDetailPage({ params, searchParams }: PageProps) {
  const user = await requireUser();
  const supabase = supabaseServer();

  const { data: routine } = await supabase
    .from("routines")
    .select("id, user_id, name, cycle_length_days, start_date, timezone, updated_at, weight_unit")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!routine) {
    notFound();
  }

  const { data: day } = await supabase
    .from("routine_days")
    .select("id, user_id, routine_id, day_index, name, is_rest, notes")
    .eq("id", params.dayId)
    .eq("routine_id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!day) {
    notFound();
  }

  const { data: exercises } = await supabase
    .from("routine_day_exercises")
    .select("id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, measurement_type, default_unit, notes")
    .eq("routine_day_id", day.id)
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  const routineRow = routine as RoutineRow;
  const dayRow = day as RoutineDayRow;
  const dayExercises = (exercises ?? []) as RoutineDayExerciseRow[];
  const { summaries } = await buildCanonicalDaySummaries({
    supabase,
    routineDays: [dayRow],
    allDayExercises: dayExercises,
  });
  const canonicalDay = summaries[0] ?? null;
  const dayLabel = dayRow.name?.trim() || (dayRow.is_rest ? "Rest" : `Day ${dayRow.day_index}`);
  const daySummary = dayRow.is_rest
    ? "Rest Day"
    : getExerciseCountSummaryFromCanonicalExercises(canonicalDay?.runnableExercises ?? []).label;
  const returnToPath = getRoutineDayViewHref(routineRow.id, dayRow.id);
  const backHref = resolveRoutineDayViewBackHref(searchParams?.returnTo);
  const editDayHref = getRoutineDayEditHref(routineRow.id, dayRow.id, returnToPath);

  return (
    <MainTabScreen className="space-y-0">
      <ScrollScreenWithBottomActions className="px-4 pb-0 pt-0">
        <section className="mx-auto w-full max-w-md space-y-3 pb-4 pt-0">
          <AppPanel className="space-y-3 pt-3">
            <AppHeader
              title={dayLabel}
              subtitleLeft={routineRow.name}
              subtitleRight={daySummary}
              action={<TopRightBackButton href={backHref} ariaLabel="Back to Routines" historyBehavior="fallback-only" />}
            />

            {canonicalDay?.state === "partial" ? (
              <p className="rounded-md border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                Some exercises could not be loaded and will be skipped when you start this workout.
              </p>
            ) : null}

            {canonicalDay && !isRunnableDayState(canonicalDay.state) ? (
              <p className="rounded-lg border border-border/45 bg-surface/52 px-3 py-3 text-sm text-muted">
                {canonicalDay.state === "rest"
                  ? "Recovery and mobility only."
                  : canonicalDay.invalidExercises.length > 0
                    ? "This day has invalid exercises. Edit the day before starting a workout."
                    : "No runnable exercises planned for this day."}
              </p>
            ) : (
              <RoutineDayExerciseList
                exercises={(canonicalDay?.runnableExercises ?? []).map((exercise) => ({
                  id: exercise.id,
                  name: exercise.displayName,
                  goalLine: exercise.goalLine,
                  exerciseId: exercise.details?.id ?? exercise.exercise_id,
                  image_icon_path: exercise.details?.image_icon_path ?? null,
                  image_howto_path: exercise.details?.image_howto_path ?? null,
                  slug: exercise.details?.slug ?? null,
                }))}
              />
            )}
          </AppPanel>
        </section>

        <PublishBottomActions>
          <BottomActionSingle>
            <Link
              href={editDayHref}
              className={getAppButtonClassName({ variant: "secondary", size: "md", fullWidth: true, className: "w-full" })}
            >
              Edit Day
            </Link>
          </BottomActionSingle>
        </PublishBottomActions>
      </ScrollScreenWithBottomActions>
    </MainTabScreen>
  );
}
