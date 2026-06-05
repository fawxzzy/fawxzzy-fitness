import { SurfaceMetricGrid, type MetricDatum } from "@/components/ui/MetricItem";

export function ExerciseSurfaceMetricGrid({ items }: { items: MetricDatum[] }) {
  return <SurfaceMetricGrid items={items} />;
}
