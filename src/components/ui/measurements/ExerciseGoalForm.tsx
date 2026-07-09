"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { appTokens } from "@/components/ui/app/tokens";
import {
  GlowSwitch,
  GLOW_SWITCH_MEASUREMENT_ROW_WRAPPER_CLASS_NAME,
  GLOW_SWITCH_STANDARD_CLASS_NAME,
  GLOW_SWITCH_STANDARD_STATE_CLASS_NAME,
} from "@/components/ui/GlowSwitch";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { MeasurementConfigurator } from "@/components/ui/measurements/MeasurementConfigurator";
import { GoalSummaryInline } from "@/components/ui/measurements/GoalSummaryInline";
import type { MeasurementPanelAuxiliaryField } from "@/components/ui/measurements/MeasurementPanelV2";
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
  lowerCompanionToggleCards,
  auxiliaryFields,
  showInlineStepControls = false,
  inlineFailureToggle = false,
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
  lowerCompanionToggleCards?: ReactNode[];
  auxiliaryFields?: MeasurementPanelAuxiliaryField[];
  showInlineStepControls?: boolean;
  inlineFailureToggle?: boolean;
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
  const publishFailureToggleInfo = useCallback((overrideIsFailureMode?: boolean) => {
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
  }, [isFailureMode, modality, onInfoRequest, state]);
  const resolvedCompanionToggleCards = useMemo(
    () => [
      ...(companionToggleCards ?? []),
      ...(companionToggleCard ? [companionToggleCard] : []),
    ],
    [companionToggleCard, companionToggleCards],
  );
  const secondaryToggleCount = resolvedCompanionToggleCards.length;
  const multiToggleLayoutActive = secondaryToggleCount > 1;
  const secondaryToggleCardClassName = "relative inline-flex w-[7.35rem] min-w-[7.35rem] max-w-[7.35rem] shrink-0 flex-col text-center";
  const failureToggleCard = useMemo(() => supportsFailure ? (
    <div
      className={secondaryToggleCardClassName}
      onFocusCapture={() => publishFailureToggleInfo()}
      onPointerDownCapture={() => publishFailureToggleInfo()}
    >
      <GlowSwitch
        checked={isFailureMode}
        ariaLabel={isFailureMode ? "Failure target enabled" : "Failure target disabled"}
        onLabel="Failure"
        offLabel="Reps"
        onClick={() => {
          const nextIsFailureMode = !isFailureMode;
          onStateChange({
            ...state,
            failure: nextIsFailureMode,
          });
          publishFailureToggleInfo(nextIsFailureMode);
        }}
        className={GLOW_SWITCH_STANDARD_CLASS_NAME}
        stateClassName={GLOW_SWITCH_STANDARD_STATE_CLASS_NAME}
      />
    </div>
  ) : null, [
    isFailureMode,
    onStateChange,
    publishFailureToggleInfo,
    secondaryToggleCardClassName,
    state,
    supportsFailure,
  ]);
  const resolvedAuxiliaryFields = useMemo(
    () => {
      if (!supportsFailure || !failureToggleCard || !inlineFailureToggle) {
        return auxiliaryFields;
      }

      return [
        ...(auxiliaryFields ?? []),
        {
          title: "Reps / Failure",
          input: null,
          inlineLabel: "REPS / FAILURE",
          useInlineFieldShell: false,
          showEmptyValue: false,
          hasValue: true,
          renderInput: () => (
            <div
              className={GLOW_SWITCH_MEASUREMENT_ROW_WRAPPER_CLASS_NAME}
              onFocusCapture={() => publishFailureToggleInfo()}
              onPointerDownCapture={() => publishFailureToggleInfo()}
            >
              <GlowSwitch
                checked={isFailureMode}
                ariaLabel={isFailureMode ? "Failure target enabled" : "Failure target disabled"}
                onLabel="Failure"
                offLabel="Reps"
                onClick={() => {
                  const nextIsFailureMode = !isFailureMode;
                  onStateChange({
                    ...state,
                    failure: nextIsFailureMode,
                  });
                  publishFailureToggleInfo(nextIsFailureMode);
                }}
                className={GLOW_SWITCH_STANDARD_CLASS_NAME}
                stateClassName={GLOW_SWITCH_STANDARD_STATE_CLASS_NAME}
              />
            </div>
          ),
        } satisfies MeasurementPanelAuxiliaryField,
      ];
    },
    [
      auxiliaryFields,
      failureToggleCard,
      inlineFailureToggle,
      isFailureMode,
      onStateChange,
      publishFailureToggleInfo,
      state,
      supportsFailure,
    ],
  );
  const secondaryToggleRow = resolvedCompanionToggleCards.length > 0 ? (
    <div className={multiToggleLayoutActive ? "flex flex-wrap items-start justify-center gap-2" : "flex justify-center"}>
      {resolvedCompanionToggleCards}
    </div>
  ) : null;
  const lowerCompanionToggleRow = lowerCompanionToggleCards && lowerCompanionToggleCards.length > 0 ? (
    <div className="flex justify-center">
      <div className="w-[7.35rem] min-w-[7.35rem] max-w-[7.35rem]">
        {lowerCompanionToggleCards[0]}
      </div>
    </div>
  ) : null;
  const resolvedBetweenInputsAndFooterContent = secondaryToggleRow || lowerCompanionToggleRow || betweenInputsAndFooterContent ? (
    <div className="space-y-2">
      {secondaryToggleRow}
      {lowerCompanionToggleRow}
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
        auxiliaryFields={resolvedAuxiliaryFields}
        repRangeFooterContent={!inlineFailureToggle && supportsFailure && !isFailureMode ? failureToggleCard : undefined}
        repReplacementContent={!inlineFailureToggle && supportsFailure && isFailureMode ? failureToggleCard : undefined}
        repRangeLabels={{ min: "MIN REPS", max: "MAX REPS" }}
        metricOrder={resolvedMetricOrder}
        visibleMetrics={resolvedVisibleMetrics}
        layoutMode={measurementLayoutMode}
        labelTreatment="floating-border"
        showInlineStepControls={showInlineStepControls}
        topField={{
          title: "Sets",
          suffix: "target",
          inlineLabel: "SETS",
          showEmptyValue: false,
          hasValue: setsHasValue,
          stepper: showInlineStepControls ? {
            decrementAriaLabel: "Decrease sets",
            incrementAriaLabel: "Increase sets",
            onDecrement: () => onStateChange({
              ...state,
              sets: String(Math.max(1, (Number.parseInt(state.sets, 10) || 1) - 1)),
            }),
            onIncrement: () => onStateChange({
              ...state,
              sets: String((Number.parseInt(state.sets, 10) || 0) + 1),
            }),
          } : undefined,
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
