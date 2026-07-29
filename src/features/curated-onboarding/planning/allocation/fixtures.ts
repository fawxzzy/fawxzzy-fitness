import {
  GLOBAL_SELECTION_FIXTURE_IDS,
  createGlobalSelectionFixtureInputs,
  type GlobalSelectionFixtureId,
} from "../selection/fixtures.ts";
import { compileGlobalSelectionV1 } from "../selection/select.ts";
import { compileSessionAllocationV1 } from "./allocate.ts";

export const SESSION_ALLOCATION_FIXTURE_IDS =
  GLOBAL_SELECTION_FIXTURE_IDS;

export type SessionAllocationFixtureId = GlobalSelectionFixtureId;

export const SESSION_ALLOCATION_FIXTURE_EXPECTATIONS = {
  "beginner-home-3day-general-strength": {
    status: "allocated",
    digest: "e4154aa599db00b60be8054f8ad9af026dd41251034e28e40ebfd3b70174fe7d",
  },
  "beginner-planet-fitness-4day-muscle-gain": {
    status: "allocated",
    digest: "117dc6e7533846c9ea5cdc724fd99634063b62c413458e9a648d121244f3183e",
  },
  "intermediate-freeweights-5day-strength": {
    status: "allocated",
    digest: "c0d56ef6fe217c66dc420d2848bad48288db93ff8b806bc81f74f2d762b18348",
  },
  "time-limited-3day-30min": {
    status: "allocated",
    digest: "f6bb943feecfeb90b7731360b77d2496db62c83a3dc1bfa3620b9a5cf00483fc",
  },
  "bodyweight-travel-4day-general-fitness": {
    status: "not_allocatable",
    digest: "8e649b1951adc5f146e75ad453943e15c45e68ea15f9f98a22e9579b99e8e08f",
  },
  "cardio-priority-4day-hybrid": {
    status: "not_allocatable",
    digest: "e36b53d817c6b7bd43c0069635e1aad2ec7446b5dc122adeb8e0e440668ccb19",
  },
  "lower-emphasis-4day-secondary-upper": {
    status: "allocated",
    digest: "0bf9eea7379759c03435c63b31afd158ec46c4d7d410d055bf746bad93b101c0",
  },
  "no-overhead-3day-substitution": {
    status: "not_allocatable",
    digest: "c320995f1cff79b9c8345857c100822a391dbfb07a7886323abeedca69f78309",
  },
  "ambiguous-warning-blocked": {
    status: "not_allocatable",
    digest: "d9e4a4722f80703ca60bdb0b0ef6e1dbe1aeebcb7dfdb14f0c26f3ae9cf0a112",
  },
  "pullup-priority-no-pull-equipment": {
    status: "not_allocatable",
    digest: "242d794dd7f93d85e6a9016ccaf8ee2c51d56029b6e31fdfffb20f33c7be0d97",
  },
} as const satisfies Record<
  SessionAllocationFixtureId,
  {
    status: ReturnType<typeof compileSessionAllocationV1>["status"];
    digest: string;
  }
>;

export function createSessionAllocationFixtureInputs(
  fixtureId: SessionAllocationFixtureId,
) {
  const { planning, catalog, coverage, ranking } =
    createGlobalSelectionFixtureInputs(fixtureId);
  const selection = compileGlobalSelectionV1(
    planning,
    catalog,
    coverage,
    ranking,
  );
  return { planning, catalog, coverage, ranking, selection };
}

export const SESSION_ALLOCATION_FIXTURES = Object.fromEntries(
  SESSION_ALLOCATION_FIXTURE_IDS.map((fixtureId) => {
    const {
      planning,
      catalog,
      coverage,
      ranking,
      selection,
    } = createSessionAllocationFixtureInputs(fixtureId);
    return [
      fixtureId,
      compileSessionAllocationV1(
        planning,
        catalog,
        coverage,
        ranking,
        selection,
      ),
    ];
  }),
) as Record<
  SessionAllocationFixtureId,
  ReturnType<typeof compileSessionAllocationV1>
>;
