import type { DeterministicSignalFixture } from "../../contract-types.ts";
import type { FitnessSignalType } from "../../fitness-integration-contract.ts";

export const streakBrokenFixture: DeterministicSignalFixture<FitnessSignalType> = {
  fixtureId: "fitness-signal-streak-broken-v1",
  emittedAt: "2026-03-27T07:00:00.000Z",
  appId: "fitness",
  signalType: "streak_broken",
  routing: {
    target: "playbook",
    channel: "fitness.streak.events",
    priority: "high",
    maxDeliveryLatencySeconds: 60,
  },
  payload: {
    memberId: "member_1001",
    streakDaysBeforeBreak: 19,
    breakDate: "2026-03-27",
    lastCompletedWorkoutAt: "2026-03-25T06:14:38.000Z",
    breakReasonCode: "missed_planned_session",
  },
};
