import type { DetailSectionListItemInput, DetailSectionSignalMap, DetailSectionSignalTone } from "@/components/ui/DetailSectionList";
import type { MetricDatum } from "@/components/ui/MetricItem";
export type ExerciseInfoReviewSection = {
  title: string;
  items: DetailSectionListItemInput[];
  sectionSignal?: DetailSectionSignalTone;
  itemSignals?: DetailSectionSignalMap;
  legendSignals?: DetailSectionSignalTone[];
};

function dedupeMetricList(items: MetricDatum[]) {
  const seen = new Set<string>();
  const deduped: MetricDatum[] = [];

  for (const item of items) {
    const signature = `${item.label.toLowerCase()}::${item.value.toLowerCase()}::${(item.timeframe ?? "").toLowerCase()}`;
    if (seen.has(signature)) {
      continue;
    }
    seen.add(signature);
    deduped.push(item);
  }

  return deduped;
}

export function buildExerciseInfoSurfaceMetrics(args: {
  quickMetrics: MetricDatum[];
  performanceMetrics: MetricDatum[];
  progressMetrics: MetricDatum[];
}) {
  const metrics: MetricDatum[] = [];
  const pushMetric = (item: MetricDatum | null | undefined) => {
    if (!item || metrics.length >= 4) {
      return;
    }
    metrics.push(item);
  };

  const { quickMetrics } = args;
  const sessionsMetric = quickMetrics.find((item) => item.label === "Sessions");
  const setsMetric = quickMetrics.find((item) => item.label === "Sets");
  const lastMetric = quickMetrics.find((item) => item.label === "Last");
  const bestMetric = quickMetrics.find((item) => item.label === "Best");

  pushMetric(sessionsMetric);
  pushMetric(setsMetric);
  pushMetric(lastMetric);
  pushMetric(bestMetric);

  if (metrics.length < 4) {
    for (const item of quickMetrics) {
      if (item.label === "Last" || item.label === "Best" || item.label === "Sessions" || item.label === "Sets" || item.label === "PRs") {
        continue;
      }
      pushMetric(item);
    }
  }

  return dedupeMetricList(metrics).slice(0, 4);
}

function groupPrHistoryItems(items: string[]) {
  const groups = new Map<string, string[]>();
  const orderedDates: string[] = [];

  for (const rawItem of items) {
    const parts = rawItem.split("|").map((part) => part.trim()).filter(Boolean);
    if (parts.length < 3) {
      const fallbackDateKey = `__raw__:${rawItem}`;
      orderedDates.push(fallbackDateKey);
      groups.set(fallbackDateKey, [rawItem.trim()]);
      continue;
    }

    const date = parts.at(-1) ?? "";
    const headline = parts.slice(0, -1).join(" | ").replace(/\s+\|\s+/g, " ").trim();
    if (!groups.has(date)) {
      orderedDates.push(date);
      groups.set(date, []);
    }
    const entries = groups.get(date) ?? [];
    if (!entries.includes(headline)) {
      entries.push(headline);
    }
    groups.set(date, entries);
  }

  return orderedDates
    .map((date) => {
      const entries = groups.get(date) ?? [];
      if (date.startsWith("__raw__:")) {
        return entries[0] ?? "";
      }
      if (entries.length === 0) {
        return "";
      }
      return [date, ...entries].join(" | ");
    })
    .filter((item) => item.length > 0);
}

export function buildExerciseInfoReviewSections(args: {
  prLabel: string;
  prCount: number;
  prItems?: string[];
}) {
  const prItems = args.prItems && args.prItems.length > 0
    ? groupPrHistoryItems(args.prItems).map((item, index) => ({
        id: `pr-history-${index}`,
        primary: item,
        signals: "pr" satisfies DetailSectionSignalTone,
        tagLabels: ["PR"],
        layout: "single-column" as const,
      }))
    : [];

  return [
    ...(prItems.length > 0
      ? [{
          title: "PR History",
          items: prItems,
        } satisfies ExerciseInfoReviewSection]
      : []),
  ] satisfies ExerciseInfoReviewSection[];
}
