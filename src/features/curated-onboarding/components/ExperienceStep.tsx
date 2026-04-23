import { appTokens } from "@/components/ui/app/tokens";
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
    <div className={appTokens.curatedOptionGrid}>
      {EXPERIENCE_LEVEL_OPTIONS.map((option) => (
        <CuratedOptionCard
          key={option.value}
          onClick={() => onChange(option.value)}
          selected={data.experience === option.value}
        >
          <p className={appTokens.curatedCardTitle}>{option.label}</p>
          <p className={appTokens.curatedCardBody}>{option.description}</p>
        </CuratedOptionCard>
      ))}
    </div>
  );
}
