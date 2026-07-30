import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PLANNER_EXERCISE_CATALOG_V1 } from "../catalog/catalog.ts";
import {
  PERSISTENCE_INTENT_FIXTURES,
} from "../persistence/fixtures.ts";
import { compileCandidateRankingV1 } from "../ranking/rank.ts";
import {
  createPlannerPipelineIssue,
  digestPlannerPipeline,
  validatePlannerPipelineV1WithReceipt,
  type PlannerPipelineV1,
} from "./contract.ts";
import {
  compilePlannerPipelineV1,
  validatePlannerPipelineAgainstInputsV1,
} from "./compile.ts";
import {
  PLANNER_PIPELINE_FIXTURE_EXPECTATIONS,
  PLANNER_PIPELINE_FIXTURE_IDS,
  PLANNER_PIPELINE_FIXTURES,
  createPlannerPipelineFixtureInputs,
} from "./fixtures.ts";

const READY_FIXTURE_ID =
  "beginner-home-3day-general-strength" as const;
const OTHER_READY_FIXTURE_ID =
  "beginner-planet-fitness-4day-muscle-gain" as const;

function resign(value: PlannerPipelineV1) {
  value.pipelineDigest = digestPlannerPipeline(value);
  return value;
}

function validateFixtureAgainstInputs(
  fixtureId: typeof PLANNER_PIPELINE_FIXTURE_IDS[number],
  value: unknown = PLANNER_PIPELINE_FIXTURES[fixtureId],
) {
  const inputs = createPlannerPipelineFixtureInputs(fixtureId);
  return validatePlannerPipelineAgainstInputsV1(
    value,
    inputs.onboarding,
    inputs.catalog,
    inputs.request,
  );
}

test("pipeline fixtures have pinned deterministic identities", () => {
  for (const fixtureId of PLANNER_PIPELINE_FIXTURE_IDS) {
    const fixture = PLANNER_PIPELINE_FIXTURES[fixtureId];
    const expected = PLANNER_PIPELINE_FIXTURE_EXPECTATIONS[fixtureId];
    assert.equal(fixture.status, expected.status, fixtureId);
    assert.equal(fixture.terminalStage, expected.terminalStage, fixtureId);
    assert.equal(fixture.pipelineDigest, expected.digest, fixtureId);
    assert.equal(digestPlannerPipeline(fixture), expected.digest, fixtureId);
    assert.deepEqual(
      validatePlannerPipelineV1WithReceipt(fixture),
      {
        validatorVersion:
          "fitness.planner-pipeline-validator.2026-07-30.v1",
        schemaVersion: "fitness.planner-pipeline.v1",
        pipelineDigest: expected.digest,
        valid: true,
        errors: [],
      },
      fixtureId,
    );
  }
});

test("ready pipelines preserve the exact persistence intent", () => {
  for (const fixtureId of PLANNER_PIPELINE_FIXTURE_IDS) {
    const fixture = PLANNER_PIPELINE_FIXTURES[fixtureId];
    if (fixture.status !== "ready") continue;
    assert.ok(fixture.request, fixtureId);
    assert.ok(fixture.stages.persistence_intent, fixtureId);
    assert.deepEqual(
      fixture.stages.persistence_intent,
      PERSISTENCE_INTENT_FIXTURES[fixtureId],
      fixtureId,
    );
    assert.equal(
      fixture.stages.persistence_intent.status,
      "ready_to_create",
      fixtureId,
    );
    assert.equal(fixture.issues.length, 0, fixtureId);
  }
});

test("non-ready pipelines stop at the first terminal stage", () => {
  for (const fixtureId of PLANNER_PIPELINE_FIXTURE_IDS) {
    const fixture = PLANNER_PIPELINE_FIXTURES[fixtureId];
    if (fixture.status === "ready") continue;
    assert.equal(fixture.terminalStage, "coverage", fixtureId);
    assert.ok(fixture.stages.planning, fixtureId);
    assert.ok(fixture.stages.catalog, fixtureId);
    assert.ok(fixture.stages.coverage, fixtureId);
    assert.equal(fixture.stages.ranking, null, fixtureId);
    assert.equal(fixture.stages.selection, null, fixtureId);
    assert.equal(fixture.stages.allocation, null, fixtureId);
    assert.equal(fixture.stages.prescription, null, fixtureId);
    assert.equal(fixture.stages.assembly, null, fixtureId);
    assert.equal(fixture.stages.persistence_intent, null, fixtureId);
    assert.equal(fixture.issues.length, 1, fixtureId);
    assert.equal(fixture.issues[0].stage, "coverage", fixtureId);
    assert.deepEqual(
      fixture.issues[0].values,
      [...new Set(
        fixture.stages.coverage.issues.map((entry) => entry.code),
      )].sort(),
      fixtureId,
    );
  }
});

test("every fixture validates against exact raw inputs", () => {
  for (const fixtureId of PLANNER_PIPELINE_FIXTURE_IDS) {
    assert.deepEqual(
      validateFixtureAgainstInputs(fixtureId),
      [],
      fixtureId,
    );
  }
});

test("malformed roots return runtime-valid invalid terminals without throwing", () => {
  for (const input of [null, undefined, [], "invalid", 42]) {
    const fixture = compilePlannerPipelineV1(input, null, null);
    assert.equal(fixture.status, "invalid_input");
    assert.equal(fixture.terminalStage, "planning");
    assert.equal(fixture.request, null);
    assert.deepEqual(fixture.issues[0].values, ["NORMALIZATION_FAILED"]);
    assert.deepEqual(
      validatePlannerPipelineV1WithReceipt(fixture).errors,
      [],
    );
  }
});

test("invalid catalog and request inputs fail at their exact boundaries", () => {
  const inputs = createPlannerPipelineFixtureInputs(READY_FIXTURE_ID);
  const invalidCatalog = compilePlannerPipelineV1(
    inputs.onboarding,
    null,
    inputs.request,
  );
  assert.equal(invalidCatalog.status, "invalid_input");
  assert.equal(invalidCatalog.terminalStage, "catalog");
  assert.deepEqual(
    invalidCatalog.issues[0].values,
    ["CATALOG_VALIDATION_FAILED"],
  );
  assert.equal(validatePlannerPipelineV1WithReceipt(invalidCatalog).valid, true);

  const invalidRequest = compilePlannerPipelineV1(
    inputs.onboarding,
    inputs.catalog,
    null,
  );
  assert.equal(invalidRequest.status, "invalid_input");
  assert.equal(invalidRequest.terminalStage, "persistence_intent");
  assert.equal(invalidRequest.request, null);
  assert.equal(
    invalidRequest.stages.persistence_intent?.status,
    "invalid_input",
  );
  assert.deepEqual(
    invalidRequest.issues[0].values,
    ["REQUEST_CONTEXT_INVALID"],
  );
  assert.equal(validatePlannerPipelineV1WithReceipt(invalidRequest).valid, true);
  assert.deepEqual(
    validatePlannerPipelineAgainstInputsV1(
      invalidRequest,
      inputs.onboarding,
      inputs.catalog,
      null,
    ),
    [],
  );
});

test("malformed request roots share the stored nullable persistence identity", () => {
  const inputs = createPlannerPipelineFixtureInputs(READY_FIXTURE_ID);
  const pipelineDigests = new Set<string>();

  for (const request of [{}, [], "invalid", undefined, null]) {
    const pipeline = compilePlannerPipelineV1(
      inputs.onboarding,
      inputs.catalog,
      request,
    );
    pipelineDigests.add(pipeline.pipelineDigest);

    assert.equal(pipeline.status, "invalid_input");
    assert.equal(pipeline.terminalStage, "persistence_intent");
    assert.equal(pipeline.request, null);
    assert.equal(
      pipeline.stages.persistence_intent?.issues[0]?.code,
      "REQUEST_CONTEXT_INVALID",
    );
    assert.deepEqual(
      validatePlannerPipelineV1WithReceipt(pipeline).errors,
      [],
    );
    assert.deepEqual(
      validatePlannerPipelineAgainstInputsV1(
        pipeline,
        inputs.onboarding,
        inputs.catalog,
        request,
      ),
      [],
    );
  }

  assert.equal(pipelineDigests.size, 1);
});

test("runtime validation rejects re-signed stage omission", () => {
  const forged = structuredClone(
    PLANNER_PIPELINE_FIXTURES[READY_FIXTURE_ID],
  ) as PlannerPipelineV1;
  forged.stages.selection = null;
  resign(forged);
  const receipt = validatePlannerPipelineV1WithReceipt(forged);
  assert.equal(receipt.valid, false);
  assert.equal(
    receipt.errors.some((entry) => entry.includes("must precede")),
    true,
  );
});

test("runtime validation rejects a stage after the first non-ready result", () => {
  const forged = structuredClone(
    PLANNER_PIPELINE_FIXTURES["ambiguous-warning-blocked"],
  ) as PlannerPipelineV1;
  assert.ok(forged.stages.planning);
  assert.ok(forged.stages.catalog);
  assert.ok(forged.stages.coverage);
  const ranking = compileCandidateRankingV1(
    forged.stages.planning,
    forged.stages.catalog,
    forged.stages.coverage,
  );
  assert.equal(ranking.status, "not_rankable");
  forged.stages.ranking = ranking;
  forged.status = "not_ready";
  forged.terminalStage = "ranking";
  forged.issues = [
    createPlannerPipelineIssue(
      "ranking",
      "not_ready",
      ranking.issues.map((entry) => entry.code),
    ),
  ];
  resign(forged);

  const receipt = validatePlannerPipelineV1WithReceipt(forged);
  assert.equal(receipt.valid, false);
  assert.equal(
    receipt.errors.some(
      (entry) =>
        entry.includes("$.stages.coverage must be ready before the terminal stage"),
    ),
    true,
  );
});

test("runtime validation rejects re-signed cross-input stage substitution", () => {
  const forged = structuredClone(
    PLANNER_PIPELINE_FIXTURES[READY_FIXTURE_ID],
  ) as PlannerPipelineV1;
  forged.stages.ranking = structuredClone(
    PLANNER_PIPELINE_FIXTURES[OTHER_READY_FIXTURE_ID].stages.ranking,
  );
  resign(forged);
  const receipt = validatePlannerPipelineV1WithReceipt(forged);
  assert.equal(receipt.valid, false);
  assert.equal(
    receipt.errors.some(
      (entry) => entry.includes("does not match recompilation"),
    ),
    true,
  );
});

test("runtime validation binds invalid-request intents to the outer stages", () => {
  const inputs = createPlannerPipelineFixtureInputs(READY_FIXTURE_ID);
  const otherInputs = createPlannerPipelineFixtureInputs(OTHER_READY_FIXTURE_ID);
  const forged = compilePlannerPipelineV1(
    inputs.onboarding,
    inputs.catalog,
    null,
  );
  const other = compilePlannerPipelineV1(
    otherInputs.onboarding,
    otherInputs.catalog,
    null,
  );
  assert.equal(forged.request, null);
  assert.equal(forged.terminalStage, "persistence_intent");
  assert.equal(
    forged.stages.persistence_intent?.issues[0]?.code,
    "REQUEST_CONTEXT_INVALID",
  );
  assert.equal(
    other.stages.persistence_intent?.issues[0]?.code,
    "REQUEST_CONTEXT_INVALID",
  );
  forged.stages.persistence_intent = structuredClone(
    other.stages.persistence_intent,
  );
  resign(forged);

  const receipt = validatePlannerPipelineV1WithReceipt(forged);
  assert.equal(receipt.valid, false);
  assert.equal(
    receipt.errors.some(
      (entry) =>
        entry.includes("$.stages.persistence_intent")
        && entry.includes("does not match recompilation"),
    ),
    true,
  );
});

test("runtime validation rejects re-signed stage reordering", () => {
  const forged = structuredClone(
    PLANNER_PIPELINE_FIXTURES[READY_FIXTURE_ID],
  ) as PlannerPipelineV1;
  const allocation = forged.stages.allocation;
  forged.stages.allocation =
    forged.stages.prescription as unknown as typeof allocation;
  forged.stages.prescription =
    allocation as unknown as typeof forged.stages.prescription;
  resign(forged);
  assert.equal(validatePlannerPipelineV1WithReceipt(forged).valid, false);
});

test("runtime validation rejects a re-signed false early terminal", () => {
  const forged = structuredClone(
    PLANNER_PIPELINE_FIXTURES[READY_FIXTURE_ID],
  ) as PlannerPipelineV1;
  forged.status = "not_ready";
  forged.terminalStage = "coverage";
  forged.stages.ranking = null;
  forged.stages.selection = null;
  forged.stages.allocation = null;
  forged.stages.prescription = null;
  forged.stages.assembly = null;
  forged.stages.persistence_intent = null;
  forged.issues = [
    createPlannerPipelineIssue(
      "coverage",
      "not_ready",
      ["FORGED_EARLY_TERMINAL"],
    ),
  ];
  resign(forged);
  const receipt = validatePlannerPipelineV1WithReceipt(forged);
  assert.equal(receipt.valid, false);
  assert.equal(
    receipt.errors.some(
      (entry) => entry.includes("non-ready or invalid stage"),
    ),
    true,
  );
});

test("runtime validation rejects re-signed catalog injection", () => {
  const forged = structuredClone(
    PLANNER_PIPELINE_FIXTURES[READY_FIXTURE_ID],
  ) as PlannerPipelineV1;
  assert.ok(forged.stages.catalog);
  forged.stages.catalog.exercises.pop();
  resign(forged);
  assert.equal(validatePlannerPipelineV1WithReceipt(forged).valid, false);
});

test("exact-input validation rejects a self-consistent input identity forgery", () => {
  const supplied = PLANNER_PIPELINE_FIXTURES[READY_FIXTURE_ID];
  const otherInputs = createPlannerPipelineFixtureInputs(
    OTHER_READY_FIXTURE_ID,
  );
  const errors = validatePlannerPipelineAgainstInputsV1(
    supplied,
    otherInputs.onboarding,
    otherInputs.catalog,
    otherInputs.request,
  );
  assert.equal(
    errors.some((entry) => entry.includes("does not match recompilation")),
    true,
  );
});

test("exact-input validation rejects request identity substitution", () => {
  const supplied = PLANNER_PIPELINE_FIXTURES[READY_FIXTURE_ID];
  const inputs = createPlannerPipelineFixtureInputs(READY_FIXTURE_ID);
  const errors = validatePlannerPipelineAgainstInputsV1(
    supplied,
    inputs.onboarding,
    inputs.catalog,
    {
      ...inputs.request,
      generationRequestId: "planner-forged-request",
    },
  );
  assert.equal(
    errors.some((entry) => entry.includes("does not match recompilation")),
    true,
  );
});

test("the pipeline source stays provider-neutral and source-only", () => {
  const compileSource = readFileSync(
    new URL("./compile.ts", import.meta.url),
    "utf8",
  );
  const contractSource = readFileSync(
    new URL("./contract.ts", import.meta.url),
    "utf8",
  );
  for (const source of [compileSource, contractSource]) {
    assert.doesNotMatch(source, /supabase/i);
    assert.doesNotMatch(source, /planner-routine-executor/);
    assert.doesNotMatch(source, /createPlannerRoutine/i);
    assert.doesNotMatch(source, /activateProfileRoutine/i);
  }
  assert.deepEqual(
    PLANNER_PIPELINE_FIXTURES[READY_FIXTURE_ID].stages.catalog,
    PLANNER_EXERCISE_CATALOG_V1,
  );
});
