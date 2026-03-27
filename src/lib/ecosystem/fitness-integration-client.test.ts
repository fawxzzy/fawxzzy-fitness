import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFitnessSnapshotSourceState,
  buildFitnessSnapshots,
  fitnessIntegrationClient,
} from "./fitness-integration-client";

test("buildFitnessSnapshots derives deterministic readiness/streak/weekly values", () => {
  const snapshots = buildFitnessSnapshots({
    memberId: "member-1",
    capturedAt: "2026-03-27T12:00:00.000Z",
    weekStartDate: "2026-03-23",
    plannedWorkoutCount: 4,
    completedWorkoutCount: 3,
    activeStreakDays: 2,
    lastCompletedDate: "2026-03-27",
    consecutiveMisses: 1,
    lastMissedSessionDate: "2026-03-26",
    completedMinutesLast7Days: 150,
    completedMinutesPrevious7Days: 60,
    inProgressSessionId: null,
    inProgressExerciseCount: 0,
  });

  assert.equal(snapshots.weeklyProgress.completedWorkoutCount, 3);
  assert.equal(snapshots.streakHealth.streakAtRisk, true);
  assert.equal(typeof snapshots.athleteReadiness.readinessScore, "number");
});

test("client stores signal, snapshots, and receipt for debug inspection", async () => {
  const source = await buildFitnessSnapshotSourceState({
    memberId: "member-debug",
    now: "2026-03-27T12:00:00.000Z",
    fetcher: {
      async getRoutineDayPlanCountForCurrentWeek() {
        return 4;
      },
      async getCompletedWorkoutCountForCurrentWeek() {
        return 4;
      },
      async getCompletedSessions() {
        return [{ performedAt: "2026-03-26T10:00:00.000Z", durationSeconds: 1800 }];
      },
      async getConsecutiveMisses() {
        return { consecutiveMisses: 0, lastMissedSessionDate: null };
      },
      async getInProgressSessionSummary() {
        return { inProgressSessionId: null, inProgressExerciseCount: 0 };
      },
    },
  });

  const packaged = fitnessIntegrationClient.packageSnapshots({
    memberId: "member-debug",
    source,
    reason: "manual_debug",
  });

  assert.equal(packaged.exported.length, 3);

  const [signal] = fitnessIntegrationClient.evaluateAndPackageSignals({
    source,
    reason: "manual_debug",
  });

  assert.equal(signal?.signalType, "weekly_goal_hit");

  fitnessIntegrationClient.ingestReceipt({
    receiptType: "goal_plan_amended",
    receiptId: "receipt-1",
    actionType: "revise_weekly_goal_plan",
    memberId: "member-debug",
    appliedAt: "2026-03-27T12:00:00.000Z",
    sourceOutboundId: signal?.outboundId ?? "out-missing",
    payload: { newWorkoutTarget: 3 },
  });

  const debugState = fitnessIntegrationClient.getDebugState("member-debug");
  assert.equal(debugState.exportedSnapshots.length >= 3, true);
  assert.equal(debugState.emittedSignals.length >= 1, true);
  assert.equal(debugState.receipts.length, 1);
});
