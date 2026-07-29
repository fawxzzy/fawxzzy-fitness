import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CANONICAL_PRESCRIPTION_CLASS_POLICY,
} from "../catalog/contract.ts";
import {
  digestExerciseCatalog,
  validateExerciseCatalogBundleV1,
} from "../catalog/validate.ts";
import { compilePlanningCoverageV1 } from "../coverage/compile.ts";
import { compileCandidateRankingV1 } from "../ranking/rank.ts";
import { compileGlobalSelectionV1 } from "../selection/select.ts";
import {
  digestSessionAllocation,
} from "../allocation/contract.ts";
import { compileSessionAllocationV1 } from "../allocation/allocate.ts";
import {
  digestSessionPrescription,
  validateSessionPrescriptionV1WithReceipt,
  type SessionPrescriptionV1,
} from "./contract.ts";
import {
  compileSessionPrescriptionV1,
  validateSessionPrescriptionAgainstInputsV1,
} from "./prescribe.ts";
import {
  SESSION_PRESCRIPTION_FIXTURE_EXPECTATIONS,
  SESSION_PRESCRIPTION_FIXTURE_IDS,
  SESSION_PRESCRIPTION_FIXTURES,
  createSessionPrescriptionFixtureInputs,
} from "./fixtures.ts";

test("session prescription fixtures have pinned deterministic identities", () => {
  for (const fixtureId of SESSION_PRESCRIPTION_FIXTURE_IDS) {
    const fixture = SESSION_PRESCRIPTION_FIXTURES[fixtureId];
    const expected = SESSION_PRESCRIPTION_FIXTURE_EXPECTATIONS[fixtureId];
    assert.equal(fixture.status, expected.status, fixtureId);
    assert.equal(fixture.prescriptionDigest, expected.digest, fixtureId);
    assert.equal(
      digestSessionPrescription(fixture),
      expected.digest,
      fixtureId,
    );
    assert.deepEqual(
      validateSessionPrescriptionV1WithReceipt(fixture),
      {
        validatorVersion:
          "fitness.session-prescription-validator.2026-07-29.v1",
        schemaVersion: "fitness.session-prescription.v1",
        prescriptionDigest: expected.digest,
        valid: true,
        errors: [],
      },
      fixtureId,
    );
  }
});

test("prescribed fixtures preserve allocation and catalog ownership exactly once", () => {
  for (const fixtureId of SESSION_PRESCRIPTION_FIXTURE_IDS) {
    const fixture = SESSION_PRESCRIPTION_FIXTURES[fixtureId];
    const inputs = createSessionPrescriptionFixtureInputs(fixtureId);
    if (fixture.status !== "prescribed") {
      assert.equal(fixture.sessions.length, 0, fixtureId);
      assert.equal(fixture.summary, null, fixtureId);
      continue;
    }
    assert.equal(fixture.status, "prescribed", fixtureId);
    assert.equal(fixture.sessions.length, inputs.allocation.sessions.length);
    assert.ok(
      fixture.sessions.every(
        (session) => session.exercisePrescriptions.length > 0,
      ),
      fixtureId,
    );
    const allocated = inputs.allocation.sessions.flatMap(
      (session) => session.exerciseAssignments,
    );
    const prescribed = fixture.sessions.flatMap(
      (session) => session.exercisePrescriptions,
    );
    assert.deepEqual(
      prescribed.map(
        ({
          requirementId,
          exerciseId,
          selectionPosition,
          sessionExercisePosition,
        }) => ({
          requirementId,
          exerciseId,
          selectionPosition,
          sessionExercisePosition,
        }),
      ),
      allocated,
      fixtureId,
    );
    for (const prescription of prescribed) {
      const exercise = inputs.catalog.exercises.find(
        (entry) => entry.id === prescription.exerciseId,
      );
      assert.ok(exercise, prescription.exerciseId);
      assert.deepEqual(
        exercise.prescriptionSupport.prescriptionClassIds,
        [prescription.prescriptionClassId],
      );
      assert.equal(prescription.startingLoad, null);
      assert.ok(
        exercise.prescriptionSupport.supportedProgressionModes.includes(
          prescription.progressionMode,
        ),
      );
      assert.ok(
        CANONICAL_PRESCRIPTION_CLASS_POLICY[
          prescription.prescriptionClassId
        ].supportedProgressionModes.includes(
          prescription.progressionMode,
        ),
      );
    }
    assert.deepEqual(
      validateSessionPrescriptionAgainstInputsV1(
        fixture,
        inputs.planning,
        inputs.catalog,
        inputs.coverage,
        inputs.ranking,
        inputs.selection,
        inputs.allocation,
      ),
      [],
      fixtureId,
    );
  }
});

test("goal and experience policies produce closed deterministic prescriptions", () => {
  const strength =
    SESSION_PRESCRIPTION_FIXTURES[
      "beginner-home-3day-general-strength"
    ];
  assert.equal(strength.status, "prescribed");
  const strengthPrescription =
    strength.sessions[0].exercisePrescriptions[0];
  assert.deepEqual(strengthPrescription.target, {
    unit: "reps",
    minimum: 5,
    maximum: 8,
  });
  assert.equal(strengthPrescription.sets, 2);
  assert.equal(strengthPrescription.restSeconds, 120);

  const hypertrophy =
    SESSION_PRESCRIPTION_FIXTURES[
      "beginner-planet-fitness-4day-muscle-gain"
    ];
  assert.equal(hypertrophy.status, "prescribed");
  const resistance = hypertrophy.sessions.flatMap(
    (session) => session.exercisePrescriptions,
  ).find(
    (entry) => entry.prescriptionClassId === "resistance-load-reps-v1",
  );
  assert.ok(resistance);
  assert.deepEqual(resistance.target, {
    unit: "reps",
    minimum: 8,
    maximum: 12,
  });
  assert.equal(resistance.restSeconds, 90);

  const intermediate =
    SESSION_PRESCRIPTION_FIXTURES[
      "intermediate-freeweights-5day-strength"
    ];
  assert.equal(intermediate.status, "prescribed");
  assert.equal(
    intermediate.sessions[0].exercisePrescriptions[0].sets,
    3,
  );
});

test("every prescribed session remains inside its hard duration ceiling", () => {
  for (const fixtureId of SESSION_PRESCRIPTION_FIXTURE_IDS) {
    const fixture = SESSION_PRESCRIPTION_FIXTURES[fixtureId];
    if (fixture.status !== "prescribed") continue;
    for (const session of fixture.sessions) {
      assert.ok(
        session.timeBudget.estimatedSeconds
        <= session.timeBudget.hardMaximumSeconds,
        `${fixtureId}:${session.sessionId}`,
      );
      assert.equal(
        session.timeBudget.estimatedSeconds,
        session.exercisePrescriptions.reduce(
          (sum, item) => sum + item.timeEstimate.totalSeconds,
          0,
        ),
      );
    }
    assert.equal(
      fixture.summary?.withinHardMaximumSessionCount,
      fixture.sessions.length,
      fixtureId,
    );
  }
});

test("runtime validation rejects malformed nested members without throwing", () => {
  const malformed = structuredClone(
    SESSION_PRESCRIPTION_FIXTURES[
      "beginner-home-3day-general-strength"
    ],
  ) as unknown as Record<string, unknown>;
  const sessions = malformed.sessions as Record<string, unknown>[];
  const prescriptions =
    sessions[0].exercisePrescriptions as Record<string, unknown>[];
  delete prescriptions[0].timeEstimate;
  assert.doesNotThrow(
    () => validateSessionPrescriptionV1WithReceipt(malformed),
  );
  const receipt = validateSessionPrescriptionV1WithReceipt(malformed);
  assert.equal(receipt.valid, false);
  assert.match(receipt.errors.join("\n"), /timeEstimate must be an object/);
});

test("runtime validation rejects invented load and unsupported progression", () => {
  const inventedLoad = structuredClone(
    SESSION_PRESCRIPTION_FIXTURES[
      "beginner-home-3day-general-strength"
    ],
  ) as unknown as SessionPrescriptionV1;
  (
    inventedLoad.sessions[0].exercisePrescriptions[0] as unknown as {
      startingLoad: number;
    }
  ).startingLoad = 25;
  inventedLoad.prescriptionDigest =
    digestSessionPrescription(inventedLoad);
  const loadReceipt =
    validateSessionPrescriptionV1WithReceipt(inventedLoad);
  assert.equal(loadReceipt.valid, false);
  assert.match(loadReceipt.errors.join("\n"), /startingLoad must remain null/);

  const unsupported = structuredClone(
    SESSION_PRESCRIPTION_FIXTURES[
      "beginner-home-3day-general-strength"
    ],
  );
  unsupported.sessions[0].exercisePrescriptions[0].progressionMode =
    "distance";
  unsupported.prescriptionDigest = digestSessionPrescription(unsupported);
  const progressionReceipt =
    validateSessionPrescriptionV1WithReceipt(unsupported);
  assert.equal(progressionReceipt.valid, false);
  assert.match(
    progressionReceipt.errors.join("\n"),
    /progressionMode is unsupported/,
  );
});

test("runtime validation rejects target and time arithmetic tampering", () => {
  const target = structuredClone(
    SESSION_PRESCRIPTION_FIXTURES[
      "beginner-home-3day-general-strength"
    ],
  );
  target.sessions[0].exercisePrescriptions[0].target.maximum = 99;
  target.prescriptionDigest = digestSessionPrescription(target);
  const targetReceipt = validateSessionPrescriptionV1WithReceipt(target);
  assert.equal(targetReceipt.valid, false);
  assert.match(
    targetReceipt.errors.join("\n"),
    /canonical class bounds/,
  );

  const fractionalTarget = structuredClone(
    SESSION_PRESCRIPTION_FIXTURES[
      "beginner-home-3day-general-strength"
    ],
  );
  fractionalTarget.sessions[0].exercisePrescriptions[0].target.minimum += 0.5;
  fractionalTarget.prescriptionDigest =
    digestSessionPrescription(fractionalTarget);
  const fractionalTargetReceipt =
    validateSessionPrescriptionV1WithReceipt(fractionalTarget);
  assert.equal(fractionalTargetReceipt.valid, false);
  assert.match(
    fractionalTargetReceipt.errors.join("\n"),
    /integer bounds/,
  );

  const noncanonicalRest = structuredClone(
    SESSION_PRESCRIPTION_FIXTURES[
      "beginner-home-3day-general-strength"
    ],
  );
  noncanonicalRest.sessions[0].exercisePrescriptions[0].restSeconds = 50;
  noncanonicalRest.prescriptionDigest =
    digestSessionPrescription(noncanonicalRest);
  const noncanonicalRestReceipt =
    validateSessionPrescriptionV1WithReceipt(noncanonicalRest);
  assert.equal(noncanonicalRestReceipt.valid, false);
  assert.match(
    noncanonicalRestReceipt.errors.join("\n"),
    /canonical rest interval/,
  );

  const zeroActiveTime = structuredClone(
    SESSION_PRESCRIPTION_FIXTURES[
      "beginner-home-3day-general-strength"
    ],
  );
  zeroActiveTime.sessions[0].exercisePrescriptions[0]
    .timeEstimate.activeSecondsPerSet = 0;
  zeroActiveTime.prescriptionDigest =
    digestSessionPrescription(zeroActiveTime);
  const zeroActiveTimeReceipt =
    validateSessionPrescriptionV1WithReceipt(zeroActiveTime);
  assert.equal(zeroActiveTimeReceipt.valid, false);
  assert.match(
    zeroActiveTimeReceipt.errors.join("\n"),
    /activeSecondsPerSet must be a positive integer/,
  );

  const time = structuredClone(
    SESSION_PRESCRIPTION_FIXTURES[
      "beginner-home-3day-general-strength"
    ],
  );
  time.sessions[0].exercisePrescriptions[0].timeEstimate.totalSeconds += 1;
  time.sessions[0].timeBudget.estimatedSeconds += 1;
  time.summary!.totalEstimatedSeconds += 1;
  time.prescriptionDigest = digestSessionPrescription(time);
  const timeReceipt = validateSessionPrescriptionV1WithReceipt(time);
  assert.equal(timeReceipt.valid, false);
  assert.match(
    timeReceipt.errors.join("\n"),
    /totalSeconds is inconsistent/,
  );
});

test("runtime validation rejects re-signed fractional inherited session minutes", () => {
  const source =
    SESSION_PRESCRIPTION_FIXTURES[
      "beginner-home-3day-general-strength"
    ];
  const fractionalTargetMinutes = structuredClone(source);
  fractionalTargetMinutes.schedule!.sessionMinutes.target += 0.5;
  for (const session of fractionalTargetMinutes.sessions) {
    session.timeBudget.targetSeconds += 30;
  }
  fractionalTargetMinutes.prescriptionDigest =
    digestSessionPrescription(fractionalTargetMinutes);
  const targetMinutesReceipt =
    validateSessionPrescriptionV1WithReceipt(fractionalTargetMinutes);
  assert.equal(targetMinutesReceipt.valid, false);
  assert.match(
    targetMinutesReceipt.errors.join("\n"),
    /sessionMinutes\.target must be an integer of at least 10/,
  );

  const fractionalHardMaximumMinutes = structuredClone(source);
  fractionalHardMaximumMinutes.schedule!.sessionMinutes.hardMaximum += 0.5;
  for (const session of fractionalHardMaximumMinutes.sessions) {
    session.timeBudget.hardMaximumSeconds += 30;
  }
  fractionalHardMaximumMinutes.prescriptionDigest =
    digestSessionPrescription(fractionalHardMaximumMinutes);
  const hardMaximumMinutesReceipt =
    validateSessionPrescriptionV1WithReceipt(
      fractionalHardMaximumMinutes,
    );
  assert.equal(hardMaximumMinutesReceipt.valid, false);
  assert.match(
    hardMaximumMinutesReceipt.errors.join("\n"),
    /sessionMinutes\.hardMaximum must be an integer of at least 10/,
  );
});

test("runtime validation rejects re-signed duplication and cross-session placement", () => {
  const source =
    SESSION_PRESCRIPTION_FIXTURES[
      "beginner-home-3day-general-strength"
    ];
  const duplicate = structuredClone(source);
  duplicate.sessions[1].exercisePrescriptions[0].exerciseId =
    duplicate.sessions[0].exercisePrescriptions[0].exerciseId;
  duplicate.prescriptionDigest = digestSessionPrescription(duplicate);
  const duplicateReceipt =
    validateSessionPrescriptionV1WithReceipt(duplicate);
  assert.equal(duplicateReceipt.valid, false);
  assert.match(
    duplicateReceipt.errors.join("\n"),
    /duplicate exercise prescriptions/,
  );

  const misplaced = structuredClone(source);
  const first = misplaced.sessions[0].exercisePrescriptions[0];
  const second = misplaced.sessions[1].exercisePrescriptions[0];
  misplaced.sessions[0].exercisePrescriptions[0] = second;
  misplaced.sessions[1].exercisePrescriptions[0] = first;
  misplaced.sessions[0].exercisePrescriptions.forEach((entry, index) => {
    entry.sessionExercisePosition = index + 1;
  });
  misplaced.sessions[1].exercisePrescriptions.forEach((entry, index) => {
    entry.sessionExercisePosition = index + 1;
  });
  for (const session of misplaced.sessions) {
    session.timeBudget.estimatedSeconds =
      session.exercisePrescriptions.reduce(
        (sum, item) => sum + item.timeEstimate.totalSeconds,
        0,
      );
    session.timeBudget.status =
      session.timeBudget.estimatedSeconds
      <= session.timeBudget.targetSeconds
        ? "within_target"
        : "within_hard_maximum";
  }
  misplaced.summary!.totalEstimatedSeconds =
    misplaced.sessions.reduce(
      (sum, session) => sum + session.timeBudget.estimatedSeconds,
      0,
    );
  misplaced.summary!.withinTargetSessionCount =
    misplaced.sessions.filter(
      (session) => session.timeBudget.status === "within_target",
    ).length;
  misplaced.prescriptionDigest =
    digestSessionPrescription(misplaced);
  const misplacedReceipt =
    validateSessionPrescriptionV1WithReceipt(misplaced);
  assert.equal(misplacedReceipt.valid, false);
  assert.match(
    misplacedReceipt.errors.join("\n"),
    /owned by another canonical round-robin session/,
  );
});

test("exact-input validation rejects a re-signed prescription substitution", () => {
  const fixtureId = "beginner-home-3day-general-strength";
  const inputs = createSessionPrescriptionFixtureInputs(fixtureId);
  const tampered = structuredClone(
    SESSION_PRESCRIPTION_FIXTURES[fixtureId],
  );
  assert.equal(tampered.status, "prescribed");
  tampered.sessions[0].exercisePrescriptions[0].exerciseId =
    "forged-exercise";
  tampered.prescriptionDigest = digestSessionPrescription(tampered);
  assert.equal(
    validateSessionPrescriptionV1WithReceipt(tampered).valid,
    true,
  );
  assert.match(
    validateSessionPrescriptionAgainstInputsV1(
      tampered,
      inputs.planning,
      inputs.catalog,
      inputs.coverage,
      inputs.ranking,
      inputs.selection,
      inputs.allocation,
    ).join("\n"),
    /does not match recompilation/,
  );
});

test("compiler rejects a re-signed allocation that is not input-bound", () => {
  const inputs = createSessionPrescriptionFixtureInputs(
    "beginner-home-3day-general-strength",
  );
  const forged = structuredClone(inputs.allocation);
  assert.equal(forged.status, "allocated");
  forged.sessions[0].exerciseAssignments[0].exerciseId =
    "forged-exercise";
  forged.allocationDigest = digestSessionAllocation(forged);
  const prescription = compileSessionPrescriptionV1(
    inputs.planning,
    inputs.catalog,
    inputs.coverage,
    inputs.ranking,
    inputs.selection,
    forged,
  );
  assert.equal(prescription.status, "invalid_input");
  assert.deepEqual(
    prescription.issues.map((entry) => entry.code),
    ["ALLOCATION_INPUT_MISMATCH"],
  );
});

test("compiler fails closed when minimum prescription exceeds session time", () => {
  const inputs = createSessionPrescriptionFixtureInputs(
    "beginner-home-3day-general-strength",
  );
  const catalog = structuredClone(inputs.catalog);
  for (const exercise of catalog.exercises) {
    exercise.cost.estimatedActiveSecondsPerSet = 1_200;
  }
  catalog.catalogDigest = digestExerciseCatalog(catalog);
  assert.deepEqual(validateExerciseCatalogBundleV1(catalog), []);
  const coverage = compilePlanningCoverageV1(inputs.planning, catalog);
  const ranking = compileCandidateRankingV1(
    inputs.planning,
    catalog,
    coverage,
  );
  const selection = compileGlobalSelectionV1(
    inputs.planning,
    catalog,
    coverage,
    ranking,
  );
  const allocation = compileSessionAllocationV1(
    inputs.planning,
    catalog,
    coverage,
    ranking,
    selection,
  );
  const prescription = compileSessionPrescriptionV1(
    inputs.planning,
    catalog,
    coverage,
    ranking,
    selection,
    allocation,
  );
  assert.equal(prescription.status, "infeasible");
  assert.deepEqual(
    prescription.issues.map((entry) => entry.code),
    ["TIME_BUDGET_EXCEEDED"],
  );
  assert.equal(prescription.sessions.length, 0);
  assert.equal(prescription.summary, null);
  assert.equal(
    validateSessionPrescriptionV1WithReceipt(prescription).valid,
    true,
  );
});

test("compilation is byte-deterministic", () => {
  for (const fixtureId of SESSION_PRESCRIPTION_FIXTURE_IDS) {
    const inputs = createSessionPrescriptionFixtureInputs(fixtureId);
    const first = compileSessionPrescriptionV1(
      inputs.planning,
      inputs.catalog,
      inputs.coverage,
      inputs.ranking,
      inputs.selection,
      inputs.allocation,
    );
    const second = compileSessionPrescriptionV1(
      structuredClone(inputs.planning),
      structuredClone(inputs.catalog),
      structuredClone(inputs.coverage),
      structuredClone(inputs.ranking),
      structuredClone(inputs.selection),
      structuredClone(inputs.allocation),
    );
    assert.deepEqual(second, first, fixtureId);
  }
});

test("the dedicated workflow watches dependencies and runs this suite directly", () => {
  const workflow = readFileSync(
    ".github/workflows/planning-prescription-contract.yml",
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
    /node --import \.\/scripts\/register-test-aliases\.mjs --test src\/features\/curated-onboarding\/planning\/prescription\/prescribe\.test\.ts/,
  );
  assert.match(workflow, /docs\/curated-planning-contract\.md/);
  assert.match(workflow, /docs\/PLAYBOOK_NOTES\.md/);
});
