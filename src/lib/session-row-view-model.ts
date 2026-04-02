import { deriveSessionRowState, type SessionRowState } from "./session-row-state";
import type { SessionQuickLogTarget } from "./session-quick-log";

type SessionRowBaseInput = {
  exerciseId: string;
  loggedSetCount: number;
  isSkipped: boolean;
  isQuickLogPending: boolean;
  isSkipPending: boolean;
  targetSetsMin?: number | null;
  targetSetsMax?: number | null;
  quickLogTarget?: SessionQuickLogTarget;
  fallbackWeightUnit: "lbs" | "kg";
};

export type SessionExerciseRowViewModel = SessionRowBaseInput & {
  rowState: SessionRowState;
};

export function deriveSessionExerciseRowViewModel(input: SessionRowBaseInput): SessionExerciseRowViewModel {
  const rowState = deriveSessionRowState({
    loggedSetCount: input.loggedSetCount,
    isSkipped: input.isSkipped,
    isPending: input.isQuickLogPending || input.isSkipPending,
    targetSetsMin: input.targetSetsMin,
    targetSetsMax: input.targetSetsMax,
    quickLogTarget: input.quickLogTarget,
    fallbackWeightUnit: input.fallbackWeightUnit,
  });

  return {
    ...input,
    rowState,
  };
}
