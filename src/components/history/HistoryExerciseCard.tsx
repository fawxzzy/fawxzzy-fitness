import type { ReactNode } from "react";
import { Glass } from "@/components/ui/Glass";
import { ChevronRightIcon } from "@/components/ui/Chevrons";
import { type CardSemanticTone, cardAccentRailClassNames, cardBadgeToneClassNames, cardShellToneClassNames } from "@/components/cardSemanticTones";
import type { MetricDatum } from "@/components/ui/MetricItem";
import { cn } from "@/lib/cn";

function HistoryMetric({
  metric,
  compact = false,
}: {
  metric: MetricDatum;
  compact?: boolean;
}) {
  return (
    <div className={cn(
      "min-w-0 rounded-[1rem] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-2-rgb)/0.46)] px-3 py-2",
      compact ? "space-y-0.5" : "space-y-1",
    )}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-muted)/0.84)]">
        {metric.label}
      </p>
      <p className={cn("text-sm font-semibold leading-[1.2] text-[rgb(var(--text)/0.96)]", compact ? "line-clamp-2" : "")}>
        {metric.value}
      </p>
      {metric.timeframe ? (
        <p className="text-[11px] leading-[1.25] text-[rgb(var(--text-muted)/0.86)]">{metric.timeframe}</p>
      ) : null}
    </div>
  );
}

export function HistoryExerciseCard({
  title,
  summaryLabel,
  summary,
  metadata,
  badgeText,
  metrics,
  density,
  tone,
  onPress,
}: {
  title: string;
  summaryLabel: string;
  summary: ReactNode;
  metadata?: ReactNode;
  badgeText?: string;
  metrics?: MetricDatum[];
  density: "compact" | "detailed";
  tone: CardSemanticTone;
  onPress: () => void;
}) {
  const hasMetrics = density === "detailed" && (metrics?.length ?? 0) > 0;

  return (
    <Glass variant="base" interactive className={cn("w-full rounded-[var(--card-radius)] text-left", cardShellToneClassNames[tone])}>
      <button
        type="button"
        className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-blue)/0.22)]"
        onClick={onPress}
      >
        <div className={cn(
          "relative overflow-hidden px-4 py-3",
          density === "compact" ? "space-y-2.5" : "space-y-3",
        )}>
          <span
            aria-hidden="true"
            className={cn("pointer-events-none absolute bottom-0 left-0 top-0 w-[4px]", cardAccentRailClassNames[tone])}
          />

          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className={cn(
                  "min-w-0 font-semibold leading-[1.08] tracking-[-0.03em] text-[rgb(var(--text)/0.98)] [text-wrap:pretty]",
                  density === "compact" ? "text-[1.02rem]" : "text-[1.08rem]",
                )}>
                  {title}
                </p>
                {badgeText ? (
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] leading-none text-[rgb(var(--text-primary)/0.9)]",
                      "border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-3-rgb)/0.92)]",
                      cardBadgeToneClassNames[tone],
                    )}
                  >
                    {badgeText}
                  </span>
                ) : null}
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.82)]">
                  {summaryLabel}
                </p>
                <p className="text-sm leading-[1.3] text-[rgb(var(--text-secondary)/0.98)] [text-wrap:pretty]">
                  {summary}
                </p>
              </div>

              {metadata ? (
                <p className="text-[11px] leading-[1.3] text-[rgb(var(--text-muted)/0.88)] [text-wrap:pretty]">
                  {metadata}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center pt-1 text-[rgb(var(--text-muted)/0.9)]">
              <ChevronRightIcon className="h-5 w-5" />
            </div>
          </div>

          {hasMetrics ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {metrics?.slice(0, 3).map((metric) => (
                <HistoryMetric key={`${metric.label}-${metric.value}`} metric={metric} compact />
              ))}
            </div>
          ) : null}
        </div>
      </button>
    </Glass>
  );
}
