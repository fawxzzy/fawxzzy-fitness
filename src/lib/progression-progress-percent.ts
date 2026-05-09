import { formatDurationClock } from "@/lib/duration";
import { formatDistance } from "@/lib/exercise-stats-formatting";
import type { ProgressionHistorySetRow, ProgressionMeasurementType, ProgressionTargetPlan } from "@/lib/progression-playbooks";

export type ProgressionProgressFillState =
  | "none"
  | "no_history"
  | "partial"
  | "ready"
  | "manual_hidden"
  | "unsupported";

export type ProgressionProgressFill = {
  percent: number;
  state: ProgressionProgressFillState;
  label: string;
};

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

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

function resolveTargetSetCount(plan: ProgressionTargetPlan) {
  return typeof plan.setsMax === "number" && plan.setsMax > 0
    ? plan.setsMax
    : typeof plan.setsMin === "number" && plan.setsMin > 0
      ? plan.setsMin
      : null;
}

function resolveRepTarget(plan: ProgressionTargetPlan) {
  if (typeof plan.repsTarget === "number" && Number.isFinite(plan.repsTarget) && plan.repsTarget > 0) {
    return plan.repsTarget;
  }

  return typeof plan.repsMax === "number" && plan.repsMax > 0
    ? plan.repsMax
    : typeof plan.repsMin === "number" && plan.repsMin > 0
      ? plan.repsMin
      : null;
}

function resolveTargetLoad(plan: ProgressionTargetPlan) {
  return typeof plan.weightMax === "number" && plan.weightMax > 0
    ? plan.weightMax
    : typeof plan.weightMin === "number" && plan.weightMin > 0
      ? plan.weightMin
      : null;
}

function getBestDurationSeconds(rows: ProgressionHistorySetRow[]) {
  return Math.max(0, ...getWorkRows(rows).map((row) => row.durationSeconds ?? 0));
}

function getBestDistance(rows: ProgressionHistorySetRow[]) {
  return Math.max(0, ...getWorkRows(rows).map((row) => row.distance ?? 0));
}

function deriveRepsProgress(args: {
  plan: ProgressionTargetPlan;
  historyRows: ProgressionHistorySetRow[];
}): ProgressionProgressFill {
  const targetSets = resolveTargetSetCount(args.plan);
  const repTarget = resolveRepTarget(args.plan);
  const targetLoad = resolveTargetLoad(args.plan);
  const latestRows = getLatestSessionRows(args.historyRows);

  if (latestRows.length === 0) {
    return { percent: 0, state: "no_history", label: "No history" };
  }

  if (!targetSets || !repTarget) {
    return { percent: 0, state: "unsupported", label: "Unsupported" };
  }

  const qualifiedSets = latestRows.filter((row) => {
    const repsQualified = (row.reps ?? 0) >= repTarget;
    const loadQualified = targetLoad === null || (row.weight ?? 0) >= targetLoad;
    return repsQualified && loadQualified;
  }).length;
  const cappedQualifiedSets = Math.min(qualifiedSets, targetSets);
  const percent = clampPercent((cappedQualifiedSets / targetSets) * 100);

  return {
    percent,
    state: percent >= 100 ? "ready" : "partial",
    label: `${cappedQualifiedSets}/${targetSets} sets`,
  };
}

function deriveDurationProgress(args: {
  plan: ProgressionTargetPlan;
  historyRows: ProgressionHistorySetRow[];
}): ProgressionProgressFill {
  const targetDuration = args.plan.durationSeconds ?? null;
  const bestDuration = getBestDurationSeconds(args.historyRows);

  if (getWorkRows(args.historyRows).length === 0) {
    return { percent: 0, state: "no_history", label: "No history" };
  }

  if (!targetDuration || targetDuration <= 0) {
    return { percent: 0, state: "unsupported", label: "Unsupported" };
  }

  const percent = clampPercent((bestDuration / targetDuration) * 100);
  return {
    percent,
    state: percent >= 100 ? "ready" : "partial",
    label: `${formatDurationClock(bestDuration)} / ${formatDurationClock(targetDuration)}`,
  };
}

function deriveDistanceProgress(args: {
  plan: ProgressionTargetPlan;
  historyRows: ProgressionHistorySetRow[];
}): ProgressionProgressFill {
  const targetDistance = args.plan.distance ?? null;
  const bestDistance = getBestDistance(args.historyRows);

  if (getWorkRows(args.historyRows).length === 0) {
    return { percent: 0, state: "no_history", label: "No history" };
  }

  if (!targetDistance || targetDistance <= 0) {
    return { percent: 0, state: "unsupported", label: "Unsupported" };
  }

  const percent = clampPercent((bestDistance / targetDistance) * 100);
  return {
    percent,
    state: percent >= 100 ? "ready" : "partial",
    label: `${formatDistance(bestDistance, args.plan.distanceUnit ?? null)} / ${formatDistance(targetDistance, args.plan.distanceUnit ?? null)}`,
  };
}

function deriveMetricProgress(args: {
  measurementType: ProgressionMeasurementType;
  plan: ProgressionTargetPlan;
  historyRows: ProgressionHistorySetRow[];
}) {
  if (args.measurementType === "time_distance") {
    return typeof args.plan.distance === "number" && args.plan.distance > 0
      ? deriveDistanceProgress(args)
      : deriveDurationProgress(args);
  }

  if (args.measurementType === "time") {
    return deriveDurationProgress(args);
  }

  if (args.measurementType === "distance") {
    return deriveDistanceProgress(args);
  }

  return { percent: 0, state: "unsupported", label: "Unsupported" } satisfies ProgressionProgressFill;
}

export function deriveProgressionProgressPercent(args: {
  plan: ProgressionTargetPlan | null;
  historyRows?: ProgressionHistorySetRow[];
  isReady?: boolean;
}): ProgressionProgressFill {
  if (args.isReady) {
    return { percent: 100, state: "ready", label: "Ready" };
  }

  if (!args.plan) {
    return { percent: 0, state: "unsupported", label: "Unsupported" };
  }

  const historyRows = args.historyRows ?? [];

  if (args.plan.measurementType === "none") {
    return { percent: 0, state: "manual_hidden", label: "Manual" };
  }

  if (args.plan.measurementType === "reps") {
    return deriveRepsProgress({ plan: args.plan, historyRows });
  }

  return deriveMetricProgress({
    measurementType: args.plan.measurementType,
    plan: args.plan,
    historyRows,
  });
}
