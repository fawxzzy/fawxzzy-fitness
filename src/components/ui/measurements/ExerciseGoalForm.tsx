"use client";

import { useEffect, useMemo, useState } from "react";
import { MeasurementConfigurator } from "@/components/ui/measurements/MeasurementConfigurator";
import { GoalSummaryInline } from "@/components/ui/measurements/GoalSummaryInline";
import { sanitizeEnabledMeasurementValues } from "@/lib/measurement-sanitization";
import { deriveGoalMeasurementSelections, getVisibleMetricsForModality, validateGoalConfiguration, type GoalModality, type MeasurementSelection } from "@/lib/exercise-goal-validation";

export type ExerciseGoalFormState = {
  sets: string;
  repsMin: string;
  repsMax: string;
  weight: string;
  duration: string;
  distance: string;
  calories: string;
  weightUnit: "lbs" | "kg";
  distanceUnit: "mi" | "km" | "m";
  measurements: MeasurementSelection[];
};

function parseDurationInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const match = trimmed.match(/^(\d+):(\d{1,2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function ExerciseGoalForm({
  modality,
  state,
  onStateChange,
  names,
  includeSetsInSummary = true,
  emptySummaryLabel = "Goal missing",
  showValidationMessage = false,
  hideEmptySummary,
  validationOverride,
}: {
  modality: GoalModality;
  state: ExerciseGoalFormState;
  onStateChange: (next: ExerciseGoalFormState) => void;
  names: Partial<Record<"sets" | "repsMin" | "repsMax" | "weight" | "duration" | "distance" | "calories" | "weightUnit" | "distanceUnit", string>>;
  includeSetsInSummary?: boolean;
  emptySummaryLabel?: string;
  showValidationMessage?: boolean;
  hideEmptySummary?: boolean;
  validationOverride?: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const visibleMetrics = useMemo(() => getVisibleMetricsForModality(modality), [modality]);
  const derivedSelections = useMemo(() => deriveGoalMeasurementSelections(modality, {
    repsMin: state.repsMin,
    weight: state.weight,
    duration: state.duration,
    distance: state.distance,
    calories: state.calories,
  }), [modality, state.calories, state.distance, state.duration, state.repsMin, state.weight]);

  useEffect(() => {
    const current = [...state.measurements].sort().join("|");
    const derived = [...derivedSelections].sort().join("|");
    if (current === derived) return;
    onStateChange({ ...state, measurements: derivedSelections });
  }, [derivedSelections, onStateChange, state]);

  const activeMetrics = {
    reps: derivedSelections.includes("reps"),
    weight: derivedSelections.includes("weight"),
    time: derivedSelections.includes("time"),
    distance: derivedSelections.includes("distance"),
    calories: derivedSelections.includes("calories"),
  };

  const goalValidation = useMemo(() => validateGoalConfiguration({
    modality,
    sets: state.sets,
    repsMin: state.repsMin,
    repsMax: state.repsMax,
    weight: state.weight,
    duration: state.duration,
    distance: state.distance,
    calories: state.calories,
    measurementSelections: new Set(derivedSelections),
  }), [derivedSelections, modality, state.calories, state.distance, state.duration, state.repsMax, state.repsMin, state.sets, state.weight]);

  const summaryValues = sanitizeEnabledMeasurementValues(activeMetrics, {
    reps: state.repsMin ? Number(state.repsMin) : null,
    weight: state.weight ? Number(state.weight) : null,
    durationSeconds: parseDurationInput(state.duration),
    distance: state.distance ? Number(state.distance) : null,
    calories: state.calories ? Number(state.calories) : null,
  });
  const shouldHideEmptySummary = hideEmptySummary ?? showValidationMessage;

  return (
    <div className="space-y-3">
      {derivedSelections.map((metric) => <input key={`selected-${metric}`} type="hidden" name="measurementSelections" value={metric} />)}
      <MeasurementConfigurator
        values={{
          reps: state.repsMin,
          repsMax: state.repsMax,
          weight: state.weight,
          duration: state.duration,
          distance: state.distance,
          calories: state.calories,
          weightUnit: state.weightUnit,
          distanceUnit: state.distanceUnit,
        }}
        activeMetrics={activeMetrics}
        isExpanded={expanded}
        onExpandedChange={setExpanded}
        onMetricToggle={undefined}
        onChange={(patch) => onStateChange({
          ...state,
          repsMin: patch.reps ?? state.repsMin,
          repsMax: patch.repsMax ?? state.repsMax,
          weight: patch.weight ?? state.weight,
          duration: patch.duration ?? state.duration,
          distance: patch.distance ?? state.distance,
          calories: patch.calories ?? state.calories,
          weightUnit: patch.weightUnit ?? state.weightUnit,
          distanceUnit: patch.distanceUnit ?? state.distanceUnit,
        })}
        names={{
          reps: names.repsMin,
          repsMax: names.repsMax,
          weight: names.weight,
          duration: names.duration,
          distance: names.distance,
          calories: names.calories,
          weightUnit: names.weightUnit,
          distanceUnit: names.distanceUnit,
        }}
        showHeader={false}
        visibleMetrics={visibleMetrics}
        topField={{
          title: "Sets",
          suffix: "target",
          input: (
            <input
              type="number"
              min={1}
              name={names.sets}
              value={state.sets}
              onChange={(event) => onStateChange({ ...state, sets: event.target.value })}
              placeholder="Sets"
              required
              className="input-no-spinner h-10 w-full rounded-lg border border-emerald-300/30 bg-[rgb(var(--bg)/0.48)] px-3 text-base font-semibold tabular-nums text-text placeholder:text-[rgb(var(--text)/0.24)] focus-visible:border-emerald-300/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/25"
            />
          ),
        }}
      />

      <GoalSummaryInline
        hideWhenEmpty={shouldHideEmptySummary}
        includeSets={includeSetsInSummary}
        values={{
          ...summaryValues,
          sets: state.sets ? Number(state.sets) : null,
          repsMax: activeMetrics.reps && state.repsMax ? Number(state.repsMax) : null,
          weightUnit: state.weightUnit,
          distanceUnit: state.distanceUnit,
          emptyLabel: emptySummaryLabel,
        }}
      />

      {showValidationMessage ? (
        goalValidation.isValid ? null : (
          <p className="rounded-lg border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/95">
            {validationOverride ?? goalValidation.message}
          </p>
        )
      ) : null}
    </div>
  );
}
