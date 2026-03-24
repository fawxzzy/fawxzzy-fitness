export type SessionExerciseProgressKind = "neutral" | "partial" | "skipped" | "completed";

export type SessionExerciseProgressInput = {
  loggedSetCount: number;
  isSkipped: boolean;
  targetSetsMin?: number | null;
  targetSetsMax?: number | null;
};

export type SessionExerciseProgressState = {
  kind: SessionExerciseProgressKind;
  isGoalCompleted: boolean;
  loggedSetCount: number;
  goalSetTarget: number | null;
  cardState: "default" | "completed";
  badgeText?: string;
};

function resolveGoalSetTarget(input: SessionExerciseProgressInput): number | null {
  const min = input.targetSetsMin;
  const max = input.targetSetsMax;
  if (Number.isFinite(min) && (min as number) > 0) {
    return Math.floor(min as number);
  }
  if (Number.isFinite(max) && (max as number) > 0) {
    return Math.floor(max as number);
  }
  return null;
}

export function deriveSessionExerciseProgressState(input: SessionExerciseProgressInput): SessionExerciseProgressState {
  const loggedSetCount = Number.isFinite(input.loggedSetCount) ? Math.max(0, Math.floor(input.loggedSetCount)) : 0;

  if (input.isSkipped) {
    return {
      kind: "skipped",
      isGoalCompleted: false,
      loggedSetCount,
      goalSetTarget: resolveGoalSetTarget(input),
      cardState: "default",
      badgeText: loggedSetCount > 0 ? `${loggedSetCount} logged` : undefined,
    };
  }

  const goalSetTarget = resolveGoalSetTarget(input);
  const isGoalCompleted = goalSetTarget !== null && loggedSetCount >= goalSetTarget;

  if (isGoalCompleted) {
    return {
      kind: "completed",
      isGoalCompleted: true,
      loggedSetCount,
      goalSetTarget,
      cardState: "completed",
      badgeText: `${loggedSetCount} logged`,
    };
  }

  return {
    kind: loggedSetCount > 0 ? "partial" : "neutral",
    isGoalCompleted: false,
    loggedSetCount,
    goalSetTarget,
    cardState: "default",
    badgeText: loggedSetCount > 0 ? `${loggedSetCount} logged` : undefined,
  };
}
