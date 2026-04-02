export type MeasurementSelection = "reps" | "weight" | "time" | "distance" | "calories";

export type GoalModality = "strength" | "bodyweight" | "cardio_time" | "cardio_distance" | "cardio_time_distance";

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
  weight: string;
  duration: string;
  distance: string;
  calories: string;
};

export type GoalValidationResult = {
  isValid: boolean;
  requiredFields: Array<"sets" | "repsMin" | "weight" | "duration" | "distance">;
  message: string;
};

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
    optionalFields: ["time"],
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
  tags,
}: {
  measurementType: "reps" | "time" | "distance" | "time_distance";
  equipment?: string | null;
  tags?: Set<string>;
}): GoalModality {
  if (measurementType === "time_distance") return "cardio_time_distance";
  if (measurementType === "time") return "cardio_time";
  if (measurementType === "distance") return "cardio_distance";

  const normalizedEquipment = (equipment ?? "").trim().toLowerCase();
  const isBodyweight = normalizedEquipment === "bodyweight" || tags?.has("bodyweight");
  return isBodyweight ? "bodyweight" : "strength";
}

export function getVisibleMetricsForModality(modality: GoalModality): MeasurementSelection[] {
  switch (modality) {
    case "bodyweight":
      return ["reps", "time"];
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

export function deriveGoalMeasurementSelections(
  modality: GoalModality,
  values: GoalMeasurementValueInputs,
): MeasurementSelection[] {
  const present = new Set<MeasurementSelection>();
  if (hasNonEmptyValue(values.repsMin)) present.add("reps");
  if (hasNonEmptyValue(values.weight)) present.add("weight");
  if (hasNonEmptyValue(values.duration)) present.add("time");
  if (hasNonEmptyValue(values.distance)) present.add("distance");
  if (hasNonEmptyValue(values.calories)) present.add("calories");

  if (modality === "strength" || modality === "bodyweight") {
    present.add("reps");
  }
  if (modality === "cardio_time") {
    present.add("time");
  }
  if (modality === "cardio_distance") {
    present.add("distance");
  }

  return Array.from(present);
}

export function validateGoalConfiguration(input: GoalValidationInput): GoalValidationResult {
  const sets = parseInteger(input.sets);
  if (sets === null || !Number.isInteger(sets) || sets < 1) {
    return {
      isValid: false,
      requiredFields: ["sets"],
      message: "Set target sets to at least 1 to add this exercise.",
    };
  }

  const repsMin = parseInteger(input.repsMin);
  const repsMax = parseInteger(input.repsMax);
  const weight = parsePositiveNumber(input.weight);
  const duration = parseDurationSeconds(input.duration);
  const distance = parsePositiveNumber(input.distance);

  if (repsMin !== null && (!Number.isInteger(repsMin) || repsMin < 1)) {
    return { isValid: false, requiredFields: ["repsMin"], message: "Enter reps as a whole number greater than 0." };
  }

  if (repsMax !== null && (!Number.isInteger(repsMax) || repsMax < 1)) {
    return { isValid: false, requiredFields: ["repsMin"], message: "Enter max reps as a whole number greater than 0." };
  }

  if (repsMin !== null && repsMax !== null && repsMin > repsMax) {
    return { isValid: false, requiredFields: ["repsMin"], message: "Rep range must use min less than or equal to max." };
  }

  if (weight !== null && (!Number.isFinite(weight) || weight < 0)) {
    return { isValid: false, requiredFields: ["weight"], message: "Weight must be 0 or greater." };
  }

  if (Number.isNaN(duration)) {
    return { isValid: false, requiredFields: ["duration"], message: "Time must be entered as seconds or mm:ss." };
  }

  if (distance !== null && (!Number.isFinite(distance) || distance < 0)) {
    return { isValid: false, requiredFields: ["distance"], message: "Distance must be 0 or greater." };
  }

  switch (input.modality) {
    case "bodyweight":
      if (!input.measurementSelections.has("reps") || repsMin === null) {
        return { isValid: false, requiredFields: ["repsMin"], message: "Bodyweight goals require a rep target." };
      }
      break;
    case "cardio_time":
      if (!input.measurementSelections.has("time") || duration === null || duration <= 0) {
        return { isValid: false, requiredFields: ["duration"], message: "Time-based cardio goals require a time target." };
      }
      break;
    case "cardio_distance":
      if (!input.measurementSelections.has("distance") || distance === null || distance <= 0) {
        return { isValid: false, requiredFields: ["distance"], message: "Distance-based cardio goals require a distance target." };
      }
      break;
    case "cardio_time_distance": {
      const hasTime = input.measurementSelections.has("time") && duration !== null && duration > 0;
      const hasDistance = input.measurementSelections.has("distance") && distance !== null && distance > 0;
      if (!hasTime && !hasDistance) {
        return {
          isValid: false,
          requiredFields: ["duration", "distance"],
          message: "Set a time or distance target for this cardio goal.",
        };
      }
      break;
    }
    case "strength":
    default:
      if (!input.measurementSelections.has("reps") || repsMin === null) {
        return { isValid: false, requiredFields: ["repsMin"], message: "Strength goals require a rep target." };
      }
      if (input.measurementSelections.has("weight") && weight === null) {
        return { isValid: false, requiredFields: ["weight"], message: "Add a weight target or turn off weight for rep-only programming." };
      }
      break;
  }

  return {
    isValid: true,
    requiredFields: [],
    message: "Goal is valid.",
  };
}
