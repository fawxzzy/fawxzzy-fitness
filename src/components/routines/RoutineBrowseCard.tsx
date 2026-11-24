"use client";

import { Menu, type MenuItem } from "@/components/ui/Menu";
import type { RoutineDayCardSummary } from "@/components/day-list/RoutineDayCardPresentation";
import {
  CardChips,
  CardHeader,
  CardMeta,
  CardStatusChip,
  CardSurface,
  type CardActionDefinition,
  type CardHeadingLevel,
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
  /** Actions listed in the card's kebab Menu (set active, delete). Omit to hide the menu. */
  actions?: CardActionDefinition[];
  showPreviewDays?: boolean;
  headingLevel?: CardHeadingLevel;
  className?: string;
};

/**
 * Routine card (routine list). Anatomy: title, ACTIVE chip, meta line (counts, last session, created date),
 * optional week strip, optional kebab Menu. The header navigates; the Menu lists the secondary actions and the
 * destructive one (danger tone, last), so Delete is never a loose corner button.
 */
export function RoutineBrowseCard({
  routine,
  onPress,
  actions,
  showPreviewDays = true,
  headingLevel = 2,
  className,
}: RoutineBrowseCardProps) {
  const summaryParts = routine.summaryParts?.length
    ? routine.summaryParts
    : splitRoutineSummaryParts(routine.summary ?? "");
  const createdAt = typeof routine.createdAt === "string" ? routine.createdAt.trim() : "";
  const metaItems = [
    ...normalizeRoutineSummaryParts(summaryParts),
    createdAt ? `Created ${formatDateShort(createdAt)}` : null,
  ].filter((item): item is string => Boolean(item));
  const menuItems: MenuItem[] = (actions ?? [])
    .map((action) => ({
      id: action.key,
      label: typeof action.label === "string" ? action.label : action.ariaLabel ?? action.key,
      onSelect: action.onPress,
      disabled: action.disabled,
      tone: action.intent === "danger" ? ("danger" as const) : ("default" as const),
    }))
    // Safe action first, destructive last (the Menu convention).
    .sort((a, b) => Number(a.tone === "danger") - Number(b.tone === "danger"));
  const hasActions = menuItems.length > 0;
  const previewDays = showPreviewDays ? routine.previewDays ?? [] : [];

  return (
    <CardSurface
      tone={routine.isActive ? "current" : "neutral"}
      className={className}
      data-routine-card={routine.id}
    >
      <CardHeader
        headingLevel={headingLevel}
        title={routine.name}
        meta={<CardMeta items={metaItems} />}
        chips={routine.isActive ? <CardChips><CardStatusChip status="active" /></CardChips> : undefined}
        interaction={onPress ? { kind: "press", onPress } : { kind: "none" }}
        trailing={hasActions ? <Menu label={`Actions for ${routine.name}`} items={menuItems} /> : undefined}
      />
      {previewDays.length > 0 ? (
        <div className="px-4 pb-3">
          <RoutineWeekStrip days={previewDays} />
        </div>
      ) : null}
    </CardSurface>
  );
}
