import { AppPanel } from "@/components/ui/app/AppPanel";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";
import type { ProgressionHistoryChartSection } from "@/lib/progression-history-display";

function ProgressionChartSection({
  section,
}: {
  section: ProgressionHistoryChartSection;
}) {
  const maxValue = section.bars.reduce((current, bar) => Math.max(current, bar.value), 0);

  return (
    <AppPanel
      className="space-y-4 px-4 py-4 sm:px-5"
      data-progression-history-chart-section={section.id}
    >
      <div className="space-y-1">
        <p className={cn(appTokens.historySectionTitle, "text-[0.98rem] text-[rgb(var(--text-primary)/0.96)]")}>
          {section.title}
        </p>
        <p className="text-[0.82rem] leading-5 text-[rgb(var(--text-secondary)/0.9)]">
          {section.description}
        </p>
      </div>

      {section.bars.length > 0 ? (
        <div className="space-y-3">
          {section.bars.map((bar) => {
            const widthPercent = maxValue > 0 ? Math.max((bar.value / maxValue) * 100, bar.value > 0 ? 8 : 0) : 0;
            return (
              <div
                key={bar.id}
                className="space-y-1.5"
                data-progression-history-chart-bar={bar.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-sm font-semibold text-[rgb(var(--text-primary)/0.95)]">
                      {bar.label}
                    </p>
                    {bar.detail ? (
                      <p className="text-[0.75rem] leading-5 text-[rgb(var(--text-muted)/0.88)]">
                        {bar.detail}
                      </p>
                    ) : null}
                  </div>
                  <p className="shrink-0 text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-secondary)/0.86)]">
                    {bar.valueLabel}
                  </p>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[rgb(var(--surface-3-rgb)/0.42)]">
                  <div
                    className="h-full rounded-full bg-[rgb(var(--accent-strong)/0.72)] transition-[width] duration-300"
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1 rounded-[1rem] border border-[rgb(var(--border-rgb)/0.42)] bg-[rgb(var(--surface-2-rgb)/0.14)] px-3.5 py-3">
          <p className="text-sm font-semibold text-[rgb(var(--text-primary)/0.94)]">
            {section.emptyTitle}
          </p>
          <p className="text-[0.8rem] leading-5 text-[rgb(var(--text-secondary)/0.88)]">
            {section.emptyCaption}
          </p>
        </div>
      )}
    </AppPanel>
  );
}

export function ProgressionHistoryCharts({
  sections,
}: {
  sections: ProgressionHistoryChartSection[];
}) {
  return (
    <div
      className="grid gap-3 xl:grid-cols-2"
      data-progression-history-charts
    >
      {sections.map((section) => (
        <ProgressionChartSection key={section.id} section={section} />
      ))}
    </div>
  );
}
