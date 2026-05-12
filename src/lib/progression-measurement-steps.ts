export type MeasurementRange = {
  min?: number | null;
  max?: number | null;
};

export type NextSteppedTargetInput = {
  current?: number | null;
  range?: MeasurementRange | null;
  step?: number | null;
  fallback?: number | null;
};

export type NormalizedMeasurementRange = {
  min: number;
  max: number;
};

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function roundNumericTarget(value: number) {
  return Number(value.toFixed(4));
}

export function normalizeStepSize(step: number | null | undefined) {
  return isPositiveFiniteNumber(step) ? roundNumericTarget(step) : null;
}

export function normalizeMeasurementRange(range: MeasurementRange | null | undefined): NormalizedMeasurementRange | null {
  const min = isPositiveFiniteNumber(range?.min) ? roundNumericTarget(range.min) : null;
  const max = isPositiveFiniteNumber(range?.max) ? roundNumericTarget(range.max) : null;

  if (min === null && max === null) {
    return null;
  }

  if (min !== null && max !== null) {
    return min <= max
      ? { min, max }
      : { min: max, max: min };
  }

  const value = min ?? max;
  return value !== null ? { min: value, max: value } : null;
}

function normalizeTargetValue(value: number | null | undefined) {
  return isPositiveFiniteNumber(value) ? roundNumericTarget(value) : null;
}

export function resolveRangeStart(range: MeasurementRange | null | undefined, fallback?: number | null) {
  const normalizedRange = normalizeMeasurementRange(range);
  if (normalizedRange) {
    return normalizedRange.min;
  }

  return normalizeTargetValue(fallback);
}

export function resolveRangeTop(range: MeasurementRange | null | undefined, fallback?: number | null) {
  const normalizedRange = normalizeMeasurementRange(range);
  if (normalizedRange) {
    return normalizedRange.max;
  }

  return normalizeTargetValue(fallback);
}

export function clampTargetToRange(args: {
  value?: number | null;
  range?: MeasurementRange | null;
  fallback?: number | null;
}) {
  const normalizedRange = normalizeMeasurementRange(args.range);
  const normalizedValue = normalizeTargetValue(args.value);

  if (!normalizedRange) {
    return normalizedValue ?? normalizeTargetValue(args.fallback);
  }

  const candidate = normalizedValue ?? resolveRangeStart(normalizedRange, args.fallback);
  if (candidate === null) {
    return null;
  }

  if (candidate <= normalizedRange.min) {
    return normalizedRange.min;
  }

  if (candidate >= normalizedRange.max) {
    return normalizedRange.max;
  }

  return candidate;
}

export function isAtRangeTop(args: {
  current?: number | null;
  range?: MeasurementRange | null;
  fallback?: number | null;
}) {
  const normalizedRange = normalizeMeasurementRange(args.range);
  if (!normalizedRange) {
    return false;
  }

  const current = clampTargetToRange({
    value: args.current,
    range: normalizedRange,
    fallback: args.fallback,
  });

  return current !== null && current >= normalizedRange.max;
}

export function getNextSteppedTarget(input: NextSteppedTargetInput) {
  const normalizedRange = normalizeMeasurementRange(input.range);
  const current = clampTargetToRange({
    value: input.current,
    range: normalizedRange,
    fallback: input.fallback,
  });

  if (!normalizedRange) {
    return current;
  }

  if (current === null) {
    return normalizedRange.min;
  }

  if (current >= normalizedRange.max) {
    return normalizedRange.max;
  }

  const normalizedStep = normalizeStepSize(input.step);
  if (normalizedStep === null) {
    return current < normalizedRange.min ? normalizedRange.min : current;
  }

  const nextValue = roundNumericTarget(current + normalizedStep);
  return nextValue >= normalizedRange.max ? normalizedRange.max : Math.max(normalizedRange.min, nextValue);
}

export function buildSteppedTargetSequence(args: {
  start?: number | null;
  range?: MeasurementRange | null;
  step?: number | null;
  limit?: number | null;
}) {
  const normalizedRange = normalizeMeasurementRange(args.range);
  if (!normalizedRange) {
    return [];
  }

  const limit = Number.isInteger(args.limit) && Number(args.limit) > 0 ? Number(args.limit) : 32;
  const sequence: number[] = [];
  let current = clampTargetToRange({
    value: args.start,
    range: normalizedRange,
    fallback: normalizedRange.min,
  });

  if (current === null) {
    return [];
  }

  sequence.push(current);
  for (let index = 1; index < limit; index += 1) {
    const next = getNextSteppedTarget({
      current,
      range: normalizedRange,
      step: args.step,
      fallback: normalizedRange.min,
    });
    if (next === null || next === current) {
      break;
    }
    sequence.push(next);
    current = next;
  }

  return sequence;
}
