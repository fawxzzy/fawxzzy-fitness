import type { DeterministicSignalFixture } from "../../contract-types";
import type { FitnessSignalType } from "../../fitness-integration-contract";

export const weeklyGoalHitFixture: DeterministicSignalFixture<FitnessSignalType> = {
  fixtureId: "fitness-signal-weekly-goal-hit-v1",
  emittedAt: "2026-03-22T18:00:00.000Z",
  appId: "fitness",
  signalType: "weekly_goal_hit",
  routing: {
    target: "playbook",
    channel: "fitness.goal.events",
    priority: "normal",
    maxDeliveryLatencySeconds: 120,
  },
  payload: {
    memberId: "member_1001",
    weekStartDate: "2026-03-16",
    workoutsPlanned: 4,
    workoutsCompleted: 4,
    achievedAt: "2026-03-22T17:59:45.000Z",
  },
};
