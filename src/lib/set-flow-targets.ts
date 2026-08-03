import { normalizeSetFlowId, type SetFlowId } from "@/lib/set-flow";
import type { ProgressionMeasurementType, ProgressionTargetPlan, SetFlowStepConfig } from "@/lib/progression-playbooks";
import type { ProgressionStepPolicy } from "@/lib/progression-step-policy";
import { DEFAULT_SET_FLOW_STEPS } from "@/lib/progression-step-defaults";
import {
  getSetFlowDirectionConfigForLegacySetFlow,
  normalizeSetFlowDirectionConfig,
  type SetFlowDirection,
  type SetFlowDirectionConfig,
} from "@/lib/set-flow-directions";

export type PlannedSetRole = "work" | "top_set" | "backoff" | "ramp" | "optional";

export type PlannedSetTarget = {
  setIndex: number;
  role: PlannedSetRole;
  label: string;
  targetWeight: number | null;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  durationSeconds: number | null;
  distance: number | null;
  calories: number | null;
};

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function resolveSingleValue(min?: number | null, max?: number | null) {
  if (isPositiveNumber(max)) return max;
  if (isPositiveNumber(min)) return min;
  return null;
}

function resolveTargetSets(plan: ProgressionTargetPlan, targetSets?: number | null) {
  if (isPositiveInteger(targetSets)) return targetSets;
  const planSets = resolveSingleValue(plan.setsMin, plan.setsMax);
  return isPositiveInteger(planSets) ? planSets : 0;
}

function resolveLoadStep(policy?: ProgressionStepPolicy | null, setFlowSteps?: SetFlowStepConfig | null) {
  if (isPositiveNumber(setFlowSteps?.loadStep)) {
    return setFlowSteps.loadStep;
  }

  if (policy?.kind === "load" && isPositiveNumber(policy.defaultValue)) {
    return policy.defaultValue;
  }

  return DEFAULT_SET_FLOW_STEPS.loadStep;
}

function resolveRepStep(setFlowSteps?: SetFlowStepConfig | null) {
  return isPositiveNumber(setFlowSteps?.repStep) ? setFlowSteps.repStep : DEFAULT_SET_FLOW_STEPS.repStep;
}

function resolveDurationStep(setFlowSteps?: SetFlowStepConfig | null) {
  return isPositiveNumber(setFlowSteps?.durationSecondsStep)
    ? setFlowSteps.durationSecondsStep
    : DEFAULT_SET_FLOW_STEPS.durationSecondsStep;
}

function resolveDistanceStep(setFlowSteps?: SetFlowStepConfig | null) {
  return isPositiveNumber(setFlowSteps?.distanceStep)
    ? setFlowSteps.distanceStep
    : DEFAULT_SET_FLOW_STEPS.distanceStep;
}

function resolveRepValue(args: {
  baseReps: number | null;
  highReps: number | null;
  setIndex: number;
  setCount: number;
  direction: SetFlowDirection;
  step: number | null;
}) {
  const { baseReps, highReps, setIndex, setCount, direction, step } = args;
  if (!isPositiveInteger(baseReps) && !isPositiveInteger(highReps)) {
    return null;
  }

  const low = isPositiveInteger(baseReps) ? baseReps : highReps as number;
  const high = isPositiveInteger(highReps) ? highReps : low;
  const boundedLow = Math.min(low, high);
  if (direction === "straight" || setCount <= 1 || boundedLow === high) {
    return boundedLow;
  }

  if (step) {
    const offset = direction === "down"
      ? step * (setCount - setIndex)
      : step * (setIndex - 1);
    return Math.min(high, boundedLow + offset);
  }

  const progress = (setIndex - 1) / (setCount - 1);
  const raw = direction === "down"
    ? high - ((high - boundedLow) * progress)
    : boundedLow + ((high - boundedLow) * progress);
  return Math.round(raw);
}

function clampPositive(value: number) {
  return Math.max(0, Number(value.toFixed(2)));
}

function stepMetricValue({
  base,
  step,
  setIndex,
  setCount,
  direction,
}: {
  base: number | null;
  step: number;
  setIndex: number;
  setCount: number;
  direction: SetFlowDirection;
}) {
  if (!isPositiveNumber(base)) {
    return null;
  }

  switch (direction) {
  case "up":
    return clampPositive(base - (step * (setCount - setIndex)));
  case "down":
    return clampPositive(base - (step * (setIndex - 1)));
  case "straight":
    return base;
  }
}

function interpolateReps(args: {
  setIndex: number;
  setCount: number;
  minReps: number | null;
  maxReps: number | null;
  direction: SetFlowDirection;
}) {
  const { setIndex, setCount, minReps, maxReps, direction } = args;
  if (!isPositiveInteger(minReps) && !isPositiveInteger(maxReps)) {
    return { repsMin: null, repsMax: null };
  }

  const low = isPositiveInteger(minReps) ? minReps : maxReps as number;
  const high = isPositiveInteger(maxReps) ? maxReps : low;

  if (direction === "straight") {
    return { repsMin: low, repsMax: low };
  }

  if (setCount <= 1 || low === high) {
    return { repsMin: low, repsMax: high };
  }

  const span = Math.max(0, high - low);
  const progress = (setIndex - 1) / (setCount - 1);
  const raw = direction === "down"
    ? high - (span * progress)
    : low + (span * progress);
  const reps = Math.round(raw);

  return { repsMin: reps, repsMax: reps };
}

function buildTarget(args: {
  setIndex: number;
  role: PlannedSetRole;
  label: string;
  plan: ProgressionTargetPlan;
  weight: number | null;
  repsMin: number | null;
  repsMax: number | null;
  durationSeconds?: number | null;
  distance?: number | null;
}): PlannedSetTarget {
  return {
    setIndex: args.setIndex,
    role: args.role,
    label: args.label,
    targetWeight: args.weight,
    targetRepsMin: args.repsMin,
    targetRepsMax: args.repsMax,
    durationSeconds: args.durationSeconds ?? args.plan.durationSeconds ?? null,
    distance: args.distance ?? args.plan.distance ?? null,
    calories: args.plan.calories ?? null,
  };
}

function generateStraightSets(args: {
  setCount: number;
  plan: ProgressionTargetPlan;
  weight: number | null;
  repsMin: number | null;
  repsMax: number | null;
}) {
  return Array.from({ length: args.setCount }, (_, index) => buildTarget({
    setIndex: index + 1,
    role: "work",
    label: `Set ${index + 1} - Work`,
    plan: args.plan,
    weight: args.weight,
    repsMin: args.repsMin,
    repsMax: args.repsMax,
  }));
}

export function generateSetFlowTargets(args: {
  setFlow?: SetFlowId | string | null;
  setFlowDirections?: SetFlowDirectionConfig | null;
  plan: ProgressionTargetPlan | null;
  targetSets?: number | null;
  progressionStepPolicy?: ProgressionStepPolicy | null;
  setFlowSteps?: SetFlowStepConfig | null;
}): PlannedSetTarget[] {
  if (!args.plan) {
    return [];
  }

  const plan = args.plan;
  const measurementType: ProgressionMeasurementType = plan.measurementType;
  if (measurementType === "none") {
    return [];
  }

  const setCount = resolveTargetSets(plan, args.targetSets);
  if (setCount <= 0) {
    return [];
  }

  const normalizedSetFlow = normalizeSetFlowId(args.setFlow) ?? "straight_sets";
  const directions = normalizeSetFlowDirectionConfig(
    args.setFlowDirections,
    getSetFlowDirectionConfigForLegacySetFlow(normalizedSetFlow),
  );
  const weight = resolveSingleValue(plan.weightMin, plan.weightMax);
  const durationSeconds = isPositiveNumber(plan.durationSeconds) ? plan.durationSeconds : null;
  const distance = isPositiveNumber(plan.distance) ? plan.distance : null;
  const repsTarget = isPositiveInteger(plan.repsTarget) ? plan.repsTarget : null;
  const minReps = isPositiveInteger(plan.repsMin) ? plan.repsMin : null;
  const maxReps = isPositiveInteger(plan.repsMax) ? plan.repsMax : minReps;
  const heavySetReps = repsTarget ?? minReps ?? maxReps;
  const highReps = maxReps ?? heavySetReps;
  const straightRepsMin = repsTarget ?? minReps;
  const straightRepsMax = repsTarget ?? maxReps;

  if ((directions.time !== "straight" || directions.distance !== "straight") && (durationSeconds || distance) && measurementType !== "reps") {
    const durationStep = resolveDurationStep(args.setFlowSteps);
    const distanceStep = resolveDistanceStep(args.setFlowSteps);
    return Array.from({ length: setCount }, (_, index) => {
      const setIndex = index + 1;
      return buildTarget({
        setIndex,
        role: directions.time === "up" || directions.distance === "up" ? "ramp" : setIndex === 1 ? "top_set" : "backoff",
        label: directions.time === "up" || directions.distance === "up"
          ? `Set ${setIndex} - Ramp`
          : setIndex === 1
            ? `Set ${setIndex} - Top set`
            : `Set ${setIndex} - Backoff`,
        plan,
        weight: isPositiveNumber(weight) ? weight : null,
        repsMin: minReps,
        repsMax: maxReps,
        durationSeconds: stepMetricValue({ base: durationSeconds, step: durationStep, setIndex, setCount, direction: directions.time }),
        distance: stepMetricValue({ base: distance, step: distanceStep, setIndex, setCount, direction: directions.distance }),
      });
    });
  }

  if (measurementType !== "reps" || !isPositiveNumber(weight)) {
    return generateStraightSets({
      setCount,
      plan,
      weight: null,
      repsMin: minReps,
      repsMax: maxReps,
    });
  }

  const step = resolveLoadStep(args.progressionStepPolicy, args.setFlowSteps);
  const repStep = resolveRepStep(args.setFlowSteps);

  // Weight/load is the primary training-domain signal for role selection: an
  // explicit weight direction always wins. Reps only decides the role when
  // weight itself is "straight" (a reps-only progression), so a combination
  // like weight="down"/reps="down" is correctly a backoff (load dropping),
  // not a ramp -- matching what the load is actually doing, not just reps.
  const isRampRole = directions.weight === "up" || (directions.weight === "straight" && directions.reps === "down");
  const isBackoffRole = directions.weight === "down" || (directions.weight === "straight" && directions.reps === "up");

  if (isRampRole) {
    return Array.from({ length: setCount }, (_, index) => {
      const setIndex = index + 1;
      const repsValue = resolveRepValue({
        baseReps: heavySetReps,
        highReps,
        setIndex,
        setCount,
        direction: directions.reps,
        step: repStep,
      });
      const reps = repsValue
        ? { repsMin: repsValue, repsMax: repsValue }
        : interpolateReps({ setIndex, setCount, minReps, maxReps, direction: directions.reps });
      return buildTarget({
        setIndex,
        role: "ramp",
        label: `Set ${setIndex} - Ramp`,
        plan,
        weight: stepMetricValue({ base: weight, step, setIndex, setCount, direction: directions.weight }) ?? weight,
        repsMin: reps.repsMin,
        repsMax: reps.repsMax,
      });
    });
  }

  if (isBackoffRole) {
    return Array.from({ length: setCount }, (_, index) => {
      const setIndex = index + 1;
      const repsValue = resolveRepValue({
        baseReps: heavySetReps,
        highReps,
        setIndex,
        setCount,
        direction: directions.reps,
        step: repStep,
      });
      const reps = repsValue
        ? { repsMin: repsValue, repsMax: repsValue }
        : interpolateReps({ setIndex, setCount, minReps, maxReps, direction: directions.reps });
      return buildTarget({
        setIndex,
        role: setIndex === 1 ? "top_set" : "backoff",
        label: setIndex === 1 ? `Set ${setIndex} - Top set` : `Set ${setIndex} - Backoff`,
        plan,
        weight: stepMetricValue({ base: weight, step, setIndex, setCount, direction: directions.weight }) ?? weight,
        repsMin: reps.repsMin,
        repsMax: reps.repsMax,
      });
    });
  }

  return generateStraightSets({
    setCount,
    plan,
    weight,
    repsMin: straightRepsMin,
    repsMax: straightRepsMax,
  });
}

export function describePlannedSetTarget(target: PlannedSetTarget) {
  const parts = [
    target.targetWeight !== null ? `${target.targetWeight} lb` : null,
    target.targetRepsMin !== null && target.targetRepsMax !== null
      ? target.targetRepsMin === target.targetRepsMax
        ? `${target.targetRepsMin} reps`
        : `${target.targetRepsMin}-${target.targetRepsMax} reps`
      : null,
    target.durationSeconds !== null ? `${target.durationSeconds}s` : null,
    target.distance !== null ? `${target.distance}` : null,
    target.calories !== null ? `${target.calories} cal` : null,
  ].filter((value): value is string => Boolean(value));

  return `${target.label}${parts.length > 0 ? `: ${parts.join(" x ")}` : ""}`;
}
