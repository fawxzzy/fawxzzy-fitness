import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  digestRoutineAssembly,
  type RoutineAssemblyV1,
} from "../assembly/contract.ts";
import {
  derivePersistenceUniquenessKeyV1,
  digestRoutinePersistenceIntent,
  reconstructRoutineFromPersistenceRecordsV1,
  validateRoutinePersistenceIntentV1WithReceipt,
  type RoutinePersistenceIntentV1,
} from "./contract.ts";
import {
  compileRoutinePersistenceIntentV1,
  validateRoutinePersistenceIntentAgainstInputsV1,
} from "./compile.ts";
import {
  PERSISTENCE_INTENT_FIXTURE_EXPECTATIONS,
  PERSISTENCE_INTENT_FIXTURE_IDS,
  PERSISTENCE_INTENT_FIXTURES,
  createPersistenceIntentFixtureInputs,
} from "./fixtures.ts";

const READY_FIXTURE_ID =
  "beginner-home-3day-general-strength" as const;

function validateFixtureAgainstInputs(
  fixtureId: typeof PERSISTENCE_INTENT_FIXTURE_IDS[number],
  value: unknown = PERSISTENCE_INTENT_FIXTURES[fixtureId],
) {
  const inputs = createPersistenceIntentFixtureInputs(fixtureId);
  return validateRoutinePersistenceIntentAgainstInputsV1(
    value,
    inputs.planning,
    inputs.catalog,
    inputs.coverage,
    inputs.ranking,
    inputs.selection,
    inputs.allocation,
    inputs.prescription,
    inputs.assembly,
    inputs.request,
  );
}

test("persistence intent fixtures have pinned deterministic identities", () => {
  for (const fixtureId of PERSISTENCE_INTENT_FIXTURE_IDS) {
    const fixture = PERSISTENCE_INTENT_FIXTURES[fixtureId];
    const expected = PERSISTENCE_INTENT_FIXTURE_EXPECTATIONS[fixtureId];
    assert.equal(fixture.status, expected.status, fixtureId);
    assert.equal(fixture.intentDigest, expected.digest, fixtureId);
    assert.equal(
      digestRoutinePersistenceIntent(fixture),
      expected.digest,
      fixtureId,
    );
    assert.deepEqual(
      validateRoutinePersistenceIntentV1WithReceipt(fixture),
      {
        validatorVersion:
          "fitness.routine-persistence-intent-validator.2026-07-29.v1",
        schemaVersion: "fitness.routine-persistence-intent.v1",
        intentDigest: expected.digest,
        valid: true,
        errors: [],
      },
      fixtureId,
    );
  }
});

test("ready intents retain planning provenance and round-trip the routine", () => {
  for (const fixtureId of PERSISTENCE_INTENT_FIXTURE_IDS) {
    const fixture = PERSISTENCE_INTENT_FIXTURES[fixtureId];
    if (fixture.status !== "ready_to_create") continue;
    assert.ok(fixture.planning, fixtureId);
    assert.ok(fixture.assembly?.routine, fixtureId);
    assert.ok(fixture.creation, fixtureId);
    assert.deepEqual(
      fixture.planning.provenance,
      createPersistenceIntentFixtureInputs(fixtureId).planning.provenance,
      fixtureId,
    );
    assert.deepEqual(
      reconstructRoutineFromPersistenceRecordsV1(
        fixture.creation.records,
      ),
      fixture.assembly.routine,
      fixtureId,
    );
    assert.equal(
      fixture.creation.records.routine.activationState,
      "not_requested",
      fixtureId,
    );
    assert.equal(fixture.creation.activationMode, "deferred", fixtureId);
    assert.equal(
      fixture.creation.records.exercises.every(
        (entry) => entry.warmup === null,
      ),
      true,
      fixtureId,
    );
  }
});

test("record graph retains prescription, explanation, and substitutions", () => {
  const fixture = PERSISTENCE_INTENT_FIXTURES[READY_FIXTURE_ID];
  assert.ok(fixture.creation);
  assert.ok(fixture.assembly?.routine);
  const sourcePrescriptions = fixture.assembly.routine.sessions.flatMap(
    (session) => session.exercises,
  );
  assert.deepEqual(
    fixture.creation.records.exercises.map((entry) => entry.prescription),
    sourcePrescriptions,
  );
  assert.equal(
    fixture.creation.records.exercises.every(
      (entry) => (
        entry.rankingExplanation?.exerciseId
          === entry.prescription.exerciseId
        && entry.rankingExplanation.requirementId
          === entry.prescription.requirementId
      ),
    ),
    true,
  );
  assert.equal(
    fixture.creation.records.exercises.every(
      (entry) => entry.substitutionRules.every(
        (rule) => rule.sourceExerciseId === entry.prescription.exerciseId,
      ),
    ),
    true,
  );
});

test("non-assembled terminals contain no partial creation graph", () => {
  for (const fixtureId of PERSISTENCE_INTENT_FIXTURE_IDS) {
    const fixture = PERSISTENCE_INTENT_FIXTURES[fixtureId];
    if (fixture.status === "ready_to_create") continue;
    assert.equal(fixture.creation, null, fixtureId);
    assert.equal(fixture.issues.length, 1, fixtureId);
    assert.equal(fixture.status, "not_creatable", fixtureId);
    assert.deepEqual(
      fixture.issues.map((entry) => entry.code),
      ["ASSEMBLY_NOT_READY"],
      fixtureId,
    );
  }
});

test("every fixture validates against all exact source inputs", () => {
  for (const fixtureId of PERSISTENCE_INTENT_FIXTURE_IDS) {
    assert.deepEqual(
      validateFixtureAgainstInputs(fixtureId),
      [],
      fixtureId,
    );
  }
});

test("runtime receipt rejects malformed record members without throwing", () => {
  const malformed = structuredClone(
    PERSISTENCE_INTENT_FIXTURES[READY_FIXTURE_ID],
  ) as RoutinePersistenceIntentV1;
  assert.ok(malformed.creation);
  delete (
    malformed.creation.records.exercises[0].prescription as unknown as {
      timeEstimate?: unknown;
    }
  ).timeEstimate;
  malformed.intentDigest = digestRoutinePersistenceIntent(malformed);
  assert.doesNotThrow(
    () => validateRoutinePersistenceIntentV1WithReceipt(malformed),
  );
  const receipt =
    validateRoutinePersistenceIntentV1WithReceipt(malformed);
  assert.equal(receipt.valid, false);
  assert.match(
    receipt.errors.join("\n"),
    /preserve the assembled prescription|round-trip/,
  );
});

test("runtime receipt rejects request and uniqueness re-signing", () => {
  const forged = structuredClone(
    PERSISTENCE_INTENT_FIXTURES[READY_FIXTURE_ID],
  );
  forged.request.generationRequestId = "forged-request";
  forged.request.uniquenessKey = derivePersistenceUniquenessKeyV1(
    forged.request.userId!,
    forged.request.generationRequestId,
  );
  forged.intentDigest = digestRoutinePersistenceIntent(forged);
  const receipt = validateRoutinePersistenceIntentV1WithReceipt(forged);
  assert.equal(receipt.valid, false);
  assert.match(
    receipt.errors.join("\n"),
    /preserve the exact request identity|recordId must match/,
  );
});

test("runtime receipt rejects record omission, injection, and reordering", () => {
  const omitted = structuredClone(
    PERSISTENCE_INTENT_FIXTURES[READY_FIXTURE_ID],
  );
  assert.ok(omitted.creation);
  omitted.creation.records.exercises.splice(0, 1);
  omitted.intentDigest = digestRoutinePersistenceIntent(omitted);
  assert.equal(
    validateRoutinePersistenceIntentV1WithReceipt(omitted).valid,
    false,
  );

  const injected = structuredClone(
    PERSISTENCE_INTENT_FIXTURES[READY_FIXTURE_ID],
  );
  assert.ok(injected.creation);
  injected.creation.records.exercises.push(
    structuredClone(injected.creation.records.exercises[0]),
  );
  injected.intentDigest = digestRoutinePersistenceIntent(injected);
  assert.equal(
    validateRoutinePersistenceIntentV1WithReceipt(injected).valid,
    false,
  );

  const reordered = structuredClone(
    PERSISTENCE_INTENT_FIXTURES[READY_FIXTURE_ID],
  );
  assert.ok(reordered.creation);
  reordered.creation.records.sessions.reverse();
  reordered.intentDigest = digestRoutinePersistenceIntent(reordered);
  const receipt =
    validateRoutinePersistenceIntentV1WithReceipt(reordered);
  assert.equal(receipt.valid, false);
  assert.match(receipt.errors.join("\n"), /canonical assembled order/);
});

test("runtime receipt rejects prescription and activation mutation", () => {
  const progression = structuredClone(
    PERSISTENCE_INTENT_FIXTURES[READY_FIXTURE_ID],
  );
  assert.ok(progression.creation);
  progression.creation.records.exercises[0].prescription.progressionMode =
    progression.creation.records.exercises[0].prescription.progressionMode
      === "reps"
      ? "load_and_reps"
      : "reps";
  progression.intentDigest = digestRoutinePersistenceIntent(progression);
  assert.equal(
    validateRoutinePersistenceIntentV1WithReceipt(progression).valid,
    false,
  );

  const explanation = structuredClone(
    PERSISTENCE_INTENT_FIXTURES[READY_FIXTURE_ID],
  );
  assert.ok(explanation.creation);
  explanation.creation.records.exercises[0].rankingExplanation = null;
  explanation.intentDigest = digestRoutinePersistenceIntent(explanation);
  const explanationReceipt =
    validateRoutinePersistenceIntentV1WithReceipt(explanation);
  assert.equal(explanationReceipt.valid, false);
  assert.match(explanationReceipt.errors.join("\n"), /is required/);

  const activation = structuredClone(
    PERSISTENCE_INTENT_FIXTURES[READY_FIXTURE_ID],
  );
  assert.ok(activation.creation);
  (
    activation.creation.records.routine as unknown as {
      activationState: string;
    }
  ).activationState = "active";
  activation.intentDigest = digestRoutinePersistenceIntent(activation);
  const receipt =
    validateRoutinePersistenceIntentV1WithReceipt(activation);
  assert.equal(receipt.valid, false);
  assert.match(receipt.errors.join("\n"), /not_requested/);
});

test("runtime receipt binds terminal issue evidence to the assembly", () => {
  const forged = structuredClone(
    PERSISTENCE_INTENT_FIXTURES[
      "bodyweight-travel-4day-general-fitness"
    ],
  );
  forged.issues[0].values = ["PRESCRIPTION_INFEASIBLE"];
  forged.intentDigest = digestRoutinePersistenceIntent(forged);
  const receipt = validateRoutinePersistenceIntentV1WithReceipt(forged);
  assert.equal(receipt.valid, false);
  assert.match(
    receipt.errors.join("\n"),
    /must match the assembly issues/,
  );
});

test("exact-input validation rejects self-consistent provenance forgery", () => {
  const forged = structuredClone(
    PERSISTENCE_INTENT_FIXTURES[READY_FIXTURE_ID],
  );
  assert.ok(forged.planning);
  const provenanceEntries = Object.values(forged.planning.provenance)
    .flat();
  assert.ok(provenanceEntries[0]);
  provenanceEntries[0].responseDigest =
    "0".repeat(64);
  forged.intentDigest = digestRoutinePersistenceIntent(forged);
  assert.equal(
    validateRoutinePersistenceIntentV1WithReceipt(forged).valid,
    true,
  );
  assert.match(
    validateFixtureAgainstInputs(READY_FIXTURE_ID, forged).join("\n"),
    /does not match recompilation/,
  );
});

test("exact-input validation rejects re-signed substitution metadata", () => {
  const forged = structuredClone(
    PERSISTENCE_INTENT_FIXTURES[
      "intermediate-freeweights-5day-strength"
    ],
  );
  assert.ok(forged.creation);
  const exercise = forged.creation.records.exercises.find(
    (entry) => entry.substitutionRules.length > 0,
  );
  assert.ok(exercise);
  exercise.substitutionRules[0].candidateExerciseIds.push(
    "zzz-forged-candidate",
  );
  exercise.substitutionRules[0].candidateExerciseIds.sort();
  forged.intentDigest = digestRoutinePersistenceIntent(forged);
  assert.equal(
    validateRoutinePersistenceIntentV1WithReceipt(forged).valid,
    true,
  );
  assert.match(
    validateFixtureAgainstInputs(
      "intermediate-freeweights-5day-strength",
      forged,
    ).join("\n"),
    /does not match recompilation/,
  );
});

test("compiler returns valid invalid-input terminals for malformed inputs", () => {
  const inputs = createPersistenceIntentFixtureInputs(READY_FIXTURE_ID);
  const malformedRequest = {
    userId: "Fixture User",
    generationRequestId: inputs.request.generationRequestId,
    creationMode: "create_only",
    activationMode: "deferred",
  };
  const requestResult = compileRoutinePersistenceIntentV1(
    inputs.planning,
    inputs.catalog,
    inputs.coverage,
    inputs.ranking,
    inputs.selection,
    inputs.allocation,
    inputs.prescription,
    inputs.assembly,
    malformedRequest,
  );
  assert.equal(requestResult.status, "invalid_input");
  assert.deepEqual(
    requestResult.issues.map((entry) => entry.code),
    ["REQUEST_CONTEXT_INVALID"],
  );
  assert.equal(
    validateRoutinePersistenceIntentV1WithReceipt(requestResult).valid,
    true,
  );

  const malformedAssembly = structuredClone(
    inputs.assembly,
  ) as unknown as RoutineAssemblyV1;
  assert.ok(malformedAssembly.routine);
  malformedAssembly.routine.sessions = null as never;
  malformedAssembly.assemblyDigest =
    digestRoutineAssembly(malformedAssembly);
  const assemblyResult = compileRoutinePersistenceIntentV1(
    inputs.planning,
    inputs.catalog,
    inputs.coverage,
    inputs.ranking,
    inputs.selection,
    inputs.allocation,
    inputs.prescription,
    malformedAssembly,
    inputs.request,
  );
  assert.equal(assemblyResult.status, "invalid_input");
  assert.equal(assemblyResult.creation, null);
  assert.equal(
    validateRoutinePersistenceIntentV1WithReceipt(assemblyResult).valid,
    true,
  );
});

test("same request is idempotent and a new request has a new identity", () => {
  const inputs = createPersistenceIntentFixtureInputs(READY_FIXTURE_ID);
  const first = compileRoutinePersistenceIntentV1(
    inputs.planning,
    inputs.catalog,
    inputs.coverage,
    inputs.ranking,
    inputs.selection,
    inputs.allocation,
    inputs.prescription,
    inputs.assembly,
    inputs.request,
  );
  const second = compileRoutinePersistenceIntentV1(
    structuredClone(inputs.planning),
    structuredClone(inputs.catalog),
    structuredClone(inputs.coverage),
    structuredClone(inputs.ranking),
    structuredClone(inputs.selection),
    structuredClone(inputs.allocation),
    structuredClone(inputs.prescription),
    structuredClone(inputs.assembly),
    structuredClone(inputs.request),
  );
  assert.deepEqual(second, first);

  const next = compileRoutinePersistenceIntentV1(
    inputs.planning,
    inputs.catalog,
    inputs.coverage,
    inputs.ranking,
    inputs.selection,
    inputs.allocation,
    inputs.prescription,
    inputs.assembly,
    {
      ...inputs.request,
      generationRequestId: `${inputs.request.generationRequestId}-next`,
    },
  );
  assert.notEqual(next.request.uniquenessKey, first.request.uniquenessKey);
  assert.notEqual(next.intentDigest, first.intentDigest);
});

test("creation and activation remain separate operations", () => {
  const fixture = PERSISTENCE_INTENT_FIXTURES[READY_FIXTURE_ID];
  assert.ok(fixture.creation);
  const serialized = JSON.stringify(fixture);
  assert.equal(serialized.includes("activationToken"), false);
  assert.equal(serialized.includes("activate_routine"), false);
  assert.equal(serialized.includes("database"), false);
  assert.equal(serialized.includes("supabase"), false);
  assert.equal(fixture.request.creationMode, "create_only");
  assert.equal(fixture.request.activationMode, "deferred");
});

test("the dedicated workflow watches dependencies and runs this suite directly", () => {
  const workflow = readFileSync(
    ".github/workflows/planning-persistence-contract.yml",
    "utf8",
  );
  assert.equal(
    workflow.match(/src\/features\/curated-onboarding\/\*\*/g)?.length,
    2,
  );
  assert.equal(
    workflow.includes("src/features/curated-onboarding/planning/**"),
    false,
  );
  assert.match(
    workflow,
    /node --import \.\/scripts\/register-test-aliases\.mjs --test src\/features\/curated-onboarding\/planning\/persistence\/compile\.test\.ts/,
  );
  assert.match(workflow, /docs\/curated-planning-contract\.md/);
  assert.match(workflow, /docs\/PLAYBOOK_NOTES\.md/);
});
