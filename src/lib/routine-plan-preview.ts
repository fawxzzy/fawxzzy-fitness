import { normalizeDecoratedText } from "@/lib/text-separator-normalization";
import { isFailureGoalSelection } from "@/lib/exercise-goal-validation";
import { formatGoalSummaryItems } from "@/lib/measurement-display";

type PreviewExerciseSource = {
  id: string;
  displayName: string;
  goalLine: string | null;
  target_sets?: number | null;
  target_reps?: number | null;
  target_reps_min?: number | null;
  target_reps_max?: number | null;
  target_weight?: number | null;
  target_weight_unit?: string | null;
  target_duration_seconds?: number | null;
  target_distance?: number | null;
  target_distance_unit?: string | null;
  target_calories?: number | null;
  progression_playbook_id?: string | null;
  progression_playbook_config?: Record<string, unknown> | null;
  measurement_type?: "reps" | "time" | "distance" | "time_distance" | "none" | null;
  default_unit?: string | null;
  details: {
    slug?: string | null;
    primary_muscle?: string | null;
    equipment?: string | null;
    movement_pattern?: string | null;
  } | null;
};

export function isRoutinePlanPreviewStretchExercise(exercise: {
  displayName?: string | null;
  details?: {
    slug?: string | null;
    primary_muscle?: string | null;
  } | null;
}) {
  const normalizedSlug = exercise.details?.slug?.trim().toLowerCase() ?? "";
  if (normalizedSlug === "stretch") {
    return true;
  }

  const normalizedName = exercise.displayName?.trim().toLowerCase() ?? "";
  if (normalizedName === "stretch") {
    return true;
  }

  return exercise.details?.primary_muscle?.trim().toLowerCase() === "recovery"
    && normalizedName.includes("stretch");
}

function getRoutinePlanPreviewSourceExercises(exercises: PreviewExerciseSource[]) {
  const nonStretchExercises = exercises.filter((exercise) => !isRoutinePlanPreviewStretchExercise(exercise));
  return nonStretchExercises.length > 0 ? nonStretchExercises : exercises;
}

function buildRoutinePlanProgressionStateLabel(exercise: PreviewExerciseSource) {
  const hasAutoProgression = Boolean(exercise.progression_playbook_id);
  const stateLabels = [hasAutoProgression ? "AUTO" : "MANUAL"];

  if (hasAutoProgression) {
    const config = exercise.progression_playbook_config;
    if (config?.sessionSettingsEnabled !== false) {
      stateLabels.push("SESSION");
    }
    if (config?.setSettingsEnabled !== false) {
      stateLabels.push("SET");
    }
  }

  return normalizeDecoratedText(stateLabels.join(" • "));
}

function formatMetadataLabel(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function buildRoutinePlanRecapSignatureLabel(exercise: PreviewExerciseSource) {
  const parts = [
    formatMetadataLabel(exercise.details?.primary_muscle),
    formatMetadataLabel(exercise.details?.movement_pattern),
    formatMetadataLabel(exercise.details?.equipment),
  ].filter((value): value is string => Boolean(value));

  return parts.length > 0 ? normalizeDecoratedText(parts.join(" | ")) : null;
}

export function selectRoutinePlanPreviewExercises(exercises: PreviewExerciseSource[]) {
  const sourceExercises = getRoutinePlanPreviewSourceExercises(exercises);

  return sourceExercises.slice(0, 2).map((exercise) => ({
    id: exercise.id,
    name: exercise.displayName,
    goalLine: exercise.goalLine ? normalizeDecoratedText(exercise.goalLine) : null,
  }));
}

export function buildRoutinePlanRecapExercises(exercises: PreviewExerciseSource[]) {
  return getRoutinePlanPreviewSourceExercises(exercises).map((exercise) => {
    const repsMin = exercise.target_reps_min ?? exercise.target_reps ?? null;
    const repsMax = exercise.target_reps_max ?? exercise.target_reps ?? null;
    const goalItems = formatGoalSummaryItems({
      sets: exercise.target_sets ?? null,
      reps: repsMin,
      repsMax,
      failure: isFailureGoalSelection({
        repsMin,
        repsMax,
      }),
      weight: exercise.target_weight ?? null,
      weightUnit: exercise.target_weight_unit ?? "lbs",
      durationSeconds: exercise.target_duration_seconds ?? null,
      distance: exercise.target_distance ?? null,
      distanceUnit: exercise.target_distance_unit ?? "mi",
      calories: exercise.target_calories ?? null,
      emptyLabel: "Goal missing",
    }).map((item) => ({
      metric: item.metric,
      label: normalizeDecoratedText(item.label),
    }));

    const setLabel = goalItems.find((item) => item.metric === "sets")?.label ?? null;
    const targetLabels = goalItems
      .filter((item) => item.metric !== "sets")
      .map((item) => item.label)
      .filter(Boolean);
    const progressionStateLabel = buildRoutinePlanProgressionStateLabel(exercise);
    const hasGoalSummaryContent = Boolean(setLabel) || targetLabels.length > 0;
    const decoratedTargetLabel = targetLabels.length > 0
      ? normalizeDecoratedText([...(setLabel ? [setLabel] : []), ...targetLabels].join(" • "))
      : setLabel;

    return {
      id: exercise.id,
      name: exercise.displayName,
      goalLine: exercise.goalLine ? normalizeDecoratedText(exercise.goalLine) : null,
      progressionStateLabel,
      signatureLabel: buildRoutinePlanRecapSignatureLabel(exercise),
      setLabel: progressionStateLabel,
      targetLabel: decoratedTargetLabel
        ? decoratedTargetLabel
        : hasGoalSummaryContent
          ? null
          : (exercise.goalLine ? normalizeDecoratedText(exercise.goalLine) : "Goal missing"),
    };
  });
}
