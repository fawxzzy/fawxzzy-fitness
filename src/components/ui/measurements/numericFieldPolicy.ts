// One numeric-entry policy for every measurement field (reps, weight, distance, calories, effort, sets).
// - inputMode: phones open a number pad (reps/sets/calories) or a decimal pad (weight/distance/effort) instead of the
//   full keyboard. Time stays "text" because it takes `m:ss` and the numeric pads have no colon.
// - steps: the +/- steppers move by a unit-aware amount (2.5 lb, 1 kg, 0.25 mi, ...) and snap to that grid
//   (137 lb + one 2.5 lb step -> 137.5, 137 lb - one step -> 135), so a typed odd value rejoins the grid in one tap.
// The stored value contract is unchanged: every field is still a plain decimal/integer string.

export type NumericMeasurementField = "reps" | "sets" | "weight" | "distance" | "calories" | "rpe" | "time";

export type NumericInputMode = "numeric" | "decimal" | "text";

export function resolveNumericInputMode(field: NumericMeasurementField): NumericInputMode {
  switch (field) {
    case "reps":
    case "sets":
    case "calories":
      return "numeric";
    case "weight":
    case "distance":
    case "rpe":
      return "decimal";
    case "time":
    default:
      return "text";
  }
}

/**
 * Weight step per unit: 2.5 lb (the smallest common plate pair / dumbbell jump) and 1 kg.
 * Unknown units fall back to 1 so nothing jumps unexpectedly.
 */
export function resolveWeightStep(unit: string | null | undefined): number {
  const normalized = (unit ?? "").trim().toLowerCase();
  if (normalized === "lb" || normalized === "lbs") return 2.5;
  if (normalized === "kg" || normalized === "kgs") return 1;
  return 1;
}

/** Distance step per unit: a quarter mile, half a km, 100 m, 100 steps. */
export function resolveDistanceStep(unit: string | null | undefined): number {
  const normalized = (unit ?? "").trim().toLowerCase();
  if (normalized === "mi") return 0.25;
  if (normalized === "km") return 0.5;
  if (normalized === "m") return 100;
  if (normalized === "steps") return 100;
  return 1;
}

export const CALORIES_STEP = 5;

function roundToPrecision(value: number, precision = 4) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function formatStepped(value: number) {
  const rounded = roundToPrecision(value);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, "");
}

/**
 * Move a numeric string one step up or down, snapping to the step grid first.
 * - Empty/invalid input counts as 0, so the first "+" gives one step (2.5 lb, 1 kg, 0.25 mi).
 * - Off-grid values snap to the next grid line in the pressed direction (137 + 2.5-step -> 137.5; 137 - 2.5-step -> 135).
 * - Never goes below `min` (default 0). When the result would be at or below `min` and `emptyAtMin` is set, it returns "".
 */
export function stepNumericValue(
  value: string | null | undefined,
  step: number,
  direction: 1 | -1,
  options: { min?: number; max?: number; emptyAtMin?: boolean } = {},
): string {
  const min = options.min ?? 0;
  const max = options.max ?? Number.POSITIVE_INFINITY;
  const safeStep = Number.isFinite(step) && step > 0 ? step : 1;
  const parsed = Number.parseFloat((value ?? "").trim());
  const current = Number.isFinite(parsed) ? parsed : 0;
  const gridIndex = current / safeStep;
  const onGrid = Math.abs(gridIndex - Math.round(gridIndex)) < 1e-6;
  let next: number;
  if (direction > 0) {
    next = onGrid ? (Math.round(gridIndex) + 1) * safeStep : Math.ceil(gridIndex) * safeStep;
  } else {
    next = onGrid ? (Math.round(gridIndex) - 1) * safeStep : Math.floor(gridIndex) * safeStep;
  }
  next = Math.min(max, Math.max(min, roundToPrecision(next)));
  if (options.emptyAtMin && next <= min) {
    return "";
  }
  return formatStepped(next);
}
