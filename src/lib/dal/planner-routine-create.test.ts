import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  PERSISTENCE_INTENT_FIXTURES,
  createPersistenceIntentFixtureInputs,
} from "@/features/curated-onboarding/planning/persistence/fixtures";
import {
  buildPlannerRoutineCreateProjectionV1,
  createPlannerRoutineFromIntentV1,
  type PlannerRoutineCreateProviderContextV1,
  type PlannerRoutineCreateRpcClient,
} from "./planner-routine-create";

const READY_ID = "beginner-home-3day-general-strength" as const;
const BLOCKED_ID = "bodyweight-travel-4day-general-fitness" as const;
const ROUTINE_ID = "11111111-1111-4111-8111-111111111111";
const providerContext: PlannerRoutineCreateProviderContextV1 = {
  name: "Generated General Strength",
  startDate: "2026-07-29",
  timezone: "America/New_York",
};

function readySetup() {
  const intent = structuredClone(PERSISTENCE_INTENT_FIXTURES[READY_ID]);
  const inputs = createPersistenceIntentFixtureInputs(READY_ID);
  return {
    intent,
    exactInputs: {
      planning: inputs.planning,
      catalog: inputs.catalog,
      coverage: inputs.coverage,
      ranking: inputs.ranking,
      selection: inputs.selection,
      allocation: inputs.allocation,
      prescription: inputs.prescription,
      assembly: inputs.assembly,
      request: inputs.request,
    },
  };
}

function response(
  outcome: "created" | "replayed" = "created",
) {
  const { intent } = readySetup();
  return {
    schemaVersion: "fitness.planner-routine-create-response.v1",
    outcome,
    routineId: ROUTINE_ID,
    userId: intent.request.userId,
    generationRequestId: intent.request.generationRequestId,
    uniquenessKey: intent.request.uniquenessKey,
    intentDigest: intent.intentDigest,
    activationMutation: false,
    persistedIntent: structuredClone(intent),
    rows: buildPlannerRoutineCreateProjectionV1(intent, providerContext),
  };
}

function clientWith(value: unknown, providerError: string | null = null) {
  const calls: Array<{ name: string; args: unknown }> = [];
  const client: PlannerRoutineCreateRpcClient = {
    async rpc(name, args) {
      calls.push({ name, args });
      return {
        data: value,
        error: providerError ? { message: providerError } : null,
      };
    },
  };
  return { client, calls };
}

test("creates only after runtime, exact-input, owner, and context validation", async () => {
  const setup = readySetup();
  const mock = clientWith(response());
  const receipt = await createPlannerRoutineFromIntentV1({
    authenticatedUserId: setup.intent.request.userId!,
    intent: setup.intent,
    exactInputs: setup.exactInputs,
    providerContext,
    supabase: mock.client,
  });
  assert.deepEqual(receipt, {
    adapterVersion:
      "fitness.planner-routine-create-adapter.2026-07-29.v1",
    intentDigest: setup.intent.intentDigest,
    attempted: true,
    valid: true,
    outcome: "created",
    routineId: ROUTINE_ID,
    responseDigest: receipt.responseDigest,
    errors: [],
  });
  assert.match(receipt.responseDigest!, /^[a-f0-9]{64}$/);
  assert.equal(mock.calls.length, 1);
  assert.equal(mock.calls[0].name, "create_planner_routine_v1");
});

test("accepts an exact replay without widening activation authority", async () => {
  const setup = readySetup();
  const mock = clientWith(response("replayed"));
  const receipt = await createPlannerRoutineFromIntentV1({
    authenticatedUserId: setup.intent.request.userId!,
    intent: setup.intent,
    exactInputs: setup.exactInputs,
    providerContext,
    supabase: mock.client,
  });
  assert.equal(receipt.valid, true);
  assert.equal(receipt.outcome, "replayed");
  assert.equal(receipt.routineId, ROUTINE_ID);
});

test("rejects owner mismatch before calling the provider", async () => {
  const setup = readySetup();
  const mock = clientWith(response());
  const receipt = await createPlannerRoutineFromIntentV1({
    authenticatedUserId: "different-user",
    intent: setup.intent,
    exactInputs: setup.exactInputs,
    providerContext,
    supabase: mock.client,
  });
  assert.equal(receipt.valid, false);
  assert.equal(receipt.attempted, false);
  assert.match(receipt.errors.join("\n"), /authenticatedUserId/);
  assert.equal(mock.calls.length, 0);
});

test("rejects non-creatable intent before calling the provider", async () => {
  const intent = PERSISTENCE_INTENT_FIXTURES[BLOCKED_ID];
  const inputs = createPersistenceIntentFixtureInputs(BLOCKED_ID);
  const mock = clientWith(response());
  const receipt = await createPlannerRoutineFromIntentV1({
    authenticatedUserId: intent.request.userId!,
    intent,
    exactInputs: {
      planning: inputs.planning,
      catalog: inputs.catalog,
      coverage: inputs.coverage,
      ranking: inputs.ranking,
      selection: inputs.selection,
      allocation: inputs.allocation,
      prescription: inputs.prescription,
      assembly: inputs.assembly,
      request: inputs.request,
    },
    providerContext,
    supabase: mock.client,
  });
  assert.equal(receipt.valid, false);
  assert.equal(receipt.attempted, false);
  assert.match(receipt.errors.join("\n"), /ready_to_create/);
  assert.equal(mock.calls.length, 0);
});

test("rejects exact-input mismatch before calling the provider", async () => {
  const setup = readySetup();
  const mock = clientWith(response());
  const receipt = await createPlannerRoutineFromIntentV1({
    authenticatedUserId: setup.intent.request.userId!,
    intent: setup.intent,
    exactInputs: {
      ...setup.exactInputs,
      request: {
        ...setup.exactInputs.request as object,
        generationRequestId: "different-request",
      },
    },
    providerContext,
    supabase: mock.client,
  });
  assert.equal(receipt.valid, false);
  assert.equal(receipt.attempted, false);
  assert.match(receipt.errors.join("\n"), /exact planning, catalog/);
  assert.equal(mock.calls.length, 0);
});

test("rejects invalid provider context before calling the provider", async () => {
  const setup = readySetup();
  const mock = clientWith(response());
  const receipt = await createPlannerRoutineFromIntentV1({
    authenticatedUserId: setup.intent.request.userId!,
    intent: setup.intent,
    exactInputs: setup.exactInputs,
    providerContext: {
      name: " padded ",
      startDate: "2026-02-30",
      timezone: "Not/A_Zone",
    },
    supabase: mock.client,
  });
  assert.equal(receipt.valid, false);
  assert.equal(receipt.attempted, false);
  assert.equal(receipt.errors.length, 3);
  assert.equal(mock.calls.length, 0);
});

test("malformed provider context roots return receipts without provider calls", async () => {
  const setup = readySetup();
  const malformedRoots: unknown[] = [
    null,
    undefined,
    [],
    "not-a-record",
    0,
    true,
    () => null,
  ];

  for (const malformedRoot of malformedRoots) {
    const mock = clientWith(response());
    const receipt = await createPlannerRoutineFromIntentV1({
      authenticatedUserId: setup.intent.request.userId!,
      intent: setup.intent,
      exactInputs: setup.exactInputs,
      providerContext: malformedRoot,
      supabase: mock.client,
    });
    assert.equal(receipt.valid, false);
    assert.equal(receipt.attempted, false);
    assert.equal(receipt.outcome, "not_attempted");
    assert.deepEqual(
      receipt.errors,
      ["$.providerContext must be a record."],
    );
    assert.equal(mock.calls.length, 0);
  }
});

test("provider errors and thrown failures are non-throwing receipts", async () => {
  const setup = readySetup();
  const providerFailure = clientWith(null, "database unavailable");
  const failed = await createPlannerRoutineFromIntentV1({
    authenticatedUserId: setup.intent.request.userId!,
    intent: setup.intent,
    exactInputs: setup.exactInputs,
    providerContext,
    supabase: providerFailure.client,
  });
  assert.equal(failed.outcome, "provider_error");
  assert.deepEqual(failed.errors, ["database unavailable"]);

  const thrown = await createPlannerRoutineFromIntentV1({
    authenticatedUserId: setup.intent.request.userId!,
    intent: setup.intent,
    exactInputs: setup.exactInputs,
    providerContext,
    supabase: {
      async rpc() {
        throw new Error("network failed");
      },
    },
  });
  assert.equal(thrown.outcome, "provider_error");
  assert.deepEqual(thrown.errors, ["network failed"]);
});

test("malformed and partial provider responses fail closed", async () => {
  const setup = readySetup();
  for (const value of [
    null,
    {},
    { ...response(), routineId: "not-a-uuid" },
    { ...response(), unexpected: true },
  ]) {
    const mock = clientWith(value);
    const receipt = await createPlannerRoutineFromIntentV1({
      authenticatedUserId: setup.intent.request.userId!,
      intent: setup.intent,
      exactInputs: setup.exactInputs,
      providerContext,
      supabase: mock.client,
    });
    assert.equal(receipt.valid, false);
    assert.equal(receipt.attempted, true);
    assert.ok(receipt.errors.length > 0);
  }
});

test("forged persisted intent, row projection, or activation mutation rejects", async () => {
  const setup = readySetup();
  const forgedIntent = response();
  forgedIntent.persistedIntent.request.generationRequestId = "forged";
  const forgedRows = response();
  forgedRows.rows.sessions[0].ordinal = 99;
  const activation = { ...response(), activationMutation: true };

  for (const value of [forgedIntent, forgedRows, activation]) {
    const mock = clientWith(value);
    const receipt = await createPlannerRoutineFromIntentV1({
      authenticatedUserId: setup.intent.request.userId!,
      intent: setup.intent,
      exactInputs: setup.exactInputs,
      providerContext,
      supabase: mock.client,
    });
    assert.equal(receipt.valid, false);
    assert.ok(receipt.errors.length > 0);
  }
});

test("migration source closes ownership, RLS, grants, and activation boundaries", () => {
  const sql = readFileSync(
    new URL(
      "../../../supabase/migrations/20260729000000_planner_persistence_adapter_v1.sql",
      import.meta.url,
    ),
    "utf8",
  ).toLowerCase();
  assert.match(sql, /auth\.uid\(\)/);
  assert.doesNotMatch(sql, /user_metadata/);
  assert.match(sql, /enable row level security/g);
  assert.match(sql, /security invoker/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /unique index/);
  assert.match(sql, /jsonb/);
  assert.match(
    sql,
    /grant select, insert on table public\.routines to authenticated/,
  );
  assert.match(
    sql,
    /grant select on table public\.exercises to authenticated/,
  );
  assert.match(
    sql,
    /revoke execute on function public\.create_planner_routine_v1/,
  );
  assert.match(
    sql,
    /grant execute on function public\.create_planner_routine_v1/,
  );
  assert.doesNotMatch(sql, /update\s+public\.profiles/);
  assert.doesNotMatch(sql, /active_routine_id/);
});

test("dedicated workflow watches exact adapter dependencies and runs directly", () => {
  const workflow = readFileSync(
    new URL(
      "../../../.github/workflows/planning-persistence-adapter-contract.yml",
      import.meta.url,
    ),
    "utf8",
  );
  assert.equal(
    workflow.match(/src\/features\/curated-onboarding\/\*\*/g)?.length,
    2,
  );
  for (const [path, count] of [
    ["src/lib/dal/planner-routine-create.ts", 2],
    ["src/lib/dal/planner-routine-create.test.ts", 3],
    [
      "supabase/migrations/20260729000000_planner_persistence_adapter_v1.sql",
      2,
    ],
  ] as const) {
    assert.equal(
      workflow.match(new RegExp(path.replaceAll(".", "\\."), "g"))?.length,
      count,
    );
  }
  assert.match(
    workflow,
    /--test src\/lib\/dal\/planner-routine-create\.test\.ts/,
  );
  assert.doesNotMatch(workflow, /supabase db push|migration:validate/);
});
