import { digestCanonicalJson } from "../canonical.ts";
import {
  CURATED_NORMALIZER_VERSION,
  NORMALIZED_PLANNING_INTAKE_VERSION,
} from "../contract.ts";
import {
  EXERCISE_CATALOG_SCHEMA_VERSION,
  EXERCISE_CATALOG_VERSION,
} from "../catalog/contract.ts";
import {
  COVERAGE_COMPILER_VERSION,
  COVERAGE_POLICY_VERSION,
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

export const GLOBAL_SELECTION_SCHEMA_VERSION =
  "fitness.global-selection.v1" as const;
export const GLOBAL_SELECTION_COMPILER_VERSION =
  "fitness.global-selection-compiler.2026-07-28.v1" as const;
export const GLOBAL_SELECTION_POLICY_VERSION =
  "fitness.global-selection-policy.2026-07-28.v1" as const;
export const GLOBAL_SELECTION_RUNTIME_VALIDATOR_VERSION =
  "fitness.global-selection-validator.2026-07-28.v1" as const;

export const GLOBAL_SELECTION_STATUSES = [
  "selected",
  "not_selectable",
  "infeasible",
  "invalid_input",
] as const;
export const GLOBAL_SELECTION_ISSUE_CLASSES = [
  "invalid",
  "not_selectable",
  "infeasible",
] as const;
export const GLOBAL_SELECTION_ISSUE_CODES = [
  "CATALOG_INVALID",
  "COVERAGE_INPUT_MISMATCH",
  "COVERAGE_INVALID",
  "INTAKE_INVALID",
  "RANKING_INPUT_MISMATCH",
  "RANKING_INVALID",
  "RANKING_NOT_READY",
  "SELECTION_SEARCH_LIMIT_EXCEEDED",
  "UNIQUE_ASSIGNMENT_UNAVAILABLE",
] as const;

export type GlobalSelectionStatus =
  typeof GLOBAL_SELECTION_STATUSES[number];
export type GlobalSelectionIssueClass =
  typeof GLOBAL_SELECTION_ISSUE_CLASSES[number];
export type GlobalSelectionIssueCode =
  typeof GLOBAL_SELECTION_ISSUE_CODES[number];

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
  }
  return value;
}

export const GLOBAL_SELECTION_ISSUE_POLICY = deepFreeze({
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
  RANKING_NOT_READY: {
    issueClass: "not_selectable",
    path: "/input/ranking/status",
  },
  SELECTION_SEARCH_LIMIT_EXCEEDED: {
    issueClass: "infeasible",
    path: "/selections",
  },
  UNIQUE_ASSIGNMENT_UNAVAILABLE: {
    issueClass: "infeasible",
    path: "/selections",
  },
} as const satisfies Record<
  GlobalSelectionIssueCode,
  { issueClass: GlobalSelectionIssueClass; path: `/${string}` }
>);

export type GlobalSelectionInputIdentityV1 = {
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
};

export type SelectedExerciseV1 = {
  requirementId: string;
  exerciseId: string;
  rankingPosition: number;
  candidateScore: number;
  curatedRank: number;
};

export type GlobalSelectionObjectiveV1 = {
  requirementCount: number;
  totalScore: number;
  tieBreakVector: number[];
};

export type GlobalSelectionIssueV1 = {
  code: GlobalSelectionIssueCode;
  issueClass: GlobalSelectionIssueClass;
  path: `/${string}`;
  values: string[];
};

export type GlobalSelectionV1 = {
  schemaVersion: typeof GLOBAL_SELECTION_SCHEMA_VERSION;
  compilerVersion: typeof GLOBAL_SELECTION_COMPILER_VERSION;
  policyVersion: typeof GLOBAL_SELECTION_POLICY_VERSION;
  input: GlobalSelectionInputIdentityV1;
  status: GlobalSelectionStatus;
  selections: SelectedExerciseV1[];
  objective: GlobalSelectionObjectiveV1 | null;
  issues: GlobalSelectionIssueV1[];
  selectionDigest: string;
};

export type GlobalSelectionRuntimeValidationReceiptV1 = {
  validatorVersion: typeof GLOBAL_SELECTION_RUNTIME_VALIDATOR_VERSION;
  schemaVersion: typeof GLOBAL_SELECTION_SCHEMA_VERSION | null;
  selectionDigest: string | null;
  valid: boolean;
  errors: string[];
};

const DIGEST_PATTERN = /^[a-f0-9]{64}$/;
const IDENTIFIER_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REQUIREMENT_ID_PATTERN = /^coverage:[a-z0-9_]+$/;
const ROOT_KEYS = [
  "schemaVersion",
  "compilerVersion",
  "policyVersion",
  "input",
  "status",
  "selections",
  "objective",
  "issues",
  "selectionDigest",
] as const;
const INPUT_KEYS = [
  "planningContractVersion",
  "planningNormalizerVersion",
  "planningGenerationDigest",
  "catalogSchemaVersion",
  "catalogVersion",
  "catalogDigest",
  "coverageSchemaVersion",
  "coverageCompilerVersion",
  "coveragePolicyVersion",
  "coverageDigest",
  "coverageStatus",
  "rankingSchemaVersion",
  "rankingCompilerVersion",
  "rankingPolicyVersion",
  "rankingDigest",
  "rankingStatus",
] as const;
const SELECTION_KEYS = [
  "requirementId",
  "exerciseId",
  "rankingPosition",
  "candidateScore",
  "curatedRank",
] as const;
const OBJECTIVE_KEYS = [
  "requirementCount",
  "totalScore",
  "tieBreakVector",
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
    errors.push(`${path} must contain exactly: ${canonicalExpected.join(", ")}.`);
  }
}

function readNullableString(
  value: unknown,
  path: string,
  errors: string[],
) {
  if (value === null) return null;
  if (typeof value !== "string" || value.length === 0) {
    errors.push(`${path} must be null or a non-empty string.`);
    return null;
  }
  return value;
}

function readNullableDigest(
  value: unknown,
  path: string,
  errors: string[],
) {
  if (value === null) return null;
  if (typeof value !== "string" || !DIGEST_PATTERN.test(value)) {
    errors.push(`${path} must be null or a lowercase SHA-256 digest.`);
    return null;
  }
  return value;
}

function readCanonicalStringArray(
  value: unknown,
  path: string,
  errors: string[],
) {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array.`);
    return [] as string[];
  }
  const result: string[] = [];
  value.forEach((entry, index) => {
    if (typeof entry !== "string" || entry.length === 0) {
      errors.push(`${path}[${index}] must be a non-empty string.`);
    } else {
      result.push(entry);
    }
  });
  const canonical = [...new Set(result)].sort(canonicalCompare);
  if (
    canonical.length !== result.length
    || canonical.some((entry, index) => entry !== result[index])
  ) {
    errors.push(`${path} must be unique and canonically ordered.`);
  }
  return result;
}

function validateInput(
  value: unknown,
  errors: string[],
): GlobalSelectionInputIdentityV1 | null {
  const input = asRecord(value, "$.input", errors);
  if (!input) return null;
  validateExactKeys(input, INPUT_KEYS, "$.input", errors);

  const coverageStatus = input.coverageStatus;
  if (
    coverageStatus !== null
    && !COVERAGE_STATUSES.includes(coverageStatus as CoverageStatus)
  ) {
    errors.push("$.input.coverageStatus must be null or a valid coverage status.");
  }
  const rankingStatus = input.rankingStatus;
  if (
    rankingStatus !== null
    && !CANDIDATE_RANKING_STATUSES.includes(
      rankingStatus as CandidateRankingStatus,
    )
  ) {
    errors.push("$.input.rankingStatus must be null or a valid ranking status.");
  }

  return {
    planningContractVersion: readNullableString(
      input.planningContractVersion,
      "$.input.planningContractVersion",
      errors,
    ),
    planningNormalizerVersion: readNullableString(
      input.planningNormalizerVersion,
      "$.input.planningNormalizerVersion",
      errors,
    ),
    planningGenerationDigest: readNullableDigest(
      input.planningGenerationDigest,
      "$.input.planningGenerationDigest",
      errors,
    ),
    catalogSchemaVersion: readNullableString(
      input.catalogSchemaVersion,
      "$.input.catalogSchemaVersion",
      errors,
    ),
    catalogVersion: readNullableString(
      input.catalogVersion,
      "$.input.catalogVersion",
      errors,
    ),
    catalogDigest: readNullableDigest(
      input.catalogDigest,
      "$.input.catalogDigest",
      errors,
    ),
    coverageSchemaVersion: readNullableString(
      input.coverageSchemaVersion,
      "$.input.coverageSchemaVersion",
      errors,
    ),
    coverageCompilerVersion: readNullableString(
      input.coverageCompilerVersion,
      "$.input.coverageCompilerVersion",
      errors,
    ),
    coveragePolicyVersion: readNullableString(
      input.coveragePolicyVersion,
      "$.input.coveragePolicyVersion",
      errors,
    ),
    coverageDigest: readNullableDigest(
      input.coverageDigest,
      "$.input.coverageDigest",
      errors,
    ),
    coverageStatus: COVERAGE_STATUSES.includes(
      coverageStatus as CoverageStatus,
    )
      ? coverageStatus as CoverageStatus
      : null,
    rankingSchemaVersion: readNullableString(
      input.rankingSchemaVersion,
      "$.input.rankingSchemaVersion",
      errors,
    ),
    rankingCompilerVersion: readNullableString(
      input.rankingCompilerVersion,
      "$.input.rankingCompilerVersion",
      errors,
    ),
    rankingPolicyVersion: readNullableString(
      input.rankingPolicyVersion,
      "$.input.rankingPolicyVersion",
      errors,
    ),
    rankingDigest: readNullableDigest(
      input.rankingDigest,
      "$.input.rankingDigest",
      errors,
    ),
    rankingStatus: CANDIDATE_RANKING_STATUSES.includes(
      rankingStatus as CandidateRankingStatus,
    )
      ? rankingStatus as CandidateRankingStatus
      : null,
  };
}

function validateSelections(value: unknown, errors: string[]) {
  if (!Array.isArray(value)) {
    errors.push("$.selections must be an array.");
    return [] as SelectedExerciseV1[];
  }
  const selections: SelectedExerciseV1[] = [];
  value.forEach((entry, index) => {
    const path = `$.selections[${index}]`;
    const selection = asRecord(entry, path, errors);
    if (!selection) return;
    validateExactKeys(selection, SELECTION_KEYS, path, errors);

    const requirementId = selection.requirementId;
    if (
      typeof requirementId !== "string"
      || !REQUIREMENT_ID_PATTERN.test(requirementId)
    ) {
      errors.push(`${path}.requirementId must be a canonical coverage ID.`);
    }
    const exerciseId = selection.exerciseId;
    if (
      typeof exerciseId !== "string"
      || !IDENTIFIER_PATTERN.test(exerciseId)
    ) {
      errors.push(`${path}.exerciseId must be a canonical identifier.`);
    }
    const rankingPosition = selection.rankingPosition;
    if (!Number.isInteger(rankingPosition) || Number(rankingPosition) < 1) {
      errors.push(`${path}.rankingPosition must be a positive integer.`);
    }
    const candidateScore = selection.candidateScore;
    if (!Number.isInteger(candidateScore)) {
      errors.push(`${path}.candidateScore must be an integer.`);
    }
    const curatedRank = selection.curatedRank;
    if (!Number.isInteger(curatedRank) || Number(curatedRank) < 1) {
      errors.push(`${path}.curatedRank must be a positive integer.`);
    }

    selections.push({
      requirementId: typeof requirementId === "string" ? requirementId : "",
      exerciseId: typeof exerciseId === "string" ? exerciseId : "",
      rankingPosition: Number.isInteger(rankingPosition)
        ? Number(rankingPosition)
        : 0,
      candidateScore: Number.isInteger(candidateScore)
        ? Number(candidateScore)
        : 0,
      curatedRank: Number.isInteger(curatedRank) ? Number(curatedRank) : 0,
    });
  });

  const requirementIds = selections.map((entry) => entry.requirementId);
  if (new Set(requirementIds).size !== selections.length) {
    errors.push("$.selections must contain unique requirement IDs.");
  }
  const exerciseIds = selections.map((entry) => entry.exerciseId);
  if (new Set(exerciseIds).size !== selections.length) {
    errors.push("$.selections must contain globally unique exercise IDs.");
  }
  const canonicalRequirementIds = [...requirementIds].sort(canonicalCompare);
  if (
    canonicalRequirementIds.some(
      (requirementId, index) => requirementId !== requirementIds[index],
    )
  ) {
    errors.push("$.selections must be canonically ordered by requirement ID.");
  }
  return selections;
}

function validateObjective(
  value: unknown,
  selections: SelectedExerciseV1[],
  errors: string[],
) {
  if (value === null) return null;
  const objective = asRecord(value, "$.objective", errors);
  if (!objective) return null;
  validateExactKeys(objective, OBJECTIVE_KEYS, "$.objective", errors);

  const requirementCount = objective.requirementCount;
  if (!Number.isInteger(requirementCount) || Number(requirementCount) < 1) {
    errors.push("$.objective.requirementCount must be a positive integer.");
  }
  const totalScore = objective.totalScore;
  if (!Number.isInteger(totalScore)) {
    errors.push("$.objective.totalScore must be an integer.");
  }
  const rawVector = objective.tieBreakVector;
  const tieBreakVector: number[] = [];
  if (!Array.isArray(rawVector)) {
    errors.push("$.objective.tieBreakVector must be an array.");
  } else {
    rawVector.forEach((entry, index) => {
      if (!Number.isInteger(entry) || Number(entry) < 1) {
        errors.push(
          `$.objective.tieBreakVector[${index}] must be a positive integer.`,
        );
      } else {
        tieBreakVector.push(Number(entry));
      }
    });
  }

  if (requirementCount !== selections.length) {
    errors.push(
      "$.objective.requirementCount must equal the selection count.",
    );
  }
  const expectedScore = selections.reduce(
    (sum, selection) => sum + selection.candidateScore,
    0,
  );
  if (totalScore !== expectedScore) {
    errors.push("$.objective.totalScore must equal the selected score sum.");
  }
  const expectedVector = selections.map(
    (selection) => selection.rankingPosition,
  );
  if (
    tieBreakVector.length !== expectedVector.length
    || tieBreakVector.some((entry, index) => entry !== expectedVector[index])
  ) {
    errors.push(
      "$.objective.tieBreakVector must equal the canonical selection positions.",
    );
  }

  return {
    requirementCount: Number.isInteger(requirementCount)
      ? Number(requirementCount)
      : 0,
    totalScore: Number.isInteger(totalScore) ? Number(totalScore) : 0,
    tieBreakVector,
  };
}

function issueKey(issue: GlobalSelectionIssueV1) {
  return [issue.code, issue.values.join("|")].join("|");
}

function validateIssues(value: unknown, errors: string[]) {
  if (!Array.isArray(value)) {
    errors.push("$.issues must be an array.");
    return [] as GlobalSelectionIssueV1[];
  }
  const issues: GlobalSelectionIssueV1[] = [];
  value.forEach((entry, index) => {
    const path = `$.issues[${index}]`;
    const issue = asRecord(entry, path, errors);
    if (!issue) return;
    validateExactKeys(issue, ISSUE_KEYS, path, errors);
    const code = issue.code;
    if (
      typeof code !== "string"
      || !GLOBAL_SELECTION_ISSUE_CODES.includes(code as GlobalSelectionIssueCode)
    ) {
      errors.push(`${path}.code is invalid.`);
      return;
    }
    const policy =
      GLOBAL_SELECTION_ISSUE_POLICY[code as GlobalSelectionIssueCode];
    if (issue.issueClass !== policy.issueClass) {
      errors.push(
        `${path}.issueClass must equal ${policy.issueClass} for ${code}.`,
      );
    }
    if (issue.path !== policy.path) {
      errors.push(`${path}.path must equal ${policy.path} for ${code}.`);
    }
    issues.push({
      code: code as GlobalSelectionIssueCode,
      issueClass: policy.issueClass,
      path: policy.path,
      values: readCanonicalStringArray(
        issue.values,
        `${path}.values`,
        errors,
      ),
    });
  });
  if (new Set(issues.map(issueKey)).size !== issues.length) {
    errors.push("$.issues must be unique.");
  }
  const canonical = [...issues].sort((left, right) =>
    canonicalCompare(issueKey(left), issueKey(right)));
  if (
    canonical.length !== issues.length
    || canonical.some(
      (issue, index) => issueKey(issue) !== issueKey(issues[index]),
    )
  ) {
    errors.push("$.issues must be unique and canonically ordered.");
  }
  return issues;
}

function validateBoundInputIdentity(
  input: GlobalSelectionInputIdentityV1,
  status: GlobalSelectionStatus,
  errors: string[],
) {
  if (status === "invalid_input") return;
  const expected = {
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
  } as const;
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
  ] as const) {
    const digest = input[key];
    if (typeof digest !== "string" || !DIGEST_PATTERN.test(digest)) {
      errors.push(`$.input.${key} must be present for ${status}.`);
    }
  }
}

export function buildGlobalSelectionSemanticProjection(
  value: Omit<GlobalSelectionV1, "selectionDigest"> | GlobalSelectionV1,
) {
  const { selectionDigest: _selectionDigest, ...projection } =
    value as GlobalSelectionV1;
  return projection;
}

export function digestGlobalSelection(
  value: Omit<GlobalSelectionV1, "selectionDigest"> | GlobalSelectionV1,
) {
  return digestCanonicalJson(buildGlobalSelectionSemanticProjection(value));
}

export function validateGlobalSelectionV1(value: unknown) {
  const errors: string[] = [];
  const root = asRecord(value, "$", errors);
  if (!root) return errors;
  validateExactKeys(root, ROOT_KEYS, "$", errors);

  if (root.schemaVersion !== GLOBAL_SELECTION_SCHEMA_VERSION) {
    errors.push(
      `$.schemaVersion must equal ${GLOBAL_SELECTION_SCHEMA_VERSION}.`,
    );
  }
  if (root.compilerVersion !== GLOBAL_SELECTION_COMPILER_VERSION) {
    errors.push(
      `$.compilerVersion must equal ${GLOBAL_SELECTION_COMPILER_VERSION}.`,
    );
  }
  if (root.policyVersion !== GLOBAL_SELECTION_POLICY_VERSION) {
    errors.push(
      `$.policyVersion must equal ${GLOBAL_SELECTION_POLICY_VERSION}.`,
    );
  }

  const input = validateInput(root.input, errors);
  const status = root.status as GlobalSelectionStatus;
  if (!GLOBAL_SELECTION_STATUSES.includes(status)) {
    errors.push("$.status is invalid.");
  }
  const selections = validateSelections(root.selections, errors);
  const objective = validateObjective(root.objective, selections, errors);
  const issues = validateIssues(root.issues, errors);
  if (
    typeof root.selectionDigest !== "string"
    || !DIGEST_PATTERN.test(root.selectionDigest)
  ) {
    errors.push("$.selectionDigest must be a lowercase SHA-256 digest.");
  }

  if (input && GLOBAL_SELECTION_STATUSES.includes(status)) {
    validateBoundInputIdentity(input, status, errors);
  }
  if (status === "selected") {
    if (input?.coverageStatus !== "ready") {
      errors.push("$.status selected requires $.input.coverageStatus ready.");
    }
    if (input?.rankingStatus !== "ready") {
      errors.push("$.status selected requires $.input.rankingStatus ready.");
    }
    if (selections.length === 0 || objective === null) {
      errors.push("$.status selected requires selections and an objective.");
    }
    if (issues.length !== 0) {
      errors.push("$.status selected cannot contain issues.");
    }
  }
  if (status === "not_selectable") {
    if (input?.rankingStatus !== "not_rankable") {
      errors.push(
        "$.status not_selectable requires $.input.rankingStatus not_rankable.",
      );
    }
    if (
      input?.coverageStatus === null
      || input?.coverageStatus === "ready"
    ) {
      errors.push(
        "$.status not_selectable requires a non-ready coverage status.",
      );
    }
    if (selections.length !== 0 || objective !== null) {
      errors.push(
        "$.status not_selectable cannot contain selections or an objective.",
      );
    }
    if (
      issues.length !== 1
      || issues[0]?.code !== "RANKING_NOT_READY"
    ) {
      errors.push(
        "$.status not_selectable requires exactly RANKING_NOT_READY.",
      );
    }
  }
  if (status === "infeasible") {
    if (input?.coverageStatus !== "ready") {
      errors.push("$.status infeasible requires $.input.coverageStatus ready.");
    }
    if (input?.rankingStatus !== "ready") {
      errors.push("$.status infeasible requires $.input.rankingStatus ready.");
    }
    if (selections.length !== 0 || objective !== null) {
      errors.push(
        "$.status infeasible cannot contain selections or an objective.",
      );
    }
    if (
      issues.length !== 1
      || issues[0]?.issueClass !== "infeasible"
    ) {
      errors.push("$.status infeasible requires exactly one infeasible issue.");
    }
  }
  if (status === "invalid_input") {
    if (selections.length !== 0 || objective !== null) {
      errors.push(
        "$.status invalid_input cannot contain selections or an objective.",
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
    typeof root.selectionDigest === "string"
    && DIGEST_PATTERN.test(root.selectionDigest)
  ) {
    try {
      const expectedDigest = digestGlobalSelection(
        value as GlobalSelectionV1,
      );
      if (expectedDigest !== root.selectionDigest) {
        errors.push(
          "$.selectionDigest does not match the semantic selection projection.",
        );
      }
    } catch {
      errors.push(
        "$.selectionDigest could not be recomputed from the supplied value.",
      );
    }
  }
  return errors;
}

export function validateGlobalSelectionV1WithReceipt(
  value: unknown,
): GlobalSelectionRuntimeValidationReceiptV1 {
  const record = (
    value
    && typeof value === "object"
    && !Array.isArray(value)
  )
    ? value as Record<string, unknown>
    : null;
  const errors = validateGlobalSelectionV1(value);
  return {
    validatorVersion: GLOBAL_SELECTION_RUNTIME_VALIDATOR_VERSION,
    schemaVersion: record?.schemaVersion === GLOBAL_SELECTION_SCHEMA_VERSION
      ? GLOBAL_SELECTION_SCHEMA_VERSION
      : null,
    selectionDigest:
      typeof record?.selectionDigest === "string"
      && DIGEST_PATTERN.test(record.selectionDigest)
        ? record.selectionDigest
        : null,
    valid: errors.length === 0,
    errors,
  };
}

export const GLOBAL_SELECTION_BOUND_INPUT_VERSIONS = Object.freeze({
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
});
