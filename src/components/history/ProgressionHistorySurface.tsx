import Link from "next/link";
import { ProgressionHistoryCharts } from "@/components/history/ProgressionHistoryCharts";
import { ProgressionHistoryFilters } from "@/components/history/ProgressionHistoryFilters";
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
import type { ProgressionDashboardCard, ProgressionHistoryDisplayModel, ProgressionHistoryDisplayRow } from "@/lib/progression-history-display";

/**
 * Progression tab (History redesign 2026-11-23, review items 4 and 10).
 *
 * Filters sit behind the shared Filters button + sheet, the summary is ONE card with a wrapping StatGrid (no tall
 * card per number), and each ledger change is one flat card: exercise, date and change chip in the header, the goal
 * change sentence, then step and reason. Internal ids are never printed; the source session is a link.
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
}: ProgressionHistoryDisplayModel) {
  return (
    <div data-progression-history="true" className="grid gap-2 pt-2">
      {totalEventCount > 0 ? (
        <ProgressionHistoryFilters filters={filters} filterOptions={filterOptions} filteredEventCount={filteredEventCount} />
      ) : null}

      {dashboardCards.length > 0 ? (
        <CardSurface as="section" aria-label="Progression summary">
          <CardHeader
            title="Progression"
            headingLevel={2}
            meta={hasActiveFilters ? `${filteredEventCount} of ${totalEventCount} changes` : `${totalEventCount} ${totalEventCount === 1 ? "change" : "changes"} recorded`}
          />
          <div className={cardTokens.body}>
            <StatGrid items={dashboardCards.map(toStatItem)} />
          </div>
        </CardSurface>
      ) : null}

      <ProgressionHistoryCharts sections={chartSections} />

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
                    trailing={<CardChip tone={chipToneForRow(row.eventTypeTone)}>{row.eventTypeLabel}</CardChip>}
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
                    <CardMeta flush items={[row.methodLabel, row.vectorLabel, `Recorded ${row.createdAtFullLabel}`]} />
                    {row.sourceSessionId ? (
                      <Link
                        href={`/history/${row.sourceSessionId}`}
                        className={cn(getAppButtonClassName({ variant: "tertiary", size: "sm" }), "justify-self-start")}
                      >
                        Open session
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
            title={totalEventCount > 0 && hasActiveFilters ? "No changes match" : "No progression yet"}
            body={totalEventCount > 0 && hasActiveFilters
              ? "Remove a filter to see the rest of your changes."
              : "Promotions, deloads, reverts and manual goal changes show here once the app applies them."}
            action={totalEventCount > 0 && hasActiveFilters ? (
              <Link href="/history/progression" className={getAppButtonClassName({ variant: "secondary", size: "sm" })}>
                Clear filters
              </Link>
            ) : undefined}
          />
        )}
      </section>
    </div>
  );
}
