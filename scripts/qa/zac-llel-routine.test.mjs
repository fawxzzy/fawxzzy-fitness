import assert from "node:assert/strict";
import test from "node:test";
import {
  ZAC_LLEL_PREFIX,
  ZAC_LLEL_ROUTINE_NAME,
  collectZacLlelExerciseDefinitions,
  getZacLlelRoutineDefinition,
  summarizeZacLlelDefinition,
} from "./zac-llel-routine-data.mjs";
import { buildDryRunPayload } from "./seed-zac-llel-routine.mjs";
import { resolveCanonicalExercises } from "./fitness-catalog-resolver.mjs";

test("Zac LLEL routine definition is prefix scoped and covers the manual LLEL states", () => {
  const definition = getZacLlelRoutineDefinition();
  const summary = summarizeZacLlelDefinition(definition);

  assert.equal(summary.routineName, ZAC_LLEL_ROUTINE_NAME);
  assert.equal(summary.dayCount, 7);
  assert.equal(summary.trainingDayCount, 5);
  assert.equal(summary.restDayCount, 2);
  assert.ok(summary.completedSessionCount > 0);
  assert.ok(summary.setCount > 0);
  assert.equal(summary.expectations.completedSessionCount, summary.completedSessionCount);
  assert.equal(summary.expectations.setCount, summary.setCount);
  assert.ok(summary.scenarioCoverage.includes("linked_update"));
  assert.ok(summary.scenarioCoverage.includes("recap_artifact"));
  assert.ok(summary.scenarioCoverage.includes("stretch_hidden"));

  const exercises = collectZacLlelExerciseDefinitions(definition);
  assert.ok(exercises.every((exercise) => !exercise.name.startsWith(`${ZAC_LLEL_PREFIX} `)));
});

test("Zac LLEL dry-run reports missing env and reversible safety contract", () => {
  const payload = buildDryRunPayload("seed");

  assert.equal(payload.dryRun, true);
  assert.equal(payload.routineName, ZAC_LLEL_ROUTINE_NAME);
  assert.equal(payload.exerciseInsertCount, 0);
  assert.ok(Array.isArray(payload.requiredEnvMissing));
  assert.ok(payload.safety.some((line) => line.includes("Only rows owned by SOURCE_USER_EMAIL")));
  assert.ok(payload.safety.some((line) => line.includes("canonical global exercise IDs")));
  assert.ok(payload.safety.some((line) => line.includes("Previous active routine")));
});

test("canonical resolver prefers global rows and rejects prefixed exercise names", async () => {
  const client = {
    from(table) {
      assert.equal(table, "exercises");
      return {
        select() { return this; },
        eq() { return this; },
        range() {
          return Promise.resolve({
            data: [
              { id: "global-treadmill", name: "Treadmill Run", slug: "treadmill-run", is_global: true, user_id: null },
              { id: "user-treadmill", name: "Treadmill Run", slug: "treadmill-run", is_global: false, user_id: "user" },
            ],
            error: null,
          });
        },
      };
    },
  };

  const result = await resolveCanonicalExercises(client, [{ name: "Treadmill Run", canonicalSlug: "treadmill-run" }]);
  assert.equal(result.mapping.get("Treadmill Run").id, "global-treadmill");

  await assert.rejects(
    () => resolveCanonicalExercises(client, [{ name: `${ZAC_LLEL_PREFIX} Treadmill Run` }]),
    /refuses prefixed exercise names/,
  );
});

test("canonical resolver fails loudly when a global exercise is missing", async () => {
  const client = {
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        range() { return Promise.resolve({ data: [], error: null }); },
      };
    },
  };

  await assert.rejects(
    () => resolveCanonicalExercises(client, [{ name: "Missing Exercise" }]),
    /Missing canonical global exercises: Missing Exercise/,
  );
});
