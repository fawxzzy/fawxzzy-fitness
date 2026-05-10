import { AppBadge } from "@/components/ui/app/AppBadge";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { ProgressionDashboardCards } from "@/components/history/ProgressionDashboardCards";
import { HistoryControlGroup, HistoryControlPanel, HistorySection } from "@/components/history/HistoryShared";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";
import type { ProgressionHistoryDisplayModel } from "@/lib/progression-history-display";
import { serializeProgressionHistoryFilters } from "@/lib/progression-history-filters";

const filterFieldClassName = "h-12 w-full rounded-[0.95rem] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-2-rgb)/0.16)] px-3 text-sm font-semibold text-[rgb(var(--text-primary)/0.96)] outline-none focus:border-[rgb(var(--accent-divider-rgb)/0.4)]";

function getBadgeTone(tone: "default" | "success" | "warning" | "destructive") {
  switch (tone) {
    case "success":
      return "success";
    case "warning":
      return "warning";
    case "destructive":
      return "destructive";
    default:
      return "default";
  }
}

export function ProgressionHistorySurface({
  dashboardCards,
  filters,
  filterOptions,
  activeFilterLabels,
  hasActiveFilters,
  filteredEventCount,
  totalEventCount,
  rows,
}: ProgressionHistoryDisplayModel) {
  const clearHref = `/history/progression${(() => {
    const search = serializeProgressionHistoryFilters({
      eventType: null,
      routineId: null,
      exerciseId: null,
      dateFrom: null,
      dateTo: null,
    }).toString();
    return search ? `?${search}` : "";
  })()}`;

  return (
    <div className="space-y-4">
      <HistorySection
        title="Progression History"
        description="Durable record of applied progression changes. Read-only until replay or mutation semantics are explicitly designed."
      >
        <div className="space-y-3">
          <HistoryControlPanel>
            <form method="get" className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <HistoryControlGroup label="Event type">
                  <select name="eventType" defaultValue={filters.eventType ?? ""} className={filterFieldClassName}>
                    <option value="">All event types</option>
                    {filterOptions.eventTypes.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </HistoryControlGroup>

                <HistoryControlGroup label="Routine">
                  <select name="routineId" defaultValue={filters.routineId ?? ""} className={filterFieldClassName}>
                    <option value="">All routines</option>
                    {filterOptions.routines.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </HistoryControlGroup>

                <HistoryControlGroup label="Exercise">
                  <select name="exerciseId" defaultValue={filters.exerciseId ?? ""} className={filterFieldClassName}>
                    <option value="">All exercises</option>
                    {filterOptions.exercises.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </HistoryControlGroup>

                <HistoryControlGroup label="From">
                  <input type="date" name="dateFrom" defaultValue={filters.dateFrom ?? ""} className={filterFieldClassName} />
                </HistoryControlGroup>

                <HistoryControlGroup label="To">
                  <input type="date" name="dateTo" defaultValue={filters.dateTo ?? ""} className={filterFieldClassName} />
                </HistoryControlGroup>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[0.82rem] leading-5 text-[rgb(var(--text-secondary)/0.9)]">
                  {hasActiveFilters
                    ? `Showing ${filteredEventCount} of ${totalEventCount} progression events.`
                    : `${totalEventCount} progression events in the durable ledger.`}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {hasActiveFilters ? (
                    <a
                      href={clearHref}
                      className="inline-flex h-11 items-center justify-center rounded-[0.95rem] border border-[rgb(var(--border-strong)/0.14)] px-4 text-sm font-semibold text-[rgb(var(--text-secondary)/0.92)]"
                    >
                      Clear filters
                    </a>
                  ) : null}
                  <button
                    type="submit"
                    className="inline-flex h-11 items-center justify-center rounded-[0.95rem] bg-[rgb(var(--accent-strong)/0.16)] px-4 text-sm font-semibold text-[rgb(var(--text-primary)/0.96)]"
                  >
                    Apply filters
                  </button>
                </div>
              </div>
            </form>

            {activeFilterLabels.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {activeFilterLabels.map((label) => (
                  <AppBadge key={label} tone="default" className="border border-[rgb(var(--border-rgb)/0.5)] bg-[rgb(var(--surface-2-rgb)/0.16)]">
                    {label}
                  </AppBadge>
                ))}
              </div>
            ) : null}
          </HistoryControlPanel>

          {hasActiveFilters ? (
            <p className="text-[0.74rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.9)]">
              Showing filtered results
            </p>
          ) : null}
          <ProgressionDashboardCards cards={dashboardCards} />
        </div>
      </HistorySection>

      <HistorySection
        title="Event Ledger"
        description="Applied changes only. Ready status and non-ready status rows do not write events here."
      >
        {rows.length > 0 ? (
          <div className="space-y-3">
            {rows.map((row) => (
              <AppPanel
                key={row.id}
                className="px-4 py-4 sm:px-5"
                data-progression-history-row={row.id}
                data-progression-history-event-type={row.eventTypeValue}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className={cn(appTokens.historySectionTitle, "text-[0.98rem] text-[rgb(var(--text-primary)/0.96)]")}>{row.exerciseName}</p>
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-[rgb(var(--text-secondary)/0.88)]">
                      {row.createdAtLabel}
                    </p>
                  </div>
                  <AppBadge tone={getBadgeTone(row.eventTypeTone)} className="shrink-0">
                    {row.eventTypeLabel}
                  </AppBadge>
                </div>

                <div className="space-y-3 pt-3">
                  <div className="flex flex-wrap gap-2 text-[0.8rem] leading-5 text-[rgb(var(--text-secondary)/0.9)]">
                    {row.routineName ? (
                      <span className="inline-flex rounded-full border border-[rgb(var(--border-rgb)/0.5)] px-2.5 py-1">
                        Routine: {row.routineName}
                      </span>
                    ) : null}
                    <span className="inline-flex rounded-full border border-[rgb(var(--border-rgb)/0.5)] px-2.5 py-1">
                      Method: {row.methodLabel}
                    </span>
                    <span className="inline-flex rounded-full border border-[rgb(var(--border-rgb)/0.5)] px-2.5 py-1">
                      Vector: {row.vectorLabel}
                    </span>
                    {row.sourceSessionId ? (
                      <span className="inline-flex break-all rounded-full border border-[rgb(var(--border-rgb)/0.5)] px-2.5 py-1">
                        Source session: {row.sourceSessionId}
                      </span>
                    ) : null}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.92)]">
                      Target change
                    </p>
                    <p className="text-sm leading-6 text-[rgb(var(--text-primary)/0.95)]">{row.targetChangeSummary}</p>
                    {row.stepSummary ? (
                      <p className="text-[0.82rem] leading-5 text-[rgb(var(--text-secondary)/0.88)]">Step: {row.stepSummary}</p>
                    ) : null}
                  </div>

                  {row.reason ? (
                    <div className="space-y-1">
                      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.92)]">
                        Reason
                      </p>
                      <p className="text-[0.84rem] leading-5 text-[rgb(var(--text-secondary)/0.92)]">{row.reason}</p>
                    </div>
                  ) : null}

                  <p className="text-[0.76rem] leading-5 text-[rgb(var(--text-muted)/0.86)]">
                    Recorded {row.createdAtFullLabel}
                  </p>
                </div>
              </AppPanel>
            ))}
          </div>
        ) : (
          <AppPanel className="px-4 py-5 sm:px-5">
            <p className={appTokens.historyRouteMessageTitle}>
              {totalEventCount === 0
                ? "No progression history yet."
                : hasActiveFilters
                  ? "No progression events match these filters."
                  : "No progression history yet."}
            </p>
            <p className={appTokens.historyRouteMessageCaption}>
              {totalEventCount === 0
                ? "Applied promotions, deloads, reverts, and manual target changes will appear here once they are recorded."
                : hasActiveFilters
                  ? "Try clearing one or more filters to see the rest of the durable event ledger."
                  : "Applied promotions, deloads, reverts, and manual target changes will appear here once they are recorded."}
            </p>
          </AppPanel>
        )}
      </HistorySection>
    </div>
  );
}
