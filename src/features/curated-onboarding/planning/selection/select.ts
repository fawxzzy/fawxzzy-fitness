import {
  validateNormalizedPlanningIntakeV1,
} from "../contract.ts";
import {
  validateExerciseCatalogBundleV1,
} from "../catalog/validate.ts";
import {
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
  CANDIDATE_RANKING_STATUSES,
  type CandidateRankingRequirementV1,
  type CandidateRankingV1,
  type RankedExerciseCandidateV1,
} from "../ranking/contract.ts";
import {
  validateCandidateRankingAgainstInputsV1,
} from "../ranking/rank.ts";
import {
  validateCandidateRankingV1WithReceipt,
} from "../ranking/contract.ts";
import {
  GLOBAL_SELECTION_COMPILER_VERSION,
  GLOBAL_SELECTION_ISSUE_POLICY,
  GLOBAL_SELECTION_POLICY_VERSION,
  GLOBAL_SELECTION_SCHEMA_VERSION,
  digestGlobalSelection,
  validateGlobalSelectionV1WithReceipt,
  type GlobalSelectionInputIdentityV1,
  type GlobalSelectionIssueCode,
  type GlobalSelectionIssueV1,
  type GlobalSelectionObjectiveV1,
  type GlobalSelectionStatus,
  type GlobalSelectionV1,
  type SelectedExerciseV1,
} from "./contract.ts";

export const GLOBAL_SELECTION_SEARCH_STATE_LIMIT = 100_000;

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
  rankingValue: unknown,
): GlobalSelectionInputIdentityV1 {
  const planning = asRecord(planningValue);
  const planningSource = asRecord(planning?.source);
  const catalog = asRecord(catalogValue);
  const coverage = asRecord(coverageValue);
  const ranking = asRecord(rankingValue);
  const coverageStatus = coverage?.status;
  const rankingStatus = ranking?.status;
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
    rankingSchemaVersion: safeString(ranking?.schemaVersion),
    rankingCompilerVersion: safeString(ranking?.compilerVersion),
    rankingPolicyVersion: safeString(ranking?.policyVersion),
    rankingDigest: safeDigest(ranking?.rankingDigest),
    rankingStatus:
      typeof rankingStatus === "string"
      && CANDIDATE_RANKING_STATUSES.includes(
        rankingStatus as typeof CANDIDATE_RANKING_STATUSES[number],
      )
        ? rankingStatus as typeof CANDIDATE_RANKING_STATUSES[number]
        : null,
  };
}

function issue(
  code: GlobalSelectionIssueCode,
  values: Iterable<string> = [],
): GlobalSelectionIssueV1 {
  const policy = GLOBAL_SELECTION_ISSUE_POLICY[code];
  return {
    code,
    issueClass: policy.issueClass,
    path: policy.path,
    values: canonicalStrings(values),
  };
}

function issueKey(value: GlobalSelectionIssueV1) {
  return [value.code, value.values.join("|")].join("|");
}

function finalize(
  status: GlobalSelectionStatus,
  input: GlobalSelectionInputIdentityV1,
  options: {
    selections?: SelectedExerciseV1[];
    objective?: GlobalSelectionObjectiveV1 | null;
    issues?: GlobalSelectionIssueV1[];
  } = {},
): GlobalSelectionV1 {
  const withoutDigest: Omit<GlobalSelectionV1, "selectionDigest"> = {
    schemaVersion: GLOBAL_SELECTION_SCHEMA_VERSION,
    compilerVersion: GLOBAL_SELECTION_COMPILER_VERSION,
    policyVersion: GLOBAL_SELECTION_POLICY_VERSION,
    input,
    status,
    selections: [...(options.selections ?? [])].sort(
      (left, right) =>
        canonicalCompare(left.requirementId, right.requirementId),
    ),
    objective: options.objective ?? null,
    issues: [...(options.issues ?? [])].sort(
      (left, right) => canonicalCompare(issueKey(left), issueKey(right)),
    ),
  };
  return {
    ...withoutDigest,
    selectionDigest: digestGlobalSelection(withoutDigest),
  };
}

type AssignmentEntry = {
  requirementId: string;
  candidate: RankedExerciseCandidateV1;
  rankingPosition: number;
};

type AssignmentResult = {
  score: number;
  entries: AssignmentEntry[];
};

function solveUniqueAssignment(
  requirements: CandidateRankingRequirementV1[],
) {
  const memo = new Map<string, AssignmentResult | null>();
  let statesVisited = 0;
  let limitExceeded = false;

  function visit(
    requirementIndex: number,
    usedExerciseIds: ReadonlySet<string>,
  ): AssignmentResult | null {
    if (limitExceeded) return null;
    statesVisited += 1;
    if (statesVisited > GLOBAL_SELECTION_SEARCH_STATE_LIMIT) {
      limitExceeded = true;
      return null;
    }
    if (requirementIndex === requirements.length) {
      return { score: 0, entries: [] };
    }

    const usedKey = [...usedExerciseIds].sort(canonicalCompare).join(",");
    const memoKey = `${requirementIndex}|${usedKey}`;
    const cached = memo.get(memoKey);
    if (cached !== undefined || memo.has(memoKey)) {
      return cached ?? null;
    }

    const requirement = requirements[requirementIndex];
    let best: AssignmentResult | null = null;
    for (
      let candidateIndex = 0;
      candidateIndex < requirement.candidates.length;
      candidateIndex += 1
    ) {
      const candidate = requirement.candidates[candidateIndex];
      if (usedExerciseIds.has(candidate.exerciseId)) continue;
      const nextUsed = new Set(usedExerciseIds);
      nextUsed.add(candidate.exerciseId);
      const suffix = visit(requirementIndex + 1, nextUsed);
      if (!suffix) continue;
      const result: AssignmentResult = {
        score: candidate.totalScore + suffix.score,
        entries: [
          {
            requirementId: requirement.requirementId,
            candidate,
            rankingPosition: candidateIndex + 1,
          },
          ...suffix.entries,
        ],
      };
      if (!best || result.score > best.score) {
        best = result;
      }
    }
    memo.set(memoKey, best);
    return best;
  }

  const assignment = visit(0, new Set());
  return { assignment, limitExceeded, statesVisited };
}

export function compileGlobalSelectionV1(
  planningValue: unknown,
  catalogValue: unknown,
  coverageValue: unknown,
  rankingValue: unknown,
): GlobalSelectionV1 {
  const input = readInputIdentity(
    planningValue,
    catalogValue,
    coverageValue,
    rankingValue,
  );
  const planningErrors = validateNormalizedPlanningIntakeV1(planningValue);
  const catalogErrors = validateExerciseCatalogBundleV1(catalogValue);
  const invalidIssues: GlobalSelectionIssueV1[] = [];
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

  const rankingReceipt = validateCandidateRankingV1WithReceipt(rankingValue);
  if (!rankingReceipt.valid) {
    return finalize("invalid_input", input, {
      issues: [issue("RANKING_INVALID", rankingReceipt.errors)],
    });
  }
  const rankingInputErrors = validateCandidateRankingAgainstInputsV1(
    rankingValue,
    planningValue,
    catalogValue,
    coverageValue,
  );
  if (rankingInputErrors.length > 0) {
    return finalize("invalid_input", input, {
      issues: [issue("RANKING_INPUT_MISMATCH", rankingInputErrors)],
    });
  }

  const coverage = coverageValue as CoverageCompilationV1;
  const ranking = rankingValue as CandidateRankingV1;
  if (ranking.status !== "ready") {
    return finalize("not_selectable", input, {
      issues: [issue("RANKING_NOT_READY", [
        ranking.status,
        coverage.status,
        ...ranking.issues.map((entry) => entry.code),
      ])],
    });
  }

  const { assignment, limitExceeded, statesVisited } =
    solveUniqueAssignment(ranking.requirements);
  if (limitExceeded) {
    return finalize("infeasible", input, {
      issues: [issue("SELECTION_SEARCH_LIMIT_EXCEEDED", [
        String(GLOBAL_SELECTION_SEARCH_STATE_LIMIT),
        String(statesVisited),
      ])],
    });
  }
  if (!assignment) {
    return finalize("infeasible", input, {
      issues: [issue(
        "UNIQUE_ASSIGNMENT_UNAVAILABLE",
        ranking.requirements.map((requirement) => requirement.requirementId),
      )],
    });
  }

  const selections: SelectedExerciseV1[] = assignment.entries.map(
    ({ requirementId, candidate, rankingPosition }) => ({
      requirementId,
      exerciseId: candidate.exerciseId,
      rankingPosition,
      candidateScore: candidate.totalScore,
      curatedRank: candidate.curatedRank,
    }),
  );
  const objective: GlobalSelectionObjectiveV1 = {
    requirementCount: selections.length,
    totalScore: selections.reduce(
      (sum, selection) => sum + selection.candidateScore,
      0,
    ),
    tieBreakVector: selections.map(
      (selection) => selection.rankingPosition,
    ),
  };
  return finalize("selected", input, { selections, objective });
}

export function validateGlobalSelectionAgainstInputsV1(
  value: unknown,
  planningValue: unknown,
  catalogValue: unknown,
  coverageValue: unknown,
  rankingValue: unknown,
) {
  const receipt = validateGlobalSelectionV1WithReceipt(value);
  const errors = [...receipt.errors];
  if (errors.length > 0) return errors;
  const supplied = value as GlobalSelectionV1;
  const expected = compileGlobalSelectionV1(
    planningValue,
    catalogValue,
    coverageValue,
    rankingValue,
  );
  if (supplied.selectionDigest !== expected.selectionDigest) {
    errors.push(
      "$.selectionDigest does not match recompilation from the supplied planning, catalog, coverage, and ranking inputs.",
    );
  }
  return errors;
}
