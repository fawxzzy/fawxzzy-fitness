import {
  CANDIDATE_RANKING_FIXTURE_IDS,
  createCandidateRankingFixtureInputs,
  type CandidateRankingFixtureId,
} from "../ranking/fixtures.ts";
import { compileCandidateRankingV1 } from "../ranking/rank.ts";
import { compileGlobalSelectionV1 } from "./select.ts";

export const GLOBAL_SELECTION_FIXTURE_IDS =
  CANDIDATE_RANKING_FIXTURE_IDS;

export type GlobalSelectionFixtureId = CandidateRankingFixtureId;

export const GLOBAL_SELECTION_FIXTURE_EXPECTATIONS = {
  "beginner-home-3day-general-strength": {
    status: "selected",
    digest: "babd9da3f02e59732cb12798302b553766df73aefb212b4087633a723b9d5441",
  },
  "beginner-planet-fitness-4day-muscle-gain": {
    status: "selected",
    digest: "afd0ef35115329daf1ac9b587e1f6e4c4bf7fd5972f6552cd629aff30fb2de13",
  },
  "intermediate-freeweights-5day-strength": {
    status: "selected",
    digest: "782226d23001deb28eb0eb28c6905c728e1f8e91c0f2258620ab671e1df5a9f8",
  },
  "time-limited-3day-30min": {
    status: "selected",
    digest: "640dde432dc182be3576f430f140ff8aec0439c30cf283535ab51132c5dbb70d",
  },
  "bodyweight-travel-4day-general-fitness": {
    status: "not_selectable",
    digest: "18555126e5627bba261857f406642dde5936bf18fb7a33cf92977d379c5fd64b",
  },
  "cardio-priority-4day-hybrid": {
    status: "not_selectable",
    digest: "14338f762e92e4afec5e451d9a18fb71c348078c8c29d5b301b449e740c4946b",
  },
  "lower-emphasis-4day-secondary-upper": {
    status: "selected",
    digest: "40c113341ad479550233f2a0e5c0ef91ae0d76ea13f4b4b820e49532fe7e9761",
  },
  "no-overhead-3day-substitution": {
    status: "not_selectable",
    digest: "924dd805f678d4037c38361d331b0526b8fe1eaadc876f5c553651f476662efc",
  },
  "ambiguous-warning-blocked": {
    status: "not_selectable",
    digest: "34f24918e86f4316983bdde0daed00be700601304a82886dde4ee93c920e8343",
  },
  "pullup-priority-no-pull-equipment": {
    status: "not_selectable",
    digest: "8e8f922eee547f59aa7a50a5dd343a2a48589312be7edd5ef0da6ecbcca9d518",
  },
} as const satisfies Record<
  GlobalSelectionFixtureId,
  {
    status: ReturnType<typeof compileGlobalSelectionV1>["status"];
    digest: string;
  }
>;

export function createGlobalSelectionFixtureInputs(
  fixtureId: GlobalSelectionFixtureId,
) {
  const { planning, catalog, coverage } =
    createCandidateRankingFixtureInputs(fixtureId);
  const ranking = compileCandidateRankingV1(
    planning,
    catalog,
    coverage,
  );
  return { planning, catalog, coverage, ranking };
}

export const GLOBAL_SELECTION_FIXTURES = Object.fromEntries(
  GLOBAL_SELECTION_FIXTURE_IDS.map((fixtureId) => {
    const { planning, catalog, coverage, ranking } =
      createGlobalSelectionFixtureInputs(fixtureId);
    return [
      fixtureId,
      compileGlobalSelectionV1(
        planning,
        catalog,
        coverage,
        ranking,
      ),
    ];
  }),
) as Record<
  GlobalSelectionFixtureId,
  ReturnType<typeof compileGlobalSelectionV1>
>;
