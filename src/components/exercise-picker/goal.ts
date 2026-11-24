import { type ExerciseGoalFormState, type RoutineEditorInfoPayload } from "@/components/ui/measurements/ExerciseGoalForm";
import { normalizeFitnessDistanceUnit, type FitnessDistanceUnit } from "@/lib/fitness-distance-units";
import { type ExerciseStatsOption } from "@/lib/exercise-picker-stats";
import { isMeasurementOptionalExercise } from "@/lib/exercise-metadata";
import { deriveGoalMeasurementSelections, getDefaultMeasurementsForGoalModality, resolveGoalModality, type GoalModality } from "@/lib/exercise-goal-validation";
import { isStretchHubExercise } from "@/lib/stretch-library";
import { formatLoggedMeasurementStat } from "./list";
import { type ExerciseOption } from "./types";
import { normalizeExerciseTags } from "./filter";

export function resolveExerciseDistanceUnit(defaultUnit: string | null | undefined, fallback: FitnessDistanceUnit = "mi") {
  return normalizeFitnessDistanceUnit(defaultUnit, fallback);
}

export function buildUseLastInfoPayload(args: {
  stats: ExerciseStatsOption;
  lastSummaryText: string;
  didApplyLast: boolean;
}): RoutineEditorInfoPayload {
  const usesCompletedHistory = Boolean(
    formatLoggedMeasurementStat(args.stats.lastWeight, args.stats.lastReps, args.stats.lastUnit),
  );
  const progressionMode = args.stats.lastProgressionPlaybookId ? "Progression saved" : "No progression saved";

  return {
    title: args.didApplyLast ? "Clear Last Setup" : "Use Last Setup",
    summary: args.didApplyLast
      ? "Clear removes the copied last setup and returns the exercise to a fresh starting draft."
      : "Use copies the most recent goal setup for this exercise into the current add flow.",
    rows: [
      { label: "Current action", value: args.didApplyLast ? "Clear copied setup" : "Apply last setup" },
      { label: "Source", value: usesCompletedHistory ? "Latest completed history" : "Latest saved routine setup" },
      { label: "Snapshot", value: args.lastSummaryText },
      { label: "Progression", value: progressionMode },
    ],
    sectionKey: null,
  };
}

export function applyConfiguredSetupToGoalState({
  current,
  stats,
  fallbackWeightUnit,
  fallbackDistanceUnit,
  modality,
}: {
  current: ExerciseGoalFormState;
  stats: ExerciseStatsOption;
  fallbackWeightUnit: "lbs" | "kg";
  fallbackDistanceUnit: FitnessDistanceUnit;
  modality: GoalModality;
}) {
  const hasFailureTarget = stats.lastConfiguredTargetRepsMin === 0 && stats.lastConfiguredTargetRepsMax === 0;
  const repsMin = !hasFailureTarget && typeof stats.lastConfiguredTargetRepsMin === "number" && stats.lastConfiguredTargetRepsMin > 0
    ? String(stats.lastConfiguredTargetRepsMin)
    : "";
  const repsMax = !hasFailureTarget
    ? (
      typeof stats.lastConfiguredTargetRepsMax === "number" && stats.lastConfiguredTargetRepsMax > 0
        ? String(stats.lastConfiguredTargetRepsMax)
        : repsMin
    )
    : "";
  const weight = typeof stats.lastConfiguredTargetWeight === "number" && Number.isFinite(stats.lastConfiguredTargetWeight)
    ? String(stats.lastConfiguredTargetWeight)
    : "";
  const duration = typeof stats.lastConfiguredTargetDurationSeconds === "number" && Number.isFinite(stats.lastConfiguredTargetDurationSeconds)
    ? String(stats.lastConfiguredTargetDurationSeconds)
    : "";
  const distance = typeof stats.lastConfiguredTargetDistance === "number" && Number.isFinite(stats.lastConfiguredTargetDistance)
    ? String(stats.lastConfiguredTargetDistance)
    : "";
  const calories = typeof stats.lastConfiguredTargetCalories === "number" && Number.isFinite(stats.lastConfiguredTargetCalories)
    ? String(stats.lastConfiguredTargetCalories)
    : "";

  return {
    ...current,
    sets: typeof stats.lastConfiguredTargetSets === "number" && Number.isFinite(stats.lastConfiguredTargetSets) && stats.lastConfiguredTargetSets > 0
      ? String(stats.lastConfiguredTargetSets)
      : current.sets,
    repsMin,
    repsMax,
    failure: hasFailureTarget,
    weight,
    duration,
    distance,
    calories,
    weightUnit: stats.lastConfiguredTargetWeightUnit === "kg" || stats.lastConfiguredTargetWeightUnit === "lbs"
      ? stats.lastConfiguredTargetWeightUnit
      : fallbackWeightUnit,
    distanceUnit: normalizeFitnessDistanceUnit(stats.lastConfiguredTargetDistanceUnit, fallbackDistanceUnit),
    measurements: deriveGoalMeasurementSelections(modality, {
      repsMin,
      repsMax,
      failure: hasFailureTarget,
      weight,
      duration,
      distance,
      calories,
    }),
  } satisfies ExerciseGoalFormState;
}

export function buildFreshGoalStateForExercise(args: {
  exercise: ExerciseOption | null | undefined;
  fallbackWeightUnit: "lbs" | "kg";
  customGoalModality?: GoalModality | null;
}) {
  const exercise = args.exercise;
  const isStretch = !exercise ? false : isStretchHubExercise(exercise);
  const isOptional = !exercise ? false : isMeasurementOptionalExercise(exercise);
  const modality = exercise
    ? (
      args.customGoalModality
      ?? resolveGoalModality({
        measurementType: exercise.measurement_type,
        equipment: exercise.equipment,
        name: exercise.name,
        tags: new Set(normalizeExerciseTags(exercise).keys()),
      })
    )
    : "strength";

  return {
    sets: isStretch ? "1" : "3",
    repsMin: "",
    repsMax: "",
    failure: false,
    weight: "",
    duration: "",
    distance: "",
    calories: "",
    weightUnit: args.fallbackWeightUnit,
    distanceUnit: resolveExerciseDistanceUnit(exercise?.default_unit),
    measurements: isOptional ? [] : getDefaultMeasurementsForGoalModality(modality),
  } satisfies ExerciseGoalFormState;
}

export function parseDurationInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const match = trimmed.match(/^(\d+):(\d{1,2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function hasAnyGoalMeasurementValue(state: ExerciseGoalFormState) {
  return [
    state.repsMin,
    state.repsMax,
    state.weight,
    state.duration,
    state.distance,
    state.calories,
  ].some((value) => value.trim().length > 0);
}
