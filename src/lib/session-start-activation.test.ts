import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildSessionStartExerciseIntents,
  createSessionAtomicallyFromDay,
  type RunnableExerciseForSessionStart,
} from "./session-start-activation";

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

type Executor = NonNullable<Parameters<typeof createSessionAtomicallyFromDay>[1]>;
type ExecutorArgs = Parameters<Executor>[0];
type ExecutorResult = Awaited<ReturnType<Executor>>;

function executorReturning(result: ExecutorResult) {
  const calls: ExecutorArgs[] = [];
  const execute: Executor = async (args) => {
    calls.push(args);
    return result;
  };
  return { execute, calls };
}

function baseArgs(runnableExercises: RunnableExerciseForSessionStart[]) {
  return {
    routineId: ROUTINE_ID,
    dayId: DAY_ID,
    routineName: "Push Pull Legs",
    routineDayName: "Push Day",
    runnableExercises,
    context: "test",
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

test("createSessionAtomicallyFromDay: success returns the session id and the exact routine/day/exercise intents reach the executor", async () => {
  const { execute, calls } = executorReturning({
    ok: true,
    outcome: "created",
    sessionId: SESSION_ID,
    exerciseCount: 1,
  });

  const result = await createSessionAtomicallyFromDay(baseArgs([fullyPopulatedExercise()]), execute);

  assert.deepEqual(result, { ok: true, data: { sessionId: SESSION_ID } });
  assert.equal(calls.length, 1);
  const args = calls[0] as Record<string, unknown>;
  assert.equal(args.routineId, ROUTINE_ID);
  assert.equal(args.dayId, DAY_ID);
  assert.equal(args.routineName, "Push Pull Legs");
  assert.equal(args.routineDayName, "Push Day");
  assert.equal((args.exercises as unknown[]).length, 1);
  // Identity is owned by the adapter (auth + service-role RPC); no user id of
  // any kind is ever supplied from this layer.
  assert.deepEqual(Object.keys(args).sort(), ["dayId", "exercises", "routineDayName", "routineId", "routineName"]);
});

test("createSessionAtomicallyFromDay: an empty exercise list reaches the executor as an empty array", async () => {
  const { execute, calls } = executorReturning({
    ok: true,
    outcome: "created",
    sessionId: SESSION_ID,
    exerciseCount: 0,
  });

  const result = await createSessionAtomicallyFromDay(baseArgs([]), execute);

  assert.deepEqual(result, { ok: true, data: { sessionId: SESSION_ID } });
  assert.deepEqual(calls[0].exercises, []);
});

test("createSessionAtomicallyFromDay: a duplicate request returns the existing winner's session id", async () => {
  const { execute } = executorReturning({
    ok: true,
    outcome: "existing",
    sessionId: SESSION_ID,
    exerciseCount: null,
  });

  const result = await createSessionAtomicallyFromDay(baseArgs([fullyPopulatedExercise()]), execute);

  assert.deepEqual(result, { ok: true, data: { sessionId: SESSION_ID } });
});

test("createSessionAtomicallyFromDay: an adapter failure is surfaced as ok:false without any fallback write", async () => {
  const { execute, calls } = executorReturning({ ok: false, error: "Could not start workout for this day." });

  const result = await createSessionAtomicallyFromDay(baseArgs([fullyPopulatedExercise()]), execute);

  assert.deepEqual(result, { ok: false, error: "Could not start workout for this day." });
  assert.equal(calls.length, 1);
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
