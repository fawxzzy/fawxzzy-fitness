import test from "node:test";
import assert from "node:assert/strict";

import { settleSessionFollowUpHandlers } from "./session-follow-up-jobs.ts";

test("settleSessionFollowUpHandlers marks failures without throwing away successful work", async () => {
  const results = await settleSessionFollowUpHandlers({
    exercise_stats: async () => {
      // no-op
    },
    fitness_integrations: async () => {
      throw new Error("integration down");
    },
  });

  assert.equal(results.length, 2);
  assert.equal(results.find((result) => result.kind === "exercise_stats")?.ok, true);
  assert.equal(results.find((result) => result.kind === "fitness_integrations")?.ok, false);
  assert.equal(results.find((result) => result.kind === "fitness_integrations")?.error, "integration down");
});

test("settleSessionFollowUpHandlers only runs the claimed job kinds", async () => {
  const results = await settleSessionFollowUpHandlers({
    exercise_stats: async () => {
      // no-op
    },
  });

  assert.deepEqual(results, [
    {
      kind: "exercise_stats",
      ok: true,
      error: null,
    },
  ]);
});
