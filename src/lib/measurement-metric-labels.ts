import type { MeasurementMetrics } from "@/components/ui/measurements/ModifyMeasurements";

export function resolveDefaultMeasurementMetricLabel(metric: keyof MeasurementMetrics, fallback: string) {
  if (metric === "time") {
    return "Time (s)";
  }

  return fallback;
}
