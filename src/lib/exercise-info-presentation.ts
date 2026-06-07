import type { MetricDatum } from "@/components/ui/MetricItem";
export type ExerciseInfoReviewSection = {
  title: string;
  items: string[];
};

function isMeaningfulMetricValue(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized.length > 0 && normalized !== "0" && normalized !== "0 reps" && normalized !== "0 lbs" && normalized !== "0 kg";
}

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

export function buildExerciseInfoReviewSections(args: {
  prLabel: string;
  prCount: number;
  prItems?: string[];
}) {
  const prItems = args.prItems && args.prItems.length > 0
    ? args.prItems
    : args.prCount > 0
      ? [args.prLabel || `${args.prCount} ${args.prCount === 1 ? "PR" : "PRs"} recorded`]
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
