import type { ProgressionReviewCandidate } from "@/lib/progression-playbooks";

export type ProgressionAuditHistorySource =
  | "routine_day_exercise_id"
  | "unique_catalog_exercise_id_fallback"
  | "blocked_duplicate_catalog_fallback"
  | "linked_same_fingerprint"
  | "global_exercise_context"
  | "none";

export type ProgressionAuditRejectionReason =
  | "manual_method"
  | "unsupported_measurement"
  | "no_completed_history"
  | "duplicate_catalog_exercise_requires_routine_day_exercise_id"
  | "incomplete_target"
  | "incomplete_sets"
  | "top_range_not_met"
  | "outside_review_window"
  | "already_applied"
  | "stretch_or_hidden"
  | "invalid_config";

export const PROGRESSION_AUDIT_REJECTION_LABELS: Record<ProgressionAuditRejectionReason, string> = {
  manual_method: "Manual method",
  unsupported_measurement: "Unsupported measurement",
  no_completed_history: "No completed history",
  duplicate_catalog_exercise_requires_routine_day_exercise_id: "Duplicate catalog exercise requires routine-day exercise history",
  incomplete_target: "Incomplete target",
  incomplete_sets: "Incomplete sets",
  top_range_not_met: "Top range not met",
  outside_review_window: "Outside review window",
  already_applied: "Already applied",
  stretch_or_hidden: "Stretch or hidden",
  invalid_config: "Invalid config",
};

export function formatProgressionAuditRejectionReason(reason: ProgressionAuditRejectionReason | null) {
  return reason ? PROGRESSION_AUDIT_REJECTION_LABELS[reason] : "Candidate ready";
}

function normalizeReasonText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function inferProgressionAuditRejectionReason(args: {
  candidate: ProgressionReviewCandidate;
  hasConfiguredPlaybook: boolean;
  hasValidSelection: boolean;
  historySource: ProgressionAuditHistorySource;
  completedSetCount: number;
  completedSessionCount: number;
  measurementType?: string | null;
  reviewWindowEnforced?: boolean;
  outsideReviewWindow?: boolean;
}): ProgressionAuditRejectionReason | null {
  if (args.candidate.type !== "none") {
    return null;
  }

  if (args.reviewWindowEnforced && args.outsideReviewWindow) {
    return "outside_review_window";
  }

  if (args.measurementType === "none") {
    return "stretch_or_hidden";
  }

  if (args.historySource === "blocked_duplicate_catalog_fallback") {
    return "duplicate_catalog_exercise_requires_routine_day_exercise_id";
  }

  if (!args.hasConfiguredPlaybook) {
    return "manual_method";
  }

  if (!args.hasValidSelection) {
    return "invalid_config";
  }

  if (args.completedSetCount <= 0 || args.completedSessionCount <= 0 || args.historySource === "none") {
    return "no_completed_history";
  }

  const reason = normalizeReasonText(args.candidate.reason);

  if (reason.includes("already applied")) {
    return "already_applied";
  }

  if (reason.includes("incomplete") || reason.includes("no routine target")) {
    return "incomplete_target";
  }

  if (reason.includes("target-load") || reason.includes("complete") && reason.includes("work sets")) {
    return "incomplete_sets";
  }

  if (reason.includes("range is not complete")) {
    return "top_range_not_met";
  }

  if (reason.includes("does not support") || reason.includes("not available") || reason.includes("unsupported")) {
    return "unsupported_measurement";
  }

  return "unsupported_measurement";
}
