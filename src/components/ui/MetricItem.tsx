import type { ReactNode } from "react";
import { appTokens } from "@/components/ui/app/tokens";
import { SignatureDot } from "@/components/ui/app/SignatureSeparator";
import { cn } from "@/lib/cn";

export type MetricDatum = {
  label: string;
  value: string;
  delta?: string | null;
  timeframe?: string | null;
  trend?: string | null;
  valuePrefix?: string | null;
  valueTone?: "default" | "success" | "danger" | "muted";
};

type MetricLabelPlacement = "top" | "bottom-right";
type MetricAccentBarVariant = "metric" | "thin";

export function MetricAccentBar({
  className,
  variant = "metric",
}: {
  className?: string;
  variant?: "metric" | "thin";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        variant === "thin"
          ? "block h-px w-full rounded-full bg-[linear-gradient(90deg,rgb(var(--metric-accent-rgb)/0.14),rgb(var(--metric-accent-rgb)/0.85),rgb(var(--metric-accent-rgb)/0.14))] shadow-[0_0_14px_rgb(var(--metric-accent-rgb)/0.16)]"
          : "mt-[0.32rem] block h-[4px] w-full rounded-full bg-[linear-gradient(90deg,rgb(var(--metric-accent-rgb)/0.55),rgb(var(--metric-accent-rgb)/1),rgb(var(--metric-accent-rgb)/0.55))] shadow-[0_0_16px_rgb(var(--metric-accent-rgb)/0.5)]",
        className,
      )}
    />
  );
}

function MetricMetaLine({
  parts,
  className,
}: {
  parts: string[];
  className?: string;
}) {
  if (parts.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1", className)}>
      {parts.map((part, index) => (
        <div key={`${part}-${index}`} className="flex min-w-0 items-center gap-2">
          {index > 0 ? <SignatureDot /> : null}
          <p className="min-w-0">{part}</p>
        </div>
      ))}
    </div>
  );
}

function MetricValueLine({
  value,
}: {
  value: string;
}) {
  const parts = value.split(" • ").map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 1) {
    return <span>{value}</span>;
  }

  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
      {parts.map((part, index) => (
        <span key={`${part}-${index}`} className="inline-flex items-center gap-2">
          {index > 0 ? <SignatureDot /> : null}
          <span>{part}</span>
        </span>
      ))}
    </span>
  );
}

function getAutoMetricSpanClassName(totalItems: number, index: number) {
  if (totalItems <= 1) return "col-span-6";
  if (totalItems === 2) return "col-span-3";
  if (totalItems === 3) return "col-span-2";

  const remainder = totalItems % 3;
  const tailStart = totalItems - remainder;

  if (remainder === 1 && index === totalItems - 1) {
    return "col-span-2 col-start-3";
  }

  if (remainder === 2 && index >= tailStart) {
    return "col-span-3";
  }

  return "col-span-2";
}

function MetricChrome({
  children,
  className,
  accentBarVariant = "metric",
}: {
  children: ReactNode;
  className?: string;
  accentBarVariant?: MetricAccentBarVariant;
}) {
  if (accentBarVariant === "thin") {
    return (
      <div
        className={cn(
          appTokens.workoutMetricChrome,
          "relative flex min-h-0 flex-col items-start justify-start overflow-hidden border-transparent bg-transparent shadow-none ring-0 backdrop-blur-0 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:block after:h-px after:rounded-full after:bg-[linear-gradient(90deg,rgb(var(--metric-accent-rgb)/0.14),rgb(var(--metric-accent-rgb)/0.85),rgb(var(--metric-accent-rgb)/0.14))] after:shadow-[0_0_14px_rgb(var(--metric-accent-rgb)/0.16)]",
          className,
        )}
      >
        <div className="flex min-h-0 w-full flex-1 flex-col pb-[0.7rem]">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        appTokens.workoutMetricChrome,
        "flex min-h-0 flex-col items-start justify-start overflow-visible border-transparent bg-transparent shadow-none ring-0 backdrop-blur-0",
        className,
      )}
    >
      <div className="flex min-h-0 w-full flex-1 flex-col">
        {children}
      </div>
      <MetricAccentBar variant={accentBarVariant} />
    </div>
  );
}

function resolveMetricValueToneClassName(tone: MetricDatum["valueTone"]) {
  switch (tone) {
    case "success":
      return "text-[rgb(var(--success-rgb)/0.94)]";
    case "danger":
      return "text-[rgb(255,116,116)]";
    case "muted":
      return "text-[rgb(var(--text-secondary)/0.82)]";
    default:
      return "text-[rgb(var(--text-primary)/0.96)]";
  }
}

function renderMetricValuePrefix(valuePrefix: string | null | undefined) {
  if (!valuePrefix) {
    return null;
  }

  if (valuePrefix === "\u2191" || valuePrefix === "↑") {
    return (
      <span
        aria-hidden="true"
        className="inline-block h-0 w-0 border-x-[5px] border-x-transparent border-b-[7px] border-b-current translate-y-[-1px]"
      />
    );
  }

  if (valuePrefix === "\u2193" || valuePrefix === "↓") {
    return (
      <span
        aria-hidden="true"
        className="inline-block h-0 w-0 border-x-[5px] border-x-transparent border-t-[7px] border-t-current translate-y-[1px]"
      />
    );
  }

  if (valuePrefix === "\u2192" || valuePrefix === "→") {
    return (
      <span
        aria-hidden="true"
        className="inline-block h-[2px] w-[10px] rounded-full bg-current"
      />
    );
  }

  return <span aria-hidden="true">{valuePrefix}</span>;
}

export function MetricItem({
  item,
  className,
  valueClassName,
  labelClassName,
  labelPlacement = "top",
  accentBarVariant = "metric",
}: {
  item: MetricDatum;
  className?: string;
  valueClassName?: string;
  labelClassName?: string;
  labelPlacement?: MetricLabelPlacement;
  accentBarVariant?: MetricAccentBarVariant;
}) {
  const metaParts = [item.delta, item.timeframe, item.trend].filter((part): part is string => Boolean(part));
  const valueToneClassName = resolveMetricValueToneClassName(item.valueTone);
  const valueNode = (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", valueToneClassName)}>
      {renderMetricValuePrefix(item.valuePrefix)}
      <MetricValueLine value={item.value} />
    </span>
  );

  if (labelPlacement === "bottom-right") {
    return (
      <MetricChrome
        className={cn("min-h-[4.65rem] justify-between", className)}
        accentBarVariant={accentBarVariant}
      >
        <div className="flex min-h-0 flex-1 self-start">
          <div className="flex w-fit min-w-0 max-w-full flex-col items-start justify-start text-left">
            <p className={cn(appTokens.workoutMetricValue, "block px-px pb-px leading-[1.14]", valueClassName)}>
              {valueNode}
            </p>
            {metaParts.length > 0 ? (
              <MetricMetaLine
                parts={metaParts}
                className={cn(appTokens.workoutMetricMeta, "mt-px px-px pb-px leading-[1.25]")}
              />
            ) : null}
          </div>
        </div>
        <p className={cn(appTokens.workoutMetricLabel, "mt-1 block self-end px-px pb-px text-right leading-[1.08]", labelClassName)}>
          {item.label}
        </p>
      </MetricChrome>
    );
  }

  return (
    <MetricChrome
      className={cn("min-h-[2.6rem] items-center justify-start", className)}
      accentBarVariant={accentBarVariant}
    >
      <p className={cn(appTokens.workoutMetricLabel, "block w-full px-px pt-px text-center leading-[1.02]", labelClassName)}>
        {item.label}
      </p>
      <div className="mt-[2px] flex w-full min-h-0 justify-center self-start">
        <div className="flex w-fit min-w-0 max-w-full flex-col items-center justify-start text-center">
          <p className={cn(appTokens.workoutMetricValue, "mt-0 block px-px leading-[0.98]", valueClassName)}>
            {valueNode}
          </p>
          {metaParts.length > 0 ? (
            <MetricMetaLine
              parts={metaParts}
              className={cn(appTokens.workoutMetricMeta, "mt-0 justify-center px-px leading-[1.02]")}
            />
          ) : null}
        </div>
      </div>
    </MetricChrome>
  );
}

export function MetricGrid({
  items,
  className,
  compact = false,
  autoColumns = false,
  labelClassName,
  labelPlacement = "top",
  itemClassName,
  accentBarVariant = "metric",
}: {
  items: MetricDatum[];
  className?: string;
  compact?: boolean;
  autoColumns?: boolean;
  labelClassName?: string;
  labelPlacement?: MetricLabelPlacement;
  itemClassName?: string;
  accentBarVariant?: MetricAccentBarVariant;
}) {
  if (items.length === 0) return null;

  const gridClassName = autoColumns
    ? "grid-cols-6"
    : appTokens.workoutMetricGrid;

  return (
    <div
      className={cn(
        autoColumns ? cn("grid gap-2", gridClassName) : appTokens.workoutMetricGrid,
        className,
      )}
    >
      {items.map((item, index) => (
        <MetricItem
          key={`${item.label}-${item.value}`}
          item={item}
          className={cn(
            autoColumns ? getAutoMetricSpanClassName(items.length, index) : undefined,
            compact ? appTokens.workoutMetricCompact : undefined,
            itemClassName,
          )}
          valueClassName={compact ? appTokens.workoutMetricValueCompact : undefined}
          labelClassName={labelClassName}
          labelPlacement={labelPlacement}
          accentBarVariant={accentBarVariant}
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
          <p className={cn(appTokens.workoutMetricLabel, "block px-px pt-px leading-[1.18]")}>
            {item.label}
          </p>
          <p className={cn(appTokens.workoutMetricValue, "mt-0.5 block px-px pb-px text-[13px] leading-[1.26] text-[rgb(var(--text-primary)/0.96)]")}>
            {item.value}
          </p>
          {item.delta || item.timeframe ? (
            <MetricMetaLine
              parts={[item.delta, item.timeframe].filter((value): value is string => Boolean(value))}
              className={cn(appTokens.workoutMetricStripMeta, "px-px pb-px leading-[1.36]")}
            />
          ) : null}
        </MetricChrome>
      ))}
    </div>
  );
}
