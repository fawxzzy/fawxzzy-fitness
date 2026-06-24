import { notFound } from "next/navigation";
import { ContentRail } from "@/components/layout/ContentRail";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { renderSignatureParts, splitRoutineSummaryParts } from "@/components/day-list/RoutineDayCardPresentation";
import { RoutinesRouteHeaderCard } from "@/components/routines/RoutinesScreenFamily";
import { LoadingDiagnosticsClientBridge } from "@/components/shared/LoadingDiagnosticsClientBridge";
import { HeaderInfoRail } from "@/components/ui/HeaderInfoRail";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { RoutineHomeClient } from "@/app/routines/RoutineHomeClient";
import { appendRoutineDayAction, createRoutineDayAction, deleteRoutineDayAction, reorderRoutineDaysAction } from "@/app/routines/actions";
import { requireUser } from "@/lib/auth";
import { getRestDayExerciseCountSummaryFromCanonicalDayOrFallback } from "@/lib/day-summary";
import { buildRoutineWorkoutPlanEditorInfoRailItems } from "@/lib/header-info-rail";
import { LoadingDiagnosticsCollector } from "@/lib/loading-diagnostics";
import { ensureProfile } from "@/lib/profile";
import { buildRoutinePlanRecapExercises } from "@/lib/routine-plan-preview";
import { getRoutineDayEditHref, getRoutineEditHref, getRoutineHomeHref } from "@/lib/routine-day-navigation";
import { buildCanonicalDaySummaries } from "@/lib/routine-day-loader";
import { loadWorkoutPlanSourceList } from "@/lib/workout-plan-source-list";
import {
  getCurrentCycleOccurrenceContext,
  getRoutineDayResolvedWeekdayLabel,
  getRoutineStartWeekdayFromDate,
  getTimeZoneDayWindow,
  resolveCompletedRoutineDayIndexesForOccurrence,
  resolveRoutineScheduleForToday,
} from "@/lib/routines";
import { supabaseServer } from "@/lib/supabase/server";
import type { RoutineDayExerciseRow, RoutineDayRow, RoutineRow } from "@/types/db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function RoutineHomePage({ params }: PageProps) {
  const { id } = await params;
  const diagnostics = new LoadingDiagnosticsCollector(`/routines/${id}`);
  const user = await requireUser({
    gate: "routine-home.auth.session",
    route: `/routines/${id}`,
    blockingReason: "Waiting for authenticated session before loading routine home.",
    timeoutMs: 5000,
    collector: diagnostics,
  });
  const profile = await diagnostics.measure("routine-home.profile.bootstrap", () => ensureProfile(user.id), {
    blockingReason: "Waiting for routine profile bootstrap.",
    metadata: {
      userId: user.id,
      routineId: id,
    },
    timeoutMs: 5000,
  });
  const supabase = supabaseServer();

  const { data: routineData } = await diagnostics.measure("routine-home.routine.fetch", async () => await supabase
    .from("routines")
    .select("id, user_id, name, cycle_length_days, schedule_mode, start_date, timezone, updated_at, weight_unit")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle(), {
    blockingReason: "Waiting for routine metadata.",
    metadata: {
      userId: user.id,
      routineId: id,
    },
    timeoutMs: 7000,
  });
  const routine = routineData as RoutineRow | null;

  if (!routine) {
    notFound();
  }

  const { data: routineDaysData } = await diagnostics.measure("routine-home.days.fetch", async () => await supabase
    .from("routine_days")
    .select("id, user_id, routine_id, day_index, name, is_rest, notes")
    .eq("routine_id", routine.id)
    .eq("user_id", user.id), {
    blockingReason: "Waiting for routine day list.",
    metadata: {
      userId: user.id,
      routineId: routine.id,
    },
    timeoutMs: 7000,
  });
  const routineDays = (routineDaysData ?? []) as RoutineDayRow[];

  const sortedRoutineDays = routineDays
    .map((day, index) => ({ day, index }))
    .sort((a, b) => {
      const left = Number.isFinite(a.day.day_index) ? a.day.day_index : null;
      const right = Number.isFinite(b.day.day_index) ? b.day.day_index : null;

      if (left !== null && right !== null) {
        return left - right;
      }

      if (left !== null) {
        return -1;
      }

      if (right !== null) {
        return 1;
      }

      return a.index - b.index;
    })
    .map(({ day }) => day);

  const { data: routineDayExercisesData } = sortedRoutineDays.length > 0
    ? await diagnostics.measure("routine-home.day-exercises.fetch", async () => await supabase
      .from("routine_day_exercises")
      .select("id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, measurement_type, default_unit, notes, progression_playbook_id, progression_playbook_config")
      .in("routine_day_id", sortedRoutineDays.map((day) => day.id))
      .eq("user_id", user.id), {
      blockingReason: "Waiting for routine exercise summaries.",
      metadata: {
        userId: user.id,
        routineId: routine.id,
        dayCount: sortedRoutineDays.length,
      },
      timeoutMs: 7000,
    })
    : { data: [] };
  const routineDayExercises = (routineDayExercisesData ?? []) as RoutineDayExerciseRow[];

  const { summaries } = sortedRoutineDays.length > 0
    ? await buildCanonicalDaySummaries({
      supabase,
      routineDays: sortedRoutineDays,
      allDayExercises: routineDayExercises,
    })
    : { summaries: [] };
  const exerciseSummaryByDayId = new Map(
    summaries.map((summary) => [
      summary.day.id,
      getRestDayExerciseCountSummaryFromCanonicalDayOrFallback(summary, Boolean(summary.day.is_rest)),
    ]),
  );
  const canonicalSummaryByDayId = new Map(
    summaries.map((summary) => [summary.day.id, summary]),
  );

  const totalDays = sortedRoutineDays.length;
  const restDays = sortedRoutineDays.filter((day) => day.is_rest).length;
  const trainingDays = Math.max(totalDays - restDays, 0);
  const cycleLength = routine.cycle_length_days ?? totalDays;
  const cycleSummary = `${trainingDays} training \u2022 ${restDays} rest`;
  const todayRoutineSchedule = routine.start_date && cycleLength > 0
    ? resolveRoutineScheduleForToday({
      cycleLengthDays: cycleLength,
      scheduleMode: routine.schedule_mode,
      startDate: routine.start_date,
      startWeekday: getRoutineStartWeekdayFromDate(routine.start_date),
      profileTimeZone: routine.timezone || profile.timezone,
    })
    : null;
  const todayRoutineDayIndex = todayRoutineSchedule?.dayIndex ?? null;
  const todayRowIndex = todayRoutineDayIndex === null
    ? -1
    : sortedRoutineDays.findIndex((day, index) => {
      const dayNumber = Number.isFinite(day.day_index) ? day.day_index : index + 1;
      return dayNumber === todayRoutineDayIndex;
    });

  let completedDayIndexSet = new Set<number>();
  let skippedDayIndexSet = new Set<number>();
  let inSessionDayIndex: number | null = null;

  const routineTimeZone = routine.timezone || profile.timezone;
  const safeCycleLength = Number.isFinite(cycleLength) && cycleLength > 0 ? Math.floor(cycleLength) : 1;

  if (routine.start_date && todayRoutineSchedule?.resolution.status === "scheduled" && todayRoutineSchedule.dayIndex !== null) {
    const todayDate = todayRoutineSchedule.todayDate;
    const dayIndexes = sortedRoutineDays.map((day, index) => (
      Number.isFinite(day.day_index) ? day.day_index : index + 1
    ));
    const { occurrenceDateByDayIndex, queryStartDate, queryEndDate } = getCurrentCycleOccurrenceContext({
      cycleLengthDays: safeCycleLength,
      startDate: routine.start_date,
      profileTimeZone: routineTimeZone,
      dayIndexes,
      referenceDate: todayDate,
    });
    const { data: completedCycleSessions } = await supabase
      .from("sessions")
      .select("routine_day_index, performed_at")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .eq("routine_id", routine.id)
      .gte("performed_at", `${queryStartDate}T00:00:00.000Z`)
      .lt("performed_at", `${queryEndDate}T00:00:00.000Z`);

    completedDayIndexSet = new Set(resolveCompletedRoutineDayIndexesForOccurrence({
      sessions: completedCycleSessions ?? [],
      occurrenceDateByDayIndex,
      timeZone: routineTimeZone,
    }));

    skippedDayIndexSet = new Set(
      sortedRoutineDays
        .map((day, index) => ({
          day,
          dayNumber: Number.isFinite(day.day_index) ? day.day_index : index + 1,
        }))
        .filter(({ day, dayNumber }) => {
          const occurrenceDate = occurrenceDateByDayIndex.get(dayNumber);
          return Boolean(
            occurrenceDate
            && occurrenceDate < todayDate
            && !day.is_rest
            && !completedDayIndexSet.has(dayNumber),
          );
        })
        .map(({ dayNumber }) => dayNumber),
    );
  } else {
    const { startIso, endIso } = getTimeZoneDayWindow(routineTimeZone);
    const { data: completedTodaySessions } = await supabase
      .from("sessions")
      .select("routine_day_index")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .eq("routine_id", routine.id)
      .gte("performed_at", startIso)
      .lt("performed_at", endIso);

    completedDayIndexSet = new Set(
      (completedTodaySessions ?? [])
        .map((session) => session.routine_day_index)
        .filter((value): value is number => Number.isFinite(value)),
    );
  }

  const { data: inProgressSession } = await supabase
    .from("sessions")
    .select("id, routine_day_index")
    .eq("user_id", user.id)
    .eq("routine_id", routine.id)
    .eq("status", "in_progress")
    .order("performed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const resolvedInProgressDayIndex = inProgressSession?.routine_day_index;
  inSessionDayIndex = Number.isFinite(resolvedInProgressDayIndex) ? resolvedInProgressDayIndex : null;
  const workoutPlanSources = await loadWorkoutPlanSourceList({
    supabase,
    userId: user.id,
    routineId: routine.id,
  });
  const floatingHeaderInfoItems = buildRoutineWorkoutPlanEditorInfoRailItems({
    trainingDays,
    restDays,
    days: sortedRoutineDays.map((day, index) => {
      const dayNumber = Number.isFinite(day.day_index) ? day.day_index : index + 1;
      const canonicalDaySummary = canonicalSummaryByDayId.get(day.id);
      return {
        id: day.id,
        dayIndex: dayNumber,
        isRest: Boolean(day.is_rest),
        isToday: index === todayRowIndex,
        isCompleted: completedDayIndexSet.has(dayNumber),
        isSkipped: skippedDayIndexSet.has(dayNumber),
        isInSession: inSessionDayIndex === dayNumber,
        autoProgressionExerciseCount: canonicalDaySummary?.runnableExercises.filter((exercise) => Boolean(exercise.progression_playbook_id)).length ?? 0,
        splitSummary: exerciseSummaryByDayId.get(day.id) ?? null,
      };
    }),
  });
  const headerSubtitle = floatingHeaderInfoItems.length > 0 ? (
    <HeaderInfoRail
      items={floatingHeaderInfoItems}
      ariaLabel="Routine cycle summary"
      behavior="rotate-single"
      className="justify-center text-center"
    />
  ) : (renderSignatureParts(splitRoutineSummaryParts(cycleSummary), "justify-center text-center") ?? cycleSummary);

  return (
    <MainTabScreen topNavMode="none" ambientPreset="viewDay">
      <LoadingDiagnosticsClientBridge entries={diagnostics.snapshot()} />
      <ScrollScreenWithBottomActions
        floatingHeader={(
          <ContentRail className="py-1">
            <RoutinesRouteHeaderCard
              title={routine.name}
              subtitle={headerSubtitle}
              action={<TopRightBackButton href="/routines" ariaLabel="Back to routines" />}
            />
          </ContentRail>
        )}
      >
        <ContentRail className="space-y-3">
          <RoutineHomeClient
            routineId={routine.id}
            routineStartDate={routine.start_date}
            cycleLengthDays={cycleLength}
            scheduleMode={routine.schedule_mode}
            routineTimeZone={routineTimeZone}
            routineReferenceDate={todayRoutineSchedule?.todayDate ?? null}
            isActiveRoutine={profile.active_routine_id === routine.id}
            appendRoutineDayAction={appendRoutineDayAction}
            createRoutineDayAction={createRoutineDayAction}
            deleteRoutineDayAction={deleteRoutineDayAction}
            reorderRoutineDaysAction={reorderRoutineDaysAction}
            workoutPlanSources={workoutPlanSources}
            days={sortedRoutineDays.map((day, index) => {
              const dayNumber = Number.isFinite(day.day_index) ? day.day_index : index + 1;
              const canonicalDaySummary = canonicalSummaryByDayId.get(day.id);
              const recapExercises = buildRoutinePlanRecapExercises(canonicalDaySummary?.runnableExercises ?? []);

              return {
                id: day.id,
                dayIndex: dayNumber,
                name: day.name ?? null,
                occurrenceWeekday: getRoutineDayResolvedWeekdayLabel({
                  dayIndex: dayNumber,
                  startDate: routine.start_date,
                  cycleLengthDays: cycleLength,
                  scheduleMode: routine.schedule_mode,
                  profileTimeZone: routineTimeZone,
                  referenceDate: todayRoutineSchedule?.todayDate ?? null,
                  weekday: "short",
                }),
                isRest: Boolean(day.is_rest),
                splitSummary: exerciseSummaryByDayId.get(day.id),
                href: getRoutineDayEditHref(routine.id, day.id, getRoutineHomeHref(routine.id)),
                isToday: index === todayRowIndex,
                isCompleted: completedDayIndexSet.has(dayNumber),
                isSkipped: skippedDayIndexSet.has(dayNumber),
                isInSession: inSessionDayIndex === dayNumber,
                recapExercises,
              };
            })}
          />
        </ContentRail>
      </ScrollScreenWithBottomActions>
    </MainTabScreen>
  );
}
