import { LabeledEditorField, labeledEditorFieldControlClassName } from "@/components/ui/LabeledEditorField";
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
    <div className="space-y-3">
      <LabeledEditorField label="Injuries or limitations">
        <textarea
          rows={3}
          value={data.limitations ?? ""}
          onChange={(event) => onLimitationsChange(event.target.value)}
          placeholder="Shoulder irritation overhead, low-back fatigue, limited space..."
          className={`${labeledEditorFieldControlClassName} min-h-24 resize-y px-4 py-3 text-center`}
        />
      </LabeledEditorField>

      <LabeledEditorField label="Exercises to avoid">
        <input
          value={formatCuratedListInput(data.exerciseDislikes)}
          onChange={(event) => onDislikesChange(parseCuratedListInput(event.target.value))}
          placeholder="Burpees, upright rows, long treadmill blocks"
          className={`${labeledEditorFieldControlClassName} h-12 px-4 py-3 text-center`}
        />
      </LabeledEditorField>

      <LabeledEditorField label="Optional target areas">
        <input
          value={formatCuratedListInput(data.targetAreas)}
          onChange={(event) => onTargetAreasChange(parseCuratedListInput(event.target.value))}
          placeholder="Glutes, upper back, conditioning"
          className={`${labeledEditorFieldControlClassName} h-12 px-4 py-3 text-center`}
        />
      </LabeledEditorField>
    </div>
  );
}
