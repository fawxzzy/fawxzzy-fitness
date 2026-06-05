"use client";

import { ProgressionPlaybookEditor } from "@/components/routines/ProgressionPlaybookEditor";
import type { FitnessDistanceUnit } from "@/lib/fitness-distance-units";
import type { ProgressionPlaybookFormState } from "@/lib/progression-playbook-form-state";
import type { ProgressionStepPolicy } from "@/lib/progression-step-policy";
import type { PromotionStepFieldId } from "@/lib/session-progression-display";

export function CurrentSessionProgressionSurface({
  draft,
  onChange,
  weightUnit,
  distanceUnit,
  progressionStepPolicy,
  visiblePromotionStepFields,
}: {
  draft: ProgressionPlaybookFormState;
  onChange: (nextValue: ProgressionPlaybookFormState) => void;
  weightUnit: "lbs" | "kg";
  distanceUnit: FitnessDistanceUnit;
  progressionStepPolicy?: ProgressionStepPolicy | null;
  visiblePromotionStepFields?: PromotionStepFieldId[] | null;
}) {
  return (
    <ProgressionPlaybookEditor
      value={draft}
      onChange={onChange}
      weightUnit={weightUnit}
      distanceUnit={distanceUnit}
      title=""
      context="exercise"
      collapsible={false}
      separateInfoBox
      separateInfoReserveLayoutSpace={false}
      dropdownPreset="current-session"
      progressionStepPolicy={progressionStepPolicy}
      visiblePromotionStepFields={visiblePromotionStepFields ?? null}
    />
  );
}
