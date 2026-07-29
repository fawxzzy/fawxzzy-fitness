import {
  CURATED_NORMALIZER_VERSION,
  NORMALIZED_PLANNING_INTAKE_VERSION,
  type NormalizedPlanningIntakeV1,
} from "../contract.ts";
import { validateNormalizedPlanningIntakeV1 } from "../contract.ts";
import {
  EXERCISE_CATALOG_SCHEMA_VERSION,
  EXERCISE_CATALOG_VERSION,
  type ExerciseCatalogBundleV1,
  type ExerciseDefinitionV1,
  type ExperienceLevel,
  type PlanStyleCode,
} from "../catalog/contract.ts";
import {
  validateExerciseCatalogBundleV1,
} from "../catalog/validate.ts";
import {
  COVERAGE_COMPILER_VERSION,
  COVERAGE_POLICY_VERSION,
  COVERAGE_SCHEMA_VERSION,
  COVERAGE_STATUSES,
  type CoverageCompilationV1,
} from "../coverage/contract.ts";
import {
  validateCoverageCompilationAgainstInputsV1,
} from "../coverage/compile.ts";
import {
  validateCoverageCompilationV1WithReceipt,
} from "../coverage/contract.ts";
import {
  CANDIDATE_RANKING_COMPILER_VERSION,
  CANDIDATE_RANKING_ISSUE_POLICY,
  CANDIDATE_RANKING_POLICY_VERSION,
  CANDIDATE_RANKING_REASON_POLICY,
  CANDIDATE_RANKING_SCHEMA_VERSION,
  CANDIDATE_RANKING_SCORE_COMPONENT_KEYS,
  compareRankedExerciseCandidates,
  digestCandidateRanking,
  validateCandidateRankingV1WithReceipt,
  type CandidateRankingInputIdentityV1,
  type CandidateRankingIssueCode,
  type CandidateRankingIssueV1,
  type CandidateRankingReasonCode,
  type CandidateRankingRequirementV1,
  type CandidateRankingScoreComponentsV1,
  type CandidateRankingStatus,
  type CandidateRankingV1,
  type RankedExerciseCandidateV1,
} from "./contract.ts";

function canonicalCompare(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalStrings(values: Iterable<string>) {
  return [...new Set([...values].filter(Boolean))].sort(canonicalCompare);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function safeString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function safeDigest(value: unknown) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value)
    ? value
    : null;
}

function readInputIdentity(
  planningValue: unknown,
  catalogValue: unknown,
  coverageValue: unknown,
): CandidateRankingInputIdentityV1 {
  const planning = asRecord(planningValue);
  const planningSource = asRecord(planning?.source);
  const catalog = asRecord(catalogValue);
  const coverage = asRecord(coverageValue);
  const coverageStatus = coverage?.status;
  return {
    planningContractVersion: safeString(planning?.contractVersion),
    planningNormalizerVersion: safeString(planningSource?.normalizerVersion),
    planningGenerationDigest: safeDigest(planning?.generationProjectionDigest),
    catalogSchemaVersion: safeString(catalog?.schemaVersion),
    catalogVersion: safeString(catalog?.catalogVersion),
    catalogDigest: safeDigest(catalog?.catalogDigest),
    coverageSchemaVersion: safeString(coverage?.schemaVersion),
    coverageCompilerVersion: safeString(coverage?.compilerVersion),
    coveragePolicyVersion: safeString(coverage?.policyVersion),
    coverageDigest: safeDigest(coverage?.coverageDigest),
    coverageStatus:
      typeof coverageStatus === "string"
      && COVERAGE_STATUSES.includes(
        coverageStatus as typeof COVERAGE_STATUSES[number],
      )
        ? coverageStatus as typeof COVERAGE_STATUSES[number]
        : null,
  };
}

function issue(
  code: CandidateRankingIssueCode,
  values: Iterable<string> = [],
): CandidateRankingIssueV1 {
  const policy = CANDIDATE_RANKING_ISSUE_POLICY[code];
  return {
    code,
    issueClass: policy.issueClass,
    path: policy.path,
    values: canonicalStrings(values),
  };
}

function issueKey(value: CandidateRankingIssueV1) {
  return [value.code, value.values.join("|")].join("|");
}

function finalize(
  status: CandidateRankingStatus,
  input: CandidateRankingInputIdentityV1,
  options: {
    requirements?: CandidateRankingRequirementV1[];
    issues?: CandidateRankingIssueV1[];
  } = {},
): CandidateRankingV1 {
  const withoutDigest: Omit<CandidateRankingV1, "rankingDigest"> = {
    schemaVersion: CANDIDATE_RANKING_SCHEMA_VERSION,
    compilerVersion: CANDIDATE_RANKING_COMPILER_VERSION,
    policyVersion: CANDIDATE_RANKING_POLICY_VERSION,
    input,
    status,
    requirements: [...(options.requirements ?? [])].sort(
      (left, right) =>
        canonicalCompare(left.requirementId, right.requirementId),
    ),
    issues: [...(options.issues ?? [])].sort(
      (left, right) => canonicalCompare(issueKey(left), issueKey(right)),
    ),
  };
  return {
    ...withoutDigest,
    rankingDigest: digestCandidateRanking(withoutDigest),
  };
}

function normalizeLookupValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function buildExerciseLookup(catalog: ExerciseCatalogBundleV1) {
  const lookup = new Map<string, string>();
  for (const exercise of catalog.exercises) {
    lookup.set(normalizeLookupValue(exercise.id), exercise.id);
    for (const alias of exercise.aliases) {
      lookup.set(normalizeLookupValue(alias), exercise.id);
    }
  }
  return lookup;
}

function resolveOptimizationNames(
  names: readonly string[],
  lookup: Map<string, string>,
) {
  const ids = new Set<string>();
  for (const name of names) {
    const id = lookup.get(normalizeLookupValue(name));
    if (id) ids.add(id);
  }
  return ids;
}

function goalReason(
  exercise: ExerciseDefinitionV1,
  planning: NormalizedPlanningIntakeV1,
): CandidateRankingReasonCode {
  const primaryGoal = planning.goals.primary;
  const tier = primaryGoal
    ? exercise.selection.goalTiers[
      primaryGoal as keyof ExerciseDefinitionV1["selection"]["goalTiers"]
    ]
    : 5;
  return `GOAL_TIER_${tier ?? 5}` as CandidateRankingReasonCode;
}

function planStyleReason(
  exercise: ExerciseDefinitionV1,
  planning: NormalizedPlanningIntakeV1,
): CandidateRankingReasonCode {
  const style = planning.preferences.planStyle;
  if (style === "no_preference") return "PLAN_STYLE_NEUTRAL";
  return exercise.selection.styleTags.includes(style as PlanStyleCode)
    ? "PLAN_STYLE_MATCH"
    : "PLAN_STYLE_MISMATCH";
}

function preferenceReason(
  exerciseId: string,
  preferredIds: Set<string>,
  dislikedIds: Set<string>,
): CandidateRankingReasonCode {
  const preferred = preferredIds.has(exerciseId);
  const disliked = dislikedIds.has(exerciseId);
  if (preferred && disliked) return "PREFERENCE_CONFLICT_NEUTRAL";
  if (preferred) return "PREFERENCE_PREFERRED";
  if (disliked) return "PREFERENCE_DISLIKED";
  return "PREFERENCE_NEUTRAL";
}

const EXPERIENCE_LEVEL_INDEX = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
} as const satisfies Record<ExperienceLevel, number>;

function experienceReason(
  exercise: ExerciseDefinitionV1,
  planning: NormalizedPlanningIntakeV1,
): CandidateRankingReasonCode {
  const experience = planning.trainingBackground.experience as ExperienceLevel;
  if (experience === "beginner") {
    return exercise.suitability.beginnerSuitability === "preferred"
      ? "EXPERIENCE_BEGINNER_PREFERRED"
      : "EXPERIENCE_BEGINNER_ALLOWED";
  }
  return EXPERIENCE_LEVEL_INDEX[experience]
    === EXPERIENCE_LEVEL_INDEX[exercise.suitability.minimumExperience]
    ? "EXPERIENCE_MINIMUM_MATCH"
    : "EXPERIENCE_EXCEEDS_MINIMUM";
}

function timeEfficiencyReason(
  exercise: ExerciseDefinitionV1,
): CandidateRankingReasonCode {
  return (
    `TIME_EFFICIENCY_TIER_${exercise.selection.timeEfficiencyTier}`
  ) as CandidateRankingReasonCode;
}

function setupTransitionReason(
  exercise: ExerciseDefinitionV1,
): CandidateRankingReasonCode {
  const seconds = exercise.cost.setupSeconds + exercise.cost.transitionSeconds;
  if (seconds <= 30) return "SETUP_TRANSITION_LOW";
  if (seconds <= 60) return "SETUP_TRANSITION_MODERATE";
  return "SETUP_TRANSITION_HIGH";
}

function recoveryReason(
  exercise: ExerciseDefinitionV1,
  planning: NormalizedPlanningIntakeV1,
): CandidateRankingReasonCode {
  if (planning.recovery.planningModifier === "standard") {
    return "RECOVERY_STANDARD";
  }
  return (
    `RECOVERY_CONSERVATIVE_TIER_${exercise.safety.systemicFatigue}`
  ) as CandidateRankingReasonCode;
}

function rankCandidate(
  exercise: ExerciseDefinitionV1,
  planning: NormalizedPlanningIntakeV1,
  preferredIds: Set<string>,
  dislikedIds: Set<string>,
): RankedExerciseCandidateV1 {
  const reasonCodes = [
    goalReason(exercise, planning),
    planStyleReason(exercise, planning),
    preferenceReason(exercise.id, preferredIds, dislikedIds),
    experienceReason(exercise, planning),
    timeEfficiencyReason(exercise),
    setupTransitionReason(exercise),
    recoveryReason(exercise, planning),
  ] satisfies CandidateRankingReasonCode[];
  const scoreComponents = {} as CandidateRankingScoreComponentsV1;
  CANDIDATE_RANKING_SCORE_COMPONENT_KEYS.forEach((component, index) => {
    const policy = CANDIDATE_RANKING_REASON_POLICY[reasonCodes[index]];
    if (policy.component !== component) {
      throw new Error(`Internal ranking policy mismatch for ${component}.`);
    }
    scoreComponents[component] = policy.score;
  });
  return {
    exerciseId: exercise.id,
    scoreComponents,
    reasonCodes,
    totalScore: CANDIDATE_RANKING_SCORE_COMPONENT_KEYS.reduce(
      (sum, key) => sum + scoreComponents[key],
      0,
    ),
    curatedRank: exercise.selection.curatedRank,
  };
}

export function compileCandidateRankingV1(
  planningValue: unknown,
  catalogValue: unknown,
  coverageValue: unknown,
): CandidateRankingV1 {
  const input = readInputIdentity(
    planningValue,
    catalogValue,
    coverageValue,
  );
  const planningErrors = validateNormalizedPlanningIntakeV1(planningValue);
  const catalogErrors = validateExerciseCatalogBundleV1(catalogValue);
  const invalidIssues: CandidateRankingIssueV1[] = [];
  if (planningErrors.length > 0) {
    invalidIssues.push(issue("INTAKE_INVALID", planningErrors));
  }
  if (catalogErrors.length > 0) {
    invalidIssues.push(issue("CATALOG_INVALID", catalogErrors));
  }
  if (invalidIssues.length > 0) {
    return finalize("invalid_input", input, { issues: invalidIssues });
  }

  const coverageReceipt = validateCoverageCompilationV1WithReceipt(
    coverageValue,
  );
  if (!coverageReceipt.valid) {
    return finalize("invalid_input", input, {
      issues: [issue("COVERAGE_INVALID", coverageReceipt.errors)],
    });
  }
  const coverageInputErrors = validateCoverageCompilationAgainstInputsV1(
    coverageValue,
    planningValue,
    catalogValue,
  );
  if (coverageInputErrors.length > 0) {
    return finalize("invalid_input", input, {
      issues: [issue("COVERAGE_INPUT_MISMATCH", coverageInputErrors)],
    });
  }

  const planning = planningValue as NormalizedPlanningIntakeV1;
  const catalog = catalogValue as ExerciseCatalogBundleV1;
  const coverage = coverageValue as CoverageCompilationV1;
  if (coverage.status !== "ready") {
    return finalize("not_rankable", input, {
      issues: [issue("COVERAGE_NOT_READY", [
        coverage.status,
        ...coverage.issues.map((entry) => entry.code),
      ])],
    });
  }

  const exerciseById = new Map(
    catalog.exercises.map((exercise) => [exercise.id, exercise]),
  );
  const missingCandidateIds = canonicalStrings(
    coverage.requirements.flatMap((requirement) =>
      requirement.compatibleExerciseIds.filter(
        (exerciseId) => !exerciseById.has(exerciseId),
      )),
  );
  if (missingCandidateIds.length > 0) {
    return finalize("invalid_input", input, {
      issues: [issue("CANDIDATE_CATALOG_MISMATCH", missingCandidateIds)],
    });
  }

  const lookup = buildExerciseLookup(catalog);
  const preferredIds = resolveOptimizationNames(
    planning.preferences.preferredExerciseNames,
    lookup,
  );
  const dislikedIds = resolveOptimizationNames(
    planning.preferences.dislikedExerciseNames,
    lookup,
  );
  const requirements = coverage.requirements.map((requirement) => ({
    requirementId: requirement.id,
    candidates: requirement.compatibleExerciseIds
      .map((exerciseId) => rankCandidate(
        exerciseById.get(exerciseId) as ExerciseDefinitionV1,
        planning,
        preferredIds,
        dislikedIds,
      ))
      .sort(compareRankedExerciseCandidates),
  }));
  return finalize("ready", input, { requirements });
}

export function validateCandidateRankingAgainstInputsV1(
  value: unknown,
  planningValue: unknown,
  catalogValue: unknown,
  coverageValue: unknown,
) {
  const receipt = validateCandidateRankingV1WithReceipt(value);
  const errors = [...receipt.errors];
  if (errors.length > 0) return errors;
  const supplied = value as CandidateRankingV1;
  const expected = compileCandidateRankingV1(
    planningValue,
    catalogValue,
    coverageValue,
  );
  if (supplied.rankingDigest !== expected.rankingDigest) {
    errors.push(
      "$.rankingDigest does not match recompilation from the supplied planning, catalog, and coverage inputs.",
    );
  }
  return errors;
}

export const CANDIDATE_RANKING_BOUND_INPUT_VERSIONS = Object.freeze({
  planningContractVersion: NORMALIZED_PLANNING_INTAKE_VERSION,
  planningNormalizerVersion: CURATED_NORMALIZER_VERSION,
  catalogSchemaVersion: EXERCISE_CATALOG_SCHEMA_VERSION,
  catalogVersion: EXERCISE_CATALOG_VERSION,
  coverageSchemaVersion: COVERAGE_SCHEMA_VERSION,
  coverageCompilerVersion: COVERAGE_COMPILER_VERSION,
  coveragePolicyVersion: COVERAGE_POLICY_VERSION,
});
