import type { StatGridItem } from "@/components/ui/card-system";
import type { MetricDatum } from "@/components/ui/MetricItem";

function resolveDirection(valuePrefix: string | null | undefined): StatGridItem["direction"] {
  switch (valuePrefix) {
    case "↑":
      return "up";
    case "↓":
      return "down";
    case "→":
      return "flat";
    default:
      return undefined;
  }
}

/**
 * History builds its numbers as `MetricDatum` (shared with the exercise info sheet). This is the one place that
 * turns them into `StatGrid` items, so every History stat reads the same way.
 */
export function toHistoryStatItem(item: MetricDatum): StatGridItem {
  const meta = [item.delta, item.timeframe, item.trend].filter((part): part is string => Boolean(part));
  const prefix = item.valuePrefix && !resolveDirection(item.valuePrefix) ? `${item.valuePrefix} ` : "";

  return {
    label: item.label,
    value: `${prefix}${item.value}`,
    valueNode: item.valueNode,
    tone: item.valueTone,
    meta: meta.length > 0 ? meta : undefined,
    direction: resolveDirection(item.valuePrefix),
  };
}

export function toHistoryStatItems(items: MetricDatum[]): StatGridItem[] {
  return items.map(toHistoryStatItem);
}

/**
 * View-model sentences join their parts with " | " (`24m | 1.8 mi`). On a meta line or a stat value a pipe reads
 * as a stray character, so cards show the card-system middle dot instead.
 */
export function toHistoryMetaText(value: string) {
  return value.replace(/\s+\|\s+/g, " · ");
}
