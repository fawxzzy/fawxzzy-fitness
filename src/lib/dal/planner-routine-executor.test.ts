import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  executePlannerRoutinePersistenceV1,
  PLANNER_ROUTINE_EXECUTOR_VERSION,
  type ExecutePlannerRoutinePersistenceArgsV1,
} from "./planner-routine-executor";
import * as executorModule from "./planner-routine-executor";

test("production executor exposes only its one-argument repository-owned boundary", () => {
  assert.equal(PLANNER_ROUTINE_EXECUTOR_VERSION,
    "fitness.planner-routine-executor.2026-07-30.v1");
  assert.equal(executePlannerRoutinePersistenceV1.length, 1);
  assert.deepEqual(Object.keys(executorModule).sort(), [
    "PLANNER_ROUTINE_EXECUTOR_VERSION",
    "executePlannerRoutinePersistenceV1",
  ]);
});

test("callers cannot type-check an authentication or privileged-client substitution", () => {
  const args = null as unknown as ExecutePlannerRoutinePersistenceArgsV1;
  const callerSelectedDependencies = {
    async requireAuthenticatedUser() {
      return { id: "fabricated-owner" };
    },
    async createServerProviderClient() {
      throw new Error("caller-selected privileged client must stay unreachable");
    },
  };

  if (false) {
    void executePlannerRoutinePersistenceV1(
      args,
      // @ts-expect-error The production executor intentionally accepts one argument.
      callerSelectedDependencies,
    );
  }

  assert.equal(executePlannerRoutinePersistenceV1.length, 1);
});

test("executor source fixes repository auth and provider dependencies internally", () => {
  const source = readFileSync(
    new URL("./planner-routine-executor.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /^import "server-only";/);
  assert.match(source, /await import\("@\/lib\/auth"\)/);
  assert.match(source, /await import\("@\/lib\/supabase\/admin"\)/);
  assert.match(
    source,
    /executePlannerRoutinePersistenceWithDependenciesV1\(\s*args,\s*DEFAULT_DEPENDENCIES,\s*\)/,
  );
  assert.doesNotMatch(
    source,
    /export\s+(?:type|interface|const|function|async function)\s+PlannerRoutineExecutorDependenciesV1/,
  );
  assert.doesNotMatch(
    source,
    /export\s+(?:async\s+)?function\s+executePlannerRoutinePersistenceWithDependenciesV1/,
  );
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
