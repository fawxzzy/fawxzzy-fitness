import {
  CURATED_NORMALIZER_VERSION,
  NORMALIZED_PLANNING_INTAKE_VERSION,
  validateNormalizedPlanningIntakeV1,
  type NormalizedPlanningIntakeV1,
} from "../contract.ts";
import {
  EXERCISE_CATALOG_SCHEMA_VERSION,
  EXERCISE_CATALOG_VERSION,
  type ExerciseCatalogBundleV1,
} from "../catalog/contract.ts";
import { validateExerciseCatalogBundleV1 } from "../catalog/validate.ts";
import {
  validateCoverageCompilationV1WithReceipt,
  type CoverageCompilationV1,
} from "../coverage/contract.ts";
import { validateCoverageCompilationAgainstInputsV1 } from "../coverage/compile.ts";
import {
  validateCandidateRankingV1WithReceipt,
  type CandidateRankingV1,
} from "../ranking/contract.ts";
import { validateCandidateRankingAgainstInputsV1 } from "../ranking/rank.ts";
import {
  validateGlobalSelectionV1WithReceipt,
  type GlobalSelectionV1,
} from "../selection/contract.ts";
import { validateGlobalSelectionAgainstInputsV1 } from "../selection/select.ts";
import {
  validateSessionAllocationV1WithReceipt,
  type SessionAllocationV1,
} from "../allocation/contract.ts";
import { validateSessionAllocationAgainstInputsV1 } from "../allocation/allocate.ts";
import {
  validateSessionPrescriptionV1WithReceipt,
  type SessionPrescriptionV1,
} from "../prescription/contract.ts";
import { validateSessionPrescriptionAgainstInputsV1 } from "../prescription/prescribe.ts";
import {
  validateRoutineAssemblyV1WithReceipt,
  type RoutineAssemblyV1,
} from "../assembly/contract.ts";
import { validateRoutineAssemblyAgainstInputsV1 } from "../assembly/assemble.ts";
import {
  validateRoutinePersistenceIntentV1WithReceipt,
  type PersistenceRequestContextV1,
  type RoutinePersistenceIntentV1,
} from "../persistence/contract.ts";
import { validateRoutinePersistenceIntentAgainstInputsV1 } from "../persistence/compile.ts";
import { digestCanonicalJson } from "../canonical.ts";

export const PLANNER_PIPELINE_SCHEMA_VERSION =
  "fitness.planner-pipeline.v1" as const;
export const PLANNER_PIPELINE_COMPILER_VERSION =
  "fitness.planner-pipeline-compiler.2026-07-30.v1" as const;
export const PLANNER_PIPELINE_POLICY_VERSION =
  "fitness.planner-pipeline-policy.2026-07-30.v1" as const;
export const PLANNER_PIPELINE_RUNTIME_VALIDATOR_VERSION =
  "fitness.planner-pipeline-validator.2026-07-30.v1" as const;

export const PLANNER_PIPELINE_STAGES = [
  "planning",
  "catalog",
  "coverage",
  "ranking",
  "selection",
  "allocation",
  "prescription",
  "assembly",
  "persistence_intent",
] as const;

export const PLANNER_PIPELINE_STATUSES = [
  "ready",
  "not_ready",
  "infeasible",
  "invalid_input",
] as const;

export const PLANNER_PIPELINE_ISSUE_CODES = [
  "STAGE_INFEASIBLE",
  "STAGE_INVALID",
  "STAGE_NOT_READY",
] as const;

export const PLANNER_PIPELINE_ISSUE_CLASSES = [
  "infeasible",
  "invalid",
  "not_ready",
] as const;

export type PlannerPipelineStage =
  typeof PLANNER_PIPELINE_STAGES[number];
export type PlannerPipelineStatus =
  typeof PLANNER_PIPELINE_STATUSES[number];
export type PlannerPipelineIssueCode =
  typeof PLANNER_PIPELINE_ISSUE_CODES[number];
export type PlannerPipelineIssueClass =
  typeof PLANNER_PIPELINE_ISSUE_CLASSES[number];

export type PlannerPipelineStagesV1 = {
  planning: NormalizedPlanningIntakeV1 | null;
  catalog: ExerciseCatalogBundleV1 | null;
  coverage: CoverageCompilationV1 | null;
  ranking: CandidateRankingV1 | null;
  selection: GlobalSelectionV1 | null;
  allocation: SessionAllocationV1 | null;
  prescription: SessionPrescriptionV1 | null;
  assembly: RoutineAssemblyV1 | null;
  persistence_intent: RoutinePersistenceIntentV1 | null;
};

export type PlannerPipelineIssueV1 = {
  code: PlannerPipelineIssueCode;
  issueClass: PlannerPipelineIssueClass;
  stage: PlannerPipelineStage;
  path: `/stages/${PlannerPipelineStage}`;
  values: string[];
};

export type PlannerPipelineV1 = {
  schemaVersion: typeof PLANNER_PIPELINE_SCHEMA_VERSION;
  compilerVersion: typeof PLANNER_PIPELINE_COMPILER_VERSION;
  policyVersion: typeof PLANNER_PIPELINE_POLICY_VERSION;
  status: PlannerPipelineStatus;
  terminalStage: PlannerPipelineStage;
  request: PersistenceRequestContextV1 | null;
  stages: PlannerPipelineStagesV1;
  issues: PlannerPipelineIssueV1[];
  pipelineDigest: string;
};

export type PlannerPipelineRuntimeValidationReceiptV1 = {
  validatorVersion: typeof PLANNER_PIPELINE_RUNTIME_VALIDATOR_VERSION;
  schemaVersion: typeof PLANNER_PIPELINE_SCHEMA_VERSION | null;
  pipelineDigest: string | null;
  valid: boolean;
  errors: string[];
};

const ROOT_KEYS = [
  "compilerVersion",
  "issues",
  "pipelineDigest",
  "policyVersion",
  "request",
  "schemaVersion",
  "stages",
  "status",
  "terminalStage",
] as const;

const STAGES_KEYS = [...PLANNER_PIPELINE_STAGES].sort() as PlannerPipelineStage[];
const ISSUE_KEYS = ["code", "issueClass", "path", "stage", "values"] as const;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/;

function canonicalCompare(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
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
    errors.push(`${path} must contain exactly ${canonicalExpected.join(", ")}.`);
  }
}

function canonicalStrings(values: Iterable<string>) {
  return [...new Set([...values].filter(Boolean))].sort(canonicalCompare);
}

function readIssueCodes(value: unknown) {
  const root = asRecord(value);
  if (!Array.isArray(root?.issues)) return [];
  return canonicalStrings(
    root.issues.flatMap((entry) => {
      const issue = asRecord(entry);
      return typeof issue?.code === "string" ? [issue.code] : [];
    }),
  );
}

export function readPlannerPipelineStageIssueValues(
  value: unknown,
) {
  const codes = readIssueCodes(value);
  return codes.length > 0 ? codes : ["STAGE_STATUS_WITHOUT_ISSUES"];
}

export function createPlannerPipelineIssue(
  stage: PlannerPipelineStage,
  status: Exclude<PlannerPipelineStatus, "ready">,
  values: Iterable<string>,
): PlannerPipelineIssueV1 {
  const issueClass: PlannerPipelineIssueClass =
    status === "invalid_input"
      ? "invalid"
      : status === "infeasible"
        ? "infeasible"
        : "not_ready";
  const code: PlannerPipelineIssueCode =
    issueClass === "invalid"
      ? "STAGE_INVALID"
      : issueClass === "infeasible"
        ? "STAGE_INFEASIBLE"
        : "STAGE_NOT_READY";
  return {
    code,
    issueClass,
    stage,
    path: `/stages/${stage}`,
    values: canonicalStrings(values),
  };
}

export function readPlannerPipelineStageStatus(
  stage: PlannerPipelineStage,
  value: unknown,
): PlannerPipelineStatus | null {
  const record = asRecord(value);
  const status = record?.status;
  if (stage === "coverage") {
    if (status === "ready") return "ready";
    if (status === "infeasible") return "infeasible";
    if (status === "blocked" || status === "needs_clarification") {
      return "not_ready";
    }
    if (status === "invalid_input") return "invalid_input";
  }
  if (stage === "ranking") {
    if (status === "ready") return "ready";
    if (status === "not_rankable") return "not_ready";
    if (status === "invalid_input") return "invalid_input";
  }
  if (stage === "selection") {
    if (status === "selected") return "ready";
    if (status === "not_selectable") return "not_ready";
    if (status === "infeasible") return "infeasible";
    if (status === "invalid_input") return "invalid_input";
  }
  if (stage === "allocation") {
    if (status === "allocated") return "ready";
    if (status === "not_allocatable") return "not_ready";
    if (status === "infeasible") return "infeasible";
    if (status === "invalid_input") return "invalid_input";
  }
  if (stage === "prescription") {
    if (status === "prescribed") return "ready";
    if (status === "not_prescribable") return "not_ready";
    if (status === "infeasible") return "infeasible";
    if (status === "invalid_input") return "invalid_input";
  }
  if (stage === "assembly") {
    if (status === "assembled") return "ready";
    if (status === "not_assemblable") return "not_ready";
    if (status === "infeasible") return "infeasible";
    if (status === "invalid_input") return "invalid_input";
  }
  if (stage === "persistence_intent") {
    if (status === "ready_to_create") return "ready";
    if (status === "not_creatable") return "not_ready";
    if (status === "infeasible") return "infeasible";
    if (status === "invalid_input") return "invalid_input";
  }
  return null;
}

export function buildPlannerPipelineSemanticProjection(
  value: Omit<PlannerPipelineV1, "pipelineDigest">,
) {
  return value;
}

export function digestPlannerPipeline(
  value: Omit<PlannerPipelineV1, "pipelineDigest"> | PlannerPipelineV1,
) {
  const {
    pipelineDigest: _pipelineDigest,
    ...projection
  } = value as PlannerPipelineV1;
  return digestCanonicalJson(
    buildPlannerPipelineSemanticProjection(projection),
  );
}

function validateIssue(
  value: unknown,
  path: string,
  errors: string[],
) {
  const issue = asRecord(value);
  if (!issue) {
    errors.push(`${path} must be an object.`);
    return;
  }
  validateExactKeys(issue, ISSUE_KEYS, path, errors);
  if (!PLANNER_PIPELINE_ISSUE_CODES.includes(
    issue.code as PlannerPipelineIssueCode,
  )) {
    errors.push(`${path}.code must be a closed pipeline issue code.`);
  }
  if (!PLANNER_PIPELINE_ISSUE_CLASSES.includes(
    issue.issueClass as PlannerPipelineIssueClass,
  )) {
    errors.push(`${path}.issueClass must be a closed pipeline issue class.`);
  }
  if (!PLANNER_PIPELINE_STAGES.includes(
    issue.stage as PlannerPipelineStage,
  )) {
    errors.push(`${path}.stage must be a closed pipeline stage.`);
  }
  if (
    typeof issue.stage === "string"
    && issue.path !== `/stages/${issue.stage}`
  ) {
    errors.push(`${path}.path must match its stage.`);
  }
  if (!Array.isArray(issue.values) || issue.values.length === 0) {
    errors.push(`${path}.values must be a non-empty array.`);
  } else {
    const values = issue.values;
    if (values.some((entry) => typeof entry !== "string" || entry.length === 0)) {
      errors.push(`${path}.values must contain non-empty strings.`);
    }
    if (
      values.every((entry) => typeof entry === "string")
      && JSON.stringify(values) !== JSON.stringify(canonicalStrings(values))
    ) {
      errors.push(`${path}.values must be unique and canonically ordered.`);
    }
  }
}

function appendReceiptErrors(
  receipt: { errors: string[] },
  path: string,
  errors: string[],
) {
  errors.push(...receipt.errors.map((entry) => `${path}: ${entry}`));
}

function appendExactErrors(
  exactErrors: string[],
  path: string,
  errors: string[],
) {
  errors.push(...exactErrors.map((entry) => `${path}: ${entry}`));
}

function validateEmbeddedStages(
  stages: PlannerPipelineStagesV1,
  request: PersistenceRequestContextV1 | null,
  errors: string[],
) {
  if (stages.planning !== null) {
    errors.push(
      ...validateNormalizedPlanningIntakeV1(stages.planning)
        .map((entry) => `$.stages.planning: ${entry}`),
    );
  }
  if (stages.catalog !== null) {
    errors.push(
      ...validateExerciseCatalogBundleV1(stages.catalog)
        .map((entry) => `$.stages.catalog: ${entry}`),
    );
  }
  if (stages.coverage !== null) {
    appendReceiptErrors(
      validateCoverageCompilationV1WithReceipt(stages.coverage),
      "$.stages.coverage",
      errors,
    );
    if (stages.planning && stages.catalog) {
      appendExactErrors(
        validateCoverageCompilationAgainstInputsV1(
          stages.coverage,
          stages.planning,
          stages.catalog,
        ),
        "$.stages.coverage",
        errors,
      );
    }
  }
  if (stages.ranking !== null) {
    appendReceiptErrors(
      validateCandidateRankingV1WithReceipt(stages.ranking),
      "$.stages.ranking",
      errors,
    );
    if (stages.planning && stages.catalog && stages.coverage) {
      appendExactErrors(
        validateCandidateRankingAgainstInputsV1(
          stages.ranking,
          stages.planning,
          stages.catalog,
          stages.coverage,
        ),
        "$.stages.ranking",
        errors,
      );
    }
  }
  if (stages.selection !== null) {
    appendReceiptErrors(
      validateGlobalSelectionV1WithReceipt(stages.selection),
      "$.stages.selection",
      errors,
    );
    if (
      stages.planning
      && stages.catalog
      && stages.coverage
      && stages.ranking
    ) {
      appendExactErrors(
        validateGlobalSelectionAgainstInputsV1(
          stages.selection,
          stages.planning,
          stages.catalog,
          stages.coverage,
          stages.ranking,
        ),
        "$.stages.selection",
        errors,
      );
    }
  }
  if (stages.allocation !== null) {
    appendReceiptErrors(
      validateSessionAllocationV1WithReceipt(stages.allocation),
      "$.stages.allocation",
      errors,
    );
    if (
      stages.planning
      && stages.catalog
      && stages.coverage
      && stages.ranking
      && stages.selection
    ) {
      appendExactErrors(
        validateSessionAllocationAgainstInputsV1(
          stages.allocation,
          stages.planning,
          stages.catalog,
          stages.coverage,
          stages.ranking,
          stages.selection,
        ),
        "$.stages.allocation",
        errors,
      );
    }
  }
  if (stages.prescription !== null) {
    appendReceiptErrors(
      validateSessionPrescriptionV1WithReceipt(stages.prescription),
      "$.stages.prescription",
      errors,
    );
    if (
      stages.planning
      && stages.catalog
      && stages.coverage
      && stages.ranking
      && stages.selection
      && stages.allocation
    ) {
      appendExactErrors(
        validateSessionPrescriptionAgainstInputsV1(
          stages.prescription,
          stages.planning,
          stages.catalog,
          stages.coverage,
          stages.ranking,
          stages.selection,
          stages.allocation,
        ),
        "$.stages.prescription",
        errors,
      );
    }
  }
  if (stages.assembly !== null) {
    appendReceiptErrors(
      validateRoutineAssemblyV1WithReceipt(stages.assembly),
      "$.stages.assembly",
      errors,
    );
    if (
      stages.planning
      && stages.catalog
      && stages.coverage
      && stages.ranking
      && stages.selection
      && stages.allocation
      && stages.prescription
    ) {
      appendExactErrors(
        validateRoutineAssemblyAgainstInputsV1(
          stages.assembly,
          stages.planning,
          stages.catalog,
          stages.coverage,
          stages.ranking,
          stages.selection,
          stages.allocation,
          stages.prescription,
        ),
        "$.stages.assembly",
        errors,
      );
    }
  }
  if (stages.persistence_intent !== null) {
    appendReceiptErrors(
      validateRoutinePersistenceIntentV1WithReceipt(
        stages.persistence_intent,
      ),
      "$.stages.persistence_intent",
      errors,
    );
    if (
      stages.planning
      && stages.catalog
      && stages.coverage
      && stages.ranking
      && stages.selection
      && stages.allocation
      && stages.prescription
      && stages.assembly
      && request
    ) {
      appendExactErrors(
        validateRoutinePersistenceIntentAgainstInputsV1(
          stages.persistence_intent,
          stages.planning,
          stages.catalog,
          stages.coverage,
          stages.ranking,
          stages.selection,
          stages.allocation,
          stages.prescription,
          stages.assembly,
          request,
        ),
        "$.stages.persistence_intent",
        errors,
      );
    }
  }
}

function validateRequest(
  value: unknown,
  errors: string[],
) {
  if (value === null) return;
  const request = asRecord(value);
  if (!request) {
    errors.push("$.request must be null or an object.");
    return;
  }
  validateExactKeys(
    request,
    ["activationMode", "creationMode", "generationRequestId", "userId"],
    "$.request",
    errors,
  );
  for (const key of ["generationRequestId", "userId"] as const) {
    if (
      typeof request[key] !== "string"
      || !/^[a-z0-9](?:[a-z0-9._:-]{0,126}[a-z0-9])?$/.test(
        request[key] as string,
      )
    ) {
      errors.push(`$.request.${key} must be a canonical identifier.`);
    }
  }
  if (request.creationMode !== "create_only") {
    errors.push("$.request.creationMode must equal create_only.");
  }
  if (request.activationMode !== "deferred") {
    errors.push("$.request.activationMode must equal deferred.");
  }
}

function expectedTerminal(
  stages: PlannerPipelineStagesV1,
  terminalStage: PlannerPipelineStage,
) {
  const terminalValue = stages[terminalStage];
  if (terminalValue === null) {
    const values =
      terminalStage === "planning"
        ? ["NORMALIZATION_FAILED"]
        : terminalStage === "catalog"
          ? ["CATALOG_VALIDATION_FAILED"]
          : ["STAGE_VALIDATION_FAILED"];
    return {
      status: "invalid_input" as const,
      issue: createPlannerPipelineIssue(
        terminalStage,
        "invalid_input",
        values,
      ),
    };
  }
  const status = readPlannerPipelineStageStatus(terminalStage, terminalValue);
  if (!status || status === "ready") return null;
  return {
    status,
    issue: createPlannerPipelineIssue(
      terminalStage,
      status,
      readPlannerPipelineStageIssueValues(terminalValue),
    ),
  };
}

export function validatePlannerPipelineV1(value: unknown) {
  const errors: string[] = [];
  const root = asRecord(value);
  if (!root) return ["$ must be an object."];
  validateExactKeys(root, ROOT_KEYS, "$", errors);

  if (root.schemaVersion !== PLANNER_PIPELINE_SCHEMA_VERSION) {
    errors.push(
      `$.schemaVersion must equal ${PLANNER_PIPELINE_SCHEMA_VERSION}.`,
    );
  }
  if (root.compilerVersion !== PLANNER_PIPELINE_COMPILER_VERSION) {
    errors.push(
      `$.compilerVersion must equal ${PLANNER_PIPELINE_COMPILER_VERSION}.`,
    );
  }
  if (root.policyVersion !== PLANNER_PIPELINE_POLICY_VERSION) {
    errors.push(
      `$.policyVersion must equal ${PLANNER_PIPELINE_POLICY_VERSION}.`,
    );
  }
  if (!PLANNER_PIPELINE_STATUSES.includes(
    root.status as PlannerPipelineStatus,
  )) {
    errors.push("$.status must be a closed pipeline status.");
  }
  if (!PLANNER_PIPELINE_STAGES.includes(
    root.terminalStage as PlannerPipelineStage,
  )) {
    errors.push("$.terminalStage must be a closed pipeline stage.");
  }

  const stagesRecord = asRecord(root.stages);
  if (!stagesRecord) {
    errors.push("$.stages must be an object.");
  } else {
    validateExactKeys(stagesRecord, STAGES_KEYS, "$.stages", errors);
  }

  if (!Array.isArray(root.issues)) {
    errors.push("$.issues must be an array.");
  } else {
    root.issues.forEach((issue, index) => {
      validateIssue(issue, `$.issues[${index}]`, errors);
    });
  }

  validateRequest(root.request, errors);

  if (
    typeof root.pipelineDigest !== "string"
    || !DIGEST_PATTERN.test(root.pipelineDigest)
  ) {
    errors.push("$.pipelineDigest must be a SHA-256 hex digest.");
  }

  if (
    stagesRecord
    && PLANNER_PIPELINE_STAGES.includes(
      root.terminalStage as PlannerPipelineStage,
    )
  ) {
    const terminalStage = root.terminalStage as PlannerPipelineStage;
    const terminalIndex = PLANNER_PIPELINE_STAGES.indexOf(terminalStage);
    for (const [index, stage] of PLANNER_PIPELINE_STAGES.entries()) {
      const stageValue = stagesRecord[stage];
      if (index < terminalIndex && stageValue == null) {
        errors.push(`$.stages.${stage} must precede the terminal stage.`);
      }
      if (index > terminalIndex && stageValue !== null) {
        errors.push(
          `$.stages.${stage} must be null after the terminal stage.`,
        );
      }
    }

    try {
      validateEmbeddedStages(
        stagesRecord as unknown as PlannerPipelineStagesV1,
        root.request as PersistenceRequestContextV1 | null,
        errors,
      );
    } catch {
      errors.push("$.stages validation must not throw.");
    }

    const status = root.status as PlannerPipelineStatus;
    const issues = Array.isArray(root.issues) ? root.issues : [];
    if (status === "ready") {
      if (terminalStage !== "persistence_intent") {
        errors.push(
          "$.terminalStage must equal persistence_intent when status is ready.",
        );
      }
      if (
        stagesRecord.persistence_intent == null
        || readPlannerPipelineStageStatus(
          "persistence_intent",
          stagesRecord.persistence_intent,
        ) !== "ready"
      ) {
        errors.push(
          "$.stages.persistence_intent must be ready_to_create when the pipeline is ready.",
        );
      }
      if (root.request === null) {
        errors.push("$.request must be present when the pipeline is ready.");
      }
      if (issues.length !== 0) {
        errors.push("$.issues must be empty when the pipeline is ready.");
      }
    } else if (PLANNER_PIPELINE_STATUSES.includes(status)) {
      const expected = expectedTerminal(
        stagesRecord as unknown as PlannerPipelineStagesV1,
        terminalStage,
      );
      if (!expected) {
        errors.push(
          "$.terminalStage must identify a non-ready or invalid stage.",
        );
      } else {
        if (status !== expected.status) {
          errors.push("$.status must match the terminal stage status.");
        }
        if (
          issues.length !== 1
          || JSON.stringify(issues[0]) !== JSON.stringify(expected.issue)
        ) {
          errors.push(
            "$.issues must equal the canonical terminal-stage evidence.",
          );
        }
      }
    }
  }

  if (
    errors.length === 0
    && typeof root.pipelineDigest === "string"
  ) {
    const expectedDigest = digestPlannerPipeline(
      root as unknown as PlannerPipelineV1,
    );
    if (root.pipelineDigest !== expectedDigest) {
      errors.push(
        "$.pipelineDigest does not match the pipeline semantic projection.",
      );
    }
  }
  return errors;
}

export function validatePlannerPipelineV1WithReceipt(
  value: unknown,
): PlannerPipelineRuntimeValidationReceiptV1 {
  let errors: string[];
  try {
    errors = validatePlannerPipelineV1(value);
  } catch {
    errors = ["$ validation must not throw."];
  }
  const root = asRecord(value);
  return {
    validatorVersion: PLANNER_PIPELINE_RUNTIME_VALIDATOR_VERSION,
    schemaVersion:
      root?.schemaVersion === PLANNER_PIPELINE_SCHEMA_VERSION
        ? PLANNER_PIPELINE_SCHEMA_VERSION
        : null,
    pipelineDigest:
      typeof root?.pipelineDigest === "string"
      && DIGEST_PATTERN.test(root.pipelineDigest)
        ? root.pipelineDigest
        : null,
    valid: errors.length === 0,
    errors,
  };
}

export const PLANNER_PIPELINE_BOUND_VERSIONS = Object.freeze({
  normalizer: CURATED_NORMALIZER_VERSION,
  planning: NORMALIZED_PLANNING_INTAKE_VERSION,
  catalogSchema: EXERCISE_CATALOG_SCHEMA_VERSION,
  catalog: EXERCISE_CATALOG_VERSION,
});
