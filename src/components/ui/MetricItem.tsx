import type { CSSProperties, ReactNode } from "react";
import { appTokens } from "@/components/ui/app/tokens";
import { AccentDotSeparatedText, SignatureDot } from "@/components/ui/app/SignatureSeparator";
import { cn } from "@/lib/cn";

export type MetricDatum = {
  label: string;
  value: string;
  valueNode?: ReactNode;
  delta?: string | null;
  timeframe?: string | null;
  trend?: string | null;
  valuePrefix?: string | null;
  valueTone?: "default" | "success" | "danger" | "muted";
};

type MetricLabelPlacement = "top" | "bottom-right";
export type MetricAccentBarVariant = "metric" | "thin" | "compact";

export function MetricAccentBar({
  className,
  variant = "metric",
}: {
  className?: string;
  variant?: MetricAccentBarVariant;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        variant === "thin"
          ? "block h-px w-full rounded-full bg-[linear-gradient(90deg,rgb(var(--metric-accent-rgb)/0.14),rgb(var(--metric-accent-rgb)/0.85),rgb(var(--metric-accent-rgb)/0.14))] shadow-[0_0_14px_rgb(var(--metric-accent-rgb)/0.16)]"
          : variant === "compact"
            ? "block h-[2px] w-full rounded-full bg-[linear-gradient(90deg,rgb(var(--metric-accent-rgb)/0.16),rgb(var(--metric-accent-rgb)/0.82),rgb(var(--metric-accent-rgb)/0.16))] shadow-[0_0_12px_rgb(var(--metric-accent-rgb)/0.14)]"
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
  const normalizedValue = String(value);
  if (
    !normalizedValue.includes("|")
    && !normalizedValue.includes("•")
    && !normalizedValue.includes("â€¢")
    && !normalizedValue.includes("Ã¢â‚¬Â¢")
  ) {
    return <span>{value}</span>;
  }

  return (
    <AccentDotSeparatedText
      text={normalizedValue}
      className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1"
    />
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

type AdaptiveMetricDensityTier = "micro" | "compact" | "standard" | "wide" | "full";

function estimateAdaptiveMetricWeight(item: MetricDatum) {
  const pipeSegments = item.value
    .split("|")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const labelLength = item.label.trim().length;
  const valueLength = item.value.trim().length;
  const metaLength = [item.delta, item.timeframe, item.trend]
    .filter((part): part is string => Boolean(part))
    .reduce((total, part) => total + part.trim().length, 0);
  const structuralPenalty = (item.value.includes("|") ? 4 + pipeSegments.length * 2 : 0)
    + (item.delta || item.timeframe || item.trend ? 6 : 0)
    + (item.valuePrefix ? 2 : 0);

  return labelLength + valueLength + metaLength + structuralPenalty;
}

function getAdaptiveMetricDensityTier(item: MetricDatum): AdaptiveMetricDensityTier {
  const weight = estimateAdaptiveMetricWeight(item);

  if (weight <= 10) return "micro";
  if (weight <= 18) return "compact";
  if (weight <= 28) return "standard";
  if (weight <= 40) return "wide";
  return "full";
}

function getAdaptiveMetricWidthClassName(item: MetricDatum, totalItems: number) {
  const tier = getAdaptiveMetricDensityTier(item);
  const pipeSegments = item.value
    .split("|")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (
    pipeSegments.length >= 4
    || (pipeSegments.length >= 3 && item.value.trim().length >= 24)
    || pipeSegments.some((segment) => segment.length >= 14)
  ) {
    return "basis-full";
  }

  if (totalItems <= 1) return "basis-full";
  if (totalItems === 2) {
    switch (tier) {
      case "micro":
        return "basis-[5.1rem]";
      case "compact":
        return "basis-[5.9rem]";
      case "standard":
        return "basis-[6.85rem]";
      case "wide":
        return "basis-[7.7rem]";
      default:
        return "basis-full";
    }
  }

  switch (tier) {
    case "micro":
      return "basis-[4.35rem]";
    case "compact":
      return "basis-[5rem]";
    case "standard":
      return "basis-[5.9rem]";
    case "wide":
      return "basis-[6.9rem]";
    default:
      return "basis-full";
  }
}

function estimateMetricStripWeight(item: MetricDatum) {
  const labelLength = item.label.trim().length;
  const valueLength = item.value.trim().length;
  const metaLength = [item.delta, item.timeframe, item.trend]
    .filter((part): part is string => Boolean(part))
    .reduce((total, part) => total + part.trim().length, 0);
  const structuralPenalty = (item.value.includes("|") ? 4 : 0)
    + (item.delta || item.timeframe || item.trend ? 4 : 0)
    + (item.valuePrefix ? 2 : 0);

  return labelLength + valueLength + metaLength + structuralPenalty;
}

type MetricStripDensityTier = "micro" | "compact" | "standard" | "wide" | "full";

function getMetricStripDensityTier(item: MetricDatum): MetricStripDensityTier {
  const weight = estimateMetricStripWeight(item);

  if (weight <= 10) return "micro";
  if (weight <= 18) return "compact";
  if (weight <= 28) return "standard";
  if (weight <= 40) return "wide";
  return "full";
}

function getMetricStripSpanClassName(item: MetricDatum, totalItems: number) {
  const tier = getMetricStripDensityTier(item);

  if (totalItems <= 1) return "col-span-12";
  if (totalItems === 2) return tier === "full" ? "col-span-12" : "col-span-6";

  switch (tier) {
    case "micro":
      return "col-span-2";
    case "compact":
      return "col-span-3";
    case "standard":
      return "col-span-4";
    case "wide":
      return "col-span-6";
    default:
      return "col-span-12";
  }
}

function getMetricStripTierClassNames(item: MetricDatum) {
  const tier = getMetricStripDensityTier(item);

  switch (tier) {
    case "micro":
      return {
        shell: "min-h-[4.15rem] rounded-[0.92rem] px-2.5 pt-2.25 pb-2",
        label: "text-[9px] leading-[1.18]",
        value: "text-[12px] leading-[1.18]",
        meta: "text-[9px] leading-[1.24]",
      };
    case "compact":
      return {
        shell: "min-h-[4.45rem] rounded-[0.96rem] px-3 pt-2.5 pb-2.1",
        label: "text-[9.5px] leading-[1.2]",
        value: "text-[12.5px] leading-[1.22]",
        meta: "text-[9.5px] leading-[1.28]",
      };
    case "standard":
      return {
        shell: "min-h-[4.8rem] rounded-[1rem] px-3.25 pt-2.75 pb-2.2",
        label: "text-[10px] leading-[1.22]",
        value: "text-[13px] leading-[1.24]",
        meta: "text-[10px] leading-[1.32]",
      };
    case "wide":
      return {
        shell: "min-h-[5rem] rounded-[1rem] px-3.5 pt-3 pb-2.5",
        label: "text-[10px] leading-[1.24]",
        value: "text-[13px] leading-[1.26]",
        meta: "text-[10px] leading-[1.36]",
      };
    default:
      return {
        shell: "min-h-[5.2rem] rounded-[1rem] px-3.75 pt-3.1 pb-2.6",
        label: "text-[10px] leading-[1.24]",
        value: "text-[13px] leading-[1.28]",
        meta: "text-[10px] leading-[1.38]",
      };
  }
}

function MetricChrome({
  children,
  className,
  style,
  accentBarVariant = "metric",
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  accentBarVariant?: MetricAccentBarVariant;
}) {
  if (accentBarVariant === "thin") {
    return (
      <div
        className={cn(
          appTokens.workoutMetricChrome,
          "relative flex min-h-0 flex-col items-start justify-start overflow-visible border-transparent bg-transparent shadow-none ring-0 backdrop-blur-0",
          className,
        )}
        style={style}
      >
        <div className="flex min-h-0 w-full flex-1 flex-col">
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
      style={style}
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
        className="inline-block h-[2px] w-[10px] rounded-full bg-[rgb(var(--accent-yellow-on))]"
      />
    );
  }

  return <span aria-hidden="true">{valuePrefix}</span>;
}

export function MetricItem({
  item,
  className,
  style,
  valueClassName,
  labelClassName,
  labelSlotClassName,
  labelPlacement = "top",
  accentBarVariant = "metric",
}: {
  item: MetricDatum;
  className?: string;
  style?: CSSProperties;
  valueClassName?: string;
  labelClassName?: string;
  labelSlotClassName?: string;
  labelPlacement?: MetricLabelPlacement;
  accentBarVariant?: MetricAccentBarVariant;
}) {
  const metaParts = [item.delta, item.timeframe, item.trend].filter((part): part is string => Boolean(part));
  const valueToneClassName = resolveMetricValueToneClassName(item.valueTone);
  const contentUnderline = accentBarVariant === "thin"
    ? <MetricAccentBar variant="thin" className="mt-1.5 w-full self-center" />
    : null;
  const valueNode = (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", valueToneClassName)}>
      {renderMetricValuePrefix(item.valuePrefix)}
      {item.valueNode ?? <MetricValueLine value={item.value} />}
    </span>
  );

  if (labelPlacement === "bottom-right") {
    return (
      <MetricChrome
        className={cn("min-h-[4.65rem] justify-between", className)}
        accentBarVariant={accentBarVariant}
        style={style}
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
            {contentUnderline}
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
      style={style}
    >
      <div className={cn("flex min-h-[2.1rem] w-full items-start justify-center overflow-hidden", labelSlotClassName)}>
        <p className={cn(appTokens.workoutMetricLabel, "block w-full px-px pt-px text-center leading-[1.02]", labelClassName)}>
          {item.label}
        </p>
      </div>
      <div className="mt-[1px] flex w-full min-h-0 flex-1 items-end justify-center self-start">
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
          {contentUnderline}
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
  labelSlotClassName,
  labelPlacement = "top",
  itemClassName,
  itemStyle,
  accentBarVariant = "metric",
}: {
  items: MetricDatum[];
  className?: string;
  compact?: boolean;
  autoColumns?: boolean;
  labelClassName?: string;
  labelSlotClassName?: string;
  labelPlacement?: MetricLabelPlacement;
  itemClassName?: string;
  itemStyle?: CSSProperties;
  accentBarVariant?: MetricAccentBarVariant;
}) {
  if (items.length === 0) return null;

  if (autoColumns) {
    return (
      <div className={cn("flex flex-wrap justify-center gap-1.25", className)}>
        {items.map((item) => (
          <MetricItem
            key={`${item.label}-${item.value}`}
            item={item}
            className={cn(
              getAdaptiveMetricWidthClassName(item, items.length),
              compact ? appTokens.workoutMetricCompact : undefined,
              itemClassName,
            )}
            valueClassName={compact ? appTokens.workoutMetricValueCompact : undefined}
            labelClassName={labelClassName}
            labelSlotClassName={labelSlotClassName}
            labelPlacement={labelPlacement}
            style={itemStyle}
            accentBarVariant={accentBarVariant}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn(appTokens.workoutMetricGrid, className)}>
      {items.map((item, index) => (
        <MetricItem
          key={`${item.label}-${item.value}`}
          item={item}
          className={cn(
            getAutoMetricSpanClassName(items.length, index),
            compact ? appTokens.workoutMetricCompact : undefined,
            itemClassName,
          )}
          valueClassName={compact ? appTokens.workoutMetricValueCompact : undefined}
          labelClassName={labelClassName}
          labelSlotClassName={labelSlotClassName}
          labelPlacement={labelPlacement}
          style={itemStyle}
          accentBarVariant={accentBarVariant}
        />
      ))}
    </div>
  );
}

export function SurfaceMetricGrid({
  items,
  className,
  itemClassName,
  itemStyle,
  labelClassName,
  labelSlotClassName,
  accentBarVariant = "thin",
  autoColumns = true,
}: {
  items: MetricDatum[];
  className?: string;
  itemClassName?: string;
  itemStyle?: CSSProperties;
  labelClassName?: string;
  labelSlotClassName?: string;
  accentBarVariant?: MetricAccentBarVariant;
  autoColumns?: boolean;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <MetricGrid
      items={items}
      compact
      autoColumns={autoColumns}
      className={cn("min-w-0", autoColumns ? "gap-1.25" : undefined, className)}
      itemClassName={cn("min-h-[2.8rem] px-2.75 py-1", itemClassName)}
      itemStyle={itemStyle}
      labelClassName={cn("text-[rgb(var(--accent-divider-rgb)/0.92)]", labelClassName)}
      labelSlotClassName={labelSlotClassName}
      accentBarVariant={accentBarVariant}
    />
  );
}

export function MetricStrip({
  items,
  className,
  accentBarVariant = "metric",
}: {
  items: MetricDatum[];
  className?: string;
  accentBarVariant?: MetricAccentBarVariant;
}) {
  if (items.length === 0) return null;

  return (
    <div className={cn("grid grid-cols-12 grid-flow-row-dense gap-1.25", className)}>
      {items.map((item) => {
        const tierClassNames = getMetricStripTierClassNames(item);
        const contentUnderline = accentBarVariant === "thin"
          ? <MetricAccentBar variant="thin" className="mt-1.5 w-full self-center" />
          : null;

        return (
          <MetricChrome
            key={`${item.label}-${item.value}`}
            className={cn(
              appTokens.workoutMetricStrip,
              getMetricStripSpanClassName(item, items.length),
              "items-center text-center",
              tierClassNames.shell,
            )}
            accentBarVariant={accentBarVariant}
          >
            <div className="flex w-fit min-w-0 max-w-full flex-col items-center justify-start self-center text-center">
              <p className={cn(appTokens.workoutMetricLabel, "block w-full px-0.5 pt-0.5 text-center", tierClassNames.label)}>
                {item.label}
              </p>
              <p className={cn(appTokens.workoutMetricValue, "mt-0.5 block w-full px-px pb-px text-center", tierClassNames.value, resolveMetricValueToneClassName(item.valueTone))}>
                <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
                  {renderMetricValuePrefix(item.valuePrefix)}
                  {item.valueNode ?? <MetricValueLine value={item.value} />}
                </span>
              </p>
              {item.delta || item.timeframe ? (
                <MetricMetaLine
                  parts={[item.delta, item.timeframe].filter((value): value is string => Boolean(value))}
                  className={cn(appTokens.workoutMetricStripMeta, "w-full justify-center px-px pb-px text-center", tierClassNames.meta)}
                />
              ) : null}
              {contentUnderline}
            </div>
          </MetricChrome>
        );
      })}
    </div>
  );
}
