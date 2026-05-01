import assert from "node:assert/strict";
import test from "node:test";

import { loadTodayRecoveryShadowPlacementSafely } from "./recovery-shadow-placement.server.ts";

test("loadTodayRecoveryShadowPlacementSafely returns null when optional placement loading throws", async () => {
  const errors: Array<{ message: string; details: Record<string, unknown> }> = [];

  const result = await loadTodayRecoveryShadowPlacementSafely({
    memberId: "member-shadow-1",
    loadPlacement: async () => {
      throw new Error("shadow placement crashed");
    },
    logError: (message, details) => {
      errors.push({ message, details });
    },
  });

  assert.equal(result, null);
  assert.equal(errors.length, 1);
  assert.equal(errors[0]?.message, "[today] recovery shadow placement failed");
  assert.equal(errors[0]?.details.memberId, "member-shadow-1");
  assert.match(String(errors[0]?.details.error), /shadow placement crashed/);
});
