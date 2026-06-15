import { cookies } from "next/headers";
import { AppNav } from "@/components/AppNav";
import { ContentRail } from "@/components/layout/ContentRail";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { RoutinesRouteHeaderCard } from "@/components/routines/RoutinesScreenFamily";
import { LoadingDiagnosticsClientBridge } from "@/components/shared/LoadingDiagnosticsClientBridge";
import { HeaderInfoRail } from "@/components/ui/HeaderInfoRail";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { RoutineDetailsScreenShell } from "@/components/routines/RoutineEditorShared";
import { CreateRoutineClient } from "@/app/routines/CreateRoutineClient";
import { RoutinesPageClient } from "@/app/routines/RoutinesPageClient";
import { NewRoutineDraftForm } from "@/app/routines/new/NewRoutineDraftForm";
import { duplicateRoutineAction } from "@/app/routines/actions";
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
import { formatRoutineDayStableDisplayName, getRoutineDayResolvedWeekdayLabel, getTodayDateInTimeZone } from "@/lib/routines";
import { supabaseServer } from "@/lib/supabase/server";
import { normalizeRoutineTimezone } from "@/lib/timezones";
import type { RoutineDayExerciseRow, RoutineDayRow, RoutineRow } from "@/types/db";
import { formatCount, formatDateShort } from "@/lib/formatting";

export const dynamic = "force-dynamic";

const ROUTINE_BROWSE_EXERCISE_SELECT = "id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, measurement_type, default_unit, notes, progression_playbook_id, progression_playbook_config";

type PageProps = {
  searchParams?: Promise<{ mode?: string }>;
};

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

export default async function NewRoutinePage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  if (resolvedSearchParams?.mode === "blank") {
    const user = await requireUser();
    const profile = await ensureProfile(user.id);
    const routineTimezoneDefault = normalizeRoutineTimezone(profile.timezone);
    const routineStartDateDefault = getTodayDateInTimeZone(routineTimezoneDefault);

    return (
      <RoutineDetailsScreenShell
        backHref="/routines/new"
        title="New Routine"
        align="center"
      >
        <NewRoutineDraftForm
          defaults={{
            name: "",
            cycleLengthDays: 7,
            scheduleMode: "weekday_anchored",
            startDate: routineStartDateDefault,
            startWeekday: "monday",
            timezone: routineTimezoneDefault,
            weightUnit: profile.preferred_weight_unit ?? "lbs",
            distanceUnit: profile.preferred_distance_unit ?? "mi",
          }}
        />
      </RoutineDetailsScreenShell>
    );
  }

  const diagnostics = new LoadingDiagnosticsCollector("/routines/new");
  const user = await requireUser({
    gate: "routines-create.auth.session",
    route: "/routines/new",
    blockingReason: "Waiting for authenticated session before loading routine creation.",
    timeoutMs: 5000,
    collector: diagnostics,
  });
  const profile = await diagnostics.measure("routines-create.profile.bootstrap", () => ensureProfile(user.id), {
    blockingReason: "Waiting for routine creation profile bootstrap.",
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

  const { data } = await diagnostics.measure("routines-create.list.fetch", async () => await supabase
    .from("routines")
    .select("id, user_id, name, cycle_length_days, schedule_mode, start_date, timezone, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false }), {
    blockingReason: "Waiting for routines to duplicate from.",
    metadata: {
      userId: user.id,
    },
    timeoutMs: 7000,
  });

  const routines = (data ?? []) as Array<Pick<RoutineRow, "id" | "user_id" | "name" | "cycle_length_days" | "schedule_mode" | "start_date" | "timezone" | "created_at" | "updated_at">>;
  const visibleRoutines = showQaLlelData
    ? routines
    : filterQaLlelRows(routines, (routine) => [routine.name]);
  const routineIds = visibleRoutines.map((routine) => routine.id);

  const { data: allRoutineDaysData } = routineIds.length
    ? await diagnostics.measure("routines-create.days.fetch", async () => await supabase
      .from("routine_days")
      .select("id, user_id, routine_id, day_index, name, is_rest, notes")
      .in("routine_id", routineIds)
      .eq("user_id", user.id), {
      blockingReason: "Waiting for routine day previews.",
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
  const { summaries } = allRoutineDays.length > 0
    ? await buildCanonicalDaySummaries({
      supabase,
      routineDays: allRoutineDays,
      allDayExercises: allRoutineDayExercises,
    })
    : { summaries: [] };
  const exerciseSummaryByDayId = new Map(
    summaries.map((summary) => [
      summary.day.id,
      getRestDayExerciseCountSummaryFromCanonicalDayOrFallback(summary, Boolean(summary.day.is_rest)),
    ]),
  );
  const { data: routineSessionsData } = routineIds.length
    ? await diagnostics.measure("routines-create.sessions.fetch", async () => await supabase
      .from("sessions")
      .select("routine_id, performed_at, status")
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
    : { data: [] };

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

  const routineBrowseItems = visibleRoutines.map((routine) => {
    const dayStats = routineDayStatsByRoutineId.get(routine.id);
    const totalDays = dayStats?.totalDays ?? routine.cycle_length_days;
    const restDays = dayStats?.restDays ?? 0;
    const exerciseCount = exerciseCountByRoutineId.get(routine.id) ?? 0;
    const sortedRoutineDays = allRoutineDays
      .filter((day) => day.routine_id === routine.id)
      .sort((left, right) => left.day_index - right.day_index);
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
  const activeRoutineName = visibleRoutines.find((routine) => routine.id === profile.active_routine_id)?.name ?? null;
  const headerInfoItems = buildRoutineBrowseInfoRailItems({
    activeRoutineName,
    routineCount: visibleRoutines.length,
  });
  const headerSubtitle = (
    <HeaderInfoRail
      items={headerInfoItems}
      ariaLabel="Routine browse summary"
      behavior="rotate-single"
      className="justify-center text-center"
    />
  );

  return (
    <MainTabScreen topNavMode="none" ambientPreset="viewDay">
      <LoadingDiagnosticsClientBridge entries={diagnostics.snapshot()} />
      <ScrollScreenWithBottomActions
        topChrome={<AppNav mode="topChrome" />}
        floatingHeader={(
          <ContentRail className="py-1">
            <RoutinesRouteHeaderCard
              title="Routines"
              titleClassName="sr-only"
              subtitle={headerSubtitle}
            />
          </ContentRail>
        )}
      >
        <ContentRail className="space-y-3">
          <RoutinesPageClient
            newRoutineHref="/routines/new"
            routines={routineBrowseItems}
          />
        </ContentRail>
      </ScrollScreenWithBottomActions>
      <CreateRoutineClient
        backHref="/routines"
        routines={routineBrowseItems}
        duplicateRoutineAction={duplicateRoutineAction}
      />
    </MainTabScreen>
  );
}
