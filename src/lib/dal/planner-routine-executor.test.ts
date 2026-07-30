import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  PERSISTENCE_INTENT_FIXTURES,
  createPersistenceIntentFixtureInputs,
} from "@/features/curated-onboarding/planning/persistence/fixtures";
import {
  buildPlannerRoutineCreateProjectionV1,
  type PlannerRoutineCreateProviderContextV1,
  type PlannerRoutineCreateRpcClient,
} from "./planner-routine-create";
import {
  executePlannerRoutinePersistenceV1,
  PLANNER_ROUTINE_EXECUTOR_VERSION,
  type PlannerRoutineExecutorDependenciesV1,
} from "./planner-routine-executor";

const READY_ID = "beginner-home-3day-general-strength" as const;
const ROUTINE_ID = "11111111-1111-4111-8111-111111111111";
const providerContext: PlannerRoutineCreateProviderContextV1 = {
  name: "Generated General Strength",
  startDate: "2026-07-30",
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

function response() {
  const { intent } = readySetup();
  return {
    schemaVersion: "fitness.planner-routine-create-response.v1",
    outcome: "created",
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

function dependencies(args?: {
  authenticatedUserId?: string;
  authError?: Error;
  response?: unknown;
}) {
  const events: string[] = [];
  const calls: Array<{ name: string; args: unknown }> = [];
  const client: PlannerRoutineCreateRpcClient = {
    async rpc(name, rpcArgs) {
      events.push("provider-call");
      calls.push({ name, args: rpcArgs });
      return { data: args?.response ?? response(), error: null };
    },
  };
  const value: PlannerRoutineExecutorDependenciesV1 = {
    async requireAuthenticatedUser() {
      events.push("require-user");
      if (args?.authError) {
        throw args.authError;
      }
      return {
        id: args?.authenticatedUserId
          ?? readySetup().intent.request.userId!,
      };
    },
    async createServerProviderClient() {
      events.push("create-server-client");
      return client;
    },
  };
  return { value, events, calls };
}

test("server executor authenticates first and persists only the exact owner intent", async () => {
  const setup = readySetup();
  const mock = dependencies();
  const receipt = await executePlannerRoutinePersistenceV1({
    intent: setup.intent,
    exactInputs: setup.exactInputs,
    providerContext,
  }, mock.value);

  assert.equal(PLANNER_ROUTINE_EXECUTOR_VERSION,
    "fitness.planner-routine-executor.2026-07-30.v1");
  assert.equal(receipt.valid, true);
  assert.equal(receipt.outcome, "created");
  assert.deepEqual(mock.events, [
    "require-user",
    "create-server-client",
    "provider-call",
  ]);
  assert.equal(mock.calls.length, 1);
  assert.deepEqual(mock.calls[0], {
    name: "create_planner_routine_v1",
    args: {
      p_authenticated_user_id: setup.intent.request.userId,
      p_intent: setup.intent,
      p_name: providerContext.name,
      p_start_date: providerContext.startDate,
      p_timezone: providerContext.timezone,
    },
  });
});

test("authenticated owner mismatch fails before the provider call", async () => {
  const setup = readySetup();
  const mock = dependencies({ authenticatedUserId: "different-user" });
  const receipt = await executePlannerRoutinePersistenceV1({
    intent: setup.intent,
    exactInputs: setup.exactInputs,
    providerContext,
  }, mock.value);

  assert.equal(receipt.valid, false);
  assert.equal(receipt.attempted, false);
  assert.match(receipt.errors.join("\n"), /authenticatedUserId/);
  assert.deepEqual(mock.events, ["require-user"]);
  assert.equal(mock.calls.length, 0);
});

test("exact-input forgery fails before the provider call", async () => {
  const setup = readySetup();
  const mock = dependencies();
  const receipt = await executePlannerRoutinePersistenceV1({
    intent: setup.intent,
    exactInputs: {
      ...setup.exactInputs,
      request: {
        ...setup.exactInputs.request as Record<string, unknown>,
        generationRequestId: "forged-request",
      },
    },
    providerContext,
  }, mock.value);

  assert.equal(receipt.valid, false);
  assert.equal(receipt.attempted, false);
  assert.ok(receipt.errors.length > 0);
  assert.deepEqual(mock.events, ["require-user"]);
  assert.equal(mock.calls.length, 0);
});

test("authentication failure never creates a privileged provider client", async () => {
  const setup = readySetup();
  const authError = new Error("AUTHENTICATION_REQUIRED");
  const mock = dependencies({ authError });

  await assert.rejects(
    executePlannerRoutinePersistenceV1({
      intent: setup.intent,
      exactInputs: setup.exactInputs,
      providerContext,
    }, mock.value),
    authError,
  );
  assert.deepEqual(mock.events, ["require-user"]);
  assert.equal(mock.calls.length, 0);
});

test("executor source is server-only and has no activation or UI integration", () => {
  const source = readFileSync(
    new URL("./planner-routine-executor.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /^import "server-only";/);
  assert.match(source, /await import\("@\/lib\/auth"\)/);
  assert.match(source, /await import\("@\/lib\/supabase\/admin"\)/);
  assert.match(source, /createPlannerRoutineFromIntentV1/);
  assert.doesNotMatch(source, /active_routine_id|activateProfileRoutineId/);

  const onboardingAction = readFileSync(
    new URL("../../app/curated-onboarding/actions.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(
    onboardingAction,
    /executePlannerRoutinePersistenceV1|planner-routine-executor/,
  );
});
