export const EXERCISE_CATALOG_SCHEMA_VERSION = "fitness.exercise-catalog.v1" as const;
export const EXERCISE_CATALOG_VERSION = "fitness.exercise-catalog.2026-07-28.v1" as const;
export const RESTRICTION_TAXONOMY_VERSION = "fitness.movement-restrictions.v1" as const;
export const PRESCRIPTION_POLICY_VERSION = "fitness.prescription-classes.v1" as const;

export const EQUIPMENT_KINDS = [
  "attachment",
  "bodyweight",
  "cardio",
  "free_weight",
  "station",
  "support",
] as const;
export const EQUIPMENT_IDS = [
  "barbells",
  "bench",
  "bike",
  "bodyweight",
  "cables",
  "dumbbells",
  "incline-bench",
  "machines",
  "pull-up-bar",
  "resistance-bands",
  "safe-door-anchor",
  "smith-machine",
  "squat-rack",
  "treadmill",
] as const;

export const EXERCISE_STATUSES = ["active", "deprecated", "disabled"] as const;
export const EXERCISE_MODALITIES = ["cardio", "core", "resistance"] as const;
export const EXERCISE_ROLES = [
  "accessory",
  "conditioning",
  "core",
  "isolation",
  "main_lift",
  "secondary_compound",
] as const;
export const MOVEMENT_PATTERNS = [
  "cycling",
  "hinge",
  "horizontal_pull",
  "horizontal_push",
  "locomotion",
  "split_squat_lunge",
  "squat",
  "trunk_bracing",
  "trunk_flexion",
  "vertical_pull",
  "vertical_push",
  "walking",
] as const;
export const MUSCLE_GROUPS = [
  "back",
  "biceps",
  "calves",
  "chest",
  "core",
  "full_body",
  "glutes",
  "hamstrings",
  "quadriceps",
  "shoulders",
  "triceps",
] as const;
export const MUSCLE_CONTRIBUTIONS = ["primary", "secondary"] as const;
export const EXPERIENCE_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export const BEGINNER_SUITABILITY = ["preferred", "allowed", "avoid_by_default"] as const;
export const SAFETY_REVIEW_STATUSES = ["approved", "pending", "rejected"] as const;
export const IMPACT_LEVELS = ["none", "low", "moderate", "high"] as const;
export const PROGRESSION_MODES = [
  "assistance",
  "distance",
  "duration",
  "exercise_variant",
  "load_and_reps",
  "reps",
] as const;
export const MEASUREMENT_TYPES = ["reps", "time", "time_distance"] as const;
export const PRESCRIPTION_CLASS_IDS = [
  "bodyweight-reps-v1",
  "cardio-time-distance-v1",
  "core-duration-v1",
  "resistance-load-reps-v1",
] as const;
export const PLAN_STYLE_CODES = [
  "circuits",
  "mixed",
  "straight_sets",
  "supersets",
] as const;
export const GOAL_CODES = [
  "athleticism",
  "build_muscle",
  "general_fitness",
  "get_stronger",
] as const;
export const DEMAND_TAGS = [
  "axial_loading",
  "deep_knee_flexion",
  "high_impact",
  "loaded_spinal_flexion",
  "overhead_loading",
  "prone_position",
  "single_leg_balance",
  "unsupported_hinge",
  "weight_bearing_wrist_extension",
] as const;
export const RESTRICTION_CODES = [
  "NO_AXIAL_LOADING",
  "NO_DEEP_KNEE_FLEXION",
  "NO_HIGH_IMPACT",
  "NO_LOADED_SPINAL_FLEXION",
  "NO_OVERHEAD_LOADING",
  "NO_PRONE_POSITION",
  "NO_SINGLE_LEG_BALANCE",
  "NO_UNSUPPORTED_HINGE",
  "NO_WEIGHT_BEARING_WRIST_EXTENSION",
] as const;

export type EquipmentKind = typeof EQUIPMENT_KINDS[number];
export type EquipmentId = typeof EQUIPMENT_IDS[number];
export type ExerciseStatus = typeof EXERCISE_STATUSES[number];
export type ExerciseModality = typeof EXERCISE_MODALITIES[number];
export type ExerciseRole = typeof EXERCISE_ROLES[number];
export type MovementPattern = typeof MOVEMENT_PATTERNS[number];
export type MuscleGroup = typeof MUSCLE_GROUPS[number];
export type MuscleContribution = typeof MUSCLE_CONTRIBUTIONS[number];
export type ExperienceLevel = typeof EXPERIENCE_LEVELS[number];
export type BeginnerSuitability = typeof BEGINNER_SUITABILITY[number];
export type SafetyReviewStatus = typeof SAFETY_REVIEW_STATUSES[number];
export type ImpactLevel = typeof IMPACT_LEVELS[number];
export type ProgressionMode = typeof PROGRESSION_MODES[number];
export type MeasurementType = typeof MEASUREMENT_TYPES[number];
export type PrescriptionClassId = typeof PRESCRIPTION_CLASS_IDS[number];
export type PlanStyleCode = typeof PLAN_STYLE_CODES[number];
export type GoalCode = typeof GOAL_CODES[number];
export type DemandTag = typeof DEMAND_TAGS[number];
export type RestrictionCode = typeof RESTRICTION_CODES[number];

export type EquipmentDefinitionV1 = {
  id: EquipmentId;
  kind: EquipmentKind;
  aliases: string[];
};

export type RestrictionDefinitionV1 = {
  code: RestrictionCode;
  deniedDemandTags: DemandTag[];
};

export type PrescriptionClassDefinitionV1 = {
  id: PrescriptionClassId;
  measurementType: MeasurementType;
  supportedProgressionModes: ProgressionMode[];
  targetBounds: {
    unit: "reps" | "seconds" | "minutes";
    minimum: number;
    maximum: number;
  } | null;
  startingLoadPolicy: "unset";
};

export const CANONICAL_EQUIPMENT_KIND_POLICY: Record<EquipmentId, EquipmentKind> = {
  barbells: "free_weight",
  bench: "support",
  bike: "cardio",
  bodyweight: "bodyweight",
  cables: "station",
  dumbbells: "free_weight",
  "incline-bench": "support",
  machines: "station",
  "pull-up-bar": "station",
  "resistance-bands": "attachment",
  "safe-door-anchor": "attachment",
  "smith-machine": "station",
  "squat-rack": "station",
  treadmill: "cardio",
};

export const CANONICAL_RESTRICTION_DEMAND_POLICY: Record<RestrictionCode, DemandTag[]> = {
  NO_AXIAL_LOADING: ["axial_loading"],
  NO_DEEP_KNEE_FLEXION: ["deep_knee_flexion"],
  NO_HIGH_IMPACT: ["high_impact"],
  NO_LOADED_SPINAL_FLEXION: ["loaded_spinal_flexion"],
  NO_OVERHEAD_LOADING: ["overhead_loading"],
  NO_PRONE_POSITION: ["prone_position"],
  NO_SINGLE_LEG_BALANCE: ["single_leg_balance"],
  NO_UNSUPPORTED_HINGE: ["unsupported_hinge"],
  NO_WEIGHT_BEARING_WRIST_EXTENSION: ["weight_bearing_wrist_extension"],
};

export const CANONICAL_PRESCRIPTION_CLASS_POLICY: Record<
  PrescriptionClassId,
  Omit<PrescriptionClassDefinitionV1, "id">
> = {
  "bodyweight-reps-v1": {
    measurementType: "reps",
    supportedProgressionModes: ["assistance", "exercise_variant", "reps"],
    targetBounds: { unit: "reps", minimum: 5, maximum: 20 },
    startingLoadPolicy: "unset",
  },
  "cardio-time-distance-v1": {
    measurementType: "time_distance",
    supportedProgressionModes: ["distance", "duration"],
    targetBounds: { unit: "minutes", minimum: 5, maximum: 30 },
    startingLoadPolicy: "unset",
  },
  "core-duration-v1": {
    measurementType: "time",
    supportedProgressionModes: ["duration", "exercise_variant"],
    targetBounds: { unit: "seconds", minimum: 20, maximum: 90 },
    startingLoadPolicy: "unset",
  },
  "resistance-load-reps-v1": {
    measurementType: "reps",
    supportedProgressionModes: ["load_and_reps", "reps"],
    targetBounds: { unit: "reps", minimum: 5, maximum: 20 },
    startingLoadPolicy: "unset",
  },
};

export type ExerciseDefinitionV1 = {
  id: string;
  status: ExerciseStatus;
  canonicalName: string;
  aliases: string[];
  classification: {
    modality: ExerciseModality;
    roles: ExerciseRole[];
    movementPatterns: MovementPattern[];
    muscleContributions: {
      muscleGroup: MuscleGroup;
      contribution: MuscleContribution;
    }[];
    unilateral: boolean;
    closedChain: boolean;
  };
  environment: {
    requiredAllEquipment: EquipmentId[];
    requiredAnyEquipmentGroups: EquipmentId[][];
    optionalEquipment: EquipmentId[];
  };
  suitability: {
    minimumExperience: ExperienceLevel;
    beginnerSuitability: BeginnerSuitability;
  };
  safety: {
    reviewStatus: SafetyReviewStatus;
    demandTags: DemandTag[];
    excludedByRestrictionTags: RestrictionCode[];
    requiresClearanceTags: RestrictionCode[];
    impactLevel: ImpactLevel;
    balanceDemand: 1 | 2 | 3 | 4 | 5;
    systemicFatigue: 1 | 2 | 3 | 4 | 5;
  };
  cost: {
    setupSeconds: number;
    estimatedActiveSecondsPerSet: number;
    transitionSeconds: number;
  };
  prescriptionSupport: {
    prescriptionClassIds: PrescriptionClassId[];
    supportedProgressionModes: ProgressionMode[];
    startingLoadPolicy: "unset";
  };
  selection: {
    goalTiers: Record<GoalCode, 1 | 2 | 3 | 4 | 5>;
    styleTags: PlanStyleCode[];
    timeEfficiencyTier: 1 | 2 | 3 | 4 | 5;
    curatedRank: number;
  };
  substitution: {
    equivalenceClassIds: string[];
  };
};

export type SubstitutionRuleV1 = {
  id: string;
  equivalenceClassId: string;
  sourceExerciseId: string;
  candidateExerciseIds: string[];
  reasonCode: "EQUIPMENT_ALTERNATIVE" | "RESTRICTION_ALTERNATIVE";
};

export type ExerciseCatalogBundleV1 = {
  schemaVersion: typeof EXERCISE_CATALOG_SCHEMA_VERSION;
  catalogVersion: typeof EXERCISE_CATALOG_VERSION;
  restrictionTaxonomyVersion: typeof RESTRICTION_TAXONOMY_VERSION;
  prescriptionPolicyVersion: typeof PRESCRIPTION_POLICY_VERSION;
  equipment: EquipmentDefinitionV1[];
  restrictions: RestrictionDefinitionV1[];
  prescriptionClasses: PrescriptionClassDefinitionV1[];
  exercises: ExerciseDefinitionV1[];
  substitutionRules: SubstitutionRuleV1[];
  catalogDigest: string;
};

export type CatalogCandidateRejectionCode =
  | "CLEARANCE_REQUIRED"
  | "EQUIPMENT_AVOIDED"
  | "EQUIPMENT_UNAVAILABLE"
  | "EXPERIENCE_UNSUPPORTED"
  | "RESTRICTION_CONFLICT";

export type CatalogCandidateQueryV1 = {
  movementPatterns: MovementPattern[];
  availableEquipment: EquipmentId[];
  avoidedEquipment: EquipmentId[];
  restrictionCodes: RestrictionCode[];
  experience: ExperienceLevel;
};

export type CatalogCandidateResolution =
  | {
    status: "available";
    compatibleExerciseIds: string[];
    rejectedCandidates: {
      exerciseId: string;
      reasonCodes: CatalogCandidateRejectionCode[];
    }[];
  }
  | {
    status: "unavailable";
    reasonCodes: Array<CatalogCandidateRejectionCode | "UNSUPPORTED_COVERAGE">;
    compatibleExerciseIds: [];
    rejectedCandidates: {
      exerciseId: string;
      reasonCodes: CatalogCandidateRejectionCode[];
    }[];
  }
  | {
    status: "invalid_catalog";
    reasonCodes: ["CATALOG_INVALID"];
    validationErrors: string[];
    compatibleExerciseIds: [];
    rejectedCandidates: [];
  }
  | {
    status: "invalid_request";
    reasonCodes: ["INVALID_QUERY"];
    validationErrors: string[];
    compatibleExerciseIds: [];
    rejectedCandidates: [];
  };

function closedObjectSchema<
  const TRequired extends readonly string[],
  const TProperties extends Record<string, unknown>,
>(required: TRequired, properties: TProperties) {
  return {
    type: "object",
    additionalProperties: false,
    required,
    properties,
  } as const;
}

function enumArraySchema<const TValues extends readonly string[]>(
  values: TValues,
  minItems = 0,
) {
  return {
    type: "array",
    minItems,
    uniqueItems: true,
    items: { enum: values },
  } as const;
}

const identifierSchema = { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" } as const;
const restrictionCodeSchema = { enum: RESTRICTION_CODES } as const;
const integerTierSchema = { type: "integer", minimum: 1, maximum: 5 } as const;

export const EXERCISE_CATALOG_V1_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://fawxzzy.dev/schemas/fitness.exercise-catalog.v1.json",
  ...closedObjectSchema(
    [
      "schemaVersion",
      "catalogVersion",
      "restrictionTaxonomyVersion",
      "prescriptionPolicyVersion",
      "equipment",
      "restrictions",
      "prescriptionClasses",
      "exercises",
      "substitutionRules",
      "catalogDigest",
    ],
    {
      schemaVersion: { const: EXERCISE_CATALOG_SCHEMA_VERSION },
      catalogVersion: { const: EXERCISE_CATALOG_VERSION },
      restrictionTaxonomyVersion: { const: RESTRICTION_TAXONOMY_VERSION },
      prescriptionPolicyVersion: { const: PRESCRIPTION_POLICY_VERSION },
      equipment: {
        type: "array",
        minItems: 1,
        items: {
          ...closedObjectSchema(["id", "kind", "aliases"], {
            id: { enum: EQUIPMENT_IDS },
            kind: { enum: EQUIPMENT_KINDS },
            aliases: {
              type: "array",
              uniqueItems: true,
              items: { type: "string", minLength: 1 },
            },
          }),
        },
      },
      restrictions: {
        type: "array",
        minItems: 1,
        items: {
          ...closedObjectSchema(["code", "deniedDemandTags"], {
            code: restrictionCodeSchema,
            deniedDemandTags: enumArraySchema(DEMAND_TAGS, 1),
          }),
        },
      },
      prescriptionClasses: {
        type: "array",
        minItems: 1,
        items: {
          ...closedObjectSchema(
            [
              "id",
              "measurementType",
              "supportedProgressionModes",
              "targetBounds",
              "startingLoadPolicy",
            ],
            {
              id: { enum: PRESCRIPTION_CLASS_IDS },
              measurementType: { enum: MEASUREMENT_TYPES },
              supportedProgressionModes: enumArraySchema(PROGRESSION_MODES, 1),
              targetBounds: {
                anyOf: [
                  { type: "null" },
                  {
                    ...closedObjectSchema(["unit", "minimum", "maximum"], {
                      unit: { enum: ["reps", "seconds", "minutes"] },
                      minimum: { type: "number", exclusiveMinimum: 0 },
                      maximum: { type: "number", exclusiveMinimum: 0 },
                    }),
                  },
                ],
              },
              startingLoadPolicy: { const: "unset" },
            },
          ),
        },
      },
      exercises: {
        type: "array",
        minItems: 1,
        items: {
          ...closedObjectSchema(
            [
              "id",
              "status",
              "canonicalName",
              "aliases",
              "classification",
              "environment",
              "suitability",
              "safety",
              "cost",
              "prescriptionSupport",
              "selection",
              "substitution",
            ],
            {
              id: identifierSchema,
              status: { enum: EXERCISE_STATUSES },
              canonicalName: { type: "string", minLength: 1 },
              aliases: {
                type: "array",
                uniqueItems: true,
                items: { type: "string", minLength: 1 },
              },
              classification: {
                ...closedObjectSchema(
                  [
                    "modality",
                    "roles",
                    "movementPatterns",
                    "muscleContributions",
                    "unilateral",
                    "closedChain",
                  ],
                  {
                    modality: { enum: EXERCISE_MODALITIES },
                    roles: enumArraySchema(EXERCISE_ROLES, 1),
                    movementPatterns: enumArraySchema(MOVEMENT_PATTERNS, 1),
                    muscleContributions: {
                      type: "array",
                      minItems: 1,
                      uniqueItems: true,
                      items: {
                        ...closedObjectSchema(["muscleGroup", "contribution"], {
                          muscleGroup: { enum: MUSCLE_GROUPS },
                          contribution: { enum: MUSCLE_CONTRIBUTIONS },
                        }),
                      },
                    },
                    unilateral: { type: "boolean" },
                    closedChain: { type: "boolean" },
                  },
                ),
              },
              environment: {
                ...closedObjectSchema(
                  ["requiredAllEquipment", "requiredAnyEquipmentGroups", "optionalEquipment"],
                  {
                    requiredAllEquipment: {
                      type: "array",
                      uniqueItems: true,
                      items: { enum: EQUIPMENT_IDS },
                    },
                    requiredAnyEquipmentGroups: {
                      type: "array",
                      uniqueItems: true,
                      items: {
                        type: "array",
                        minItems: 1,
                        uniqueItems: true,
                        items: { enum: EQUIPMENT_IDS },
                      },
                    },
                    optionalEquipment: {
                      type: "array",
                      uniqueItems: true,
                      items: { enum: EQUIPMENT_IDS },
                    },
                  },
                ),
              },
              suitability: {
                ...closedObjectSchema(["minimumExperience", "beginnerSuitability"], {
                  minimumExperience: { enum: EXPERIENCE_LEVELS },
                  beginnerSuitability: { enum: BEGINNER_SUITABILITY },
                }),
              },
              safety: {
                ...closedObjectSchema(
                  [
                    "reviewStatus",
                    "demandTags",
                    "excludedByRestrictionTags",
                    "requiresClearanceTags",
                    "impactLevel",
                    "balanceDemand",
                    "systemicFatigue",
                  ],
                  {
                    reviewStatus: { enum: SAFETY_REVIEW_STATUSES },
                    demandTags: enumArraySchema(DEMAND_TAGS),
                    excludedByRestrictionTags: enumArraySchema(RESTRICTION_CODES),
                    requiresClearanceTags: enumArraySchema(RESTRICTION_CODES),
                    impactLevel: { enum: IMPACT_LEVELS },
                    balanceDemand: integerTierSchema,
                    systemicFatigue: integerTierSchema,
                  },
                ),
              },
              cost: {
                ...closedObjectSchema(
                  ["setupSeconds", "estimatedActiveSecondsPerSet", "transitionSeconds"],
                  {
                    setupSeconds: { type: "integer", minimum: 0 },
                    estimatedActiveSecondsPerSet: { type: "integer", minimum: 1 },
                    transitionSeconds: { type: "integer", minimum: 0 },
                  },
                ),
              },
              prescriptionSupport: {
                ...closedObjectSchema(
                  ["prescriptionClassIds", "supportedProgressionModes", "startingLoadPolicy"],
                  {
                    prescriptionClassIds: {
                      type: "array",
                      minItems: 1,
                      uniqueItems: true,
                      items: { enum: PRESCRIPTION_CLASS_IDS },
                    },
                    supportedProgressionModes: enumArraySchema(PROGRESSION_MODES, 1),
                    startingLoadPolicy: { const: "unset" },
                  },
                ),
              },
              selection: {
                ...closedObjectSchema(
                  ["goalTiers", "styleTags", "timeEfficiencyTier", "curatedRank"],
                  {
                    goalTiers: {
                      ...closedObjectSchema(GOAL_CODES, Object.fromEntries(
                        GOAL_CODES.map((goal) => [goal, integerTierSchema]),
                      )),
                    },
                    styleTags: enumArraySchema(PLAN_STYLE_CODES, 1),
                    timeEfficiencyTier: integerTierSchema,
                    curatedRank: { type: "integer", minimum: 1 },
                  },
                ),
              },
              substitution: {
                ...closedObjectSchema(["equivalenceClassIds"], {
                  equivalenceClassIds: {
                    type: "array",
                    minItems: 1,
                    uniqueItems: true,
                    items: identifierSchema,
                  },
                }),
              },
            },
          ),
        },
      },
      substitutionRules: {
        type: "array",
        items: {
          ...closedObjectSchema(
            [
              "id",
              "equivalenceClassId",
              "sourceExerciseId",
              "candidateExerciseIds",
              "reasonCode",
            ],
            {
              id: identifierSchema,
              equivalenceClassId: identifierSchema,
              sourceExerciseId: identifierSchema,
              candidateExerciseIds: {
                type: "array",
                minItems: 1,
                uniqueItems: true,
                items: identifierSchema,
              },
              reasonCode: {
                enum: ["EQUIPMENT_ALTERNATIVE", "RESTRICTION_ALTERNATIVE"],
              },
            },
          ),
        },
      },
      catalogDigest: { type: "string", pattern: "^[a-f0-9]{64}$" },
    },
  ),
} as const;
