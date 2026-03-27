import type { DeterministicSignalFixture } from "../../contract-types.ts";
import type { FitnessSignalType } from "../../fitness-integration-contract.ts";

import { recoveryWarningFixture } from "./recovery-warning.fixture.ts";
import { streakBrokenFixture } from "./streak-broken.fixture.ts";
import { weeklyGoalHitFixture } from "./weekly-goal-hit.fixture.ts";
import { workoutCompletedFixture } from "./workout-completed.fixture.ts";
import { workoutMissedFixture } from "./workout-missed.fixture.ts";

export const fitnessSignalFixtures: readonly DeterministicSignalFixture<FitnessSignalType>[] = [
  workoutCompletedFixture,
  workoutMissedFixture,
  recoveryWarningFixture,
  weeklyGoalHitFixture,
  streakBrokenFixture,
];
