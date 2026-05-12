import type { DeterministicStateSnapshotFixture } from "../../contract-types.ts";
import type { FitnessStateSnapshotType } from "../../fitness-integration-contract.ts";

import { athleteReadinessStateFixture } from "./athlete-readiness-state.fixture.ts";
import { streakHealthStateFixture } from "./streak-health-state.fixture.ts";
import { weeklyProgressStateFixture } from "./weekly-progress-state.fixture.ts";

export const fitnessStateSnapshotFixtures: readonly DeterministicStateSnapshotFixture<FitnessStateSnapshotType>[] = [
  athleteReadinessStateFixture,
  weeklyProgressStateFixture,
  streakHealthStateFixture,
];
