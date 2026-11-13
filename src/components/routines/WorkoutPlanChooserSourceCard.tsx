"use client";

import {
  RoutineDayRecapList,
  buildRoutineSplitParts,
  splitRoutineSummaryParts,
  type RoutineOverviewDayCardItem,
} from "@/components/day-list/RoutineDayCardPresentation";
import {
  CardChips,
  CardHeader,
  CardMeta,
  CardStatusChip,
  CardSurface,
} from "@/components/ui/card-system";

const WORKOUT_PLAN_CHOOSER_MAX_RECAP_EXERCISES = 4;

function resolveChooserMetaParts(source: RoutineOverviewDayCardItem) {
  const parts = source.isRest
    ? splitRoutineSummaryParts(source.exerciseSummary).slice(0, 1)
    : source.splitSummary
      ? buildRoutineSplitParts(source.splitSummary)
      : splitRoutineSummaryParts(source.exerciseSummary);

  if (parts.length === 0) {
    return [source.isRest ? "Rest day" : "No exercises"];
  }

  return parts;
}

/**
 * Selectable day card in the "duplicate a day" chooser. Same anatomy as every day card: title, meta line,
 * status chip. Selection is a real toggle (aria-pressed) with a visible SELECTED chip, never colour alone.
 * The recap is a short vertical list (no sideways rail).
 */
export function WorkoutPlanChooserSourceCard({
  source,
  selected = false,
  onPress,
}: {
  source: RoutineOverviewDayCardItem;
  selected?: boolean;
  onPress?: () => void;
}) {
  const resolvedTitle = (source.title ?? source.name ?? "").trim() || "Day";
  const weekday = source.occurrenceWeekday?.trim();
  const metaItems = [weekday, ...resolveChooserMetaParts(source)];
  const recapExercises = source.isRest ? [] : source.recapExercises ?? [];

  return (
    <CardSurface tone={source.isRest ? "attention" : selected ? "current" : "neutral"} data-workout-plan-chooser-card={source.dayIndex}>
      <CardHeader
        headingLevel={3}
        title={resolvedTitle}
        meta={<CardMeta items={metaItems} />}
        chips={selected ? <CardChips><CardStatusChip status="selected" /></CardChips> : undefined}
        interaction={onPress ? { kind: "select", selected, onSelect: onPress } : { kind: "none" }}
      />
      {recapExercises.length > 0 ? (
        <RoutineDayRecapList exercises={recapExercises} maxVisible={WORKOUT_PLAN_CHOOSER_MAX_RECAP_EXERCISES} />
      ) : null}
    </CardSurface>
  );
}
