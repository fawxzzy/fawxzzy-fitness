import type { DeterministicSignalFixture } from "../../contract-types";
import type { FitnessSignalType } from "../../fitness-integration-contract";

export const pilotSupportComplaintOpenedFixture: DeterministicSignalFixture<FitnessSignalType> = {
  fixtureId: "fitness-signal-pilot-support-complaint-opened-v1",
  emittedAt: "2026-04-19T10:06:00.000Z",
  appId: "fitness",
  signalType: "pilot_support_complaint_opened",
  routing: {
    target: "playbook",
    channel: "fitness.growth.feedback.events",
    priority: "high",
    maxDeliveryLatencySeconds: 300,
  },
  payload: {
    memberId: "member_1003",
    sourceOutboundId: "out-recovery-warning-1003",
    placementId: "recovery_reset_shadow_placement",
    complaintCode: "support_ticket_opened",
    openedAt: "2026-04-19T10:06:00.000Z",
  },
};
