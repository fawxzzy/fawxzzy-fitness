import {
  NORMALIZED_PLANNING_FIXTURE_IDS,
  createNormalizedPlanningFixtureInput,
  type NormalizedPlanningFixtureId,
} from "../fixtures.ts";
import { PLANNER_EXERCISE_CATALOG_V1 } from "../catalog/catalog.ts";
import { createPersistenceRequestContext } from "../persistence/fixtures.ts";
import { compilePlannerPipelineV1 } from "./compile.ts";

export const PLANNER_PIPELINE_FIXTURE_IDS =
  NORMALIZED_PLANNING_FIXTURE_IDS;

export type PlannerPipelineFixtureId = NormalizedPlanningFixtureId;

export function createPlannerPipelineFixtureInputs(
  fixtureId: PlannerPipelineFixtureId,
) {
  return {
    onboarding: createNormalizedPlanningFixtureInput(fixtureId),
    catalog: PLANNER_EXERCISE_CATALOG_V1,
    request: createPersistenceRequestContext(fixtureId),
  };
}

export const PLANNER_PIPELINE_FIXTURES = Object.fromEntries(
  PLANNER_PIPELINE_FIXTURE_IDS.map((fixtureId) => {
    const inputs = createPlannerPipelineFixtureInputs(fixtureId);
    return [
      fixtureId,
      compilePlannerPipelineV1(
        inputs.onboarding,
        inputs.catalog,
        inputs.request,
      ),
    ];
  }),
) as Record<
  PlannerPipelineFixtureId,
  ReturnType<typeof compilePlannerPipelineV1>
>;

export const PLANNER_PIPELINE_FIXTURE_EXPECTATIONS = {
  "beginner-home-3day-general-strength": {
    status: "ready",
    terminalStage: "persistence_intent",
    digest: "28fe2fc21fd69048d99874783bc5fc72fa3c9a3ec1a58a5b11d884474cee37b3",
  },
  "beginner-planet-fitness-4day-muscle-gain": {
    status: "ready",
    terminalStage: "persistence_intent",
    digest: "1fc8ac3ec06d684448587d29647baf7f91c5c65261a3ff97336a34925ea18291",
  },
  "intermediate-freeweights-5day-strength": {
    status: "ready",
    terminalStage: "persistence_intent",
    digest: "7bcb9057a1baca6cac0ffa9b291463a614194d7369b3eb11fdb255e43a08609b",
  },
  "time-limited-3day-30min": {
    status: "ready",
    terminalStage: "persistence_intent",
    digest: "99b25048857a72b627d2eacf4f718bfdf4a3be152bf4c2d265859043d92ee9a7",
  },
  "bodyweight-travel-4day-general-fitness": {
    status: "infeasible",
    terminalStage: "coverage",
    digest: "faa2f8fe9c1a4ef82d6890b434e239f6bbe453b5563f3840054c892e40a810aa",
  },
  "cardio-priority-4day-hybrid": {
    status: "invalid_input",
    terminalStage: "coverage",
    digest: "fd686a896ddb67dcf407237f1afb93a7b268c627e45ada5dabac7056830e4130",
  },
  "lower-emphasis-4day-secondary-upper": {
    status: "ready",
    terminalStage: "persistence_intent",
    digest: "868185be3f8169916186a04f2f12744d1a82936f34b735f12e53c79d8e90c2ef",
  },
  "no-overhead-3day-substitution": {
    status: "not_ready",
    terminalStage: "coverage",
    digest: "734e93432b113cab08c37714fa5eebe05552330641801a1a51fc2608b8e99bb7",
  },
  "ambiguous-warning-blocked": {
    status: "not_ready",
    terminalStage: "coverage",
    digest: "fe19db267a7c7da056ed62a03c046db54bd9e55e8e411f0bd23f3352c5bd0dec",
  },
  "pullup-priority-no-pull-equipment": {
    status: "infeasible",
    terminalStage: "coverage",
    digest: "cce4b1d25e490ca6d6224a413d1d28580ee62f79e518fdd4bb6443aae9374e00",
  },
} as const;
