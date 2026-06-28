import { Fragment, type ReactNode } from "react";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { DayCard, resolveDayCardState } from "@/components/day-list/DayList";
import { SignatureDot, SignatureInlineList, SignatureMetaTag, SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
import { appTokens } from "@/components/ui/app/tokens";
import { HorizontalScrollHint } from "@/components/ui/HorizontalScrollHint";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { StateChevron } from "@/components/ui/StateChevron";
import {
  ExerciseCardMetadataLine,
  ExerciseCardStandardTitle,
  ExerciseCardProgressionStateInline,
} from "@/components/workout/ExerciseCardStandardTitle";
import { cn } from "@/lib/cn";
import { formatRoutineDayStableDisplayName, getRoutineDayWeekdayLabel } from "@/lib/routines";
import {
  formatRoutineDayExerciseCountLabel,
} from "@/lib/routine-day-card-summary";

export const ROUTINE_DAY_CARD_BODY_CLASS_NAME = "!min-h-[2.35rem] !py-[0.2rem]";
export const ROUTINE_REST_DAY_CARD_BODY_CLASS_NAME = "!min-h-[4.1rem] !py-[0.38rem]";
export const ROUTINE_DAY_CARD_CONTENT_CLASS_NAME = "!space-y-0 !pt-[0.3rem] !pb-0";
export const ROUTINE_REST_DAY_CARD_CONTENT_CLASS_NAME = "!min-h-0 py-0 !space-y-0";
export const ROUTINE_DAY_CARD_SUBTITLE_CLASS_NAME = "text-[11.5px] leading-[1.14]";
export const ROUTINE_DAY_CARD_TITLE_CLASS_NAME = "leading-[1.04]";
export const ROUTINE_CONTENT_GAP_CLASS_NAME = "pt-2";
export const ROUTINE_TRAINING_DAY_CARD_CLASS_NAME = "[&_[data-exercise-card-accent-rail='true']]:bg-[rgb(var(--accent-divider-rgb)/0.96)]";
export const ROUTINE_REST_DAY_CARD_CLASS_NAME = "border-[rgb(var(--accent-yellow-on)/0.26)] bg-[rgb(var(--accent-yellow-off)/0.1)] [&_[data-exercise-card-accent-rail='true']]:bg-[rgb(var(--accent-yellow-on)/0.96)]";
export const ROUTINE_TAG_CLASS_NAME = "text-[11px] tracking-[0.12em]";
export const ROUTINE_DAY_CARD_RIGHT_RAIL_CLASS_NAME = "!right-[-0.22rem] !top-1/2 !bottom-auto !min-w-0 !-translate-y-1/2";
export const ROUTINE_REST_DAY_CARD_RIGHT_RAIL_CLASS_NAME = "!right-[-0.22rem] !bottom-0 !top-auto !min-w-0 !translate-y-0";
export const ROUTINE_DAY_CARD_TRAILING_STACK_CLASS_NAME = "h-auto w-auto items-center justify-center bg-transparent shadow-none backdrop-blur-0";
export const ROUTINE_SURFACE_TAG_ROW_CLASS_NAME = "flex w-max min-w-full items-center justify-center gap-1.5";
export const ROUTINE_SURFACE_TAG_SPACING_CLASS_NAME = "px-[0.6875rem] py-[0.3125rem]";
export const ROUTINE_SURFACE_TAG_CLASS_NAME = `shrink-0 border border-[rgb(var(--accent-divider-rgb)/0.26)] bg-[rgb(var(--accent-divider-rgb)/0.12)] text-[rgb(var(--accent-divider-rgb)/0.98)] ${ROUTINE_SURFACE_TAG_SPACING_CLASS_NAME}`;
const ROUTINE_DAY_CARD_REORDER_SLOT_CLASS_NAME = "pointer-events-none absolute right-[0.22rem] top-[0.12rem] z-[7] flex items-center justify-center";

export type RoutineDayCardSummary = {
  total?: number;
  strength: number;
  cardio: number;
  bodyweight: number;
  unknown: number;
};

export type RoutineDayCardPresentationItem = {
  isRest: boolean;
  splitSummary?: RoutineDayCardSummary;
  exerciseSummary?: string;
};

export type RoutineDayCardTagState = {
  isToday?: boolean;
  isRest?: boolean;
  isCompleted?: boolean;
  isSkipped?: boolean;
  isInSession?: boolean;
};

export type RoutineOverviewDayCardItem = RoutineDayCardPresentationItem & RoutineDayCardTagState & {
  dayIndex: number;
  name?: string | null;
  title?: string | null;
  occurrenceWeekday?: string | null;
  previewExercises?: Array<{
    id: string;
    name: string;
    goalLine?: string | null;
  }>;
  recapExercises?: Array<{
    id: string;
    name: string;
    progressionStateLabel?: string | null;
    signatureLabel?: string | null;
    setLabel?: string | null;
    targetLabel?: string | null;
  }>;
  remainingExerciseCount?: number;
};

export function splitRoutineSummaryParts(value: string | null | undefined) {
  return String(value ?? "")
    .split(/\s*(?:\u00B7|\u2022|\|)\s*/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function renderSignatureParts(parts: string[], className?: string) {
  if (parts.length === 0) {
    return undefined;
  }

  return (
    <span className={cn("flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-1 [text-wrap:pretty]", className)}>
      {parts.map((part, index) => (
        <Fragment key={`${part}-${index}`}>
          {index > 0 ? <SignatureDot /> : null}
          <span className="min-w-0">{part}</span>
        </Fragment>
      ))}
    </span>
  );
}

export function buildRoutineSplitParts(summary: RoutineDayCardSummary) {
  const parts: string[] = [];

  if (summary.strength > 0) parts.push(`${summary.strength} strength`);
  if (summary.cardio > 0) parts.push(`${summary.cardio} cardio`);
  if (summary.bodyweight > 0) parts.push(`${summary.bodyweight} bodyweight`);
  if (summary.unknown > 0) parts.push(`${summary.unknown} other`);

  return parts;
}

function resolveRoutineDaySubtitleTagParts(day: RoutineDayCardPresentationItem) {
  if (day.isRest) {
    return [day.exerciseSummary?.trim() || "No exercises"];
  }

  if (day.splitSummary) {
    const parts = buildRoutineSplitParts(day.splitSummary);
    return parts.length > 0 ? parts : [formatRoutineDayExerciseCountLabel(day.splitSummary.total)];
  }

  return [];
}

function renderRoutineDaySubtitleTagRail(
  parts: string[],
  {
    measureOnly = false,
  }: {
    measureOnly?: boolean;
  } = {},
) {
  const tagRow = (
    <>
      {parts.map((part) => (
        <AppBadge key={part} tone="default" className={ROUTINE_SURFACE_TAG_CLASS_NAME}>
          {renderRoutineMetricTagLabel(part)}
        </AppBadge>
      ))}
    </>
  );

  if (measureOnly) {
    return (
      <div className="inline-flex w-max max-w-full items-center justify-center gap-1.5">
        {tagRow}
      </div>
    );
  }

  return (
    <HorizontalScrollHint
      className="-mx-1"
      scrollClassName="px-1 pb-0.5"
      contentClassName={ROUTINE_SURFACE_TAG_ROW_CLASS_NAME}
      showEdgeFades={false}
    >
      {tagRow}
    </HorizontalScrollHint>
  );
}

export function renderRoutineMetricTagLabel(value: string) {
  const normalizedValue = value.trim();
  const match = normalizedValue.match(/^(\d+(?:[.,]\d+)?)(\s+.*)?$/);
  if (!match) {
    return normalizedValue;
  }

  const [, count, suffix = ""] = match;
  const trimmedSuffix = suffix.trim();

  return (
    <>
      <span className="text-[rgb(var(--text-primary))]">{count}</span>
      {trimmedSuffix ? <span className="ml-1">{trimmedSuffix}</span> : null}
    </>
  );
}

function renderRoutineRecapProgressionState(value: string) {
  const parts = value
    .split(/\s+\u2022\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  return (
    <span className="inline-flex items-center justify-end gap-x-1.5 gap-y-0 whitespace-nowrap text-[8.75px] font-semibold uppercase tracking-[0.12em]">
      {parts.map((part, index) => (
        <Fragment key={`${part}-${index}`}>
          {index > 0 ? <SignatureDot className="h-[4px] w-[4px]" /> : null}
          <span
            className={cn(
              part === "AUTO"
                ? "text-[rgb(var(--accent-strong)/0.98)]"
                : part === "MANUAL"
                  ? "text-[rgb(var(--accent-yellow-on)/0.96)]"
                  : "text-[rgb(var(--accent-divider-rgb)/0.96)]",
            )}
          >
            {part}
          </span>
        </Fragment>
      ))}
    </span>
  );
}

export function RoutineDayCardTitle({
  routineName,
  name,
  dayIndex,
  startDate,
  weekdayLabel,
  allowWeekdayFallback = true,
  dayWeekdaySeparator = "pipe",
  className,
}: {
  routineName?: string | null;
  name: string | null | undefined;
  dayIndex: number;
  startDate: string | null | undefined;
  weekdayLabel?: string | null;
  allowWeekdayFallback?: boolean;
  dayWeekdaySeparator?: "dot" | "pipe";
  className?: string;
}) {
  const normalizedRoutineName = routineName?.trim();
  const dayName = formatRoutineDayStableDisplayName({ name, dayIndex, startDate });
  const weekday = weekdayLabel?.trim() || (allowWeekdayFallback ? getRoutineDayWeekdayLabel(dayIndex, startDate, "short") : "");
  const dayNameClassName = dayName.trim().toLowerCase() === "rest"
    ? "text-[rgb(var(--accent-yellow-on))]"
    : undefined;

  return (
    <span className={cn("inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 [text-wrap:pretty]", className)}>
      {normalizedRoutineName ? (
        <>
          <span className="min-w-0">{normalizedRoutineName}</span>
          <SignatureMiniPipe />
        </>
      ) : null}
      <span className={cn("min-w-0", dayNameClassName)}>{dayName}</span>
      {weekday ? (
        <>
          {dayWeekdaySeparator === "dot" ? <SignatureDot /> : <SignatureMiniPipe />}
          <span className={cn("min-w-0", appTokens.accentText, "text-[rgb(var(--accent-divider-rgb)/0.96)]")}>
            {weekday}
          </span>
        </>
      ) : null}
    </span>
  );
}

export function renderRoutineDaySubtitle(day: RoutineDayCardPresentationItem): ReactNode {
  const tagParts = resolveRoutineDaySubtitleTagParts(day);
  if (tagParts.length > 0) {
    return renderRoutineDaySubtitleTagRail(tagParts);
  }

  return renderSignatureParts(splitRoutineSummaryParts(day.exerciseSummary)) ?? day.exerciseSummary ?? "No exercises yet";
}

export function resolveRoutineDayTagLabel(day: RoutineDayCardTagState) {
  if (day.isInSession) {
    return "IN SESSION";
  }

  if (day.isCompleted) {
    return "DONE";
  }

  if (day.isSkipped) {
    return "SKIPPED";
  }

  if (day.isToday) {
    return "TODAY";
  }

  return undefined;
}

export function renderRoutineTag(label: string | undefined) {
  const normalizedLabel = label?.trim().toUpperCase();
  if (!normalizedLabel) {
    return undefined;
  }

  if (normalizedLabel === "DONE") {
    return (
      <span
        title="Done"
        aria-label="Done"
        className="inline-flex items-center justify-end text-[15px] font-semibold leading-none text-[rgb(var(--accent-divider-rgb)/0.98)]"
      >
        {"\u2713"}
      </span>
    );
  }

  if (normalizedLabel === "SKIPPED") {
    return (
      <span
        title="Skipped"
        aria-label="Skipped"
        className="inline-flex items-center justify-end text-[15px] font-semibold leading-none text-[rgb(var(--danger-rgb)/0.98)]"
      >
        {"\u2298"}
      </span>
    );
  }

  const colorClassName = normalizedLabel === "REST DAY" || normalizedLabel === "SKIPPED"
    ? "text-[rgb(var(--accent-yellow-on))]"
    : normalizedLabel === "TODAY"
      || normalizedLabel === "CURRENT"
      || normalizedLabel === "SELECTED"
      || normalizedLabel === "IN SESSION"
      || normalizedLabel === "COMPLETED"
      || normalizedLabel === "DONE"
      ? "text-[rgb(var(--accent-divider-rgb)/0.96)]"
      : "text-[rgb(var(--text-secondary)/0.92)]";

  return <SignatureMetaTag className={cn(ROUTINE_TAG_CLASS_NAME, colorClassName)}>{normalizedLabel}</SignatureMetaTag>;
}

export function renderRoutineDayRightRail(label: string | undefined) {
  const tag = renderRoutineTag(label);

  return (
    <span className="inline-flex items-center gap-3">
      {tag ? <span className="inline-flex min-w-[5.75rem] justify-end">{tag}</span> : null}
      <span aria-hidden="true" className={appTokens.metaText}>{"\u203A"}</span>
    </span>
  );
}

export function RoutineDayCardRecapPreview(day: RoutineOverviewDayCardItem) {
  if (day.isRest) {
    return null;
  }

  if (!day.recapExercises?.length) {
    return null;
  }

  const subtitleTagParts = resolveRoutineDaySubtitleTagParts(day);

  return (
    <div className="grid gap-1 px-0.5 pt-0.5">
      {subtitleTagParts.length > 0 ? (
        <div className="flex justify-center px-1">
          <div className="grid w-fit max-w-full gap-0.5">
            <div aria-hidden="true" className="h-0 overflow-hidden">
              {renderRoutineDaySubtitleTagRail(subtitleTagParts, { measureOnly: true })}
            </div>
            <MetricAccentBar variant="thin" className="w-full opacity-80" />
          </div>
        </div>
      ) : (
        <MetricAccentBar variant="thin" className="w-full opacity-80" />
      )}
      <HorizontalScrollHint
        className="-mx-0.5"
        scrollClassName="pl-0.5 pr-[1.95rem] pb-0.5 sm:pr-[2.25rem]"
        contentClassName="flex w-max min-w-full items-stretch gap-2 pr-[1.8rem] sm:gap-2.5 sm:pr-0"
      >
        {day.recapExercises.map((exercise, index) => (
          <div
            key={`routine-day-recap-${exercise.id}-${index}`}
            className="flex min-h-[4.9rem] w-[calc(100vw-5.7rem)] min-w-[calc(100vw-5.7rem)] max-w-[calc(100vw-5.7rem)] shrink-0 flex-col justify-between rounded-[16px] border border-[rgb(var(--accent-divider-rgb)/0.18)] bg-[rgb(var(--surface-elevated-rgb,16_24_39)/0.3)] px-2 py-2 sm:min-h-[4.65rem] sm:w-max sm:min-w-[13.7rem] sm:max-w-none sm:px-2.5"
          >
            <ExerciseCardStandardTitle
              name={exercise.name}
              metadata={exercise.signatureLabel ? (
                <ExerciseCardMetadataLine
                  items={exercise.signatureLabel.split(/\s+\|\s+/).map((value) => value.trim()).filter(Boolean)}
                  className="max-w-full overflow-hidden text-[8.7px] leading-[1.06] text-[rgb(var(--text-secondary)/0.88)] sm:text-[9.5px]"
                />
              ) : (
                <span className="max-w-full overflow-hidden whitespace-nowrap text-[9px] font-medium leading-[1.06] text-[rgb(var(--text-secondary)/0.78)] sm:text-[9.5px]">
                  Exercise configured
                </span>
              )}
              rightTitle={<span className="text-[0.76rem] leading-[1.1] sm:text-[0.82rem]">Target</span>}
              rightContent={exercise.targetLabel?.trim() || "Goal missing"}
              rightSubcontent={exercise.progressionStateLabel?.trim()
                ? <ExerciseCardProgressionStateInline label={exercise.progressionStateLabel} className="text-[8.35px]" />
                : undefined}
              columnLayout="compact"
              hideRightTitleOnMobile
              className="gap-x-[0.45rem] gap-y-0.5 sm:gap-x-[0.55rem]"
              nameClassName="max-w-full whitespace-normal break-words [text-wrap:balance] text-[0.8rem] leading-[1.02] sm:whitespace-nowrap sm:text-[0.91rem] sm:leading-[1.14]"
              rightColumnClassName="w-fit max-w-full"
              rightContentClassName="gap-1 whitespace-nowrap text-[8.55px] leading-[1.03] sm:text-[8.95px]"
            />
            <MetricAccentBar variant="thin" className="mt-2 w-full opacity-75" />
          </div>
        ))}
      </HorizontalScrollHint>
    </div>
  );
}

export function RoutineOverviewDayCard({
  day,
  startDate,
  onPress,
  isSelected = false,
  showSelectedTag = false,
  isExpanded = false,
  reorderHandle,
  rightRailClassName,
  allowWeekdayFallback = true,
  wrapper,
}: {
  day: RoutineOverviewDayCardItem;
  startDate?: string | null;
  onPress?: () => void;
  isSelected?: boolean;
  showSelectedTag?: boolean;
  isExpanded?: boolean;
  reorderHandle?: ReactNode;
  rightRailClassName?: string;
  allowWeekdayFallback?: boolean;
  wrapper?: (child: ReactNode) => ReactNode;
}) {
  const selectedTag = showSelectedTag ? renderRoutineTag("SELECTED") : null;
  const chevron = (
    <StateChevron
      expanded={Boolean(isExpanded)}
      className={cn("h-5 w-5 shrink-0", appTokens.historyChevronIcon)}
      expandedClassName="text-[rgb(var(--accent)/0.92)]"
      collapsedClassName="text-[rgb(var(--text-muted)/0.92)]"
    />
  );

  const card = (
    <div className="relative min-w-0">
      {reorderHandle && !isExpanded ? (
        <div className={ROUTINE_DAY_CARD_REORDER_SLOT_CLASS_NAME}>
          <div className="pointer-events-auto">
            {reorderHandle}
          </div>
        </div>
      ) : null}
      <DayCard
        title={(
          <span className="flex w-full justify-center text-center">
            <span className="inline-flex min-w-0 max-w-full flex-col items-center gap-1 text-center">
              <RoutineDayCardTitle
                name={day.title ?? day.name ?? null}
                dayIndex={day.dayIndex}
                startDate={startDate}
                weekdayLabel={day.occurrenceWeekday}
                allowWeekdayFallback={allowWeekdayFallback}
                className="justify-center text-center"
              />
              <MetricAccentBar variant="thin" className="w-full max-w-full self-stretch" />
            </span>
          </span>
        )}
        subtitle={renderRoutineDaySubtitle(day)}
        subtitleTone="plain"
        rightIcon={(
          <span className={cn("inline-flex items-center justify-center", selectedTag ? "gap-1.5" : undefined)}>
            {selectedTag}
            {chevron}
          </span>
        )}
        state={resolveDayCardState({
          isToday: day.isToday,
          isSelected,
          isRest: day.isRest,
          isCompleted: false,
          isInSession: day.isInSession,
        })}
        className={cn(
          day.isRest ? ROUTINE_REST_DAY_CARD_CLASS_NAME : ROUTINE_TRAINING_DAY_CARD_CLASS_NAME,
          isExpanded ? "rounded-b-none ![border-bottom-left-radius:0px] ![border-bottom-right-radius:0px]" : undefined,
        )}
        bodyClassName={day.isRest ? ROUTINE_REST_DAY_CARD_BODY_CLASS_NAME : ROUTINE_DAY_CARD_BODY_CLASS_NAME}
        contentClassName={day.isRest ? ROUTINE_REST_DAY_CARD_CONTENT_CLASS_NAME : ROUTINE_DAY_CARD_CONTENT_CLASS_NAME}
        titleClassName={day.isRest ? cn(ROUTINE_DAY_CARD_TITLE_CLASS_NAME, "leading-none") : ROUTINE_DAY_CARD_TITLE_CLASS_NAME}
        subtitleClassName={ROUTINE_DAY_CARD_SUBTITLE_CLASS_NAME}
        contentVerticalAlign={day.isRest ? "auto" : undefined}
        rightIconMode="overlay"
        rightRailClassName={rightRailClassName ?? (day.isRest ? ROUTINE_REST_DAY_CARD_RIGHT_RAIL_CLASS_NAME : ROUTINE_DAY_CARD_RIGHT_RAIL_CLASS_NAME)}
        trailingStackClassName={ROUTINE_DAY_CARD_TRAILING_STACK_CLASS_NAME}
        onPress={onPress}
      >
        {RoutineDayCardRecapPreview(day)}
      </DayCard>
    </div>
  );

  return wrapper ? wrapper(card) : card;
}
