import { cookies } from "next/headers";
import { AppNav } from "@/components/AppNav";
import { ContentRail } from "@/components/layout/ContentRail";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { RoutinesRouteHeaderCard } from "@/components/routines/RoutinesScreenFamily";
import { LoadingDiagnosticsClientBridge } from "@/components/shared/LoadingDiagnosticsClientBridge";
import { HeaderInfoRail } from "@/components/ui/HeaderInfoRail";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { RoutinesPageClient } from "@/app/routines/RoutinesPageClient";
import { deleteRoutineAction, duplicateRoutineAction, setActiveRoutineAction } from "@/app/routines/actions";
import { requireUser } from "@/lib/auth";
import { getRestDayExerciseCountSummaryFromCanonicalDayOrFallback } from "@/lib/day-summary";
import { buildRoutineBrowseInfoRailItems } from "@/lib/header-info-rail";
import { LoadingDiagnosticsCollector } from "@/lib/loading-diagnostics";
import { ensureProfile } from "@/lib/profile";
import {
  filterQaLlelRows,
  QA_LLEL_VISIBILITY_COOKIE,
  resolveQaLlelVisibilityOverride,
  resolveShowQaLlelDataPreferenceWithOverride,
} from "@/lib/qa-data-visibility";
import { buildCanonicalDaySummaries } from "@/lib/routine-day-loader";
import {
  formatRoutineDayStableDisplayName,
  getCurrentCycleOccurrenceContext,
  getRoutineDayResolvedWeekdayLabel,
  getRoutineStartWeekdayFromDate,
  getTimeZoneDayWindow,
  getTodayDateInTimeZone,
  resolveCompletedRoutineDayIndexesForOccurrence,
  resolveRoutineScheduleForToday,
} from "@/lib/routines";
import { supabaseServer } from "@/lib/supabase/server";
import { normalizeRoutineTimezone } from "@/lib/timezones";
import { ROUTINE_DRAFT_COOKIE_NAME } from "@/lib/routine-draft-session";
import type { RoutineDayExerciseRow, RoutineDayRow, RoutineRow } from "@/types/db";
import { formatCount, formatDateShort } from "@/lib/formatting";

export const dynamic = "force-dynamic";

const ROUTINE_BROWSE_EXERCISE_SELECT = "id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, measurement_type, default_unit, notes, progression_playbook_id, progression_playbook_config";

function buildRoutineBrowseSummaryParts(args: {
  totalDays: number;
  restDays: number;
  exerciseCount: number;
  completedSessionCount: number;
  lastCompletedSessionAt: string | null;
}) {
  const workoutPlanCount = Math.max(args.totalDays - args.restDays, 0);

  return [
    args.exerciseCount > 0
      ? formatCount(args.exerciseCount, "exercise")
      : "No exercises",
    formatCount(workoutPlanCount, "workout plan"),
    `${args.restDays} rest`,
    args.completedSessionCount > 0
      ? `${formatCount(args.completedSessionCount, "session")} logged`
      : "No sessions logged",
    args.lastCompletedSessionAt
      ? `Last ${formatDateShort(args.lastCompletedSessionAt)}`
      : "Not started",
  ];
}

export default async function RoutinesPage() {
  const diagnostics = new LoadingDiagnosticsCollector("/routines");
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
    .select("id, user_id, name, cycle_length_days, schedule_mode, start_date, timezone, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false }), {
    blockingReason: "Waiting for routines overview list.",
    metadata: {
      userId: user.id,
    },
    timeoutMs: 7000,
  });

  const routines = (data ?? []) as Array<Pick<RoutineRow, "id" | "user_id" | "name" | "cycle_length_days" | "schedule_mode" | "start_date" | "timezone" | "created_at" | "updated_at">>;
  const visibleRoutines = showQaLlelData
    ? routines
    : filterQaLlelRows(routines, (routine) => [routine.name]);
  const draftRoutineId = cookies().get(ROUTINE_DRAFT_COOKIE_NAME)?.value?.trim() || null;
  const draftRoutineName = draftRoutineId
    ? visibleRoutines.find((routine) => routine.id === draftRoutineId)?.name ?? null
    : null;
  const publishedVisibleRoutines = draftRoutineId
    ? visibleRoutines.filter((routine) => routine.id !== draftRoutineId)
    : visibleRoutines;
  const routineIds = publishedVisibleRoutines.map((routine) => routine.id);

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
      .select(ROUTINE_BROWSE_EXERCISE_SELECT)
      .in("routine_day_id", allRoutineDayIds)
      .eq("user_id", user.id)
    : { data: [] };
  const allRoutineDayExercises = (allRoutineDayExercisesData ?? []) as RoutineDayExerciseRow[];
  const canonicalDaySummariesPromise = allRoutineDays.length > 0
    ? diagnostics.measure("routines.canonical-day-summaries.fetch", () => buildCanonicalDaySummaries({
      supabase,
      routineDays: allRoutineDays,
      allDayExercises: allRoutineDayExercises,
      metadataMode: "preview",
    }), {
      blockingReason: "Waiting for normalized routine browse previews.",
      metadata: {
        userId: user.id,
        routineCount: routineIds.length,
        dayCount: allRoutineDays.length,
        exerciseCount: allRoutineDayExercises.length,
      },
      timeoutMs: 7000,
    })
    : Promise.resolve({ summaries: [] });
  const routineSessionsPromise = routineIds.length
    ? diagnostics.measure("routines.sessions.fetch", async () => await supabase
      .from("sessions")
      .select("routine_id, routine_day_index, performed_at, status")
      .in("routine_id", routineIds)
      .eq("user_id", user.id)
      .eq("status", "completed"), {
      blockingReason: "Waiting for routine session history summary.",
      metadata: {
        routineCount: routineIds.length,
        userId: user.id,
      },
      timeoutMs: 7000,
    })
    : Promise.resolve({ data: [] as { routine_id: string | null; routine_day_index: number | null; performed_at: string | null; status: string | null }[] });
  const [{ summaries }, { data: routineSessionsData }] = await Promise.all([
    canonicalDaySummariesPromise,
    routineSessionsPromise,
  ]);
  const exerciseSummaryByDayId = new Map(
    summaries.map((summary) => [
      summary.day.id,
      getRestDayExerciseCountSummaryFromCanonicalDayOrFallback(summary, Boolean(summary.day.is_rest)),
    ]),
  );

  const routineDayStatsByRoutineId = new Map<string, { totalDays: number; restDays: number }>();
  const routineIdByDayId = new Map<string, string>();
  for (const day of allRoutineDays) {
    const current = routineDayStatsByRoutineId.get(day.routine_id) ?? { totalDays: 0, restDays: 0 };
    current.totalDays += 1;
    if (day.is_rest) {
      current.restDays += 1;
    }
    routineDayStatsByRoutineId.set(day.routine_id, current);
    routineIdByDayId.set(day.id, day.routine_id);
  }

  const exerciseCountByRoutineId = new Map<string, number>();
  const exerciseCountByDayId = new Map<string, number>();
  for (const dayExercise of allRoutineDayExercises) {
    const routineId = routineIdByDayId.get(dayExercise.routine_day_id);
    if (!routineId) {
      continue;
    }
    exerciseCountByRoutineId.set(routineId, (exerciseCountByRoutineId.get(routineId) ?? 0) + 1);
    exerciseCountByDayId.set(dayExercise.routine_day_id, (exerciseCountByDayId.get(dayExercise.routine_day_id) ?? 0) + 1);
  }

  const completedSessionCountByRoutineId = new Map<string, number>();
  const lastCompletedSessionAtByRoutineId = new Map<string, string>();
  for (const session of routineSessionsData ?? []) {
    const routineId = typeof session.routine_id === "string" ? session.routine_id.trim() : "";
    const performedAt = typeof session.performed_at === "string" ? session.performed_at.trim() : "";
    if (!routineId || !performedAt) {
      continue;
    }

    completedSessionCountByRoutineId.set(routineId, (completedSessionCountByRoutineId.get(routineId) ?? 0) + 1);
    const currentLatest = lastCompletedSessionAtByRoutineId.get(routineId);
    if (!currentLatest || performedAt > currentLatest) {
      lastCompletedSessionAtByRoutineId.set(routineId, performedAt);
    }
  }

  const activeRoutineName = publishedVisibleRoutines.find((routine) => routine.id === profile.active_routine_id)?.name ?? null;
  const completedSessionsByRoutineId = new Map<string, Array<{ routine_day_index: number | null; performed_at: string | null }>>();
  for (const session of routineSessionsData ?? []) {
    const routineId = typeof session.routine_id === "string" ? session.routine_id.trim() : "";
    if (!routineId) {
      continue;
    }

    const current = completedSessionsByRoutineId.get(routineId) ?? [];
    current.push({
      routine_day_index: typeof session.routine_day_index === "number" ? session.routine_day_index : null,
      performed_at: typeof session.performed_at === "string" ? session.performed_at : null,
    });
    completedSessionsByRoutineId.set(routineId, current);
  }
  const headerInfoItems = buildRoutineBrowseInfoRailItems({
    activeRoutineName,
    routineCount: publishedVisibleRoutines.length,
  });
  const headerSubtitle = (
    <HeaderInfoRail
      items={headerInfoItems}
      ariaLabel="Routine browse summary"
      behavior="rotate-single"
      className="justify-center text-center"
    />
  );
  const routineBrowseItems = publishedVisibleRoutines.map((routine) => {
    const dayStats = routineDayStatsByRoutineId.get(routine.id);
    const totalDays = dayStats?.totalDays ?? routine.cycle_length_days;
    const restDays = dayStats?.restDays ?? 0;
    const exerciseCount = exerciseCountByRoutineId.get(routine.id) ?? 0;
    const routineTimeZone = routine.timezone || profile.timezone;
    const sortedRoutineDays = allRoutineDays
      .filter((day) => day.routine_id === routine.id)
      .sort((left, right) => left.day_index - right.day_index);
    let completedPreviewDayIndexes = new Set<number>();
    let skippedPreviewDayIndexes = new Set<number>();

    if (routine.id === profile.active_routine_id && sortedRoutineDays.length > 0) {
      const routineSessions = completedSessionsByRoutineId.get(routine.id) ?? [];
      const resolvedCycleLength = Number.isFinite(routine.cycle_length_days ?? null) && Number(routine.cycle_length_days) > 0
        ? Math.floor(Number(routine.cycle_length_days))
        : Math.max(sortedRoutineDays.length, 1);

      if (routine.start_date) {
        const todayRoutineSchedule = resolveRoutineScheduleForToday({
          cycleLengthDays: resolvedCycleLength,
          scheduleMode: routine.schedule_mode,
          startDate: routine.start_date,
          startWeekday: getRoutineStartWeekdayFromDate(routine.start_date),
          profileTimeZone: routineTimeZone,
        });

        if (todayRoutineSchedule.resolution.status === "scheduled" && todayRoutineSchedule.dayIndex !== null) {
          const { occurrenceDateByDayIndex } = getCurrentCycleOccurrenceContext({
            cycleLengthDays: resolvedCycleLength,
            startDate: routine.start_date,
            profileTimeZone: routineTimeZone,
            dayIndexes: sortedRoutineDays.map((day, index) => (
              Number.isFinite(day.day_index) ? day.day_index : index + 1
            )),
            referenceDate: todayRoutineSchedule.todayDate,
          });

          completedPreviewDayIndexes = new Set(resolveCompletedRoutineDayIndexesForOccurrence({
            sessions: routineSessions,
            occurrenceDateByDayIndex,
            timeZone: routineTimeZone,
          }));

          skippedPreviewDayIndexes = new Set(
            sortedRoutineDays
              .map((day, index) => ({
                day,
                dayNumber: Number.isFinite(day.day_index) ? day.day_index : index + 1,
              }))
              .filter(({ day, dayNumber }) => {
                const occurrenceDate = occurrenceDateByDayIndex.get(dayNumber);
                return Boolean(
                  occurrenceDate
                  && occurrenceDate < todayRoutineSchedule.todayDate
                  && !day.is_rest
                  && !completedPreviewDayIndexes.has(dayNumber),
                );
              })
              .map(({ dayNumber }) => dayNumber),
          );
        } else {
          const { startIso, endIso } = getTimeZoneDayWindow(routineTimeZone);
          completedPreviewDayIndexes = new Set(
            routineSessions
              .filter((session) => {
                if (!Number.isFinite(session.routine_day_index)) {
                  return false;
                }
                const performedAt = session.performed_at?.trim();
                return Boolean(performedAt && performedAt >= startIso && performedAt < endIso);
              })
              .map((session) => session.routine_day_index)
              .filter((value): value is number => Number.isFinite(value)),
          );
        }
      } else {
        const { startIso, endIso } = getTimeZoneDayWindow(routineTimeZone);
        completedPreviewDayIndexes = new Set(
          routineSessions
            .filter((session) => {
              if (!Number.isFinite(session.routine_day_index)) {
                return false;
              }
              const performedAt = session.performed_at?.trim();
              return Boolean(performedAt && performedAt >= startIso && performedAt < endIso);
            })
            .map((session) => session.routine_day_index)
            .filter((value): value is number => Number.isFinite(value)),
        );
      }
    }

    const previewDays = sortedRoutineDays.map((day) => ({
      id: day.id,
      dayIndex: day.day_index,
      title: formatRoutineDayStableDisplayName({
        name: day.name,
        dayIndex: day.day_index,
        startDate: routine.start_date,
      }),
      weekdayLabel: getRoutineDayResolvedWeekdayLabel({
        dayIndex: day.day_index,
        startDate: routine.start_date,
        cycleLengthDays: routine.cycle_length_days,
        scheduleMode: routine.schedule_mode,
        profileTimeZone: routine.timezone || profile.timezone,
        weekday: "short",
      }),
      isRest: Boolean(day.is_rest),
      isCompleted: completedPreviewDayIndexes.has(day.day_index),
      isSkipped: skippedPreviewDayIndexes.has(day.day_index),
      exerciseCount: exerciseCountByDayId.get(day.id) ?? 0,
      splitSummary: exerciseSummaryByDayId.get(day.id),
    }));

    return {
      id: routine.id,
      name: routine.name,
      summaryParts: buildRoutineBrowseSummaryParts({
        totalDays,
        restDays,
        exerciseCount,
        completedSessionCount: completedSessionCountByRoutineId.get(routine.id) ?? 0,
        lastCompletedSessionAt: lastCompletedSessionAtByRoutineId.get(routine.id) ?? null,
      }),
      createdAt: routine.created_at ?? null,
      href: `/routines/${routine.id}`,
      isActive: profile.active_routine_id === routine.id,
      previewDays,
    };
  });

  return (
    <MainTabScreen topNavMode="none" ambientPreset="viewDay">
      <LoadingDiagnosticsClientBridge entries={diagnostics.snapshot()} />
      <ScrollScreenWithBottomActions
        topChrome={<AppNav mode="topChrome" />}
        floatingHeader={(
          <ContentRail className="py-1">
            <RoutinesRouteHeaderCard
              title="Routines"
              subtitle={headerSubtitle}
            />
          </ContentRail>
        )}
      >
        <ContentRail className="space-y-3">
          <RoutinesPageClient
            routines={routineBrowseItems}
            workoutPlansHref="/routines/workout-plans"
            draftRoutineName={draftRoutineName}
            duplicateRoutineAction={duplicateRoutineAction}
            setActiveRoutineAction={setActiveRoutineAction}
            deleteRoutineAction={deleteRoutineAction}
          />
        </ContentRail>
      </ScrollScreenWithBottomActions>
    </MainTabScreen>
  );
}
