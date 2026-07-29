import { digestCanonicalJson } from "../canonical.ts";
import {
  COVERAGE_STATUSES,
} from "../coverage/contract.ts";
import {
  CANDIDATE_RANKING_STATUSES,
} from "../ranking/contract.ts";
import {
  GLOBAL_SELECTION_STATUSES,
} from "../selection/contract.ts";
import {
  SESSION_ALLOCATION_STATUSES,
  type SessionAllocationScheduleV1,
} from "../allocation/contract.ts";
import {
  SESSION_PRESCRIPTION_BOUND_INPUT_VERSIONS,
  SESSION_PRESCRIPTION_COMPILER_VERSION,
  SESSION_PRESCRIPTION_ISSUE_CODES,
  SESSION_PRESCRIPTION_POLICY_VERSION,
  SESSION_PRESCRIPTION_SCHEMA_VERSION,
  SESSION_PRESCRIPTION_STATUSES,
  validateSessionPrescriptionV1WithReceipt,
  type ExercisePrescriptionV1,
  type PrescribedSessionV1,
  type SessionPrescriptionInputIdentityV1,
  type SessionPrescriptionIssueCode,
  type SessionPrescriptionStatus,
  type SessionPrescriptionSummaryV1,
  type SessionPrescriptionTimeBudgetV1,
  type SessionPrescriptionV1,
} from "../prescription/contract.ts";

export const ROUTINE_ASSEMBLY_SCHEMA_VERSION =
  "fitness.routine-assembly.v1" as const;
export const ROUTINE_ASSEMBLY_COMPILER_VERSION =
  "fitness.routine-assembly-compiler.2026-07-29.v1" as const;
export const ROUTINE_ASSEMBLY_POLICY_VERSION =
  "fitness.routine-assembly-policy.2026-07-29.v1" as const;
export const ROUTINE_ASSEMBLY_RUNTIME_VALIDATOR_VERSION =
  "fitness.routine-assembly-validator.2026-07-29.v1" as const;

export const ROUTINE_ASSEMBLY_STATUSES = [
  "assembled",
  "not_assemblable",
  "infeasible",
  "invalid_input",
] as const;

export const ROUTINE_ASSEMBLY_ISSUE_CLASSES = [
  "invalid",
  "not_assemblable",
  "infeasible",
] as const;

export const ROUTINE_ASSEMBLY_ISSUE_CODES = [
  "PRESCRIPTION_INFEASIBLE",
  "PRESCRIPTION_INPUT_MISMATCH",
  "PRESCRIPTION_INVALID",
  "PRESCRIPTION_NOT_READY",
] as const;

export type RoutineAssemblyStatus =
  typeof ROUTINE_ASSEMBLY_STATUSES[number];
export type RoutineAssemblyIssueClass =
  typeof ROUTINE_ASSEMBLY_ISSUE_CLASSES[number];
export type RoutineAssemblyIssueCode =
  typeof ROUTINE_ASSEMBLY_ISSUE_CODES[number];

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
  }
  return value;
}

export const ROUTINE_ASSEMBLY_ISSUE_POLICY = deepFreeze({
  PRESCRIPTION_INFEASIBLE: {
    issueClass: "infeasible",
    path: "/input/prescriptionStatus",
  },
  PRESCRIPTION_INPUT_MISMATCH: {
    issueClass: "invalid",
    path: "/input/prescriptionDigest",
  },
  PRESCRIPTION_INVALID: {
    issueClass: "invalid",
    path: "/input/prescriptionDigest",
  },
  PRESCRIPTION_NOT_READY: {
    issueClass: "not_assemblable",
    path: "/input/prescriptionStatus",
  },
} as const satisfies Record<
  RoutineAssemblyIssueCode,
  {
    issueClass: RoutineAssemblyIssueClass;
    path: `/${string}`;
  }
>);

export const ROUTINE_ASSEMBLY_UPSTREAM_ISSUE_POLICY = deepFreeze({
  PRESCRIPTION_INFEASIBLE: [
    "TIME_BUDGET_EXCEEDED",
  ],
  PRESCRIPTION_NOT_READY: [
    "ALLOCATION_NOT_READY",
  ],
} as const satisfies Partial<
  Record<RoutineAssemblyIssueCode, readonly SessionPrescriptionIssueCode[]>
>);

export type RoutineAssemblyInputIdentityV1 =
  SessionPrescriptionInputIdentityV1 & {
    prescriptionSchemaVersion: string | null;
    prescriptionCompilerVersion: string | null;
    prescriptionPolicyVersion: string | null;
    prescriptionDigest: string | null;
    prescriptionStatus: SessionPrescriptionStatus | null;
  };

export type RoutineAssemblyExerciseV1 = ExercisePrescriptionV1;

export type RoutineAssemblySessionV1 = {
  sessionId: string;
  ordinal: number;
  weekday: PrescribedSessionV1["weekday"];
  exercises: RoutineAssemblyExerciseV1[];
  timeBudget: SessionPrescriptionTimeBudgetV1;
};

export type RoutinePlanEnvelopeV1 = {
  schedule: SessionAllocationScheduleV1;
  sessions: RoutineAssemblySessionV1[];
  summary: SessionPrescriptionSummaryV1;
};

export type RoutineAssemblyIssueV1 = {
  code: RoutineAssemblyIssueCode;
  issueClass: RoutineAssemblyIssueClass;
  path: `/${string}`;
  values: string[];
};

export type RoutineAssemblyV1 = {
  schemaVersion: typeof ROUTINE_ASSEMBLY_SCHEMA_VERSION;
  compilerVersion: typeof ROUTINE_ASSEMBLY_COMPILER_VERSION;
  policyVersion: typeof ROUTINE_ASSEMBLY_POLICY_VERSION;
  input: RoutineAssemblyInputIdentityV1;
  status: RoutineAssemblyStatus;
  routine: RoutinePlanEnvelopeV1 | null;
  issues: RoutineAssemblyIssueV1[];
  assemblyDigest: string;
};

export type RoutineAssemblyRuntimeValidationReceiptV1 = {
  validatorVersion: typeof ROUTINE_ASSEMBLY_RUNTIME_VALIDATOR_VERSION;
  schemaVersion: typeof ROUTINE_ASSEMBLY_SCHEMA_VERSION | null;
  assemblyDigest: string | null;
  valid: boolean;
  errors: string[];
};

const DIGEST_PATTERN = /^[a-f0-9]{64}$/;

const ROOT_KEYS = [
  "assemblyDigest",
  "compilerVersion",
  "input",
  "issues",
  "policyVersion",
  "routine",
  "schemaVersion",
  "status",
] as const;

const PRESCRIPTION_INPUT_KEYS = [
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
] as const satisfies readonly (keyof SessionPrescriptionInputIdentityV1)[];

const INPUT_KEYS = [
  ...PRESCRIPTION_INPUT_KEYS,
  "prescriptionCompilerVersion",
  "prescriptionDigest",
  "prescriptionPolicyVersion",
  "prescriptionSchemaVersion",
  "prescriptionStatus",
] as const;

const ROUTINE_KEYS = ["schedule", "sessions", "summary"] as const;
const SESSION_KEYS = [
  "exercises",
  "ordinal",
  "sessionId",
  "timeBudget",
  "weekday",
] as const;
const ISSUE_KEYS = ["code", "issueClass", "path", "values"] as const;

function canonicalCompare(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

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
  const actual = Object.keys(value).sort(canonicalCompare);
  const canonicalExpected = [...expected].sort(canonicalCompare);
  if (
    actual.length !== canonicalExpected.length
    || actual.some((key, index) => key !== canonicalExpected[index])
  ) {
    errors.push(
      `${path} must contain exactly: ${canonicalExpected.join(", ")}.`,
    );
  }
}

function validateNullableString(
  value: unknown,
  path: string,
  errors: string[],
) {
  if (value !== null && (typeof value !== "string" || value.length === 0)) {
    errors.push(`${path} must be a non-empty string or null.`);
  }
}

function validateNullableDigest(
  value: unknown,
  path: string,
  errors: string[],
) {
  if (
    value !== null
    && (typeof value !== "string" || !DIGEST_PATTERN.test(value))
  ) {
    errors.push(`${path} must be a lowercase SHA-256 digest or null.`);
  }
}

function validateNullableStatus<T extends string>(
  value: unknown,
  allowed: readonly T[],
  path: string,
  errors: string[],
) {
  if (
    value !== null
    && (
      typeof value !== "string"
      || !allowed.includes(value as T)
    )
  ) {
    errors.push(`${path} is invalid.`);
  }
}

function validateInput(
  value: unknown,
  errors: string[],
): RoutineAssemblyInputIdentityV1 | null {
  const input = asRecord(value, "$.input", errors);
  if (!input) return null;
  validateExactKeys(input, INPUT_KEYS, "$.input", errors);

  const digestKeys = [
    "allocationDigest",
    "catalogDigest",
    "coverageDigest",
    "planningGenerationDigest",
    "prescriptionDigest",
    "rankingDigest",
    "selectionDigest",
  ] as const;
  const statusKeys = new Set([
    "allocationStatus",
    "coverageStatus",
    "prescriptionStatus",
    "rankingStatus",
    "selectionStatus",
  ]);
  for (const key of INPUT_KEYS) {
    if (digestKeys.includes(key as typeof digestKeys[number])) {
      validateNullableDigest(input[key], `$.input.${key}`, errors);
    } else if (!statusKeys.has(key)) {
      validateNullableString(input[key], `$.input.${key}`, errors);
    }
  }

  validateNullableStatus(
    input.coverageStatus,
    COVERAGE_STATUSES,
    "$.input.coverageStatus",
    errors,
  );
  validateNullableStatus(
    input.rankingStatus,
    CANDIDATE_RANKING_STATUSES,
    "$.input.rankingStatus",
    errors,
  );
  validateNullableStatus(
    input.selectionStatus,
    GLOBAL_SELECTION_STATUSES,
    "$.input.selectionStatus",
    errors,
  );
  validateNullableStatus(
    input.allocationStatus,
    SESSION_ALLOCATION_STATUSES,
    "$.input.allocationStatus",
    errors,
  );
  validateNullableStatus(
    input.prescriptionStatus,
    SESSION_PRESCRIPTION_STATUSES,
    "$.input.prescriptionStatus",
    errors,
  );

  const expectedVersions = {
    ...SESSION_PRESCRIPTION_BOUND_INPUT_VERSIONS,
    prescriptionSchemaVersion: SESSION_PRESCRIPTION_SCHEMA_VERSION,
    prescriptionCompilerVersion: SESSION_PRESCRIPTION_COMPILER_VERSION,
    prescriptionPolicyVersion: SESSION_PRESCRIPTION_POLICY_VERSION,
  } as const;
  for (const [key, expected] of Object.entries(expectedVersions)) {
    const actual = input[key];
    if (actual !== null && actual !== expected) {
      errors.push(`$.input.${key} must equal ${expected} when present.`);
    }
  }
  return input as RoutineAssemblyInputIdentityV1;
}

function validateIssues(
  value: unknown,
  errors: string[],
): RoutineAssemblyIssueV1[] {
  if (!Array.isArray(value)) {
    errors.push("$.issues must be an array.");
    return [];
  }
  const issues: RoutineAssemblyIssueV1[] = [];
  value.forEach((entry, index) => {
    const path = `$.issues[${index}]`;
    const issue = asRecord(entry, path, errors);
    if (!issue) return;
    validateExactKeys(issue, ISSUE_KEYS, path, errors);
    const code = issue.code as RoutineAssemblyIssueCode;
    if (!ROUTINE_ASSEMBLY_ISSUE_CODES.includes(code)) {
      errors.push(`${path}.code is invalid.`);
      return;
    }
    const policy = ROUTINE_ASSEMBLY_ISSUE_POLICY[code];
    if (issue.issueClass !== policy.issueClass) {
      errors.push(
        `${path}.issueClass must equal ${policy.issueClass} for ${code}.`,
      );
    }
    if (issue.path !== policy.path) {
      errors.push(`${path}.path must equal ${policy.path} for ${code}.`);
    }
    const values = Array.isArray(issue.values) ? issue.values : [];
    if (!Array.isArray(issue.values)) {
      errors.push(`${path}.values must be an array.`);
    } else {
      if (
        values.some((item) => typeof item !== "string" || item.length === 0)
      ) {
        errors.push(`${path}.values must contain non-empty strings.`);
      }
      if (
        new Set(values).size !== values.length
        || [...values].sort(canonicalCompare).some(
          (item, itemIndex) => item !== values[itemIndex],
        )
      ) {
        errors.push(`${path}.values must contain unique canonical strings.`);
      }
    }
    const allowedUpstreamCodes = (
      ROUTINE_ASSEMBLY_UPSTREAM_ISSUE_POLICY[
        code as keyof typeof ROUTINE_ASSEMBLY_UPSTREAM_ISSUE_POLICY
      ] as readonly string[] | undefined
    );
    if (allowedUpstreamCodes) {
      if (values.length === 0) {
        errors.push(
          `${path}.values must contain upstream Session Prescription issue evidence.`,
        );
      } else if (
        values.some(
          (item) => (
            typeof item !== "string"
            || !SESSION_PRESCRIPTION_ISSUE_CODES.includes(
              item as SessionPrescriptionIssueCode,
            )
            || !allowedUpstreamCodes.includes(item)
          ),
        )
      ) {
        errors.push(
          `${path}.values contains an issue code not permitted for ${code}.`,
        );
      }
    }
    issues.push(entry as RoutineAssemblyIssueV1);
  });
  if (
    [...issues].sort((left, right) => (
      canonicalCompare(left.code, right.code)
    )).some((issue, index) => issue !== issues[index])
  ) {
    errors.push("$.issues must be in canonical code order.");
  }
  if (new Set(issues.map((entry) => entry.code)).size !== issues.length) {
    errors.push("$.issues cannot contain duplicate codes.");
  }
  return issues;
}

function prescriptionInputFromAssembly(
  input: Record<string, unknown>,
): SessionPrescriptionInputIdentityV1 {
  return Object.fromEntries(
    PRESCRIPTION_INPUT_KEYS.map((key) => [key, input[key] ?? null]),
  ) as SessionPrescriptionInputIdentityV1;
}

function validateRoutine(
  value: unknown,
  input: Record<string, unknown> | null,
  errors: string[],
): RoutinePlanEnvelopeV1 | null {
  if (value === null) return null;
  const routine = asRecord(value, "$.routine", errors);
  if (!routine) return null;
  validateExactKeys(routine, ROUTINE_KEYS, "$.routine", errors);

  const rawSessions = Array.isArray(routine.sessions)
    ? routine.sessions
    : [];
  if (!Array.isArray(routine.sessions)) {
    errors.push("$.routine.sessions must be an array.");
  }
  rawSessions.forEach((entry, index) => {
    const session = asRecord(
      entry,
      `$.routine.sessions[${index}]`,
      errors,
    );
    if (session) {
      validateExactKeys(
        session,
        SESSION_KEYS,
        `$.routine.sessions[${index}]`,
        errors,
      );
    }
  });
  if (!input) return routine as unknown as RoutinePlanEnvelopeV1;

  const reconstructed: SessionPrescriptionV1 = {
    schemaVersion:
      input.prescriptionSchemaVersion as typeof SESSION_PRESCRIPTION_SCHEMA_VERSION,
    compilerVersion:
      input.prescriptionCompilerVersion as typeof SESSION_PRESCRIPTION_COMPILER_VERSION,
    policyVersion:
      input.prescriptionPolicyVersion as typeof SESSION_PRESCRIPTION_POLICY_VERSION,
    input: prescriptionInputFromAssembly(input),
    status: input.prescriptionStatus as SessionPrescriptionStatus,
    schedule: routine.schedule as SessionAllocationScheduleV1,
    sessions: rawSessions.map((entry) => {
      const session =
        entry && typeof entry === "object" && !Array.isArray(entry)
          ? entry as Record<string, unknown>
          : {};
      return {
        sessionId: session.sessionId,
        ordinal: session.ordinal,
        weekday: session.weekday,
        exercisePrescriptions:
          session.exercises as PrescribedSessionV1["exercisePrescriptions"],
        timeBudget: session.timeBudget,
      } as PrescribedSessionV1;
    }),
    summary: routine.summary as SessionPrescriptionSummaryV1,
    issues: [],
    prescriptionDigest: input.prescriptionDigest as string,
  };
  const receipt = validateSessionPrescriptionV1WithReceipt(reconstructed);
  if (!receipt.valid) {
    errors.push(
      ...receipt.errors.map(
        (error) => `$.routine must preserve Prescription v1: ${error}`,
      ),
    );
  }
  return routine as unknown as RoutinePlanEnvelopeV1;
}

function hasExactBoundIdentity(input: RoutineAssemblyInputIdentityV1) {
  const expected = {
    ...SESSION_PRESCRIPTION_BOUND_INPUT_VERSIONS,
    prescriptionSchemaVersion: SESSION_PRESCRIPTION_SCHEMA_VERSION,
    prescriptionCompilerVersion: SESSION_PRESCRIPTION_COMPILER_VERSION,
    prescriptionPolicyVersion: SESSION_PRESCRIPTION_POLICY_VERSION,
  } as const;
  return Object.entries(expected).every(
    ([key, value]) => input[key as keyof RoutineAssemblyInputIdentityV1]
      === value,
  ) && [
    input.planningGenerationDigest,
    input.catalogDigest,
    input.coverageDigest,
    input.rankingDigest,
    input.selectionDigest,
    input.allocationDigest,
    input.prescriptionDigest,
  ].every((value) => typeof value === "string" && DIGEST_PATTERN.test(value));
}

export function buildRoutineAssemblySemanticProjection(
  value: Omit<RoutineAssemblyV1, "assemblyDigest"> | RoutineAssemblyV1,
) {
  const { assemblyDigest: _assemblyDigest, ...projection } =
    value as RoutineAssemblyV1;
  return projection;
}

export function digestRoutineAssembly(
  value: Omit<RoutineAssemblyV1, "assemblyDigest"> | RoutineAssemblyV1,
) {
  return digestCanonicalJson(buildRoutineAssemblySemanticProjection(value));
}

export function validateRoutineAssemblyV1(value: unknown) {
  const errors: string[] = [];
  const root = asRecord(value, "$", errors);
  if (!root) return errors;
  validateExactKeys(root, ROOT_KEYS, "$", errors);

  if (root.schemaVersion !== ROUTINE_ASSEMBLY_SCHEMA_VERSION) {
    errors.push(
      `$.schemaVersion must equal ${ROUTINE_ASSEMBLY_SCHEMA_VERSION}.`,
    );
  }
  if (root.compilerVersion !== ROUTINE_ASSEMBLY_COMPILER_VERSION) {
    errors.push(
      `$.compilerVersion must equal ${ROUTINE_ASSEMBLY_COMPILER_VERSION}.`,
    );
  }
  if (root.policyVersion !== ROUTINE_ASSEMBLY_POLICY_VERSION) {
    errors.push(
      `$.policyVersion must equal ${ROUTINE_ASSEMBLY_POLICY_VERSION}.`,
    );
  }

  const input = validateInput(root.input, errors);
  const status = root.status as RoutineAssemblyStatus;
  if (!ROUTINE_ASSEMBLY_STATUSES.includes(status)) {
    errors.push("$.status is invalid.");
  }
  const routine = validateRoutine(
    root.routine,
    input as unknown as Record<string, unknown> | null,
    errors,
  );
  const issues = validateIssues(root.issues, errors);

  if (
    typeof root.assemblyDigest !== "string"
    || !DIGEST_PATTERN.test(root.assemblyDigest)
  ) {
    errors.push("$.assemblyDigest must be a lowercase SHA-256 digest.");
  }

  if (input && status !== "invalid_input" && !hasExactBoundIdentity(input)) {
    errors.push(
      "$.input must contain the complete bound version and digest identity.",
    );
  }

  if (status === "assembled") {
    if (input?.prescriptionStatus !== "prescribed") {
      errors.push("$.status assembled requires prescribed upstream input.");
    }
    if (!routine) {
      errors.push("$.status assembled requires a routine.");
    }
    if (issues.length !== 0) {
      errors.push("$.status assembled cannot contain issues.");
    }
  }
  if (status === "not_assemblable") {
    if (input?.prescriptionStatus !== "not_prescribable") {
      errors.push(
        "$.status not_assemblable requires not_prescribable upstream input.",
      );
    }
    if (routine !== null) {
      errors.push("$.status not_assemblable cannot contain a routine.");
    }
    if (
      issues.length !== 1
      || issues[0]?.code !== "PRESCRIPTION_NOT_READY"
    ) {
      errors.push(
        "$.status not_assemblable requires exactly PRESCRIPTION_NOT_READY.",
      );
    }
  }
  if (status === "infeasible") {
    if (input?.prescriptionStatus !== "infeasible") {
      errors.push("$.status infeasible requires infeasible upstream input.");
    }
    if (routine !== null) {
      errors.push("$.status infeasible cannot contain a routine.");
    }
    if (
      issues.length !== 1
      || issues[0]?.code !== "PRESCRIPTION_INFEASIBLE"
    ) {
      errors.push(
        "$.status infeasible requires exactly PRESCRIPTION_INFEASIBLE.",
      );
    }
  }
  if (status === "invalid_input") {
    if (routine !== null) {
      errors.push("$.status invalid_input cannot contain a routine.");
    }
    if (
      issues.length === 0
      || issues.some((issue) => issue.issueClass !== "invalid")
    ) {
      errors.push("$.status invalid_input requires only invalid issues.");
    }
  }

  if (
    typeof root.assemblyDigest === "string"
    && DIGEST_PATTERN.test(root.assemblyDigest)
  ) {
    try {
      const expectedDigest = digestRoutineAssembly(
        value as RoutineAssemblyV1,
      );
      if (expectedDigest !== root.assemblyDigest) {
        errors.push(
          "$.assemblyDigest does not match the semantic assembly projection.",
        );
      }
    } catch {
      errors.push(
        "$.assemblyDigest could not be recomputed from the supplied value.",
      );
    }
  }
  return errors;
}

export function validateRoutineAssemblyV1WithReceipt(
  value: unknown,
): RoutineAssemblyRuntimeValidationReceiptV1 {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  const errors = validateRoutineAssemblyV1(value);
  return {
    validatorVersion: ROUTINE_ASSEMBLY_RUNTIME_VALIDATOR_VERSION,
    schemaVersion:
      record?.schemaVersion === ROUTINE_ASSEMBLY_SCHEMA_VERSION
        ? ROUTINE_ASSEMBLY_SCHEMA_VERSION
        : null,
    assemblyDigest:
      typeof record?.assemblyDigest === "string"
      && DIGEST_PATTERN.test(record.assemblyDigest)
        ? record.assemblyDigest
        : null,
    valid: errors.length === 0,
    errors,
  };
}

export const ROUTINE_ASSEMBLY_BOUND_INPUT_VERSIONS = Object.freeze({
  ...SESSION_PRESCRIPTION_BOUND_INPUT_VERSIONS,
  prescriptionSchemaVersion: SESSION_PRESCRIPTION_SCHEMA_VERSION,
  prescriptionCompilerVersion: SESSION_PRESCRIPTION_COMPILER_VERSION,
  prescriptionPolicyVersion: SESSION_PRESCRIPTION_POLICY_VERSION,
});
