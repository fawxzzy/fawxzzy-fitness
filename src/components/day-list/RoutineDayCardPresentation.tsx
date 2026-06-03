import { Fragment, type ReactNode } from "react";
import { DayCard, resolveDayCardState } from "@/components/day-list/DayList";
import { SignatureDot, SignatureMetaTag, SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
import { appTokens } from "@/components/ui/app/tokens";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/Chevrons";
import { cn } from "@/lib/cn";
import { formatRoutineDayStableDisplayName, getRoutineDayWeekdayLabel } from "@/lib/routines";
import {
  formatRoutineDayExerciseCountLabel,
  resolveRoutineDayAdjustmentIndicator,
  resolveRoutineDayExerciseDescriptor,
} from "@/lib/routine-day-card-summary";
import type { SetFlowDirection } from "@/lib/set-flow-directions";

export const ROUTINE_DAY_CARD_BODY_CLASS_NAME = "min-h-[2.35rem] py-[0.2rem]";
export const ROUTINE_REST_DAY_CARD_BODY_CLASS_NAME = "!min-h-0 py-0";
export const ROUTINE_DAY_CARD_CONTENT_CLASS_NAME = "!space-y-0 py-0";
export const ROUTINE_REST_DAY_CARD_CONTENT_CLASS_NAME = "!min-h-0 py-0 !space-y-0";
export const ROUTINE_DAY_CARD_SUBTITLE_CLASS_NAME = "text-[11.5px] leading-[1.14]";
export const ROUTINE_DAY_CARD_TITLE_CLASS_NAME = "leading-[1.04]";
export const ROUTINE_CONTENT_GAP_CLASS_NAME = "pt-2";
export const ROUTINE_REST_DAY_CARD_CLASS_NAME = "border-[rgb(var(--accent-yellow-on)/0.26)] bg-[rgb(var(--accent-yellow-off)/0.1)] [&_[data-exercise-card-accent-rail='true']]:bg-[rgb(var(--accent-yellow-on)/0.96)]";
export const ROUTINE_TAG_CLASS_NAME = "text-[11px] tracking-[0.12em]";
export const ROUTINE_DAY_CARD_TRAILING_STACK_CLASS_NAME = "!h-auto !min-h-0 !items-center";

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
  dayAdjustmentDirection?: SetFlowDirection | null;
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

export function RoutineDayCardTitle({
  routineName,
  name,
  dayIndex,
  startDate,
  weekdayLabel,
  dayWeekdaySeparator = "pipe",
}: {
  routineName?: string | null;
  name: string | null | undefined;
  dayIndex: number;
  startDate: string | null | undefined;
  weekdayLabel?: string | null;
  dayWeekdaySeparator?: "dot" | "pipe";
}) {
  const normalizedRoutineName = routineName?.trim();
  const dayName = formatRoutineDayStableDisplayName({ name, dayIndex, startDate });
  const weekday = weekdayLabel?.trim() || getRoutineDayWeekdayLabel(dayIndex, startDate, "short");
  const dayNameClassName = dayName.trim().toLowerCase() === "rest"
    ? "text-[rgb(var(--accent-yellow-on))]"
    : undefined;

  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 [text-wrap:pretty]">
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
  if (day.isRest) {
    return undefined;
  }

  if (day.splitSummary) {
    const countLabel = formatRoutineDayExerciseCountLabel(day.splitSummary.total);
    const descriptor = resolveRoutineDayExerciseDescriptor(day.splitSummary);
    const dayAdjustmentDirection = resolveRoutineDayAdjustmentIndicator(day.dayAdjustmentDirection);
    const parts: ReactNode[] = [countLabel];

    if (descriptor) {
      parts.push(descriptor);
    }

    if (dayAdjustmentDirection) {
      parts.push(
        <span
          key={`day-adjustment-${dayAdjustmentDirection}`}
          className={dayAdjustmentDirection === "up"
            ? "text-[15px] font-semibold leading-none text-[rgb(var(--accent-divider-rgb)/0.98)]"
            : "text-[15px] font-semibold leading-none text-[rgb(var(--danger-rgb)/0.98)]"}
        >
          {dayAdjustmentDirection === "up" ? "\u2191" : "\u2193"}
        </span>,
      );
    }

    return (
      <span className="flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-1 [text-wrap:pretty]">
        {parts.map((part, index) => (
          <Fragment key={typeof part === "string" ? `${part}-${index}` : index}>
            {index > 0 ? <SignatureDot /> : null}
            <span className="min-w-0">{part}</span>
          </Fragment>
        ))}
      </span>
    );
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

export function RoutineOverviewDayCard({
  day,
  startDate,
  onPress,
  isSelected = false,
  showSelectedTag = false,
  isExpanded = false,
  wrapper,
}: {
  day: RoutineOverviewDayCardItem;
  startDate?: string | null;
  onPress?: () => void;
  isSelected?: boolean;
  showSelectedTag?: boolean;
  isExpanded?: boolean;
  wrapper?: (child: ReactNode) => ReactNode;
}) {
  const selectedTag = showSelectedTag ? renderRoutineTag("SELECTED") : null;
  const statusTag = renderRoutineTag(resolveRoutineDayTagLabel(day));
  const card = (
    <DayCard
      title={(
        <RoutineDayCardTitle
          name={day.name ?? day.title ?? null}
          dayIndex={day.dayIndex}
          startDate={startDate}
          weekdayLabel={day.occurrenceWeekday}
        />
      )}
      subtitle={renderRoutineDaySubtitle(day)}
      subtitleTone="plain"
      rightIcon={day.isRest
        ? (
            <span className="inline-flex items-center gap-3">
              {selectedTag}
              {isExpanded
                ? <ChevronDownIcon className={cn("h-5 w-5 shrink-0 text-[rgb(var(--accent)/0.92)]", appTokens.historyChevronIcon)} />
                : <ChevronRightIcon className={cn("h-5 w-5 shrink-0 text-[rgb(var(--text-muted)/0.92)]", appTokens.historyChevronIcon)} />}
            </span>
          )
        : (
            <span className="inline-flex items-center gap-3">
              {selectedTag}
              {statusTag}
              {isExpanded
                ? <ChevronDownIcon className={cn("h-5 w-5 shrink-0 text-[rgb(var(--accent)/0.92)]", appTokens.historyChevronIcon)} />
                : <ChevronRightIcon className={cn("h-5 w-5 shrink-0 text-[rgb(var(--text-muted)/0.92)]", appTokens.historyChevronIcon)} />}
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
        day.isRest ? ROUTINE_REST_DAY_CARD_CLASS_NAME : undefined,
        isExpanded ? "rounded-b-none ![border-bottom-left-radius:0px] ![border-bottom-right-radius:0px]" : undefined,
      )}
      bodyClassName={day.isRest ? ROUTINE_REST_DAY_CARD_BODY_CLASS_NAME : ROUTINE_DAY_CARD_BODY_CLASS_NAME}
      contentClassName={day.isRest ? ROUTINE_REST_DAY_CARD_CONTENT_CLASS_NAME : ROUTINE_DAY_CARD_CONTENT_CLASS_NAME}
      titleClassName={day.isRest ? cn(ROUTINE_DAY_CARD_TITLE_CLASS_NAME, "leading-none") : ROUTINE_DAY_CARD_TITLE_CLASS_NAME}
      subtitleClassName={ROUTINE_DAY_CARD_SUBTITLE_CLASS_NAME}
      contentVerticalAlign={day.isRest ? "auto" : undefined}
      rightRailClassName="!items-center"
      trailingStackClassName={ROUTINE_DAY_CARD_TRAILING_STACK_CLASS_NAME}
      onPress={onPress}
    />
  );

  return wrapper ? wrapper(card) : card;
}
