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
}: {
  values: MeasurementValues;
  activeMetrics: MeasurementMetrics;
  isExpanded: boolean;
  onExpandedChange: (nextValue: boolean) => void;
  onMetricToggle: (metric: keyof MeasurementMetrics) => void;
  onChange: (patch: Partial<MeasurementValues>) => void;
  tapFeedbackClass?: string;
}) {
  return <MeasurementConfigurator values={values} activeMetrics={activeMetrics} isExpanded={isExpanded} onExpandedChange={onExpandedChange} onMetricToggle={onMetricToggle} onChange={onChange} className={tapFeedbackClass} heading="Measurements" description="Enter this set using the same measurement language used everywhere else in the app." collapsedLabel="Optional measurements" collapsedDescription="Show only the fields you need for this set." />;
}
