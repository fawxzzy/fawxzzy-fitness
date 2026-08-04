import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildSessionStartExerciseIntents,
  createSessionAtomicallyFromDay,
  type RunnableExerciseForSessionStart,
} from "./session-start-activation";
import type { SessionStartFromDayRpcClient } from "./session-start-atomicity";

const ROUTINE_ID = "11111111-1111-4111-8111-111111111111";
const DAY_ID = "22222222-2222-4222-8222-222222222222";
const SESSION_ID = "33333333-3333-4333-8333-333333333333";

function fullyPopulatedExercise(overrides: Partial<RunnableExerciseForSessionStart> = {}): RunnableExerciseForSessionStart {
  return {
    id: "rde-1",
    user_id: "user-1",
    routine_day_id: DAY_ID,
    exercise_id: "exercise-1",
    position: 2,
    target_sets: 3,
    target_reps: null,
    target_reps_min: 8,
    target_reps_max: 12,
    target_weight: 135,
    target_weight_unit: "lbs",
    target_duration_seconds: 45,
    target_distance: 400,
    target_distance_unit: "m",
    target_calories: 50,
    measurement_type: "reps",
    // The final `defaultUnit` in the built intent is derived from
    // measurementType, not passed through from this raw field -- this value
    // is intentionally unrelated to the "reps" expected in the assertion
    // below, matching the pre-existing behavior this refactor preserved.
    default_unit: null,
    notes: "setup cue",
    displayName: "Back Squat",
    goalLine: "3x8-12",
    details: {
      id: "exercise-1",
      primary_muscle: "quads",
      equipment: "barbell",
      movement_pattern: "squat",
      image_path: null,
      image_howto_path: null,
      image_icon_path: null,
      slug: "back-squat",
      how_to_short: null,
      measurement_type: "reps",
      default_unit: "reps",
      kind: null,
      type: null,
      tags: null,
      categories: null,
    },
    ...overrides,
  };
}

function clientWith(value: unknown, providerError: { message?: string } | null = null) {
  const calls: Array<{ name: string; args: unknown }> = [];
  const client: SessionStartFromDayRpcClient = {
    async rpc(name, args) {
      calls.push({ name, args });
      return { data: value, error: providerError };
    },
  };
  return { client, calls };
}

function createdResponse(sessionId: string, exerciseCount: number) {
  return {
    schemaVersion: "fitness.session-start-response.v1",
    outcome: "created",
    sessionId,
    exerciseCount,
  };
}

function existingResponse(sessionId: string) {
  return {
    schemaVersion: "fitness.session-start-response.v1",
    outcome: "existing",
    sessionId,
    exerciseCount: null,
  };
}

test("buildSessionStartExerciseIntents maps every current goal column to its camelCase RPC field", () => {
  const [intent] = buildSessionStartExerciseIntents({
    runnableExercises: [fullyPopulatedExercise()],
    context: "test",
  });

  assert.deepEqual(intent, {
    exerciseId: "exercise-1",
    routineDayExerciseId: "rde-1",
    position: 2,
    measurementType: "reps",
    defaultUnit: "reps",
    targetSetsMin: 3,
    targetSetsMax: 3,
    targetRepsMin: 8,
    targetRepsMax: 12,
    targetWeightMin: 135,
    targetWeightMax: 135,
    targetWeightUnit: "lbs",
    targetTimeSecondsMin: 45,
    targetTimeSecondsMax: 45,
    targetDistanceMin: 400,
    targetDistanceMax: 400,
    targetDistanceUnit: "m",
    targetCaloriesMin: 50,
    targetCaloriesMax: 50,
  });
});

test("buildSessionStartExerciseIntents preserves input order deterministically", () => {
  const exercises = [
    fullyPopulatedExercise({ id: "rde-a", position: 0 }),
    fullyPopulatedExercise({ id: "rde-b", position: 1 }),
    fullyPopulatedExercise({ id: "rde-c", position: 2 }),
  ];

  const intents = buildSessionStartExerciseIntents({ runnableExercises: exercises, context: "test" });

  assert.deepEqual(
    intents.map((intent) => intent.routineDayExerciseId),
    ["rde-a", "rde-b", "rde-c"],
  );
});

test("buildSessionStartExerciseIntents produces an intent with the exact key set the RPC adapter expects", () => {
  const [intent] = buildSessionStartExerciseIntents({
    runnableExercises: [fullyPopulatedExercise()],
    context: "test",
  });

  const expectedKeys = [
    "exerciseId",
    "routineDayExerciseId",
    "position",
    "measurementType",
    "defaultUnit",
    "targetSetsMin",
    "targetSetsMax",
    "targetRepsMin",
    "targetRepsMax",
    "targetWeightMin",
    "targetWeightMax",
    "targetWeightUnit",
    "targetTimeSecondsMin",
    "targetTimeSecondsMax",
    "targetDistanceMin",
    "targetDistanceMax",
    "targetDistanceUnit",
    "targetCaloriesMin",
    "targetCaloriesMax",
  ].sort();

  assert.deepEqual(Object.keys(intent).sort(), expectedKeys);
});

test("createSessionAtomicallyFromDay: successful activation returns the new session id and exact routine/day identifiers reach the RPC", async () => {
  const { client, calls } = clientWith(createdResponse(SESSION_ID, 1));

  const result = await createSessionAtomicallyFromDay({
    supabase: client,
    routineId: ROUTINE_ID,
    dayId: DAY_ID,
    routineName: "Push Pull Legs",
    routineDayName: "Push Day",
    runnableExercises: [fullyPopulatedExercise()],
    context: "test",
  });

  assert.deepEqual(result, { ok: true, data: { sessionId: SESSION_ID } });
  assert.equal(calls.length, 1);
  const args = calls[0].args as Record<string, unknown>;
  assert.equal(args.p_routine_id, ROUTINE_ID);
  assert.equal(args.p_day_id, DAY_ID);
  assert.equal(args.p_routine_name, "Push Pull Legs");
  assert.equal(args.p_routine_day_name, "Push Day");
  // The RPC derives the caller's identity from auth.uid() itself -- no
  // user id of any kind is ever included in the call args here.
  assert.equal("p_user_id" in args, false);
  assert.equal("p_authenticated_user_id" in args, false);
});

test("createSessionAtomicallyFromDay: an empty exercise list reaches the RPC as an empty array, not omitted or null", async () => {
  const { client, calls } = clientWith(createdResponse(SESSION_ID, 0));

  const result = await createSessionAtomicallyFromDay({
    supabase: client,
    routineId: ROUTINE_ID,
    dayId: DAY_ID,
    routineName: "Push Pull Legs",
    routineDayName: "Push Day",
    runnableExercises: [],
    context: "test",
  });

  assert.deepEqual(result, { ok: true, data: { sessionId: SESSION_ID } });
  const args = calls[0].args as Record<string, unknown>;
  assert.deepEqual(args.p_exercises, []);
});

test("createSessionAtomicallyFromDay: a duplicate request returns the existing winner's session id", async () => {
  const { client } = clientWith(existingResponse(SESSION_ID));

  const result = await createSessionAtomicallyFromDay({
    supabase: client,
    routineId: ROUTINE_ID,
    dayId: DAY_ID,
    routineName: "Push Pull Legs",
    routineDayName: "Push Day",
    runnableExercises: [fullyPopulatedExercise()],
    context: "test",
  });

  assert.deepEqual(result, { ok: true, data: { sessionId: SESSION_ID } });
});

test("createSessionAtomicallyFromDay: a provider-returned error is surfaced as ok:false, not thrown or silently ignored", async () => {
  const { client } = clientWith(null, { message: "unique_violation" });

  const result = await createSessionAtomicallyFromDay({
    supabase: client,
    routineId: ROUTINE_ID,
    dayId: DAY_ID,
    routineName: "Push Pull Legs",
    routineDayName: "Push Day",
    runnableExercises: [fullyPopulatedExercise()],
    context: "test",
  });

  assert.equal(result.ok, false);
});

test("createSessionAtomicallyFromDay: a missing RPC function fails loudly instead of falling back to a direct insert", async () => {
  // Mirrors the real PostgREST response shape (PGRST202) when a function
  // does not exist in the target database -- e.g. because the migration was
  // never applied. This must surface as a plain error, never as a silent
  // success and never as a fallback to any other write path.
  const { client } = clientWith(null, {
    message: 'Could not find the function public.start_session_from_day_v1(p_day_id, p_exercises, p_routine_day_name, p_routine_id, p_routine_name) in the schema cache',
  });

  const result = await createSessionAtomicallyFromDay({
    supabase: client,
    routineId: ROUTINE_ID,
    dayId: DAY_ID,
    routineName: "Push Pull Legs",
    routineDayName: "Push Day",
    runnableExercises: [fullyPopulatedExercise()],
    context: "test",
  });

  assert.equal(result.ok, false);
});

test("createSessionAtomicallyFromDay: a thrown provider error is caught and surfaced, not left to crash the caller", async () => {
  const throwingClient: SessionStartFromDayRpcClient = {
    async rpc() {
      throw new Error("network error");
    },
  };

  const result = await createSessionAtomicallyFromDay({
    supabase: throwingClient,
    routineId: ROUTINE_ID,
    dayId: DAY_ID,
    routineName: "Push Pull Legs",
    routineDayName: "Push Day",
    runnableExercises: [fullyPopulatedExercise()],
    context: "test",
  });

  assert.equal(result.ok, false);
});

test("createSessionAtomicallyFromDay: a malformed RPC response is rejected rather than trusted", async () => {
  const { client } = clientWith({ unexpected: "shape" });

  const result = await createSessionAtomicallyFromDay({
    supabase: client,
    routineId: ROUTINE_ID,
    dayId: DAY_ID,
    routineName: "Push Pull Legs",
    routineDayName: "Push Day",
    runnableExercises: [fullyPopulatedExercise()],
    context: "test",
  });

  assert.equal(result.ok, false);
});

test("no direct sessions/session_exercises table insertion remains reachable in the activated start-session.ts flow", () => {
  const startSession = readFileSync(new URL("./start-session.ts", import.meta.url), "utf8");
  const activation = readFileSync(new URL("./session-start-activation.ts", import.meta.url), "utf8");

  for (const source of [startSession, activation]) {
    assert.doesNotMatch(source, /\.from\(\s*["']sessions["']\s*\)\s*\.insert/);
    assert.doesNotMatch(source, /\.from\(\s*["']session_exercises["']\s*\)\s*\.insert/);
  }
});

test("no manual rollback path remains reachable in the activated start-session.ts flow", () => {
  const startSession = readFileSync(new URL("./start-session.ts", import.meta.url), "utf8");
  const activation = readFileSync(new URL("./session-start-activation.ts", import.meta.url), "utf8");

  for (const source of [startSession, activation]) {
    assert.doesNotMatch(source, /rollbackFailedSessionStart/);
    assert.doesNotMatch(source, /session-start-integrity/);
  }
});

test("start-session.ts calls the atomic activation path, not any legacy pre-check", () => {
  const startSession = readFileSync(new URL("./start-session.ts", import.meta.url), "utf8");

  assert.match(startSession, /createSessionAtomicallyFromDay/);
  assert.doesNotMatch(startSession, /findExistingInProgressSession/);
});
