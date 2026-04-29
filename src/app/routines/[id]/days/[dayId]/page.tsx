import { notFound } from "next/navigation";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { BottomActionDock } from "@/components/layout/BottomActionDock";
import { BottomDockLink } from "@/components/layout/BottomDockButton";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { DayRestToggleAutosaveDock } from "@/components/day/DayRestToggleAutosaveDock";
import { RoutineDayExerciseList } from "@/app/routines/[id]/days/[dayId]/RoutineDayExerciseList";
import {
  TodayFloatingHeaderRail,
  TodayOverviewContent,
  TodayOverviewHeader,
  TodayOverviewScaffold,
  TodayRouteScaffold,
} from "@/components/today/TodayScreenFamily";
import { RoutineDayHeaderTitle } from "@/components/ui/app/RoutineDayHeaderTitle";
import { requireUser } from "@/lib/auth";
import { buildCanonicalDaySummaries } from "@/lib/routine-day-loader";
import { isCardioExercise } from "@/lib/exercise-metadata";
import { isRunnableDayState } from "@/lib/runnable-day";
import { getRoutineDayEditHref, getRoutineDayViewHref } from "@/lib/routine-day-navigation";
import { supabaseServer } from "@/lib/supabase/server";
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
  const hasExerciseRows = Boolean(canonicalDay && isRunnableDayState(canonicalDay.state));
  const returnToPath = getRoutineDayViewHref(routineRow.id, dayRow.id);
  const editDayHref = getRoutineDayEditHref(routineRow.id, dayRow.id, returnToPath);
  void searchParams;

  return (
    <TodayRouteScaffold
      floatingHeader={(
        <TodayFloatingHeaderRail>
          <TodayOverviewHeader
            title={<RoutineDayHeaderTitle leadingItems={[routineRow.name.trim() || "Routine"]} dayLabel={dayLabel} />}
            align="center"
            className="pb-2 pt-0.5"
          />
        </TodayFloatingHeaderRail>
      )}
    >
      <TodayOverviewContent>
        {hasExerciseRows ? (
          <TodayOverviewScaffold>
            <div className="flex flex-col gap-[0.625rem]">
              <RoutineDayExerciseList
                exercises={(canonicalDay?.runnableExercises ?? []).map((exercise) => ({
                  id: exercise.id,
                  targets: exercise.goalLine,
                  name: exercise.displayName,
                  exerciseId: exercise.details?.id ?? exercise.exercise_id,
                  measurement_type: exercise.measurement_type ?? exercise.details?.measurement_type ?? null,
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
            </div>
          </TodayOverviewScaffold>
        ) : null}
      </TodayOverviewContent>

      <PublishBottomActions>
        {dayRow.is_rest ? (
          <BottomActionSingle>
            <DayRestToggleAutosaveDock
              routineId={routineRow.id}
              routineDayId={dayRow.id}
              initialIsRest={dayRow.is_rest}
              name={editableDayName}
            />
          </BottomActionSingle>
        ) : (
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
        )}
      </PublishBottomActions>
    </TodayRouteScaffold>
  );
}
