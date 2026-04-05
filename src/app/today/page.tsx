import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { TodayClientShell } from "@/app/today/TodayClientShell";
import { TodayStartButton } from "@/app/today/TodayStartButton";
import { TodayOfflineBridge } from "@/app/today/TodayOfflineBridge";
import { TodayDayPicker } from "@/app/today/TodayDayPicker";
import { TodayRouteRevalidator } from "@/app/today/TodayRouteRevalidator";
import { TodayExerciseRows } from "@/app/today/TodayExerciseRows";
import { ConfirmedServerFormButton } from "@/components/destructive/ConfirmedServerFormButton";
import { OfflineSyncBadge } from "@/components/OfflineSyncBadge";
import { DayTaxonomyHeaderSummary } from "@/components/day-list/DayTaxonomyHeaderSummary";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { ScreenScaffold } from "@/components/ui/app/ScreenScaffold";
import { SharedScreenHeader } from "@/components/ui/app/SharedScreenHeader";
import { SharedSectionShell } from "@/components/ui/app/SharedSectionShell";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { BottomActionsSlot } from "@/components/layout/bottom-actions";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { requireUser } from "@/lib/auth";
import { TODAY_CACHE_SCHEMA_VERSION, type TodayCacheSnapshot } from "@/lib/offline/today-cache";
import { ensureProfile } from "@/lib/profile";
import { supabaseServer } from "@/lib/supabase/server";
import { getTodayGlobalErrorMessage, resolveTodayDisplayDay } from "@/lib/today-page-state";
import { getRoutineDayComputation, getTimeZoneDayWindow } from "@/lib/routines";
import { buildCanonicalDaySummaries } from "@/lib/routine-day-loader";
import { getRunnableDayState } from "@/lib/runnable-day";
import { getRestDayExerciseCountSummaryFromInputs, toExerciseCountSummaryInput } from "@/lib/day-summary";
import type { RoutineDayExerciseRow, RoutineDayRow, RoutineRow, SessionRow } from "@/types/db";
import { fitnessIntegrationClient } from "@/lib/ecosystem/fitness-integration-client";
import { publishFitnessIntegrationStateForMember } from "@/lib/ecosystem/fitness-integration-server";

export const dynamic = "force-dynamic";




async function discardInProgressSessionAction(formData: FormData): Promise<void> {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();
  const sessionId = String(formData.get("sessionId") ?? "").trim();
  const safeError = "Unable to discard the in-progress workout.";

  if (!sessionId) {
    redirect(`/today?error=${encodeURIComponent(safeError)}`);
  }

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .eq("status", "in_progress")
    .maybeSingle();

  if (sessionError) {
    redirect(`/today?error=${encodeURIComponent(safeError)}`);
  }

  if (!session) {
    redirect(`/today?error=${encodeURIComponent(safeError)}`);
  }

  const { data: sessionExerciseRows, error: sessionExerciseReadError } = await supabase
    .from("session_exercises")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  if (sessionExerciseReadError) {
    redirect(`/today?error=${encodeURIComponent(safeError)}`);
  }

  const sessionExerciseIds = (sessionExerciseRows ?? []).map((row) => row.id);
  if (sessionExerciseIds.length > 0) {
    const { error: setsDeleteError } = await supabase
      .from("sets")
      .delete()
      .in("session_exercise_id", sessionExerciseIds)
      .eq("user_id", user.id);

    if (setsDeleteError) {
      redirect(`/today?error=${encodeURIComponent(safeError)}`);
    }

    const { error: sessionExerciseDeleteError } = await supabase
      .from("session_exercises")
      .delete()
      .eq("session_id", sessionId)
      .eq("user_id", user.id);

    if (sessionExerciseDeleteError) {
      redirect(`/today?error=${encodeURIComponent(safeError)}`);
    }
  }

  const { error: sessionDeleteError } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .eq("status", "in_progress");

  if (sessionDeleteError) {
    redirect(`/today?error=${encodeURIComponent(safeError)}`);
  }

  const now = new Date();

  fitnessIntegrationClient.packageSignal({
    memberId: user.id,
    signalType: "workout_missed",
    reason: "session_discarded",
    emittedAt: now,
    payload: {
      memberId: user.id,
      sessionId,
      scheduledAt: now.toISOString(),
      missReasonCode: "discarded_in_progress",
      consecutiveMisses: 1,
    },
  });

  await publishFitnessIntegrationStateForMember({
    memberId: user.id,
    reason: "session_discarded",
    now,
  });

  redirect("/today");
}

export default async function TodayPage({ searchParams }: { searchParams?: { error?: string } }) {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);
  const supabase = supabaseServer();

  let activeRoutine: RoutineRow | null = null;
  let todayRoutineDay: RoutineDayRow | null = null;
  let allDayExercises: RoutineDayExerciseRow[] = [];
  let todayDayIndex: number | null = null;
  let completedTodayCount = 0;
  let completedDayIndexes: number[] = [];
  let inProgressSession: SessionRow | null = null;
  let inProgressSessionLoggedSetCount = 0;
  let inProgressExerciseProgressByRoutineExerciseId: Record<string, { loggedSetCount: number; isSkipped: boolean; targetSetsMin: number | null; targetSetsMax: number | null }> = {};
  let inProgressExerciseProgressByExerciseId: Record<string, { loggedSetCount: number; isSkipped: boolean; targetSetsMin: number | null; targetSetsMax: number | null }> = {};
  let fetchFailed = false;
  let routineDays: RoutineDayRow[] = [];

  if (profile.active_routine_id) {
    try {
      const { data: routine } = await supabase
        .from("routines")
        .select("id, user_id, name, cycle_length_days, start_date, timezone, updated_at, weight_unit")
        .eq("id", profile.active_routine_id)
        .eq("user_id", user.id)
        .maybeSingle();

      activeRoutine = (routine as RoutineRow | null) ?? null;

      if (activeRoutine) {
        const { dayIndex } = getRoutineDayComputation({
          cycleLengthDays: activeRoutine.cycle_length_days,
          startDate: activeRoutine.start_date,
          profileTimeZone: activeRoutine.timezone || profile.timezone,
        });

        todayDayIndex = dayIndex;

        const { data: routineDayRows } = await supabase
          .from("routine_days")
          .select("id, user_id, routine_id, day_index, name, is_rest, notes")
          .eq("routine_id", activeRoutine.id)
          .eq("user_id", user.id)
          .order("day_index", { ascending: true });

        routineDays = (routineDayRows ?? []) as RoutineDayRow[];
        todayRoutineDay = routineDays.find((day) => day.day_index === todayDayIndex) ?? null;

        if (routineDays.length > 0) {
          const { data: allExercises } = await supabase
            .from("routine_day_exercises")
            .select("id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, measurement_type, default_unit, notes")
            .in("routine_day_id", routineDays.map((day) => day.id))
            .eq("user_id", user.id)
            .order("position", { ascending: true });

          allDayExercises = (allExercises ?? []) as RoutineDayExerciseRow[];
        }


        const { startIso, endIso } = getTimeZoneDayWindow(activeRoutine.timezone || profile.timezone);

        const { count: completedTodayCountValue } = await supabase
          .from("sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "completed")
          .eq("routine_id", activeRoutine.id)
          .gte("performed_at", startIso)
          .lt("performed_at", endIso)
          .limit(1);

        completedTodayCount = completedTodayCountValue ?? 0;

        const { data: completedTodaySessions } = await supabase
          .from("sessions")
          .select("routine_day_index")
          .eq("user_id", user.id)
          .eq("status", "completed")
          .eq("routine_id", activeRoutine.id)
          .gte("performed_at", startIso)
          .lt("performed_at", endIso);

        completedDayIndexes = [...new Set(
          (completedTodaySessions ?? [])
            .map((session) => session.routine_day_index)
            .filter((value): value is number => Number.isFinite(value)),
        )];

        const { data: inProgress } = await supabase
          .from("sessions")
          .select("id, user_id, performed_at, notes, routine_id, routine_day_index, name, routine_day_name, duration_seconds, status")
          .eq("user_id", user.id)
          .eq("routine_id", activeRoutine.id)
          .eq("status", "in_progress")
          .order("performed_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        inProgressSession = (inProgress as SessionRow | null) ?? null;

        if (inProgressSession?.id) {
          const { data: sessionExercises } = await supabase
            .from("session_exercises")
            .select("id, exercise_id, routine_day_exercise_id, is_skipped, target_sets_min, target_sets_max")
            .eq("session_id", inProgressSession.id)
            .eq("user_id", user.id);

          const sessionExerciseIds = (sessionExercises ?? []).map((row) => row.id);
          if (sessionExerciseIds.length > 0) {
            const { data: setRows } = await supabase
              .from("sets")
              .select("session_exercise_id")
              .eq("user_id", user.id)
              .in("session_exercise_id", sessionExerciseIds);

            const setCountsBySessionExerciseId = (setRows ?? []).reduce<Record<string, number>>((acc, row) => {
              const key = row.session_exercise_id;
              if (!key) return acc;
              acc[key] = (acc[key] ?? 0) + 1;
              return acc;
            }, {});

            inProgressSessionLoggedSetCount = Object.values(setCountsBySessionExerciseId).reduce((sum, count) => sum + count, 0);

            inProgressExerciseProgressByRoutineExerciseId = {};
            inProgressExerciseProgressByExerciseId = {};

            for (const sessionExercise of sessionExercises ?? []) {
              const progress = {
                loggedSetCount: setCountsBySessionExerciseId[sessionExercise.id] ?? 0,
                isSkipped: sessionExercise.is_skipped === true,
                targetSetsMin: sessionExercise.target_sets_min,
                targetSetsMax: sessionExercise.target_sets_max,
              };

              if (sessionExercise.routine_day_exercise_id) {
                inProgressExerciseProgressByRoutineExerciseId[sessionExercise.routine_day_exercise_id] = progress;
              }

              if (sessionExercise.exercise_id && !(sessionExercise.exercise_id in inProgressExerciseProgressByExerciseId)) {
                inProgressExerciseProgressByExerciseId[sessionExercise.exercise_id] = progress;
              }
            }
          }
        }
      }
    } catch {
      fetchFailed = true;
    }
  }

  const { summaries: normalizedDaySummaries } = await buildCanonicalDaySummaries({
    supabase,
    routineDays,
    allDayExercises,
  });
  const normalizedDayByIndex = new Map(normalizedDaySummaries.map((entry) => [entry.day.day_index, entry]));
  // Manual QA checklist:
  // - Start from the default day, back out, and confirm Resume still targets that same day.
  // - Select a different day, start workout, back out, and confirm Resume restores that selected day instead of recalculating calendar today.
  // - Hard refresh Today with an active session and confirm the started day still resumes.
  const displayDay = resolveTodayDisplayDay({
    calendarDayIndex: todayDayIndex,
    todayRoutineDay,
    routineDays,
    inProgressSession,
  });
  const effectiveDayIndex = displayDay.dayIndex;
  const effectiveRoutineDay = displayDay.routineDay;
  const effectiveDaySummary = effectiveRoutineDay ? normalizedDayByIndex.get(effectiveRoutineDay.day_index) ?? null : null;
  const routineName = activeRoutine?.name ?? null;
  const routineDayName = displayDay.dayName;

  const todayPayload = {
    routine:
      activeRoutine && effectiveDayIndex !== null && routineDayName
        ? {
            id: activeRoutine.id,
            name: routineName ?? "Routine",
            dayIndex: effectiveDayIndex,
            dayName: routineDayName,
            isRest: effectiveRoutineDay?.is_rest ?? false,
            state: effectiveDaySummary?.state ?? getRunnableDayState({
              isRest: effectiveRoutineDay?.is_rest ?? false,
              runnableExerciseCount: 0,
              invalidExerciseCount: 0,
            }),
            routineId: activeRoutine.id,
            routineDayId: effectiveRoutineDay?.id ?? null,
          }
        : null,
    exercises: (effectiveDaySummary?.runnableExercises ?? []).map((exercise) => {
      const progress = inProgressExerciseProgressByRoutineExerciseId[exercise.id]
        ?? inProgressExerciseProgressByExerciseId[exercise.details?.id ?? exercise.exercise_id]
        ?? null;

      return {
        id: exercise.id,
        exerciseId: exercise.details?.id ?? exercise.exercise_id,
        name: exercise.displayName,
        targets: exercise.goalLine,
        loggedSetCount: progress?.loggedSetCount ?? 0,
        isSkipped: progress?.isSkipped ?? false,
        targetSetsMin: progress?.targetSetsMin ?? null,
        targetSetsMax: progress?.targetSetsMax ?? null,
        notes: exercise.notes,
        measurement_type: exercise.details?.measurement_type ?? exercise.measurement_type ?? null,
        primary_muscle: exercise.details?.primary_muscle ?? null,
        equipment: exercise.details?.equipment ?? null,
        movement_pattern: exercise.details?.movement_pattern ?? null,
        kind: exercise.details?.kind ?? null,
        type: exercise.details?.type ?? null,
        tags: exercise.details?.tags ?? null,
        categories: exercise.details?.categories ?? null,
        isCardio: toExerciseCountSummaryInput({
          measurement_type: exercise.details?.measurement_type ?? exercise.measurement_type ?? null,
          equipment: exercise.details?.equipment ?? null,
          movement_pattern: exercise.details?.movement_pattern ?? null,
          primary_muscle: exercise.details?.primary_muscle ?? null,
          kind: exercise.details?.kind ?? null,
          type: exercise.details?.type ?? null,
          tags: exercise.details?.tags ?? null,
          categories: exercise.details?.categories ?? null,
        }).isCardio,
        image_howto_path: exercise.details?.image_howto_path ?? null,
        image_icon_path: exercise.details?.image_icon_path ?? null,
        slug: exercise.details?.slug ?? null,
        how_to_short: exercise.details?.how_to_short ?? null,
      };
    }),
    completedTodayCount,
    inProgressSessionId: inProgressSession?.id ?? null,
  };

  const todayGlobalError = getTodayGlobalErrorMessage({
    searchParamError: searchParams?.error,
    hasInProgressSession: Boolean(todayPayload.inProgressSessionId),
    fetchFailed,
  });
  const todaySnapshot: TodayCacheSnapshot | null =
    todayPayload.routine === null
      ? null
      : {
          schemaVersion: TODAY_CACHE_SCHEMA_VERSION,
          capturedAt: new Date().toISOString(),
          routine: todayPayload.routine,
          exercises: todayPayload.exercises,
          hints: {
            inProgressSessionId: todayPayload.inProgressSessionId,
            completedTodayCount,
            recentExerciseIds: (effectiveDaySummary?.runnableExercises ?? []).map((exercise) => exercise.exercise_id),
          },
        };

  return (
    <MainTabScreen topNavMode="none">
      <ScrollScreenWithBottomActions
        topChrome={<AppNav mode="topChrome" />}
        bottomDock={<BottomActionsSlot />}
        floatingHeader={todayPayload.routine ? (
          todayPayload.inProgressSessionId ? (
            <ScreenScaffold recipe="todayOverview" className="mx-auto w-full max-w-md">
              <SharedScreenHeader
                recipe="todayOverview"
                title={todayPayload.routine.name}
                subtitle={(
                  <DayTaxonomyHeaderSummary
                    dayName={todayPayload.routine.dayName}
                    summary={getRestDayExerciseCountSummaryFromInputs(todayPayload.exercises, todayPayload.routine.isRest)}
                    isRest={todayPayload.routine.isRest}
                  />
                )}
                action={todayPayload.inProgressSessionId
                  ? <AppBadge tone="success">In Session</AppBadge>
                  : completedDayIndexes.includes(todayPayload.routine.dayIndex)
                    ? <AppBadge tone="success">Completed</AppBadge>
                    : undefined}
              />
            </ScreenScaffold>
          ) : (
            <ScreenScaffold recipe="todayOverview" className="mx-auto w-full max-w-md">
              <div id="today-floating-header-slot" />
            </ScreenScaffold>
          )
        ) : !todayPayload.routine ? (
          <ScreenScaffold recipe="todayOverview" className="mx-auto w-full max-w-md">
            <SharedScreenHeader
              recipe="todayOverview"
              title="No active routine"
              subtitle="Select a routine to plan your session."
            />
          </ScreenScaffold>
        ) : undefined}
      >
          <TodayRouteRevalidator />
          {todayPayload.routine && !fetchFailed ? (
            <div className="space-y-3">
              <OfflineSyncBadge />
              {todayPayload.inProgressSessionId ? (
                <ScreenScaffold recipe="todayOverview" className="mx-auto w-full max-w-md">
                  <SharedSectionShell recipe="todayOverview" bodyClassName="space-y-2.5">
                    <TodayExerciseRows
                      exercises={todayPayload.exercises}
                      emptyMessage={todayPayload.routine.state === "rest" ? "Recovery and mobility only." : "No runnable exercises planned for this day."}
                    />
                  </SharedSectionShell>
                </ScreenScaffold>
              ) : (
                <TodayDayPicker
                  days={normalizedDaySummaries.map(({ day, state, runnableExercises, invalidExercises }) => ({
                    id: day.id,
                    dayIndex: day.day_index,
                    name: day.name || `Day ${day.day_index}`,
                    isRest: day.is_rest,
                    state,
                    invalidExerciseCount: invalidExercises.length,
                    exercises: runnableExercises.map((exercise) => ({
                      id: exercise.id,
                      exerciseId: exercise.details?.id ?? exercise.exercise_id,
                      name: exercise.displayName,
                      targets: exercise.goalLine,
                      primary_muscle: exercise.details?.primary_muscle ?? null,
                      equipment: exercise.details?.equipment ?? null,
                      movement_pattern: exercise.details?.movement_pattern ?? null,
                      measurement_type: exercise.details?.measurement_type ?? exercise.measurement_type ?? null,
                      kind: exercise.details?.kind ?? null,
                      type: exercise.details?.type ?? null,
                      tags: exercise.details?.tags ?? null,
                      categories: exercise.details?.categories ?? null,
                      isCardio: toExerciseCountSummaryInput({
                        measurement_type: exercise.details?.measurement_type ?? exercise.measurement_type ?? null,
                        equipment: exercise.details?.equipment ?? null,
                        movement_pattern: exercise.details?.movement_pattern ?? null,
                        primary_muscle: exercise.details?.primary_muscle ?? null,
                        kind: exercise.details?.kind ?? null,
                        type: exercise.details?.type ?? null,
                        tags: exercise.details?.tags ?? null,
                        categories: exercise.details?.categories ?? null,
                      }).isCardio,
                      image_howto_path: exercise.details?.image_howto_path ?? null,
                      image_icon_path: exercise.details?.image_icon_path ?? null,
                      slug: exercise.details?.slug ?? null,
                      how_to_short: exercise.details?.how_to_short ?? null,
                    })),
                  }))}
                  currentDayIndex={todayPayload.routine.dayIndex}
                  inProgressSessionId={todayPayload.inProgressSessionId}
                  completedDayIndexes={completedDayIndexes}
                  inSessionDayIndex={inProgressSession?.routine_day_index ?? null}
                  loggedSetCountsByDayIndex={inProgressSession?.routine_day_index
                    ? { [inProgressSession.routine_day_index]: inProgressSessionLoggedSetCount }
                    : {}}
                  routineName={todayPayload.routine.name}
                  floatingHeaderSlotId="today-floating-header-slot"
                />
              )}
            </div>
          ) : (
            <TodayClientShell payload={todayPayload} fetchFailed={fetchFailed} />
          )}

          {todayPayload.routine && todayPayload.inProgressSessionId && !fetchFailed ? (
            <PublishBottomActions>
              <BottomActionSplit
                primary={(
                  <TodayStartButton
                    sessionId={todayPayload.inProgressSessionId}
                    returnTo="/today"
                    fullWidth
                    className={getAppButtonClassName({ variant: "primary", size: "md", fullWidth: true, className: "border-emerald-300/60 bg-emerald-500/28 text-emerald-50 shadow-[0_0_12px_rgba(16,185,129,0.2)] transition-transform hover:bg-emerald-500/34 active:scale-[0.98] active:bg-emerald-500/38" })}
                    label="Resume Session"
                  />
                )}
                secondary={(
                  <ConfirmedServerFormButton
                    action={discardInProgressSessionAction}
                    hiddenFields={{ sessionId: todayPayload.inProgressSessionId }}
                    triggerLabel="Discard Session"
                    triggerClassName="h-full w-full"
                    size="md"
                    modalTitle="Discard workout?"
                    modalConsequenceText="This will delete your in-progress workout, including exercises and sets."
                    confirmLabel="Discard"
                  />
                )}
              />
            </PublishBottomActions>
          ) : null}

          <TodayOfflineBridge snapshot={todaySnapshot} />

          {todayGlobalError ? <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{todayGlobalError}</p> : null}
      </ScrollScreenWithBottomActions>
    </MainTabScreen>
  );
}
