import { EXPERIENCE_LEVEL_OPTIONS } from "../constants.ts";
import type { CuratedOnboardingData, ExperienceLevel } from "../types.ts";

export function ExperienceStep({
  data,
  onChange,
}: {
  data: CuratedOnboardingData;
  onChange: (value: ExperienceLevel) => void;
}) {
  return (
    <div className="grid gap-3">
      {EXPERIENCE_LEVEL_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-[1.2rem] border px-4 py-4 text-left transition-colors motion-reduce:transition-none ${
            data.experience === option.value
              ? "border-emerald-300/40 bg-emerald-400/[0.12]"
              : "border-white/10 bg-white/[0.03] hover:border-white/20"
          }`}
        >
          <p className="text-sm font-semibold text-white">{option.label}</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">{option.description}</p>
        </button>
      ))}
    </div>
  );
}
