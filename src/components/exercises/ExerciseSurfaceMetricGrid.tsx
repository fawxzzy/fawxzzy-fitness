import { AccentDotSeparatedText } from "@/components/ui/app/SignatureSeparator";
import { type MetricDatum } from "@/components/ui/MetricItem";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";

function renderMetricMetaLine(parts: string[]) {
  if (parts.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-px text-[10px] font-medium leading-[1.02] text-[rgb(var(--text-muted)/0.82)]">
      {parts.map((part, index) => (
        <div key={`${part}-${index}`} className="flex min-w-0 items-center gap-2">
          {index > 0 ? <span className="h-1 w-1 rounded-full bg-[rgb(var(--accent-divider-rgb)/0.8)]" aria-hidden="true" /> : null}
          <p className="min-w-0">{part}</p>
        </div>
      ))}
    </div>
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

  if (valuePrefix === "\u2191" || valuePrefix === "â†‘") {
    return (
      <span
        aria-hidden="true"
        className="inline-block h-0 w-0 border-x-[5px] border-x-transparent border-b-[7px] border-b-current translate-y-[-1px]"
      />
    );
  }

  if (valuePrefix === "\u2193" || valuePrefix === "â†“") {
    return (
      <span
        aria-hidden="true"
        className="inline-block h-0 w-0 border-x-[5px] border-x-transparent border-t-[7px] border-t-current translate-y-[1px]"
      />
    );
  }

  if (valuePrefix === "\u2192" || valuePrefix === "â†’") {
    return (
      <span
        aria-hidden="true"
        className="inline-block h-[2px] w-[10px] rounded-full bg-[rgb(var(--accent-yellow-on))]"
      />
    );
  }

  return <span aria-hidden="true">{valuePrefix}</span>;
}

function renderMetricValueNode(item: MetricDatum) {
  if (item.valueNode) {
    return item.valueNode;
  }

  const normalizedValue = String(item.value);
  if (
    normalizedValue.includes("|")
    || normalizedValue.includes("â€¢")
    || normalizedValue.includes("Ã¢â‚¬Â¢")
    || normalizedValue.includes("ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢")
  ) {
    return (
      <AccentDotSeparatedText
        text={normalizedValue}
        className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1"
      />
    );
  }

  return <span>{item.value}</span>;
}

export function ExerciseSurfaceMetricGrid({ items }: { items: MetricDatum[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-6 gap-1">
      {items.map((item, index) => {
        const metaParts = [item.delta, item.timeframe, item.trend].filter((part): part is string => Boolean(part));

        return (
          <div
            key={`${item.label}-${item.value}-${index}`}
            className={cn(
              getAutoMetricSpanClassName(items.length, index),
              appTokens.workoutMetricChrome,
              appTokens.workoutMetricCompact,
              "flex min-h-[2.8rem] flex-col items-center justify-start overflow-hidden border-transparent bg-[linear-gradient(90deg,rgb(var(--metric-accent-rgb)/0.14),rgb(var(--metric-accent-rgb)/0.85),rgb(var(--metric-accent-rgb)/0.14))] bg-[length:100%_1px] bg-no-repeat [background-position:0_100%] px-2.75 py-1 shadow-none ring-0 backdrop-blur-0",
            )}
          >
            <p className={cn(appTokens.workoutMetricLabel, "block w-full px-px pt-px text-center leading-[1.02] text-[rgb(var(--accent)/0.92)]")}>
              {item.label}
            </p>
            <div className="mt-[2px] flex w-full min-h-0 justify-center self-start pb-[0.7rem]">
              <div className="flex w-fit min-w-0 max-w-full flex-col items-center justify-start text-center">
                <p className={cn(appTokens.workoutMetricValue, appTokens.workoutMetricValueCompact, "mt-0 block px-px leading-[0.98]")}>
                  <span className={cn("inline-flex flex-wrap items-center gap-1.5", resolveMetricValueToneClassName(item.valueTone))}>
                    {renderMetricValuePrefix(item.valuePrefix)}
                    {renderMetricValueNode(item)}
                  </span>
                </p>
                {renderMetricMetaLine(metaParts)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
