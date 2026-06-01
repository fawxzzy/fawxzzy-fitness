import {
  getDefaultProgressionPlaybookConfig,
  PROGRESSION_PLAYBOOK_IDS,
  type ProgressionDayMode,
  validateProgressionPlaybookSelection,
  type ProgressionPlaybookConfig,
  type ProgressionPlaybookId,
  type ProgressionStallPolicy,
  type SetFlowId,
  type TrainingGoalId,
} from "@/lib/progression-playbooks";
import {
  DEFAULT_PROGRESSION_PROMOTION_BASIS,
  DEFAULT_REP_PROMOTION_THRESHOLD,
  normalizeProgressionPromotionConfig,
  type ProgressionPromotionBasis,
  type RepPromotionThreshold,
} from "@/lib/progression-promotion";
import {
  normalizeQualificationWindow,
  type QualificationWindowMode,
} from "@/lib/progression-qualification-window";
import {
  normalizeTargetMutation,
  type ProgressionTargetMutationId,
} from "@/lib/progression-target-mutation";
import {
  getDefaultSetFlowForTrainingGoal,
  normalizeSetFlowId,
} from "@/lib/set-flow";
import {
  areSetFlowDirectionsStraight,
  getSetFlowDirectionConfigForLegacySetFlow,
  inferLegacySetFlowFromDirections,
  normalizeSetFlowDirectionConfig,
  type SetFlowDirection,
} from "@/lib/set-flow-directions";
import { DEFAULT_PROGRESSION_STEP_OVERRIDES, DEFAULT_SET_FLOW_STEPS } from "@/lib/progression-step-defaults";
import {
  DEFAULT_PROMOTION_MEASUREMENT_ORDER_MAP,
  flattenPromotionMeasurementSequence,
  normalizePromotionMeasurementOrderMap,
  normalizePromotionMeasurementSequenceMap,
  PROMOTION_MEASUREMENT_FAMILIES,
  type PromotionMeasurementConnector,
  type ProgressionMeasurementKey,
  type PromotionMeasurementOrderMap,
  type PromotionMeasurementSequenceMap,
} from "@/lib/progression-active-measurements";
import {
  buildDefaultPromotionDirectionFieldMap,
  buildPromotionDirectionFieldMap,
  buildPromotionGroupedDirectionFieldMap,
  normalizePromotionGroupedDirectionMap,
  serializePromotionDirectionFieldMap,
  serializePromotionGroupedDirectionFieldMap,
  type PromotionDirectionFieldMap,
  type PromotionGroupedDirectionFieldMap,
} from "@/lib/promotion-directions";
import {
  buildDefaultPromotionSessionCountFieldMap,
  buildPromotionGroupedSessionCountFieldMap,
  buildPromotionSessionCountFieldMap,
  normalizePromotionGroupedSessionCountMap,
  normalizePromotionSessionCountMap,
  serializePromotionGroupedSessionCountFieldMap,
  serializePromotionSessionCountFieldMap,
  type PromotionGroupedSessionCountFieldMap,
  type PromotionSessionCountFieldMap,
} from "@/lib/promotion-session-counts";

type SetFlowMeasurementKey = "time" | "distance" | "reps" | "weight";
type SetFlowMeasurementSequence = SetFlowMeasurementKey[][];
type SetFlowCountFieldMap = Partial<Record<SetFlowMeasurementKey, string>>;
type SetFlowGroupedCountFieldMap = Record<string, string>;
type SetFlowGroupedDirectionFieldMap = Record<string, SetFlowDirection>;

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

function buildDefaultSetFlowCountFieldMap(defaultValue: string): SetFlowCountFieldMap {
  const fallback = parsePositiveIntegerString(defaultValue) ?? "3";

  return {
    time: fallback,
    distance: fallback,
    reps: fallback,
    weight: fallback,
  };
}

function buildSetFlowCountFieldMap(args: {
  defaultValue: string;
  savedCounts?: Partial<Record<SetFlowMeasurementKey, number>> | undefined;
}): SetFlowCountFieldMap {
  const nextMap = buildDefaultSetFlowCountFieldMap(args.defaultValue);
  for (const key of SET_FLOW_MEASUREMENT_KEYS) {
    const savedValue = args.savedCounts?.[key];
    if (typeof savedValue === "number" && savedValue > 0) {
      nextMap[key] = String(savedValue);
    }
  }

  return nextMap;
}

function buildSetFlowGroupedCountFieldMap(
  input: Record<string, number> | undefined,
): SetFlowGroupedCountFieldMap {
  const nextMap: SetFlowGroupedCountFieldMap = {};
  for (const [key, value] of Object.entries(input ?? {})) {
    if (Number.isInteger(value) && value > 0) {
      nextMap[key] = String(value);
    }
  }
  return nextMap;
}

function serializeSetFlowCountFieldMap(
  input: SetFlowCountFieldMap,
): Partial<Record<SetFlowMeasurementKey, number>> | undefined {
  const nextMap: Partial<Record<SetFlowMeasurementKey, number>> = {};
  for (const key of SET_FLOW_MEASUREMENT_KEYS) {
    const parsed = parsePositiveIntegerString(input[key]);
    if (parsed) {
      nextMap[key] = Number(parsed);
    }
  }

  return Object.keys(nextMap).length > 0 ? nextMap : undefined;
}

function serializeSetFlowGroupedCountFieldMap(
  input: SetFlowGroupedCountFieldMap,
): Record<string, number> | undefined {
  const nextMap: Record<string, number> = {};
  for (const [key, rawValue] of Object.entries(input)) {
    const parsed = parsePositiveIntegerString(rawValue);
    if (parsed && key.trim().length > 0) {
      nextMap[key] = Number(parsed);
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

function flattenSetFlowMeasurementSequence(sequence: SetFlowMeasurementSequence) {
  return sequence.flat();
}

function buildSetFlowLinksFromSequence(sequence: SetFlowMeasurementSequence): PromotionMeasurementConnector[] {
  const links: PromotionMeasurementConnector[] = [];

  for (const group of sequence) {
    for (let index = 0; index < group.length - 1; index += 1) {
      links.push("and");
    }
    if (group !== sequence[sequence.length - 1]) {
      links.push("then");
    }
  }

  return links;
}

function buildSetFlowSequenceFromState(args: {
  measurements: ProgressionMeasurementKey[];
  links: PromotionMeasurementConnector[];
}) {
  const groups: SetFlowMeasurementSequence = [];
  let currentGroup: SetFlowMeasurementKey[] = [];

  args.measurements.forEach((measurement, index) => {
    const normalizedMeasurement = coerceSetFlowMeasurementKey(measurement);
    if (!normalizedMeasurement) {
      return;
    }
    currentGroup.push(normalizedMeasurement);
    if (args.links[index] !== "and") {
      groups.push(currentGroup);
      currentGroup = [];
    }
  });

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return normalizeSetFlowMeasurementSequence(groups);
}

function normalizeSetFlowGroupedDirectionMap(input: unknown): Record<string, SetFlowDirection> | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const nextMap: Record<string, SetFlowDirection> = {};
  for (const [key, rawValue] of Object.entries(input as Record<string, unknown>)) {
    const parsed = normalizeDirection(rawValue);
    if (parsed && key.trim().length > 0) {
      nextMap[key] = parsed;
    }
  }

  return Object.keys(nextMap).length > 0 ? nextMap : undefined;
}

function buildSetFlowGroupedDirectionFieldMap(
  savedDirections?: Record<string, SetFlowDirection> | undefined,
): SetFlowGroupedDirectionFieldMap {
  const nextMap: SetFlowGroupedDirectionFieldMap = {};
  for (const [key, value] of Object.entries(savedDirections ?? {})) {
    const parsed = normalizeDirection(value);
    if (parsed && key.trim().length > 0) {
      nextMap[key] = parsed;
    }
  }
  return nextMap;
}

function serializeSetFlowGroupedDirectionFieldMap(
  input: SetFlowGroupedDirectionFieldMap,
): Record<string, SetFlowDirection> | undefined {
  const nextMap: Record<string, SetFlowDirection> = {};
  for (const [key, rawValue] of Object.entries(input)) {
    const parsed = normalizeDirection(rawValue);
    if (parsed && key.trim().length > 0) {
      nextMap[key] = parsed;
    }
  }
  return Object.keys(nextMap).length > 0 ? nextMap : undefined;
}

export type ProgressionPlaybookFormState = {
  progressionPlaybookId: ProgressionPlaybookId | "";
  progressionStallPolicy: ProgressionStallPolicy;
  progressionLoadIncrement: string;
  progressionStallThreshold: string;
  progressionDeloadPercent: string;
  progressionAutoUpdateRoutineGoals: boolean;
  progressionSetFlow: SetFlowId;
  progressionBarbellLoadIncrement: string;
  progressionDumbbellLoadIncrement: string;
  progressionMachineLoadIncrement: string;
  progressionCableLoadIncrement: string;
  progressionBodyweightRepIncrement: string;
  progressionDurationIncrementSeconds: string;
  progressionDistanceIncrement: string;
  progressionSetCount: string;
  progressionSetFlowLoadStep: string;
  progressionSetFlowRepStep: string;
  progressionSetFlowDurationStep: string;
  progressionSetFlowDistanceStep: string;
  progressionDayMode: ProgressionDayMode;
  progressionDayLoadStep: string;
  progressionDayRepStep: string;
  progressionDayDurationStep: string;
  progressionDayDistanceStep: string;
  progressionDayLoweredLoadStep: string;
  progressionDayLoweredRepStep: string;
  progressionDayLoweredDurationStep: string;
  progressionDayLoweredDistanceStep: string;
  progressionEffortWaveDirections: SetFlowDirection[];
  progressionSetFlowTimeDirection: SetFlowDirection;
  progressionSetFlowDistanceDirection: SetFlowDirection;
  progressionSetFlowRepDirection: SetFlowDirection;
  progressionSetFlowLoadDirection: SetFlowDirection;
  progressionSetFlowMeasurements: ProgressionMeasurementKey[];
  progressionSetFlowLinks: PromotionMeasurementConnector[];
  progressionSetFlowCountMap: SetFlowCountFieldMap;
  progressionSetFlowGroupedCountMap: SetFlowGroupedCountFieldMap;
  progressionSetFlowGroupedDirectionMap: Record<string, SetFlowDirection>;
  progressionPromotionBasis: ProgressionPromotionBasis;
  progressionStrengthPromotionMeasurements: ProgressionMeasurementKey[];
  progressionBodyweightPromotionMeasurements: ProgressionMeasurementKey[];
  progressionCardioPromotionMeasurements: ProgressionMeasurementKey[];
  progressionStrengthPromotionLinks: PromotionMeasurementConnector[];
  progressionBodyweightPromotionLinks: PromotionMeasurementConnector[];
  progressionCardioPromotionLinks: PromotionMeasurementConnector[];
  progressionPromotionRepRangeMin: string;
  progressionPromotionRepRangeMax: string;
  progressionRepPromotionThreshold: RepPromotionThreshold;
  progressionCustomRepPromotionTarget: string;
  progressionPromotionDirectionMap: PromotionDirectionFieldMap;
  progressionPromotionGroupedDirectionMap: PromotionGroupedDirectionFieldMap;
  progressionPromotionSessionCountMap: PromotionSessionCountFieldMap;
  progressionPromotionGroupedSessionCountMap: PromotionGroupedSessionCountFieldMap;
  progressionTargetMutation: ProgressionTargetMutationId;
  progressionHasExplicitTargetMutation: boolean;
  progressionRequiredQualifiedSessions: string;
  progressionQualificationWindowMode: QualificationWindowMode;
  progressionQualificationWindowResetOnMiss: boolean;
  progressionHasExplicitQualificationWindow: boolean;
};

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function normalizeProgressionPlaybookId(value: unknown): ProgressionPlaybookId | "" {
  if (value === "fixed_load_block" || value === "hold_and_review") {
    return "fixed_load_rep_range_progression";
  }

  return PROGRESSION_PLAYBOOK_IDS.includes(value as ProgressionPlaybookId)
    ? (value as ProgressionPlaybookId)
    : "";
}

function buildPromotionLinksFromSequence(sequence: ProgressionMeasurementKey[][]): PromotionMeasurementConnector[] {
  const links: PromotionMeasurementConnector[] = [];

  for (const group of sequence) {
    for (let index = 0; index < group.length - 1; index += 1) {
      links.push("and");
    }
    if (group !== sequence[sequence.length - 1]) {
      links.push("then");
    }
  }

  return links;
}

function buildPromotionSequenceFromState(args: {
  measurements: ProgressionMeasurementKey[];
  links: PromotionMeasurementConnector[];
}) {
  const groups: ProgressionMeasurementKey[][] = [];
  let currentGroup: ProgressionMeasurementKey[] = [];

  args.measurements.forEach((measurement, index) => {
    currentGroup.push(measurement);
    const connector = args.links[index];
    if (connector !== "and") {
      groups.push(currentGroup);
      currentGroup = [];
    }
  });

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

export function createProgressionPlaybookFormState({
  playbookId,
  config,
}: {
  playbookId?: ProgressionPlaybookId | string | null;
  config?: Record<string, unknown> | null;
} = {}): ProgressionPlaybookFormState {
  const normalizedPlaybookId = normalizeProgressionPlaybookId(playbookId);
  const selection = validateProgressionPlaybookSelection({
    playbookId: normalizedPlaybookId,
    config,
  });
  const effectivePlaybookId = normalizedPlaybookId === "deload_after_stall" ? "double_progression" : normalizedPlaybookId;
  const defaultConfig = effectivePlaybookId
    ? selection?.config ?? getDefaultProgressionPlaybookConfig(effectivePlaybookId)
    : null;
  const progressionSetFlow = normalizeSetFlowId(selection?.config.setFlow ?? config?.setFlow) ?? "straight_sets";
  const setFlowDirections = normalizeSetFlowDirectionConfig(
    defaultConfig?.setFlowDirections,
    getSetFlowDirectionConfigForLegacySetFlow(progressionSetFlow),
  );
  const dayProgressionSteps = defaultConfig?.dayProgressionSteps;
  const dayLoweredProgressionSteps = defaultConfig?.dayLoweredProgressionSteps ?? defaultConfig?.dayProgressionSteps;
  const effortWaveDirections: SetFlowDirection[] = Array.isArray(defaultConfig?.effortWaveDirections) && defaultConfig.effortWaveDirections.length > 0
    ? defaultConfig.effortWaveDirections.map((direction) => (direction === "up" || direction === "down" || direction === "straight" ? direction : "straight"))
    : ["straight", "straight", "straight", "straight", "straight", "straight", "straight"];
  const stallPolicy = selection?.id === "deload_after_stall" || selection?.config.stallPolicy === "deload_after_stall"
    ? "deload_after_stall"
    : "none";
  const deloadConfig = stallPolicy === "deload_after_stall"
    ? selection?.id === "deload_after_stall"
      ? selection.config
      : selection?.config.stallPolicy === "deload_after_stall" && selection.config.stallThreshold && selection.config.deloadPercent
        ? {
            version: 1 as const,
            loadIncrement: selection.config.loadIncrement,
            stallThreshold: selection.config.stallThreshold,
            deloadPercent: selection.config.deloadPercent,
          }
        : getDefaultProgressionPlaybookConfig("deload_after_stall")
    : null;
  const promotionMeasurementSequenceMap = normalizePromotionMeasurementSequenceMap(defaultConfig?.promotionMeasurementSequenceMap);
  const promotionMeasurementOrderMap = normalizePromotionMeasurementOrderMap(defaultConfig?.promotionMeasurementOrderMap ?? Object.fromEntries(
    PROMOTION_MEASUREMENT_FAMILIES.map((family) => [family, flattenPromotionMeasurementSequence(promotionMeasurementSequenceMap[family])]),
  ));
  const promotionRepRangePreview = defaultConfig?.promotionRepRangePreview;
  const promotionDirectionMap = buildPromotionDirectionFieldMap(defaultConfig?.promotionDirectionMap);
  const promotionGroupedDirectionMap = buildPromotionGroupedDirectionFieldMap(
    normalizePromotionGroupedDirectionMap(defaultConfig?.promotionGroupedDirectionMap),
  );
  const hasExplicitTargetMutation = Boolean(defaultConfig && Object.prototype.hasOwnProperty.call(defaultConfig, "targetMutation"));
  const targetMutation = normalizeTargetMutation(defaultConfig?.targetMutation, "increase_load_reset_reps");
  const hasExplicitQualificationWindow = Boolean(defaultConfig && Object.prototype.hasOwnProperty.call(defaultConfig, "qualificationWindow"));
  const qualificationWindow = normalizeQualificationWindow(defaultConfig?.qualificationWindow);
  const progressionRequiredQualifiedSessions = String(qualificationWindow.requiredQualifiedSessions);
  const promotionSessionCountMap = buildPromotionSessionCountFieldMap({
    defaultValue: progressionRequiredQualifiedSessions,
    savedCounts: normalizePromotionSessionCountMap(defaultConfig?.promotionSessionCountMap),
  });
  const promotionGroupedSessionCountMap = buildPromotionGroupedSessionCountFieldMap(
    normalizePromotionGroupedSessionCountMap(defaultConfig?.promotionGroupedSessionCountMap),
  );
  const setFlowMeasurementSequence = normalizeSetFlowMeasurementSequence(defaultConfig?.setFlowMeasurementSequence);
  const setFlowMeasurements = flattenSetFlowMeasurementSequence(setFlowMeasurementSequence);
  const setFlowLinks = buildSetFlowLinksFromSequence(setFlowMeasurementSequence);
  const setFlowCountDefault = formatNumber(defaultConfig?.setsMin ?? defaultConfig?.setsMax ?? 3);
  const setFlowCountMap = buildSetFlowCountFieldMap({
    defaultValue: setFlowCountDefault,
    savedCounts: defaultConfig?.setFlowCountMap,
  });
  const setFlowGroupedCountMap = buildSetFlowGroupedCountFieldMap(defaultConfig?.setFlowGroupedCountMap);
  const setFlowGroupedDirectionMap = buildSetFlowGroupedDirectionFieldMap(
    normalizeSetFlowGroupedDirectionMap(defaultConfig?.setFlowGroupedDirectionMap),
  );
  const explicitSetFlowSteps = defaultConfig?.setFlowSteps;

  return {
    progressionPlaybookId: effectivePlaybookId,
    progressionStallPolicy: effectivePlaybookId ? stallPolicy : "none",
    progressionLoadIncrement: defaultConfig ? formatNumber(defaultConfig.loadIncrement) : "5",
    progressionBarbellLoadIncrement: formatNumber(defaultConfig?.stepOverrides?.barbellLoadIncrement ?? DEFAULT_PROGRESSION_STEP_OVERRIDES.barbellLoadIncrement),
    progressionDumbbellLoadIncrement: formatNumber(defaultConfig?.stepOverrides?.dumbbellLoadIncrement ?? DEFAULT_PROGRESSION_STEP_OVERRIDES.dumbbellLoadIncrement),
    progressionMachineLoadIncrement: formatNumber(defaultConfig?.stepOverrides?.machineLoadIncrement ?? DEFAULT_PROGRESSION_STEP_OVERRIDES.machineLoadIncrement),
    progressionCableLoadIncrement: formatNumber(defaultConfig?.stepOverrides?.cableLoadIncrement ?? DEFAULT_PROGRESSION_STEP_OVERRIDES.cableLoadIncrement),
    progressionBodyweightRepIncrement: formatNumber(defaultConfig?.stepOverrides?.bodyweightRepIncrement ?? DEFAULT_PROGRESSION_STEP_OVERRIDES.bodyweightRepIncrement),
    progressionDurationIncrementSeconds: formatNumber(defaultConfig?.stepOverrides?.durationSecondsIncrement ?? DEFAULT_PROGRESSION_STEP_OVERRIDES.durationSecondsIncrement),
    progressionDistanceIncrement: formatNumber(defaultConfig?.stepOverrides?.distanceIncrement ?? DEFAULT_PROGRESSION_STEP_OVERRIDES.distanceIncrement),
    progressionSetCount: formatNumber(defaultConfig?.setsMin ?? defaultConfig?.setsMax ?? 3),
    progressionSetFlowLoadStep: formatNumber(explicitSetFlowSteps?.loadStep ?? DEFAULT_SET_FLOW_STEPS.loadStep),
    progressionSetFlowRepStep: formatNumber(explicitSetFlowSteps?.repStep ?? DEFAULT_SET_FLOW_STEPS.repStep),
    progressionSetFlowDurationStep: explicitSetFlowSteps?.durationSecondsStep ? formatNumber(explicitSetFlowSteps.durationSecondsStep) : "",
    progressionSetFlowDistanceStep: explicitSetFlowSteps?.distanceStep ? formatNumber(explicitSetFlowSteps.distanceStep) : "",
    progressionDayMode: defaultConfig?.dayProgressionMode ?? "unsynced",
    progressionDayLoadStep: formatNumber(dayProgressionSteps?.loadStep ?? defaultConfig?.stepOverrides?.barbellLoadIncrement ?? DEFAULT_PROGRESSION_STEP_OVERRIDES.barbellLoadIncrement),
    progressionDayRepStep: formatNumber(dayProgressionSteps?.repStep ?? defaultConfig?.stepOverrides?.bodyweightRepIncrement ?? DEFAULT_PROGRESSION_STEP_OVERRIDES.bodyweightRepIncrement),
    progressionDayDurationStep: formatNumber(dayProgressionSteps?.durationSecondsStep ?? defaultConfig?.stepOverrides?.durationSecondsIncrement ?? DEFAULT_PROGRESSION_STEP_OVERRIDES.durationSecondsIncrement),
    progressionDayDistanceStep: formatNumber(dayProgressionSteps?.distanceStep ?? defaultConfig?.stepOverrides?.distanceIncrement ?? DEFAULT_PROGRESSION_STEP_OVERRIDES.distanceIncrement),
    progressionDayLoweredLoadStep: formatNumber(dayLoweredProgressionSteps?.loadStep ?? dayProgressionSteps?.loadStep ?? defaultConfig?.stepOverrides?.barbellLoadIncrement ?? DEFAULT_PROGRESSION_STEP_OVERRIDES.barbellLoadIncrement),
    progressionDayLoweredRepStep: formatNumber(dayLoweredProgressionSteps?.repStep ?? dayProgressionSteps?.repStep ?? defaultConfig?.stepOverrides?.bodyweightRepIncrement ?? DEFAULT_PROGRESSION_STEP_OVERRIDES.bodyweightRepIncrement),
    progressionDayLoweredDurationStep: formatNumber(dayLoweredProgressionSteps?.durationSecondsStep ?? dayProgressionSteps?.durationSecondsStep ?? defaultConfig?.stepOverrides?.durationSecondsIncrement ?? DEFAULT_PROGRESSION_STEP_OVERRIDES.durationSecondsIncrement),
    progressionDayLoweredDistanceStep: formatNumber(dayLoweredProgressionSteps?.distanceStep ?? dayProgressionSteps?.distanceStep ?? defaultConfig?.stepOverrides?.distanceIncrement ?? DEFAULT_PROGRESSION_STEP_OVERRIDES.distanceIncrement),
    progressionEffortWaveDirections: effortWaveDirections,
    progressionSetFlowTimeDirection: setFlowDirections.time,
    progressionSetFlowDistanceDirection: setFlowDirections.distance,
    progressionSetFlowRepDirection: setFlowDirections.reps,
    progressionSetFlowLoadDirection: setFlowDirections.weight,
    progressionSetFlowMeasurements: setFlowMeasurements,
    progressionSetFlowLinks: setFlowLinks,
    progressionSetFlowCountMap: setFlowCountMap,
    progressionSetFlowGroupedCountMap: setFlowGroupedCountMap,
    progressionSetFlowGroupedDirectionMap: setFlowGroupedDirectionMap,
    progressionStallThreshold: deloadConfig ? String(deloadConfig.stallThreshold) : "2",
    progressionDeloadPercent: deloadConfig ? formatNumber(deloadConfig.deloadPercent) : "10",
    progressionAutoUpdateRoutineGoals: Boolean(selection?.id !== "deload_after_stall" && selection?.config.autoUpdateRoutineGoals),
    progressionSetFlow,
    progressionPromotionBasis: defaultConfig?.promotionBasis ?? DEFAULT_PROGRESSION_PROMOTION_BASIS,
    progressionStrengthPromotionMeasurements: [...promotionMeasurementOrderMap.strength],
    progressionBodyweightPromotionMeasurements: [...promotionMeasurementOrderMap.bodyweight],
    progressionCardioPromotionMeasurements: [...promotionMeasurementOrderMap.cardio],
    progressionStrengthPromotionLinks: buildPromotionLinksFromSequence(promotionMeasurementSequenceMap.strength),
    progressionBodyweightPromotionLinks: buildPromotionLinksFromSequence(promotionMeasurementSequenceMap.bodyweight),
    progressionCardioPromotionLinks: buildPromotionLinksFromSequence(promotionMeasurementSequenceMap.cardio),
    progressionPromotionRepRangeMin: formatNumber(promotionRepRangePreview?.min ?? 8),
    progressionPromotionRepRangeMax: formatNumber(promotionRepRangePreview?.max ?? 12),
    progressionRepPromotionThreshold: defaultConfig?.repPromotionThreshold ?? DEFAULT_REP_PROMOTION_THRESHOLD,
    progressionCustomRepPromotionTarget: typeof defaultConfig?.customRepPromotionTarget === "number"
      ? formatNumber(defaultConfig.customRepPromotionTarget)
      : "",
    progressionPromotionDirectionMap: promotionDirectionMap,
    progressionPromotionGroupedDirectionMap: promotionGroupedDirectionMap,
    progressionPromotionSessionCountMap: promotionSessionCountMap,
    progressionPromotionGroupedSessionCountMap: promotionGroupedSessionCountMap,
    progressionTargetMutation: targetMutation,
    progressionHasExplicitTargetMutation: hasExplicitTargetMutation,
    progressionRequiredQualifiedSessions,
    progressionQualificationWindowMode: qualificationWindow.mode,
    progressionQualificationWindowResetOnMiss: qualificationWindow.resetOnMiss,
    progressionHasExplicitQualificationWindow: hasExplicitQualificationWindow,
  };
}

export function createProgressionPlaybookFormStateForTrainingGoal(goal: TrainingGoalId): ProgressionPlaybookFormState {
  switch (goal) {
  case "build_muscle":
    return createProgressionPlaybookFormState({
      playbookId: "double_progression",
      config: { version: 1, loadIncrement: 5, stallPolicy: "none", autoUpdateRoutineGoals: false, setFlow: getDefaultSetFlowForTrainingGoal(goal) },
    });
  case "build_strength":
    return createProgressionPlaybookFormState({
      playbookId: "double_progression",
      config: { version: 1, loadIncrement: 5, stallPolicy: "none", autoUpdateRoutineGoals: false, setFlow: getDefaultSetFlowForTrainingGoal(goal) },
    });
  case "maintain":
  case "conditioning":
    return {
      ...createProgressionPlaybookFormState(),
      progressionSetFlow: getDefaultSetFlowForTrainingGoal(goal),
    };
  case "technique_rehab":
    return {
      ...createProgressionPlaybookFormState(),
      progressionSetFlow: getDefaultSetFlowForTrainingGoal(goal),
    };
  }
}

export function isTrainingGoalCustomized(
  goal: TrainingGoalId | "",
  state: ProgressionPlaybookFormState,
) {
  if (!goal) {
    return false;
  }

  return !areProgressionPlaybookFormStatesEqual(
    state,
    createProgressionPlaybookFormStateForTrainingGoal(goal),
  );
}

export function buildProgressionPlaybookFormSnapshot(state: ProgressionPlaybookFormState) {
  return JSON.stringify({
    progressionPlaybookId: state.progressionPlaybookId,
    progressionStallPolicy: state.progressionStallPolicy,
    progressionLoadIncrement: state.progressionLoadIncrement,
    progressionStallThreshold: state.progressionStallThreshold,
    progressionDeloadPercent: state.progressionDeloadPercent,
    progressionAutoUpdateRoutineGoals: state.progressionAutoUpdateRoutineGoals,
    progressionSetFlow: state.progressionSetFlow,
    progressionBarbellLoadIncrement: state.progressionBarbellLoadIncrement,
    progressionDumbbellLoadIncrement: state.progressionDumbbellLoadIncrement,
    progressionMachineLoadIncrement: state.progressionMachineLoadIncrement,
    progressionCableLoadIncrement: state.progressionCableLoadIncrement,
    progressionBodyweightRepIncrement: state.progressionBodyweightRepIncrement,
    progressionDurationIncrementSeconds: state.progressionDurationIncrementSeconds,
    progressionDistanceIncrement: state.progressionDistanceIncrement,
    progressionSetCount: state.progressionSetCount,
    progressionSetFlowLoadStep: state.progressionSetFlowLoadStep,
    progressionSetFlowRepStep: state.progressionSetFlowRepStep,
    progressionSetFlowDurationStep: state.progressionSetFlowDurationStep,
    progressionSetFlowDistanceStep: state.progressionSetFlowDistanceStep,
    progressionDayMode: state.progressionDayMode,
    progressionDayLoadStep: state.progressionDayLoadStep,
    progressionDayRepStep: state.progressionDayRepStep,
    progressionDayDurationStep: state.progressionDayDurationStep,
    progressionDayDistanceStep: state.progressionDayDistanceStep,
    progressionDayLoweredLoadStep: state.progressionDayLoweredLoadStep,
    progressionDayLoweredRepStep: state.progressionDayLoweredRepStep,
    progressionDayLoweredDurationStep: state.progressionDayLoweredDurationStep,
    progressionDayLoweredDistanceStep: state.progressionDayLoweredDistanceStep,
    progressionEffortWaveDirections: state.progressionEffortWaveDirections,
    progressionSetFlowTimeDirection: state.progressionSetFlowTimeDirection,
    progressionSetFlowDistanceDirection: state.progressionSetFlowDistanceDirection,
    progressionSetFlowRepDirection: state.progressionSetFlowRepDirection,
    progressionSetFlowLoadDirection: state.progressionSetFlowLoadDirection,
    progressionSetFlowMeasurements: state.progressionSetFlowMeasurements,
    progressionSetFlowLinks: state.progressionSetFlowLinks,
    progressionSetFlowCountMap: state.progressionSetFlowCountMap,
    progressionSetFlowGroupedCountMap: state.progressionSetFlowGroupedCountMap,
    progressionSetFlowGroupedDirectionMap: state.progressionSetFlowGroupedDirectionMap,
    progressionPromotionBasis: state.progressionPromotionBasis,
    progressionStrengthPromotionMeasurements: state.progressionStrengthPromotionMeasurements,
    progressionBodyweightPromotionMeasurements: state.progressionBodyweightPromotionMeasurements,
    progressionCardioPromotionMeasurements: state.progressionCardioPromotionMeasurements,
    progressionStrengthPromotionLinks: state.progressionStrengthPromotionLinks,
    progressionBodyweightPromotionLinks: state.progressionBodyweightPromotionLinks,
    progressionCardioPromotionLinks: state.progressionCardioPromotionLinks,
    progressionPromotionRepRangeMin: state.progressionPromotionRepRangeMin,
    progressionPromotionRepRangeMax: state.progressionPromotionRepRangeMax,
    progressionRepPromotionThreshold: state.progressionRepPromotionThreshold,
    progressionCustomRepPromotionTarget: state.progressionCustomRepPromotionTarget,
    progressionPromotionDirectionMap: state.progressionPromotionDirectionMap,
    progressionPromotionGroupedDirectionMap: state.progressionPromotionGroupedDirectionMap,
    progressionPromotionSessionCountMap: state.progressionPromotionSessionCountMap,
    progressionPromotionGroupedSessionCountMap: state.progressionPromotionGroupedSessionCountMap,
    progressionTargetMutation: state.progressionTargetMutation,
    progressionHasExplicitTargetMutation: state.progressionHasExplicitTargetMutation,
    progressionRequiredQualifiedSessions: state.progressionRequiredQualifiedSessions,
    progressionQualificationWindowMode: state.progressionQualificationWindowMode,
    progressionQualificationWindowResetOnMiss: state.progressionQualificationWindowResetOnMiss,
    progressionHasExplicitQualificationWindow: state.progressionHasExplicitQualificationWindow,
  });
}

function parsePositiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parsePositiveInteger(value: string) {
  const parsed = parsePositiveNumber(value);
  return parsed !== null && Number.isInteger(parsed) ? parsed : null;
}

function isDefaultPromotionMeasurementOrderMap(orderMap: PromotionMeasurementOrderMap) {
  return PROMOTION_MEASUREMENT_FAMILIES.every((family) => {
    const current = orderMap[family];
    const fallback = DEFAULT_PROMOTION_MEASUREMENT_ORDER_MAP[family];
    return current.length === fallback.length && current.every((measurement, index) => measurement === fallback[index]);
  });
}

function isFlatPromotionMeasurementSequenceMap(
  sequenceMap: PromotionMeasurementSequenceMap,
  orderMap: PromotionMeasurementOrderMap,
) {
  return PROMOTION_MEASUREMENT_FAMILIES.every((family) => {
    const sequence = sequenceMap[family];
    const order = orderMap[family];
    return sequence.length === order.length
      && sequence.every((group, index) => group.length === 1 && group[0] === order[index]);
  });
}

function isDefaultSetFlowMeasurementSequence(sequence: SetFlowMeasurementSequence) {
  return sequence.length === 1
    && sequence[0]?.length === 4
    && sequence[0][0] === "time"
    && sequence[0][1] === "distance"
    && sequence[0][2] === "reps"
    && sequence[0][3] === "weight";
}

export function buildProgressionPlaybookConfigFromFormState(state: ProgressionPlaybookFormState): ProgressionPlaybookConfig | null {
  if (!state.progressionPlaybookId) {
    return null;
  }

  const loadIncrement = parsePositiveNumber(state.progressionLoadIncrement);
  if (loadIncrement === null) {
    return null;
  }
  const setCount = parsePositiveInteger(state.progressionSetCount) ?? 3;
  const stepOverrides = {
    barbellLoadIncrement: parsePositiveNumber(state.progressionBarbellLoadIncrement) ?? undefined,
    dumbbellLoadIncrement: parsePositiveNumber(state.progressionDumbbellLoadIncrement) ?? undefined,
    machineLoadIncrement: parsePositiveNumber(state.progressionMachineLoadIncrement) ?? undefined,
    cableLoadIncrement: parsePositiveNumber(state.progressionCableLoadIncrement) ?? undefined,
    bodyweightRepIncrement: parsePositiveNumber(state.progressionBodyweightRepIncrement) ?? undefined,
    durationSecondsIncrement: parsePositiveNumber(state.progressionDurationIncrementSeconds) ?? undefined,
    distanceIncrement: parsePositiveNumber(state.progressionDistanceIncrement) ?? undefined,
  };
  const normalizedStepOverrides = Object.fromEntries(
    Object.entries(stepOverrides).filter(([, value]) => typeof value === "number"),
  );
  const hasStepOverrides = Object.keys(normalizedStepOverrides).length > 0;
  const setFlowSteps = {
    loadStep: parsePositiveNumber(state.progressionSetFlowLoadStep) ?? undefined,
    repStep: parsePositiveNumber(state.progressionSetFlowRepStep) ?? undefined,
    durationSecondsStep: parsePositiveNumber(state.progressionSetFlowDurationStep) ?? undefined,
    distanceStep: parsePositiveNumber(state.progressionSetFlowDistanceStep) ?? undefined,
  };
  const normalizedSetFlowSteps = Object.fromEntries(
    Object.entries(setFlowSteps).filter(([, value]) => typeof value === "number"),
  );
  const hasSetFlowSteps = Object.keys(normalizedSetFlowSteps).length > 0;
  const dayProgressionSteps = {
    loadStep: parsePositiveNumber(state.progressionDayLoadStep) ?? undefined,
    repStep: parsePositiveNumber(state.progressionDayRepStep) ?? undefined,
    durationSecondsStep: parsePositiveNumber(state.progressionDayDurationStep) ?? undefined,
    distanceStep: parsePositiveNumber(state.progressionDayDistanceStep) ?? undefined,
  };
  const normalizedDayProgressionSteps = Object.fromEntries(
    Object.entries(dayProgressionSteps).filter(([, value]) => typeof value === "number"),
  );
  const hasDayProgressionSteps = Object.keys(normalizedDayProgressionSteps).length > 0;
  const dayLoweredProgressionSteps = {
    loadStep: parsePositiveNumber(state.progressionDayLoweredLoadStep) ?? undefined,
    repStep: parsePositiveNumber(state.progressionDayLoweredRepStep) ?? undefined,
    durationSecondsStep: parsePositiveNumber(state.progressionDayLoweredDurationStep) ?? undefined,
    distanceStep: parsePositiveNumber(state.progressionDayLoweredDistanceStep) ?? undefined,
  };
  const normalizedDayLoweredProgressionSteps = Object.fromEntries(
    Object.entries(dayLoweredProgressionSteps).filter(([, value]) => typeof value === "number"),
  );
  const hasDayLoweredProgressionSteps = Object.keys(normalizedDayLoweredProgressionSteps).length > 0;
  const normalizedEffortWaveDirections = state.progressionEffortWaveDirections
    .map((direction) => (direction === "up" || direction === "down" ? direction : "straight"))
    .filter((direction, index, array) => index < array.length && direction);
  const effortWaveDirections = normalizedEffortWaveDirections.every((direction) => direction === "straight")
    ? undefined
    : normalizedEffortWaveDirections;
  const explicitSetFlowDirections = normalizeSetFlowDirectionConfig({
    time: state.progressionSetFlowTimeDirection,
    distance: state.progressionSetFlowDistanceDirection,
    reps: state.progressionSetFlowRepDirection,
    weight: state.progressionSetFlowLoadDirection,
  });
  const setFlowDirections = areSetFlowDirectionsStraight(explicitSetFlowDirections) && state.progressionSetFlow !== "straight_sets"
    ? getSetFlowDirectionConfigForLegacySetFlow(state.progressionSetFlow)
    : explicitSetFlowDirections;
  const derivedLegacySetFlow = inferLegacySetFlowFromDirections(setFlowDirections);
  const shouldSerializeSetFlowDirections = derivedLegacySetFlow === "straight_sets" && !areSetFlowDirectionsStraight(setFlowDirections);
  const setFlowMeasurementSequence = buildSetFlowSequenceFromState({
    measurements: state.progressionSetFlowMeasurements,
    links: state.progressionSetFlowLinks,
  });
  const serializedSetFlowCountMap = serializeSetFlowCountFieldMap(state.progressionSetFlowCountMap);
  const serializedSetFlowGroupedCountMap = serializeSetFlowGroupedCountFieldMap(state.progressionSetFlowGroupedCountMap);
  const serializedSetFlowGroupedDirectionMap = serializeSetFlowGroupedDirectionFieldMap(state.progressionSetFlowGroupedDirectionMap);
  const defaultSetFlowCountMap = serializeSetFlowCountFieldMap(buildDefaultSetFlowCountFieldMap("3"));
  const shouldSerializeSetFlowCountMap = JSON.stringify(serializedSetFlowCountMap ?? null)
    !== JSON.stringify(defaultSetFlowCountMap ?? null);
  const promotionConfig = normalizeProgressionPromotionConfig({
    promotionBasis: state.progressionPromotionBasis,
    repPromotionThreshold: state.progressionRepPromotionThreshold,
    customRepPromotionTarget: parsePositiveInteger(state.progressionCustomRepPromotionTarget),
    fallbackBasis: DEFAULT_PROGRESSION_PROMOTION_BASIS,
    fallbackThreshold: DEFAULT_REP_PROMOTION_THRESHOLD,
  });
  const promotionMeasurementOrderMap = normalizePromotionMeasurementOrderMap({
    strength: state.progressionStrengthPromotionMeasurements,
    bodyweight: state.progressionBodyweightPromotionMeasurements,
    cardio: state.progressionCardioPromotionMeasurements,
  });
  const promotionMeasurementSequenceMap = normalizePromotionMeasurementSequenceMap({
    strength: buildPromotionSequenceFromState({
      measurements: state.progressionStrengthPromotionMeasurements,
      links: state.progressionStrengthPromotionLinks,
    }),
    bodyweight: buildPromotionSequenceFromState({
      measurements: state.progressionBodyweightPromotionMeasurements,
      links: state.progressionBodyweightPromotionLinks,
    }),
    cardio: buildPromotionSequenceFromState({
      measurements: state.progressionCardioPromotionMeasurements,
      links: state.progressionCardioPromotionLinks,
    }),
  });
  const promotionRepRangeMin = parsePositiveInteger(state.progressionPromotionRepRangeMin);
  const promotionRepRangeMax = parsePositiveInteger(state.progressionPromotionRepRangeMax);
  const serializedPromotionDirectionMap = serializePromotionDirectionFieldMap(state.progressionPromotionDirectionMap);
  const serializedPromotionGroupedDirectionMap = serializePromotionGroupedDirectionFieldMap(state.progressionPromotionGroupedDirectionMap);
  const serializedPromotionSessionCountMap = serializePromotionSessionCountFieldMap(state.progressionPromotionSessionCountMap);
  const serializedPromotionGroupedSessionCountMap = serializePromotionGroupedSessionCountFieldMap(state.progressionPromotionGroupedSessionCountMap);
  const shouldSerializePromotionRepRangePreview =
    promotionRepRangeMin !== null
    && promotionRepRangeMax !== null
    && promotionRepRangeMax >= promotionRepRangeMin
    && (promotionRepRangeMin !== 8 || promotionRepRangeMax !== 12);
  const defaultPromotionSessionCountMap = serializePromotionSessionCountFieldMap(
    buildDefaultPromotionSessionCountFieldMap(state.progressionRequiredQualifiedSessions),
  );
  const legacyImplicitPromotionSessionCountMap = serializePromotionSessionCountFieldMap(
    buildDefaultPromotionSessionCountFieldMap("1"),
  );
  const shouldSerializePromotionSessionCountMap = JSON.stringify(serializedPromotionSessionCountMap ?? null)
    !== JSON.stringify(defaultPromotionSessionCountMap ?? null)
    && JSON.stringify(serializedPromotionSessionCountMap ?? null)
      !== JSON.stringify(legacyImplicitPromotionSessionCountMap ?? null);
  const defaultPromotionDirectionMap = buildDefaultPromotionDirectionFieldMap();
  const shouldSerializePromotionDirectionMap = JSON.stringify(serializedPromotionDirectionMap ?? null)
    !== JSON.stringify(defaultPromotionDirectionMap ?? null);
  const serializedPromotionConfig = {
    ...(setCount !== 3 ? { setsMin: setCount, setsMax: setCount } : {}),
    promotionBasis: promotionConfig.promotionBasis,
    ...(!isDefaultPromotionMeasurementOrderMap(promotionMeasurementOrderMap) ? { promotionMeasurementOrderMap } : {}),
    ...(
      !isFlatPromotionMeasurementSequenceMap(promotionMeasurementSequenceMap, promotionMeasurementOrderMap)
        ? { promotionMeasurementSequenceMap }
        : {}
    ),
    ...(shouldSerializePromotionRepRangePreview
      ? { promotionRepRangePreview: { min: promotionRepRangeMin, max: promotionRepRangeMax } }
      : {}),
    ...(shouldSerializePromotionDirectionMap ? { promotionDirectionMap: serializedPromotionDirectionMap } : {}),
    ...(serializedPromotionGroupedDirectionMap ? { promotionGroupedDirectionMap: serializedPromotionGroupedDirectionMap } : {}),
    ...(shouldSerializePromotionSessionCountMap ? { promotionSessionCountMap: serializedPromotionSessionCountMap } : {}),
    ...(serializedPromotionGroupedSessionCountMap ? { promotionGroupedSessionCountMap: serializedPromotionGroupedSessionCountMap } : {}),
    repPromotionThreshold: promotionConfig.repPromotionThreshold,
    ...(promotionConfig.customRepPromotionTarget !== null ? { customRepPromotionTarget: promotionConfig.customRepPromotionTarget } : {}),
    ...(state.progressionHasExplicitTargetMutation || state.progressionTargetMutation !== "increase_load_reset_reps"
      ? { targetMutation: normalizeTargetMutation(state.progressionTargetMutation, "increase_load_reset_reps") }
      : {}),
    ...(() => {
      const qualificationWindow = normalizeQualificationWindow({
        requiredQualifiedSessions: parsePositiveInteger(state.progressionRequiredQualifiedSessions),
        mode: state.progressionQualificationWindowMode,
        resetOnMiss: state.progressionQualificationWindowResetOnMiss,
      });
      const shouldSerializeQualificationWindow =
        state.progressionHasExplicitQualificationWindow
        || qualificationWindow.requiredQualifiedSessions !== 1
        || qualificationWindow.mode !== "latest"
        || qualificationWindow.resetOnMiss;

      return shouldSerializeQualificationWindow
        ? { qualificationWindow }
        : {};
    })(),
  };

  if (state.progressionStallPolicy === "none") {
    return {
      version: 1,
      loadIncrement,
      ...(hasStepOverrides ? { stepOverrides: normalizedStepOverrides } : {}),
      ...(hasSetFlowSteps ? { setFlowSteps: normalizedSetFlowSteps } : {}),
      dayProgressionMode: state.progressionDayMode,
      ...(hasDayProgressionSteps ? { dayProgressionSteps: normalizedDayProgressionSteps } : {}),
      ...(hasDayLoweredProgressionSteps ? { dayLoweredProgressionSteps: normalizedDayLoweredProgressionSteps } : {}),
      ...(effortWaveDirections ? { effortWaveDirections } : {}),
      setFlow: derivedLegacySetFlow,
      ...(shouldSerializeSetFlowDirections ? { setFlowDirections } : {}),
      ...(!isDefaultSetFlowMeasurementSequence(setFlowMeasurementSequence) ? { setFlowMeasurementSequence } : {}),
      ...(shouldSerializeSetFlowCountMap ? { setFlowCountMap: serializedSetFlowCountMap } : {}),
      ...(serializedSetFlowGroupedCountMap ? { setFlowGroupedCountMap: serializedSetFlowGroupedCountMap } : {}),
      ...(serializedSetFlowGroupedDirectionMap ? { setFlowGroupedDirectionMap: serializedSetFlowGroupedDirectionMap } : {}),
      stallPolicy: "none",
      autoUpdateRoutineGoals: state.progressionAutoUpdateRoutineGoals,
      ...serializedPromotionConfig,
    };
  }

  const stallThreshold = parsePositiveInteger(state.progressionStallThreshold);
  const deloadPercent = parsePositiveNumber(state.progressionDeloadPercent);
  if (stallThreshold === null || deloadPercent === null || deloadPercent >= 100) {
    return null;
  }

  return {
    version: 1,
    loadIncrement,
    ...(hasStepOverrides ? { stepOverrides: normalizedStepOverrides } : {}),
    ...(hasSetFlowSteps ? { setFlowSteps: normalizedSetFlowSteps } : {}),
    dayProgressionMode: state.progressionDayMode,
    ...(hasDayProgressionSteps ? { dayProgressionSteps: normalizedDayProgressionSteps } : {}),
    ...(hasDayLoweredProgressionSteps ? { dayLoweredProgressionSteps: normalizedDayLoweredProgressionSteps } : {}),
    ...(effortWaveDirections ? { effortWaveDirections } : {}),
    setFlow: derivedLegacySetFlow,
    ...(shouldSerializeSetFlowDirections ? { setFlowDirections } : {}),
    ...(!isDefaultSetFlowMeasurementSequence(setFlowMeasurementSequence) ? { setFlowMeasurementSequence } : {}),
    ...(shouldSerializeSetFlowCountMap ? { setFlowCountMap: serializedSetFlowCountMap } : {}),
    ...(serializedSetFlowGroupedCountMap ? { setFlowGroupedCountMap: serializedSetFlowGroupedCountMap } : {}),
    ...(serializedSetFlowGroupedDirectionMap ? { setFlowGroupedDirectionMap: serializedSetFlowGroupedDirectionMap } : {}),
    stallPolicy: "deload_after_stall",
    stallThreshold,
    deloadPercent,
    autoUpdateRoutineGoals: state.progressionAutoUpdateRoutineGoals,
    ...serializedPromotionConfig,
  };
}

function normalizeComparableProgressionState(state: ProgressionPlaybookFormState) {
  if (!state.progressionPlaybookId) {
    return {
      playbookId: null,
      config: null,
    };
  }

  const config = buildProgressionPlaybookConfigFromFormState(state);
  const selection = validateProgressionPlaybookSelection({
    playbookId: state.progressionPlaybookId,
    config,
  });

  return selection
    ? {
        playbookId: selection.id,
        config: selection.config,
      }
    : {
        playbookId: state.progressionPlaybookId,
        config: null,
      };
}

export function areProgressionPlaybookFormStatesEqual(
  left: ProgressionPlaybookFormState,
  right: ProgressionPlaybookFormState,
) {
  const normalizedLeft = normalizeComparableProgressionState(left);
  const normalizedRight = normalizeComparableProgressionState(right);

  if (normalizedLeft.playbookId !== normalizedRight.playbookId) {
    return false;
  }

  if (!normalizedLeft.config || !normalizedRight.config) {
    return normalizedLeft.config === normalizedRight.config;
  }

  return JSON.stringify(normalizedLeft.config) === JSON.stringify(normalizedRight.config);
}

export function appendProgressionPlaybookFormData(formData: FormData, state: ProgressionPlaybookFormState) {
  formData.set("progressionPlaybookId", state.progressionPlaybookId);
  formData.set("progressionStallPolicy", state.progressionStallPolicy);
  formData.set("progressionLoadIncrement", state.progressionLoadIncrement);
  formData.set("progressionBarbellLoadIncrement", state.progressionBarbellLoadIncrement);
  formData.set("progressionDumbbellLoadIncrement", state.progressionDumbbellLoadIncrement);
  formData.set("progressionMachineLoadIncrement", state.progressionMachineLoadIncrement);
  formData.set("progressionCableLoadIncrement", state.progressionCableLoadIncrement);
  formData.set("progressionBodyweightRepIncrement", state.progressionBodyweightRepIncrement);
  formData.set("progressionDurationIncrementSeconds", state.progressionDurationIncrementSeconds);
  formData.set("progressionDistanceIncrement", state.progressionDistanceIncrement);
  formData.set("progressionSetCount", state.progressionSetCount);
  formData.set("progressionSetFlowLoadStep", state.progressionSetFlowLoadStep);
  formData.set("progressionSetFlowRepStep", state.progressionSetFlowRepStep);
  formData.set("progressionSetFlowDurationStep", state.progressionSetFlowDurationStep);
  formData.set("progressionSetFlowDistanceStep", state.progressionSetFlowDistanceStep);
  formData.set("progressionDayMode", state.progressionDayMode);
  formData.set("progressionDayLoadStep", state.progressionDayLoadStep);
  formData.set("progressionDayRepStep", state.progressionDayRepStep);
  formData.set("progressionDayDurationStep", state.progressionDayDurationStep);
  formData.set("progressionDayDistanceStep", state.progressionDayDistanceStep);
  formData.set("progressionDayLoweredLoadStep", state.progressionDayLoweredLoadStep);
  formData.set("progressionDayLoweredRepStep", state.progressionDayLoweredRepStep);
  formData.set("progressionDayLoweredDurationStep", state.progressionDayLoweredDurationStep);
  formData.set("progressionDayLoweredDistanceStep", state.progressionDayLoweredDistanceStep);
  formData.set("progressionEffortWaveDirectionsJson", JSON.stringify(state.progressionEffortWaveDirections));
  formData.set("progressionSetFlowDirectionsJson", JSON.stringify({
    time: state.progressionSetFlowTimeDirection,
    distance: state.progressionSetFlowDistanceDirection,
    reps: state.progressionSetFlowRepDirection,
    weight: state.progressionSetFlowLoadDirection,
  }));
  formData.set("progressionSetFlowMeasurementSequenceJson", JSON.stringify(
    buildSetFlowSequenceFromState({
      measurements: state.progressionSetFlowMeasurements,
      links: state.progressionSetFlowLinks,
    }),
  ));
  formData.set("progressionSetFlowCountMapJson", JSON.stringify(serializeSetFlowCountFieldMap(state.progressionSetFlowCountMap) ?? {}));
  formData.set("progressionSetFlowGroupedCountMapJson", JSON.stringify(serializeSetFlowGroupedCountFieldMap(state.progressionSetFlowGroupedCountMap) ?? {}));
  formData.set("progressionSetFlowGroupedDirectionMapJson", JSON.stringify(state.progressionSetFlowGroupedDirectionMap));
  formData.set("progressionPromotionBasis", state.progressionPromotionBasis);
  formData.set("progressionPromotionMeasurementOrdersJson", JSON.stringify({
    strength: state.progressionStrengthPromotionMeasurements,
    bodyweight: state.progressionBodyweightPromotionMeasurements,
    cardio: state.progressionCardioPromotionMeasurements,
  }));
  formData.set("progressionPromotionMeasurementSequenceJson", JSON.stringify({
    strength: buildPromotionSequenceFromState({
      measurements: state.progressionStrengthPromotionMeasurements,
      links: state.progressionStrengthPromotionLinks,
    }),
    bodyweight: buildPromotionSequenceFromState({
      measurements: state.progressionBodyweightPromotionMeasurements,
      links: state.progressionBodyweightPromotionLinks,
    }),
    cardio: buildPromotionSequenceFromState({
      measurements: state.progressionCardioPromotionMeasurements,
      links: state.progressionCardioPromotionLinks,
    }),
  }));
  formData.set("progressionPromotionRepRangePreviewJson", JSON.stringify({
    min: parsePositiveInteger(state.progressionPromotionRepRangeMin) ?? 8,
    max: parsePositiveInteger(state.progressionPromotionRepRangeMax) ?? 12,
  }));
  formData.set("progressionPromotionDirectionMapJson", JSON.stringify(state.progressionPromotionDirectionMap));
  formData.set("progressionPromotionGroupedDirectionMapJson", JSON.stringify(state.progressionPromotionGroupedDirectionMap));
  formData.set("progressionPromotionSessionCountMapJson", JSON.stringify(serializePromotionSessionCountFieldMap(state.progressionPromotionSessionCountMap) ?? {}));
  formData.set("progressionPromotionGroupedSessionCountMapJson", JSON.stringify(serializePromotionGroupedSessionCountFieldMap(state.progressionPromotionGroupedSessionCountMap) ?? {}));
  formData.set("progressionRepPromotionThreshold", state.progressionRepPromotionThreshold);
  formData.set("progressionCustomRepPromotionTarget", state.progressionCustomRepPromotionTarget);
  formData.set("progressionTargetMutation", state.progressionTargetMutation);
  formData.set("progressionHasExplicitTargetMutation", state.progressionHasExplicitTargetMutation ? "1" : "0");
  formData.set("progressionRequiredQualifiedSessions", state.progressionRequiredQualifiedSessions);
  formData.set("progressionQualificationWindowMode", state.progressionQualificationWindowMode);
  formData.set("progressionQualificationWindowResetOnMiss", state.progressionQualificationWindowResetOnMiss ? "1" : "0");
  formData.set("progressionHasExplicitQualificationWindow", state.progressionHasExplicitQualificationWindow ? "1" : "0");
  formData.set("progressionStallThreshold", state.progressionStallThreshold);
  formData.set("progressionDeloadPercent", state.progressionDeloadPercent);
  formData.set("progressionSetFlow", inferLegacySetFlowFromDirections(normalizeSetFlowDirectionConfig({
    time: state.progressionSetFlowTimeDirection,
    distance: state.progressionSetFlowDistanceDirection,
    reps: state.progressionSetFlowRepDirection,
    weight: state.progressionSetFlowLoadDirection,
  })));
  if (state.progressionAutoUpdateRoutineGoals) {
    formData.set("progressionAutoUpdateRoutineGoals", "1");
  } else {
    formData.delete("progressionAutoUpdateRoutineGoals");
  }
}
