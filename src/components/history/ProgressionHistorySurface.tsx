import type { ReactNode } from "react";
import Link from "next/link";
import { ProgressionHistoryCharts } from "@/components/history/ProgressionHistoryCharts";
import { ProgressionHistoryFilters } from "@/components/history/ProgressionHistoryFilters";
import { HistoryDisclosureCard } from "@/components/history/HistoryMetricsDisclosure";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import {
  CardChip,
  CardEmptyState,
  CardHeader,
  CardMeta,
  CardSurface,
  StatGrid,
  cardTokens,
  type StatGridItem,
} from "@/components/ui/card-system";
import { cn } from "@/lib/cn";
import {
  buildLiftsThatWentUp,
  liftsUpThisMonthLabel,
  toPlainEventLabel,
  toProgressDetailCharts,
  toProgressDetailStats,
} from "@/components/history/progression-dashboard-copy";
import type { ProgressionDashboardCard, ProgressionHistoryDisplayModel, ProgressionHistoryDisplayRow } from "@/lib/progression-history-display";

/**
 * Progress tab (History redesign 2026-11-23; wave 2 SIMPLIFY #11/#12, 2026-11-26).
 *
 * Order: Filters, then "Lifts that went up" (one line per lift: name, then before -> after), then the training summary
 * the page passes in (`overview`: the cards that used to sit under the Workouts list, plus milestones), then Details
 * (total raises, lighter weeks, goals you changed, changes per month, kinds of change), then the list of changes.
 * Plain words only, no engineering labels (progression-dashboard-copy.ts). Internal ids are never printed; the source
 * workout is a link.
 */

function chipToneForRow(tone: ProgressionHistoryDisplayRow["eventTypeTone"]) {
  switch (tone) {
    case "success":
      return "success" as const;
    case "warning":
    case "destructive":
      return "attention" as const;
    default:
      return "neutral" as const;
  }
}

function toStatItem(card: ProgressionDashboardCard): StatGridItem {
  return {
    label: card.label,
    value: card.value,
    tone: card.tone === "danger" ? "warning" : card.tone === "success" ? "success" : card.tone === "muted" ? "muted" : "default",
    meta: [card.detail, card.caption].filter((line): line is string => Boolean(line?.trim())),
  };
}

export function ProgressionHistorySurface({
  dashboardCards,
  chartSections,
  filters,
  filterOptions,
  hasActiveFilters,
  filteredEventCount,
  totalEventCount,
  rows,
  overview,
}: ProgressionHistoryDisplayModel & {
  /** The training summary + milestones block (HistoryProgressOverview), shown after "Lifts that went up". */
  overview?: ReactNode;
}) {
  const lifts = buildLiftsThatWentUp(rows);
  const liftsMeta = liftsUpThisMonthLabel(dashboardCards);
  const detailStats = toProgressDetailStats(dashboardCards);
  const detailCharts = toProgressDetailCharts(chartSections);
  const hasChanges = totalEventCount > 0;

  return (
    <div data-progression-history="true" className="grid gap-2 pt-2">
      {hasChanges ? (
        <ProgressionHistoryFilters filters={filters} filterOptions={filterOptions} filteredEventCount={filteredEventCount} />
      ) : null}

      <CardSurface as="section" aria-labelledby="progress-lifts-up-heading" data-progress-lifts-up="true">
        <CardHeader title={<span id="progress-lifts-up-heading">Lifts that went up</span>} headingLevel={2} meta={liftsMeta ?? undefined} />
        <div className={cardTokens.body}>
          {lifts.length > 0 ? (
            <ul className="grid">
              {lifts.map((lift) => (
                <li
                  key={lift.exerciseName}
                  data-progress-lift={lift.exerciseName}
                  className="flex min-h-11 min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-0.5 border-b border-[rgb(var(--border-strong)/0.1)] py-1.5 last:border-b-0"
                >
                  <span className="min-w-0 truncate text-sm font-semibold text-[rgb(var(--text-primary)/0.96)]">{lift.exerciseName}</span>
                  <span className="min-w-0 text-[0.84rem] tabular-nums text-[rgb(var(--text-secondary))]">
                    {lift.before && lift.after ? (
                      <>
                        {lift.before}
                        <span aria-hidden="true"> → </span>
                        <span className="sr-only"> to </span>
                        <span className="font-semibold text-[rgb(var(--text-primary))]">{lift.after}</span>
                      </>
                    ) : (lift.after ?? lift.before ?? "Went up")}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm leading-6 text-[rgb(var(--text-secondary))]">
              {hasActiveFilters
                ? "No lifts went up for these filters."
                : "Nothing yet. When the app raises a goal after a strong workout, the lift shows here with its old and new goal."}
            </p>
          )}
        </div>
      </CardSurface>

      {overview}

      {hasChanges ? (
        <div data-progress-details="true">
          <HistoryDisclosureCard title="Details" summaryItems={["Lighter weeks, goals you changed, changes per month"]} headingLevel={2}>
            <div className="grid gap-3">
              {detailStats.length > 0 ? <StatGrid items={detailStats.map(toStatItem)} /> : null}
              {rows.length > 0 && detailCharts.length > 0 ? <ProgressionHistoryCharts sections={detailCharts} /> : null}
            </div>
          </HistoryDisclosureCard>
        </div>
      ) : null}

      {hasChanges ? (
        <section aria-labelledby="progression-ledger-heading" className="grid gap-2">
          <h2 id="progression-ledger-heading" className="px-1 pt-2 text-[11px] font-semibold uppercase leading-4 tracking-[0.12em] text-[rgb(var(--text-secondary)/0.92)]">
            Changes · {rows.length}
          </h2>
          {rows.length > 0 ? (
            <ul className="grid gap-2">
              {rows.map((row) => (
                <li key={row.id}>
                  <CardSurface
                    as="article"
                    data-progression-history-row={row.id}
                    data-progression-history-event-type={row.eventTypeValue}
                  >
                    <CardHeader
                      title={row.exerciseName}
                      headingLevel={3}
                      meta={<CardMeta flush items={[row.createdAtLabel, ...(row.routineName ? [row.routineName] : [])]} />}
                      trailing={<CardChip tone={chipToneForRow(row.eventTypeTone)}>{toPlainEventLabel(row.eventTypeValue, row.eventTypeLabel)}</CardChip>}
                    />
                    <div className={cn(cardTokens.body, "grid gap-2")}>
                      <p className="text-sm leading-6 text-[rgb(var(--text-primary)/0.95)]">{row.targetChangeSummary}</p>
                      {row.stepSummary || row.reason ? (
                        <dl className="grid gap-1 text-[0.84rem] leading-5">
                          {row.stepSummary ? (
                            <div className="flex min-w-0 gap-2">
                              <dt className="shrink-0 text-[rgb(var(--text-muted))]">Step</dt>
                              <dd className="min-w-0 break-words text-[rgb(var(--text-secondary))]">{row.stepSummary}</dd>
                            </div>
                          ) : null}
                          {row.reason ? (
                            <div className="flex min-w-0 gap-2">
                              <dt className="shrink-0 text-[rgb(var(--text-muted))]">Why</dt>
                              <dd className="min-w-0 break-words text-[rgb(var(--text-secondary))]">{row.reason}</dd>
                            </div>
                          ) : null}
                        </dl>
                      ) : null}
                      <CardMeta flush items={[`Recorded ${row.createdAtFullLabel}`]} />
                      {row.sourceSessionId ? (
                        <Link
                          href={`/history/${row.sourceSessionId}`}
                          className={cn(getAppButtonClassName({ variant: "tertiary", size: "sm" }), "justify-self-start")}
                        >
                          Open workout
                        </Link>
                      ) : null}
                    </div>
                  </CardSurface>
                </li>
              ))}
            </ul>
          ) : (
            <CardEmptyState
              headingLevel={3}
              title="No changes match"
              body={hasActiveFilters ? "Remove a filter to see the rest of your changes." : "No changes to show right now."}
              action={hasActiveFilters ? (
                <Link href="/history/progression" className={getAppButtonClassName({ variant: "secondary", size: "sm" })}>
                  Clear filters
                </Link>
              ) : undefined}
            />
          )}
        </section>
      ) : null}
    </div>
  );
}
