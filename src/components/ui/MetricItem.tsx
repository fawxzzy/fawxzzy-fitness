import type { ReactNode } from "react";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";

export type MetricDatum = {
  label: string;
  value: string;
  delta?: string | null;
  timeframe?: string | null;
  trend?: string | null;
};

function MetricChrome({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        appTokens.workoutMetricChrome,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function MetricItem({
  item,
  className,
  valueClassName,
}: {
  item: MetricDatum;
  className?: string;
  valueClassName?: string;
}) {
  const metaParts = [item.delta, item.timeframe, item.trend].filter(Boolean);

  return (
    <MetricChrome className={className}>
      <p className={appTokens.workoutMetricLabel}>
        {item.label}
      </p>
      <p className={cn(appTokens.workoutMetricValue, valueClassName)}>
        {item.value}
      </p>
      {metaParts.length > 0 ? (
        <p className={appTokens.workoutMetricMeta}>
          {metaParts.join(" | ")}
        </p>
      ) : null}
    </MetricChrome>
  );
}

export function MetricGrid({
  items,
  className,
  compact = false,
}: {
  items: MetricDatum[];
  className?: string;
  compact?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        appTokens.workoutMetricGrid,
        className,
      )}
    >
      {items.map((item) => (
        <MetricItem
          key={`${item.label}-${item.value}`}
          item={item}
          className={compact ? appTokens.workoutMetricCompact : undefined}
          valueClassName={compact ? appTokens.workoutMetricValueCompact : undefined}
        />
      ))}
    </div>
  );
}

export function MetricStrip({
  items,
  className,
}: {
  items: MetricDatum[];
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1.25", className)}>
      {items.map((item) => (
        <MetricChrome key={`${item.label}-${item.value}`} className={appTokens.workoutMetricStrip}>
          <p className={appTokens.workoutMetricLabel}>
            {item.label}
          </p>
          <p className={cn(appTokens.workoutMetricValue, "mt-0.5 text-[13px] leading-[1.18] text-[rgb(var(--text-primary)/0.96)]")}>
            {item.value}
          </p>
          {item.delta || item.timeframe ? (
            <p className={appTokens.workoutMetricStripMeta}>
              {[item.delta, item.timeframe].filter(Boolean).join(" | ")}
            </p>
          ) : null}
        </MetricChrome>
      ))}
    </div>
  );
}
