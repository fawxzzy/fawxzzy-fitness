"use client";

import { useMemo, type ReactNode } from "react";
import { ExerciseGoalForm, type ExerciseGoalFormState } from "@/components/ui/measurements/ExerciseGoalForm";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { deriveGoalMeasurementSelections, getDefaultMeasurementsForGoalModality, type GoalModality } from "@/lib/exercise-goal-validation";
import type { MeasurementMetrics } from "@/components/ui/measurements/ModifyMeasurements";

export function inferGoalModeFromState(state: ExerciseGoalFormState): GoalModality {
  const selections = deriveGoalMeasurementSelections("cardio_time_distance", {
    repsMin: state.repsMin,
    repsMax: state.repsMax,
    weight: state.weight,
    duration: state.duration,
    distance: state.distance,
    calories: state.calories,
  });
  const hasTime = state.measurements.includes("time") || selections.includes("time");
  const hasDistance = state.measurements.includes("distance") || selections.includes("distance");
  if (hasTime && hasDistance) return "cardio_time_distance";
  if (hasDistance) return "cardio_distance";
  return "cardio_time";
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
  footerContent,
  visibleMetrics,
  visibleMetricOrder,
  measurementLayoutMode,
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
  footerContent?: ReactNode;
  visibleMetrics?: Array<keyof MeasurementMetrics>;
  visibleMetricOrder?: Array<keyof MeasurementMetrics>;
  measurementLayoutMode?: "grid" | "horizontal-scroll";
}) {
  const effectiveGoalModality: GoalModality = modality === "cardio_time_distance"
    ? inferGoalModeFromState(state)
    : modality;
  const stackClassName = measurementLayoutMode === "horizontal-scroll" ? "space-y-1" : "space-y-3";

  const goalModeChoices = useMemo(() => {
    if (modality !== "cardio_time_distance") return [];
    return [
      { value: "cardio_time" as const, label: "Time" },
      { value: "cardio_distance" as const, label: "Distance" },
      { value: "cardio_time_distance" as const, label: "Time + Distance" },
    ];
  }, [modality]);

  return (
    <div className={stackClassName}>
      {goalModeChoices.length ? (
        <div className="space-y-1">
          <p className="px-0.5 text-xs text-muted">Goal mode</p>
          <SegmentedControl
            options={goalModeChoices}
            value={effectiveGoalModality}
            size="sm"
            activeIntent="info"
            ariaLabel="Goal mode"
            onChange={(nextValue) => {
              const nextMode = nextValue as GoalModality;
              onStateChange({
                ...state,
                measurements: getDefaultMeasurementsForGoalModality(nextMode),
                duration: nextMode === "cardio_distance" ? "" : state.duration,
                distance: nextMode === "cardio_time" ? "" : state.distance,
              });
            }}
          />
        </div>
      ) : null}

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
        footerContent={footerContent}
        visibleMetrics={visibleMetrics}
        visibleMetricOrder={visibleMetricOrder}
        measurementLayoutMode={measurementLayoutMode}
      />
      <input type="hidden" name="goalModality" value={effectiveGoalModality} />
      <input type="hidden" name="defaultUnit" value={state.distanceUnit} />
    </div>
  );
}
