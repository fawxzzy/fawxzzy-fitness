import { normalizeStepSize } from "@/lib/progression-measurement-steps";
import type { ProgressionTargetPlan } from "@/lib/progression-playbooks";
import type { ProgressionStepPolicy } from "@/lib/progression-step-policy";
import { applyTargetMutation } from "@/lib/progression-target-mutation";

export type EffortWaveDirection =
  | "down"
  | "baseline"
  | "up";

export type EffortWaveDayMagnitude =
  | "one_step"
  | "percent"
  | "custom";

export type EffortWaveDayConfig = {
  cycleDayIndex: number;
  direction: EffortWaveDirection;
  magnitude?: EffortWaveDayMagnitude;
  percent?: number | null;
};

export type EffortWaveConfig = {
  enabled: boolean;
  anchor: "routine_cycle";
  days: EffortWaveDayConfig[];
};

type NormalizedEffortWaveDayConfig = {
  cycleDayIndex: number;
  direction: EffortWaveDirection;
  magnitude: EffortWaveDayMagnitude;
  percent: number | null;
};

export type EffortWaveResolution = {
  effectiveTarget: ProgressionTargetPlan;
  direction: EffortWaveDirection;
  changed: boolean;
  appliedDay: EffortWaveDayConfig | null;
  status: "baseline" | "shifted" | "unsupported";
};

export type EffortWaveCycleDayState = {
  cycleDayIndex: number;
  direction: EffortWaveDirection;
  magnitude: EffortWaveDayMagnitude;
};

const DEFAULT_DAY_MAGNITUDE: EffortWaveDayMagnitude = "one_step";
const MAX_SAFE_PERCENT = 0.5;

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function normalizePositiveInteger(value: unknown) {
  return isPositiveInteger(value) ? value : null;
}

function normalizePositiveNumber(value: unknown) {
  return isPositiveNumber(value) ? Number(value.toFixed(4)) : null;
}

function normalizePercent(value: unknown) {
  if (!isPositiveNumber(value)) {
    return null;
  }

  const normalized = value > 1 ? value / 100 : value;
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return null;
  }

  return Math.min(Number(normalized.toFixed(4)), MAX_SAFE_PERCENT);
}

function clonePlan(plan: ProgressionTargetPlan): ProgressionTargetPlan {
  return { ...plan };
}

function plansMatch(left: ProgressionTargetPlan, right: ProgressionTargetPlan) {
  return left.measurementType === right.measurementType
    && (left.setsMin ?? null) === (right.setsMin ?? null)
    && (left.setsMax ?? null) === (right.setsMax ?? null)
    && (left.repsTarget ?? null) === (right.repsTarget ?? null)
    && (left.repsMin ?? null) === (right.repsMin ?? null)
    && (left.repsMax ?? null) === (right.repsMax ?? null)
    && (left.weightMin ?? null) === (right.weightMin ?? null)
    && (left.weightMax ?? null) === (right.weightMax ?? null)
    && (left.weightUnit ?? null) === (right.weightUnit ?? null)
    && (left.durationSeconds ?? null) === (right.durationSeconds ?? null)
    && (left.distance ?? null) === (right.distance ?? null)
    && (left.distanceUnit ?? null) === (right.distanceUnit ?? null)
    && (left.calories ?? null) === (right.calories ?? null);
}

function normalizeDayMagnitude(value: unknown) {
  return value === "percent" || value === "custom" || value === "one_step"
    ? value
    : DEFAULT_DAY_MAGNITUDE;
}

function normalizeDirection(value: unknown): EffortWaveDirection {
  return value === "down" || value === "up" || value === "baseline"
    ? value
    : "baseline";
}

export function normalizeEffortWaveConfig(config: EffortWaveConfig | null | undefined): EffortWaveConfig | null {
  if (!config || config.enabled !== true || config.anchor !== "routine_cycle" || !Array.isArray(config.days)) {
    return null;
  }

  const days = config.days
    .map((day) => {
      const cycleDayIndex = normalizePositiveInteger(day?.cycleDayIndex);
      if (cycleDayIndex === null) {
        return null;
      }

      return {
        cycleDayIndex,
        direction: normalizeDirection(day?.direction),
        magnitude: normalizeDayMagnitude(day?.magnitude),
        percent: normalizePercent(day?.percent),
      } satisfies NormalizedEffortWaveDayConfig;
    })
    .filter((day): day is NormalizedEffortWaveDayConfig => Boolean(day));

  if (days.length === 0) {
    return {
      enabled: true,
      anchor: "routine_cycle",
      days: [],
    };
  }

  const deduped = new Map<number, NormalizedEffortWaveDayConfig>();
  for (const day of days) {
    deduped.set(day.cycleDayIndex, day);
  }

  return {
    enabled: true,
    anchor: "routine_cycle",
    days: Array.from(deduped.values()).sort((left, right) => left.cycleDayIndex - right.cycleDayIndex),
  };
}

export function buildEffortWaveCycleDayStates(args: {
  cycleLengthDays?: number | null;
  config?: EffortWaveConfig | null;
}) {
  const cycleLengthDays = normalizePositiveInteger(args.cycleLengthDays);
  if (cycleLengthDays === null) {
    return [] as EffortWaveCycleDayState[];
  }

  const normalizedConfig = normalizeEffortWaveConfig(args.config);
  const dayLookup = new Map<number, EffortWaveDayConfig>();
  for (const day of normalizedConfig?.days ?? []) {
    dayLookup.set(day.cycleDayIndex, day);
  }

  return Array.from({ length: cycleLengthDays }, (_, offset) => {
    const cycleDayIndex = offset + 1;
    const dayConfig = dayLookup.get(cycleDayIndex);
    return {
      cycleDayIndex,
      direction: dayConfig?.direction ?? "baseline",
      magnitude: dayConfig?.magnitude ?? DEFAULT_DAY_MAGNITUDE,
    } satisfies EffortWaveCycleDayState;
  });
}

export function setEffortWaveDayDirection(args: {
  config?: EffortWaveConfig | null;
  cycleDayIndex: number;
  direction: EffortWaveDirection;
}) {
  const cycleDayIndex = normalizePositiveInteger(args.cycleDayIndex);
  if (cycleDayIndex === null) {
    return normalizeEffortWaveConfig(args.config);
  }

  const normalizedConfig = normalizeEffortWaveConfig(args.config) ?? {
    enabled: true,
    anchor: "routine_cycle" as const,
    days: [],
  };
  const filteredDays = normalizedConfig.days.filter((day) => day.cycleDayIndex !== cycleDayIndex);

  if (args.direction === "baseline") {
    return {
      ...normalizedConfig,
      days: filteredDays,
    } satisfies EffortWaveConfig;
  }

  return {
    ...normalizedConfig,
    days: [
      ...filteredDays,
      {
        cycleDayIndex,
        direction: args.direction,
        magnitude: DEFAULT_DAY_MAGNITUDE,
        percent: null,
      },
    ].sort((left, right) => left.cycleDayIndex - right.cycleDayIndex),
  } satisfies EffortWaveConfig;
}

function resolveStrengthMutationTarget(plan: ProgressionTargetPlan) {
  const hasWeight = isPositiveNumber(plan.weightMin) || isPositiveNumber(plan.weightMax);
  const hasReps = isPositiveInteger(plan.repsTarget) || isPositiveInteger(plan.repsMin) || isPositiveInteger(plan.repsMax);

  if (hasWeight && hasReps) {
    return "increase_load_and_reps" as const;
  }

  if (hasWeight) {
    return "increase_load" as const;
  }

  if (hasReps) {
    return "increase_reps" as const;
  }

  return "none" as const;
}

function resolveWaveMutationTarget(plan: ProgressionTargetPlan) {
  switch (plan.measurementType) {
  case "time":
    return "increase_duration" as const;
  case "distance":
    return "increase_distance" as const;
  case "time_distance":
    return "increase_duration_and_distance" as const;
  case "none":
    return "none" as const;
  case "reps":
  default:
    return resolveStrengthMutationTarget(plan);
  }
}

function resolveRepStepValue(value: number | null | undefined) {
  return isPositiveInteger(value) ? value : null;
}

function applyUpStep(args: {
  plan: ProgressionTargetPlan;
  progressionStepPolicy?: ProgressionStepPolicy | null;
  loadStep?: number | null;
  repStep?: number | null;
  durationSecondsStep?: number | null;
  distanceStep?: number | null;
}) {
  const result = applyTargetMutation({
    plan: args.plan,
    targetMutation: resolveWaveMutationTarget(args.plan),
    progressionStepPolicy: args.progressionStepPolicy,
    loadStep: normalizeStepSize(args.loadStep),
    repStep: resolveRepStepValue(args.repStep),
    durationSecondsStep: normalizeStepSize(args.durationSecondsStep),
    distanceStep: normalizeStepSize(args.distanceStep),
  });

  return result?.proposedTarget ?? null;
}

function reduceValue(current: number | null | undefined, step: number | null, decimals = 4) {
  if (!isPositiveNumber(current) || !isPositiveNumber(step)) {
    return current ?? null;
  }

  const nextValue = Number((current - step).toFixed(decimals));
  return nextValue > 0 ? nextValue : current;
}

function reduceIntegerValue(current: number | null | undefined, step: number | null) {
  if (!isPositiveInteger(current) || !isPositiveInteger(step)) {
    return current ?? null;
  }

  const nextValue = current - step;
  return nextValue > 0 ? nextValue : current;
}

function applyDownStep(args: {
  plan: ProgressionTargetPlan;
  progressionStepPolicy?: ProgressionStepPolicy | null;
  loadStep?: number | null;
  repStep?: number | null;
  durationSecondsStep?: number | null;
  distanceStep?: number | null;
}): ProgressionTargetPlan | null {
  const loadStep = normalizeStepSize(args.loadStep)
    ?? (
      args.progressionStepPolicy?.kind === "load" && isPositiveNumber(args.progressionStepPolicy.defaultValue)
        ? Number(args.progressionStepPolicy.defaultValue.toFixed(4))
        : null
    );
  const repStep = resolveRepStepValue(args.repStep)
    ?? (
      args.progressionStepPolicy?.kind === "reps" && isPositiveInteger(args.progressionStepPolicy.defaultValue)
        ? args.progressionStepPolicy.defaultValue
        : 1
    );
  const durationSecondsStep = normalizeStepSize(args.durationSecondsStep)
    ?? (
      args.progressionStepPolicy?.kind === "duration" && isPositiveNumber(args.progressionStepPolicy.defaultValue)
        ? Number(args.progressionStepPolicy.defaultValue.toFixed(4))
        : null
    );
  const distanceStep = normalizeStepSize(args.distanceStep)
    ?? (
      (args.progressionStepPolicy?.kind === "distance" || args.progressionStepPolicy?.kind === "pace_or_volume")
      && isPositiveNumber(args.progressionStepPolicy.defaultValue)
        ? Number(args.progressionStepPolicy.defaultValue.toFixed(4))
        : null
    );

  switch (resolveWaveMutationTarget(args.plan)) {
  case "increase_load_and_reps":
    return {
      ...args.plan,
      weightMin: reduceValue(args.plan.weightMin, loadStep),
      weightMax: reduceValue(args.plan.weightMax, loadStep),
      repsTarget: reduceIntegerValue(args.plan.repsTarget, repStep),
      repsMin: reduceIntegerValue(args.plan.repsMin, repStep),
      repsMax: reduceIntegerValue(args.plan.repsMax, repStep),
    };
  case "increase_load":
    return {
      ...args.plan,
      weightMin: reduceValue(args.plan.weightMin, loadStep),
      weightMax: reduceValue(args.plan.weightMax, loadStep),
    };
  case "increase_reps":
    return {
      ...args.plan,
      repsTarget: reduceIntegerValue(args.plan.repsTarget, repStep),
      repsMin: reduceIntegerValue(args.plan.repsMin, repStep),
      repsMax: reduceIntegerValue(args.plan.repsMax, repStep),
    };
  case "increase_duration":
    return {
      ...args.plan,
      durationSeconds: reduceValue(args.plan.durationSeconds, durationSecondsStep, 0),
    };
  case "increase_distance":
    return {
      ...args.plan,
      distance: reduceValue(args.plan.distance, distanceStep, 3),
    };
  case "increase_duration_and_distance":
    return {
      ...args.plan,
      durationSeconds: reduceValue(args.plan.durationSeconds, durationSecondsStep, 0),
      distance: reduceValue(args.plan.distance, distanceStep, 3),
    };
  case "none":
  default:
    return clonePlan(args.plan);
  }
}

function applyPercentModifier(args: {
  plan: ProgressionTargetPlan;
  direction: EffortWaveDirection;
  percent: number;
}) {
  const multiplier = args.direction === "down"
    ? 1 - args.percent
    : 1 + args.percent;

  const nextPlan = clonePlan(args.plan);

  if (isPositiveNumber(nextPlan.weightMin)) {
    nextPlan.weightMin = Number((nextPlan.weightMin * multiplier).toFixed(4));
  }
  if (isPositiveNumber(nextPlan.weightMax)) {
    nextPlan.weightMax = Number((nextPlan.weightMax * multiplier).toFixed(4));
  }
  if (isPositiveInteger(nextPlan.durationSeconds)) {
    nextPlan.durationSeconds = Math.max(1, Math.round(nextPlan.durationSeconds * multiplier));
  }
  if (isPositiveNumber(nextPlan.distance)) {
    nextPlan.distance = Number(Math.max(0.001, nextPlan.distance * multiplier).toFixed(3));
  }
  if (isPositiveNumber(nextPlan.calories)) {
    nextPlan.calories = Number(Math.max(1, nextPlan.calories * multiplier).toFixed(1));
  }

  if (
    !isPositiveNumber(nextPlan.weightMin)
    && !isPositiveNumber(nextPlan.weightMax)
    && !isPositiveInteger(nextPlan.durationSeconds)
    && !isPositiveNumber(nextPlan.distance)
    && !isPositiveNumber(nextPlan.calories)
  ) {
    return clonePlan(args.plan);
  }

  return nextPlan;
}

export function resolveEffectiveTargetForCycleDay(args: {
  plan: ProgressionTargetPlan;
  config?: EffortWaveConfig | null;
  cycleDayIndex?: number | null;
  progressionStepPolicy?: ProgressionStepPolicy | null;
  loadStep?: number | null;
  repStep?: number | null;
  durationSecondsStep?: number | null;
  distanceStep?: number | null;
}): EffortWaveResolution {
  const basePlan = clonePlan(args.plan);
  const normalizedConfig = normalizeEffortWaveConfig(args.config);
  const cycleDayIndex = normalizePositiveInteger(args.cycleDayIndex);

  if (!normalizedConfig || cycleDayIndex === null) {
    return {
      effectiveTarget: basePlan,
      direction: "baseline",
      changed: false,
      appliedDay: null,
      status: "baseline",
    };
  }

  const dayConfig = normalizedConfig.days.find((day) => day.cycleDayIndex === cycleDayIndex) ?? null;
  if (!dayConfig || dayConfig.direction === "baseline") {
    return {
      effectiveTarget: basePlan,
      direction: dayConfig?.direction ?? "baseline",
      changed: false,
      appliedDay: dayConfig,
      status: "baseline",
    };
  }

  if (dayConfig.magnitude === "custom") {
    return {
      effectiveTarget: basePlan,
      direction: dayConfig.direction,
      changed: false,
      appliedDay: dayConfig,
      status: "unsupported",
    };
  }

  const effectiveTarget = dayConfig.magnitude === "percent" && dayConfig.percent
    ? applyPercentModifier({
      plan: basePlan,
      direction: dayConfig.direction,
      percent: dayConfig.percent,
    })
    : dayConfig.direction === "up"
      ? applyUpStep({
        plan: basePlan,
        progressionStepPolicy: args.progressionStepPolicy,
        loadStep: args.loadStep,
        repStep: args.repStep,
        durationSecondsStep: args.durationSecondsStep,
        distanceStep: args.distanceStep,
      })
      : applyDownStep({
        plan: basePlan,
        progressionStepPolicy: args.progressionStepPolicy,
        loadStep: args.loadStep,
        repStep: args.repStep,
        durationSecondsStep: args.durationSecondsStep,
        distanceStep: args.distanceStep,
      });

  if (!effectiveTarget) {
    return {
      effectiveTarget: basePlan,
      direction: dayConfig.direction,
      changed: false,
      appliedDay: dayConfig,
      status: "unsupported",
    };
  }

  return {
    effectiveTarget,
    direction: dayConfig.direction,
    changed: !plansMatch(basePlan, effectiveTarget),
    appliedDay: dayConfig,
    status: plansMatch(basePlan, effectiveTarget) ? "baseline" : "shifted",
  };
}
