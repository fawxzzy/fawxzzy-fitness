export const NORMALIZED_PLANNING_INTAKE_VERSION = "fitness.planning-intake.v1" as const;
export const CURATED_INTAKE_CONTRACT_VERSION = "fawxzzy-fitness.curated-onboarding.v3" as const;
export const CURATED_NORMALIZER_VERSION = "curated-planning-normalizer.v1" as const;

export type Weekday = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
export type JsonPointer = `/${string}`;
export type GoalCode = "build_muscle" | "get_leaner" | "get_stronger" | "general_fitness" | "athleticism" | string;
export type EquipmentId = string;
export type RestrictionCode =
  | "NO_OVERHEAD_LOADING"
  | "NO_HIGH_IMPACT"
  | "NO_DEEP_KNEE_FLEXION"
  | "NO_LOADED_SPINAL_FLEXION"
  | "NO_UNSUPPORTED_HINGE"
  | "NO_SINGLE_LEG_BALANCE"
  | "NO_PRONE_POSITION"
  | "NO_WEIGHT_BEARING_WRIST_EXTENSION"
  | "NO_AXIAL_LOADING";

export type NormalizationIssueCode =
  | "MISSING_REQUIRED_VALUE"
  | "INVALID_RESPONSE_TYPE"
  | "INVALID_OPTION"
  | "UNRESOLVED_OTHER_VALUE"
  | "AMBIGUOUS_SAFETY_RESPONSE"
  | "CONTRADICTORY_SAFETY_RESPONSE"
  | "SAFETY_CLEARANCE_REQUIRED"
  | "MISSING_CONDITIONAL_DETAIL"
  | "DAY_COUNT_MISMATCH"
  | "UNSUPPORTED_DAY_SELECTION"
  | "INVALID_SESSION_DURATION"
  | "RECENT_CONTINUITY_UNKNOWN";

export type NormalizationIssue = {
  code: NormalizationIssueCode;
  severity: "informational" | "warning" | "blocking";
  fieldPath: JsonPointer;
  sourceQuestionIds: string[];
  messageArguments: Record<string, string | number>;
};

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
  blockingIssues: NormalizationIssue[];
  schedule: Omit<NormalizedPlanningIntakeV1["schedule"], "preferredTrainingTime">;
  goals: NormalizedPlanningIntakeV1["goals"];
  trainingBackground: Omit<
    NormalizedPlanningIntakeV1["trainingBackground"],
    "knownPerformanceContext"
  >;
  environment: NormalizedPlanningIntakeV1["environment"];
  recovery: NormalizedPlanningIntakeV1["recovery"];
  safety: Omit<NormalizedPlanningIntakeV1["safety"], "acknowledgments">;
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
    schedule: closedObjectSchema(SCHEDULE_KEYS, {
      requestedDaysPerWeek: { type: ["integer", "null"], minimum: 1, maximum: 7 },
      weekdays: { type: "array", uniqueItems: true },
      dayConstraint: { enum: ["fixed", "count_only", "unknown"] },
      flexibility: { enum: ["none", "any_available_day", "unknown"] },
      sessionMinutes: { type: "object" },
      preferredTrainingTime: {
        enum: ["morning", "afternoon", "evening", "night", "variable", null],
      },
    }),
    goals: closedObjectSchema(GOAL_KEYS, {
      primary: { type: ["string", "null"] },
      secondary: { type: "array" },
      targetAreas: { type: "array" },
      movementSkills: { type: "array" },
      bodyCompositionDirection: { enum: ["gain", "lose", "maintain", "unspecified"] },
    }),
    trainingBackground: closedObjectSchema(BACKGROUND_KEYS, {
      experience: { enum: ["beginner", "intermediate", "advanced", null] },
      recentContinuity: { enum: ["consistent", "returning", "detrained", "unknown"] },
      currentProgram: { type: "object" },
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
      locations: { type: "array", uniqueItems: true },
      equipmentAvailable: { type: "array", uniqueItems: true },
      equipmentAvoided: { type: "array", uniqueItems: true },
      equipmentLimits: { type: "object" },
    }),
    recovery: closedObjectSchema(RECOVERY_KEYS, {
      outsideActivityLoad: { enum: ["none", "low", "moderate", "high", "unknown"] },
      outsideActivityMinutesPerWeek: { type: ["number", "null"] },
      sleepBand: { enum: ["under_6", "6_to_7", "7_to_9", "over_9", "unknown"] },
      planningModifier: { enum: ["conservative", "standard"] },
      modifierReasons: { type: "array", uniqueItems: true },
    }),
    safety: closedObjectSchema(SAFETY_KEYS, {
      status: { enum: ["clear", "restricted", "ambiguous", "blocked"] },
      movementRestrictions: { type: "array" },
      excludedExerciseNames: { type: "array", uniqueItems: true },
      uncomfortableExerciseNames: { type: "array", uniqueItems: true },
      warningFlags: { type: "array", uniqueItems: true },
      unresolvedItems: { type: "array" },
      professionalDirection: { type: "object" },
      acknowledgments: { type: "object" },
    }),
    preferences: closedObjectSchema(PREFERENCE_KEYS, {
      requiredExerciseNames: { type: "array", uniqueItems: true },
      preferredExerciseNames: { type: "array", uniqueItems: true },
      improvementMovementIds: { type: "array", uniqueItems: true },
      dislikedExerciseNames: { type: "array", uniqueItems: true },
      planStyle: {
        enum: ["straight_sets", "supersets", "circuits", "mixed", "no_preference"],
      },
      equipmentPreference: { type: ["string", "null"] },
      cardio: { type: "object" },
    }),
    planContext: closedObjectSchema(CONTEXT_KEYS, {
      biggestTrainingStruggles: { type: "array", uniqueItems: true },
      nutrition: { type: "object" },
      delivery: { type: "object" },
    }),
    constraintClasses: closedObjectSchema(CONSTRAINT_KEYS, {
      blockingIssueCodes: { type: "array", uniqueItems: true },
      hardConstraintPaths: { type: "array", uniqueItems: true },
      requiredCoveragePaths: { type: "array", uniqueItems: true },
      optimizationPaths: { type: "array", uniqueItems: true },
      contextOnlyPaths: { type: "array", uniqueItems: true },
    }),
    provenance: { type: "object", propertyNames: { pattern: "^/" } },
    normalizationIssues: { type: "array" },
    generationProjectionDigest: { type: "string", pattern: "^[a-f0-9]{64}$" },
  },
} as const;

const WEEKDAYS = new Set<Weekday>([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);

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

function isStringArray(value: unknown) {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function validateStringArray(
  value: unknown,
  path: string,
  errors: string[],
  options: { unique?: boolean; jsonPointers?: boolean } = {},
) {
  if (!isStringArray(value)) {
    errors.push(`${path} must be a string array.`);
    return;
  }
  if (options.unique && new Set(value).size !== value.length) {
    errors.push(`${path} must contain unique values.`);
  }
  if (options.jsonPointers && value.some((entry) => !entry.startsWith("/"))) {
    errors.push(`${path} must contain JSON pointer paths.`);
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
  if (
    !Array.isArray(schedule?.weekdays)
    || schedule.weekdays.some((weekday) => typeof weekday !== "string" || !WEEKDAYS.has(weekday as Weekday))
    || new Set(schedule.weekdays).size !== schedule.weekdays.length
  ) {
    errors.push("$.schedule.weekdays must contain unique canonical weekdays.");
  }
  if (!["fixed", "count_only", "unknown"].includes(String(schedule?.dayConstraint))) {
    errors.push("$.schedule.dayConstraint is invalid.");
  }
  if (!["none", "any_available_day", "unknown"].includes(String(schedule?.flexibility))) {
    errors.push("$.schedule.flexibility is invalid.");
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

  const goals = readClosedObject(root.goals, "$.goals", GOAL_KEYS, errors);
  for (const key of ["secondary", "targetAreas", "movementSkills"]) {
    if (!Array.isArray(goals?.[key])) errors.push(`$.goals.${key} must be an array.`);
  }

  const background = readClosedObject(
    root.trainingBackground,
    "$.trainingBackground",
    BACKGROUND_KEYS,
    errors,
  );
  readClosedObject(
    background?.currentProgram,
    "$.trainingBackground.currentProgram",
    ["summary", "splitSummary"],
    errors,
  );

  const environment = readClosedObject(
    root.environment,
    "$.environment",
    ENVIRONMENT_KEYS,
    errors,
  );
  for (const key of ["locations", "equipmentAvailable", "equipmentAvoided"]) {
    validateStringArray(environment?.[key], `$.environment.${key}`, errors, { unique: true });
  }
  readClosedObject(
    environment?.equipmentLimits,
    "$.environment.equipmentLimits",
    ["maximumDumbbellLoadKg", "sourceText"],
    errors,
  );

  const recovery = readClosedObject(root.recovery, "$.recovery", RECOVERY_KEYS, errors);
  validateStringArray(recovery?.modifierReasons, "$.recovery.modifierReasons", errors, { unique: true });

  const safety = readClosedObject(root.safety, "$.safety", SAFETY_KEYS, errors);
  if (!["clear", "restricted", "ambiguous", "blocked"].includes(String(safety?.status))) {
    errors.push("$.safety.status is invalid.");
  }
  for (const key of [
    "movementRestrictions",
    "excludedExerciseNames",
    "uncomfortableExerciseNames",
    "warningFlags",
    "unresolvedItems",
  ]) {
    if (!Array.isArray(safety?.[key])) errors.push(`$.safety.${key} must be an array.`);
  }
  readClosedObject(
    safety?.professionalDirection,
    "$.safety.professionalDirection",
    ["present", "restrictionCodes", "userReportedClearanceStatus"],
    errors,
  );
  readClosedObject(
    safety?.acknowledgments,
    "$.safety.acknowledgments",
    ["generalGuidance", "fitnessGuidance"],
    errors,
  );

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
    validateStringArray(preferences?.[key], `$.preferences.${key}`, errors, { unique: true });
  }
  readClosedObject(
    preferences?.cardio,
    "$.preferences.cardio",
    ["priority", "preferredModalities", "avoidedModalities", "requestedSessionsPerWeek"],
    errors,
  );

  const planContext = readClosedObject(root.planContext, "$.planContext", CONTEXT_KEYS, errors);
  validateStringArray(
    planContext?.biggestTrainingStruggles,
    "$.planContext.biggestTrainingStruggles",
    errors,
    { unique: true },
  );
  readClosedObject(
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
  readClosedObject(
    planContext?.delivery,
    "$.planContext.delivery",
    ["detailLevel", "requestedContents", "method", "followUpStyle"],
    errors,
  );

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
    { unique: true },
  );
  for (const key of [
    "hardConstraintPaths",
    "requiredCoveragePaths",
    "optimizationPaths",
    "contextOnlyPaths",
  ]) {
    validateStringArray(
      constraintClasses?.[key],
      `$.constraintClasses.${key}`,
      errors,
      { unique: true, jsonPointers: true },
    );
  }

  if (
    typeof root.generationProjectionDigest !== "string"
    || !/^[a-f0-9]{64}$/.test(root.generationProjectionDigest)
  ) {
    errors.push("$.generationProjectionDigest must be a SHA-256 hex digest.");
  }
  if (!Array.isArray(root.normalizationIssues)) {
    errors.push("$.normalizationIssues must be an array.");
  }
  const provenance = asRecord(root.provenance);
  if (!provenance) {
    errors.push("$.provenance must be an object.");
  } else if (Object.keys(provenance).some((key) => !key.startsWith("/"))) {
    errors.push("$.provenance keys must be JSON pointer paths.");
  }

  return errors;
}
