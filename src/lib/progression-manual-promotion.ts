// Manual Promote (2026-11-19): progression is never automatic. A promotion happens only when the
// user taps Promote on a full (100%) progress bar. This module holds the pure gate and the
// orchestration so every refusal path is unit-tested with an in-memory repository; the server
// action in src/app/progression-review/actions.ts only supplies the Supabase-backed repository.
import type {
  ProgressionHistorySetRow,
  ProgressionReviewCandidate,
  ProgressionTargetPlan,
} from "@/lib/progression-playbooks";
import { deriveProgressionProgressPercent } from "@/lib/progression-progress-percent";
import { extractProgressionSourceSessionId, targetsDiffer } from "@/lib/progression-events";
import type { ProgressionReviewApplyResult, ProgressionReviewLinkedTargetSnapshot } from "@/lib/progression-review-display";

export const MANUAL_PROMOTION_FULL_BAR_PERCENT = 100;
// Mirrors NON_READY_PROGRESS_PERCENT_CAP in progression-status-display.ts: a bar that is not
// backed by a ready candidate never renders as full.
const MANUAL_PROMOTION_NON_READY_CAP = 96;

export type ManualPromotionRefusalCode =
  | "not_owned"
  | "workout_in_progress"
  | "already_applied"
  | "stale_target"
  | "bar_not_full"
  | "not_promote"
  | "lost_race"
  | "linked_mismatch"
  | "audit_failed"
  | "audit_failed_unrestored"
  | "linked_audit_failed_unrestored";

export const MANUAL_PROMOTION_REFUSAL_MESSAGES: Record<ManualPromotionRefusalCode, string> = {
  not_owned: "Progression update is no longer available.",
  workout_in_progress: "Finish or discard the active workout before promoting.",
  already_applied: "This exercise was already promoted from that workout.",
  stale_target: "This target changed since Today loaded. Refresh and try again.",
  bar_not_full: "Promote unlocks when the progress bar is full.",
  not_promote: "This exercise is not ready to promote.",
  lost_race: "Another change updated this target first. Refresh and try again.",
  linked_mismatch: "Linked progression targets no longer match.",
  audit_failed: "Could not save this promotion, so your target was left unchanged. Try again.",
  audit_failed_unrestored: "This promotion could not be saved and the target could not be put back. Refresh and check this exercise's target before changing it.",
  linked_audit_failed_unrestored: "Promoted, but a linked day could not be saved or put back. Refresh and check its target before changing it.",
};

export type ManualPromotionEventRow = {
  event_type: string;
  routine_day_exercise_id: string;
  source_session_id: string | null;
  created_at: string;
};

export type ManualPromotionRefusal = { ok: false; code: ManualPromotionRefusalCode; error: string };

function refuse(code: ManualPromotionRefusalCode): ManualPromotionRefusal {
  return { ok: false, code, error: MANUAL_PROMOTION_REFUSAL_MESSAGES[code] };
}

/**
 * The bar the Today card shows, recomputed on the server. Same rule as the loader and
 * buildProgressionStatusSurfaceItem: any ready candidate renders 100% ("Ready"); otherwise the
 * raw latest-session progress, capped below full.
 */
export function deriveManualPromotionBarPercent(args: {
  candidate: Pick<ProgressionReviewCandidate, "type">;
  plan: ProgressionTargetPlan;
  historyRows: ProgressionHistorySetRow[];
}) {
  if (args.candidate.type !== "none") {
    return deriveProgressionProgressPercent({ plan: args.plan, historyRows: args.historyRows, isReady: true }).percent;
  }

  const raw = deriveProgressionProgressPercent({ plan: args.plan, historyRows: args.historyRows }).percent;
  return Math.min(raw, MANUAL_PROMOTION_NON_READY_CAP);
}

/**
 * The completed workout a promotion is credited to: the candidate's source session when it has
 * one, otherwise the latest completed session in history (so a repeat tap after the bar reset
 * still resolves to the same workout and is caught by the event check).
 */
export function resolveManualPromotionSourceSessionId(args: {
  candidate: Pick<ProgressionReviewCandidate, "sourceSession">;
  historyRows: ProgressionHistorySetRow[];
}) {
  const fromCandidate = extractProgressionSourceSessionId({
    sourceSessionId: args.candidate.sourceSession?.sessionId,
    historyRows: args.historyRows,
  });
  if (fromCandidate) {
    return fromCandidate;
  }

  const latest = args.historyRows
    .filter((row) => !row.isWarmup && row.sessionRecordId)
    .sort((left, right) => right.performedAt.localeCompare(left.performedAt))[0];
  return latest?.sessionRecordId ?? null;
}

/**
 * True when a promotion_applied event for this exercise and source workout is still standing,
 * i.e. it is newer than the exercise's latest promotion_reverted. Revert then Promote again works.
 */
export function hasStandingPromotionForSourceSession(args: {
  events: ManualPromotionEventRow[];
  routineDayExerciseId: string;
  sourceSessionId: string | null;
}) {
  if (!args.sourceSessionId) {
    return false;
  }

  const forExercise = args.events.filter((event) => event.routine_day_exercise_id === args.routineDayExerciseId);
  const latestApplied = forExercise
    .filter((event) => event.event_type === "promotion_applied" && event.source_session_id === args.sourceSessionId)
    .map((event) => event.created_at)
    .sort()
    .at(-1);
  if (!latestApplied) {
    return false;
  }

  const latestReverted = forExercise
    .filter((event) => event.event_type === "promotion_reverted")
    .map((event) => event.created_at)
    .sort()
    .at(-1);
  return !latestReverted || latestReverted < latestApplied;
}

function toEpochMs(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * The promotion currently in effect for an exercise: events are replayed oldest-first, each
 * promotion_applied pushes and each promotion_reverted pops (Revert undoes the latest applied
 * promotion), so the top of the stack is the promotion the stored target came from.
 */
export function resolveStandingPromotion(args: {
  events: ManualPromotionEventRow[];
  routineDayExerciseId: string;
}): { sourceSessionId: string | null; appliedAt: string } | null {
  const ordered = args.events
    .filter((event) => event.routine_day_exercise_id === args.routineDayExerciseId)
    .filter((event) => event.event_type === "promotion_applied" || event.event_type === "promotion_reverted")
    .map((event, index) => ({ event, index, at: toEpochMs(event.created_at) ?? 0 }))
    .sort((left, right) => left.at - right.at || left.index - right.index);
  const stack: ManualPromotionEventRow[] = [];
  for (const { event } of ordered) {
    if (event.event_type === "promotion_applied") {
      stack.push(event);
    } else {
      stack.pop();
    }
  }

  const top = stack.at(-1);
  return top ? { sourceSessionId: top.source_session_id, appliedAt: top.created_at } : null;
}

/**
 * Post-promotion reset. A standing promotion consumes its source workout and everything before
 * it: progress toward the NEW target counts only workouts performed after the source workout
 * (or, when that workout is not in `locateRows`, after the promotion was applied). Without this,
 * beating the target (target 10, did 12 -> 11) leaves the same workout qualifying at 11, so the
 * bar would stay full and Promote would reappear. A later promotion_reverted removes the hold.
 */
export function resolvePromotionHoldCutoffMs(args: {
  events: ManualPromotionEventRow[];
  routineDayExerciseId: string;
  /** Rows used only to find the source workout's performedAt (direct, fallback and linked history). */
  locateRows: ProgressionHistorySetRow[];
}) {
  const standing = resolveStandingPromotion({ events: args.events, routineDayExerciseId: args.routineDayExerciseId });
  if (!standing) {
    return null;
  }

  const sourcePerformedAt = standing.sourceSessionId
    ? args.locateRows
        .filter((row) => row.sessionRecordId === standing.sourceSessionId)
        .map((row) => toEpochMs(row.performedAt))
        .filter((value): value is number => value !== null)
        .sort((left, right) => right - left)[0]
    : undefined;
  return sourcePerformedAt ?? toEpochMs(standing.appliedAt) ?? Number.POSITIVE_INFINITY;
}

export function filterHistoryAfterPromotionHold<RowType extends Pick<ProgressionHistorySetRow, "performedAt">>(rows: RowType[], cutoffMs: number | null) {
  if (cutoffMs === null) {
    return rows;
  }

  return rows.filter((row) => {
    const performedAt = toEpochMs(row.performedAt);
    return performedAt !== null && performedAt > cutoffMs;
  });
}

export function manualPromotionTargetMatches(expected: ProgressionTargetPlan | null | undefined, candidates: ProgressionTargetPlan[]) {
  if (!expected) {
    return false;
  }

  return candidates.some((current) => !targetsDiffer(expected, current));
}

export type ManualPromotionGateInput = {
  exerciseOwned: boolean;
  workoutInProgress: boolean;
  routineDayExerciseId: string;
  expectedFromTarget: ProgressionTargetPlan | null | undefined;
  /** Stored target and the effort-schedule target Today displays; the client may echo either. */
  acceptableCurrentTargets: ProgressionTargetPlan[];
  candidate: ProgressionReviewCandidate;
  barPercent: number;
  sourceSessionId: string | null;
  events: ManualPromotionEventRow[];
};

export type ManualPromotionGateResult =
  | { ok: true; proposedTarget: ProgressionTargetPlan; sourceSessionId: string | null }
  | ManualPromotionRefusal;

export function evaluateManualPromotionGate(input: ManualPromotionGateInput): ManualPromotionGateResult {
  if (!input.exerciseOwned) {
    return refuse("not_owned");
  }

  if (input.workoutInProgress) {
    return refuse("workout_in_progress");
  }

  if (hasStandingPromotionForSourceSession({
    events: input.events,
    routineDayExerciseId: input.routineDayExerciseId,
    sourceSessionId: input.sourceSessionId,
  })) {
    return refuse("already_applied");
  }

  if (!manualPromotionTargetMatches(input.expectedFromTarget, input.acceptableCurrentTargets)) {
    return refuse("stale_target");
  }

  if (input.barPercent < MANUAL_PROMOTION_FULL_BAR_PERCENT) {
    return refuse("bar_not_full");
  }

  if (input.candidate.type !== "promote" || !input.candidate.proposedTarget) {
    return refuse("not_promote");
  }

  return { ok: true, proposedTarget: input.candidate.proposedTarget, sourceSessionId: input.sourceSessionId };
}

export type ManualPromotionExerciseSnapshot<Row> = {
  row: Row;
  id: string;
  storedTarget: ProgressionTargetPlan;
  effectiveTarget: ProgressionTargetPlan;
};

export type ManualPromotionRepository<Row> = {
  /** Null when the exercise does not exist, belongs to another user, or is not in the routine. */
  readOwnedExercise(routineDayExerciseId: string): Promise<ManualPromotionExerciseSnapshot<Row> | null>;
  /** Any in-progress workout for this user, not only this routine. */
  hasWorkoutInProgress(): Promise<boolean>;
  /** Completed history for the exercise (direct rows, or the unique catalog fallback). */
  readHistory(exercise: ManualPromotionExerciseSnapshot<Row>): Promise<ProgressionHistorySetRow[]>;
  /** The playbook candidate for exactly these rows (already filtered by the promotion hold). */
  deriveCandidate(exercise: ManualPromotionExerciseSnapshot<Row>, historyRows: ProgressionHistorySetRow[]): Promise<ProgressionReviewCandidate>;
  readPromotionEvents(routineDayExerciseId: string): Promise<ManualPromotionEventRow[]>;
  /** Null when any linked id is missing, outside the routine, or no longer shares the source target. */
  readLinkedExercises(source: ManualPromotionExerciseSnapshot<Row>, linkedIds: string[]): Promise<ManualPromotionExerciseSnapshot<Row>[] | null>;
  /** Conditional write: only succeeds while the row still holds `exercise.storedTarget`. */
  updateTargetIfUnchanged(exercise: ManualPromotionExerciseSnapshot<Row>, nextTarget: ProgressionTargetPlan): Promise<boolean>;
  /**
   * Undo after a failed audit insert: put the row's original target columns back, conditional on
   * the row still holding exactly `appliedTarget` (so a newer change is never overwritten).
   * Returns false on any error or when no row matched; never throws.
   */
  restoreTargetIfUnchanged(exercise: ManualPromotionExerciseSnapshot<Row>, appliedTarget: ProgressionTargetPlan): Promise<boolean>;
  /** False when the promotion_applied row was not written (insert error or unbuildable payload). */
  recordPromotionApplied(args: {
    exercise: ManualPromotionExerciseSnapshot<Row>;
    fromTarget: ProgressionTargetPlan;
    toTarget: ProgressionTargetPlan;
    reason: string;
    sourceSessionId: string | null;
  }): Promise<boolean>;
};

export type ManualPromotionRequest = {
  routineDayExerciseId: string;
  expectedFromTarget: ProgressionTargetPlan | null | undefined;
  linkedIds?: string[];
};

export const MANUAL_PROMOTION_LINKED_LIMIT = 12;

export function resolveManualPromotionLinkedIds(sourceId: string, linkedIds?: string[]) {
  const ids = Array.from(new Set((linkedIds ?? [])
    .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    .map((id) => id.trim())
    .filter((id) => id !== sourceId)));
  return ids.slice(0, MANUAL_PROMOTION_LINKED_LIMIT);
}

export async function runManualPromotion<Row>(
  repo: ManualPromotionRepository<Row>,
  request: ManualPromotionRequest,
): Promise<{ ok: true; data: ProgressionReviewApplyResult } | ManualPromotionRefusal> {
  const exercise = await repo.readOwnedExercise(request.routineDayExerciseId);
  if (!exercise) {
    return refuse("not_owned");
  }

  const workoutInProgress = await repo.hasWorkoutInProgress();
  if (workoutInProgress) {
    return refuse("workout_in_progress");
  }

  const events = await repo.readPromotionEvents(exercise.id);
  const allHistoryRows = await repo.readHistory(exercise);
  // Same post-promotion reset as the Today loader: a standing promotion consumes its source
  // workout, so only newer workouts can fill the bar at the new target.
  const historyRows = filterHistoryAfterPromotionHold(allHistoryRows, resolvePromotionHoldCutoffMs({
    events,
    routineDayExerciseId: exercise.id,
    locateRows: allHistoryRows,
  }));
  const candidate = await repo.deriveCandidate(exercise, historyRows);
  const sourceRows = candidate.sourceSession
    ? historyRows.filter((row) => row.sessionId === candidate.sourceSession?.sessionId)
    : historyRows;
  // Resolved against the unfiltered history: with no newer workout this is the consumed workout,
  // so a repeat tap is refused as already_applied rather than as a generic not-ready.
  const sourceSessionId = resolveManualPromotionSourceSessionId({ candidate, historyRows: allHistoryRows });
  const gate = evaluateManualPromotionGate({
    exerciseOwned: true,
    workoutInProgress,
    routineDayExerciseId: exercise.id,
    expectedFromTarget: request.expectedFromTarget,
    acceptableCurrentTargets: [exercise.storedTarget, exercise.effectiveTarget],
    candidate,
    barPercent: deriveManualPromotionBarPercent({ candidate, plan: exercise.effectiveTarget, historyRows: sourceRows }),
    sourceSessionId,
    events,
  });
  if (!gate.ok) {
    return gate;
  }

  const linkedIds = resolveManualPromotionLinkedIds(exercise.id, request.linkedIds);
  const linkedExercises = linkedIds.length > 0 ? await repo.readLinkedExercises(exercise, linkedIds) : [];
  if (!linkedExercises) {
    return refuse("linked_mismatch");
  }

  // Source first: if it loses the race nothing is written anywhere.
  if (!(await repo.updateTargetIfUnchanged(exercise, gate.proposedTarget))) {
    return refuse("lost_race");
  }

  const reason = candidate.reason.trim() || "Promoted manually from a full progress bar.";
  const sourceRecorded = await repo.recordPromotionApplied({
    exercise,
    fromTarget: exercise.storedTarget,
    toTarget: gate.proposedTarget,
    reason,
    sourceSessionId: gate.sourceSessionId,
  });
  if (!sourceRecorded) {
    // No audit row means no idempotency guard: undo the target rather than report success.
    const restored = await repo.restoreTargetIfUnchanged(exercise, gate.proposedTarget);
    return refuse(restored ? "audit_failed" : "audit_failed_unrestored");
  }

  const linkedTargets: ProgressionReviewLinkedTargetSnapshot[] = [{
    routineDayExerciseId: exercise.id,
    previousTarget: exercise.storedTarget,
    appliedTarget: gate.proposedTarget,
  }];
  for (const linked of linkedExercises) {
    // A linked day changed underneath us: skip it rather than overwrite a newer target.
    if (!(await repo.updateTargetIfUnchanged(linked, gate.proposedTarget))) {
      continue;
    }

    const linkedRecorded = await repo.recordPromotionApplied({
      exercise: linked,
      fromTarget: linked.storedTarget,
      toTarget: gate.proposedTarget,
      reason,
      sourceSessionId: gate.sourceSessionId,
    });
    if (!linkedRecorded) {
      // Undo this linked day and leave it out of the result (like a lost race). If it cannot be
      // put back it is promoted with no audit row: say so instead of reporting success.
      if (!(await repo.restoreTargetIfUnchanged(linked, gate.proposedTarget))) {
        return refuse("linked_audit_failed_unrestored");
      }
      continue;
    }
    linkedTargets.push({
      routineDayExerciseId: linked.id,
      previousTarget: linked.storedTarget,
      appliedTarget: gate.proposedTarget,
    });
  }

  return {
    ok: true,
    data: {
      previousTarget: exercise.storedTarget,
      appliedTarget: gate.proposedTarget,
      linkedTargets: linkedTargets.length > 1 ? linkedTargets : undefined,
    },
  };
}

/** Column guard for the conditional update: every target column must still hold what was read. */
export type ManualPromotionTargetGuardRow = {
  target_sets: number | null;
  target_reps: number | null;
  target_reps_min: number | null;
  target_reps_max: number | null;
  target_weight: number | null;
  target_weight_unit: string | null;
  target_duration_seconds: number | null;
  target_distance: number | null;
  target_distance_unit: string | null;
  target_calories: number | null;
};

const TARGET_GUARD_COLUMNS = [
  "target_sets",
  "target_reps",
  "target_reps_min",
  "target_reps_max",
  "target_weight",
  "target_weight_unit",
  "target_duration_seconds",
  "target_distance",
  "target_distance_unit",
  "target_calories",
] as const satisfies ReadonlyArray<keyof ManualPromotionTargetGuardRow>;

export function buildManualPromotionTargetGuard(row: Partial<ManualPromotionTargetGuardRow>) {
  return TARGET_GUARD_COLUMNS.map((column) => ({ column, value: row[column] ?? null }));
}
