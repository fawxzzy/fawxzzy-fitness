import { DEFAULT_PROGRESSION_STEP_OVERRIDES } from "@/lib/progression-step-defaults";
import type { FitnessDistanceUnit } from "@/lib/fitness-distance-units";
import {
  validateProgressionPlaybookSelection,
  type ProgressionTargetPlan,
} from "@/lib/progression-playbooks";
import type { SetFlowDirection } from "@/lib/set-flow-directions";

type EffortScheduleTargetRow = {
  measurement_type?: "reps" | "time" | "distance" | "time_distance" | "none" | null;
  target_sets?: number | null;
  target_reps?: number | null;
  target_reps_min?: number | null;
  target_reps_max?: number | null;
  target_weight?: number | null;
  target_weight_unit?: "lbs" | "kg" | null;
  target_duration_seconds?: number | null;
  target_distance?: number | null;
  target_distance_unit?: FitnessDistanceUnit | null;
  target_calories?: number | null;
  progression_playbook_id?: unknown;
  progression_playbook_config?: unknown;
};

const DEFAULT_EFFORT_WAVE_DIRECTIONS: SetFlowDirection[] = [
  "straight",
  "straight",
  "straight",
  "straight",
  "straight",
  "straight",
  "straight",
];

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function roundMetric(value: number, decimals = 3) {
  return Number(value.toFixed(decimals));
}

function normalizeDirection(value: unknown): SetFlowDirection {
  return value === "up" || value === "down" ? value : "straight";
}

function resolveEffortDirection(args: {
  routineDayIndex: number | null | undefined;
  directions: SetFlowDirection[];
}) {
  if (!Number.isInteger(args.routineDayIndex) || Number(args.routineDayIndex) <= 0) {
    return "straight";
  }

  const index = (Number(args.routineDayIndex) - 1) % args.directions.length;
  return args.directions[index] ?? "straight";
}

function resolveEffortOffset(direction: SetFlowDirection) {
  if (direction === "up") {
    return 1;
  }

  if (direction === "down") {
    return -1;
  }

  return 0;
}

function shiftInteger(value: number | null | undefined, step: number, offset: number) {
  if (!isPositiveNumber(value) || !isPositiveNumber(step) || offset === 0) {
    return value ?? null;
  }

  return Math.max(1, Math.round(value + (step * offset)));
}

function shiftNumber(value: number | null | undefined, step: number, offset: number, minimum = 0) {
  if (!isPositiveNumber(value) || !isPositiveNumber(step) || offset === 0) {
    return value ?? null;
  }

  return Math.max(minimum, roundMetric(value + (step * offset)));
}

function resolveEffortStepConfig(config: NonNullable<ReturnType<typeof validateProgressionPlaybookSelection>>["config"]) {
  const loadStep = config.dayProgressionMode === "synced"
    ? config.loadIncrement
    : config.dayProgressionSteps?.loadStep
      ?? config.stepOverrides?.barbellLoadIncrement
      ?? config.loadIncrement;
  const repStep = config.dayProgressionMode === "synced"
    ? config.stepOverrides?.bodyweightRepIncrement
      ?? DEFAULT_PROGRESSION_STEP_OVERRIDES.bodyweightRepIncrement
    : config.dayProgressionSteps?.repStep
      ?? config.stepOverrides?.bodyweightRepIncrement
      ?? DEFAULT_PROGRESSION_STEP_OVERRIDES.bodyweightRepIncrement;
  const durationStep = config.dayProgressionMode === "synced"
    ? config.stepOverrides?.durationSecondsIncrement
      ?? DEFAULT_PROGRESSION_STEP_OVERRIDES.durationSecondsIncrement
    : config.dayProgressionSteps?.durationSecondsStep
      ?? config.stepOverrides?.durationSecondsIncrement
      ?? DEFAULT_PROGRESSION_STEP_OVERRIDES.durationSecondsIncrement;
  const distanceStep = config.dayProgressionMode === "synced"
    ? config.stepOverrides?.distanceIncrement
      ?? DEFAULT_PROGRESSION_STEP_OVERRIDES.distanceIncrement
    : config.dayProgressionSteps?.distanceStep
      ?? config.stepOverrides?.distanceIncrement
      ?? DEFAULT_PROGRESSION_STEP_OVERRIDES.distanceIncrement;

  return {
    loadStep,
    repStep,
    durationStep,
    distanceStep,
  };
}

function resolveEffortSelection(args: {
  playbookId: unknown;
  config: unknown;
  routineDayIndex: number | null | undefined;
}) {
  const selection = validateProgressionPlaybookSelection({
    playbookId: args.playbookId,
    config: args.config,
  });

  if (!selection) {
    return null;
  }

  const directions = Array.isArray(selection.config.effortWaveDirections) && selection.config.effortWaveDirections.length > 0
    ? selection.config.effortWaveDirections.map(normalizeDirection)
    : DEFAULT_EFFORT_WAVE_DIRECTIONS;
  const direction = resolveEffortDirection({
    routineDayIndex: args.routineDayIndex,
    directions,
  });
  const offset = resolveEffortOffset(direction);

  if (offset === 0) {
    return null;
  }

  return {
    selection,
    direction,
    offset,
    steps: resolveEffortStepConfig(selection.config),
  };
}

export function applyEffortScheduleToProgressionTargetPlan(args: {
  playbookId: unknown;
  config: unknown;
  routineDayIndex: number | null | undefined;
  plan: ProgressionTargetPlan | null;
}): ProgressionTargetPlan | null {
  if (!args.plan) {
    return null;
  }

  const effort = resolveEffortSelection(args);
  if (!effort) {
    return args.plan;
  }

  const { plan } = args;
  const { offset, steps } = effort;

  if (plan.measurementType === "reps") {
    return {
      ...plan,
      repsTarget: shiftInteger(plan.repsTarget ?? null, steps.repStep, offset),
      repsMin: shiftInteger(plan.repsMin ?? null, steps.repStep, offset),
      repsMax: shiftInteger(plan.repsMax ?? null, steps.repStep, offset),
      weightMin: shiftNumber(plan.weightMin ?? null, steps.loadStep, offset, 0),
      weightMax: shiftNumber(plan.weightMax ?? null, steps.loadStep, offset, 0),
    };
  }

  if (plan.measurementType === "time") {
    return {
      ...plan,
      durationSeconds: shiftInteger(plan.durationSeconds ?? null, steps.durationStep, offset),
    };
  }

  if (plan.measurementType === "distance") {
    return {
      ...plan,
      distance: shiftNumber(plan.distance ?? null, steps.distanceStep, offset, 0.01),
    };
  }

  if (plan.measurementType === "time_distance") {
    return {
      ...plan,
      durationSeconds: shiftInteger(plan.durationSeconds ?? null, steps.durationStep, offset),
      distance: shiftNumber(plan.distance ?? null, steps.distanceStep, offset, 0.01),
    };
  }

  return plan;
}

export function applyEffortScheduleToRoutineDayExercise<T extends EffortScheduleTargetRow>(args: {
  exercise: T;
  routineDayIndex: number | null | undefined;
}): T {
  const effectivePlan = applyEffortScheduleToProgressionTargetPlan({
    playbookId: args.exercise.progression_playbook_id,
    config: args.exercise.progression_playbook_config ?? null,
    routineDayIndex: args.routineDayIndex,
    plan: {
      measurementType: args.exercise.measurement_type ?? "reps",
      setsMin: args.exercise.target_sets ?? null,
      setsMax: args.exercise.target_sets ?? null,
      repsTarget: args.exercise.target_reps ?? null,
      repsMin: args.exercise.target_reps_min ?? args.exercise.target_reps ?? null,
      repsMax: args.exercise.target_reps_max ?? args.exercise.target_reps ?? null,
      weightMin: args.exercise.target_weight ?? null,
      weightMax: args.exercise.target_weight ?? null,
      weightUnit: args.exercise.target_weight_unit ?? null,
      durationSeconds: args.exercise.target_duration_seconds ?? null,
      distance: args.exercise.target_distance ?? null,
      distanceUnit: args.exercise.target_distance_unit ?? null,
      calories: args.exercise.target_calories ?? null,
    },
  });

  if (!effectivePlan) {
    return args.exercise;
  }

  return {
    ...args.exercise,
    target_reps: effectivePlan.repsTarget ?? null,
    target_reps_min: effectivePlan.repsMin ?? null,
    target_reps_max: effectivePlan.repsMax ?? null,
    target_weight: effectivePlan.weightMax ?? effectivePlan.weightMin ?? null,
    target_weight_unit: effectivePlan.weightUnit ?? args.exercise.target_weight_unit ?? null,
    target_duration_seconds: effectivePlan.durationSeconds ?? null,
    target_distance: effectivePlan.distance ?? null,
    target_distance_unit: effectivePlan.distanceUnit ?? args.exercise.target_distance_unit ?? null,
    target_calories: effectivePlan.calories ?? null,
    measurement_type: effectivePlan.measurementType,
  };
}
