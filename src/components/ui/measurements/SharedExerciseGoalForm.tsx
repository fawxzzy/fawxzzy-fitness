"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ExerciseGoalForm, type ExerciseGoalFormState, type RoutineEditorInfoPayload } from "@/components/ui/measurements/ExerciseGoalForm";
import type { MeasurementPanelAuxiliaryField } from "@/components/ui/measurements/MeasurementPanelV2";
import { deriveGoalMeasurementSelections, getGoalMeasurementOrder, type GoalModality } from "@/lib/exercise-goal-validation";
import { isCardioGoalModality, resolveGoalVisibleMetrics, resolveSubmittedGoalState } from "@/components/ui/measurements/goalVisibleMetrics";
import { MoreOptionsDisclosure, OptionSwitchRow } from "@/components/ui/measurements/OptionControls";
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
  companionToggleCard,
  companionToggleCards,
  lowerCompanionToggleCards,
  auxiliaryFields,
  showInlineStepControls,
  inlineFailureToggle,
  wrapMeasurementFields,
  includeCalories,
  simpleLayout = false,
  moreOptionsContent,
  onCaloriesShownChange,
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
  companionToggleCard?: ReactNode;
  companionToggleCards?: ReactNode[];
  lowerCompanionToggleCards?: ReactNode[];
  auxiliaryFields?: MeasurementPanelAuxiliaryField[];
  showInlineStepControls?: boolean;
  inlineFailureToggle?: boolean;
  wrapMeasurementFields?: boolean;
  /** Show the Calories field; a saved calorie value always shows (outside the plain layout). */
  includeCalories?: boolean;
  /**
   * Plain "set it up" goal (SIMPLIFY #6): only the fields the exercise needs, a Rep range switch, and one More options
   * fold holding To failure, Calories (cardio) and `moreOptionsContent` (auto-progress, timer, ...).
   */
  simpleLayout?: boolean;
  moreOptionsContent?: ReactNode;
  /** Told whether Calories is shown (and so submitted), so a caller's own summary can match what is saved. */
  onCaloriesShownChange?: (shown: boolean) => void;
}) {
  const effectiveGoalModality: GoalModality = modality === "cardio_time_distance"
    ? inferGoalModeFromState(state)
    : modality;
  const [caloriesOpen, setCaloriesOpen] = useState(() => Boolean(state.calories.trim()));
  const showCalories = simpleLayout ? caloriesOpen || Boolean(includeCalories) : Boolean(includeCalories);
  // Visibility follows the exercise's BASE modality (goal-schema-matrix.md), so strength never shows cardio fields and a
  // time-and-distance goal keeps both fields while only one is filled.
  const resolvedVisibleMetrics = useMemo(
    () => {
      if (visibleMetrics) return visibleMetrics;
      const metrics = resolveGoalVisibleMetrics(modality, state, { includeCalories: showCalories });
      // In the plain layout Calories is only ever opened from More options (an auto-estimate must not show it).
      return simpleLayout && !showCalories ? metrics.filter((metric) => metric !== "calories") : metrics;
    },
    [modality, showCalories, simpleLayout, state, visibleMetrics],
  );
  const resolvedVisibleMetricOrder = useMemo(
    () => visibleMetricOrder ?? getGoalMeasurementOrder(modality),
    [modality, visibleMetricOrder],
  );
  // A closed Calories option means "no calorie goal": an auto-estimate kept in state must not submit or count as chosen.
  const formState = resolveSubmittedGoalState(state, { simpleLayout, caloriesShown: showCalories });
  useEffect(() => {
    onCaloriesShownChange?.(showCalories);
  }, [onCaloriesShownChange, showCalories]);
  const stackClassName = measurementLayoutMode === "horizontal-scroll" ? "space-y-1" : "space-y-3";

  return (
    <div className={stackClassName}>
      <ExerciseGoalForm
        modality={effectiveGoalModality}
        state={formState}
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
        visibleMetrics={resolvedVisibleMetrics}
        visibleMetricOrder={resolvedVisibleMetricOrder}
        measurementLayoutMode={measurementLayoutMode}
        onInfoRequest={onInfoRequest}
        companionToggleCard={companionToggleCard}
        companionToggleCards={companionToggleCards}
        lowerCompanionToggleCards={lowerCompanionToggleCards}
        auxiliaryFields={auxiliaryFields}
        showInlineStepControls={showInlineStepControls}
        inlineFailureToggle={inlineFailureToggle}
        wrapMeasurementFields={wrapMeasurementFields}
        simpleLayout={simpleLayout}
      />
      {simpleLayout && visibleMetrics?.length !== 0 ? (
        <GoalMoreOptions
          modality={modality}
          state={state}
          onStateChange={onStateChange}
          caloriesOpen={showCalories}
          onCaloriesOpenChange={(next) => {
            setCaloriesOpen(next);
            if (!next) onStateChange({ ...state, calories: "" });
          }}
        >
          {moreOptionsContent}
        </GoalMoreOptions>
      ) : simpleLayout ? moreOptionsContent : null}
      <input type="hidden" name="goalModality" value={effectiveGoalModality} />
      <input type="hidden" name="defaultUnit" value={state.distanceUnit} />
    </div>
  );
}

function GoalMoreOptions({
  modality,
  state,
  onStateChange,
  caloriesOpen,
  onCaloriesOpenChange,
  children,
}: {
  modality: GoalModality;
  state: ExerciseGoalFormState;
  onStateChange: (next: ExerciseGoalFormState) => void;
  caloriesOpen: boolean;
  onCaloriesOpenChange: (next: boolean) => void;
  children?: ReactNode;
}) {
  const isCardio = isCardioGoalModality(modality);
  return (
    <MoreOptionsDisclosure className="px-1.5" defaultOpen={state.failure}>
      {isCardio ? (
        <OptionSwitchRow
          label="Calories"
          hint="Add a calorie goal."
          checked={caloriesOpen}
          onCheckedChange={onCaloriesOpenChange}
        />
      ) : (
        <OptionSwitchRow
          label="To failure"
          hint="Go until you can't do another rep."
          checked={state.failure}
          onCheckedChange={(next) => onStateChange({ ...state, failure: next })}
        />
      )}
      {children}
    </MoreOptionsDisclosure>
  );
}
