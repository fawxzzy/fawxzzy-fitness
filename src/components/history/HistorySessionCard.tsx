"use client";

import { useMemo } from "react";
import type { SessionRecapSignal, SessionSummary } from "@/app/history/session-summary";
import { toHistoryMetaText, toHistoryStatItems } from "@/components/history/historyStats";
import { CardChip, CardChips, CardHeader, CardMeta, CardSurface, StatGrid, type CardChipTone, type CardTone } from "@/components/ui/card-system";
import { DetailSectionBlocks, type DetailSectionListItem, type DetailSectionListSection } from "@/components/ui/DetailSectionList";
import type { MetricDatum } from "@/components/ui/MetricItem";
import { cn } from "@/lib/cn";
import { formatDateShort } from "@/lib/formatting";
import { buildHistorySessionCardViewModel } from "@/lib/workout-card-view-models";

function formatWeekdayShort(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
}

function buildSessionTitleParts(session: SessionSummary) {
  const weekday = formatWeekdayShort(session.startedAt);
  const routineTitle = session.routineTitle?.trim() || "Unknown routine";
  const dayTitle = session.dayTitle?.trim() || null;
  return { weekday, routineTitle, dayTitle };
}

export type HistorySessionDetailSection = DetailSectionListSection;
export type HistorySessionRecapItemMeta = {
  exerciseName: string;
  value?: string | null;
  meta?: string | null;
  signals?: Array<"pr" | "promotion" | "regression" | "watch">;
  tagLabels?: string[];
};

export function buildRecapOnlyHistorySessionDetailSections(
  session: SessionSummary,
  prExerciseNames: string[],
  recapItemMeta?: HistorySessionRecapItemMeta[],
): HistorySessionDetailSection[] {
  const prExerciseNameSet = new Set(prExerciseNames.map((name) => name.trim()).filter(Boolean));
  const progressionSummary = session.progressionSummary ?? null;
  const progressionExerciseNameSet = new Set((progressionSummary?.affectedExerciseNames ?? []).map((name) => name.trim()).filter(Boolean));
  const bestExerciseName = session.bestLift?.exerciseName?.trim() || null;
  const recapMetaByName = new Map<string, HistorySessionRecapItemMeta | SessionRecapSignal>();
  for (const item of (recapItemMeta ?? session.recapSignals ?? [])) {
    const normalizedName = item.exerciseName.trim();
    if (normalizedName) {
      recapMetaByName.set(normalizedName, item);
    }
  }
  const recapItems: DetailSectionListItem[] = (session.exerciseNames ?? [])
    .map((name, index): DetailSectionListItem | null => {
      const normalizedName = name.trim();
      if (!normalizedName) {
        return null;
      }

      const explicitMeta = recapMetaByName.get(normalizedName);
      const signals = explicitMeta?.signals?.length
        ? explicitMeta.signals.filter((value, signalIndex, values) => values.indexOf(value) === signalIndex)
        : [
            prExerciseNameSet.has(normalizedName) ? "pr" : null,
            progressionExerciseNameSet.has(normalizedName) && (progressionSummary?.promotionCount ?? 0) > 0 ? "promotion" : null,
            progressionExerciseNameSet.has(normalizedName) && (progressionSummary?.deloadCount ?? 0) > 0 ? "regression" : null,
            progressionExerciseNameSet.has(normalizedName) && ((progressionSummary?.manualChangeCount ?? 0) > 0 || (progressionSummary?.revertCount ?? 0) > 0) ? "watch" : null,
          ].filter((value, signalIndex, values): value is "pr" | "promotion" | "regression" | "watch" => Boolean(value) && values.indexOf(value) === signalIndex);
      const tagLabels = explicitMeta?.tagLabels?.length
        ? explicitMeta.tagLabels.filter((value, tagIndex, values) => Boolean(value) && values.indexOf(value) === tagIndex)
        : [
            bestExerciseName === normalizedName ? "BEST" : null,
          ].filter((value): value is string => Boolean(value));

      return {
        id: `session-recap-${index}`,
        primary: normalizedName,
        value: explicitMeta?.value ?? null,
        meta: explicitMeta?.meta ?? null,
        signals,
        tagLabels,
        layout: signals.length + tagLabels.length > 1 ? "single-column" : "auto",
      } satisfies DetailSectionListItem;
    })
    .filter((item): item is DetailSectionListItem => item !== null);

  return recapItems.length > 0
      ? [{
        title: "Recap",
        items: recapItems,
        layout: "inline",
      } satisfies HistorySessionDetailSection]
    : [];
}


type SessionStatusChip = { label: string; tone: CardChipTone };

/** Session signals as status chips. Full words (the old PROMO / REG / EVENT abbreviations were cryptic) in the same tones. */
export function buildSessionStatusChips(session: SessionSummary): SessionStatusChip[] {
  const chips: SessionStatusChip[] = [];
  if (session.prCounts.total > 0) {
    chips.push({ label: "PR", tone: "success" });
  }

  const summary = session.progressionSummary ?? null;
  if (summary && summary.eventCount > 0) {
    const regressionCount = (summary.deloadCount ?? 0) + (summary.revertCount ?? 0);
    const watchCount = summary.watchCount ?? 0;
    if (summary.promotionCount > 0) chips.push({ label: "Promotion", tone: "success" });
    if (regressionCount > 0) chips.push({ label: "Regression", tone: "attention" });
    if (watchCount > 0) chips.push({ label: "Watch", tone: "attention" });
    if (summary.manualChangeCount > 0) chips.push({ label: "Manual", tone: "neutral" });
    if (summary.promotionCount + regressionCount + watchCount + summary.manualChangeCount === 0) {
      chips.push({ label: "Progression event", tone: "neutral" });
    }
  }

  return chips;
}

type HistorySessionCardProps = {
  session: SessionSummary;
  previousSession?: SessionSummary | null;
  /** The session the user came back from (list) - marked with the current tone and aria-current. */
  selected?: boolean;
  viewMode: "compact" | "detailed";
  /** When set, the whole header is a link to the session. */
  href?: string;
  detailedMetrics?: MetricDatum[];
  prExerciseNames?: string[];
  detailedSections?: HistorySessionDetailSection[];
  /** `hidden` renders the metrics and recap without a header (the session detail screen already shows the title). */
  detailedHeaderMode?: "default" | "hidden";
  className?: string;
};

/**
 * Session card on the card system.
 *
 *   Routine name                                      [chevron]
 *   Day title - Mon, Nov 12 - outcome - progress
 *   [PR] [Promotion]
 *   (detailed) StatGrid + recap sections
 *
 * The header is a stretched link in lists (`CardHeader` link), so the heading is not inside an anchor and the
 * body of the detailed card is never part of the link. Signals are status chips (all visible; they used to rotate
 * on a timer).
 */
export function HistorySessionCard({
  session,
  previousSession,
  selected = false,
  viewMode,
  href,
  detailedMetrics,
  prExerciseNames,
  detailedSections,
  detailedHeaderMode = "default",
  className,
}: HistorySessionCardProps) {
  const viewModel = useMemo(
    () => buildHistorySessionCardViewModel(session, previousSession),
    [previousSession, session],
  );
  const tone: CardTone = selected ? "current" : "neutral";
  const isDetailed = viewMode === "detailed";
  const hidesHeader = isDetailed && detailedHeaderMode === "hidden";
  const resolvedMetrics = detailedMetrics ?? viewModel.detailedMetrics;
  const resolvedSections = detailedSections ?? buildRecapOnlyHistorySessionDetailSections(session, prExerciseNames ?? session.prExerciseNames ?? []);
  const { weekday, routineTitle, dayTitle } = buildSessionTitleParts(session);
  const statusChips = buildSessionStatusChips(session);
  const metaItems = [
    dayTitle,
    [weekday, formatDateShort(session.startedAt)].filter(Boolean).join(", "),
    ...(isDetailed ? [] : [viewModel.outcome, viewModel.progress]),
  ]
    .filter((item): item is string => Boolean(item))
    .map(toHistoryMetaText);

  const body = isDetailed ? (
    <div data-history-session-body="true" className={cn("grid gap-4", hidesHeader ? "px-4 py-3" : "border-t border-[rgb(var(--border-strong)/0.14)] px-4 pb-4 pt-3")}>
      <StatGrid items={toHistoryStatItems(resolvedMetrics)} />
      {resolvedSections.length > 0 ? <div className="grid gap-3"><DetailSectionBlocks sections={resolvedSections} /></div> : null}
    </div>
  ) : null;

  return (
    <CardSurface
      tone={tone}
      className={className}
      data-history-card="session"
      data-history-density={viewMode}
    >
      {hidesHeader ? null : (
        <CardHeader
          headingLevel={2}
          title={routineTitle}
          meta={<CardMeta items={metaItems} />}
          chips={statusChips.length > 0 ? (
            <CardChips>
              {statusChips.map((chip) => <CardChip key={chip.label} tone={chip.tone}>{chip.label}</CardChip>)}
            </CardChips>
          ) : undefined}
          interaction={href ? { kind: "link", href, current: selected } : { kind: "none" }}
        />
      )}
      {body}
    </CardSurface>
  );
}
