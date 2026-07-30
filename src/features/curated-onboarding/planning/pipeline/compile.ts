import type { CuratedOnboardingData } from "@/features/curated-onboarding/types";
import {
  validateNormalizedPlanningIntakeV1,
  type NormalizedPlanningIntakeV1,
} from "../contract.ts";
import { normalizeCuratedPlanningIntake } from "../normalize.ts";
import type { ExerciseCatalogBundleV1 } from "../catalog/contract.ts";
import { validateExerciseCatalogBundleV1 } from "../catalog/validate.ts";
import {
  validateCoverageCompilationV1WithReceipt,
  type CoverageCompilationV1,
} from "../coverage/contract.ts";
import {
  compilePlanningCoverageV1,
  validateCoverageCompilationAgainstInputsV1,
} from "../coverage/compile.ts";
import {
  validateCandidateRankingV1WithReceipt,
  type CandidateRankingV1,
} from "../ranking/contract.ts";
import {
  compileCandidateRankingV1,
  validateCandidateRankingAgainstInputsV1,
} from "../ranking/rank.ts";
import {
  validateGlobalSelectionV1WithReceipt,
  type GlobalSelectionV1,
} from "../selection/contract.ts";
import {
  compileGlobalSelectionV1,
  validateGlobalSelectionAgainstInputsV1,
} from "../selection/select.ts";
import {
  validateSessionAllocationV1WithReceipt,
  type SessionAllocationV1,
} from "../allocation/contract.ts";
import {
  compileSessionAllocationV1,
  validateSessionAllocationAgainstInputsV1,
} from "../allocation/allocate.ts";
import {
  validateSessionPrescriptionV1WithReceipt,
  type SessionPrescriptionV1,
} from "../prescription/contract.ts";
import {
  compileSessionPrescriptionV1,
  validateSessionPrescriptionAgainstInputsV1,
} from "../prescription/prescribe.ts";
import {
  validateRoutineAssemblyV1WithReceipt,
  type RoutineAssemblyV1,
} from "../assembly/contract.ts";
import {
  compileRoutineAssemblyV1,
  validateRoutineAssemblyAgainstInputsV1,
} from "../assembly/assemble.ts";
import {
  validateRoutinePersistenceIntentV1WithReceipt,
  type PersistenceRequestContextV1,
  type RoutinePersistenceIntentV1,
} from "../persistence/contract.ts";
import {
  compileRoutinePersistenceIntentV1,
  validateRoutinePersistenceIntentAgainstInputsV1,
} from "../persistence/compile.ts";
import {
  PLANNER_PIPELINE_COMPILER_VERSION,
  PLANNER_PIPELINE_POLICY_VERSION,
  PLANNER_PIPELINE_SCHEMA_VERSION,
  createPlannerPipelineIssue,
  digestPlannerPipeline,
  readPlannerPipelineStageIssueValues,
  readPlannerPipelineStageStatus,
  validatePlannerPipelineV1WithReceipt,
  type PlannerPipelineStage,
  type PlannerPipelineStagesV1,
  type PlannerPipelineStatus,
  type PlannerPipelineV1,
} from "./contract.ts";

const REQUEST_IDENTIFIER_PATTERN =
  /^[a-z0-9](?:[a-z0-9._:-]{0,126}[a-z0-9])?$/;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function readValidRequest(
  value: unknown,
): PersistenceRequestContextV1 | null {
  const request = asRecord(value);
  if (!request) return null;
  const keys = Object.keys(request).sort();
  const expected = [
    "activationMode",
    "creationMode",
    "generationRequestId",
    "userId",
  ];
  if (
    keys.length !== expected.length
    || keys.some((key, index) => key !== expected[index])
  ) {
    return null;
  }
  if (
    typeof request.userId !== "string"
    || !REQUEST_IDENTIFIER_PATTERN.test(request.userId)
    || typeof request.generationRequestId !== "string"
    || !REQUEST_IDENTIFIER_PATTERN.test(request.generationRequestId)
    || request.creationMode !== "create_only"
    || request.activationMode !== "deferred"
  ) {
    return null;
  }
  return {
    userId: request.userId,
    generationRequestId: request.generationRequestId,
    creationMode: "create_only",
    activationMode: "deferred",
  };
}

function emptyStages(): PlannerPipelineStagesV1 {
  return {
    planning: null,
    catalog: null,
    coverage: null,
    ranking: null,
    selection: null,
    allocation: null,
    prescription: null,
    assembly: null,
    persistence_intent: null,
  };
}

function finalizePipeline(
  request: PersistenceRequestContextV1 | null,
  status: PlannerPipelineStatus,
  terminalStage: PlannerPipelineStage,
  stages: PlannerPipelineStagesV1,
  issueValues: Iterable<string> = [],
): PlannerPipelineV1 {
  const withoutDigest = {
    schemaVersion: PLANNER_PIPELINE_SCHEMA_VERSION,
    compilerVersion: PLANNER_PIPELINE_COMPILER_VERSION,
    policyVersion: PLANNER_PIPELINE_POLICY_VERSION,
    status,
    terminalStage,
    request,
    stages,
    issues:
      status === "ready"
        ? []
        : [
            createPlannerPipelineIssue(
              terminalStage,
              status,
              issueValues,
            ),
          ],
  } satisfies Omit<PlannerPipelineV1, "pipelineDigest">;
  return {
    ...withoutDigest,
    pipelineDigest: digestPlannerPipeline(withoutDigest),
  };
}

function stageValidationFailed(
  request: PersistenceRequestContextV1 | null,
  terminalStage: PlannerPipelineStage,
  stages: PlannerPipelineStagesV1,
) {
  return finalizePipeline(
    request,
    "invalid_input",
    terminalStage,
    stages,
    ["STAGE_VALIDATION_FAILED"],
  );
}

function stopIfTerminal(
  request: PersistenceRequestContextV1 | null,
  stage: Exclude<PlannerPipelineStage, "planning" | "catalog">,
  value: unknown,
  stages: PlannerPipelineStagesV1,
) {
  const status = readPlannerPipelineStageStatus(stage, value);
  if (!status || status === "ready") return null;
  return finalizePipeline(
    request,
    status,
    stage,
    stages,
    readPlannerPipelineStageIssueValues(value),
  );
}

export function compilePlannerPipelineV1(
  onboardingValue: unknown,
  catalogValue: unknown,
  requestValue: unknown,
): PlannerPipelineV1 {
  const request = readValidRequest(requestValue);
  const stages = emptyStages();
  const onboarding = asRecord(onboardingValue);
  if (!onboarding || !asRecord(onboarding.intakeResponses)) {
    return finalizePipeline(
      request,
      "invalid_input",
      "planning",
      stages,
      ["NORMALIZATION_FAILED"],
    );
  }

  let planning: NormalizedPlanningIntakeV1;
  try {
    planning = normalizeCuratedPlanningIntake(
      onboardingValue as CuratedOnboardingData,
    );
  } catch {
    return finalizePipeline(
      request,
      "invalid_input",
      "planning",
      stages,
      ["NORMALIZATION_FAILED"],
    );
  }
  if (validateNormalizedPlanningIntakeV1(planning).length > 0) {
    return finalizePipeline(
      request,
      "invalid_input",
      "planning",
      stages,
      ["NORMALIZATION_FAILED"],
    );
  }
  stages.planning = planning;

  if (validateExerciseCatalogBundleV1(catalogValue).length > 0) {
    return finalizePipeline(
      request,
      "invalid_input",
      "catalog",
      stages,
      ["CATALOG_VALIDATION_FAILED"],
    );
  }
  const catalog = catalogValue as ExerciseCatalogBundleV1;
  stages.catalog = catalog;

  const coverage = compilePlanningCoverageV1(planning, catalog);
  if (
    !validateCoverageCompilationV1WithReceipt(coverage).valid
    || validateCoverageCompilationAgainstInputsV1(
      coverage,
      planning,
      catalog,
    ).length > 0
  ) {
    return stageValidationFailed(request, "coverage", stages);
  }
  stages.coverage = coverage;
  const coverageTerminal = stopIfTerminal(
    request,
    "coverage",
    coverage,
    stages,
  );
  if (coverageTerminal) return coverageTerminal;

  const ranking = compileCandidateRankingV1(
    planning,
    catalog,
    coverage,
  );
  if (
    !validateCandidateRankingV1WithReceipt(ranking).valid
    || validateCandidateRankingAgainstInputsV1(
      ranking,
      planning,
      catalog,
      coverage,
    ).length > 0
  ) {
    return stageValidationFailed(request, "ranking", stages);
  }
  stages.ranking = ranking;
  const rankingTerminal = stopIfTerminal(
    request,
    "ranking",
    ranking,
    stages,
  );
  if (rankingTerminal) return rankingTerminal;

  const selection = compileGlobalSelectionV1(
    planning,
    catalog,
    coverage,
    ranking,
  );
  if (
    !validateGlobalSelectionV1WithReceipt(selection).valid
    || validateGlobalSelectionAgainstInputsV1(
      selection,
      planning,
      catalog,
      coverage,
      ranking,
    ).length > 0
  ) {
    return stageValidationFailed(request, "selection", stages);
  }
  stages.selection = selection;
  const selectionTerminal = stopIfTerminal(
    request,
    "selection",
    selection,
    stages,
  );
  if (selectionTerminal) return selectionTerminal;

  const allocation = compileSessionAllocationV1(
    planning,
    catalog,
    coverage,
    ranking,
    selection,
  );
  if (
    !validateSessionAllocationV1WithReceipt(allocation).valid
    || validateSessionAllocationAgainstInputsV1(
      allocation,
      planning,
      catalog,
      coverage,
      ranking,
      selection,
    ).length > 0
  ) {
    return stageValidationFailed(request, "allocation", stages);
  }
  stages.allocation = allocation;
  const allocationTerminal = stopIfTerminal(
    request,
    "allocation",
    allocation,
    stages,
  );
  if (allocationTerminal) return allocationTerminal;

  const prescription = compileSessionPrescriptionV1(
    planning,
    catalog,
    coverage,
    ranking,
    selection,
    allocation,
  );
  if (
    !validateSessionPrescriptionV1WithReceipt(prescription).valid
    || validateSessionPrescriptionAgainstInputsV1(
      prescription,
      planning,
      catalog,
      coverage,
      ranking,
      selection,
      allocation,
    ).length > 0
  ) {
    return stageValidationFailed(request, "prescription", stages);
  }
  stages.prescription = prescription;
  const prescriptionTerminal = stopIfTerminal(
    request,
    "prescription",
    prescription,
    stages,
  );
  if (prescriptionTerminal) return prescriptionTerminal;

  const assembly = compileRoutineAssemblyV1(
    planning,
    catalog,
    coverage,
    ranking,
    selection,
    allocation,
    prescription,
  );
  if (
    !validateRoutineAssemblyV1WithReceipt(assembly).valid
    || validateRoutineAssemblyAgainstInputsV1(
      assembly,
      planning,
      catalog,
      coverage,
      ranking,
      selection,
      allocation,
      prescription,
    ).length > 0
  ) {
    return stageValidationFailed(request, "assembly", stages);
  }
  stages.assembly = assembly;
  const assemblyTerminal = stopIfTerminal(
    request,
    "assembly",
    assembly,
    stages,
  );
  if (assemblyTerminal) return assemblyTerminal;

  const persistenceIntent = compileRoutinePersistenceIntentV1(
    planning,
    catalog,
    coverage,
    ranking,
    selection,
    allocation,
    prescription,
    assembly,
    requestValue,
  );
  if (
    !validateRoutinePersistenceIntentV1WithReceipt(
      persistenceIntent,
    ).valid
    || validateRoutinePersistenceIntentAgainstInputsV1(
      persistenceIntent,
      planning,
      catalog,
      coverage,
      ranking,
      selection,
      allocation,
      prescription,
      assembly,
      requestValue,
    ).length > 0
  ) {
    return stageValidationFailed(
      request,
      "persistence_intent",
      stages,
    );
  }
  stages.persistence_intent = persistenceIntent;
  const persistenceTerminal = stopIfTerminal(
    request,
    "persistence_intent",
    persistenceIntent,
    stages,
  );
  if (persistenceTerminal) return persistenceTerminal;

  return finalizePipeline(
    request,
    "ready",
    "persistence_intent",
    stages,
  );
}

export function validatePlannerPipelineAgainstInputsV1(
  value: unknown,
  onboardingValue: unknown,
  catalogValue: unknown,
  requestValue: unknown,
) {
  const receipt = validatePlannerPipelineV1WithReceipt(value);
  const errors = [...receipt.errors];
  if (errors.length > 0) return errors;
  const supplied = value as PlannerPipelineV1;
  const expected = compilePlannerPipelineV1(
    onboardingValue,
    catalogValue,
    requestValue,
  );
  if (supplied.pipelineDigest !== expected.pipelineDigest) {
    errors.push(
      "$.pipelineDigest does not match recompilation from the supplied onboarding, catalog, and request inputs.",
    );
  }
  return errors;
}

export type PlannerPipelineCompiledStages = {
  planning: NormalizedPlanningIntakeV1;
  catalog: ExerciseCatalogBundleV1;
  coverage: CoverageCompilationV1;
  ranking: CandidateRankingV1;
  selection: GlobalSelectionV1;
  allocation: SessionAllocationV1;
  prescription: SessionPrescriptionV1;
  assembly: RoutineAssemblyV1;
  persistenceIntent: RoutinePersistenceIntentV1;
};
