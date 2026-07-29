import {
  validateNormalizedPlanningIntakeV1,
} from "../contract.ts";
import {
  validateExerciseCatalogBundleV1,
} from "../catalog/validate.ts";
import {
  COVERAGE_STATUSES,
  type CoverageCompilationV1,
  type CoverageScheduleV1,
} from "../coverage/contract.ts";
import {
  validateCoverageCompilationAgainstInputsV1,
} from "../coverage/compile.ts";
import {
  validateCoverageCompilationV1WithReceipt,
} from "../coverage/contract.ts";
import {
  CANDIDATE_RANKING_STATUSES,
} from "../ranking/contract.ts";
import {
  validateCandidateRankingAgainstInputsV1,
} from "../ranking/rank.ts";
import {
  validateCandidateRankingV1WithReceipt,
} from "../ranking/contract.ts";
import {
  GLOBAL_SELECTION_STATUSES,
  type GlobalSelectionV1,
} from "../selection/contract.ts";
import {
  validateGlobalSelectionAgainstInputsV1,
} from "../selection/select.ts";
import {
  validateGlobalSelectionV1WithReceipt,
} from "../selection/contract.ts";
import {
  SESSION_ALLOCATION_COMPILER_VERSION,
  SESSION_ALLOCATION_ISSUE_POLICY,
  SESSION_ALLOCATION_POLICY_VERSION,
  SESSION_ALLOCATION_SCHEMA_VERSION,
  digestSessionAllocation,
  validateSessionAllocationV1WithReceipt,
  type AllocatedSessionV1,
  type SessionAllocationInputIdentityV1,
  type SessionAllocationIssueCode,
  type SessionAllocationIssueV1,
  type SessionAllocationObjectiveV1,
  type SessionAllocationScheduleV1,
  type SessionAllocationStatus,
  type SessionAllocationV1,
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
  rankingValue: unknown,
  selectionValue: unknown,
): SessionAllocationInputIdentityV1 {
  const planning = asRecord(planningValue);
  const planningSource = asRecord(planning?.source);
  const catalog = asRecord(catalogValue);
  const coverage = asRecord(coverageValue);
  const ranking = asRecord(rankingValue);
  const selection = asRecord(selectionValue);
  const coverageStatus = coverage?.status;
  const rankingStatus = ranking?.status;
  const selectionStatus = selection?.status;
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
    selectionSchemaVersion: safeString(selection?.schemaVersion),
    selectionCompilerVersion: safeString(selection?.compilerVersion),
    selectionPolicyVersion: safeString(selection?.policyVersion),
    selectionDigest: safeDigest(selection?.selectionDigest),
    selectionStatus:
      typeof selectionStatus === "string"
      && GLOBAL_SELECTION_STATUSES.includes(
        selectionStatus as typeof GLOBAL_SELECTION_STATUSES[number],
      )
        ? selectionStatus as typeof GLOBAL_SELECTION_STATUSES[number]
        : null,
  };
}

function issue(
  code: SessionAllocationIssueCode,
  values: Iterable<string> = [],
): SessionAllocationIssueV1 {
  const policy = SESSION_ALLOCATION_ISSUE_POLICY[code];
  return {
    code,
    issueClass: policy.issueClass,
    path: policy.path,
    values: canonicalStrings(values),
  };
}

function finalize(
  status: SessionAllocationStatus,
  input: SessionAllocationInputIdentityV1,
  options: {
    schedule?: SessionAllocationScheduleV1 | null;
    sessions?: AllocatedSessionV1[];
    objective?: SessionAllocationObjectiveV1 | null;
    issues?: SessionAllocationIssueV1[];
  } = {},
): SessionAllocationV1 {
  const withoutDigest = {
    schemaVersion: SESSION_ALLOCATION_SCHEMA_VERSION,
    compilerVersion: SESSION_ALLOCATION_COMPILER_VERSION,
    policyVersion: SESSION_ALLOCATION_POLICY_VERSION,
    input,
    status,
    schedule: options.schedule ?? null,
    sessions: options.sessions ?? [],
    objective: options.objective ?? null,
    issues: [...(options.issues ?? [])].sort((left, right) => (
      canonicalCompare(left.code, right.code)
    )),
  };
  return {
    ...withoutDigest,
    allocationDigest: digestSessionAllocation(withoutDigest),
  };
}

function copySchedule(
  schedule: CoverageScheduleV1,
): SessionAllocationScheduleV1 {
  return {
    requestedDaysPerWeek: schedule.requestedDaysPerWeek,
    weekdays: [...schedule.weekdays],
    dayConstraint: schedule.dayConstraint,
    flexibility: schedule.flexibility,
    sessionMinutes: {
      target: schedule.sessionMinutes.target,
      hardMaximum: schedule.sessionMinutes.hardMaximum,
    },
  };
}

export function compileSessionAllocationV1(
  planningValue: unknown,
  catalogValue: unknown,
  coverageValue: unknown,
  rankingValue: unknown,
  selectionValue: unknown,
): SessionAllocationV1 {
  const input = readInputIdentity(
    planningValue,
    catalogValue,
    coverageValue,
    rankingValue,
    selectionValue,
  );
  const invalidIssues: SessionAllocationIssueV1[] = [];
  const planningErrors = validateNormalizedPlanningIntakeV1(planningValue);
  const catalogErrors = validateExerciseCatalogBundleV1(catalogValue);
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
    invalidIssues.push(issue("COVERAGE_INVALID", coverageReceipt.errors));
  } else {
    const coverageInputErrors = validateCoverageCompilationAgainstInputsV1(
      coverageValue,
      planningValue,
      catalogValue,
    );
    if (coverageInputErrors.length > 0) {
      invalidIssues.push(
        issue("COVERAGE_INPUT_MISMATCH", coverageInputErrors),
      );
    }
  }

  const rankingReceipt = validateCandidateRankingV1WithReceipt(rankingValue);
  if (!rankingReceipt.valid) {
    invalidIssues.push(issue("RANKING_INVALID", rankingReceipt.errors));
  } else {
    const rankingInputErrors = validateCandidateRankingAgainstInputsV1(
      rankingValue,
      planningValue,
      catalogValue,
      coverageValue,
    );
    if (rankingInputErrors.length > 0) {
      invalidIssues.push(
        issue("RANKING_INPUT_MISMATCH", rankingInputErrors),
      );
    }
  }

  const selectionReceipt = validateGlobalSelectionV1WithReceipt(
    selectionValue,
  );
  if (!selectionReceipt.valid) {
    invalidIssues.push(issue("SELECTION_INVALID", selectionReceipt.errors));
  } else {
    const selectionInputErrors = validateGlobalSelectionAgainstInputsV1(
      selectionValue,
      planningValue,
      catalogValue,
      coverageValue,
      rankingValue,
    );
    if (selectionInputErrors.length > 0) {
      invalidIssues.push(
        issue("SELECTION_INPUT_MISMATCH", selectionInputErrors),
      );
    }
  }
  if (invalidIssues.length > 0) {
    return finalize("invalid_input", input, { issues: invalidIssues });
  }

  const coverage = coverageValue as CoverageCompilationV1;
  const selection = selectionValue as GlobalSelectionV1;
  if (selection.status !== "selected") {
    return finalize("not_allocatable", input, {
      issues: [issue("SELECTION_NOT_READY", [
        selection.status,
        coverage.status,
        ...selection.issues.map((entry) => entry.code),
      ])],
    });
  }
  if (!coverage.schedule) {
    return finalize("invalid_input", input, {
      issues: [issue("SCHEDULE_UNAVAILABLE")],
    });
  }

  const schedule = copySchedule(coverage.schedule);
  if (selection.selections.length < schedule.requestedDaysPerWeek) {
    return finalize("infeasible", input, {
      schedule,
      issues: [issue("SESSION_COUNT_EXCEEDS_SELECTIONS", [
        String(schedule.requestedDaysPerWeek),
        String(selection.selections.length),
      ])],
    });
  }

  const sessions: AllocatedSessionV1[] = Array.from(
    { length: schedule.requestedDaysPerWeek },
    (_, index) => ({
      sessionId: `session-${index + 1}`,
      ordinal: index + 1,
      weekday:
        schedule.dayConstraint === "fixed"
          ? schedule.weekdays[index] ?? null
          : null,
      exerciseAssignments: [],
    }),
  );
  selection.selections.forEach((selected, selectionIndex) => {
    const session = sessions[selectionIndex % sessions.length];
    session.exerciseAssignments.push({
      requirementId: selected.requirementId,
      exerciseId: selected.exerciseId,
      selectionPosition: selectionIndex + 1,
      sessionExercisePosition: session.exerciseAssignments.length + 1,
    });
  });

  const exerciseCountBySession = sessions.map(
    (session) => session.exerciseAssignments.length,
  );
  const minimumExerciseCount = Math.min(...exerciseCountBySession);
  const maximumExerciseCount = Math.max(...exerciseCountBySession);
  const objective: SessionAllocationObjectiveV1 = {
    sessionCount: sessions.length,
    exerciseCount: selection.selections.length,
    exerciseCountBySession,
    minimumExerciseCount,
    maximumExerciseCount,
    spread: maximumExerciseCount - minimumExerciseCount,
  };
  return finalize("allocated", input, {
    schedule,
    sessions,
    objective,
  });
}

export function validateSessionAllocationAgainstInputsV1(
  value: unknown,
  planningValue: unknown,
  catalogValue: unknown,
  coverageValue: unknown,
  rankingValue: unknown,
  selectionValue: unknown,
) {
  const receipt = validateSessionAllocationV1WithReceipt(value);
  const errors = [...receipt.errors];
  if (errors.length > 0) return errors;
  const supplied = value as SessionAllocationV1;
  const expected = compileSessionAllocationV1(
    planningValue,
    catalogValue,
    coverageValue,
    rankingValue,
    selectionValue,
  );
  if (supplied.allocationDigest !== expected.allocationDigest) {
    errors.push(
      "$.allocationDigest does not match recompilation from the supplied planning, catalog, coverage, ranking, and selection inputs.",
    );
  }
  return errors;
}
