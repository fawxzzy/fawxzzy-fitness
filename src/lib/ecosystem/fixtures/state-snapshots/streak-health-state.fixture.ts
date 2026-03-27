import type { DeterministicStateSnapshotFixture } from "../../contract-types";
import type { FitnessStateSnapshotType } from "../../fitness-integration-contract";

export const streakHealthStateFixture: DeterministicStateSnapshotFixture<FitnessStateSnapshotType> = {
  fixtureId: "fitness-state-streak-health-v1",
  capturedAt: "2026-03-27T07:00:00.000Z",
  appId: "fitness",
  snapshotType: "streak_health_state",
  snapshot: {
    memberId: "member_1001",
    activeStreakDays: 0,
    lastCompletedDate: "2026-03-25",
    streakAtRisk: true,
    capturedAt: "2026-03-27T07:00:00.000Z",
  },
};
