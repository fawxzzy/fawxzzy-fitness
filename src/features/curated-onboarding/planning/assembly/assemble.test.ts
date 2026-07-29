import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { digestExerciseCatalog } from "../catalog/validate.ts";
import { compilePlanningCoverageV1 } from "../coverage/compile.ts";
import { compileCandidateRankingV1 } from "../ranking/rank.ts";
import { compileGlobalSelectionV1 } from "../selection/select.ts";
import { compileSessionAllocationV1 } from "../allocation/allocate.ts";
import {
  digestSessionPrescription,
  validateSessionPrescriptionV1WithReceipt,
} from "../prescription/contract.ts";
import {
  compileSessionPrescriptionV1,
} from "../prescription/prescribe.ts";
import {
  digestRoutineAssembly,
  validateRoutineAssemblyV1WithReceipt,
  type RoutineAssemblyV1,
} from "./contract.ts";
import {
  compileRoutineAssemblyV1,
  validateRoutineAssemblyAgainstInputsV1,
} from "./assemble.ts";
import {
  ROUTINE_ASSEMBLY_FIXTURE_EXPECTATIONS,
  ROUTINE_ASSEMBLY_FIXTURE_IDS,
  ROUTINE_ASSEMBLY_FIXTURES,
  createRoutineAssemblyFixtureInputs,
} from "./fixtures.ts";

const ASSEMBLED_FIXTURE_ID =
  "beginner-home-3day-general-strength" as const;

test("routine assembly fixtures have pinned deterministic identities", () => {
  for (const fixtureId of ROUTINE_ASSEMBLY_FIXTURE_IDS) {
    const fixture = ROUTINE_ASSEMBLY_FIXTURES[fixtureId];
    const expected = ROUTINE_ASSEMBLY_FIXTURE_EXPECTATIONS[fixtureId];
    assert.equal(fixture.status, expected.status, fixtureId);
    assert.equal(fixture.assemblyDigest, expected.digest, fixtureId);
    assert.equal(digestRoutineAssembly(fixture), expected.digest, fixtureId);
    assert.deepEqual(
      validateRoutineAssemblyV1WithReceipt(fixture),
      {
        validatorVersion:
          "fitness.routine-assembly-validator.2026-07-29.v1",
        schemaVersion: "fitness.routine-assembly.v1",
        assemblyDigest: expected.digest,
        valid: true,
        errors: [],
      },
      fixtureId,
    );
  }
});

test("assembled routines preserve every prescribed executable field", () => {
  for (const fixtureId of ROUTINE_ASSEMBLY_FIXTURE_IDS) {
    const fixture = ROUTINE_ASSEMBLY_FIXTURES[fixtureId];
    const { prescription } =
      createRoutineAssemblyFixtureInputs(fixtureId);
    if (fixture.status !== "assembled") continue;
    assert.equal(prescription.status, "prescribed", fixtureId);
    assert.ok(fixture.routine, fixtureId);
    assert.deepEqual(fixture.routine.schedule, prescription.schedule);
    assert.deepEqual(fixture.routine.summary, prescription.summary);
    assert.deepEqual(
      fixture.routine.sessions,
      prescription.sessions.map((session) => ({
        sessionId: session.sessionId,
        ordinal: session.ordinal,
        weekday: session.weekday,
        exercises: session.exercisePrescriptions,
        timeBudget: session.timeBudget,
      })),
      fixtureId,
    );
  }
});

test("non-prescribed terminals are complete and contain no partial routine", () => {
  for (const fixtureId of ROUTINE_ASSEMBLY_FIXTURE_IDS) {
    const fixture = ROUTINE_ASSEMBLY_FIXTURES[fixtureId];
    if (fixture.status === "assembled") continue;
    assert.equal(fixture.routine, null, fixtureId);
    assert.equal(fixture.issues.length, 1, fixtureId);
    assert.equal(
      fixture.status,
      "not_assemblable",
      fixtureId,
    );
    assert.deepEqual(
      fixture.issues.map((entry) => entry.code),
      ["PRESCRIPTION_NOT_READY"],
      fixtureId,
    );
  }
});

test("every fixture validates against all seven exact inputs", () => {
  for (const fixtureId of ROUTINE_ASSEMBLY_FIXTURE_IDS) {
    const inputs = createRoutineAssemblyFixtureInputs(fixtureId);
    assert.deepEqual(
      validateRoutineAssemblyAgainstInputsV1(
        ROUTINE_ASSEMBLY_FIXTURES[fixtureId],
        inputs.planning,
        inputs.catalog,
        inputs.coverage,
        inputs.ranking,
        inputs.selection,
        inputs.allocation,
        inputs.prescription,
      ),
      [],
      fixtureId,
    );
  }
});

test("runtime receipt rejects malformed nested members without throwing", () => {
  const malformed = structuredClone(
    ROUTINE_ASSEMBLY_FIXTURES[ASSEMBLED_FIXTURE_ID],
  ) as unknown as RoutineAssemblyV1;
  assert.ok(malformed.routine);
  delete (
    malformed.routine.sessions[0].exercises[0] as unknown as {
      timeEstimate?: unknown;
    }
  ).timeEstimate;
  malformed.assemblyDigest = digestRoutineAssembly(malformed);
  assert.doesNotThrow(
    () => validateRoutineAssemblyV1WithReceipt(malformed),
  );
  const receipt = validateRoutineAssemblyV1WithReceipt(malformed);
  assert.equal(receipt.valid, false);
  assert.match(receipt.errors.join("\n"), /timeEstimate must be an object/);
});

test("runtime receipt rejects re-signed omission and injection", () => {
  const source =
    ROUTINE_ASSEMBLY_FIXTURES[ASSEMBLED_FIXTURE_ID];
  const omitted = structuredClone(source);
  assert.ok(omitted.routine);
  omitted.routine.sessions[0].exercises.splice(0, 1);
  omitted.assemblyDigest = digestRoutineAssembly(omitted);
  const omissionReceipt =
    validateRoutineAssemblyV1WithReceipt(omitted);
  assert.equal(omissionReceipt.valid, false);
  assert.match(
    omissionReceipt.errors.join("\n"),
    /prescriptionDigest does not match/,
  );

  const injected = structuredClone(source);
  assert.ok(injected.routine);
  injected.routine.sessions[0].exercises.push(
    structuredClone(injected.routine.sessions[0].exercises[0]),
  );
  injected.assemblyDigest = digestRoutineAssembly(injected);
  const injectionReceipt =
    validateRoutineAssemblyV1WithReceipt(injected);
  assert.equal(injectionReceipt.valid, false);
  assert.match(
    injectionReceipt.errors.join("\n"),
    /duplicate exercise prescriptions|prescriptionDigest does not match/,
  );
});

test("runtime receipt rejects re-signed order and session-placement attacks", () => {
  const reordered = structuredClone(
    ROUTINE_ASSEMBLY_FIXTURES[ASSEMBLED_FIXTURE_ID],
  );
  assert.ok(reordered.routine);
  reordered.routine.sessions.reverse();
  reordered.assemblyDigest = digestRoutineAssembly(reordered);
  const reorderReceipt =
    validateRoutineAssemblyV1WithReceipt(reordered);
  assert.equal(reorderReceipt.valid, false);
  assert.match(
    reorderReceipt.errors.join("\n"),
    /ordinal|canonical session order|prescriptionDigest does not match/,
  );

  const moved = structuredClone(
    ROUTINE_ASSEMBLY_FIXTURES[ASSEMBLED_FIXTURE_ID],
  );
  assert.ok(moved.routine);
  const first = moved.routine.sessions[0].exercises[0];
  const second = moved.routine.sessions[1].exercises[0];
  moved.routine.sessions[0].exercises[0] = second;
  moved.routine.sessions[1].exercises[0] = first;
  moved.routine.sessions[0].exercises.forEach((entry, index) => {
    entry.sessionExercisePosition = index + 1;
  });
  moved.routine.sessions[1].exercises.forEach((entry, index) => {
    entry.sessionExercisePosition = index + 1;
  });
  moved.assemblyDigest = digestRoutineAssembly(moved);
  const movedReceipt = validateRoutineAssemblyV1WithReceipt(moved);
  assert.equal(movedReceipt.valid, false);
  assert.match(
    movedReceipt.errors.join("\n"),
    /owned by another canonical round-robin session|prescriptionDigest does not match/,
  );
});

test("runtime receipt rejects schedule, budget, and summary mutation", () => {
  const schedule = structuredClone(
    ROUTINE_ASSEMBLY_FIXTURES[ASSEMBLED_FIXTURE_ID],
  );
  assert.ok(schedule.routine);
  schedule.routine.schedule.sessionMinutes.target += 1;
  schedule.assemblyDigest = digestRoutineAssembly(schedule);
  assert.equal(
    validateRoutineAssemblyV1WithReceipt(schedule).valid,
    false,
  );

  const budget = structuredClone(
    ROUTINE_ASSEMBLY_FIXTURES[ASSEMBLED_FIXTURE_ID],
  );
  assert.ok(budget.routine);
  budget.routine.sessions[0].timeBudget.estimatedSeconds += 1;
  budget.assemblyDigest = digestRoutineAssembly(budget);
  assert.equal(
    validateRoutineAssemblyV1WithReceipt(budget).valid,
    false,
  );

  const summary = structuredClone(
    ROUTINE_ASSEMBLY_FIXTURES[ASSEMBLED_FIXTURE_ID],
  );
  assert.ok(summary.routine);
  summary.routine.summary.totalSets += 1;
  summary.assemblyDigest = digestRoutineAssembly(summary);
  assert.equal(
    validateRoutineAssemblyV1WithReceipt(summary).valid,
    false,
  );
});

test("runtime receipt rejects duplicate issue codes", () => {
  const duplicated = structuredClone(
    ROUTINE_ASSEMBLY_FIXTURES[
      "bodyweight-travel-4day-general-fitness"
    ],
  );
  duplicated.issues.push(structuredClone(duplicated.issues[0]));
  duplicated.assemblyDigest = digestRoutineAssembly(duplicated);
  const receipt = validateRoutineAssemblyV1WithReceipt(duplicated);
  assert.equal(receipt.valid, false);
  assert.match(receipt.errors.join("\n"), /duplicate codes/);
});

test("runtime receipt requires closed upstream issue evidence", () => {
  const sourceInputs =
    createRoutineAssemblyFixtureInputs(ASSEMBLED_FIXTURE_ID);
  const catalog = structuredClone(sourceInputs.catalog);
  for (const exercise of catalog.exercises) {
    exercise.cost.estimatedActiveSecondsPerSet = 1_200;
  }
  catalog.catalogDigest = digestExerciseCatalog(catalog);
  const coverage = compilePlanningCoverageV1(
    sourceInputs.planning,
    catalog,
  );
  const ranking = compileCandidateRankingV1(
    sourceInputs.planning,
    catalog,
    coverage,
  );
  const selection = compileGlobalSelectionV1(
    sourceInputs.planning,
    catalog,
    coverage,
    ranking,
  );
  const allocation = compileSessionAllocationV1(
    sourceInputs.planning,
    catalog,
    coverage,
    ranking,
    selection,
  );
  const prescription = compileSessionPrescriptionV1(
    sourceInputs.planning,
    catalog,
    coverage,
    ranking,
    selection,
    allocation,
  );
  const infeasible = compileRoutineAssemblyV1(
    sourceInputs.planning,
    catalog,
    coverage,
    ranking,
    selection,
    allocation,
    prescription,
  );
  assert.equal(infeasible.status, "infeasible");
  assert.deepEqual(infeasible.issues[0].values, [
    "TIME_BUDGET_EXCEEDED",
  ]);
  assert.equal(validateRoutineAssemblyV1WithReceipt(infeasible).valid, true);

  const notAssemblable = ROUTINE_ASSEMBLY_FIXTURES[
    "bodyweight-travel-4day-general-fitness"
  ];
  assert.deepEqual(notAssemblable.issues[0].values, [
    "ALLOCATION_NOT_READY",
  ]);

  for (const source of [notAssemblable, infeasible]) {
    const empty = structuredClone(source);
    empty.issues[0].values = [];
    empty.assemblyDigest = digestRoutineAssembly(empty);
    const emptyReceipt = validateRoutineAssemblyV1WithReceipt(empty);
    assert.equal(emptyReceipt.valid, false);
    assert.match(
      emptyReceipt.errors.join("\n"),
      /must contain upstream Session Prescription issue evidence/,
    );

    const forged = structuredClone(source);
    forged.issues[0].values = [
      "TOTALLY_FORGED_UPSTREAM_REASON",
    ];
    forged.assemblyDigest = digestRoutineAssembly(forged);
    const forgedReceipt = validateRoutineAssemblyV1WithReceipt(forged);
    assert.equal(forgedReceipt.valid, false);
    assert.match(
      forgedReceipt.errors.join("\n"),
      /issue code not permitted/,
    );
  }
});

test("exact-input validation rejects a self-consistent prescription substitution", () => {
  const inputs =
    createRoutineAssemblyFixtureInputs(ASSEMBLED_FIXTURE_ID);
  const forgedPrescription = structuredClone(inputs.prescription);
  assert.equal(forgedPrescription.status, "prescribed");
  forgedPrescription.sessions[0].exercisePrescriptions[0].exerciseId =
    "forged-exercise";
  forgedPrescription.prescriptionDigest =
    digestSessionPrescription(forgedPrescription);
  assert.equal(
    validateSessionPrescriptionV1WithReceipt(forgedPrescription).valid,
    true,
  );

  const forged = structuredClone(
    ROUTINE_ASSEMBLY_FIXTURES[ASSEMBLED_FIXTURE_ID],
  );
  assert.ok(forged.routine);
  forged.input.prescriptionDigest =
    forgedPrescription.prescriptionDigest;
  forged.routine.sessions[0].exercises[0].exerciseId =
    "forged-exercise";
  forged.assemblyDigest = digestRoutineAssembly(forged);
  assert.equal(validateRoutineAssemblyV1WithReceipt(forged).valid, true);
  assert.match(
    validateRoutineAssemblyAgainstInputsV1(
      forged,
      inputs.planning,
      inputs.catalog,
      inputs.coverage,
      inputs.ranking,
      inputs.selection,
      inputs.allocation,
      inputs.prescription,
    ).join("\n"),
    /does not match recompilation/,
  );
});

test("compiler rejects a re-signed prescription that is not input-bound", () => {
  const inputs =
    createRoutineAssemblyFixtureInputs(ASSEMBLED_FIXTURE_ID);
  const forged = structuredClone(inputs.prescription);
  assert.equal(forged.status, "prescribed");
  forged.sessions[0].exercisePrescriptions[0].exerciseId =
    "forged-exercise";
  forged.prescriptionDigest = digestSessionPrescription(forged);
  assert.equal(validateSessionPrescriptionV1WithReceipt(forged).valid, true);
  const assembly = compileRoutineAssemblyV1(
    inputs.planning,
    inputs.catalog,
    inputs.coverage,
    inputs.ranking,
    inputs.selection,
    inputs.allocation,
    forged,
  );
  assert.equal(assembly.status, "invalid_input");
  assert.deepEqual(
    assembly.issues.map((entry) => entry.code),
    ["PRESCRIPTION_INPUT_MISMATCH"],
  );
  assert.equal(assembly.routine, null);
});

test("compiler returns a valid invalid-input terminal for malformed input", () => {
  const inputs =
    createRoutineAssemblyFixtureInputs(ASSEMBLED_FIXTURE_ID);
  const malformed = structuredClone(inputs.prescription) as unknown as {
    sessions: unknown;
  };
  malformed.sessions = null;
  let result: RoutineAssemblyV1 | undefined;
  assert.doesNotThrow(() => {
    result = compileRoutineAssemblyV1(
      inputs.planning,
      inputs.catalog,
      inputs.coverage,
      inputs.ranking,
      inputs.selection,
      inputs.allocation,
      malformed,
    );
  });
  assert.equal(result?.status, "invalid_input");
  assert.equal(validateRoutineAssemblyV1WithReceipt(result).valid, true);
});

test("compiler closes copied upstream status values before finalizing", () => {
  const inputs =
    createRoutineAssemblyFixtureInputs(ASSEMBLED_FIXTURE_ID);
  const valid = compileRoutineAssemblyV1(
    inputs.planning,
    inputs.catalog,
    inputs.coverage,
    inputs.ranking,
    inputs.selection,
    inputs.allocation,
    inputs.prescription,
  );
  const statusFields = [
    "coverageStatus",
    "rankingStatus",
    "selectionStatus",
    "allocationStatus",
  ] as const;
  for (const field of statusFields) {
    assert.equal(valid.input[field], inputs.prescription.input[field], field);

    const malformed = structuredClone(inputs.prescription) as unknown as {
      input: Record<(typeof statusFields)[number], unknown>;
    };
    malformed.input[field] = "unknown";
    let result: RoutineAssemblyV1 | undefined;
    assert.doesNotThrow(() => {
      result = compileRoutineAssemblyV1(
        inputs.planning,
        inputs.catalog,
        inputs.coverage,
        inputs.ranking,
        inputs.selection,
        inputs.allocation,
        malformed,
      );
    }, field);
    assert.equal(result?.status, "invalid_input", field);
    assert.equal(result?.input[field], null, field);
    assert.equal(
      validateRoutineAssemblyV1WithReceipt(result).valid,
      true,
      field,
    );
  }
});

test("presentation-only catalog names do not alter routine identity", () => {
  const inputs =
    createRoutineAssemblyFixtureInputs(ASSEMBLED_FIXTURE_ID);
  const catalog = structuredClone(inputs.catalog);
  catalog.exercises[0].canonicalName = "Presentation-only rename";
  const prescription = compileSessionPrescriptionV1(
    inputs.planning,
    catalog,
    inputs.coverage,
    inputs.ranking,
    inputs.selection,
    inputs.allocation,
  );
  const renamed = compileRoutineAssemblyV1(
    inputs.planning,
    catalog,
    inputs.coverage,
    inputs.ranking,
    inputs.selection,
    inputs.allocation,
    prescription,
  );
  assert.deepEqual(
    renamed,
    ROUTINE_ASSEMBLY_FIXTURES[ASSEMBLED_FIXTURE_ID],
  );
});

test("compilation is byte-deterministic", () => {
  for (const fixtureId of ROUTINE_ASSEMBLY_FIXTURE_IDS) {
    const inputs = createRoutineAssemblyFixtureInputs(fixtureId);
    const first = compileRoutineAssemblyV1(
      inputs.planning,
      inputs.catalog,
      inputs.coverage,
      inputs.ranking,
      inputs.selection,
      inputs.allocation,
      inputs.prescription,
    );
    const second = compileRoutineAssemblyV1(
      structuredClone(inputs.planning),
      structuredClone(inputs.catalog),
      structuredClone(inputs.coverage),
      structuredClone(inputs.ranking),
      structuredClone(inputs.selection),
      structuredClone(inputs.allocation),
      structuredClone(inputs.prescription),
    );
    assert.deepEqual(second, first, fixtureId);
  }
});

test("the dedicated workflow watches dependencies and runs this suite directly", () => {
  const workflow = readFileSync(
    ".github/workflows/planning-routine-assembly-contract.yml",
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
    /node --import \.\/scripts\/register-test-aliases\.mjs --test src\/features\/curated-onboarding\/planning\/assembly\/assemble\.test\.ts/,
  );
  assert.match(workflow, /docs\/curated-planning-contract\.md/);
  assert.match(workflow, /docs\/PLAYBOOK_NOTES\.md/);
});
