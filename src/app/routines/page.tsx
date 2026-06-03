import Link from "next/link";
import { cookies } from "next/headers";
import { AppNav } from "@/components/AppNav";
import { ContentRail } from "@/components/layout/ContentRail";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { LoadingDiagnosticsClientBridge } from "@/components/shared/LoadingDiagnosticsClientBridge";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { EmptyState } from "@/components/ui/EmptyState";
import { RoutinesPageClient } from "@/app/routines/RoutinesPageClient";
import { requireUser } from "@/lib/auth";
import { LoadingDiagnosticsCollector } from "@/lib/loading-diagnostics";
import { ensureProfile } from "@/lib/profile";
import { buildCanonicalDaySummaries } from "@/lib/routine-day-loader";
import {
  getCurrentCycleOccurrenceContext,
  getRoutineStartWeekdayFromDate,
  getTimeZoneDayWindow,
  resolveCompletedRoutineDayIndexesForOccurrence,
  resolveRoutineScheduleForToday,
} from "@/lib/routines";
import {
  filterQaLlelRows,
  QA_LLEL_VISIBILITY_COOKIE,
  resolveQaLlelVisibilityOverride,
  resolveShowQaLlelDataPreferenceWithOverride,
} from "@/lib/qa-data-visibility";
import { supabaseServer } from "@/lib/supabase/server";
import { revalidateRoutinesViews } from "@/lib/revalidation";
import {
  getRestDayExerciseCountSummaryFromCanonicalDay,
  getRestDayExerciseCountSummaryFromCanonicalDayOrFallback,
} from "@/lib/day-summary";
import { resolveEditDayAutoProgressionState } from "@/lib/edit-day-progression";
import type { RoutineDayExerciseRow, RoutineDayRow, RoutineRow } from "@/types/db";

export const dynamic = "force-dynamic";

function formatRoutineBrowseCardSummary(args: {
  trainingDays: number;
  restDays: number;
  exerciseCount: number;
}) {
  const safeExerciseCount = Math.max(0, args.exerciseCount);
  const safeTrainingDays = Math.max(0, args.trainingDays);
  const safeRestDays = Math.max(0, args.restDays);

  return [
    safeExerciseCount > 0
      ? `${safeExerciseCount} ${safeExerciseCount === 1 ? "exercise" : "exercises"}`
      : "No exercises",
    `${safeTrainingDays} train`,
    `${safeRestDays} rest`,
  ].join(" • ");
}

async function setActiveRoutineAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();
  const routineId = String(formData.get("routineId") ?? "");

  if (!routineId) {
    throw new Error("Missing routine ID");
  }

  const { error: routineCheckError } = await supabase
    .from("routines")
    .select("id")
    .eq("id", routineId)
    .eq("user_id", user.id)
    .single();

  if (routineCheckError) {
    throw new Error(routineCheckError.message);
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ active_routine_id: routineId })
    .eq("id", user.id);

  if (profileError) {
    throw new Error(profileError.message);
  }

  revalidateRoutinesViews();
}

export default async function RoutinesPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string }>;
}) {
  const diagnostics = new LoadingDiagnosticsCollector("/routines");
  const resolvedSearchParams = await searchParams;
  const initialRoutineListOpen = resolvedSearchParams?.view === "list";
  const user = await requireUser({
    gate: "routines.auth.session",
    route: "/routines",
    blockingReason: "Waiting for authenticated session before loading routines.",
    timeoutMs: 5000,
    collector: diagnostics,
  });
  const profile = await diagnostics.measure("routines.profile.bootstrap", () => ensureProfile(user.id), {
    blockingReason: "Waiting for routines profile bootstrap.",
    metadata: {
      userId: user.id,
    },
    timeoutMs: 5000,
  });
  const supabase = supabaseServer();
  const showQaLlelData = resolveShowQaLlelDataPreferenceWithOverride(
    profile,
    resolveQaLlelVisibilityOverride(cookies().get(QA_LLEL_VISIBILITY_COOKIE)?.value),
  );

  const { data } = await diagnostics.measure("routines.list.fetch", async () => await supabase
    .from("routines")
    .select("id, user_id, name, cycle_length_days, schedule_mode, start_date, timezone, updated_at, weight_unit")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false }), {
    blockingReason: "Waiting for routines overview list.",
    metadata: {
      userId: user.id,
    },
    timeoutMs: 7000,
  });

  const routines = (data ?? []) as RoutineRow[];
  const visibleRoutines = showQaLlelData
    ? routines
    : filterQaLlelRows(routines, (routine) => [routine.name]);
  const activeRoutine = routines.find((routine) => routine.id === profile.active_routine_id) ?? visibleRoutines[0] ?? null;
  const routineIds = routines.map((routine) => routine.id);

  const { data: allRoutineDaysData } = routineIds.length
    ? await diagnostics.measure("routines.days.fetch", async () => await supabase
      .from("routine_days")
      .select("id, user_id, routine_id, day_index, name, is_rest, notes")
      .in("routine_id", routineIds)
      .eq("user_id", user.id), {
      blockingReason: "Waiting for routines day summaries.",
      metadata: {
        routineCount: routineIds.length,
        userId: user.id,
      },
      timeoutMs: 7000,
    })
    : { data: [] };
  const allRoutineDays = (allRoutineDaysData ?? []) as RoutineDayRow[];

  const allRoutineDayIds = allRoutineDays.map((day) => day.id);
  const { data: allRoutineDayExercisesData } = allRoutineDayIds.length
    ? await supabase
      .from("routine_day_exercises")
      .select("id, routine_day_id")
      .in("routine_day_id", allRoutineDayIds)
      .eq("user_id", user.id)
    : { data: [] };
  const allRoutineDayExercises = (allRoutineDayExercisesData ?? []) as Array<Pick<RoutineDayExerciseRow, "id" | "routine_day_id">>;

  const routineDayStatsByRoutineId = new Map<string, { totalDays: number; restDays: number }>();
  const routineIdByDayId = new Map<string, string>();
  for (const day of allRoutineDays) {
    const current = routineDayStatsByRoutineId.get(day.routine_id) ?? { totalDays: 0, restDays: 0 };
    current.totalDays += 1;
    if (day.is_rest) current.restDays += 1;
    routineDayStatsByRoutineId.set(day.routine_id, current);
    routineIdByDayId.set(day.id, day.routine_id);
  }

  const exerciseCountByRoutineId = new Map<string, number>();
  for (const dayExercise of allRoutineDayExercises) {
    const routineId = routineIdByDayId.get(dayExercise.routine_day_id);
    if (!routineId) continue;
    exerciseCountByRoutineId.set(routineId, (exerciseCountByRoutineId.get(routineId) ?? 0) + 1);
  }

  let activeRoutineDays: RoutineDayRow[] = [];
  let activeRoutineDayExercises: RoutineDayExerciseRow[] = [];
  let activeRoutineExerciseSummaries = new Map<string, ReturnType<typeof getRestDayExerciseCountSummaryFromCanonicalDay>>();

  if (activeRoutine) {
    activeRoutineDays = allRoutineDays
      .filter((day) => day.routine_id === activeRoutine.id)
      .sort((left, right) => left.day_index - right.day_index);

    if (activeRoutineDays.length > 0) {
      const { data: routineDayExercises } = await supabase
        .from("routine_day_exercises")
        .select("id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, measurement_type, default_unit, notes, progression_playbook_id, progression_playbook_config")
        .in("routine_day_id", activeRoutineDays.map((day) => day.id))
        .eq("user_id", user.id);
      activeRoutineDayExercises = (routineDayExercises ?? []) as RoutineDayExerciseRow[];

      const { summaries } = await buildCanonicalDaySummaries({
        supabase,
        routineDays: activeRoutineDays,
        allDayExercises: activeRoutineDayExercises,
      });

      activeRoutineExerciseSummaries = new Map(
        summaries.map((summary) => [
          summary.day.id,
          getRestDayExerciseCountSummaryFromCanonicalDay(summary),
        ]),
      );
    }
  }

  const sortedActiveRoutineDays = activeRoutineDays
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

  const totalDays = sortedActiveRoutineDays.length;
  const restDays = sortedActiveRoutineDays.filter((day) => day.is_rest).length;
  const trainingDays = Math.max(totalDays - restDays, 0);
  const cycleLength = activeRoutine?.cycle_length_days ?? totalDays;
  const cycleSummary = activeRoutine ? `${trainingDays} training • ${restDays} rest` : undefined;
  const todayRoutineSchedule = activeRoutine?.start_date && cycleLength > 0
    ? resolveRoutineScheduleForToday({
        cycleLengthDays: cycleLength,
        scheduleMode: activeRoutine.schedule_mode,
        startDate: activeRoutine.start_date,
        startWeekday: getRoutineStartWeekdayFromDate(activeRoutine.start_date),
        profileTimeZone: activeRoutine.timezone || profile.timezone,
      })
    : null;
  const todayRoutineDayIndex = todayRoutineSchedule?.dayIndex ?? null;
  const todayRowIndex = todayRoutineDayIndex === null
    ? -1
    : sortedActiveRoutineDays.findIndex((day, index) => {
        const dayNumber = Number.isFinite(day.day_index) ? day.day_index : index + 1;
        return dayNumber === todayRoutineDayIndex;
      });

  let completedDayIndexSet = new Set<number>();
  let skippedDayIndexSet = new Set<number>();
  let inSessionDayIndex: number | null = null;

  if (activeRoutine) {
    const routineTimeZone = activeRoutine.timezone || profile.timezone;
    const safeCycleLength = Number.isFinite(cycleLength) && cycleLength > 0 ? Math.floor(cycleLength) : 1;

    if (activeRoutine.start_date && todayRoutineSchedule?.resolution.status === "scheduled" && todayRoutineSchedule.dayIndex !== null) {
      const todayDate = todayRoutineSchedule.todayDate;
      const dayIndexes = sortedActiveRoutineDays.map((day, index) => (
        Number.isFinite(day.day_index) ? day.day_index : index + 1
      ));
      const { occurrenceDateByDayIndex, queryStartDate, queryEndDate } = getCurrentCycleOccurrenceContext({
        cycleLengthDays: safeCycleLength,
        startDate: activeRoutine.start_date,
        profileTimeZone: routineTimeZone,
        dayIndexes,
        referenceDate: todayDate,
      });
      const { data: completedCycleSessions } = await supabase
        .from("sessions")
        .select("routine_day_index, performed_at")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .eq("routine_id", activeRoutine.id)
        .gte("performed_at", `${queryStartDate}T00:00:00.000Z`)
        .lt("performed_at", `${queryEndDate}T00:00:00.000Z`);

      completedDayIndexSet = new Set(resolveCompletedRoutineDayIndexesForOccurrence({
        sessions: completedCycleSessions ?? [],
        occurrenceDateByDayIndex,
        timeZone: routineTimeZone,
      }));

      skippedDayIndexSet = new Set(
        sortedActiveRoutineDays
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
        .eq("routine_id", activeRoutine.id)
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
      .eq("routine_id", activeRoutine.id)
      .eq("status", "in_progress")
      .order("performed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const resolvedInProgressDayIndex = inProgressSession?.routine_day_index;
    inSessionDayIndex = Number.isFinite(resolvedInProgressDayIndex) ? resolvedInProgressDayIndex : null;

  }

  if (process.env.NODE_ENV !== "production" && sortedActiveRoutineDays.length > 0 && sortedActiveRoutineDays[0]?.day_index !== 1) {
    console.warn("[routines] Active routine days are missing Day 1 in overview preview", {
      routineId: activeRoutine?.id,
      dayIndexes: sortedActiveRoutineDays.map((day) => day.day_index),
    });
  }

  return (
    <MainTabScreen topNavMode="none" ambientPreset="viewDay">
      <LoadingDiagnosticsClientBridge entries={diagnostics.snapshot()} />
      <ScrollScreenWithBottomActions
        topChrome={<AppNav mode="topChrome" />}
        floatingHeader={(
          <ContentRail className="py-1">
            <div id="routines-floating-header" />
          </ContentRail>
        )}
      >
        <ContentRail className="space-y-3">
          {routines.length === 0 ? (
            <EmptyState
              title="No routines yet"
              body="Create a routine to unify Today, session tracking, and history around the same training plan."
              action={(
                <Link
                  href="/routines/new"
                  className={getAppButtonClassName({ variant: "primary", fullWidth: true })}
                >
                  Create your first routine
                </Link>
              )}
            />
          ) : (
            <RoutinesPageClient
              activeRoutineId={activeRoutine?.id ?? null}
              activeRoutineName={activeRoutine?.name ?? null}
              activeRoutineSummary={cycleSummary ?? null}
              activeRoutineTrainingDays={activeRoutine ? trainingDays : null}
              activeRoutineRestDays={activeRoutine ? restDays : null}
              activeRoutineStartDate={activeRoutine?.start_date ?? null}
              activeRoutineEditHref={activeRoutine ? `/routines/${activeRoutine.id}/edit` : null}
              newRoutineHref="/routines/new"
              routines={visibleRoutines.map((routine) => ({
                id: routine.id,
                name: routine.name,
                summary: (() => {
                  const dayStats = routineDayStatsByRoutineId.get(routine.id);
                  const totalDaysForSummary = dayStats?.totalDays ?? routine.cycle_length_days;
                  const restDaysForSummary = dayStats?.restDays ?? 0;
                  const trainingDaysForSummary = Math.max(totalDaysForSummary - restDaysForSummary, 0);
                  const exerciseCountForSummary = exerciseCountByRoutineId.get(routine.id) ?? 0;
                  return formatRoutineBrowseCardSummary({
                    trainingDays: trainingDaysForSummary,
                    restDays: restDaysForSummary,
                    exerciseCount: exerciseCountForSummary,
                  });
                })(),
              }))}
              days={activeRoutine ? sortedActiveRoutineDays.map((day, index) => {
                const dayNumber = Number.isFinite(day.day_index) ? day.day_index : index + 1;
                const progressionState = resolveEditDayAutoProgressionState({
                  exercises: activeRoutineDayExercises
                    .filter((exercise) => exercise.routine_day_id === day.id)
                    .map((exercise) => ({
                      playbookId: exercise.progression_playbook_id ?? null,
                      config: exercise.progression_playbook_config ?? null,
                    })),
                  dayIndex: dayNumber,
                });
                return {
                  id: day.id,
                  dayIndex: dayNumber,
                  name: day.name ?? null,
                  isRest: Boolean(day.is_rest),
                  splitSummary: activeRoutineExerciseSummaries.get(day.id)
                    ?? getRestDayExerciseCountSummaryFromCanonicalDayOrFallback(null, Boolean(day.is_rest)),
                  href: `/routines/${activeRoutine.id}/edit/day/${day.id}`,
                  isToday: index === todayRowIndex,
                  isCompleted: completedDayIndexSet.has(dayNumber),
                  isSkipped: skippedDayIndexSet.has(dayNumber),
                  isInSession: inSessionDayIndex === dayNumber,
                  dayAdjustmentDirection: progressionState.showDayAdjustmentControl
                    ? progressionState.initialDayAdjustmentDirection
                    : null,
                };
              }) : []}
              setActiveRoutineAction={setActiveRoutineAction}
              initialRoutineListOpen={initialRoutineListOpen}
            />
          )}
        </ContentRail>
      </ScrollScreenWithBottomActions>
    </MainTabScreen>
  );
}
