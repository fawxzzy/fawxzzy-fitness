"use client";

import {
  RoutineDayCardRecapPreview,
  renderRoutineDaySubtitle,
  ROUTINE_DAY_CARD_BODY_CLASS_NAME,
  ROUTINE_DAY_CARD_CONTENT_CLASS_NAME,
  ROUTINE_DAY_CARD_SUBTITLE_CLASS_NAME,
  ROUTINE_DAY_CARD_TITLE_CLASS_NAME,
  ROUTINE_REST_DAY_CARD_BODY_CLASS_NAME,
  ROUTINE_REST_DAY_CARD_CLASS_NAME,
  ROUTINE_REST_DAY_CARD_CONTENT_CLASS_NAME,
  ROUTINE_TRAINING_DAY_CARD_CLASS_NAME,
  type RoutineOverviewDayCardItem,
} from "@/components/day-list/RoutineDayCardPresentation";
import { RoutinesListItemCard } from "@/components/routines/RoutinesScreenFamily";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { cn } from "@/lib/cn";

const WORKOUT_PLAN_CHOOSER_SOURCE_LABEL_CLASS_NAME = "inline-flex shrink-0 items-center justify-center text-[10px] font-semibold uppercase tracking-[0.12em]";
const WORKOUT_PLAN_CHOOSER_RIGHT_RAIL_CLASS_NAME = "!right-[0.42rem] !top-[0.48rem] !bottom-auto !min-w-0 !translate-y-0";
const WORKOUT_PLAN_CHOOSER_CONTENT_CLASS_NAME = "!space-y-0 !py-0";

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
    : undefined;

  return (
    <RoutinesListItemCard
      title={(
        <span className="flex w-full justify-center text-center">
          <span className="inline-flex min-w-0 max-w-full flex-col items-center gap-1 text-center">
            <span className={cn("min-w-0 max-w-full truncate text-center", titleToneClassName)}>
              {resolvedTitle}
            </span>
            <MetricAccentBar variant="thin" className="w-full max-w-full self-stretch" />
          </span>
        </span>
      )}
      subtitle={renderRoutineDaySubtitle(source)}
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
      {RoutineDayCardRecapPreview(source)}
    </RoutinesListItemCard>
  );
}
