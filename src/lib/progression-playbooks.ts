import { formatWeight } from "@/lib/formatting";
import type { FitnessDistanceUnit } from "@/lib/fitness-distance-units";
import {
  detectActiveMeasurementsFromTargets,
  flattenPromotionMeasurementSequence,
  getPromotionMeasurementKey,
  normalizePromotionMeasurements,
  normalizePromotionMeasurementOrderMap,
  normalizePromotionMeasurementSequenceMap,
  resolvePromotionMeasurementsFromOrderMap,
  type ProgressionMeasurementKey,
  type PromotionMeasurementOrderMap,
  type PromotionMeasurementSequenceMap,
  type PromotionMeasurementKey,
} from "@/lib/progression-active-measurements";
import {
  buildDefaultPromotionSessionCountFieldMap,
  normalizePromotionGroupedSessionCountMap,
  normalizePromotionSessionCountMap,
  serializePromotionSessionCountFieldMap,
  type PromotionGroupedSessionCountMap,
  type PromotionSessionCountMap,
} from "@/lib/promotion-session-counts";
import {
  buildDefaultPromotionDirectionFieldMap,
  normalizePromotionGroupedDirectionMap,
  normalizePromotionDirectionMap,
  type PromotionGroupedDirectionMap,
  type PromotionDirectionMap,
} from "@/lib/promotion-directions";
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
  getDefaultTargetMutationForConfig,
  normalizeTargetMutation,
  reverseTargetMutation,
  type ProgressionTargetMutationId,
} from "@/lib/progression-target-mutation";
import {
  normalizeQualificationWindow,
  resolveQualificationWindowStatus,
  type QualificationWindowConfig,
  type QualificationWindowStatus,
} from "@/lib/progression-qualification-window";
import { applyProgressionVector } from "@/lib/progression-vector";
import { DEFAULT_PROGRESSION_STEP_OVERRIDES, DEFAULT_SET_FLOW_STEPS } from "@/lib/progression-step-defaults";
import {
  areSetFlowDirectionsStraight,
  getSetFlowDirectionConfigForLegacySetFlow,
  inferLegacySetFlowFromDirections,
  normalizeSetFlowDirectionConfig,
  type SetFlowDirection,
  type SetFlowDirectionConfig,
} from "@/lib/set-flow-directions";

type SetFlowMeasurementKey = "time" | "distance" | "reps" | "weight";
type SetFlowMeasurementSequence = SetFlowMeasurementKey[][];
type SetFlowCountMap = Partial<Record<SetFlowMeasurementKey, number>>;
type SetFlowGroupedCountMap = Record<string, number>;
type SetFlowGroupedDirectionMap = Record<string, SetFlowDirection>;

const SET_FLOW_MEASUREMENT_KEYS: SetFlowMeasurementKey[] = [
  "time",
  "distance",
  "reps",
  "weight",
];

function normalizeDirection(input: unknown): SetFlowDirection | null {
  return input === "up" || input === "down" || input === "straight"
    ? input
    : null;
}

function parsePositiveIntegerString(input: unknown) {
  if (typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim();
  if (!/^\d+$/u.test(trimmed)) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed > 0 ? trimmed : null;
}

function buildDefaultSetFlowCountFieldMap(defaultValue: string) {
  const fallback = parsePositiveIntegerString(defaultValue) ?? "3";
  return {
    time: fallback,
    distance: fallback,
    reps: fallback,
    weight: fallback,
  } as const;
}

function serializeSetFlowCountFieldMap(
  input: Partial<Record<SetFlowMeasurementKey, string>>,
): SetFlowCountMap | undefined {
  const nextMap: SetFlowCountMap = {};
  for (const key of SET_FLOW_MEASUREMENT_KEYS) {
    const parsed = parsePositiveIntegerString(input[key]);
    if (parsed) {
      nextMap[key] = Number(parsed);
    }
  }

  return Object.keys(nextMap).length > 0 ? nextMap : undefined;
}

function normalizeSetFlowCountMap(input: unknown): SetFlowCountMap | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const nextMap: SetFlowCountMap = {};
  for (const key of SET_FLOW_MEASUREMENT_KEYS) {
    const value = (input as Record<string, unknown>)[key];
    if (typeof value === "number" && Number.isInteger(value) && value > 0) {
      nextMap[key] = value;
    }
  }

  return Object.keys(nextMap).length > 0 ? nextMap : undefined;
}

function normalizeSetFlowGroupedCountMap(input: unknown): SetFlowGroupedCountMap | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const nextMap: SetFlowGroupedCountMap = {};
  for (const [key, rawValue] of Object.entries(input as Record<string, unknown>)) {
    if (typeof rawValue === "number" && Number.isInteger(rawValue) && rawValue > 0 && key.trim().length > 0) {
      nextMap[key] = rawValue;
    }
  }

  return Object.keys(nextMap).length > 0 ? nextMap : undefined;
}

function coerceSetFlowMeasurementKey(value: unknown): SetFlowMeasurementKey | null {
  return typeof value === "string" && SET_FLOW_MEASUREMENT_KEYS.includes(value as SetFlowMeasurementKey)
    ? value as SetFlowMeasurementKey
    : null;
}

function normalizeSetFlowMeasurementSequence(input: unknown): SetFlowMeasurementSequence {
  const normalizedGroups: SetFlowMeasurementSequence = [];
  const seen = new Set<SetFlowMeasurementKey>();

  for (const rawGroup of Array.isArray(input) ? input : []) {
    const group: SetFlowMeasurementKey[] = [];
    for (const rawMeasurement of Array.isArray(rawGroup) ? rawGroup : []) {
      const measurement = coerceSetFlowMeasurementKey(rawMeasurement);
      if (!measurement || seen.has(measurement)) {
        continue;
      }
      seen.add(measurement);
      group.push(measurement);
    }
    if (group.length > 0) {
      normalizedGroups.push(group);
    }
  }

  const missingMeasurements = SET_FLOW_MEASUREMENT_KEYS.filter((measurement) => !seen.has(measurement));
  if (normalizedGroups.length === 0) {
    return [[...SET_FLOW_MEASUREMENT_KEYS]];
  }

  for (const measurement of missingMeasurements) {
    normalizedGroups.push([measurement]);
  }

  return normalizedGroups;
}

function normalizeSetFlowGroupedDirectionMap(input: unknown): SetFlowGroupedDirectionMap | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const nextMap: SetFlowGroupedDirectionMap = {};
  for (const [key, rawValue] of Object.entries(input as Record<string, unknown>)) {
    const parsed = normalizeDirection(rawValue);
    if (parsed && key.trim().length > 0) {
      nextMap[key] = parsed;
    }
  }

  return Object.keys(nextMap).length > 0 ? nextMap : undefined;
}

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
    affects: "Seeds moderate rep ranges, Auto progression targets, and optional failure settings.",
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
    affects: "Seeds Auto progression targets and makes Deload policy available.",
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
    example: "In Auto mode, hitting 12 on all checked sets can earn promotion.",
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
    term: "Session Settings",
    meaning: "How eligible measurements are ordered, grouped, counted, and directed across successful sessions.",
    affects: "Progression sequence, active AND behavior, and the session-level progression example.",
    example: "A grouped Time + Distance lane with session count 3 holds that active group for 3 successful sessions before the flow advances.",
  },
  {
    term: "Session count",
    meaning: "How many successful sessions a measurement or active AND group holds before progression advances.",
    affects: "Qualification span, grouped session behavior, and progression example sequencing.",
    example: "Session count 2 means the same active measurement or group must qualify twice before the next progression move.",
  },
  {
    term: "Day Adjustment Settings",
    meaning: "The separate raised and lowered time, distance, rep, and weight steps used for each cycle day before session and set settings continue the progression flow.",
    affects: "Cycle-day targets, visible raised/lowered day inputs, and how each day adjusts before the workout starts.",
    example: "Day Adjustment Settings can raise Day 1, lower Day 2, and leave Day 3 straight before session progression begins.",
  },
  {
    term: "Set Settings",
    meaning: "How active measurements are ordered, grouped, counted, and directed across sets inside today's workout.",
    affects: "The within-session example, Quick Log set suggestions, and next-set defaults.",
    example: "A grouped Load + Reps set count of 3 holds that active set group for 3 sets before the flow advances.",
  },
  {
    term: "Stall",
    meaning: "Repeated logged misses against the current goal.",
    affects: "When regression policy activates.",
    example: "Stall = 2 means two missed attempts can trigger deload.",
  },
  {
    term: "Deload",
    meaning: "Reverse the current target by one cycle step to rebuild.",
    affects: "The same progressing target dimensions that the progression method normally moves forward.",
    example: "If the current target is one cycle step ahead of the last successful block, deload moves it back one cycle step.",
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

export type ProgressionDayMode = "synced" | "unsynced";

export type SetFlowConfigFields = {
  setSettingsEnabled?: boolean;
  setFlowSteps?: SetFlowStepConfig;
  setFlow?: SetFlowId;
  setFlowDirections?: SetFlowDirectionConfig;
  setFlowMeasurementSequence?: SetFlowMeasurementSequence;
  setFlowCountMap?: SetFlowCountMap;
  setFlowGroupedCountMap?: SetFlowGroupedCountMap;
  setFlowGroupedDirectionMap?: SetFlowGroupedDirectionMap;
};

export type ProgressionDayConfigFields = {
  dayProgressionMode?: ProgressionDayMode;
  dayProgressionSteps?: SetFlowStepConfig;
  dayLoweredProgressionSteps?: SetFlowStepConfig;
  effortWaveDirections?: SetFlowDirection[];
};

export type ProgressionPromotionConfigFields = {
  sessionSettingsEnabled?: boolean;
  setsMin?: number | null;
  setsMax?: number | null;
  promotionDirectionMap?: PromotionDirectionMap;
  promotionGroupedDirectionMap?: PromotionGroupedDirectionMap;
  promotionBasis?: ProgressionPromotionBasis;
  targetMutation?: ProgressionTargetMutationId;
  qualificationWindow?: QualificationWindowConfig;
  promotionMeasurementOrderMap?: PromotionMeasurementOrderMap;
  promotionMeasurementSequenceMap?: PromotionMeasurementSequenceMap;
  promotionSessionCountMap?: PromotionSessionCountMap;
  promotionGroupedSessionCountMap?: PromotionGroupedSessionCountMap;
  promotionRepRangePreview?: {
    min?: number;
    max?: number;
  };
  repPromotionThreshold?: RepPromotionThreshold;
  customRepPromotionTarget?: number | null;
};

export type DoubleProgressionConfig = {
  version: 1;
  loadIncrement: number;
  stepOverrides?: ProgressionStepOverrideConfig;
  stallPolicy?: ProgressionStallPolicy;
  stallThreshold?: number;
  deloadPercent?: number;
  autoUpdateRoutineGoals?: boolean;
} & ProgressionPromotionConfigFields & SetFlowConfigFields & ProgressionDayConfigFields;

export type FixedLoadRepRangeProgressionConfig = {
  version: 1;
  loadIncrement: number;
  stepOverrides?: ProgressionStepOverrideConfig;
  stallPolicy?: ProgressionStallPolicy;
  stallThreshold?: number;
  deloadPercent?: number;
  autoUpdateRoutineGoals?: boolean;
} & ProgressionPromotionConfigFields & SetFlowConfigFields & ProgressionDayConfigFields;

export type DeloadAfterStallConfig = {
  version: 1;
  loadIncrement: number;
  stepOverrides?: ProgressionStepOverrideConfig;
  stallThreshold: number;
  // Legacy compatibility field. Regression now reverses one cycle step instead of using a percent.
  deloadPercent: number;
} & ProgressionPromotionConfigFields & SetFlowConfigFields & ProgressionDayConfigFields;

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

const LEGACY_DELOAD_PERCENT_FALLBACK = 10;

function resolveLegacyDeloadPercent(value: unknown) {
  const parsed = typeof value === "number"
    ? value
    : isFinitePositiveNumber(value)
      ? Number(value)
      : null;

  if (parsed === null || Number.isNaN(parsed) || parsed >= 100) {
    return LEGACY_DELOAD_PERCENT_FALLBACK;
  }

  return parsed;
}

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
  distanceUnit?: FitnessDistanceUnit | null;
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
  distanceUnit?: FitnessDistanceUnit | null;
  calories?: number | null;
  isWarmup: boolean;
};

export type ProgressionHistorySession = {
  sessionId: string;
  sessionRecordId?: string | null;
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
  qualificationWindowLine?: string | null;
  qualificationWindowStatus?: QualificationWindowStatus | null;
  cycleWindow?: ProgressionReviewCycleWindow | null;
  sourceSession?: {
    sessionId: string;
    sessionRecordId?: string | null;
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
    shortExplanation: "After repeated logged misses, reverse one cycle step and rebuild. This is a stall policy, not a primary progression method.",
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
    label: "Manual",
    whatItDoes: "No stall policy is attached.",
    useItFor: "Exercises where missed targets should not trigger an automatic recovery rule.",
    inputMeanings: [],
    pattern: "No downshift happens unless you edit the goal.",
  },
  deload_after_stall: {
    id: "deload_after_stall",
    label: "Deload",
    whatItDoes: "After repeated logged misses on the current goal, reverse the target by one cycle step.",
    useItFor: "Exercises where repeated misses are meaningful.",
    inputMeanings: [
      "Stall = consecutive logged misses before regression",
      "Regression = reverse the current target by one cycle step",
      "Step = the same configured progression step used for rebuild",
    ],
    pattern: "Progression moves goals forward; regression moves the target back one cycle step.",
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

function normalizeProgressionSectionEnabled(value: unknown) {
  return value !== false;
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

  if (!isPositiveInteger(selection.config.stallThreshold)) {
    return null;
  }

  return {
    version: 1 as const,
    loadIncrement: selection.config.loadIncrement,
    stallThreshold: selection.config.stallThreshold,
    deloadPercent: resolveLegacyDeloadPercent(selection.config.deloadPercent),
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

function normalizeProgressionDayMode(value: unknown): ProgressionDayMode {
  return value === "synced" ? "synced" : "unsynced";
}

function normalizeEffortWaveDirections(value: unknown): SetFlowDirection[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const parsed = value
    .map((entry) => (entry === "up" || entry === "down" || entry === "straight" ? entry : null))
    .filter((entry): entry is SetFlowDirection => entry !== null);

  if (parsed.length === 0 || parsed.every((entry) => entry === "straight")) {
    return undefined;
  }

  return parsed;
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

function parseDayProgressionStepsFromFormData(
  formData: FormData,
  fieldNames: {
    load: string;
    reps: string;
    duration: string;
    distance: string;
  },
): SetFlowStepConfig | undefined {
  const loadStep = parseOptionalPositiveNumber(formData.get(fieldNames.load));
  const repStep = parseOptionalPositiveNumber(formData.get(fieldNames.reps));
  const durationSecondsStep = parseOptionalPositiveNumber(formData.get(fieldNames.duration));
  const distanceStep = parseOptionalPositiveNumber(formData.get(fieldNames.distance));
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

function attachSetFlowDirections<Config extends ProgressionPlaybookConfig>(
  config: Config,
  setFlowDirections: SetFlowDirectionConfig | undefined,
) {
  if (!setFlowDirections) {
    return config;
  }

  return {
    ...config,
    setFlowDirections,
  };
}

function attachDayProgressionConfig<Config extends ProgressionPlaybookConfig>(
  config: Config,
  args: {
    dayProgressionMode: ProgressionDayMode;
    dayProgressionSteps?: SetFlowStepConfig;
    dayLoweredProgressionSteps?: SetFlowStepConfig;
    effortWaveDirections?: SetFlowDirection[];
  },
) {
  return {
    ...config,
    dayProgressionMode: args.dayProgressionMode,
    ...(args.dayProgressionSteps ? { dayProgressionSteps: args.dayProgressionSteps } : {}),
    ...(args.dayLoweredProgressionSteps ? { dayLoweredProgressionSteps: args.dayLoweredProgressionSteps } : {}),
    ...(args.effortWaveDirections ? { effortWaveDirections: args.effortWaveDirections } : {}),
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

function resolveLoadPromotionTarget(args: {
  plan: ProgressionTargetPlan;
  targetWeight: number;
  qualifiedLoad: number | null;
  increment: number;
  progressionStepPolicy?: ProgressionStepPolicy | null;
}) {
  const result = applyProgressionVector({
    vectorId: "coupled_load_reps",
    plan: args.plan,
    progressionStepPolicy: args.progressionStepPolicy ?? {
      kind: "load",
      equipmentFamily: "unknown",
      label: "Load step",
      defaultValue: args.increment,
      unit: args.plan.weightUnit ?? "lbs",
      description: "Resolved progression load step.",
      source: "app_fallback",
    },
    qualifiedValue: args.qualifiedLoad,
  });

  return {
    nextWeight: result?.proposedTarget.weightMax ?? result?.proposedTarget.weightMin ?? args.targetWeight + args.increment,
    wasCapped: result?.wasCapped === true,
    qualifiedLoad: result?.qualifiedValue ?? args.targetWeight,
  };
}

function resolveTargetMutationForSelection(args: {
  selection: ProgressionPlaybookSelection;
  plan: ProgressionTargetPlan;
}) {
  return getDefaultTargetMutationForConfig({
    config: args.selection.config,
    plan: args.plan,
  });
}

function didProgressionTargetChange(currentTarget: ProgressionTargetPlan, proposedTarget: ProgressionTargetPlan) {
  return JSON.stringify(currentTarget) !== JSON.stringify(proposedTarget);
}

function describeTargetMutationReason(args: {
  methodLabel: string;
  targetMutation: ProgressionTargetMutationId;
  wasCapped?: boolean;
  measurementType: ProgressionMeasurementType;
}) {
  if (args.wasCapped) {
    return `${args.methodLabel}: target surpassed - update capped for review.`;
  }

  switch (args.targetMutation) {
  case "increase_load":
  case "increase_load_reset_reps":
    return `${args.methodLabel}: promotion threshold reached - increase load next cycle.`;
  case "increase_reps":
    return `${args.methodLabel}: promotion threshold reached - increase reps next cycle.`;
  case "increase_load_and_reps":
    return `${args.methodLabel}: promotion threshold reached - increase load and reps next cycle.`;
  case "increase_duration":
    return `${args.methodLabel}: time target complete - increase duration next cycle.`;
  case "increase_distance":
    return `${args.methodLabel}: distance target complete - increase distance next cycle.`;
  case "increase_duration_and_distance":
    return `${args.methodLabel}: target complete - increase duration and distance next cycle.`;
  case "none":
    return `${args.methodLabel}: readiness is complete but no target mutation is configured.`;
  default:
    return args.measurementType === "reps"
      ? `${args.methodLabel}: promotion threshold reached.`
      : `${args.methodLabel}: target complete.`;
  }
}

function findBestTargetLoadSession(args: {
  history: ProgressionHistorySession[];
  targetWeight: number;
  allowedSessionIds?: Set<string>;
}) {
  return args.history.find((session) =>
    (!args.allowedSessionIds || args.allowedSessionIds.has(session.sessionId))
    && session.coveredTargetSets
    && sessionCoversTargetLoad(session, args.targetWeight)) ?? null;
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
  const resolvedPromotionMeasurements = args.config.promotionMeasurementOrderMap
    ? resolvePromotionMeasurementsFromOrderMap({
      orderMap: args.config.promotionMeasurementOrderMap,
      activeMeasurements,
      measurementType: args.plan.measurementType,
      cardioVectorMode: resolveCardioVectorMode({
        measurementType: args.plan.measurementType,
        durationSeconds: args.plan.durationSeconds ?? null,
        distance: args.plan.distance ?? null,
        calories: args.plan.calories ?? null,
      }),
    }).promotionMeasurements
    : [];
  const promotionMeasurements = resolvedPromotionMeasurements.length > 0
    ? resolvedPromotionMeasurements
    : normalizePromotionMeasurements({
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

function resolveQualificationWindowConfig(input: unknown) {
  return normalizeQualificationWindow(input);
}

function resolveQualificationWindowStatusForHistory(args: {
  selection: ProgressionPlaybookSelection;
  history: ProgressionHistorySession[];
  qualification: PromotionQualificationArgs;
  cycleWindow?: ProgressionReviewCycleWindow | null;
  isQualifiedSession?: (session: ProgressionHistorySession) => boolean;
}) {
  const status = resolveQualificationWindowStatus({
    config: args.selection.config.qualificationWindow,
    evidence: args.history.map((session) => ({
      sessionId: session.sessionId,
      performedAt: session.performedAt,
      qualified: args.isQualifiedSession ? args.isQualifiedSession(session) : sessionQualifiesForPromotion(session, args.qualification),
    })),
    cycleWindow: args.cycleWindow,
  });

  return {
    status,
    matchedSessionIds: new Set(status.matchedSessionIds),
  };
}

function getQualificationWindowLine(selection: ProgressionPlaybookSelection, status: QualificationWindowStatus) {
  return Object.prototype.hasOwnProperty.call(selection.config, "qualificationWindow")
    ? status.statusLine
    : null;
}

function buildQualificationWindowBlockedReason(args: {
  methodLabel: string;
  qualificationWindowLine: string | null;
  unsupported: boolean;
  fallbackReason: string;
}) {
  if (args.qualificationWindowLine) {
    return args.unsupported
      ? `${args.methodLabel}: ${args.qualificationWindowLine.toLowerCase()}.`
      : `${args.methodLabel}: ${args.qualificationWindowLine}.`;
  }

  return args.fallbackReason;
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
  allowedSessionIds?: Set<string>;
}) {
  return args.history.find((session) =>
    (!args.allowedSessionIds || args.allowedSessionIds.has(session.sessionId))
    && sessionQualifiesForPromotion(session, args.qualification)) ?? null;
}

function findBestTopRangeSession(args: {
  history: ProgressionHistorySession[];
  rows?: ProgressionHistorySetRow[] | null;
  qualification: PromotionQualificationArgs;
  allowedSessionIds?: Set<string>;
}) {
  const qualifiedLoad = resolveHighestQualifiedLoadResult({
    rows: (args.rows ?? []).filter((row) => !args.allowedSessionIds || args.allowedSessionIds.has(row.sessionId)),
    targetSets: args.qualification.targetSets,
    topRep: args.qualification.repTarget,
    targetWeight: args.qualification.targetWeight,
    promotionMeasurements: args.qualification.promotionMeasurements,
  });
  const qualifiedSessions = args.history.filter((session) =>
    (!args.allowedSessionIds || args.allowedSessionIds.has(session.sessionId))
    && sessionQualifiesForPromotion(session, args.qualification));

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
    sessionRecordId: session.sessionRecordId ?? null,
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
  progressionStepPolicy?: ProgressionStepPolicy | null;
  cycleWindow?: ProgressionReviewCycleWindow | null;
}): ProgressionReviewCandidate {
  const basePlan = buildCardioBaseTargetPlan(args.plan);

  if (args.methodId === "fixed_load_rep_range_progression") {
    return {
      type: "review",
      playbookId: args.selection.id,
      label: args.methodLabel,
      currentTarget: basePlan,
      proposedTarget: basePlan,
      reason: `${args.methodLabel}: cardio target complete - review before increasing.`,
      cycleWindow: args.cycleWindow ?? null,
    };
  }

  if (args.methodId !== "double_progression") {
    return buildNoProgressionReviewCandidate({
      playbookId: args.selection.id,
      label: args.methodLabel,
      currentTarget: basePlan,
      reason: `${args.methodLabel}: no cardio progression candidate.`,
      cycleWindow: args.cycleWindow,
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
      });
    }

    const targetMutation = resolveTargetMutationForSelection({
      selection: args.selection,
      plan: basePlan,
    });
    const progression = applyTargetMutation({
      targetMutation,
      plan: basePlan,
      config: args.selection.config,
      progressionStepPolicy: args.progressionStepPolicy,
    });
    const proposedTarget = progression?.proposedTarget ?? {
      ...basePlan,
      durationSeconds: args.plan.durationSeconds + resolveDurationStepSeconds({
        plan: args.plan,
        configLoadIncrement: args.selection.config.loadIncrement,
        progressionStepPolicy: args.progressionStepPolicy,
      }),
    };

    return {
      type: "promote",
      playbookId: args.selection.id,
      label: args.methodLabel,
      currentTarget: basePlan,
      proposedTarget,
      reason: describeTargetMutationReason({
        methodLabel: args.methodLabel,
        targetMutation,
        measurementType: args.plan.measurementType,
      }),
      cycleWindow: args.cycleWindow ?? null,
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
      });
    }

    const targetMutation = resolveTargetMutationForSelection({
      selection: args.selection,
      plan: basePlan,
    });
    const progression = applyTargetMutation({
      targetMutation,
      plan: basePlan,
      config: args.selection.config,
      progressionStepPolicy: args.progressionStepPolicy,
    });
    const proposedTarget = progression?.proposedTarget ?? {
      ...basePlan,
      distance: Number((args.plan.distance + resolveDistanceStep({
        plan: args.plan,
        configLoadIncrement: args.selection.config.loadIncrement,
        progressionStepPolicy: args.progressionStepPolicy,
      })).toFixed(3)),
    };

    return {
      type: "promote",
      playbookId: args.selection.id,
      label: args.methodLabel,
      currentTarget: basePlan,
      proposedTarget,
      reason: describeTargetMutationReason({
        methodLabel: args.methodLabel,
        targetMutation,
        measurementType: args.plan.measurementType,
      }),
      cycleWindow: args.cycleWindow ?? null,
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
      });
    }

    const targetMutation = resolveTargetMutationForSelection({
      selection: args.selection,
      plan: basePlan,
    });
    const progression = applyTargetMutation({
      targetMutation,
      plan: basePlan,
      config: args.selection.config,
      progressionStepPolicy: args.progressionStepPolicy,
    });
    const proposedTarget = progression?.proposedTarget ?? {
      ...basePlan,
      durationSeconds: args.plan.durationSeconds + resolveDurationStepSeconds({
        plan: args.plan,
        configLoadIncrement: args.selection.config.loadIncrement,
        progressionStepPolicy: args.progressionStepPolicy,
      }),
      distance: Number((args.plan.distance + resolveDistanceStep({
        plan: args.plan,
        configLoadIncrement: args.selection.config.loadIncrement,
        progressionStepPolicy: args.progressionStepPolicy,
      })).toFixed(3)),
    };

    return {
      type: "promote",
      playbookId: args.selection.id,
      label: args.methodLabel,
      currentTarget: basePlan,
      proposedTarget,
      reason: describeTargetMutationReason({
        methodLabel: args.methodLabel,
        targetMutation,
        measurementType: args.plan.measurementType,
      }),
      cycleWindow: args.cycleWindow ?? null,
    };
  }

  return buildNoProgressionReviewCandidate({
    playbookId: args.selection.id,
    label: args.methodLabel,
    currentTarget: basePlan,
    reason: `${args.methodLabel}: cardio progression is not available for this target.`,
    cycleWindow: args.cycleWindow,
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
      dayProgressionMode: "unsynced",
      promotionBasis: DEFAULT_PROGRESSION_PROMOTION_BASIS,
      repPromotionThreshold: DEFAULT_REP_PROMOTION_THRESHOLD,
    };
  case "fixed_load_rep_range_progression":
    return {
      version: 1,
      loadIncrement: 5,
      stepOverrides: { ...DEFAULT_PROGRESSION_STEP_OVERRIDES },
      setFlowSteps: { ...DEFAULT_SET_FLOW_STEPS },
      dayProgressionMode: "unsynced",
      promotionBasis: DEFAULT_PROGRESSION_PROMOTION_BASIS,
      repPromotionThreshold: DEFAULT_REP_PROMOTION_THRESHOLD,
    };
  case "deload_after_stall":
    return { version: 1, loadIncrement: 5, stepOverrides: { ...DEFAULT_PROGRESSION_STEP_OVERRIDES }, setFlowSteps: { ...DEFAULT_SET_FLOW_STEPS }, dayProgressionMode: "unsynced", stallThreshold: 2, deloadPercent: 10 };
  }
}

function resolveConfiguredPromotionMeasurementOrderMap(input: unknown) {
  return normalizePromotionMeasurementOrderMap(input);
}

function resolveConfiguredPromotionMeasurementSequenceMap(input: unknown) {
  return normalizePromotionMeasurementSequenceMap(input);
}

function resolveConfiguredPromotionSessionCountMap(input: unknown) {
  return normalizePromotionSessionCountMap(input);
}

function resolveConfiguredPromotionDirectionMap(input: unknown) {
  return normalizePromotionDirectionMap(input);
}

function resolveConfiguredPromotionGroupedDirectionMap(input: unknown) {
  return normalizePromotionGroupedDirectionMap(input);
}

function resolveConfiguredPromotionGroupedSessionCountMap(input: unknown) {
  return normalizePromotionGroupedSessionCountMap(input);
}

function resolveConfiguredSetFlowMeasurementSequence(input: unknown) {
  return normalizeSetFlowMeasurementSequence(input);
}

function resolveConfiguredSetFlowCountMap(input: unknown) {
  return normalizeSetFlowCountMap(input);
}

function resolveConfiguredSetFlowGroupedCountMap(input: unknown) {
  return normalizeSetFlowGroupedCountMap(input);
}

function resolveConfiguredSetFlowGroupedDirectionMap(input: unknown) {
  return normalizeSetFlowGroupedDirectionMap(input);
}

function resolveConfiguredPromotionRepRangePreview(input: unknown) {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const source = input as { min?: unknown; max?: unknown };
  const min = isPositiveInteger(source.min) ? source.min : undefined;
  const max = isPositiveInteger(source.max) ? source.max : undefined;

  if (typeof min !== "number" || typeof max !== "number" || max < min) {
    return undefined;
  }

  return { min, max };
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
  const dayProgressionSteps = normalizeSetFlowSteps(config.dayProgressionSteps);
  const dayLoweredProgressionSteps = normalizeSetFlowSteps(config.dayLoweredProgressionSteps);
  const dayProgressionMode = normalizeProgressionDayMode(config.dayProgressionMode);
  const effortWaveDirections = normalizeEffortWaveDirections(config.effortWaveDirections);
  const normalizedSetFlow = normalizeSetFlowId(config.setFlow) ?? "straight_sets";
  const hasSetFlowDirections = Object.prototype.hasOwnProperty.call(config, "setFlowDirections");
  const setFlowDirections = hasSetFlowDirections
    ? normalizeSetFlowDirectionConfig(
      config.setFlowDirections,
      getSetFlowDirectionConfigForLegacySetFlow(normalizedSetFlow),
    )
    : undefined;
  const hasSetFlowMeasurementSequence = Object.prototype.hasOwnProperty.call(config, "setFlowMeasurementSequence");
  const setFlowMeasurementSequence = hasSetFlowMeasurementSequence
    ? resolveConfiguredSetFlowMeasurementSequence(config.setFlowMeasurementSequence)
    : undefined;
  const hasSetFlowCountMap = Object.prototype.hasOwnProperty.call(config, "setFlowCountMap");
  const setFlowCountMap = hasSetFlowCountMap
    ? resolveConfiguredSetFlowCountMap(config.setFlowCountMap)
    : undefined;
  const hasSetFlowGroupedCountMap = Object.prototype.hasOwnProperty.call(config, "setFlowGroupedCountMap");
  const setFlowGroupedCountMap = hasSetFlowGroupedCountMap
    ? resolveConfiguredSetFlowGroupedCountMap(config.setFlowGroupedCountMap)
    : undefined;
  const hasSetFlowGroupedDirectionMap = Object.prototype.hasOwnProperty.call(config, "setFlowGroupedDirectionMap");
  const setFlowGroupedDirectionMap = hasSetFlowGroupedDirectionMap
    ? resolveConfiguredSetFlowGroupedDirectionMap(config.setFlowGroupedDirectionMap)
    : undefined;
  const setSettingsEnabled = normalizeProgressionSectionEnabled(config.setSettingsEnabled);
  const hasPromotionMeasurementOrderMap = Object.prototype.hasOwnProperty.call(config, "promotionMeasurementOrderMap");
  const promotionMeasurementOrderMap = hasPromotionMeasurementOrderMap
    ? resolveConfiguredPromotionMeasurementOrderMap(config.promotionMeasurementOrderMap)
    : undefined;
  const hasPromotionMeasurementSequenceMap = Object.prototype.hasOwnProperty.call(config, "promotionMeasurementSequenceMap");
  const promotionMeasurementSequenceMap = hasPromotionMeasurementSequenceMap
    ? resolveConfiguredPromotionMeasurementSequenceMap(config.promotionMeasurementSequenceMap)
    : undefined;
  const hasPromotionDirectionMap = Object.prototype.hasOwnProperty.call(config, "promotionDirectionMap");
  const promotionDirectionMap = hasPromotionDirectionMap
    ? resolveConfiguredPromotionDirectionMap(config.promotionDirectionMap)
    : undefined;
  const hasPromotionGroupedDirectionMap = Object.prototype.hasOwnProperty.call(config, "promotionGroupedDirectionMap");
  const promotionGroupedDirectionMap = hasPromotionGroupedDirectionMap
    ? resolveConfiguredPromotionGroupedDirectionMap(config.promotionGroupedDirectionMap)
    : undefined;
  const hasPromotionSessionCountMap = Object.prototype.hasOwnProperty.call(config, "promotionSessionCountMap");
  const promotionSessionCountMap = hasPromotionSessionCountMap
    ? resolveConfiguredPromotionSessionCountMap(config.promotionSessionCountMap)
    : undefined;
  const hasPromotionGroupedSessionCountMap = Object.prototype.hasOwnProperty.call(config, "promotionGroupedSessionCountMap");
  const promotionGroupedSessionCountMap = hasPromotionGroupedSessionCountMap
    ? resolveConfiguredPromotionGroupedSessionCountMap(config.promotionGroupedSessionCountMap)
    : undefined;
  const sessionSettingsEnabled = normalizeProgressionSectionEnabled(config.sessionSettingsEnabled);
  const hasPromotionRepRangePreview = Object.prototype.hasOwnProperty.call(config, "promotionRepRangePreview");
  const promotionRepRangePreview = hasPromotionRepRangePreview
    ? resolveConfiguredPromotionRepRangePreview(config.promotionRepRangePreview)
    : undefined;
  const hasTargetMutation = Object.prototype.hasOwnProperty.call(config, "targetMutation");
  const targetMutation = hasTargetMutation
    ? normalizeTargetMutation(config.targetMutation, "none")
    : undefined;
  const hasQualificationWindow = Object.prototype.hasOwnProperty.call(config, "qualificationWindow");
  const qualificationWindow = hasQualificationWindow
    ? resolveQualificationWindowConfig(config.qualificationWindow)
    : undefined;
  const promotionConfig = normalizeProgressionPromotionConfig({
    promotionBasis: config.promotionBasis,
    repPromotionThreshold: config.repPromotionThreshold,
    customRepPromotionTarget: config.customRepPromotionTarget,
    fallbackBasis: DEFAULT_PROGRESSION_PROMOTION_BASIS,
    fallbackThreshold: DEFAULT_REP_PROMOTION_THRESHOLD,
  });
  const targetSetsMin = isPositiveInteger(config.setsMin) ? config.setsMin : null;
  const targetSetsMax = isPositiveInteger(config.setsMax) ? config.setsMax : null;

  if (id === "double_progression") {
    const stallPolicy = normalizeStallPolicy(config.stallPolicy);
    if (stallPolicy === "deload_after_stall" && !isPositiveInteger(config.stallThreshold)) {
      return null;
    }
    const deloadPercent = stallPolicy === "deload_after_stall"
      ? resolveLegacyDeloadPercent(config.deloadPercent)
      : undefined;

    const nextConfig: DoubleProgressionConfig = {
      version: 1,
      loadIncrement: config.loadIncrement,
      setsMin: targetSetsMin,
      setsMax: targetSetsMax,
      stepOverrides,
      setFlowSteps,
      dayProgressionMode,
      dayProgressionSteps,
      dayLoweredProgressionSteps,
      effortWaveDirections,
      stallPolicy,
      stallThreshold: stallPolicy === "deload_after_stall" ? config.stallThreshold as number : undefined,
      deloadPercent,
      autoUpdateRoutineGoals: normalizeAutoUpdateRoutineGoals(config.autoUpdateRoutineGoals),
      promotionBasis: promotionConfig.promotionBasis,
      repPromotionThreshold: promotionConfig.repPromotionThreshold,
    };
    if (targetMutation) {
      nextConfig.targetMutation = targetMutation;
    }
    if (qualificationWindow) {
      nextConfig.qualificationWindow = qualificationWindow;
    }
    if (promotionConfig.customRepPromotionTarget !== null) {
      nextConfig.customRepPromotionTarget = promotionConfig.customRepPromotionTarget;
    }
    if (promotionMeasurementOrderMap) {
      nextConfig.promotionMeasurementOrderMap = promotionMeasurementOrderMap;
    }
    if (promotionMeasurementSequenceMap) {
      nextConfig.promotionMeasurementSequenceMap = promotionMeasurementSequenceMap;
    }
    if (promotionDirectionMap) {
      nextConfig.promotionDirectionMap = promotionDirectionMap;
    }
    if (promotionGroupedDirectionMap) {
      nextConfig.promotionGroupedDirectionMap = promotionGroupedDirectionMap;
    }
    if (promotionSessionCountMap) {
      nextConfig.promotionSessionCountMap = promotionSessionCountMap;
    }
    if (promotionGroupedSessionCountMap) {
      nextConfig.promotionGroupedSessionCountMap = promotionGroupedSessionCountMap;
    }
    if (promotionRepRangePreview) {
      nextConfig.promotionRepRangePreview = promotionRepRangePreview;
    }
    if (!sessionSettingsEnabled) {
      nextConfig.sessionSettingsEnabled = false;
    }
    if (setFlowDirections) {
      nextConfig.setFlowDirections = setFlowDirections;
    }
    if (setFlowMeasurementSequence) {
      nextConfig.setFlowMeasurementSequence = setFlowMeasurementSequence;
    }
    if (setFlowCountMap) {
      nextConfig.setFlowCountMap = setFlowCountMap;
    }
    if (setFlowGroupedCountMap) {
      nextConfig.setFlowGroupedCountMap = setFlowGroupedCountMap;
    }
    if (setFlowGroupedDirectionMap) {
      nextConfig.setFlowGroupedDirectionMap = setFlowGroupedDirectionMap;
    }
    if (!setSettingsEnabled) {
      nextConfig.setSettingsEnabled = false;
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
    if (stallPolicy === "deload_after_stall" && !isPositiveInteger(config.stallThreshold)) {
      return null;
    }
    const deloadPercent = stallPolicy === "deload_after_stall"
      ? resolveLegacyDeloadPercent(config.deloadPercent)
      : undefined;

    const nextConfig: FixedLoadRepRangeProgressionConfig = {
      version: 1,
      loadIncrement: config.loadIncrement,
      setsMin: targetSetsMin,
      setsMax: targetSetsMax,
      stepOverrides,
      setFlowSteps,
      dayProgressionMode,
      dayProgressionSteps,
      dayLoweredProgressionSteps,
      effortWaveDirections,
      stallPolicy,
      stallThreshold: stallPolicy === "deload_after_stall" ? config.stallThreshold as number : undefined,
      deloadPercent,
      autoUpdateRoutineGoals: normalizeAutoUpdateRoutineGoals(config.autoUpdateRoutineGoals),
      promotionBasis: promotionConfig.promotionBasis,
      repPromotionThreshold: promotionConfig.repPromotionThreshold,
    };
    if (targetMutation) {
      nextConfig.targetMutation = targetMutation;
    }
    if (qualificationWindow) {
      nextConfig.qualificationWindow = qualificationWindow;
    }
    if (promotionConfig.customRepPromotionTarget !== null) {
      nextConfig.customRepPromotionTarget = promotionConfig.customRepPromotionTarget;
    }
    if (promotionMeasurementOrderMap) {
      nextConfig.promotionMeasurementOrderMap = promotionMeasurementOrderMap;
    }
    if (promotionMeasurementSequenceMap) {
      nextConfig.promotionMeasurementSequenceMap = promotionMeasurementSequenceMap;
    }
    if (promotionDirectionMap) {
      nextConfig.promotionDirectionMap = promotionDirectionMap;
    }
    if (promotionGroupedDirectionMap) {
      nextConfig.promotionGroupedDirectionMap = promotionGroupedDirectionMap;
    }
    if (promotionSessionCountMap) {
      nextConfig.promotionSessionCountMap = promotionSessionCountMap;
    }
    if (promotionGroupedSessionCountMap) {
      nextConfig.promotionGroupedSessionCountMap = promotionGroupedSessionCountMap;
    }
    if (promotionRepRangePreview) {
      nextConfig.promotionRepRangePreview = promotionRepRangePreview;
    }
    if (!sessionSettingsEnabled) {
      nextConfig.sessionSettingsEnabled = false;
    }
    if (setFlowDirections) {
      nextConfig.setFlowDirections = setFlowDirections;
    }
    if (setFlowMeasurementSequence) {
      nextConfig.setFlowMeasurementSequence = setFlowMeasurementSequence;
    }
    if (setFlowCountMap) {
      nextConfig.setFlowCountMap = setFlowCountMap;
    }
    if (setFlowGroupedCountMap) {
      nextConfig.setFlowGroupedCountMap = setFlowGroupedCountMap;
    }
    if (setFlowGroupedDirectionMap) {
      nextConfig.setFlowGroupedDirectionMap = setFlowGroupedDirectionMap;
    }
    if (!setSettingsEnabled) {
      nextConfig.setSettingsEnabled = false;
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

  if (!isPositiveInteger(config.stallThreshold)) {
    return null;
  }

  const nextConfig: DeloadAfterStallConfig = {
    version: 1,
    loadIncrement: config.loadIncrement,
    setsMin: targetSetsMin,
    setsMax: targetSetsMax,
    stepOverrides,
    setFlowSteps,
    dayProgressionMode,
    dayProgressionSteps,
    dayLoweredProgressionSteps,
    effortWaveDirections,
    stallThreshold: config.stallThreshold,
    deloadPercent: resolveLegacyDeloadPercent(config.deloadPercent),
  };
  if (targetMutation) {
    nextConfig.targetMutation = targetMutation;
  }
  if (qualificationWindow) {
    nextConfig.qualificationWindow = qualificationWindow;
  }
  if (promotionDirectionMap) {
    nextConfig.promotionDirectionMap = promotionDirectionMap;
  }
  if (promotionGroupedDirectionMap) {
    nextConfig.promotionGroupedDirectionMap = promotionGroupedDirectionMap;
  }
  if (setFlowMeasurementSequence) {
    nextConfig.setFlowMeasurementSequence = setFlowMeasurementSequence;
  }
  if (setFlowCountMap) {
    nextConfig.setFlowCountMap = setFlowCountMap;
  }
  if (setFlowGroupedCountMap) {
    nextConfig.setFlowGroupedCountMap = setFlowGroupedCountMap;
  }
  if (setFlowGroupedDirectionMap) {
    nextConfig.setFlowGroupedDirectionMap = setFlowGroupedDirectionMap;
  }
  if (!sessionSettingsEnabled) {
    nextConfig.sessionSettingsEnabled = false;
  }
  if (!setSettingsEnabled) {
    nextConfig.setSettingsEnabled = false;
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
  const dayProgressionSteps = parseDayProgressionStepsFromFormData(formData, {
    load: "progressionDayLoadStep",
    reps: "progressionDayRepStep",
    duration: "progressionDayDurationStep",
    distance: "progressionDayDistanceStep",
  });
  const dayLoweredProgressionSteps = parseDayProgressionStepsFromFormData(formData, {
    load: "progressionDayLoweredLoadStep",
    reps: "progressionDayLoweredRepStep",
    duration: "progressionDayLoweredDurationStep",
    distance: "progressionDayLoweredDistanceStep",
  });
  const dayProgressionMode = normalizeProgressionDayMode(String(formData.get("progressionDayMode") ?? "").trim());
  const rawEffortWaveDirectionsJson = String(formData.get("progressionEffortWaveDirectionsJson") ?? "").trim();
  const effortWaveDirections = rawEffortWaveDirectionsJson
    ? (() => {
      try {
        return normalizeEffortWaveDirections(JSON.parse(rawEffortWaveDirectionsJson));
      } catch {
        return undefined;
      }
    })()
    : undefined;
  const rawSetFlowDirectionsJson = String(formData.get("progressionSetFlowDirectionsJson") ?? "").trim();
  const parsedSetFlowDirections = rawSetFlowDirectionsJson
    ? (() => {
      try {
        return normalizeSetFlowDirectionConfig(JSON.parse(rawSetFlowDirectionsJson));
      } catch {
        return undefined;
      }
    })()
    : undefined;
  const setFlowDirections = parsedSetFlowDirections && (
    inferLegacySetFlowFromDirections(parsedSetFlowDirections) !== "straight_sets"
    || !areSetFlowDirectionsStraight(parsedSetFlowDirections)
  )
    ? parsedSetFlowDirections
    : undefined;
  const rawSetFlowMeasurementSequenceJson = String(formData.get("progressionSetFlowMeasurementSequenceJson") ?? "").trim();
  const setFlowMeasurementSequence = rawSetFlowMeasurementSequenceJson
    ? (() => {
      try {
        return resolveConfiguredSetFlowMeasurementSequence(JSON.parse(rawSetFlowMeasurementSequenceJson));
      } catch {
        return undefined;
      }
    })()
    : undefined;
  const rawSetFlowCountMapJson = String(formData.get("progressionSetFlowCountMapJson") ?? "").trim();
  const setFlowCountMap = rawSetFlowCountMapJson
    ? (() => {
      try {
        return resolveConfiguredSetFlowCountMap(JSON.parse(rawSetFlowCountMapJson));
      } catch {
        return undefined;
      }
    })()
    : undefined;
  const rawSetFlowGroupedCountMapJson = String(formData.get("progressionSetFlowGroupedCountMapJson") ?? "").trim();
  const setFlowGroupedCountMap = rawSetFlowGroupedCountMapJson
    ? (() => {
      try {
        return resolveConfiguredSetFlowGroupedCountMap(JSON.parse(rawSetFlowGroupedCountMapJson));
      } catch {
        return undefined;
      }
    })()
    : undefined;
  const rawSetFlowGroupedDirectionMapJson = String(formData.get("progressionSetFlowGroupedDirectionMapJson") ?? "").trim();
  const setFlowGroupedDirectionMap = rawSetFlowGroupedDirectionMapJson
    ? (() => {
      try {
        return resolveConfiguredSetFlowGroupedDirectionMap(JSON.parse(rawSetFlowGroupedDirectionMapJson));
      } catch {
        return undefined;
      }
    })()
    : undefined;
  const setSettingsEnabled = formData.get("progressionSetSettingsEnabled") !== "0";
  const setCount = parseOptionalPositiveInteger(formData.get("progressionSetCount")) ?? 3;
  const defaultSetFlowCountMap = serializeSetFlowCountFieldMap(buildDefaultSetFlowCountFieldMap("3"));
  const shouldSerializeSetFlowCountMap = JSON.stringify(setFlowCountMap ?? null)
    !== JSON.stringify(defaultSetFlowCountMap ?? null);
  const promotionConfig = normalizeProgressionPromotionConfig({
    promotionBasis: normalizePromotionBasis(String(formData.get("progressionPromotionBasis") ?? "").trim(), DEFAULT_PROGRESSION_PROMOTION_BASIS),
    repPromotionThreshold: normalizeRepPromotionThreshold(String(formData.get("progressionRepPromotionThreshold") ?? "").trim(), DEFAULT_REP_PROMOTION_THRESHOLD),
    customRepPromotionTarget: parseOptionalPositiveInteger(formData.get("progressionCustomRepPromotionTarget")),
    fallbackBasis: DEFAULT_PROGRESSION_PROMOTION_BASIS,
    fallbackThreshold: DEFAULT_REP_PROMOTION_THRESHOLD,
  });
  const hasExplicitTargetMutation = formData.get("progressionHasExplicitTargetMutation") === "1";
  const targetMutation = normalizeTargetMutation(
    String(formData.get("progressionTargetMutation") ?? "").trim(),
    "increase_load_reset_reps",
  );
  const hasExplicitQualificationWindow = formData.get("progressionHasExplicitQualificationWindow") === "1";
  const qualificationWindow = normalizeQualificationWindow({
    requiredQualifiedSessions: parseOptionalPositiveInteger(formData.get("progressionRequiredQualifiedSessions")),
    mode: String(formData.get("progressionQualificationWindowMode") ?? "").trim(),
    resetOnMiss: formData.get("progressionQualificationWindowResetOnMiss") === "1",
  });
  const shouldSerializeQualificationWindow =
    hasExplicitQualificationWindow
    || qualificationWindow.requiredQualifiedSessions !== 1
    || qualificationWindow.mode !== "latest"
    || qualificationWindow.resetOnMiss;
  const rawPromotionMeasurementOrdersJson = String(formData.get("progressionPromotionMeasurementOrdersJson") ?? "").trim();
  const promotionMeasurementOrderMap = rawPromotionMeasurementOrdersJson
    ? (() => {
      try {
        return resolveConfiguredPromotionMeasurementOrderMap(JSON.parse(rawPromotionMeasurementOrdersJson));
      } catch {
        return undefined;
      }
    })()
    : undefined;
  const rawPromotionMeasurementSequenceJson = String(formData.get("progressionPromotionMeasurementSequenceJson") ?? "").trim();
  const promotionMeasurementSequenceMap = rawPromotionMeasurementSequenceJson
    ? (() => {
      try {
        return resolveConfiguredPromotionMeasurementSequenceMap(JSON.parse(rawPromotionMeasurementSequenceJson));
      } catch {
        return undefined;
      }
    })()
    : undefined;
  const normalizedPromotionMeasurementOrderMap = promotionMeasurementSequenceMap
    ? resolveConfiguredPromotionMeasurementOrderMap(Object.fromEntries(
      Object.entries(promotionMeasurementSequenceMap).map(([family, sequence]) => [family, flattenPromotionMeasurementSequence(sequence)]),
    ))
    : promotionMeasurementOrderMap;
  const rawPromotionDirectionMapJson = String(formData.get("progressionPromotionDirectionMapJson") ?? "").trim();
  const promotionDirectionMap = rawPromotionDirectionMapJson
    ? (() => {
      try {
        return resolveConfiguredPromotionDirectionMap(JSON.parse(rawPromotionDirectionMapJson));
      } catch {
        return undefined;
      }
    })()
    : undefined;
  const rawPromotionGroupedDirectionMapJson = String(formData.get("progressionPromotionGroupedDirectionMapJson") ?? "").trim();
  const promotionGroupedDirectionMap = rawPromotionGroupedDirectionMapJson
    ? (() => {
      try {
        return resolveConfiguredPromotionGroupedDirectionMap(JSON.parse(rawPromotionGroupedDirectionMapJson));
      } catch {
        return undefined;
      }
    })()
    : undefined;
  const rawPromotionSessionCountMapJson = String(formData.get("progressionPromotionSessionCountMapJson") ?? "").trim();
  const promotionSessionCountMap = rawPromotionSessionCountMapJson
    ? (() => {
      try {
        return resolveConfiguredPromotionSessionCountMap(JSON.parse(rawPromotionSessionCountMapJson));
      } catch {
        return undefined;
      }
    })()
    : undefined;
  const rawPromotionGroupedSessionCountMapJson = String(formData.get("progressionPromotionGroupedSessionCountMapJson") ?? "").trim();
  const promotionGroupedSessionCountMap = rawPromotionGroupedSessionCountMapJson
    ? (() => {
      try {
        return resolveConfiguredPromotionGroupedSessionCountMap(JSON.parse(rawPromotionGroupedSessionCountMapJson));
      } catch {
        return undefined;
      }
    })()
    : undefined;
  const sessionSettingsEnabled = formData.get("progressionSessionSettingsEnabled") !== "0";
  const defaultPromotionSessionCountMap = serializePromotionSessionCountFieldMap(
    buildDefaultPromotionSessionCountFieldMap(String(qualificationWindow.requiredQualifiedSessions)),
  );
  const legacyImplicitPromotionSessionCountMap = serializePromotionSessionCountFieldMap(
    buildDefaultPromotionSessionCountFieldMap("1"),
  );
  const shouldSerializePromotionSessionCountMap = JSON.stringify(promotionSessionCountMap ?? null)
    !== JSON.stringify(defaultPromotionSessionCountMap ?? null)
    && JSON.stringify(promotionSessionCountMap ?? null)
      !== JSON.stringify(legacyImplicitPromotionSessionCountMap ?? null);
  const defaultPromotionDirectionMap = buildDefaultPromotionDirectionFieldMap();
  const shouldSerializePromotionDirectionMap = JSON.stringify(promotionDirectionMap ?? null)
    !== JSON.stringify(defaultPromotionDirectionMap ?? null);
  const rawPromotionRepRangePreviewJson = String(formData.get("progressionPromotionRepRangePreviewJson") ?? "").trim();
  const promotionRepRangePreview = rawPromotionRepRangePreviewJson
    ? (() => {
      try {
        return resolveConfiguredPromotionRepRangePreview(JSON.parse(rawPromotionRepRangePreviewJson));
      } catch {
        return undefined;
      }
    })()
    : undefined;
  const shouldSerializePromotionRepRangePreview = Boolean(
    promotionRepRangePreview
    && (promotionRepRangePreview.min !== 8 || promotionRepRangePreview.max !== 12),
  );

  if (stallPolicy === "none" && (playbookId === "double_progression" || playbookId === "fixed_load_rep_range_progression")) {
    let config: ProgressionPlaybookConfig = {
      version: 1,
      loadIncrement,
      ...(setCount !== 3 ? { setsMin: setCount, setsMax: setCount } : {}),
      stallPolicy,
      autoUpdateRoutineGoals,
      promotionBasis: promotionConfig.promotionBasis,
      ...(hasExplicitTargetMutation || targetMutation !== "increase_load_reset_reps" ? { targetMutation } : {}),
      ...(shouldSerializeQualificationWindow ? { qualificationWindow } : {}),
      ...(normalizedPromotionMeasurementOrderMap ? { promotionMeasurementOrderMap: normalizedPromotionMeasurementOrderMap } : {}),
      ...(promotionMeasurementSequenceMap ? { promotionMeasurementSequenceMap } : {}),
      ...(shouldSerializePromotionDirectionMap ? { promotionDirectionMap } : {}),
      ...(promotionGroupedDirectionMap ? { promotionGroupedDirectionMap } : {}),
      ...(shouldSerializePromotionSessionCountMap ? { promotionSessionCountMap } : {}),
      ...(promotionGroupedSessionCountMap ? { promotionGroupedSessionCountMap } : {}),
      ...(!sessionSettingsEnabled ? { sessionSettingsEnabled: false } : {}),
      ...(setFlowMeasurementSequence ? { setFlowMeasurementSequence } : {}),
      ...(shouldSerializeSetFlowCountMap ? { setFlowCountMap } : {}),
      ...(setFlowGroupedCountMap ? { setFlowGroupedCountMap } : {}),
      ...(setFlowGroupedDirectionMap ? { setFlowGroupedDirectionMap } : {}),
      ...(!setSettingsEnabled ? { setSettingsEnabled: false } : {}),
      ...(shouldSerializePromotionRepRangePreview ? { promotionRepRangePreview } : {}),
      repPromotionThreshold: promotionConfig.repPromotionThreshold,
      ...(promotionConfig.customRepPromotionTarget !== null ? { customRepPromotionTarget: promotionConfig.customRepPromotionTarget } : {}),
    };
    config = attachProgressionStepOverrides(config, stepOverrides);
    config = attachSetFlowSteps(config, setFlowSteps);
    config = attachSetFlowDirections(config, setFlowDirections);
    config = attachDayProgressionConfig(config, {
      dayProgressionMode,
      dayProgressionSteps,
      dayLoweredProgressionSteps,
      effortWaveDirections,
    });
    if (setFlow) {
      config.setFlow = setFlow;
    }
    return { ok: true, playbookId, config };
  }

  const rawStallThreshold = parseOptionalPositiveInteger(formData.get("progressionStallThreshold"));
  const stallThreshold = rawStallThreshold === null || Number.isNaN(rawStallThreshold)
    ? 2
    : rawStallThreshold;

  const rawDeloadPercent = parseOptionalPositiveNumber(formData.get("progressionDeloadPercent"));
  const deloadPercent = rawDeloadPercent === null || Number.isNaN(rawDeloadPercent) || rawDeloadPercent >= 100
    ? LEGACY_DELOAD_PERCENT_FALLBACK
    : rawDeloadPercent;

  let config: ProgressionPlaybookConfig = {
    version: 1,
    loadIncrement,
    ...(setCount !== 3 ? { setsMin: setCount, setsMax: setCount } : {}),
    stallPolicy: "deload_after_stall",
    stallThreshold,
    deloadPercent,
    autoUpdateRoutineGoals,
    promotionBasis: promotionConfig.promotionBasis,
    ...(hasExplicitTargetMutation || targetMutation !== "increase_load_reset_reps" ? { targetMutation } : {}),
    ...(shouldSerializeQualificationWindow ? { qualificationWindow } : {}),
    ...(normalizedPromotionMeasurementOrderMap ? { promotionMeasurementOrderMap: normalizedPromotionMeasurementOrderMap } : {}),
    ...(promotionMeasurementSequenceMap ? { promotionMeasurementSequenceMap } : {}),
    ...(shouldSerializePromotionDirectionMap ? { promotionDirectionMap } : {}),
    ...(promotionGroupedDirectionMap ? { promotionGroupedDirectionMap } : {}),
    ...(shouldSerializePromotionSessionCountMap ? { promotionSessionCountMap } : {}),
    ...(promotionGroupedSessionCountMap ? { promotionGroupedSessionCountMap } : {}),
    ...(!sessionSettingsEnabled ? { sessionSettingsEnabled: false } : {}),
    ...(setFlowMeasurementSequence ? { setFlowMeasurementSequence } : {}),
    ...(shouldSerializeSetFlowCountMap ? { setFlowCountMap } : {}),
    ...(setFlowGroupedCountMap ? { setFlowGroupedCountMap } : {}),
    ...(setFlowGroupedDirectionMap ? { setFlowGroupedDirectionMap } : {}),
    ...(!setSettingsEnabled ? { setSettingsEnabled: false } : {}),
    ...(shouldSerializePromotionRepRangePreview ? { promotionRepRangePreview } : {}),
    repPromotionThreshold: promotionConfig.repPromotionThreshold,
    ...(promotionConfig.customRepPromotionTarget !== null ? { customRepPromotionTarget: promotionConfig.customRepPromotionTarget } : {}),
  };
  config = attachProgressionStepOverrides(config, stepOverrides);
  config = attachSetFlowSteps(config, setFlowSteps);
  config = attachSetFlowDirections(config, setFlowDirections);
  config = attachDayProgressionConfig(config, {
    dayProgressionMode,
    dayProgressionSteps,
    dayLoweredProgressionSteps,
    effortWaveDirections,
  });
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
    return `If progress stalls for ${selection.config.stallThreshold} straight sessions, reverse the current target back one cycle step and rebuild.`;
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
    .map(([sessionId, rows]): ProgressionHistorySession | null => {
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
        sessionRecordId: ordered[0]?.sessionRecordId ?? null,
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
      };
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
  const targetLoadQualification: PromotionQualificationArgs = {
    ...promotionQualification,
    repTarget: includesPromotionMeasurement(promotionQualification, "reps") ? currentRepTarget : null,
  };
  const targetLoadWindow = resolveQualificationWindowStatusForHistory({
    selection,
    history,
    qualification: targetLoadQualification,
    isQualifiedSession: includesPromotionMeasurement(promotionQualification, "weight") && isFinitePositiveNumber(targetWeight)
      ? (session) => session.coveredTargetSets && sessionCoversTargetLoad(session, targetWeight)
      : undefined,
  });
  const currentRepWindow = resolveQualificationWindowStatusForHistory({
    selection,
    history,
    qualification: resolvedCurrentRepQualification,
  });
  const promotionWindow = resolveQualificationWindowStatusForHistory({
    selection,
    history,
    qualification: promotionQualification,
  });

  const bestTargetLoadSession = targetLoadWindow.status.supported && targetLoadWindow.status.satisfied
    ? (includesPromotionMeasurement(promotionQualification, "weight") && isFinitePositiveNumber(targetWeight)
      ? findBestTargetLoadSession({ history, targetWeight, allowedSessionIds: targetLoadWindow.matchedSessionIds })
      : findBestPromotionQualifiedSession({
        history,
        qualification: targetLoadQualification,
        allowedSessionIds: targetLoadWindow.matchedSessionIds,
      }))
    : null;
  if (!bestTargetLoadSession) {
    const reason = methodId === "fixed_load_rep_range_progression"
      ? `${methodDefinition.label}: hold ${currentLoadLabel} and build clean reps.`
      : !targetLoadWindow.status.supported || !targetLoadWindow.status.satisfied
        ? buildQualificationWindowBlockedReason({
          methodLabel: methodDefinition.label,
          qualificationWindowLine: getQualificationWindowLine(selection, targetLoadWindow.status),
          unsupported: !targetLoadWindow.status.supported,
          fallbackReason: `${methodDefinition.label}: no completed ${includesPromotionMeasurement(promotionQualification, "weight") ? "target-load " : ""}session is ready for cycle review.`,
        })
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

  if (stallPolicy === "deload_after_stall" && deloadConfig) {
    const stallCount = countConsecutiveStalls({
      history,
      qualification: resolvedCurrentRepQualification,
    });

    if (stallCount >= deloadConfig.stallThreshold) {
      const targetMutation = resolveTargetMutationForSelection({
        selection,
        plan: basePlan,
      });
      const regression = reverseTargetMutation({
        targetMutation,
        plan: basePlan,
        config: selection.config,
        progressionStepPolicy: args.progressionStepPolicy,
        loadStep: resolvedLoadIncrement,
      });

      if (regression) {
        return {
          playbookId: selection.id,
          label: methodDefinition.label,
          plan: regression.proposedTarget,
          changed: didProgressionTargetChange(basePlan, regression.proposedTarget),
          reason: "Deload policy: stall detected - reverse one cycle step and rebuild.",
        };
      }
    }
  }

  if (methodId === "double_progression") {
    const bestCurrentRepSession = currentRepWindow.status.supported
      && currentRepWindow.status.satisfied
      && currentRepQualification
      && includesPromotionMeasurement(currentRepQualification, "reps")
      && currentRepTarget < (promotionQualification.repTarget ?? topRep)
      ? findBestTopRangeSession({
      history,
      rows: args.historyRows,
      qualification: currentRepQualification,
      allowedSessionIds: currentRepWindow.matchedSessionIds,
    })
      : null;
    if (bestCurrentRepSession && currentRepTarget < (promotionQualification.repTarget ?? topRep)) {
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

    const bestPromotionSession = promotionWindow.status.supported && promotionWindow.status.satisfied
      ? findBestTopRangeSession({
        history,
        rows: args.historyRows,
        qualification: promotionQualification,
        allowedSessionIds: promotionWindow.matchedSessionIds,
      })
      : null;

    if (bestPromotionSession) {
      const targetMutation = resolveTargetMutationForSelection({
        selection,
        plan: basePlan,
      });
      const mutation = applyTargetMutation({
        targetMutation,
        plan: basePlan,
        config: selection.config,
        progressionStepPolicy: args.progressionStepPolicy,
        qualifiedValue: bestPromotionSession.qualifiedLoad,
        loadStep: args.progressionStepPolicy?.kind === "load" ? null : resolvedLoadIncrement,
      });
      if (!mutation) {
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
        plan: mutation.proposedTarget,
        changed: didProgressionTargetChange(basePlan, mutation.proposedTarget),
        reason: describeTargetMutationReason({
          methodLabel: methodDefinition.label,
          targetMutation,
          wasCapped: mutation.wasCapped,
          measurementType: args.plan.measurementType,
        }),
      };
    }

    return {
      playbookId: selection.id,
      label: methodDefinition.label,
      plan: basePlan,
      changed: false,
      reason: buildQualificationWindowBlockedReason({
        methodLabel: methodDefinition.label,
        qualificationWindowLine: getQualificationWindowLine(selection, promotionWindow.status),
        unsupported: !promotionWindow.status.supported,
        fallbackReason: `${methodDefinition.label}: range is not complete yet.`,
      }),
    };
  }

  if (methodId === "fixed_load_rep_range_progression") {
    const bestTopRangeSession = promotionWindow.status.supported && promotionWindow.status.satisfied
      ? findBestTopRangeSession({
        history,
        rows: args.historyRows,
        qualification: promotionQualification,
        allowedSessionIds: promotionWindow.matchedSessionIds,
      })
      : null;
    if (bestTopRangeSession) {
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
  qualificationWindowLine?: string | null;
  qualificationWindowStatus?: QualificationWindowStatus | null;
  cycleWindow?: ProgressionReviewCycleWindow | null;
}): ProgressionReviewCandidate {
  return {
    type: "none",
    playbookId: args.playbookId ?? null,
    label: args.label ?? null,
    currentTarget: args.currentTarget ?? null,
    proposedTarget: null,
    reason: args.reason,
    qualificationWindowLine: args.qualificationWindowLine ?? null,
    qualificationWindowStatus: args.qualificationWindowStatus ?? null,
    cycleWindow: args.cycleWindow ?? null,
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
      progressionStepPolicy: args.progressionStepPolicy,
      cycleWindow: args.cycleWindow,
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
  const targetLoadQualification: PromotionQualificationArgs = {
    ...promotionQualification,
    repTarget: includesPromotionMeasurement(promotionQualification, "reps") ? currentRepTarget : null,
  };
  const targetLoadWindow = resolveQualificationWindowStatusForHistory({
    selection,
    history,
    qualification: targetLoadQualification,
    cycleWindow: args.cycleWindow,
    isQualifiedSession: includesPromotionMeasurement(promotionQualification, "weight") && isFinitePositiveNumber(targetWeight)
      ? (session) => session.coveredTargetSets && sessionCoversTargetLoad(session, targetWeight)
      : undefined,
  });
  const currentRepWindow = resolveQualificationWindowStatusForHistory({
    selection,
    history,
    qualification: resolvedCurrentRepQualification,
    cycleWindow: args.cycleWindow,
  });
  const promotionWindow = resolveQualificationWindowStatusForHistory({
    selection,
    history,
    qualification: promotionQualification,
    cycleWindow: args.cycleWindow,
  });

  if (!latestSession) {
    return buildNoProgressionReviewCandidate({
      playbookId: selection.id,
      label: methodDefinition.label,
      currentTarget: basePlan,
      reason: `${methodDefinition.label}: no completed history yet.`,
      cycleWindow: args.cycleWindow,
    });
  }

  const bestTargetLoadSession = targetLoadWindow.status.supported && targetLoadWindow.status.satisfied
    ? (includesPromotionMeasurement(promotionQualification, "weight") && isFinitePositiveNumber(targetWeight)
      ? findBestTargetLoadSession({ history, targetWeight, allowedSessionIds: targetLoadWindow.matchedSessionIds })
      : findBestPromotionQualifiedSession({
        history,
        qualification: targetLoadQualification,
        allowedSessionIds: targetLoadWindow.matchedSessionIds,
      }))
    : null;
  if (!bestTargetLoadSession) {
    return buildNoProgressionReviewCandidate({
      playbookId: selection.id,
      label: methodDefinition.label,
      currentTarget: basePlan,
      reason: !targetLoadWindow.status.supported || !targetLoadWindow.status.satisfied
        ? buildQualificationWindowBlockedReason({
          methodLabel: methodDefinition.label,
          qualificationWindowLine: getQualificationWindowLine(selection, targetLoadWindow.status),
          unsupported: !targetLoadWindow.status.supported,
          fallbackReason: `${methodDefinition.label}: no completed ${includesPromotionMeasurement(promotionQualification, "weight") ? "target-load " : ""}session is ready for cycle review.`,
        })
        : !latestSession.coveredTargetSets
          ? `${methodDefinition.label}: complete ${targetSets} work sets${includesPromotionMeasurement(promotionQualification, "weight") ? ` at ${formatWeightLabel(targetWeight, targetWeightUnit)}` : ""} to evaluate next cycle.`
          : `${methodDefinition.label}: no completed ${includesPromotionMeasurement(promotionQualification, "weight") ? "target-load " : ""}session is ready for cycle review.`,
      qualificationWindowLine: getQualificationWindowLine(selection, targetLoadWindow.status),
      qualificationWindowStatus: targetLoadWindow.status,
      cycleWindow: args.cycleWindow,
    });
  }

  const stallPolicy = resolveStallPolicyFromSelection(selection);
  const deloadConfig = resolveDeloadConfig(selection);

  if (stallPolicy === "deload_after_stall" && deloadConfig) {
    const stallCount = countConsecutiveStalls({
      history,
      qualification: resolvedCurrentRepQualification,
    });

    if (stallCount >= deloadConfig.stallThreshold) {
      const targetMutation = resolveTargetMutationForSelection({
        selection,
        plan: basePlan,
      });
      const regression = reverseTargetMutation({
        targetMutation,
        plan: basePlan,
        config: selection.config,
        progressionStepPolicy: args.progressionStepPolicy,
        loadStep: resolvedLoadIncrement,
      });

      if (regression && didProgressionTargetChange(basePlan, regression.proposedTarget)) {
        return {
          type: "deload",
          playbookId: selection.id,
          label: methodDefinition.label,
          currentTarget: basePlan,
          proposedTarget: regression.proposedTarget,
          reason: "Deload policy: stall detected - reverse one cycle step and rebuild.",
          cycleWindow: args.cycleWindow ?? null,
        };
      }
    }
  }

  const bestCurrentRepSession = currentRepWindow.status.supported
    && currentRepWindow.status.satisfied
    && currentRepQualification
    && includesPromotionMeasurement(currentRepQualification, "reps")
    && currentRepTarget < (promotionQualification.repTarget ?? topRep)
    ? findBestTopRangeSession({
      history,
      rows: args.historyRows,
      qualification: currentRepQualification,
      allowedSessionIds: currentRepWindow.matchedSessionIds,
    })
    : null;
  if (bestCurrentRepSession && currentRepTarget < (promotionQualification.repTarget ?? topRep)) {
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
      qualificationWindowLine: getQualificationWindowLine(selection, currentRepWindow.status),
      qualificationWindowStatus: currentRepWindow.status,
      cycleWindow: args.cycleWindow ?? null,
      sourceSession: buildSourceSession(bestCurrentRepSession.session, latestSession),
    };
  }

  const bestPromotionSession = promotionWindow.status.supported && promotionWindow.status.satisfied
    ? findBestTopRangeSession({
      history,
      rows: args.historyRows,
      qualification: promotionQualification,
      allowedSessionIds: promotionWindow.matchedSessionIds,
    })
    : null;
  if (!bestPromotionSession) {
    return buildNoProgressionReviewCandidate({
      playbookId: selection.id,
      label: methodDefinition.label,
      currentTarget: basePlan,
      reason: buildQualificationWindowBlockedReason({
        methodLabel: methodDefinition.label,
        qualificationWindowLine: getQualificationWindowLine(selection, promotionWindow.status),
        unsupported: !promotionWindow.status.supported,
        fallbackReason: `${methodDefinition.label}: range is not complete yet.`,
      }),
      qualificationWindowLine: getQualificationWindowLine(selection, promotionWindow.status),
      qualificationWindowStatus: promotionWindow.status,
      cycleWindow: args.cycleWindow,
    });
  }

  if (methodId === "double_progression") {
    const targetMutation = resolveTargetMutationForSelection({
      selection,
      plan: basePlan,
    });
    const mutation = applyTargetMutation({
      targetMutation,
      plan: basePlan,
      config: selection.config,
      progressionStepPolicy: args.progressionStepPolicy,
      qualifiedValue: bestPromotionSession.qualifiedLoad,
      loadStep: args.progressionStepPolicy?.kind === "load" ? null : resolvedLoadIncrement,
    });
    if (!mutation) {
      return buildNoProgressionReviewCandidate({
        playbookId: selection.id,
        label: methodDefinition.label,
        currentTarget: basePlan,
        reason: `${methodDefinition.label}: promotion step is unavailable.`,
        cycleWindow: args.cycleWindow,
      });
    }
    return {
      type: "promote",
      playbookId: selection.id,
      label: methodDefinition.label,
      currentTarget: basePlan,
      proposedTarget: mutation.proposedTarget,
      reason: describeTargetMutationReason({
        methodLabel: methodDefinition.label,
        targetMutation,
        wasCapped: mutation.wasCapped,
        measurementType: args.plan.measurementType,
      }),
      qualificationWindowLine: getQualificationWindowLine(selection, promotionWindow.status),
      qualificationWindowStatus: promotionWindow.status,
      cycleWindow: args.cycleWindow ?? null,
      sourceSession: buildSourceSession(bestPromotionSession.session, latestSession),
    };
  }

  if (methodId === "fixed_load_rep_range_progression") {
    return {
      type: "review",
      playbookId: selection.id,
      label: methodDefinition.label,
      currentTarget: basePlan,
      proposedTarget: basePlan,
      reason: `${methodDefinition.label}: range complete - review before increasing.`,
      qualificationWindowLine: getQualificationWindowLine(selection, promotionWindow.status),
      qualificationWindowStatus: promotionWindow.status,
      cycleWindow: args.cycleWindow ?? null,
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
