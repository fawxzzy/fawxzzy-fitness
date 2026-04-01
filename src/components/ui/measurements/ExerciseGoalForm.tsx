"use client";

import { useEffect, useMemo, useState } from "react";
import { MeasurementConfigurator } from "@/components/ui/measurements/MeasurementConfigurator";
import { GoalSummaryInline } from "@/components/ui/measurements/GoalSummaryInline";
import { sanitizeEnabledMeasurementValues } from "@/lib/measurement-sanitization";
import { getVisibleMetricsForModality, validateGoalConfiguration, type GoalModality, type MeasurementSelection } from "@/lib/exercise-goal-validation";

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
  validationOverride,
}: {
  modality: GoalModality;
  state: ExerciseGoalFormState;
  onStateChange: (next: ExerciseGoalFormState) => void;
  names: Partial<Record<"sets" | "repsMin" | "repsMax" | "weight" | "duration" | "distance" | "calories" | "weightUnit" | "distanceUnit", string>>;
  includeSetsInSummary?: boolean;
  emptySummaryLabel?: string;
  showValidationMessage?: boolean;
  validationOverride?: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const visibleMetrics = useMemo(() => getVisibleMetricsForModality(modality), [modality]);

  useEffect(() => {
    const allowed = new Set(visibleMetrics);
    const filtered = state.measurements.filter((metric) => allowed.has(metric));
    if (filtered.length === state.measurements.length) return;
    onStateChange({ ...state, measurements: filtered });
  }, [onStateChange, state, visibleMetrics]);

  const activeMetrics = {
    reps: state.measurements.includes("reps"),
    weight: state.measurements.includes("weight"),
    time: state.measurements.includes("time"),
    distance: state.measurements.includes("distance"),
    calories: state.measurements.includes("calories"),
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
    measurementSelections: new Set(state.measurements),
  }), [modality, state]);

  const summaryValues = sanitizeEnabledMeasurementValues(activeMetrics, {
    reps: state.repsMin ? Number(state.repsMin) : null,
    weight: state.weight ? Number(state.weight) : null,
    durationSeconds: parseDurationInput(state.duration),
    distance: state.distance ? Number(state.distance) : null,
    calories: state.calories ? Number(state.calories) : null,
  });

  return (
    <div className="space-y-3">
      {state.measurements.map((metric) => <input key={`selected-${metric}`} type="hidden" name="measurementSelections" value={metric} />)}
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
        onMetricToggle={(metric) => {
          const nextMeasurements = state.measurements.includes(metric)
            ? state.measurements.filter((value) => value !== metric)
            : [...state.measurements, metric];
          const sanitizedValues = sanitizeEnabledMeasurementValues({
            reps: nextMeasurements.includes("reps"),
            weight: nextMeasurements.includes("weight"),
            time: nextMeasurements.includes("time"),
            distance: nextMeasurements.includes("distance"),
            calories: nextMeasurements.includes("calories"),
          }, {
            reps: state.repsMin,
            weight: state.weight,
            duration: state.duration,
            distance: state.distance,
            calories: state.calories,
          });
          onStateChange({
            ...state,
            measurements: nextMeasurements,
            repsMin: sanitizedValues.reps,
            repsMax: nextMeasurements.includes("reps") ? state.repsMax : "",
            weight: sanitizedValues.weight,
            duration: sanitizedValues.duration,
            distance: sanitizedValues.distance,
            calories: sanitizedValues.calories,
          });
        }}
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
        <p className={`text-xs ${goalValidation.isValid ? "text-emerald-200/90" : "text-amber-200/95"}`}>
          {validationOverride ?? (goalValidation.isValid ? "Goal valid. You can add this exercise." : goalValidation.message)}
        </p>
      ) : null}
    </div>
  );
}
