"use client";

import type { ReactNode } from "react";
import { InlineHintInput } from "@/components/ui/InlineHintInput";
import { cn } from "@/lib/cn";
import type { MeasurementMetrics, MeasurementValues } from "@/components/ui/measurements/ModifyMeasurements";

const METRIC_LABELS: Record<keyof MeasurementMetrics, string> = {
  reps: "Reps",
  weight: "Weight",
  time: "Time",
  distance: "Distance",
  calories: "Calories",
};

const toggleBaseClassName = "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors";
const unitSelectClassName = "min-h-11 rounded-xl border border-border/60 bg-surface-2-soft px-3 py-2 text-sm text-text";

export function MeasurementConfigurator({
  values,
  activeMetrics,
  isExpanded: _isExpanded,
  onExpandedChange: _onExpandedChange,
  onMetricToggle,
  onChange,
  names,
  className,
  heading = "Measurements",
  description,
  collapsedLabel: _collapsedLabel = "Optional measurements",
  collapsedDescription: _collapsedDescription = "Show only the fields this workout actually needs.",
  hideInputsWhenCollapsed: _hideInputsWhenCollapsed = false,
  showHeader = true,
  leadingContent,
  trailingContent,
}: {
  values: MeasurementValues;
  activeMetrics: MeasurementMetrics;
  isExpanded: boolean;
  onExpandedChange: (nextValue: boolean) => void;
  onMetricToggle: (metric: keyof MeasurementMetrics) => void;
  onChange: (patch: Partial<MeasurementValues>) => void;
  names?: Partial<Record<"reps" | "weight" | "duration" | "distance" | "calories" | "weightUnit" | "distanceUnit", string>>;
  className?: string;
  heading?: string;
  description?: string;
  collapsedLabel?: string;
  collapsedDescription?: string;
  hideInputsWhenCollapsed?: boolean;
  showHeader?: boolean;
  leadingContent?: ReactNode;
  trailingContent?: ReactNode;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {showHeader ? (
        <div className="space-y-0.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{heading.toUpperCase()}</p>
          {description ? <p className="text-xs text-muted">{description}</p> : null}
        </div>
      ) : null}

      {leadingContent}

      <div className="flex flex-wrap gap-2">
        {(Object.keys(METRIC_LABELS) as Array<keyof MeasurementMetrics>).map((metric) => (
          <button
            key={metric}
            type="button"
            onClick={() => onMetricToggle(metric)}
            className={cn(
              toggleBaseClassName,
              activeMetrics[metric]
                ? "border-accent/25 bg-accent/10 text-text"
                : "border-border/35 bg-transparent text-muted hover:bg-[rgb(var(--bg)/0.28)]",
            )}
          >
            {METRIC_LABELS[metric]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {activeMetrics.reps ? (
          <div className="col-span-2">
              <InlineHintInput name={names?.reps} type="number" min={0} value={values.reps} onChange={(event) => onChange({ reps: event.target.value })} hint="reps" />
          </div>
        ) : null}
        {activeMetrics.weight ? (
          <div className="col-span-2">
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <InlineHintInput name={names?.weight} type="number" min={0} step="0.5" value={values.weight} onChange={(event) => onChange({ weight: event.target.value })} hint="weight" />
              <select name={names?.weightUnit} value={values.weightUnit} onChange={(event) => onChange({ weightUnit: event.target.value === "kg" ? "kg" : "lbs" })} className={unitSelectClassName}>
                <option value="lbs">lbs</option>
                <option value="kg">kg</option>
              </select>
            </div>
          </div>
        ) : null}
        {activeMetrics.time ? (
          <div className="col-span-2">
            <InlineHintInput name={names?.duration} type="text" inputMode="numeric" value={values.duration} onChange={(event) => onChange({ duration: event.target.value })} hint="mm:ss" />
          </div>
        ) : null}
        {activeMetrics.distance ? (
          <div className="col-span-2">
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <InlineHintInput name={names?.distance} type="number" min={0} step="0.01" value={values.distance} onChange={(event) => onChange({ distance: event.target.value })} hint="distance" />
              <select name={names?.distanceUnit} value={values.distanceUnit} onChange={(event) => onChange({ distanceUnit: event.target.value as "mi" | "km" | "m" })} className={unitSelectClassName}>
                <option value="mi">mi</option>
                <option value="km">km</option>
                <option value="m">m</option>
              </select>
            </div>
          </div>
        ) : null}
        {activeMetrics.calories ? (
          <div className="col-span-2">
            <InlineHintInput name={names?.calories} type="number" min={0} step="1" value={values.calories} onChange={(event) => onChange({ calories: event.target.value })} hint="cal" />
          </div>
        ) : null}
      </div>
      {trailingContent ? <div>{trailingContent}</div> : null}
    </div>
  );
}
