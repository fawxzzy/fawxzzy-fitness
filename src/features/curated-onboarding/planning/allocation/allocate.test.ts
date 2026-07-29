import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { PLANNER_EXERCISE_CATALOG_V1 } from "../catalog/catalog.ts";
import { compilePlanningCoverageV1 } from "../coverage/compile.ts";
import { createNormalizedPlanningFixtureInput } from "../fixtures.ts";
import { normalizeCuratedPlanningIntake } from "../normalize.ts";
import { compileCandidateRankingV1 } from "../ranking/rank.ts";
import { digestGlobalSelection } from "../selection/contract.ts";
import { compileGlobalSelectionV1 } from "../selection/select.ts";
import {
  digestSessionAllocation,
  validateSessionAllocationV1WithReceipt,
} from "./contract.ts";
import {
  compileSessionAllocationV1,
  validateSessionAllocationAgainstInputsV1,
} from "./allocate.ts";
import {
  SESSION_ALLOCATION_FIXTURE_EXPECTATIONS,
  SESSION_ALLOCATION_FIXTURE_IDS,
  SESSION_ALLOCATION_FIXTURES,
  createSessionAllocationFixtureInputs,
} from "./fixtures.ts";

test("session allocation fixtures have pinned deterministic identities", () => {
  for (const fixtureId of SESSION_ALLOCATION_FIXTURE_IDS) {
    const fixture = SESSION_ALLOCATION_FIXTURES[fixtureId];
    const expected = SESSION_ALLOCATION_FIXTURE_EXPECTATIONS[fixtureId];
    assert.equal(fixture.status, expected.status, fixtureId);
    assert.equal(fixture.allocationDigest, expected.digest, fixtureId);
    assert.equal(digestSessionAllocation(fixture), expected.digest, fixtureId);
    assert.deepEqual(
      validateSessionAllocationV1WithReceipt(fixture),
      {
        validatorVersion:
          "fitness.session-allocation-validator.2026-07-29.v1",
        schemaVersion: "fitness.session-allocation.v1",
        allocationDigest: expected.digest,
        valid: true,
        errors: [],
      },
      fixtureId,
    );
  }
});

test("allocated fixtures preserve every selected exercise exactly once", () => {
  for (const fixtureId of SESSION_ALLOCATION_FIXTURE_IDS) {
    const fixture = SESSION_ALLOCATION_FIXTURES[fixtureId];
    const inputs = createSessionAllocationFixtureInputs(fixtureId);
    if (fixture.status !== "allocated") {
      assert.equal(fixture.sessions.length, 0, fixtureId);
      assert.equal(fixture.objective, null, fixtureId);
      continue;
    }
    assert.equal(
      fixture.sessions.length,
      inputs.coverage.schedule?.requestedDaysPerWeek,
      fixtureId,
    );
    assert.ok(
      fixture.sessions.every(
        (session) => session.exerciseAssignments.length > 0,
      ),
      fixtureId,
    );
    assert.ok((fixture.objective?.spread ?? 2) <= 1, fixtureId);
    const assignments = fixture.sessions.flatMap(
      (session) => session.exerciseAssignments,
    );
    assert.deepEqual(
      [...assignments]
        .sort((left, right) => left.selectionPosition - right.selectionPosition)
        .map(({ requirementId, exerciseId }) => ({
          requirementId,
          exerciseId,
        })),
      inputs.selection.selections.map(({ requirementId, exerciseId }) => ({
        requirementId,
        exerciseId,
      })),
      fixtureId,
    );
    assert.deepEqual(
      fixture.sessions.map((session) => session.weekday),
      inputs.coverage.schedule?.weekdays,
      fixtureId,
    );
    assert.deepEqual(
      validateSessionAllocationAgainstInputsV1(
        fixture,
        inputs.planning,
        inputs.catalog,
        inputs.coverage,
        inputs.ranking,
        inputs.selection,
      ),
      [],
      fixtureId,
    );
  }
});

test("a flexible schedule produces canonical count-only session slots", () => {
  const intake = createNormalizedPlanningFixtureInput(
    "beginner-home-3day-general-strength",
  );
  intake.intakeResponses.preferredTrainingDays = ["flexible"];
  const planning = normalizeCuratedPlanningIntake(intake);
  const catalog = PLANNER_EXERCISE_CATALOG_V1;
  const coverage = compilePlanningCoverageV1(planning, catalog);
  const ranking = compileCandidateRankingV1(planning, catalog, coverage);
  const selection = compileGlobalSelectionV1(
    planning,
    catalog,
    coverage,
    ranking,
  );
  const allocation = compileSessionAllocationV1(
    planning,
    catalog,
    coverage,
    ranking,
    selection,
  );
  assert.equal(allocation.status, "allocated");
  assert.equal(allocation.schedule?.dayConstraint, "count_only");
  assert.deepEqual(
    allocation.sessions.map((session) => session.weekday),
    [null, null, null],
  );
  assert.deepEqual(
    validateSessionAllocationAgainstInputsV1(
      allocation,
      planning,
      catalog,
      coverage,
      ranking,
      selection,
    ),
    [],
  );
});

test("runtime validation rejects malformed nested members without throwing", () => {
  const malformed = structuredClone(
    SESSION_ALLOCATION_FIXTURES["beginner-home-3day-general-strength"],
  ) as unknown as Record<string, unknown>;
  const sessions = malformed.sessions as Record<string, unknown>[];
  delete sessions[0].exerciseAssignments;
  assert.doesNotThrow(() => validateSessionAllocationV1WithReceipt(malformed));
  const receipt = validateSessionAllocationV1WithReceipt(malformed);
  assert.equal(receipt.valid, false);
  assert.match(receipt.errors.join("\n"), /exerciseAssignments must be an array/);
});

test("runtime validation rejects digest and canonical-order tampering", () => {
  const source =
    SESSION_ALLOCATION_FIXTURES["beginner-home-3day-general-strength"];
  const forgedDigest = structuredClone(source);
  forgedDigest.allocationDigest = "0".repeat(64);
  assert.equal(
    validateSessionAllocationV1WithReceipt(forgedDigest).valid,
    false,
  );

  const reordered = structuredClone(source);
  reordered.sessions[0].exerciseAssignments.reverse();
  reordered.sessions[0].exerciseAssignments.forEach((entry, index) => {
    entry.sessionExercisePosition = index + 1;
  });
  reordered.allocationDigest = digestSessionAllocation(reordered);
  const receipt = validateSessionAllocationV1WithReceipt(reordered);
  assert.equal(receipt.valid, false);
  assert.match(receipt.errors.join("\n"), /must follow selection order/);
});

test("runtime validation rejects re-signed duplicate assignments and schedule drift", () => {
  const source =
    SESSION_ALLOCATION_FIXTURES["beginner-home-3day-general-strength"];

  const duplicated = structuredClone(source);
  duplicated.sessions[1].exerciseAssignments[0].exerciseId =
    duplicated.sessions[0].exerciseAssignments[0].exerciseId;
  duplicated.allocationDigest = digestSessionAllocation(duplicated);
  const duplicateReceipt =
    validateSessionAllocationV1WithReceipt(duplicated);
  assert.equal(duplicateReceipt.valid, false);
  assert.match(
    duplicateReceipt.errors.join("\n"),
    /duplicate exercise assignments/,
  );

  const scheduleDrift = structuredClone(source);
  scheduleDrift.schedule!.weekdays = ["mon", "wed", "sun"];
  scheduleDrift.allocationDigest = digestSessionAllocation(scheduleDrift);
  const scheduleReceipt =
    validateSessionAllocationV1WithReceipt(scheduleDrift);
  assert.equal(scheduleReceipt.valid, false);
  assert.match(
    scheduleReceipt.errors.join("\n"),
    /weekday does not match the canonical schedule slot/,
  );
});

test("exact-input validation rejects a re-signed assignment substitution", () => {
  const fixtureId = "beginner-home-3day-general-strength";
  const inputs = createSessionAllocationFixtureInputs(fixtureId);
  const tampered = structuredClone(
    SESSION_ALLOCATION_FIXTURES[fixtureId],
  );
  assert.equal(tampered.status, "allocated");
  tampered.sessions[0].exerciseAssignments[0].exerciseId =
    "forged-exercise";
  tampered.allocationDigest = digestSessionAllocation(tampered);
  assert.equal(validateSessionAllocationV1WithReceipt(tampered).valid, true);
  assert.match(
    validateSessionAllocationAgainstInputsV1(
      tampered,
      inputs.planning,
      inputs.catalog,
      inputs.coverage,
      inputs.ranking,
      inputs.selection,
    ).join("\n"),
    /does not match recompilation/,
  );
});

test("compiler rejects a re-signed selection that is not input-bound", () => {
  const inputs = createSessionAllocationFixtureInputs(
    "beginner-home-3day-general-strength",
  );
  const forgedSelection = structuredClone(inputs.selection);
  forgedSelection.selections[0].exerciseId = "forged-exercise";
  forgedSelection.selectionDigest = digestGlobalSelection(forgedSelection);
  const allocation = compileSessionAllocationV1(
    inputs.planning,
    inputs.catalog,
    inputs.coverage,
    inputs.ranking,
    forgedSelection,
  );
  assert.equal(allocation.status, "invalid_input");
  assert.deepEqual(
    allocation.issues.map((entry) => entry.code),
    ["SELECTION_INPUT_MISMATCH"],
  );
});

test("compiler fails closed when requested sessions exceed selections", () => {
  const intake = createNormalizedPlanningFixtureInput(
    "beginner-home-3day-general-strength",
  );
  intake.intakeResponses.trainingDaysPerWeek = "7";
  intake.intakeResponses.preferredTrainingDays = [
    "mon",
    "tue",
    "wed",
    "thu",
    "fri",
    "sat",
    "sun",
  ];
  const planning = normalizeCuratedPlanningIntake(intake);
  const catalog = PLANNER_EXERCISE_CATALOG_V1;
  const coverage = compilePlanningCoverageV1(planning, catalog);
  const ranking = compileCandidateRankingV1(planning, catalog, coverage);
  const selection = compileGlobalSelectionV1(
    planning,
    catalog,
    coverage,
    ranking,
  );
  assert.equal(selection.status, "selected");
  assert.ok(selection.selections.length < 7);
  const allocation = compileSessionAllocationV1(
    planning,
    catalog,
    coverage,
    ranking,
    selection,
  );
  assert.equal(allocation.status, "infeasible");
  assert.deepEqual(
    allocation.issues.map((entry) => entry.code),
    ["SESSION_COUNT_EXCEEDS_SELECTIONS"],
  );
});

test("compilation is byte-deterministic", () => {
  for (const fixtureId of SESSION_ALLOCATION_FIXTURE_IDS) {
    const inputs = createSessionAllocationFixtureInputs(fixtureId);
    const first = compileSessionAllocationV1(
      inputs.planning,
      inputs.catalog,
      inputs.coverage,
      inputs.ranking,
      inputs.selection,
    );
    const second = compileSessionAllocationV1(
      structuredClone(inputs.planning),
      structuredClone(inputs.catalog),
      structuredClone(inputs.coverage),
      structuredClone(inputs.ranking),
      structuredClone(inputs.selection),
    );
    assert.deepEqual(second, first, fixtureId);
  }
});

test("the dedicated workflow watches the full dependency tree and runs this suite directly", () => {
  const workflow = readFileSync(
    ".github/workflows/planning-session-allocation-contract.yml",
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
    /node --import \.\/scripts\/register-test-aliases\.mjs --test src\/features\/curated-onboarding\/planning\/allocation\/allocate\.test\.ts/,
  );
  assert.match(workflow, /docs\/curated-planning-contract\.md/);
  assert.match(workflow, /docs\/PLAYBOOK_NOTES\.md/);
});
