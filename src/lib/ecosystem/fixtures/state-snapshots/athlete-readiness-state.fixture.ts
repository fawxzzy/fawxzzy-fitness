import type { DeterministicStateSnapshotFixture } from "../../contract-types.ts";
import type { FitnessStateSnapshotType } from "../../fitness-integration-contract.ts";

export const athleteReadinessStateFixture: DeterministicStateSnapshotFixture<FitnessStateSnapshotType> = {
  fixtureId: "fitness-state-athlete-readiness-v1",
  capturedAt: "2026-03-26T05:45:00.000Z",
  appId: "fitness",
  snapshotType: "athlete_readiness_state",
  snapshot: {
    memberId: "member_1001",
    readinessScore: 42,
    fatigueScore: 81,
    capturedAt: "2026-03-26T05:45:00.000Z",
  },
};
