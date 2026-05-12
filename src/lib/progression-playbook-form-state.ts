import {
  getDefaultProgressionPlaybookConfig,
  PROGRESSION_PLAYBOOK_IDS,
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
  DEFAULT_QUALIFICATION_WINDOW_MODE,
  normalizeQualificationWindowConfig,
  type QualificationWindowMode,
} from "@/lib/progression-qualification-window";
import {
  getDefaultSetFlowForTrainingGoal,
  normalizeSetFlowId,
} from "@/lib/set-flow";
import { DEFAULT_PROGRESSION_STEP_OVERRIDES, DEFAULT_SET_FLOW_STEPS } from "@/lib/progression-step-defaults";
import {
  normalizeTargetMutation,
  shouldPersistExplicitTargetMutation,
  getDefaultStrengthTargetMutationForPromotionBasis,
  type ProgressionTargetMutationId,
} from "@/lib/progression-target-mutation";

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
  progressionSetFlowLoadStep: string;
  progressionSetFlowRepStep: string;
  progressionSetFlowDurationStep: string;
  progressionSetFlowDistanceStep: string;
  progressionPromotionBasis: ProgressionPromotionBasis;
  progressionRepPromotionThreshold: RepPromotionThreshold;
  progressionCustomRepPromotionTarget: string;
  progressionTargetMutation: ProgressionTargetMutationId;
  progressionRequiredQualifiedSessions: string;
  progressionQualificationWindowMode: QualificationWindowMode;
  progressionQualificationWindowResetOnMiss: boolean;
  progressionHasExplicitTargetMutation: boolean;
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

function hasConfigKey(config: Record<string, unknown> | null | undefined, key: string) {
  return Boolean(config && Object.prototype.hasOwnProperty.call(config, key));
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
  const promotionConfig = normalizeProgressionPromotionConfig({
    promotionBasis: defaultConfig?.promotionBasis,
    repPromotionThreshold: defaultConfig?.repPromotionThreshold,
    customRepPromotionTarget: defaultConfig?.customRepPromotionTarget,
    fallbackBasis: DEFAULT_PROGRESSION_PROMOTION_BASIS,
    fallbackThreshold: DEFAULT_REP_PROMOTION_THRESHOLD,
  });
  const hasExplicitTargetMutation = hasConfigKey(config ?? null, "targetMutation");
  const progressionTargetMutation = hasExplicitTargetMutation
    ? normalizeTargetMutation(
      defaultConfig?.targetMutation,
      getDefaultStrengthTargetMutationForPromotionBasis(promotionConfig.promotionBasis),
    )
    : getDefaultStrengthTargetMutationForPromotionBasis(promotionConfig.promotionBasis);
  const hasExplicitQualificationWindow = hasConfigKey(config ?? null, "qualificationWindow");
  const qualificationWindow = normalizeQualificationWindowConfig(defaultConfig?.qualificationWindow);

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
    progressionSetFlowLoadStep: formatNumber(defaultConfig?.setFlowSteps?.loadStep ?? DEFAULT_SET_FLOW_STEPS.loadStep),
    progressionSetFlowRepStep: formatNumber(defaultConfig?.setFlowSteps?.repStep ?? DEFAULT_SET_FLOW_STEPS.repStep),
    progressionSetFlowDurationStep: formatNumber(defaultConfig?.setFlowSteps?.durationSecondsStep ?? DEFAULT_SET_FLOW_STEPS.durationSecondsStep),
    progressionSetFlowDistanceStep: formatNumber(defaultConfig?.setFlowSteps?.distanceStep ?? DEFAULT_SET_FLOW_STEPS.distanceStep),
    progressionStallThreshold: deloadConfig ? String(deloadConfig.stallThreshold) : "2",
    progressionDeloadPercent: deloadConfig ? formatNumber(deloadConfig.deloadPercent) : "10",
    progressionAutoUpdateRoutineGoals: Boolean(selection?.id !== "deload_after_stall" && selection?.config.autoUpdateRoutineGoals),
    progressionSetFlow,
    progressionPromotionBasis: promotionConfig.promotionBasis,
    progressionRepPromotionThreshold: promotionConfig.repPromotionThreshold,
    progressionCustomRepPromotionTarget: typeof promotionConfig.customRepPromotionTarget === "number"
      ? formatNumber(promotionConfig.customRepPromotionTarget)
      : "",
    progressionTargetMutation,
    progressionRequiredQualifiedSessions: String(qualificationWindow.requiredQualifiedSessions),
    progressionQualificationWindowMode: qualificationWindow.mode,
    progressionQualificationWindowResetOnMiss: qualificationWindow.resetOnMiss,
    progressionHasExplicitTargetMutation: hasExplicitTargetMutation,
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
    progressionSetFlowLoadStep: state.progressionSetFlowLoadStep,
    progressionSetFlowRepStep: state.progressionSetFlowRepStep,
    progressionSetFlowDurationStep: state.progressionSetFlowDurationStep,
    progressionSetFlowDistanceStep: state.progressionSetFlowDistanceStep,
    progressionPromotionBasis: state.progressionPromotionBasis,
    progressionRepPromotionThreshold: state.progressionRepPromotionThreshold,
    progressionCustomRepPromotionTarget: state.progressionCustomRepPromotionTarget,
    progressionTargetMutation: state.progressionTargetMutation,
    progressionRequiredQualifiedSessions: state.progressionRequiredQualifiedSessions,
    progressionQualificationWindowMode: state.progressionQualificationWindowMode,
    progressionQualificationWindowResetOnMiss: state.progressionQualificationWindowResetOnMiss,
    progressionHasExplicitTargetMutation: state.progressionHasExplicitTargetMutation,
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

export function buildProgressionPlaybookConfigFromFormState(state: ProgressionPlaybookFormState): ProgressionPlaybookConfig | null {
  if (!state.progressionPlaybookId) {
    return null;
  }

  const loadIncrement = parsePositiveNumber(state.progressionLoadIncrement);
  if (loadIncrement === null) {
    return null;
  }
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
  const promotionConfig = normalizeProgressionPromotionConfig({
    promotionBasis: state.progressionPromotionBasis,
    repPromotionThreshold: state.progressionRepPromotionThreshold,
    customRepPromotionTarget: parsePositiveInteger(state.progressionCustomRepPromotionTarget),
    fallbackBasis: DEFAULT_PROGRESSION_PROMOTION_BASIS,
    fallbackThreshold: DEFAULT_REP_PROMOTION_THRESHOLD,
  });
  const serializedPromotionConfig = {
    promotionBasis: promotionConfig.promotionBasis,
    repPromotionThreshold: promotionConfig.repPromotionThreshold,
    ...(promotionConfig.customRepPromotionTarget !== null ? { customRepPromotionTarget: promotionConfig.customRepPromotionTarget } : {}),
  };
  const qualificationWindow = normalizeQualificationWindowConfig({
    requiredQualifiedSessions: parsePositiveInteger(state.progressionRequiredQualifiedSessions),
    mode: state.progressionQualificationWindowMode,
    resetOnMiss: state.progressionQualificationWindowResetOnMiss,
  });
  const shouldSerializeQualificationWindow = state.progressionHasExplicitQualificationWindow
    || qualificationWindow.requiredQualifiedSessions > 1
    || qualificationWindow.mode !== DEFAULT_QUALIFICATION_WINDOW_MODE
    || qualificationWindow.resetOnMiss;
  const serializedQualificationWindow = shouldSerializeQualificationWindow
    ? {
        qualificationWindow: {
          requiredQualifiedSessions: qualificationWindow.requiredQualifiedSessions,
          mode: qualificationWindow.mode,
          resetOnMiss: qualificationWindow.resetOnMiss,
        },
      }
    : {};
  const serializedTargetMutation = state.progressionHasExplicitTargetMutation
    ? {
        targetMutation: normalizeTargetMutation(
          state.progressionTargetMutation,
          getDefaultStrengthTargetMutationForPromotionBasis(promotionConfig.promotionBasis),
        ),
      }
    : {};

  if (state.progressionStallPolicy === "none") {
    return {
      version: 1,
      loadIncrement,
      ...(hasStepOverrides ? { stepOverrides: normalizedStepOverrides } : {}),
      ...(hasSetFlowSteps ? { setFlowSteps: normalizedSetFlowSteps } : {}),
      setFlow: state.progressionSetFlow,
      stallPolicy: "none",
      autoUpdateRoutineGoals: state.progressionAutoUpdateRoutineGoals,
      ...serializedPromotionConfig,
      ...serializedTargetMutation,
      ...serializedQualificationWindow,
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
    setFlow: state.progressionSetFlow,
    stallPolicy: "deload_after_stall",
    stallThreshold,
    deloadPercent,
    autoUpdateRoutineGoals: state.progressionAutoUpdateRoutineGoals,
    ...serializedPromotionConfig,
    ...serializedTargetMutation,
    ...serializedQualificationWindow,
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
  formData.set("progressionSetFlowLoadStep", state.progressionSetFlowLoadStep);
  formData.set("progressionSetFlowRepStep", state.progressionSetFlowRepStep);
  formData.set("progressionSetFlowDurationStep", state.progressionSetFlowDurationStep);
  formData.set("progressionSetFlowDistanceStep", state.progressionSetFlowDistanceStep);
  formData.set("progressionPromotionBasis", state.progressionPromotionBasis);
  formData.set("progressionRepPromotionThreshold", state.progressionRepPromotionThreshold);
  formData.set("progressionCustomRepPromotionTarget", state.progressionCustomRepPromotionTarget);
  formData.set("progressionTargetMutation", state.progressionTargetMutation);
  formData.set("progressionRequiredQualifiedSessions", state.progressionRequiredQualifiedSessions);
  formData.set("progressionQualificationWindowMode", state.progressionQualificationWindowMode);
  formData.set("progressionQualificationWindowResetOnMiss", state.progressionQualificationWindowResetOnMiss ? "1" : "0");
  formData.set("progressionHasExplicitTargetMutation", state.progressionHasExplicitTargetMutation ? "1" : "0");
  formData.set("progressionHasExplicitQualificationWindow", state.progressionHasExplicitQualificationWindow ? "1" : "0");
  formData.set("progressionStallThreshold", state.progressionStallThreshold);
  formData.set("progressionDeloadPercent", state.progressionDeloadPercent);
  formData.set("progressionSetFlow", state.progressionSetFlow);
  if (state.progressionAutoUpdateRoutineGoals) {
    formData.set("progressionAutoUpdateRoutineGoals", "1");
  } else {
    formData.delete("progressionAutoUpdateRoutineGoals");
  }
}
