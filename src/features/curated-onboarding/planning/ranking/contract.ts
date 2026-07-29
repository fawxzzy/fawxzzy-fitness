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

export const CANDIDATE_RANKING_SCHEMA_VERSION =
  "fitness.candidate-ranking.v1" as const;
export const CANDIDATE_RANKING_COMPILER_VERSION =
  "fitness.candidate-ranking-compiler.2026-07-28.v1" as const;
export const CANDIDATE_RANKING_POLICY_VERSION =
  "fitness.candidate-ranking-policy.2026-07-28.v1" as const;
export const CANDIDATE_RANKING_RUNTIME_VALIDATOR_VERSION =
  "fitness.candidate-ranking-validator.2026-07-28.v1" as const;

export const CANDIDATE_RANKING_STATUSES = [
  "ready",
  "not_rankable",
  "invalid_input",
] as const;
export const CANDIDATE_RANKING_ISSUE_CLASSES = [
  "invalid",
  "not_rankable",
] as const;
export const CANDIDATE_RANKING_ISSUE_CODES = [
  "CANDIDATE_CATALOG_MISMATCH",
  "CATALOG_INVALID",
  "COVERAGE_INPUT_MISMATCH",
  "COVERAGE_INVALID",
  "COVERAGE_NOT_READY",
  "INTAKE_INVALID",
] as const;
export const CANDIDATE_RANKING_SCORE_COMPONENT_KEYS = [
  "goalFit",
  "planStyleFit",
  "preference",
  "experienceSuitability",
  "timeEfficiency",
  "setupTransitionCost",
  "recoveryCost",
] as const;
export const CANDIDATE_RANKING_REASON_CODES = [
  "GOAL_TIER_1",
  "GOAL_TIER_2",
  "GOAL_TIER_3",
  "GOAL_TIER_4",
  "GOAL_TIER_5",
  "PLAN_STYLE_MATCH",
  "PLAN_STYLE_MISMATCH",
  "PLAN_STYLE_NEUTRAL",
  "PREFERENCE_PREFERRED",
  "PREFERENCE_DISLIKED",
  "PREFERENCE_CONFLICT_NEUTRAL",
  "PREFERENCE_NEUTRAL",
  "EXPERIENCE_BEGINNER_PREFERRED",
  "EXPERIENCE_BEGINNER_ALLOWED",
  "EXPERIENCE_MINIMUM_MATCH",
  "EXPERIENCE_EXCEEDS_MINIMUM",
  "TIME_EFFICIENCY_TIER_1",
  "TIME_EFFICIENCY_TIER_2",
  "TIME_EFFICIENCY_TIER_3",
  "TIME_EFFICIENCY_TIER_4",
  "TIME_EFFICIENCY_TIER_5",
  "SETUP_TRANSITION_LOW",
  "SETUP_TRANSITION_MODERATE",
  "SETUP_TRANSITION_HIGH",
  "RECOVERY_STANDARD",
  "RECOVERY_CONSERVATIVE_TIER_1",
  "RECOVERY_CONSERVATIVE_TIER_2",
  "RECOVERY_CONSERVATIVE_TIER_3",
  "RECOVERY_CONSERVATIVE_TIER_4",
  "RECOVERY_CONSERVATIVE_TIER_5",
] as const;

export type CandidateRankingStatus =
  typeof CANDIDATE_RANKING_STATUSES[number];
export type CandidateRankingIssueClass =
  typeof CANDIDATE_RANKING_ISSUE_CLASSES[number];
export type CandidateRankingIssueCode =
  typeof CANDIDATE_RANKING_ISSUE_CODES[number];
export type CandidateRankingScoreComponentKey =
  typeof CANDIDATE_RANKING_SCORE_COMPONENT_KEYS[number];
export type CandidateRankingReasonCode =
  typeof CANDIDATE_RANKING_REASON_CODES[number];

type ReasonPolicy = {
  component: CandidateRankingScoreComponentKey;
  score: number;
};

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
  }
  return value;
}

export const CANDIDATE_RANKING_REASON_POLICY = deepFreeze({
  GOAL_TIER_1: { component: "goalFit", score: 30 },
  GOAL_TIER_2: { component: "goalFit", score: 24 },
  GOAL_TIER_3: { component: "goalFit", score: 18 },
  GOAL_TIER_4: { component: "goalFit", score: 12 },
  GOAL_TIER_5: { component: "goalFit", score: 6 },
  PLAN_STYLE_MATCH: { component: "planStyleFit", score: 8 },
  PLAN_STYLE_MISMATCH: { component: "planStyleFit", score: -2 },
  PLAN_STYLE_NEUTRAL: { component: "planStyleFit", score: 0 },
  PREFERENCE_PREFERRED: { component: "preference", score: 16 },
  PREFERENCE_DISLIKED: { component: "preference", score: -16 },
  PREFERENCE_CONFLICT_NEUTRAL: { component: "preference", score: 0 },
  PREFERENCE_NEUTRAL: { component: "preference", score: 0 },
  EXPERIENCE_BEGINNER_PREFERRED: {
    component: "experienceSuitability",
    score: 10,
  },
  EXPERIENCE_BEGINNER_ALLOWED: {
    component: "experienceSuitability",
    score: 4,
  },
  EXPERIENCE_MINIMUM_MATCH: {
    component: "experienceSuitability",
    score: 8,
  },
  EXPERIENCE_EXCEEDS_MINIMUM: {
    component: "experienceSuitability",
    score: 4,
  },
  TIME_EFFICIENCY_TIER_1: { component: "timeEfficiency", score: 20 },
  TIME_EFFICIENCY_TIER_2: { component: "timeEfficiency", score: 16 },
  TIME_EFFICIENCY_TIER_3: { component: "timeEfficiency", score: 12 },
  TIME_EFFICIENCY_TIER_4: { component: "timeEfficiency", score: 8 },
  TIME_EFFICIENCY_TIER_5: { component: "timeEfficiency", score: 4 },
  SETUP_TRANSITION_LOW: { component: "setupTransitionCost", score: 6 },
  SETUP_TRANSITION_MODERATE: {
    component: "setupTransitionCost",
    score: 3,
  },
  SETUP_TRANSITION_HIGH: { component: "setupTransitionCost", score: 0 },
  RECOVERY_STANDARD: { component: "recoveryCost", score: 0 },
  RECOVERY_CONSERVATIVE_TIER_1: { component: "recoveryCost", score: 4 },
  RECOVERY_CONSERVATIVE_TIER_2: { component: "recoveryCost", score: 0 },
  RECOVERY_CONSERVATIVE_TIER_3: { component: "recoveryCost", score: -4 },
  RECOVERY_CONSERVATIVE_TIER_4: { component: "recoveryCost", score: -8 },
  RECOVERY_CONSERVATIVE_TIER_5: { component: "recoveryCost", score: -12 },
} as const satisfies Record<CandidateRankingReasonCode, ReasonPolicy>);

export const CANDIDATE_RANKING_ISSUE_POLICY = deepFreeze({
  CANDIDATE_CATALOG_MISMATCH: {
    issueClass: "invalid",
    path: "/requirements",
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
  COVERAGE_NOT_READY: {
    issueClass: "not_rankable",
    path: "/input/coverage/status",
  },
  INTAKE_INVALID: {
    issueClass: "invalid",
    path: "/input/planning",
  },
} as const satisfies Record<
  CandidateRankingIssueCode,
  { issueClass: CandidateRankingIssueClass; path: `/${string}` }
>);

export type CandidateRankingInputIdentityV1 = {
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
};

export type CandidateRankingScoreComponentsV1 = Record<
  CandidateRankingScoreComponentKey,
  number
>;

export type RankedExerciseCandidateV1 = {
  exerciseId: string;
  scoreComponents: CandidateRankingScoreComponentsV1;
  reasonCodes: CandidateRankingReasonCode[];
  totalScore: number;
  curatedRank: number;
};

export type CandidateRankingRequirementV1 = {
  requirementId: string;
  candidates: RankedExerciseCandidateV1[];
};

export type CandidateRankingIssueV1 = {
  code: CandidateRankingIssueCode;
  issueClass: CandidateRankingIssueClass;
  path: `/${string}`;
  values: string[];
};

export type CandidateRankingV1 = {
  schemaVersion: typeof CANDIDATE_RANKING_SCHEMA_VERSION;
  compilerVersion: typeof CANDIDATE_RANKING_COMPILER_VERSION;
  policyVersion: typeof CANDIDATE_RANKING_POLICY_VERSION;
  input: CandidateRankingInputIdentityV1;
  status: CandidateRankingStatus;
  requirements: CandidateRankingRequirementV1[];
  issues: CandidateRankingIssueV1[];
  rankingDigest: string;
};

export type CandidateRankingRuntimeValidationReceiptV1 = {
  validatorVersion: typeof CANDIDATE_RANKING_RUNTIME_VALIDATOR_VERSION;
  schemaVersion: typeof CANDIDATE_RANKING_SCHEMA_VERSION | null;
  rankingDigest: string | null;
  valid: boolean;
  errors: string[];
};

const DIGEST_PATTERN = /^[a-f0-9]{64}$/;
const IDENTIFIER_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ROOT_KEYS = [
  "schemaVersion",
  "compilerVersion",
  "policyVersion",
  "input",
  "status",
  "requirements",
  "issues",
  "rankingDigest",
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
] as const;
const REQUIREMENT_KEYS = ["requirementId", "candidates"] as const;
const CANDIDATE_KEYS = [
  "exerciseId",
  "scoreComponents",
  "reasonCodes",
  "totalScore",
  "curatedRank",
] as const;
const ISSUE_KEYS = ["code", "issueClass", "path", "values"] as const;

function canonicalCompare(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function compareRankedExerciseCandidates(
  left: RankedExerciseCandidateV1,
  right: RankedExerciseCandidateV1,
) {
  if (left.totalScore !== right.totalScore) {
    return right.totalScore - left.totalScore;
  }
  if (left.curatedRank !== right.curatedRank) {
    return left.curatedRank - right.curatedRank;
  }
  return canonicalCompare(left.exerciseId, right.exerciseId);
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
): CandidateRankingInputIdentityV1 | null {
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
    coverageStatus: COVERAGE_STATUSES.includes(coverageStatus as CoverageStatus)
      ? coverageStatus as CoverageStatus
      : null,
  };
}

function validateCandidate(
  value: unknown,
  path: string,
  errors: string[],
): RankedExerciseCandidateV1 | null {
  const candidate = asRecord(value, path, errors);
  if (!candidate) return null;
  validateExactKeys(candidate, CANDIDATE_KEYS, path, errors);

  const exerciseId = candidate.exerciseId;
  if (typeof exerciseId !== "string" || !IDENTIFIER_PATTERN.test(exerciseId)) {
    errors.push(`${path}.exerciseId must be a canonical identifier.`);
  }
  const curatedRank = candidate.curatedRank;
  if (!Number.isInteger(curatedRank) || Number(curatedRank) < 1) {
    errors.push(`${path}.curatedRank must be a positive integer.`);
  }
  const scoreComponents = asRecord(
    candidate.scoreComponents,
    `${path}.scoreComponents`,
    errors,
  );
  const normalizedComponents = {} as CandidateRankingScoreComponentsV1;
  if (scoreComponents) {
    validateExactKeys(
      scoreComponents,
      CANDIDATE_RANKING_SCORE_COMPONENT_KEYS,
      `${path}.scoreComponents`,
      errors,
    );
  }
  for (const key of CANDIDATE_RANKING_SCORE_COMPONENT_KEYS) {
    const score = scoreComponents?.[key];
    if (!Number.isInteger(score)) {
      errors.push(`${path}.scoreComponents.${key} must be an integer.`);
      normalizedComponents[key] = 0;
    } else {
      normalizedComponents[key] = Number(score);
    }
  }

  const rawReasons = candidate.reasonCodes;
  const reasonCodes: CandidateRankingReasonCode[] = [];
  if (!Array.isArray(rawReasons)) {
    errors.push(`${path}.reasonCodes must be an array.`);
  } else {
    rawReasons.forEach((entry, index) => {
      if (
        typeof entry !== "string"
        || !CANDIDATE_RANKING_REASON_CODES.includes(
          entry as CandidateRankingReasonCode,
        )
      ) {
        errors.push(`${path}.reasonCodes[${index}] is invalid.`);
      } else {
        reasonCodes.push(entry as CandidateRankingReasonCode);
      }
    });
  }
  if (reasonCodes.length !== CANDIDATE_RANKING_SCORE_COMPONENT_KEYS.length) {
    errors.push(
      `${path}.reasonCodes must contain exactly one reason per score component.`,
    );
  }
  if (new Set(reasonCodes).size !== reasonCodes.length) {
    errors.push(`${path}.reasonCodes must be unique.`);
  }
  CANDIDATE_RANKING_SCORE_COMPONENT_KEYS.forEach((component, index) => {
    const reasonCode = reasonCodes[index];
    const policy = reasonCode
      ? CANDIDATE_RANKING_REASON_POLICY[reasonCode]
      : null;
    if (!policy || policy.component !== component) {
      errors.push(
        `${path}.reasonCodes[${index}] must govern ${component}.`,
      );
      return;
    }
    if (normalizedComponents[component] !== policy.score) {
      errors.push(
        `${path}.scoreComponents.${component} must equal ${policy.score} for ${reasonCode}.`,
      );
    }
  });

  const totalScore = candidate.totalScore;
  if (!Number.isInteger(totalScore)) {
    errors.push(`${path}.totalScore must be an integer.`);
  }
  const expectedTotal = CANDIDATE_RANKING_SCORE_COMPONENT_KEYS.reduce(
    (sum, key) => sum + normalizedComponents[key],
    0,
  );
  if (totalScore !== expectedTotal) {
    errors.push(`${path}.totalScore must equal the score-component sum.`);
  }

  return {
    exerciseId: typeof exerciseId === "string" ? exerciseId : "",
    scoreComponents: normalizedComponents,
    reasonCodes,
    totalScore: Number.isInteger(totalScore) ? Number(totalScore) : 0,
    curatedRank: Number.isInteger(curatedRank) ? Number(curatedRank) : 0,
  };
}

function validateRequirements(
  value: unknown,
  errors: string[],
): CandidateRankingRequirementV1[] {
  if (!Array.isArray(value)) {
    errors.push("$.requirements must be an array.");
    return [];
  }
  const requirements: CandidateRankingRequirementV1[] = [];
  value.forEach((entry, requirementIndex) => {
    const path = `$.requirements[${requirementIndex}]`;
    const requirement = asRecord(entry, path, errors);
    if (!requirement) return;
    validateExactKeys(requirement, REQUIREMENT_KEYS, path, errors);
    const requirementId = requirement.requirementId;
    if (typeof requirementId !== "string" || requirementId.length === 0) {
      errors.push(`${path}.requirementId must be a non-empty string.`);
    }
    const rawCandidates = requirement.candidates;
    const candidates: RankedExerciseCandidateV1[] = [];
    if (!Array.isArray(rawCandidates)) {
      errors.push(`${path}.candidates must be an array.`);
    } else {
      rawCandidates.forEach((candidate, candidateIndex) => {
        const validated = validateCandidate(
          candidate,
          `${path}.candidates[${candidateIndex}]`,
          errors,
        );
        if (validated) candidates.push(validated);
      });
    }
    if (new Set(candidates.map((candidate) => candidate.exerciseId)).size
      !== candidates.length) {
      errors.push(`${path}.candidates must contain unique exercise IDs.`);
    }
    const canonicalCandidates = [...candidates].sort(
      compareRankedExerciseCandidates,
    );
    if (
      canonicalCandidates.some(
        (candidate, index) =>
          candidate.exerciseId !== candidates[index]?.exerciseId,
      )
    ) {
      errors.push(`${path}.candidates must be in canonical ranking order.`);
    }
    requirements.push({
      requirementId:
        typeof requirementId === "string" ? requirementId : "",
      candidates,
    });
  });
  if (
    new Set(requirements.map((requirement) => requirement.requirementId)).size
    !== requirements.length
  ) {
    errors.push("$.requirements must contain unique requirement IDs.");
  }
  const canonicalRequirementIds = requirements
    .map((requirement) => requirement.requirementId)
    .sort(canonicalCompare);
  if (
    canonicalRequirementIds.some(
      (requirementId, index) =>
        requirementId !== requirements[index]?.requirementId,
    )
  ) {
    errors.push("$.requirements must be canonically ordered.");
  }
  return requirements;
}

function issueKey(issue: CandidateRankingIssueV1) {
  return [issue.code, issue.values.join("|")].join("|");
}

function validateIssues(
  value: unknown,
  errors: string[],
): CandidateRankingIssueV1[] {
  if (!Array.isArray(value)) {
    errors.push("$.issues must be an array.");
    return [];
  }
  const issues: CandidateRankingIssueV1[] = [];
  value.forEach((entry, index) => {
    const path = `$.issues[${index}]`;
    const issue = asRecord(entry, path, errors);
    if (!issue) return;
    validateExactKeys(issue, ISSUE_KEYS, path, errors);
    if (
      typeof issue.code !== "string"
      || !CANDIDATE_RANKING_ISSUE_CODES.includes(
        issue.code as CandidateRankingIssueCode,
      )
    ) {
      errors.push(`${path}.code is invalid.`);
      return;
    }
    const code = issue.code as CandidateRankingIssueCode;
    const policy = CANDIDATE_RANKING_ISSUE_POLICY[code];
    if (issue.issueClass !== policy.issueClass) {
      errors.push(`${path}.issueClass must equal ${policy.issueClass}.`);
    }
    if (issue.path !== policy.path) {
      errors.push(`${path}.path must equal ${policy.path}.`);
    }
    issues.push({
      code,
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
    || canonical.some((issue, index) => issueKey(issue) !== issueKey(issues[index]))
  ) {
    errors.push("$.issues must be unique and canonically ordered.");
  }
  return issues;
}

function validateBoundInputIdentity(
  input: CandidateRankingInputIdentityV1,
  status: CandidateRankingStatus,
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
  ] as const) {
    const digest = input[key];
    if (typeof digest !== "string" || !DIGEST_PATTERN.test(digest)) {
      errors.push(`$.input.${key} must be present for ${status}.`);
    }
  }
}

export function buildCandidateRankingSemanticProjection(
  value: Omit<CandidateRankingV1, "rankingDigest"> | CandidateRankingV1,
) {
  const { rankingDigest: _rankingDigest, ...projection } =
    value as CandidateRankingV1;
  return projection;
}

export function digestCandidateRanking(
  value: Omit<CandidateRankingV1, "rankingDigest"> | CandidateRankingV1,
) {
  return digestCanonicalJson(buildCandidateRankingSemanticProjection(value));
}

export function validateCandidateRankingV1(value: unknown) {
  const errors: string[] = [];
  const root = asRecord(value, "$", errors);
  if (!root) return errors;
  validateExactKeys(root, ROOT_KEYS, "$", errors);
  if (root.schemaVersion !== CANDIDATE_RANKING_SCHEMA_VERSION) {
    errors.push(
      `$.schemaVersion must equal ${CANDIDATE_RANKING_SCHEMA_VERSION}.`,
    );
  }
  if (root.compilerVersion !== CANDIDATE_RANKING_COMPILER_VERSION) {
    errors.push(
      `$.compilerVersion must equal ${CANDIDATE_RANKING_COMPILER_VERSION}.`,
    );
  }
  if (root.policyVersion !== CANDIDATE_RANKING_POLICY_VERSION) {
    errors.push(
      `$.policyVersion must equal ${CANDIDATE_RANKING_POLICY_VERSION}.`,
    );
  }
  const input = validateInput(root.input, errors);
  const status = root.status as CandidateRankingStatus;
  if (!CANDIDATE_RANKING_STATUSES.includes(status)) {
    errors.push("$.status is invalid.");
  }
  const requirements = validateRequirements(root.requirements, errors);
  const issues = validateIssues(root.issues, errors);
  if (
    typeof root.rankingDigest !== "string"
    || !DIGEST_PATTERN.test(root.rankingDigest)
  ) {
    errors.push("$.rankingDigest must be a lowercase SHA-256 digest.");
  }

  if (input && CANDIDATE_RANKING_STATUSES.includes(status)) {
    validateBoundInputIdentity(input, status, errors);
  }
  if (status === "ready") {
    if (input?.coverageStatus !== "ready") {
      errors.push("$.status ready requires $.input.coverageStatus ready.");
    }
    if (issues.length !== 0) {
      errors.push("$.status ready cannot contain issues.");
    }
    if (
      requirements.length === 0
      || requirements.some((requirement) => requirement.candidates.length === 0)
    ) {
      errors.push(
        "$.status ready requires non-empty requirements and candidate lists.",
      );
    }
  }
  if (status === "not_rankable") {
    if (requirements.length !== 0) {
      errors.push("$.status not_rankable cannot contain ranked requirements.");
    }
    if (
      input?.coverageStatus === null
      || input?.coverageStatus === "ready"
    ) {
      errors.push(
        "$.status not_rankable requires a non-ready coverage status.",
      );
    }
    if (
      issues.length !== 1
      || issues[0]?.code !== "COVERAGE_NOT_READY"
    ) {
      errors.push(
        "$.status not_rankable requires exactly COVERAGE_NOT_READY.",
      );
    }
  }
  if (status === "invalid_input") {
    if (requirements.length !== 0) {
      errors.push("$.status invalid_input cannot contain ranked requirements.");
    }
    if (
      issues.length === 0
      || issues.some((issue) => issue.issueClass !== "invalid")
    ) {
      errors.push("$.status invalid_input requires only invalid issues.");
    }
  }

  if (
    typeof root.rankingDigest === "string"
    && DIGEST_PATTERN.test(root.rankingDigest)
  ) {
    try {
      const expectedDigest = digestCandidateRanking(value as CandidateRankingV1);
      if (expectedDigest !== root.rankingDigest) {
        errors.push(
          "$.rankingDigest does not match the semantic ranking projection.",
        );
      }
    } catch {
      errors.push(
        "$.rankingDigest could not be recomputed from the supplied value.",
      );
    }
  }
  return errors;
}

export function validateCandidateRankingV1WithReceipt(
  value: unknown,
): CandidateRankingRuntimeValidationReceiptV1 {
  const record = (
    value
    && typeof value === "object"
    && !Array.isArray(value)
  )
    ? value as Record<string, unknown>
    : null;
  const errors = validateCandidateRankingV1(value);
  return {
    validatorVersion: CANDIDATE_RANKING_RUNTIME_VALIDATOR_VERSION,
    schemaVersion: record?.schemaVersion === CANDIDATE_RANKING_SCHEMA_VERSION
      ? CANDIDATE_RANKING_SCHEMA_VERSION
      : null,
    rankingDigest:
      typeof record?.rankingDigest === "string"
      && DIGEST_PATTERN.test(record.rankingDigest)
        ? record.rankingDigest
        : null,
    valid: errors.length === 0,
    errors,
  };
}
