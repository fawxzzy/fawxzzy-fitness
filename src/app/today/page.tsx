import { redirect } from "next/navigation";
import { TodayClientShell } from "@/app/today/TodayClientShell";
import { TodayStartButton } from "@/app/today/TodayStartButton";
import { TodayOfflineBridge } from "@/app/today/TodayOfflineBridge";
import { TodayDayPicker } from "@/app/today/TodayDayPicker";
import { TodayRouteRevalidator } from "@/app/today/TodayRouteRevalidator";
import { TodayExerciseRows } from "@/app/today/TodayExerciseRows";
import { ConfirmedServerFormButton } from "@/components/destructive/ConfirmedServerFormButton";
import { OfflineSyncBadge } from "@/components/OfflineSyncBadge";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import {
  TodayFloatingHeaderRail,
  TodayFloatingHeaderSlot,
  TodayOverviewContent,
  TodayOverviewHeader,
  TodayOverviewScaffold,
  TodayRouteScaffold,
} from "@/components/today/TodayScreenFamily";
import { requireUser } from "@/lib/auth";
import { TODAY_CACHE_SCHEMA_VERSION, type TodayCacheSnapshot } from "@/lib/offline/today-cache";
import { ensureProfile } from "@/lib/profile";
import { supabaseServer } from "@/lib/supabase/server";
import {
  buildTodayRoutinePayloadState,
  formatTodayHeaderTitle,
  getTodayGlobalErrorMessage,
  resolveTodayDisplayDay,
} from "@/lib/today-page-state";
import { formatRoutineDayDisplayName, getRoutineDayComputation, getTimeZoneDayWindow } from "@/lib/routines";
import { buildCanonicalDaySummaries } from "@/lib/routine-day-loader";
import { getRunnableDayState } from "@/lib/runnable-day";
import { getDayTaxonomyHeaderSummaryParts, getRestDayExerciseCountSummaryFromInputs, toExerciseCountSummaryInput } from "@/lib/day-summary";
import type { RoutineDayExerciseRow, RoutineDayRow, RoutineRow, SessionRow } from "@/types/db";
import { TodayRecoveryShadowPlacement } from "@/app/today/TodayRecoveryShadowPlacement";
import {
  publishFitnessIntegrationStateForMember,
  recordFitnessSignalForMember,
} from "@/lib/ecosystem/fitness-integration-server";
import { prepareTodayRecoveryShadowPlacement } from "@/lib/ecosystem/fitness-shadow-placement";
import { guardLiveSessionMutation } from "@/lib/session-live-mutation";
import { loadTodayRecoveryShadowPlacementSafely } from "@/app/today/recovery-shadow-placement.server";

export const dynamic = "force-dynamic";

function createLiveSessionMutationRepository(supabase: ReturnType<typeof supabaseServer>) {
  return {
    async readSession(sessionId: string) {
      const { data } = await supabase
        .from("sessions")
        .select("id, user_id, status")
        .eq("id", sessionId)
        .maybeSingle();

      return data
        ? {
            id: data.id,
            userId: data.user_id,
            status: data.status,
          }
        : null;
    },
    async readSessionExercise(sessionExerciseId: string) {
      const { data } = await supabase
        .from("session_exercises")
        .select("id, session_id, user_id")
        .eq("id", sessionExerciseId)
        .maybeSingle();

      return data
        ? {
            id: data.id,
            sessionId: data.session_id,
            userId: data.user_id,
          }
        : null;
    },
  };
}

type TodayBootstrapStep =
  | "routine fetch"
  | "routine days fetch"
  | "exercises fetch"
  | "completion fetch"
  | "in-progress fetch"
  | "optional enrichments fetch";

function getTodayBootstrapErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return "Unknown Today bootstrap error";
}

function logTodayBootstrapFailure(args: {
  step: TodayBootstrapStep;
  userId: string;
  routineId?: string | null;
  activeRoutineId?: string | null;
  error: unknown;
}) {
  console.error("[today/bootstrap] failed to load Today state", {
    step: args.step,
    userId: args.userId,
    routineId: args.routineId ?? null,
    activeRoutineId: args.activeRoutineId ?? null,
    message: getTodayBootstrapErrorMessage(args.error),
  });
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

  const liveSession = await guardLiveSessionMutation(createLiveSessionMutationRepository(supabase), {
    userId: user.id,
    sessionId,
  });

  if (!liveSession.ok) {
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

  await recordFitnessSignalForMember({
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
  let detailedRoutineStateFailed = false;
  let routineDays: RoutineDayRow[] = [];

  const markBootstrapFailure = (step: TodayBootstrapStep, error: unknown, routineId = activeRoutine?.id ?? null) => {
    fetchFailed = true;
    if (step === "routine days fetch" || step === "exercises fetch" || step === "optional enrichments fetch") {
      detailedRoutineStateFailed = true;
    }
    logTodayBootstrapFailure({
      step,
      userId: user.id,
      routineId,
      activeRoutineId: profile.active_routine_id,
      error,
    });
  };

  if (profile.active_routine_id) {
    try {
      const { data: routine, error: routineError } = await supabase
        .from("routines")
        .select("id, user_id, name, cycle_length_days, start_date, timezone, updated_at, weight_unit")
        .eq("id", profile.active_routine_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (routineError) {
        markBootstrapFailure("routine fetch", routineError, profile.active_routine_id);
      } else {
        activeRoutine = (routine as RoutineRow | null) ?? null;
      }
    } catch (error) {
      markBootstrapFailure("routine fetch", error, profile.active_routine_id);
    }
  }

  if (activeRoutine) {
    try {
      const { dayIndex } = getRoutineDayComputation({
        cycleLengthDays: activeRoutine.cycle_length_days,
        startDate: activeRoutine.start_date,
        profileTimeZone: activeRoutine.timezone || profile.timezone,
      });

      todayDayIndex = dayIndex;
    } catch (error) {
      markBootstrapFailure("routine days fetch", error);
      todayDayIndex = 1;
    }

    try {
      const { data: routineDayRows, error: routineDaysError } = await supabase
        .from("routine_days")
        .select("id, user_id, routine_id, day_index, name, is_rest, notes")
        .eq("routine_id", activeRoutine.id)
        .eq("user_id", user.id)
        .order("day_index", { ascending: true });

      if (routineDaysError) {
        markBootstrapFailure("routine days fetch", routineDaysError);
      } else {
        routineDays = (routineDayRows ?? []) as RoutineDayRow[];
        todayRoutineDay = routineDays.find((day) => day.day_index === todayDayIndex) ?? null;
      }
    } catch (error) {
      markBootstrapFailure("routine days fetch", error);
    }

    if (routineDays.length > 0) {
      try {
        const { data: allExercises, error: exercisesError } = await supabase
          .from("routine_day_exercises")
          .select("id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, measurement_type, default_unit, notes")
          .in("routine_day_id", routineDays.map((day) => day.id))
          .eq("user_id", user.id)
          .order("position", { ascending: true });

        if (exercisesError) {
          markBootstrapFailure("exercises fetch", exercisesError);
        } else {
          allDayExercises = (allExercises ?? []) as RoutineDayExerciseRow[];
        }
      } catch (error) {
        markBootstrapFailure("exercises fetch", error);
      }
    }

    try {
      const { startIso, endIso } = getTimeZoneDayWindow(activeRoutine.timezone || profile.timezone);

      const { count: completedTodayCountValue, error: completedTodayCountError } = await supabase
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "completed")
        .eq("routine_id", activeRoutine.id)
        .gte("performed_at", startIso)
        .lt("performed_at", endIso)
        .limit(1);

      if (completedTodayCountError) {
        markBootstrapFailure("completion fetch", completedTodayCountError);
      } else {
        completedTodayCount = completedTodayCountValue ?? 0;
      }

      const { data: completedTodaySessions, error: completedTodaySessionsError } = await supabase
        .from("sessions")
        .select("routine_day_index")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .eq("routine_id", activeRoutine.id)
        .gte("performed_at", startIso)
        .lt("performed_at", endIso);

      if (completedTodaySessionsError) {
        markBootstrapFailure("completion fetch", completedTodaySessionsError);
      } else {
        completedDayIndexes = [...new Set(
          (completedTodaySessions ?? [])
            .map((session) => session.routine_day_index)
            .filter((value): value is number => Number.isFinite(value)),
        )];
      }
    } catch (error) {
      markBootstrapFailure("completion fetch", error);
    }

    try {
      const { data: inProgress, error: inProgressError } = await supabase
        .from("sessions")
        .select("id, user_id, performed_at, notes, routine_id, routine_day_index, name, routine_day_name, duration_seconds, status")
        .eq("user_id", user.id)
        .eq("routine_id", activeRoutine.id)
        .eq("status", "in_progress")
        .order("performed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (inProgressError) {
        markBootstrapFailure("in-progress fetch", inProgressError);
      } else {
        inProgressSession = (inProgress as SessionRow | null) ?? null;
      }
    } catch (error) {
      markBootstrapFailure("in-progress fetch", error);
    }

    if (inProgressSession?.id) {
      try {
        const { data: sessionExercises, error: sessionExercisesError } = await supabase
          .from("session_exercises")
          .select("id, exercise_id, routine_day_exercise_id, is_skipped, target_sets_min, target_sets_max")
          .eq("session_id", inProgressSession.id)
          .eq("user_id", user.id);

        if (sessionExercisesError) {
          markBootstrapFailure("in-progress fetch", sessionExercisesError);
        } else {
          const sessionExerciseIds = (sessionExercises ?? []).map((row) => row.id);
          if (sessionExerciseIds.length > 0) {
            const { data: setRows, error: setsError } = await supabase
              .from("sets")
              .select("session_exercise_id")
              .eq("user_id", user.id)
              .in("session_exercise_id", sessionExerciseIds);

            if (setsError) {
              markBootstrapFailure("in-progress fetch", setsError);
            } else {
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
      } catch (error) {
        markBootstrapFailure("in-progress fetch", error);
      }
    }
  }

  let normalizedDaySummaries: Awaited<ReturnType<typeof buildCanonicalDaySummaries>>["summaries"] = [];
  if (routineDays.length > 0) {
    try {
      const { summaries } = await buildCanonicalDaySummaries({
        supabase,
        routineDays,
        allDayExercises,
      });
      normalizedDaySummaries = summaries;
    } catch (error) {
      markBootstrapFailure("optional enrichments fetch", error);
    }
  }
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
  const routineDayName = effectiveDayIndex !== null
    ? formatRoutineDayDisplayName({
        name: displayDay.dayName,
        dayIndex: effectiveDayIndex,
        startDate: activeRoutine?.start_date ?? null,
      })
    : displayDay.dayName;
  const routinePayloadState = buildTodayRoutinePayloadState({
    activeRoutine,
    effectiveDayIndex,
    routineDayName,
    isRest: effectiveRoutineDay?.is_rest ?? false,
    state: effectiveDaySummary?.state ?? getRunnableDayState({
      isRest: effectiveRoutineDay?.is_rest ?? false,
      runnableExerciseCount: 0,
      invalidExerciseCount: 0,
    }),
    routineDayId: effectiveRoutineDay?.id ?? null,
    fallbackDayIndex: todayDayIndex,
  });
  const hasDetailedRoutineState = Boolean(
    routinePayloadState && normalizedDaySummaries.length > 0 && !detailedRoutineStateFailed,
  );

  const todayPayload = {
    routine: routinePayloadState,
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
          userId: user.id,
          capturedAt: new Date().toISOString(),
          routine: todayPayload.routine,
          exercises: todayPayload.exercises,
          hints: {
            inProgressSessionId: todayPayload.inProgressSessionId,
            completedTodayCount,
            recentExerciseIds: (effectiveDaySummary?.runnableExercises ?? []).map((exercise) => exercise.exercise_id),
          },
        };
  const recoveryShadowPlacement = fetchFailed
    ? null
    : await loadTodayRecoveryShadowPlacementSafely({
        memberId: user.id,
        loadPlacement: prepareTodayRecoveryShadowPlacement,
      });

  return (
    <TodayRouteScaffold
        floatingHeader={todayPayload.routine ? (
          todayPayload.inProgressSessionId || !hasDetailedRoutineState ? (
            <TodayFloatingHeaderRail>
              <TodayOverviewHeader
                title={formatTodayHeaderTitle(todayPayload.routine.name, todayPayload.routine.dayName)}
                align="center"
                subtitle={getDayTaxonomyHeaderSummaryParts({
                  dayName: todayPayload.routine.dayName,
                  summary: getRestDayExerciseCountSummaryFromInputs(todayPayload.exercises, todayPayload.routine.isRest),
                  isRest: todayPayload.routine.isRest,
                }).countsSummary}
                action={completedDayIndexes.includes(todayPayload.routine.dayIndex)
                  ? <AppBadge tone="success">Completed</AppBadge>
                  : undefined}
              />
            </TodayFloatingHeaderRail>
          ) : (
            <TodayFloatingHeaderSlot id="today-floating-header-slot" />
          )
        ) : !todayPayload.routine ? (
          <TodayFloatingHeaderRail>
            <TodayOverviewHeader
              title="No active routine"
              subtitle="Select a routine to plan your session."
            />
          </TodayFloatingHeaderRail>
        ) : undefined}
    >
          <TodayRouteRevalidator />
          {todayPayload.routine && hasDetailedRoutineState ? (
          <TodayOverviewContent>
              <OfflineSyncBadge userId={user.id} />
              {recoveryShadowPlacement ? (
                <TodayRecoveryShadowPlacement
                  placementId={recoveryShadowPlacement.placementId}
                  surfaceId={recoveryShadowPlacement.surfaceId}
                  sourceOutboundId={recoveryShadowPlacement.sourceOutboundId}
                  cohortId={recoveryShadowPlacement.cohortId}
                  destinationHref={recoveryShadowPlacement.destinationHref}
                  destinationPath={recoveryShadowPlacement.destinationPath}
                />
              ) : null}
              {todayPayload.inProgressSessionId ? (
              <TodayOverviewScaffold>
                <div className="flex flex-col gap-[0.625rem]">
                    <TodayExerciseRows
                      exercises={todayPayload.exercises}
                      emptyMessage={todayPayload.routine.state === "rest" ? "Recovery and mobility only." : "No runnable exercises planned for this day."}
                    />
                  </div>
                </TodayOverviewScaffold>
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
                      targetSetsMin: exercise.target_sets ?? null,
                      targetSetsMax: exercise.target_sets ?? null,
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
                  startDate={activeRoutine?.start_date ?? null}
                  floatingHeaderSlotId="today-floating-header-slot"
                  />
                )}
            </TodayOverviewContent>
          ) : (
            <TodayClientShell userId={user.id} payload={todayPayload} fetchFailed={fetchFailed} />
          )}

          {todayPayload.routine && todayPayload.inProgressSessionId && hasDetailedRoutineState ? (
            <PublishBottomActions>
              <BottomActionSplit
                primary={(
                  <TodayStartButton
                    sessionId={todayPayload.inProgressSessionId}
                    returnTo="/today"
                    fullWidth
                    className="w-full"
                    label="Resume"
                  />
                )}
                secondary={(
                  <ConfirmedServerFormButton
                    action={discardInProgressSessionAction}
                    hiddenFields={{ sessionId: todayPayload.inProgressSessionId }}
                    triggerLabel="Discard"
                    triggerIntent="danger"
                    triggerClassName="h-full w-full"
                    size="md"
                    modalTitle="Discard workout?"
                    modalConsequenceText="Current workout will be removed."
                    confirmLabel="Discard"
                  />
                )}
              />
            </PublishBottomActions>
          ) : null}

          <TodayOfflineBridge snapshot={todaySnapshot} />

          {todayGlobalError ? <p className="rounded-[var(--radius-md)] border border-[rgb(var(--danger-rgb)/0.18)] bg-[rgb(var(--danger-rgb)/0.08)] px-3 py-2 text-sm text-[rgb(var(--danger-rgb))]">{todayGlobalError}</p> : null}
    </TodayRouteScaffold>
  );
}
