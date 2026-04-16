import type { ReactNode } from "react";
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
        "min-w-0 rounded-[1rem] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-2-rgb)/0.54)] px-3 py-2.5",
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
      <p className="min-w-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-muted)/0.9)]">
        {item.label}
      </p>
      <p className={cn("mt-1 min-w-0 text-sm font-semibold leading-[1.2] text-[rgb(var(--text-primary)/0.98)] [text-wrap:pretty]", valueClassName)}>
        {item.value}
      </p>
      {metaParts.length > 0 ? (
        <p className="mt-1 min-w-0 text-[11px] leading-[1.35] text-[rgb(var(--text-secondary)/0.86)] [text-wrap:pretty]">
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
        "grid gap-2",
        compact ? "grid-cols-2" : "grid-cols-2",
        className,
      )}
    >
      {items.map((item) => (
        <MetricItem
          key={`${item.label}-${item.value}`}
          item={item}
          className={compact ? "px-2.5 py-2" : undefined}
          valueClassName={compact ? "text-[13px]" : undefined}
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
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {items.map((item) => (
        <MetricChrome key={`${item.label}-${item.value}`} className="min-w-[8.35rem] basis-[calc(50%-0.375rem)] flex-1 px-3 py-2">
          <p className="min-w-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-muted)/0.86)]">
            {item.label}
          </p>
          <p className="mt-0.5 min-w-0 text-[13px] font-semibold leading-[1.18] text-[rgb(var(--text-primary)/0.96)] [text-wrap:pretty]">
            {item.value}
          </p>
          {item.delta || item.timeframe ? (
            <p className="mt-1 min-w-0 text-[10px] leading-[1.3] text-[rgb(var(--text-secondary)/0.82)] [text-wrap:pretty]">
              {[item.delta, item.timeframe].filter(Boolean).join(" | ")}
            </p>
          ) : null}
        </MetricChrome>
      ))}
    </div>
  );
}
