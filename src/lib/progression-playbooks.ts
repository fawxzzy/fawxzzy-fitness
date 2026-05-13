import { formatWeight } from "@/lib/formatting";
import {
  detectActiveMeasurementsFromTargets,
  getPromotionMeasurementKey,
  normalizePromotionMeasurements,
  type ProgressionMeasurementKey,
  type PromotionMeasurementKey,
} from "@/lib/progression-active-measurements";
import { resolveCardioVectorMode } from "@/lib/cardio-progression-vectors";
import {
  inferProgressionStepPolicy,
  type ProgressionStepPolicy,
} from "@/lib/progression-step-policy";
import {
  DEFAULT_PROGRESSION_PROMOTION_BASIS,
  DEFAULT_REP_PROMOTION_THRESHOLD,
  getRepPromotionTarget,
  normalizeProgressionPromotionConfig,
  normalizePromotionBasis,
  normalizeRepPromotionThreshold,
  type ProgressionPromotionBasis,
  type RepPromotionThreshold,
} from "@/lib/progression-promotion";
import {
  applyTargetMutation,
  getDefaultStrengthTargetMutationForPromotionBasis,
  normalizeTargetMutation,
  PROGRESSION_TARGET_MUTATION_IDS,
  type ProgressionTargetMutationId,
} from "@/lib/progression-target-mutation";
import {
  normalizeEffortWaveConfig,
  type EffortWaveConfig,
} from "@/lib/progression-effort-wave";
import {
  normalizeFocusTargetSeedId,
  type FocusTargetSeedId,
} from "@/lib/focus-target-seeds";
import {
  buildQualificationWindowStatus,
  evaluateQualificationWindow,
  normalizeQualificationWindowConfig,
  type QualificationSessionEvidence,
  type QualificationWindowConfig,
  type QualificationWindowResult,
} from "@/lib/progression-qualification-window";
import { DEFAULT_PROGRESSION_STEP_OVERRIDES, DEFAULT_SET_FLOW_STEPS } from "@/lib/progression-step-defaults";

export const PROGRESSION_PLAYBOOK_IDS = [
  "double_progression",
  "fixed_load_rep_range_progression",
  "deload_after_stall",
] as const;

export const TRAINING_GOAL_IDS = [
  "build_muscle",
  "build_strength",
  "maintain",
  "conditioning",
  "technique_rehab",
] as const;

export type ProgressionPlaybookId = (typeof PROGRESSION_PLAYBOOK_IDS)[number];
export type ProgressionMethodId = Exclude<ProgressionPlaybookId, "deload_after_stall">;
export type ProgressionStallPolicy = "none" | "deload_after_stall";
export type ProgressionMeasurementType = "reps" | "time" | "distance" | "time_distance" | "none";
export type ProgressionMethodLayerId = "manual" | "double_progression" | "hold_and_review" | "cardio_progression";
export type TrainingGoalId = (typeof TRAINING_GOAL_IDS)[number];
export type SetFlowId = "straight_sets" | "ascending_ramp" | "descending_backoff";
export type FutureSetFlowId = "pyramid" | "drop_set" | "cluster";
export type IntensityTargetId = "none" | "last_set_failure" | "all_work_sets_failure" | "amrap_final_set";
export type PromotionPolicyId = "manual_review" | "auto_at_cycle_start";

export type ProgressionLayerModel = {
  trainingGoal: TrainingGoalId;
  measurementType: ProgressionMeasurementType;
  progressionMethod: ProgressionMethodLayerId;
  setFlow: SetFlowId;
  intensityTarget: IntensityTargetId;
  regressionPolicy: ProgressionStallPolicy;
  promotionPolicy: PromotionPolicyId;
};

export type ProgressionInfoTermDefinition = {
  term: string;
  meaning: string;
  affects: string;
  example: string;
};

export const SET_FLOW_DEFINITIONS: Record<SetFlowId, {
  id: SetFlowId;
  label: string;
  shortExplanation: string;
}> = {
  straight_sets: {
    id: "straight_sets",
    label: "Straight Sets",
    shortExplanation: "Use the same target across all checked work sets.",
  },
  ascending_ramp: {
    id: "ascending_ramp",
    label: "Ascending Sets",
    shortExplanation: "Increase load across sets while reps usually move down.",
  },
  descending_backoff: {
    id: "descending_backoff",
    label: "Descending Sets",
    shortExplanation: "Start heavier, then reduce load to accumulate cleaner work.",
  },
};

export const FUTURE_SET_FLOW_DEFINITIONS: Record<FutureSetFlowId, {
  id: FutureSetFlowId;
  label: string;
  shortExplanation: string;
}> = {
  pyramid: {
    id: "pyramid",
    label: "Pyramid",
    shortExplanation: "Move load and reps in opposite directions across a sequence.",
  },
  drop_set: {
    id: "drop_set",
    label: "Drop Set",
    shortExplanation: "Reduce load after a hard set and continue with minimal rest.",
  },
  cluster: {
    id: "cluster",
    label: "Cluster",
    shortExplanation: "Break heavy work into mini-bursts with short intra-set rests.",
  },
};

export const TRAINING_GOAL_DEFINITIONS: Record<TrainingGoalId, {
  id: TrainingGoalId;
  label: string;
  meaning: string;
  affects: string;
  example: string;
  defaultModel: Omit<ProgressionLayerModel, "trainingGoal" | "measurementType">;
}> = {
  build_muscle: {
    id: "build_muscle",
    label: "Build Muscle",
    meaning: "Prioritizes muscle growth through repeatable volume and gradual progression.",
    affects: "Seeds moderate rep ranges, Overloaded targets, and optional failure settings.",
    example: "Build reps at the same load before increasing.",
    defaultModel: {
      progressionMethod: "double_progression",
      setFlow: "straight_sets",
      intensityTarget: "last_set_failure",
      regressionPolicy: "none",
      promotionPolicy: "manual_review",
    },
  },
  build_strength: {
    id: "build_strength",
    label: "Build Strength",
    meaning: "Prioritizes heavier targets and clear progression.",
    affects: "Seeds Overloaded targets and makes Deload policy available.",
    example: "Earn a load increase after hitting top reps across checked sets.",
    defaultModel: {
      progressionMethod: "double_progression",
      setFlow: "straight_sets",
      intensityTarget: "none",
      regressionPolicy: "deload_after_stall",
      promotionPolicy: "manual_review",
    },
  },
  maintain: {
    id: "maintain",
    label: "Maintain",
    meaning: "Keeps training consistent without pushing frequent increases.",
    affects: "Seeds Manual Review style defaults.",
    example: "Hold targets steady and review changes manually.",
    defaultModel: {
      progressionMethod: "manual",
      setFlow: "straight_sets",
      intensityTarget: "none",
      regressionPolicy: "none",
      promotionPolicy: "manual_review",
    },
  },
  conditioning: {
    id: "conditioning",
    label: "Conditioning",
    meaning: "Prioritizes time, distance, pace, or endurance.",
    affects: "Uses metric-aware progression instead of strength load.",
    example: "Increase duration or distance instead of weight.",
    defaultModel: {
      progressionMethod: "cardio_progression",
      setFlow: "straight_sets",
      intensityTarget: "none",
      regressionPolicy: "none",
      promotionPolicy: "manual_review",
    },
  },
  technique_rehab: {
    id: "technique_rehab",
    label: "Technique / Rehab",
    meaning: "Prioritizes control, form, and consistency.",
    affects: "Seeds Manual targets and avoids failure defaults.",
    example: "Hold the target steady until movement quality is reliable.",
    defaultModel: {
      progressionMethod: "manual",
      setFlow: "straight_sets",
      intensityTarget: "none",
      regressionPolicy: "none",
      promotionPolicy: "manual_review",
    },
  },
};

export const PROGRESSION_INFO_TERM_DEFINITIONS: ProgressionInfoTermDefinition[] = [
  {
    term: "Sets",
    meaning: "Work sets checked by the rule.",
    affects: "How many sets must hit the target before promotion or review.",
    example: "Sets = 3 means all 3 work sets are checked.",
  },
  {
    term: "Min reps",
    meaning: "Lower bound of the target range.",
    affects: "Miss detection and rebuild targets.",
    example: "8-12 means 8 is the floor.",
  },
  {
    term: "Max reps",
    meaning: "Top of the target range.",
    affects: "Promotion or review threshold.",
    example: "In Overloaded mode, hitting 12 on all checked sets can earn promotion.",
  },
  {
    term: "Load",
    meaning: "Weight target for strength exercises.",
    affects: "Strength targets and deload math when the progression step is load-based.",
    example: "135 lb can promote to 145 lb with a 10 lb barbell step.",
  },
  {
    term: "Progression step",
    meaning: "Amount the target changes when promoted or regressed.",
    affects: "Load, reps, duration, distance, or pace depending exercise type.",
    example: "Barbell step 10 lb means 135 can promote to 145.",
  },
  {
    term: "Duration step",
    meaning: "Amount a time target changes when promoted.",
    affects: "Time-based cardio progression.",
    example: "Duration step 60 seconds means 20:00 can promote to 21:00.",
  },
  {
    term: "Distance step",
    meaning: "Amount a distance target changes when promoted.",
    affects: "Distance-based cardio progression.",
    example: "Distance step 0.1 mi means 2.0 mi can promote to 2.1 mi.",
  },
  {
    term: "Pace / volume step",
    meaning: "How a time + distance target changes when promoted.",
    affects: "Combined cardio targets that track both duration and distance.",
    example: "Hold 20:00 and increase distance from 2.0 mi to 2.1 mi.",
  },
  {
    term: "Equipment step",
    meaning: "Default step based on equipment.",
    affects: "Dumbbells usually move differently than barbells or machines.",
    example: "Dumbbell step 5 lb per dumbbell; barbell step 10 lb total.",
  },
  {
    term: "Sets flow",
    meaning: "How targets change across sets inside today's workout.",
    affects: "Whether sets are straight, ramped, descending, or another structure.",
    example: "Ascending ramp builds toward heavier sets across the exercise.",
  },
  {
    term: "Stall",
    meaning: "Repeated logged misses against the current goal.",
    affects: "When regression policy activates.",
    example: "Stall = 2 means two missed attempts can trigger deload.",
  },
  {
    term: "Deload",
    meaning: "Reduce target difficulty to rebuild.",
    affects: "Load, time, or distance depending measurement type.",
    example: "200 lb with 10% deload becomes about 180 lb.",
  },
  {
    term: "Failure",
    meaning: "A set continues until no clean rep remains.",
    affects: "Intensity and fatigue, not progression method.",
    example: "Last-set failure means only the final work set is AMRAP.",
  },
  {
    term: "Start date",
    meaning: "The date that anchors cycle Day 1.",
    affects: "Which routine day appears on Today.",
    example: "Start Monday with a 3-day cycle makes Thursday Day 1 again.",
  },
  {
    term: "Cycle length",
    meaning: "Number of days before the routine repeats.",
    affects: "Today calculation and cycle review timing.",
    example: "3 days means Day 1 -> Day 2 -> Day 3 -> Day 1.",
  },
  {
    term: "Promotion",
    meaning: "An earned increase or improvement target.",
    affects: "Next-cycle goals.",
    example: "135 -> 140 after top range is reached.",
  },
  {
    term: "Review",
    meaning: "User approval before changing goals.",
    affects: "Manual promotion workflows.",
    example: "Manual Review marks range complete but waits for user approval.",
  },
  {
    term: "Customized",
    meaning: "Current settings differ from the selected Training Focus defaults.",
    affects: "The app preserves your exact settings instead of reapplying the goal seed.",
    example: "Build Muscle can still use Manual Review if you customize it.",
  },
];

export type ProgressionStepOverrideConfig = {
  barbellLoadIncrement?: number;
  dumbbellLoadIncrement?: number;
  machineLoadIncrement?: number;
  cableLoadIncrement?: number;
  bodyweightRepIncrement?: number;
  durationSecondsIncrement?: number;
  distanceIncrement?: number;
};

export type SetFlowStepConfig = {
  loadStep?: number;
  repStep?: number;
  durationSecondsStep?: number;
  distanceStep?: number;
};

export type ProgressionPromotionConfigFields = {
  promotionBasis?: ProgressionPromotionBasis;
  repPromotionThreshold?: RepPromotionThreshold;
  customRepPromotionTarget?: number | null;
  targetMutation?: ProgressionTargetMutationId;
  qualificationWindow?: QualificationWindowConfig;
  effortWave?: EffortWaveConfig;
  focusRotation?: {
    focus: FocusTargetSeedId;
  };
};

export type DoubleProgressionConfig = {
  version: 1;
  loadIncrement: number;
  stepOverrides?: ProgressionStepOverrideConfig;
  setFlowSteps?: SetFlowStepConfig;
  setFlow?: SetFlowId;
  stallPolicy?: ProgressionStallPolicy;
  stallThreshold?: number;
  deloadPercent?: number;
  autoUpdateRoutineGoals?: boolean;
} & ProgressionPromotionConfigFields;

export type FixedLoadRepRangeProgressionConfig = {
  version: 1;
  loadIncrement: number;
  stepOverrides?: ProgressionStepOverrideConfig;
  setFlowSteps?: SetFlowStepConfig;
  setFlow?: SetFlowId;
  stallPolicy?: ProgressionStallPolicy;
  stallThreshold?: number;
  deloadPercent?: number;
  autoUpdateRoutineGoals?: boolean;
} & ProgressionPromotionConfigFields;

export type DeloadAfterStallConfig = {
  version: 1;
  loadIncrement: number;
  stepOverrides?: ProgressionStepOverrideConfig;
  setFlowSteps?: SetFlowStepConfig;
  setFlow?: SetFlowId;
  stallThreshold: number;
  deloadPercent: number;
} & ProgressionPromotionConfigFields;

export type ProgressionPlaybookConfig =
  | DoubleProgressionConfig
  | FixedLoadRepRangeProgressionConfig
  | DeloadAfterStallConfig;

export type ProgressionPlaybookSelection =
  | {
      id: "double_progression";
      config: DoubleProgressionConfig;
    }
  | {
      id: "fixed_load_rep_range_progression";
      config: FixedLoadRepRangeProgressionConfig;
    }
  | {
      id: "deload_after_stall";
      config: DeloadAfterStallConfig;
    };

export type ProgressionTargetPlan = {
  measurementType: ProgressionMeasurementType;
  setsMin?: number | null;
  setsMax?: number | null;
  repsTarget?: number | null;
  repsMin?: number | null;
  repsMax?: number | null;
  weightMin?: number | null;
  weightMax?: number | null;
  weightUnit?: "lbs" | "kg" | null;
  durationSeconds?: number | null;
  distance?: number | null;
  distanceUnit?: "mi" | "km" | "m" | null;
  calories?: number | null;
};

export type ProgressionHistorySetRow = {
  sessionId: string;
  sessionRecordId?: string | null;
  performedAt: string;
  setIndex: number;
  weight: number | null;
  reps: number | null;
  weightUnit: "lbs" | "kg" | null;
  durationSeconds?: number | null;
  distance?: number | null;
  distanceUnit?: "mi" | "km" | "m" | null;
  calories?: number | null;
  isWarmup: boolean;
};

export type ProgressionHistorySession = {
  sessionId: string;
  performedAt: string;
  workingSetCount: number;
  targetSetCount: number;
  weight: number | null;
  weightUnit: "lbs" | "kg" | null;
  weightsBySet: Array<number | null>;
  repsBySet: number[];
  minReps: number | null;
  maxReps: number | null;
  coveredTargetSets: boolean;
  allSetsAtOrAboveTopRep: boolean;
};

export type ProgressionPlaybookDefinition = {
  id: ProgressionPlaybookId;
  label: string;
  shortExplanation: string;
};

export type ProgressionPlaybookDerivation = {
  playbookId: ProgressionPlaybookId;
  label: string;
  plan: ProgressionTargetPlan;
  reason: string;
  changed: boolean;
};

export type ProgressionReviewCandidateType = "none" | "promote" | "review" | "deload";

export type ProgressionReviewCycleWindow = {
  startDate?: string | null;
  endDate?: string | null;
};

export type ProgressionReviewCandidate = {
  type: ProgressionReviewCandidateType;
  playbookId: ProgressionPlaybookId | null;
  label: string | null;
  currentTarget: ProgressionTargetPlan | null;
  proposedTarget: ProgressionTargetPlan | null;
  reason: string;
  cycleWindow?: ProgressionReviewCycleWindow | null;
  qualificationWindow?: QualificationWindowResult | null;
  sourceSession?: {
    sessionId: string;
    performedAt: string;
    isLatest: boolean;
  } | null;
};

const PLAYBOOK_DEFINITIONS: Record<ProgressionPlaybookId, ProgressionPlaybookDefinition> = {
  double_progression: {
    id: "double_progression",
    label: "Overloaded",
    shortExplanation: "Keep the same load until every work set reaches the top of the rep range, then raise load and restart at the bottom of the range.",
  },
  fixed_load_rep_range_progression: {
    id: "fixed_load_rep_range_progression",
    label: "Manual Review",
    shortExplanation: "Build clean reps and review before increasing weight.",
  },
  deload_after_stall: {
    id: "deload_after_stall",
    label: "Deload policy",
    shortExplanation: "After repeated logged misses, reduce load and rebuild. This is a stall policy, not a primary progression method.",
  },
};

export const PROGRESSION_METHOD_DEFINITIONS: Record<ProgressionMethodId | "manual", {
  id: ProgressionMethodId | "manual";
  label: string;
  whatItDoes: string;
  useItFor: string;
  inputMeanings: string[];
  pattern: string;
}> = {
  manual: {
    id: "manual",
    label: "Manual",
    whatItDoes: "Uses the target you enter. No playbook adjusts this exercise.",
    useItFor: "New movements, stretch/mobility, cardio, or anything you want to control directly.",
    inputMeanings: ["Sets/reps/load are just targets."],
    pattern: "Manual targets are stable until you edit them.",
  },
  double_progression: {
    id: "double_progression",
    label: "Overloaded",
    whatItDoes: "Build reps first. Increase load only after all sets hit the top of the rep range.",
    useItFor: "Main lifts, machines, dumbbells, and strength/hypertrophy work.",
    inputMeanings: [
      "Sets = work sets checked by the rule",
      "Min reps = lower bound",
      "Max reps = promotion threshold",
      "Load = increase after promotion is earned",
    ],
    pattern: "Reps prove readiness before load increases.",
  },
  fixed_load_rep_range_progression: {
    id: "fixed_load_rep_range_progression",
    label: "Manual Review",
    whatItDoes: "Build clean reps and review before increasing weight.",
    useItFor: "Isolation lifts, technique work, rehab/prehab, small-muscle movements.",
    inputMeanings: [
      "Sets = work sets checked",
      "Min reps = quality floor",
      "Max reps = range completion target",
      "Load = fixed load to hold, not an automatic bump",
    ],
    pattern: "Protect form and consistency by moving slower on purpose.",
  },
};

export const STALL_POLICY_DEFINITIONS: Record<ProgressionStallPolicy, {
  id: ProgressionStallPolicy;
  label: string;
  whatItDoes: string;
  useItFor: string;
  inputMeanings: string[];
  pattern: string;
}> = {
  none: {
    id: "none",
    label: "None",
    whatItDoes: "No stall policy is attached.",
    useItFor: "Exercises where missed targets should not trigger an automatic recovery rule.",
    inputMeanings: [],
    pattern: "No downshift happens unless you edit the goal.",
  },
  deload_after_stall: {
    id: "deload_after_stall",
    label: "Deload",
    whatItDoes: "After repeated logged misses on the current goal, reduce load.",
    useItFor: "Exercises where repeated misses are meaningful.",
    inputMeanings: [
      "Stall = consecutive logged misses before deload",
      "Deload % = amount to reduce load",
      "Step = rounding/rebuild amount",
    ],
    pattern: "Progression moves goals up; deload recovers goals down.",
  },
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDateStringAsUtc(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return Number.NaN;
  }

  return Date.UTC(year, month - 1, day);
}

export function listSetFlowDefinitions() {
  return Object.values(SET_FLOW_DEFINITIONS);
}

export function listFutureSetFlowDefinitions() {
  return Object.values(FUTURE_SET_FLOW_DEFINITIONS);
}

export function listTrainingGoalDefinitions() {
  return Object.values(TRAINING_GOAL_DEFINITIONS);
}

export function getDefaultProgressionLayerModel(args: {
  trainingGoal?: TrainingGoalId;
  measurementType?: ProgressionMeasurementType;
} = {}): ProgressionLayerModel {
  const trainingGoal = args.trainingGoal ?? "build_muscle";
  const measurementType = args.measurementType ?? "reps";
  const goalDefinition = TRAINING_GOAL_DEFINITIONS[trainingGoal] ?? TRAINING_GOAL_DEFINITIONS.build_muscle;

  return {
    trainingGoal,
    measurementType,
    ...goalDefinition.defaultModel,
  };
}

export function normalizeProgressionMethodLayerId(value: unknown): ProgressionMethodLayerId {
  if (value === "fixed_load_block" || value === "fixed_load_rep_range_progression") {
    return "hold_and_review";
  }

  if (value === "manual" || value === "double_progression" || value === "hold_and_review" || value === "cardio_progression") {
    return value;
  }

  if (value === "deload_after_stall") {
    return "double_progression";
  }

  return "manual";
}

export function getProgressionStepLabel(measurementType: ProgressionMeasurementType) {
  switch (measurementType) {
  case "reps":
    return "Progression step";
  case "time":
    return "Duration step";
  case "distance":
    return "Distance step";
  case "time_distance":
    return "Pace / volume step";
  case "none":
    return null;
  }
}

function resolveProgressionStepForPlan(args: {
  plan: ProgressionTargetPlan;
  configLoadIncrement: number;
  fallbackWeightUnit: "lbs" | "kg";
  progressionStepPolicy?: ProgressionStepPolicy | null;
}) {
  if (args.progressionStepPolicy?.defaultValue && args.progressionStepPolicy.defaultValue > 0) {
    return args.progressionStepPolicy;
  }

  return inferProgressionStepPolicy({
    measurementType: args.plan.measurementType,
    weightUnit: args.plan.weightUnit ?? args.fallbackWeightUnit,
    distanceUnit: args.plan.distanceUnit === "km" ? "km" : "mi",
    targetWeight: args.plan.weightMax ?? args.plan.weightMin ?? null,
    exerciseOverrideValue: args.configLoadIncrement,
  });
}

function resolveLoadIncrementForPlan(args: {
  plan: ProgressionTargetPlan;
  configLoadIncrement: number;
  fallbackWeightUnit: "lbs" | "kg";
  progressionStepPolicy?: ProgressionStepPolicy | null;
}) {
  const policy = resolveProgressionStepForPlan(args);
  return policy.kind === "load" && typeof policy.defaultValue === "number" && Number.isFinite(policy.defaultValue) && policy.defaultValue > 0
    ? policy.defaultValue
    : args.configLoadIncrement;
}

export function getCycleDayIndex(args: {
  startDate: string;
  targetDate: string;
  cycleLengthDays: number;
}) {
  if (!Number.isInteger(args.cycleLengthDays) || args.cycleLengthDays < 1) {
    return null;
  }

  const startTs = parseDateStringAsUtc(args.startDate);
  const targetTs = parseDateStringAsUtc(args.targetDate);
  if (!Number.isFinite(startTs) || !Number.isFinite(targetTs)) {
    return null;
  }

  const daysSinceStart = Math.floor((targetTs - startTs) / MS_PER_DAY);
  return (((daysSinceStart % args.cycleLengthDays) + args.cycleLengthDays) % args.cycleLengthDays) + 1;
}

function isFinitePositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function formatReps(value: number | null | undefined) {
  if (!isPositiveInteger(value)) {
    return null;
  }

  return `${value} reps`;
}

function formatRepRange(minReps: number | null | undefined, maxReps: number | null | undefined) {
  if (!isPositiveInteger(minReps) && !isPositiveInteger(maxReps)) {
    return null;
  }

  const start = isPositiveInteger(minReps) ? minReps : maxReps;
  const end = isPositiveInteger(maxReps) ? maxReps : minReps;

  if (!isPositiveInteger(start) || !isPositiveInteger(end)) {
    return formatReps(start ?? end ?? null);
  }

  return start === end ? `${start} reps` : `${start}-${end} reps`;
}

function formatWeightLabel(weight: number | null | undefined, unit: "lbs" | "kg" | null | undefined) {
  return formatWeight(weight ?? null, unit ?? null);
}

function formatWeightReps(weight: number | null | undefined, reps: number | null | undefined, unit: "lbs" | "kg" | null | undefined) {
  const weightLabel = formatWeightLabel(weight, unit);
  const repsLabel = formatReps(reps);

  if (weightLabel && repsLabel) {
    return `${weightLabel} x ${repsLabel.replace(" reps", "")}`;
  }

  return weightLabel ?? repsLabel;
}

function resolveSingleValue(min?: number | null, max?: number | null) {
  if (isPositiveInteger(max)) {
    return max;
  }

  if (isPositiveInteger(min)) {
    return min;
  }

  return null;
}

function normalizePlaybookId(value: unknown): ProgressionPlaybookId | null {
  if (value === "fixed_load_block" || value === "hold_and_review") {
    return "fixed_load_rep_range_progression";
  }

  return PROGRESSION_PLAYBOOK_IDS.includes(value as ProgressionPlaybookId)
    ? (value as ProgressionPlaybookId)
    : null;
}

function normalizeStallPolicy(value: unknown): ProgressionStallPolicy {
  return value === "deload_after_stall" ? "deload_after_stall" : "none";
}

function normalizeSetFlowId(value: unknown): SetFlowId | undefined {
  if (value === "top_set_backoff") {
    return "straight_sets";
  }

  return value && Object.prototype.hasOwnProperty.call(SET_FLOW_DEFINITIONS, value as PropertyKey)
    ? (value as SetFlowId)
    : undefined;
}

function normalizeAutoUpdateRoutineGoals(value: unknown) {
  return value === true;
}

function resolveStallPolicyFromSelection(selection: ProgressionPlaybookSelection): ProgressionStallPolicy {
  if (selection.id === "deload_after_stall") {
    return "deload_after_stall";
  }

  return normalizeStallPolicy(selection.config.stallPolicy);
}

function resolveMethodIdFromSelection(selection: ProgressionPlaybookSelection): ProgressionMethodId {
  return selection.id === "deload_after_stall" ? "double_progression" : selection.id;
}

function resolveDeloadConfig(selection: ProgressionPlaybookSelection) {
  if (selection.id === "deload_after_stall") {
    return selection.config;
  }

  if (normalizeStallPolicy(selection.config.stallPolicy) !== "deload_after_stall") {
    return null;
  }

  if (!isPositiveInteger(selection.config.stallThreshold) || !isFinitePositiveNumber(selection.config.deloadPercent) || selection.config.deloadPercent >= 100) {
    return null;
  }

  return {
    version: 1 as const,
    loadIncrement: selection.config.loadIncrement,
    stallThreshold: selection.config.stallThreshold,
    deloadPercent: selection.config.deloadPercent,
  };
}

function parseOptionalPositiveNumber(rawValue: FormDataEntryValue | null) {
  const value = String(rawValue ?? "").trim();
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Number.NaN;
}

function parseOptionalPositiveInteger(rawValue: FormDataEntryValue | null) {
  const parsed = parseOptionalPositiveNumber(rawValue);
  if (parsed === null) {
    return null;
  }

  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function normalizeProgressionStepOverrides(value: unknown): ProgressionStepOverrideConfig | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const raw = value as Record<string, unknown>;
  const entries: ProgressionStepOverrideConfig = {};
  const assignPositive = <Key extends keyof ProgressionStepOverrideConfig>(key: Key) => {
    const candidate = raw[key];
    if (isFinitePositiveNumber(candidate)) {
      entries[key] = candidate;
    }
  };

  assignPositive("barbellLoadIncrement");
  assignPositive("dumbbellLoadIncrement");
  assignPositive("machineLoadIncrement");
  assignPositive("cableLoadIncrement");
  assignPositive("bodyweightRepIncrement");
  assignPositive("durationSecondsIncrement");
  assignPositive("distanceIncrement");

  return Object.keys(entries).length > 0 ? entries : undefined;
}

function normalizeSetFlowSteps(value: unknown): SetFlowStepConfig | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const raw = value as Record<string, unknown>;
  const entries: SetFlowStepConfig = {};
  if (isFinitePositiveNumber(raw.loadStep)) {
    entries.loadStep = raw.loadStep;
  }
  if (isFinitePositiveNumber(raw.repStep)) {
    entries.repStep = raw.repStep;
  }
  if (isFinitePositiveNumber(raw.durationSecondsStep)) {
    entries.durationSecondsStep = raw.durationSecondsStep;
  }
  if (isFinitePositiveNumber(raw.distanceStep)) {
    entries.distanceStep = raw.distanceStep;
  }

  return Object.keys(entries).length > 0 ? entries : undefined;
}

function parseProgressionStepOverridesFromFormData(formData: FormData): ProgressionStepOverrideConfig | undefined {
  const rawEntries: Record<keyof ProgressionStepOverrideConfig, FormDataEntryValue | null> = {
    barbellLoadIncrement: formData.get("progressionBarbellLoadIncrement"),
    dumbbellLoadIncrement: formData.get("progressionDumbbellLoadIncrement"),
    machineLoadIncrement: formData.get("progressionMachineLoadIncrement"),
    cableLoadIncrement: formData.get("progressionCableLoadIncrement"),
    bodyweightRepIncrement: formData.get("progressionBodyweightRepIncrement"),
    durationSecondsIncrement: formData.get("progressionDurationIncrementSeconds"),
    distanceIncrement: formData.get("progressionDistanceIncrement"),
  };
  const parsed: ProgressionStepOverrideConfig = {};

  for (const [key, rawValue] of Object.entries(rawEntries) as Array<[keyof ProgressionStepOverrideConfig, FormDataEntryValue | null]>) {
    const value = String(rawValue ?? "").trim();
    if (!value) {
      continue;
    }

    const numberValue = Number(value);
    if (Number.isFinite(numberValue) && numberValue > 0) {
      parsed[key] = numberValue;
    }
  }

  return Object.keys(parsed).length > 0 ? parsed : undefined;
}

function parseSetFlowStepsFromFormData(formData: FormData): SetFlowStepConfig | undefined {
  const loadStep = parseOptionalPositiveNumber(formData.get("progressionSetFlowLoadStep"));
  const repStep = parseOptionalPositiveNumber(formData.get("progressionSetFlowRepStep"));
  const durationSecondsStep = parseOptionalPositiveNumber(formData.get("progressionSetFlowDurationStep"));
  const distanceStep = parseOptionalPositiveNumber(formData.get("progressionSetFlowDistanceStep"));
  const parsed: SetFlowStepConfig = {};
  if (loadStep !== null && !Number.isNaN(loadStep)) {
    parsed.loadStep = loadStep;
  }
  if (repStep !== null && !Number.isNaN(repStep)) {
    parsed.repStep = repStep;
  }
  if (durationSecondsStep !== null && !Number.isNaN(durationSecondsStep)) {
    parsed.durationSecondsStep = durationSecondsStep;
  }
  if (distanceStep !== null && !Number.isNaN(distanceStep)) {
    parsed.distanceStep = distanceStep;
  }

  return Object.keys(parsed).length > 0 ? parsed : undefined;
}

function attachProgressionStepOverrides<Config extends ProgressionPlaybookConfig>(
  config: Config,
  stepOverrides: ProgressionStepOverrideConfig | undefined,
) {
  if (!stepOverrides) {
    return config;
  }

  return {
    ...config,
    stepOverrides,
  };
}

function attachSetFlowSteps<Config extends ProgressionPlaybookConfig>(
  config: Config,
  setFlowSteps: SetFlowStepConfig | undefined,
) {
  if (!setFlowSteps) {
    return config;
  }

  return {
    ...config,
    setFlowSteps,
  };
}

function buildBaseTargetPlan(args: {
  measurementType: ProgressionMeasurementType;
  setCount: number;
  targetReps?: number | null;
  minReps: number;
  maxReps: number;
  weight?: number | null;
  weightUnit?: "lbs" | "kg" | null;
}): ProgressionTargetPlan {
  return {
    measurementType: args.measurementType,
    setsMin: args.setCount,
    setsMax: args.setCount,
    repsTarget: args.targetReps ?? null,
    repsMin: args.minReps,
    repsMax: args.maxReps,
    weightMin: isFinitePositiveNumber(args.weight) ? args.weight : null,
    weightMax: isFinitePositiveNumber(args.weight) ? args.weight : null,
    weightUnit: args.weightUnit ?? null,
  };
}

function resolveCurrentPhaseRepTarget(plan: ProgressionTargetPlan, bottomRep: number, topRep: number) {
  if (isPositiveInteger(plan.repsTarget)) {
    return Math.min(topRep, Math.max(bottomRep, plan.repsTarget));
  }

  const singleReps = resolveSingleValue(plan.repsMin, plan.repsMax);
  return isPositiveInteger(singleReps) && plan.repsMin === plan.repsMax
    ? Math.min(topRep, Math.max(bottomRep, singleReps))
    : topRep;
}

function buildCardioBaseTargetPlan(plan: ProgressionTargetPlan): ProgressionTargetPlan {
  return {
    measurementType: plan.measurementType,
    setsMin: plan.setsMin ?? null,
    setsMax: plan.setsMax ?? null,
    repsMin: null,
    repsMax: null,
    weightMin: null,
    weightMax: null,
    weightUnit: null,
    durationSeconds: plan.durationSeconds ?? null,
    distance: plan.distance ?? null,
    distanceUnit: plan.distanceUnit ?? null,
    calories: plan.calories ?? null,
  };
}

function resolveLoadedSetWeight(weight: number | null | undefined) {
  return isFinitePositiveNumber(weight) ? weight : null;
}

function weightsMatch(a: number | null | undefined, b: number | null | undefined) {
  if (!isFinitePositiveNumber(a) || !isFinitePositiveNumber(b)) {
    return false;
  }

  return Math.abs(a - b) < 0.0001;
}

function weightMeetsOrExceedsTarget(weight: number | null | undefined, target: number | null | undefined) {
  if (!isFinitePositiveNumber(weight) || !isFinitePositiveNumber(target)) {
    return false;
  }

  return weight + 0.0001 >= target;
}

function sessionCoversTargetLoad(session: ProgressionHistorySession, targetWeight: number) {
  if (!session.coveredTargetSets) {
    return false;
  }

  return session.weightsBySet
    .slice(0, session.targetSetCount)
    .every((weight) => weightMeetsOrExceedsTarget(weight, targetWeight));
}

function resolveHighestQualifiedLoadResult(args: {
  rows: ProgressionHistorySetRow[] | null | undefined;
  targetSets: number;
  topRep: number | null;
  targetWeight: number | null;
  promotionMeasurements: ProgressionMeasurementKey[];
}) {
  const qualifiedCountBySessionAndLoad = new Map<string, {
    performedAt: string;
    loadCounts: Map<number, number>;
  }>();

  for (const row of args.rows ?? []) {
    if (row.isWarmup) {
      continue;
    }

    if (args.promotionMeasurements.includes("reps")) {
      if (!isPositiveInteger(row.reps) || !isPositiveInteger(args.topRep) || row.reps < args.topRep) {
        continue;
      }
    }

    if (args.promotionMeasurements.includes("weight")) {
      if (!isFinitePositiveNumber(args.targetWeight) || !weightMeetsOrExceedsTarget(row.weight, args.targetWeight)) {
        continue;
      }
    }

    const load = resolveLoadedSetWeight(row.weight);
    if (load === null) {
      continue;
    }

    const sessionEntry = qualifiedCountBySessionAndLoad.get(row.sessionId) ?? {
      performedAt: row.performedAt,
      loadCounts: new Map<number, number>(),
    };
    sessionEntry.performedAt = sessionEntry.performedAt.localeCompare(row.performedAt) > 0 ? sessionEntry.performedAt : row.performedAt;
    sessionEntry.loadCounts.set(load, (sessionEntry.loadCounts.get(load) ?? 0) + 1);
    qualifiedCountBySessionAndLoad.set(row.sessionId, sessionEntry);
  }

  const qualifiedLoads = [...qualifiedCountBySessionAndLoad.entries()].flatMap(([sessionId, sessionEntry]) =>
    [...sessionEntry.loadCounts.entries()]
      .filter(([, count]) => count >= args.targetSets)
      .map(([load]) => ({
        load,
        sessionId,
        performedAt: sessionEntry.performedAt,
      })));

  return qualifiedLoads
    .sort((left, right) => {
      const loadOrder = right.load - left.load;
      return loadOrder !== 0 ? loadOrder : right.performedAt.localeCompare(left.performedAt);
    })[0] ?? null;
}

function describeTargetMutationReason(args: {
  methodLabel: string;
  mutationId: ProgressionTargetMutationId;
  measurementType: ProgressionMeasurementType;
  wasCapped?: boolean;
}) {
  if (args.wasCapped) {
    return `${args.methodLabel}: target surpassed - update capped for review.`;
  }

  switch (args.mutationId) {
  case "increase_load":
  case "increase_load_reset_reps":
    return `${args.methodLabel}: promotion threshold reached - increase load next cycle.`;
  case "increase_load_and_reps":
    return `${args.methodLabel}: promotion threshold reached - increase load and reps next cycle.`;
  case "increase_reps":
    return `${args.methodLabel}: promotion threshold reached - increase reps next cycle.`;
  case "increase_duration":
    return `${args.methodLabel}: time target complete - increase duration next cycle.`;
  case "increase_distance":
    return args.measurementType === "time_distance"
      ? `${args.methodLabel}: time + distance target complete - hold time and increase distance next cycle.`
      : `${args.methodLabel}: distance target complete - increase distance next cycle.`;
  case "increase_duration_and_distance":
    return `${args.methodLabel}: time + distance target complete - increase time and distance next cycle.`;
  case "none":
    return `${args.methodLabel}: promotion mutation is disabled.`;
  }
}

function findBestTargetLoadSession(args: {
  history: ProgressionHistorySession[];
  targetWeight: number;
}) {
  return args.history.find((session) => session.coveredTargetSets && sessionCoversTargetLoad(session, args.targetWeight)) ?? null;
}

type PromotionQualificationArgs = {
  promotionBasis: ProgressionPromotionBasis;
  activeMeasurements: ProgressionMeasurementKey[];
  promotionMeasurements: ProgressionMeasurementKey[];
  promotionMeasurementKey: PromotionMeasurementKey;
  repTarget: number | null;
  targetSets: number;
  targetWeight: number | null;
  targetDurationSeconds: number | null;
  targetDistance: number | null;
  targetCalories: number | null;
};

function resolveLegacyPromotionMeasurements(args: {
  plan: ProgressionTargetPlan;
  promotionBasis: ProgressionPromotionBasis;
}) {
  switch (args.plan.measurementType) {
  case "reps":
    switch (args.promotionBasis) {
    case "reps_only":
      return ["reps"] satisfies ProgressionMeasurementKey[];
    case "weight_only":
      return ["weight"] satisfies ProgressionMeasurementKey[];
    case "weight_and_reps":
    default:
      return ["reps", "weight"] satisfies ProgressionMeasurementKey[];
    }
  case "time":
    return ["time"] satisfies ProgressionMeasurementKey[];
  case "distance":
    return ["distance"] satisfies ProgressionMeasurementKey[];
  case "time_distance":
    return ["time", "distance"] satisfies ProgressionMeasurementKey[];
  case "none":
  default:
    return [] satisfies ProgressionMeasurementKey[];
  }
}

function resolveConfiguredTargetMutation(input: unknown) {
  return PROGRESSION_TARGET_MUTATION_IDS.includes(input as ProgressionTargetMutationId)
    ? (input as ProgressionTargetMutationId)
    : undefined;
}

function resolveConfiguredQualificationWindow(input: unknown) {
  return normalizeQualificationWindowConfig(input);
}

function resolveConfiguredEffortWave(input: unknown) {
  return normalizeEffortWaveConfig(input as EffortWaveConfig | null | undefined) ?? undefined;
}

function resolveConfiguredFocusRotation(input: unknown) {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const focus = normalizeFocusTargetSeedId((input as { focus?: unknown }).focus);
  return focus ? { focus } : undefined;
}

function formatQualificationWindowReason(args: {
  methodLabel: string;
  result: QualificationWindowResult;
}) {
  return `${args.methodLabel}: ${buildQualificationWindowStatus(args.result)}.`;
}

function buildStrengthQualificationEvidence(args: {
  history: ProgressionHistorySession[];
  qualification: PromotionQualificationArgs;
}) {
  return args.history.map((session) => ({
    sessionId: session.sessionId,
    performedAt: session.performedAt,
    qualified: sessionQualifiesForPromotion(session, args.qualification),
  })) satisfies QualificationSessionEvidence[];
}

function buildCardioQualificationEvidence(args: {
  rows: ProgressionHistorySetRow[] | null | undefined;
  qualification: PromotionQualificationArgs;
}) {
  const grouped = new Map<string, QualificationSessionEvidence>();
  for (const row of args.rows ?? []) {
    if (row.isWarmup) {
      continue;
    }

    const qualified = rowMeetsPromotionMeasurements({
      row,
      qualification: args.qualification,
    });
    const current = grouped.get(row.sessionId) ?? {
      sessionId: row.sessionId,
      performedAt: row.performedAt,
      qualified: false,
    };
    current.qualified = current.qualified || qualified;
    const currentPerformedAt = typeof current.performedAt === "string" ? current.performedAt : null;
    if (!currentPerformedAt || currentPerformedAt.localeCompare(row.performedAt) < 0) {
      current.performedAt = row.performedAt;
    }
    grouped.set(row.sessionId, current);
  }

  return [...grouped.values()]
    .sort((left, right) => {
      const leftPerformedAt = typeof left.performedAt === "string" ? left.performedAt : "";
      const rightPerformedAt = typeof right.performedAt === "string" ? right.performedAt : "";
      return rightPerformedAt.localeCompare(leftPerformedAt);
    });
}

function buildActiveMeasurementTargetInput(plan: ProgressionTargetPlan) {
  return {
    measurementType: plan.measurementType,
    repsTarget: plan.repsTarget ?? null,
    repsMin: plan.repsMin ?? null,
    repsMax: plan.repsMax ?? null,
    weightMin: plan.weightMin ?? null,
    weightMax: plan.weightMax ?? null,
    durationSeconds: plan.durationSeconds ?? null,
    distance: plan.distance ?? null,
    calories: plan.calories ?? null,
  };
}

function includesPromotionMeasurement(
  qualification: Pick<PromotionQualificationArgs, "promotionMeasurements">,
  measurement: ProgressionMeasurementKey,
) {
  return qualification.promotionMeasurements.includes(measurement);
}

function getPromotionQualificationArgs(args: {
  plan: ProgressionTargetPlan;
  config: ProgressionPromotionConfigFields;
  targetSets: number;
  targetWeight: number | null;
  minReps: number;
  maxReps: number;
}) {
  const promotionBasis = normalizePromotionBasis(args.config.promotionBasis, DEFAULT_PROGRESSION_PROMOTION_BASIS);
  const activeMeasurements = detectActiveMeasurementsFromTargets(buildActiveMeasurementTargetInput(args.plan));
  const promotionMeasurements = normalizePromotionMeasurements({
    measurements: resolveLegacyPromotionMeasurements({
      plan: args.plan,
      promotionBasis,
    }),
  });
  return {
    promotionBasis,
    activeMeasurements,
    promotionMeasurements,
    promotionMeasurementKey: getPromotionMeasurementKey({
      measurements: promotionMeasurements,
      cardioVectorMode: resolveCardioVectorMode({
        measurementType: args.plan.measurementType,
        durationSeconds: args.plan.durationSeconds ?? null,
        distance: args.plan.distance ?? null,
        calories: args.plan.calories ?? null,
      }),
    }),
    repTarget: includesPromotionMeasurement({ promotionMeasurements }, "reps")
      ? getRepPromotionTarget({
        minReps: args.minReps,
        maxReps: args.maxReps,
        thresholdType: args.config.repPromotionThreshold,
        customTarget: args.config.customRepPromotionTarget,
      })
      : null,
    targetSets: args.targetSets,
    targetWeight: includesPromotionMeasurement({ promotionMeasurements }, "weight") && isFinitePositiveNumber(args.targetWeight)
      ? args.targetWeight
      : null,
    targetDurationSeconds: includesPromotionMeasurement({ promotionMeasurements }, "time") && isPositiveInteger(args.plan.durationSeconds)
      ? args.plan.durationSeconds
      : null,
    targetDistance: includesPromotionMeasurement({ promotionMeasurements }, "distance") && isFinitePositiveNumber(args.plan.distance)
      ? args.plan.distance
      : null,
    targetCalories: includesPromotionMeasurement({ promotionMeasurements }, "calories") && isFinitePositiveNumber(args.plan.calories)
      ? args.plan.calories
      : null,
  } satisfies PromotionQualificationArgs;
}

function sessionMeetsRepPromotion(session: ProgressionHistorySession, targetSets: number, repTarget: number | null) {
  if (!isPositiveInteger(repTarget) || !session.coveredTargetSets) {
    return false;
  }

  return session.repsBySet.length >= targetSets
    && session.repsBySet.slice(0, targetSets).every((reps) => reps >= repTarget);
}

function sessionQualifiesForPromotion(session: ProgressionHistorySession, args: PromotionQualificationArgs) {
  if (!session.coveredTargetSets) {
    return false;
  }

  if (includesPromotionMeasurement(args, "weight")) {
    if (!isFinitePositiveNumber(args.targetWeight) || !sessionCoversTargetLoad(session, args.targetWeight)) {
      return false;
    }
  }

  if (includesPromotionMeasurement(args, "reps")) {
    if (!sessionMeetsRepPromotion(session, args.targetSets, args.repTarget)) {
      return false;
    }
  }

  return true;
}

function rowMeetsPromotionMeasurements(args: {
  row: ProgressionHistorySetRow;
  qualification: PromotionQualificationArgs;
}) {
  if (args.row.isWarmup) {
    return false;
  }

  if (includesPromotionMeasurement(args.qualification, "reps")) {
    if (!isPositiveInteger(args.qualification.repTarget) || !isPositiveInteger(args.row.reps) || args.row.reps < args.qualification.repTarget) {
      return false;
    }
  }

  if (includesPromotionMeasurement(args.qualification, "weight")) {
    if (!isFinitePositiveNumber(args.qualification.targetWeight) || !weightMeetsOrExceedsTarget(args.row.weight, args.qualification.targetWeight)) {
      return false;
    }
  }

  if (includesPromotionMeasurement(args.qualification, "time")) {
    if (!isPositiveInteger(args.qualification.targetDurationSeconds) || !isPositiveInteger(args.row.durationSeconds) || args.row.durationSeconds < args.qualification.targetDurationSeconds) {
      return false;
    }
  }

  if (includesPromotionMeasurement(args.qualification, "distance")) {
    if (!isFinitePositiveNumber(args.qualification.targetDistance) || !isFinitePositiveNumber(args.row.distance) || args.row.distance + 0.0001 < args.qualification.targetDistance) {
      return false;
    }
  }

  if (includesPromotionMeasurement(args.qualification, "calories")) {
    if (!isFinitePositiveNumber(args.qualification.targetCalories) || !isFinitePositiveNumber(args.row.calories) || args.row.calories + 0.0001 < args.qualification.targetCalories) {
      return false;
    }
  }

  return true;
}

function findBestPromotionQualifiedSession(args: {
  history: ProgressionHistorySession[];
  qualification: PromotionQualificationArgs;
}) {
  return args.history.find((session) => sessionQualifiesForPromotion(session, args.qualification)) ?? null;
}

function findBestTopRangeSession(args: {
  history: ProgressionHistorySession[];
  rows?: ProgressionHistorySetRow[] | null;
  qualification: PromotionQualificationArgs;
}) {
  const qualifiedLoad = resolveHighestQualifiedLoadResult({
    rows: args.rows,
    targetSets: args.qualification.targetSets,
    topRep: args.qualification.repTarget,
    targetWeight: args.qualification.targetWeight,
    promotionMeasurements: args.qualification.promotionMeasurements,
  });
  const qualifiedSessions = args.history.filter((session) =>
    sessionQualifiesForPromotion(session, args.qualification));

  if (qualifiedLoad) {
    const matchedSession = qualifiedSessions.find((session) => session.sessionId === qualifiedLoad.sessionId) ?? null;
    if (matchedSession) {
      return {
        session: matchedSession,
        qualifiedLoad: qualifiedLoad.load,
      };
    }
  }

  const session = qualifiedSessions
    .sort((left, right) => {
      const weightOrder = (right.weight ?? 0) - (left.weight ?? 0);
      return weightOrder !== 0 ? weightOrder : right.performedAt.localeCompare(left.performedAt);
    })[0] ?? null;

  return session
    ? {
      session,
      qualifiedLoad: session.weight,
    }
    : null;
}

function buildSourceSession(session: ProgressionHistorySession, latestSession: ProgressionHistorySession | null) {
  return {
    sessionId: session.sessionId,
    performedAt: session.performedAt,
    isLatest: latestSession?.sessionId === session.sessionId,
  };
}

function roundToIncrement(value: number, increment: number) {
  if (!isFinitePositiveNumber(value) || !isFinitePositiveNumber(increment)) {
    return value;
  }

  const rounded = Math.round(value / increment) * increment;
  return Number(rounded.toFixed(3));
}

function clampDeloadWeight(weight: number, increment: number) {
  const rounded = roundToIncrement(weight, increment);
  return rounded > 0 ? rounded : increment;
}

function resolveDurationStepSeconds(args: {
  plan: ProgressionTargetPlan;
  configLoadIncrement: number;
  progressionStepPolicy?: ProgressionStepPolicy | null;
}) {
  if (args.progressionStepPolicy?.kind === "duration" && isFinitePositiveNumber(args.progressionStepPolicy.defaultValue)) {
    return Math.round(args.progressionStepPolicy.defaultValue);
  }

  return 60;
}

function resolveDistanceStep(args: {
  plan: ProgressionTargetPlan;
  configLoadIncrement: number;
  progressionStepPolicy?: ProgressionStepPolicy | null;
}) {
  if (args.progressionStepPolicy?.kind === "distance" && isFinitePositiveNumber(args.progressionStepPolicy.defaultValue)) {
    return args.progressionStepPolicy.defaultValue;
  }

  return args.plan.distanceUnit === "km" ? 0.25 : 0.1;
}

function hasCompletedCardioTargetExposure(args: {
  plan: ProgressionTargetPlan;
  config: ProgressionPromotionConfigFields;
  rows: ProgressionHistorySetRow[] | null | undefined;
}) {
  const workRows = (args.rows ?? []).filter((row) => !row.isWarmup);
  if (workRows.length === 0) {
    return false;
  }

  const promotionQualification = getPromotionQualificationArgs({
    plan: args.plan,
    config: args.config,
    targetSets: resolveSingleValue(args.plan.setsMin, args.plan.setsMax) ?? 0,
    targetWeight: args.plan.weightMax ?? args.plan.weightMin ?? null,
    minReps: args.plan.repsMin ?? args.plan.repsTarget ?? args.plan.repsMax ?? 0,
    maxReps: args.plan.repsMax ?? args.plan.repsTarget ?? args.plan.repsMin ?? 0,
  });

  if (promotionQualification.promotionMeasurements.length === 0) {
    return false;
  }

  if (
    (includesPromotionMeasurement(promotionQualification, "time") && !isPositiveInteger(promotionQualification.targetDurationSeconds))
    || (includesPromotionMeasurement(promotionQualification, "distance") && !isFinitePositiveNumber(promotionQualification.targetDistance))
    || (includesPromotionMeasurement(promotionQualification, "calories") && !isFinitePositiveNumber(promotionQualification.targetCalories))
  ) {
    return false;
  }

  return workRows.some((row) => rowMeetsPromotionMeasurements({
    row,
    qualification: promotionQualification,
  }));
}

function deriveCardioProgressionReviewCandidate(args: {
  selection: ProgressionPlaybookSelection;
  methodId: ProgressionMethodId;
  methodLabel: string;
  plan: ProgressionTargetPlan;
  historyRows?: ProgressionHistorySetRow[] | null;
  progressionStepPolicy?: ProgressionStepPolicy | null;
  cycleWindow?: ProgressionReviewCycleWindow | null;
  allowSimulatedCandidateWithoutHistory?: boolean;
}): ProgressionReviewCandidate {
  const basePlan = buildCardioBaseTargetPlan(args.plan);
  const targetSets = resolveSingleValue(args.plan.setsMin, args.plan.setsMax) ?? 0;
  const qualification = getPromotionQualificationArgs({
    plan: args.plan,
    config: args.selection.config,
    targetSets,
    targetWeight: args.plan.weightMax ?? args.plan.weightMin ?? null,
    minReps: args.plan.repsMin ?? args.plan.repsTarget ?? args.plan.repsMax ?? 0,
    maxReps: args.plan.repsMax ?? args.plan.repsTarget ?? args.plan.repsMin ?? 0,
  });
  const sessionEvidence = buildCardioQualificationEvidence({
    rows: args.historyRows,
    qualification,
  });
  const qualificationWindow = evaluateQualificationWindow({
    config: args.selection.config.qualificationWindow,
    evidence: sessionEvidence.length > 0 || args.allowSimulatedCandidateWithoutHistory !== true
      ? sessionEvidence
      : [{
          sessionId: "simulated-session",
          qualified: true,
          performedAt: args.cycleWindow?.endDate ? `${args.cycleWindow.endDate}T12:00:00.000Z` : null,
        }],
    cycleWindow: args.cycleWindow,
  });

  if (args.methodId === "fixed_load_rep_range_progression") {
    if (!qualificationWindow.ready) {
      return buildNoProgressionReviewCandidate({
        playbookId: args.selection.id,
        label: args.methodLabel,
        currentTarget: basePlan,
        reason: formatQualificationWindowReason({
          methodLabel: args.methodLabel,
          result: qualificationWindow,
        }),
        cycleWindow: args.cycleWindow,
        qualificationWindow,
      });
    }

    return {
      type: "review",
      playbookId: args.selection.id,
      label: args.methodLabel,
      currentTarget: basePlan,
      proposedTarget: basePlan,
      reason: `${args.methodLabel}: cardio target complete - review before increasing.`,
      cycleWindow: args.cycleWindow ?? null,
      qualificationWindow,
    };
  }

  if (args.methodId !== "double_progression") {
    return buildNoProgressionReviewCandidate({
      playbookId: args.selection.id,
      label: args.methodLabel,
      currentTarget: basePlan,
      reason: `${args.methodLabel}: no cardio progression candidate.`,
      cycleWindow: args.cycleWindow,
      qualificationWindow,
    });
  }

  if (args.plan.measurementType === "time") {
    if (!isPositiveInteger(args.plan.durationSeconds)) {
      return buildNoProgressionReviewCandidate({
        playbookId: args.selection.id,
        label: args.methodLabel,
        currentTarget: basePlan,
        reason: `${args.methodLabel}: current duration target is incomplete.`,
        cycleWindow: args.cycleWindow,
        qualificationWindow,
      });
    }

    const progression = applyTargetMutation({
      plan: basePlan,
      promotionBasis: args.selection.config.promotionBasis,
      targetMutation: args.selection.config.targetMutation,
      progressionStepPolicy: args.progressionStepPolicy,
      durationSecondsStep: resolveDurationStepSeconds({
        plan: args.plan,
        configLoadIncrement: args.selection.config.loadIncrement,
        progressionStepPolicy: args.progressionStepPolicy,
      }),
    });
    if (!progression || !progression.changed) {
      return buildNoProgressionReviewCandidate({
        playbookId: args.selection.id,
        label: args.methodLabel,
        currentTarget: basePlan,
        reason: progression
          ? describeTargetMutationReason({
            methodLabel: args.methodLabel,
            mutationId: progression.mutationId,
            measurementType: args.plan.measurementType,
            wasCapped: progression.wasCapped,
          })
          : `${args.methodLabel}: promotion step is unavailable.`,
        cycleWindow: args.cycleWindow,
        qualificationWindow,
      });
    }

    if (!qualificationWindow.ready) {
      return buildNoProgressionReviewCandidate({
        playbookId: args.selection.id,
        label: args.methodLabel,
        currentTarget: basePlan,
        reason: formatQualificationWindowReason({
          methodLabel: args.methodLabel,
          result: qualificationWindow,
        }),
        cycleWindow: args.cycleWindow,
        qualificationWindow,
      });
    }

    return {
      type: "promote",
      playbookId: args.selection.id,
      label: args.methodLabel,
      currentTarget: basePlan,
      proposedTarget: progression.proposedTarget,
      reason: describeTargetMutationReason({
        methodLabel: args.methodLabel,
        mutationId: progression.mutationId,
        measurementType: args.plan.measurementType,
        wasCapped: progression.wasCapped,
      }),
      cycleWindow: args.cycleWindow ?? null,
      qualificationWindow,
    };
  }

  if (args.plan.measurementType === "distance") {
    if (!isFinitePositiveNumber(args.plan.distance)) {
      return buildNoProgressionReviewCandidate({
        playbookId: args.selection.id,
        label: args.methodLabel,
        currentTarget: basePlan,
        reason: `${args.methodLabel}: current distance target is incomplete.`,
        cycleWindow: args.cycleWindow,
        qualificationWindow,
      });
    }

    const progression = applyTargetMutation({
      plan: basePlan,
      promotionBasis: args.selection.config.promotionBasis,
      targetMutation: args.selection.config.targetMutation,
      progressionStepPolicy: args.progressionStepPolicy,
      distanceStep: resolveDistanceStep({
        plan: args.plan,
        configLoadIncrement: args.selection.config.loadIncrement,
        progressionStepPolicy: args.progressionStepPolicy,
      }),
    });
    if (!progression || !progression.changed) {
      return buildNoProgressionReviewCandidate({
        playbookId: args.selection.id,
        label: args.methodLabel,
        currentTarget: basePlan,
        reason: progression
          ? describeTargetMutationReason({
            methodLabel: args.methodLabel,
            mutationId: progression.mutationId,
            measurementType: args.plan.measurementType,
            wasCapped: progression.wasCapped,
          })
          : `${args.methodLabel}: promotion step is unavailable.`,
        cycleWindow: args.cycleWindow,
        qualificationWindow,
      });
    }

    if (!qualificationWindow.ready) {
      return buildNoProgressionReviewCandidate({
        playbookId: args.selection.id,
        label: args.methodLabel,
        currentTarget: basePlan,
        reason: formatQualificationWindowReason({
          methodLabel: args.methodLabel,
          result: qualificationWindow,
        }),
        cycleWindow: args.cycleWindow,
        qualificationWindow,
      });
    }

    return {
      type: "promote",
      playbookId: args.selection.id,
      label: args.methodLabel,
      currentTarget: basePlan,
      proposedTarget: progression.proposedTarget,
      reason: describeTargetMutationReason({
        methodLabel: args.methodLabel,
        mutationId: progression.mutationId,
        measurementType: args.plan.measurementType,
        wasCapped: progression.wasCapped,
      }),
      cycleWindow: args.cycleWindow ?? null,
      qualificationWindow,
    };
  }

  if (args.plan.measurementType === "time_distance") {
    if (!isPositiveInteger(args.plan.durationSeconds) || !isFinitePositiveNumber(args.plan.distance)) {
      return buildNoProgressionReviewCandidate({
        playbookId: args.selection.id,
        label: args.methodLabel,
        currentTarget: basePlan,
        reason: `${args.methodLabel}: current time and distance target is incomplete.`,
        cycleWindow: args.cycleWindow,
        qualificationWindow,
      });
    }

    const progression = applyTargetMutation({
      plan: basePlan,
      promotionBasis: args.selection.config.promotionBasis,
      targetMutation: args.selection.config.targetMutation,
      progressionStepPolicy: args.progressionStepPolicy,
      durationSecondsStep: resolveDurationStepSeconds({
        plan: args.plan,
        configLoadIncrement: args.selection.config.loadIncrement,
        progressionStepPolicy: args.progressionStepPolicy,
      }),
      distanceStep: resolveDistanceStep({
        plan: args.plan,
        configLoadIncrement: args.selection.config.loadIncrement,
        progressionStepPolicy: args.progressionStepPolicy,
      }),
    });
    if (!progression || !progression.changed) {
      return buildNoProgressionReviewCandidate({
        playbookId: args.selection.id,
        label: args.methodLabel,
        currentTarget: basePlan,
        reason: progression
          ? describeTargetMutationReason({
            methodLabel: args.methodLabel,
            mutationId: progression.mutationId,
            measurementType: args.plan.measurementType,
            wasCapped: progression.wasCapped,
          })
          : `${args.methodLabel}: promotion step is unavailable.`,
        cycleWindow: args.cycleWindow,
        qualificationWindow,
      });
    }

    if (!qualificationWindow.ready) {
      return buildNoProgressionReviewCandidate({
        playbookId: args.selection.id,
        label: args.methodLabel,
        currentTarget: basePlan,
        reason: formatQualificationWindowReason({
          methodLabel: args.methodLabel,
          result: qualificationWindow,
        }),
        cycleWindow: args.cycleWindow,
        qualificationWindow,
      });
    }

    return {
      type: "promote",
      playbookId: args.selection.id,
      label: args.methodLabel,
      currentTarget: basePlan,
      proposedTarget: progression.proposedTarget,
      reason: describeTargetMutationReason({
        methodLabel: args.methodLabel,
        mutationId: progression.mutationId,
        measurementType: args.plan.measurementType,
        wasCapped: progression.wasCapped,
      }),
      cycleWindow: args.cycleWindow ?? null,
      qualificationWindow,
    };
  }

  return buildNoProgressionReviewCandidate({
    playbookId: args.selection.id,
    label: args.methodLabel,
    currentTarget: basePlan,
    reason: `${args.methodLabel}: cardio progression is not available for this target.`,
    cycleWindow: args.cycleWindow,
    qualificationWindow,
  });
}

function countConsecutiveStalls(args: {
  history: ProgressionHistorySession[];
  qualification: PromotionQualificationArgs;
}) {
  let count = 0;

  for (const session of args.history) {
    if (!session.coveredTargetSets) {
      break;
    }

    if (includesPromotionMeasurement(args.qualification, "weight")) {
      if (!isFinitePositiveNumber(args.qualification.targetWeight) || !weightsMatch(session.weight, args.qualification.targetWeight)) {
        break;
      }
    }

    if (sessionQualifiesForPromotion(session, args.qualification)) {
      break;
    }

    count += 1;
  }

  return count;
}

export function getProgressionPlaybookDefinition(id: ProgressionPlaybookId) {
  return PLAYBOOK_DEFINITIONS[id];
}

export function listProgressionPlaybookDefinitions() {
  return PROGRESSION_PLAYBOOK_IDS.map((id) => PLAYBOOK_DEFINITIONS[id]);
}

export function listProgressionMethodDefinitions() {
  return [
    PROGRESSION_METHOD_DEFINITIONS.manual,
    PROGRESSION_METHOD_DEFINITIONS.double_progression,
  ];
}

export function getDefaultProgressionPlaybookConfig(id: "double_progression"): DoubleProgressionConfig;
export function getDefaultProgressionPlaybookConfig(id: "fixed_load_rep_range_progression"): FixedLoadRepRangeProgressionConfig;
export function getDefaultProgressionPlaybookConfig(id: "deload_after_stall"): DeloadAfterStallConfig;
export function getDefaultProgressionPlaybookConfig(id: ProgressionPlaybookId): ProgressionPlaybookConfig;
export function getDefaultProgressionPlaybookConfig(id: ProgressionPlaybookId): ProgressionPlaybookConfig {
  switch (id) {
  case "double_progression":
    return {
      version: 1,
      loadIncrement: 5,
      stepOverrides: { ...DEFAULT_PROGRESSION_STEP_OVERRIDES },
      setFlowSteps: { ...DEFAULT_SET_FLOW_STEPS },
      promotionBasis: DEFAULT_PROGRESSION_PROMOTION_BASIS,
      repPromotionThreshold: DEFAULT_REP_PROMOTION_THRESHOLD,
    };
  case "fixed_load_rep_range_progression":
    return {
      version: 1,
      loadIncrement: 5,
      stepOverrides: { ...DEFAULT_PROGRESSION_STEP_OVERRIDES },
      setFlowSteps: { ...DEFAULT_SET_FLOW_STEPS },
      promotionBasis: DEFAULT_PROGRESSION_PROMOTION_BASIS,
      repPromotionThreshold: DEFAULT_REP_PROMOTION_THRESHOLD,
    };
  case "deload_after_stall":
    return { version: 1, loadIncrement: 5, stepOverrides: { ...DEFAULT_PROGRESSION_STEP_OVERRIDES }, setFlowSteps: { ...DEFAULT_SET_FLOW_STEPS }, stallThreshold: 2, deloadPercent: 10 };
  }
}

export function validateProgressionPlaybookSelection(args: {
  playbookId: unknown;
  config: unknown;
}): ProgressionPlaybookSelection | null {
  const id = normalizePlaybookId(args.playbookId);
  if (!id || !args.config || typeof args.config !== "object") {
    return null;
  }

  const config = args.config as Record<string, unknown>;
  if (config.version !== 1) {
    return null;
  }

  if (!isFinitePositiveNumber(config.loadIncrement)) {
    return null;
  }
  const stepOverrides = normalizeProgressionStepOverrides(config.stepOverrides);
  const setFlowSteps = normalizeSetFlowSteps(config.setFlowSteps);
  const targetMutation = resolveConfiguredTargetMutation(config.targetMutation);
  const hasQualificationWindow = Object.prototype.hasOwnProperty.call(config, "qualificationWindow");
  const qualificationWindow = hasQualificationWindow
    ? resolveConfiguredQualificationWindow(config.qualificationWindow)
    : undefined;
  const hasEffortWave = Object.prototype.hasOwnProperty.call(config, "effortWave");
  const effortWave = hasEffortWave
    ? resolveConfiguredEffortWave(config.effortWave)
    : undefined;
  const hasFocusRotation = Object.prototype.hasOwnProperty.call(config, "focusRotation");
  const focusRotation = hasFocusRotation
    ? resolveConfiguredFocusRotation(config.focusRotation)
    : undefined;
  const promotionConfig = normalizeProgressionPromotionConfig({
    promotionBasis: config.promotionBasis,
    repPromotionThreshold: config.repPromotionThreshold,
    customRepPromotionTarget: config.customRepPromotionTarget,
    fallbackBasis: DEFAULT_PROGRESSION_PROMOTION_BASIS,
    fallbackThreshold: DEFAULT_REP_PROMOTION_THRESHOLD,
  });

  if (id === "double_progression") {
    const stallPolicy = normalizeStallPolicy(config.stallPolicy);
    if (stallPolicy === "deload_after_stall" && (!isPositiveInteger(config.stallThreshold) || !isFinitePositiveNumber(config.deloadPercent) || config.deloadPercent >= 100)) {
      return null;
    }

    const nextConfig: DoubleProgressionConfig = {
      version: 1,
      loadIncrement: config.loadIncrement,
      stepOverrides,
      setFlowSteps,
      stallPolicy,
      stallThreshold: stallPolicy === "deload_after_stall" ? config.stallThreshold as number : undefined,
      deloadPercent: stallPolicy === "deload_after_stall" ? config.deloadPercent as number : undefined,
      autoUpdateRoutineGoals: normalizeAutoUpdateRoutineGoals(config.autoUpdateRoutineGoals),
      promotionBasis: promotionConfig.promotionBasis,
      repPromotionThreshold: promotionConfig.repPromotionThreshold,
    };
    if (promotionConfig.customRepPromotionTarget !== null) {
      nextConfig.customRepPromotionTarget = promotionConfig.customRepPromotionTarget;
    }
    if (targetMutation) {
      nextConfig.targetMutation = targetMutation;
    }
    if (qualificationWindow) {
      nextConfig.qualificationWindow = qualificationWindow;
    }
    if (effortWave) {
      nextConfig.effortWave = effortWave;
    }
    if (focusRotation) {
      nextConfig.focusRotation = focusRotation;
    }
    const setFlow = normalizeSetFlowId(config.setFlow);
    if (setFlow) {
      nextConfig.setFlow = setFlow;
    }

    return {
      id,
      config: nextConfig,
    };
  }

  if (id === "fixed_load_rep_range_progression") {
    const stallPolicy = normalizeStallPolicy(config.stallPolicy);
    if (stallPolicy === "deload_after_stall" && (!isPositiveInteger(config.stallThreshold) || !isFinitePositiveNumber(config.deloadPercent) || config.deloadPercent >= 100)) {
      return null;
    }

    const nextConfig: FixedLoadRepRangeProgressionConfig = {
      version: 1,
      loadIncrement: config.loadIncrement,
      stepOverrides,
      setFlowSteps,
      stallPolicy,
      stallThreshold: stallPolicy === "deload_after_stall" ? config.stallThreshold as number : undefined,
      deloadPercent: stallPolicy === "deload_after_stall" ? config.deloadPercent as number : undefined,
      autoUpdateRoutineGoals: normalizeAutoUpdateRoutineGoals(config.autoUpdateRoutineGoals),
      promotionBasis: promotionConfig.promotionBasis,
      repPromotionThreshold: promotionConfig.repPromotionThreshold,
    };
    if (promotionConfig.customRepPromotionTarget !== null) {
      nextConfig.customRepPromotionTarget = promotionConfig.customRepPromotionTarget;
    }
    if (targetMutation) {
      nextConfig.targetMutation = targetMutation;
    }
    if (qualificationWindow) {
      nextConfig.qualificationWindow = qualificationWindow;
    }
    if (effortWave) {
      nextConfig.effortWave = effortWave;
    }
    if (focusRotation) {
      nextConfig.focusRotation = focusRotation;
    }
    const setFlow = normalizeSetFlowId(config.setFlow);
    if (setFlow) {
      nextConfig.setFlow = setFlow;
    }

    return {
      id,
      config: nextConfig,
    };
  }

  if (!isPositiveInteger(config.stallThreshold) || !isFinitePositiveNumber(config.deloadPercent) || config.deloadPercent >= 100) {
    return null;
  }

  const nextConfig: DeloadAfterStallConfig = {
    version: 1,
    loadIncrement: config.loadIncrement,
    stepOverrides,
    setFlowSteps,
    stallThreshold: config.stallThreshold,
    deloadPercent: config.deloadPercent,
  };
  if (targetMutation) {
    nextConfig.targetMutation = targetMutation;
  }
  if (qualificationWindow) {
    nextConfig.qualificationWindow = qualificationWindow;
  }
  if (effortWave) {
    nextConfig.effortWave = effortWave;
  }
  if (focusRotation) {
    nextConfig.focusRotation = focusRotation;
  }
  const setFlow = normalizeSetFlowId(config.setFlow);
  if (setFlow) {
    nextConfig.setFlow = setFlow;
  }

  return {
    id,
    config: nextConfig,
  };
}

export function parseProgressionPlaybookPayload(formData: FormData):
  | { ok: true; playbookId: ProgressionPlaybookId | null; config: ProgressionPlaybookConfig | null }
  | { ok: false; error: string } {
  const playbookId = normalizePlaybookId(String(formData.get("progressionPlaybookId") ?? "").trim());
  if (!playbookId) {
    return { ok: true, playbookId: null, config: null };
  }

  const loadIncrement = parseOptionalPositiveNumber(formData.get("progressionLoadIncrement"));
  if (loadIncrement === null || Number.isNaN(loadIncrement)) {
    return { ok: false, error: "Progression load increment must be greater than 0." };
  }

  const requestedStallPolicy = normalizeStallPolicy(String(formData.get("progressionStallPolicy") ?? "none").trim());
  const stallPolicy = playbookId === "deload_after_stall" ? "deload_after_stall" : requestedStallPolicy;
  const autoUpdateRoutineGoals = formData.get("progressionAutoUpdateRoutineGoals") === "1";
  const setFlow = normalizeSetFlowId(String(formData.get("progressionSetFlow") ?? "").trim());
  const stepOverrides = parseProgressionStepOverridesFromFormData(formData);
  const setFlowSteps = parseSetFlowStepsFromFormData(formData);
  const promotionConfig = normalizeProgressionPromotionConfig({
    promotionBasis: normalizePromotionBasis(String(formData.get("progressionPromotionBasis") ?? "").trim(), DEFAULT_PROGRESSION_PROMOTION_BASIS),
    repPromotionThreshold: normalizeRepPromotionThreshold(String(formData.get("progressionRepPromotionThreshold") ?? "").trim(), DEFAULT_REP_PROMOTION_THRESHOLD),
    customRepPromotionTarget: parseOptionalPositiveInteger(formData.get("progressionCustomRepPromotionTarget")),
    fallbackBasis: DEFAULT_PROGRESSION_PROMOTION_BASIS,
    fallbackThreshold: DEFAULT_REP_PROMOTION_THRESHOLD,
  });
  const hasExplicitTargetMutation = formData.get("progressionHasExplicitTargetMutation") === "1";
  const resolvedTargetMutation = normalizeTargetMutation(
    String(formData.get("progressionTargetMutation") ?? "").trim(),
    getDefaultStrengthTargetMutationForPromotionBasis(promotionConfig.promotionBasis),
  );
  const qualificationWindow = normalizeQualificationWindowConfig({
    requiredQualifiedSessions: parseOptionalPositiveInteger(formData.get("progressionRequiredQualifiedSessions")),
    mode: String(formData.get("progressionQualificationWindowMode") ?? "").trim(),
    resetOnMiss: formData.get("progressionQualificationWindowResetOnMiss") === "1",
  });
  const hasExplicitQualificationWindow = formData.get("progressionHasExplicitQualificationWindow") === "1"
    || qualificationWindow.requiredQualifiedSessions > 1
    || qualificationWindow.mode !== "latest"
    || qualificationWindow.resetOnMiss;
  const rawEffortWaveJson = String(formData.get("progressionEffortWaveDaysJson") ?? "").trim();
  let parsedEffortWave: EffortWaveConfig | undefined;
  if (rawEffortWaveJson) {
    try {
      parsedEffortWave = resolveConfiguredEffortWave({
        enabled: true,
        anchor: "routine_cycle",
        days: JSON.parse(rawEffortWaveJson),
      });
    } catch {
      parsedEffortWave = undefined;
    }
  }
  const hasExplicitEffortWave = formData.get("progressionHasExplicitEffortWave") === "1"
    || Boolean(parsedEffortWave && parsedEffortWave.days.length > 0);
  const resolvedFocusRotation = resolveConfiguredFocusRotation({
    focus: String(formData.get("progressionFocusRotation") ?? "").trim(),
  });
  const hasExplicitFocusRotation = formData.get("progressionHasExplicitFocusRotation") === "1"
    || Boolean(resolvedFocusRotation);
  const serializedMutationConfig = hasExplicitTargetMutation ? { targetMutation: resolvedTargetMutation } : {};
  const serializedQualificationWindow = hasExplicitQualificationWindow
    ? { qualificationWindow }
    : {};
  const serializedEffortWave = hasExplicitEffortWave && parsedEffortWave
    ? { effortWave: parsedEffortWave }
    : {};
  const serializedFocusRotation = hasExplicitFocusRotation && resolvedFocusRotation
    ? { focusRotation: resolvedFocusRotation }
    : {};

  if (stallPolicy === "none" && (playbookId === "double_progression" || playbookId === "fixed_load_rep_range_progression")) {
    let config: ProgressionPlaybookConfig = {
      version: 1,
      loadIncrement,
      stallPolicy,
      autoUpdateRoutineGoals,
      promotionBasis: promotionConfig.promotionBasis,
      repPromotionThreshold: promotionConfig.repPromotionThreshold,
      ...(promotionConfig.customRepPromotionTarget !== null ? { customRepPromotionTarget: promotionConfig.customRepPromotionTarget } : {}),
      ...serializedMutationConfig,
      ...serializedQualificationWindow,
      ...serializedEffortWave,
      ...serializedFocusRotation,
    };
    config = attachProgressionStepOverrides(config, stepOverrides);
    config = attachSetFlowSteps(config, setFlowSteps);
    if (setFlow) {
      config.setFlow = setFlow;
    }
    return { ok: true, playbookId, config };
  }

  const stallThreshold = parseOptionalPositiveInteger(formData.get("progressionStallThreshold"));
  if (stallThreshold === null || Number.isNaN(stallThreshold)) {
    return { ok: false, error: "Stall threshold must be a whole number above 0." };
  }

  const deloadPercent = parseOptionalPositiveNumber(formData.get("progressionDeloadPercent"));
  if (deloadPercent === null || Number.isNaN(deloadPercent) || deloadPercent >= 100) {
    return { ok: false, error: "Deload percent must be greater than 0 and less than 100." };
  }

  let config: ProgressionPlaybookConfig = {
    version: 1,
    loadIncrement,
    stallPolicy: "deload_after_stall",
    stallThreshold,
    deloadPercent,
    autoUpdateRoutineGoals,
    promotionBasis: promotionConfig.promotionBasis,
    repPromotionThreshold: promotionConfig.repPromotionThreshold,
    ...(promotionConfig.customRepPromotionTarget !== null ? { customRepPromotionTarget: promotionConfig.customRepPromotionTarget } : {}),
    ...serializedMutationConfig,
    ...serializedQualificationWindow,
    ...serializedEffortWave,
    ...serializedFocusRotation,
  };
  config = attachProgressionStepOverrides(config, stepOverrides);
  config = attachSetFlowSteps(config, setFlowSteps);
  if (setFlow) {
    config.setFlow = setFlow;
  }

  return {
    ok: true,
    playbookId: playbookId === "deload_after_stall" ? "double_progression" : playbookId,
    config,
  };
}

export function describeProgressionPlaybookSelection(args: {
  playbookId: unknown;
  config: unknown;
  weightUnit: "lbs" | "kg";
}) {
  const selection = validateProgressionPlaybookSelection(args);
  if (!selection) {
    return "Manual target only. No progression playbook will adjust this exercise.";
  }

  const incrementLabel = `${formatNumber(selection.config.loadIncrement)} ${args.weightUnit}`;
  const stallPolicy = resolveStallPolicyFromSelection(selection);
  const deloadConfig = resolveDeloadConfig(selection);

  switch (selection.id) {
  case "double_progression":
    return `Build reps first. Increase load only after all target sets hit the top of the range, then add ${incrementLabel}.${stallPolicy === "deload_after_stall" && deloadConfig ? ` Deload after ${deloadConfig.stallThreshold} logged misses.` : ""}`;
  case "fixed_load_rep_range_progression":
    return `Hold the same load for this block. Build clean reps and review before increasing.${stallPolicy === "deload_after_stall" && deloadConfig ? ` Deload after ${deloadConfig.stallThreshold} logged misses.` : ""}`;
  case "deload_after_stall":
    return `If progress stalls for ${selection.config.stallThreshold} straight sessions at the same load, reduce load by ${formatNumber(selection.config.deloadPercent)}% and rebuild from the bottom rep target.`;
  }
}

export function buildProgressionHistorySessions(args: {
  rows: ProgressionHistorySetRow[];
  targetSetCount: number | null | undefined;
  topRepTarget: number | null | undefined;
  limit?: number;
}) {
  if (!isPositiveInteger(args.targetSetCount) || !isPositiveInteger(args.topRepTarget)) {
    return [] as ProgressionHistorySession[];
  }

  const targetSetCount = args.targetSetCount;
  const topRepTarget = args.topRepTarget;

  const grouped = new Map<string, ProgressionHistorySetRow[]>();

  for (const row of args.rows) {
    const current = grouped.get(row.sessionId) ?? [];
    current.push(row);
    grouped.set(row.sessionId, current);
  }

  const sessions = [...grouped.entries()]
    .map(([sessionId, rows]) => {
      const ordered = [...rows]
        .filter((row) => !row.isWarmup)
        .sort((a, b) => a.setIndex - b.setIndex)
        .slice(0, targetSetCount);

      if (ordered.length === 0) {
        return null;
      }

      const repsBySet = ordered
        .map((row) => row.reps)
        .filter((value): value is number => isPositiveInteger(value));
      const weight = resolveLoadedSetWeight(ordered.find((row) => isFinitePositiveNumber(row.weight))?.weight ?? null);
      const weightsBySet = ordered.map((row) => resolveLoadedSetWeight(row.weight));
      const weightUnit = ordered.find((row) => row.weightUnit)?.weightUnit ?? null;

      return {
        sessionId,
        performedAt: ordered[0]?.performedAt ?? "",
        workingSetCount: ordered.length,
        targetSetCount,
        weight,
        weightUnit,
        weightsBySet,
        repsBySet,
        minReps: repsBySet.length ? Math.min(...repsBySet) : null,
        maxReps: repsBySet.length ? Math.max(...repsBySet) : null,
        coveredTargetSets: ordered.length >= targetSetCount,
        allSetsAtOrAboveTopRep: ordered.length >= targetSetCount && repsBySet.length >= targetSetCount && repsBySet.every((reps) => reps >= topRepTarget),
      } satisfies ProgressionHistorySession;
    })
    .filter((entry): entry is ProgressionHistorySession => Boolean(entry))
    .sort((a, b) => b.performedAt.localeCompare(a.performedAt));

  return typeof args.limit === "number" ? sessions.slice(0, args.limit) : sessions;
}

export function deriveProgressionPlaybookTarget(args: {
  playbookId: unknown;
  config: unknown;
  plan: ProgressionTargetPlan | null;
  history: ProgressionHistorySession[] | null | undefined;
  fallbackWeightUnit: "lbs" | "kg";
  progressionStepPolicy?: ProgressionStepPolicy | null;
  historyRows?: ProgressionHistorySetRow[] | null;
}): ProgressionPlaybookDerivation | null {
  const selection = validateProgressionPlaybookSelection({
    playbookId: args.playbookId,
    config: args.config,
  });

  if (!selection || !args.plan) {
    return null;
  }

  if (args.plan.measurementType !== "reps") {
    return null;
  }

  const targetSets = resolveSingleValue(args.plan.setsMin, args.plan.setsMax);
  const bottomRep = isPositiveInteger(args.plan.repsMin) ? args.plan.repsMin : (isPositiveInteger(args.plan.repsMax) ? args.plan.repsMax : null);
  const topRep = isPositiveInteger(args.plan.repsMax) ? args.plan.repsMax : bottomRep;
  const currentRepTarget = bottomRep && topRep ? resolveCurrentPhaseRepTarget(args.plan, bottomRep, topRep) : null;
  const targetWeight = args.plan.weightMax ?? args.plan.weightMin ?? null;
  const targetWeightUnit = args.plan.weightUnit ?? args.fallbackWeightUnit;
  const promotionQualification = isPositiveInteger(targetSets) && isPositiveInteger(bottomRep) && isPositiveInteger(topRep)
    ? getPromotionQualificationArgs({
      plan: args.plan,
      config: selection.config,
      targetSets,
      targetWeight,
      minReps: bottomRep,
      maxReps: topRep,
    })
    : null;
  const currentRepQualification = promotionQualification && isPositiveInteger(currentRepTarget) && includesPromotionMeasurement(promotionQualification, "reps")
    ? {
      ...promotionQualification,
      repTarget: currentRepTarget,
    }
    : promotionQualification;

  if (!isPositiveInteger(targetSets)
    || !isPositiveInteger(bottomRep)
    || !isPositiveInteger(topRep)
    || !isPositiveInteger(currentRepTarget)
    || !promotionQualification
    || (includesPromotionMeasurement(promotionQualification, "weight") && !isFinitePositiveNumber(targetWeight))
    || (includesPromotionMeasurement(promotionQualification, "reps") && !isPositiveInteger(promotionQualification.repTarget))) {
    return null;
  }
  const resolvedCurrentRepQualification: PromotionQualificationArgs = currentRepQualification ?? promotionQualification;

  const history = args.history ?? [];
  if (history.length === 0) {
    return null;
  }

  const latestSession = history[0] ?? null;
  if (!latestSession) {
    return null;
  }

  const currentLoadLabel = formatWeightLabel(targetWeight, targetWeightUnit);
  const methodId = resolveMethodIdFromSelection(selection);
  const methodDefinition = PROGRESSION_METHOD_DEFINITIONS[methodId];
  const stallPolicy = resolveStallPolicyFromSelection(selection);
  const deloadConfig = resolveDeloadConfig(selection);
  const basePlan = buildBaseTargetPlan({
    measurementType: args.plan.measurementType,
    setCount: targetSets,
    targetReps: currentRepTarget,
    minReps: bottomRep,
    maxReps: topRep,
    weight: targetWeight,
    weightUnit: targetWeightUnit,
  });
  const resolvedLoadIncrement = resolveLoadIncrementForPlan({
    plan: basePlan,
    configLoadIncrement: selection.config.loadIncrement,
    fallbackWeightUnit: args.fallbackWeightUnit,
    progressionStepPolicy: args.progressionStepPolicy,
  });
  const promotionWindow = evaluateQualificationWindow({
    config: selection.config.qualificationWindow,
    evidence: buildStrengthQualificationEvidence({
      history,
      qualification: promotionQualification,
    }),
  });
  const currentRepWindow = currentRepQualification
    ? evaluateQualificationWindow({
      config: selection.config.qualificationWindow,
      evidence: buildStrengthQualificationEvidence({
        history,
        qualification: currentRepQualification,
      }),
    })
    : promotionWindow;

  const bestTargetLoadSession = includesPromotionMeasurement(promotionQualification, "weight") && isFinitePositiveNumber(targetWeight)
    ? findBestTargetLoadSession({ history, targetWeight })
    : findBestPromotionQualifiedSession({
      history,
      qualification: {
        ...promotionQualification,
        repTarget: includesPromotionMeasurement(promotionQualification, "reps") ? currentRepTarget : null,
      },
    });
  if (!bestTargetLoadSession) {
    const reason = methodId === "fixed_load_rep_range_progression"
      ? `${methodDefinition.label}: hold ${currentLoadLabel} and build clean reps.`
      : !latestSession.coveredTargetSets
        ? `${methodDefinition.label}: complete ${targetSets} work sets${includesPromotionMeasurement(promotionQualification, "weight") ? ` at ${currentLoadLabel}` : ""} to evaluate next cycle.`
        : `${methodDefinition.label}: no completed ${includesPromotionMeasurement(promotionQualification, "weight") ? "target-load " : ""}session is ready for cycle review.`;

    return {
      playbookId: selection.id,
      label: methodDefinition.label,
      plan: basePlan,
      changed: false,
      reason,
    };
  }

  if (stallPolicy === "deload_after_stall" && deloadConfig && isFinitePositiveNumber(targetWeight)) {
    const stallCount = countConsecutiveStalls({
      history,
      qualification: resolvedCurrentRepQualification,
    });

    if (stallCount >= deloadConfig.stallThreshold) {
      const reducedWeight = clampDeloadWeight(
        targetWeight * (1 - (deloadConfig.deloadPercent / 100)),
        resolvedLoadIncrement,
      );

      return {
        playbookId: selection.id,
        label: methodDefinition.label,
        plan: {
          ...basePlan,
          repsMin: bottomRep,
          repsMax: bottomRep,
          weightMin: reducedWeight,
          weightMax: reducedWeight,
        },
        changed: true,
        reason: "Deload policy: stall detected - reduce load and rebuild.",
      };
    }
  }

  if (methodId === "double_progression") {
    const bestCurrentRepSession = currentRepQualification && includesPromotionMeasurement(currentRepQualification, "reps") && currentRepTarget < (promotionQualification.repTarget ?? topRep)
      ? findBestTopRangeSession({
      history,
      rows: args.historyRows,
      qualification: currentRepQualification,
    })
      : null;
    if (bestCurrentRepSession && currentRepTarget < (promotionQualification.repTarget ?? topRep)) {
      if (!currentRepWindow.ready) {
        return {
          playbookId: selection.id,
          label: methodDefinition.label,
          plan: basePlan,
          changed: false,
          reason: formatQualificationWindowReason({
            methodLabel: methodDefinition.label,
            result: currentRepWindow,
          }),
        };
      }
      const nextReps = Math.min(topRep, currentRepTarget + 1);
      return {
        playbookId: selection.id,
        label: methodDefinition.label,
        plan: {
          ...basePlan,
          repsTarget: nextReps,
        },
        changed: nextReps !== currentRepTarget,
        reason: `${methodDefinition.label}: target reps complete - build reps at the same load.`,
      };
    }

    const bestPromotionSession = findBestTopRangeSession({
      history,
      rows: args.historyRows,
      qualification: promotionQualification,
    });

    if (bestPromotionSession) {
      if (!promotionWindow.ready) {
        return {
          playbookId: selection.id,
          label: methodDefinition.label,
          plan: basePlan,
          changed: false,
          reason: formatQualificationWindowReason({
            methodLabel: methodDefinition.label,
            result: promotionWindow,
          }),
        };
      }
      const promotionTarget = applyTargetMutation({
        plan: basePlan,
        promotionBasis: selection.config.promotionBasis,
        targetMutation: selection.config.targetMutation,
        progressionStepPolicy: args.progressionStepPolicy,
        loadStep: resolvedLoadIncrement,
        qualifiedValue: bestPromotionSession.qualifiedLoad,
      });
      if (!promotionTarget) {
        return {
          playbookId: selection.id,
          label: methodDefinition.label,
          plan: basePlan,
          changed: false,
          reason: `${methodDefinition.label}: promotion step is unavailable.`,
        };
      }
      return {
        playbookId: selection.id,
        label: methodDefinition.label,
        plan: promotionTarget.proposedTarget,
        changed: promotionTarget.changed,
        reason: describeTargetMutationReason({
          methodLabel: methodDefinition.label,
          mutationId: promotionTarget.mutationId,
          measurementType: basePlan.measurementType,
          wasCapped: promotionTarget.wasCapped,
        }),
      };
    }

    return {
      playbookId: selection.id,
      label: methodDefinition.label,
      plan: basePlan,
      changed: false,
      reason: `${methodDefinition.label}: range is not complete yet.`,
    };
  }

  if (methodId === "fixed_load_rep_range_progression") {
    const bestTopRangeSession = findBestTopRangeSession({
      history,
      rows: args.historyRows,
      qualification: promotionQualification,
    });
    if (bestTopRangeSession) {
      if (!promotionWindow.ready) {
        return {
          playbookId: selection.id,
          label: methodDefinition.label,
          plan: basePlan,
          changed: false,
          reason: formatQualificationWindowReason({
            methodLabel: methodDefinition.label,
            result: promotionWindow,
          }),
        };
      }
      return {
        playbookId: selection.id,
        label: methodDefinition.label,
        plan: basePlan,
        changed: false,
        reason: `${methodDefinition.label}: range complete - review before increasing.`,
      };
    }

    const nextReps = includesPromotionMeasurement(promotionQualification, "reps")
      ? Math.min(promotionQualification.repTarget ?? topRep, Math.max(bottomRep, (latestSession.minReps ?? bottomRep) + 1))
      : Math.max(bottomRep, currentRepTarget);
    return {
      playbookId: selection.id,
      label: methodDefinition.label,
      plan: {
        ...basePlan,
        repsMin: nextReps,
        repsMax: nextReps,
      },
      changed: nextReps !== bottomRep || nextReps !== topRep,
      reason: `${methodDefinition.label}: hold load and build clean reps.`,
    };
  }

  return null;
}

function buildNoProgressionReviewCandidate(args: {
  playbookId?: ProgressionPlaybookId | null;
  label?: string | null;
  currentTarget?: ProgressionTargetPlan | null;
  reason: string;
  cycleWindow?: ProgressionReviewCycleWindow | null;
  qualificationWindow?: QualificationWindowResult | null;
}): ProgressionReviewCandidate {
  return {
    type: "none",
    playbookId: args.playbookId ?? null,
    label: args.label ?? null,
    currentTarget: args.currentTarget ?? null,
    proposedTarget: null,
    reason: args.reason,
    cycleWindow: args.cycleWindow ?? null,
    qualificationWindow: args.qualificationWindow ?? null,
  };
}

export function deriveProgressionReviewCandidate(args: {
  playbookId: unknown;
  config: unknown;
  plan: ProgressionTargetPlan | null;
  history: ProgressionHistorySession[] | null | undefined;
  historyRows?: ProgressionHistorySetRow[] | null;
  fallbackWeightUnit: "lbs" | "kg";
  progressionStepPolicy?: ProgressionStepPolicy | null;
  cycleWindow?: ProgressionReviewCycleWindow | null;
  allowSimulatedCandidateWithoutHistory?: boolean;
}): ProgressionReviewCandidate {
  const selection = validateProgressionPlaybookSelection({
    playbookId: args.playbookId,
    config: args.config,
  });

  if (!selection) {
    return buildNoProgressionReviewCandidate({
      currentTarget: args.plan,
      reason: "Manual target: no progression review candidate.",
      cycleWindow: args.cycleWindow,
    });
  }

  const methodId = resolveMethodIdFromSelection(selection);
  const methodDefinition = PROGRESSION_METHOD_DEFINITIONS[methodId];

  if (!args.plan) {
    return buildNoProgressionReviewCandidate({
      playbookId: selection.id,
      label: methodDefinition.label,
      reason: `${methodDefinition.label}: no routine target is available to review.`,
      cycleWindow: args.cycleWindow,
    });
  }

  if (args.plan.measurementType !== "reps") {
    if (args.plan.measurementType === "none") {
      return buildNoProgressionReviewCandidate({
        playbookId: selection.id,
        label: methodDefinition.label,
        currentTarget: args.plan,
        reason: `${methodDefinition.label} does not support this exercise yet; use current goal.`,
        cycleWindow: args.cycleWindow,
      });
    }

    const hasCompletedExposure = args.allowSimulatedCandidateWithoutHistory === true
      || hasCompletedCardioTargetExposure({
        plan: args.plan,
        config: selection.config,
        rows: args.historyRows,
      });

    if (!hasCompletedExposure) {
      return buildNoProgressionReviewCandidate({
        playbookId: selection.id,
        label: methodDefinition.label,
        currentTarget: buildCardioBaseTargetPlan(args.plan),
        reason: `${methodDefinition.label}: no completed target history yet.`,
        cycleWindow: args.cycleWindow,
      });
    }

    return deriveCardioProgressionReviewCandidate({
      selection,
      methodId,
      methodLabel: methodDefinition.label,
      plan: args.plan,
      historyRows: args.historyRows,
      progressionStepPolicy: args.progressionStepPolicy,
      cycleWindow: args.cycleWindow,
      allowSimulatedCandidateWithoutHistory: args.allowSimulatedCandidateWithoutHistory,
    });
  }

  const targetSets = resolveSingleValue(args.plan.setsMin, args.plan.setsMax);
  const bottomRep = isPositiveInteger(args.plan.repsMin) ? args.plan.repsMin : (isPositiveInteger(args.plan.repsMax) ? args.plan.repsMax : null);
  const topRep = isPositiveInteger(args.plan.repsMax) ? args.plan.repsMax : bottomRep;
  const currentRepTarget = bottomRep && topRep ? resolveCurrentPhaseRepTarget(args.plan, bottomRep, topRep) : null;
  const targetWeight = args.plan.weightMax ?? args.plan.weightMin ?? null;
  const targetWeightUnit = args.plan.weightUnit ?? args.fallbackWeightUnit;
  const promotionQualification = isPositiveInteger(targetSets) && isPositiveInteger(bottomRep) && isPositiveInteger(topRep)
    ? getPromotionQualificationArgs({
      plan: args.plan,
      config: selection.config,
      targetSets,
      targetWeight,
      minReps: bottomRep,
      maxReps: topRep,
    })
    : null;
  const currentRepQualification = promotionQualification && isPositiveInteger(currentRepTarget) && includesPromotionMeasurement(promotionQualification, "reps")
    ? {
      ...promotionQualification,
      repTarget: currentRepTarget,
    }
    : promotionQualification;

  if (!isPositiveInteger(targetSets)
    || !isPositiveInteger(bottomRep)
    || !isPositiveInteger(topRep)
    || !isPositiveInteger(currentRepTarget)
    || !promotionQualification
    || (includesPromotionMeasurement(promotionQualification, "weight") && !isFinitePositiveNumber(targetWeight))
    || (includesPromotionMeasurement(promotionQualification, "reps") && !isPositiveInteger(promotionQualification.repTarget))) {
    return buildNoProgressionReviewCandidate({
      playbookId: selection.id,
      label: methodDefinition.label,
      currentTarget: args.plan,
      reason: `${methodDefinition.label}: current target is incomplete, so no review candidate was created.`,
      cycleWindow: args.cycleWindow,
    });
  }
  const resolvedCurrentRepQualification: PromotionQualificationArgs = currentRepQualification ?? promotionQualification;

  const history = args.history ?? [];
  const latestSession = history[0] ?? null;
  const basePlan = buildBaseTargetPlan({
    measurementType: args.plan.measurementType,
    setCount: targetSets,
    targetReps: currentRepTarget,
    minReps: bottomRep,
    maxReps: topRep,
    weight: targetWeight,
    weightUnit: targetWeightUnit,
  });
  const resolvedLoadIncrement = resolveLoadIncrementForPlan({
    plan: basePlan,
    configLoadIncrement: selection.config.loadIncrement,
    fallbackWeightUnit: args.fallbackWeightUnit,
    progressionStepPolicy: args.progressionStepPolicy,
  });
  const promotionWindow = evaluateQualificationWindow({
    config: selection.config.qualificationWindow,
    evidence: buildStrengthQualificationEvidence({
      history,
      qualification: promotionQualification,
    }),
    cycleWindow: args.cycleWindow,
  });
  const currentRepWindow = currentRepQualification
    ? evaluateQualificationWindow({
      config: selection.config.qualificationWindow,
      evidence: buildStrengthQualificationEvidence({
        history,
        qualification: currentRepQualification,
      }),
      cycleWindow: args.cycleWindow,
    })
    : promotionWindow;

  if (!latestSession) {
    return buildNoProgressionReviewCandidate({
      playbookId: selection.id,
      label: methodDefinition.label,
      currentTarget: basePlan,
      reason: `${methodDefinition.label}: no completed history yet.`,
      cycleWindow: args.cycleWindow,
    });
  }

  const bestTargetLoadSession = includesPromotionMeasurement(promotionQualification, "weight") && isFinitePositiveNumber(targetWeight)
    ? findBestTargetLoadSession({ history, targetWeight })
    : findBestPromotionQualifiedSession({
      history,
      qualification: {
        ...promotionQualification,
        repTarget: includesPromotionMeasurement(promotionQualification, "reps") ? currentRepTarget : null,
      },
    });
  if (!bestTargetLoadSession) {
    return buildNoProgressionReviewCandidate({
      playbookId: selection.id,
      label: methodDefinition.label,
      currentTarget: basePlan,
      reason: !latestSession.coveredTargetSets
        ? `${methodDefinition.label}: complete ${targetSets} work sets${includesPromotionMeasurement(promotionQualification, "weight") ? ` at ${formatWeightLabel(targetWeight, targetWeightUnit)}` : ""} to evaluate next cycle.`
        : `${methodDefinition.label}: no completed ${includesPromotionMeasurement(promotionQualification, "weight") ? "target-load " : ""}session is ready for cycle review.`,
      cycleWindow: args.cycleWindow,
      qualificationWindow: promotionWindow,
    });
  }

  const stallPolicy = resolveStallPolicyFromSelection(selection);
  const deloadConfig = resolveDeloadConfig(selection);

  if (stallPolicy === "deload_after_stall" && deloadConfig && isFinitePositiveNumber(targetWeight)) {
    const stallCount = countConsecutiveStalls({
      history,
      qualification: resolvedCurrentRepQualification,
    });

    if (stallCount >= deloadConfig.stallThreshold) {
      const reducedWeight = clampDeloadWeight(
        targetWeight * (1 - (deloadConfig.deloadPercent / 100)),
        resolvedLoadIncrement,
      );

      return {
        type: "deload",
        playbookId: selection.id,
        label: methodDefinition.label,
        currentTarget: basePlan,
        proposedTarget: {
          ...basePlan,
          repsMin: bottomRep,
          repsMax: bottomRep,
          weightMin: reducedWeight,
          weightMax: reducedWeight,
        },
        reason: "Deload policy: stall detected - reduce load and rebuild.",
        cycleWindow: args.cycleWindow ?? null,
      };
    }
  }

  const bestCurrentRepSession = currentRepQualification && includesPromotionMeasurement(currentRepQualification, "reps") && currentRepTarget < (promotionQualification.repTarget ?? topRep)
    ? findBestTopRangeSession({
      history,
      rows: args.historyRows,
      qualification: currentRepQualification,
    })
    : null;
  if (bestCurrentRepSession && currentRepTarget < (promotionQualification.repTarget ?? topRep)) {
    if (!currentRepWindow.ready) {
      return buildNoProgressionReviewCandidate({
        playbookId: selection.id,
        label: methodDefinition.label,
        currentTarget: basePlan,
        reason: formatQualificationWindowReason({
          methodLabel: methodDefinition.label,
          result: currentRepWindow,
        }),
        cycleWindow: args.cycleWindow,
        qualificationWindow: currentRepWindow,
      });
    }
    const nextReps = Math.min(topRep, currentRepTarget + 1);
    return {
      type: "promote",
      playbookId: selection.id,
      label: methodDefinition.label,
      currentTarget: basePlan,
      proposedTarget: {
        ...basePlan,
        repsTarget: nextReps,
      },
      reason: `${methodDefinition.label}: target reps complete - build reps at the same load.`,
      cycleWindow: args.cycleWindow ?? null,
      qualificationWindow: currentRepWindow,
      sourceSession: buildSourceSession(bestCurrentRepSession.session, latestSession),
    };
  }

  const bestPromotionSession = findBestTopRangeSession({
    history,
    rows: args.historyRows,
    qualification: promotionQualification,
  });
  if (!bestPromotionSession) {
    return buildNoProgressionReviewCandidate({
      playbookId: selection.id,
      label: methodDefinition.label,
      currentTarget: basePlan,
      reason: `${methodDefinition.label}: range is not complete yet.`,
      cycleWindow: args.cycleWindow,
    });
  }

  if (methodId === "double_progression") {
    if (!promotionWindow.ready) {
      return buildNoProgressionReviewCandidate({
        playbookId: selection.id,
        label: methodDefinition.label,
        currentTarget: basePlan,
        reason: formatQualificationWindowReason({
          methodLabel: methodDefinition.label,
          result: promotionWindow,
        }),
        cycleWindow: args.cycleWindow,
        qualificationWindow: promotionWindow,
      });
    }
    const promotionTarget = applyTargetMutation({
      plan: basePlan,
      promotionBasis: selection.config.promotionBasis,
      targetMutation: selection.config.targetMutation,
      progressionStepPolicy: args.progressionStepPolicy,
      loadStep: resolvedLoadIncrement,
      qualifiedValue: bestPromotionSession.qualifiedLoad,
    });
    if (!promotionTarget || !promotionTarget.changed) {
      return buildNoProgressionReviewCandidate({
        playbookId: selection.id,
        label: methodDefinition.label,
        currentTarget: basePlan,
        reason: promotionTarget
          ? describeTargetMutationReason({
            methodLabel: methodDefinition.label,
            mutationId: promotionTarget.mutationId,
            measurementType: basePlan.measurementType,
            wasCapped: promotionTarget.wasCapped,
          })
          : `${methodDefinition.label}: promotion step is unavailable.`,
        cycleWindow: args.cycleWindow,
      });
    }
    return {
      type: "promote",
      playbookId: selection.id,
      label: methodDefinition.label,
      currentTarget: basePlan,
      proposedTarget: promotionTarget.proposedTarget,
      reason: describeTargetMutationReason({
        methodLabel: methodDefinition.label,
        mutationId: promotionTarget.mutationId,
        measurementType: basePlan.measurementType,
        wasCapped: promotionTarget.wasCapped,
      }),
      cycleWindow: args.cycleWindow ?? null,
      qualificationWindow: promotionWindow,
      sourceSession: buildSourceSession(bestPromotionSession.session, latestSession),
    };
  }

  if (methodId === "fixed_load_rep_range_progression") {
    if (!promotionWindow.ready) {
      return buildNoProgressionReviewCandidate({
        playbookId: selection.id,
        label: methodDefinition.label,
        currentTarget: basePlan,
        reason: formatQualificationWindowReason({
          methodLabel: methodDefinition.label,
          result: promotionWindow,
        }),
        cycleWindow: args.cycleWindow,
        qualificationWindow: promotionWindow,
      });
    }
    return {
      type: "review",
      playbookId: selection.id,
      label: methodDefinition.label,
      currentTarget: basePlan,
      proposedTarget: basePlan,
      reason: `${methodDefinition.label}: range complete - review before increasing.`,
      cycleWindow: args.cycleWindow ?? null,
      qualificationWindow: promotionWindow,
      sourceSession: buildSourceSession(bestPromotionSession.session, latestSession),
    };
  }

  return buildNoProgressionReviewCandidate({
    playbookId: selection.id,
    label: methodDefinition.label,
    currentTarget: basePlan,
    reason: `${methodDefinition.label}: no cycle review candidate.`,
    cycleWindow: args.cycleWindow,
  });
}
