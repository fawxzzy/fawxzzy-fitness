"use server";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import {
  buildProgressionReviewTargetPlan,
  canUseCatalogHistoryFallbackForRoutineExercise,
  getProgressionReviewTargetFingerprintForExercise,
  inferProgressionStepPolicyForRoutineExercise,
  loadProgressionHistoryForExercise,
  resolveRoutineExerciseRepTarget,
} from "@/lib/progression-review-loader";
import { buildProgressionReviewTargetUpdate } from "@/lib/progression-review-target-update";
import {
  buildProgressionHistorySessions,
  deriveProgressionReviewCandidate,
  validateProgressionPlaybookSelection,
  type ProgressionHistorySetRow,
  type ProgressionTargetPlan,
} from "@/lib/progression-playbooks";
import { applyEffortScheduleToRoutineDayExercise } from "@/lib/progression-effective-target";
import { runManualPromotion } from "@/lib/progression-manual-promotion";
import {
  createManualPromotionRepository,
  LINKED_PROGRESSION_UPDATE_LIMIT,
  PROGRESSION_MUTATION_EXERCISE_SELECT,
  readMutationExercisesForRoutine,
  verifyLinkedProgressionFingerprints,
  type ProgressionReviewMutationExerciseRow,
} from "@/lib/progression-manual-promotion-repository";
import { revalidateRoutinesViews } from "@/lib/revalidation";
import {
  buildProgressionEventPayload,
  extractProgressionSourceSessionId,
  recordProgressionEvent,
} from "@/lib/progression-events";
import type {
  ProgressionReviewApplyResult,
  ProgressionReviewDisplayItem,
  ProgressionReviewLinkedTargetSnapshot,
  ProgressionReviewRevertTargetSnapshot,
} from "@/lib/progression-review-display";
import { guardLiveSessionMutation, parseLiveSessionStatus } from "@/lib/session-live-mutation";
import { supabaseServer } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import type { RoutineDayExerciseRow } from "@/types/db";

function revalidateProgressionViews(routineId: string) {
  revalidatePath("/today");
  revalidatePath(`/routines/${routineId}/edit`);
  revalidateRoutinesViews();
}

function createLiveSessionMutationRepository(supabase: Awaited<ReturnType<typeof supabaseServer>>) {
  return {
    async readSession(sessionId: string) {
      const { data } = await supabase
        .from("sessions")
        .select("id, user_id, status")
        .eq("id", sessionId)
        .maybeSingle();

      const status = parseLiveSessionStatus(data?.status);
      return data && status
        ? {
            id: data.id,
            userId: data.user_id,
            status,
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

async function readProgressionReviewMutationContext(args: {
  supabase: Awaited<ReturnType<typeof supabaseServer>>;
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

  const { data: activeSessions, error: activeSessionError } = await args.supabase
    .from("sessions")
    .select("id")
    .eq("user_id", args.userId)
    .eq("routine_id", args.routineId)
    .eq("status", "in_progress")
    .limit(1);

  if (activeSessionError) {
    return { ok: false, error: "Could not verify active session state." };
  }

  const activeSessionId = activeSessions?.[0]?.id ?? null;
  if (activeSessionId) {
    const liveSession = await guardLiveSessionMutation(createLiveSessionMutationRepository(args.supabase), {
      userId: args.userId,
      sessionId: activeSessionId,
    });

    if (!liveSession.ok) {
      return { ok: false, error: "Could not verify active session state." };
    }

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

function resolveLinkedRoutineDayExerciseIds(sourceId: string, linkedIds?: string[]) {
  const rawIds = linkedIds && linkedIds.length > 0 ? linkedIds : [sourceId];
  const ids = Array.from(new Set(rawIds.filter((id) => typeof id === "string" && id.trim()).map((id) => id.trim())));
  return ids.slice(0, LINKED_PROGRESSION_UPDATE_LIMIT + 1);
}


/**
 * Manual Promote (the only way a promotion happens since 2026-11-19). The server recomputes the
 * candidate and the bar, requires a promote candidate on a full bar, refuses during any
 * in-progress workout, refuses a repeat for the same source workout or a stale target, and writes
 * with a conditional update. The bar resets because the standing promotion_applied consumes its
 * source workout (Today and this action both count only newer workouts until a revert). If the
 * audit row cannot be written the target is put back and the action fails.
 */
export async function promoteExerciseAction(payload: {
  routineId: string;
  routineDayExerciseId: string;
  expectedFromTarget: ProgressionTargetPlan | null;
  linkedIds?: string[];
}): Promise<ActionResult<ProgressionReviewApplyResult>> {
  const user = await requireUser();
  const supabase = await supabaseServer();

  let result: Awaited<ReturnType<typeof runManualPromotion>>;
  try {
    result = await runManualPromotion(
      createManualPromotionRepository({ supabase, userId: user.id, routineId: payload.routineId }),
      {
        routineDayExerciseId: payload.routineDayExerciseId,
        expectedFromTarget: payload.expectedFromTarget,
        linkedIds: payload.linkedIds,
      },
    );
  } catch (error) {
    console.error("[progression-review] manual promote failed", {
      routineDayExerciseId: payload.routineDayExerciseId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, error: "Could not verify this promotion. Try again." };
  }

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidateProgressionViews(payload.routineId);
  return { ok: true, data: result.data };
}

export async function applyProgressionReviewCandidateAction(payload: {
  routineId: string;
  routineDayExerciseId: string;
  candidateType: ProgressionReviewDisplayItem["type"];
  linkedRoutineDayExerciseIds?: string[];
  expectedFromTarget?: ProgressionTargetPlan | null;
}): Promise<ActionResult<ProgressionReviewApplyResult>> {
  if (payload.candidateType === "promote") {
    // Promotions go through the manual-promote gate only (bar at 100%, idempotent, conditional write).
    return promoteExerciseAction({
      routineId: payload.routineId,
      routineDayExerciseId: payload.routineDayExerciseId,
      expectedFromTarget: payload.expectedFromTarget ?? null,
      linkedIds: payload.linkedRoutineDayExerciseIds,
    });
  }

  const user = await requireUser();
  const supabase = await supabaseServer();

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

  // Deload only: promote never reaches this path (see promoteExerciseAction above).
  if (candidate.type !== payload.candidateType || candidate.type !== "deload" || !candidate.proposedTarget) {
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
        eventType: "deload_applied",
        fromTarget: linkedPreviousTarget,
        toTarget: candidate.proposedTarget,
        reason: candidate.reason,
        playbookId: linkedExercise.progression_playbook_id,
        config: linkedExercise.progression_playbook_config,
        sourceSessionId,
      }),
      context: "progressionReview.applyProgressionReviewCandidateAction",
    });

    linkedTargets.push({
      routineDayExerciseId: linkedExercise.id,
      previousTarget: linkedPreviousTarget,
      appliedTarget: candidate.proposedTarget,
    });
  }

  revalidateProgressionViews(payload.routineId);

  return {
    ok: true,
    data: {
      previousTarget,
      appliedTarget: candidate.proposedTarget,
      linkedTargets: linkedTargets.length > 1 ? linkedTargets : undefined,
    },
  };
}

export async function revertProgressionReviewCandidateAction(payload: {
  routineId: string;
  routineDayExerciseId: string;
  previousTarget: ProgressionTargetPlan;
  linkedPreviousTargets?: ProgressionReviewRevertTargetSnapshot[];
}): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await supabaseServer();
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
        context: "progressionReview.revertProgressionReviewCandidateAction",
      });
    }
  }

  revalidateProgressionViews(payload.routineId);

  return { ok: true };
}
