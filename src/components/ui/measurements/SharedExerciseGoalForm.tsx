"use client";

import { useMemo } from "react";
import { ExerciseGoalForm, type ExerciseGoalFormState } from "@/components/ui/measurements/ExerciseGoalForm";
import { cn } from "@/lib/cn";
import { deriveGoalMeasurementSelections, getVisibleMetricsForModality, type GoalModality, type MeasurementSelection } from "@/lib/exercise-goal-validation";

function getDefaultMeasurements(modality: GoalModality): MeasurementSelection[] {
  switch (modality) {
    case "bodyweight":
      return ["reps"];
    case "cardio_time":
      return ["time"];
    case "cardio_distance":
      return ["distance"];
    case "cardio_time_distance":
      return ["time", "distance"];
    case "strength":
    default:
      return ["reps", "weight"];
  }
}

export function inferGoalModeFromState(state: ExerciseGoalFormState): GoalModality {
  const selections = deriveGoalMeasurementSelections("cardio_time_distance", {
    repsMin: state.repsMin,
    weight: state.weight,
    duration: state.duration,
    distance: state.distance,
    calories: state.calories,
  });
  const hasTime = selections.includes("time");
  const hasDistance = selections.includes("distance");
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
}: {
  modality: GoalModality;
  state: ExerciseGoalFormState;
  onStateChange: (next: ExerciseGoalFormState) => void;
  names: Parameters<typeof ExerciseGoalForm>[0]["names"];
  includeSetsInSummary?: boolean;
  emptySummaryLabel?: string;
  showValidationMessage?: boolean;
  hideEmptySummary?: boolean;
}) {
  const effectiveGoalModality: GoalModality = modality === "cardio_time_distance"
    ? inferGoalModeFromState(state)
    : modality;

  const goalModeChoices = useMemo(() => {
    if (modality !== "cardio_time_distance") return [];
    return [
      { value: "cardio_time" as const, label: "Time" },
      { value: "cardio_distance" as const, label: "Distance" },
      { value: "cardio_time_distance" as const, label: "Time + Distance" },
    ];
  }, [modality]);

  return (
    <div className="space-y-3">
      {goalModeChoices.length ? (
        <div className="space-y-1">
          <p className="px-0.5 text-xs text-muted">Goal mode</p>
          <div className="flex flex-wrap gap-2">
            {goalModeChoices.map((choice) => {
              const active = effectiveGoalModality === choice.value;
              return (
                <button
                  key={choice.value}
                  type="button"
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    active
                      ? "border-emerald-300/45 bg-emerald-400/16 text-text"
                      : "border-border/40 bg-[rgb(var(--bg)/0.35)] text-muted hover:text-text",
                  )}
                  onClick={() => {
                    onStateChange({
                      ...state,
                      measurements: getDefaultMeasurements(choice.value),
                      duration: choice.value === "cardio_distance" ? "" : state.duration,
                      distance: choice.value === "cardio_time" ? "" : state.distance,
                    });
                  }}
                >
                  {choice.label}
                </button>
              );
            })}
          </div>
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
      />
      <input type="hidden" name="goalModality" value={effectiveGoalModality} />
      <input type="hidden" name="defaultUnit" value={getVisibleMetricsForModality(effectiveGoalModality).includes("distance") ? state.distanceUnit : "mi"} />
    </div>
  );
}
