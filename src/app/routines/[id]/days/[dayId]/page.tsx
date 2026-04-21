import { notFound } from "next/navigation";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { SharedScreenHeader } from "@/components/ui/app/SharedScreenHeader";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { BottomActionDock } from "@/components/layout/BottomActionDock";
import { BottomDockLink } from "@/components/layout/BottomDockButton";
import { DayRestToggleAutosaveDock } from "@/components/day/DayRestToggleAutosaveDock";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { RoutineDayExerciseList } from "@/app/routines/[id]/days/[dayId]/RoutineDayExerciseList";
import { DayTaxonomyHeaderSummary } from "@/components/day-list/DayTaxonomyHeaderSummary";
import { REST_DAY_CARD_COPY } from "@/components/day-list/DayList";
import { DayDetailStateCard } from "@/components/routines/day-detail/DayDetailStateCard";
import { DetailScreenScaffold } from "@/components/routines/day-detail/DetailScreenScaffold";
import { requireUser } from "@/lib/auth";
import { buildCanonicalDaySummaries } from "@/lib/routine-day-loader";
import { isCardioExercise } from "@/lib/exercise-metadata";
import { isRunnableDayState } from "@/lib/runnable-day";
import { getRoutineDayEditHref, getRoutineDayViewHref, resolveRoutineDayViewBackHref } from "@/lib/routine-day-navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getRestDayExerciseCountSummaryFromCanonicalDayOrFallback } from "@/lib/day-summary";
import { formatRoutineDayDisplayName, getRoutineDayEditableName } from "@/lib/routines";
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
  const dayLabel = formatRoutineDayDisplayName({
    name: dayRow.name,
    dayIndex: dayRow.day_index,
    startDate: routineRow.start_date,
  });
  const editableDayName = getRoutineDayEditableName({
    name: dayRow.name,
    dayIndex: dayRow.day_index,
    startDate: routineRow.start_date,
  });
  const daySummary = getRestDayExerciseCountSummaryFromCanonicalDayOrFallback(canonicalDay, dayRow.is_rest);
  const isRestState = dayRow.is_rest || canonicalDay?.state === "rest";
  const hasWarningSummary = canonicalDay?.state === "partial";
  const hasBlockingIssue = Boolean(canonicalDay?.invalidExercises.length);
  const hasExerciseRows = Boolean(canonicalDay && isRunnableDayState(canonicalDay.state));
  const isEmptyTrainingDay = !isRestState && !hasWarningSummary && !hasBlockingIssue && !hasExerciseRows;
  const returnToPath = getRoutineDayViewHref(routineRow.id, dayRow.id);
  const backHref = resolveRoutineDayViewBackHref(searchParams?.returnTo);
  const editDayHref = getRoutineDayEditHref(routineRow.id, dayRow.id, returnToPath);
  const preservedExerciseMeta = dayExercises.length > 0
    ? `${dayExercises.length} planned ${dayExercises.length === 1 ? "exercise remains" : "exercises remain"} attached to this day.`
    : undefined;
  const detailSectionVisible = isRestState || hasWarningSummary || hasBlockingIssue || hasExerciseRows || isEmptyTrainingDay;

  return (
    <MainTabScreen topNavMode="none" className="space-y-0" ambientPreset="viewDay">
      <DetailScreenScaffold
        recipe="viewDay"
        floatingHeader={(
          <SharedScreenHeader
            recipe="viewDay"
            title={routineRow.name}
            subtitle={<DayTaxonomyHeaderSummary dayName={dayLabel} summary={daySummary} isRest={isRestState} />}
            action={<TopRightBackButton href={backHref} ariaLabel="Back to Routines" historyBehavior="fallback-only" />}
          />
        )}
      >
        {detailSectionVisible ? (
          <div className="space-y-3">
            {hasWarningSummary ? (
              <DayDetailStateCard
                tone="warning"
                title="Partial workout"
                body="Some exercises could not be loaded and will be skipped when you start this workout."
              />
            ) : null}

            {isRestState ? (
              <DayDetailStateCard
                tone="rest"
                title="Rest day"
                body={REST_DAY_CARD_COPY}
                meta={preservedExerciseMeta}
              />
            ) : hasBlockingIssue ? (
              <DayDetailStateCard
                tone="blocking"
                title="Invalid exercises"
                body="This day has invalid exercises. Edit the day before starting a workout."
              />
            ) : hasExerciseRows ? (
              <RoutineDayExerciseList
                exercises={(canonicalDay?.runnableExercises ?? []).map((exercise) => ({
                  id: exercise.id,
                  name: exercise.displayName,
                  goalLine: exercise.goalLine,
                  exerciseId: exercise.details?.id ?? exercise.exercise_id,
                  measurementType: exercise.measurement_type ?? exercise.details?.measurement_type ?? null,
                  primary_muscle: exercise.details?.primary_muscle ?? null,
                  equipment: exercise.details?.equipment ?? null,
                  movement_pattern: exercise.details?.movement_pattern ?? null,
                  isCardio: isCardioExercise({
                    measurement_type: exercise.measurement_type ?? exercise.details?.measurement_type ?? null,
                    equipment: exercise.details?.equipment ?? null,
                    movement_pattern: exercise.details?.movement_pattern ?? null,
                    primary_muscle: exercise.details?.primary_muscle ?? null,
                    kind: exercise.details?.kind ?? null,
                    type: exercise.details?.type ?? null,
                    tags: exercise.details?.tags ?? null,
                    categories: exercise.details?.categories ?? null,
                  }),
                  kind: exercise.details?.kind ?? null,
                  type: exercise.details?.type ?? null,
                  tags: exercise.details?.tags ?? null,
                  categories: exercise.details?.categories ?? null,
                  image_path: exercise.details?.image_path ?? null,
                  image_icon_path: exercise.details?.image_icon_path ?? null,
                  image_howto_path: exercise.details?.image_howto_path ?? null,
                  slug: exercise.details?.slug ?? null,
                }))}
              />
            ) : (
              <DayDetailStateCard
                tone="neutral"
                title="No exercises planned"
                body="Add exercises to this day to start a workout."
              />
            )}
          </div>
        ) : null}

        <PublishBottomActions>
          <BottomActionDock
            left={(
              <DayRestToggleAutosaveDock
                routineId={routineRow.id}
                routineDayId={dayRow.id}
                initialIsRest={dayRow.is_rest}
                name={editableDayName}
              />
            )}
            right={(
              <BottomDockLink href={editDayHref} intent="positive">
                Edit
              </BottomDockLink>
            )}
          />
        </PublishBottomActions>
      </DetailScreenScaffold>
    </MainTabScreen>
  );
}
