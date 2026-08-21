import assert from "node:assert/strict";
import test from "node:test";
import { buildProgressionHistorySessions, deriveProgressionReviewCandidate } from "@/lib/progression-playbooks";
import { shouldApplyAutomaticSessionPromotion } from "@/lib/session-auto-progression";

test("automatic session promotion uses the owning sessions.id rather than the session exercise id", () => {
  const history = buildProgressionHistorySessions({
    rows: [
      {
        sessionId: "session-exercise-1",
        sessionRecordId: "session-1",
        performedAt: "2026-07-16T12:00:00.000Z",
        setIndex: 1,
        weight: 225,
        reps: 5,
        weightUnit: "lbs",
        isWarmup: false,
      },
    ],
    targetSetCount: 1,
    topRepTarget: 5,
  });

  assert.equal(history[0]?.sessionId, "session-exercise-1");
  assert.equal(history[0]?.sessionRecordId, "session-1");
  const candidate = deriveProgressionReviewCandidate({
    playbookId: "double_progression",
    config: { version: 1, loadIncrement: 5, autoUpdateRoutineGoals: true },
    plan: {
      measurementType: "reps",
      setsMin: 1,
      setsMax: 1,
      repsMin: 5,
      repsMax: 5,
      weightMin: 225,
      weightMax: 225,
      weightUnit: "lbs",
      durationSeconds: null,
      distance: null,
      distanceUnit: null,
      calories: null,
    },
    history,
    fallbackWeightUnit: "lbs",
  });
  const shouldApply = shouldApplyAutomaticSessionPromotion({
    candidateType: candidate.type,
    autoUpdateRoutineGoals: true,
    sourceSessionRecordId: candidate.sourceSession?.sessionRecordId,
    completedSessionId: "session-1",
  });
  let routineGoal = 225;
  if (shouldApply) {
    routineGoal = candidate.proposedTarget?.weightMax ?? routineGoal;
  }

  assert.equal(candidate.sourceSession?.sessionId, "session-1");
  assert.equal(candidate.sourceSession?.sessionRecordId, "session-1");
  assert.equal(shouldApply, true);
  assert.equal(routineGoal, 230);
});

test("automatic session promotion requires opt-in and the exact completed source session", () => {
  assert.equal(shouldApplyAutomaticSessionPromotion({
    candidateType: "promote",
    autoUpdateRoutineGoals: false,
    sourceSessionRecordId: "session-1",
    completedSessionId: "session-1",
  }), false);
  assert.equal(shouldApplyAutomaticSessionPromotion({
    candidateType: "promote",
    autoUpdateRoutineGoals: true,
    sourceSessionRecordId: "session-older",
    completedSessionId: "session-1",
  }), false);
  assert.equal(shouldApplyAutomaticSessionPromotion({
    candidateType: "promote",
    autoUpdateRoutineGoals: true,
    sourceSessionRecordId: null,
    completedSessionId: "session-1",
  }), false);
  assert.equal(shouldApplyAutomaticSessionPromotion({
    candidateType: "review",
    autoUpdateRoutineGoals: true,
    sourceSessionRecordId: "session-1",
    completedSessionId: "session-1",
  }), false);
  assert.equal(shouldApplyAutomaticSessionPromotion({
    candidateType: "deload",
    autoUpdateRoutineGoals: true,
    sourceSessionRecordId: "session-1",
    completedSessionId: "session-1",
  }), false);
});
