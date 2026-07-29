import {
  SESSION_ALLOCATION_FIXTURE_IDS,
  createSessionAllocationFixtureInputs,
  type SessionAllocationFixtureId,
} from "../allocation/fixtures.ts";
import { compileSessionAllocationV1 } from "../allocation/allocate.ts";
import { compileSessionPrescriptionV1 } from "./prescribe.ts";

export const SESSION_PRESCRIPTION_FIXTURE_IDS =
  SESSION_ALLOCATION_FIXTURE_IDS;

export type SessionPrescriptionFixtureId = SessionAllocationFixtureId;

export const SESSION_PRESCRIPTION_FIXTURE_EXPECTATIONS = {
  "beginner-home-3day-general-strength": {
    status: "prescribed",
    digest: "6e43efc5dccd8b70bd7db57147ff6998d72871830269cd304c2e4e76e78c003e",
  },
  "beginner-planet-fitness-4day-muscle-gain": {
    status: "prescribed",
    digest: "764012deb72281c525c5b1516511b6f3ce428d5261d34dcc94dd0ca31e90e847",
  },
  "intermediate-freeweights-5day-strength": {
    status: "prescribed",
    digest: "a2c89703a20462447a433b898af2710a145b66db81688c0f4237d19037ce65eb",
  },
  "time-limited-3day-30min": {
    status: "prescribed",
    digest: "b67e7c911c8c3dfb2bed7451d311a89e7ec13f80458481ac7b48ff4879498d61",
  },
  "bodyweight-travel-4day-general-fitness": {
    status: "not_prescribable",
    digest: "62058ac607b65a2d155ab66f1357197330a599471f8859315c55ce0a1e656875",
  },
  "cardio-priority-4day-hybrid": {
    status: "not_prescribable",
    digest: "02f22d508e64c4588809b0775ccf0df804669758a8f4966d478da67a5e7f9205",
  },
  "lower-emphasis-4day-secondary-upper": {
    status: "prescribed",
    digest: "25a5e6d56d2f7bd09dacb2710a0f22140ceb741cc4a0d1a5b2fdf4a5594a90bb",
  },
  "no-overhead-3day-substitution": {
    status: "not_prescribable",
    digest: "15dbb848fae05e743c4ee4de02f6b04fa7c43933de985279f4b502c6231911b1",
  },
  "ambiguous-warning-blocked": {
    status: "not_prescribable",
    digest: "c2863d6f77d32057c6c647f4a7a79602c51803ad6f5ce7e13fd53cfeb0f4a964",
  },
  "pullup-priority-no-pull-equipment": {
    status: "not_prescribable",
    digest: "ef1edf04a58f17c8c4889bfec50894459efb54f5915d2fe76719f398e7bd74d3",
  },
} as const satisfies Record<
  SessionPrescriptionFixtureId,
  {
    status: ReturnType<typeof compileSessionPrescriptionV1>["status"];
    digest: string;
  }
>;

export function createSessionPrescriptionFixtureInputs(
  fixtureId: SessionPrescriptionFixtureId,
) {
  const { planning, catalog, coverage, ranking, selection } =
    createSessionAllocationFixtureInputs(fixtureId);
  const allocation = compileSessionAllocationV1(
    planning,
    catalog,
    coverage,
    ranking,
    selection,
  );
  return {
    planning,
    catalog,
    coverage,
    ranking,
    selection,
    allocation,
  };
}

export const SESSION_PRESCRIPTION_FIXTURES = Object.fromEntries(
  SESSION_PRESCRIPTION_FIXTURE_IDS.map((fixtureId) => {
    const {
      planning,
      catalog,
      coverage,
      ranking,
      selection,
      allocation,
    } = createSessionPrescriptionFixtureInputs(fixtureId);
    return [
      fixtureId,
      compileSessionPrescriptionV1(
        planning,
        catalog,
        coverage,
        ranking,
        selection,
        allocation,
      ),
    ];
  }),
) as Record<
  SessionPrescriptionFixtureId,
  ReturnType<typeof compileSessionPrescriptionV1>
>;
