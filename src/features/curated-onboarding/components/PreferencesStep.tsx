import { AuthField } from "@/components/auth/AuthShell";
import { Input } from "@/components/ui/Input";
import { CARDIO_PREFERENCE_OPTIONS, PREFERRED_STYLE_OPTIONS } from "../constants.ts";
import { formatCuratedListInput, parseCuratedListInput } from "../schema.ts";
import type { CardioPreference, CuratedOnboardingData, PreferredStyle } from "../types.ts";

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
    <div className="space-y-5">
      <div className="space-y-3">
        {PREFERRED_STYLE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onStyleChange(option.value)}
            className={`rounded-[1.2rem] border px-4 py-4 text-left transition-colors motion-reduce:transition-none ${
              data.preferredStyle === option.value
                ? "border-emerald-300/40 bg-emerald-400/[0.12]"
                : "border-white/10 bg-white/[0.03] hover:border-white/20"
            }`}
          >
            <p className="text-sm font-semibold text-white">{option.label}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{option.description}</p>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {CARDIO_PREFERENCE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onCardioChange(option.value)}
            className={`rounded-[1.2rem] border px-4 py-4 text-left transition-colors motion-reduce:transition-none ${
              data.cardioPreference === option.value
                ? "border-emerald-300/40 bg-emerald-400/[0.12]"
                : "border-white/10 bg-white/[0.03] hover:border-white/20"
            }`}
          >
            <p className="text-sm font-semibold text-white">{option.label}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{option.description}</p>
          </button>
        ))}
      </div>

      <AuthField label="Exercises you already like">
        <Input
          value={formatCuratedListInput(data.exerciseLikes)}
          onChange={(event) => onLikesChange(parseCuratedListInput(event.target.value))}
          placeholder="Bench press, lunges, incline walk"
          className="h-14 rounded-[1.15rem] border-white/10 bg-black/20 text-white placeholder:text-slate-500"
        />
      </AuthField>
    </div>
  );
}
