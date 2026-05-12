import type { DeterministicSignalFixture } from "../../contract-types";
import type { FitnessSignalType } from "../../fitness-integration-contract";

export const pilotPlacementDismissedFixture: DeterministicSignalFixture<FitnessSignalType> = {
  fixtureId: "fitness-signal-pilot-placement-dismissed-v1",
  emittedAt: "2026-04-19T10:04:00.000Z",
  appId: "fitness",
  signalType: "pilot_placement_dismissed",
  routing: {
    target: "playbook",
    channel: "fitness.growth.feedback.events",
    priority: "normal",
    maxDeliveryLatencySeconds: 120,
  },
  payload: {
    memberId: "member_1002",
    sourceOutboundId: "out-recovery-warning-1002",
    placementId: "recovery_reset_shadow_placement",
    dismissalReasonCode: "not_relevant",
    dismissedAt: "2026-04-19T10:04:00.000Z",
  },
};
