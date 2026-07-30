import {
  PLANNER_PIPELINE_FIXTURE_IDS,
  createPlannerPipelineFixtureInputs,
  type PlannerPipelineFixtureId,
} from "../pipeline/fixtures.ts";
import { compilePlannerExecutionCommandV1 } from "./compile.ts";
import type {
  PlannerExecutionProviderContextV1,
} from "./contract.ts";

export const PLANNER_EXECUTION_COMMAND_FIXTURE_IDS =
  PLANNER_PIPELINE_FIXTURE_IDS;

export type PlannerExecutionCommandFixtureId =
  PlannerPipelineFixtureId;

export function createPlannerExecutionCommandFixtureInputs(
  fixtureId: PlannerExecutionCommandFixtureId,
) {
  const pipelineInputs =
    createPlannerPipelineFixtureInputs(fixtureId);
  const providerContext: PlannerExecutionProviderContextV1 = {
    name: `Planner ${fixtureId}`.slice(0, 120),
    startDate: "2026-07-30",
    timezone: "America/New_York",
  };
  return {
    ...pipelineInputs,
    providerContext,
  };
}

export const PLANNER_EXECUTION_COMMAND_FIXTURES =
  Object.fromEntries(
    PLANNER_EXECUTION_COMMAND_FIXTURE_IDS.map((fixtureId) => {
      const inputs =
        createPlannerExecutionCommandFixtureInputs(fixtureId);
      return [
        fixtureId,
        compilePlannerExecutionCommandV1(
          inputs.onboarding,
          inputs.catalog,
          inputs.request,
          inputs.providerContext,
        ),
      ];
    }),
  ) as Record<
    PlannerExecutionCommandFixtureId,
    ReturnType<typeof compilePlannerExecutionCommandV1>
  >;
