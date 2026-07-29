import { digestCanonicalJson } from "../canonical.ts";
import {
  CURATED_NORMALIZER_VERSION,
  NORMALIZED_PLANNING_INTAKE_VERSION,
  WEEKDAY_VALUES,
  type Weekday,
} from "../contract.ts";
import {
  EQUIPMENT_IDS,
  EXERCISE_CATALOG_SCHEMA_VERSION,
  EXERCISE_CATALOG_VERSION,
  MOVEMENT_PATTERNS,
  RESTRICTION_CODES,
  type EquipmentId,
  type MovementPattern,
  type RestrictionCode,
} from "../catalog/contract.ts";

export const COVERAGE_SCHEMA_VERSION = "fitness.planning-coverage.v1" as const;
export const COVERAGE_COMPILER_VERSION =
  "fitness.planning-coverage-compiler.2026-07-28.v1" as const;
export const COVERAGE_POLICY_VERSION =
  "fitness.planning-coverage-policy.2026-07-28.v1" as const;
export const COVERAGE_RUNTIME_VALIDATOR_VERSION =
  "fitness.planning-coverage-validator.2026-07-28.v1" as const;
export const COVERAGE_REQUIREMENT_ID_PATTERN_SOURCE =
  "^coverage:[a-z_]+(?:\\+[a-z_]+)*$" as const;

export const COVERAGE_STATUSES = [
  "ready",
  "blocked",
  "needs_clarification",
  "infeasible",
  "invalid_input",
] as const;
export const COVERAGE_SOURCE_KINDS = [
  "cardio",
  "movement_skill",
  "primary_goal",
  "secondary_goal",
  "target_area",
] as const;
export const COVERAGE_ISSUE_CLASSES = [
  "blocking",
  "clarification",
  "infeasible",
  "invalid",
] as const;
export const COVERAGE_ISSUE_CODES = [
  "CANDIDATE_RESOLUTION_INVALID",
  "CATALOG_INVALID",
  "EQUIPMENT_REQUIRED",
  "EXPERIENCE_REQUIRED",
  "INTAKE_INVALID",
  "PLANNING_BLOCKED",
  "REQUIRED_COVERAGE_UNAVAILABLE",
  "REQUIRED_EXERCISE_SEMANTICS_UNAVAILABLE",
  "SAFETY_BLOCKED",
  "SCHEDULE_REQUIRED",
  "SESSION_DURATION_REQUIRED",
  "UNMAPPED_MOVEMENT_SKILL",
  "UNMAPPED_PRIMARY_GOAL",
  "UNMAPPED_SECONDARY_GOAL",
  "UNMAPPED_TARGET_AREA",
  "UNRESOLVED_EXCLUDED_EXERCISE",
  "UNRESOLVED_UNCOMFORTABLE_EXERCISE",
  "UNSUPPORTED_EQUIPMENT_ID",
  "WEEKLY_FREQUENCY_UNAVAILABLE",
] as const;

export type CoverageStatus = typeof COVERAGE_STATUSES[number];
export type CoverageSourceKind = typeof COVERAGE_SOURCE_KINDS[number];
export type CoverageIssueClass = typeof COVERAGE_ISSUE_CLASSES[number];
export type CoverageIssueCode = typeof COVERAGE_ISSUE_CODES[number];

type CoverageSelectorPolicy = readonly (readonly MovementPattern[])[];

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
  }
  return value;
}

const BASE_STRENGTH_COVERAGE = [
  ["hinge"],
  ["horizontal_pull"],
  ["horizontal_push"],
  ["squat"],
] as const satisfies CoverageSelectorPolicy;
const BASE_GENERAL_COVERAGE = [
  ...BASE_STRENGTH_COVERAGE,
  ["trunk_bracing"],
] as const satisfies CoverageSelectorPolicy;

export const PRIMARY_GOAL_COVERAGE_POLICY = deepFreeze({
  athleticism: [...BASE_GENERAL_COVERAGE, ["locomotion"]],
  build_muscle: BASE_STRENGTH_COVERAGE,
  general_fitness: BASE_GENERAL_COVERAGE,
  get_stronger: BASE_STRENGTH_COVERAGE,
} as const satisfies Record<string, CoverageSelectorPolicy>);

export const SECONDARY_GOAL_COVERAGE_POLICY = deepFreeze({
  athleticism: PRIMARY_GOAL_COVERAGE_POLICY.athleticism,
  build_consistency: null,
  build_lower_body: [["hinge"], ["squat"]],
  build_muscle: PRIMARY_GOAL_COVERAGE_POLICY.build_muscle,
  general_fitness: PRIMARY_GOAL_COVERAGE_POLICY.general_fitness,
  get_stronger: PRIMARY_GOAL_COVERAGE_POLICY.get_stronger,
  improve_bench_press: [["horizontal_push"]],
  improve_conditioning: [["cycling", "locomotion", "walking"]],
  improve_pull_ups: [["vertical_pull"]],
  improve_squat: [["squat"]],
  improve_upper_strength: [["horizontal_pull"], ["horizontal_push"]],
  maintain_strength: BASE_STRENGTH_COVERAGE,
  move_well: null,
  stay_consistent: null,
  train_safely: null,
} as const satisfies Record<string, CoverageSelectorPolicy | null>);

export const TARGET_AREA_COVERAGE_POLICY = deepFreeze({
  arms: [["horizontal_pull"], ["horizontal_push"]],
  back: [["horizontal_pull"], ["vertical_pull"]],
  chest: [["horizontal_push"]],
  conditioning: [["cycling", "locomotion", "walking"]],
  core: [["trunk_bracing"]],
  glutes: [["hinge"]],
  legs: [["hinge"], ["squat"]],
  overall: BASE_GENERAL_COVERAGE,
  shoulders: [["vertical_push"]],
} as const satisfies Record<string, CoverageSelectorPolicy>);

export const MOVEMENT_SKILL_COVERAGE_POLICY = deepFreeze({
  arms: [["horizontal_pull"], ["horizontal_push"]],
  "bench-press": [["horizontal_push"]],
  cardio: [["cycling", "locomotion", "walking"]],
  core: [["trunk_bracing"]],
  "deadlift-rdl": [["hinge"]],
  "pull-ups": [["vertical_pull"]],
  "push-ups": [["horizontal_push"]],
  rows: [["horizontal_pull"]],
  "shoulder-press": [["vertical_push"]],
  squat: [["squat"]],
} as const satisfies Record<string, CoverageSelectorPolicy>);

export const CARDIO_COVERAGE_POLICY = deepFreeze({
  none: null,
  primary: {
    minimumWeeklyOccurrences: 2,
    selectors: [["cycling", "locomotion", "walking"]],
  },
  supporting: {
    minimumWeeklyOccurrences: 1,
    selectors: [["cycling", "locomotion", "walking"]],
  },
} as const satisfies Record<
  "none" | "primary" | "supporting",
  { minimumWeeklyOccurrences: number; selectors: CoverageSelectorPolicy } | null
>);

export const COVERAGE_ISSUE_POLICY = deepFreeze({
  CANDIDATE_RESOLUTION_INVALID: {
    issueClass: "invalid",
    path: "/requirements",
  },
  CATALOG_INVALID: { issueClass: "invalid", path: "/input/catalog" },
  EQUIPMENT_REQUIRED: {
    issueClass: "clarification",
    path: "/input/planning/environment/equipmentAvailable",
  },
  EXPERIENCE_REQUIRED: {
    issueClass: "clarification",
    path: "/input/planning/trainingBackground/experience",
  },
  INTAKE_INVALID: { issueClass: "invalid", path: "/input/planning" },
  PLANNING_BLOCKED: { issueClass: "blocking", path: "/input/planning" },
  REQUIRED_COVERAGE_UNAVAILABLE: {
    issueClass: "infeasible",
    path: "/requirements",
  },
  REQUIRED_EXERCISE_SEMANTICS_UNAVAILABLE: {
    issueClass: "clarification",
    path: "/input/planning/preferences/requiredExerciseNames",
  },
  SAFETY_BLOCKED: {
    issueClass: "blocking",
    path: "/input/planning/safety",
  },
  SCHEDULE_REQUIRED: {
    issueClass: "clarification",
    path: "/input/planning/schedule",
  },
  SESSION_DURATION_REQUIRED: {
    issueClass: "clarification",
    path: "/input/planning/schedule/sessionMinutes",
  },
  UNMAPPED_MOVEMENT_SKILL: {
    issueClass: "clarification",
    path: "/input/planning/goals/movementSkills",
  },
  UNMAPPED_PRIMARY_GOAL: {
    issueClass: "clarification",
    path: "/input/planning/goals/primary",
  },
  UNMAPPED_SECONDARY_GOAL: {
    issueClass: "clarification",
    path: "/input/planning/goals/secondary",
  },
  UNMAPPED_TARGET_AREA: {
    issueClass: "clarification",
    path: "/input/planning/goals/targetAreas",
  },
  UNRESOLVED_EXCLUDED_EXERCISE: {
    issueClass: "clarification",
    path: "/input/planning/safety/excludedExerciseNames",
  },
  UNRESOLVED_UNCOMFORTABLE_EXERCISE: {
    issueClass: "clarification",
    path: "/input/planning/safety/uncomfortableExerciseNames",
  },
  UNSUPPORTED_EQUIPMENT_ID: {
    issueClass: "invalid",
    path: "/input/planning/environment",
  },
  WEEKLY_FREQUENCY_UNAVAILABLE: {
    issueClass: "infeasible",
    path: "/schedule/requestedDaysPerWeek",
  },
} as const satisfies Record<
  CoverageIssueCode,
  { issueClass: CoverageIssueClass; path: `/${string}` }
>);

export type CoverageInputIdentityV1 = {
  planningContractVersion: string | null;
  planningNormalizerVersion: string | null;
  planningGenerationDigest: string | null;
  catalogSchemaVersion: string | null;
  catalogVersion: string | null;
  catalogDigest: string | null;
};

export type CoverageScheduleV1 = {
  requestedDaysPerWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  weekdays: Weekday[];
  dayConstraint: "fixed" | "count_only";
  flexibility: "none" | "any_available_day";
  sessionMinutes: {
    target: number;
    hardMaximum: number;
  };
};

export type CoverageHardConstraintsV1 = {
  availableEquipment: EquipmentId[];
  avoidedEquipment: EquipmentId[];
  maximumDumbbellLoadKg: number | null;
  restrictionCodes: RestrictionCode[];
  excludedExerciseIds: string[];
  uncomfortableExerciseIds: string[];
};

export type CoverageRequirementSourceV1 = {
  kind: CoverageSourceKind;
  value: string;
  rank: number | null;
};

export type CoverageRequirementV1 = {
  id: string;
  anyOfMovementPatterns: MovementPattern[];
  minimumWeeklyOccurrences: number;
  sources: CoverageRequirementSourceV1[];
  compatibleExerciseIds: string[];
};

export type CoverageIssueV1 = {
  code: CoverageIssueCode;
  issueClass: CoverageIssueClass;
  path: `/${string}`;
  values: string[];
};

export type CoverageCompilationV1 = {
  schemaVersion: typeof COVERAGE_SCHEMA_VERSION;
  compilerVersion: typeof COVERAGE_COMPILER_VERSION;
  policyVersion: typeof COVERAGE_POLICY_VERSION;
  input: CoverageInputIdentityV1;
  status: CoverageStatus;
  schedule: CoverageScheduleV1 | null;
  hardConstraints: CoverageHardConstraintsV1 | null;
  requirements: CoverageRequirementV1[];
  issues: CoverageIssueV1[];
  coverageDigest: string;
};

export type CoverageRuntimeValidationReceiptV1 = {
  validatorVersion: typeof COVERAGE_RUNTIME_VALIDATOR_VERSION;
  schemaVersion: typeof COVERAGE_SCHEMA_VERSION | null;
  coverageDigest: string | null;
  valid: boolean;
  errors: string[];
};

const digestSchema = { type: ["string", "null"], pattern: "^[a-f0-9]{64}$" } as const;
const nullableStringSchema = { type: ["string", "null"] } as const;
const identifierSchema = { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" } as const;

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

const INPUT_SCHEMA = closedObjectSchema(
  [
    "planningContractVersion",
    "planningNormalizerVersion",
    "planningGenerationDigest",
    "catalogSchemaVersion",
    "catalogVersion",
    "catalogDigest",
  ],
  {
    planningContractVersion: nullableStringSchema,
    planningNormalizerVersion: nullableStringSchema,
    planningGenerationDigest: digestSchema,
    catalogSchemaVersion: nullableStringSchema,
    catalogVersion: nullableStringSchema,
    catalogDigest: digestSchema,
  },
);
const SCHEDULE_SCHEMA = closedObjectSchema(
  [
    "requestedDaysPerWeek",
    "weekdays",
    "dayConstraint",
    "flexibility",
    "sessionMinutes",
  ],
  {
    requestedDaysPerWeek: { type: "integer", minimum: 1, maximum: 7 },
    weekdays: {
      type: "array",
      uniqueItems: true,
      items: { enum: WEEKDAY_VALUES },
    },
    dayConstraint: { enum: ["fixed", "count_only"] },
    flexibility: { enum: ["none", "any_available_day"] },
    sessionMinutes: closedObjectSchema(
      ["target", "hardMaximum"],
      {
        target: { type: "number", minimum: 10 },
        hardMaximum: { type: "number", minimum: 10 },
      },
    ),
  },
);
const SCHEDULE_MODE_SCHEMA = {
  oneOf: [
    {
      properties: {
        dayConstraint: { const: "fixed" },
        flexibility: { const: "none" },
        weekdays: { minItems: 1 },
      },
    },
    {
      properties: {
        dayConstraint: { const: "count_only" },
        flexibility: { const: "any_available_day" },
        weekdays: { maxItems: 0 },
      },
    },
  ],
} as const;
const SCHEDULE_COUNT_SCHEMA = {
  allOf: ([1, 2, 3, 4, 5, 6, 7] as const).map((count) => ({
    if: {
      properties: {
        dayConstraint: { const: "fixed" },
        requestedDaysPerWeek: { const: count },
      },
      required: ["dayConstraint", "requestedDaysPerWeek"],
    },
    then: {
      properties: {
        weekdays: { minItems: count, maxItems: count },
      },
    },
  })),
} as const;
const HARD_CONSTRAINTS_SCHEMA = closedObjectSchema(
  [
    "availableEquipment",
    "avoidedEquipment",
    "maximumDumbbellLoadKg",
    "restrictionCodes",
    "excludedExerciseIds",
    "uncomfortableExerciseIds",
  ],
  {
    availableEquipment: {
      type: "array",
      minItems: 1,
      uniqueItems: true,
      items: { enum: EQUIPMENT_IDS },
    },
    avoidedEquipment: {
      type: "array",
      uniqueItems: true,
      items: { enum: EQUIPMENT_IDS },
    },
    maximumDumbbellLoadKg: { type: ["number", "null"], exclusiveMinimum: 0 },
    restrictionCodes: {
      type: "array",
      uniqueItems: true,
      items: { enum: RESTRICTION_CODES },
    },
    excludedExerciseIds: {
      type: "array",
      uniqueItems: true,
      items: identifierSchema,
    },
    uncomfortableExerciseIds: {
      type: "array",
      uniqueItems: true,
      items: identifierSchema,
    },
  },
);
const SOURCE_SCHEMA = closedObjectSchema(
  ["kind", "value", "rank"],
  {
    kind: { enum: COVERAGE_SOURCE_KINDS },
    value: { type: "string", minLength: 1 },
    rank: { type: ["integer", "null"], minimum: 1 },
  },
);
const REQUIREMENT_SCHEMA = closedObjectSchema(
  [
    "id",
    "anyOfMovementPatterns",
    "minimumWeeklyOccurrences",
    "sources",
    "compatibleExerciseIds",
  ],
  {
    id: { type: "string", pattern: COVERAGE_REQUIREMENT_ID_PATTERN_SOURCE },
    anyOfMovementPatterns: {
      type: "array",
      minItems: 1,
      uniqueItems: true,
      items: { enum: MOVEMENT_PATTERNS },
    },
    minimumWeeklyOccurrences: { type: "integer", minimum: 1, maximum: 7 },
    sources: { type: "array", minItems: 1, uniqueItems: true, items: SOURCE_SCHEMA },
    compatibleExerciseIds: {
      type: "array",
      uniqueItems: true,
      items: identifierSchema,
    },
  },
);
const ISSUE_SCHEMA = {
  ...closedObjectSchema(
    ["code", "issueClass", "path", "values"],
    {
      code: { enum: COVERAGE_ISSUE_CODES },
      issueClass: { enum: COVERAGE_ISSUE_CLASSES },
      path: { type: "string", pattern: "^/" },
      values: { type: "array", uniqueItems: true, items: { type: "string" } },
    },
  ),
  allOf: COVERAGE_ISSUE_CODES.map((code) => ({
    if: {
      properties: { code: { const: code } },
      required: ["code"],
    },
    then: {
      properties: {
        issueClass: { const: COVERAGE_ISSUE_POLICY[code].issueClass },
        path: { const: COVERAGE_ISSUE_POLICY[code].path },
      },
    },
  })),
} as const;

export const COVERAGE_COMPILATION_V1_STRUCTURAL_SCHEMA = {
  $id: "https://fawxzzy.com/schemas/fitness/planning-coverage.v1.structural.json",
  $comment:
    "Structural transport schema only. Semantic validity requires a successful receipt from fitness.planning-coverage-validator.2026-07-28.v1.",
  ...closedObjectSchema(
    [
      "schemaVersion",
      "compilerVersion",
      "policyVersion",
      "input",
      "status",
      "schedule",
      "hardConstraints",
      "requirements",
      "issues",
      "coverageDigest",
    ],
    {
      schemaVersion: { const: COVERAGE_SCHEMA_VERSION },
      compilerVersion: { const: COVERAGE_COMPILER_VERSION },
      policyVersion: { const: COVERAGE_POLICY_VERSION },
      input: INPUT_SCHEMA,
      status: { enum: COVERAGE_STATUSES },
      schedule: {
        anyOf: [
          { type: "null" },
          {
            ...SCHEDULE_SCHEMA,
            allOf: [SCHEDULE_MODE_SCHEMA, ...SCHEDULE_COUNT_SCHEMA.allOf],
          },
        ],
      },
      hardConstraints: { anyOf: [{ type: "null" }, HARD_CONSTRAINTS_SCHEMA] },
      requirements: { type: "array", items: REQUIREMENT_SCHEMA },
      issues: { type: "array", items: ISSUE_SCHEMA },
      coverageDigest: { type: "string", pattern: "^[a-f0-9]{64}$" },
    },
  ),
  allOf: [
    {
      if: { properties: { status: { const: "ready" } } },
      then: {
        properties: {
          schedule: {
            ...SCHEDULE_SCHEMA,
            allOf: [SCHEDULE_MODE_SCHEMA, ...SCHEDULE_COUNT_SCHEMA.allOf],
          },
          hardConstraints: HARD_CONSTRAINTS_SCHEMA,
          requirements: {
            minItems: 1,
            items: {
              properties: {
                compatibleExerciseIds: { minItems: 1 },
              },
            },
          },
          issues: { maxItems: 0 },
        },
      },
    },
    {
      if: { properties: { status: { const: "infeasible" } } },
      then: {
        properties: {
          schedule: {
            ...SCHEDULE_SCHEMA,
            allOf: [SCHEDULE_MODE_SCHEMA, ...SCHEDULE_COUNT_SCHEMA.allOf],
          },
          hardConstraints: HARD_CONSTRAINTS_SCHEMA,
          requirements: { minItems: 1 },
          issues: {
            minItems: 1,
            items: {
              properties: { issueClass: { const: "infeasible" } },
            },
          },
        },
        anyOf: [
          {
            properties: {
              requirements: {
                contains: {
                  properties: {
                    compatibleExerciseIds: { maxItems: 0 },
                  },
                },
              },
            },
          },
          {
            properties: {
              issues: {
                contains: {
                  properties: {
                    code: { const: "WEEKLY_FREQUENCY_UNAVAILABLE" },
                  },
                },
              },
            },
          },
        ],
      },
    },
    {
      if: {
        properties: {
          status: { enum: ["blocked", "needs_clarification", "invalid_input"] },
        },
      },
      then: {
        properties: {
          schedule: { type: "null" },
          hardConstraints: { type: "null" },
          requirements: { maxItems: 0 },
          issues: { minItems: 1 },
        },
      },
    },
    {
      if: { properties: { status: { const: "blocked" } } },
      then: {
        properties: {
          issues: {
            items: {
              properties: { issueClass: { const: "blocking" } },
            },
          },
        },
      },
    },
    {
      if: { properties: { status: { const: "needs_clarification" } } },
      then: {
        properties: {
          issues: {
            items: {
              properties: { issueClass: { const: "clarification" } },
            },
          },
        },
      },
    },
    {
      if: { properties: { status: { const: "invalid_input" } } },
      then: {
        properties: {
          issues: {
            items: {
              properties: { issueClass: { const: "invalid" } },
            },
          },
        },
      },
    },
  ],
} as const;

const ROOT_KEYS = [
  "schemaVersion",
  "compilerVersion",
  "policyVersion",
  "input",
  "status",
  "schedule",
  "hardConstraints",
  "requirements",
  "issues",
  "coverageDigest",
] as const;
const INPUT_KEYS = [
  "planningContractVersion",
  "planningNormalizerVersion",
  "planningGenerationDigest",
  "catalogSchemaVersion",
  "catalogVersion",
  "catalogDigest",
] as const;
const SCHEDULE_KEYS = [
  "requestedDaysPerWeek",
  "weekdays",
  "dayConstraint",
  "flexibility",
  "sessionMinutes",
] as const;
const SESSION_KEYS = ["target", "hardMaximum"] as const;
const HARD_KEYS = [
  "availableEquipment",
  "avoidedEquipment",
  "maximumDumbbellLoadKg",
  "restrictionCodes",
  "excludedExerciseIds",
  "uncomfortableExerciseIds",
] as const;
const REQUIREMENT_KEYS = [
  "id",
  "anyOfMovementPatterns",
  "minimumWeeklyOccurrences",
  "sources",
  "compatibleExerciseIds",
] as const;
const SOURCE_KEYS = ["kind", "value", "rank"] as const;
const ISSUE_KEYS = ["code", "issueClass", "path", "values"] as const;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/;
const IDENTIFIER_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function canonicalCompare(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function asRecord(value: unknown, path: string, errors: string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push(`${path} must be an object.`);
    return null;
  }
  return value as Record<string, unknown>;
}

function validateExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
  path: string,
  errors: string[],
) {
  const expected = new Set(keys);
  for (const key of Object.keys(value)) {
    if (!expected.has(key)) errors.push(`${path}.${key} is not allowed.`);
  }
  for (const key of keys) {
    if (!(key in value)) errors.push(`${path}.${key} is required.`);
  }
}

function isCanonicalUnique(values: string[]) {
  return values.every((value, index) => (
    (index === 0 || canonicalCompare(values[index - 1], value) < 0)
  ));
}

function validateStringArray(
  value: unknown,
  path: string,
  errors: string[],
  options: {
    allowed?: readonly string[];
    canonical?: boolean;
    identifier?: boolean;
    minimum?: number;
  } = {},
) {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array.`);
    return [] as string[];
  }
  const strings: string[] = [];
  value.forEach((entry, index) => {
    if (typeof entry !== "string" || entry.length === 0) {
      errors.push(`${path}[${index}] must be a non-empty string.`);
      return;
    }
    strings.push(entry);
    if (options.allowed && !options.allowed.includes(entry)) {
      errors.push(`${path}[${index}] is unsupported.`);
    }
    if (options.identifier && !IDENTIFIER_PATTERN.test(entry)) {
      errors.push(`${path}[${index}] must be a canonical identifier.`);
    }
  });
  if (strings.length < (options.minimum ?? 0)) {
    errors.push(`${path} must contain at least ${options.minimum} item(s).`);
  }
  if (options.canonical !== false && !isCanonicalUnique(strings)) {
    errors.push(`${path} must be unique and canonically ordered.`);
  } else if (options.canonical === false && new Set(strings).size !== strings.length) {
    errors.push(`${path} must contain unique values.`);
  }
  return strings;
}

function sourceKey(source: CoverageRequirementSourceV1) {
  return [
    source.kind,
    String(source.rank ?? Number.MAX_SAFE_INTEGER).padStart(16, "0"),
    source.value,
  ].join("|");
}

function issueKey(issue: CoverageIssueV1) {
  return [issue.code, issue.values.join("|")].join("|");
}

function validateInput(value: unknown, errors: string[]) {
  const input = asRecord(value, "$.input", errors);
  if (!input) return null;
  validateExactKeys(input, INPUT_KEYS, "$.input", errors);
  for (const key of [
    "planningContractVersion",
    "planningNormalizerVersion",
    "catalogSchemaVersion",
    "catalogVersion",
  ]) {
    if (input[key] !== null && typeof input[key] !== "string") {
      errors.push(`$.input.${key} must be a string or null.`);
    }
  }
  for (const key of ["planningGenerationDigest", "catalogDigest"]) {
    if (
      input[key] !== null
      && (typeof input[key] !== "string" || !DIGEST_PATTERN.test(input[key]))
    ) {
      errors.push(`$.input.${key} must be a lowercase SHA-256 digest or null.`);
    }
  }
  return input;
}

function validateSchedule(value: unknown, errors: string[]) {
  if (value === null) return null;
  const schedule = asRecord(value, "$.schedule", errors);
  if (!schedule) return null;
  validateExactKeys(schedule, SCHEDULE_KEYS, "$.schedule", errors);
  const days = schedule.requestedDaysPerWeek;
  if (!Number.isInteger(days) || Number(days) < 1 || Number(days) > 7) {
    errors.push("$.schedule.requestedDaysPerWeek must be an integer from 1 to 7.");
  }
  const weekdays = validateStringArray(schedule.weekdays, "$.schedule.weekdays", errors, {
    allowed: WEEKDAY_VALUES,
    canonical: false,
  });
  const weekdayOrder = weekdays.map((day) => WEEKDAY_VALUES.indexOf(day as Weekday));
  if (weekdayOrder.some((position, index) => index > 0 && weekdayOrder[index - 1] >= position)) {
    errors.push("$.schedule.weekdays must use Monday-to-Sunday ordering.");
  }
  if (!["fixed", "count_only"].includes(String(schedule.dayConstraint))) {
    errors.push("$.schedule.dayConstraint is invalid.");
  }
  if (!["none", "any_available_day"].includes(String(schedule.flexibility))) {
    errors.push("$.schedule.flexibility is invalid.");
  }
  if (
    schedule.dayConstraint === "fixed"
    && (
      schedule.flexibility !== "none"
      || weekdays.length !== days
    )
  ) {
    errors.push("$.schedule fixed mode requires exact weekdays and no flexibility.");
  }
  if (
    schedule.dayConstraint === "count_only"
    && (
      schedule.flexibility !== "any_available_day"
      || weekdays.length !== 0
    )
  ) {
    errors.push("$.schedule count_only mode requires no weekdays and any-day flexibility.");
  }
  const minutes = asRecord(schedule.sessionMinutes, "$.schedule.sessionMinutes", errors);
  if (minutes) {
    validateExactKeys(minutes, SESSION_KEYS, "$.schedule.sessionMinutes", errors);
    for (const key of SESSION_KEYS) {
      if (
        typeof minutes[key] !== "number"
        || !Number.isFinite(minutes[key])
        || Number(minutes[key]) < 10
      ) {
        errors.push(`$.schedule.sessionMinutes.${key} must be at least 10.`);
      }
    }
    if (
      typeof minutes.target === "number"
      && typeof minutes.hardMaximum === "number"
      && minutes.target > minutes.hardMaximum
    ) {
      errors.push("$.schedule.sessionMinutes.target must not exceed hardMaximum.");
    }
  }
  return schedule;
}

function validateHardConstraints(value: unknown, errors: string[]) {
  if (value === null) return null;
  const hard = asRecord(value, "$.hardConstraints", errors);
  if (!hard) return null;
  validateExactKeys(hard, HARD_KEYS, "$.hardConstraints", errors);
  validateStringArray(
    hard.availableEquipment,
    "$.hardConstraints.availableEquipment",
    errors,
    { allowed: EQUIPMENT_IDS, minimum: 1 },
  );
  validateStringArray(
    hard.avoidedEquipment,
    "$.hardConstraints.avoidedEquipment",
    errors,
    { allowed: EQUIPMENT_IDS },
  );
  validateStringArray(
    hard.restrictionCodes,
    "$.hardConstraints.restrictionCodes",
    errors,
    { allowed: RESTRICTION_CODES },
  );
  validateStringArray(
    hard.excludedExerciseIds,
    "$.hardConstraints.excludedExerciseIds",
    errors,
    { identifier: true },
  );
  validateStringArray(
    hard.uncomfortableExerciseIds,
    "$.hardConstraints.uncomfortableExerciseIds",
    errors,
    { identifier: true },
  );
  if (
    hard.maximumDumbbellLoadKg !== null
    && (
      typeof hard.maximumDumbbellLoadKg !== "number"
      || !Number.isFinite(hard.maximumDumbbellLoadKg)
      || hard.maximumDumbbellLoadKg <= 0
    )
  ) {
    errors.push("$.hardConstraints.maximumDumbbellLoadKg must be positive or null.");
  }
  return hard;
}

function validateRequirements(value: unknown, errors: string[]) {
  if (!Array.isArray(value)) {
    errors.push("$.requirements must be an array.");
    return [] as CoverageRequirementV1[];
  }
  const requirements: CoverageRequirementV1[] = [];
  value.forEach((entry, index) => {
    const path = `$.requirements[${index}]`;
    const requirement = asRecord(entry, path, errors);
    if (!requirement) return;
    validateExactKeys(requirement, REQUIREMENT_KEYS, path, errors);
    const patterns = validateStringArray(
      requirement.anyOfMovementPatterns,
      `${path}.anyOfMovementPatterns`,
      errors,
      { allowed: MOVEMENT_PATTERNS, minimum: 1 },
    );
    const expectedId = `coverage:${patterns.join("+")}`;
    if (requirement.id !== expectedId) {
      errors.push(`${path}.id must equal ${expectedId}.`);
    }
    if (
      !Number.isInteger(requirement.minimumWeeklyOccurrences)
      || Number(requirement.minimumWeeklyOccurrences) < 1
      || Number(requirement.minimumWeeklyOccurrences) > 7
    ) {
      errors.push(`${path}.minimumWeeklyOccurrences must be an integer from 1 to 7.`);
    }
    if (!Array.isArray(requirement.sources) || requirement.sources.length === 0) {
      errors.push(`${path}.sources must be a non-empty array.`);
    } else {
      const sourceKeys: string[] = [];
      requirement.sources.forEach((sourceValue, sourceIndex) => {
        const sourcePath = `${path}.sources[${sourceIndex}]`;
        const source = asRecord(sourceValue, sourcePath, errors);
        if (!source) return;
        validateExactKeys(source, SOURCE_KEYS, sourcePath, errors);
        if (!COVERAGE_SOURCE_KINDS.includes(source.kind as CoverageSourceKind)) {
          errors.push(`${sourcePath}.kind is invalid.`);
        }
        if (typeof source.value !== "string" || source.value.length === 0) {
          errors.push(`${sourcePath}.value must be a non-empty string.`);
        }
        if (
          source.rank !== null
          && (!Number.isInteger(source.rank) || Number(source.rank) < 1)
        ) {
          errors.push(`${sourcePath}.rank must be a positive integer or null.`);
        }
        sourceKeys.push(sourceKey(source as CoverageRequirementSourceV1));
      });
      if (!isCanonicalUnique(sourceKeys)) {
        errors.push(`${path}.sources must be unique and canonically ordered.`);
      }
    }
    const compatibleExerciseIds = validateStringArray(
      requirement.compatibleExerciseIds,
      `${path}.compatibleExerciseIds`,
      errors,
      { identifier: true },
    );
    requirements.push({
      ...(entry as CoverageRequirementV1),
      compatibleExerciseIds,
    });
  });
  if (!isCanonicalUnique(requirements.map((requirement) => requirement.id))) {
    errors.push("$.requirements must be unique and canonically ordered by id.");
  }
  return requirements;
}

function validateIssues(value: unknown, errors: string[]) {
  if (!Array.isArray(value)) {
    errors.push("$.issues must be an array.");
    return [] as CoverageIssueV1[];
  }
  const issues: CoverageIssueV1[] = [];
  value.forEach((entry, index) => {
    const path = `$.issues[${index}]`;
    const issue = asRecord(entry, path, errors);
    if (!issue) return;
    validateExactKeys(issue, ISSUE_KEYS, path, errors);
    if (!COVERAGE_ISSUE_CODES.includes(issue.code as CoverageIssueCode)) {
      errors.push(`${path}.code is invalid.`);
      return;
    }
    const policy = COVERAGE_ISSUE_POLICY[issue.code as CoverageIssueCode];
    if (issue.issueClass !== policy.issueClass) {
      errors.push(`${path}.issueClass must equal ${policy.issueClass}.`);
    }
    if (issue.path !== policy.path) {
      errors.push(`${path}.path must equal ${policy.path}.`);
    }
    const values = validateStringArray(issue.values, `${path}.values`, errors);
    issues.push({
      code: issue.code as CoverageIssueCode,
      issueClass: issue.issueClass as CoverageIssueClass,
      path: issue.path as `/${string}`,
      values,
    });
  });
  if (!isCanonicalUnique(issues.map(issueKey))) {
    errors.push("$.issues must be unique and canonically ordered.");
  }
  return issues;
}

export function buildCoverageSemanticProjection(
  value: Omit<CoverageCompilationV1, "coverageDigest"> | CoverageCompilationV1,
) {
  const { coverageDigest: _coverageDigest, ...projection } =
    value as CoverageCompilationV1;
  return projection;
}

export function digestCoverageCompilation(
  value: Omit<CoverageCompilationV1, "coverageDigest"> | CoverageCompilationV1,
) {
  return digestCanonicalJson(buildCoverageSemanticProjection(value));
}

export function validateCoverageCompilationV1(value: unknown) {
  const errors: string[] = [];
  const root = asRecord(value, "$", errors);
  if (!root) return errors;
  validateExactKeys(root, ROOT_KEYS, "$", errors);
  if (root.schemaVersion !== COVERAGE_SCHEMA_VERSION) {
    errors.push(`$.schemaVersion must equal ${COVERAGE_SCHEMA_VERSION}.`);
  }
  if (root.compilerVersion !== COVERAGE_COMPILER_VERSION) {
    errors.push(`$.compilerVersion must equal ${COVERAGE_COMPILER_VERSION}.`);
  }
  if (root.policyVersion !== COVERAGE_POLICY_VERSION) {
    errors.push(`$.policyVersion must equal ${COVERAGE_POLICY_VERSION}.`);
  }
  const input = validateInput(root.input, errors);
  const status = root.status as CoverageStatus;
  if (!COVERAGE_STATUSES.includes(status)) {
    errors.push("$.status is invalid.");
  }
  const schedule = validateSchedule(root.schedule, errors);
  const hard = validateHardConstraints(root.hardConstraints, errors);
  const requirements = validateRequirements(root.requirements, errors);
  const issues = validateIssues(root.issues, errors);
  if (typeof root.coverageDigest !== "string" || !DIGEST_PATTERN.test(root.coverageDigest)) {
    errors.push("$.coverageDigest must be a lowercase SHA-256 digest.");
  }

  if (status !== "invalid_input" && input) {
    const expectedIdentity = {
      planningContractVersion: NORMALIZED_PLANNING_INTAKE_VERSION,
      planningNormalizerVersion: CURATED_NORMALIZER_VERSION,
      catalogSchemaVersion: EXERCISE_CATALOG_SCHEMA_VERSION,
      catalogVersion: EXERCISE_CATALOG_VERSION,
    };
    for (const [key, expected] of Object.entries(expectedIdentity)) {
      if (input[key] !== expected) {
        errors.push(`$.input.${key} must equal ${expected} for ${status}.`);
      }
    }
    for (const key of ["planningGenerationDigest", "catalogDigest"]) {
      if (typeof input[key] !== "string" || !DIGEST_PATTERN.test(input[key])) {
        errors.push(`$.input.${key} must be present for ${status}.`);
      }
    }
  }

  const terminalWithoutCompilation = [
    "blocked",
    "needs_clarification",
    "invalid_input",
  ].includes(status);
  if (terminalWithoutCompilation) {
    if (schedule !== null || hard !== null || requirements.length !== 0) {
      errors.push(`$.status ${status} cannot include compiled schedule, constraints, or requirements.`);
    }
    if (issues.length === 0) {
      errors.push(`$.status ${status} requires at least one issue.`);
    }
  }
  if (status === "blocked" && issues.some((issue) => issue.issueClass !== "blocking")) {
    errors.push("$.status blocked may contain only blocking issues.");
  }
  if (
    status === "needs_clarification"
    && issues.some((issue) => issue.issueClass !== "clarification")
  ) {
    errors.push("$.status needs_clarification may contain only clarification issues.");
  }
  if (status === "invalid_input" && issues.some((issue) => issue.issueClass !== "invalid")) {
    errors.push("$.status invalid_input may contain only invalid issues.");
  }
  if (status === "ready" || status === "infeasible") {
    if (!schedule || !hard || requirements.length === 0) {
      errors.push(`$.status ${status} requires schedule, hard constraints, and requirements.`);
    }
  }
  if (status === "ready") {
    if (issues.length !== 0) errors.push("$.status ready cannot contain issues.");
    if (requirements.some((requirement) => requirement.compatibleExerciseIds.length === 0)) {
      errors.push("$.status ready requires a compatible candidate for every requirement.");
    }
    if (
      schedule
      && requirements.some(
        (requirement) => requirement.minimumWeeklyOccurrences > Number(
          schedule.requestedDaysPerWeek,
        ),
      )
    ) {
      errors.push("$.status ready cannot exceed the available weekly frequency.");
    }
  }
  if (status === "infeasible") {
    if (issues.length === 0 || issues.some((issue) => issue.issueClass !== "infeasible")) {
      errors.push("$.status infeasible requires only infeasibility issues.");
    }
    const unsatisfiedRequirementIds = requirements
      .filter((requirement) => requirement.compatibleExerciseIds.length === 0)
      .map((requirement) => requirement.id);
    const knownRequirementIds = new Set(
      requirements.map((requirement) => requirement.id),
    );
    const coverageIssues = issues.filter(
      (issue) => issue.code === "REQUIRED_COVERAGE_UNAVAILABLE",
    );
    const coverageIssueRequirementIds = coverageIssues
      .flatMap((issue) => issue.values.filter(
        (value) => knownRequirementIds.has(value),
      ))
      .sort(canonicalCompare);
    if (
      coverageIssues.some(
        (issue) => issue.values.filter(
          (value) => knownRequirementIds.has(value),
        ).length !== 1,
      )
      || coverageIssueRequirementIds.length !== coverageIssues.length
      || JSON.stringify(coverageIssueRequirementIds)
      !== JSON.stringify(unsatisfiedRequirementIds)
    ) {
      errors.push(
        "$.status infeasible coverage issues must exactly match unsatisfied requirements.",
      );
    }
    const frequencyRequirements = schedule
      ? requirements.filter(
        (requirement) => requirement.minimumWeeklyOccurrences
          > Number(schedule.requestedDaysPerWeek),
      )
      : [];
    const expectedFrequencyIssueValues = frequencyRequirements.map(
      (requirement) => [
        requirement.id,
        `required:${requirement.minimumWeeklyOccurrences}`,
        `available:${schedule?.requestedDaysPerWeek}`,
      ].sort(canonicalCompare),
    );
    const actualFrequencyIssueValues = issues
      .filter((issue) => issue.code === "WEEKLY_FREQUENCY_UNAVAILABLE")
      .map((issue) => issue.values);
    if (
      JSON.stringify(actualFrequencyIssueValues)
      !== JSON.stringify(expectedFrequencyIssueValues)
    ) {
      errors.push(
        "$.status infeasible frequency issues must exactly match schedule shortfalls.",
      );
    }
    if (
      unsatisfiedRequirementIds.length === 0
      && frequencyRequirements.length === 0
    ) {
      errors.push(
        "$.status infeasible requires an unsatisfied requirement or frequency shortfall.",
      );
    }
    if (
      unsatisfiedRequirementIds.length > 0
      && coverageIssueRequirementIds.length === 0
    ) {
      errors.push(
        "$.status infeasible requires REQUIRED_COVERAGE_UNAVAILABLE for every unsatisfied requirement.",
      );
    }
    if (
      frequencyRequirements.length > 0
      && actualFrequencyIssueValues.length === 0
    ) {
      errors.push(
        "$.status infeasible requires WEEKLY_FREQUENCY_UNAVAILABLE for every schedule shortfall.",
      );
    }
    const unexpectedInfeasibilityCodes = issues.filter(
      (issue) => ![
        "REQUIRED_COVERAGE_UNAVAILABLE",
        "WEEKLY_FREQUENCY_UNAVAILABLE",
      ].includes(issue.code),
    );
    if (unexpectedInfeasibilityCodes.length > 0) {
      errors.push(
        "$.status infeasible contains an unsupported infeasibility issue code.",
      );
    }
  }

  if (typeof root.coverageDigest === "string" && DIGEST_PATTERN.test(root.coverageDigest)) {
    try {
      const expectedDigest = digestCoverageCompilation(
        value as CoverageCompilationV1,
      );
      if (expectedDigest !== root.coverageDigest) {
        errors.push("$.coverageDigest does not match the semantic coverage projection.");
      }
    } catch {
      errors.push("$.coverageDigest could not be recomputed from the supplied value.");
    }
  }
  return errors;
}

export function validateCoverageCompilationV1WithReceipt(
  value: unknown,
): CoverageRuntimeValidationReceiptV1 {
  const record = (
    value
    && typeof value === "object"
    && !Array.isArray(value)
  )
    ? value as Record<string, unknown>
    : null;
  const errors = validateCoverageCompilationV1(value);
  return {
    validatorVersion: COVERAGE_RUNTIME_VALIDATOR_VERSION,
    schemaVersion: record?.schemaVersion === COVERAGE_SCHEMA_VERSION
      ? COVERAGE_SCHEMA_VERSION
      : null,
    coverageDigest:
      typeof record?.coverageDigest === "string"
      && DIGEST_PATTERN.test(record.coverageDigest)
        ? record.coverageDigest
        : null,
    valid: errors.length === 0,
    errors,
  };
}
