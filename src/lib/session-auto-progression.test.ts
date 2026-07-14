import assert from "node:assert/strict";
import test from "node:test";
import { shouldApplyAutomaticSessionPromotion } from "@/lib/session-auto-progression";

test("automatic session promotion requires opt-in and the exact completed source session", () => {
  assert.equal(shouldApplyAutomaticSessionPromotion({
    candidateType: "promote",
    autoUpdateRoutineGoals: true,
    sourceSessionId: "session-1",
    completedSessionId: "session-1",
  }), true);
  assert.equal(shouldApplyAutomaticSessionPromotion({
    candidateType: "promote",
    autoUpdateRoutineGoals: false,
    sourceSessionId: "session-1",
    completedSessionId: "session-1",
  }), false);
  assert.equal(shouldApplyAutomaticSessionPromotion({
    candidateType: "promote",
    autoUpdateRoutineGoals: true,
    sourceSessionId: "session-older",
    completedSessionId: "session-1",
  }), false);
  assert.equal(shouldApplyAutomaticSessionPromotion({
    candidateType: "promote",
    autoUpdateRoutineGoals: true,
    sourceSessionId: null,
    completedSessionId: "session-1",
  }), false);
  assert.equal(shouldApplyAutomaticSessionPromotion({
    candidateType: "review",
    autoUpdateRoutineGoals: true,
    sourceSessionId: "session-1",
    completedSessionId: "session-1",
  }), false);
  assert.equal(shouldApplyAutomaticSessionPromotion({
    candidateType: "deload",
    autoUpdateRoutineGoals: true,
    sourceSessionId: "session-1",
    completedSessionId: "session-1",
  }), false);
});
