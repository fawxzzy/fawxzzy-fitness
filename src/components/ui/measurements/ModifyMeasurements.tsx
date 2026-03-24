"use client";

import { MeasurementConfigurator } from "@/components/ui/measurements/MeasurementConfigurator";

export type MeasurementMetrics = {
  reps: boolean;
  weight: boolean;
  time: boolean;
  distance: boolean;
  calories: boolean;
};

export type MeasurementValues = {
  reps: string;
  repsMax?: string;
  weight: string;
  duration: string;
  distance: string;
  calories: string;
  weightUnit: "lbs" | "kg";
  distanceUnit: "mi" | "km" | "m";
};

export function ModifyMeasurements({
  values,
  activeMetrics,
  isExpanded,
  onExpandedChange,
  onMetricToggle,
  onChange,
  tapFeedbackClass = "",
  showHeader = true,
}: {
  values: MeasurementValues;
  activeMetrics: MeasurementMetrics;
  isExpanded: boolean;
  onExpandedChange: (nextValue: boolean) => void;
  onMetricToggle: (metric: keyof MeasurementMetrics) => void;
  onChange: (patch: Partial<MeasurementValues>) => void;
  tapFeedbackClass?: string;
  showHeader?: boolean;
}) {
  return <MeasurementConfigurator values={values} activeMetrics={activeMetrics} isExpanded={isExpanded} onExpandedChange={onExpandedChange} onMetricToggle={onMetricToggle} onChange={onChange} className={tapFeedbackClass} heading="MEASUREMENTS" description={undefined} collapsedLabel="Optional measurements" collapsedDescription="Show only the fields you need for this set." showHeader={showHeader} />;
}
