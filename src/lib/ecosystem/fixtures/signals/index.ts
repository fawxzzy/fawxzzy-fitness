import type { DeterministicSignalFixture } from "../../contract-types";
import type { FitnessSignalType } from "../../fitness-integration-contract";

import { recoveryWarningFixture } from "./recovery-warning.fixture";
import { streakBrokenFixture } from "./streak-broken.fixture";
import { weeklyGoalHitFixture } from "./weekly-goal-hit.fixture";
import { workoutCompletedFixture } from "./workout-completed.fixture";
import { workoutMissedFixture } from "./workout-missed.fixture";

export const fitnessSignalFixtures: readonly DeterministicSignalFixture<FitnessSignalType>[] = [
  workoutCompletedFixture,
  workoutMissedFixture,
  recoveryWarningFixture,
  weeklyGoalHitFixture,
  streakBrokenFixture,
];
