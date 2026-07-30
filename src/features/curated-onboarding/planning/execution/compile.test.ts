import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  validateRoutinePersistenceIntentAgainstInputsV1,
} from "../persistence/compile.ts";
import {
  PLANNER_PIPELINE_FIXTURE_EXPECTATIONS,
} from "../pipeline/fixtures.ts";
import {
  compilePlannerExecutionCommandV1,
  validatePlannerExecutionCommandAgainstInputsV1,
} from "./compile.ts";
import {
  PLANNER_EXECUTION_COMMAND_COMPILER_VERSION,
  PLANNER_EXECUTION_COMMAND_ISSUE_CODES,
  PLANNER_EXECUTION_COMMAND_POLICY_VERSION,
  PLANNER_EXECUTION_COMMAND_SCHEMA_VERSION,
  PLANNER_EXECUTION_COMMAND_STATUSES,
  PLANNER_EXECUTION_PROVIDER_CONTEXT_ERROR_CODES,
  digestPlannerExecutionCommand,
  validatePlannerExecutionCommandV1WithReceipt,
  type PlannerExecutionCommandV1,
} from "./contract.ts";
import {
  PLANNER_EXECUTION_COMMAND_FIXTURE_IDS,
  PLANNER_EXECUTION_COMMAND_FIXTURES,
  createPlannerExecutionCommandFixtureInputs,
} from "./fixtures.ts";

const READY_ID = "beginner-home-3day-general-strength" as const;
const OTHER_READY_ID =
  "intermediate-freeweights-5day-strength" as const;
const BLOCKED_ID =
  "bodyweight-travel-4day-general-fitness" as const;

function clone(
  value: PlannerExecutionCommandV1,
) {
  return structuredClone(value);
}

function resign(value: PlannerExecutionCommandV1) {
  value.commandDigest = digestPlannerExecutionCommand(value);
  return value;
}

test("execution command publishes one closed version set", () => {
  assert.equal(
    PLANNER_EXECUTION_COMMAND_SCHEMA_VERSION,
    "fitness.planner-execution-command.v1",
  );
  assert.equal(
    PLANNER_EXECUTION_COMMAND_COMPILER_VERSION,
    "fitness.planner-execution-command-compiler.2026-07-30.v1",
  );
  assert.equal(
    PLANNER_EXECUTION_COMMAND_POLICY_VERSION,
    "fitness.planner-execution-command-policy.2026-07-30.v1",
  );
  assert.deepEqual(PLANNER_EXECUTION_COMMAND_STATUSES, [
    "executable",
    "not_executable",
    "invalid_input",
  ]);
  assert.deepEqual(PLANNER_EXECUTION_COMMAND_ISSUE_CODES, [
    "PIPELINE_NOT_EXECUTABLE",
    "PIPELINE_INVALID",
    "PROVIDER_CONTEXT_INVALID",
  ]);
});

test("frozen fixtures compile deterministically with runtime and exact receipts", () => {
  assert.equal(PLANNER_EXECUTION_COMMAND_FIXTURE_IDS.length, 10);
  for (const fixtureId of PLANNER_EXECUTION_COMMAND_FIXTURE_IDS) {
    const fixture = PLANNER_EXECUTION_COMMAND_FIXTURES[fixtureId];
    const inputs =
      createPlannerExecutionCommandFixtureInputs(fixtureId);
    const repeat = compilePlannerExecutionCommandV1(
      inputs.onboarding,
      inputs.catalog,
      inputs.request,
      inputs.providerContext,
    );
    assert.equal(repeat.commandDigest, fixture.commandDigest, fixtureId);
    assert.deepEqual(
      validatePlannerExecutionCommandV1WithReceipt(fixture),
      {
        validatorVersion:
          "fitness.planner-execution-command-validator.2026-07-30.v1",
        schemaVersion: PLANNER_EXECUTION_COMMAND_SCHEMA_VERSION,
        commandDigest: fixture.commandDigest,
        valid: true,
        errors: [],
      },
      fixtureId,
    );
    assert.deepEqual(
      validatePlannerExecutionCommandAgainstInputsV1(
        fixture,
        inputs.onboarding,
        inputs.catalog,
        inputs.request,
        inputs.providerContext,
      ),
      [],
      fixtureId,
    );
    const pipelineStatus =
      PLANNER_PIPELINE_FIXTURE_EXPECTATIONS[fixtureId].status;
    assert.equal(
      fixture.status,
      pipelineStatus === "ready"
        ? "executable"
        : pipelineStatus === "invalid_input"
          ? "invalid_input"
          : "not_executable",
      fixtureId,
    );
  }
});

test("ready pipelines produce one complete exact executor command", () => {
  const fixture = PLANNER_EXECUTION_COMMAND_FIXTURES[READY_ID];
  assert.equal(fixture.status, "executable");
  assert.ok(fixture.command);
  assert.deepEqual(fixture.issues, []);
  assert.equal(
    fixture.command.pipelineDigest,
    fixture.pipeline.pipelineDigest,
  );
  assert.deepEqual(
    fixture.command.intent,
    fixture.pipeline.stages.persistence_intent,
  );
  assert.deepEqual(
    fixture.command.exactInputs,
    {
      planning: fixture.pipeline.stages.planning,
      catalog: fixture.pipeline.stages.catalog,
      coverage: fixture.pipeline.stages.coverage,
      ranking: fixture.pipeline.stages.ranking,
      selection: fixture.pipeline.stages.selection,
      allocation: fixture.pipeline.stages.allocation,
      prescription: fixture.pipeline.stages.prescription,
      assembly: fixture.pipeline.stages.assembly,
      request: fixture.pipeline.request,
    },
  );
  assert.deepEqual(
    validateRoutinePersistenceIntentAgainstInputsV1(
      fixture.command.intent,
      fixture.command.exactInputs.planning,
      fixture.command.exactInputs.catalog,
      fixture.command.exactInputs.coverage,
      fixture.command.exactInputs.ranking,
      fixture.command.exactInputs.selection,
      fixture.command.exactInputs.allocation,
      fixture.command.exactInputs.prescription,
      fixture.command.exactInputs.assembly,
      fixture.command.exactInputs.request,
    ),
    [],
  );
});

test("non-ready pipelines remain complete terminals without partial commands", () => {
  for (const fixtureId of [
    BLOCKED_ID,
    "no-overhead-3day-substitution",
    "ambiguous-warning-blocked",
  ] as const) {
    const fixture = PLANNER_EXECUTION_COMMAND_FIXTURES[fixtureId];
    assert.equal(fixture.status, "not_executable", fixtureId);
    assert.equal(fixture.command, null, fixtureId);
    assert.equal(
      fixture.issues[0]?.code,
      "PIPELINE_NOT_EXECUTABLE",
      fixtureId,
    );
    assert.deepEqual(
      fixture.issues[0]?.values,
      [fixture.pipeline.status, fixture.pipeline.terminalStage].sort(),
      fixtureId,
    );
  }
});

test("invalid pipelines retain stage attribution without a partial command", () => {
  const fixture =
    PLANNER_EXECUTION_COMMAND_FIXTURES[
      "cardio-priority-4day-hybrid"
    ];
  assert.equal(fixture.status, "invalid_input");
  assert.equal(fixture.command, null);
  assert.equal(fixture.issues.length, 1);
  assert.equal(fixture.issues[0].code, "PIPELINE_INVALID");
  assert.deepEqual(
    validatePlannerExecutionCommandV1WithReceipt(fixture).errors,
    [],
  );
});

test("provider context rejects malformed roots and closed field attacks", () => {
  const inputs =
    createPlannerExecutionCommandFixtureInputs(READY_ID);
  const cases = [
    {
      value: null,
      codes: ["PROVIDER_CONTEXT_NOT_RECORD"],
    },
    {
      value: [],
      codes: ["PROVIDER_CONTEXT_NOT_RECORD"],
    },
    {
      value: { ...inputs.providerContext, extra: true },
      codes: ["PROVIDER_CONTEXT_KEYS_INVALID"],
    },
    {
      value: { ...inputs.providerContext, name: " bad" },
      codes: ["PROVIDER_NAME_INVALID"],
    },
    {
      value: { ...inputs.providerContext, name: "bad\u0000name" },
      codes: ["PROVIDER_NAME_INVALID"],
    },
    {
      value: { ...inputs.providerContext, startDate: "2026-02-30" },
      codes: ["PROVIDER_START_DATE_INVALID"],
    },
    {
      value: { ...inputs.providerContext, timezone: "Mars/Olympus" },
      codes: ["PROVIDER_TIMEZONE_INVALID"],
    },
  ] as const;

  for (const entry of cases) {
    const result = compilePlannerExecutionCommandV1(
      inputs.onboarding,
      inputs.catalog,
      inputs.request,
      entry.value,
    );
    assert.equal(result.status, "invalid_input");
    assert.equal(result.command, null);
    assert.equal(result.issues[0]?.code, "PROVIDER_CONTEXT_INVALID");
    assert.deepEqual(result.issues[0]?.values, entry.codes);
    assert.deepEqual(
      validatePlannerExecutionCommandV1WithReceipt(result).errors,
      [],
    );
    assert.deepEqual(
      validatePlannerExecutionCommandAgainstInputsV1(
        result,
        inputs.onboarding,
        inputs.catalog,
        inputs.request,
        entry.value,
      ),
      [],
    );
  }
});

test("runtime receipt rejects re-signed command and exact-input substitutions", () => {
  const source = PLANNER_EXECUTION_COMMAND_FIXTURES[READY_ID];
  const other = PLANNER_EXECUTION_COMMAND_FIXTURES[OTHER_READY_ID];
  assert.ok(source.command);
  assert.ok(other.command);

  const substitutions = [
    (value: PlannerExecutionCommandV1) => {
      assert.ok(value.command);
      value.command.intent =
        structuredClone(other.command!.intent);
    },
    (value: PlannerExecutionCommandV1) => {
      assert.ok(value.command);
      value.command.exactInputs.selection =
        structuredClone(other.command!.exactInputs.selection);
    },
    (value: PlannerExecutionCommandV1) => {
      assert.ok(value.command);
      value.command.exactInputs.request =
        structuredClone(other.command!.exactInputs.request);
    },
    (value: PlannerExecutionCommandV1) => {
      assert.ok(value.command);
      value.command.pipelineDigest = other.pipeline.pipelineDigest;
    },
  ];

  for (const mutate of substitutions) {
    const forged = clone(source);
    mutate(forged);
    resign(forged);
    const receipt =
      validatePlannerExecutionCommandV1WithReceipt(forged);
    assert.equal(receipt.valid, false);
    assert.ok(receipt.errors.length > 0);
  }
});

test("runtime receipt rejects commands attached after a terminal pipeline", () => {
  const blocked = clone(
    PLANNER_EXECUTION_COMMAND_FIXTURES[BLOCKED_ID],
  );
  blocked.status = "executable";
  blocked.command = structuredClone(
    PLANNER_EXECUTION_COMMAND_FIXTURES[READY_ID].command,
  );
  blocked.issues = [];
  resign(blocked);
  const receipt =
    validatePlannerExecutionCommandV1WithReceipt(blocked);
  assert.equal(receipt.valid, false);
  assert.match(receipt.errors.join("\n"), /must be null|status must equal/);
});

test("runtime receipt rejects re-signed pipeline substitution", () => {
  const forged = clone(
    PLANNER_EXECUTION_COMMAND_FIXTURES[READY_ID],
  );
  forged.pipeline = structuredClone(
    PLANNER_EXECUTION_COMMAND_FIXTURES[OTHER_READY_ID].pipeline,
  );
  resign(forged);
  const receipt =
    validatePlannerExecutionCommandV1WithReceipt(forged);
  assert.equal(receipt.valid, false);
  assert.match(
    receipt.errors.join("\n"),
    /derive exactly|pipelineDigest/,
  );
});

test("exact-input validation rejects self-consistent cross-fixture substitution", () => {
  const sourceInputs =
    createPlannerExecutionCommandFixtureInputs(READY_ID);
  const otherInputs =
    createPlannerExecutionCommandFixtureInputs(OTHER_READY_ID);
  const other = PLANNER_EXECUTION_COMMAND_FIXTURES[OTHER_READY_ID];
  assert.deepEqual(
    validatePlannerExecutionCommandV1WithReceipt(other).errors,
    [],
  );
  assert.ok(
    validatePlannerExecutionCommandAgainstInputsV1(
      other,
      sourceInputs.onboarding,
      sourceInputs.catalog,
      sourceInputs.request,
      sourceInputs.providerContext,
    ).some((entry) => entry.includes("exact onboarding")),
  );
  assert.deepEqual(
    validatePlannerExecutionCommandAgainstInputsV1(
      other,
      otherInputs.onboarding,
      otherInputs.catalog,
      otherInputs.request,
      otherInputs.providerContext,
    ),
    [],
  );
});

test("valid provider substitution is runtime-valid but exact-input-invalid", () => {
  const inputs =
    createPlannerExecutionCommandFixtureInputs(READY_ID);
  const forged = clone(
    PLANNER_EXECUTION_COMMAND_FIXTURES[READY_ID],
  );
  assert.ok(forged.command);
  forged.command.providerContext = {
    ...forged.command.providerContext,
    timezone: "Europe/London",
  };
  resign(forged);
  assert.deepEqual(
    validatePlannerExecutionCommandV1WithReceipt(forged).errors,
    [],
  );
  assert.ok(
    validatePlannerExecutionCommandAgainstInputsV1(
      forged,
      inputs.onboarding,
      inputs.catalog,
      inputs.request,
      inputs.providerContext,
    ).some((entry) => entry.includes("exact onboarding")),
  );
});

test("validator is non-throwing for malformed roots and canonical JSON attacks", () => {
  for (const value of [
    null,
    undefined,
    [],
    "command",
    12,
    { commandDigest: "0".repeat(64) },
    {
      ...clone(PLANNER_EXECUTION_COMMAND_FIXTURES[READY_ID]),
      forged: true,
    },
  ]) {
    assert.doesNotThrow(() =>
      validatePlannerExecutionCommandV1WithReceipt(value),
    );
    assert.equal(
      validatePlannerExecutionCommandV1WithReceipt(value).valid,
      false,
    );
  }
});

test("provider issue values stay inside the closed vocabulary", () => {
  const inputs =
    createPlannerExecutionCommandFixtureInputs(READY_ID);
  const result = compilePlannerExecutionCommandV1(
    inputs.onboarding,
    inputs.catalog,
    inputs.request,
    null,
  );
  const forged = clone(result);
  forged.issues[0].values = ["TOTALLY_FORGED_PROVIDER_REASON"];
  resign(forged);
  const receipt =
    validatePlannerExecutionCommandV1WithReceipt(forged);
  assert.equal(receipt.valid, false);
  assert.match(receipt.errors.join("\n"), /closed provider-context/);
  assert.ok(
    PLANNER_EXECUTION_PROVIDER_CONTEXT_ERROR_CODES.includes(
      "PROVIDER_CONTEXT_NOT_RECORD",
    ),
  );
});

test("dedicated workflow watches dependencies and executes the focused suite", () => {
  const workflow = readFileSync(
    ".github/workflows/planning-execution-command-contract.yml",
    "utf8",
  );
  assert.match(workflow, /src\/features\/curated-onboarding\/\*\*/);
  assert.match(workflow, /src\/lib\/dal\/planner-routine-create\.ts/);
  assert.match(workflow, /src\/lib\/dal\/planner-routine-executor\.ts/);
  assert.match(workflow, /scripts\/migration\/validate-supabase-chain\.mjs/);
  assert.match(
    workflow,
    /planning\/execution\/compile\.test\.ts/,
  );
});

test("source remains provider-neutral and outside application integration", () => {
  const source = [
    readFileSync(
      "src/features/curated-onboarding/planning/execution/contract.ts",
      "utf8",
    ),
    readFileSync(
      "src/features/curated-onboarding/planning/execution/compile.ts",
      "utf8",
    ),
  ].join("\n");
  assert.doesNotMatch(source, /planner-routine-executor/);
  assert.doesNotMatch(source, /planner-routine-create/);
  assert.doesNotMatch(source, /supabase/i);
  assert.doesNotMatch(source, /curated-onboarding\/actions/);
  assert.doesNotMatch(source, /executePlannerRoutinePersistenceV1/);
});
