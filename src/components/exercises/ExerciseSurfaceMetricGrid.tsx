import type { CSSProperties } from "react";
import { SurfaceMetricGrid, type MetricAccentBarVariant, type MetricDatum } from "@/components/ui/MetricItem";

export function ExerciseSurfaceMetricGrid({
  items,
  className,
  itemClassName,
  itemStyle,
  labelClassName,
  labelSlotClassName,
  accentBarVariant,
  autoColumns,
  scrollable,
}: {
  items: MetricDatum[];
  className?: string;
  itemClassName?: string;
  itemStyle?: CSSProperties;
  labelClassName?: string;
  labelSlotClassName?: string;
  accentBarVariant?: MetricAccentBarVariant;
  autoColumns?: boolean;
  scrollable?: boolean;
}) {
  return (
    <SurfaceMetricGrid
      items={items}
      className={className}
      itemClassName={itemClassName}
      itemStyle={itemStyle}
      labelClassName={labelClassName}
      labelSlotClassName={labelSlotClassName}
      accentBarVariant={accentBarVariant}
      autoColumns={autoColumns}
      scrollable={scrollable}
    />
  );
}
