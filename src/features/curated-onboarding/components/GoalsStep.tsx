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
    <div className="grid gap-2">
      {TRAINING_GOAL_OPTIONS.map((option) => (
        <CuratedOptionCard
          key={option.value}
          onClick={() => onChange(option.value)}
          selected={data.trainingGoal === option.value}
        >
          <div className="flex w-full items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{option.label}</p>
              <p className="mt-0.5 text-xs leading-5 text-[rgb(var(--text-muted)/0.92)]">{option.description}</p>
            </div>
            {data.trainingGoal === option.value ? (
              <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.13em] text-[rgb(var(--accent)/0.96)]">Selected</span>
            ) : null}
          </div>
        </CuratedOptionCard>
      ))}
    </div>
  );
}
