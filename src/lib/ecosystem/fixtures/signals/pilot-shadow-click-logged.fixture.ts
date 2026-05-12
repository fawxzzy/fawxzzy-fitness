import type { DeterministicSignalFixture } from "../../contract-types";
import type { FitnessSignalType } from "../../fitness-integration-contract";

export const pilotShadowClickLoggedFixture: DeterministicSignalFixture<FitnessSignalType> = {
  fixtureId: "fitness-signal-pilot-shadow-click-logged-v1",
  emittedAt: "2026-04-19T10:02:00.000Z",
  appId: "fitness",
  signalType: "pilot_shadow_click_logged",
  routing: {
    target: "playbook",
    channel: "fitness.growth.shadow.events",
    priority: "high",
    maxDeliveryLatencySeconds: 60,
  },
  payload: {
    memberId: "member_1001",
    sourceOutboundId: "out-recovery-warning-1001",
    placementId: "recovery_reset_shadow_placement",
    destinationPath: "/today",
    cohortId: "fitness_growth_shadow_recovery_reset_v1:treatment_shadow:80",
    clickedAt: "2026-04-19T10:02:00.000Z",
  },
};
