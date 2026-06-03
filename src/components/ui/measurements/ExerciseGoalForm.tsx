"use client";

import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { appTokens } from "@/components/ui/app/tokens";
import { ChevronDownIcon } from "@/components/ui/Chevrons";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { MeasurementConfigurator } from "@/components/ui/measurements/MeasurementConfigurator";
import { GoalSummaryInline } from "@/components/ui/measurements/GoalSummaryInline";
import { ACTION_CHROME_CONTROL_CLASS_NAME, ACTION_CHROME_SEGMENTED_CLASS_NAME } from "@/components/ui/actionChrome";
import { sanitizeEnabledMeasurementValues } from "@/lib/measurement-sanitization";
import { deriveGoalMeasurementSelections, getGoalMeasurementOrder, validateGoalConfiguration, type GoalModality, type MeasurementSelection } from "@/lib/exercise-goal-validation";
import type { FitnessDistanceUnit } from "@/lib/fitness-distance-units";
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
  distanceUnit: FitnessDistanceUnit;
  measurements: MeasurementSelection[];
};

export type RoutineEditorInfoPayload = {
  title: string;
  summary: string;
  rows?: Array<{ label: string; value: string }>;
  sectionKey?: "failure_toggle" | null;
};

export function supportsFailureToggleForGoalModality(modality: GoalModality) {
  return modality === "strength" || modality === "bodyweight";
}

export function buildFailureToggleInfoPayload({
  modality,
  state,
  isFailureMode,
}: {
  modality: GoalModality;
  state: ExerciseGoalFormState;
  isFailureMode: boolean;
}): RoutineEditorInfoPayload | null {
  if (!supportsFailureToggleForGoalModality(modality)) {
    return null;
  }

  const repTargetLabel = state.repsMin.trim().length > 0
    ? state.repsMax.trim().length > 0 && state.repsMax.trim() !== state.repsMin.trim()
      ? `${state.repsMin.trim()}-${state.repsMax.trim()} reps`
      : `${state.repsMin.trim()} reps`
    : "No rep target entered yet";

  return {
    title: "Reps / Failure Toggle",
    summary: isFailureMode
      ? "Till Failure turns the goal into a failure-based effort target."
      : "Reps-Based keeps explicit rep targets active in the goal row.",
    rows: [
      { label: "Selected", value: isFailureMode ? "Till Failure" : "Reps-Based" },
      { label: "Effect", value: isFailureMode ? "Rep inputs collapse and the exercise targets effort to failure instead of a fixed rep count." : "Rep inputs stay active and progression can qualify against the rep target you enter." },
      { label: "Current reps", value: isFailureMode ? "Rep target hidden while failure mode is on." : repTargetLabel },
    ],
    sectionKey: "failure_toggle",
  };
}

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
  betweenInputsAndFooterContent,
  footerContent,
  footerClassName,
  visibleMetrics,
  visibleMetricOrder,
  measurementLayoutMode = "grid",
  onInfoRequest,
  companionToggleCard,
  companionToggleCards,
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
  betweenInputsAndFooterContent?: ReactNode;
  footerContent?: ReactNode;
  footerClassName?: string;
  visibleMetrics?: Array<keyof MeasurementMetrics>;
  visibleMetricOrder?: Array<keyof MeasurementMetrics>;
  measurementLayoutMode?: "grid" | "horizontal-scroll";
  onInfoRequest?: (payload: RoutineEditorInfoPayload) => void;
  companionToggleCard?: ReactNode;
  companionToggleCards?: ReactNode[];
}) {
  const [expanded, setExpanded] = useState(true);
  const stackClassName = measurementLayoutMode === "horizontal-scroll" ? "space-y-1" : "space-y-3";
  const resolvedMetricOrder = useMemo(
    () => visibleMetricOrder ?? getGoalMeasurementOrder(modality),
    [modality, visibleMetricOrder],
  );
  const baseVisibleMetrics = visibleMetrics ?? resolvedMetricOrder;
  const supportsFailure = baseVisibleMetrics.includes("reps");
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
    if (!isFailureMode) {
      return baseVisibleMetrics;
    }

    return baseVisibleMetrics.filter((metric) => metric !== "reps");
  }, [baseVisibleMetrics, isFailureMode]);

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
  const publishFailureToggleInfo = (overrideIsFailureMode?: boolean) => {
    const payload = buildFailureToggleInfoPayload({
      modality,
      state,
      isFailureMode: overrideIsFailureMode ?? isFailureMode,
    });
    if (!payload) {
      return;
    }

    onInfoRequest?.(payload);
    window.dispatchEvent(new CustomEvent("fitness:routine-editor-info", {
      detail: payload,
    }));
  };
  const resolvedCompanionToggleCards = useMemo(
    () => [
      ...(companionToggleCards ?? []),
      ...(companionToggleCard ? [companionToggleCard] : []),
    ],
    [companionToggleCard, companionToggleCards],
  );
  const secondaryToggleCount = resolvedCompanionToggleCards.length + (supportsFailure ? 1 : 0);
  const multiToggleLayoutActive = secondaryToggleCount > 1;
  const secondaryToggleCardClassName = secondaryToggleCount >= 3
    ? "w-[calc((100%-1.5rem)/3)] max-w-[12rem] min-w-0 flex-1 basis-0 space-y-[5px] text-center"
    : multiToggleLayoutActive
      ? "w-[calc((100%-0.75rem)/2)] max-w-[12rem] min-w-0 flex-1 basis-0 space-y-[5px] text-center"
      : "w-full max-w-[12rem] space-y-[5px] text-center";
  const failureToggleCard = supportsFailure ? (
    <div
      className={secondaryToggleCardClassName}
      onFocusCapture={() => publishFailureToggleInfo()}
      onPointerDownCapture={() => publishFailureToggleInfo()}
    >
      <div className="mx-auto inline-flex max-w-full flex-col items-stretch space-y-[2px]">
        <p className="px-1 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--accent-strong)/0.94)]">
          Reps / Failure Toggle
        </p>
        <MetricAccentBar variant="thin" className="w-full opacity-80" />
      </div>
      <button
        type="button"
        className={cn(
          ACTION_CHROME_CONTROL_CLASS_NAME,
          ACTION_CHROME_SEGMENTED_CLASS_NAME,
          "inline-flex min-h-10 w-full items-center justify-center rounded-[var(--action-chrome-segment-radius-compact)] border-[rgb(var(--accent-strong)/0.58)] bg-[linear-gradient(180deg,rgba(71,215,196,0.22),rgba(18,31,48,0.96))] px-4 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-primary))] ring-1 ring-[rgb(var(--accent-strong)/0.22)] shadow-[var(--action-chrome-shadow-hover)] focus-visible:ring-[rgb(var(--accent)/0.2)]",
        )}
        aria-pressed={isFailureMode}
        aria-label={isFailureMode ? "Failure target enabled" : "Failure target disabled"}
        onClick={() => {
          const nextIsFailureMode = !isFailureMode;
          onStateChange({
            ...state,
            failure: nextIsFailureMode,
          });
          publishFailureToggleInfo(nextIsFailureMode);
        }}
      >
        <span className="flex flex-col items-center justify-center gap-0.5 leading-none">
          <span className="measurement-toggle__label">
          {isFailureMode ? "Till Failure" : "Reps-Based"}
          </span>
          <ChevronDownIcon className="h-3 w-3 text-[rgb(var(--accent-strong)/0.94)]" />
        </span>
      </button>
    </div>
  ) : null;
  const secondaryToggleRow = failureToggleCard || resolvedCompanionToggleCards.length > 0 ? (
    <div className={multiToggleLayoutActive ? "flex items-start justify-center gap-3" : "flex justify-center"}>
      {resolvedCompanionToggleCards}
      {failureToggleCard}
    </div>
  ) : null;
  const resolvedBetweenInputsAndFooterContent = secondaryToggleRow || betweenInputsAndFooterContent ? (
    <div className="space-y-3">
      {secondaryToggleRow}
      {betweenInputsAndFooterContent}
    </div>
  ) : null;

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
        betweenInputsAndFooterContent={resolvedBetweenInputsAndFooterContent}
        footerContent={footerContent}
        footerClassName={footerClassName}
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
