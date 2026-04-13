import type { ExerciseGoalFormState } from "@/components/ui/measurements/ExerciseGoalForm";
import { deriveGoalMeasurementSelections, type GoalModality } from "@/lib/exercise-goal-validation";

export type EditDayExerciseDefaults = {
  targetSets?: number | null;
  targetReps?: number | null;
  targetRepsMin?: number | null;
  targetRepsMax?: number | null;
  targetWeight?: number | null;
  targetWeightUnit?: "lbs" | "kg" | null;
  targetDurationSeconds?: number | null;
  targetDistance?: number | null;
  targetDistanceUnit?: "mi" | "km" | "m" | null;
  targetCalories?: number | null;
};

export type EditDayExerciseDraft = {
  goalState: ExerciseGoalFormState;
  manualOrder: string;
  modality: GoalModality;
};

function formatDuration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined) return "";
  if (seconds < 60) return String(seconds);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function parseOptionalNumber(rawValue: string) {
  const trimmed = rawValue.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDurationInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const match = trimmed.match(/^(\d+):(\d{1,2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function clampOrderValue(rawValue: number, listLength: number) {
  if (!Number.isFinite(rawValue)) return 1;
  const normalized = Math.trunc(rawValue);
  if (normalized < 1) return 1;
  if (normalized > listLength) return listLength;
  return normalized;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function formatDurationClock(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  }

  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function formatSetCountLabel(count: number | null) {
  if (!Number.isFinite(count) || (count ?? 0) <= 0) return null;
  const normalizedCount = Math.floor(count as number);
  return `${normalizedCount} set${normalizedCount === 1 ? "" : "s"}`;
}

function formatRepRange(reps: number | null, repsMax: number | null) {
  if (!Number.isFinite(reps) || (reps ?? 0) < 0) return null;
  const minReps = Math.floor(reps as number);
  if (Number.isFinite(repsMax) && (repsMax ?? 0) >= 0) {
    const maxReps = Math.floor(repsMax as number);
    return minReps === maxReps ? `${minReps} reps` : `${minReps}\u2013${maxReps} reps`;
  }
  return `${minReps} reps`;
}

function formatDraftSummary(values: {
  sets: number | null;
  reps: number | null;
  repsMax: number | null;
  weight: number | null;
  weightUnit: "lbs" | "kg";
  durationSeconds: number | null;
  distance: number | null;
  distanceUnit: "mi" | "km" | "m";
  calories: number | null;
}) {
  const parts = [
    formatSetCountLabel(values.sets),
    formatRepRange(values.reps, values.repsMax),
    Number.isFinite(values.weight) && (values.weight ?? 0) >= 0 ? `${formatNumber(values.weight as number)} ${values.weightUnit}` : null,
    Number.isFinite(values.durationSeconds) && (values.durationSeconds ?? 0) >= 0
      ? formatDurationClock(values.durationSeconds as number)
      : null,
    Number.isFinite(values.distance) && (values.distance ?? 0) >= 0 ? `${formatNumber(values.distance as number)} ${values.distanceUnit}` : null,
    Number.isFinite(values.calories) && (values.calories ?? 0) >= 0 ? `${formatNumber(values.calories as number)} cal` : null,
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(" \u2022 ") : "Goal missing";
}

export function createEditDayExerciseDraft({
  defaults,
  distanceUnit,
  weightUnit,
  orderNumber,
  modality,
}: {
  defaults: EditDayExerciseDefaults;
  distanceUnit: "mi" | "km" | "m";
  weightUnit: "lbs" | "kg";
  orderNumber: number;
  modality: GoalModality;
}): EditDayExerciseDraft {
  return {
    goalState: {
      sets: String(defaults.targetSets ?? 1),
      repsMin: String(defaults.targetRepsMin ?? defaults.targetReps ?? ""),
      repsMax: String(defaults.targetRepsMax ?? ""),
      weight: String(defaults.targetWeight ?? ""),
      duration: formatDuration(defaults.targetDurationSeconds),
      distance: String(defaults.targetDistance ?? ""),
      calories: String(defaults.targetCalories ?? ""),
      weightUnit: defaults.targetWeightUnit ?? weightUnit,
      distanceUnit: defaults.targetDistanceUnit ?? distanceUnit,
      measurements: [
        ...(defaults.targetRepsMin != null || defaults.targetRepsMax != null || defaults.targetReps != null ? ["reps" as const] : []),
        ...(defaults.targetWeight != null ? ["weight" as const] : []),
        ...(defaults.targetDurationSeconds != null ? ["time" as const] : []),
        ...(defaults.targetDistance != null ? ["distance" as const] : []),
        ...(defaults.targetCalories != null ? ["calories" as const] : []),
      ],
    },
    manualOrder: String(orderNumber),
    modality,
  };
}

export function formatEditDayExerciseDraftSummary(draft: EditDayExerciseDraft) {
  const measurementSelections = new Set(deriveGoalMeasurementSelections(draft.modality, {
    repsMin: draft.goalState.repsMin,
    weight: draft.goalState.weight,
    duration: draft.goalState.duration,
    distance: draft.goalState.distance,
    calories: draft.goalState.calories,
  }));

  return formatDraftSummary({
    sets: parseOptionalNumber(draft.goalState.sets),
    reps: measurementSelections.has("reps") ? parseOptionalNumber(draft.goalState.repsMin) : null,
    repsMax: measurementSelections.has("reps") ? parseOptionalNumber(draft.goalState.repsMax) : null,
    weight: measurementSelections.has("weight") ? parseOptionalNumber(draft.goalState.weight) : null,
    durationSeconds: measurementSelections.has("time") ? parseDurationInput(draft.goalState.duration) : null,
    distance: measurementSelections.has("distance") ? parseOptionalNumber(draft.goalState.distance) : null,
    calories: measurementSelections.has("calories") ? parseOptionalNumber(draft.goalState.calories) : null,
    weightUnit: draft.goalState.weightUnit,
    distanceUnit: draft.goalState.distanceUnit,
  });
}

export function resolveEditDayExercisePreview({
  savedSummary,
  savedOrderNumber,
  draft,
  listLength,
}: {
  savedSummary: string;
  savedOrderNumber: number;
  draft?: EditDayExerciseDraft | null;
  listLength: number;
}) {
  if (!draft) {
    return {
      summary: savedSummary,
      orderNumber: savedOrderNumber,
    };
  }

  const parsedOrder = parseOptionalNumber(draft.manualOrder);

  return {
    summary: formatEditDayExerciseDraftSummary(draft),
    orderNumber: parsedOrder === null ? savedOrderNumber : clampOrderValue(parsedOrder, listLength),
  };
}
