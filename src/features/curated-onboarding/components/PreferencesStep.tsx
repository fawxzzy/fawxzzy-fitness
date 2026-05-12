import { AuthField } from "@/components/auth/AuthShell";
import { appTokens } from "@/components/ui/app/tokens";
import { Input } from "@/components/ui/Input";
import { CARDIO_PREFERENCE_OPTIONS, PREFERRED_STYLE_OPTIONS } from "../constants.ts";
import { formatCuratedListInput, parseCuratedListInput } from "../schema.ts";
import type { CardioPreference, CuratedOnboardingData, PreferredStyle } from "../types.ts";
import { CuratedOptionCard } from "./CuratedOnboardingPrimitives";

export function PreferencesStep({
  data,
  onStyleChange,
  onCardioChange,
  onLikesChange,
}: {
  data: CuratedOnboardingData;
  onStyleChange: (value: PreferredStyle) => void;
  onCardioChange: (value: CardioPreference) => void;
  onLikesChange: (value: string[]) => void;
}) {
  return (
    <div className={appTokens.curatedLooseStack}>
      <div className={appTokens.curatedCompactStack}>
        {PREFERRED_STYLE_OPTIONS.map((option) => (
          <CuratedOptionCard
            key={option.value}
            onClick={() => onStyleChange(option.value)}
            selected={data.preferredStyle === option.value}
          >
            <p className={appTokens.curatedCardTitle}>{option.label}</p>
            <p className={appTokens.curatedCardBody}>{option.description}</p>
          </CuratedOptionCard>
        ))}
      </div>

      <div className={appTokens.curatedCompactStack}>
        {CARDIO_PREFERENCE_OPTIONS.map((option) => (
          <CuratedOptionCard
            key={option.value}
            onClick={() => onCardioChange(option.value)}
            selected={data.cardioPreference === option.value}
          >
            <p className={appTokens.curatedCardTitle}>{option.label}</p>
            <p className={appTokens.curatedCardBody}>{option.description}</p>
          </CuratedOptionCard>
        ))}
      </div>

      <AuthField label="Exercises you already like">
        <Input
          value={formatCuratedListInput(data.exerciseLikes)}
          onChange={(event) => onLikesChange(parseCuratedListInput(event.target.value))}
          placeholder="Bench press, lunges, incline walk"
          className={appTokens.curatedInput}
        />
      </AuthField>
    </div>
  );
}
