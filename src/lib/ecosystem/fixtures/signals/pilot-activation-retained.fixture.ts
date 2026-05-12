import type { DeterministicSignalFixture } from "../../contract-types";
import type { FitnessSignalType } from "../../fitness-integration-contract";

export const pilotActivationRetainedFixture: DeterministicSignalFixture<FitnessSignalType> = {
  fixtureId: "fitness-signal-pilot-activation-retained-v1",
  emittedAt: "2026-04-26T10:08:00.000Z",
  appId: "fitness",
  signalType: "pilot_activation_retained",
  routing: {
    target: "playbook",
    channel: "fitness.growth.retention.events",
    priority: "normal",
    maxDeliveryLatencySeconds: 300,
  },
  payload: {
    memberId: "member_1001",
    sourceOutboundId: "out-recovery-warning-1001",
    placementId: "recovery_reset_shadow_placement",
    retentionWindowDays: 7,
    retainedAt: "2026-04-26T10:08:00.000Z",
  },
};
