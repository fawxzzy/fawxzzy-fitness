import type { RoutineDayExerciseRow } from "@/types/db";

type GoalFields = Pick<
  RoutineDayExerciseRow,
  | "target_sets"
  | "target_reps"
  | "target_reps_min"
  | "target_reps_max"
  | "target_weight"
  | "target_weight_unit"
  | "target_duration_seconds"
  | "target_distance"
  | "target_distance_unit"
  | "target_calories"
>;

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const secondsPart = seconds % 60;
  return `${minutes}:${String(secondsPart).padStart(2, "0")}`;
}

function formatRepRange(goal: GoalFields) {
  const minReps = goal.target_reps_min ?? goal.target_reps ?? null;
  const maxReps = goal.target_reps_max ?? goal.target_reps ?? null;

  if (minReps !== null && maxReps !== null) {
    return minReps === maxReps ? `${minReps} reps` : `${minReps}–${maxReps} reps`;
  }

  if (minReps !== null) {
    return `${minReps} reps`;
  }

  if (maxReps !== null) {
    return `${maxReps} reps`;
  }

  return null;
}

export function formatExerciseGoal(goal: GoalFields) {
  const parts: string[] = [];

  const repRange = formatRepRange(goal);
  if (goal.target_sets !== null && repRange) {
    parts.push(`${goal.target_sets} sets × ${repRange}`);
  } else if (goal.target_sets !== null) {
    parts.push(`${goal.target_sets} sets`);
  } else if (repRange) {
    parts.push(repRange);
  }

  if (goal.target_weight !== null) {
    parts.push(`target ${goal.target_weight} ${goal.target_weight_unit ?? "lbs"}`);
  }

  if (goal.target_duration_seconds !== null) {
    parts.push(`time ${formatClock(goal.target_duration_seconds)}`);
  }

  if (goal.target_distance !== null) {
    parts.push(`distance ${goal.target_distance} ${goal.target_distance_unit ?? "mi"}`);
  }

  if (goal.target_calories !== null) {
    parts.push(`calories ${goal.target_calories}`);
  }

  if (parts.length === 0) {
    return "Goal: Not set";
  }

  return `Goal: ${parts.join(" — ")}`;
}
