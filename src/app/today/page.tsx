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
import { LoadingDiagnosticsClientBridge } from "@/components/shared/LoadingDiagnosticsClientBridge";
import { RoutineDayCardTitle } from "@/components/day-list/RoutineDayCardPresentation";
import { AccentDotSeparatedText } from "@/components/ui/app/SignatureSeparator";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import {
  TodayFloatingHeaderRail,
  TodayFloatingHeaderSlot,
  TodayRoutineSwitchFloatingHeaderSlot,
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
import { formatRoutineDayStableDisplayName, getRoutineCycleOccurrence, getTimeZoneDayWindow, resolveRoutineScheduleForToday } from "@/lib/routines";
import { buildCanonicalDaySummaries } from "@/lib/routine-day-loader";
import {
  buildProgressionHistorySessions,
  deriveProgressionReviewCandidate,
  type ProgressionHistorySetRow,
  type ProgressionTargetPlan,
} from "@/lib/progression-playbooks";
import {
  getProgressionReviewTargetFingerprintForExercise,
  loadProgressionUpdatesDisplayData,
} from "@/lib/progression-review-loader";
import {
  formatProgressionReviewDisplayItem,
  type ProgressionReviewApplyResult,
  type ProgressionReviewDisplayItem,
  type ProgressionReviewLinkedTargetSnapshot,
  type ProgressionReviewRevertTargetSnapshot,
} from "@/lib/progression-review-display";
import type { ProgressionStatusDisplayItem, ProgressionStatusSurfaceItem } from "@/lib/progression-status-display";
import { buildProgressionReviewTargetUpdate } from "@/lib/progression-review-target-update";
import {
  buildProgressionEventPayload,
  extractProgressionSourceSessionId,
  recordProgressionEvent,
} from "@/lib/progression-events";
import { getRunnableDayState } from "@/lib/runnable-day";
import { getDayTaxonomyHeaderSummaryParts, getRestDayExerciseCountSummaryFromInputs, toExerciseCountSummaryInput } from "@/lib/day-summary";
import type { RoutineDayExerciseRow, RoutineDayRow, RoutineRow, SessionRow } from "@/types/db";
import { TodayRecoveryShadowPlacement } from "@/app/today/TodayRecoveryShadowPlacement";
import {
  publishFitnessIntegrationStateForMember,
  recordFitnessSignalForMember,
} from "@/lib/ecosystem/fitness-integration-server";
import { prepareTodayRecoveryShadowPlacement } from "@/lib/ecosystem/fitness-shadow-placement";
import { isFeatureEnabled } from "@/lib/feature-flags";
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
    repsTarget: exercise.target_reps ?? null,
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

function resolveRoutineExerciseRepTarget(exercise: Pick<RoutineDayExerciseRow, "target_reps" | "target_reps_min" | "target_reps_max">) {
  return exercise.target_reps ?? exercise.target_reps_max ?? exercise.target_reps_min ?? null;
}

type ProgressionReviewMutationExerciseRow = RoutineDayExerciseRow & {
  routine_day_id: string;
};

const PROGRESSION_MUTATION_EXERCISE_SELECT = "id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, measurement_type, default_unit, notes, progression_playbook_id, progression_playbook_config";
const LINKED_PROGRESSION_UPDATE_LIMIT = 12;

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
    .select(PROGRESSION_MUTATION_EXERCISE_SELECT)
    .eq("id", args.routineDayExerciseId)
    .eq("user_id", args.userId)
    .maybeSingle();

  if (exerciseError || !exerciseRow) {
    return { ok: false, error: "Progression update is no longer available." };
  }

  const exercise = exerciseRow as ProgressionReviewMutationExerciseRow;
  const { data: routineDay, error: routineDayError } = await args.supabase
    .from("routine_days")
    .select("routine_id")
    .eq("id", exercise.routine_day_id)
    .eq("user_id", args.userId)
    .maybeSingle();

  if (routineDayError || routineDay?.routine_id !== args.routineId) {
    return { ok: false, error: "Progression update is not part of this routine." };
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
  routineDayExerciseId?: string | null;
  allowCatalogFallback?: boolean;
}) {
  const { data: sessionExercisesData, error: sessionExercisesError } = await args.supabase
    .from("session_exercises")
    .select("id, exercise_id, routine_day_exercise_id, session:sessions!inner(id, performed_at, status, routine_id)")
    .eq("user_id", args.userId)
    .eq("exercise_id", args.exerciseId)
    .eq("session.status", "completed")
    .eq("session.routine_id", args.routineId);

  if (sessionExercisesError) {
    throw sessionExercisesError;
  }

  const sessionExerciseMetaById = new Map<string, { performedAt: string; routineDayExerciseId: string | null; sessionRecordId: string | null }>();
  for (const row of (sessionExercisesData ?? []) as Array<{
    id: string;
    routine_day_exercise_id?: string | null;
    session?: { id?: string | null; performed_at?: string | null; status?: "completed" | "in_progress"; routine_id?: string | null } | Array<{ id?: string | null; performed_at?: string | null; status?: "completed" | "in_progress"; routine_id?: string | null }> | null;
  }>) {
    const sessionRow = Array.isArray(row.session) ? (row.session[0] ?? null) : (row.session ?? null);
    if (!row.id || !sessionRow?.performed_at || sessionRow.status !== "completed" || sessionRow.routine_id !== args.routineId) {
      continue;
    }

    sessionExerciseMetaById.set(row.id, {
      performedAt: sessionRow.performed_at,
      routineDayExerciseId: row.routine_day_exercise_id ?? null,
      sessionRecordId: sessionRow.id ?? null,
    });
  }

  const sessionExerciseIds = [...sessionExerciseMetaById.keys()];
  const { data: setsData, error: setsError } = sessionExerciseIds.length > 0
    ? await args.supabase
        .from("sets")
        .select("session_exercise_id, set_index, weight, reps, weight_unit, duration_seconds, distance, distance_unit, calories, is_warmup")
        .eq("user_id", args.userId)
        .in("session_exercise_id", sessionExerciseIds)
        .order("set_index", { ascending: true })
    : { data: [], error: null };

  if (setsError) {
    throw setsError;
  }

  const rows = ((setsData ?? []) as Array<{
    session_exercise_id: string;
    set_index: number;
    weight: number | null;
    reps: number | null;
    weight_unit: "lbs" | "kg" | null;
    duration_seconds: number | null;
    distance: number | null;
    distance_unit: "mi" | "km" | "m" | null;
    calories: number | null;
    is_warmup: boolean;
  }>)
    .map((row): ProgressionHistorySetRow | null => {
      const meta = sessionExerciseMetaById.get(row.session_exercise_id);
      if (!meta) {
        return null;
      }

      return {
        sessionId: row.session_exercise_id,
        sessionRecordId: meta.sessionRecordId,
        performedAt: meta.performedAt,
        setIndex: row.set_index,
        weight: row.weight ?? null,
        reps: row.reps ?? null,
        weightUnit: row.weight_unit ?? null,
        durationSeconds: row.duration_seconds ?? null,
        distance: row.distance ?? null,
        distanceUnit: row.distance_unit ?? null,
        calories: row.calories ?? null,
        isWarmup: row.is_warmup,
      };
    })
    .filter((row): row is ProgressionHistorySetRow => row !== null);

  if (!args.routineDayExerciseId) {
    return rows;
  }

  const directSessionExerciseIds = new Set(
    [...sessionExerciseMetaById.entries()]
      .filter(([, meta]) => meta.routineDayExerciseId === args.routineDayExerciseId)
      .map(([sessionExerciseId]) => sessionExerciseId),
  );
  const directRows = rows.filter((row) => directSessionExerciseIds.has(row.sessionId));
  if (directRows.length > 0) {
    return directRows;
  }

  return args.allowCatalogFallback ? rows : [];
}

async function canUseCatalogHistoryFallbackForRoutineExercise(args: {
  supabase: ReturnType<typeof supabaseServer>;
  userId: string;
  routineId: string;
  exerciseId: string;
}) {
  const { data: routineDays, error: routineDaysError } = await args.supabase
    .from("routine_days")
    .select("id")
    .eq("user_id", args.userId)
    .eq("routine_id", args.routineId);

  if (routineDaysError) {
    return false;
  }

  const routineDayIds = (routineDays ?? []).map((day) => day.id).filter((id): id is string => Boolean(id));
  if (routineDayIds.length === 0) {
    return false;
  }

  const { count, error } = await args.supabase
    .from("routine_day_exercises")
    .select("id", { count: "exact", head: true })
    .eq("user_id", args.userId)
    .eq("exercise_id", args.exerciseId)
    .in("routine_day_id", routineDayIds);

  if (error) {
    return false;
  }

  return (count ?? 0) === 1;
}

function resolveLinkedRoutineDayExerciseIds(sourceId: string, linkedIds?: string[]) {
  const rawIds = linkedIds && linkedIds.length > 0 ? linkedIds : [sourceId];
  return Array.from(new Set(rawIds.filter((id) => typeof id === "string" && id.trim()).map((id) => id.trim())));
}

async function readMutationExercisesForRoutine(args: {
  supabase: ReturnType<typeof supabaseServer>;
  userId: string;
  routineId: string;
  routineDayExerciseIds: string[];
}): Promise<ActionResult<ProgressionReviewMutationExerciseRow[]>> {
  if (args.routineDayExerciseIds.length > LINKED_PROGRESSION_UPDATE_LIMIT) {
    return { ok: false, error: "Too many linked progression updates to apply at once." };
  }

  const { data: exerciseRows, error: exerciseError } = await args.supabase
    .from("routine_day_exercises")
    .select(PROGRESSION_MUTATION_EXERCISE_SELECT)
    .eq("user_id", args.userId)
    .in("id", args.routineDayExerciseIds);

  if (exerciseError || (exerciseRows?.length ?? 0) !== args.routineDayExerciseIds.length) {
    return { ok: false, error: "Linked progression update is no longer available." };
  }

  const exercises = (exerciseRows ?? []) as ProgressionReviewMutationExerciseRow[];
  const routineDayIds = Array.from(new Set(exercises.map((exercise) => exercise.routine_day_id)));
  const { data: routineDays, error: routineDaysError } = await args.supabase
    .from("routine_days")
    .select("id, routine_id")
    .eq("user_id", args.userId)
    .in("id", routineDayIds);

  if (routineDaysError || (routineDays?.length ?? 0) !== routineDayIds.length) {
    return { ok: false, error: "Could not verify linked routine days." };
  }

  const routineIdByDayId = new Map((routineDays ?? []).map((day) => [day.id, day.routine_id]));
  if (exercises.some((exercise) => routineIdByDayId.get(exercise.routine_day_id) !== args.routineId)) {
    return { ok: false, error: "Linked progression update is not part of this routine." };
  }

  const orderById = new Map(args.routineDayExerciseIds.map((id, index) => [id, index]));
  return {
    ok: true,
    data: exercises.sort((left, right) => (orderById.get(left.id) ?? 0) - (orderById.get(right.id) ?? 0)),
  };
}

function verifyLinkedProgressionFingerprints(args: {
  sourceExercise: ProgressionReviewMutationExerciseRow;
  linkedExercises: ProgressionReviewMutationExerciseRow[];
}) {
  const sourceFingerprint = getProgressionReviewTargetFingerprintForExercise(args.sourceExercise);
  return args.linkedExercises.every((exercise) => getProgressionReviewTargetFingerprintForExercise(exercise) === sourceFingerprint);
}

async function applyProgressionReviewCandidateAction(payload: {
  routineId: string;
  routineDayExerciseId: string;
  candidateType: ProgressionReviewDisplayItem["type"];
  linkedRoutineDayExerciseIds?: string[];
}): Promise<ActionResult<ProgressionReviewApplyResult>> {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();

  if (payload.candidateType === "review") {
    return { ok: false, error: "Manual Review candidates are review-only for now." };
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
    return { ok: false, error: "Progression update is no longer available." };
  }

  const { exercise, fallbackWeightUnit } = context.data;
  const previousTarget = buildProgressionReviewTargetPlan(exercise);

  let historyRows: ProgressionHistorySetRow[] = [];
  try {
    const allowCatalogFallback = await canUseCatalogHistoryFallbackForRoutineExercise({
      supabase,
      userId: user.id,
      routineId: payload.routineId,
      exerciseId: exercise.exercise_id,
    });

    historyRows = await loadProgressionHistoryForExercise({
      supabase,
      userId: user.id,
      routineId: payload.routineId,
      exerciseId: exercise.exercise_id,
      routineDayExerciseId: exercise.id,
      allowCatalogFallback,
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
      topRepTarget: resolveRoutineExerciseRepTarget(exercise),
      limit: 8,
    }),
    historyRows,
    fallbackWeightUnit,
  });

  if (candidate.type !== payload.candidateType || (candidate.type !== "promote" && candidate.type !== "deload") || !candidate.proposedTarget) {
    return { ok: false, error: "Progression update is no longer applicable." };
  }

  const linkedRoutineDayExerciseIds = resolveLinkedRoutineDayExerciseIds(exercise.id, payload.linkedRoutineDayExerciseIds);
  const linkedExercisesResult = await readMutationExercisesForRoutine({
    supabase,
    userId: user.id,
    routineId: payload.routineId,
    routineDayExerciseIds: linkedRoutineDayExerciseIds,
  });

  if (!linkedExercisesResult.ok) {
    return { ok: false, error: linkedExercisesResult.error };
  }

  const linkedExercises = linkedExercisesResult.data ?? [exercise];
  if (!verifyLinkedProgressionFingerprints({ sourceExercise: exercise, linkedExercises })) {
    return { ok: false, error: "Linked progression targets no longer match." };
  }

  const linkedTargets: ProgressionReviewLinkedTargetSnapshot[] = [];
  const sourceSessionId = extractProgressionSourceSessionId({
    sourceSessionId: candidate.sourceSession?.sessionId,
    historyRows,
  });
  for (const linkedExercise of linkedExercises) {
    const linkedPreviousTarget = buildProgressionReviewTargetPlan(linkedExercise);
    const { error: updateError } = await supabase
      .from("routine_day_exercises")
      .update(buildProgressionReviewTargetUpdate(candidate.proposedTarget))
      .eq("id", linkedExercise.id)
      .eq("user_id", user.id);

    if (updateError) {
      return { ok: false, error: "Could not apply linked progression update." };
    }

    await recordProgressionEvent({
      supabase,
      payload: buildProgressionEventPayload({
        userId: user.id,
        routineId: payload.routineId,
        routineDayExerciseId: linkedExercise.id,
        exerciseId: linkedExercise.exercise_id,
        eventType: candidate.type === "deload" ? "deload_applied" : "promotion_applied",
        fromTarget: linkedPreviousTarget,
        toTarget: candidate.proposedTarget,
        reason: candidate.reason,
        playbookId: linkedExercise.progression_playbook_id,
        config: linkedExercise.progression_playbook_config,
        sourceSessionId,
      }),
      context: "today.applyProgressionReviewCandidateAction",
    });

    linkedTargets.push({
      routineDayExerciseId: linkedExercise.id,
      previousTarget: linkedPreviousTarget,
      appliedTarget: candidate.proposedTarget,
    });
  }

  revalidatePath("/today");
  revalidatePath(`/routines/${payload.routineId}/edit`);

  return {
    ok: true,
    data: {
      previousTarget,
      appliedTarget: candidate.proposedTarget,
      linkedTargets: linkedTargets.length > 1 ? linkedTargets : undefined,
    },
  };
}

async function revertProgressionReviewCandidateAction(payload: {
  routineId: string;
  routineDayExerciseId: string;
  previousTarget: ProgressionTargetPlan;
  linkedPreviousTargets?: ProgressionReviewRevertTargetSnapshot[];
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

  const revertTargets = payload.linkedPreviousTargets && payload.linkedPreviousTargets.length > 0
    ? payload.linkedPreviousTargets
    : [{ routineDayExerciseId: payload.routineDayExerciseId, previousTarget: payload.previousTarget }];
  const linkedExercisesResult = await readMutationExercisesForRoutine({
    supabase,
    userId: user.id,
    routineId: payload.routineId,
    routineDayExerciseIds: revertTargets.map((target) => target.routineDayExerciseId),
  });

  if (!linkedExercisesResult.ok) {
    return { ok: false, error: linkedExercisesResult.error };
  }

  const linkedExercises = linkedExercisesResult.data ?? [];
  const linkedExerciseById = new Map(linkedExercises.map((exercise) => [exercise.id, exercise]));
  for (const target of revertTargets) {
    const linkedExercise = linkedExerciseById.get(target.routineDayExerciseId);
    const currentTarget = linkedExercise ? buildProgressionReviewTargetPlan(linkedExercise) : null;
    const { error: updateError } = await supabase
      .from("routine_day_exercises")
      .update(buildProgressionReviewTargetUpdate(target.previousTarget))
      .eq("id", target.routineDayExerciseId)
      .eq("user_id", user.id);

    if (updateError) {
      return { ok: false, error: "Could not revert linked progression update." };
    }

    if (linkedExercise && currentTarget) {
      await recordProgressionEvent({
        supabase,
        payload: buildProgressionEventPayload({
          userId: user.id,
          routineId: payload.routineId,
          routineDayExerciseId: linkedExercise.id,
          exerciseId: linkedExercise.exercise_id,
          eventType: "promotion_reverted",
          fromTarget: currentTarget,
          toTarget: target.previousTarget,
          reason: "Reverted an applied progression target.",
          playbookId: linkedExercise.progression_playbook_id,
          config: linkedExercise.progression_playbook_config,
          sourceSessionId: null,
        }),
        context: "today.revertProgressionReviewCandidateAction",
      });
    }
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
  routineDayNameById: Map<string, string>;
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
  const routineExerciseCountByCatalogExerciseId = progressionExercises.reduce((counts, exercise) => {
    if (exercise.exercise_id) {
      counts.set(exercise.exercise_id, (counts.get(exercise.exercise_id) ?? 0) + 1);
    }
    return counts;
  }, new Map<string, number>());

  if (progressionExerciseIds.length === 0) {
    return [] as ProgressionReviewDisplayItem[];
  }

  const { data: sessionExercisesData, error: sessionExercisesError } = await args.supabase
    .from("session_exercises")
    .select("id, exercise_id, routine_day_exercise_id, session:sessions!inner(performed_at, status, routine_id)")
    .eq("user_id", args.userId)
    .in("exercise_id", progressionExerciseIds)
    .eq("session.status", "completed")
    .eq("session.routine_id", args.routineId);

  if (sessionExercisesError) {
    throw sessionExercisesError;
  }

  const sessionExerciseMetaById = new Map<string, { exerciseId: string; routineDayExerciseId: string | null; performedAt: string }>();
  for (const row of (sessionExercisesData ?? []) as Array<{
    id: string;
    exercise_id: string;
    routine_day_exercise_id?: string | null;
    session?: { performed_at?: string | null; status?: "completed" | "in_progress"; routine_id?: string | null } | Array<{ performed_at?: string | null; status?: "completed" | "in_progress"; routine_id?: string | null }> | null;
  }>) {
    const sessionRow = Array.isArray(row.session) ? (row.session[0] ?? null) : (row.session ?? null);
    if (!row.id || !row.exercise_id || !sessionRow?.performed_at || sessionRow.status !== "completed" || sessionRow.routine_id !== args.routineId) {
      continue;
    }

    sessionExerciseMetaById.set(row.id, {
      exerciseId: row.exercise_id,
      routineDayExerciseId: row.routine_day_exercise_id ?? null,
      performedAt: sessionRow.performed_at,
    });
  }

  const sessionExerciseIds = [...sessionExerciseMetaById.keys()];
  const { data: setsData, error: setsError } = sessionExerciseIds.length > 0
    ? await args.supabase
        .from("sets")
        .select("session_exercise_id, set_index, weight, reps, weight_unit, duration_seconds, distance, distance_unit, calories, is_warmup")
        .eq("user_id", args.userId)
        .in("session_exercise_id", sessionExerciseIds)
        .order("set_index", { ascending: true })
    : { data: [], error: null };

  if (setsError) {
    throw setsError;
  }

  const historyRowsByRoutineDayExerciseId = new Map<string, ProgressionHistorySetRow[]>();
  const fallbackHistoryRowsByExerciseId = new Map<string, ProgressionHistorySetRow[]>();
  for (const row of (setsData ?? []) as Array<{
    session_exercise_id: string;
    set_index: number;
    weight: number | null;
    reps: number | null;
    weight_unit: "lbs" | "kg" | null;
    duration_seconds: number | null;
    distance: number | null;
    distance_unit: "mi" | "km" | "m" | null;
    calories: number | null;
    is_warmup: boolean;
  }>) {
    const meta = sessionExerciseMetaById.get(row.session_exercise_id);
    if (!meta) {
      continue;
    }

    const historyRow = {
      sessionId: row.session_exercise_id,
      performedAt: meta.performedAt,
      setIndex: row.set_index,
      weight: row.weight ?? null,
      reps: row.reps ?? null,
      weightUnit: row.weight_unit ?? null,
      durationSeconds: row.duration_seconds ?? null,
      distance: row.distance ?? null,
      distanceUnit: row.distance_unit ?? null,
      calories: row.calories ?? null,
      isWarmup: row.is_warmup,
    };

    if (meta.routineDayExerciseId) {
      const current = historyRowsByRoutineDayExerciseId.get(meta.routineDayExerciseId) ?? [];
      current.push(historyRow);
      historyRowsByRoutineDayExerciseId.set(meta.routineDayExerciseId, current);
      continue;
    }

    const fallback = fallbackHistoryRowsByExerciseId.get(meta.exerciseId) ?? [];
    fallback.push(historyRow);
    fallbackHistoryRowsByExerciseId.set(meta.exerciseId, fallback);
  }

  return progressionExercises
    .map((exercise) => {
      const plan = buildProgressionReviewTargetPlan(exercise);
      const directHistoryRows = historyRowsByRoutineDayExerciseId.get(exercise.id) ?? [];
      const fallbackHistoryRows = routineExerciseCountByCatalogExerciseId.get(exercise.exercise_id) === 1
        ? fallbackHistoryRowsByExerciseId.get(exercise.exercise_id) ?? []
        : [];
      const selectedHistoryRows = directHistoryRows.length > 0 ? directHistoryRows : fallbackHistoryRows;
      const historySource = directHistoryRows.length > 0
        ? "routine_day_exercise_id"
        : fallbackHistoryRows.length > 0
          ? "unique_catalog_exercise_id_fallback"
          : "none";
      const history = buildProgressionHistorySessions({
        rows: selectedHistoryRows,
        targetSetCount: exercise.target_sets,
        topRepTarget: resolveRoutineExerciseRepTarget(exercise),
        limit: 8,
      });
      const candidate = deriveProgressionReviewCandidate({
        playbookId: exercise.progression_playbook_id,
        config: exercise.progression_playbook_config,
        plan,
        history,
        historyRows: selectedHistoryRows,
        fallbackWeightUnit: args.fallbackWeightUnit,
      });

      return formatProgressionReviewDisplayItem({
        id: exercise.id,
        exerciseName: args.exerciseNameByRoutineExerciseId.get(exercise.id) ?? "Exercise",
        dayName: args.routineDayNameById.get(exercise.routine_day_id) ?? null,
        dayGroupId: exercise.routine_day_id,
        candidate,
        debug: {
          historySource,
          historySetCount: selectedHistoryRows.length,
          historySessionCount: history.length,
        },
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
      const { dayIndex } = resolveRoutineScheduleForToday({
        cycleLengthDays: activeRoutine.cycle_length_days,
        startDate: activeRoutine.start_date,
        profileTimeZone: activeRoutine.timezone || profile.timezone,
      });

      todayDayIndex = dayIndex;
    } catch (error) {
      markBootstrapFailure("routine days fetch", error);
      todayDayIndex = null;
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
  const routineDayNameById = new Map(
    routineDays.map((day) => [
      day.id,
      day.name?.trim() || `Day ${day.day_index}`,
    ] as const),
  );
  const progressionUpdatesEnabled = isFeatureEnabled("progressionUpdatesSurface");
  const earnedInstallPromptEnabled = isFeatureEnabled("earnedInstallPromptTiming");
  let progressionReviewItems: ProgressionReviewDisplayItem[] = [];
  let progressionStatusItems: ProgressionStatusDisplayItem[] = [];
  let progressionStatusSurfaceItems: ProgressionStatusSurfaceItem[] = [];
  if (progressionUpdatesEnabled && activeRoutine && !inProgressSession && allDayExercises.length > 0) {
    try {
      const progressionUpdates = await diagnostics.measure("today.progression-review.fetch", () => loadProgressionUpdatesDisplayData({
        supabase,
        userId: user.id,
        routineId: activeRoutine.id,
        fallbackWeightUnit: activeRoutine.weight_unit,
        exercises: allDayExercises,
        exerciseNameByRoutineExerciseId,
        routineDayNameById,
      }), {
        blockingReason: "Waiting for Today progression review candidates.",
        metadata: {
          activeRoutineId: activeRoutine.id,
          exerciseCount: allDayExercises.length,
          userId: user.id,
        },
        timeoutMs: 7000,
      });
      progressionReviewItems = progressionUpdates.readyItems;
      progressionStatusItems = progressionUpdates.statusItems;
      progressionStatusSurfaceItems = progressionUpdates.statusSurfaceItems;
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
  const fallbackTemplateDay = todayRoutineDay ?? routineDays[0] ?? null;
  const displayDay = resolveTodayDisplayDay({
    calendarDayIndex: todayDayIndex,
    todayRoutineDay,
    fallbackRoutineDay: fallbackTemplateDay,
    routineDays,
    inProgressSession,
  });
  const effectiveDayIndex = displayDay.dayIndex;
  const effectiveRoutineDay = displayDay.routineDay;
  const effectiveDaySummary = effectiveRoutineDay ? normalizedDayByIndex.get(effectiveRoutineDay.day_index) ?? null : null;
  const routineDayName = effectiveDayIndex !== null
    ? formatRoutineDayStableDisplayName({
        name: displayDay.dayName,
        dayIndex: effectiveDayIndex,
        startDate: activeRoutine?.start_date ?? null,
      })
    : displayDay.dayName;
  const routineDayWeekday = activeRoutine?.start_date && effectiveDayIndex !== null
    ? getRoutineCycleOccurrence({
        cycleLengthDays: activeRoutine.cycle_length_days,
        startDate: activeRoutine.start_date,
        profileTimeZone: activeRoutine.timezone || profile.timezone,
        dayIndex: effectiveDayIndex,
      }).occurrenceWeekdayShort
    : null;
  const routinePayloadState = buildTodayRoutinePayloadState({
    activeRoutine,
    effectiveDayIndex,
    routineDayName,
    routineDayWeekday,
    isRest: effectiveRoutineDay?.is_rest ?? false,
    state: effectiveDaySummary?.state ?? getRunnableDayState({
      isRest: effectiveRoutineDay?.is_rest ?? false,
      runnableExerciseCount: 0,
      invalidExerciseCount: 0,
    }),
    routineDayId: effectiveRoutineDay?.id ?? null,
    fallbackDayIndex: fallbackTemplateDay?.day_index ?? todayDayIndex,
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
                  <RoutineDayCardTitle
                    routineName={todayPayload.routine.name}
                    name={todayPayload.routine.dayName}
                    dayIndex={todayPayload.routine.dayIndex}
                    startDate={activeRoutine?.start_date ?? null}
                    weekdayLabel={todayPayload.routine.dayWeekday}
                    dayWeekdaySeparator="dot"
                  />
                )}
                align="center"
                subtitle={todayHeaderSubtitle}
              />
            </TodayFloatingHeaderRail>
          ) : (
            <>
              <TodayRoutineSwitchFloatingHeaderSlot id="today-routine-switch-floating-header-slot" />
              <TodayFloatingHeaderSlot id="today-floating-header-slot" />
            </>
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
          {earnedInstallPromptEnabled ? <EarnedInstallPrompt /> : null}
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
                occurrenceWeekday: activeRoutine?.start_date
                  ? getRoutineCycleOccurrence({
                      cycleLengthDays: activeRoutine.cycle_length_days,
                      startDate: activeRoutine.start_date,
                      profileTimeZone: activeRoutine.timezone || profile.timezone,
                      dayIndex: day.day_index,
                    }).occurrenceWeekdayShort
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
              currentDayIndex={displayDay.hasScheduledDayToday ? todayPayload.routine.dayIndex : null}
              noScheduledDayMessage={displayDay.hasScheduledDayToday || todayPayload.inProgressSessionId
                ? null
                : "This routine has no active day for today's date."}
              inProgressSessionId={todayPayload.inProgressSessionId}
              completedDayIndexes={completedDayIndexes}
              inSessionDayIndex={inProgressSession?.routine_day_index ?? null}
              loggedSetCountsByDayIndex={inProgressSession?.routine_day_index
                ? { [inProgressSession.routine_day_index]: inProgressSessionLoggedSetCount }
                : {}}
              routineName={todayPayload.routine.name}
              startDate={activeRoutine?.start_date ?? null}
              floatingHeaderSlotId="today-floating-header-slot"
              switchFloatingHeaderSlotId="today-routine-switch-floating-header-slot"
              progressionReviewItems={progressionReviewItems}
              progressionStatusItems={progressionStatusItems}
              progressionStatusSurfaceItems={progressionStatusSurfaceItems}
              progressionRoutineId={todayPayload.routine.id}
              applyProgressionReviewCandidateAction={applyProgressionReviewCandidateAction}
              revertProgressionReviewCandidateAction={revertProgressionReviewCandidateAction}
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
