import { normalizeSetFlowId } from "@/lib/set-flow";

export type PlanSetFlowInput = {
  setFlow?: string | null;
  targetSets?: number | null;
  targetWeight?: number | null;
  targetReps?: number | null;
  repRange?: {
    min?: number | null;
    max?: number | null;
  } | null;
  loadStep?: number | null;
  repStep?: number | null;
};

export type PlannedSetTargetRole = "straight" | "ramp" | "top" | "backoff";

export type PlannedSetTarget = {
  index: number;
  targetWeight?: number;
  targetReps?: number;
  label?: string;
  role?: PlannedSetTargetRole;
};

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clampPositiveNumber(value: number) {
  return Math.max(0, Number(value.toFixed(2)));
}

function resolveTargetSetCount(targetSets: number | null | undefined) {
  return isPositiveInteger(targetSets) ? targetSets : 0;
}

function resolveRepRange(repRange: PlanSetFlowInput["repRange"]) {
  const min = isPositiveInteger(repRange?.min) ? repRange.min : null;
  const max = isPositiveInteger(repRange?.max) ? repRange.max : null;

  if (!min && !max) {
    return null;
  }

  if (min && max) {
    return min <= max
      ? { min, max }
      : { min: max, max: min };
  }

  const value = min ?? max;
  return value ? { min: value, max: value } : null;
}

function resolveBaseTargetReps(input: PlanSetFlowInput, repRange: ReturnType<typeof resolveRepRange>) {
  if (isPositiveInteger(input.targetReps)) {
    return input.targetReps;
  }

  if (!repRange) {
    return null;
  }

  return repRange.min ?? repRange.max;
}

function buildStraightSetTarget(index: number, input: PlanSetFlowInput, targetReps: number | null): PlannedSetTarget {
  return {
    index,
    role: "straight",
    label: `Set ${index}`,
    ...(isFiniteNumber(input.targetWeight) ? { targetWeight: clampPositiveNumber(input.targetWeight) } : {}),
    ...(isPositiveInteger(targetReps) ? { targetReps } : {}),
  };
}

function buildRepeatedStraightTargets(count: number, input: PlanSetFlowInput, targetReps: number | null) {
  return Array.from({ length: count }, (_, zeroIndex) => buildStraightSetTarget(zeroIndex + 1, input, targetReps));
}

function interpolateRepTarget(args: {
  setIndex: number;
  setCount: number;
  repRange: { min: number; max: number };
  direction: "up" | "down";
}) {
  const { setIndex, setCount, repRange, direction } = args;
  if (setCount <= 1 || repRange.min === repRange.max) {
    return repRange.min;
  }

  const progress = (setIndex - 1) / (setCount - 1);
  const span = repRange.max - repRange.min;
  const raw = direction === "up"
    ? repRange.min + (span * progress)
    : repRange.max - (span * progress);

  return Math.round(raw);
}

function resolveRepStepTarget(args: {
  setIndex: number;
  setCount: number;
  baseReps: number;
  repRange: { min: number; max: number } | null;
  repStep: number | null;
  direction: "up" | "down";
}) {
  const { setIndex, setCount, baseReps, repRange, repStep, direction } = args;
  if (repRange && repRange.min !== repRange.max) {
    if (isPositiveInteger(repStep)) {
      const offset = direction === "up"
        ? repStep * (setIndex - 1)
        : repStep * (setCount - setIndex);
      const raw = direction === "up"
        ? repRange.min + offset
        : repRange.min + offset;
      return Math.min(repRange.max, Math.max(repRange.min, raw));
    }

    return interpolateRepTarget({ setIndex, setCount, repRange, direction });
  }

  return baseReps;
}

function buildRampTargets(args: {
  count: number;
  input: PlanSetFlowInput;
  repRange: { min: number; max: number } | null;
  targetReps: number | null;
}) {
  const repStep = isPositiveInteger(args.input.repStep) ? args.input.repStep : null;
  if (!isPositiveInteger(args.targetReps) && !args.repRange) {
    return buildRepeatedStraightTargets(args.count, args.input, null);
  }

  const baseReps = args.targetReps ?? args.repRange?.min ?? null;
  if (!isPositiveInteger(baseReps)) {
    return buildRepeatedStraightTargets(args.count, args.input, null);
  }

  return Array.from({ length: args.count }, (_, zeroIndex) => {
    const index = zeroIndex + 1;
    const targetReps = resolveRepStepTarget({
      setIndex: index,
      setCount: args.count,
      baseReps,
      repRange: args.repRange,
      repStep,
      direction: "up",
    });

    return {
      index,
      role: "ramp" as const,
      label: `Set ${index} - Ramp`,
      ...(isFiniteNumber(args.input.targetWeight) ? { targetWeight: clampPositiveNumber(args.input.targetWeight) } : {}),
      ...(isPositiveInteger(targetReps) ? { targetReps } : {}),
    };
  });
}

function buildBackoffTargets(args: {
  count: number;
  input: PlanSetFlowInput;
  repRange: { min: number; max: number } | null;
  targetReps: number | null;
}) {
  const repStep = isPositiveInteger(args.input.repStep) ? args.input.repStep : null;
  if (!isPositiveInteger(args.targetReps) && !args.repRange) {
    return buildRepeatedStraightTargets(args.count, args.input, null).map((target, index) => ({
      ...target,
      role: index === 0 ? "top" as const : "backoff" as const,
      label: index === 0 ? `Set ${target.index} - Top set` : `Set ${target.index} - Backoff`,
    }));
  }

  const baseReps = args.targetReps ?? args.repRange?.min ?? null;
  if (!isPositiveInteger(baseReps)) {
    return buildRepeatedStraightTargets(args.count, args.input, null);
  }

  return Array.from({ length: args.count }, (_, zeroIndex) => {
    const index = zeroIndex + 1;
    const targetReps = resolveRepStepTarget({
      setIndex: index,
      setCount: args.count,
      baseReps,
      repRange: args.repRange,
      repStep,
      direction: "up",
    });

    return {
      index,
      role: index === 1 ? "top" as const : "backoff" as const,
      label: index === 1 ? `Set ${index} - Top set` : `Set ${index} - Backoff`,
      ...(isFiniteNumber(args.input.targetWeight) ? { targetWeight: clampPositiveNumber(args.input.targetWeight) } : {}),
      ...(isPositiveInteger(targetReps) ? { targetReps } : {}),
    };
  });
}

export function planSetFlowTargets(input: PlanSetFlowInput): PlannedSetTarget[] {
  const count = resolveTargetSetCount(input.targetSets);
  if (count <= 0) {
    return [];
  }

  const normalizedSetFlow = normalizeSetFlowId(input.setFlow) ?? "straight_sets";
  const repRange = resolveRepRange(input.repRange);
  const targetReps = resolveBaseTargetReps(input, repRange);

  switch (normalizedSetFlow) {
  case "ascending_ramp":
    return buildRampTargets({
      count,
      input,
      repRange,
      targetReps,
    });
  case "descending_backoff":
    return buildBackoffTargets({
      count,
      input,
      repRange,
      targetReps,
    });
  case "straight_sets":
  default:
    return buildRepeatedStraightTargets(count, input, targetReps);
  }
}
