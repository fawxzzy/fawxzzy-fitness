import {
  getDefaultProgressionLayerModel,
  getDefaultProgressionPlaybookConfig,
  type ProgressionMeasurementType,
  type ProgressionMethodLayerId,
  type ProgressionPlaybookConfig,
  type ProgressionPlaybookId,
  type SetFlowId,
  type TrainingGoalId,
} from "@/lib/progression-playbooks";
import {
  isBodyweightExercise,
  isCardioExercise,
  isMeasurementOptionalExercise,
  normalizeExerciseMeasurementType,
  type ExerciseMetadataInput,
} from "@/lib/exercise-metadata";
import { getDefaultSetFlowForTrainingGoal } from "@/lib/set-flow";
import type { GoalModality } from "@/lib/exercise-goal-validation";
import type { ProgressionPromotionBasis, RepPromotionThreshold } from "@/lib/progression-promotion";

export const PROGRESSION_PRESET_IDS = [
  "barbell_strength",
  "dumbbell_strength",
  "machine_strength",
  "cable_accessory",
  "bodyweight_reps",
  "cardio_time",
  "cardio_distance",
  "mobility_stretch",
  "pilates_core",
] as const;

export type ProgressionPresetId = (typeof PROGRESSION_PRESET_IDS)[number];

export type ProgressionPresetExerciseInput = Omit<ExerciseMetadataInput, "tags" | "categories"> & {
  measurementType?: ProgressionMeasurementType | null;
  isCustom?: boolean | null;
  tags?: readonly string[] | string | Set<string> | null;
  categories?: readonly string[] | string | Set<string> | null;
};

export type ProgressionPresetDefaults = {
  goalModality: GoalModality;
  trainingGoal: TrainingGoalId;
  progressionMethod: ProgressionMethodLayerId;
  progressionPlaybookId: ProgressionPlaybookId | null;
  progressionPlaybookConfig: ProgressionPlaybookConfig | null;
  progressionSetFlow: SetFlowId;
  progressionPromotionBasis: ProgressionPromotionBasis | null;
  progressionRepPromotionThreshold: RepPromotionThreshold | null;
};

export type ProgressionPresetApplicability = {
  measurementTypes: ProgressionMeasurementType[];
  equipmentTokens?: string[];
  categories?: string[];
  tags?: string[];
};

export type ProgressionPresetDefinition = {
  id: ProgressionPresetId;
  label: string;
  applicability: ProgressionPresetApplicability;
  defaults: ProgressionPresetDefaults;
};

export type ProgressionPresetAppliedFields = {
  trainingGoal?: TrainingGoalId | null;
  progressionMethod?: ProgressionMethodLayerId | null;
  progressionPlaybookId?: ProgressionPlaybookId | null;
  progressionPlaybookConfig?: ProgressionPlaybookConfig | null;
  progressionSetFlow?: SetFlowId | null;
  progressionPromotionBasis?: ProgressionPromotionBasis | null;
  progressionRepPromotionThreshold?: RepPromotionThreshold | null;
};

export type ApplyProgressionPresetDefaultsResult = {
  presetId: ProgressionPresetId | null;
  defaults: ProgressionPresetDefaults | null;
  next: ProgressionPresetAppliedFields;
  appliedFields: Array<keyof ProgressionPresetAppliedFields>;
  skippedFields: Array<{
    field: keyof ProgressionPresetAppliedFields;
    reason: string;
  }>;
};

const MEASUREMENT_TYPES = new Set<ProgressionMeasurementType>(["reps", "time", "distance", "time_distance", "none"]);
const PLAYBOOK_IDS = new Set<ProgressionPlaybookId>(["double_progression", "fixed_load_rep_range_progression", "deload_after_stall"]);

const PRESET_DEFINITIONS: Record<ProgressionPresetId, ProgressionPresetDefinition> = {
  barbell_strength: createPresetDefinition({
    id: "barbell_strength",
    label: "Barbell Strength",
    goalModality: "strength",
    trainingGoal: "build_strength",
    measurementType: "reps",
    playbookId: "double_progression",
    applicability: {
      measurementTypes: ["reps"],
      equipmentTokens: ["barbell", "ez bar", "trap bar", "smith"],
      categories: ["strength"],
    },
  }),
  dumbbell_strength: createPresetDefinition({
    id: "dumbbell_strength",
    label: "Dumbbell Strength",
    goalModality: "strength",
    trainingGoal: "build_muscle",
    measurementType: "reps",
    playbookId: "double_progression",
    applicability: {
      measurementTypes: ["reps"],
      equipmentTokens: ["dumbbell", "db"],
      categories: ["strength"],
    },
  }),
  machine_strength: createPresetDefinition({
    id: "machine_strength",
    label: "Machine Strength",
    goalModality: "strength",
    trainingGoal: "build_muscle",
    measurementType: "reps",
    playbookId: "double_progression",
    applicability: {
      measurementTypes: ["reps"],
      equipmentTokens: ["machine", "selectorized", "plate loaded"],
      categories: ["strength"],
    },
  }),
  cable_accessory: createPresetDefinition({
    id: "cable_accessory",
    label: "Cable Accessory",
    goalModality: "strength",
    trainingGoal: "build_muscle",
    measurementType: "reps",
    playbookId: "double_progression",
    configOverrides: {
      promotionBasis: "reps_only",
      repPromotionThreshold: "top_half_of_range",
    },
    applicability: {
      measurementTypes: ["reps"],
      equipmentTokens: ["cable"],
      categories: ["accessory"],
      tags: ["accessory", "cable"],
    },
  }),
  bodyweight_reps: createPresetDefinition({
    id: "bodyweight_reps",
    label: "Bodyweight Reps",
    goalModality: "bodyweight",
    trainingGoal: "build_muscle",
    measurementType: "reps",
    playbookId: "double_progression",
    configOverrides: {
      promotionBasis: "reps_only",
      repPromotionThreshold: "top_of_range",
    },
    applicability: {
      measurementTypes: ["reps"],
      equipmentTokens: ["bodyweight"],
      tags: ["bodyweight"],
    },
  }),
  cardio_time: createPresetDefinition({
    id: "cardio_time",
    label: "Cardio Time",
    goalModality: "cardio_time",
    trainingGoal: "conditioning",
    measurementType: "time",
    playbookId: "double_progression",
    applicability: {
      measurementTypes: ["time", "time_distance"],
      categories: ["cardio"],
      tags: ["cardio", "conditioning"],
    },
  }),
  cardio_distance: createPresetDefinition({
    id: "cardio_distance",
    label: "Cardio Distance",
    goalModality: "cardio_distance",
    trainingGoal: "conditioning",
    measurementType: "distance",
    playbookId: "double_progression",
    applicability: {
      measurementTypes: ["distance"],
      categories: ["cardio"],
      tags: ["cardio", "conditioning"],
    },
  }),
  mobility_stretch: createPresetDefinition({
    id: "mobility_stretch",
    label: "Mobility / Stretch",
    goalModality: "bodyweight",
    trainingGoal: "technique_rehab",
    measurementType: "none",
    playbookId: null,
    applicability: {
      measurementTypes: ["none"],
      categories: ["mobility", "stretch"],
      tags: ["stretch", "mobility", "recovery"],
    },
  }),
  pilates_core: createPresetDefinition({
    id: "pilates_core",
    label: "Pilates / Core",
    goalModality: "bodyweight",
    trainingGoal: "technique_rehab",
    measurementType: "reps",
    playbookId: null,
    applicability: {
      measurementTypes: ["reps", "time"],
      categories: ["pilates", "core"],
      tags: ["pilates", "core"],
    },
  }),
};

type NormalizedPresetExercise = {
  name: string;
  measurementType: ProgressionMeasurementType;
  equipment: string;
  movementPattern: string;
  primaryMuscle: string;
  isCardio: boolean;
  isBodyweight: boolean;
  isMeasurementOptional: boolean;
  isCustom: boolean;
  tags: string[];
  categories: string[];
};

function normalizeText(value: string | null | undefined) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeStringList(value: ProgressionPresetExerciseInput["tags"] | ProgressionPresetExerciseInput["categories"]) {
  if (value instanceof Set) {
    return Array.from(value, (entry) => normalizeText(entry)).filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeText(entry)).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => normalizeText(entry))
      .filter(Boolean);
  }
  return [];
}

function clonePlaybookConfig(config: ProgressionPlaybookConfig | null) {
  if (!config) {
    return null;
  }
  return JSON.parse(JSON.stringify(config)) as ProgressionPlaybookConfig;
}

function createPresetDefinition(args: {
  id: ProgressionPresetId;
  label: string;
  goalModality: GoalModality;
  trainingGoal: TrainingGoalId;
  measurementType: ProgressionMeasurementType;
  playbookId: ProgressionPlaybookId | null;
  applicability: ProgressionPresetApplicability;
  configOverrides?: Partial<ProgressionPlaybookConfig>;
}) {
  const layer = getDefaultProgressionLayerModel({
    trainingGoal: args.trainingGoal,
    measurementType: args.measurementType,
  });
  const progressionSetFlow = getDefaultSetFlowForTrainingGoal(args.trainingGoal);
  const progressionPlaybookConfig = args.playbookId
    ? {
        ...getDefaultProgressionPlaybookConfig(args.playbookId),
        setFlow: progressionSetFlow,
        ...args.configOverrides,
      }
    : null;

  return {
    id: args.id,
    label: args.label,
    applicability: {
      measurementTypes: [...args.applicability.measurementTypes],
      equipmentTokens: args.applicability.equipmentTokens ? [...args.applicability.equipmentTokens] : undefined,
      categories: args.applicability.categories ? [...args.applicability.categories] : undefined,
      tags: args.applicability.tags ? [...args.applicability.tags] : undefined,
    },
    defaults: {
      goalModality: args.goalModality,
      trainingGoal: args.trainingGoal,
      progressionMethod: layer.progressionMethod,
      progressionPlaybookId: args.playbookId,
      progressionPlaybookConfig,
      progressionSetFlow,
      progressionPromotionBasis: progressionPlaybookConfig?.promotionBasis ?? null,
      progressionRepPromotionThreshold: progressionPlaybookConfig?.repPromotionThreshold ?? null,
    },
  } satisfies ProgressionPresetDefinition;
}

function coerceMeasurementType(value: unknown): ProgressionMeasurementType | null {
  if (value === "duration") {
    return "time";
  }
  return MEASUREMENT_TYPES.has(value as ProgressionMeasurementType)
    ? (value as ProgressionMeasurementType)
    : null;
}

function normalizePresetExercise(exercise: ProgressionPresetExerciseInput | null | undefined): NormalizedPresetExercise | null {
  if (!exercise) {
    return null;
  }

  const tags = normalizeStringList(exercise.tags);
  const categories = normalizeStringList(exercise.categories);
  const rawMeasurementType = coerceMeasurementType(exercise.measurementType ?? exercise.measurement_type);
  const measurementType = coerceMeasurementType(normalizeExerciseMeasurementType({
    name: exercise.name,
    measurement_type: rawMeasurementType ?? exercise.measurement_type ?? null,
  })) ?? rawMeasurementType ?? "none";
  const canonicalExercise = {
    ...exercise,
    measurement_type: measurementType,
    tags,
    categories,
  };

  return {
    name: normalizeText(exercise.name),
    measurementType,
    equipment: normalizeText(exercise.equipment),
    movementPattern: normalizeText(exercise.movement_pattern),
    primaryMuscle: normalizeText(exercise.primary_muscle),
    isCardio: isCardioExercise(canonicalExercise),
    isBodyweight: isBodyweightExercise(canonicalExercise),
    isMeasurementOptional: isMeasurementOptionalExercise(canonicalExercise),
    isCustom: Boolean(exercise.isCustom),
    tags,
    categories,
  };
}

function listSearchTokens(exercise: NormalizedPresetExercise) {
  return [
    exercise.name,
    exercise.equipment,
    exercise.movementPattern,
    exercise.primaryMuscle,
    ...exercise.tags,
    ...exercise.categories,
  ].filter(Boolean);
}

function hasToken(exercise: NormalizedPresetExercise, token: string) {
  const normalizedToken = normalizeText(token);
  if (!normalizedToken) {
    return false;
  }
  return listSearchTokens(exercise).some((entry) => entry.includes(normalizedToken));
}

function hasAnyToken(exercise: NormalizedPresetExercise, tokens: readonly string[]) {
  return tokens.some((token) => hasToken(exercise, token));
}

function isPilatesCoreExercise(exercise: NormalizedPresetExercise) {
  return hasAnyToken(exercise, ["pilates", "core", "plank", "dead bug", "hollow body"]);
}

function isMobilityStretchExercise(exercise: NormalizedPresetExercise) {
  if (exercise.isMeasurementOptional) {
    return true;
  }
  return hasAnyToken(exercise, ["stretch", "mobility", "warm-up prep", "cooldown", "recovery"]);
}

function isStrengthMeasurement(exercise: NormalizedPresetExercise) {
  return exercise.measurementType === "reps";
}

function hasExplicitValue(value: unknown) {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).length > 0;
  }
  return true;
}

function cloneAppliedFields(existing: ProgressionPresetAppliedFields | null | undefined): ProgressionPresetAppliedFields {
  if (!existing) {
    return {};
  }
  return {
    ...existing,
    progressionPlaybookConfig: clonePlaybookConfig(existing.progressionPlaybookConfig ?? null),
  };
}

function resolvePresetDefinition(
  preset: ProgressionPresetId | ProgressionPresetDefinition | null | undefined,
) {
  if (!preset) {
    return null;
  }
  if (typeof preset === "string") {
    return PRESET_DEFINITIONS[preset] ?? null;
  }
  return PRESET_DEFINITIONS[preset.id] ?? null;
}

function buildPresetDefaults(definition: ProgressionPresetDefinition | null) {
  if (!definition) {
    return null;
  }
  return {
    ...definition.defaults,
    progressionPlaybookConfig: clonePlaybookConfig(definition.defaults.progressionPlaybookConfig),
  } satisfies ProgressionPresetDefaults;
}

export function listProgressionPresets() {
  return PROGRESSION_PRESET_IDS.map((id) => PRESET_DEFINITIONS[id]);
}

export function getProgressionPresetForExercise(exercise: ProgressionPresetExerciseInput | null | undefined): ProgressionPresetDefinition | null {
  const normalized = normalizePresetExercise(exercise);
  if (!normalized) {
    return null;
  }

  if (isPilatesCoreExercise(normalized)) {
    return PRESET_DEFINITIONS.pilates_core;
  }

  if (isMobilityStretchExercise(normalized)) {
    return PRESET_DEFINITIONS.mobility_stretch;
  }

  if (normalized.isCardio) {
    if (normalized.measurementType === "distance") {
      return PRESET_DEFINITIONS.cardio_distance;
    }
    if (normalized.measurementType === "time" || normalized.measurementType === "time_distance") {
      return PRESET_DEFINITIONS.cardio_time;
    }
  }

  if (normalized.isBodyweight && isStrengthMeasurement(normalized)) {
    return PRESET_DEFINITIONS.bodyweight_reps;
  }

  if (!isStrengthMeasurement(normalized)) {
    return normalized.isCustom ? null : null;
  }

  if (hasAnyToken(normalized, ["barbell", "ez bar", "trap bar", "smith"])) {
    return PRESET_DEFINITIONS.barbell_strength;
  }
  if (hasAnyToken(normalized, ["dumbbell", "db "])) {
    return PRESET_DEFINITIONS.dumbbell_strength;
  }
  if (hasAnyToken(normalized, ["cable"])) {
    return PRESET_DEFINITIONS.cable_accessory;
  }
  if (hasAnyToken(normalized, ["machine", "selectorized", "plate loaded"])) {
    return PRESET_DEFINITIONS.machine_strength;
  }

  return null;
}

export function getProgressionPresetDefaults(
  input: ProgressionPresetId | ProgressionPresetDefinition | ProgressionPresetExerciseInput | null | undefined,
): ProgressionPresetDefaults | null {
  const definition = resolvePresetDefinition(input as ProgressionPresetId | ProgressionPresetDefinition)
    ?? (typeof input === "object" ? getProgressionPresetForExercise(input as ProgressionPresetExerciseInput) : null);

  return buildPresetDefaults(definition);
}

export function applyProgressionPresetDefaults(args: {
  existing?: ProgressionPresetAppliedFields | null;
  preset?: ProgressionPresetId | ProgressionPresetDefinition | null;
  exercise?: ProgressionPresetExerciseInput | null;
}): ApplyProgressionPresetDefaultsResult {
  const definition = resolvePresetDefinition(args.preset)
    ?? getProgressionPresetForExercise(args.exercise ?? null);
  const defaults = buildPresetDefaults(definition);
  const next = cloneAppliedFields(args.existing);
  const appliedFields: Array<keyof ProgressionPresetAppliedFields> = [];
  const skippedFields: Array<{ field: keyof ProgressionPresetAppliedFields; reason: string }> = [];

  if (!defaults || !definition) {
    return {
      presetId: null,
      defaults: null,
      next,
      appliedFields,
      skippedFields,
    };
  }

  const fieldMap: Array<{
    field: keyof ProgressionPresetAppliedFields;
    value: ProgressionPresetAppliedFields[keyof ProgressionPresetAppliedFields];
  }> = [
    { field: "trainingGoal", value: defaults.trainingGoal },
    { field: "progressionMethod", value: defaults.progressionMethod },
    { field: "progressionPlaybookId", value: defaults.progressionPlaybookId },
    { field: "progressionPlaybookConfig", value: defaults.progressionPlaybookConfig },
    { field: "progressionSetFlow", value: defaults.progressionSetFlow },
    { field: "progressionPromotionBasis", value: defaults.progressionPromotionBasis },
    { field: "progressionRepPromotionThreshold", value: defaults.progressionRepPromotionThreshold },
  ];

  for (const entry of fieldMap) {
    if (!hasExplicitValue(entry.value)) {
      skippedFields.push({ field: entry.field, reason: "preset does not define this field" });
      continue;
    }

    const existingValue = next[entry.field];
    if (hasExplicitValue(existingValue)) {
      skippedFields.push({ field: entry.field, reason: "explicit value already set" });
      continue;
    }

    if (
      entry.field === "progressionPlaybookConfig"
      && hasExplicitValue(next.progressionPlaybookId)
      && next.progressionPlaybookId !== defaults.progressionPlaybookId
    ) {
      skippedFields.push({ field: entry.field, reason: "playbook id already points at a different configuration" });
      continue;
    }

    switch (entry.field) {
    case "trainingGoal":
      next.trainingGoal = entry.value as TrainingGoalId;
      break;
    case "progressionMethod":
      next.progressionMethod = entry.value as ProgressionMethodLayerId;
      break;
    case "progressionPlaybookId":
      next.progressionPlaybookId = entry.value as ProgressionPlaybookId;
      break;
    case "progressionPlaybookConfig":
      next.progressionPlaybookConfig = clonePlaybookConfig(entry.value as ProgressionPlaybookConfig | null);
      break;
    case "progressionSetFlow":
      next.progressionSetFlow = entry.value as SetFlowId;
      break;
    case "progressionPromotionBasis":
      next.progressionPromotionBasis = entry.value as ProgressionPromotionBasis;
      break;
    case "progressionRepPromotionThreshold":
      next.progressionRepPromotionThreshold = entry.value as RepPromotionThreshold;
      break;
    }
    appliedFields.push(entry.field);
  }

  return {
    presetId: definition.id,
    defaults,
    next,
    appliedFields,
    skippedFields,
  };
}

export function normalizeProgressionPresetId(value: unknown): ProgressionPresetId | null {
  return PROGRESSION_PRESET_IDS.includes(value as ProgressionPresetId)
    ? (value as ProgressionPresetId)
    : null;
}

export function normalizeProgressionPresetPlaybookId(value: unknown): ProgressionPlaybookId | null {
  return PLAYBOOK_IDS.has(value as ProgressionPlaybookId)
    ? (value as ProgressionPlaybookId)
    : null;
}
