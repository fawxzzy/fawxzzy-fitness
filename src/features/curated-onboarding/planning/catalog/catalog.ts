import {
  CANONICAL_EQUIPMENT_KIND_POLICY,
  CANONICAL_PRESCRIPTION_CLASS_POLICY,
  CANONICAL_RESTRICTION_DEMAND_POLICY,
  EQUIPMENT_IDS,
  EXERCISE_CATALOG_SCHEMA_VERSION,
  EXERCISE_CATALOG_VERSION,
  PRESCRIPTION_CLASS_IDS,
  PRESCRIPTION_POLICY_VERSION,
  RESTRICTION_CODES,
  RESTRICTION_TAXONOMY_VERSION,
  type BeginnerSuitability,
  type DemandTag,
  type EquipmentDefinitionV1,
  type EquipmentId,
  type ExerciseCatalogBundleV1,
  type ExerciseDefinitionV1,
  type ExerciseModality,
  type ExerciseRole,
  type ExperienceLevel,
  type GoalCode,
  type ImpactLevel,
  type MovementPattern,
  type MuscleContribution,
  type MuscleGroup,
  type PlanStyleCode,
  type PrescriptionClassId,
  type SubstitutionRuleV1,
} from "./contract.ts";
import { digestExerciseCatalog } from "./validate.ts";

function canonicalStrings<T extends string>(values: readonly T[]) {
  return [...values].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
  }
  return value;
}

const EQUIPMENT_ALIASES: Record<EquipmentId, string[]> = {
  barbells: ["barbell"],
  bench: ["flat bench"],
  bike: ["air bike", "stationary bike"],
  bodyweight: ["body weight", "none"],
  cables: ["cable", "cable station"],
  dumbbells: ["dumbbell"],
  "incline-bench": ["adjustable bench"],
  machines: ["machine"],
  "pull-up-bar": ["pull up bar", "pullup bar"],
  "resistance-bands": ["bands", "resistance band"],
  "safe-door-anchor": ["door anchor"],
  "smith-machine": ["smith"],
  "squat-rack": ["power rack", "rack"],
  treadmill: [],
};

const EQUIPMENT: EquipmentDefinitionV1[] = EQUIPMENT_IDS.map((id) => ({
  id,
  kind: CANONICAL_EQUIPMENT_KIND_POLICY[id],
  aliases: canonicalStrings(EQUIPMENT_ALIASES[id]),
}));

const RESTRICTIONS = RESTRICTION_CODES.map((code) => ({
  code,
  deniedDemandTags: [...CANONICAL_RESTRICTION_DEMAND_POLICY[code]],
}));

const PRESCRIPTION_CLASSES = PRESCRIPTION_CLASS_IDS.map((id) => ({
  id,
  ...CANONICAL_PRESCRIPTION_CLASS_POLICY[id],
  supportedProgressionModes: [...CANONICAL_PRESCRIPTION_CLASS_POLICY[id].supportedProgressionModes],
  targetBounds: CANONICAL_PRESCRIPTION_CLASS_POLICY[id].targetBounds
    ? { ...CANONICAL_PRESCRIPTION_CLASS_POLICY[id].targetBounds }
    : null,
}));

type ExerciseInput = {
  id: string;
  canonicalName: string;
  aliases?: string[];
  modality: ExerciseModality;
  roles: ExerciseRole[];
  movementPatterns: MovementPattern[];
  muscles: Array<[MuscleGroup, MuscleContribution]>;
  unilateral?: boolean;
  closedChain?: boolean;
  requiredAllEquipment: EquipmentId[];
  requiredAnyEquipmentGroups?: EquipmentId[][];
  optionalEquipment?: EquipmentId[];
  minimumExperience: ExperienceLevel;
  beginnerSuitability: BeginnerSuitability;
  demandTags?: DemandTag[];
  impactLevel?: ImpactLevel;
  balanceDemand?: 1 | 2 | 3 | 4 | 5;
  systemicFatigue?: 1 | 2 | 3 | 4 | 5;
  setupSeconds?: number;
  estimatedActiveSecondsPerSet?: number;
  transitionSeconds?: number;
  prescriptionClassId: PrescriptionClassId;
  goalTiers: Record<GoalCode, 1 | 2 | 3 | 4 | 5>;
  styleTags?: PlanStyleCode[];
  timeEfficiencyTier?: 1 | 2 | 3 | 4 | 5;
  curatedRank: number;
  equivalenceClassIds: string[];
};

function exercise(input: ExerciseInput): ExerciseDefinitionV1 {
  const demandTags = canonicalStrings(input.demandTags ?? []);
  const excludedByRestrictionTags = RESTRICTIONS
    .filter((restriction) => restriction.deniedDemandTags.some((tag) => demandTags.includes(tag)))
    .map((restriction) => restriction.code);
  const prescriptionPolicy = CANONICAL_PRESCRIPTION_CLASS_POLICY[input.prescriptionClassId];

  return {
    id: input.id,
    status: "active",
    canonicalName: input.canonicalName,
    aliases: canonicalStrings(input.aliases ?? []),
    classification: {
      modality: input.modality,
      roles: canonicalStrings(input.roles),
      movementPatterns: canonicalStrings(input.movementPatterns),
      muscleContributions: [...input.muscles]
        .map(([muscleGroup, contribution]) => ({ muscleGroup, contribution }))
        .sort((left, right) => {
          const leftKey = `${left.muscleGroup}:${left.contribution}`;
          const rightKey = `${right.muscleGroup}:${right.contribution}`;
          return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
        }),
      unilateral: input.unilateral ?? false,
      closedChain: input.closedChain ?? false,
    },
    environment: {
      requiredAllEquipment: canonicalStrings(input.requiredAllEquipment),
      requiredAnyEquipmentGroups: [...(input.requiredAnyEquipmentGroups ?? [])]
        .map((group) => canonicalStrings(group))
        .sort((left, right) => {
          const leftKey = left.join("|");
          const rightKey = right.join("|");
          return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
        }),
      optionalEquipment: canonicalStrings(input.optionalEquipment ?? []),
    },
    suitability: {
      minimumExperience: input.minimumExperience,
      beginnerSuitability: input.beginnerSuitability,
    },
    safety: {
      reviewStatus: "approved",
      demandTags,
      excludedByRestrictionTags,
      requiresClearanceTags: [],
      impactLevel: input.impactLevel ?? "low",
      balanceDemand: input.balanceDemand ?? 2,
      systemicFatigue: input.systemicFatigue ?? 2,
    },
    cost: {
      setupSeconds: input.setupSeconds ?? 20,
      estimatedActiveSecondsPerSet: input.estimatedActiveSecondsPerSet ?? 35,
      transitionSeconds: input.transitionSeconds ?? 30,
    },
    prescriptionSupport: {
      prescriptionClassIds: [input.prescriptionClassId],
      supportedProgressionModes: [...prescriptionPolicy.supportedProgressionModes],
      startingLoadPolicy: "unset",
    },
    selection: {
      goalTiers: { ...input.goalTiers },
      styleTags: canonicalStrings(input.styleTags ?? ["straight_sets"]),
      timeEfficiencyTier: input.timeEfficiencyTier ?? 3,
      curatedRank: input.curatedRank,
    },
    substitution: {
      equivalenceClassIds: canonicalStrings(input.equivalenceClassIds),
    },
  };
}

const STRENGTH_GOALS: Record<GoalCode, 1 | 2 | 3 | 4 | 5> = {
  athleticism: 3,
  build_muscle: 2,
  general_fitness: 3,
  get_stronger: 1,
};
const MUSCLE_GOALS: Record<GoalCode, 1 | 2 | 3 | 4 | 5> = {
  athleticism: 4,
  build_muscle: 1,
  general_fitness: 3,
  get_stronger: 2,
};
const GENERAL_GOALS: Record<GoalCode, 1 | 2 | 3 | 4 | 5> = {
  athleticism: 2,
  build_muscle: 3,
  general_fitness: 1,
  get_stronger: 3,
};
const CARDIO_GOALS: Record<GoalCode, 1 | 2 | 3 | 4 | 5> = {
  athleticism: 1,
  build_muscle: 5,
  general_fitness: 1,
  get_stronger: 5,
};

const EXERCISES = [
  exercise({
    id: "bodyweight-glute-bridge",
    canonicalName: "Bodyweight Glute Bridge",
    aliases: ["glute bridge"],
    modality: "resistance",
    roles: ["accessory"],
    movementPatterns: ["hinge"],
    muscles: [["glutes", "primary"], ["hamstrings", "secondary"], ["core", "secondary"]],
    closedChain: true,
    requiredAllEquipment: ["bodyweight"],
    minimumExperience: "beginner",
    beginnerSuitability: "preferred",
    prescriptionClassId: "bodyweight-reps-v1",
    goalTiers: GENERAL_GOALS,
    curatedRank: 4,
    equivalenceClassIds: ["hinge-family"],
  }),
  exercise({
    id: "bodyweight-reverse-lunge",
    canonicalName: "Bodyweight Reverse Lunge",
    modality: "resistance",
    roles: ["secondary_compound"],
    movementPatterns: ["split_squat_lunge"],
    muscles: [["glutes", "primary"], ["quadriceps", "primary"], ["core", "secondary"]],
    unilateral: true,
    closedChain: true,
    requiredAllEquipment: ["bodyweight"],
    minimumExperience: "beginner",
    beginnerSuitability: "allowed",
    demandTags: ["deep_knee_flexion", "single_leg_balance"],
    balanceDemand: 3,
    prescriptionClassId: "bodyweight-reps-v1",
    goalTiers: GENERAL_GOALS,
    curatedRank: 3,
    equivalenceClassIds: ["lunge-family"],
  }),
  exercise({
    id: "bodyweight-squat",
    canonicalName: "Bodyweight Squat",
    modality: "resistance",
    roles: ["secondary_compound"],
    movementPatterns: ["squat"],
    muscles: [["glutes", "primary"], ["quadriceps", "primary"], ["core", "secondary"]],
    closedChain: true,
    requiredAllEquipment: ["bodyweight"],
    minimumExperience: "beginner",
    beginnerSuitability: "preferred",
    demandTags: ["deep_knee_flexion"],
    prescriptionClassId: "bodyweight-reps-v1",
    goalTiers: GENERAL_GOALS,
    curatedRank: 2,
    equivalenceClassIds: ["squat-family"],
  }),
  exercise({
    id: "cable-crunch",
    canonicalName: "Cable Crunch",
    modality: "core",
    roles: ["core"],
    movementPatterns: ["trunk_flexion"],
    muscles: [["core", "primary"]],
    requiredAllEquipment: ["cables"],
    minimumExperience: "beginner",
    beginnerSuitability: "allowed",
    demandTags: ["loaded_spinal_flexion"],
    prescriptionClassId: "resistance-load-reps-v1",
    goalTiers: MUSCLE_GOALS,
    curatedRank: 5,
    equivalenceClassIds: ["trunk-flexion-family"],
  }),
  exercise({
    id: "dumbbell-bench-press",
    canonicalName: "Dumbbell Bench Press",
    aliases: ["dumbbell chest press"],
    modality: "resistance",
    roles: ["main_lift"],
    movementPatterns: ["horizontal_push"],
    muscles: [["chest", "primary"], ["shoulders", "secondary"], ["triceps", "secondary"]],
    requiredAllEquipment: ["bench", "dumbbells"],
    minimumExperience: "beginner",
    beginnerSuitability: "allowed",
    systemicFatigue: 3,
    prescriptionClassId: "resistance-load-reps-v1",
    goalTiers: MUSCLE_GOALS,
    styleTags: ["straight_sets", "supersets"],
    curatedRank: 1,
    equivalenceClassIds: ["horizontal-push-family"],
  }),
  exercise({
    id: "dumbbell-row",
    canonicalName: "Dumbbell Row",
    aliases: ["dumbbell bent row"],
    modality: "resistance",
    roles: ["secondary_compound"],
    movementPatterns: ["horizontal_pull"],
    muscles: [["back", "primary"], ["biceps", "secondary"], ["core", "secondary"]],
    requiredAllEquipment: ["bench", "dumbbells"],
    minimumExperience: "beginner",
    beginnerSuitability: "allowed",
    prescriptionClassId: "resistance-load-reps-v1",
    goalTiers: STRENGTH_GOALS,
    curatedRank: 3,
    equivalenceClassIds: ["horizontal-pull-family"],
  }),
  exercise({
    id: "goblet-squat",
    canonicalName: "Goblet Squat",
    modality: "resistance",
    roles: ["main_lift"],
    movementPatterns: ["squat"],
    muscles: [["glutes", "primary"], ["quadriceps", "primary"], ["core", "secondary"]],
    closedChain: true,
    requiredAllEquipment: ["dumbbells"],
    minimumExperience: "beginner",
    beginnerSuitability: "preferred",
    demandTags: ["deep_knee_flexion"],
    systemicFatigue: 3,
    prescriptionClassId: "resistance-load-reps-v1",
    goalTiers: STRENGTH_GOALS,
    curatedRank: 1,
    equivalenceClassIds: ["squat-family"],
  }),
  exercise({
    id: "incline-dumbbell-bench-press",
    canonicalName: "Incline Dumbbell Bench Press",
    modality: "resistance",
    roles: ["secondary_compound"],
    movementPatterns: ["horizontal_push"],
    muscles: [["chest", "primary"], ["shoulders", "secondary"], ["triceps", "secondary"]],
    requiredAllEquipment: ["dumbbells", "incline-bench"],
    minimumExperience: "beginner",
    beginnerSuitability: "allowed",
    prescriptionClassId: "resistance-load-reps-v1",
    goalTiers: MUSCLE_GOALS,
    curatedRank: 4,
    equivalenceClassIds: ["horizontal-push-family"],
  }),
  exercise({
    id: "incline-walk",
    canonicalName: "Incline Walk",
    modality: "cardio",
    roles: ["conditioning"],
    movementPatterns: ["walking"],
    muscles: [["full_body", "primary"], ["calves", "secondary"], ["glutes", "secondary"]],
    closedChain: true,
    requiredAllEquipment: ["treadmill"],
    minimumExperience: "beginner",
    beginnerSuitability: "preferred",
    systemicFatigue: 2,
    setupSeconds: 15,
    estimatedActiveSecondsPerSet: 600,
    transitionSeconds: 20,
    prescriptionClassId: "cardio-time-distance-v1",
    goalTiers: CARDIO_GOALS,
    styleTags: ["circuits", "mixed", "straight_sets"],
    timeEfficiencyTier: 2,
    curatedRank: 1,
    equivalenceClassIds: ["walking-cardio-family"],
  }),
  exercise({
    id: "inverted-row",
    canonicalName: "Inverted Row",
    modality: "resistance",
    roles: ["secondary_compound"],
    movementPatterns: ["horizontal_pull"],
    muscles: [["back", "primary"], ["biceps", "secondary"], ["core", "secondary"]],
    closedChain: true,
    requiredAllEquipment: ["bodyweight", "pull-up-bar"],
    minimumExperience: "beginner",
    beginnerSuitability: "allowed",
    prescriptionClassId: "bodyweight-reps-v1",
    goalTiers: GENERAL_GOALS,
    curatedRank: 5,
    equivalenceClassIds: ["horizontal-pull-family"],
  }),
  exercise({
    id: "lat-pulldown",
    canonicalName: "Lat Pulldown",
    modality: "resistance",
    roles: ["secondary_compound"],
    movementPatterns: ["vertical_pull"],
    muscles: [["back", "primary"], ["biceps", "secondary"]],
    requiredAllEquipment: ["cables"],
    minimumExperience: "beginner",
    beginnerSuitability: "preferred",
    prescriptionClassId: "resistance-load-reps-v1",
    goalTiers: MUSCLE_GOALS,
    curatedRank: 1,
    equivalenceClassIds: ["vertical-pull-family"],
  }),
  exercise({
    id: "leg-extension",
    canonicalName: "Leg Extension",
    modality: "resistance",
    roles: ["isolation"],
    movementPatterns: ["squat"],
    muscles: [["quadriceps", "primary"]],
    requiredAllEquipment: ["machines"],
    minimumExperience: "beginner",
    beginnerSuitability: "allowed",
    prescriptionClassId: "resistance-load-reps-v1",
    goalTiers: MUSCLE_GOALS,
    curatedRank: 6,
    equivalenceClassIds: ["knee-extension-family"],
  }),
  exercise({
    id: "leg-press",
    canonicalName: "Leg Press",
    modality: "resistance",
    roles: ["main_lift"],
    movementPatterns: ["squat"],
    muscles: [["glutes", "primary"], ["quadriceps", "primary"]],
    closedChain: true,
    requiredAllEquipment: ["machines"],
    minimumExperience: "beginner",
    beginnerSuitability: "preferred",
    demandTags: ["deep_knee_flexion"],
    systemicFatigue: 3,
    prescriptionClassId: "resistance-load-reps-v1",
    goalTiers: MUSCLE_GOALS,
    curatedRank: 1,
    equivalenceClassIds: ["squat-family"],
  }),
  exercise({
    id: "machine-shoulder-press",
    canonicalName: "Machine Shoulder Press",
    modality: "resistance",
    roles: ["secondary_compound"],
    movementPatterns: ["vertical_push"],
    muscles: [["shoulders", "primary"], ["triceps", "secondary"]],
    requiredAllEquipment: ["machines"],
    minimumExperience: "beginner",
    beginnerSuitability: "allowed",
    demandTags: ["overhead_loading"],
    prescriptionClassId: "resistance-load-reps-v1",
    goalTiers: MUSCLE_GOALS,
    curatedRank: 1,
    equivalenceClassIds: ["vertical-push-family"],
  }),
  exercise({
    id: "mountain-climber",
    canonicalName: "Mountain Climber",
    modality: "cardio",
    roles: ["conditioning"],
    movementPatterns: ["locomotion"],
    muscles: [["full_body", "primary"], ["core", "secondary"]],
    closedChain: true,
    requiredAllEquipment: ["bodyweight"],
    minimumExperience: "beginner",
    beginnerSuitability: "allowed",
    demandTags: ["weight_bearing_wrist_extension"],
    impactLevel: "moderate",
    balanceDemand: 3,
    systemicFatigue: 3,
    setupSeconds: 5,
    estimatedActiveSecondsPerSet: 45,
    transitionSeconds: 15,
    prescriptionClassId: "core-duration-v1",
    goalTiers: CARDIO_GOALS,
    styleTags: ["circuits", "mixed"],
    timeEfficiencyTier: 1,
    curatedRank: 2,
    equivalenceClassIds: ["bodyweight-conditioning-family"],
  }),
  exercise({
    id: "plank",
    canonicalName: "Plank",
    modality: "core",
    roles: ["core"],
    movementPatterns: ["trunk_bracing"],
    muscles: [["core", "primary"], ["shoulders", "secondary"]],
    closedChain: true,
    requiredAllEquipment: ["bodyweight"],
    minimumExperience: "beginner",
    beginnerSuitability: "preferred",
    demandTags: ["weight_bearing_wrist_extension"],
    setupSeconds: 5,
    estimatedActiveSecondsPerSet: 45,
    transitionSeconds: 15,
    prescriptionClassId: "core-duration-v1",
    goalTiers: GENERAL_GOALS,
    curatedRank: 1,
    equivalenceClassIds: ["trunk-bracing-family"],
  }),
  exercise({
    id: "pull-up",
    canonicalName: "Pull-Up",
    aliases: ["pull ups", "pullups"],
    modality: "resistance",
    roles: ["main_lift"],
    movementPatterns: ["vertical_pull"],
    muscles: [["back", "primary"], ["biceps", "secondary"], ["core", "secondary"]],
    closedChain: true,
    requiredAllEquipment: ["bodyweight", "pull-up-bar"],
    minimumExperience: "intermediate",
    beginnerSuitability: "avoid_by_default",
    systemicFatigue: 3,
    prescriptionClassId: "bodyweight-reps-v1",
    goalTiers: STRENGTH_GOALS,
    curatedRank: 2,
    equivalenceClassIds: ["vertical-pull-family"],
  }),
  exercise({
    id: "push-up",
    canonicalName: "Push-Up",
    aliases: ["push ups", "pushups"],
    modality: "resistance",
    roles: ["secondary_compound"],
    movementPatterns: ["horizontal_push"],
    muscles: [["chest", "primary"], ["shoulders", "secondary"], ["triceps", "secondary"]],
    closedChain: true,
    requiredAllEquipment: ["bodyweight"],
    minimumExperience: "beginner",
    beginnerSuitability: "preferred",
    demandTags: ["weight_bearing_wrist_extension"],
    prescriptionClassId: "bodyweight-reps-v1",
    goalTiers: GENERAL_GOALS,
    curatedRank: 3,
    equivalenceClassIds: ["horizontal-push-family"],
  }),
  exercise({
    id: "seated-cable-row",
    canonicalName: "Seated Cable Row",
    modality: "resistance",
    roles: ["secondary_compound"],
    movementPatterns: ["horizontal_pull"],
    muscles: [["back", "primary"], ["biceps", "secondary"]],
    requiredAllEquipment: ["cables"],
    minimumExperience: "beginner",
    beginnerSuitability: "preferred",
    prescriptionClassId: "resistance-load-reps-v1",
    goalTiers: MUSCLE_GOALS,
    curatedRank: 1,
    equivalenceClassIds: ["horizontal-pull-family"],
  }),
  exercise({
    id: "seated-dumbbell-shoulder-press",
    canonicalName: "Seated Dumbbell Shoulder Press",
    modality: "resistance",
    roles: ["secondary_compound"],
    movementPatterns: ["vertical_push"],
    muscles: [["shoulders", "primary"], ["triceps", "secondary"]],
    requiredAllEquipment: ["bench", "dumbbells"],
    minimumExperience: "intermediate",
    beginnerSuitability: "avoid_by_default",
    demandTags: ["overhead_loading"],
    prescriptionClassId: "resistance-load-reps-v1",
    goalTiers: STRENGTH_GOALS,
    curatedRank: 3,
    equivalenceClassIds: ["vertical-push-family"],
  }),
  exercise({
    id: "seated-leg-curl",
    canonicalName: "Seated Leg Curl",
    modality: "resistance",
    roles: ["isolation"],
    movementPatterns: ["hinge"],
    muscles: [["hamstrings", "primary"]],
    requiredAllEquipment: ["machines"],
    minimumExperience: "beginner",
    beginnerSuitability: "allowed",
    prescriptionClassId: "resistance-load-reps-v1",
    goalTiers: MUSCLE_GOALS,
    curatedRank: 5,
    equivalenceClassIds: ["knee-flexion-family"],
  }),
  exercise({
    id: "single-arm-dumbbell-row",
    canonicalName: "Single-Arm Dumbbell Row",
    modality: "resistance",
    roles: ["secondary_compound"],
    movementPatterns: ["horizontal_pull"],
    muscles: [["back", "primary"], ["biceps", "secondary"], ["core", "secondary"]],
    unilateral: true,
    requiredAllEquipment: ["bench", "dumbbells"],
    minimumExperience: "beginner",
    beginnerSuitability: "allowed",
    prescriptionClassId: "resistance-load-reps-v1",
    goalTiers: MUSCLE_GOALS,
    curatedRank: 2,
    equivalenceClassIds: ["horizontal-pull-family"],
  }),
  exercise({
    id: "smith-machine-bench-press",
    canonicalName: "Smith Machine Bench Press",
    modality: "resistance",
    roles: ["main_lift"],
    movementPatterns: ["horizontal_push"],
    muscles: [["chest", "primary"], ["shoulders", "secondary"], ["triceps", "secondary"]],
    requiredAllEquipment: ["bench", "smith-machine"],
    minimumExperience: "beginner",
    beginnerSuitability: "preferred",
    systemicFatigue: 3,
    prescriptionClassId: "resistance-load-reps-v1",
    goalTiers: MUSCLE_GOALS,
    curatedRank: 2,
    equivalenceClassIds: ["horizontal-push-family"],
  }),
  exercise({
    id: "smith-machine-romanian-deadlift",
    canonicalName: "Smith Machine Romanian Deadlift",
    modality: "resistance",
    roles: ["main_lift"],
    movementPatterns: ["hinge"],
    muscles: [["hamstrings", "primary"], ["glutes", "primary"], ["core", "secondary"]],
    requiredAllEquipment: ["smith-machine"],
    minimumExperience: "beginner",
    beginnerSuitability: "allowed",
    demandTags: ["unsupported_hinge"],
    systemicFatigue: 4,
    prescriptionClassId: "resistance-load-reps-v1",
    goalTiers: STRENGTH_GOALS,
    curatedRank: 1,
    equivalenceClassIds: ["hinge-family"],
  }),
  exercise({
    id: "smith-machine-shoulder-press",
    canonicalName: "Smith Machine Shoulder Press",
    modality: "resistance",
    roles: ["secondary_compound"],
    movementPatterns: ["vertical_push"],
    muscles: [["shoulders", "primary"], ["triceps", "secondary"]],
    requiredAllEquipment: ["bench", "smith-machine"],
    minimumExperience: "beginner",
    beginnerSuitability: "allowed",
    demandTags: ["overhead_loading"],
    prescriptionClassId: "resistance-load-reps-v1",
    goalTiers: MUSCLE_GOALS,
    curatedRank: 2,
    equivalenceClassIds: ["vertical-push-family"],
  }),
  exercise({
    id: "smith-machine-squat",
    canonicalName: "Smith Machine Squat",
    modality: "resistance",
    roles: ["main_lift"],
    movementPatterns: ["squat"],
    muscles: [["glutes", "primary"], ["quadriceps", "primary"], ["core", "secondary"]],
    closedChain: true,
    requiredAllEquipment: ["smith-machine"],
    minimumExperience: "beginner",
    beginnerSuitability: "preferred",
    demandTags: ["axial_loading", "deep_knee_flexion"],
    systemicFatigue: 4,
    prescriptionClassId: "resistance-load-reps-v1",
    goalTiers: STRENGTH_GOALS,
    curatedRank: 2,
    equivalenceClassIds: ["squat-family"],
  }),
  exercise({
    id: "stationary-bike",
    canonicalName: "Stationary Bike",
    modality: "cardio",
    roles: ["conditioning"],
    movementPatterns: ["cycling"],
    muscles: [["full_body", "primary"], ["quadriceps", "secondary"]],
    closedChain: true,
    requiredAllEquipment: ["bike"],
    minimumExperience: "beginner",
    beginnerSuitability: "preferred",
    systemicFatigue: 2,
    setupSeconds: 15,
    estimatedActiveSecondsPerSet: 600,
    transitionSeconds: 20,
    prescriptionClassId: "cardio-time-distance-v1",
    goalTiers: CARDIO_GOALS,
    styleTags: ["circuits", "mixed", "straight_sets"],
    timeEfficiencyTier: 2,
    curatedRank: 1,
    equivalenceClassIds: ["cycling-cardio-family"],
  }),
].sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));

function buildFamilyRules(
  equivalenceClassId: string,
  exerciseIds: string[],
): SubstitutionRuleV1[] {
  const canonicalIds = canonicalStrings(exerciseIds);
  return canonicalIds.map((sourceExerciseId) => ({
    id: `${sourceExerciseId}-equipment-alternatives`,
    equivalenceClassId,
    sourceExerciseId,
    candidateExerciseIds: canonicalIds.filter((id) => id !== sourceExerciseId),
    reasonCode: "EQUIPMENT_ALTERNATIVE",
  }));
}

const SUBSTITUTION_RULES = [
  ...buildFamilyRules("horizontal-pull-family", [
    "dumbbell-row",
    "inverted-row",
    "seated-cable-row",
    "single-arm-dumbbell-row",
  ]),
  ...buildFamilyRules("horizontal-push-family", [
    "dumbbell-bench-press",
    "incline-dumbbell-bench-press",
    "push-up",
    "smith-machine-bench-press",
  ]),
  ...buildFamilyRules("squat-family", [
    "bodyweight-squat",
    "goblet-squat",
    "leg-press",
    "smith-machine-squat",
  ]),
  ...buildFamilyRules("vertical-pull-family", [
    "lat-pulldown",
    "pull-up",
  ]),
  ...buildFamilyRules("vertical-push-family", [
    "machine-shoulder-press",
    "seated-dumbbell-shoulder-press",
    "smith-machine-shoulder-press",
  ]),
].sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));

const CATALOG_WITHOUT_DIGEST: Omit<ExerciseCatalogBundleV1, "catalogDigest"> = {
  schemaVersion: EXERCISE_CATALOG_SCHEMA_VERSION,
  catalogVersion: EXERCISE_CATALOG_VERSION,
  restrictionTaxonomyVersion: RESTRICTION_TAXONOMY_VERSION,
  prescriptionPolicyVersion: PRESCRIPTION_POLICY_VERSION,
  equipment: EQUIPMENT,
  restrictions: RESTRICTIONS,
  prescriptionClasses: PRESCRIPTION_CLASSES,
  exercises: EXERCISES,
  substitutionRules: SUBSTITUTION_RULES,
};

const CATALOG_DRAFT: ExerciseCatalogBundleV1 = {
  ...CATALOG_WITHOUT_DIGEST,
  catalogDigest: "0".repeat(64),
};

export const PLANNER_EXERCISE_CATALOG_V1 = deepFreeze({
  ...CATALOG_WITHOUT_DIGEST,
  catalogDigest: digestExerciseCatalog(CATALOG_DRAFT),
}) as ExerciseCatalogBundleV1;
