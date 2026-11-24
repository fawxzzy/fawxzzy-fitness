import assert from "node:assert/strict";
import test from "node:test";
import { createSupabaseRecorder, formDataOf, loadActionModule } from "./helpers/action-vm.mjs";

// Drives the REAL session addExerciseAction and routine addRoutineDayExerciseAction with only their external
// boundaries substituted (Supabase, auth, access/tier, ordered inserts, revalidation) so the add-exercise paths the
// unified Add exercise screen submits to are covered directly: validation, custom-exercise creation, planned-link
// check, timer config, schema-compat fallbacks, rollback of a created custom exercise, and shared-plan sync.

const goalFields = { targetSets: "3", targetRepsMin: "8", targetRepsMax: "10", targetWeight: "100", targetWeightUnit: "lbs" };

// ---------------------------------------------------------------- session addExerciseAction

function loadSessionAction({ respond, insertResults = [], guard = { ok: true }, resolved } = {}) {
  const recorder = createSupabaseRecorder(respond);
  const inserts = [];
  const overrides = {
    "next/cache": { revalidatePath() {}, unstable_cache: (fn) => fn },
    "@/lib/auth": { requireUser: async () => ({ id: "user-1" }) },
    "@/lib/supabase/server": { supabaseServer: async () => recorder.client },
    "@/lib/session-live-mutation": {
      guardLiveSessionMutation: async () => guard,
      parseLiveSessionStatus: () => "live",
    },
    "@/lib/exercise-resolution": {
      resolveCanonicalExercise: async () => (resolved === undefined
        ? { id: "ex-canonical", name: "Back Squat", slug: "back-squat", measurementType: "reps" }
        : resolved),
    },
    "@/lib/ordered-position-insert": {
      insertSessionExerciseAtEnd: async (args) => {
        inserts.push(args.values);
        return insertResults.length > 0
          ? insertResults.shift()
          : { data: { id: "se-1", exercise_id: args.values.exercise_id }, error: null };
      },
    },
  };
  const actions = loadActionModule("src/app/session/[id]/actions-add-exercise.ts", overrides);
  return { ...actions, inserts, calls: recorder.calls };
}

const sessionFields = (extra = {}) => formDataOf({ sessionId: "session-1", exerciseId: "ex-1", ...goalFields, ...extra });
const customFields = (extra = {}) => sessionFields({
  exerciseId: "",
  customExerciseMode: "custom",
  customExerciseName: "Cable Crunch",
  customExerciseEquipment: "cable",
  customExerciseMovementPattern: "",
  ...extra,
});
const deletesOf = (calls) => calls.filter((call) => call.table === "exercises" && call.op === "delete");
const createRespond = (call) => {
  if (call.table === "exercises" && call.op === "insert") return { data: { id: "custom-1" }, error: null };
  return undefined;
};

test("session add: rejects a missing session or exercise before touching the database", async () => {
  const { addExerciseAction, inserts } = loadSessionAction();
  assert.deepEqual(await addExerciseAction(formDataOf({ exerciseId: "ex-1", ...goalFields })), { ok: false, error: "Missing exercise info" });
  assert.deepEqual(await addExerciseAction(formDataOf({ sessionId: "session-1", ...goalFields })), { ok: false, error: "Missing exercise info" });
  assert.equal(inserts.length, 0);
});

test("session add: a session that is not live is refused and nothing is inserted", async () => {
  const guard = { ok: false, error: "This workout is no longer live." };
  const { addExerciseAction, inserts } = loadSessionAction({ guard });
  assert.deepEqual(await addExerciseAction(sessionFields()), guard);
  assert.equal(inserts.length, 0);
});

test("session add: a goal without sets is rejected with the goal message", async () => {
  const { addExerciseAction, inserts } = loadSessionAction();
  const result = await addExerciseAction(sessionFields({ targetSets: "" }));
  assert.equal(result.ok, false);
  assert.match(result.error, /sets/i);
  assert.equal(inserts.length, 0);
});

test("session add: a library exercise is appended with its goal columns and no planned link", async () => {
  const { addExerciseAction, inserts } = loadSessionAction();
  const result = await addExerciseAction(sessionFields());
  assert.deepEqual(result, { ok: true });
  assert.equal(inserts.length, 1);
  assert.equal(inserts[0].session_id, "session-1");
  assert.equal(inserts[0].user_id, "user-1");
  assert.equal(inserts[0].exercise_id, "ex-canonical");
  assert.equal(inserts[0].routine_day_exercise_id, null);
  assert.equal(inserts[0].is_skipped, false);
  assert.equal(inserts[0].target_sets_min, 3);
  assert.equal(inserts[0].target_reps_min, 8);
  assert.equal(inserts[0].target_reps_max, 10);
  assert.equal(inserts[0].measurement_type, "reps");
  assert.equal("exercise_timer_enabled" in inserts[0], false);
});

test("session add: an exercise that cannot be resolved is refused", async () => {
  const { addExerciseAction, inserts } = loadSessionAction({ resolved: null });
  assert.deepEqual(await addExerciseAction(sessionFields()), { ok: false, error: "Exercise must map to a canonical exercise before logging." });
  assert.equal(inserts.length, 0);
});

test("session add: the exercise timer toggle reaches the insert as an idle count-up timer", async () => {
  const { addExerciseAction, inserts } = loadSessionAction();
  const result = await addExerciseAction(sessionFields({ exerciseTimerEnabled: "true", exerciseTimerMode: "count_up", exerciseTimerTargetSeconds: "" }));
  assert.deepEqual(result, { ok: true });
  assert.equal(inserts[0].exercise_timer_enabled, true);
  assert.equal(inserts[0].exercise_timer_mode, "count_up");
  assert.equal(inserts[0].exercise_timer_status, "idle");
  assert.equal(inserts[0].exercise_timer_elapsed_seconds, 0);
});

test("session add: a missing timer column with the timer ON is a clear migration message, with the timer OFF it retries without timer columns", async () => {
  const missing = { data: null, error: { message: "column exercise_timer_enabled does not exist" } };

  const withTimer = loadSessionAction({ insertResults: [missing] });
  assert.deepEqual(
    await withTimer.addExerciseAction(sessionFields({ exerciseTimerEnabled: "true", exerciseTimerMode: "count_up" })),
    { ok: false, error: "Exercise timer schema is pending migration review." },
  );
  assert.equal(withTimer.inserts.length, 1);

  const withoutTimer = loadSessionAction({ insertResults: [missing] });
  assert.deepEqual(await withoutTimer.addExerciseAction(sessionFields()), { ok: true });
  assert.equal(withoutTimer.inserts.length, 2);
});

test("session add: a planned-exercise link must belong to this session's routine day", async () => {
  const noSession = loadSessionAction({ respond: () => undefined });
  assert.deepEqual(await noSession.addExerciseAction(sessionFields({ routineDayExerciseId: "rde-1" })), { ok: false, error: "Invalid planned exercise link" });
  assert.equal(noSession.inserts.length, 0);

  const respond = (call) => {
    if (call.table === "sessions") return { data: { id: "session-1", routine_id: "routine-1", routine_day_index: 0 }, error: null };
    if (call.table === "routine_days") return { data: { id: "day-1" }, error: null };
    if (call.table === "routine_day_exercises") return { data: { id: "rde-1" }, error: null };
    return undefined;
  };
  const linked = loadSessionAction({ respond });
  assert.deepEqual(await linked.addExerciseAction(sessionFields({ routineDayExerciseId: "rde-1" })), { ok: true });
  assert.equal(linked.inserts[0].routine_day_exercise_id, "rde-1");
});

test("session add: custom exercise needs a valid name and refuses a duplicate", async () => {
  const short = loadSessionAction({ respond: createRespond });
  const shortResult = await short.addExerciseAction(customFields({ customExerciseName: "x" }));
  assert.equal(shortResult.ok, false);
  assert.match(shortResult.error, /2-80 characters/);

  const duplicate = loadSessionAction({
    respond: (call) => (call.table === "exercises" && call.op === "select" ? { data: { id: "existing" }, error: null } : undefined),
  });
  assert.deepEqual(await duplicate.addExerciseAction(customFields()), { ok: false, error: "You already have a custom exercise with this name." });
  assert.equal(duplicate.inserts.length, 0);
});

test("session add: a custom exercise is created for the member and added to the session", async () => {
  const { addExerciseAction, inserts, calls } = loadSessionAction({ respond: createRespond });
  assert.deepEqual(await addExerciseAction(customFields()), { ok: true });
  const created = calls.find((call) => call.table === "exercises" && call.op === "insert");
  assert.ok(created, "custom exercise row inserted");
  assert.equal(created.payload.user_id, "user-1");
  assert.equal(created.payload.is_global, false);
  assert.equal(inserts[0].exercise_id, "custom-1");
  assert.equal(deletesOf(calls).length, 0);
});

test("session add: a custom exercise whose creation fails adds nothing", async () => {
  const { addExerciseAction, inserts } = loadSessionAction({
    respond: (call) => (call.table === "exercises" && call.op === "insert" ? { data: null, error: { message: "boom" } } : undefined),
  });
  assert.deepEqual(await addExerciseAction(customFields()), { ok: false, error: "boom" });
  assert.equal(inserts.length, 0);
});

test("session add: a custom exercise created for a session insert that then fails is removed again (no orphan in the library)", async () => {
  const failures = [
    { label: "insert error", insertResults: [{ data: null, error: { message: "insert failed" } }], expected: "insert failed" },
    { label: "no row back", insertResults: [{ data: null, error: null }], expected: "Could not add this exercise to the session." },
    {
      label: "timer schema pending",
      insertResults: [{ data: null, error: { message: "column exercise_timer_enabled does not exist" } }],
      extra: { exerciseTimerEnabled: "true", exerciseTimerMode: "count_up" },
      expected: "Exercise timer schema is pending migration review.",
    },
  ];
  for (const failure of failures) {
    const { addExerciseAction, calls } = loadSessionAction({ respond: createRespond, insertResults: failure.insertResults });
    const result = await addExerciseAction(customFields(failure.extra));
    assert.deepEqual(result, { ok: false, error: failure.expected }, failure.label);
    const deletes = deletesOf(calls);
    assert.equal(deletes.length, 1, `${failure.label}: created custom exercise removed`);
    assert.deepEqual(
      deletes[0].filters.filter(([name]) => name === "eq"),
      [["eq", "id", "custom-1"], ["eq", "user_id", "user-1"], ["eq", "is_global", false]],
      failure.label,
    );
  }
});

test("session add: a failed insert of a LIBRARY exercise never deletes anything", async () => {
  const { addExerciseAction, calls } = loadSessionAction({ insertResults: [{ data: null, error: { message: "insert failed" } }] });
  assert.deepEqual(await addExerciseAction(sessionFields()), { ok: false, error: "insert failed" });
  assert.equal(deletesOf(calls).length, 0);
});

// ---------------------------------------------------------------- routine addRoutineDayExerciseAction

function loadRoutineAction({ respond, routineIds = ["routine-1"], dayResult, daysResult, insertResults = [] } = {}) {
  const recorder = createSupabaseRecorder(respond);
  const inserts = [];
  const revalidated = [];
  const day = { id: "day-1", workout_plan_template_id: null };
  const overrides = {
    "server-only": {},
    "next/cache": { revalidatePath(path) { revalidated.push(path); }, unstable_cache: (fn) => fn },
    "@/lib/auth": { requireUser: async () => ({ id: "user-1" }) },
    "@/lib/supabase/server": { supabaseServer: async () => recorder.client },
    "@/lib/pro-tier-access": {
      loadAccessibleRoutineIdsForCurrentTier: async () => ({ error: null, routineIds: new Set(routineIds) }),
    },
    "@/lib/revalidation": {
      getRoutineEditPath: (id) => `/routines/${id}/edit`,
      getRoutineHomePath: (id) => `/routines/${id}`,
      getTodayPath: () => "/today",
      revalidateRoutinesViews() { revalidated.push("routines-views"); },
    },
    "@/lib/ordered-position-insert": {
      insertRoutineDayExerciseAtEnd: async (args) => {
        inserts.push({ routineDayId: args.routineDayId, values: args.values });
        return insertResults.length > 0 ? insertResults.shift() : { data: null, error: null };
      },
    },
    "@/lib/workout-plan-templates": {
      WORKOUT_PLAN_TEMPLATE_EXERCISE_SELECT: "id",
      loadRoutineDayWithWorkoutPlanCompat: async () => dayResult ?? { data: day, error: null },
      loadRoutineDaysWithWorkoutPlanCompat: async () => daysResult ?? { data: [day], error: null },
      isMissingRoutineDayExerciseTemplateColumnError: () => false,
      omitRoutineDayExerciseWorkoutPlanColumn: (payload) => payload,
    },
  };
  const actions = loadActionModule("src/app/routines/[id]/edit/day/actions.ts", overrides);
  return { ...actions, inserts, calls: recorder.calls, revalidated };
}

const routineFields = (extra = {}) => formDataOf({ routineId: "routine-1", routineDayId: "day-1", exerciseId: "ex-1", ...goalFields, ...extra });
const routineCustomFields = (extra = {}) => routineFields({
  exerciseId: "",
  customExerciseMode: "custom",
  customExerciseName: "Cable Crunch",
  customExerciseEquipment: "cable",
  customExerciseMovementPattern: "",
  ...extra,
});

test("routine add: rejects missing ids before any database call", async () => {
  const { addRoutineDayExerciseAction, inserts, calls } = loadRoutineAction();
  assert.deepEqual(await addRoutineDayExerciseAction(formDataOf({ routineId: "routine-1", exerciseId: "ex-1", ...goalFields })), { ok: false, error: "Missing exercise info" });
  assert.deepEqual(await addRoutineDayExerciseAction(formDataOf({ routineId: "routine-1", routineDayId: "day-1", ...goalFields })), { ok: false, error: "Missing exercise info" });
  assert.equal(inserts.length, 0);
  assert.equal(calls.length, 0);
});

test("routine add: a routine the member's tier cannot open is refused", async () => {
  const { addRoutineDayExerciseAction, inserts } = loadRoutineAction({ routineIds: [] });
  const result = await addRoutineDayExerciseAction(routineFields());
  assert.equal(result.ok, false);
  assert.equal(inserts.length, 0);
});

test("routine add: a goal without sets is rejected", async () => {
  const { addRoutineDayExerciseAction, inserts } = loadRoutineAction();
  const result = await addRoutineDayExerciseAction(routineFields({ targetSets: "" }));
  assert.equal(result.ok, false);
  assert.match(result.error, /sets/i);
  assert.equal(inserts.length, 0);
});

test("routine add: a library exercise is appended to the day with its goal columns and views are revalidated", async () => {
  const { addRoutineDayExerciseAction, inserts, revalidated } = loadRoutineAction();
  assert.deepEqual(await addRoutineDayExerciseAction(routineFields()), { ok: true });
  assert.equal(inserts.length, 1);
  assert.equal(inserts[0].routineDayId, "day-1");
  assert.equal(inserts[0].values.exercise_id, "ex-1");
  assert.equal(inserts[0].values.user_id, "user-1");
  assert.equal(inserts[0].values.target_sets, 3);
  assert.ok(revalidated.includes("routines-views"));
  assert.ok(revalidated.includes("/routines/routine-1"));
});

test("routine add: a day that cannot be loaded fails with its message", async () => {
  const { addRoutineDayExerciseAction, inserts } = loadRoutineAction({ dayResult: { data: null, error: null } });
  assert.deepEqual(await addRoutineDayExerciseAction(routineFields()), { ok: false, error: "Day not found." });
  assert.equal(inserts.length, 0);
});

test("routine add: a custom exercise is created, validated and refused when it duplicates one", async () => {
  const created = loadRoutineAction({ respond: createRespond });
  assert.deepEqual(await created.addRoutineDayExerciseAction(routineCustomFields()), { ok: true });
  assert.equal(created.inserts[0].values.exercise_id, "custom-1");

  const short = loadRoutineAction({ respond: createRespond });
  const shortResult = await short.addRoutineDayExerciseAction(routineCustomFields({ customExerciseName: "x" }));
  assert.equal(shortResult.ok, false);
  assert.match(shortResult.error, /2-80 characters/);

  const duplicate = loadRoutineAction({
    respond: (call) => (call.table === "exercises" && call.op === "select" ? { data: { id: "existing" }, error: null } : undefined),
  });
  assert.deepEqual(await duplicate.addRoutineDayExerciseAction(routineCustomFields()), { ok: false, error: "You already have a custom exercise with this name." });
  assert.equal(duplicate.inserts.length, 0);
});

test("routine add: a custom exercise is removed again when the day insert or day lookup fails", async () => {
  const failedInsert = loadRoutineAction({ respond: createRespond, insertResults: [{ data: null, error: { message: "insert failed" } }] });
  assert.deepEqual(await failedInsert.addRoutineDayExerciseAction(routineCustomFields()), { ok: false, error: "insert failed" });
  assert.equal(deletesOf(failedInsert.calls).length, 1);

  const noDay = loadRoutineAction({ respond: createRespond, dayResult: { data: null, error: null } });
  assert.equal((await noDay.addRoutineDayExerciseAction(routineCustomFields())).ok, false);
  assert.equal(deletesOf(noDay.calls).length, 1);

  const library = loadRoutineAction({ insertResults: [{ data: null, error: { message: "insert failed" } }] });
  assert.equal((await library.addRoutineDayExerciseAction(routineFields())).ok, false);
  assert.equal(deletesOf(library.calls).length, 0);
});

test("routine add: a missing progression column with a progression selected says to apply the migration and keeps no orphan custom exercise", async () => {
  const missing = { data: null, error: { message: "column routine_day_exercises.progression_playbook_id does not exist" } };
  const progression = { progressionPlaybookId: "double_progression", progressionLoadIncrement: "5" };

  const library = loadRoutineAction({ insertResults: [missing] });
  const libraryResult = await library.addRoutineDayExerciseAction(routineFields(progression));
  assert.equal(libraryResult.ok, false);
  assert.match(libraryResult.error, /045|progression/i);

  const custom = loadRoutineAction({ respond: createRespond, insertResults: [missing] });
  const customResult = await custom.addRoutineDayExerciseAction(routineCustomFields(progression));
  assert.equal(customResult.ok, false);
  assert.equal(deletesOf(custom.calls).length, 1);
});

test("routine add: a missing progression column without a progression retries without those columns", async () => {
  const missing = { data: null, error: { message: "column routine_day_exercises.progression_playbook_id does not exist" } };
  const { addRoutineDayExerciseAction, inserts } = loadRoutineAction({ insertResults: [missing] });
  assert.deepEqual(await addRoutineDayExerciseAction(routineFields()), { ok: true });
  assert.equal(inserts.length, 2);
  assert.equal("progression_playbook_id" in inserts[1].values, false);
});

test("routine add: a day linked to a plan template with one linked day syncs the template and inserts the linked row", async () => {
  const day = { id: "day-1", workout_plan_template_id: "plan-1" };
  const respond = (call) => (call.table === "workout_plan_template_exercises" && call.op === "insert" ? { data: { id: "tpl-ex-1" }, error: null } : undefined);
  const { addRoutineDayExerciseAction, inserts, calls } = loadRoutineAction({
    respond,
    dayResult: { data: day, error: null },
    daysResult: { data: [day], error: null },
  });
  assert.deepEqual(await addRoutineDayExerciseAction(routineFields()), { ok: true });
  const templateInsert = calls.find((call) => call.table === "workout_plan_template_exercises");
  assert.equal(templateInsert.payload.workout_plan_template_id, "plan-1");
  assert.equal(inserts.length, 1);
  assert.equal(inserts[0].values.workout_plan_template_exercise_id, "tpl-ex-1");
});

test("routine add: a plan shared by several days only syncs the template when the member chose to update the plan", async () => {
  const day = { id: "day-1", workout_plan_template_id: "plan-1" };
  const other = { id: "day-2", workout_plan_template_id: "plan-1" };
  const respond = (call) => (call.table === "workout_plan_template_exercises" && call.op === "insert" ? { data: { id: "tpl-ex-1" }, error: null } : undefined);
  const args = { respond, dayResult: { data: day, error: null }, daysResult: { data: [day, other], error: null } };

  const plain = loadRoutineAction(args);
  assert.deepEqual(await plain.addRoutineDayExerciseAction(routineFields()), { ok: true });
  assert.equal(plain.calls.some((call) => call.table === "workout_plan_template_exercises"), false);
  assert.deepEqual(plain.inserts.map((entry) => entry.routineDayId), ["day-1"]);

  const sync = loadRoutineAction(args);
  assert.deepEqual(await sync.addRoutineDayExerciseAction(routineFields({ workoutPlanTemplateSyncMode: "sync" })), { ok: true });
  assert.deepEqual(sync.inserts.map((entry) => entry.routineDayId), ["day-1", "day-2"]);
});

test("routine add: a failed linked-day insert after the plan row was written undoes this call's plan row and linked rows, then the custom exercise", async () => {
  const day = { id: "day-1", workout_plan_template_id: "plan-1" };
  const other = { id: "day-2", workout_plan_template_id: "plan-1" };
  const respond = (call) => {
    if (call.table === "workout_plan_template_exercises" && call.op === "insert") return { data: { id: "tpl-ex-9" }, error: null };
    if (call.table === "exercises" && call.op === "insert") return { data: { id: "custom-9" }, error: null };
    return undefined;
  };
  const args = {
    respond,
    dayResult: { data: day, error: null },
    daysResult: { data: [day, other], error: null },
    // The first linked day is written, the second fails.
    insertResults: [{ data: { id: "row-1" }, error: null }, { data: null, error: { message: "linked insert failed" } }],
  };

  const custom = loadRoutineAction(args);
  const result = await custom.addRoutineDayExerciseAction(routineCustomFields({ workoutPlanTemplateSyncMode: "sync" }));
  assert.deepEqual(result, { ok: false, error: "linked insert failed" });
  const deletes = custom.calls.filter((call) => call.op === "delete");
  assert.deepEqual(deletes.map((call) => call.table), ["routine_day_exercises", "workout_plan_template_exercises", "exercises"], "plan rows go before the exercise they point at");
  assert.deepEqual(deletes[0].filters.filter(([name]) => name === "eq"), [["eq", "workout_plan_template_exercise_id", "tpl-ex-9"], ["eq", "user_id", "user-1"]]);
  assert.deepEqual(deletes[1].filters.filter(([name]) => name === "eq"), [["eq", "id", "tpl-ex-9"], ["eq", "user_id", "user-1"]]);

  // The same cleanup applies with a library exercise (a generic error): the plan row is undone, no exercise is deleted.
  const library = loadRoutineAction({ ...args, insertResults: [{ data: { id: "row-1" }, error: null }, { data: null, error: { message: "linked insert failed" } }] });
  assert.deepEqual(await library.addRoutineDayExerciseAction(routineFields({ workoutPlanTemplateSyncMode: "sync" })), { ok: false, error: "linked insert failed" });
  assert.deepEqual(library.calls.filter((call) => call.op === "delete").map((call) => call.table), ["routine_day_exercises", "workout_plan_template_exercises"]);

  // A failure before any plan row exists deletes no plan rows.
  const noPlan = loadRoutineAction({ ...args, respond: (call) => (call.table === "workout_plan_template_exercises" && call.op === "insert" ? { data: null, error: { message: "plan insert failed" } } : undefined) });
  assert.deepEqual(await noPlan.addRoutineDayExerciseAction(routineFields({ workoutPlanTemplateSyncMode: "sync" })), { ok: false, error: "plan insert failed" });
  assert.equal(noPlan.calls.some((call) => call.op === "delete"), false);
});
