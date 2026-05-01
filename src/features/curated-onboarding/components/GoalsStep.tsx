import { appTokens } from "@/components/ui/app/tokens";
import { TRAINING_GOAL_OPTIONS } from "../constants.ts";
import type { CuratedOnboardingData, TrainingGoal } from "../types.ts";
import { CuratedOptionCard } from "./CuratedOnboardingPrimitives";

export function GoalsStep({
  data,
  onChange,
}: {
  data: CuratedOnboardingData;
  onChange: (value: TrainingGoal) => void;
}) {
  return (
    <div className={appTokens.curatedOptionGrid}>
      {TRAINING_GOAL_OPTIONS.map((option) => (
        <CuratedOptionCard
          key={option.value}
          onClick={() => onChange(option.value)}
          selected={data.trainingGoal === option.value}
        >
          <div className={appTokens.curatedOptionHeaderRow}>
            <div>
              <p className={appTokens.curatedCardTitle}>{option.label}</p>
              <p className={appTokens.curatedCardBody}>{option.description}</p>
            </div>
            <span className={appTokens.curatedPill}>
              Goal
            </span>
          </div>
        </CuratedOptionCard>
      ))}
    </div>
  );
}
