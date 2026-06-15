import { notFound } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { ContentRail } from "@/components/layout/ContentRail";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { RoutinesRouteHeaderCard } from "@/components/routines/RoutinesScreenFamily";
import { LoadingDiagnosticsClientBridge } from "@/components/shared/LoadingDiagnosticsClientBridge";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { CreateRoutineDayClient } from "@/app/routines/CreateRoutineDayClient";
import { createRoutineDayAction, populateRoutineDayFromSourceAction } from "@/app/routines/actions";
import { requireUser } from "@/lib/auth";
import { getRestDayExerciseCountSummaryFromCanonicalDayOrFallback } from "@/lib/day-summary";
import { LoadingDiagnosticsCollector } from "@/lib/loading-diagnostics";
import { formatRoutineDayStableDisplayName, getRoutineDayResolvedWeekdayLabel } from "@/lib/routines";
import { getRoutineDayEditHref, getRoutineEditHref, getRoutineHomeHref } from "@/lib/routine-day-navigation";
import { buildCanonicalDaySummaries } from "@/lib/routine-day-loader";
import { selectRoutinePlanPreviewExercises } from "@/lib/routine-plan-preview";
import { supabaseServer } from "@/lib/supabase/server";
import type { RoutineDayRow, RoutineRow } from "@/types/db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ targetDayId?: string }>;
};

export default async function CreateWorkoutPlanPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const targetDayId = String(resolvedSearchParams?.targetDayId ?? "").trim();
  const isTargetMode = targetDayId.length > 0;
  const diagnostics = new LoadingDiagnosticsCollector(`/routines/${id}/new-workout-plan`);
  const user = await requireUser({
    gate: "routine-day-create.auth.session",
    route: `/routines/${id}/new-workout-plan`,
    blockingReason: "Waiting for authenticated session before loading the workout-plan creator.",
    timeoutMs: 5000,
    collector: diagnostics,
  });
  const supabase = supabaseServer();

  const { data: routineData } = await diagnostics.measure("routine-day-create.routine.fetch", async () => await supabase
    .from("routines")
    .select("id, user_id, name, start_date")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle(), {
    blockingReason: "Waiting for routine metadata.",
    metadata: {
      routineId: id,
      userId: user.id,
    },
    timeoutMs: 7000,
  });

  if (!routineData) {
    notFound();
  }

  const { data: sourceRoutinesData } = await diagnostics.measure("routine-day-create.source-routines.fetch", async () => await supabase
    .from("routines")
    .select("id, user_id, name, cycle_length_days, schedule_mode, start_date, timezone, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false }), {
    blockingReason: "Waiting for workout-plan sources.",
    metadata: {
      userId: user.id,
    },
    timeoutMs: 7000,
  });

  const sourceRoutines = (sourceRoutinesData ?? []) as Array<Pick<RoutineRow, "id" | "user_id" | "name" | "cycle_length_days" | "schedule_mode" | "start_date" | "timezone" | "updated_at">>;
  const sourceRoutineIds = sourceRoutines.map((routine) => routine.id);
  const sourceRoutineById = new Map(
    sourceRoutines.map((routine) => [routine.id, routine]),
  );

  const { data: routineDaysData } = sourceRoutineIds.length > 0
    ? await diagnostics.measure("routine-day-create.days.fetch", async () => await supabase
      .from("routine_days")
      .select("id, user_id, routine_id, day_index, name, is_rest, notes")
      .in("routine_id", sourceRoutineIds)
      .eq("user_id", user.id)
      .order("day_index", { ascending: true }), {
      blockingReason: "Waiting for workout-plan source days.",
      metadata: {
        routineId: id,
        sourceRoutineCount: sourceRoutineIds.length,
        userId: user.id,
      },
      timeoutMs: 7000,
    })
    : { data: [] };

  const routineDays = (routineDaysData ?? []) as RoutineDayRow[];
  const targetDay = isTargetMode
    ? routineDays.find((day) => day.id === targetDayId && day.routine_id === routineData.id)
    : null;
  if (isTargetMode && !targetDay) {
    notFound();
  }
  const routineDayIds = routineDays.map((day) => day.id);
  const { data: dayExerciseRows } = routineDayIds.length > 0
    ? await supabase
        .from("routine_day_exercises")
        .select("id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, measurement_type, default_unit, notes, progression_playbook_id, progression_playbook_config")
        .in("routine_day_id", routineDayIds)
        .eq("user_id", user.id)
    : { data: [] };

  const canonicalDays = routineDays.length > 0
    ? await buildCanonicalDaySummaries({
        supabase,
        routineDays,
        allDayExercises: dayExerciseRows ?? [],
      })
    : { summaries: [] };
  const canonicalSummaryByDayId = new Map(canonicalDays.summaries.map((summary) => [summary.day.id, summary]));
  const exerciseCountSummaryByDayId = new Map(
    canonicalDays.summaries.map((summary) => [
      summary.day.id,
      getRestDayExerciseCountSummaryFromCanonicalDayOrFallback(summary, Boolean(summary.day.is_rest)),
    ]),
  );
  const orderedRoutineDays = routineDays
    .filter((day) => !isTargetMode || day.id !== targetDayId)
    .slice()
    .sort((left, right) => {
      const leftIsCurrentRoutine = left.routine_id === routineData.id;
      const rightIsCurrentRoutine = right.routine_id === routineData.id;

      if (leftIsCurrentRoutine !== rightIsCurrentRoutine) {
        return leftIsCurrentRoutine ? -1 : 1;
      }

      const leftRoutineUpdatedAt = sourceRoutineById.get(left.routine_id)?.updated_at ?? "";
      const rightRoutineUpdatedAt = sourceRoutineById.get(right.routine_id)?.updated_at ?? "";
      if (leftRoutineUpdatedAt !== rightRoutineUpdatedAt) {
        return leftRoutineUpdatedAt < rightRoutineUpdatedAt ? 1 : -1;
      }

      return left.day_index - right.day_index;
    });

  return (
    <MainTabScreen topNavMode="none" ambientPreset="viewDay">
      <LoadingDiagnosticsClientBridge entries={diagnostics.snapshot()} />
      <ScrollScreenWithBottomActions
        topChrome={<AppNav mode="topChrome" />}
        floatingHeader={(
          <ContentRail className="py-1">
            <RoutinesRouteHeaderCard
              title={isTargetMode ? "Choose Workout Plan" : "Create Workout Plan"}
              subtitle={(
                <span className="text-center">
                  {isTargetMode
                    ? <>Duplicate a source workout plan into <span className="font-semibold text-[rgb(var(--text-primary))]">{formatRoutineDayStableDisplayName({
                        name: targetDay?.name ?? null,
                        dayIndex: targetDay?.day_index ?? 1,
                        startDate: routineData.start_date,
                      })}</span> for <span className="font-semibold text-[rgb(var(--text-primary))]">{routineData.name}</span>.</>
                    : <>Build the next workout plan for <span className="font-semibold text-[rgb(var(--text-primary))]">{routineData.name}</span>, then continue into the workout-plan editor.</>}
                </span>
              )}
            />
          </ContentRail>
        )}
      >
        <ContentRail className="space-y-3">
          <CreateRoutineDayClient
            routineId={routineData.id}
            backHref={isTargetMode && targetDay
              ? getRoutineDayEditHref(routineData.id, targetDay.id, getRoutineHomeHref(routineData.id))
              : getRoutineHomeHref(routineData.id)}
            routineEditHref={getRoutineEditHref(routineData.id)}
            createRoutineDayAction={createRoutineDayAction}
            populateRoutineDayFromSourceAction={populateRoutineDayFromSourceAction}
            targetRoutineDayId={targetDay?.id}
            targetDayEditHref={targetDay
              ? getRoutineDayEditHref(routineData.id, targetDay.id, getRoutineHomeHref(routineData.id))
              : undefined}
            days={orderedRoutineDays.map((day) => {
              const sourceRoutine = sourceRoutineById.get(day.routine_id);
              const previewExercises = selectRoutinePlanPreviewExercises(canonicalSummaryByDayId.get(day.id)?.runnableExercises ?? []);

              return ({
                id: day.id,
                sourceRoutineId: day.routine_id,
                sourceRoutineName: sourceRoutine?.name?.trim() || "Routine",
                isCurrentRoutine: day.routine_id === routineData.id,
                dayIndex: day.day_index,
                title: formatRoutineDayStableDisplayName({
                  name: day.name,
                  dayIndex: day.day_index,
                  startDate: sourceRoutine?.start_date,
                }),
                weekdayLabel: getRoutineDayResolvedWeekdayLabel({
                  dayIndex: day.day_index,
                  startDate: sourceRoutine?.start_date,
                  cycleLengthDays: sourceRoutine?.cycle_length_days,
                  scheduleMode: sourceRoutine?.schedule_mode,
                  profileTimeZone: sourceRoutine?.timezone,
                  weekday: "short",
                }),
                isRest: Boolean(day.is_rest),
                splitSummary: exerciseCountSummaryByDayId.get(day.id),
                previewExercises,
                remainingExerciseCount: Math.max(
                  (canonicalSummaryByDayId.get(day.id)?.runnableExercises.length ?? 0)
                    - previewExercises.length,
                  0,
                ),
              });
            })}
          />
        </ContentRail>
      </ScrollScreenWithBottomActions>
    </MainTabScreen>
  );
}
