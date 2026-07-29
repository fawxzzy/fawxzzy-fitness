import { digestCanonicalJson } from "../canonical.ts";
import {
  CURATED_NORMALIZER_VERSION,
  NORMALIZED_PLANNING_INTAKE_VERSION,
  WEEKDAY_VALUES,
  type Weekday,
} from "../contract.ts";
import {
  CANONICAL_PRESCRIPTION_CLASS_POLICY,
  EXERCISE_CATALOG_SCHEMA_VERSION,
  EXERCISE_CATALOG_VERSION,
  type MeasurementType,
  type PrescriptionClassId,
  type ProgressionMode,
} from "../catalog/contract.ts";
import {
  COVERAGE_COMPILER_VERSION,
  COVERAGE_POLICY_VERSION,
  COVERAGE_REQUIREMENT_ID_PATTERN_SOURCE,
  COVERAGE_SCHEMA_VERSION,
  COVERAGE_STATUSES,
  type CoverageStatus,
} from "../coverage/contract.ts";
import {
  CANDIDATE_RANKING_COMPILER_VERSION,
  CANDIDATE_RANKING_POLICY_VERSION,
  CANDIDATE_RANKING_SCHEMA_VERSION,
  CANDIDATE_RANKING_STATUSES,
  type CandidateRankingStatus,
} from "../ranking/contract.ts";
import {
  GLOBAL_SELECTION_COMPILER_VERSION,
  GLOBAL_SELECTION_POLICY_VERSION,
  GLOBAL_SELECTION_SCHEMA_VERSION,
  GLOBAL_SELECTION_STATUSES,
  type GlobalSelectionStatus,
} from "../selection/contract.ts";
import {
  SESSION_ALLOCATION_COMPILER_VERSION,
  SESSION_ALLOCATION_POLICY_VERSION,
  SESSION_ALLOCATION_SCHEMA_VERSION,
  SESSION_ALLOCATION_STATUSES,
  type SessionAllocationScheduleV1,
  type SessionAllocationStatus,
} from "../allocation/contract.ts";

export const SESSION_PRESCRIPTION_SCHEMA_VERSION =
  "fitness.session-prescription.v1" as const;
export const SESSION_PRESCRIPTION_COMPILER_VERSION =
  "fitness.session-prescription-compiler.2026-07-29.v1" as const;
export const SESSION_PRESCRIPTION_POLICY_VERSION =
  "fitness.session-prescription-policy.2026-07-29.v1" as const;
export const SESSION_PRESCRIPTION_RUNTIME_VALIDATOR_VERSION =
  "fitness.session-prescription-validator.2026-07-29.v1" as const;

export const SESSION_PRESCRIPTION_STATUSES = [
  "prescribed",
  "not_prescribable",
  "infeasible",
  "invalid_input",
] as const;
export const SESSION_PRESCRIPTION_ISSUE_CLASSES = [
  "invalid",
  "not_prescribable",
  "infeasible",
] as const;
export const SESSION_PRESCRIPTION_ISSUE_CODES = [
  "ALLOCATION_INPUT_MISMATCH",
  "ALLOCATION_INVALID",
  "ALLOCATION_NOT_READY",
  "CATALOG_EXERCISE_MISSING",
  "CATALOG_INVALID",
  "COVERAGE_INPUT_MISMATCH",
  "COVERAGE_INVALID",
  "INTAKE_INVALID",
  "PRESCRIPTION_CONTEXT_UNAVAILABLE",
  "PRESCRIPTION_POLICY_UNSUPPORTED",
  "RANKING_INPUT_MISMATCH",
  "RANKING_INVALID",
  "SELECTION_INPUT_MISMATCH",
  "SELECTION_INVALID",
  "TIME_BUDGET_EXCEEDED",
] as const;
export const SESSION_PRESCRIPTION_EXECUTION_MODES = [
  "controlled_hold",
  "controlled_repetitions",
  "steady_cardio",
] as const;
export const SESSION_PRESCRIPTION_BUDGET_STATUSES = [
  "within_hard_maximum",
  "within_target",
] as const;
export const SESSION_PRESCRIPTION_REST_SECONDS = [
  0,
  45,
  60,
  75,
  90,
  120,
] as const;

export type SessionPrescriptionStatus =
  typeof SESSION_PRESCRIPTION_STATUSES[number];
export type SessionPrescriptionIssueClass =
  typeof SESSION_PRESCRIPTION_ISSUE_CLASSES[number];
export type SessionPrescriptionIssueCode =
  typeof SESSION_PRESCRIPTION_ISSUE_CODES[number];
export type SessionPrescriptionExecutionMode =
  typeof SESSION_PRESCRIPTION_EXECUTION_MODES[number];
export type SessionPrescriptionBudgetStatus =
  typeof SESSION_PRESCRIPTION_BUDGET_STATUSES[number];

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
  }
  return value;
}

export const SESSION_PRESCRIPTION_ISSUE_POLICY = deepFreeze({
  ALLOCATION_INPUT_MISMATCH: {
    issueClass: "invalid",
    path: "/input/allocation",
  },
  ALLOCATION_INVALID: {
    issueClass: "invalid",
    path: "/input/allocation",
  },
  ALLOCATION_NOT_READY: {
    issueClass: "not_prescribable",
    path: "/input/allocation/status",
  },
  CATALOG_EXERCISE_MISSING: {
    issueClass: "invalid",
    path: "/sessions",
  },
  CATALOG_INVALID: {
    issueClass: "invalid",
    path: "/input/catalog",
  },
  COVERAGE_INPUT_MISMATCH: {
    issueClass: "invalid",
    path: "/input/coverage",
  },
  COVERAGE_INVALID: {
    issueClass: "invalid",
    path: "/input/coverage",
  },
  INTAKE_INVALID: {
    issueClass: "invalid",
    path: "/input/planning",
  },
  PRESCRIPTION_CONTEXT_UNAVAILABLE: {
    issueClass: "invalid",
    path: "/input/planning",
  },
  PRESCRIPTION_POLICY_UNSUPPORTED: {
    issueClass: "invalid",
    path: "/sessions",
  },
  RANKING_INPUT_MISMATCH: {
    issueClass: "invalid",
    path: "/input/ranking",
  },
  RANKING_INVALID: {
    issueClass: "invalid",
    path: "/input/ranking",
  },
  SELECTION_INPUT_MISMATCH: {
    issueClass: "invalid",
    path: "/input/selection",
  },
  SELECTION_INVALID: {
    issueClass: "invalid",
    path: "/input/selection",
  },
  TIME_BUDGET_EXCEEDED: {
    issueClass: "infeasible",
    path: "/sessions",
  },
} as const satisfies Record<
  SessionPrescriptionIssueCode,
  { issueClass: SessionPrescriptionIssueClass; path: `/${string}` }
>);

export const SESSION_PRESCRIPTION_CLASS_POLICY = deepFreeze({
  "bodyweight-reps-v1": {
    measurementType: "reps",
    targetUnit: "reps",
    executionMode: "controlled_repetitions",
    minimumSets: 2,
    maximumSets: 4,
  },
  "cardio-time-distance-v1": {
    measurementType: "time_distance",
    targetUnit: "minutes",
    executionMode: "steady_cardio",
    minimumSets: 1,
    maximumSets: 1,
  },
  "core-duration-v1": {
    measurementType: "time",
    targetUnit: "seconds",
    executionMode: "controlled_hold",
    minimumSets: 2,
    maximumSets: 4,
  },
  "resistance-load-reps-v1": {
    measurementType: "reps",
    targetUnit: "reps",
    executionMode: "controlled_repetitions",
    minimumSets: 2,
    maximumSets: 4,
  },
} as const satisfies Record<
  PrescriptionClassId,
  {
    measurementType: MeasurementType;
    targetUnit: "reps" | "seconds" | "minutes";
    executionMode: SessionPrescriptionExecutionMode;
    minimumSets: number;
    maximumSets: number;
  }
>);

export type SessionPrescriptionInputIdentityV1 = {
  planningContractVersion: string | null;
  planningNormalizerVersion: string | null;
  planningGenerationDigest: string | null;
  catalogSchemaVersion: string | null;
  catalogVersion: string | null;
  catalogDigest: string | null;
  coverageSchemaVersion: string | null;
  coverageCompilerVersion: string | null;
  coveragePolicyVersion: string | null;
  coverageDigest: string | null;
  coverageStatus: CoverageStatus | null;
  rankingSchemaVersion: string | null;
  rankingCompilerVersion: string | null;
  rankingPolicyVersion: string | null;
  rankingDigest: string | null;
  rankingStatus: CandidateRankingStatus | null;
  selectionSchemaVersion: string | null;
  selectionCompilerVersion: string | null;
  selectionPolicyVersion: string | null;
  selectionDigest: string | null;
  selectionStatus: GlobalSelectionStatus | null;
  allocationSchemaVersion: string | null;
  allocationCompilerVersion: string | null;
  allocationPolicyVersion: string | null;
  allocationDigest: string | null;
  allocationStatus: SessionAllocationStatus | null;
};

export type ExercisePrescriptionTargetV1 = {
  unit: "reps" | "seconds" | "minutes";
  minimum: number;
  maximum: number;
};

export type ExercisePrescriptionTimeEstimateV1 = {
  setupSeconds: number;
  activeSecondsPerSet: number;
  transitionSeconds: number;
  totalSeconds: number;
};

export type ExercisePrescriptionV1 = {
  requirementId: string;
  exerciseId: string;
  selectionPosition: number;
  sessionExercisePosition: number;
  prescriptionClassId: PrescriptionClassId;
  measurementType: MeasurementType;
  sets: number;
  target: ExercisePrescriptionTargetV1;
  restSeconds: number;
  executionMode: SessionPrescriptionExecutionMode;
  progressionMode: ProgressionMode;
  startingLoad: null;
  timeEstimate: ExercisePrescriptionTimeEstimateV1;
};

export type SessionPrescriptionTimeBudgetV1 = {
  targetSeconds: number;
  hardMaximumSeconds: number;
  estimatedSeconds: number;
  status: SessionPrescriptionBudgetStatus;
};

export type PrescribedSessionV1 = {
  sessionId: string;
  ordinal: number;
  weekday: Weekday | null;
  exercisePrescriptions: ExercisePrescriptionV1[];
  timeBudget: SessionPrescriptionTimeBudgetV1;
};

export type SessionPrescriptionSummaryV1 = {
  sessionCount: number;
  exerciseCount: number;
  totalSets: number;
  totalEstimatedSeconds: number;
  withinTargetSessionCount: number;
  withinHardMaximumSessionCount: number;
};

export type SessionPrescriptionIssueV1 = {
  code: SessionPrescriptionIssueCode;
  issueClass: SessionPrescriptionIssueClass;
  path: `/${string}`;
  values: string[];
};

export type SessionPrescriptionV1 = {
  schemaVersion: typeof SESSION_PRESCRIPTION_SCHEMA_VERSION;
  compilerVersion: typeof SESSION_PRESCRIPTION_COMPILER_VERSION;
  policyVersion: typeof SESSION_PRESCRIPTION_POLICY_VERSION;
  input: SessionPrescriptionInputIdentityV1;
  status: SessionPrescriptionStatus;
  schedule: SessionAllocationScheduleV1 | null;
  sessions: PrescribedSessionV1[];
  summary: SessionPrescriptionSummaryV1 | null;
  issues: SessionPrescriptionIssueV1[];
  prescriptionDigest: string;
};

export type SessionPrescriptionRuntimeValidationReceiptV1 = {
  validatorVersion: typeof SESSION_PRESCRIPTION_RUNTIME_VALIDATOR_VERSION;
  schemaVersion: typeof SESSION_PRESCRIPTION_SCHEMA_VERSION | null;
  prescriptionDigest: string | null;
  valid: boolean;
  errors: string[];
};

const DIGEST_PATTERN = /^[a-f0-9]{64}$/;
const EXERCISE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REQUIREMENT_ID_PATTERN = new RegExp(
  COVERAGE_REQUIREMENT_ID_PATTERN_SOURCE,
);
const SESSION_ID_PATTERN = /^session-[1-7]$/;
const WEEKDAYS = new Set<string>(WEEKDAY_VALUES);
const ROOT_KEYS = [
  "compilerVersion",
  "input",
  "issues",
  "policyVersion",
  "prescriptionDigest",
  "schedule",
  "schemaVersion",
  "sessions",
  "status",
  "summary",
] as const;
const INPUT_KEYS = [
  "allocationCompilerVersion",
  "allocationDigest",
  "allocationPolicyVersion",
  "allocationSchemaVersion",
  "allocationStatus",
  "catalogDigest",
  "catalogSchemaVersion",
  "catalogVersion",
  "coverageCompilerVersion",
  "coverageDigest",
  "coveragePolicyVersion",
  "coverageSchemaVersion",
  "coverageStatus",
  "planningContractVersion",
  "planningGenerationDigest",
  "planningNormalizerVersion",
  "rankingCompilerVersion",
  "rankingDigest",
  "rankingPolicyVersion",
  "rankingSchemaVersion",
  "rankingStatus",
  "selectionCompilerVersion",
  "selectionDigest",
  "selectionPolicyVersion",
  "selectionSchemaVersion",
  "selectionStatus",
] as const;
const VERSION_FIELDS = {
  allocationCompilerVersion: SESSION_ALLOCATION_COMPILER_VERSION,
  allocationPolicyVersion: SESSION_ALLOCATION_POLICY_VERSION,
  allocationSchemaVersion: SESSION_ALLOCATION_SCHEMA_VERSION,
  catalogSchemaVersion: EXERCISE_CATALOG_SCHEMA_VERSION,
  catalogVersion: EXERCISE_CATALOG_VERSION,
  coverageCompilerVersion: COVERAGE_COMPILER_VERSION,
  coveragePolicyVersion: COVERAGE_POLICY_VERSION,
  coverageSchemaVersion: COVERAGE_SCHEMA_VERSION,
  planningContractVersion: NORMALIZED_PLANNING_INTAKE_VERSION,
  planningNormalizerVersion: CURATED_NORMALIZER_VERSION,
  rankingCompilerVersion: CANDIDATE_RANKING_COMPILER_VERSION,
  rankingPolicyVersion: CANDIDATE_RANKING_POLICY_VERSION,
  rankingSchemaVersion: CANDIDATE_RANKING_SCHEMA_VERSION,
  selectionCompilerVersion: GLOBAL_SELECTION_COMPILER_VERSION,
  selectionPolicyVersion: GLOBAL_SELECTION_POLICY_VERSION,
  selectionSchemaVersion: GLOBAL_SELECTION_SCHEMA_VERSION,
} as const;
const DIGEST_FIELDS = [
  "allocationDigest",
  "catalogDigest",
  "coverageDigest",
  "planningGenerationDigest",
  "rankingDigest",
  "selectionDigest",
] as const;

function asRecord(
  value: unknown,
  path: string,
  errors: string[],
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push(`${path} must be an object.`);
    return null;
  }
  return value as Record<string, unknown>;
}

function validateExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  path: string,
  errors: string[],
) {
  const actual = Object.keys(value).sort();
  const canonicalExpected = [...expected].sort();
  if (
    actual.length !== canonicalExpected.length
    || actual.some((key, index) => key !== canonicalExpected[index])
  ) {
    errors.push(`${path} must contain exactly: ${canonicalExpected.join(", ")}.`);
  }
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function canonicalCompare(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function validateInput(
  value: unknown,
  errors: string[],
): SessionPrescriptionInputIdentityV1 | null {
  const input = asRecord(value, "$.input", errors);
  if (!input) return null;
  validateExactKeys(input, INPUT_KEYS, "$.input", errors);
  for (const key of Object.keys(VERSION_FIELDS) as Array<
    keyof typeof VERSION_FIELDS
  >) {
    if (input[key] !== null && typeof input[key] !== "string") {
      errors.push(`$.input.${key} must be a string or null.`);
    }
  }
  for (const key of DIGEST_FIELDS) {
    if (
      input[key] !== null
      && (
        typeof input[key] !== "string"
        || !DIGEST_PATTERN.test(input[key] as string)
      )
    ) {
      errors.push(`$.input.${key} must be a lowercase SHA-256 digest or null.`);
    }
  }
  if (
    input.coverageStatus !== null
    && !COVERAGE_STATUSES.includes(input.coverageStatus as CoverageStatus)
  ) {
    errors.push("$.input.coverageStatus is invalid.");
  }
  if (
    input.rankingStatus !== null
    && !CANDIDATE_RANKING_STATUSES.includes(
      input.rankingStatus as CandidateRankingStatus,
    )
  ) {
    errors.push("$.input.rankingStatus is invalid.");
  }
  if (
    input.selectionStatus !== null
    && !GLOBAL_SELECTION_STATUSES.includes(
      input.selectionStatus as GlobalSelectionStatus,
    )
  ) {
    errors.push("$.input.selectionStatus is invalid.");
  }
  if (
    input.allocationStatus !== null
    && !SESSION_ALLOCATION_STATUSES.includes(
      input.allocationStatus as SessionAllocationStatus,
    )
  ) {
    errors.push("$.input.allocationStatus is invalid.");
  }
  return input as SessionPrescriptionInputIdentityV1;
}

function validateBoundInputIdentity(
  input: SessionPrescriptionInputIdentityV1,
  status: SessionPrescriptionStatus,
  errors: string[],
) {
  if (status === "invalid_input") return;
  for (const [key, expected] of Object.entries(VERSION_FIELDS)) {
    if (input[key as keyof SessionPrescriptionInputIdentityV1] !== expected) {
      errors.push(`$.input.${key} must equal ${expected}.`);
    }
  }
  for (const key of DIGEST_FIELDS) {
    if (
      typeof input[key] !== "string"
      || !DIGEST_PATTERN.test(input[key] as string)
    ) {
      errors.push(`$.input.${key} is required for ${status}.`);
    }
  }
  if (!COVERAGE_STATUSES.includes(input.coverageStatus as CoverageStatus)) {
    errors.push(`$.input.coverageStatus is required for ${status}.`);
  }
  if (
    !CANDIDATE_RANKING_STATUSES.includes(
      input.rankingStatus as CandidateRankingStatus,
    )
  ) {
    errors.push(`$.input.rankingStatus is required for ${status}.`);
  }
  if (
    !GLOBAL_SELECTION_STATUSES.includes(
      input.selectionStatus as GlobalSelectionStatus,
    )
  ) {
    errors.push(`$.input.selectionStatus is required for ${status}.`);
  }
  if (
    !SESSION_ALLOCATION_STATUSES.includes(
      input.allocationStatus as SessionAllocationStatus,
    )
  ) {
    errors.push(`$.input.allocationStatus is required for ${status}.`);
  }
}

function validateSchedule(
  value: unknown,
  errors: string[],
): SessionAllocationScheduleV1 | null {
  if (value === null) return null;
  const schedule = asRecord(value, "$.schedule", errors);
  if (!schedule) return null;
  validateExactKeys(
    schedule,
    [
      "dayConstraint",
      "flexibility",
      "requestedDaysPerWeek",
      "sessionMinutes",
      "weekdays",
    ],
    "$.schedule",
    errors,
  );
  if (
    !isPositiveInteger(schedule.requestedDaysPerWeek)
    || schedule.requestedDaysPerWeek > 7
  ) {
    errors.push("$.schedule.requestedDaysPerWeek must be an integer from 1 to 7.");
  }
  const weekdays = Array.isArray(schedule.weekdays)
    ? schedule.weekdays
    : [];
  if (!Array.isArray(schedule.weekdays)) {
    errors.push("$.schedule.weekdays must be an array.");
  }
  if (
    weekdays.some((weekday) => typeof weekday !== "string" || !WEEKDAYS.has(weekday))
    || new Set(weekdays).size !== weekdays.length
  ) {
    errors.push("$.schedule.weekdays must contain unique canonical weekdays.");
  }
  const minutes = asRecord(
    schedule.sessionMinutes,
    "$.schedule.sessionMinutes",
    errors,
  );
  if (minutes) {
    validateExactKeys(
      minutes,
      ["hardMaximum", "target"],
      "$.schedule.sessionMinutes",
      errors,
    );
    for (const key of ["target", "hardMaximum"] as const) {
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
      errors.push("$.schedule.sessionMinutes.target cannot exceed hardMaximum.");
    }
  }
  if (schedule.dayConstraint === "fixed") {
    if (
      schedule.flexibility !== "none"
      || weekdays.length !== schedule.requestedDaysPerWeek
    ) {
      errors.push(
        "$.schedule fixed mode requires exact weekdays and no flexibility.",
      );
    }
  } else if (schedule.dayConstraint === "count_only") {
    if (
      schedule.flexibility !== "any_available_day"
      || weekdays.length !== 0
    ) {
      errors.push(
        "$.schedule count_only mode requires empty weekdays and any_available_day.",
      );
    }
  } else {
    errors.push("$.schedule.dayConstraint is invalid.");
  }
  return {
    requestedDaysPerWeek:
      isPositiveInteger(schedule.requestedDaysPerWeek)
      && schedule.requestedDaysPerWeek <= 7
        ? schedule.requestedDaysPerWeek as 1 | 2 | 3 | 4 | 5 | 6 | 7
        : 1,
    weekdays: weekdays.filter(
      (weekday): weekday is Weekday => (
        typeof weekday === "string" && WEEKDAYS.has(weekday)
      ),
    ),
    dayConstraint:
      schedule.dayConstraint === "count_only" ? "count_only" : "fixed",
    flexibility:
      schedule.flexibility === "any_available_day"
        ? "any_available_day"
        : "none",
    sessionMinutes: {
      target:
        typeof minutes?.target === "number" ? minutes.target : 0,
      hardMaximum:
        typeof minutes?.hardMaximum === "number"
          ? minutes.hardMaximum
          : 0,
    },
  };
}

function validateTarget(
  value: unknown,
  policy: typeof SESSION_PRESCRIPTION_CLASS_POLICY[PrescriptionClassId],
  classId: PrescriptionClassId,
  path: string,
  errors: string[],
): ExercisePrescriptionTargetV1 {
  const target = asRecord(value, path, errors);
  if (!target) {
    return { unit: policy.targetUnit, minimum: 0, maximum: 0 };
  }
  validateExactKeys(target, ["maximum", "minimum", "unit"], path, errors);
  if (target.unit !== policy.targetUnit) {
    errors.push(`${path}.unit must equal ${policy.targetUnit}.`);
  }
  if (
    typeof target.minimum !== "number"
    || !Number.isFinite(target.minimum)
    || !Number.isInteger(target.minimum)
    || typeof target.maximum !== "number"
    || !Number.isFinite(target.maximum)
    || !Number.isInteger(target.maximum)
    || target.minimum > target.maximum
  ) {
    errors.push(`${path} must contain finite ordered integer bounds.`);
  }
  const minimum =
    typeof target.minimum === "number" && Number.isFinite(target.minimum)
      ? target.minimum
      : 0;
  const maximum =
    typeof target.maximum === "number" && Number.isFinite(target.maximum)
      ? target.maximum
      : 0;
  const canonicalBounds =
    CANONICAL_PRESCRIPTION_CLASS_POLICY[classId].targetBounds;
  if (
    !canonicalBounds
    || minimum < canonicalBounds.minimum
    || maximum > canonicalBounds.maximum
  ) {
    errors.push(`${path} must stay inside the canonical class bounds.`);
  }
  return {
    unit: policy.targetUnit,
    minimum,
    maximum,
  };
}

function validateTimeEstimate(
  value: unknown,
  sets: number,
  restSeconds: number,
  classId: PrescriptionClassId,
  target: ExercisePrescriptionTargetV1,
  path: string,
  errors: string[],
): ExercisePrescriptionTimeEstimateV1 {
  const estimate = asRecord(value, path, errors);
  if (!estimate) {
    return {
      setupSeconds: 0,
      activeSecondsPerSet: 0,
      transitionSeconds: 0,
      totalSeconds: 0,
    };
  }
  validateExactKeys(
    estimate,
    [
      "activeSecondsPerSet",
      "setupSeconds",
      "totalSeconds",
      "transitionSeconds",
    ],
    path,
    errors,
  );
  for (
    const key of [
      "activeSecondsPerSet",
      "setupSeconds",
      "totalSeconds",
      "transitionSeconds",
    ] as const
  ) {
    if (!isNonNegativeInteger(estimate[key])) {
      errors.push(`${path}.${key} must be a non-negative integer.`);
    }
  }
  const setupSeconds = isNonNegativeInteger(estimate.setupSeconds)
    ? estimate.setupSeconds
    : 0;
  const activeSecondsPerSet = isNonNegativeInteger(
    estimate.activeSecondsPerSet,
  )
    ? estimate.activeSecondsPerSet
    : 0;
  if (activeSecondsPerSet === 0) {
    errors.push(`${path}.activeSecondsPerSet must be a positive integer.`);
  }
  const transitionSeconds = isNonNegativeInteger(estimate.transitionSeconds)
    ? estimate.transitionSeconds
    : 0;
  const totalSeconds = isNonNegativeInteger(estimate.totalSeconds)
    ? estimate.totalSeconds
    : 0;
  const expectedTotal =
    setupSeconds
    + transitionSeconds
    + (activeSecondsPerSet * sets)
    + (restSeconds * Math.max(0, sets - 1));
  if (totalSeconds !== expectedTotal) {
    errors.push(`${path}.totalSeconds is inconsistent with its components.`);
  }
  if (
    classId === "cardio-time-distance-v1"
    && activeSecondsPerSet !== target.maximum * 60
  ) {
    errors.push(
      `${path}.activeSecondsPerSet must equal the cardio target maximum.`,
    );
  }
  if (
    classId === "core-duration-v1"
    && activeSecondsPerSet < target.maximum
  ) {
    errors.push(
      `${path}.activeSecondsPerSet cannot be shorter than the hold target.`,
    );
  }
  return {
    setupSeconds,
    activeSecondsPerSet,
    transitionSeconds,
    totalSeconds,
  };
}

function validateExercisePrescription(
  value: unknown,
  sessionIndex: number,
  prescriptionIndex: number,
  errors: string[],
): ExercisePrescriptionV1 | null {
  const path =
    `$.sessions[${sessionIndex}].exercisePrescriptions[${prescriptionIndex}]`;
  const prescription = asRecord(value, path, errors);
  if (!prescription) return null;
  validateExactKeys(
    prescription,
    [
      "executionMode",
      "exerciseId",
      "measurementType",
      "prescriptionClassId",
      "progressionMode",
      "requirementId",
      "restSeconds",
      "selectionPosition",
      "sessionExercisePosition",
      "sets",
      "startingLoad",
      "target",
      "timeEstimate",
    ],
    path,
    errors,
  );
  if (
    typeof prescription.requirementId !== "string"
    || !REQUIREMENT_ID_PATTERN.test(prescription.requirementId)
  ) {
    errors.push(`${path}.requirementId is invalid.`);
  }
  if (
    typeof prescription.exerciseId !== "string"
    || !EXERCISE_ID_PATTERN.test(prescription.exerciseId)
  ) {
    errors.push(`${path}.exerciseId is invalid.`);
  }
  if (!isPositiveInteger(prescription.selectionPosition)) {
    errors.push(`${path}.selectionPosition must be a positive integer.`);
  }
  if (prescription.sessionExercisePosition !== prescriptionIndex + 1) {
    errors.push(
      `${path}.sessionExercisePosition must equal ${prescriptionIndex + 1}.`,
    );
  }
  if (
    typeof prescription.prescriptionClassId !== "string"
    || !Object.hasOwn(
      SESSION_PRESCRIPTION_CLASS_POLICY,
      prescription.prescriptionClassId,
    )
  ) {
    errors.push(`${path}.prescriptionClassId is invalid.`);
    return null;
  }
  const classId = prescription.prescriptionClassId as PrescriptionClassId;
  const policy = SESSION_PRESCRIPTION_CLASS_POLICY[classId];
  if (prescription.measurementType !== policy.measurementType) {
    errors.push(
      `${path}.measurementType must equal ${policy.measurementType}.`,
    );
  }
  if (
    !isPositiveInteger(prescription.sets)
    || prescription.sets < policy.minimumSets
    || prescription.sets > policy.maximumSets
  ) {
    errors.push(
      `${path}.sets must be within the canonical class set bounds.`,
    );
  }
  const sets = isPositiveInteger(prescription.sets)
    ? prescription.sets
    : 0;
  const target = validateTarget(
    prescription.target,
    policy,
    classId,
    `${path}.target`,
    errors,
  );
  if (
    !isNonNegativeInteger(prescription.restSeconds)
    || !SESSION_PRESCRIPTION_REST_SECONDS.includes(
      prescription.restSeconds as never,
    )
  ) {
    errors.push(`${path}.restSeconds must be a canonical rest interval.`);
  }
  const restSeconds = isNonNegativeInteger(prescription.restSeconds)
    ? prescription.restSeconds
    : 0;
  if (
    classId === "cardio-time-distance-v1"
      ? restSeconds !== 0
      : restSeconds < 30
  ) {
    errors.push(`${path}.restSeconds violates the canonical class boundary.`);
  }
  if (prescription.executionMode !== policy.executionMode) {
    errors.push(
      `${path}.executionMode must equal ${policy.executionMode}.`,
    );
  }
  if (
    typeof prescription.progressionMode !== "string"
    || !CANONICAL_PRESCRIPTION_CLASS_POLICY[
      classId
    ].supportedProgressionModes.includes(
      prescription.progressionMode as never,
    )
  ) {
    errors.push(`${path}.progressionMode is unsupported by its class.`);
  }
  if (prescription.startingLoad !== null) {
    errors.push(`${path}.startingLoad must remain null.`);
  }
  const timeEstimate = validateTimeEstimate(
    prescription.timeEstimate,
    sets,
    restSeconds,
    classId,
    target,
    `${path}.timeEstimate`,
    errors,
  );
  return {
    requirementId:
      typeof prescription.requirementId === "string"
        ? prescription.requirementId
        : "",
    exerciseId:
      typeof prescription.exerciseId === "string"
        ? prescription.exerciseId
        : "",
    selectionPosition:
      isPositiveInteger(prescription.selectionPosition)
        ? prescription.selectionPosition
        : 0,
    sessionExercisePosition:
      isPositiveInteger(prescription.sessionExercisePosition)
        ? prescription.sessionExercisePosition
        : 0,
    prescriptionClassId: classId,
    measurementType: policy.measurementType,
    sets,
    target,
    restSeconds,
    executionMode: policy.executionMode,
    progressionMode:
      typeof prescription.progressionMode === "string"
        ? prescription.progressionMode as ProgressionMode
        : CANONICAL_PRESCRIPTION_CLASS_POLICY[
          classId
        ].supportedProgressionModes[0],
    startingLoad: null,
    timeEstimate,
  };
}

function validateTimeBudget(
  value: unknown,
  schedule: SessionAllocationScheduleV1 | null,
  prescriptions: ExercisePrescriptionV1[],
  path: string,
  errors: string[],
): SessionPrescriptionTimeBudgetV1 {
  const budget = asRecord(value, path, errors);
  if (!budget) {
    return {
      targetSeconds: 0,
      hardMaximumSeconds: 0,
      estimatedSeconds: 0,
      status: "within_target",
    };
  }
  validateExactKeys(
    budget,
    ["estimatedSeconds", "hardMaximumSeconds", "status", "targetSeconds"],
    path,
    errors,
  );
  for (
    const key of [
      "estimatedSeconds",
      "hardMaximumSeconds",
      "targetSeconds",
    ] as const
  ) {
    if (!isNonNegativeInteger(budget[key])) {
      errors.push(`${path}.${key} must be a non-negative integer.`);
    }
  }
  const targetSeconds = isNonNegativeInteger(budget.targetSeconds)
    ? budget.targetSeconds
    : 0;
  const hardMaximumSeconds = isNonNegativeInteger(budget.hardMaximumSeconds)
    ? budget.hardMaximumSeconds
    : 0;
  const estimatedSeconds = isNonNegativeInteger(budget.estimatedSeconds)
    ? budget.estimatedSeconds
    : 0;
  const expectedEstimate = prescriptions.reduce(
    (sum, prescription) => sum + prescription.timeEstimate.totalSeconds,
    0,
  );
  if (estimatedSeconds !== expectedEstimate) {
    errors.push(`${path}.estimatedSeconds is inconsistent with prescriptions.`);
  }
  if (
    schedule
    && (
      targetSeconds !== schedule.sessionMinutes.target * 60
      || hardMaximumSeconds !== schedule.sessionMinutes.hardMaximum * 60
    )
  ) {
    errors.push(`${path} does not match the canonical schedule budget.`);
  }
  const expectedStatus =
    estimatedSeconds <= targetSeconds
      ? "within_target"
      : "within_hard_maximum";
  if (budget.status !== expectedStatus) {
    errors.push(`${path}.status is inconsistent with estimated duration.`);
  }
  if (estimatedSeconds > hardMaximumSeconds) {
    errors.push(`${path}.estimatedSeconds exceeds the hard maximum.`);
  }
  return {
    targetSeconds,
    hardMaximumSeconds,
    estimatedSeconds,
    status: expectedStatus,
  };
}

function validateSessions(
  value: unknown,
  schedule: SessionAllocationScheduleV1 | null,
  errors: string[],
): PrescribedSessionV1[] {
  if (!Array.isArray(value)) {
    errors.push("$.sessions must be an array.");
    return [];
  }
  const sessions: PrescribedSessionV1[] = [];
  value.forEach((entry, sessionIndex) => {
    const path = `$.sessions[${sessionIndex}]`;
    const session = asRecord(entry, path, errors);
    if (!session) return;
    validateExactKeys(
      session,
      [
        "exercisePrescriptions",
        "ordinal",
        "sessionId",
        "timeBudget",
        "weekday",
      ],
      path,
      errors,
    );
    if (
      typeof session.sessionId !== "string"
      || !SESSION_ID_PATTERN.test(session.sessionId)
      || session.sessionId !== `session-${sessionIndex + 1}`
    ) {
      errors.push(`${path}.sessionId must equal session-${sessionIndex + 1}.`);
    }
    if (session.ordinal !== sessionIndex + 1) {
      errors.push(`${path}.ordinal must equal ${sessionIndex + 1}.`);
    }
    const expectedWeekday =
      schedule?.dayConstraint === "fixed"
        ? schedule.weekdays[sessionIndex] ?? null
        : null;
    if (session.weekday !== expectedWeekday) {
      errors.push(`${path}.weekday does not match the canonical schedule slot.`);
    }
    const rawPrescriptions = Array.isArray(session.exercisePrescriptions)
      ? session.exercisePrescriptions
      : [];
    if (!Array.isArray(session.exercisePrescriptions)) {
      errors.push(`${path}.exercisePrescriptions must be an array.`);
    }
    const exercisePrescriptions = rawPrescriptions.flatMap(
      (prescription, prescriptionIndex) => {
        const validated = validateExercisePrescription(
          prescription,
          sessionIndex,
          prescriptionIndex,
          errors,
        );
        return validated ? [validated] : [];
      },
    );
    for (let index = 1; index < exercisePrescriptions.length; index += 1) {
      if (
        exercisePrescriptions[index - 1].selectionPosition
        >= exercisePrescriptions[index].selectionPosition
      ) {
        errors.push(
          `${path}.exercisePrescriptions must follow selection order.`,
        );
        break;
      }
    }
    const timeBudget = validateTimeBudget(
      session.timeBudget,
      schedule,
      exercisePrescriptions,
      `${path}.timeBudget`,
      errors,
    );
    sessions.push({
      sessionId:
        typeof session.sessionId === "string" ? session.sessionId : "",
      ordinal: isPositiveInteger(session.ordinal) ? session.ordinal : 0,
      weekday:
        typeof session.weekday === "string"
        && WEEKDAYS.has(session.weekday)
          ? session.weekday as Weekday
          : null,
      exercisePrescriptions,
      timeBudget,
    });
  });
  const flattened = sessions.flatMap(
    (session) => session.exercisePrescriptions,
  );
  if (
    new Set(flattened.map((entry) => entry.requirementId)).size
    !== flattened.length
  ) {
    errors.push("$.sessions contains duplicate requirement prescriptions.");
  }
  if (
    new Set(flattened.map((entry) => entry.exerciseId)).size
    !== flattened.length
  ) {
    errors.push("$.sessions contains duplicate exercise prescriptions.");
  }
  const positions = flattened
    .map((entry) => entry.selectionPosition)
    .sort((left, right) => left - right);
  if (positions.some((position, index) => position !== index + 1)) {
    errors.push("$.sessions must contain each canonical selection position once.");
  }
  if (sessions.length > 0) {
    sessions.forEach((session, sessionIndex) => {
      if (
        session.exercisePrescriptions.some(
          (entry) => (
            (entry.selectionPosition - 1) % sessions.length !== sessionIndex
          ),
        )
      ) {
        errors.push(
          `${`$.sessions[${sessionIndex}]`}.exercisePrescriptions contains a selection position owned by another canonical round-robin session.`,
        );
      }
    });
  }
  return sessions;
}

function validateSummary(
  value: unknown,
  sessions: PrescribedSessionV1[],
  errors: string[],
): SessionPrescriptionSummaryV1 | null {
  if (value === null) return null;
  const summary = asRecord(value, "$.summary", errors);
  if (!summary) return null;
  validateExactKeys(
    summary,
    [
      "exerciseCount",
      "sessionCount",
      "totalEstimatedSeconds",
      "totalSets",
      "withinHardMaximumSessionCount",
      "withinTargetSessionCount",
    ],
    "$.summary",
    errors,
  );
  const prescriptions = sessions.flatMap(
    (session) => session.exercisePrescriptions,
  );
  const expected: SessionPrescriptionSummaryV1 = {
    sessionCount: sessions.length,
    exerciseCount: prescriptions.length,
    totalSets: prescriptions.reduce((sum, item) => sum + item.sets, 0),
    totalEstimatedSeconds: sessions.reduce(
      (sum, session) => sum + session.timeBudget.estimatedSeconds,
      0,
    ),
    withinTargetSessionCount: sessions.filter(
      (session) => session.timeBudget.status === "within_target",
    ).length,
    withinHardMaximumSessionCount: sessions.filter(
      (session) => (
        session.timeBudget.estimatedSeconds
        <= session.timeBudget.hardMaximumSeconds
      ),
    ).length,
  };
  for (const key of Object.keys(expected) as Array<keyof typeof expected>) {
    if (summary[key] !== expected[key]) {
      errors.push(`$.summary.${key} is inconsistent with sessions.`);
    }
  }
  return expected;
}

function validateIssues(
  value: unknown,
  errors: string[],
): SessionPrescriptionIssueV1[] {
  if (!Array.isArray(value)) {
    errors.push("$.issues must be an array.");
    return [];
  }
  const issues: SessionPrescriptionIssueV1[] = [];
  value.forEach((entry, index) => {
    const path = `$.issues[${index}]`;
    const issue = asRecord(entry, path, errors);
    if (!issue) return;
    validateExactKeys(
      issue,
      ["code", "issueClass", "path", "values"],
      path,
      errors,
    );
    if (
      typeof issue.code !== "string"
      || !SESSION_PRESCRIPTION_ISSUE_CODES.includes(
        issue.code as SessionPrescriptionIssueCode,
      )
    ) {
      errors.push(`${path}.code is invalid.`);
      return;
    }
    const code = issue.code as SessionPrescriptionIssueCode;
    const policy = SESSION_PRESCRIPTION_ISSUE_POLICY[code];
    if (issue.issueClass !== policy.issueClass) {
      errors.push(`${path}.issueClass must equal ${policy.issueClass}.`);
    }
    if (issue.path !== policy.path) {
      errors.push(`${path}.path must equal ${policy.path}.`);
    }
    const values = Array.isArray(issue.values) ? issue.values : [];
    if (
      !Array.isArray(issue.values)
      || values.some((item) => typeof item !== "string" || item.length === 0)
      || new Set(values).size !== values.length
      || [...values].sort(canonicalCompare).some(
        (item, valueIndex) => item !== values[valueIndex],
      )
    ) {
      errors.push(`${path}.values must be unique canonical strings.`);
    }
    issues.push({
      code,
      issueClass: policy.issueClass,
      path: policy.path,
      values: values.filter(
        (item): item is string => typeof item === "string" && item.length > 0,
      ),
    });
  });
  if (new Set(issues.map((issue) => issue.code)).size !== issues.length) {
    errors.push("$.issues cannot contain duplicate issue codes.");
  }
  const codes = issues.map((issue) => issue.code);
  if (
    [...codes].sort(canonicalCompare).some(
      (code, index) => code !== codes[index],
    )
  ) {
    errors.push("$.issues must be in canonical code order.");
  }
  return issues;
}

export function buildSessionPrescriptionSemanticProjection(
  value:
    | Omit<SessionPrescriptionV1, "prescriptionDigest">
    | SessionPrescriptionV1,
) {
  const { prescriptionDigest: _prescriptionDigest, ...projection } =
    value as SessionPrescriptionV1;
  return projection;
}

export function digestSessionPrescription(
  value:
    | Omit<SessionPrescriptionV1, "prescriptionDigest">
    | SessionPrescriptionV1,
) {
  return digestCanonicalJson(
    buildSessionPrescriptionSemanticProjection(value),
  );
}

export function validateSessionPrescriptionV1(value: unknown) {
  const errors: string[] = [];
  const root = asRecord(value, "$", errors);
  if (!root) return errors;
  validateExactKeys(root, ROOT_KEYS, "$", errors);
  if (root.schemaVersion !== SESSION_PRESCRIPTION_SCHEMA_VERSION) {
    errors.push(
      `$.schemaVersion must equal ${SESSION_PRESCRIPTION_SCHEMA_VERSION}.`,
    );
  }
  if (root.compilerVersion !== SESSION_PRESCRIPTION_COMPILER_VERSION) {
    errors.push(
      `$.compilerVersion must equal ${SESSION_PRESCRIPTION_COMPILER_VERSION}.`,
    );
  }
  if (root.policyVersion !== SESSION_PRESCRIPTION_POLICY_VERSION) {
    errors.push(
      `$.policyVersion must equal ${SESSION_PRESCRIPTION_POLICY_VERSION}.`,
    );
  }
  const input = validateInput(root.input, errors);
  const status = root.status as SessionPrescriptionStatus;
  if (!SESSION_PRESCRIPTION_STATUSES.includes(status)) {
    errors.push("$.status is invalid.");
  }
  const schedule = validateSchedule(root.schedule, errors);
  const sessions = validateSessions(root.sessions, schedule, errors);
  const summary = validateSummary(root.summary, sessions, errors);
  const issues = validateIssues(root.issues, errors);
  if (
    typeof root.prescriptionDigest !== "string"
    || !DIGEST_PATTERN.test(root.prescriptionDigest)
  ) {
    errors.push("$.prescriptionDigest must be a lowercase SHA-256 digest.");
  }
  if (input && SESSION_PRESCRIPTION_STATUSES.includes(status)) {
    validateBoundInputIdentity(input, status, errors);
  }

  if (status === "prescribed") {
    if (input?.allocationStatus !== "allocated") {
      errors.push("$.status prescribed requires allocated upstream input.");
    }
    if (!schedule || sessions.length === 0 || summary === null) {
      errors.push("$.status prescribed requires schedule, sessions, and summary.");
    }
    if (schedule && sessions.length !== schedule.requestedDaysPerWeek) {
      errors.push("$.sessions length must equal requestedDaysPerWeek.");
    }
    if (
      sessions.some(
        (session) => session.exercisePrescriptions.length === 0,
      )
    ) {
      errors.push("$.status prescribed cannot contain an empty session.");
    }
    if (issues.length !== 0) {
      errors.push("$.status prescribed cannot contain issues.");
    }
  }
  if (status === "not_prescribable") {
    if (
      input?.allocationStatus === null
      || input?.allocationStatus === "allocated"
      || input?.allocationStatus === "invalid_input"
    ) {
      errors.push(
        "$.status not_prescribable requires a validated non-allocated allocation.",
      );
    }
    if (schedule !== null || sessions.length !== 0 || summary !== null) {
      errors.push(
        "$.status not_prescribable cannot contain schedule, sessions, or summary.",
      );
    }
    if (
      issues.length !== 1
      || issues[0]?.code !== "ALLOCATION_NOT_READY"
    ) {
      errors.push(
        "$.status not_prescribable requires exactly ALLOCATION_NOT_READY.",
      );
    }
  }
  if (status === "infeasible") {
    if (input?.allocationStatus !== "allocated") {
      errors.push("$.status infeasible requires allocated upstream input.");
    }
    if (!schedule || sessions.length !== 0 || summary !== null) {
      errors.push(
        "$.status infeasible requires schedule and no sessions or summary.",
      );
    }
    if (
      issues.length !== 1
      || issues[0]?.code !== "TIME_BUDGET_EXCEEDED"
    ) {
      errors.push("$.status infeasible requires exactly TIME_BUDGET_EXCEEDED.");
    }
  }
  if (status === "invalid_input") {
    if (schedule !== null || sessions.length !== 0 || summary !== null) {
      errors.push(
        "$.status invalid_input cannot contain schedule, sessions, or summary.",
      );
    }
    if (
      issues.length === 0
      || issues.some((issue) => issue.issueClass !== "invalid")
    ) {
      errors.push("$.status invalid_input requires only invalid issues.");
    }
  }

  if (
    typeof root.prescriptionDigest === "string"
    && DIGEST_PATTERN.test(root.prescriptionDigest)
  ) {
    try {
      const expectedDigest = digestSessionPrescription(
        value as SessionPrescriptionV1,
      );
      if (expectedDigest !== root.prescriptionDigest) {
        errors.push(
          "$.prescriptionDigest does not match the semantic prescription projection.",
        );
      }
    } catch {
      errors.push(
        "$.prescriptionDigest could not be recomputed from the supplied value.",
      );
    }
  }
  return errors;
}

export function validateSessionPrescriptionV1WithReceipt(
  value: unknown,
): SessionPrescriptionRuntimeValidationReceiptV1 {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  const errors = validateSessionPrescriptionV1(value);
  return {
    validatorVersion: SESSION_PRESCRIPTION_RUNTIME_VALIDATOR_VERSION,
    schemaVersion:
      record?.schemaVersion === SESSION_PRESCRIPTION_SCHEMA_VERSION
        ? SESSION_PRESCRIPTION_SCHEMA_VERSION
        : null,
    prescriptionDigest:
      typeof record?.prescriptionDigest === "string"
      && DIGEST_PATTERN.test(record.prescriptionDigest)
        ? record.prescriptionDigest
        : null,
    valid: errors.length === 0,
    errors,
  };
}

export const SESSION_PRESCRIPTION_BOUND_INPUT_VERSIONS = Object.freeze({
  planningContractVersion: NORMALIZED_PLANNING_INTAKE_VERSION,
  planningNormalizerVersion: CURATED_NORMALIZER_VERSION,
  catalogSchemaVersion: EXERCISE_CATALOG_SCHEMA_VERSION,
  catalogVersion: EXERCISE_CATALOG_VERSION,
  coverageSchemaVersion: COVERAGE_SCHEMA_VERSION,
  coverageCompilerVersion: COVERAGE_COMPILER_VERSION,
  coveragePolicyVersion: COVERAGE_POLICY_VERSION,
  rankingSchemaVersion: CANDIDATE_RANKING_SCHEMA_VERSION,
  rankingCompilerVersion: CANDIDATE_RANKING_COMPILER_VERSION,
  rankingPolicyVersion: CANDIDATE_RANKING_POLICY_VERSION,
  selectionSchemaVersion: GLOBAL_SELECTION_SCHEMA_VERSION,
  selectionCompilerVersion: GLOBAL_SELECTION_COMPILER_VERSION,
  selectionPolicyVersion: GLOBAL_SELECTION_POLICY_VERSION,
  allocationSchemaVersion: SESSION_ALLOCATION_SCHEMA_VERSION,
  allocationCompilerVersion: SESSION_ALLOCATION_COMPILER_VERSION,
  allocationPolicyVersion: SESSION_ALLOCATION_POLICY_VERSION,
});
