"use client";

import { useId } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@/components/ui/Chevrons";
import { InlineHintInput } from "@/components/ui/InlineHintInput";

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
  const metricsPanelId = useId();

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/5">
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-controls={metricsPanelId}
          onClick={() => onExpandedChange(!isExpanded)}
          className={`flex w-full items-center justify-between gap-2 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-surface/70 active:bg-surface-2-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 [-webkit-tap-highlight-color:transparent] ${tapFeedbackClass}`}
        >
          <span><span className="block text-sm font-medium text-text">Visible measurements</span><span className="block text-xs text-muted">Show only the fields you need for this set.</span></span>
          {isExpanded ? <ChevronUpIcon className="h-4 w-4 shrink-0 text-[rgb(var(--text)/0.72)]" /> : <ChevronDownIcon className="h-4 w-4 shrink-0 text-[rgb(var(--text)/0.72)]" />}
        </button>
        {isExpanded ? (
          <div id={metricsPanelId} className="flex flex-wrap gap-2 px-4 pb-4 pt-1">
            {(["reps", "weight", "time", "distance", "calories"] as const).map((metric) => (
              <button
                key={metric}
                type="button"
                onClick={() => onMetricToggle(metric)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${activeMetrics[metric] ? "bg-accent/15 text-text ring-1 ring-accent/30" : "bg-surface/70 text-[rgb(var(--text)/0.85)]"}`}
              >
                {activeMetrics[metric] ? "Hide" : "Show"} {metric}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className={`col-span-2 overflow-hidden transition-all duration-200 ease-out ${activeMetrics.reps ? "max-h-24 translate-y-0 opacity-100" : "max-h-0 -translate-y-1 opacity-0"}`}>
              <InlineHintInput type="number" min={0} value={values.reps} onChange={(event) => onChange({ reps: event.target.value })} hint="reps" />
            </div>
            <div className={`col-span-2 overflow-hidden transition-all duration-200 ease-out ${activeMetrics.weight ? "max-h-24 translate-y-0 opacity-100" : "max-h-0 -translate-y-1 opacity-0"}`}>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <InlineHintInput type="number" min={0} step="0.5" value={values.weight} onChange={(event) => onChange({ weight: event.target.value })} hint={values.weightUnit} />
                <select value={values.weightUnit} onChange={(event) => onChange({ weightUnit: event.target.value === "kg" ? "kg" : "lbs" })} className="min-h-11 rounded-md border border-border/70 bg-surface-2-soft px-3 py-2 text-sm">
                  <option value="lbs">lbs</option>
                  <option value="kg">kg</option>
                </select>
              </div>
            </div>
            <div className={`col-span-2 overflow-hidden transition-all duration-200 ease-out ${activeMetrics.time ? "max-h-24 translate-y-0 opacity-100" : "max-h-0 -translate-y-1 opacity-0"}`}>
              <InlineHintInput type="text" inputMode="numeric" value={values.duration} onChange={(event) => onChange({ duration: event.target.value })} hint="mm:ss" />
            </div>
            <div className={`col-span-2 overflow-hidden transition-all duration-200 ease-out ${activeMetrics.distance ? "max-h-24 translate-y-0 opacity-100" : "max-h-0 -translate-y-1 opacity-0"}`}>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <InlineHintInput type="number" min={0} step="0.01" value={values.distance} onChange={(event) => onChange({ distance: event.target.value })} hint={values.distanceUnit} />
                <select value={values.distanceUnit} onChange={(event) => onChange({ distanceUnit: event.target.value as "mi" | "km" | "m" })} className="min-h-11 rounded-md border border-border/70 bg-surface-2-soft px-3 py-2 text-sm">
                  <option value="mi">mi</option>
                  <option value="km">km</option>
                  <option value="m">m</option>
                </select>
              </div>
            </div>
            <div className={`col-span-2 overflow-hidden transition-all duration-200 ease-out ${activeMetrics.calories ? "max-h-24 translate-y-0 opacity-100" : "max-h-0 -translate-y-1 opacity-0"}`}>
              <InlineHintInput type="number" min={0} step="1" value={values.calories} onChange={(event) => onChange({ calories: event.target.value })} hint="cal" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
