import { AuthField } from "@/components/auth/AuthShell";
import { appTokens } from "@/components/ui/app/tokens";
import { Input } from "@/components/ui/Input";
import { formatCuratedListInput, parseCuratedListInput } from "../schema.ts";
import type { CuratedOnboardingData } from "../types.ts";

export function ConstraintsStep({
  data,
  onLimitationsChange,
  onDislikesChange,
  onTargetAreasChange,
}: {
  data: CuratedOnboardingData;
  onLimitationsChange: (value: string) => void;
  onDislikesChange: (value: string[]) => void;
  onTargetAreasChange: (value: string[]) => void;
}) {
  return (
    <div className={appTokens.curatedOuterStack}>
      <AuthField label="Injuries or limitations">
        <textarea
          rows={4}
          value={data.limitations ?? ""}
          onChange={(event) => onLimitationsChange(event.target.value)}
          placeholder="Shoulder irritation overhead, low-back fatigue, limited space..."
          className={appTokens.curatedTextarea}
        />
      </AuthField>

      <AuthField label="Exercises to avoid">
        <Input
          value={formatCuratedListInput(data.exerciseDislikes)}
          onChange={(event) => onDislikesChange(parseCuratedListInput(event.target.value))}
          placeholder="Burpees, upright rows, long treadmill blocks"
          className={appTokens.curatedInput}
        />
      </AuthField>

      <AuthField label="Optional target areas">
        <Input
          value={formatCuratedListInput(data.targetAreas)}
          onChange={(event) => onTargetAreasChange(parseCuratedListInput(event.target.value))}
          placeholder="Glutes, upper back, conditioning"
          className={appTokens.curatedInput}
        />
      </AuthField>
    </div>
  );
}
