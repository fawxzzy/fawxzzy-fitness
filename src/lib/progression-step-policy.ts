import type {
  ProgressionMeasurementType,
  ProgressionMethodLayerId,
  ProgressionStepOverrideConfig,
  TrainingGoalId,
} from "@/lib/progression-playbooks";
import { DEFAULT_PROGRESSION_STEP_OVERRIDES } from "@/lib/progression-step-defaults";
import type { FitnessDistanceUnit } from "@/types/db";

export type ProgressionStepKind =
  | "load"
  | "reps"
  | "duration"
  | "distance"
  | "pace_or_volume"
  | "none";

export type ProgressionStepEquipmentFamily =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "bodyweight"
  | "cardio"
  | "stretch"
  | "unknown";

export type ProgressionStepSource =
  | "exercise_override"
  | "step_override"
  | "incompatible_override_ignored"
  | "equipment_default"
  | "routine_default"
  | "training_goal_seed"
  | "app_fallback"
  | "unsupported";

export type ProgressionStepPolicy = {
  kind: ProgressionStepKind;
  equipmentFamily: ProgressionStepEquipmentFamily;
  label: string | null;
  defaultValue: number | null;
  unit: "lbs" | "kg" | "reps" | "seconds" | "mi" | "km" | "m" | "steps" | "pace/volume" | null;
  description: string;
  source: ProgressionStepSource;
};

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function normalizeSearchText(...values: Array<string | null | undefined>) {
  return values
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .trim()
    .toLowerCase();
}

export function inferProgressionStepEquipmentFamily(args: {
  equipment?: string | null;
  movementPattern?: string | null;
  measurementType?: ProgressionMeasurementType | null;
}): ProgressionStepEquipmentFamily {
  const text = normalizeSearchText(args.equipment, args.movementPattern);
  const measurementType = args.measurementType ?? null;

  if (measurementType === "none" || text.includes("stretch") || text.includes("mobility")) {
    return "stretch";
  }

  if (measurementType === "time" || measurementType === "distance" || measurementType === "time_distance") {
    return "cardio";
  }

  if (text.includes("barbell")) return "barbell";
  if (text.includes("dumbbell") || text.includes("db ")) return "dumbbell";
  if (text.includes("machine")) return "machine";
  if (text.includes("cable")) return "cable";
  if (text.includes("bodyweight") || text.includes("body weight") || text.includes("calisthenic")) {
    return "bodyweight";
  }

  return "unknown";
}

function formatWeightUnitDescription(unit: "lbs" | "kg") {
  return unit === "kg" ? "kg" : "lb";
}

function getLoadStepForEquipment(
  equipmentFamily: ProgressionStepEquipmentFamily,
  weightUnit: "lbs" | "kg",
) {
  switch (equipmentFamily) {
  case "barbell":
    return DEFAULT_PROGRESSION_STEP_OVERRIDES.barbellLoadIncrement;
  case "dumbbell":
    return DEFAULT_PROGRESSION_STEP_OVERRIDES.dumbbellLoadIncrement;
  case "machine":
    return DEFAULT_PROGRESSION_STEP_OVERRIDES.machineLoadIncrement;
  case "cable":
    return DEFAULT_PROGRESSION_STEP_OVERRIDES.cableLoadIncrement;
  default:
    return null;
  }
}

function getLoadStepOverrideForEquipment(
  overrides: ProgressionStepOverrideConfig | null | undefined,
  equipmentFamily: ProgressionStepEquipmentFamily,
) {
  if (!overrides) {
    return null;
  }

  switch (equipmentFamily) {
  case "barbell":
    return isPositiveNumber(overrides.barbellLoadIncrement) ? overrides.barbellLoadIncrement : null;
  case "dumbbell":
    return isPositiveNumber(overrides.dumbbellLoadIncrement) ? overrides.dumbbellLoadIncrement : null;
  case "machine":
    return isPositiveNumber(overrides.machineLoadIncrement) ? overrides.machineLoadIncrement : null;
  case "cable":
    return isPositiveNumber(overrides.cableLoadIncrement) ? overrides.cableLoadIncrement : null;
  default:
    return null;
  }
}

function buildNonePolicy(equipmentFamily: ProgressionStepEquipmentFamily): ProgressionStepPolicy {
  return {
    kind: "none",
    equipmentFamily,
    label: null,
    defaultValue: null,
    unit: null,
    description: "This exercise type does not use a progression step.",
    source: "unsupported",
  };
}

function resolveDefaultSourceForIgnoredOverride(value: unknown): ProgressionStepSource {
  return isPositiveNumber(value) ? "incompatible_override_ignored" : "equipment_default";
}

export function inferProgressionStepPolicy(args: {
  measurementType?: ProgressionMeasurementType | null;
  equipment?: string | null;
  movementPattern?: string | null;
  defaultUnit?: string | null;
  weightUnit?: "lbs" | "kg" | null;
  distanceUnit?: FitnessDistanceUnit | null;
  trainingGoal?: TrainingGoalId | null;
  progressionMethod?: ProgressionMethodLayerId | null;
  targetWeight?: number | null;
  exerciseOverrideValue?: number | null;
  routineDefaultValue?: number | null;
  trainingGoalSeedValue?: number | null;
  stepOverrides?: ProgressionStepOverrideConfig | null;
}): ProgressionStepPolicy {
  const measurementType = args.measurementType ?? "reps";
  const weightUnit = args.weightUnit ?? "lbs";
  const distanceUnit = args.distanceUnit ?? (args.defaultUnit === "km" ? "km" : args.defaultUnit === "steps" ? "steps" : "mi");
  const equipmentFamily = inferProgressionStepEquipmentFamily({
    equipment: args.equipment,
    movementPattern: args.movementPattern,
    measurementType,
  });

  if (measurementType === "none" || equipmentFamily === "stretch") {
    return buildNonePolicy(equipmentFamily);
  }

  if (measurementType === "time") {
    const overrideValue = isPositiveNumber(args.stepOverrides?.durationSecondsIncrement)
      ? args.stepOverrides.durationSecondsIncrement
      : null;
    const defaultValue = overrideValue ?? DEFAULT_PROGRESSION_STEP_OVERRIDES.durationSecondsIncrement;
    return {
      kind: "duration",
      equipmentFamily,
      label: "Duration step",
      defaultValue,
      unit: "seconds",
      description: overrideValue
        ? `Advanced step options set time progression to ${defaultValue} seconds.`
        : isPositiveNumber(args.exerciseOverrideValue)
        ? `Ignored incompatible legacy load override; time progression defaults to adding ${DEFAULT_PROGRESSION_STEP_OVERRIDES.durationSecondsIncrement} seconds.`
        : `Time-based progression defaults to adding ${DEFAULT_PROGRESSION_STEP_OVERRIDES.durationSecondsIncrement} seconds.`,
      source: overrideValue ? "step_override" : resolveDefaultSourceForIgnoredOverride(args.exerciseOverrideValue),
    };
  }

  if (measurementType === "distance") {
    const overrideValue = isPositiveNumber(args.stepOverrides?.distanceIncrement)
      ? args.stepOverrides.distanceIncrement
      : null;
    const defaultValue = overrideValue ?? DEFAULT_PROGRESSION_STEP_OVERRIDES.distanceIncrement;
    return {
      kind: "distance",
      equipmentFamily,
      label: "Distance step",
      defaultValue,
      unit: distanceUnit,
      description: overrideValue
        ? `Advanced step options set distance progression to ${defaultValue} ${distanceUnit}.`
        : isPositiveNumber(args.exerciseOverrideValue)
        ? `Ignored incompatible legacy load override; distance progression defaults to adding ${DEFAULT_PROGRESSION_STEP_OVERRIDES.distanceIncrement} ${distanceUnit}.`
        : `Distance progression defaults to adding ${DEFAULT_PROGRESSION_STEP_OVERRIDES.distanceIncrement} ${distanceUnit}.`,
      source: overrideValue ? "step_override" : resolveDefaultSourceForIgnoredOverride(args.exerciseOverrideValue),
    };
  }

  if (measurementType === "time_distance") {
    const overrideValue = isPositiveNumber(args.stepOverrides?.distanceIncrement)
      ? args.stepOverrides.distanceIncrement
      : null;
    const defaultDistanceStep = overrideValue ?? DEFAULT_PROGRESSION_STEP_OVERRIDES.distanceIncrement;
    return {
      kind: "pace_or_volume",
      equipmentFamily,
      label: "Pace / volume step",
      defaultValue: defaultDistanceStep,
      unit: "pace/volume",
      description: overrideValue
        ? `Advanced step options hold time and add ${defaultDistanceStep} ${distanceUnit}.`
        : isPositiveNumber(args.exerciseOverrideValue)
        ? `Ignored incompatible legacy load override; time + distance progression holds time and adds ${defaultDistanceStep} ${distanceUnit}.`
        : "Time + distance progression uses a pace or volume step.",
      source: overrideValue ? "step_override" : resolveDefaultSourceForIgnoredOverride(args.exerciseOverrideValue),
    };
  }

  if (measurementType === "reps") {
    const hasLoadTarget = isPositiveNumber(args.targetWeight);

    if (equipmentFamily === "bodyweight" && !hasLoadTarget) {
      const repOverride = isPositiveNumber(args.stepOverrides?.bodyweightRepIncrement)
        ? args.stepOverrides.bodyweightRepIncrement
        : null;
      return {
        kind: "reps",
        equipmentFamily,
        label: "Rep step",
        defaultValue: repOverride ?? DEFAULT_PROGRESSION_STEP_OVERRIDES.bodyweightRepIncrement,
        unit: "reps",
        description: repOverride
          ? `Advanced step options set bodyweight progression to ${repOverride} ${repOverride === 1 ? "rep" : "reps"}.`
        : isPositiveNumber(args.exerciseOverrideValue)
          ? "Ignored incompatible legacy load override; bodyweight progression defaults to adding reps instead of load."
          : "Bodyweight progression defaults to adding reps instead of load.",
        source: repOverride ? "step_override" : resolveDefaultSourceForIgnoredOverride(args.exerciseOverrideValue),
      };
    }

    const equipmentOverrideStep = getLoadStepOverrideForEquipment(args.stepOverrides, equipmentFamily);
    if (isPositiveNumber(equipmentOverrideStep)) {
      const perDumbbell = equipmentFamily === "dumbbell" ? " per dumbbell" : "";
      return {
        kind: "load",
        equipmentFamily,
        label: "Load step",
        defaultValue: equipmentOverrideStep,
        unit: weightUnit,
        description: `Advanced step options set ${equipmentFamily} progression to ${equipmentOverrideStep} ${formatWeightUnitDescription(weightUnit)}${perDumbbell}.`,
        source: "step_override",
      };
    }

    if (isPositiveNumber(args.exerciseOverrideValue)) {
      return {
        kind: "load",
        equipmentFamily,
        label: "Load step",
        defaultValue: args.exerciseOverrideValue,
        unit: weightUnit,
        description: "Exercise override controls the progression step.",
        source: "exercise_override",
      };
    }

    const equipmentStep = getLoadStepForEquipment(equipmentFamily, weightUnit);
    if (isPositiveNumber(equipmentStep)) {
      const perDumbbell = equipmentFamily === "dumbbell" ? " per dumbbell" : "";
      return {
        kind: "load",
        equipmentFamily,
        label: "Load step",
        defaultValue: equipmentStep,
        unit: weightUnit,
        description: `${equipmentFamily} progression defaults to ${equipmentStep} ${formatWeightUnitDescription(weightUnit)}${perDumbbell}.`,
        source: "equipment_default",
      };
    }

    if (isPositiveNumber(args.routineDefaultValue)) {
      return {
        kind: "load",
        equipmentFamily,
        label: "Load step",
        defaultValue: args.routineDefaultValue,
        unit: weightUnit,
        description: "Routine default controls the progression step.",
        source: "routine_default",
      };
    }

    if (isPositiveNumber(args.trainingGoalSeedValue)) {
      return {
        kind: "load",
        equipmentFamily,
        label: "Load step",
        defaultValue: args.trainingGoalSeedValue,
        unit: weightUnit,
        description: "Training focus seed controls the progression step.",
        source: "training_goal_seed",
      };
    }

    return {
      kind: "load",
      equipmentFamily,
      label: "Load step",
      defaultValue: weightUnit === "kg" ? 2.5 : 5,
      unit: weightUnit,
      description: "App fallback controls the progression step.",
      source: "app_fallback",
    };
  }

  return buildNonePolicy(equipmentFamily);
}

export function formatProgressionStepValue(policy: ProgressionStepPolicy) {
  if (!isPositiveNumber(policy.defaultValue) || !policy.unit) {
    return "-";
  }

  if (policy.unit === "seconds") {
    return `${policy.defaultValue}s`;
  }

  if (policy.unit === "pace/volume") {
    return `${policy.defaultValue} pace/volume`;
  }

  if (policy.unit === "reps") {
    return `${policy.defaultValue} ${policy.defaultValue === 1 ? "rep" : "reps"}`;
  }

  return `${policy.defaultValue} ${policy.unit}`;
}
