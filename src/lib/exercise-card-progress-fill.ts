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
