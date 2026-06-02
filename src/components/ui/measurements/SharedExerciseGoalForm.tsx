"use client";

import { useMemo, type ReactNode } from "react";
import { ExerciseGoalForm, type ExerciseGoalFormState, type RoutineEditorInfoPayload } from "@/components/ui/measurements/ExerciseGoalForm";
import { deriveGoalMeasurementSelections, type GoalModality } from "@/lib/exercise-goal-validation";
import type { MeasurementMetrics } from "@/components/ui/measurements/ModifyMeasurements";

export function inferGoalModeFromState(state: ExerciseGoalFormState): GoalModality {
  const selections = deriveGoalMeasurementSelections("cardio_time_distance", {
    repsMin: state.repsMin,
    repsMax: state.repsMax,
    failure: state.failure,
    weight: state.weight,
    duration: state.duration,
    distance: state.distance,
    calories: state.calories,
  });
  const hasTime = selections.includes("time");
  const hasDistance = selections.includes("distance");
  if (hasTime && hasDistance) return "cardio_time_distance";
  if (hasDistance) return "cardio_distance";
  if (hasTime) return "cardio_time";
  return "cardio_time_distance";
}

export function SharedExerciseGoalForm({
  modality,
  state,
  onStateChange,
  names,
  includeSetsInSummary,
  emptySummaryLabel,
  showValidationMessage,
  hideEmptySummary,
  hideSummary,
  betweenInputsAndFooterContent,
  footerContent,
  footerClassName,
  visibleMetrics,
  visibleMetricOrder,
  measurementLayoutMode,
  onInfoRequest,
}: {
  modality: GoalModality;
  state: ExerciseGoalFormState;
  onStateChange: (next: ExerciseGoalFormState) => void;
  names: Parameters<typeof ExerciseGoalForm>[0]["names"];
  includeSetsInSummary?: boolean;
  emptySummaryLabel?: string;
  showValidationMessage?: boolean;
  hideEmptySummary?: boolean;
  hideSummary?: boolean;
  betweenInputsAndFooterContent?: ReactNode;
  footerContent?: ReactNode;
  footerClassName?: string;
  visibleMetrics?: Array<keyof MeasurementMetrics>;
  visibleMetricOrder?: Array<keyof MeasurementMetrics>;
  measurementLayoutMode?: "grid" | "horizontal-scroll";
  onInfoRequest?: (payload: RoutineEditorInfoPayload) => void;
}) {
  const effectiveGoalModality: GoalModality = modality === "cardio_time_distance"
    ? inferGoalModeFromState(state)
    : modality;
  const stackClassName = measurementLayoutMode === "horizontal-scroll" ? "space-y-1" : "space-y-3";

  return (
    <div className={stackClassName}>
      <ExerciseGoalForm
        modality={effectiveGoalModality}
        state={state}
        onStateChange={onStateChange}
        names={names}
        includeSetsInSummary={includeSetsInSummary}
        emptySummaryLabel={emptySummaryLabel}
        showValidationMessage={showValidationMessage}
        hideEmptySummary={hideEmptySummary}
        hideSummary={hideSummary}
        betweenInputsAndFooterContent={betweenInputsAndFooterContent}
        footerContent={footerContent}
        footerClassName={footerClassName}
        visibleMetrics={visibleMetrics}
        visibleMetricOrder={visibleMetricOrder}
        measurementLayoutMode={measurementLayoutMode}
        onInfoRequest={onInfoRequest}
      />
      <input type="hidden" name="goalModality" value={effectiveGoalModality} />
      <input type="hidden" name="defaultUnit" value={state.distanceUnit} />
    </div>
  );
}
