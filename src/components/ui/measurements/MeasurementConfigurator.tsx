"use client";

import { InlineHintInput } from "@/components/ui/InlineHintInput";
import { ChevronDownIcon, ChevronUpIcon } from "@/components/ui/Chevrons";
import { cn } from "@/lib/cn";
import type { MeasurementMetrics, MeasurementValues } from "@/components/ui/measurements/ModifyMeasurements";

const METRIC_LABELS: Record<keyof MeasurementMetrics, string> = {
  reps: "Reps",
  weight: "Weight",
  time: "Time",
  distance: "Distance",
  calories: "Calories",
};

export function MeasurementConfigurator({
  values,
  activeMetrics,
  isExpanded,
  onExpandedChange,
  onMetricToggle,
  onChange,
  names,
  className,
  heading = "Measurements",
  description = "Use one consistent measurement set for this exercise.",
  collapsedLabel = "Optional measurements",
  collapsedDescription = "Show only the fields this workout actually needs.",
  hideInputsWhenCollapsed = false,
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
}) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{heading}</p>
        <p className="text-xs text-muted">{description}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/45 bg-[rgb(var(--bg)/0.22)]">
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={() => onExpandedChange(!isExpanded)}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-[rgb(var(--bg)/0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
        >
          <span>
            <span className="block text-sm font-medium text-text">{collapsedLabel}</span>
            <span className="block text-xs text-muted">{collapsedDescription}</span>
          </span>
          {isExpanded ? <ChevronUpIcon className="h-4 w-4 text-muted" /> : <ChevronDownIcon className="h-4 w-4 text-muted" />}
        </button>

        {isExpanded ? (
          <div className="flex flex-wrap gap-2 border-t border-border/40 px-4 py-3">
            {(Object.keys(METRIC_LABELS) as Array<keyof MeasurementMetrics>).map((metric) => (
              <button
                key={metric}
                type="button"
                onClick={() => onMetricToggle(metric)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  activeMetrics[metric]
                    ? "border-accent/35 bg-accent/12 text-text"
                    : "border-border/45 bg-[rgb(var(--bg)/0.26)] text-muted hover:bg-[rgb(var(--bg)/0.35)]",
                )}
              >
                {activeMetrics[metric] ? "On" : "Off"} · {METRIC_LABELS[metric]}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {!hideInputsWhenCollapsed || isExpanded ? (
        <div className="rounded-2xl border border-border/45 bg-[rgb(var(--bg)/0.18)] p-3">
          <div className="grid grid-cols-2 gap-2">
            <div className={cn("col-span-2 overflow-hidden transition-all", activeMetrics.reps ? "max-h-24 opacity-100" : "max-h-0 opacity-0")}>
              <InlineHintInput name={names?.reps} type="number" min={0} value={values.reps} onChange={(event) => onChange({ reps: event.target.value })} hint="reps" />
            </div>
            <div className={cn("col-span-2 overflow-hidden transition-all", activeMetrics.weight ? "max-h-24 opacity-100" : "max-h-0 opacity-0")}>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <InlineHintInput name={names?.weight} type="number" min={0} step="0.5" value={values.weight} onChange={(event) => onChange({ weight: event.target.value })} hint={values.weightUnit} />
                <select name={names?.weightUnit} value={values.weightUnit} onChange={(event) => onChange({ weightUnit: event.target.value === "kg" ? "kg" : "lbs" })} className="min-h-11 rounded-md border border-border/70 bg-surface-2-soft px-3 py-2 text-sm">
                  <option value="lbs">lbs</option>
                  <option value="kg">kg</option>
                </select>
              </div>
            </div>
            <div className={cn("col-span-2 overflow-hidden transition-all", activeMetrics.time ? "max-h-24 opacity-100" : "max-h-0 opacity-0")}>
              <InlineHintInput name={names?.duration} type="text" inputMode="numeric" value={values.duration} onChange={(event) => onChange({ duration: event.target.value })} hint="mm:ss" />
            </div>
            <div className={cn("col-span-2 overflow-hidden transition-all", activeMetrics.distance ? "max-h-24 opacity-100" : "max-h-0 opacity-0")}>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <InlineHintInput name={names?.distance} type="number" min={0} step="0.01" value={values.distance} onChange={(event) => onChange({ distance: event.target.value })} hint={values.distanceUnit} />
                <select name={names?.distanceUnit} value={values.distanceUnit} onChange={(event) => onChange({ distanceUnit: event.target.value as "mi" | "km" | "m" })} className="min-h-11 rounded-md border border-border/70 bg-surface-2-soft px-3 py-2 text-sm">
                  <option value="mi">mi</option>
                  <option value="km">km</option>
                  <option value="m">m</option>
                </select>
              </div>
            </div>
            <div className={cn("col-span-2 overflow-hidden transition-all", activeMetrics.calories ? "max-h-24 opacity-100" : "max-h-0 opacity-0")}>
              <InlineHintInput name={names?.calories} type="number" min={0} step="1" value={values.calories} onChange={(event) => onChange({ calories: event.target.value })} hint="cal" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
