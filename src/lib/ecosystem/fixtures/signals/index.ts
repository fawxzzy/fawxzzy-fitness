import type { DeterministicSignalFixture } from "../../contract-types.ts";
import type { FitnessSignalType } from "../../fitness-integration-contract.ts";

import { recoveryWarningFixture } from "./recovery-warning.fixture.ts";
import { pilotActivationRetainedFixture } from "./pilot-activation-retained.fixture.ts";
import { pilotPlacementDismissedFixture } from "./pilot-placement-dismissed.fixture.ts";
import { pilotShadowClickLoggedFixture } from "./pilot-shadow-click-logged.fixture.ts";
import { pilotShadowImpressionLoggedFixture } from "./pilot-shadow-impression-logged.fixture.ts";
import { pilotSupportComplaintOpenedFixture } from "./pilot-support-complaint-opened.fixture.ts";
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
  pilotShadowImpressionLoggedFixture,
  pilotShadowClickLoggedFixture,
  pilotPlacementDismissedFixture,
  pilotSupportComplaintOpenedFixture,
  pilotActivationRetainedFixture,
];
