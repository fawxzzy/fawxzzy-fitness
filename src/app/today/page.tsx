import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { TodayClientShell } from "@/app/today/TodayClientShell";
import { TodayStartButton } from "@/app/today/TodayStartButton";
import { TodayOfflineBridge } from "@/app/today/TodayOfflineBridge";
import { TodayDayPicker } from "@/app/today/TodayDayPicker";
import { TodayRouteRevalidator } from "@/app/today/TodayRouteRevalidator";
import { TodayExerciseRows } from "@/app/today/TodayExerciseRows";
import { ConfirmedServerFormButton } from "@/components/destructive/ConfirmedServerFormButton";
import { OfflineSyncBadge } from "@/components/OfflineSyncBadge";
import { EarnedInstallPrompt } from "@/components/install/EarnedInstallPrompt";
import { ProgressionReviewCard } from "@/components/progression/ProgressionReviewCard";
import { LoadingDiagnosticsClientBridge } from "@/components/shared/LoadingDiagnosticsClientBridge";
import { RoutineDayHeaderTitle } from "@/components/ui/app/RoutineDayHeaderTitle";
import { AccentDotSeparatedText } from "@/components/ui/app/SignatureSeparator";
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
import { LoadingDiagnosticsCollector } from "@/lib/loading-diagnostics";
import type { ActionResult } from "@/lib/action-result";
import { TODAY_CACHE_SCHEMA_VERSION, type TodayCacheSnapshot } from "@/lib/offline/today-cache";
import { ensureProfile } from "@/lib/profile";
import { supabaseServer } from "@/lib/supabase/server";
import {
  buildTodayRoutinePayloadState,
  getTodayGlobalErrorMessage,
  resolveTodayDisplayDay,
} from "@/lib/today-page-state";
import { formatRoutineDayOccurrenceDisplayName, getRoutineCycleOccurrence, getRoutineDayComputation, getTimeZoneDayWindow } from "@/lib/routines";
import { buildCanonicalDaySummaries } from "@/lib/routine-day-loader";
import {
  buildProgressionHistorySessions,
  deriveProgressionReviewCandidate,
  type ProgressionHistorySetRow,
  type ProgressionTargetPlan,
} from "@/lib/progression-playbooks";
import { formatProgressionReviewDisplayItem, type ProgressionReviewDisplayItem } from "@/lib/progression-review-display";
import { buildProgressionReviewTargetUpdate } from "@/lib/progression-review-target-update";
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
  | "progression review fetch"
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

function buildProgressionReviewTargetPlan(exercise: RoutineDayExerciseRow): ProgressionTargetPlan {
  return {
    measurementType: exercise.measurement_type ?? "reps",
    setsMin: exercise.target_sets ?? null,
    setsMax: exercise.target_sets ?? null,
    repsMin: exercise.target_reps_min ?? exercise.target_reps ?? null,
    repsMax: exercise.target_reps_max ?? exercise.target_reps ?? null,
    weightMin: exercise.target_weight ?? null,
    weightMax: exercise.target_weight ?? null,
    weightUnit: exercise.target_weight_unit ?? null,
    durationSeconds: exercise.target_duration_seconds ?? null,
    distance: exercise.target_distance ?? null,
    distanceUnit: exercise.target_distance_unit ?? null,
    calories: exercise.target_calories ?? null,
  };
}

type ProgressionReviewMutationExerciseRow = RoutineDayExerciseRow & {
  routine_day_id: string;
};

async function readProgressionReviewMutationContext(args: {
  supabase: ReturnType<typeof supabaseServer>;
  userId: string;
  routineId: string;
  routineDayExerciseId: string;
}): Promise<ActionResult<{
  exercise: ProgressionReviewMutationExerciseRow;
  fallbackWeightUnit: "lbs" | "kg";
}>> {
  const { data: exerciseRow, error: exerciseError } = await args.supabase
    .from("routine_day_exercises")
    .select("id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, measurement_type, default_unit, notes, progression_playbook_id, progression_playbook_config")
    .eq("id", args.routineDayExerciseId)
    .eq("user_id", args.userId)
    .maybeSingle();

  if (exerciseError || !exerciseRow) {
    return { ok: false, error: "Progression review candidate is no longer available." };
  }

  const exercise = exerciseRow as ProgressionReviewMutationExerciseRow;
  const { data: routineDay, error: routineDayError } = await args.supabase
    .from("routine_days")
    .select("routine_id")
    .eq("id", exercise.routine_day_id)
    .eq("user_id", args.userId)
    .maybeSingle();

  if (routineDayError || routineDay?.routine_id !== args.routineId) {
    return { ok: false, error: "Progression review candidate is not part of this routine." };
  }

  const { data: routine, error: routineError } = await args.supabase
    .from("routines")
    .select("weight_unit")
    .eq("id", args.routineId)
    .eq("user_id", args.userId)
    .maybeSingle();

  if (routineError || !routine) {
    return { ok: false, error: "Could not verify routine settings." };
  }

  const { count: activeSessionCount, error: activeSessionError } = await args.supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", args.userId)
    .eq("routine_id", args.routineId)
    .eq("status", "in_progress");

  if (activeSessionError) {
    return { ok: false, error: "Could not verify active session state." };
  }

  if ((activeSessionCount ?? 0) > 0) {
    return { ok: false, error: "Finish or discard the active workout before applying progression changes." };
  }

  return {
    ok: true,
    data: {
      exercise,
      fallbackWeightUnit: routine.weight_unit === "kg" ? "kg" : "lbs",
    },
  };
}

async function loadProgressionHistoryForExercise(args: {
  supabase: ReturnType<typeof supabaseServer>;
  userId: string;
  routineId: string;
  exerciseId: string;
}) {
  const { data: sessionExercisesData, error: sessionExercisesError } = await args.supabase
    .from("session_exercises")
    .select("id, exercise_id, session:sessions!inner(performed_at, status, routine_id)")
    .eq("user_id", args.userId)
    .eq("exercise_id", args.exerciseId)
    .eq("session.status", "completed")
    .eq("session.routine_id", args.routineId);

  if (sessionExercisesError) {
    throw sessionExercisesError;
  }

  const sessionExerciseMetaById = new Map<string, { performedAt: string }>();
  for (const row of (sessionExercisesData ?? []) as Array<{
    id: string;
    session?: { performed_at?: string | null; status?: "completed" | "in_progress"; routine_id?: string | null } | Array<{ performed_at?: string | null; status?: "completed" | "in_progress"; routine_id?: string | null }> | null;
  }>) {
    const sessionRow = Array.isArray(row.session) ? (row.session[0] ?? null) : (row.session ?? null);
    if (!row.id || !sessionRow?.performed_at || sessionRow.status !== "completed" || sessionRow.routine_id !== args.routineId) {
      continue;
    }

    sessionExerciseMetaById.set(row.id, { performedAt: sessionRow.performed_at });
  }

  const sessionExerciseIds = [...sessionExerciseMetaById.keys()];
  const { data: setsData, error: setsError } = sessionExerciseIds.length > 0
    ? await args.supabase
        .from("sets")
        .select("session_exercise_id, set_index, weight, reps, weight_unit, is_warmup")
        .eq("user_id", args.userId)
        .in("session_exercise_id", sessionExerciseIds)
        .order("set_index", { ascending: true })
    : { data: [], error: null };

  if (setsError) {
    throw setsError;
  }

  return ((setsData ?? []) as Array<{
    session_exercise_id: string;
    set_index: number;
    weight: number | null;
    reps: number | null;
    weight_unit: "lbs" | "kg" | null;
    is_warmup: boolean;
  }>)
    .map((row): ProgressionHistorySetRow | null => {
      const meta = sessionExerciseMetaById.get(row.session_exercise_id);
      if (!meta) {
        return null;
      }

      return {
        sessionId: row.session_exercise_id,
        performedAt: meta.performedAt,
        setIndex: row.set_index,
        weight: row.weight ?? null,
        reps: row.reps ?? null,
        weightUnit: row.weight_unit ?? null,
        isWarmup: row.is_warmup,
      };
    })
    .filter((row): row is ProgressionHistorySetRow => row !== null);
}

async function applyProgressionReviewCandidateAction(payload: {
  routineId: string;
  routineDayExerciseId: string;
  candidateType: ProgressionReviewDisplayItem["type"];
}): Promise<ActionResult<{ previousTarget: ProgressionTargetPlan; appliedTarget: ProgressionTargetPlan }>> {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();

  if (payload.candidateType === "review") {
    return { ok: false, error: "Hold & Review candidates are review-only for now." };
  }

  const context = await readProgressionReviewMutationContext({
    supabase,
    userId: user.id,
    routineId: payload.routineId,
    routineDayExerciseId: payload.routineDayExerciseId,
  });

  if (!context.ok) {
    return { ok: false, error: context.error };
  }

  if (!context.data) {
    return { ok: false, error: "Progression review candidate is no longer available." };
  }

  const { exercise, fallbackWeightUnit } = context.data;
  const previousTarget = buildProgressionReviewTargetPlan(exercise);

  let historyRows: ProgressionHistorySetRow[] = [];
  try {
    historyRows = await loadProgressionHistoryForExercise({
      supabase,
      userId: user.id,
      routineId: payload.routineId,
      exerciseId: exercise.exercise_id,
    });
  } catch {
    return { ok: false, error: "Could not verify completed history for this progression change." };
  }

  const candidate = deriveProgressionReviewCandidate({
    playbookId: exercise.progression_playbook_id,
    config: exercise.progression_playbook_config,
    plan: previousTarget,
    history: buildProgressionHistorySessions({
      rows: historyRows,
      targetSetCount: exercise.target_sets,
      topRepTarget: exercise.target_reps_max ?? exercise.target_reps,
      limit: 8,
    }),
    fallbackWeightUnit,
  });

  if (candidate.type !== payload.candidateType || (candidate.type !== "promote" && candidate.type !== "deload") || !candidate.proposedTarget) {
    return { ok: false, error: "Progression review candidate is no longer applicable." };
  }

  const { error: updateError } = await supabase
    .from("routine_day_exercises")
    .update(buildProgressionReviewTargetUpdate(candidate.proposedTarget))
    .eq("id", exercise.id)
    .eq("user_id", user.id);

  if (updateError) {
    return { ok: false, error: "Could not apply progression review." };
  }

  revalidatePath("/today");
  revalidatePath(`/routines/${payload.routineId}/edit`);

  return {
    ok: true,
    data: {
      previousTarget,
      appliedTarget: candidate.proposedTarget,
    },
  };
}

async function revertProgressionReviewCandidateAction(payload: {
  routineId: string;
  routineDayExerciseId: string;
  previousTarget: ProgressionTargetPlan;
}): Promise<ActionResult> {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();
  const context = await readProgressionReviewMutationContext({
    supabase,
    userId: user.id,
    routineId: payload.routineId,
    routineDayExerciseId: payload.routineDayExerciseId,
  });

  if (!context.ok) {
    return { ok: false, error: context.error };
  }

  const { error: updateError } = await supabase
    .from("routine_day_exercises")
    .update(buildProgressionReviewTargetUpdate(payload.previousTarget))
    .eq("id", payload.routineDayExerciseId)
    .eq("user_id", user.id);

  if (updateError) {
    return { ok: false, error: "Could not revert progression review." };
  }

  revalidatePath("/today");
  revalidatePath(`/routines/${payload.routineId}/edit`);

  return { ok: true };
}

async function loadTodayProgressionReviewItems(args: {
  supabase: ReturnType<typeof supabaseServer>;
  userId: string;
  routineId: string;
  fallbackWeightUnit: "lbs" | "kg";
  exercises: RoutineDayExerciseRow[];
  exerciseNameByRoutineExerciseId: Map<string, string>;
}) {
  const progressionExercises = args.exercises.filter((exercise) => exercise.progression_playbook_id);
  if (progressionExercises.length === 0) {
    return [] as ProgressionReviewDisplayItem[];
  }

  const progressionExerciseIds = Array.from(new Set(
    progressionExercises
      .map((exercise) => exercise.exercise_id)
      .filter((exerciseId): exerciseId is string => Boolean(exerciseId)),
  ));

  if (progressionExerciseIds.length === 0) {
    return [] as ProgressionReviewDisplayItem[];
  }

  const { data: sessionExercisesData, error: sessionExercisesError } = await args.supabase
    .from("session_exercises")
    .select("id, exercise_id, session:sessions!inner(performed_at, status, routine_id)")
    .eq("user_id", args.userId)
    .in("exercise_id", progressionExerciseIds)
    .eq("session.status", "completed")
    .eq("session.routine_id", args.routineId);

  if (sessionExercisesError) {
    throw sessionExercisesError;
  }

  const sessionExerciseMetaById = new Map<string, { exerciseId: string; performedAt: string }>();
  for (const row of (sessionExercisesData ?? []) as Array<{
    id: string;
    exercise_id: string;
    session?: { performed_at?: string | null; status?: "completed" | "in_progress"; routine_id?: string | null } | Array<{ performed_at?: string | null; status?: "completed" | "in_progress"; routine_id?: string | null }> | null;
  }>) {
    const sessionRow = Array.isArray(row.session) ? (row.session[0] ?? null) : (row.session ?? null);
    if (!row.id || !row.exercise_id || !sessionRow?.performed_at || sessionRow.status !== "completed" || sessionRow.routine_id !== args.routineId) {
      continue;
    }

    sessionExerciseMetaById.set(row.id, {
      exerciseId: row.exercise_id,
      performedAt: sessionRow.performed_at,
    });
  }

  const sessionExerciseIds = [...sessionExerciseMetaById.keys()];
  const { data: setsData, error: setsError } = sessionExerciseIds.length > 0
    ? await args.supabase
        .from("sets")
        .select("session_exercise_id, set_index, weight, reps, weight_unit, is_warmup")
        .eq("user_id", args.userId)
        .in("session_exercise_id", sessionExerciseIds)
        .order("set_index", { ascending: true })
    : { data: [], error: null };

  if (setsError) {
    throw setsError;
  }

  const historyRowsByExerciseId = new Map<string, ProgressionHistorySetRow[]>();
  for (const row of (setsData ?? []) as Array<{
    session_exercise_id: string;
    set_index: number;
    weight: number | null;
    reps: number | null;
    weight_unit: "lbs" | "kg" | null;
    is_warmup: boolean;
  }>) {
    const meta = sessionExerciseMetaById.get(row.session_exercise_id);
    if (!meta) {
      continue;
    }

    const current = historyRowsByExerciseId.get(meta.exerciseId) ?? [];
    current.push({
      sessionId: row.session_exercise_id,
      performedAt: meta.performedAt,
      setIndex: row.set_index,
      weight: row.weight ?? null,
      reps: row.reps ?? null,
      weightUnit: row.weight_unit ?? null,
      isWarmup: row.is_warmup,
    });
    historyRowsByExerciseId.set(meta.exerciseId, current);
  }

  return progressionExercises
    .map((exercise) => {
      const plan = buildProgressionReviewTargetPlan(exercise);
      const history = buildProgressionHistorySessions({
        rows: historyRowsByExerciseId.get(exercise.exercise_id) ?? [],
        targetSetCount: exercise.target_sets,
        topRepTarget: exercise.target_reps_max ?? exercise.target_reps,
        limit: 8,
      });
      const candidate = deriveProgressionReviewCandidate({
        playbookId: exercise.progression_playbook_id,
        config: exercise.progression_playbook_config,
        plan,
        history,
        fallbackWeightUnit: args.fallbackWeightUnit,
      });

      return formatProgressionReviewDisplayItem({
        id: exercise.id,
        exerciseName: args.exerciseNameByRoutineExerciseId.get(exercise.id) ?? "Exercise",
        candidate,
      });
    })
    .filter((item): item is ProgressionReviewDisplayItem => item !== null);
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

export default async function TodayPage({
  searchParams,
}: {
  searchParams?: {
    error?: string;
    focus?: string;
    shadowPlacement?: string;
  };
}) {
  const diagnostics = new LoadingDiagnosticsCollector("/today");
  const user = await requireUser({
    gate: "today.auth.session",
    route: "/today",
    blockingReason: "Waiting for authenticated session before loading Today.",
    timeoutMs: 5000,
    collector: diagnostics,
  });
  const profile = await diagnostics.measure("today.profile.bootstrap", () => ensureProfile(user.id), {
    blockingReason: "Waiting for Today profile bootstrap.",
    metadata: {
      userId: user.id,
    },
    timeoutMs: 5000,
  });
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
      activeRoutine = await diagnostics.measure("today.active-routine.fetch", async () => {
        const { data: routine, error: routineError } = await supabase
          .from("routines")
          .select("id, user_id, name, cycle_length_days, start_date, timezone, updated_at, weight_unit")
          .eq("id", profile.active_routine_id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (routineError) {
          throw routineError;
        }

        return (routine as RoutineRow | null) ?? null;
      }, {
        blockingReason: "Waiting for Today active routine lookup.",
        metadata: {
          activeRoutineId: profile.active_routine_id,
          userId: user.id,
        },
        timeoutMs: 7000,
      });
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
      routineDays = await diagnostics.measure("today.routine-days.fetch", async () => {
        const { data: routineDayRows, error: routineDaysError } = await supabase
          .from("routine_days")
          .select("id, user_id, routine_id, day_index, name, is_rest, notes")
          .eq("routine_id", activeRoutine.id)
          .eq("user_id", user.id)
          .order("day_index", { ascending: true });

        if (routineDaysError) {
          throw routineDaysError;
        }

        return (routineDayRows ?? []) as RoutineDayRow[];
      }, {
        blockingReason: "Waiting for Today routine-day rows.",
        metadata: {
          activeRoutineId: activeRoutine.id,
          userId: user.id,
        },
        timeoutMs: 7000,
      });
      todayRoutineDay = routineDays.find((day) => day.day_index === todayDayIndex) ?? null;
    } catch (error) {
      markBootstrapFailure("routine days fetch", error);
    }

    if (routineDays.length > 0) {
      try {
        allDayExercises = await diagnostics.measure("today.day-exercises.fetch", async () => {
          const { data: allExercises, error: exercisesError } = await supabase
            .from("routine_day_exercises")
            .select("id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, measurement_type, default_unit, notes, progression_playbook_id, progression_playbook_config")
            .in("routine_day_id", routineDays.map((day) => day.id))
            .eq("user_id", user.id)
            .order("position", { ascending: true });

          if (exercisesError) {
            throw exercisesError;
          }

          return (allExercises ?? []) as RoutineDayExerciseRow[];
        }, {
          blockingReason: "Waiting for Today routine-day exercises.",
          metadata: {
            routineDayCount: routineDays.length,
            userId: user.id,
          },
          timeoutMs: 7000,
        });
      } catch (error) {
        markBootstrapFailure("exercises fetch", error);
      }
    }

    try {
      const completionSummary = await diagnostics.measure("today.completed-sessions.fetch", async () => {
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
          throw completedTodayCountError;
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
          throw completedTodaySessionsError;
        }

        return {
          completedTodayCountValue: completedTodayCountValue ?? 0,
          completedDayIndexes: [...new Set(
            (completedTodaySessions ?? [])
              .map((session) => session.routine_day_index)
              .filter((value): value is number => Number.isFinite(value)),
          )],
        };
      }, {
        blockingReason: "Waiting for Today completed-session summary.",
        metadata: {
          activeRoutineId: activeRoutine.id,
          userId: user.id,
        },
        timeoutMs: 7000,
      });

      completedTodayCount = completionSummary.completedTodayCountValue;
      completedDayIndexes = completionSummary.completedDayIndexes;
    } catch (error) {
      markBootstrapFailure("completion fetch", error);
    }

    try {
      inProgressSession = await diagnostics.measure("today.in-progress-session.fetch", async () => {
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
          throw inProgressError;
        }

        return (inProgress as SessionRow | null) ?? null;
      }, {
        blockingReason: "Waiting for Today in-progress session hint.",
        metadata: {
          activeRoutineId: activeRoutine.id,
          userId: user.id,
        },
        timeoutMs: 7000,
      });
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
      const { summaries } = await diagnostics.measure("today.canonical-day-summaries.fetch", async () => buildCanonicalDaySummaries({
        supabase,
        routineDays,
        allDayExercises,
      }), {
        blockingReason: "Waiting for Today canonical day summaries.",
        metadata: {
          routineDayCount: routineDays.length,
          userId: user.id,
        },
        timeoutMs: 7000,
      });
      normalizedDaySummaries = summaries;
    } catch (error) {
      markBootstrapFailure("optional enrichments fetch", error);
    }
  }
  const normalizedDayByIndex = new Map(normalizedDaySummaries.map((entry) => [entry.day.day_index, entry]));
  const exerciseNameByRoutineExerciseId = new Map(
    normalizedDaySummaries.flatMap((summary) => summary.runnableExercises.map((exercise) => [exercise.id, exercise.displayName] as const)),
  );
  let progressionReviewItems: ProgressionReviewDisplayItem[] = [];
  if (activeRoutine && !inProgressSession && allDayExercises.length > 0) {
    try {
      progressionReviewItems = await diagnostics.measure("today.progression-review.fetch", () => loadTodayProgressionReviewItems({
        supabase,
        userId: user.id,
        routineId: activeRoutine.id,
        fallbackWeightUnit: activeRoutine.weight_unit,
        exercises: allDayExercises,
        exerciseNameByRoutineExerciseId,
      }), {
        blockingReason: "Waiting for Today progression review candidates.",
        metadata: {
          activeRoutineId: activeRoutine.id,
          exerciseCount: allDayExercises.length,
          userId: user.id,
        },
        timeoutMs: 7000,
      });
    } catch (error) {
      logTodayBootstrapFailure({
        step: "progression review fetch",
        userId: user.id,
        routineId: activeRoutine.id,
        activeRoutineId: profile.active_routine_id,
        error,
      });
    }
  }
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
  const effectiveDayOccurrenceLabel = activeRoutine?.start_date && effectiveDayIndex !== null
    ? getRoutineCycleOccurrence({
        cycleLengthDays: activeRoutine.cycle_length_days,
        startDate: activeRoutine.start_date,
        profileTimeZone: activeRoutine.timezone || profile.timezone,
        dayIndex: effectiveDayIndex,
      }).occurrenceLabel
    : null;
  const routineDayName = effectiveDayIndex !== null
    ? formatRoutineDayOccurrenceDisplayName({
        name: displayDay.dayName,
        dayIndex: effectiveDayIndex,
        startDate: activeRoutine?.start_date ?? null,
        occurrenceLabel: effectiveDayOccurrenceLabel,
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
  const todayHeaderSummary = todayPayload.routine
    ? getRestDayExerciseCountSummaryFromInputs(todayPayload.exercises, todayPayload.routine.isRest)
    : null;
  const todayHeaderSummaryParts = todayPayload.routine && todayHeaderSummary
    ? getDayTaxonomyHeaderSummaryParts({
        dayName: todayPayload.routine.dayName,
        summary: todayHeaderSummary,
        isRest: todayPayload.routine.isRest,
      })
    : null;

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
  const shouldLoadRecoveryShadowPlacement =
    searchParams?.shadowPlacement === "recovery_reset_shadow_placement"
    || searchParams?.focus === "recovery_reset_shadow";
  const recoveryShadowPlacement = fetchFailed || !shouldLoadRecoveryShadowPlacement
    ? null
    : await diagnostics.measure("today.recovery-shadow.fetch", () => loadTodayRecoveryShadowPlacementSafely({
      memberId: user.id,
      loadPlacement: prepareTodayRecoveryShadowPlacement,
    }), {
      blockingReason: "Waiting for Today recovery shadow placement.",
      metadata: {
        userId: user.id,
      },
      timeoutMs: 5000,
    });
  const todayHeaderSubtitle = todayPayload.routine && !todayPayload.routine.isRest && todayHeaderSummaryParts?.countsSummary
    ? (
      <AccentDotSeparatedText
        text={todayHeaderSummaryParts.countsSummary}
        separatorClassName="h-[3.5px] w-[3.5px]"
      />
    )
    : undefined;

  return (
    <TodayRouteScaffold
      floatingHeader={todayPayload.routine ? (
          todayPayload.inProgressSessionId || !hasDetailedRoutineState ? (
            <TodayFloatingHeaderRail>
              <TodayOverviewHeader
                title={(
                  <RoutineDayHeaderTitle
                    leadingItems={[todayPayload.routine.name]}
                    dayLabel={todayPayload.routine.dayName}
                  />
                )}
                align="center"
                subtitle={todayHeaderSubtitle}
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
      <LoadingDiagnosticsClientBridge entries={diagnostics.snapshot()} />
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
          <EarnedInstallPrompt />
          {!todayPayload.inProgressSessionId && todayPayload.routine && progressionReviewItems.length > 0 ? (
            <ProgressionReviewCard
              items={progressionReviewItems}
              routineId={todayPayload.routine.id}
              applyAction={applyProgressionReviewCandidateAction}
              revertAction={revertProgressionReviewCandidateAction}
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
                occurrenceLabel: activeRoutine?.start_date
                  ? getRoutineCycleOccurrence({
                      cycleLengthDays: activeRoutine.cycle_length_days,
                      startDate: activeRoutine.start_date,
                      profileTimeZone: activeRoutine.timezone || profile.timezone,
                      dayIndex: day.day_index,
                    }).occurrenceLabel
                  : null,
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
