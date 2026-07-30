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
  PLANNER_ROUTINE_CREATE_PROVIDER_ERROR_CODES,
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

function plannerFieldsFromGuard(
  sql: string,
  table: "routines" | "routine_days" | "routine_day_exercises",
) {
  const match = sql.match(new RegExp(
    String.raw`when '${table}' then\s+v_columns := array\[([\s\S]*?)\];`,
  ));
  assert.ok(match, `missing planner guard field map for ${table}`);
  return [...match[1].matchAll(/'([a-z_]+)'/g)].map((entry) => entry[1]);
}

function clientPlannerEvidenceWriteAllowed(
  role: "anon" | "authenticated" | "service_role",
  operation: "INSERT" | "UPDATE",
  plannerFields: readonly string[],
  before: Record<string, unknown> | null,
  after: Record<string, unknown>,
) {
  if (role !== "anon" && role !== "authenticated") {
    return true;
  }
  if (operation === "INSERT") {
    return plannerFields.every((field) => (after[field] ?? null) === null);
  }
  return plannerFields.every(
    (field) => JSON.stringify(after[field] ?? null)
      === JSON.stringify(before?.[field] ?? null),
  );
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
  assert.equal(
    (mock.calls[0].args as { p_authenticated_user_id: string })
      .p_authenticated_user_id,
    setup.intent.request.userId,
  );
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

test("provider errors and thrown failures are closed non-echoing receipts", async () => {
  const setup = readySetup();
  const sensitiveMessages = [
    "SUPABASE_SERVICE_ROLE_KEY=sb_secret_123",
    "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.signature",
    "postgresql://planner:password@db.example.com/postgres",
    "select * from auth.users where email = 'private@example.com'",
    "attacker-controlled:<script>alert('receipt')</script>",
  ];

  for (const sensitiveMessage of sensitiveMessages) {
    const providerFailure = clientWith(null, sensitiveMessage);
    const failed = await createPlannerRoutineFromIntentV1({
      authenticatedUserId: setup.intent.request.userId!,
      intent: setup.intent,
      exactInputs: setup.exactInputs,
      providerContext,
      supabase: providerFailure.client,
    });
    assert.equal(failed.outcome, "provider_error");
    assert.deepEqual(
      failed.errors,
      [PLANNER_ROUTINE_CREATE_PROVIDER_ERROR_CODES.returnedError],
    );
    assert.doesNotMatch(JSON.stringify(failed), new RegExp(
      sensitiveMessage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    ));

    const thrown = await createPlannerRoutineFromIntentV1({
      authenticatedUserId: setup.intent.request.userId!,
      intent: setup.intent,
      exactInputs: setup.exactInputs,
      providerContext,
      supabase: {
        async rpc() {
          throw new Error(sensitiveMessage);
        },
      },
    });
    assert.equal(thrown.outcome, "provider_error");
    assert.deepEqual(
      thrown.errors,
      [PLANNER_ROUTINE_CREATE_PROVIDER_ERROR_CODES.thrownError],
    );
    assert.doesNotMatch(JSON.stringify(thrown), new RegExp(
      sensitiveMessage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    ));
  }
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

test("migration source closes ownership, RLS, client RPC, and activation boundaries", () => {
  const sql = readFileSync(
    new URL(
      "../../../supabase/migrations/20260729000000_planner_persistence_adapter_v1.sql",
      import.meta.url,
    ),
    "utf8",
  ).toLowerCase();
  assert.match(sql, /auth\.role\(\) is distinct from 'service_role'/);
  assert.match(sql, /v_auth_user_id uuid := p_authenticated_user_id/);
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
    /revoke all on function public\.create_planner_routine_v1\([\s\S]*?\) from public/,
  );
  assert.match(
    sql,
    /revoke execute on function public\.create_planner_routine_v1\([\s\S]*?\) from anon/,
  );
  assert.match(
    sql,
    /revoke execute on function public\.create_planner_routine_v1\([\s\S]*?\) from authenticated/,
  );
  assert.doesNotMatch(
    sql,
    /grant execute on function public\.create_planner_routine_v1\([\s\S]*?\) to (?:public|anon|authenticated)/,
  );
  assert.match(
    sql,
    /grant execute on function public\.create_planner_routine_v1\([\s\S]*?\) to service_role/,
  );
  assert.doesNotMatch(sql, /update\s+public\.profiles/);
  assert.doesNotMatch(sql, /active_routine_id/);
});

test("fabricated intents cannot enter through a direct Data API RPC", () => {
  const sql = readFileSync(
    new URL(
      "../../../supabase/migrations/20260729000000_planner_persistence_adapter_v1.sql",
      import.meta.url,
    ),
    "utf8",
  ).toLowerCase();
  const signature =
    String.raw`public\.create_planner_routine_v1\([\s\S]*?\)`;

  assert.match(
    sql,
    new RegExp(String.raw`revoke all on function ${signature} from public`),
  );
  for (const role of ["anon", "authenticated"]) {
    assert.match(
      sql,
      new RegExp(
        String.raw`revoke execute on function ${signature} from ${role}`,
      ),
    );
  }
  assert.doesNotMatch(
    sql,
    new RegExp(
      String.raw`grant execute on function ${signature} to (?:public|anon|authenticated)`,
    ),
  );
});

test("Data API writes cannot add, change, or clear planner evidence", () => {
  const sql = readFileSync(
    new URL(
      "../../../supabase/migrations/20260729000000_planner_persistence_adapter_v1.sql",
      import.meta.url,
    ),
    "utf8",
  ).toLowerCase();
  const expectedFields = {
    routines: [
      "planner_record_id",
      "planner_generation_request_id",
      "planner_uniqueness_key",
      "planner_intent_digest",
      "planner_assembly_digest",
      "planner_routine_digest",
      "planner_activation_state",
      "planner_intent",
    ],
    routine_days: [
      "planner_record_id",
      "planner_routine_record_id",
      "planner_session_id",
      "planner_weekday",
      "planner_time_budget",
      "planner_exercise_record_ids",
    ],
    routine_day_exercises: [
      "planner_record_id",
      "planner_routine_record_id",
      "planner_session_record_id",
      "planner_session_id",
      "planner_exercise_slug",
      "planner_measurement_type",
      "planner_prescription",
      "planner_ranking_explanation",
      "planner_substitution_rules",
      "planner_warmup",
    ],
  } as const;

  assert.match(sql, /security invoker\s+set search_path = ''/);
  assert.match(sql, /current_user not in \('anon', 'authenticated'\)/);
  assert.match(sql, /errcode = '42501'/);
  assert.match(
    sql,
    /message = 'planner_evidence_write_requires_trusted_executor'/,
  );
  assert.match(
    sql,
    /revoke all on function public\.guard_planner_evidence_client_write_v1\(\)\s+from public/,
  );
  for (const role of ["anon", "authenticated"]) {
    assert.match(
      sql,
      new RegExp(
        String.raw`revoke execute on function public\.guard_planner_evidence_client_write_v1\(\)\s+from ${role}`,
      ),
    );
  }

  for (const [table, expected] of Object.entries(expectedFields)) {
    const fields = plannerFieldsFromGuard(
      sql,
      table as keyof typeof expectedFields,
    );
    assert.deepEqual(fields, expected);
    assert.match(
      sql,
      new RegExp(
        String.raw`create trigger ${table}_planner_evidence_client_write_guard\s+before insert or update on public\.${table}\s+for each row\s+execute function public\.guard_planner_evidence_client_write_v1\(\)`,
      ),
    );

    const legacyInsert = Object.fromEntries(
      fields.map((field) => [field, null]),
    );
    const persistedPlannerRow = Object.fromEntries(
      fields.map((field, index) => [
        field,
        field.includes("intent") || field.includes("budget")
          ? { field, index }
          : `${field}-${index}`,
      ]),
    );
    for (const role of ["anon", "authenticated"] as const) {
      assert.equal(
        clientPlannerEvidenceWriteAllowed(
          role,
          "INSERT",
          fields,
          null,
          { ...legacyInsert, name: "ordinary routine data" },
        ),
        true,
      );
      assert.equal(
        clientPlannerEvidenceWriteAllowed(
          role,
          "INSERT",
          fields,
          null,
          { ...legacyInsert, [fields[0]]: "forged-planner-evidence" },
        ),
        false,
      );
      assert.equal(
        clientPlannerEvidenceWriteAllowed(
          role,
          "UPDATE",
          fields,
          persistedPlannerRow,
          { ...persistedPlannerRow, name: "editable display name" },
        ),
        true,
      );
      assert.equal(
        clientPlannerEvidenceWriteAllowed(
          role,
          "UPDATE",
          fields,
          persistedPlannerRow,
          { ...persistedPlannerRow, [fields[0]]: "forged-change" },
        ),
        false,
      );
      assert.equal(
        clientPlannerEvidenceWriteAllowed(
          role,
          "UPDATE",
          fields,
          persistedPlannerRow,
          { ...persistedPlannerRow, [fields[0]]: null },
        ),
        false,
      );
    }
    assert.equal(
      clientPlannerEvidenceWriteAllowed(
        "service_role",
        "UPDATE",
        fields,
        persistedPlannerRow,
        { ...persistedPlannerRow, [fields[0]]: "trusted-write" },
      ),
      true,
    );
  }
});

test("planner rep goals use the active session-start columns", () => {
  const sql = readFileSync(
    new URL(
      "../../../supabase/migrations/20260729000000_planner_persistence_adapter_v1.sql",
      import.meta.url,
    ),
    "utf8",
  ).toLowerCase();
  const startSession = readFileSync(
    new URL("../start-session.ts", import.meta.url),
    "utf8",
  ).toLowerCase();

  assert.match(
    sql,
    /target_sets,\s+target_reps_min,\s+target_reps_max,\s+target_duration_seconds,/,
  );
  assert.match(
    sql,
    /'targetrepsmin', routine_exercise\.target_reps_min,\s+'targetrepsmax', routine_exercise\.target_reps_max,/,
  );
  assert.doesNotMatch(sql, /\brep_range_min\b|\brep_range_max\b/);
  assert.match(
    sql,
    /when v_exercise #>> '\{prescription,measurementtype\}' = 'reps'\s+then \(v_exercise #>> '\{prescription,target,minimum\}'\)::integer/,
  );
  assert.match(
    sql,
    /when v_exercise #>> '\{prescription,measurementtype\}' = 'reps'\s+then \(v_exercise #>> '\{prescription,target,maximum\}'\)::integer/,
  );
  assert.match(
    sql,
    /when v_exercise #>> '\{prescription,measurementtype\}' = 'time'\s+then \(v_exercise #>> '\{prescription,target,maximum\}'\)::integer/,
  );
  assert.match(
    startSession,
    /\.select\("id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max,/,
  );
  assert.match(
    startSession,
    /target_reps_min: exercise\.target_reps_min,\s+target_reps_max: exercise\.target_reps_max,/,
  );
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
    ["src/lib/dal/planner-routine-executor.ts", 2],
    ["src/lib/dal/planner-routine-executor.test.ts", 3],
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
