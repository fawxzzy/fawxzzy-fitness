import type { MetricDatum } from "@/components/ui/MetricItem";
import type { ExerciseAnalyticsFamily } from "@/lib/exercise-analytics-family";

export type ExerciseInfoReviewSection = {
  title: string;
  items: string[];
};

type ExerciseStatsKind = "strength" | "cardio";

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

  for (const item of args.performanceMetrics) {
    if (item.label === "Last" || item.label === "Last Best") {
      continue;
    }
    pushMetric(item);
    if (metrics.length >= 2) {
      break;
    }
  }

  const sessionsMetric = args.quickMetrics.find((item) => item.label === "Sessions");
  const setsMetric = args.quickMetrics.find((item) => item.label === "Sets");
  const prMetric = args.quickMetrics.find((item) => item.label === "PRs");
  const trendMetric = args.progressMetrics.find((item) => item.label === "Vs Previous" || item.label === "REPS" || item.label === "Weight");

  pushMetric(sessionsMetric);
  pushMetric(setsMetric);

  if (metrics.length < 4 && trendMetric) {
    pushMetric(trendMetric);
  }

  if (metrics.length < 4 && prMetric && isMeaningfulMetricValue(prMetric.value)) {
    pushMetric({
      ...prMetric,
      valueTone: prMetric.value === "0" ? "muted" : "success",
    });
  }

  if (metrics.length < 4) {
    for (const item of args.quickMetrics) {
      if (item.label === "Last" || item.label === "Best" || item.label === "Sessions" || item.label === "Sets" || item.label === "PRs") {
        continue;
      }
      pushMetric(item);
    }
  }

  return dedupeMetricList(metrics).slice(0, 4);
}

function formatExerciseInfoProgressMetric(item: MetricDatum) {
  const prefix = item.valuePrefix;
  const direction = prefix === "\u2191"
    ? "Up"
    : prefix === "\u2193"
      ? "Down"
      : prefix === "\u2192"
        ? "Matched"
        : null;

  if (item.label === "Vs Previous") {
    if (direction === "Matched") {
      return "Matched previous";
    }
    return direction ? `${direction} ${item.value} vs previous` : `${item.value} vs previous`;
  }

  if (item.label === "REPS") {
    if (direction === "Matched") {
      return "Matched previous reps";
    }
    return direction ? `${direction} ${item.value} reps vs previous` : `${item.value} reps vs previous`;
  }

  if (item.label === "Weight") {
    if (direction === "Matched") {
      return "Matched previous weight";
    }
    return direction ? `${direction} ${item.value} vs previous weight` : `${item.value} vs previous weight`;
  }

  if (item.label === "Recent Activity" || item.label === "30 Days") {
    return `${item.value} in recent history`;
  }

  if (direction === "Matched") {
    return `${item.label}: Matched`;
  }

  if (direction) {
    return `${direction} ${item.value}${item.label ? ` ${item.label.toLowerCase()}` : ""}`.trim();
  }

  return item.label ? `${item.label}: ${item.value}` : item.value;
}

export function buildExerciseInfoReviewSections(args: {
  kind: ExerciseStatsKind;
  family?: ExerciseAnalyticsFamily | null;
  lastSummary: string | null;
  bestSummary: string | null;
  prLabel: string;
  prCount: number;
  progressMetrics: MetricDatum[];
}) {
  const family = args.family ?? null;
  const isTimed = family === "timed-hold";
  const lastFallback = isTimed
    ? "No timed effort logged yet."
    : args.kind === "cardio"
      ? "No cardio effort logged yet."
      : "No logged history yet.";
  const bestFallback = isTimed
    ? "No best hold recorded yet."
    : args.kind === "cardio"
      ? "No best cardio effort recorded yet."
      : "No best effort recorded yet.";
  const progressItems = args.progressMetrics
    .map((item) => formatExerciseInfoProgressMetric(item))
    .filter(Boolean);

  if (args.prCount > 0) {
    progressItems.unshift(args.prLabel || `${args.prCount} ${args.prCount === 1 ? "PR" : "PRs"} recorded`);
  }

  const uniqueProgressItems = Array.from(new Set(progressItems)).slice(0, 4);

  return [
    {
      title: "Last",
      items: [args.lastSummary ?? lastFallback],
    },
    {
      title: "Best",
      items: [args.bestSummary ?? bestFallback],
    },
    {
      title: "Progress",
      items: uniqueProgressItems.length > 0
        ? uniqueProgressItems
        : [isTimed ? "No timed trend signal yet." : args.kind === "cardio" ? "No cardio trend signal yet." : "No progression signal yet."],
    },
  ] satisfies ExerciseInfoReviewSection[];
}
