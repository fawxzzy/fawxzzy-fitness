import type { DeterministicStateSnapshotFixture } from "../../contract-types";
import type { FitnessStateSnapshotType } from "../../fitness-integration-contract";

import { athleteReadinessStateFixture } from "./athlete-readiness-state.fixture";
import { streakHealthStateFixture } from "./streak-health-state.fixture";
import { weeklyProgressStateFixture } from "./weekly-progress-state.fixture";

export const fitnessStateSnapshotFixtures: readonly DeterministicStateSnapshotFixture<FitnessStateSnapshotType>[] = [
  athleteReadinessStateFixture,
  weeklyProgressStateFixture,
  streakHealthStateFixture,
];
