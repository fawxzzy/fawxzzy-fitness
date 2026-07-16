import { LabeledEditorField, labeledEditorFieldControlClassName } from "@/components/ui/LabeledEditorField";
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
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--accent)/0.94)]">Training style</p>
        {PREFERRED_STYLE_OPTIONS.map((option) => (
          <CuratedOptionCard
            key={option.value}
            onClick={() => onStyleChange(option.value)}
            selected={data.preferredStyle === option.value}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{option.label}</p>
              <p className="mt-0.5 text-xs leading-5 text-[rgb(var(--text-muted)/0.92)]">{option.description}</p>
            </div>
          </CuratedOptionCard>
        ))}
      </div>

      <div className="space-y-2">
        <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--accent)/0.94)]">Cardio</p>
        {CARDIO_PREFERENCE_OPTIONS.map((option) => (
          <CuratedOptionCard
            key={option.value}
            onClick={() => onCardioChange(option.value)}
            selected={data.cardioPreference === option.value}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{option.label}</p>
              <p className="mt-0.5 text-xs leading-5 text-[rgb(var(--text-muted)/0.92)]">{option.description}</p>
            </div>
          </CuratedOptionCard>
        ))}
      </div>

      <LabeledEditorField label="Exercises you like">
        <input
          value={formatCuratedListInput(data.exerciseLikes)}
          onChange={(event) => onLikesChange(parseCuratedListInput(event.target.value))}
          placeholder="Bench press, lunges, incline walk"
          className={`${labeledEditorFieldControlClassName} h-12 px-4 py-3 text-center`}
        />
      </LabeledEditorField>
    </div>
  );
}
