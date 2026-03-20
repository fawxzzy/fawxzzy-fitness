import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { TodayClientShell } from "@/app/today/TodayClientShell";
import { TodayOfflineBridge } from "@/app/today/TodayOfflineBridge";
import { TodayDayPicker } from "@/app/today/TodayDayPicker";
import { TodayExerciseRows } from "@/app/today/TodayExerciseRows";
import { ConfirmedServerFormButton } from "@/components/destructive/ConfirmedServerFormButton";
import { OfflineSyncBadge } from "@/components/OfflineSyncBadge";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { AppHeader } from "@/components/ui/app/AppHeader";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { requireUser } from "@/lib/auth";
import { TODAY_CACHE_SCHEMA_VERSION, type TodayCacheSnapshot } from "@/lib/offline/today-cache";
import { ensureProfile } from "@/lib/profile";
import { mapRoutineDayGoalToSessionColumns } from "@/lib/exercise-goal-payload";
import { getRunnableDayState, getSessionStartErrorMessage } from "@/lib/runnable-day";
import { buildCanonicalDaySummaries } from "@/lib/routine-day-loader";
import { defaultUnitForSessionExerciseMeasurementType, resolveSessionExerciseMeasurementType, warnOnSessionExerciseUnitMismatch } from "@/lib/session-exercise-measurement";
import { getRoutineDayComputation, getTimeZoneDayWindow } from "@/lib/routines";
import { supabaseServer } from "@/lib/supabase/server";
import { getTodayGlobalErrorMessage } from "@/lib/today-page-state";
import { formatExerciseCountSummary } from "@/lib/exercise-count-summary";
import type { ActionResult } from "@/lib/action-result";
import type { RoutineDayExerciseRow, RoutineDayRow, RoutineRow, SessionRow } from "@/types/db";

export const dynamic = "force-dynamic";

async function startSessionAction(payload?: { dayIndex?: number }): Promise<ActionResult<{ sessionId: string }>> {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();
  const profile = await ensureProfile(user.id);

  if (!profile.active_routine_id) {
    return { ok: false, error: "No active routine selected" };
  }

  const { data: activeRoutine, error: routineError } = await supabase
    .from("routines")
    .select("id, name, cycle_length_days, start_date, timezone")
    .eq("id", profile.active_routine_id)
    .eq("user_id", user.id)
    .single();

  if (routineError || !activeRoutine) {
    return { ok: false, error: "Your active routine could not be loaded." };
  }

  const defaultDay = getRoutineDayComputation({
    cycleLengthDays: activeRoutine.cycle_length_days,
    startDate: activeRoutine.start_date,
    profileTimeZone: activeRoutine.timezone || profile.timezone,
  });

  const routineDayIndex = payload?.dayIndex && Number.isInteger(payload.dayIndex)
    ? payload.dayIndex
    : defaultDay.dayIndex;

  const { data: routineDay, error: routineDayError } = await supabase
    .from("routine_days")
    .select("id, user_id, routine_id, day_index, name, is_rest, notes")
    .eq("routine_id", activeRoutine.id)
    .eq("day_index", routineDayIndex)
    .eq("user_id", user.id)
    .single();

  if (routineDayError || !routineDay) {
    return { ok: false, error: "That routine day could not be loaded." };
  }

  const routineDayName = routineDay.name || `Day ${routineDayIndex}`;

  const { data: templateExercises, error: templateError } = await supabase
    .from("routine_day_exercises")
    .select("id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, notes, measurement_type, default_unit")
    .eq("routine_day_id", routineDay.id)
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  if (templateError) {
    return { ok: false, error: "Could not load exercises for this day." };
  }

  const { summaries } = await buildCanonicalDaySummaries({
    supabase,
    routineDays: [routineDay as RoutineDayRow],
    allDayExercises: (templateExercises ?? []) as RoutineDayExerciseRow[],
  });
  const canonicalDay = summaries[0] ?? null;
  const runnableExercises = canonicalDay?.runnableExercises ?? [];
  const invalidExercises = canonicalDay?.invalidExercises ?? [];
  const startError = getSessionStartErrorMessage({
    isRest: Boolean(routineDay.is_rest),
    runnableExerciseCount: runnableExercises.length,
    invalidExerciseCount: invalidExercises.length,
  });

  if (startError) {
    return { ok: false, error: startError };
  }

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      routine_id: activeRoutine.id,
      routine_day_index: routineDayIndex,
      name: activeRoutine.name,
      routine_day_name: routineDayName,
      status: "in_progress",
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    return { ok: false, error: "Could not create workout session." };
  }

  if (runnableExercises.length > 0) {
    const { error: exerciseError } = await supabase.from("session_exercises").insert(
      runnableExercises.map((exercise) => {
        const mappedGoalColumns = mapRoutineDayGoalToSessionColumns({
          target_sets: exercise.target_sets,
          target_reps: exercise.target_reps,
          target_reps_min: exercise.target_reps_min,
          target_reps_max: exercise.target_reps_max,
          target_weight: exercise.target_weight,
          target_weight_unit: exercise.target_weight_unit,
          target_duration_seconds: exercise.target_duration_seconds,
          target_distance: exercise.target_distance,
          target_distance_unit: exercise.target_distance_unit,
          target_calories: exercise.target_calories,
          measurement_type: exercise.measurement_type ?? null,
          default_unit: exercise.default_unit ?? null,
        });

        const measurementType = resolveSessionExerciseMeasurementType(mappedGoalColumns.measurement_type ?? exercise.details?.measurement_type);
        const defaultUnit = defaultUnitForSessionExerciseMeasurementType(measurementType);
        warnOnSessionExerciseUnitMismatch({ measurementType, defaultUnit, context: "startSessionAction" });

        return {
          session_id: session.id,
          user_id: user.id,
          exercise_id: exercise.exercise_id,
          routine_day_exercise_id: exercise.id,
          position: exercise.position,
          notes: exercise.notes,
          is_skipped: false,
          ...mappedGoalColumns,
          measurement_type: measurementType,
          default_unit: defaultUnit,
        };
      }),
    );

    if (exerciseError) {
      await supabase
        .from("sessions")
        .delete()
        .eq("id", session.id)
        .eq("user_id", user.id);
      return { ok: false, error: "Could not start workout for this day." };
    }
  }

  return { ok: true, data: { sessionId: session.id } };
}


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
  let inProgressSession: SessionRow | null = null;
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
            .select("id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, notes")
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

        const { data: inProgress } = await supabase
          .from("sessions")
          .select("id, user_id, performed_at, notes, routine_id, routine_day_index, name, routine_day_name, duration_seconds, status")
          .eq("user_id", user.id)
          .eq("routine_id", activeRoutine.id)
          .eq("status", "in_progress")
          .gte("performed_at", startIso)
          .lt("performed_at", endIso)
          .order("performed_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        inProgressSession = (inProgress as SessionRow | null) ?? null;
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
  // - Change day on Today, start workout, leave, return: displayed day matches Resume target.
  const effectiveDayIndex = inProgressSession?.routine_day_index ?? todayDayIndex;
  const effectiveRoutineDay = effectiveDayIndex === null
    ? todayRoutineDay
    : routineDays.find((day) => day.day_index === effectiveDayIndex) ?? todayRoutineDay;
  const effectiveDaySummary = effectiveRoutineDay ? normalizedDayByIndex.get(effectiveRoutineDay.day_index) ?? null : null;
  const routineName = activeRoutine?.name ?? null;
  const routineDayName = effectiveRoutineDay ? effectiveRoutineDay.name ?? `Day ${effectiveDayIndex ?? effectiveRoutineDay.day_index}` : null;

  const todayPayload = {
    routine:
      activeRoutine && effectiveRoutineDay && effectiveDayIndex !== null && routineDayName
        ? {
            id: activeRoutine.id,
            name: routineName ?? "Routine",
            dayIndex: effectiveDayIndex,
            dayName: routineDayName,
            isRest: effectiveRoutineDay.is_rest,
            state: effectiveDaySummary?.state ?? getRunnableDayState({
              isRest: effectiveRoutineDay.is_rest,
              runnableExerciseCount: 0,
              invalidExerciseCount: 0,
            }),
            routineId: activeRoutine.id,
            routineDayId: effectiveRoutineDay.id,
          }
        : null,
    exercises: (effectiveDaySummary?.runnableExercises ?? []).map((exercise) => {
      return {
        id: exercise.id,
        exerciseId: exercise.details?.id ?? exercise.exercise_id,
        name: exercise.displayName,
        targets: exercise.goalLine,
        notes: exercise.notes,
        measurement_type: exercise.details?.measurement_type ?? exercise.measurement_type ?? null,
        primary_muscle: exercise.details?.primary_muscle ?? null,
        equipment: exercise.details?.equipment ?? null,
        movement_pattern: exercise.details?.movement_pattern ?? null,
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
    <MainTabScreen>
      <AppNav />
      <ScrollScreenWithBottomActions>
          {todayPayload.routine && !fetchFailed ? (
            <div className="space-y-4 px-1">
              <OfflineSyncBadge />
              {todayPayload.inProgressSessionId ? (
                <div className="space-y-4">
                  <AppPanel className="space-y-3">
                    <AppHeader
                      title={`${todayPayload.routine.name} | ${todayPayload.routine.dayName}`}
                      subtitleRight={todayPayload.routine.state === "rest"
                        ? "Rest day"
                        : formatExerciseCountSummary(todayPayload.exercises.map((exercise) => ({
                          measurement_type: exercise.measurement_type ?? null,
                          equipment: exercise.equipment ?? null,
                          movement_pattern: exercise.movement_pattern ?? null,
                        }))).label}
                      action={todayPayload.completedTodayCount > 0 ? <AppBadge>Completed</AppBadge> : undefined}
                    />

                    <TodayExerciseRows
                      exercises={todayPayload.exercises}
                      emptyMessage={todayPayload.routine.state === "rest" ? "Rest day. No workout to start today." : "No runnable exercises planned for this day."}
                    />
                  </AppPanel>
                </div>
              ) : (
                <TodayDayPicker
                  routineName={todayPayload.routine.name}
                  routineId={todayPayload.routine.id}
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
                      image_howto_path: exercise.details?.image_howto_path ?? null,
                      image_icon_path: exercise.details?.image_icon_path ?? null,
                      slug: exercise.details?.slug ?? null,
                      how_to_short: exercise.details?.how_to_short ?? null,
                    })),
                  }))}
                  currentDayIndex={todayPayload.routine.dayIndex}
                  completedTodayCount={todayPayload.completedTodayCount}
                  startSessionAction={startSessionAction}
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
                  <Link href={`/session/${todayPayload.inProgressSessionId}?returnTo=${encodeURIComponent("/today")}`} className={getAppButtonClassName({ variant: "primary", size: "md", fullWidth: true, className: "border-emerald-300/60 bg-emerald-500/28 text-emerald-50 shadow-[0_0_12px_rgba(16,185,129,0.2)] transition-transform hover:bg-emerald-500/34 active:scale-[0.98] active:bg-emerald-500/38" })}>
                    Resume session
                  </Link>
                )}
                secondary={(
                  <ConfirmedServerFormButton
                    action={discardInProgressSessionAction}
                    hiddenFields={{ sessionId: todayPayload.inProgressSessionId }}
                    triggerLabel="Discard session"
                    triggerClassName="w-full"
                    size="md"
                    modalTitle="Discard workout?"
                    modalDescription="This will delete your in-progress workout, including exercises and sets."
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
