import { EXPERIENCE_LEVEL_OPTIONS } from "../constants.ts";
import type { CuratedOnboardingData, ExperienceLevel } from "../types.ts";
import { CuratedOptionCard } from "./CuratedOnboardingPrimitives";

export function ExperienceStep({
  data,
  onChange,
}: {
  data: CuratedOnboardingData;
  onChange: (value: ExperienceLevel) => void;
}) {
  return (
    <div className="grid gap-2">
      {EXPERIENCE_LEVEL_OPTIONS.map((option) => (
        <CuratedOptionCard
          key={option.value}
          onClick={() => onChange(option.value)}
          selected={data.experience === option.value}
        >
          <div className="flex w-full items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{option.label}</p>
              <p className="mt-0.5 text-xs leading-5 text-[rgb(var(--text-muted)/0.92)]">{option.description}</p>
            </div>
            {data.experience === option.value ? (
              <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.13em] text-[rgb(var(--accent)/0.96)]">Selected</span>
            ) : null}
          </div>
        </CuratedOptionCard>
      ))}
    </div>
  );
}
