import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  startSessionFromDayAtomicV1,
  type SessionStartExerciseIntentV1,
  type SessionStartFromDayRpcClient,
} from "./session-start-atomicity";

const ROUTINE_ID = "11111111-1111-4111-8111-111111111111";
const DAY_ID = "22222222-2222-4222-8222-222222222222";
const SESSION_ID = "33333333-3333-4333-8333-333333333333";
const EXERCISE_ID = "44444444-4444-4444-8444-444444444444";
const ROUTINE_DAY_EXERCISE_ID = "55555555-5555-4555-8555-555555555555";

function exercise(overrides: Partial<SessionStartExerciseIntentV1> = {}): SessionStartExerciseIntentV1 {
  return {
    exerciseId: EXERCISE_ID,
    routineDayExerciseId: ROUTINE_DAY_EXERCISE_ID,
    position: 0,
    measurementType: "reps",
    defaultUnit: "reps",
    targetSetsMin: 3,
    targetSetsMax: 3,
    targetRepsMin: 8,
    targetRepsMax: 12,
    targetWeightMin: null,
    targetWeightMax: null,
    targetWeightUnit: null,
    targetTimeSecondsMin: null,
    targetTimeSecondsMax: null,
    targetDistanceMin: null,
    targetDistanceMax: null,
    targetDistanceUnit: null,
    targetCaloriesMin: null,
    targetCaloriesMax: null,
    ...overrides,
  };
}

function clientWith(value: unknown, providerError: string | null = null) {
  const calls: Array<{ name: string; args: unknown }> = [];
  const client: SessionStartFromDayRpcClient = {
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

function throwingClient(): SessionStartFromDayRpcClient {
  return {
    async rpc() {
      throw new Error("network error");
    },
  };
}

test("returns the created session id on a successful create outcome", async () => {
  const { client, calls } = clientWith({
    schemaVersion: "fitness.session-start-response.v1",
    outcome: "created",
    sessionId: SESSION_ID,
    exerciseCount: 1,
  });

  const result = await startSessionFromDayAtomicV1({
    supabase: client,
    routineId: ROUTINE_ID,
    dayId: DAY_ID,
    routineName: "Push Pull Legs",
    routineDayName: "Push Day",
    exercises: [exercise()],
  });

  assert.deepEqual(result, { ok: true, outcome: "created", sessionId: SESSION_ID, exerciseCount: 1 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, "start_session_from_day_v1");
  assert.deepEqual(calls[0].args, {
    p_routine_id: ROUTINE_ID,
    p_day_id: DAY_ID,
    p_routine_name: "Push Pull Legs",
    p_routine_day_name: "Push Day",
    p_exercises: [exercise()],
  });
});

test("returns the existing session id on an existing outcome, without treating it as an error", async () => {
  const { client } = clientWith({
    schemaVersion: "fitness.session-start-response.v1",
    outcome: "existing",
    sessionId: SESSION_ID,
    exerciseCount: null,
  });

  const result = await startSessionFromDayAtomicV1({
    supabase: client,
    routineId: ROUTINE_ID,
    dayId: DAY_ID,
    routineName: "Push Pull Legs",
    routineDayName: "Push Day",
    exercises: [exercise()],
  });

  assert.deepEqual(result, { ok: true, outcome: "existing", sessionId: SESSION_ID, exerciseCount: null });
});

test("surfaces a provider-returned error instead of a garbage session id", async () => {
  const { client } = clientWith(null, "unique_violation");

  const result = await startSessionFromDayAtomicV1({
    supabase: client,
    routineId: ROUTINE_ID,
    dayId: DAY_ID,
    routineName: "Push Pull Legs",
    routineDayName: "Push Day",
    exercises: [exercise()],
  });

  assert.equal(result.ok, false);
});

test("surfaces a thrown provider error instead of letting it propagate uncaught", async () => {
  const result = await startSessionFromDayAtomicV1({
    supabase: throwingClient(),
    routineId: ROUTINE_ID,
    dayId: DAY_ID,
    routineName: "Push Pull Legs",
    routineDayName: "Push Day",
    exercises: [exercise()],
  });

  assert.equal(result.ok, false);
});

test("rejects a malformed response instead of trusting an unexpected shape", async () => {
  const malformedResponses = [
    null,
    {},
    { schemaVersion: "fitness.session-start-response.v1", outcome: "created" },
    { schemaVersion: "fitness.session-start-response.v1", outcome: "created", sessionId: "" },
    { schemaVersion: "fitness.session-start-response.v1", outcome: "cancelled", sessionId: SESSION_ID },
    { schemaVersion: "wrong.version", outcome: "created", sessionId: SESSION_ID },
    { schemaVersion: "fitness.session-start-response.v1", outcome: "created", sessionId: SESSION_ID, exerciseCount: "1" },
  ];

  for (const malformed of malformedResponses) {
    const { client } = clientWith(malformed);
    const result = await startSessionFromDayAtomicV1({
      supabase: client,
      routineId: ROUTINE_ID,
      dayId: DAY_ID,
      routineName: "Push Pull Legs",
      routineDayName: "Push Day",
      exercises: [exercise()],
    });
    assert.equal(result.ok, false, `expected rejection for ${JSON.stringify(malformed)}`);
  }
});

test("passes an empty-day request through unchanged (zero-exercise sessions are a valid outcome)", async () => {
  const { client, calls } = clientWith({
    schemaVersion: "fitness.session-start-response.v1",
    outcome: "created",
    sessionId: SESSION_ID,
    exerciseCount: 0,
  });

  const result = await startSessionFromDayAtomicV1({
    supabase: client,
    routineId: ROUTINE_ID,
    dayId: DAY_ID,
    routineName: "Push Pull Legs",
    routineDayName: "Push Day",
    exercises: [],
  });

  assert.deepEqual(result, { ok: true, outcome: "created", sessionId: SESSION_ID, exerciseCount: 0 });
  assert.deepEqual(calls[0].args, {
    p_routine_id: ROUTINE_ID,
    p_day_id: DAY_ID,
    p_routine_name: "Push Pull Legs",
    p_routine_day_name: "Push Day",
    p_exercises: [],
  });
});

function migrationSql(): string {
  return readFileSync(
    new URL(
      "../../supabase/migrations/20260804000000_session_start_atomicity_v1.sql",
      import.meta.url,
    ),
    "utf8",
  ).toLowerCase();
}

test("migration adds a partial unique index that defends every write path, not only this RPC", () => {
  const sql = migrationSql();
  assert.match(
    sql,
    /create unique index if not exists sessions_user_routine_active_uq\s+on public\.sessions \(user_id, routine_id\)\s+where status = 'in_progress' and routine_id is not null/,
  );
});

test("migration function runs as security invoker under the caller's own RLS, not a trusted service-role bypass", () => {
  const sql = migrationSql();
  assert.match(sql, /security invoker/);
  assert.match(sql, /set search_path = ''/);
  assert.doesNotMatch(sql, /auth\.role\(\) is distinct from 'service_role'/);
});

test("migration derives the authenticated user from auth.uid(), never from a caller-supplied parameter", () => {
  const sql = migrationSql();
  assert.match(sql, /v_user_id uuid := auth\.uid\(\)/);
  assert.doesNotMatch(sql, /p_user_id/);
  assert.doesNotMatch(sql, /p_authenticated_user_id/);
});

test("migration takes an advisory lock scoped to the calling user and routine, namespaced apart from the planner RPC's lock domain", () => {
  const sql = migrationSql();
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /'session_start_v1:' \|\| v_user_id::text \|\| ':' \|\| p_routine_id::text/);
});

test("migration handles unique_violation by returning the winning session instead of surfacing a raw constraint error", () => {
  const sql = migrationSql();
  assert.match(sql, /exception\s+when unique_violation then/);
});

test("migration revokes public/anon execute and grants only to authenticated", () => {
  const sql = migrationSql();
  const signature = String.raw`public\.start_session_from_day_v1\([\s\S]*?\)`;
  assert.match(sql, new RegExp(String.raw`revoke all on function ${signature} from public`));
  assert.match(sql, new RegExp(String.raw`revoke execute on function ${signature} from anon`));
  assert.doesNotMatch(
    sql,
    new RegExp(String.raw`grant execute on function ${signature} to (?:public|anon)`),
  );
  assert.match(sql, new RegExp(String.raw`grant execute on function ${signature} to authenticated`));
});

test("migration re-validates routine and day ownership instead of trusting the caller's prior lookup", () => {
  const sql = migrationSql();
  assert.match(sql, /where routine_day\.id = p_day_id\s+and routine_day\.routine_id = p_routine_id\s+and routine_day\.user_id = v_user_id/);
  assert.match(sql, /where routine\.id = p_routine_id\s+and routine\.user_id = v_user_id/);
});

test("start-session.ts does not yet call the new RPC (activation is a separate follow-up gated on migration apply)", () => {
  const startSession = readFileSync(
    new URL("./start-session.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(startSession, /start_session_from_day_v1/);
  assert.doesNotMatch(startSession, /session-start-atomicity/);
});
