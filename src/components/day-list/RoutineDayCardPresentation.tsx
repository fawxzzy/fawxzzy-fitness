import { Fragment, type ReactNode } from "react";
import { REST_DAY_CARD_COPY } from "@/features/day-state/restDayCardCopy";
import { SignatureDot, SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
import { appTokens } from "@/components/ui/app/tokens";
import {
  CardChip,
  CardChips,
  CardHeader,
  CardMeta,
  CardStatusChip,
  CardSurface,
  type CardHeadingLevel,
} from "@/components/ui/card-system";
import { normalizeDecoratedText } from "@/lib/text-separator-normalization";
import { cn } from "@/lib/cn";
import { formatRoutineDayStableDisplayName, getRoutineDayHeading, getRoutineDayWeekdayLabel } from "@/lib/routines";
import {
  formatRoutineDayExerciseCountLabel,
} from "@/lib/routine-day-card-summary";

export const ROUTINE_DAY_CARD_BODY_CLASS_NAME = "!min-h-[2.35rem] !py-[0.2rem]";
export const ROUTINE_DAY_CARD_CONTENT_CLASS_NAME = "!space-y-0 !pt-[0.6rem] !pb-0";
export const ROUTINE_DAY_CARD_TITLE_CLASS_NAME = "leading-[1.04]";
export const ROUTINE_CONTENT_GAP_CLASS_NAME = "pt-2";
export const ROUTINE_SURFACE_TAG_CLASS_NAME = `shrink-0 border border-[rgb(var(--accent-divider-rgb)/0.26)] bg-[rgb(var(--accent-divider-rgb)/0.12)] text-[rgb(var(--accent-divider-rgb)/0.98)] px-[0.6875rem] py-[0.3125rem]`;

export type RoutineDayCardSummary = {
  total?: number;
  strength: number;
  cardio: number;
  bodyweight: number;
  unknown: number;
};

/**
 * Standalone (non-list) rest-day card, rendered on the shared card surface in the `attention` tone. The title
 * ("Rest") and the shared REST_DAY_CARD_COPY body carry the meaning, so it never relies on colour; pass `badgeText` for an extra chip.
 * It can be dropped inside an existing <li>/<ul> (the Today exercise-row list).
 *
 * Purely presentational: no onPress, no exercise-editing affordances, and no server calls,
 * so rendering it can never create or mutate a workout.
 */
export function RestDayCard({
  title = "Rest",
  subtitle = REST_DAY_CARD_COPY,
  badgeText,
  headingLevel = 3,
  className,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  badgeText?: string;
  headingLevel?: CardHeadingLevel;
  className?: string;
}) {
  return (
    <CardSurface tone="attention" className={className} data-rest-day-card="true">
      <CardHeader
        headingLevel={headingLevel}
        title={title}
        chips={badgeText ? <CardChips><CardChip tone="attention">{badgeText}</CardChip></CardChips> : undefined}
      />
      <p className="m-0 px-4 pb-3 text-sm leading-snug text-[rgb(var(--text-secondary)/0.95)]">{subtitle}</p>
    </CardSurface>
  );
}

export type RoutineDayCardPresentationItem = {
  isRest: boolean;
  isOptional?: boolean;
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

export function RoutineDayCardTitle({
  routineName,
  name,
  dayIndex,
  startDate,
  weekdayLabel,
  allowWeekdayFallback = true,
  dayWeekdaySeparator = "pipe",
  dayNameClassName,
  className,
}: {
  routineName?: string | null;
  name: string | null | undefined;
  dayIndex: number;
  startDate: string | null | undefined;
  weekdayLabel?: string | null;
  allowWeekdayFallback?: boolean;
  dayWeekdaySeparator?: "dot" | "pipe";
  dayNameClassName?: string;
  className?: string;
}) {
  const normalizedRoutineName = routineName?.trim();
  const dayName = formatRoutineDayStableDisplayName({ name, dayIndex, startDate });
  const weekday = weekdayLabel?.trim() || (allowWeekdayFallback ? getRoutineDayWeekdayLabel(dayIndex, startDate, "short") : "");
  const resolvedDayNameClassName = dayName.trim().toLowerCase() === "rest"
    ? "text-[rgb(var(--accent-yellow-on))]"
    : dayNameClassName;

  return (
    <span className={cn("inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 [text-wrap:pretty]", className)}>
      {normalizedRoutineName ? (
        <>
          <span className="min-w-0">{normalizedRoutineName}</span>
          <SignatureMiniPipe />
        </>
      ) : null}
      <span className={cn("min-w-0", resolvedDayNameClassName)}>{dayName}</span>
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

function resolveRoutineDayMetaParts(day: RoutineDayCardPresentationItem) {
  if (day.isRest) {
    return [];
  }

  if (day.splitSummary) {
    const parts = buildRoutineSplitParts(day.splitSummary);
    return parts.length > 0
      ? parts
      : [formatRoutineDayExerciseCountLabel(day.splitSummary.total)];
  }

  const summaryParts = splitRoutineSummaryParts(day.exerciseSummary);
  return summaryParts.length > 0 ? summaryParts : ["No exercises yet"];
}

/**
 * Compact vertical exercise recap for a day: name and target per row, muscle/pattern/equipment and the
 * progression state as quiet meta. No horizontal rail, so no exercise name is ever clipped mid-word.
 */
export function RoutineDayRecapList({
  exercises,
  maxVisible,
  className,
}: {
  exercises: NonNullable<RoutineOverviewDayCardItem["recapExercises"]>;
  maxVisible?: number;
  className?: string;
}) {
  const visible = typeof maxVisible === "number" ? exercises.slice(0, maxVisible) : exercises;
  const hiddenCount = exercises.length - visible.length;

  return (
    <ul
      aria-label="Exercises"
      data-routine-day-recap="true"
      className={cn("m-0 grid list-none gap-2 border-t border-[rgb(var(--border-strong)/0.14)] p-0 px-4 pb-3 pt-3", className)}
    >
      {visible.map((exercise, index) => {
        const metaItems = (exercise.signatureLabel ?? "")
          .split(/\s+\|\s+/)
          .map((value) => value.trim())
          .filter(Boolean);
        const progressionLabel = exercise.progressionStateLabel?.trim();

        return (
          <li key={`${exercise.id}-${index}`} className="grid min-w-0 gap-0.5">
            <div className="flex min-w-0 items-baseline justify-between gap-3">
              <span className="min-w-0 text-sm font-semibold leading-snug text-[rgb(var(--text-primary))] [overflow-wrap:anywhere]">
                {exercise.name}
              </span>
              <span className="shrink-0 text-xs font-semibold text-[rgb(var(--text-secondary)/0.95)]">
                {exercise.targetLabel?.trim() || "Goal missing"}
              </span>
            </div>
            <CardMeta items={[...metaItems, progressionLabel ? normalizeDecoratedText(progressionLabel).replace(/\s+[\u2022|]\s+/g, " \u00B7 ") : null]} flush />
          </li>
        );
      })}
      {hiddenCount > 0 ? (
        <li className="text-xs font-medium text-[rgb(var(--text-muted)/0.98)]">+{hiddenCount} more {hiddenCount === 1 ? "exercise" : "exercises"}</li>
      ) : null}
    </ul>
  );
}

/**
 * Day card (routine detail, Today day picker, workout-plan list).
 *
 *   Title  [chips: TODAY / DONE / REST / OPTIONAL ...]               [handle] [chevron]
 *   Day 2 - Tue - 3 strength - 1 cardio
 *   (expanded) exercise recap, then the action row (footer)
 *
 * Day-label rule (src/lib/routines.ts getRoutineDayHeading): headline is the custom title or "Day N"; when a
 * custom title takes the headline, "Day N" moves to the meta line; the weekday is always meta. Position and
 * weekday are derived from the day position, never from the stored name.
 *
 * interaction="toggle" expands the card (aria-expanded) and shows the recap; interaction="press" runs onPress
 * (Today picker selects a day, workout-plan list opens it). Drag handle and extra controls trail the header.
 */
export function RoutineOverviewDayCard({
  day,
  startDate,
  onPress,
  interaction,
  isSelected = false,
  showSelectedTag = false,
  isExpanded = false,
  controlsId,
  reorderHandle,
  trailing,
  footer,
  showRecap,
  recapMaxVisible,
  showPosition = true,
  allowWeekdayFallback = true,
  headingLevel = 2,
  asListItem = false,
  className,
}: {
  day: RoutineOverviewDayCardItem;
  startDate?: string | null;
  onPress?: () => void;
  /** "toggle" = header expands the card; "press" = header runs onPress. Defaults to "press" when onPress is set. */
  interaction?: "toggle" | "press";
  isSelected?: boolean;
  showSelectedTag?: boolean;
  isExpanded?: boolean;
  controlsId?: string;
  /** Drag handle (DragHandle) rendered as the first trailing control. */
  reorderHandle?: ReactNode;
  /** Extra trailing controls, for example a "more" button. */
  trailing?: ReactNode;
  /** Rendered inside the surface after the recap, for the action row. */
  footer?: ReactNode;
  /** Force the exercise recap on or off. Defaults to "shown while expanded". */
  showRecap?: boolean;
  recapMaxVisible?: number;
  /** Show "Day N" in the meta line when a custom title replaces it. Off for lists whose day index belongs to another routine. */
  showPosition?: boolean;
  allowWeekdayFallback?: boolean;
  headingLevel?: CardHeadingLevel;
  /** Wrap the card in an `<li>` for callers that render it directly inside a `<ul>` (the Today day picker). */
  asListItem?: boolean;
  className?: string;
}) {
  const heading = getRoutineDayHeading({
    name: day.name ?? day.title ?? null,
    dayIndex: day.dayIndex,
    startDate,
    weekdayLabel: day.occurrenceWeekday?.trim() || (allowWeekdayFallback ? getRoutineDayWeekdayLabel(day.dayIndex, startDate, "short") : null),
    isRest: day.isRest,
  });
  const metaItems = [
    ...(showPosition ? heading.metaParts : heading.weekday ? [heading.weekday] : []),
    ...resolveRoutineDayMetaParts(day),
  ];
  const chips: ReactNode[] = [];
  if (day.isInSession) chips.push(<CardStatusChip key="in-session" status="inSession" />);
  if (day.isCompleted) chips.push(<CardStatusChip key="done" status="done" />);
  if (day.isSkipped) chips.push(<CardStatusChip key="skipped" status="skipped" />);
  if (day.isToday) chips.push(<CardStatusChip key="today" status="today" />);
  if (day.isRest) chips.push(<CardStatusChip key="rest" status="rest" />);
  else if (day.isOptional) chips.push(<CardStatusChip key="optional" status="optional" />);
  if (showSelectedTag) chips.push(<CardStatusChip key="selected" status="selected" />);

  const resolvedInteraction = interaction ?? (onPress ? "press" : undefined);
  const tone = day.isRest
    ? "attention"
    : day.isInSession
      ? "logged"
      : isSelected || day.isToday
        ? "current"
        : "neutral";
  const recapVisible = (showRecap ?? isExpanded) && !day.isRest && Boolean(day.recapExercises?.length);

  const card = (
    <CardSurface tone={tone} className={className} data-routine-day-card={day.dayIndex}>
      <CardHeader
        headingLevel={headingLevel}
        title={heading.title}
        meta={<CardMeta items={metaItems} />}
        chips={chips.length > 0 ? <CardChips>{chips}</CardChips> : undefined}
        interaction={
          resolvedInteraction === "toggle" && onPress
            ? { kind: "toggle", expanded: isExpanded, onToggle: onPress, controlsId }
            : resolvedInteraction === "press" && onPress
              ? { kind: "press", onPress }
              : { kind: "none" }
        }
        trailing={reorderHandle || trailing ? <>{trailing}{reorderHandle}</> : undefined}
      />
      {recapVisible && day.recapExercises ? (
        <div id={controlsId}>
          <RoutineDayRecapList exercises={day.recapExercises} maxVisible={recapMaxVisible} />
        </div>
      ) : controlsId ? (
        <span id={controlsId} hidden />
      ) : null}
      {footer}
    </CardSurface>
  );

  return asListItem ? <li className="min-w-0">{card}</li> : card;
}
