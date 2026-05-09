export type LiveSetMetricKey = "reps" | "weight" | "time" | "distance" | "calories";

export type LiveSetMetricFlags = Record<LiveSetMetricKey, boolean>;

export type LiveSetDraftValues = Partial<Record<LiveSetMetricKey, string | null | undefined>>;

const STRENGTH_OPTIONAL_ORDER: LiveSetMetricKey[] = ["reps", "weight", "time", "distance", "calories"];
const CARDIO_OPTIONAL_ORDER: LiveSetMetricKey[] = ["time", "distance", "reps", "weight", "calories"];

function uniqueMetrics(metrics: LiveSetMetricKey[]) {
  return [...new Set(metrics)];
}

function hasDraftMetricValue(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

export function getLiveSetInputOrder({
  requiredMetrics,
  configuredMetrics,
  draftValues,
  isCardio,
  showAllMetrics = false,
}: {
  requiredMetrics: LiveSetMetricFlags;
  configuredMetrics: LiveSetMetricFlags;
  draftValues: LiveSetDraftValues;
  isCardio: boolean;
  showAllMetrics?: boolean;
}) {
  const contextualOrder = isCardio ? CARDIO_OPTIONAL_ORDER : STRENGTH_OPTIONAL_ORDER;
  if (showAllMetrics) {
    return {
      metricOrder: contextualOrder,
      visibleMetrics: contextualOrder,
      dimmedMetrics: [] as LiveSetMetricKey[],
    };
  }
  const required = contextualOrder.filter((metric) => requiredMetrics[metric]);
  const configured = contextualOrder.filter((metric) => configuredMetrics[metric]);
  const populated = contextualOrder.filter((metric) => hasDraftMetricValue(draftValues[metric]));
  const visibleMetrics = uniqueMetrics([...required, ...configured, ...populated]);
  const dimmedMetrics: LiveSetMetricKey[] = [];

  return {
    metricOrder: visibleMetrics,
    visibleMetrics,
    dimmedMetrics,
  };
}
