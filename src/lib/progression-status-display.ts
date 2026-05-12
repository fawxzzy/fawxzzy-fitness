import { formatCalories, formatDistance } from "@/lib/exercise-stats-formatting";
import { formatDurationClock } from "@/lib/duration";
import { formatDateShort, formatWeight } from "@/lib/formatting";
import type { ProgressionAuditHistorySource, ProgressionAuditRejectionReason } from "@/lib/progression-candidate-audit";
import { getProgressionTargetFingerprint } from "@/lib/progression-history-scope";
import {
  describePromotionBasis,
  formatPromotionBasisLabel,
  formatRepPromotionThresholdLabel,
  getRepPromotionTarget,
  normalizeProgressionPromotionConfig,
  usesRepsForPromotion,
  type ProgressionPromotionBasis,
  type RepPromotionThreshold,
} from "@/lib/progression-promotion";
import type {
  ProgressionHistorySetRow,
  ProgressionMeasurementType,
  ProgressionPlaybookSelection,
  ProgressionReviewCandidate,
  ProgressionTargetPlan,
} from "@/lib/progression-playbooks";
import { deriveProgressionProgressPercent, type ProgressionProgressFill } from "@/lib/progression-progress-percent";
import { formatProgressionReviewTargetLabel } from "@/lib/progression-review-display";

export { getProgressionTargetFingerprint } from "@/lib/progression-history-scope";

export type ProgressionStatusType =
  | "partial_progress"
  | "above_target_incomplete"
  | "below_target_load"
  | "no_planned_row_history"
  | "no_history_anywhere"
  | "linked_same_target"
  | "global_history_context"
  | "top_range_not_met"
  | "incomplete_sets"
  | "manual"
  | "unsupported";

export type ProgressionStatusDisplayItem = {
  id: string;
  exerciseName: string;
  dayName?: string | null;
  dayGroupId?: string | null;
  statusType: ProgressionStatusType;
  label: string;
  detailLine: string;
  targetLine: string;
  latestLine: string;
  reason: string;
  progress?: ProgressionProgressFill;
};

export type ProgressionStatusSurfaceState =
  | "ready"
  | "not_ready"
  | "insufficient_evidence"
  | "manual";

export type ProgressionStatusSurfaceItem = {
  id: string;
  exerciseName: string;
  dayName?: string | null;
  dayGroupId?: string | null;
  readinessState: ProgressionStatusSurfaceState;
  readinessLabel: string;
  currentTargetLine: string;
  promotionBasisLabel: string | null;
  promotionBasisDetail: string | null;
  repTargetLine: string | null;
  latestLine: string;
  targetLine: string;
  detailLine: string;
  nextUpdateLine: string | null;
  reason: string;
  progress?: ProgressionProgressFill;
};

export type ProgressionCalculationEvidence = {
  usedLine: string;
  needsLine: string;
  resultLine: string;
};

const NON_READY_PROGRESS_PERCENT_CAP = 96;

function getWorkRows(rows: ProgressionHistorySetRow[]) {
  return rows.filter((row) => !row.isWarmup);
}

function getLatestSessionRows(rows: ProgressionHistorySetRow[]) {
  const workRows = getWorkRows(rows)
    .sort((left, right) => {
      const dateOrder = right.performedAt.localeCompare(left.performedAt);
      return dateOrder !== 0 ? dateOrder : left.setIndex - right.setIndex;
    });
  const latestSessionId = workRows[0]?.sessionId ?? null;
  return latestSessionId ? workRows.filter((row) => row.sessionId === latestSessionId) : workRows;
}

function formatMatchedDate(rows: ProgressionHistorySetRow[]) {
  const performedAt = [...rows].sort((left, right) => right.performedAt.localeCompare(left.performedAt))[0]?.performedAt ?? null;
  return performedAt ? formatDateShort(performedAt) : null;
}

function formatRepsSetSummary(rows: ProgressionHistorySetRow[]) {
  const latestRows = getLatestSessionRows(rows);
  if (latestRows.length === 0) {
    return "Used: no completed work sets";
  }

  const reps = latestRows
    .map((row) => typeof row.reps === "number" ? row.reps : null)
    .filter((value): value is number => value !== null);
  const loadedRow = latestRows.find((row) => typeof row.weight === "number" && row.weight > 0);
  const weight = loadedRow ? formatWeight(loadedRow.weight, loadedRow.weightUnit) : null;
  const repsLabel = reps.length > 0 ? reps.join(" / ") : "no reps";
  const dateLabel = formatMatchedDate(latestRows);
  const parts = [dateLabel, weight, repsLabel].filter((part): part is string => Boolean(part));

  return `Used: ${parts.join(" · ")}`;
}

function formatMetricSetSummary(rows: ProgressionHistorySetRow[], measurementType: ProgressionMeasurementType) {
  const workRows = getWorkRows(rows);
  if (workRows.length === 0) {
    return "Used: no completed work sets";
  }

  const bestDuration = Math.max(0, ...workRows.map((row) => row.durationSeconds ?? 0));
  const bestDistanceRow = workRows
    .filter((row) => typeof row.distance === "number" && row.distance > 0)
    .sort((left, right) => (right.distance ?? 0) - (left.distance ?? 0))[0] ?? null;
  const bestCalories = Math.max(0, ...workRows.map((row) => row.calories ?? 0));
  const parts = [
    measurementType === "time" || measurementType === "time_distance"
      ? (bestDuration > 0 ? formatDurationClock(bestDuration) : null)
      : null,
    measurementType === "distance" || measurementType === "time_distance"
      ? (bestDistanceRow?.distance ? formatDistance(bestDistanceRow.distance, bestDistanceRow.distanceUnit ?? null) : null)
      : null,
    bestCalories > 0 ? formatCalories(bestCalories) : null,
  ].filter((part): part is string => Boolean(part));

  const dateLabel = formatMatchedDate(workRows);

  const evidenceParts = [dateLabel, ...parts].filter((part): part is string => Boolean(part));

  return evidenceParts.length > 0
    ? `Used: ${evidenceParts.join(" · ")}`
    : `Used: ${workRows.length} logged set${workRows.length === 1 ? "" : "s"}`;
}

function formatLatestLine(rows: ProgressionHistorySetRow[], measurementType: ProgressionMeasurementType) {
  return measurementType === "reps"
    ? formatRepsSetSummary(rows)
    : formatMetricSetSummary(rows, measurementType);
}

function resolveTargetSetCount(plan: ProgressionTargetPlan) {
  return typeof plan.setsMax === "number" && plan.setsMax > 0
    ? plan.setsMax
    : typeof plan.setsMin === "number" && plan.setsMin > 0
      ? plan.setsMin
      : null;
}

function resolveTopRepTarget(plan: ProgressionTargetPlan) {
  if (typeof plan.repsTarget === "number" && Number.isFinite(plan.repsTarget) && plan.repsTarget > 0) {
    return plan.repsTarget;
  }

  return typeof plan.repsMax === "number" && plan.repsMax > 0
    ? plan.repsMax
    : typeof plan.repsMin === "number" && plan.repsMin > 0
      ? plan.repsMin
      : null;
}

function getTopRangeHitCount(rows: ProgressionHistorySetRow[], plan: ProgressionTargetPlan) {
  const topRepTarget = resolveTopRepTarget(plan);
  if (!topRepTarget) {
    return 0;
  }

  return getLatestSessionRows(rows).filter((row) => (row.reps ?? 0) >= topRepTarget).length;
}

function getQualifiedTopRangeLoadCount(rows: ProgressionHistorySetRow[], plan: ProgressionTargetPlan) {
  const topRepTarget = resolveTopRepTarget(plan);
  const targetLoad = getTargetLoad(plan);
  if (!topRepTarget || targetLoad === null) {
    return 0;
  }

  return getLatestSessionRows(rows).filter((row) => (row.reps ?? 0) >= topRepTarget && (row.weight ?? 0) >= targetLoad).length;
}

function getTargetLoad(plan: ProgressionTargetPlan) {
  return typeof plan.weightMax === "number" && plan.weightMax > 0
    ? plan.weightMax
    : typeof plan.weightMin === "number" && plan.weightMin > 0
      ? plan.weightMin
      : null;
}

function getMaxLoggedLoad(rows: ProgressionHistorySetRow[]) {
  const loads = getWorkRows(rows)
    .map((row) => typeof row.weight === "number" && Number.isFinite(row.weight) && row.weight > 0 ? row.weight : null)
    .filter((weight): weight is number => weight !== null);

  return loads.length > 0 ? Math.max(...loads) : null;
}

function classifyStatus(args: {
  candidate: ProgressionReviewCandidate;
  rejectionReason: ProgressionAuditRejectionReason | null;
  historySource?: ProgressionAuditHistorySource | null;
  plan: ProgressionTargetPlan;
  rows: ProgressionHistorySetRow[];
}): ProgressionStatusType {
  const reason = args.candidate.reason.toLowerCase();
  const targetLoad = getTargetLoad(args.plan);
  const maxLoggedLoad = getMaxLoggedLoad(args.rows);
  const hasAboveTargetLoad = targetLoad !== null && maxLoggedLoad !== null && maxLoggedLoad > targetLoad;

  if (args.historySource === "linked_same_fingerprint") {
    return "linked_same_target";
  }

  if (args.historySource === "global_exercise_context" || args.historySource === "blocked_duplicate_catalog_fallback") {
    return "global_history_context";
  }

  if (args.rejectionReason === "manual_method") {
    return "manual";
  }

  if (args.rejectionReason === "no_completed_history") {
    return args.historySource && args.historySource !== "none" ? "no_planned_row_history" : "no_history_anywhere";
  }

  if ((reason.includes("target-load") || args.rejectionReason === "incomplete_sets" || args.rejectionReason === "top_range_not_met") && hasAboveTargetLoad) {
    return "above_target_incomplete";
  }

  if (reason.includes("target-load")) {
    return "below_target_load";
  }

  if (args.rejectionReason === "top_range_not_met") {
    return "top_range_not_met";
  }

  if (args.rejectionReason === "incomplete_sets") {
    return "incomplete_sets";
  }

  if (args.rejectionReason === "unsupported_measurement" || args.rejectionReason === "stretch_or_hidden") {
    return "unsupported";
  }

  return "partial_progress";
}

function getStatusLabel(statusType: ProgressionStatusType) {
  switch (statusType) {
  case "above_target_incomplete":
    return "Above target, not ready";
  case "below_target_load":
    return "Below target load";
  case "no_planned_row_history":
    return "No history for this slot";
  case "no_history_anywhere":
    return "No history anywhere";
  case "linked_same_target":
    return "Same target elsewhere";
  case "global_history_context":
    return "History exists elsewhere";
  case "top_range_not_met":
    return "Not ready yet";
  case "incomplete_sets":
    return "Incomplete checked sets";
  case "manual":
    return "Manual target";
  case "unsupported":
    return "Not progression-tracked";
  case "partial_progress":
    return "Progress status";
  }
}

function getDetailLine(args: {
  statusType: ProgressionStatusType;
  plan: ProgressionTargetPlan;
  rows: ProgressionHistorySetRow[];
  linkedMatchCount?: number | null;
}) {
  const targetSets = resolveTargetSetCount(args.plan);
  const topRepTarget = resolveTopRepTarget(args.plan);
  const latestRows = getLatestSessionRows(args.rows);
  const workSetCount = latestRows.length;
  const hitCount = getTopRangeHitCount(args.rows, args.plan);
  const qualifiedTopRangeLoadCount = getQualifiedTopRangeLoadCount(args.rows, args.plan);

  switch (args.statusType) {
  case "above_target_incomplete":
    return targetSets
      ? `Result: ${qualifiedTopRangeLoadCount}/${targetSets} qualified at planned reps and load.`
      : "Result: above-target load logged, but not enough checked sets qualified.";
  case "below_target_load":
    return "Result: strong work logged below the current target load.";
  case "no_planned_row_history":
    return "Result: no completed work for this planned slot yet.";
  case "no_history_anywhere":
    return "Result: no completed work found for this exercise.";
  case "linked_same_target":
    return `Same target exists on ${Math.max(1, args.linkedMatchCount ?? 1)} routine days. Linked updates are display-only for now.`;
  case "global_history_context":
    return "Result: history exists outside this planned row. Context only.";
  case "top_range_not_met":
    return targetSets && topRepTarget
      ? `Result: ${hitCount}/${targetSets} sets hit the top range.`
      : "Result: logged work has not reached the top range yet.";
  case "incomplete_sets":
    return targetSets
      ? `Result: ${Math.min(workSetCount, targetSets)}/${targetSets} checked sets logged.`
      : "Result: more checked sets are needed before review.";
  case "manual":
    return "Result: manual targets do not create automatic updates.";
  case "unsupported":
    return "Result: this exercise does not use progression updates.";
  case "partial_progress":
    return "Result: logged work exists, but no update is ready yet.";
  }
}

function getTargetLine(plan: ProgressionTargetPlan) {
  const targetSets = resolveTargetSetCount(plan);
  const topRepTarget = resolveTopRepTarget(plan);
  const targetLabel = formatProgressionReviewTargetLabel(plan);

  if (plan.measurementType === "reps" && targetSets && topRepTarget) {
    const targetLoad = formatWeight(getTargetLoad(plan), plan.weightUnit);
    return `Needs: ${targetSets} sets at ${topRepTarget} reps${targetLoad ? ` · ${targetLoad}` : ""}`;
  }

  return targetLabel ? `Target: ${targetLabel}` : "Target: incomplete";
}

function formatRepRangeLabel(plan: ProgressionTargetPlan) {
  const min = typeof plan.repsMin === "number" && Number.isFinite(plan.repsMin) && plan.repsMin > 0 ? plan.repsMin : null;
  const max = typeof plan.repsMax === "number" && Number.isFinite(plan.repsMax) && plan.repsMax > 0 ? plan.repsMax : null;
  if (min === null && max === null) {
    return null;
  }

  const resolvedMin = min ?? max;
  const resolvedMax = max ?? min;
  if (resolvedMin === null || resolvedMax === null) {
    return null;
  }

  return resolvedMin === resolvedMax ? `${resolvedMax}` : `${resolvedMin}-${resolvedMax}`;
}

function resolveReadinessState(args: {
  candidate: ProgressionReviewCandidate;
  rejectionReason: ProgressionAuditRejectionReason | null;
}) : ProgressionStatusSurfaceState {
  if (args.candidate.qualificationWindow?.status === "unsupported") {
    return "insufficient_evidence";
  }

  if (args.candidate.type !== "none") {
    return "ready";
  }

  if (args.rejectionReason === "manual_method") {
    return "manual";
  }

  if (
    args.rejectionReason === "no_completed_history"
    || args.rejectionReason === "duplicate_catalog_exercise_requires_routine_day_exercise_id"
    || args.rejectionReason === "outside_review_window"
  ) {
    return "insufficient_evidence";
  }

  return "not_ready";
}

function getReadinessLabel(args: {
  readinessState: ProgressionStatusSurfaceState;
  statusType?: ProgressionStatusType;
}) {
  switch (args.readinessState) {
  case "ready":
    return "Ready";
  case "manual":
    return "Manual";
  case "insufficient_evidence":
    return "Insufficient evidence";
  case "not_ready":
    return args.statusType ? getStatusLabel(args.statusType) : "Not ready";
  }
}

function getPromotionConfig(selection: ProgressionPlaybookSelection | null): {
  promotionBasis: ProgressionPromotionBasis;
  repPromotionThreshold: RepPromotionThreshold;
  customRepPromotionTarget: number | null;
} | null {
  if (!selection) {
    return null;
  }

  return normalizeProgressionPromotionConfig({
    promotionBasis: selection.config.promotionBasis,
    repPromotionThreshold: selection.config.repPromotionThreshold,
    customRepPromotionTarget: selection.config.customRepPromotionTarget,
  });
}

function getRepTargetLine(args: {
  selection: ProgressionPlaybookSelection | null;
  plan: ProgressionTargetPlan;
}) {
  const promotionConfig = getPromotionConfig(args.selection);
  if (!promotionConfig || !usesRepsForPromotion(promotionConfig.promotionBasis)) {
    return null;
  }

  const repTarget = getRepPromotionTarget({
    minReps: args.plan.repsMin,
    maxReps: args.plan.repsMax,
    thresholdType: promotionConfig.repPromotionThreshold,
    customTarget: promotionConfig.customRepPromotionTarget,
  });
  if (!repTarget) {
    return `Rep target for promotion: ${formatRepPromotionThresholdLabel(promotionConfig.repPromotionThreshold)}`;
  }

  const repRange = formatRepRangeLabel(args.plan);
  const thresholdLabel = formatRepPromotionThresholdLabel(promotionConfig.repPromotionThreshold);
  return repRange
    ? `Rep target for promotion: ${thresholdLabel} · ${repRange} => ${repTarget}+ reps`
    : `Rep target for promotion: ${thresholdLabel} · ${repTarget}+ reps`;
}

function resolveStatusProgress(args: {
  plan: ProgressionTargetPlan;
  historyRows: ProgressionHistorySetRow[];
  rejectionReason: ProgressionAuditRejectionReason | null;
}) {
  if (args.rejectionReason === "manual_method") {
    return { percent: 0, state: "manual_hidden", label: "Manual" } satisfies ProgressionProgressFill;
  }

  if (args.rejectionReason === "invalid_config") {
    return { percent: 0, state: "unsupported", label: "Unsupported" } satisfies ProgressionProgressFill;
  }

  const rawProgress = deriveProgressionProgressPercent({
    plan: args.plan,
    historyRows: args.historyRows,
  });

  return rawProgress.percent >= 100 || rawProgress.state === "ready"
    ? {
        ...rawProgress,
        percent: Math.min(rawProgress.percent, NON_READY_PROGRESS_PERCENT_CAP),
        state: "partial" as const,
      }
    : rawProgress;
}

export function formatProgressionCalculationEvidence(args: {
  candidate: ProgressionReviewCandidate;
  rejectionReason: ProgressionAuditRejectionReason | null;
  historySource?: ProgressionAuditHistorySource | null;
  linkedMatchCount?: number | null;
  historyRows: ProgressionHistorySetRow[];
  plan: ProgressionTargetPlan;
}): ProgressionCalculationEvidence {
  const statusType = args.candidate.type === "none"
    ? classifyStatus({
      candidate: args.candidate,
      rejectionReason: args.rejectionReason,
      historySource: args.historySource,
      plan: args.plan,
      rows: args.historyRows,
    })
    : "partial_progress";

  return {
    usedLine: formatLatestLine(args.historyRows, args.plan.measurementType),
    needsLine: getTargetLine(args.plan),
    resultLine: args.candidate.qualificationWindow
      && (args.candidate.qualificationWindow.requiredQualifiedSessions > 1
        || args.candidate.qualificationWindow.status === "unsupported")
      ? `Result: ${args.candidate.qualificationWindow.summary}.`
      : args.candidate.type === "none"
        ? getDetailLine({
          statusType,
          plan: args.plan,
          rows: args.historyRows,
          linkedMatchCount: args.linkedMatchCount,
        })
        : "Result: ready update.",
  };
}

export function formatProgressionStatusDisplayItem(args: {
  id: string;
  exerciseName: string;
  dayName?: string | null;
  dayGroupId?: string | null;
  candidate: ProgressionReviewCandidate;
  rejectionReason: ProgressionAuditRejectionReason | null;
  historySource?: ProgressionAuditHistorySource | null;
  linkedMatchCount?: number | null;
  historyRows: ProgressionHistorySetRow[];
  plan: ProgressionTargetPlan;
}): ProgressionStatusDisplayItem | null {
  if (args.candidate.type !== "none") {
    return null;
  }

  const statusType = classifyStatus({
    candidate: args.candidate,
    rejectionReason: args.rejectionReason,
    historySource: args.historySource,
    plan: args.plan,
    rows: args.historyRows,
  });
  const evidence = formatProgressionCalculationEvidence({
    candidate: args.candidate,
    rejectionReason: args.rejectionReason,
    historySource: args.historySource,
    linkedMatchCount: args.linkedMatchCount,
    historyRows: args.historyRows,
    plan: args.plan,
  });
  const progress = resolveStatusProgress({
    plan: args.plan,
    historyRows: args.historyRows,
    rejectionReason: args.rejectionReason,
  });

  return {
    id: args.id,
    exerciseName: args.exerciseName,
    dayName: args.dayName ?? null,
    dayGroupId: args.dayGroupId ?? null,
    statusType,
    label: getStatusLabel(statusType),
    detailLine: evidence.resultLine,
    targetLine: evidence.needsLine,
    latestLine: evidence.usedLine,
    reason: args.candidate.reason,
    progress,
  };
}

export function buildProgressionStatusSurfaceItem(args: {
  id: string;
  exerciseName: string;
  dayName?: string | null;
  dayGroupId?: string | null;
  candidate: ProgressionReviewCandidate;
  rejectionReason: ProgressionAuditRejectionReason | null;
  historySource?: ProgressionAuditHistorySource | null;
  linkedMatchCount?: number | null;
  historyRows: ProgressionHistorySetRow[];
  plan: ProgressionTargetPlan;
  selection: ProgressionPlaybookSelection | null;
}): ProgressionStatusSurfaceItem {
  const statusItem = formatProgressionStatusDisplayItem({
    id: args.id,
    exerciseName: args.exerciseName,
    dayName: args.dayName,
    dayGroupId: args.dayGroupId,
    candidate: args.candidate,
    rejectionReason: args.rejectionReason,
    historySource: args.historySource,
    linkedMatchCount: args.linkedMatchCount,
    historyRows: args.historyRows,
    plan: args.plan,
  });
  const evidence = formatProgressionCalculationEvidence({
    candidate: args.candidate,
    rejectionReason: args.rejectionReason,
    historySource: args.historySource,
    linkedMatchCount: args.linkedMatchCount,
    historyRows: args.historyRows,
    plan: args.plan,
  });
  const readinessState = resolveReadinessState({
    candidate: args.candidate,
    rejectionReason: args.rejectionReason,
  });
  const currentTarget = formatProgressionReviewTargetLabel(args.plan);
  const promotionConfig = getPromotionConfig(args.selection);
  const statusType = statusItem?.statusType;
  const progress = args.candidate.type === "none"
    ? resolveStatusProgress({
      plan: args.plan,
      historyRows: args.historyRows,
      rejectionReason: args.rejectionReason,
    })
    : deriveProgressionProgressPercent({
        plan: args.plan,
        historyRows: args.candidate.sourceSession
          ? args.historyRows.filter((row) => row.sessionId === args.candidate.sourceSession?.sessionId)
          : args.historyRows,
        isReady: true,
      });

  return {
    id: args.id,
    exerciseName: args.exerciseName,
    dayName: args.dayName ?? null,
    dayGroupId: args.dayGroupId ?? null,
    readinessState,
    readinessLabel: getReadinessLabel({ readinessState, statusType }),
    currentTargetLine: currentTarget ? `Current target: ${currentTarget}` : "Current target: incomplete",
    promotionBasisLabel: promotionConfig ? formatPromotionBasisLabel(promotionConfig.promotionBasis) : null,
    promotionBasisDetail: promotionConfig ? describePromotionBasis(promotionConfig.promotionBasis) : null,
    repTargetLine: getRepTargetLine({
      selection: args.selection,
      plan: args.plan,
    }),
    latestLine: evidence.usedLine,
    targetLine: evidence.needsLine,
    detailLine: evidence.resultLine,
    nextUpdateLine: args.candidate.type !== "none" && args.candidate.proposedTarget
      ? `Next update: ${formatProgressionReviewTargetLabel(args.candidate.proposedTarget) ?? "Target change ready"}`
      : null,
    reason: args.candidate.reason,
    progress,
  };
}
