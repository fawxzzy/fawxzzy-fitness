"use client";

import { useId } from "react";
import type { RoutineDayCardSummary } from "@/components/day-list/RoutineDayCardPresentation";
import {
  CardActionRow,
  CardChips,
  CardHeader,
  CardIconButton,
  CardMeta,
  CardStatusChip,
  CardSurface,
  type CardActionDefinition,
  type CardHeadingLevel,
  closeCardActionsOnEscape,
} from "@/components/ui/card-system";
import { cn } from "@/lib/cn";
import { formatDateShort } from "@/lib/formatting";
import {
  buildRoutineWeekCell,
  normalizeRoutineSummaryParts,
} from "@/lib/routine-card-copy";
import { splitRoutineSummaryParts } from "@/components/day-list/RoutineDayCardPresentation";

export type RoutineBrowseCardItem = {
  id: string;
  name: string;
  summary?: string;
  summaryParts?: string[];
  href?: string;
  isActive?: boolean;
  createdAt?: string | null;
  previewDays?: Array<{
    id: string;
    dayIndex: number;
    title: string;
    weekdayLabel: string;
    isRest: boolean;
    isCompleted?: boolean;
    isSkipped?: boolean;
    exerciseCount: number;
    splitSummary?: RoutineDayCardSummary;
  }>;
};

function MoreDotsGlyph() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5">
      {[4.5, 10, 15.5].map((cx) => <circle key={cx} cx={cx} cy="10" r="1.6" fill="currentColor" />)}
    </svg>
  );
}

/**
 * Week strip: one fixed-size cell per day (weekday, exercise count or "Rest"). It wraps onto more rows for
 * long cycles and never scrolls sideways, so nothing is clipped mid-word. The visual cells are decorative;
 * each cell carries a full-sentence description for assistive tech.
 */
export function RoutineWeekStrip({ days }: { days: NonNullable<RoutineBrowseCardItem["previewDays"]> }) {
  return (
    <ul
      aria-label="Days in this routine"
      data-routine-week-strip="true"
      className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-1.5 p-0"
    >
      {days.map((day) => {
        const cell = buildRoutineWeekCell(day);
        return (
          <li
            key={day.id}
            data-routine-week-cell={cell.isRest ? "rest" : "training"}
            className={cn(
              "grid min-h-[3rem] content-center justify-items-center gap-0.5 rounded-[0.75rem] border px-1 py-1.5 text-center",
              cell.isRest
                ? "border-[rgb(var(--warning-rgb)/0.34)] bg-[rgb(var(--warning-rgb)/0.1)]"
                : "border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-2-rgb)/0.5)]",
            )}
          >
            <span className="sr-only">{cell.description}</span>
            <span aria-hidden="true" className="text-[11px] font-semibold uppercase leading-none tracking-[0.06em] text-[rgb(var(--text-secondary)/0.95)]">
              {cell.label}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "text-sm font-semibold leading-none",
                cell.isRest ? "text-[rgb(var(--warning-rgb)/0.98)]" : "text-[rgb(var(--text-primary))]",
              )}
            >
              {cell.glyph ? <span className="mr-0.5">{cell.glyph}</span> : null}
              {cell.value}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export type RoutineBrowseCardProps = {
  routine: RoutineBrowseCardItem;
  /** Whole header opens the routine. Omit for a static card (offline list). */
  onPress?: (() => void) | undefined;
  /** Actions revealed by the "Routine actions" control (delete, set active). Omit to hide the control. */
  actions?: CardActionDefinition[];
  actionsOpen?: boolean;
  onActionsToggle?: () => void;
  showPreviewDays?: boolean;
  headingLevel?: CardHeadingLevel;
  className?: string;
};

/**
 * Routine card (routine list). Anatomy: title, ACTIVE chip, meta line (counts, last session, created date),
 * optional week strip, optional action row behind a "more" control. The header navigates; the more control
 * reveals destructive/secondary actions, so Delete is never a corner button.
 */
export function RoutineBrowseCard({
  routine,
  onPress,
  actions,
  actionsOpen = false,
  onActionsToggle,
  showPreviewDays = true,
  headingLevel = 2,
  className,
}: RoutineBrowseCardProps) {
  const actionsId = useId();
  const summaryParts = routine.summaryParts?.length
    ? routine.summaryParts
    : splitRoutineSummaryParts(routine.summary ?? "");
  const createdAt = typeof routine.createdAt === "string" ? routine.createdAt.trim() : "";
  const metaItems = [
    ...normalizeRoutineSummaryParts(summaryParts),
    createdAt ? `Created ${formatDateShort(createdAt)}` : null,
  ].filter((item): item is string => Boolean(item));
  const hasActions = Boolean(actions && actions.length > 0 && onActionsToggle);
  const previewDays = showPreviewDays ? routine.previewDays ?? [] : [];

  return (
    <CardSurface
      tone={routine.isActive ? "current" : "neutral"}
      className={className}
      data-routine-card={routine.id}
      onKeyDown={hasActions && onActionsToggle ? (event) => closeCardActionsOnEscape(event, actionsOpen, onActionsToggle) : undefined}
    >
      <CardHeader
        headingLevel={headingLevel}
        title={routine.name}
        meta={<CardMeta items={metaItems} />}
        chips={routine.isActive ? <CardChips><CardStatusChip status="active" /></CardChips> : undefined}
        interaction={onPress ? { kind: "press", onPress } : { kind: "none" }}
        trailing={hasActions ? (
          <CardIconButton
            label={`Actions for ${routine.name}`}
            aria-expanded={actionsOpen}
            aria-controls={actionsId}
            onClick={onActionsToggle}
            className={actionsOpen ? "!text-[rgb(var(--accent)/0.95)]" : undefined}
          >
            <MoreDotsGlyph />
          </CardIconButton>
        ) : undefined}
      />
      {previewDays.length > 0 ? (
        <div className="px-4 pb-3">
          <RoutineWeekStrip days={previewDays} />
        </div>
      ) : null}
      {hasActions && actionsOpen && actions ? (
        <div id={actionsId}>
          <CardActionRow actions={actions} label={`Actions for ${routine.name}`} />
        </div>
      ) : (
        <span id={actionsId} hidden />
      )}
    </CardSurface>
  );
}
