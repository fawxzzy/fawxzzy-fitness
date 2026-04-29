import { isBodyweightExercise, normalizeExerciseMeasurementType } from "@/lib/exercise-metadata";

export type MeasurementSelection = "reps" | "weight" | "time" | "distance" | "calories";

export type GoalModality = "strength" | "bodyweight" | "cardio_time" | "cardio_distance" | "cardio_time_distance";

export const GOAL_MEASUREMENT_FIELDS: MeasurementSelection[] = ["reps", "weight", "time", "distance", "calories"];

export type GoalValidationInput = {
  modality: GoalModality;
  sets: string;
  repsMin: string;
  repsMax: string;
  weight: string;
  duration: string;
  distance: string;
  calories: string;
  measurementSelections: Set<MeasurementSelection>;
};

type GoalMeasurementValueInputs = {
  repsMin: string;
  repsMax?: string;
  weight: string;
  duration: string;
  distance: string;
  calories: string;
};

export type GoalValidationResult = {
  isValid: boolean;
  requiredFields: Array<"sets" | "repsMin" | "weight" | "duration" | "distance" | "calories">;
  message: string;
};

const requiredFieldLabels: Record<GoalValidationResult["requiredFields"][number], string> = {
  sets: "Sets",
  repsMin: "Min Rep",
  weight: "Weight",
  duration: "Time",
  distance: "Distance",
  calories: "Calories",
};

const requiredFieldPreviewLabels: Record<GoalValidationResult["requiredFields"][number], string> = {
  sets: "sets",
  repsMin: "min reps",
  weight: "weight",
  duration: "time",
  distance: "distance",
  calories: "calories",
};

export function getMissingGoalMeasurementMessage(
  field: GoalValidationResult["requiredFields"][number],
) {
  return `Missing ${requiredFieldLabels[field]}`;
}

export function getMissingGoalPreviewLabel(
  field: GoalValidationResult["requiredFields"][number],
) {
  return requiredFieldPreviewLabels[field];
}

export const GOAL_SCHEMA_MATRIX: Record<GoalModality, {
  requiredFields: GoalValidationResult["requiredFields"];
  optionalFields: MeasurementSelection[];
}> = {
  strength: {
    requiredFields: ["sets", "repsMin"],
    optionalFields: ["weight"],
  },
  bodyweight: {
    requiredFields: ["sets", "repsMin"],
    optionalFields: [],
  },
  cardio_time: {
    requiredFields: ["sets", "duration"],
    optionalFields: [],
  },
  cardio_distance: {
    requiredFields: ["sets", "distance"],
    optionalFields: [],
  },
  cardio_time_distance: {
    requiredFields: ["sets", "duration", "distance"],
    optionalFields: [],
  },
};

function parseInteger(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return Number.NaN;
  return Number(trimmed);
}

function hasNonEmptyValue(value: string) {
  return value.trim().length > 0;
}

function parsePositiveNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return Number.NaN;
  return parsed;
}

function parseDurationSeconds(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const match = trimmed.match(/^(\d+):(\d{1,2})$/);
  if (!match) return Number.NaN;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  if (!Number.isInteger(minutes) || !Number.isInteger(seconds) || seconds > 59) return Number.NaN;
  return (minutes * 60) + seconds;
}

export function resolveGoalModality({
  measurementType,
  equipment,
  name,
  tags,
}: {
  measurementType: "reps" | "time" | "distance" | "time_distance" | "none";
  equipment?: string | null;
  name?: string | null;
  tags?: Set<string>;
}): GoalModality {
  const effectiveMeasurementType = measurementType === "none" ? "reps" : measurementType;
  const normalizedMeasurementType = normalizeExerciseMeasurementType({
    name,
    measurement_type: effectiveMeasurementType,
  });

  if (normalizedMeasurementType === "time_distance") return "cardio_time_distance";
  if (normalizedMeasurementType === "time") return "cardio_time";
  if (normalizedMeasurementType === "distance") return "cardio_distance";

  const isBodyweight = isBodyweightExercise({
    name,
    measurement_type: effectiveMeasurementType,
    equipment,
    tags: tags ? Array.from(tags) : null,
  });
  return isBodyweight ? "bodyweight" : "strength";
}

export function getDefaultMeasurementsForGoalModality(modality: GoalModality): MeasurementSelection[] {
  switch (modality) {
    case "bodyweight":
      return ["reps"];
    case "cardio_time":
      return ["time"];
    case "cardio_distance":
      return ["distance"];
    case "cardio_time_distance":
      return ["time", "distance"];
    case "strength":
    default:
      return ["reps", "weight"];
  }
}

export function getVisibleMetricsForModality(modality: GoalModality): MeasurementSelection[] {
  return getDefaultMeasurementsForGoalModality(modality);
}

export function getGoalMeasurementOrder(modality: GoalModality): MeasurementSelection[] {
  void modality;
  return ["reps", "time", "distance", "calories", "weight"];
}

export function inferMeasurementTypeFromGoalModality(modality: GoalModality): "reps" | "time" | "distance" | "time_distance" {
  switch (modality) {
    case "cardio_time":
      return "time";
    case "cardio_distance":
      return "distance";
    case "cardio_time_distance":
      return "time_distance";
    case "bodyweight":
    case "strength":
    default:
      return "reps";
  }
}

export function deriveGoalMeasurementSelections(
  _modality: GoalModality,
  values: GoalMeasurementValueInputs,
): MeasurementSelection[] {
  const present = new Set<MeasurementSelection>();
  if (hasNonEmptyValue(values.repsMin) || hasNonEmptyValue(values.repsMax ?? "")) present.add("reps");
  if (hasNonEmptyValue(values.weight)) present.add("weight");
  if (hasNonEmptyValue(values.duration)) present.add("time");
  if (hasNonEmptyValue(values.distance)) present.add("distance");
  if (hasNonEmptyValue(values.calories)) present.add("calories");

  return Array.from(present);
}

export function validateGoalConfiguration(input: GoalValidationInput): GoalValidationResult {
  const sets = parseInteger(input.sets);
  if (sets === null || !Number.isInteger(sets) || sets < 1) {
    return {
      isValid: false,
      requiredFields: ["sets"],
      message: getMissingGoalMeasurementMessage("sets"),
    };
  }

  const repsMin = parseInteger(input.repsMin);
  const repsMax = parseInteger(input.repsMax);
  const weight = parsePositiveNumber(input.weight);
  const duration = parseDurationSeconds(input.duration);
  const distance = parsePositiveNumber(input.distance);

  if (repsMin !== null && (!Number.isInteger(repsMin) || repsMin < 1)) {
    return { isValid: false, requiredFields: ["repsMin"], message: getMissingGoalMeasurementMessage("repsMin") };
  }

  if (repsMax !== null && (!Number.isInteger(repsMax) || repsMax < 1)) {
    return { isValid: false, requiredFields: ["repsMin"], message: getMissingGoalMeasurementMessage("repsMin") };
  }

  if (repsMax !== null && repsMin === null) {
    return { isValid: false, requiredFields: ["repsMin"], message: getMissingGoalMeasurementMessage("repsMin") };
  }

  if (repsMin !== null && repsMax !== null && repsMin > repsMax) {
    return { isValid: false, requiredFields: ["repsMin"], message: getMissingGoalMeasurementMessage("repsMin") };
  }

  if (weight !== null && (!Number.isFinite(weight) || weight < 0)) {
    return { isValid: false, requiredFields: ["weight"], message: getMissingGoalMeasurementMessage("weight") };
  }

  if (Number.isNaN(duration)) {
    return { isValid: false, requiredFields: ["duration"], message: getMissingGoalMeasurementMessage("duration") };
  }

  if (distance !== null && (!Number.isFinite(distance) || distance < 0)) {
    return { isValid: false, requiredFields: ["distance"], message: getMissingGoalMeasurementMessage("distance") };
  }

  const calories = parsePositiveNumber(input.calories);
  if (calories !== null && (!Number.isFinite(calories) || calories < 0)) {
    return { isValid: false, requiredFields: ["calories"], message: getMissingGoalMeasurementMessage("calories") };
  }

  switch (input.modality) {
    case "bodyweight":
      if (repsMin === null) {
        return { isValid: false, requiredFields: ["repsMin"], message: getMissingGoalMeasurementMessage("repsMin") };
      }
      break;
    case "cardio_time":
      if (duration === null || duration <= 0) {
        return { isValid: false, requiredFields: ["duration"], message: getMissingGoalMeasurementMessage("duration") };
      }
      break;
    case "cardio_distance":
      if (distance === null || distance <= 0) {
        return { isValid: false, requiredFields: ["distance"], message: getMissingGoalMeasurementMessage("distance") };
      }
      break;
    case "cardio_time_distance": {
      const hasTime = duration !== null && duration > 0;
      const hasDistance = distance !== null && distance > 0;
      if (!hasTime && !hasDistance) {
        return {
          isValid: false,
          requiredFields: ["duration"],
          message: getMissingGoalMeasurementMessage("duration"),
        };
      }
      break;
    }
    case "strength":
    default:
      if (repsMin === null) {
        return { isValid: false, requiredFields: ["repsMin"], message: getMissingGoalMeasurementMessage("repsMin") };
      }
      if (input.measurementSelections.has("weight") && weight === null) {
        return { isValid: false, requiredFields: ["weight"], message: getMissingGoalMeasurementMessage("weight") };
      }
      break;
  }

  return {
    isValid: true,
    requiredFields: [],
    message: "Goal is valid.",
  };
}
