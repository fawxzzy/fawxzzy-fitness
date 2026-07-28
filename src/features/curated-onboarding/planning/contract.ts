import { digestPlanningGenerationProjection } from "./projection.ts";

export const NORMALIZED_PLANNING_INTAKE_VERSION = "fitness.planning-intake.v1" as const;
export const CURATED_INTAKE_CONTRACT_VERSION = "fawxzzy-fitness.curated-onboarding.v3" as const;
export const CURATED_NORMALIZER_VERSION = "curated-planning-normalizer.v1" as const;

export const WEEKDAY_VALUES = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
export type Weekday = typeof WEEKDAY_VALUES[number];
export type JsonPointer = `/${string}`;
export type GoalCode = "build_muscle" | "get_leaner" | "get_stronger" | "general_fitness" | "athleticism" | string;
export type EquipmentId = string;

export const CANONICAL_CONSTRAINT_CLASS_PATHS = Object.freeze({
  hardConstraintPaths: Object.freeze([
    "/schedule/dayConstraint",
    "/schedule/weekdays",
    "/schedule/sessionMinutes/hardMaximum",
    "/environment/equipmentAvailable",
    "/environment/equipmentAvoided",
    "/safety/movementRestrictions",
    "/safety/excludedExerciseNames",
    "/safety/uncomfortableExerciseNames",
  ] as const),
  requiredCoveragePaths: Object.freeze([
    "/goals/primary",
    "/goals/secondary",
    "/goals/targetAreas",
    "/goals/movementSkills",
  ] as const),
  optimizationPaths: Object.freeze([
    "/trainingBackground",
    "/recovery",
    "/preferences",
  ] as const),
  contextOnlyPaths: Object.freeze([
    "/planContext",
    "/trainingBackground/knownPerformanceContext",
    "/safety/acknowledgments",
  ] as const),
} as const satisfies Record<
  | "hardConstraintPaths"
  | "requiredCoveragePaths"
  | "optimizationPaths"
  | "contextOnlyPaths",
  readonly JsonPointer[]
>);

export const RESTRICTION_CODES = [
  "NO_OVERHEAD_LOADING",
  "NO_HIGH_IMPACT",
  "NO_DEEP_KNEE_FLEXION",
  "NO_LOADED_SPINAL_FLEXION",
  "NO_UNSUPPORTED_HINGE",
  "NO_SINGLE_LEG_BALANCE",
  "NO_PRONE_POSITION",
  "NO_WEIGHT_BEARING_WRIST_EXTENSION",
  "NO_AXIAL_LOADING",
] as const;
export type RestrictionCode = typeof RESTRICTION_CODES[number];

export const NORMALIZATION_ISSUE_CODES = [
  "MISSING_REQUIRED_VALUE",
  "INVALID_RESPONSE_TYPE",
  "INVALID_OPTION",
  "UNRESOLVED_OTHER_VALUE",
  "AMBIGUOUS_SAFETY_RESPONSE",
  "CONTRADICTORY_SAFETY_RESPONSE",
  "SAFETY_CLEARANCE_REQUIRED",
  "MISSING_CONDITIONAL_DETAIL",
  "DAY_COUNT_MISMATCH",
  "UNSUPPORTED_DAY_SELECTION",
  "INVALID_SESSION_DURATION",
  "RECENT_CONTINUITY_UNKNOWN",
] as const;
export type NormalizationIssueCode = typeof NORMALIZATION_ISSUE_CODES[number];

export const CURATED_RESPONSE_PATH_BY_QUESTION_ID = Object.freeze({
  email: "/planContext/email",
  name: "/planContext/name",
  contactMethod: "/planContext/contactMethod",
  socialUsername: "/planContext/socialUsername",
  under18: "/safety/under18",
  guardianPermission: "/safety/guardianPermission",
  mainGoals: "/goals/mainGoals",
  primaryGoal: "/goals/primaryGoal",
  topThreeGoals: "/goals/topThreeGoals",
  areasToImprove: "/goals/areasToImprove",
  biggestStruggles: "/planContext/biggestStruggles",
  height: "/planContext/height",
  currentWeight: "/planContext/currentWeight",
  weightDirection: "/goals/weightDirection",
  trainingExperience: "/trainingBackground/trainingExperience",
  currentRoutine: "/trainingBackground/currentRoutine",
  currentSplit: "/trainingBackground/currentSplit",
  tracksWorkouts: "/trainingBackground/tracksWorkouts",
  trackingTool: "/planContext/trackingTool",
  mainLiftNumbers: "/trainingBackground/mainLiftNumbers",
  trainingDaysPerWeek: "/schedule/trainingDaysPerWeek",
  workoutLength: "/schedule/workoutLength",
  preferredTrainingDays: "/schedule/preferredTrainingDays",
  trainingTime: "/schedule/trainingTime",
  outsideActivity: "/recovery/outsideActivity",
  sleepHours: "/recovery/sleepHours",
  trainingLocations: "/environment/trainingLocations",
  availableEquipment: "/environment/availableEquipment",
  heaviestDumbbells: "/environment/heaviestDumbbells",
  equipmentAvoid: "/environment/equipmentAvoid",
  hasPainOrLimitations: "/safety/hasPainOrLimitations",
  painDetails: "/safety/painDetails",
  exercisesCannotDo: "/safety/exercisesCannotDo",
  uncomfortableExercises: "/safety/uncomfortableExercises",
  professionalRestrictions: "/safety/professionalRestrictions",
  restrictedMovements: "/safety/restrictedMovements",
  warningSymptoms: "/safety/warningSymptoms",
  medicalConditions: "/safety/medicalConditions",
  medications: "/safety/medications",
  medicationConsiderations: "/safety/medicationConsiderations",
  safetyAcknowledgment: "/safety/safetyAcknowledgment",
  exerciseEnjoy: "/preferences/exerciseEnjoy",
  exerciseHate: "/preferences/exerciseHate",
  movementsToImprove: "/goals/movementsToImprove",
  planStyle: "/preferences/planStyle",
  equipmentPreference: "/preferences/equipmentPreference",
  tracksFood: "/planContext/tracksFood",
  tracksProtein: "/planContext/tracksProtein",
  eatingPattern: "/planContext/eatingPattern",
  foodRestrictions: "/planContext/foodRestrictions",
  nutritionDirection: "/planContext/nutritionDirection",
  nutritionHelp: "/planContext/nutritionHelp",
  planContents: "/planContext/planContents",
  planDetail: "/planContext/planDetail",
  deliveryMethod: "/planContext/deliveryMethod",
  followUpConsent: "/planContext/followUpConsent",
  testimonialConsent: "/planContext/testimonialConsent",
  anythingElse: "/planContext/anythingElse",
  accuracyAcknowledgment: "/planContext/accuracyAcknowledgment",
  fitnessGuidanceAcknowledgment: "/safety/fitnessGuidanceAcknowledgment",
} as const satisfies Record<string, JsonPointer>);

const CURATED_RESPONSE_PATHS = Object.freeze(
  Object.values(CURATED_RESPONSE_PATH_BY_QUESTION_ID),
) as readonly JsonPointer[];

const NORMALIZATION_ISSUE_POLICY: Record<
  NormalizationIssueCode,
  {
    severity: NormalizationIssue["severity"];
    allowedPaths?: readonly JsonPointer[];
    exactPath?: JsonPointer;
    pathPrefix?: JsonPointer;
  }
> = {
  MISSING_REQUIRED_VALUE: {
    severity: "blocking",
    allowedPaths: CURATED_RESPONSE_PATHS,
  },
  INVALID_RESPONSE_TYPE: {
    severity: "blocking",
    allowedPaths: CURATED_RESPONSE_PATHS,
  },
  INVALID_OPTION: {
    severity: "blocking",
    allowedPaths: CURATED_RESPONSE_PATHS,
  },
  UNRESOLVED_OTHER_VALUE: {
    severity: "blocking",
    allowedPaths: CURATED_RESPONSE_PATHS,
  },
  AMBIGUOUS_SAFETY_RESPONSE: { severity: "blocking", pathPrefix: "/safety/" },
  CONTRADICTORY_SAFETY_RESPONSE: { severity: "blocking", pathPrefix: "/safety/" },
  SAFETY_CLEARANCE_REQUIRED: { severity: "blocking", pathPrefix: "/safety/" },
  MISSING_CONDITIONAL_DETAIL: { severity: "blocking", pathPrefix: "/safety/" },
  DAY_COUNT_MISMATCH: { severity: "blocking", exactPath: "/schedule/weekdays" },
  UNSUPPORTED_DAY_SELECTION: { severity: "blocking", exactPath: "/schedule/weekdays" },
  INVALID_SESSION_DURATION: {
    severity: "blocking",
    exactPath: "/schedule/sessionMinutes",
  },
  RECENT_CONTINUITY_UNKNOWN: {
    severity: "informational",
    exactPath: "/trainingBackground/recentContinuity",
  },
};

export type NormalizationIssue = {
  code: NormalizationIssueCode;
  severity: "informational" | "warning" | "blocking";
  fieldPath: JsonPointer;
  sourceQuestionIds: string[];
  messageArguments: Record<string, string | number>;
};

export type PlanningSemanticIssue = Omit<NormalizationIssue, "sourceQuestionIds">;

export type ProvenanceEntry = {
  questionId: string;
  responseDigest: string;
  normalizationRule: string;
};

export type RankedValue<T extends string = string> = {
  value: T;
  rank: number;
  ranking: "explicit" | "canonical_unranked";
};

export type NormalizedPlanningIntakeV1 = {
  contractVersion: typeof NORMALIZED_PLANNING_INTAKE_VERSION;
  source: {
    intakeContractVersion: typeof CURATED_INTAKE_CONTRACT_VERSION;
    normalizerVersion: typeof CURATED_NORMALIZER_VERSION;
    rawResponseDigest: string;
  };
  schedule: {
    requestedDaysPerWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7 | null;
    weekdays: Weekday[];
    dayConstraint: "fixed" | "count_only" | "unknown";
    flexibility: "none" | "any_available_day" | "unknown";
    sessionMinutes: {
      target: number | null;
      hardMaximum: number | null;
    };
    preferredTrainingTime: "morning" | "afternoon" | "evening" | "night" | "variable" | null;
  };
  goals: {
    primary: GoalCode | null;
    secondary: RankedValue<GoalCode>[];
    targetAreas: RankedValue[];
    movementSkills: RankedValue[];
    bodyCompositionDirection: "gain" | "lose" | "maintain" | "unspecified";
  };
  trainingBackground: {
    experience: "beginner" | "intermediate" | "advanced" | null;
    recentContinuity: "consistent" | "returning" | "detrained" | "unknown";
    currentProgram: {
      summary: string | null;
      splitSummary: string | null;
    };
    trackingExperience: "none" | "informal" | "structured" | "unknown";
    progressionReadiness: "uncalibrated" | "session_history_available" | "returning_requires_recalibration";
    knownPerformanceContext: string | null;
  };
  environment: {
    locations: string[];
    equipmentAvailable: EquipmentId[];
    equipmentAvoided: EquipmentId[];
    equipmentLimits: {
      maximumDumbbellLoadKg: number | null;
      sourceText: string | null;
    };
  };
  recovery: {
    outsideActivityLoad: "none" | "low" | "moderate" | "high" | "unknown";
    outsideActivityMinutesPerWeek: number | null;
    sleepBand: "under_6" | "6_to_7" | "7_to_9" | "over_9" | "unknown";
    planningModifier: "conservative" | "standard";
    modifierReasons: string[];
  };
  safety: {
    status: "clear" | "restricted" | "ambiguous" | "blocked";
    movementRestrictions: {
      code: RestrictionCode;
      sourceText: string;
    }[];
    excludedExerciseNames: string[];
    uncomfortableExerciseNames: string[];
    warningFlags: string[];
    unresolvedItems: NormalizationIssue[];
    professionalDirection: {
      present: boolean;
      restrictionCodes: RestrictionCode[];
      userReportedClearanceStatus: "cleared_with_restrictions" | "not_cleared" | "unknown";
    };
    acknowledgments: {
      generalGuidance: boolean;
      fitnessGuidance: boolean;
    };
  };
  preferences: {
    requiredExerciseNames: string[];
    preferredExerciseNames: string[];
    improvementMovementIds: string[];
    dislikedExerciseNames: string[];
    planStyle: "straight_sets" | "supersets" | "circuits" | "mixed" | "no_preference";
    equipmentPreference: string | null;
    cardio: {
      priority: "none" | "supporting" | "primary";
      preferredModalities: string[];
      avoidedModalities: string[];
      requestedSessionsPerWeek: number | null;
    };
  };
  planContext: {
    biggestTrainingStruggles: string[];
    nutrition: {
      trackingStyle: string | null;
      proteinTrackingStyle: string | null;
      eatingPattern: string | null;
      direction: string | null;
      foodRestrictions: string[];
      requestedSupport: string[];
    };
    delivery: {
      detailLevel: "concise" | "standard" | "detailed" | null;
      requestedContents: string[];
      method: string | null;
      followUpStyle: string | null;
    };
  };
  constraintClasses: {
    blockingIssueCodes: NormalizationIssueCode[];
    hardConstraintPaths: JsonPointer[];
    requiredCoveragePaths: JsonPointer[];
    optimizationPaths: JsonPointer[];
    contextOnlyPaths: JsonPointer[];
  };
  provenance: Record<JsonPointer, ProvenanceEntry[]>;
  normalizationIssues: NormalizationIssue[];
  generationProjectionDigest: string;
};

export type PlanningGenerationProjectionV1 = {
  contractVersion: typeof NORMALIZED_PLANNING_INTAKE_VERSION;
  normalizerVersion: typeof CURATED_NORMALIZER_VERSION;
  blockingIssues: PlanningSemanticIssue[];
  schedule: Omit<NormalizedPlanningIntakeV1["schedule"], "preferredTrainingTime">;
  goals: NormalizedPlanningIntakeV1["goals"];
  trainingBackground: Omit<
    NormalizedPlanningIntakeV1["trainingBackground"],
    "knownPerformanceContext"
  >;
  environment: NormalizedPlanningIntakeV1["environment"];
  recovery: NormalizedPlanningIntakeV1["recovery"];
  safety: Omit<
    NormalizedPlanningIntakeV1["safety"],
    "acknowledgments" | "unresolvedItems"
  > & {
    unresolvedItems: PlanningSemanticIssue[];
  };
  preferences: NormalizedPlanningIntakeV1["preferences"];
};

const ROOT_KEYS = [
  "contractVersion",
  "source",
  "schedule",
  "goals",
  "trainingBackground",
  "environment",
  "recovery",
  "safety",
  "preferences",
  "planContext",
  "constraintClasses",
  "provenance",
  "normalizationIssues",
  "generationProjectionDigest",
] as const;
const SOURCE_KEYS = ["intakeContractVersion", "normalizerVersion", "rawResponseDigest"] as const;
const SCHEDULE_KEYS = [
  "requestedDaysPerWeek",
  "weekdays",
  "dayConstraint",
  "flexibility",
  "sessionMinutes",
  "preferredTrainingTime",
] as const;
const GOAL_KEYS = [
  "primary",
  "secondary",
  "targetAreas",
  "movementSkills",
  "bodyCompositionDirection",
] as const;
const BACKGROUND_KEYS = [
  "experience",
  "recentContinuity",
  "currentProgram",
  "trackingExperience",
  "progressionReadiness",
  "knownPerformanceContext",
] as const;
const ENVIRONMENT_KEYS = [
  "locations",
  "equipmentAvailable",
  "equipmentAvoided",
  "equipmentLimits",
] as const;
const RECOVERY_KEYS = [
  "outsideActivityLoad",
  "outsideActivityMinutesPerWeek",
  "sleepBand",
  "planningModifier",
  "modifierReasons",
] as const;
const SAFETY_KEYS = [
  "status",
  "movementRestrictions",
  "excludedExerciseNames",
  "uncomfortableExerciseNames",
  "warningFlags",
  "unresolvedItems",
  "professionalDirection",
  "acknowledgments",
] as const;
const PREFERENCE_KEYS = [
  "requiredExerciseNames",
  "preferredExerciseNames",
  "improvementMovementIds",
  "dislikedExerciseNames",
  "planStyle",
  "equipmentPreference",
  "cardio",
] as const;
const CONTEXT_KEYS = ["biggestTrainingStruggles", "nutrition", "delivery"] as const;
const CONSTRAINT_KEYS = [
  "blockingIssueCodes",
  "hardConstraintPaths",
  "requiredCoveragePaths",
  "optimizationPaths",
  "contextOnlyPaths",
] as const;

function closedObjectSchema<const T extends readonly string[]>(
  required: T,
  properties: Record<T[number], object>,
) {
  return {
    type: "object",
    additionalProperties: false,
    required,
    properties,
  } as const;
}

const RANKED_VALUE_SCHEMA = closedObjectSchema(
  ["value", "rank", "ranking"] as const,
  {
    value: { type: "string", minLength: 1 },
    rank: { type: "integer", minimum: 1 },
    ranking: { enum: ["explicit", "canonical_unranked"] },
  },
);
const NORMALIZATION_ISSUE_SHAPE_SCHEMA = closedObjectSchema(
  [
    "code",
    "severity",
    "fieldPath",
    "sourceQuestionIds",
    "messageArguments",
  ] as const,
  {
    code: { enum: NORMALIZATION_ISSUE_CODES },
    severity: { enum: ["informational", "warning", "blocking"] },
    fieldPath: { type: "string", pattern: "^/" },
    sourceQuestionIds: {
      type: "array",
      items: { type: "string", minLength: 1 },
      minItems: 1,
      uniqueItems: true,
    },
    messageArguments: {
      type: "object",
      additionalProperties: { type: ["string", "number"] },
    },
  },
);
const NORMALIZATION_ISSUE_SCHEMA = {
  ...NORMALIZATION_ISSUE_SHAPE_SCHEMA,
  allOf: NORMALIZATION_ISSUE_CODES.map((code) => {
    const policy = NORMALIZATION_ISSUE_POLICY[code];
    return {
      if: {
        properties: { code: { const: code } },
        required: ["code"],
      },
      then: {
        properties: {
          severity: { const: policy.severity },
          ...(policy.allowedPaths
            ? { fieldPath: { enum: policy.allowedPaths } }
            : policy.exactPath
              ? { fieldPath: { const: policy.exactPath } }
              : policy.pathPrefix
                ? { fieldPath: { pattern: `^${policy.pathPrefix}` } }
                : {}),
        },
      },
    };
  }),
} as const;
const PROVENANCE_ENTRY_SCHEMA = closedObjectSchema(
  ["questionId", "responseDigest", "normalizationRule"] as const,
  {
    questionId: { type: "string", minLength: 1 },
    responseDigest: { type: "string", pattern: "^[a-f0-9]{64}$" },
    normalizationRule: { type: "string", minLength: 1 },
  },
);
const SESSION_MINUTES_SHAPE_SCHEMA = closedObjectSchema(
  ["target", "hardMaximum"] as const,
  {
    target: { type: ["number", "null"], minimum: 10 },
    hardMaximum: { type: ["number", "null"], minimum: 10 },
  },
);
const SESSION_MINUTES_SCHEMA = {
  ...SESSION_MINUTES_SHAPE_SCHEMA,
  allOf: [
    {
      if: { properties: { target: { type: "number" } }, required: ["target"] },
      then: { properties: { hardMaximum: { type: "number" } } },
    },
    {
      if: { properties: { target: { type: "null" } }, required: ["target"] },
      then: { properties: { hardMaximum: { type: "null" } } },
    },
  ],
} as const;
const CURRENT_PROGRAM_SCHEMA = closedObjectSchema(
  ["summary", "splitSummary"] as const,
  {
    summary: { type: ["string", "null"] },
    splitSummary: { type: ["string", "null"] },
  },
);
const EQUIPMENT_LIMITS_SCHEMA = closedObjectSchema(
  ["maximumDumbbellLoadKg", "sourceText"] as const,
  {
    maximumDumbbellLoadKg: { type: ["number", "null"], exclusiveMinimum: 0 },
    sourceText: { type: ["string", "null"] },
  },
);
const MOVEMENT_RESTRICTION_SCHEMA = closedObjectSchema(
  ["code", "sourceText"] as const,
  {
    code: { enum: RESTRICTION_CODES },
    sourceText: { type: "string", minLength: 1 },
  },
);
const PROFESSIONAL_DIRECTION_SCHEMA = closedObjectSchema(
  ["present", "restrictionCodes", "userReportedClearanceStatus"] as const,
  {
    present: { type: "boolean" },
    restrictionCodes: {
      type: "array",
      items: { enum: RESTRICTION_CODES },
      uniqueItems: true,
    },
    userReportedClearanceStatus: {
      enum: ["cleared_with_restrictions", "not_cleared", "unknown"],
    },
  },
);
const ACKNOWLEDGMENTS_SCHEMA = closedObjectSchema(
  ["generalGuidance", "fitnessGuidance"] as const,
  {
    generalGuidance: { type: "boolean" },
    fitnessGuidance: { type: "boolean" },
  },
);
const CARDIO_SCHEMA = closedObjectSchema(
  [
    "priority",
    "preferredModalities",
    "avoidedModalities",
    "requestedSessionsPerWeek",
  ] as const,
  {
    priority: { enum: ["none", "supporting", "primary"] },
    preferredModalities: {
      type: "array",
      items: { type: "string", minLength: 1 },
      uniqueItems: true,
    },
    avoidedModalities: {
      type: "array",
      items: { type: "string", minLength: 1 },
      uniqueItems: true,
    },
    requestedSessionsPerWeek: {
      type: ["integer", "null"],
      minimum: 0,
      maximum: 7,
    },
  },
);
const NUTRITION_CONTEXT_SCHEMA = closedObjectSchema(
  [
    "trackingStyle",
    "proteinTrackingStyle",
    "eatingPattern",
    "direction",
    "foodRestrictions",
    "requestedSupport",
  ] as const,
  {
    trackingStyle: { type: ["string", "null"] },
    proteinTrackingStyle: { type: ["string", "null"] },
    eatingPattern: { type: ["string", "null"] },
    direction: { type: ["string", "null"] },
    foodRestrictions: {
      type: "array",
      items: { type: "string", minLength: 1 },
      uniqueItems: true,
    },
    requestedSupport: {
      type: "array",
      items: { type: "string", minLength: 1 },
      uniqueItems: true,
    },
  },
);
const DELIVERY_CONTEXT_SCHEMA = closedObjectSchema(
  ["detailLevel", "requestedContents", "method", "followUpStyle"] as const,
  {
    detailLevel: { enum: ["concise", "standard", "detailed", null] },
    requestedContents: {
      type: "array",
      items: { type: "string", minLength: 1 },
      uniqueItems: true,
    },
    method: { type: ["string", "null"] },
    followUpStyle: { type: ["string", "null"] },
  },
);
const SCHEDULE_SCHEMA = {
  ...closedObjectSchema(SCHEDULE_KEYS, {
    requestedDaysPerWeek: { type: ["integer", "null"], minimum: 1, maximum: 7 },
    weekdays: {
      type: "array",
      items: { enum: WEEKDAY_VALUES },
      uniqueItems: true,
    },
    dayConstraint: { enum: ["fixed", "count_only", "unknown"] },
    flexibility: { enum: ["none", "any_available_day", "unknown"] },
    sessionMinutes: SESSION_MINUTES_SCHEMA,
    preferredTrainingTime: {
      enum: ["morning", "afternoon", "evening", "night", "variable", null],
    },
  }),
  allOf: [
    {
      if: {
        properties: { dayConstraint: { const: "fixed" } },
        required: ["dayConstraint"],
      },
      then: {
        properties: {
          requestedDaysPerWeek: { type: "integer" },
          weekdays: { minItems: 1 },
          flexibility: { const: "none" },
        },
      },
    },
    {
      if: {
        properties: { dayConstraint: { const: "count_only" } },
        required: ["dayConstraint"],
      },
      then: {
        properties: {
          requestedDaysPerWeek: { type: "integer" },
          weekdays: { maxItems: 0 },
          flexibility: { const: "any_available_day" },
        },
      },
    },
    {
      if: {
        properties: { dayConstraint: { const: "unknown" } },
        required: ["dayConstraint"],
      },
      then: {
        properties: {
          requestedDaysPerWeek: { type: "null" },
          weekdays: { maxItems: 0 },
          flexibility: { const: "unknown" },
        },
      },
    },
  ],
} as const;

export const NORMALIZED_PLANNING_INTAKE_V1_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://fawxzzy.fitness/schemas/planning-intake-v1.json",
  title: "NormalizedPlanningIntakeV1",
  type: "object",
  additionalProperties: false,
  required: ROOT_KEYS,
  properties: {
    contractVersion: { const: NORMALIZED_PLANNING_INTAKE_VERSION },
    source: closedObjectSchema(SOURCE_KEYS, {
      intakeContractVersion: { const: CURATED_INTAKE_CONTRACT_VERSION },
      normalizerVersion: { const: CURATED_NORMALIZER_VERSION },
      rawResponseDigest: { type: "string", pattern: "^[a-f0-9]{64}$" },
    }),
    schedule: SCHEDULE_SCHEMA,
    goals: closedObjectSchema(GOAL_KEYS, {
      primary: { type: ["string", "null"] },
      secondary: { type: "array", items: RANKED_VALUE_SCHEMA },
      targetAreas: { type: "array", items: RANKED_VALUE_SCHEMA },
      movementSkills: { type: "array", items: RANKED_VALUE_SCHEMA },
      bodyCompositionDirection: { enum: ["gain", "lose", "maintain", "unspecified"] },
    }),
    trainingBackground: closedObjectSchema(BACKGROUND_KEYS, {
      experience: { enum: ["beginner", "intermediate", "advanced", null] },
      recentContinuity: { enum: ["consistent", "returning", "detrained", "unknown"] },
      currentProgram: CURRENT_PROGRAM_SCHEMA,
      trackingExperience: { enum: ["none", "informal", "structured", "unknown"] },
      progressionReadiness: {
        enum: [
          "uncalibrated",
          "session_history_available",
          "returning_requires_recalibration",
        ],
      },
      knownPerformanceContext: { type: ["string", "null"] },
    }),
    environment: closedObjectSchema(ENVIRONMENT_KEYS, {
      locations: {
        type: "array",
        items: { type: "string", minLength: 1 },
        uniqueItems: true,
      },
      equipmentAvailable: {
        type: "array",
        items: { type: "string", minLength: 1 },
        uniqueItems: true,
      },
      equipmentAvoided: {
        type: "array",
        items: { type: "string", minLength: 1 },
        uniqueItems: true,
      },
      equipmentLimits: EQUIPMENT_LIMITS_SCHEMA,
    }),
    recovery: closedObjectSchema(RECOVERY_KEYS, {
      outsideActivityLoad: { enum: ["none", "low", "moderate", "high", "unknown"] },
      outsideActivityMinutesPerWeek: { type: ["number", "null"] },
      sleepBand: { enum: ["under_6", "6_to_7", "7_to_9", "over_9", "unknown"] },
      planningModifier: { enum: ["conservative", "standard"] },
      modifierReasons: {
        type: "array",
        items: { type: "string", minLength: 1 },
        uniqueItems: true,
      },
    }),
    safety: closedObjectSchema(SAFETY_KEYS, {
      status: { enum: ["clear", "restricted", "ambiguous", "blocked"] },
      movementRestrictions: {
        type: "array",
        items: MOVEMENT_RESTRICTION_SCHEMA,
        uniqueItems: true,
      },
      excludedExerciseNames: {
        type: "array",
        items: { type: "string", minLength: 1 },
        uniqueItems: true,
      },
      uncomfortableExerciseNames: {
        type: "array",
        items: { type: "string", minLength: 1 },
        uniqueItems: true,
      },
      warningFlags: {
        type: "array",
        items: { type: "string", minLength: 1 },
        uniqueItems: true,
      },
      unresolvedItems: { type: "array", items: NORMALIZATION_ISSUE_SCHEMA },
      professionalDirection: PROFESSIONAL_DIRECTION_SCHEMA,
      acknowledgments: ACKNOWLEDGMENTS_SCHEMA,
    }),
    preferences: closedObjectSchema(PREFERENCE_KEYS, {
      requiredExerciseNames: {
        type: "array",
        items: { type: "string", minLength: 1 },
        uniqueItems: true,
      },
      preferredExerciseNames: {
        type: "array",
        items: { type: "string", minLength: 1 },
        uniqueItems: true,
      },
      improvementMovementIds: {
        type: "array",
        items: { type: "string", minLength: 1 },
        uniqueItems: true,
      },
      dislikedExerciseNames: {
        type: "array",
        items: { type: "string", minLength: 1 },
        uniqueItems: true,
      },
      planStyle: {
        enum: ["straight_sets", "supersets", "circuits", "mixed", "no_preference"],
      },
      equipmentPreference: { type: ["string", "null"] },
      cardio: CARDIO_SCHEMA,
    }),
    planContext: closedObjectSchema(CONTEXT_KEYS, {
      biggestTrainingStruggles: {
        type: "array",
        items: { type: "string", minLength: 1 },
        uniqueItems: true,
      },
      nutrition: NUTRITION_CONTEXT_SCHEMA,
      delivery: DELIVERY_CONTEXT_SCHEMA,
    }),
    constraintClasses: closedObjectSchema(CONSTRAINT_KEYS, {
      blockingIssueCodes: {
        type: "array",
        items: { enum: NORMALIZATION_ISSUE_CODES },
        uniqueItems: true,
      },
      hardConstraintPaths: {
        const: CANONICAL_CONSTRAINT_CLASS_PATHS.hardConstraintPaths,
      },
      requiredCoveragePaths: {
        const: CANONICAL_CONSTRAINT_CLASS_PATHS.requiredCoveragePaths,
      },
      optimizationPaths: {
        const: CANONICAL_CONSTRAINT_CLASS_PATHS.optimizationPaths,
      },
      contextOnlyPaths: {
        const: CANONICAL_CONSTRAINT_CLASS_PATHS.contextOnlyPaths,
      },
    }),
    provenance: {
      type: "object",
      propertyNames: { pattern: "^/" },
      additionalProperties: {
        type: "array",
        items: PROVENANCE_ENTRY_SCHEMA,
        minItems: 1,
      },
    },
    normalizationIssues: {
      type: "array",
      items: NORMALIZATION_ISSUE_SCHEMA,
    },
    generationProjectionDigest: { type: "string", pattern: "^[a-f0-9]{64}$" },
  },
} as const;

const WEEKDAYS = new Set<Weekday>(WEEKDAY_VALUES);

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function readClosedObject(
  value: unknown,
  path: string,
  keys: readonly string[],
  errors: string[],
) {
  const record = asRecord(value);
  if (!record) {
    errors.push(`${path} must be an object.`);
    return null;
  }
  const allowed = new Set(keys);
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) errors.push(`${path} contains unknown property ${key}.`);
  }
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) {
      errors.push(`${path} is missing required property ${key}.`);
    }
  }
  return record;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value)
    && value.every((entry) => typeof entry === "string" && entry.length > 0);
}

function validateStringArray(
  value: unknown,
  path: string,
  errors: string[],
  options: {
    allowed?: ReadonlySet<string>;
    jsonPointers?: boolean;
    nonEmpty?: boolean;
    sorted?: boolean;
    unique?: boolean;
  } = {},
) {
  if (!isStringArray(value)) {
    errors.push(`${path} must be a non-empty-string array.`);
    return;
  }
  if (options.unique && new Set(value).size !== value.length) {
    errors.push(`${path} must contain unique values.`);
  }
  if (options.nonEmpty && value.length === 0) {
    errors.push(`${path} must contain at least one value.`);
  }
  if (options.sorted && value.some((entry, index) => index > 0 && value[index - 1].localeCompare(entry) > 0)) {
    errors.push(`${path} must use canonical lexical ordering.`);
  }
  if (options.jsonPointers && value.some((entry) => !entry.startsWith("/"))) {
    errors.push(`${path} must contain JSON pointer paths.`);
  }
  if (options.allowed && value.some((entry) => !options.allowed?.has(entry))) {
    errors.push(`${path} contains an unsupported value.`);
  }
}

function validateNullableString(value: unknown, path: string, errors: string[]) {
  if (value !== null && typeof value !== "string") {
    errors.push(`${path} must be null or a string.`);
  }
}

function validateRankedValues(value: unknown, path: string, errors: string[]) {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array.`);
    return;
  }
  const seenValues = new Set<string>();
  value.forEach((entry, index) => {
    const ranked = readClosedObject(entry, `${path}[${index}]`, ["value", "rank", "ranking"], errors);
    if (!ranked) return;
    if (typeof ranked.value !== "string" || !ranked.value) {
      errors.push(`${path}[${index}].value must be a non-empty string.`);
    } else if (seenValues.has(ranked.value)) {
      errors.push(`${path} must not repeat ranked values.`);
    } else {
      seenValues.add(ranked.value);
    }
    if (ranked.rank !== index + 1) {
      errors.push(`${path}[${index}].rank must equal ${index + 1}.`);
    }
    if (!["explicit", "canonical_unranked"].includes(String(ranked.ranking))) {
      errors.push(`${path}[${index}].ranking is invalid.`);
    }
  });
}

function validateIssue(value: unknown, path: string, errors: string[]) {
  const issue = readClosedObject(
    value,
    path,
    ["code", "severity", "fieldPath", "sourceQuestionIds", "messageArguments"],
    errors,
  );
  if (!issue) return null;
  if (!NORMALIZATION_ISSUE_CODES.includes(issue.code as NormalizationIssueCode)) {
    errors.push(`${path}.code is unsupported.`);
  }
  if (!["informational", "warning", "blocking"].includes(String(issue.severity))) {
    errors.push(`${path}.severity is invalid.`);
  }
  if (typeof issue.fieldPath !== "string" || !issue.fieldPath.startsWith("/")) {
    errors.push(`${path}.fieldPath must be a JSON pointer.`);
  }
  if (NORMALIZATION_ISSUE_CODES.includes(issue.code as NormalizationIssueCode)) {
    const policy = NORMALIZATION_ISSUE_POLICY[issue.code as NormalizationIssueCode];
    if (issue.severity !== policy.severity) {
      errors.push(`${path}.severity must be ${policy.severity} for ${issue.code}.`);
    }
    if (policy.exactPath && issue.fieldPath !== policy.exactPath) {
      errors.push(`${path}.fieldPath must be ${policy.exactPath} for ${issue.code}.`);
    }
    if (
      policy.allowedPaths
      && (
        typeof issue.fieldPath !== "string"
        || !policy.allowedPaths.includes(issue.fieldPath as JsonPointer)
      )
    ) {
      errors.push(
        `${path}.fieldPath must be one of the governed response paths for ${issue.code}.`,
      );
    }
    if (
      policy.pathPrefix
      && (
        typeof issue.fieldPath !== "string"
        || !issue.fieldPath.startsWith(policy.pathPrefix)
      )
    ) {
      errors.push(`${path}.fieldPath must start with ${policy.pathPrefix} for ${issue.code}.`);
    }
  }
  validateStringArray(issue.sourceQuestionIds, `${path}.sourceQuestionIds`, errors, {
    nonEmpty: true,
    sorted: true,
    unique: true,
  });
  const messageArguments = asRecord(issue.messageArguments);
  if (!messageArguments) {
    errors.push(`${path}.messageArguments must be an object.`);
  } else if (Object.values(messageArguments).some(
    (argument) => !(
      typeof argument === "string"
      || (typeof argument === "number" && Number.isFinite(argument))
    ),
  )) {
    errors.push(`${path}.messageArguments values must be finite numbers or strings.`);
  }
  return issue;
}

function validateIssueArray(value: unknown, path: string, errors: string[]) {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array.`);
    return [];
  }
  return value.map((issue, index) => validateIssue(issue, `${path}[${index}]`, errors));
}

function semanticIssueKey(issue: Record<string, unknown>) {
  const messageArguments = asRecord(issue.messageArguments) ?? {};
  return JSON.stringify([
    issue.code,
    issue.severity,
    issue.fieldPath,
    issue.sourceQuestionIds,
    Object.entries(messageArguments).sort(([left], [right]) => left.localeCompare(right)),
  ]);
}

function validateProvenance(value: unknown, path: string, errors: string[]) {
  const provenance = asRecord(value);
  if (!provenance) {
    errors.push(`${path} must be an object.`);
    return;
  }
  for (const [fieldPath, entries] of Object.entries(provenance)) {
    if (!fieldPath.startsWith("/")) {
      errors.push(`${path} key ${fieldPath} must be a JSON pointer.`);
    }
    if (!Array.isArray(entries) || entries.length === 0) {
      errors.push(`${path}.${fieldPath} must be a non-empty array.`);
      continue;
    }
    entries.forEach((entry, index) => {
      const entryPath = `${path}[${JSON.stringify(fieldPath)}][${index}]`;
      const provenanceEntry = readClosedObject(
        entry,
        entryPath,
        ["questionId", "responseDigest", "normalizationRule"],
        errors,
      );
      if (!provenanceEntry) return;
      if (typeof provenanceEntry.questionId !== "string" || !provenanceEntry.questionId) {
        errors.push(`${entryPath}.questionId must be a non-empty string.`);
      }
      if (
        typeof provenanceEntry.responseDigest !== "string"
        || !/^[a-f0-9]{64}$/.test(provenanceEntry.responseDigest)
      ) {
        errors.push(`${entryPath}.responseDigest must be a SHA-256 hex digest.`);
      }
      if (
        typeof provenanceEntry.normalizationRule !== "string"
        || !provenanceEntry.normalizationRule
      ) {
        errors.push(`${entryPath}.normalizationRule must be a non-empty string.`);
      }
    });
  }
}

export function validateNormalizedPlanningIntakeV1(value: unknown) {
  const errors: string[] = [];
  const root = readClosedObject(value, "$", ROOT_KEYS, errors);
  if (!root) return errors;

  if (root.contractVersion !== NORMALIZED_PLANNING_INTAKE_VERSION) {
    errors.push("$.contractVersion is unsupported.");
  }

  const source = readClosedObject(root.source, "$.source", SOURCE_KEYS, errors);
  if (source?.intakeContractVersion !== CURATED_INTAKE_CONTRACT_VERSION) {
    errors.push("$.source.intakeContractVersion is unsupported.");
  }
  if (source?.normalizerVersion !== CURATED_NORMALIZER_VERSION) {
    errors.push("$.source.normalizerVersion is unsupported.");
  }
  if (typeof source?.rawResponseDigest !== "string" || !/^[a-f0-9]{64}$/.test(source.rawResponseDigest)) {
    errors.push("$.source.rawResponseDigest must be a SHA-256 hex digest.");
  }

  const schedule = readClosedObject(root.schedule, "$.schedule", SCHEDULE_KEYS, errors);
  const requestedDays = schedule?.requestedDaysPerWeek;
  if (
    requestedDays !== null
    && !(typeof requestedDays === "number" && Number.isInteger(requestedDays) && requestedDays >= 1 && requestedDays <= 7)
  ) {
    errors.push("$.schedule.requestedDaysPerWeek must be null or an integer from 1 to 7.");
  }
  const weekdays = schedule?.weekdays;
  if (
    !Array.isArray(weekdays)
    || weekdays.some((weekday) => typeof weekday !== "string" || !WEEKDAYS.has(weekday as Weekday))
    || new Set(weekdays).size !== weekdays.length
  ) {
    errors.push("$.schedule.weekdays must contain unique canonical weekdays.");
  } else {
    const weekdayOrder = [...WEEKDAYS];
    if (weekdays.some((weekday, index) => index > 0
      && weekdayOrder.indexOf(weekdays[index - 1] as Weekday) >= weekdayOrder.indexOf(weekday as Weekday))) {
      errors.push("$.schedule.weekdays must use Monday-to-Sunday ordering.");
    }
  }
  if (!["fixed", "count_only", "unknown"].includes(String(schedule?.dayConstraint))) {
    errors.push("$.schedule.dayConstraint is invalid.");
  }
  if (!["none", "any_available_day", "unknown"].includes(String(schedule?.flexibility))) {
    errors.push("$.schedule.flexibility is invalid.");
  }
  if (
    schedule?.preferredTrainingTime !== null
    && !["morning", "afternoon", "evening", "night", "variable"].includes(
      String(schedule?.preferredTrainingTime),
    )
  ) {
    errors.push("$.schedule.preferredTrainingTime is invalid.");
  }
  if (
    schedule?.dayConstraint === "fixed"
    && (
      typeof requestedDays !== "number"
      || !Array.isArray(weekdays)
      || weekdays.length !== requestedDays
    )
  ) {
    errors.push("$.schedule fixed weekday count must equal requestedDaysPerWeek.");
  }
  if (
    schedule?.dayConstraint === "fixed"
    && schedule?.flexibility !== "none"
  ) {
    errors.push("$.schedule fixed dayConstraint requires flexibility none.");
  }
  if (
    schedule?.dayConstraint === "count_only"
    && (
      !Array.isArray(weekdays)
      || weekdays.length !== 0
      || schedule?.flexibility !== "any_available_day"
      || typeof requestedDays !== "number"
    )
  ) {
    errors.push("$.schedule count_only requires a day count, no weekdays, and any-day flexibility.");
  }
  if (
    schedule?.dayConstraint === "unknown"
    && (
      !Array.isArray(weekdays)
      || weekdays.length !== 0
      || requestedDays !== null
      || schedule?.flexibility !== "unknown"
    )
  ) {
    errors.push("$.schedule unknown dayConstraint requires a null day count, no weekdays, and unknown flexibility.");
  }
  if (
    schedule?.flexibility === "none"
    && schedule?.dayConstraint !== "fixed"
  ) {
    errors.push("$.schedule flexibility none is valid only for fixed weekdays.");
  }
  if (
    schedule?.flexibility === "any_available_day"
    && schedule?.dayConstraint !== "count_only"
  ) {
    errors.push("$.schedule any-day flexibility is valid only for count_only.");
  }
  const sessionMinutes = readClosedObject(
    schedule?.sessionMinutes,
    "$.schedule.sessionMinutes",
    ["target", "hardMaximum"],
    errors,
  );
  for (const key of ["target", "hardMaximum"]) {
    const duration = sessionMinutes?.[key];
    if (duration !== null && !(typeof duration === "number" && Number.isFinite(duration) && duration >= 10)) {
      errors.push(`$.schedule.sessionMinutes.${key} must be null or at least 10 minutes.`);
    }
  }
  if (
    typeof sessionMinutes?.target === "number"
    && typeof sessionMinutes.hardMaximum === "number"
    && sessionMinutes.target > sessionMinutes.hardMaximum
  ) {
    errors.push("$.schedule.sessionMinutes.target must not exceed hardMaximum.");
  }
  if ((sessionMinutes?.target === null) !== (sessionMinutes?.hardMaximum === null)) {
    errors.push("$.schedule.sessionMinutes target and hardMaximum must be present or absent together.");
  }

  const goals = readClosedObject(root.goals, "$.goals", GOAL_KEYS, errors);
  if (goals?.primary !== null && (typeof goals?.primary !== "string" || !goals.primary)) {
    errors.push("$.goals.primary must be null or a non-empty string.");
  }
  for (const key of ["secondary", "targetAreas", "movementSkills"]) {
    validateRankedValues(goals?.[key], `$.goals.${key}`, errors);
  }
  if (!["gain", "lose", "maintain", "unspecified"].includes(String(goals?.bodyCompositionDirection))) {
    errors.push("$.goals.bodyCompositionDirection is invalid.");
  }

  const background = readClosedObject(
    root.trainingBackground,
    "$.trainingBackground",
    BACKGROUND_KEYS,
    errors,
  );
  if (
    background?.experience !== null
    && !["beginner", "intermediate", "advanced"].includes(String(background?.experience))
  ) {
    errors.push("$.trainingBackground.experience is invalid.");
  }
  if (!["consistent", "returning", "detrained", "unknown"].includes(String(background?.recentContinuity))) {
    errors.push("$.trainingBackground.recentContinuity is invalid.");
  }
  const currentProgram = readClosedObject(
    background?.currentProgram,
    "$.trainingBackground.currentProgram",
    ["summary", "splitSummary"],
    errors,
  );
  validateNullableString(currentProgram?.summary, "$.trainingBackground.currentProgram.summary", errors);
  validateNullableString(currentProgram?.splitSummary, "$.trainingBackground.currentProgram.splitSummary", errors);
  if (!["none", "informal", "structured", "unknown"].includes(String(background?.trackingExperience))) {
    errors.push("$.trainingBackground.trackingExperience is invalid.");
  }
  if (![
    "uncalibrated",
    "session_history_available",
    "returning_requires_recalibration",
  ].includes(String(background?.progressionReadiness))) {
    errors.push("$.trainingBackground.progressionReadiness is invalid.");
  }
  validateNullableString(
    background?.knownPerformanceContext,
    "$.trainingBackground.knownPerformanceContext",
    errors,
  );

  const environment = readClosedObject(
    root.environment,
    "$.environment",
    ENVIRONMENT_KEYS,
    errors,
  );
  for (const key of ["locations", "equipmentAvailable", "equipmentAvoided"]) {
    validateStringArray(environment?.[key], `$.environment.${key}`, errors, {
      sorted: true,
      unique: true,
    });
  }
  const equipmentLimits = readClosedObject(
    environment?.equipmentLimits,
    "$.environment.equipmentLimits",
    ["maximumDumbbellLoadKg", "sourceText"],
    errors,
  );
  if (
    equipmentLimits?.maximumDumbbellLoadKg !== null
    && !(
      typeof equipmentLimits?.maximumDumbbellLoadKg === "number"
      && Number.isFinite(equipmentLimits.maximumDumbbellLoadKg)
      && equipmentLimits.maximumDumbbellLoadKg > 0
    )
  ) {
    errors.push("$.environment.equipmentLimits.maximumDumbbellLoadKg must be null or positive.");
  }
  validateNullableString(
    equipmentLimits?.sourceText,
    "$.environment.equipmentLimits.sourceText",
    errors,
  );

  const recovery = readClosedObject(root.recovery, "$.recovery", RECOVERY_KEYS, errors);
  if (!["none", "low", "moderate", "high", "unknown"].includes(String(recovery?.outsideActivityLoad))) {
    errors.push("$.recovery.outsideActivityLoad is invalid.");
  }
  if (
    recovery?.outsideActivityMinutesPerWeek !== null
    && !(
      typeof recovery?.outsideActivityMinutesPerWeek === "number"
      && Number.isFinite(recovery.outsideActivityMinutesPerWeek)
      && recovery.outsideActivityMinutesPerWeek >= 0
    )
  ) {
    errors.push("$.recovery.outsideActivityMinutesPerWeek must be null or non-negative.");
  }
  if (!["under_6", "6_to_7", "7_to_9", "over_9", "unknown"].includes(String(recovery?.sleepBand))) {
    errors.push("$.recovery.sleepBand is invalid.");
  }
  if (!["conservative", "standard"].includes(String(recovery?.planningModifier))) {
    errors.push("$.recovery.planningModifier is invalid.");
  }
  validateStringArray(recovery?.modifierReasons, "$.recovery.modifierReasons", errors, {
    sorted: true,
    unique: true,
  });

  const normalizationIssues = validateIssueArray(
    root.normalizationIssues,
    "$.normalizationIssues",
    errors,
  ).filter((issue): issue is Record<string, unknown> => Boolean(issue));

  const safety = readClosedObject(root.safety, "$.safety", SAFETY_KEYS, errors);
  if (!["clear", "restricted", "ambiguous", "blocked"].includes(String(safety?.status))) {
    errors.push("$.safety.status is invalid.");
  }
  const movementRestrictions = safety?.movementRestrictions;
  if (!Array.isArray(movementRestrictions)) {
    errors.push("$.safety.movementRestrictions must be an array.");
  } else {
    const seenRestrictionCodes = new Set<string>();
    let previousRestrictionCode = "";
    movementRestrictions.forEach((entry, index) => {
      const restriction = readClosedObject(
        entry,
        `$.safety.movementRestrictions[${index}]`,
        ["code", "sourceText"],
        errors,
      );
      if (!restriction) return;
      if (!RESTRICTION_CODES.includes(restriction.code as RestrictionCode)) {
        errors.push(`$.safety.movementRestrictions[${index}].code is unsupported.`);
      } else if (seenRestrictionCodes.has(restriction.code as string)) {
        errors.push("$.safety.movementRestrictions must use unique restriction codes.");
      } else {
        if (previousRestrictionCode && previousRestrictionCode.localeCompare(restriction.code as string) > 0) {
          errors.push("$.safety.movementRestrictions must use canonical code ordering.");
        }
        previousRestrictionCode = restriction.code as string;
        seenRestrictionCodes.add(restriction.code as string);
      }
      if (typeof restriction.sourceText !== "string" || !restriction.sourceText) {
        errors.push(`$.safety.movementRestrictions[${index}].sourceText must be non-empty.`);
      }
    });
  }
  for (const key of [
    "excludedExerciseNames",
    "uncomfortableExerciseNames",
    "warningFlags",
  ]) {
    validateStringArray(safety?.[key], `$.safety.${key}`, errors, {
      sorted: true,
      unique: true,
    });
  }
  const unresolvedItems = validateIssueArray(
    safety?.unresolvedItems,
    "$.safety.unresolvedItems",
    errors,
  ).filter((issue): issue is Record<string, unknown> => Boolean(issue));
  if (unresolvedItems.some(
    (issue) => issue.severity !== "blocking"
      || typeof issue.fieldPath !== "string"
      || !issue.fieldPath.startsWith("/safety/"),
  )) {
    errors.push("$.safety.unresolvedItems must contain only blocking safety issues.");
  }
  const normalizedIssueKeys = new Set(normalizationIssues.map(semanticIssueKey));
  if (unresolvedItems.some((issue) => !normalizedIssueKeys.has(semanticIssueKey(issue)))) {
    errors.push("$.safety.unresolvedItems must be present in normalizationIssues.");
  }
  const expectedSafetyIssueKeys = normalizationIssues
    .filter((issue) => (
      issue.severity === "blocking"
      && typeof issue.fieldPath === "string"
      && issue.fieldPath.startsWith("/safety/")
    ))
    .map(semanticIssueKey)
    .sort();
  const actualSafetyIssueKeys = unresolvedItems.map(semanticIssueKey).sort();
  if (JSON.stringify(actualSafetyIssueKeys) !== JSON.stringify(expectedSafetyIssueKeys)) {
    errors.push("$.safety.unresolvedItems must exactly match blocking safety normalizationIssues.");
  }
  const hasSafetyIssue = (
    code: NormalizationIssueCode,
    fieldPath: JsonPointer,
  ) => unresolvedItems.some((issue) => (
    issue.code === code
    && issue.severity === "blocking"
    && issue.fieldPath === fieldPath
  ));
  const hasBlockingIssueAtPath = (fieldPath: JsonPointer) => unresolvedItems.some(
    (issue) => issue.severity === "blocking" && issue.fieldPath === fieldPath,
  );
  if (
    Array.isArray(safety?.warningFlags)
    && safety.warningFlags.length > 0
    && !hasSafetyIssue("SAFETY_CLEARANCE_REQUIRED", "/safety/warningFlags")
  ) {
    errors.push("$.safety.warningFlags require a canonical blocking clearance issue.");
  }
  const professionalDirection = readClosedObject(
    safety?.professionalDirection,
    "$.safety.professionalDirection",
    ["present", "restrictionCodes", "userReportedClearanceStatus"],
    errors,
  );
  if (typeof professionalDirection?.present !== "boolean") {
    errors.push("$.safety.professionalDirection.present must be boolean.");
  }
  validateStringArray(
    professionalDirection?.restrictionCodes,
    "$.safety.professionalDirection.restrictionCodes",
    errors,
    { allowed: new Set(RESTRICTION_CODES), sorted: true, unique: true },
  );
  if (!["cleared_with_restrictions", "not_cleared", "unknown"].includes(
    String(professionalDirection?.userReportedClearanceStatus),
  )) {
    errors.push("$.safety.professionalDirection.userReportedClearanceStatus is invalid.");
  }
  if (
    professionalDirection?.present === false
    && Array.isArray(professionalDirection.restrictionCodes)
    && professionalDirection.restrictionCodes.length > 0
  ) {
    errors.push("$.safety.professionalDirection cannot carry restrictions when absent.");
  }
  if (
    professionalDirection?.present === false
    && professionalDirection?.userReportedClearanceStatus !== "unknown"
  ) {
    errors.push("$.safety.professionalDirection absent state requires unknown clearance.");
  }
  const movementRestrictionCodes = new Set(
    Array.isArray(movementRestrictions)
      ? movementRestrictions
        .map((restriction) => asRecord(restriction)?.code)
        .filter((code): code is string => typeof code === "string")
      : [],
  );
  if (
    Array.isArray(professionalDirection?.restrictionCodes)
    && professionalDirection.restrictionCodes.some(
      (code) => typeof code === "string" && !movementRestrictionCodes.has(code),
    )
  ) {
    errors.push("$.safety.professionalDirection restrictionCodes must exist in movementRestrictions.");
  }
  if (
    professionalDirection?.userReportedClearanceStatus === "cleared_with_restrictions"
    && (
      professionalDirection.present !== true
      || !Array.isArray(professionalDirection.restrictionCodes)
      || professionalDirection.restrictionCodes.length === 0
    )
  ) {
    errors.push("$.safety.professionalDirection cleared state requires present aligned restrictions.");
  }
  if (
    professionalDirection?.userReportedClearanceStatus === "not_cleared"
    && !hasSafetyIssue("SAFETY_CLEARANCE_REQUIRED", "/safety/professionalDirection")
  ) {
    errors.push("$.safety.professionalDirection not_cleared requires a blocking clearance issue.");
  }
  if (
    professionalDirection?.present === true
    && professionalDirection?.userReportedClearanceStatus === "unknown"
    && (
      !Array.isArray(professionalDirection.restrictionCodes)
      || professionalDirection.restrictionCodes.length === 0
    )
    && !hasBlockingIssueAtPath("/safety/professionalDirection")
  ) {
    errors.push("$.safety.professionalDirection unresolved direction requires a blocking safety issue.");
  }
  const acknowledgments = readClosedObject(
    safety?.acknowledgments,
    "$.safety.acknowledgments",
    ["generalGuidance", "fitnessGuidance"],
    errors,
  );
  for (const key of ["generalGuidance", "fitnessGuidance"]) {
    if (typeof acknowledgments?.[key] !== "boolean") {
      errors.push(`$.safety.acknowledgments.${key} must be boolean.`);
    }
  }
  const hasRestriction = (
    (Array.isArray(movementRestrictions) && movementRestrictions.length > 0)
    || (Array.isArray(safety?.excludedExerciseNames) && safety.excludedExerciseNames.length > 0)
    || (Array.isArray(safety?.uncomfortableExerciseNames) && safety.uncomfortableExerciseNames.length > 0)
  );
  if (
    unresolvedItems.length > 0
    && !["blocked", "ambiguous"].includes(String(safety?.status))
  ) {
    errors.push("$.safety.status must be blocked or ambiguous when unresolved safety issues exist.");
  }
  if (
    unresolvedItems.length === 0
    && ["blocked", "ambiguous"].includes(String(safety?.status))
  ) {
    errors.push("$.safety.status blocked or ambiguous requires unresolved safety issues.");
  }
  if (
    safety?.status === "clear"
    && (
      hasRestriction
      || unresolvedItems.length > 0
      || (Array.isArray(safety?.warningFlags) && safety.warningFlags.length > 0)
    )
  ) {
    errors.push("$.safety.status clear contradicts restrictions, warnings, or unresolved issues.");
  }
  if (safety?.status === "restricted" && !hasRestriction) {
    errors.push("$.safety.status restricted requires a scoped restriction.");
  }

  const preferences = readClosedObject(
    root.preferences,
    "$.preferences",
    PREFERENCE_KEYS,
    errors,
  );
  for (const key of [
    "requiredExerciseNames",
    "preferredExerciseNames",
    "improvementMovementIds",
    "dislikedExerciseNames",
  ]) {
    validateStringArray(preferences?.[key], `$.preferences.${key}`, errors, {
      sorted: true,
      unique: true,
    });
  }
  if (!["straight_sets", "supersets", "circuits", "mixed", "no_preference"].includes(
    String(preferences?.planStyle),
  )) {
    errors.push("$.preferences.planStyle is invalid.");
  }
  validateNullableString(preferences?.equipmentPreference, "$.preferences.equipmentPreference", errors);
  const cardio = readClosedObject(
    preferences?.cardio,
    "$.preferences.cardio",
    ["priority", "preferredModalities", "avoidedModalities", "requestedSessionsPerWeek"],
    errors,
  );
  if (!["none", "supporting", "primary"].includes(String(cardio?.priority))) {
    errors.push("$.preferences.cardio.priority is invalid.");
  }
  for (const key of ["preferredModalities", "avoidedModalities"]) {
    validateStringArray(cardio?.[key], `$.preferences.cardio.${key}`, errors, {
      sorted: true,
      unique: true,
    });
  }
  if (
    cardio?.requestedSessionsPerWeek !== null
    && !(
      typeof cardio?.requestedSessionsPerWeek === "number"
      && Number.isInteger(cardio.requestedSessionsPerWeek)
      && cardio.requestedSessionsPerWeek >= 0
      && cardio.requestedSessionsPerWeek <= 7
    )
  ) {
    errors.push("$.preferences.cardio.requestedSessionsPerWeek must be null or 0 through 7.");
  }

  const planContext = readClosedObject(root.planContext, "$.planContext", CONTEXT_KEYS, errors);
  validateStringArray(
    planContext?.biggestTrainingStruggles,
    "$.planContext.biggestTrainingStruggles",
    errors,
    { sorted: true, unique: true },
  );
  const nutrition = readClosedObject(
    planContext?.nutrition,
    "$.planContext.nutrition",
    [
      "trackingStyle",
      "proteinTrackingStyle",
      "eatingPattern",
      "direction",
      "foodRestrictions",
      "requestedSupport",
    ],
    errors,
  );
  for (const key of ["trackingStyle", "proteinTrackingStyle", "eatingPattern", "direction"]) {
    validateNullableString(nutrition?.[key], `$.planContext.nutrition.${key}`, errors);
  }
  for (const key of ["foodRestrictions", "requestedSupport"]) {
    validateStringArray(nutrition?.[key], `$.planContext.nutrition.${key}`, errors, {
      sorted: true,
      unique: true,
    });
  }
  const delivery = readClosedObject(
    planContext?.delivery,
    "$.planContext.delivery",
    ["detailLevel", "requestedContents", "method", "followUpStyle"],
    errors,
  );
  if (
    delivery?.detailLevel !== null
    && !["concise", "standard", "detailed"].includes(String(delivery?.detailLevel))
  ) {
    errors.push("$.planContext.delivery.detailLevel is invalid.");
  }
  validateStringArray(
    delivery?.requestedContents,
    "$.planContext.delivery.requestedContents",
    errors,
    { sorted: true, unique: true },
  );
  validateNullableString(delivery?.method, "$.planContext.delivery.method", errors);
  validateNullableString(delivery?.followUpStyle, "$.planContext.delivery.followUpStyle", errors);

  const constraintClasses = readClosedObject(
    root.constraintClasses,
    "$.constraintClasses",
    CONSTRAINT_KEYS,
    errors,
  );
  validateStringArray(
    constraintClasses?.blockingIssueCodes,
    "$.constraintClasses.blockingIssueCodes",
    errors,
    {
      allowed: new Set(NORMALIZATION_ISSUE_CODES),
      sorted: true,
      unique: true,
    },
  );
  const constraintPathKeys = [
    "hardConstraintPaths",
    "requiredCoveragePaths",
    "optimizationPaths",
    "contextOnlyPaths",
  ] as const;
  for (const key of constraintPathKeys) {
    validateStringArray(
      constraintClasses?.[key],
      `$.constraintClasses.${key}`,
      errors,
      { unique: true, jsonPointers: true },
    );
    if (
      Array.isArray(constraintClasses?.[key])
      && JSON.stringify(constraintClasses[key])
        !== JSON.stringify(CANONICAL_CONSTRAINT_CLASS_PATHS[key])
    ) {
      errors.push(
        `$.constraintClasses.${key} must equal the canonical ${key} set in exact order.`,
      );
    }
  }
  const pathOwners = new Map<string, string>();
  for (const key of constraintPathKeys) {
    if (!Array.isArray(constraintClasses?.[key])) continue;
    for (const path of constraintClasses[key]) {
      if (typeof path !== "string") continue;
      const existingOwner = pathOwners.get(path);
      if (existingOwner) {
        errors.push(
          `$.constraintClasses path ${path} must be disjoint; it appears in ${existingOwner} and ${key}.`,
        );
      } else {
        pathOwners.set(path, key);
      }
    }
  }
  const expectedBlockingCodes = [...new Set(
    normalizationIssues
      .filter((issue) => issue.severity === "blocking")
      .map((issue) => issue.code as string),
  )].sort();
  if (
    Array.isArray(constraintClasses?.blockingIssueCodes)
    && JSON.stringify(constraintClasses.blockingIssueCodes) !== JSON.stringify(expectedBlockingCodes)
  ) {
    errors.push("$.constraintClasses.blockingIssueCodes must match normalizationIssues.");
  }

  validateProvenance(root.provenance, "$.provenance", errors);

  if (
    typeof root.generationProjectionDigest !== "string"
    || !/^[a-f0-9]{64}$/.test(root.generationProjectionDigest)
  ) {
    errors.push("$.generationProjectionDigest must be a SHA-256 hex digest.");
  }

  if (errors.length === 0) {
    const contract = root as unknown as NormalizedPlanningIntakeV1;
    const {
      generationProjectionDigest,
      ...contractWithoutDigest
    } = contract;
    const expectedDigest = digestPlanningGenerationProjection(contractWithoutDigest);
    if (generationProjectionDigest !== expectedDigest) {
      errors.push("$.generationProjectionDigest does not match the semantic projection.");
    }
  }

  return errors;
}
