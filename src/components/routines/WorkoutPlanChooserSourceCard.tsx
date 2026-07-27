"use client";

import {
  buildRoutineSplitParts,
  RoutineDayCardRecapPreview,
  ROUTINE_DAY_CARD_BODY_CLASS_NAME,
  ROUTINE_DAY_CARD_CONTENT_CLASS_NAME,
  ROUTINE_DAY_CARD_SUBTITLE_CLASS_NAME,
  ROUTINE_DAY_CARD_TITLE_CLASS_NAME,
  ROUTINE_REST_DAY_CARD_BODY_CLASS_NAME,
  ROUTINE_REST_DAY_CARD_CLASS_NAME,
  ROUTINE_REST_DAY_CARD_CONTENT_CLASS_NAME,
  ROUTINE_SURFACE_TAG_CLASS_NAME,
  ROUTINE_TRAINING_DAY_CARD_CLASS_NAME,
  renderRoutineMetricTagLabel,
  splitRoutineSummaryParts,
  type RoutineOverviewDayCardItem,
} from "@/components/day-list/RoutineDayCardPresentation";
import { RoutinesListItemCard } from "@/components/routines/RoutinesScreenFamily";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { HorizontalScrollHint } from "@/components/ui/HorizontalScrollHint";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { cn } from "@/lib/cn";

const WORKOUT_PLAN_CHOOSER_SOURCE_LABEL_CLASS_NAME = "inline-flex shrink-0 items-center justify-center text-[10px] font-semibold uppercase tracking-[0.12em]";
const WORKOUT_PLAN_CHOOSER_RIGHT_RAIL_CLASS_NAME = "!right-[0.42rem] !top-[0.48rem] !bottom-auto !min-w-0 !translate-y-0";
const WORKOUT_PLAN_CHOOSER_CONTENT_CLASS_NAME = "!space-y-0 !py-0";
const WORKOUT_PLAN_CHOOSER_RECAP_SCROLL_CLASS_NAME = "pl-0.5 pr-[1.15rem] pb-0.5";
const WORKOUT_PLAN_CHOOSER_RECAP_CONTENT_CLASS_NAME = "flex w-max min-w-full items-stretch gap-2 pr-[1rem]";
const WORKOUT_PLAN_CHOOSER_RECAP_ITEM_CLASS_NAME = "!w-max !min-w-[9.75rem] !max-w-[13.7rem]";
const WORKOUT_PLAN_CHOOSER_TAG_SCROLL_CLASS_NAME = "px-0.5 pb-0.5";
const WORKOUT_PLAN_CHOOSER_TAG_ROW_CLASS_NAME = "flex w-max min-w-full items-center justify-start gap-1";
const WORKOUT_PLAN_CHOOSER_TAG_CLASS_NAME = `${ROUTINE_SURFACE_TAG_CLASS_NAME} px-[0.46rem] py-[0.2rem] text-[9px] sm:px-[0.6875rem] sm:py-[0.3125rem] sm:text-[11px]`;

function renderWorkoutPlanChooserSubtitle(source: RoutineOverviewDayCardItem) {
  const parts = source.isRest
    ? splitRoutineSummaryParts(source.exerciseSummary).slice(0, 1)
    : source.splitSummary
      ? buildRoutineSplitParts(source.splitSummary)
      : splitRoutineSummaryParts(source.exerciseSummary);

  if (parts.length === 0) {
    return source.isRest ? "Rest day" : "No exercises";
  }

  return (
    <HorizontalScrollHint
      className="-mx-0.5"
      scrollClassName={WORKOUT_PLAN_CHOOSER_TAG_SCROLL_CLASS_NAME}
      contentClassName={WORKOUT_PLAN_CHOOSER_TAG_ROW_CLASS_NAME}
      showEdgeFades={false}
    >
      {parts.map((part) => (
        <AppBadge key={part} tone="default" className={WORKOUT_PLAN_CHOOSER_TAG_CLASS_NAME}>
          {renderRoutineMetricTagLabel(part)}
        </AppBadge>
      ))}
    </HorizontalScrollHint>
  );
}

export function WorkoutPlanChooserSourceCard({
  source,
  selected = false,
  onPress,
}: {
  source: RoutineOverviewDayCardItem;
  selected?: boolean;
  onPress?: () => void;
}) {
  const resolvedTitle = (source.title ?? source.name ?? "").trim() || "Workout Plan";
  const titleToneClassName = resolvedTitle.toLowerCase() === "rest"
    ? "text-[rgb(var(--accent-yellow-on))]"
    : "text-[rgb(var(--accent-strong)/0.98)]";

  return (
    <RoutinesListItemCard
      title={(
        <span className="flex w-full justify-start text-left">
          <span className="inline-flex min-w-0 max-w-full flex-col items-start gap-1 text-left">
            <span className={cn("min-w-0 max-w-full whitespace-normal break-words text-left leading-[1.1] [text-wrap:balance]", titleToneClassName)}>
              {resolvedTitle}
            </span>
            <MetricAccentBar variant="thin" className="w-full max-w-full" />
          </span>
        </span>
      )}
      subtitle={renderWorkoutPlanChooserSubtitle(source)}
      subtitleTone="plain"
      rightIcon={(
        <span
          className={cn(
            WORKOUT_PLAN_CHOOSER_SOURCE_LABEL_CLASS_NAME,
            selected
              ? "text-[rgb(var(--accent-divider-rgb)/0.96)]"
              : "text-[rgb(var(--text-secondary)/0.72)]",
          )}
        >
          {selected ? "Source" : "Select"}
        </span>
      )}
      state={selected ? "selected" : "default"}
      className={cn(source.isRest ? ROUTINE_REST_DAY_CARD_CLASS_NAME : ROUTINE_TRAINING_DAY_CARD_CLASS_NAME)}
      bodyClassName={source.isRest ? ROUTINE_REST_DAY_CARD_BODY_CLASS_NAME : ROUTINE_DAY_CARD_BODY_CLASS_NAME}
      contentClassName={cn(
        source.isRest ? ROUTINE_REST_DAY_CARD_CONTENT_CLASS_NAME : ROUTINE_DAY_CARD_CONTENT_CLASS_NAME,
        WORKOUT_PLAN_CHOOSER_CONTENT_CLASS_NAME,
      )}
      titleClassName={source.isRest ? cn(ROUTINE_DAY_CARD_TITLE_CLASS_NAME, "leading-none") : ROUTINE_DAY_CARD_TITLE_CLASS_NAME}
      subtitleClassName={ROUTINE_DAY_CARD_SUBTITLE_CLASS_NAME}
      rightIconMode="overlay"
      rightRailClassName={WORKOUT_PLAN_CHOOSER_RIGHT_RAIL_CLASS_NAME}
      trailingStackClassName="h-auto w-auto items-center justify-center bg-transparent shadow-none backdrop-blur-0"
      onPress={onPress}
    >
      {RoutineDayCardRecapPreview(source, {
        scrollClassName: WORKOUT_PLAN_CHOOSER_RECAP_SCROLL_CLASS_NAME,
        contentClassName: WORKOUT_PLAN_CHOOSER_RECAP_CONTENT_CLASS_NAME,
        itemClassName: WORKOUT_PLAN_CHOOSER_RECAP_ITEM_CLASS_NAME,
      })}
    </RoutinesListItemCard>
  );
}
