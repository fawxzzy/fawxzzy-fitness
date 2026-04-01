export type ExerciseExecutionState =
  | "not_started"
  | "in_progress"
  | "completed"
  | "skipped_before_start"
  | "partially_completed"
  | "completed_then_remaining_skipped";

export type SessionExerciseProgressKind = "untouched" | "partial" | "partialSkipped" | "skipped" | "completed";
export type SessionExercisePresentationSurface = "active" | "summary";
export type SessionExerciseProgressChip = "skipped" | "endedEarly" | "loggedProgress";

export type SessionExerciseProgressInput = {
  loggedSetCount: number;
  isSkipped: boolean;
  targetSetsMin?: number | null;
  targetSetsMax?: number | null;
  isPending?: boolean;
};

export type SessionExerciseProgressState = {
  kind: SessionExerciseProgressKind;
  executionState: ExerciseExecutionState;
  isGoalCompleted: boolean;
  loggedSetCount: number;
  goalSetTarget: number | null;
  cardState: "default" | "completed";
  badgeText?: string;
  chips: SessionExerciseProgressChip[];
  progressLabel?: string;
  skipActionLabel: "Skip" | "Unskip";
  allowQuickLog: boolean;
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

function getExecutionState(input: { loggedSetCount: number; isSkipped: boolean; isGoalCompleted: boolean }): ExerciseExecutionState {
  if (input.isSkipped && input.loggedSetCount === 0) return "skipped_before_start";
  if (input.isSkipped && input.loggedSetCount > 0) return input.isGoalCompleted ? "completed_then_remaining_skipped" : "partially_completed";
  if (input.loggedSetCount === 0) return "not_started";
  return input.isGoalCompleted ? "completed" : "in_progress";
}

function formatLoggedProgress(loggedSetCount: number, goalSetTarget: number | null) {
  if (goalSetTarget !== null) {
    return `${loggedSetCount} of ${goalSetTarget} logged`;
  }
  return `${loggedSetCount} logged`;
}

export function deriveSessionExerciseProgressState(input: SessionExerciseProgressInput & { surface?: SessionExercisePresentationSurface }): SessionExerciseProgressState {
  const loggedSetCount = Number.isFinite(input.loggedSetCount) ? Math.max(0, Math.floor(input.loggedSetCount)) : 0;
  const goalSetTarget = resolveGoalSetTarget(input);
  const isGoalCompleted = goalSetTarget !== null && loggedSetCount >= goalSetTarget;
  const executionState = getExecutionState({ loggedSetCount, isSkipped: input.isSkipped, isGoalCompleted });
  const surface = input.surface ?? "active";

  switch (executionState) {
    case "not_started":
      return {
        kind: "untouched",
        executionState,
        isGoalCompleted: false,
        loggedSetCount,
        goalSetTarget,
        cardState: "default",
        chips: [],
        skipActionLabel: "Skip",
        allowQuickLog: true,
      };
    case "in_progress":
      return {
        kind: "partial",
        executionState,
        isGoalCompleted: false,
        loggedSetCount,
        goalSetTarget,
        cardState: "default",
        badgeText: formatLoggedProgress(loggedSetCount, goalSetTarget),
        chips: [],
        progressLabel: formatLoggedProgress(loggedSetCount, goalSetTarget),
        skipActionLabel: "Skip",
        allowQuickLog: true,
      };
    case "completed":
      return {
        kind: "completed",
        executionState,
        isGoalCompleted: true,
        loggedSetCount,
        goalSetTarget,
        cardState: "completed",
        badgeText: "Completed",
        chips: [],
        skipActionLabel: "Skip",
        allowQuickLog: true,
      };
    case "skipped_before_start":
      return {
        kind: "skipped",
        executionState,
        isGoalCompleted: false,
        loggedSetCount,
        goalSetTarget,
        cardState: "default",
        badgeText: surface === "summary" ? "Skipped" : undefined,
        chips: surface === "summary" ? [] : ["skipped"],
        skipActionLabel: "Unskip",
        allowQuickLog: false,
      };
    case "partially_completed":
      return {
        kind: "partialSkipped",
        executionState,
        isGoalCompleted: false,
        loggedSetCount,
        goalSetTarget,
        cardState: "default",
        badgeText: "Partial",
        chips: ["loggedProgress", "endedEarly"],
        progressLabel: formatLoggedProgress(loggedSetCount, goalSetTarget),
        skipActionLabel: "Unskip",
        allowQuickLog: false,
      };
    case "completed_then_remaining_skipped":
      return {
        kind: "partialSkipped",
        executionState,
        isGoalCompleted: true,
        loggedSetCount,
        goalSetTarget,
        cardState: "completed",
        badgeText: "Completed",
        chips: ["loggedProgress", "endedEarly"],
        progressLabel: formatLoggedProgress(loggedSetCount, goalSetTarget),
        skipActionLabel: "Unskip",
        allowQuickLog: false,
      };
  }
}
