import type { DeterministicSignalFixture } from "../../contract-types";
import type { FitnessSignalType } from "../../fitness-integration-contract";

export const recoveryWarningFixture: DeterministicSignalFixture<FitnessSignalType> = {
  fixtureId: "fitness-signal-recovery-warning-v1",
  emittedAt: "2026-03-26T05:45:00.000Z",
  appId: "fitness",
  signalType: "recovery_warning",
  routing: {
    target: "playbook",
    channel: "fitness.recovery.events",
    priority: "high",
    maxDeliveryLatencySeconds: 30,
  },
  payload: {
    memberId: "member_1001",
    readinessScore: 42,
    fatigueScore: 81,
    warningLevel: "critical",
    observedAt: "2026-03-26T05:44:50.000Z",
  },
};
