import {
  NORMALIZED_PLANNING_FIXTURE_IDS,
  NORMALIZED_PLANNING_FIXTURES,
  type NormalizedPlanningFixtureId,
} from "../fixtures.ts";
import { PLANNER_EXERCISE_CATALOG_V1 } from "../catalog/catalog.ts";
import { compilePlanningCoverageV1 } from "../coverage/compile.ts";
import { compileCandidateRankingV1 } from "./rank.ts";

export const CANDIDATE_RANKING_FIXTURE_IDS =
  NORMALIZED_PLANNING_FIXTURE_IDS;

export type CandidateRankingFixtureId = NormalizedPlanningFixtureId;

export const CANDIDATE_RANKING_FIXTURE_EXPECTATIONS = {
  "beginner-home-3day-general-strength": {
    status: "ready",
    digest: "9e26c45b0c0b56ba41ed02221576c42a39f8ff71dcf37204137fb9f4c945946a",
  },
  "beginner-planet-fitness-4day-muscle-gain": {
    status: "ready",
    digest: "dfe686808c68a3aa2936f5e382df5723ddb438c19798c8a33930d68c66f12c3d",
  },
  "intermediate-freeweights-5day-strength": {
    status: "ready",
    digest: "52549599be684099a3b9da51304bb839a2e25178ad63cc024c4cc9e46bb6d16a",
  },
  "time-limited-3day-30min": {
    status: "ready",
    digest: "700506819738e3255ac5214ed0fc5490b0dcb004f87e246c0f780125c73a4489",
  },
  "bodyweight-travel-4day-general-fitness": {
    status: "not_rankable",
    digest: "98f5d4818e8ca033e3b50433f72e4192526c3290de79726a4f586dbe662eb631",
  },
  "cardio-priority-4day-hybrid": {
    status: "not_rankable",
    digest: "889efc86b8dd1b5eac4ec39142f3af466a9766156d3a097e0424bcb4f2f778b7",
  },
  "lower-emphasis-4day-secondary-upper": {
    status: "ready",
    digest: "29e921592e6f1097b8a6d4035a4b9b76ba07df02b348e3004dcdd8c924ed79d5",
  },
  "no-overhead-3day-substitution": {
    status: "not_rankable",
    digest: "42a2732eca604ca8730350a62e366eeefb0c94ea6e8c0f82eec57fcc702fb3f9",
  },
  "ambiguous-warning-blocked": {
    status: "not_rankable",
    digest: "33ad6cd0ff51cb8e2345f86ba7478a505b71c89aa710719f0e1e9d91d7a49539",
  },
  "pullup-priority-no-pull-equipment": {
    status: "not_rankable",
    digest: "801eebdbdba902530ba699592ede87f8057e681de2a73ba750458530ffeee258",
  },
} as const satisfies Record<
  CandidateRankingFixtureId,
  {
    status: ReturnType<typeof compileCandidateRankingV1>["status"];
    digest: string;
  }
>;

export function createCandidateRankingFixtureInputs(
  fixtureId: CandidateRankingFixtureId,
) {
  const planning = structuredClone(NORMALIZED_PLANNING_FIXTURES[fixtureId]);
  const catalog = structuredClone(PLANNER_EXERCISE_CATALOG_V1);
  const coverage = compilePlanningCoverageV1(planning, catalog);
  return { planning, catalog, coverage };
}

export const CANDIDATE_RANKING_FIXTURES = Object.fromEntries(
  CANDIDATE_RANKING_FIXTURE_IDS.map((fixtureId) => {
    const { planning, catalog, coverage } =
      createCandidateRankingFixtureInputs(fixtureId);
    return [
      fixtureId,
      compileCandidateRankingV1(planning, catalog, coverage),
    ];
  }),
) as Record<
  CandidateRankingFixtureId,
  ReturnType<typeof compileCandidateRankingV1>
>;
