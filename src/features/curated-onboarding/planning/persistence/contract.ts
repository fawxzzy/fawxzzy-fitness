import {
  NORMALIZED_PLANNING_INTAKE_VERSION,
  CURATED_NORMALIZER_VERSION,
  validateNormalizedPlanningIntakeV1,
  type NormalizedPlanningIntakeV1,
} from "../contract.ts";
import {
  EXERCISE_CATALOG_SCHEMA_VERSION,
  EXERCISE_CATALOG_VERSION,
  PRESCRIPTION_POLICY_VERSION,
  RESTRICTION_TAXONOMY_VERSION,
  type SubstitutionRuleV1,
} from "../catalog/contract.ts";
import {
  CANDIDATE_RANKING_REASON_CODES,
  CANDIDATE_RANKING_REASON_POLICY,
  CANDIDATE_RANKING_SCORE_COMPONENT_KEYS,
  type RankedExerciseCandidateV1,
} from "../ranking/contract.ts";
import { digestCanonicalJson } from "../canonical.ts";
import {
  ROUTINE_ASSEMBLY_COMPILER_VERSION,
  ROUTINE_ASSEMBLY_ISSUE_CODES,
  ROUTINE_ASSEMBLY_POLICY_VERSION,
  ROUTINE_ASSEMBLY_SCHEMA_VERSION,
  ROUTINE_ASSEMBLY_STATUSES,
  validateRoutineAssemblyV1WithReceipt,
  type RoutineAssemblyExerciseV1,
  type RoutineAssemblyIssueCode,
  type RoutineAssemblySessionV1,
  type RoutineAssemblyStatus,
  type RoutineAssemblyV1,
  type RoutinePlanEnvelopeV1,
} from "../assembly/contract.ts";

export const PERSISTENCE_INTENT_SCHEMA_VERSION =
  "fitness.routine-persistence-intent.v1" as const;
export const PERSISTENCE_INTENT_COMPILER_VERSION =
  "fitness.routine-persistence-intent-compiler.2026-07-29.v1" as const;
export const PERSISTENCE_INTENT_POLICY_VERSION =
  "fitness.routine-persistence-intent-policy.2026-07-29.v1" as const;
export const PERSISTENCE_INTENT_RUNTIME_VALIDATOR_VERSION =
  "fitness.routine-persistence-intent-validator.2026-07-29.v1" as const;

export const PERSISTENCE_INTENT_STATUSES = [
  "ready_to_create",
  "not_creatable",
  "infeasible",
  "invalid_input",
] as const;

export const PERSISTENCE_INTENT_ISSUE_CLASSES = [
  "invalid",
  "not_creatable",
  "infeasible",
] as const;

export const PERSISTENCE_INTENT_ISSUE_CODES = [
  "ASSEMBLY_INFEASIBLE",
  "ASSEMBLY_INPUT_MISMATCH",
  "ASSEMBLY_INVALID",
  "ASSEMBLY_NOT_READY",
  "PLANNING_INVALID",
  "REQUEST_CONTEXT_INVALID",
] as const;

export type PersistenceIntentStatus =
  typeof PERSISTENCE_INTENT_STATUSES[number];
export type PersistenceIntentIssueClass =
  typeof PERSISTENCE_INTENT_ISSUE_CLASSES[number];
export type PersistenceIntentIssueCode =
  typeof PERSISTENCE_INTENT_ISSUE_CODES[number];

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
  }
  return value;
}

export const PERSISTENCE_INTENT_ISSUE_POLICY = deepFreeze({
  ASSEMBLY_INFEASIBLE: {
    issueClass: "infeasible",
    path: "/assembly/status",
  },
  ASSEMBLY_INPUT_MISMATCH: {
    issueClass: "invalid",
    path: "/assembly/assemblyDigest",
  },
  ASSEMBLY_INVALID: {
    issueClass: "invalid",
    path: "/assembly",
  },
  ASSEMBLY_NOT_READY: {
    issueClass: "not_creatable",
    path: "/assembly/status",
  },
  PLANNING_INVALID: {
    issueClass: "invalid",
    path: "/planning",
  },
  REQUEST_CONTEXT_INVALID: {
    issueClass: "invalid",
    path: "/request",
  },
} as const satisfies Record<
  PersistenceIntentIssueCode,
  {
    issueClass: PersistenceIntentIssueClass;
    path: `/${string}`;
  }
>);

export type PersistenceRequestContextV1 = {
  userId: string;
  generationRequestId: string;
  creationMode: "create_only";
  activationMode: "deferred";
};

export type PersistenceRequestIdentityV1 = {
  userId: string | null;
  generationRequestId: string | null;
  creationMode: "create_only" | null;
  activationMode: "deferred" | null;
  uniquenessKey: string | null;
};

export type PersistenceCatalogPolicyIdentityV1 = {
  schemaVersion: typeof EXERCISE_CATALOG_SCHEMA_VERSION | null;
  catalogVersion: typeof EXERCISE_CATALOG_VERSION | null;
  restrictionTaxonomyVersion: typeof RESTRICTION_TAXONOMY_VERSION | null;
  prescriptionPolicyVersion: typeof PRESCRIPTION_POLICY_VERSION | null;
  catalogDigest: string | null;
};

export type PersistenceRankingExplanationV1 =
  RankedExerciseCandidateV1 & {
    requirementId: string;
  };

export type PersistenceExerciseRecordV1 = {
  recordId: string;
  routineRecordId: string;
  sessionRecordId: string;
  sessionId: string;
  prescription: RoutineAssemblyExerciseV1;
  rankingExplanation: PersistenceRankingExplanationV1 | null;
  substitutionRules: SubstitutionRuleV1[];
  warmup: null;
};

export type PersistenceSessionRecordV1 = {
  recordId: string;
  routineRecordId: string;
  sessionId: string;
  ordinal: number;
  weekday: RoutineAssemblySessionV1["weekday"];
  timeBudget: RoutineAssemblySessionV1["timeBudget"];
  exerciseRecordIds: string[];
};

export type PersistenceRoutineRecordV1 = {
  recordId: string;
  userId: string;
  generationRequestId: string;
  uniquenessKey: string;
  assemblyDigest: string;
  routineDigest: string;
  schedule: RoutinePlanEnvelopeV1["schedule"];
  summary: RoutinePlanEnvelopeV1["summary"];
  sessionRecordIds: string[];
  activationState: "not_requested";
};

export type PersistenceRecordGraphV1 = {
  routine: PersistenceRoutineRecordV1;
  sessions: PersistenceSessionRecordV1[];
  exercises: PersistenceExerciseRecordV1[];
};

export type RoutineCreationIntentV1 = {
  operation: "create_routine";
  activationMode: "deferred";
  records: PersistenceRecordGraphV1;
};

export type PersistenceIntentIssueV1 = {
  code: PersistenceIntentIssueCode;
  issueClass: PersistenceIntentIssueClass;
  path: `/${string}`;
  values: string[];
};

export type RoutinePersistenceIntentV1 = {
  schemaVersion: typeof PERSISTENCE_INTENT_SCHEMA_VERSION;
  compilerVersion: typeof PERSISTENCE_INTENT_COMPILER_VERSION;
  policyVersion: typeof PERSISTENCE_INTENT_POLICY_VERSION;
  request: PersistenceRequestIdentityV1;
  planning: NormalizedPlanningIntakeV1 | null;
  catalogPolicy: PersistenceCatalogPolicyIdentityV1;
  assembly: RoutineAssemblyV1 | null;
  status: PersistenceIntentStatus;
  creation: RoutineCreationIntentV1 | null;
  issues: PersistenceIntentIssueV1[];
  intentDigest: string;
};

export type PersistenceIntentRuntimeValidationReceiptV1 = {
  validatorVersion: typeof PERSISTENCE_INTENT_RUNTIME_VALIDATOR_VERSION;
  schemaVersion: typeof PERSISTENCE_INTENT_SCHEMA_VERSION | null;
  intentDigest: string | null;
  valid: boolean;
  errors: string[];
};

const DIGEST_PATTERN = /^[a-f0-9]{64}$/;
const REQUEST_IDENTIFIER_PATTERN =
  /^[a-z0-9](?:[a-z0-9._:-]{0,126}[a-z0-9])?$/;

const ROOT_KEYS = [
  "assembly",
  "catalogPolicy",
  "compilerVersion",
  "creation",
  "intentDigest",
  "issues",
  "planning",
  "policyVersion",
  "request",
  "schemaVersion",
  "status",
] as const;
const REQUEST_KEYS = [
  "activationMode",
  "creationMode",
  "generationRequestId",
  "uniquenessKey",
  "userId",
] as const;
const CATALOG_POLICY_KEYS = [
  "catalogDigest",
  "catalogVersion",
  "prescriptionPolicyVersion",
  "restrictionTaxonomyVersion",
  "schemaVersion",
] as const;
const CREATION_KEYS = ["activationMode", "operation", "records"] as const;
const RECORD_GRAPH_KEYS = ["exercises", "routine", "sessions"] as const;
const ROUTINE_RECORD_KEYS = [
  "activationState",
  "assemblyDigest",
  "generationRequestId",
  "recordId",
  "routineDigest",
  "schedule",
  "sessionRecordIds",
  "summary",
  "uniquenessKey",
  "userId",
] as const;
const SESSION_RECORD_KEYS = [
  "exerciseRecordIds",
  "ordinal",
  "recordId",
  "routineRecordId",
  "sessionId",
  "timeBudget",
  "weekday",
] as const;
const EXERCISE_RECORD_KEYS = [
  "prescription",
  "rankingExplanation",
  "recordId",
  "routineRecordId",
  "sessionId",
  "sessionRecordId",
  "substitutionRules",
  "warmup",
] as const;
const RANKED_EXPLANATION_KEYS = [
  "curatedRank",
  "exerciseId",
  "reasonCodes",
  "requirementId",
  "scoreComponents",
  "totalScore",
] as const;
const SUBSTITUTION_RULE_KEYS = [
  "candidateExerciseIds",
  "equivalenceClassId",
  "id",
  "reasonCode",
  "sourceExerciseId",
] as const;
const ISSUE_KEYS = ["code", "issueClass", "path", "values"] as const;

function canonicalCompare(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalStrings(values: Iterable<string>) {
  return [...new Set([...values].filter(Boolean))].sort(canonicalCompare);
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

function validateCanonicalStrings(
  value: unknown,
  path: string,
  errors: string[],
) {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array.`);
    return [] as string[];
  }
  const strings = value.filter(
    (entry): entry is string =>
      typeof entry === "string" && entry.length > 0,
  );
  if (strings.length !== value.length) {
    errors.push(`${path} must contain non-empty strings.`);
  }
  if (
    new Set(strings).size !== strings.length
    || [...strings].sort(canonicalCompare).some(
      (entry, index) => entry !== strings[index],
    )
  ) {
    errors.push(`${path} must contain unique canonical strings.`);
  }
  return strings;
}

function validateUniqueStrings(
  value: unknown,
  path: string,
  errors: string[],
) {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array.`);
    return [] as string[];
  }
  const strings = value.filter(
    (entry): entry is string =>
      typeof entry === "string" && entry.length > 0,
  );
  if (strings.length !== value.length) {
    errors.push(`${path} must contain non-empty strings.`);
  }
  if (new Set(strings).size !== strings.length) {
    errors.push(`${path} must contain unique strings.`);
  }
  return strings;
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

function stableEqual(left: unknown, right: unknown) {
  return digestCanonicalJson(left) === digestCanonicalJson(right);
}

export function derivePersistenceUniquenessKeyV1(
  userId: string,
  generationRequestId: string,
) {
  return digestCanonicalJson({
    generationRequestId,
    scope: "user_generation_request",
    userId,
  });
}

export function deriveRoutineRecordIdV1(uniquenessKey: string) {
  return digestCanonicalJson({
    kind: "routine",
    uniquenessKey,
  });
}

export function deriveSessionRecordIdV1(
  routineRecordId: string,
  sessionId: string,
) {
  return digestCanonicalJson({
    kind: "session",
    routineRecordId,
    sessionId,
  });
}

export function deriveExerciseRecordIdV1(
  sessionRecordId: string,
  prescription: Pick<
    RoutineAssemblyExerciseV1,
    "exerciseId" | "requirementId" | "selectionPosition"
      | "sessionExercisePosition"
  >,
) {
  return digestCanonicalJson({
    exerciseId: prescription.exerciseId,
    kind: "exercise",
    requirementId: prescription.requirementId,
    selectionPosition: prescription.selectionPosition,
    sessionExercisePosition: prescription.sessionExercisePosition,
    sessionRecordId,
  });
}

export function digestPersistedRoutineV1(
  routine: RoutinePlanEnvelopeV1,
) {
  return digestCanonicalJson(routine);
}

function validateRequest(
  value: unknown,
  errors: string[],
): PersistenceRequestIdentityV1 | null {
  const request = asRecord(value, "$.request", errors);
  if (!request) return null;
  validateExactKeys(request, REQUEST_KEYS, "$.request", errors);
  for (const key of ["userId", "generationRequestId"] as const) {
    const entry = request[key];
    if (
      entry !== null
      && (
        typeof entry !== "string"
        || !REQUEST_IDENTIFIER_PATTERN.test(entry)
      )
    ) {
      errors.push(`$.request.${key} must be a canonical identifier or null.`);
    }
  }
  if (
    request.creationMode !== null
    && request.creationMode !== "create_only"
  ) {
    errors.push("$.request.creationMode must equal create_only or null.");
  }
  if (
    request.activationMode !== null
    && request.activationMode !== "deferred"
  ) {
    errors.push("$.request.activationMode must equal deferred or null.");
  }
  validateNullableDigest(
    request.uniquenessKey,
    "$.request.uniquenessKey",
    errors,
  );
  if (
    typeof request.userId === "string"
    && REQUEST_IDENTIFIER_PATTERN.test(request.userId)
    && typeof request.generationRequestId === "string"
    && REQUEST_IDENTIFIER_PATTERN.test(request.generationRequestId)
  ) {
    const expected = derivePersistenceUniquenessKeyV1(
      request.userId,
      request.generationRequestId,
    );
    if (request.uniquenessKey !== expected) {
      errors.push(
        "$.request.uniquenessKey must match userId plus generationRequestId.",
      );
    }
  } else if (request.uniquenessKey !== null) {
    errors.push(
      "$.request.uniquenessKey must be null when either request identifier is invalid.",
    );
  }
  return request as unknown as PersistenceRequestIdentityV1;
}

function hasCompleteRequest(
  request: PersistenceRequestIdentityV1 | null,
): request is PersistenceRequestIdentityV1 & {
  userId: string;
  generationRequestId: string;
  creationMode: "create_only";
  activationMode: "deferred";
  uniquenessKey: string;
} {
  return Boolean(
    request
    && typeof request.userId === "string"
    && REQUEST_IDENTIFIER_PATTERN.test(request.userId)
    && typeof request.generationRequestId === "string"
    && REQUEST_IDENTIFIER_PATTERN.test(request.generationRequestId)
    && request.creationMode === "create_only"
    && request.activationMode === "deferred"
    && typeof request.uniquenessKey === "string"
    && DIGEST_PATTERN.test(request.uniquenessKey),
  );
}

function validateCatalogPolicy(
  value: unknown,
  errors: string[],
): PersistenceCatalogPolicyIdentityV1 | null {
  const policy = asRecord(value, "$.catalogPolicy", errors);
  if (!policy) return null;
  validateExactKeys(
    policy,
    CATALOG_POLICY_KEYS,
    "$.catalogPolicy",
    errors,
  );
  const expected = {
    schemaVersion: EXERCISE_CATALOG_SCHEMA_VERSION,
    catalogVersion: EXERCISE_CATALOG_VERSION,
    restrictionTaxonomyVersion: RESTRICTION_TAXONOMY_VERSION,
    prescriptionPolicyVersion: PRESCRIPTION_POLICY_VERSION,
  } as const;
  for (const [key, expectedValue] of Object.entries(expected)) {
    const actual = policy[key];
    if (
      actual !== null
      && (
        typeof actual !== "string"
        || actual.length === 0
        || actual !== expectedValue
      )
    ) {
      errors.push(
        `$.catalogPolicy.${key} must equal ${expectedValue} or null.`,
      );
    }
  }
  validateNullableDigest(
    policy.catalogDigest,
    "$.catalogPolicy.catalogDigest",
    errors,
  );
  return policy as unknown as PersistenceCatalogPolicyIdentityV1;
}

function hasCompleteCatalogPolicy(
  policy: PersistenceCatalogPolicyIdentityV1 | null,
) {
  return Boolean(
    policy
    && policy.schemaVersion === EXERCISE_CATALOG_SCHEMA_VERSION
    && policy.catalogVersion === EXERCISE_CATALOG_VERSION
    && policy.restrictionTaxonomyVersion === RESTRICTION_TAXONOMY_VERSION
    && policy.prescriptionPolicyVersion === PRESCRIPTION_POLICY_VERSION
    && typeof policy.catalogDigest === "string"
    && DIGEST_PATTERN.test(policy.catalogDigest),
  );
}

function validateRankingExplanation(
  value: unknown,
  path: string,
  errors: string[],
): PersistenceRankingExplanationV1 | null {
  if (value === null) return null;
  const explanation = asRecord(value, path, errors);
  if (!explanation) return null;
  validateExactKeys(
    explanation,
    RANKED_EXPLANATION_KEYS,
    path,
    errors,
  );
  for (const key of ["requirementId", "exerciseId"] as const) {
    if (
      typeof explanation[key] !== "string"
      || explanation[key].length === 0
    ) {
      errors.push(`${path}.${key} must be a non-empty string.`);
    }
  }
  for (const key of ["totalScore", "curatedRank"] as const) {
    if (
      typeof explanation[key] !== "number"
      || !Number.isInteger(explanation[key])
      || (key === "curatedRank" && (explanation[key] as number) < 1)
    ) {
      errors.push(
        `${path}.${key} must be ${key === "curatedRank" ? "a positive " : "an "}integer.`,
      );
    }
  }
  const components = asRecord(
    explanation.scoreComponents,
    `${path}.scoreComponents`,
    errors,
  );
  if (components) {
    validateExactKeys(
      components,
      CANDIDATE_RANKING_SCORE_COMPONENT_KEYS,
      `${path}.scoreComponents`,
      errors,
    );
    for (const key of CANDIDATE_RANKING_SCORE_COMPONENT_KEYS) {
      if (
        typeof components[key] !== "number"
        || !Number.isInteger(components[key])
      ) {
        errors.push(
          `${path}.scoreComponents.${key} must be an integer.`,
        );
      }
    }
  }
  const reasons = Array.isArray(explanation.reasonCodes)
    ? explanation.reasonCodes
    : [];
  if (!Array.isArray(explanation.reasonCodes)) {
    errors.push(`${path}.reasonCodes must be an array.`);
  } else if (
    reasons.length !== CANDIDATE_RANKING_SCORE_COMPONENT_KEYS.length
    || new Set(reasons).size !== reasons.length
  ) {
    errors.push(
      `${path}.reasonCodes must contain one unique reason per score component.`,
    );
  }
  reasons.forEach((reason, index) => {
    if (
      typeof reason !== "string"
      || !CANDIDATE_RANKING_REASON_CODES.includes(
        reason as typeof CANDIDATE_RANKING_REASON_CODES[number],
      )
    ) {
      errors.push(`${path}.reasonCodes[${index}] is invalid.`);
      return;
    }
    const component = CANDIDATE_RANKING_SCORE_COMPONENT_KEYS[index];
    const policy = CANDIDATE_RANKING_REASON_POLICY[
      reason as keyof typeof CANDIDATE_RANKING_REASON_POLICY
    ];
    if (policy.component !== component) {
      errors.push(
        `${path}.reasonCodes[${index}] must govern ${component}.`,
      );
    }
    if (components && components[component] !== policy.score) {
      errors.push(
        `${path}.scoreComponents.${component} must equal ${policy.score}.`,
      );
    }
  });
  if (components && typeof explanation.totalScore === "number") {
    const expected = CANDIDATE_RANKING_SCORE_COMPONENT_KEYS.reduce(
      (total, key) => (
        total + (
          typeof components[key] === "number" ? components[key] as number : 0
        )
      ),
      0,
    );
    if (explanation.totalScore !== expected) {
      errors.push(`${path}.totalScore must equal the component sum.`);
    }
  }
  return explanation as unknown as PersistenceRankingExplanationV1;
}

function validateSubstitutionRules(
  value: unknown,
  path: string,
  sourceExerciseId: string | null,
  errors: string[],
): SubstitutionRuleV1[] {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array.`);
    return [];
  }
  const rules: SubstitutionRuleV1[] = [];
  value.forEach((entry, index) => {
    const itemPath = `${path}[${index}]`;
    const rule = asRecord(entry, itemPath, errors);
    if (!rule) return;
    validateExactKeys(
      rule,
      SUBSTITUTION_RULE_KEYS,
      itemPath,
      errors,
    );
    for (
      const key of ["id", "equivalenceClassId", "sourceExerciseId"] as const
    ) {
      if (typeof rule[key] !== "string" || rule[key].length === 0) {
        errors.push(`${itemPath}.${key} must be a non-empty string.`);
      }
    }
    if (
      rule.reasonCode !== "EQUIPMENT_ALTERNATIVE"
      && rule.reasonCode !== "RESTRICTION_ALTERNATIVE"
    ) {
      errors.push(`${itemPath}.reasonCode is invalid.`);
    }
    const candidates = validateCanonicalStrings(
      rule.candidateExerciseIds,
      `${itemPath}.candidateExerciseIds`,
      errors,
    );
    if (candidates.length === 0) {
      errors.push(
        `${itemPath}.candidateExerciseIds must not be empty.`,
      );
    }
    if (
      typeof rule.sourceExerciseId === "string"
      && candidates.includes(rule.sourceExerciseId)
    ) {
      errors.push(
        `${itemPath}.candidateExerciseIds cannot contain the source exercise.`,
      );
    }
    if (
      sourceExerciseId !== null
      && rule.sourceExerciseId !== sourceExerciseId
    ) {
      errors.push(
        `${itemPath}.sourceExerciseId must match the persisted exercise.`,
      );
    }
    rules.push(rule as unknown as SubstitutionRuleV1);
  });
  if (
    [...rules].sort((left, right) => canonicalCompare(left.id, right.id))
      .some((entry, index) => entry !== rules[index])
  ) {
    errors.push(`${path} must use canonical rule-id order.`);
  }
  if (new Set(rules.map((entry) => entry.id)).size !== rules.length) {
    errors.push(`${path} cannot contain duplicate rule ids.`);
  }
  return rules;
}

function validateIssues(
  value: unknown,
  errors: string[],
): PersistenceIntentIssueV1[] {
  if (!Array.isArray(value)) {
    errors.push("$.issues must be an array.");
    return [];
  }
  const issues: PersistenceIntentIssueV1[] = [];
  value.forEach((entry, index) => {
    const path = `$.issues[${index}]`;
    const issue = asRecord(entry, path, errors);
    if (!issue) return;
    validateExactKeys(issue, ISSUE_KEYS, path, errors);
    const code = issue.code as PersistenceIntentIssueCode;
    if (!PERSISTENCE_INTENT_ISSUE_CODES.includes(code)) {
      errors.push(`${path}.code is invalid.`);
      return;
    }
    const policy = PERSISTENCE_INTENT_ISSUE_POLICY[code];
    if (issue.issueClass !== policy.issueClass) {
      errors.push(
        `${path}.issueClass must equal ${policy.issueClass} for ${code}.`,
      );
    }
    if (issue.path !== policy.path) {
      errors.push(`${path}.path must equal ${policy.path} for ${code}.`);
    }
    const values = validateCanonicalStrings(
      issue.values,
      `${path}.values`,
      errors,
    );
    if (
      (code === "ASSEMBLY_NOT_READY" || code === "ASSEMBLY_INFEASIBLE")
      && (
        values.length === 0
        || values.some(
          (item) => !ROUTINE_ASSEMBLY_ISSUE_CODES.includes(
            item as RoutineAssemblyIssueCode,
          ),
        )
      )
    ) {
      errors.push(
        `${path}.values must contain closed Routine Assembly issue evidence.`,
      );
    }
    issues.push(entry as PersistenceIntentIssueV1);
  });
  if (
    [...issues].sort((left, right) => canonicalCompare(left.code, right.code))
      .some((entry, index) => entry !== issues[index])
  ) {
    errors.push("$.issues must be in canonical code order.");
  }
  if (new Set(issues.map((entry) => entry.code)).size !== issues.length) {
    errors.push("$.issues cannot contain duplicate codes.");
  }
  return issues;
}

export function reconstructRoutineFromPersistenceRecordsV1(
  records: PersistenceRecordGraphV1,
): RoutinePlanEnvelopeV1 {
  const exerciseById = new Map(
    records.exercises.map((entry) => [entry.recordId, entry]),
  );
  return {
    schedule: structuredClone(records.routine.schedule),
    sessions: records.sessions.map((session) => ({
      sessionId: session.sessionId,
      ordinal: session.ordinal,
      weekday: session.weekday,
      exercises: session.exerciseRecordIds.map(
        (recordId) => structuredClone(exerciseById.get(recordId)!.prescription),
      ),
      timeBudget: structuredClone(session.timeBudget),
    })),
    summary: structuredClone(records.routine.summary),
  };
}

function validateCreation(
  value: unknown,
  request: PersistenceRequestIdentityV1 | null,
  assembly: RoutineAssemblyV1 | null,
  errors: string[],
): RoutineCreationIntentV1 | null {
  if (value === null) return null;
  const creation = asRecord(value, "$.creation", errors);
  if (!creation) return null;
  validateExactKeys(creation, CREATION_KEYS, "$.creation", errors);
  if (creation.operation !== "create_routine") {
    errors.push("$.creation.operation must equal create_routine.");
  }
  if (creation.activationMode !== "deferred") {
    errors.push("$.creation.activationMode must equal deferred.");
  }
  const records = asRecord(creation.records, "$.creation.records", errors);
  if (!records) return creation as unknown as RoutineCreationIntentV1;
  validateExactKeys(
    records,
    RECORD_GRAPH_KEYS,
    "$.creation.records",
    errors,
  );
  const routine = asRecord(
    records.routine,
    "$.creation.records.routine",
    errors,
  );
  if (routine) {
    validateExactKeys(
      routine,
      ROUTINE_RECORD_KEYS,
      "$.creation.records.routine",
      errors,
    );
    for (
      const key of [
        "recordId",
        "userId",
        "generationRequestId",
        "uniquenessKey",
        "assemblyDigest",
        "routineDigest",
      ] as const
    ) {
      if (typeof routine[key] !== "string" || routine[key].length === 0) {
        errors.push(
          `$.creation.records.routine.${key} must be a non-empty string.`,
        );
      }
    }
    for (
      const key of [
        "recordId",
        "uniquenessKey",
        "assemblyDigest",
        "routineDigest",
      ] as const
    ) {
      if (
        typeof routine[key] === "string"
        && !DIGEST_PATTERN.test(routine[key] as string)
      ) {
        errors.push(
          `$.creation.records.routine.${key} must be a lowercase SHA-256 digest.`,
        );
      }
    }
    if (routine.activationState !== "not_requested") {
      errors.push(
        "$.creation.records.routine.activationState must equal not_requested.",
      );
    }
    validateUniqueStrings(
      routine.sessionRecordIds,
      "$.creation.records.routine.sessionRecordIds",
      errors,
    );
  }

  const rawSessions = Array.isArray(records.sessions)
    ? records.sessions
    : [];
  if (!Array.isArray(records.sessions)) {
    errors.push("$.creation.records.sessions must be an array.");
  }
  const sessions: PersistenceSessionRecordV1[] = [];
  rawSessions.forEach((entry, index) => {
    const path = `$.creation.records.sessions[${index}]`;
    const session = asRecord(entry, path, errors);
    if (!session) return;
    validateExactKeys(session, SESSION_RECORD_KEYS, path, errors);
    for (
      const key of ["recordId", "routineRecordId", "sessionId"] as const
    ) {
      if (
        typeof session[key] !== "string"
        || (session[key] as string).length === 0
        || (
          key !== "sessionId"
          && !DIGEST_PATTERN.test(session[key] as string)
        )
      ) {
        errors.push(`${path}.${key} is invalid.`);
      }
    }
    if (!Number.isInteger(session.ordinal) || (session.ordinal as number) < 1) {
      errors.push(`${path}.ordinal must be a positive integer.`);
    }
    validateUniqueStrings(
      session.exerciseRecordIds,
      `${path}.exerciseRecordIds`,
      errors,
    );
    sessions.push(session as unknown as PersistenceSessionRecordV1);
  });

  const rawExercises = Array.isArray(records.exercises)
    ? records.exercises
    : [];
  if (!Array.isArray(records.exercises)) {
    errors.push("$.creation.records.exercises must be an array.");
  }
  const exercises: PersistenceExerciseRecordV1[] = [];
  rawExercises.forEach((entry, index) => {
    const path = `$.creation.records.exercises[${index}]`;
    const exercise = asRecord(entry, path, errors);
    if (!exercise) return;
    validateExactKeys(exercise, EXERCISE_RECORD_KEYS, path, errors);
    for (
      const key of [
        "recordId",
        "routineRecordId",
        "sessionRecordId",
        "sessionId",
      ] as const
    ) {
      if (
        typeof exercise[key] !== "string"
        || (exercise[key] as string).length === 0
        || (
          key !== "sessionId"
          && !DIGEST_PATTERN.test(exercise[key] as string)
        )
      ) {
        errors.push(`${path}.${key} is invalid.`);
      }
    }
    const prescription = asRecord(
      exercise.prescription,
      `${path}.prescription`,
      errors,
    );
    const sourceExerciseId =
      typeof prescription?.exerciseId === "string"
        ? prescription.exerciseId
        : null;
    const explanation = validateRankingExplanation(
      exercise.rankingExplanation,
      `${path}.rankingExplanation`,
      errors,
    );
    if (assembly?.status === "assembled" && explanation === null) {
      errors.push(
        `${path}.rankingExplanation is required for a ready creation record.`,
      );
    }
    if (
      explanation
      && prescription
      && (
        explanation.exerciseId !== prescription.exerciseId
        || explanation.requirementId !== prescription.requirementId
      )
    ) {
      errors.push(
        `${path}.rankingExplanation must match the persisted prescription.`,
      );
    }
    validateSubstitutionRules(
      exercise.substitutionRules,
      `${path}.substitutionRules`,
      sourceExerciseId,
      errors,
    );
    if (exercise.warmup !== null) {
      errors.push(`${path}.warmup must be null in v1.`);
    }
    exercises.push(exercise as unknown as PersistenceExerciseRecordV1);
  });

  if (
    new Set(sessions.map((entry) => entry.recordId)).size !== sessions.length
  ) {
    errors.push("$.creation.records.sessions recordIds must be unique.");
  }
  if (
    new Set(exercises.map((entry) => entry.recordId)).size
    !== exercises.length
  ) {
    errors.push("$.creation.records.exercises recordIds must be unique.");
  }

  if (
    routine
    && hasCompleteRequest(request)
    && assembly?.status === "assembled"
    && assembly.routine
  ) {
    const routineRecord = routine as unknown as PersistenceRoutineRecordV1;
    const expectedRoutineId = deriveRoutineRecordIdV1(request.uniquenessKey);
    if (routineRecord.recordId !== expectedRoutineId) {
      errors.push(
        "$.creation.records.routine.recordId must match the uniqueness key.",
      );
    }
    if (
      routineRecord.userId !== request.userId
      || routineRecord.generationRequestId !== request.generationRequestId
      || routineRecord.uniquenessKey !== request.uniquenessKey
    ) {
      errors.push(
        "$.creation.records.routine must preserve the exact request identity.",
      );
    }
    if (routineRecord.assemblyDigest !== assembly.assemblyDigest) {
      errors.push(
        "$.creation.records.routine.assemblyDigest must match the assembly.",
      );
    }
    const expectedRoutineDigest = digestPersistedRoutineV1(assembly.routine);
    if (routineRecord.routineDigest !== expectedRoutineDigest) {
      errors.push(
        "$.creation.records.routine.routineDigest must match the assembled routine.",
      );
    }
    if (
      !stableEqual(routineRecord.schedule, assembly.routine.schedule)
      || !stableEqual(routineRecord.summary, assembly.routine.summary)
    ) {
      errors.push(
        "$.creation.records.routine must preserve schedule and summary.",
      );
    }
    const expectedSessionIds = assembly.routine.sessions.map((session) => (
      deriveSessionRecordIdV1(expectedRoutineId, session.sessionId)
    ));
    if (
      !stableEqual(routineRecord.sessionRecordIds, expectedSessionIds)
      || !stableEqual(
        sessions.map((session) => session.recordId),
        expectedSessionIds,
      )
    ) {
      errors.push(
        "$.creation.records sessions must preserve canonical assembled order.",
      );
    }
    const expectedExerciseIds: string[] = [];
    assembly.routine.sessions.forEach((assembledSession, sessionIndex) => {
      const session = sessions[sessionIndex];
      const expectedSessionRecordId = expectedSessionIds[sessionIndex];
      if (!session) {
        errors.push(
          `$.creation.records.sessions[${sessionIndex}] is missing.`,
        );
        return;
      }
      const expectedExerciseRecordIds = assembledSession.exercises.map(
        (prescription) => (
          deriveExerciseRecordIdV1(expectedSessionRecordId, prescription)
        ),
      );
      expectedExerciseIds.push(...expectedExerciseRecordIds);
      if (
        session.recordId !== expectedSessionRecordId
        || session.routineRecordId !== expectedRoutineId
        || session.sessionId !== assembledSession.sessionId
        || session.ordinal !== assembledSession.ordinal
        || session.weekday !== assembledSession.weekday
        || !stableEqual(session.timeBudget, assembledSession.timeBudget)
        || !stableEqual(
          session.exerciseRecordIds,
          expectedExerciseRecordIds,
        )
      ) {
        errors.push(
          `$.creation.records.sessions[${sessionIndex}] must preserve the assembled session.`,
        );
      }
    });
    if (
      !stableEqual(
        exercises.map((exercise) => exercise.recordId),
        expectedExerciseIds,
      )
    ) {
      errors.push(
        "$.creation.records.exercises must preserve canonical assembled order.",
      );
    }
    let exerciseIndex = 0;
    assembly.routine.sessions.forEach((assembledSession, sessionIndex) => {
      assembledSession.exercises.forEach((prescription) => {
        const exercise = exercises[exerciseIndex];
        const expectedSessionRecordId = expectedSessionIds[sessionIndex];
        const expectedExerciseRecordId =
          deriveExerciseRecordIdV1(expectedSessionRecordId, prescription);
        if (
          !exercise
          || exercise.recordId !== expectedExerciseRecordId
          || exercise.routineRecordId !== expectedRoutineId
          || exercise.sessionRecordId !== expectedSessionRecordId
          || exercise.sessionId !== assembledSession.sessionId
          || !stableEqual(exercise.prescription, prescription)
        ) {
          errors.push(
            `$.creation.records.exercises[${exerciseIndex}] must preserve the assembled prescription.`,
          );
        }
        exerciseIndex += 1;
      });
    });
    try {
      const reconstructed = reconstructRoutineFromPersistenceRecordsV1({
        routine: routineRecord,
        sessions,
        exercises,
      });
      if (!stableEqual(reconstructed, assembly.routine)) {
        errors.push(
          "$.creation.records must round-trip to the exact assembled routine.",
        );
      }
    } catch {
      errors.push(
        "$.creation.records could not reconstruct the assembled routine.",
      );
    }
  }
  return creation as unknown as RoutineCreationIntentV1;
}

export function buildPersistenceIntentSemanticProjection(
  value:
    | Omit<RoutinePersistenceIntentV1, "intentDigest">
    | RoutinePersistenceIntentV1,
) {
  const { intentDigest: _intentDigest, ...projection } =
    value as RoutinePersistenceIntentV1;
  return projection;
}

export function digestRoutinePersistenceIntent(
  value:
    | Omit<RoutinePersistenceIntentV1, "intentDigest">
    | RoutinePersistenceIntentV1,
) {
  return digestCanonicalJson(
    buildPersistenceIntentSemanticProjection(value),
  );
}

export function validateRoutinePersistenceIntentV1(value: unknown) {
  const errors: string[] = [];
  const root = asRecord(value, "$", errors);
  if (!root) return errors;
  validateExactKeys(root, ROOT_KEYS, "$", errors);

  if (root.schemaVersion !== PERSISTENCE_INTENT_SCHEMA_VERSION) {
    errors.push(
      `$.schemaVersion must equal ${PERSISTENCE_INTENT_SCHEMA_VERSION}.`,
    );
  }
  if (root.compilerVersion !== PERSISTENCE_INTENT_COMPILER_VERSION) {
    errors.push(
      `$.compilerVersion must equal ${PERSISTENCE_INTENT_COMPILER_VERSION}.`,
    );
  }
  if (root.policyVersion !== PERSISTENCE_INTENT_POLICY_VERSION) {
    errors.push(
      `$.policyVersion must equal ${PERSISTENCE_INTENT_POLICY_VERSION}.`,
    );
  }

  const request = validateRequest(root.request, errors);
  const planning = root.planning === null
    ? null
    : root.planning as NormalizedPlanningIntakeV1;
  if (planning) {
    errors.push(
      ...validateNormalizedPlanningIntakeV1(planning).map(
        (error) => `$.planning must preserve Planning Intake v1: ${error}`,
      ),
    );
  }
  const catalogPolicy = validateCatalogPolicy(root.catalogPolicy, errors);
  const assembly = root.assembly === null
    ? null
    : root.assembly as RoutineAssemblyV1;
  if (assembly) {
    const receipt = validateRoutineAssemblyV1WithReceipt(assembly);
    errors.push(
      ...receipt.errors.map(
        (error) => `$.assembly must preserve Routine Assembly v1: ${error}`,
      ),
    );
  }
  if (
    planning
    && assembly
    && planning.generationProjectionDigest
      !== assembly.input.planningGenerationDigest
  ) {
    errors.push(
      "$.planning.generationProjectionDigest must match the assembly input.",
    );
  }
  if (
    catalogPolicy
    && assembly
    && (
      catalogPolicy.schemaVersion !== assembly.input.catalogSchemaVersion
      || catalogPolicy.catalogVersion !== assembly.input.catalogVersion
      || catalogPolicy.catalogDigest !== assembly.input.catalogDigest
    )
  ) {
    errors.push("$.catalogPolicy must match the assembly catalog identity.");
  }

  const status = root.status as PersistenceIntentStatus;
  if (!PERSISTENCE_INTENT_STATUSES.includes(status)) {
    errors.push("$.status is invalid.");
  }
  const creation = validateCreation(
    root.creation,
    request,
    assembly,
    errors,
  );
  const issues = validateIssues(root.issues, errors);

  if (
    typeof root.intentDigest !== "string"
    || !DIGEST_PATTERN.test(root.intentDigest)
  ) {
    errors.push("$.intentDigest must be a lowercase SHA-256 digest.");
  }

  if (status !== "invalid_input") {
    if (!hasCompleteRequest(request)) {
      errors.push("$.status requires a complete canonical request identity.");
    }
    if (!planning) {
      errors.push("$.status requires a valid Planning Intake v1 value.");
    } else if (
      planning.contractVersion !== NORMALIZED_PLANNING_INTAKE_VERSION
      || planning.source.normalizerVersion !== CURATED_NORMALIZER_VERSION
    ) {
      errors.push("$.planning must contain the bound planning versions.");
    }
    if (!assembly) {
      errors.push("$.status requires a valid Routine Assembly v1 value.");
    }
    if (!hasCompleteCatalogPolicy(catalogPolicy)) {
      errors.push("$.status requires the complete catalog policy identity.");
    }
  }

  if (status === "ready_to_create") {
    if (assembly?.status !== "assembled") {
      errors.push("$.status ready_to_create requires assembled input.");
    }
    if (!creation) {
      errors.push("$.status ready_to_create requires a creation intent.");
    }
    if (issues.length !== 0) {
      errors.push("$.status ready_to_create cannot contain issues.");
    }
  }
  if (status === "not_creatable") {
    if (assembly?.status !== "not_assemblable") {
      errors.push(
        "$.status not_creatable requires not_assemblable input.",
      );
    }
    if (creation !== null) {
      errors.push("$.status not_creatable cannot contain creation records.");
    }
    if (
      issues.length !== 1
      || issues[0]?.code !== "ASSEMBLY_NOT_READY"
    ) {
      errors.push(
        "$.status not_creatable requires exactly ASSEMBLY_NOT_READY.",
      );
    }
    if (
      assembly
      && issues[0]
      && !stableEqual(
        issues[0].values,
        canonicalStrings(assembly.issues.map((entry) => entry.code)),
      )
    ) {
      errors.push(
        "$.issues ASSEMBLY_NOT_READY values must match the assembly issues.",
      );
    }
  }
  if (status === "infeasible") {
    if (assembly?.status !== "infeasible") {
      errors.push("$.status infeasible requires infeasible assembly input.");
    }
    if (creation !== null) {
      errors.push("$.status infeasible cannot contain creation records.");
    }
    if (
      issues.length !== 1
      || issues[0]?.code !== "ASSEMBLY_INFEASIBLE"
    ) {
      errors.push(
        "$.status infeasible requires exactly ASSEMBLY_INFEASIBLE.",
      );
    }
    if (
      assembly
      && issues[0]
      && !stableEqual(
        issues[0].values,
        canonicalStrings(assembly.issues.map((entry) => entry.code)),
      )
    ) {
      errors.push(
        "$.issues ASSEMBLY_INFEASIBLE values must match the assembly issues.",
      );
    }
  }
  if (status === "invalid_input") {
    if (creation !== null) {
      errors.push("$.status invalid_input cannot contain creation records.");
    }
    if (
      issues.length === 0
      || issues.some((issue) => issue.issueClass !== "invalid")
    ) {
      errors.push("$.status invalid_input requires only invalid issues.");
    }
  }

  if (
    typeof root.intentDigest === "string"
    && DIGEST_PATTERN.test(root.intentDigest)
  ) {
    try {
      const expected = digestRoutinePersistenceIntent(
        value as RoutinePersistenceIntentV1,
      );
      if (root.intentDigest !== expected) {
        errors.push(
          "$.intentDigest does not match the semantic persistence projection.",
        );
      }
    } catch {
      errors.push(
        "$.intentDigest could not be recomputed from the supplied value.",
      );
    }
  }
  return errors;
}

export function validateRoutinePersistenceIntentV1WithReceipt(
  value: unknown,
): PersistenceIntentRuntimeValidationReceiptV1 {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  const errors = validateRoutinePersistenceIntentV1(value);
  return {
    validatorVersion: PERSISTENCE_INTENT_RUNTIME_VALIDATOR_VERSION,
    schemaVersion:
      record?.schemaVersion === PERSISTENCE_INTENT_SCHEMA_VERSION
        ? PERSISTENCE_INTENT_SCHEMA_VERSION
        : null,
    intentDigest:
      typeof record?.intentDigest === "string"
      && DIGEST_PATTERN.test(record.intentDigest)
        ? record.intentDigest
        : null,
    valid: errors.length === 0,
    errors,
  };
}

export const PERSISTENCE_INTENT_BOUND_VERSIONS = Object.freeze({
  planningContractVersion: NORMALIZED_PLANNING_INTAKE_VERSION,
  planningNormalizerVersion: CURATED_NORMALIZER_VERSION,
  catalogSchemaVersion: EXERCISE_CATALOG_SCHEMA_VERSION,
  catalogVersion: EXERCISE_CATALOG_VERSION,
  restrictionTaxonomyVersion: RESTRICTION_TAXONOMY_VERSION,
  catalogPrescriptionPolicyVersion: PRESCRIPTION_POLICY_VERSION,
  assemblySchemaVersion: ROUTINE_ASSEMBLY_SCHEMA_VERSION,
  assemblyCompilerVersion: ROUTINE_ASSEMBLY_COMPILER_VERSION,
  assemblyPolicyVersion: ROUTINE_ASSEMBLY_POLICY_VERSION,
});

export const PERSISTENCE_INTENT_BOUND_ASSEMBLY_STATUSES =
  ROUTINE_ASSEMBLY_STATUSES;
