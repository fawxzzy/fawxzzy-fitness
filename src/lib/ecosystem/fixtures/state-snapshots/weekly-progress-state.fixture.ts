import type { DeterministicStateSnapshotFixture } from "../../contract-types.ts";
import type { FitnessStateSnapshotType } from "../../fitness-integration-contract.ts";

export const weeklyProgressStateFixture: DeterministicStateSnapshotFixture<FitnessStateSnapshotType> = {
  fixtureId: "fitness-state-weekly-progress-v1",
  capturedAt: "2026-03-26T07:00:00.000Z",
  appId: "fitness",
  snapshotType: "weekly_progress_state",
  snapshot: {
    memberId: "member_1001",
    weekStartDate: "2026-03-23",
    plannedWorkoutCount: 4,
    completedWorkoutCount: 2,
    capturedAt: "2026-03-26T07:00:00.000Z",
  },
};
