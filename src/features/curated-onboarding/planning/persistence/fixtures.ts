import {
  ROUTINE_ASSEMBLY_FIXTURE_IDS,
  createRoutineAssemblyFixtureInputs,
  type RoutineAssemblyFixtureId,
} from "../assembly/fixtures.ts";
import { compileRoutineAssemblyV1 } from "../assembly/assemble.ts";
import {
  compileRoutinePersistenceIntentV1,
} from "./compile.ts";
import {
  type PersistenceRequestContextV1,
} from "./contract.ts";

export const PERSISTENCE_INTENT_FIXTURE_IDS =
  ROUTINE_ASSEMBLY_FIXTURE_IDS;

export type PersistenceIntentFixtureId = RoutineAssemblyFixtureId;

export function createPersistenceRequestContext(
  fixtureId: PersistenceIntentFixtureId,
): PersistenceRequestContextV1 {
  return {
    userId: "fixture-user",
    generationRequestId: `planner-${fixtureId}`,
    creationMode: "create_only",
    activationMode: "deferred",
  };
}

export function createPersistenceIntentFixtureInputs(
  fixtureId: PersistenceIntentFixtureId,
) {
  const inputs = createRoutineAssemblyFixtureInputs(fixtureId);
  const assembly = compileRoutineAssemblyV1(
    inputs.planning,
    inputs.catalog,
    inputs.coverage,
    inputs.ranking,
    inputs.selection,
    inputs.allocation,
    inputs.prescription,
  );
  return {
    ...inputs,
    assembly,
    request: createPersistenceRequestContext(fixtureId),
  };
}

export const PERSISTENCE_INTENT_FIXTURES = Object.fromEntries(
  PERSISTENCE_INTENT_FIXTURE_IDS.map((fixtureId) => {
    const inputs = createPersistenceIntentFixtureInputs(fixtureId);
    return [
      fixtureId,
      compileRoutinePersistenceIntentV1(
        inputs.planning,
        inputs.catalog,
        inputs.coverage,
        inputs.ranking,
        inputs.selection,
        inputs.allocation,
        inputs.prescription,
        inputs.assembly,
        inputs.request,
      ),
    ];
  }),
) as Record<
  PersistenceIntentFixtureId,
  ReturnType<typeof compileRoutinePersistenceIntentV1>
>;

export const PERSISTENCE_INTENT_FIXTURE_EXPECTATIONS = {
  "beginner-home-3day-general-strength": {
    status: "ready_to_create",
    digest: "b05e7177408b3ffc5f2ed28c03d3669970fdf13fc220ab3323f7b7e5b3d0b2c1",
  },
  "beginner-planet-fitness-4day-muscle-gain": {
    status: "ready_to_create",
    digest: "bb01078a440189fe204cc86ae5238afc4c7f4367a4473ef6f882ee3349387df3",
  },
  "intermediate-freeweights-5day-strength": {
    status: "ready_to_create",
    digest: "9c681dbd438d39d609bc0c49e6e24f1d35915b2dd8dcc6db4cd808c43e8487cc",
  },
  "time-limited-3day-30min": {
    status: "ready_to_create",
    digest: "b5da593dad02e28a0e18d43a2cada6ce2184932ab81d0701fab8f8ace22022db",
  },
  "bodyweight-travel-4day-general-fitness": {
    status: "not_creatable",
    digest: "13e679fd2432c2fddbbd1f9e5d43d485ba735e6faa88b75686409586cb01e500",
  },
  "cardio-priority-4day-hybrid": {
    status: "not_creatable",
    digest: "afdafc3361f3b8cc57652cfbcf8aa862354ff35bcc5bcc8a77a4971ff9c7657a",
  },
  "lower-emphasis-4day-secondary-upper": {
    status: "ready_to_create",
    digest: "482639cd09bb0a159b54362802c388e57460c422eef166de6a803656f0c03925",
  },
  "no-overhead-3day-substitution": {
    status: "not_creatable",
    digest: "b431be187d1d79a17e6424411399d6ad09a4b847da4df9ed25c5bac918cf4d2c",
  },
  "ambiguous-warning-blocked": {
    status: "not_creatable",
    digest: "ea15778a5c332c0ffa775f76bf0583bdb72c3e7c220ac4736bef66740675e438",
  },
  "pullup-priority-no-pull-equipment": {
    status: "not_creatable",
    digest: "4114eb958f7d79f6cd3d504aab5b234bbc1ac3c791e03bb06b799fdf077a1c18",
  },
} as const satisfies Record<
  PersistenceIntentFixtureId,
  {
    status: ReturnType<typeof compileRoutinePersistenceIntentV1>["status"];
    digest: string;
  }
>;
