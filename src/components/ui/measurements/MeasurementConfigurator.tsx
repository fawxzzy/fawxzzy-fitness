"use client";

import type { ReactNode } from "react";
import { MeasurementPanelV2 } from "@/components/ui/measurements/MeasurementPanelV2";
import type { MeasurementMetrics, MeasurementValues } from "@/components/ui/measurements/ModifyMeasurements";

export function MeasurementConfigurator({
  values,
  activeMetrics,
  isExpanded,
  onExpandedChange,
  onMetricToggle,
  onChange,
  names,
  className,
  description,
  collapsedLabel,
  collapsedDescription,
  hideInputsWhenCollapsed,
  showHeader = false,
  leadingContent,
  trailingContent,
  betweenInputsAndFooterContent,
  footerContent,
  footerClassName,
  repRangeFooterContent,
  repReplacementContent,
  topField,
  auxiliaryFields,
  repRangeLabels,
  visibleMetrics,
  metricOrder,
  layoutMode,
  labelTreatment,
  showInlineStepControls,
}: {
  values: MeasurementValues;
  activeMetrics: MeasurementMetrics;
  isExpanded: boolean;
  onExpandedChange: (nextValue: boolean) => void;
  onMetricToggle?: (metric: keyof MeasurementMetrics) => void;
  onChange: (patch: Partial<MeasurementValues>) => void;
  names?: Partial<Record<"reps" | "repsMax" | "weight" | "duration" | "distance" | "calories" | "weightUnit" | "distanceUnit", string>>;
  className?: string;
  description?: string;
  collapsedLabel?: string;
  collapsedDescription?: string;
  hideInputsWhenCollapsed?: boolean;
  showHeader?: boolean;
  leadingContent?: ReactNode;
  trailingContent?: ReactNode;
  betweenInputsAndFooterContent?: ReactNode;
  footerContent?: ReactNode;
  footerClassName?: string;
  repRangeFooterContent?: ReactNode;
  repReplacementContent?: ReactNode;
  topField?: {
    title: string;
    suffix?: string;
    input: ReactNode;
    inlineLabel?: string;
    showEmptyValue?: boolean;
    hasValue?: boolean;
    labelClassName?: string;
    valueLabelClassName?: string;
    emptyValueClassName?: string;
    renderInput?: (options: { inputClassName: string }) => ReactNode;
    stepper?: {
      decrementAriaLabel: string;
      incrementAriaLabel: string;
      onDecrement: () => void;
      onIncrement: () => void;
    };
  };
  auxiliaryFields?: Array<{
    title: string;
    suffix?: string;
    input: ReactNode;
    inlineLabel?: string;
    useInlineFieldShell?: boolean;
    showEmptyValue?: boolean;
    hasValue?: boolean;
    labelClassName?: string;
    valueLabelClassName?: string;
    emptyValueClassName?: string;
    renderInput?: (options: { inputClassName: string }) => ReactNode;
    stepper?: {
      decrementAriaLabel: string;
      incrementAriaLabel: string;
      onDecrement: () => void;
      onIncrement: () => void;
    };
  }>;
  repRangeLabels?: {
    min: string;
    max: string;
  };
  visibleMetrics?: Array<keyof MeasurementMetrics>;
  metricOrder?: Array<keyof MeasurementMetrics>;
  layoutMode?: "grid" | "horizontal-scroll";
  labelTreatment?: "inline" | "floating-border";
  showInlineStepControls?: boolean;
}) {
  return (
    <MeasurementPanelV2
      values={values}
      activeMetrics={activeMetrics}
      isExpanded={isExpanded}
      onExpandedChange={onExpandedChange}
      onMetricToggle={onMetricToggle}
      onChange={onChange}
      names={names}
      className={className}
      description={description}
      collapsedLabel={collapsedLabel}
      collapsedDescription={collapsedDescription}
      hideInputsWhenCollapsed={hideInputsWhenCollapsed}
      showHeader={showHeader}
      leadingContent={leadingContent}
      trailingContent={trailingContent}
      betweenInputsAndFooterContent={betweenInputsAndFooterContent}
      footerContent={footerContent}
      footerClassName={footerClassName}
      repRangeFooterContent={repRangeFooterContent}
      repReplacementContent={repReplacementContent}
      topField={topField}
      auxiliaryFields={auxiliaryFields}
      repRangeLabels={repRangeLabels}
      visibleMetrics={visibleMetrics}
      metricOrder={metricOrder}
      layoutMode={layoutMode}
      labelTreatment={labelTreatment}
      showInlineStepControls={showInlineStepControls}
    />
  );
}
