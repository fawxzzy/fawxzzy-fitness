export type FitnessDistanceUnit = "mi" | "km" | "m" | "steps";

export function isFitnessDistanceUnit(value: unknown): value is FitnessDistanceUnit {
  return value === "mi" || value === "km" || value === "m" || value === "steps";
}

export function normalizeFitnessDistanceUnit(
  value: unknown,
  fallback: FitnessDistanceUnit = "mi",
): FitnessDistanceUnit {
  return isFitnessDistanceUnit(value) ? value : fallback;
}

export function isStepDistanceUnit(value: unknown): value is "steps" {
  return value === "steps";
}

export function formatDistanceUnitLabel(value: unknown) {
  const unit = isFitnessDistanceUnit(value) ? value : null;
  if (!unit) {
    return null;
  }

  return unit === "steps" ? "steps" : unit;
}

export function formatDistanceNumber(value: number, unit?: unknown) {
  if (isStepDistanceUnit(unit)) {
    return String(Math.round(value));
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

export function getDistanceMetricLabel(unit?: unknown) {
  return isStepDistanceUnit(unit) ? "steps" : normalizeFitnessDistanceUnit(unit);
}
