import type { ProgressionProgressFill } from "@/lib/progression-progress-percent";
import type { ProgressionReviewDisplayItem } from "@/lib/progression-review-display";

export type ExerciseCardProgressFillState =
  | "none"
  | "partial"
  | "ready"
  | "stale"
  | "deload";

export type ExerciseCardProgressFillModel = {
  progressPercent: number;
  state: ExerciseCardProgressFillState;
  label: string | null;
  fill: ProgressionProgressFill | null;
};

export function deriveLoggedSetCountProgressFill(args: {
  loggedSetCount: number;
  goalSetTarget?: number | null;
}): ProgressionProgressFill | null {
  const goalSetTarget = Number.isFinite(args.goalSetTarget)
    ? Math.max(0, Math.floor(args.goalSetTarget as number))
    : 0;

  if (goalSetTarget <= 0) {
    return null;
  }

  const loggedSetCount = Number.isFinite(args.loggedSetCount)
    ? Math.max(0, Math.floor(args.loggedSetCount))
    : 0;
  const cappedLoggedSetCount = Math.min(loggedSetCount, goalSetTarget);
  const percent = Math.max(0, Math.min(100, Math.round((cappedLoggedSetCount / goalSetTarget) * 100)));

  if (percent <= 0) {
    return null;
  }

  return {
    percent,
    state: percent >= 100 ? "ready" : "partial",
    label: `${cappedLoggedSetCount}/${goalSetTarget} sets`,
  };
}

export function deriveExerciseCardProgressFill(args: {
  progressFill?: ProgressionProgressFill | null;
  candidateType?: ProgressionReviewDisplayItem["type"] | null;
}): ExerciseCardProgressFillModel {
  const sourceFill = args.progressFill ?? null;
  if (!sourceFill) {
    return {
      progressPercent: 0,
      state: "none",
      label: null,
      fill: null,
    };
  }

  const normalizedPercent = Number.isFinite(sourceFill.percent)
    ? Math.max(0, Math.min(100, Math.round(sourceFill.percent)))
    : 0;

  if (
    normalizedPercent <= 0
    || sourceFill.state === "manual_hidden"
    || sourceFill.state === "unsupported"
    || sourceFill.state === "no_history"
    || sourceFill.state === "none"
  ) {
    return {
      progressPercent: 0,
      state: "none",
      label: sourceFill.label || null,
      fill: null,
    };
  }

  if (normalizedPercent >= 100 || sourceFill.state === "ready") {
    const state = args.candidateType === "deload"
      ? "deload"
      : args.candidateType === "review"
        ? "stale"
        : "ready";

    return {
      progressPercent: 100,
      state,
      label: sourceFill.label || null,
      fill: {
        ...sourceFill,
        percent: 100,
        state: "ready",
      },
    };
  }

  return {
    progressPercent: normalizedPercent,
    state: "partial",
    label: sourceFill.label || null,
    fill: {
      ...sourceFill,
      percent: normalizedPercent,
      state: "partial",
    },
  };
}
