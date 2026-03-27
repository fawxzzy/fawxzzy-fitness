import type { DeterministicSignalFixture } from "../../contract-types.ts";
import type { FitnessSignalType } from "../../fitness-integration-contract.ts";

export const workoutCompletedFixture: DeterministicSignalFixture<FitnessSignalType> = {
  fixtureId: "fitness-signal-workout-completed-v1",
  emittedAt: "2026-03-24T06:15:00.000Z",
  appId: "fitness",
  signalType: "workout_completed",
  routing: {
    target: "playbook",
    channel: "fitness.session.events",
    priority: "normal",
    maxDeliveryLatencySeconds: 60,
  },
  payload: {
    memberId: "member_1001",
    sessionId: "session_9801",
    completedAt: "2026-03-24T06:14:38.000Z",
    durationMinutes: 47,
    completionRate: 1,
  },
};
