import { digestCanonicalJson } from "../canonical.ts";
import {
  CURATED_NORMALIZER_VERSION,
  NORMALIZED_PLANNING_INTAKE_VERSION,
  WEEKDAY_VALUES,
  type Weekday,
} from "../contract.ts";
import {
  EXERCISE_CATALOG_SCHEMA_VERSION,
  EXERCISE_CATALOG_VERSION,
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

export const SESSION_ALLOCATION_SCHEMA_VERSION =
  "fitness.session-allocation.v1" as const;
export const SESSION_ALLOCATION_COMPILER_VERSION =
  "fitness.session-allocation-compiler.2026-07-29.v1" as const;
export const SESSION_ALLOCATION_POLICY_VERSION =
  "fitness.session-allocation-policy.2026-07-29.v1" as const;
export const SESSION_ALLOCATION_RUNTIME_VALIDATOR_VERSION =
  "fitness.session-allocation-validator.2026-07-29.v1" as const;

export const SESSION_ALLOCATION_STATUSES = [
  "allocated",
  "not_allocatable",
  "infeasible",
  "invalid_input",
] as const;
export const SESSION_ALLOCATION_ISSUE_CLASSES = [
  "invalid",
  "not_allocatable",
  "infeasible",
] as const;
export const SESSION_ALLOCATION_ISSUE_CODES = [
  "CATALOG_INVALID",
  "COVERAGE_INPUT_MISMATCH",
  "COVERAGE_INVALID",
  "INTAKE_INVALID",
  "RANKING_INPUT_MISMATCH",
  "RANKING_INVALID",
  "SCHEDULE_UNAVAILABLE",
  "SELECTION_INPUT_MISMATCH",
  "SELECTION_INVALID",
  "SELECTION_NOT_READY",
  "SESSION_COUNT_EXCEEDS_SELECTIONS",
] as const;

export type SessionAllocationStatus =
  typeof SESSION_ALLOCATION_STATUSES[number];
export type SessionAllocationIssueClass =
  typeof SESSION_ALLOCATION_ISSUE_CLASSES[number];
export type SessionAllocationIssueCode =
  typeof SESSION_ALLOCATION_ISSUE_CODES[number];

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
  }
  return value;
}

export const SESSION_ALLOCATION_ISSUE_POLICY = deepFreeze({
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
  RANKING_INPUT_MISMATCH: {
    issueClass: "invalid",
    path: "/input/ranking",
  },
  RANKING_INVALID: {
    issueClass: "invalid",
    path: "/input/ranking",
  },
  SCHEDULE_UNAVAILABLE: {
    issueClass: "invalid",
    path: "/schedule",
  },
  SELECTION_INPUT_MISMATCH: {
    issueClass: "invalid",
    path: "/input/selection",
  },
  SELECTION_INVALID: {
    issueClass: "invalid",
    path: "/input/selection",
  },
  SELECTION_NOT_READY: {
    issueClass: "not_allocatable",
    path: "/input/selection/status",
  },
  SESSION_COUNT_EXCEEDS_SELECTIONS: {
    issueClass: "infeasible",
    path: "/sessions",
  },
} as const satisfies Record<
  SessionAllocationIssueCode,
  { issueClass: SessionAllocationIssueClass; path: `/${string}` }
>);

export type SessionAllocationInputIdentityV1 = {
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
};

export type SessionAllocationScheduleV1 = {
  requestedDaysPerWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  weekdays: Weekday[];
  dayConstraint: "fixed" | "count_only";
  flexibility: "none" | "any_available_day";
  sessionMinutes: {
    target: number;
    hardMaximum: number;
  };
};

export type SessionExerciseAssignmentV1 = {
  requirementId: string;
  exerciseId: string;
  selectionPosition: number;
  sessionExercisePosition: number;
};

export type AllocatedSessionV1 = {
  sessionId: string;
  ordinal: number;
  weekday: Weekday | null;
  exerciseAssignments: SessionExerciseAssignmentV1[];
};

export type SessionAllocationObjectiveV1 = {
  sessionCount: number;
  exerciseCount: number;
  exerciseCountBySession: number[];
  minimumExerciseCount: number;
  maximumExerciseCount: number;
  spread: number;
};

export type SessionAllocationIssueV1 = {
  code: SessionAllocationIssueCode;
  issueClass: SessionAllocationIssueClass;
  path: `/${string}`;
  values: string[];
};

export type SessionAllocationV1 = {
  schemaVersion: typeof SESSION_ALLOCATION_SCHEMA_VERSION;
  compilerVersion: typeof SESSION_ALLOCATION_COMPILER_VERSION;
  policyVersion: typeof SESSION_ALLOCATION_POLICY_VERSION;
  input: SessionAllocationInputIdentityV1;
  status: SessionAllocationStatus;
  schedule: SessionAllocationScheduleV1 | null;
  sessions: AllocatedSessionV1[];
  objective: SessionAllocationObjectiveV1 | null;
  issues: SessionAllocationIssueV1[];
  allocationDigest: string;
};

export type SessionAllocationRuntimeValidationReceiptV1 = {
  validatorVersion: typeof SESSION_ALLOCATION_RUNTIME_VALIDATOR_VERSION;
  schemaVersion: typeof SESSION_ALLOCATION_SCHEMA_VERSION | null;
  allocationDigest: string | null;
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
  "allocationDigest",
  "compilerVersion",
  "input",
  "issues",
  "objective",
  "policyVersion",
  "schedule",
  "schemaVersion",
  "sessions",
  "status",
] as const;
const INPUT_KEYS = [
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
  record: Record<string, unknown>,
  expected: readonly string[],
  path: string,
  errors: string[],
) {
  const actual = Object.keys(record).sort();
  const canonical = [...expected].sort();
  if (
    actual.length !== canonical.length
    || actual.some((key, index) => key !== canonical[index])
  ) {
    errors.push(`${path} must contain exactly: ${canonical.join(", ")}.`);
  }
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function canonicalCompare(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function validateInput(
  value: unknown,
  errors: string[],
): SessionAllocationInputIdentityV1 | null {
  const input = asRecord(value, "$.input", errors);
  if (!input) return null;
  validateExactKeys(input, INPUT_KEYS, "$.input", errors);
  for (const key of INPUT_KEYS) {
    const entry = input[key];
    if (entry !== null && typeof entry !== "string") {
      errors.push(`$.input.${key} must be a string or null.`);
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
  return input as SessionAllocationInputIdentityV1;
}

function validateBoundInputIdentity(
  input: SessionAllocationInputIdentityV1,
  status: SessionAllocationStatus,
  errors: string[],
) {
  if (status === "invalid_input") return;
  const expected = SESSION_ALLOCATION_BOUND_INPUT_VERSIONS;
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (input[key as keyof typeof expected] !== expectedValue) {
      errors.push(`$.input.${key} must equal ${expectedValue} for ${status}.`);
    }
  }
  for (const key of [
    "planningGenerationDigest",
    "catalogDigest",
    "coverageDigest",
    "rankingDigest",
    "selectionDigest",
  ] as const) {
    const digest = input[key];
    if (typeof digest !== "string" || !DIGEST_PATTERN.test(digest)) {
      errors.push(`$.input.${key} must be present for ${status}.`);
    }
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
  const canonicalWeekdays = WEEKDAY_VALUES.filter((weekday) => (
    weekdays.includes(weekday)
  ));
  if (
    canonicalWeekdays.length !== weekdays.length
    || canonicalWeekdays.some((weekday, index) => weekday !== weekdays[index])
  ) {
    errors.push("$.schedule.weekdays must be in canonical weekday order.");
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
        "$.schedule count_only mode requires no weekdays and any-day flexibility.",
      );
    }
  } else {
    errors.push("$.schedule.dayConstraint is invalid.");
  }
  const sessionMinutes = asRecord(
    schedule.sessionMinutes,
    "$.schedule.sessionMinutes",
    errors,
  );
  if (sessionMinutes) {
    validateExactKeys(
      sessionMinutes,
      ["hardMaximum", "target"],
      "$.schedule.sessionMinutes",
      errors,
    );
    if (
      !isPositiveInteger(sessionMinutes.target)
      || !isPositiveInteger(sessionMinutes.hardMaximum)
    ) {
      errors.push("$.schedule.sessionMinutes values must be positive integers.");
    } else if (sessionMinutes.target > sessionMinutes.hardMaximum) {
      errors.push(
        "$.schedule.sessionMinutes.target cannot exceed hardMaximum.",
      );
    }
  }
  return schedule as SessionAllocationScheduleV1;
}

function validateAssignments(
  value: unknown,
  sessionIndex: number,
  errors: string[],
) {
  if (!Array.isArray(value)) {
    errors.push(`$.sessions[${sessionIndex}].exerciseAssignments must be an array.`);
    return [] as SessionExerciseAssignmentV1[];
  }
  const assignments: SessionExerciseAssignmentV1[] = [];
  value.forEach((entry, assignmentIndex) => {
    const path =
      `$.sessions[${sessionIndex}].exerciseAssignments[${assignmentIndex}]`;
    const assignment = asRecord(entry, path, errors);
    if (!assignment) return;
    validateExactKeys(
      assignment,
      [
        "exerciseId",
        "requirementId",
        "selectionPosition",
        "sessionExercisePosition",
      ],
      path,
      errors,
    );
    if (
      typeof assignment.requirementId !== "string"
      || !REQUIREMENT_ID_PATTERN.test(assignment.requirementId)
    ) {
      errors.push(`${path}.requirementId is invalid.`);
    }
    if (
      typeof assignment.exerciseId !== "string"
      || !EXERCISE_ID_PATTERN.test(assignment.exerciseId)
    ) {
      errors.push(`${path}.exerciseId is invalid.`);
    }
    if (!isPositiveInteger(assignment.selectionPosition)) {
      errors.push(`${path}.selectionPosition must be a positive integer.`);
    }
    if (assignment.sessionExercisePosition !== assignmentIndex + 1) {
      errors.push(
        `${path}.sessionExercisePosition must equal ${assignmentIndex + 1}.`,
      );
    }
    assignments.push(assignment as SessionExerciseAssignmentV1);
  });
  for (let index = 1; index < assignments.length; index += 1) {
    if (
      assignments[index - 1].selectionPosition
      >= assignments[index].selectionPosition
    ) {
      errors.push(
        `$.sessions[${sessionIndex}].exerciseAssignments must follow selection order.`,
      );
      break;
    }
  }
  return assignments;
}

function validateSessions(
  value: unknown,
  schedule: SessionAllocationScheduleV1 | null,
  errors: string[],
) {
  if (!Array.isArray(value)) {
    errors.push("$.sessions must be an array.");
    return [] as AllocatedSessionV1[];
  }
  const sessions: AllocatedSessionV1[] = [];
  value.forEach((entry, index) => {
    const path = `$.sessions[${index}]`;
    const session = asRecord(entry, path, errors);
    if (!session) return;
    validateExactKeys(
      session,
      ["exerciseAssignments", "ordinal", "sessionId", "weekday"],
      path,
      errors,
    );
    if (
      typeof session.sessionId !== "string"
      || !SESSION_ID_PATTERN.test(session.sessionId)
      || session.sessionId !== `session-${index + 1}`
    ) {
      errors.push(`${path}.sessionId must equal session-${index + 1}.`);
    }
    if (session.ordinal !== index + 1) {
      errors.push(`${path}.ordinal must equal ${index + 1}.`);
    }
    const expectedWeekday = schedule?.dayConstraint === "fixed"
      ? schedule.weekdays[index] ?? null
      : null;
    if (session.weekday !== expectedWeekday) {
      errors.push(`${path}.weekday does not match the canonical schedule slot.`);
    }
    const exerciseAssignments = validateAssignments(
      session.exerciseAssignments,
      index,
      errors,
    );
    sessions.push({
      ...(session as Omit<AllocatedSessionV1, "exerciseAssignments">),
      exerciseAssignments,
    });
  });
  if (
    schedule
    && sessions.length !== schedule.requestedDaysPerWeek
  ) {
    errors.push("$.sessions length must equal requestedDaysPerWeek.");
  }
  const flattened = sessions.flatMap((session) => session.exerciseAssignments);
  if (
    new Set(flattened.map((assignment) => assignment.requirementId)).size
    !== flattened.length
  ) {
    errors.push("$.sessions contains duplicate requirement assignments.");
  }
  if (
    new Set(flattened.map((assignment) => assignment.exerciseId)).size
    !== flattened.length
  ) {
    errors.push("$.sessions contains duplicate exercise assignments.");
  }
  const positions = flattened
    .map((assignment) => assignment.selectionPosition)
    .sort((left, right) => left - right);
  if (positions.some((position, index) => position !== index + 1)) {
    errors.push("$.sessions must contain each canonical selection position once.");
  }
  return sessions;
}

function validateObjective(
  value: unknown,
  sessions: AllocatedSessionV1[],
  errors: string[],
): SessionAllocationObjectiveV1 | null {
  if (value === null) return null;
  const objective = asRecord(value, "$.objective", errors);
  if (!objective) return null;
  validateExactKeys(
    objective,
    [
      "exerciseCount",
      "exerciseCountBySession",
      "maximumExerciseCount",
      "minimumExerciseCount",
      "sessionCount",
      "spread",
    ],
    "$.objective",
    errors,
  );
  const counts = sessions.map((session) => session.exerciseAssignments.length);
  const exerciseCount = counts.reduce((sum, count) => sum + count, 0);
  const minimum = counts.length > 0 ? Math.min(...counts) : 0;
  const maximum = counts.length > 0 ? Math.max(...counts) : 0;
  const expected = {
    sessionCount: sessions.length,
    exerciseCount,
    exerciseCountBySession: counts,
    minimumExerciseCount: minimum,
    maximumExerciseCount: maximum,
    spread: maximum - minimum,
  };
  if (objective.sessionCount !== expected.sessionCount) {
    errors.push("$.objective.sessionCount is inconsistent with sessions.");
  }
  if (objective.exerciseCount !== expected.exerciseCount) {
    errors.push("$.objective.exerciseCount is inconsistent with sessions.");
  }
  if (
    !Array.isArray(objective.exerciseCountBySession)
    || objective.exerciseCountBySession.length !== counts.length
    || objective.exerciseCountBySession.some(
      (count, index) => count !== counts[index],
    )
  ) {
    errors.push(
      "$.objective.exerciseCountBySession is inconsistent with sessions.",
    );
  }
  if (objective.minimumExerciseCount !== expected.minimumExerciseCount) {
    errors.push("$.objective.minimumExerciseCount is inconsistent.");
  }
  if (objective.maximumExerciseCount !== expected.maximumExerciseCount) {
    errors.push("$.objective.maximumExerciseCount is inconsistent.");
  }
  if (objective.spread !== expected.spread) {
    errors.push("$.objective.spread is inconsistent.");
  }
  return objective as SessionAllocationObjectiveV1;
}

function validateIssues(
  value: unknown,
  errors: string[],
): SessionAllocationIssueV1[] {
  if (!Array.isArray(value)) {
    errors.push("$.issues must be an array.");
    return [];
  }
  const issues: SessionAllocationIssueV1[] = [];
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
      || !SESSION_ALLOCATION_ISSUE_CODES.includes(
        issue.code as SessionAllocationIssueCode,
      )
    ) {
      errors.push(`${path}.code is invalid.`);
      return;
    }
    const policy =
      SESSION_ALLOCATION_ISSUE_POLICY[issue.code as SessionAllocationIssueCode];
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
    issues.push(issue as SessionAllocationIssueV1);
  });
  if (
    new Set(issues.map((issue) => issue.code)).size !== issues.length
  ) {
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

export function buildSessionAllocationSemanticProjection(
  value: Omit<SessionAllocationV1, "allocationDigest"> | SessionAllocationV1,
) {
  const { allocationDigest: _allocationDigest, ...projection } =
    value as SessionAllocationV1;
  return projection;
}

export function digestSessionAllocation(
  value: Omit<SessionAllocationV1, "allocationDigest"> | SessionAllocationV1,
) {
  return digestCanonicalJson(
    buildSessionAllocationSemanticProjection(value),
  );
}

export function validateSessionAllocationV1(value: unknown) {
  const errors: string[] = [];
  const root = asRecord(value, "$", errors);
  if (!root) return errors;
  validateExactKeys(root, ROOT_KEYS, "$", errors);
  if (root.schemaVersion !== SESSION_ALLOCATION_SCHEMA_VERSION) {
    errors.push(
      `$.schemaVersion must equal ${SESSION_ALLOCATION_SCHEMA_VERSION}.`,
    );
  }
  if (root.compilerVersion !== SESSION_ALLOCATION_COMPILER_VERSION) {
    errors.push(
      `$.compilerVersion must equal ${SESSION_ALLOCATION_COMPILER_VERSION}.`,
    );
  }
  if (root.policyVersion !== SESSION_ALLOCATION_POLICY_VERSION) {
    errors.push(
      `$.policyVersion must equal ${SESSION_ALLOCATION_POLICY_VERSION}.`,
    );
  }
  const input = validateInput(root.input, errors);
  const status = root.status as SessionAllocationStatus;
  if (!SESSION_ALLOCATION_STATUSES.includes(status)) {
    errors.push("$.status is invalid.");
  }
  const schedule = validateSchedule(root.schedule, errors);
  const sessions = validateSessions(root.sessions, schedule, errors);
  const objective = validateObjective(root.objective, sessions, errors);
  const issues = validateIssues(root.issues, errors);
  if (
    typeof root.allocationDigest !== "string"
    || !DIGEST_PATTERN.test(root.allocationDigest)
  ) {
    errors.push("$.allocationDigest must be a lowercase SHA-256 digest.");
  }
  if (input && SESSION_ALLOCATION_STATUSES.includes(status)) {
    validateBoundInputIdentity(input, status, errors);
  }

  if (status === "allocated") {
    if (
      input?.coverageStatus !== "ready"
      || input?.rankingStatus !== "ready"
      || input?.selectionStatus !== "selected"
    ) {
      errors.push(
        "$.status allocated requires ready coverage/ranking and selected selection.",
      );
    }
    if (!schedule || sessions.length === 0 || objective === null) {
      errors.push("$.status allocated requires schedule, sessions, and objective.");
    }
    if (sessions.some((session) => session.exerciseAssignments.length === 0)) {
      errors.push("$.status allocated cannot contain an empty session.");
    }
    if (objective && objective.spread > 1) {
      errors.push("$.status allocated requires balanced session counts.");
    }
    if (issues.length !== 0) {
      errors.push("$.status allocated cannot contain issues.");
    }
  }
  if (status === "not_allocatable") {
    if (input?.selectionStatus === null || input?.selectionStatus === "selected") {
      errors.push(
        "$.status not_allocatable requires a non-selected selection status.",
      );
    }
    if (schedule !== null || sessions.length !== 0 || objective !== null) {
      errors.push(
        "$.status not_allocatable cannot contain schedule, sessions, or objective.",
      );
    }
    if (
      issues.length !== 1
      || issues[0]?.code !== "SELECTION_NOT_READY"
    ) {
      errors.push(
        "$.status not_allocatable requires exactly SELECTION_NOT_READY.",
      );
    }
  }
  if (status === "infeasible") {
    if (input?.selectionStatus !== "selected") {
      errors.push("$.status infeasible requires selected upstream selection.");
    }
    if (!schedule || sessions.length !== 0 || objective !== null) {
      errors.push(
        "$.status infeasible requires schedule and no sessions or objective.",
      );
    }
    if (
      issues.length !== 1
      || issues[0]?.code !== "SESSION_COUNT_EXCEEDS_SELECTIONS"
    ) {
      errors.push(
        "$.status infeasible requires exactly SESSION_COUNT_EXCEEDS_SELECTIONS.",
      );
    }
  }
  if (status === "invalid_input") {
    if (schedule !== null || sessions.length !== 0 || objective !== null) {
      errors.push(
        "$.status invalid_input cannot contain schedule, sessions, or objective.",
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
    typeof root.allocationDigest === "string"
    && DIGEST_PATTERN.test(root.allocationDigest)
  ) {
    try {
      const expectedDigest = digestSessionAllocation(
        value as SessionAllocationV1,
      );
      if (expectedDigest !== root.allocationDigest) {
        errors.push(
          "$.allocationDigest does not match the semantic allocation projection.",
        );
      }
    } catch {
      errors.push(
        "$.allocationDigest could not be recomputed from the supplied value.",
      );
    }
  }
  return errors;
}

export function validateSessionAllocationV1WithReceipt(
  value: unknown,
): SessionAllocationRuntimeValidationReceiptV1 {
  const record = (
    value
    && typeof value === "object"
    && !Array.isArray(value)
  )
    ? value as Record<string, unknown>
    : null;
  const errors = validateSessionAllocationV1(value);
  return {
    validatorVersion: SESSION_ALLOCATION_RUNTIME_VALIDATOR_VERSION,
    schemaVersion:
      record?.schemaVersion === SESSION_ALLOCATION_SCHEMA_VERSION
        ? SESSION_ALLOCATION_SCHEMA_VERSION
        : null,
    allocationDigest:
      typeof record?.allocationDigest === "string"
      && DIGEST_PATTERN.test(record.allocationDigest)
        ? record.allocationDigest
        : null,
    valid: errors.length === 0,
    errors,
  };
}

export const SESSION_ALLOCATION_BOUND_INPUT_VERSIONS = Object.freeze({
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
});
