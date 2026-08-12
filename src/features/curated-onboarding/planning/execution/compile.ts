import {
  compilePlannerPipelineV1,
  validatePlannerPipelineAgainstInputsV1,
} from "../pipeline/compile.ts";
import {
  validatePlannerPipelineV1WithReceipt,
  type PlannerPipelineV1,
} from "../pipeline/contract.ts";
import {
  PLANNER_EXECUTION_COMMAND_COMPILER_VERSION,
  PLANNER_EXECUTION_COMMAND_POLICY_VERSION,
  PLANNER_EXECUTION_COMMAND_SCHEMA_VERSION,
  createPlannerExecutionCommandIssue,
  digestPlannerExecutionCommand,
  validatePlannerExecutionCommandV1WithReceipt,
  validatePlannerExecutionProviderContextV1,
  type PlannerExecutionCommandIssueV1,
  type PlannerExecutionCommandStatus,
  type PlannerExecutionCommandV1,
  type PlannerExecutionPayloadV1,
  type PlannerExecutionProviderContextV1,
} from "./contract.ts";

function finalizeExecutionCommand(
  status: PlannerExecutionCommandStatus,
  pipeline: PlannerPipelineV1,
  command: PlannerExecutionPayloadV1 | null,
  issues: PlannerExecutionCommandIssueV1[],
): PlannerExecutionCommandV1 {
  const withoutDigest = {
    schemaVersion: PLANNER_EXECUTION_COMMAND_SCHEMA_VERSION,
    compilerVersion: PLANNER_EXECUTION_COMMAND_COMPILER_VERSION,
    policyVersion: PLANNER_EXECUTION_COMMAND_POLICY_VERSION,
    status,
    pipeline,
    command,
    issues,
  } satisfies Omit<PlannerExecutionCommandV1, "commandDigest">;
  return {
    ...withoutDigest,
    commandDigest: digestPlannerExecutionCommand(withoutDigest),
  };
}

function buildCommand(
  pipeline: PlannerPipelineV1,
  providerContext: PlannerExecutionProviderContextV1,
): PlannerExecutionPayloadV1 | null {
  const stages = pipeline.stages;
  if (
    pipeline.status !== "ready"
    || pipeline.terminalStage !== "persistence_intent"
    || !pipeline.request
    || !stages.planning
    || !stages.catalog
    || !stages.coverage
    || !stages.ranking
    || !stages.selection
    || !stages.allocation
    || !stages.prescription
    || !stages.assembly
    || !stages.persistence_intent
  ) {
    return null;
  }
  return {
    pipelineDigest: pipeline.pipelineDigest,
    intent: stages.persistence_intent,
    exactInputs: {
      planning: stages.planning,
      catalog: stages.catalog,
      coverage: stages.coverage,
      ranking: stages.ranking,
      selection: stages.selection,
      allocation: stages.allocation,
      prescription: stages.prescription,
      assembly: stages.assembly,
      request: pipeline.request,
    },
    providerContext,
  };
}

function pipelineIssue(pipeline: PlannerPipelineV1) {
  const values = [pipeline.status, pipeline.terminalStage];
  return pipeline.status === "invalid_input"
    ? createPlannerExecutionCommandIssue("PIPELINE_INVALID", values)
    : createPlannerExecutionCommandIssue(
        "PIPELINE_NOT_EXECUTABLE",
        values,
      );
}

export function compilePlannerExecutionCommandV1(
  onboardingValue: unknown,
  catalogValue: unknown,
  requestValue: unknown,
  providerContextValue: unknown,
): PlannerExecutionCommandV1 {
  const pipeline = compilePlannerPipelineV1(
    onboardingValue,
    catalogValue,
    requestValue,
  );
  const pipelineReceipt =
    validatePlannerPipelineV1WithReceipt(pipeline);
  const pipelineExactErrors =
    validatePlannerPipelineAgainstInputsV1(
      pipeline,
      onboardingValue,
      catalogValue,
      requestValue,
    );

  if (!pipelineReceipt.valid || pipelineExactErrors.length > 0) {
    return finalizeExecutionCommand(
      "invalid_input",
      pipeline,
      null,
      [
        createPlannerExecutionCommandIssue(
          "PIPELINE_INVALID",
          [pipeline.status, pipeline.terminalStage],
        ),
      ],
    );
  }

  if (pipeline.status !== "ready") {
    return finalizeExecutionCommand(
      pipeline.status === "invalid_input"
        ? "invalid_input"
        : "not_executable",
      pipeline,
      null,
      [pipelineIssue(pipeline)],
    );
  }

  const providerValidation =
    validatePlannerExecutionProviderContextV1(
      providerContextValue,
    );
  if (!providerValidation.context) {
    return finalizeExecutionCommand(
      "invalid_input",
      pipeline,
      null,
      [
        createPlannerExecutionCommandIssue(
          "PROVIDER_CONTEXT_INVALID",
          providerValidation.errorCodes,
        ),
      ],
    );
  }

  const command = buildCommand(
    pipeline,
    providerValidation.context,
  );
  if (!command) {
    return finalizeExecutionCommand(
      "invalid_input",
      pipeline,
      null,
      [
        createPlannerExecutionCommandIssue(
          "PIPELINE_INVALID",
          [pipeline.status, pipeline.terminalStage],
        ),
      ],
    );
  }

  return finalizeExecutionCommand(
    "executable",
    pipeline,
    command,
    [],
  );
}

export function validatePlannerExecutionCommandAgainstInputsV1(
  value: unknown,
  onboardingValue: unknown,
  catalogValue: unknown,
  requestValue: unknown,
  providerContextValue: unknown,
) {
  const receipt =
    validatePlannerExecutionCommandV1WithReceipt(value);
  const errors = [...receipt.errors];
  if (errors.length > 0) return errors;
  const supplied = value as PlannerExecutionCommandV1;
  const expected = compilePlannerExecutionCommandV1(
    onboardingValue,
    catalogValue,
    requestValue,
    providerContextValue,
  );
  if (supplied.commandDigest !== expected.commandDigest) {
    errors.push(
      "$.commandDigest does not match recompilation from the exact onboarding, catalog, request, and provider-context inputs.",
    );
  }
  return errors;
}
