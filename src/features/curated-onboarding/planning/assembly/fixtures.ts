import {
  SESSION_PRESCRIPTION_FIXTURE_IDS,
  createSessionPrescriptionFixtureInputs,
  type SessionPrescriptionFixtureId,
} from "../prescription/fixtures.ts";
import { compileSessionPrescriptionV1 } from "../prescription/prescribe.ts";
import { compileRoutineAssemblyV1 } from "./assemble.ts";

export const ROUTINE_ASSEMBLY_FIXTURE_IDS =
  SESSION_PRESCRIPTION_FIXTURE_IDS;

export type RoutineAssemblyFixtureId = SessionPrescriptionFixtureId;

export const ROUTINE_ASSEMBLY_FIXTURE_EXPECTATIONS = {
  "beginner-home-3day-general-strength": {
    status: "assembled",
    digest: "f3432f58ee222792b8a1602e9ef95791825696def570ffe519c4d1055e7c557a",
  },
  "beginner-planet-fitness-4day-muscle-gain": {
    status: "assembled",
    digest: "184cae541c3685d02d7471904c33df804238b915c122b1a8c29d46d944362443",
  },
  "intermediate-freeweights-5day-strength": {
    status: "assembled",
    digest: "65feb3e3a74aa031df707f0bf1ca44ef95ac5142a0d93de6b93d932c0ae1ce2a",
  },
  "time-limited-3day-30min": {
    status: "assembled",
    digest: "f101a17018b9476f1218633f332646664aff98c885b763a77243b3e8b33dd272",
  },
  "bodyweight-travel-4day-general-fitness": {
    status: "not_assemblable",
    digest: "944f55e467b0dc851374088bb1bf937653a601924ea8697379bcf5f9da31d52c",
  },
  "cardio-priority-4day-hybrid": {
    status: "not_assemblable",
    digest: "532be36808863e9b2e6f391b48fff431770cddd284ca8d5693f762a17e26c20a",
  },
  "lower-emphasis-4day-secondary-upper": {
    status: "assembled",
    digest: "30383129cf1a73850f3d7f7c74c4e6abcfb363407fea3710033516e6adf4684d",
  },
  "no-overhead-3day-substitution": {
    status: "not_assemblable",
    digest: "d67f8a8e90c5106ce8496c60f9e8f717efbb68a61516fef1c3449509fc620438",
  },
  "ambiguous-warning-blocked": {
    status: "not_assemblable",
    digest: "803edcb0eebfe8573f260e40ca8a22edc805242cda699f3669510abff4924d06",
  },
  "pullup-priority-no-pull-equipment": {
    status: "not_assemblable",
    digest: "32f332bbd3647e4172017cbe8c10df0e68431bc78c1f6150a232b033020fd74f",
  },
} as const satisfies Record<
  RoutineAssemblyFixtureId,
  {
    status: ReturnType<typeof compileRoutineAssemblyV1>["status"];
    digest: string;
  }
>;

export function createRoutineAssemblyFixtureInputs(
  fixtureId: RoutineAssemblyFixtureId,
) {
  const inputs = createSessionPrescriptionFixtureInputs(fixtureId);
  const prescription = compileSessionPrescriptionV1(
    inputs.planning,
    inputs.catalog,
    inputs.coverage,
    inputs.ranking,
    inputs.selection,
    inputs.allocation,
  );
  return {
    ...inputs,
    prescription,
  };
}

export const ROUTINE_ASSEMBLY_FIXTURES = Object.fromEntries(
  ROUTINE_ASSEMBLY_FIXTURE_IDS.map((fixtureId) => {
    const inputs = createRoutineAssemblyFixtureInputs(fixtureId);
    return [
      fixtureId,
      compileRoutineAssemblyV1(
        inputs.planning,
        inputs.catalog,
        inputs.coverage,
        inputs.ranking,
        inputs.selection,
        inputs.allocation,
        inputs.prescription,
      ),
    ];
  }),
) as Record<
  RoutineAssemblyFixtureId,
  ReturnType<typeof compileRoutineAssemblyV1>
>;
