"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { appTokens } from "@/components/ui/app/tokens";
import { ACTION_CHROME_CONTROL_CLASS_NAME } from "@/components/ui/actionChrome";
import { MeasurementConfigurator } from "@/components/ui/measurements/MeasurementConfigurator";
import { GoalSummaryInline } from "@/components/ui/measurements/GoalSummaryInline";
import { selectionChromeStyle } from "@/components/ui/selectionChromeStyle";
import { sanitizeEnabledMeasurementValues } from "@/lib/measurement-sanitization";
import { deriveGoalMeasurementSelections, getGoalMeasurementOrder, validateGoalConfiguration, type GoalModality, type MeasurementSelection } from "@/lib/exercise-goal-validation";
import type { MeasurementMetrics } from "@/components/ui/measurements/ModifyMeasurements";

export type ExerciseGoalFormState = {
  sets: string;
  repsMin: string;
  repsMax: string;
  failure: boolean;
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

function sanitizeIntegerInput(value: string) {
  return value.replace(/[^\d]/g, "");
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
  hideSummary = false,
  validationOverride,
  footerContent,
  footerClassName,
  visibleMetrics,
  visibleMetricOrder,
  measurementLayoutMode = "grid",
}: {
  modality: GoalModality;
  state: ExerciseGoalFormState;
  onStateChange: (next: ExerciseGoalFormState) => void;
  names: Partial<Record<"sets" | "repsMin" | "repsMax" | "failure" | "weight" | "duration" | "distance" | "calories" | "weightUnit" | "distanceUnit", string>>;
  includeSetsInSummary?: boolean;
  emptySummaryLabel?: string;
  showValidationMessage?: boolean;
  hideEmptySummary?: boolean;
  hideSummary?: boolean;
  validationOverride?: string;
  footerContent?: ReactNode;
  footerClassName?: string;
  visibleMetrics?: Array<keyof MeasurementMetrics>;
  visibleMetricOrder?: Array<keyof MeasurementMetrics>;
  measurementLayoutMode?: "grid" | "horizontal-scroll";
}) {
  const [expanded, setExpanded] = useState(true);
  const stackClassName = measurementLayoutMode === "horizontal-scroll" ? "space-y-1" : "space-y-3";
  const resolvedMetricOrder = useMemo(
    () => visibleMetricOrder ?? getGoalMeasurementOrder(modality),
    [modality, visibleMetricOrder],
  );
  const supportsFailure = modality === "strength" || modality === "bodyweight";
  const isFailureMode = supportsFailure && state.failure;
  const derivedSelections = useMemo(() => deriveGoalMeasurementSelections(modality, {
    repsMin: state.repsMin,
    repsMax: state.repsMax,
    failure: isFailureMode,
    weight: state.weight,
    duration: state.duration,
    distance: state.distance,
    calories: state.calories,
  }), [isFailureMode, modality, state.calories, state.distance, state.duration, state.repsMax, state.repsMin, state.weight]);

  const resolvedVisibleMetrics = useMemo(() => {
    const baseMetrics = visibleMetrics ?? resolvedMetricOrder;
    if (!isFailureMode) {
      return baseMetrics;
    }

    return baseMetrics.filter((metric) => metric !== "reps");
  }, [isFailureMode, resolvedMetricOrder, visibleMetrics]);

  const activeMetrics = {
    reps: !isFailureMode && derivedSelections.includes("reps"),
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
    failure: isFailureMode,
    weight: state.weight,
    duration: state.duration,
    distance: state.distance,
    calories: state.calories,
    measurementSelections: new Set(derivedSelections),
  }), [derivedSelections, isFailureMode, modality, state.calories, state.distance, state.duration, state.repsMax, state.repsMin, state.sets, state.weight]);

  const summaryValues = sanitizeEnabledMeasurementValues(activeMetrics, {
    reps: state.repsMin ? Number(state.repsMin) : null,
    weight: state.weight ? Number(state.weight) : null,
    durationSeconds: parseDurationInput(state.duration),
    distance: state.distance ? Number(state.distance) : null,
    calories: state.calories ? Number(state.calories) : null,
  });
  const shouldHideEmptySummary = hideEmptySummary ?? showValidationMessage;
  const setsHasValue = Boolean(state.sets.trim());

  return (
    <div className={stackClassName}>
      {derivedSelections.map((metric) => <input key={`selected-${metric}`} type="hidden" name="measurementSelections" value={metric} />)}
      {names.failure ? <input type="hidden" name={names.failure} value={isFailureMode ? "true" : "false"} /> : null}
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
        footerContent={footerContent}
        footerClassName={footerClassName}
        auxiliaryFields={supportsFailure ? [{
          title: "Failure",
          input: null,
          inlineLabel: "",
          useInlineFieldShell: false,
          hasValue: isFailureMode,
          labelClassName: "hidden",
          valueLabelClassName: "hidden",
          renderInput: ({ inputClassName }) => (
            <button
              type="button"
              className={cn(
                ACTION_CHROME_CONTROL_CLASS_NAME,
                inputClassName,
                "flex !h-11 !min-h-11 w-full translate-y-[2px] flex-col items-center justify-center !rounded-[1rem] !border-0 !bg-transparent !px-3 !py-2 text-center leading-none !shadow-none focus-visible:ring-[var(--button-focus-ring)]",
              )}
              data-action-chrome-intent="ghost"
              style={{
                ...selectionChromeStyle,
                "--action-chrome-text-color": isFailureMode
                  ? "rgb(var(--text-primary) / 0.96)"
                  : "rgb(var(--text-muted) / 0.92)",
              } as CSSProperties}
              aria-pressed={isFailureMode}
              aria-label={isFailureMode ? "Failure target enabled" : "Failure target disabled"}
              onClick={() => onStateChange({
                ...state,
                failure: !isFailureMode,
              })}
            >
              <span className="text-xs font-semibold uppercase tracking-[0.06em]">Failure</span>
            </button>
          ),
        }] : undefined}
        repRangeLabels={{ min: "MIN REPS", max: "MAX REPS" }}
        metricOrder={resolvedMetricOrder}
        visibleMetrics={resolvedVisibleMetrics}
        layoutMode={measurementLayoutMode}
        labelTreatment="floating-border"
        topField={{
          title: "Sets",
          suffix: "target",
          inlineLabel: "SETS",
          showEmptyValue: false,
          hasValue: setsHasValue,
          input: null,
          renderInput: ({ inputClassName }) => (
            <input
              type="text"
              inputMode="text"
              name={names.sets}
              value={state.sets}
              onChange={(event) => onStateChange({ ...state, sets: sanitizeIntegerInput(event.target.value) })}
              placeholder=""
              required
              className={cn(appTokens.measurementInput, inputClassName)}
            />
          ),
        }}
      />

      {hideSummary ? null : (
        <GoalSummaryInline
          hideWhenEmpty={shouldHideEmptySummary}
          includeSets={includeSetsInSummary}
          values={{
            ...summaryValues,
            sets: state.sets ? Number(state.sets) : null,
            reps: isFailureMode ? 0 : summaryValues.reps,
            repsMax: isFailureMode ? 0 : (activeMetrics.reps && state.repsMax ? Number(state.repsMax) : null),
            failure: isFailureMode,
            weightUnit: state.weightUnit,
            distanceUnit: state.distanceUnit,
            emptyLabel: emptySummaryLabel,
          }}
        />
      )}

      {showValidationMessage ? (
        goalValidation.isValid ? null : (
          <p className={appTokens.measurementValidation}>
            {validationOverride ?? goalValidation.message}
          </p>
        )
      ) : null}
    </div>
  );
}
