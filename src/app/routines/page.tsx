import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { RoutinesPageClient } from "@/app/routines/RoutinesPageClient";
import { ActiveRoutineStatusBadge, ActiveRoutineSummaryCard } from "@/components/routines/RoutinesScreenFamily";
import { requireUser } from "@/lib/auth";
import { formatRestDayExerciseCountSummary } from "@/lib/exercise-count-summary";
import { ensureProfile } from "@/lib/profile";
import { buildCanonicalDaySummaries } from "@/lib/routine-day-loader";
import { getRoutineDayComputation, getTimeZoneDayWindow } from "@/lib/routines";
import { supabaseServer } from "@/lib/supabase/server";
import { revalidateRoutinesViews } from "@/lib/revalidation";
import { getExerciseCountSummaryFromCanonicalExercises } from "@/lib/day-summary";
import type { RoutineDayExerciseRow, RoutineDayRow, RoutineRow } from "@/types/db";

export const dynamic = "force-dynamic";

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
  const resolvedSearchParams = await searchParams;
  const initialRoutineListOpen = resolvedSearchParams?.view === "list";
  const user = await requireUser();
  const profile = await ensureProfile(user.id);
  const supabase = supabaseServer();

  const { data } = await supabase
    .from("routines")
    .select("id, user_id, name, cycle_length_days, start_date, timezone, updated_at, weight_unit")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const routines = (data ?? []) as RoutineRow[];
  const activeRoutine = routines.find((routine) => routine.id === profile.active_routine_id) ?? routines[0] ?? null;
  const routineIds = routines.map((routine) => routine.id);

  const { data: allRoutineDaysData } = routineIds.length
    ? await supabase
      .from("routine_days")
      .select("id, routine_id, is_rest")
      .in("routine_id", routineIds)
      .eq("user_id", user.id)
    : { data: [] };
  const allRoutineDays = (allRoutineDaysData ?? []) as Array<Pick<RoutineDayRow, "id" | "routine_id" | "is_rest">>;

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
  let activeRoutineExerciseSummaries = new Map<string, string>();

  if (activeRoutine) {
    const { data: routineDays } = await supabase
      .from("routine_days")
      .select("id, user_id, routine_id, day_index, name, is_rest, notes")
      .eq("routine_id", activeRoutine.id)
      .eq("user_id", user.id)
      .order("day_index", { ascending: true });

    activeRoutineDays = (routineDays ?? []) as RoutineDayRow[];

    if (activeRoutineDays.length > 0) {
      const { data: routineDayExercises } = await supabase
        .from("routine_day_exercises")
        .select("id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, measurement_type, default_unit, notes")
        .in("routine_day_id", activeRoutineDays.map((day) => day.id))
        .eq("user_id", user.id);

      const { summaries } = await buildCanonicalDaySummaries({
        supabase,
        routineDays: activeRoutineDays,
        allDayExercises: (routineDayExercises ?? []) as RoutineDayExerciseRow[],
      });

      activeRoutineExerciseSummaries = new Map(
        summaries.map((summary) => [
          summary.day.id,
          getExerciseCountSummaryFromCanonicalExercises(summary.runnableExercises).label,
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
  const todayRoutineDayComputation = activeRoutine?.start_date && cycleLength > 0
    ? getRoutineDayComputation({
        cycleLengthDays: cycleLength,
        startDate: activeRoutine.start_date,
        profileTimeZone: activeRoutine.timezone || profile.timezone,
      })
    : null;
  const todayRoutineDayIndex = todayRoutineDayComputation?.dayIndex ?? null;
  const todayRowIndex = todayRoutineDayIndex === null
    ? -1
    : sortedActiveRoutineDays.findIndex((day, index) => {
        const dayNumber = Number.isFinite(day.day_index) ? day.day_index : index + 1;
        return dayNumber === todayRoutineDayIndex;
      });

  let completedDayIndexSet = new Set<number>();
  let inSessionDayIndex: number | null = null;
  let inSessionLoggedSetCount = 0;

  if (activeRoutine) {
    const { startIso, endIso } = getTimeZoneDayWindow(activeRoutine.timezone || profile.timezone);
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

    if (inProgressSession?.id) {
      const { data: sessionExercises } = await supabase
        .from("session_exercises")
        .select("id")
        .eq("session_id", inProgressSession.id)
        .eq("user_id", user.id);

      const sessionExerciseIds = (sessionExercises ?? []).map((row) => row.id);
      if (sessionExerciseIds.length > 0) {
        const { count: loggedSetCount } = await supabase
          .from("sets")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .in("session_exercise_id", sessionExerciseIds);

        inSessionLoggedSetCount = loggedSetCount ?? 0;
      }
    }
  }

  if (process.env.NODE_ENV !== "production" && sortedActiveRoutineDays.length > 0 && sortedActiveRoutineDays[0]?.day_index !== 1) {
    console.warn("[routines] Active routine days are missing Day 1 in overview preview", {
      routineId: activeRoutine?.id,
      dayIndexes: sortedActiveRoutineDays.map((day) => day.day_index),
    });
  }

  return (
    <MainTabScreen topNavMode="none">
      <ScrollScreenWithBottomActions
        topChrome={<AppNav mode="topChrome" />}
        floatingHeader={(
          <div className="mx-auto w-full max-w-md px-1">
            <ActiveRoutineSummaryCard
              title={activeRoutine?.name ?? "Select routine"}
              metadata={cycleSummary}
              status={<ActiveRoutineStatusBadge active={Boolean(activeRoutine?.id)} />}
            />
          </div>
        )}
      >
        <div className="space-y-3 px-1">
          {routines.length === 0 ? (
            <div className="space-y-3 rounded-xl border border-border/45 bg-surface/45 p-4">
              <p className="text-sm text-muted">No routines yet.</p>
              <Link
                href="/routines/new"
                className={getAppButtonClassName({ variant: "primary", fullWidth: true })}
              >
                Create your first routine
              </Link>
            </div>
          ) : (
            <RoutinesPageClient
              activeRoutineId={activeRoutine?.id ?? null}
              activeRoutineEditHref={activeRoutine ? `/routines/${activeRoutine.id}/edit` : null}
              newRoutineHref="/routines/new"
              routines={routines.map((routine) => ({
                id: routine.id,
                name: routine.name,
                summary: (() => {
                  const dayStats = routineDayStatsByRoutineId.get(routine.id);
                  const totalDaysForSummary = dayStats?.totalDays ?? routine.cycle_length_days;
                  const restDaysForSummary = dayStats?.restDays ?? 0;
                  const trainingDaysForSummary = Math.max(totalDaysForSummary - restDaysForSummary, 0);
                  const exerciseCountForSummary = exerciseCountByRoutineId.get(routine.id) ?? 0;
                  return `${totalDaysForSummary} days • ${trainingDaysForSummary} training • ${restDaysForSummary} rest • ${exerciseCountForSummary} exercises`;
                })(),
              }))}
              days={activeRoutine ? sortedActiveRoutineDays.map((day, index) => {
                const dayNumber = Number.isFinite(day.day_index) ? day.day_index : index + 1;
                return {
                  id: day.id,
                  dayIndex: dayNumber,
                  title: day.name?.trim() || (day.is_rest ? "Rest" : "Training"),
                  isRest: Boolean(day.is_rest),
                  exerciseSummary: activeRoutineExerciseSummaries.get(day.id) ?? formatRestDayExerciseCountSummary([], Boolean(day.is_rest)).label,
                  notes: day.notes ?? null,
                  href: `/routines/${activeRoutine.id}/days/${day.id}`,
                  isToday: index === todayRowIndex,
                  isCompleted: completedDayIndexSet.has(dayNumber),
                  isInSession: inSessionDayIndex === dayNumber,
                  loggedSetCount: inSessionDayIndex === dayNumber ? inSessionLoggedSetCount : 0,
                };
              }) : []}
              setActiveRoutineAction={setActiveRoutineAction}
              initialRoutineListOpen={initialRoutineListOpen}
            />
          )}
        </div>
      </ScrollScreenWithBottomActions>
    </MainTabScreen>
  );
}
