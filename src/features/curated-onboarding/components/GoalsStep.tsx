import { TRAINING_GOAL_OPTIONS } from "../constants.ts";
import type { CuratedOnboardingData, TrainingGoal } from "../types.ts";

export function GoalsStep({
  data,
  onChange,
}: {
  data: CuratedOnboardingData;
  onChange: (value: TrainingGoal) => void;
}) {
  return (
    <div className="grid gap-3">
      {TRAINING_GOAL_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-[1.2rem] border px-4 py-4 text-left transition-colors motion-reduce:transition-none ${
            data.trainingGoal === option.value
              ? "border-emerald-300/40 bg-emerald-400/[0.12]"
              : "border-white/10 bg-white/[0.03] hover:border-white/20"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">{option.label}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{option.description}</p>
            </div>
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200">
              Goal
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
