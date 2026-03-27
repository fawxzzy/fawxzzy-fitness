import type { DeterministicSignalFixture } from "../../contract-types";
import type { FitnessSignalType } from "../../fitness-integration-contract";

export const workoutMissedFixture: DeterministicSignalFixture<FitnessSignalType> = {
  fixtureId: "fitness-signal-workout-missed-v1",
  emittedAt: "2026-03-25T06:30:00.000Z",
  appId: "fitness",
  signalType: "workout_missed",
  routing: {
    target: "playbook",
    channel: "fitness.session.events",
    priority: "high",
    maxDeliveryLatencySeconds: 60,
  },
  payload: {
    memberId: "member_1001",
    sessionId: "session_9802",
    scheduledAt: "2026-03-25T06:00:00.000Z",
    missReasonCode: "no_check_in",
    consecutiveMisses: 1,
  },
};
