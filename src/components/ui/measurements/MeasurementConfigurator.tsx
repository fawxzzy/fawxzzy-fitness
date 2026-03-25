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

const toggleBaseClassName = "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] transition-colors";
const metricInputClassName = "min-h-9 w-full rounded-md border border-border/45 bg-[rgb(var(--bg)/0.28)] px-3 py-1.5 text-sm text-text placeholder:text-muted/60 focus-visible:border-accent/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20";

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
  names?: Partial<Record<"reps" | "repsMax" | "weight" | "duration" | "distance" | "calories" | "weightUnit" | "distanceUnit", string>>;
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
    <div className={cn("space-y-2.5", className)}>
      {showHeader ? (
        <div className="space-y-0.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{heading.toUpperCase()}</p>
          {description ? <p className="text-xs text-muted">{description}</p> : null}
        </div>
      ) : null}

      {leadingContent}

      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(METRIC_LABELS) as Array<keyof MeasurementMetrics>).map((metric) => (
          <button
            key={metric}
            type="button"
            onClick={() => onMetricToggle(metric)}
            className={cn(
              toggleBaseClassName,
              activeMetrics[metric]
                ? "border-accent/55 bg-accent/20 text-text shadow-[inset_0_0_0_1px_rgb(var(--accent)/0.25)]"
                : "border-border/35 bg-transparent text-muted/80 hover:bg-[rgb(var(--bg)/0.24)] hover:text-muted",
            )}
          >
            {METRIC_LABELS[metric]}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {activeMetrics.reps ? (
          <div className="space-y-0.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Reps</p>
            {"repsMax" in values ? (
              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5">
                <InlineHintInput name={names?.reps} type="number" min={0} value={values.reps} onChange={(event) => onChange({ reps: event.target.value })} hint="min" className={metricInputClassName} />
                <span className="text-sm text-muted">—</span>
                <InlineHintInput name={names?.repsMax} type="number" min={0} value={values.repsMax ?? ""} onChange={(event) => onChange({ repsMax: event.target.value })} hint="max" className={metricInputClassName} />
              </div>
            ) : (
              <InlineHintInput name={names?.reps} type="number" min={0} value={values.reps} onChange={(event) => onChange({ reps: event.target.value })} hint="reps" className={metricInputClassName} />
            )}
          </div>
        ) : null}
        {activeMetrics.weight ? (
          <div className="space-y-0.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Weight</p>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] overflow-hidden rounded-md border border-border/45 bg-[rgb(var(--bg)/0.28)] focus-within:border-accent/45 focus-within:ring-2 focus-within:ring-accent/20">
              <InlineHintInput name={names?.weight} type="number" min={0} step="0.5" value={values.weight} onChange={(event) => onChange({ weight: event.target.value })} hint="value" className="min-h-9 w-full rounded-none border-0 bg-transparent px-3 py-1.5 text-sm text-text placeholder:text-muted/60 focus-visible:outline-none focus-visible:ring-0" />
              <select name={names?.weightUnit} value={values.weightUnit} onChange={(event) => onChange({ weightUnit: event.target.value === "kg" ? "kg" : "lbs" })} className="min-h-9 border-l border-border/45 bg-[rgb(var(--bg)/0.35)] px-2.5 py-1.5 text-sm text-text focus-visible:outline-none focus-visible:ring-0">
                <option value="lbs">lbs</option>
                <option value="kg">kg</option>
              </select>
            </div>
          </div>
        ) : null}
        {activeMetrics.time ? (
          <div className="space-y-0.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Time</p>
            <InlineHintInput name={names?.duration} type="text" inputMode="numeric" value={values.duration} onChange={(event) => onChange({ duration: event.target.value })} hint="mm:ss" className={metricInputClassName} />
          </div>
        ) : null}
        {activeMetrics.distance ? (
          <div className="space-y-0.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Distance</p>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] overflow-hidden rounded-md border border-border/45 bg-[rgb(var(--bg)/0.28)] focus-within:border-accent/45 focus-within:ring-2 focus-within:ring-accent/20">
              <InlineHintInput name={names?.distance} type="number" min={0} step="0.01" value={values.distance} onChange={(event) => onChange({ distance: event.target.value })} hint="value" className="min-h-9 w-full rounded-none border-0 bg-transparent px-3 py-1.5 text-sm text-text placeholder:text-muted/60 focus-visible:outline-none focus-visible:ring-0" />
              <select name={names?.distanceUnit} value={values.distanceUnit} onChange={(event) => onChange({ distanceUnit: event.target.value as "mi" | "km" | "m" })} className="min-h-9 border-l border-border/45 bg-[rgb(var(--bg)/0.35)] px-2.5 py-1.5 text-sm text-text focus-visible:outline-none focus-visible:ring-0">
                <option value="mi">mi</option>
                <option value="km">km</option>
                <option value="m">m</option>
              </select>
            </div>
          </div>
        ) : null}
        {activeMetrics.calories ? (
          <div className="space-y-0.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Calories</p>
            <InlineHintInput name={names?.calories} type="number" min={0} step="1" value={values.calories} onChange={(event) => onChange({ calories: event.target.value })} hint="cal" className={metricInputClassName} />
          </div>
        ) : null}
      </div>
      {trailingContent ? <div>{trailingContent}</div> : null}
    </div>
  );
}
