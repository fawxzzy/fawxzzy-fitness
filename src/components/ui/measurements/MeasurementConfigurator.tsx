"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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

const toggleBaseClassName = "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/25";
const statCellClassName = "rounded-md border border-border/30 bg-transparent px-2.5 py-2";
const statValueButtonClassName = "-mx-1 mt-0.5 min-h-8 rounded-md px-1 text-left text-base font-semibold text-text transition-colors hover:bg-[rgb(var(--bg)/0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/30";
const metricInputClassName = "min-h-10 w-full rounded-md border border-border/40 bg-[rgb(var(--bg)/0.12)] px-3 py-1.5 text-base font-semibold tabular-nums text-text placeholder:text-muted/55 focus-visible:border-emerald-300/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/20";

function normalizeValue(value: string | undefined) {
  return value?.trim() ?? "";
}

function metricDisplay(metric: keyof MeasurementMetrics, values: MeasurementValues) {
  switch (metric) {
    case "reps": {
      const reps = normalizeValue(values.reps);
      if (!("repsMax" in values)) {
        return reps || "-";
      }
      const repsMax = normalizeValue(values.repsMax);
      if (reps && repsMax) {
        return `${reps}–${repsMax}`;
      }
      return reps || repsMax || "-";
    }
    case "weight": {
      const weight = normalizeValue(values.weight);
      return weight ? `${weight} ${values.weightUnit}` : "-";
    }
    case "time": {
      return normalizeValue(values.duration) || "-";
    }
    case "distance": {
      const distance = normalizeValue(values.distance);
      return distance ? `${distance} ${values.distanceUnit}` : "-";
    }
    case "calories": {
      const calories = normalizeValue(values.calories);
      return calories ? `${calories} cal` : "-";
    }
    default:
      return "-";
  }
}

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
  const [editingMetric, setEditingMetric] = useState<keyof MeasurementMetrics | null>(null);
  const editRefs = useRef<Partial<Record<keyof MeasurementMetrics, HTMLInputElement | null>>>({});

  const activeMetricKeys = useMemo(
    () => (Object.keys(METRIC_LABELS) as Array<keyof MeasurementMetrics>).filter((metric) => activeMetrics[metric]),
    [activeMetrics],
  );

  useEffect(() => {
    if (editingMetric && !activeMetrics[editingMetric]) {
      setEditingMetric(null);
    }
  }, [activeMetrics, editingMetric]);

  useEffect(() => {
    if (!editingMetric) {
      return;
    }
    const target = editRefs.current[editingMetric];
    if (!target) {
      return;
    }
    const animationId = window.requestAnimationFrame(() => {
      target.focus();
      target.select?.();
    });
    return () => window.cancelAnimationFrame(animationId);
  }, [editingMetric]);

  const closeIfLeavingMetric = (event: React.FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }
    setEditingMetric(null);
  };

  return (
    <div className={cn("space-y-2", className)}>
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
                ? "border-emerald-400/40 bg-emerald-400/12 text-emerald-50"
                : "border-border/35 bg-transparent text-muted/80 hover:bg-[rgb(var(--bg)/0.24)] hover:text-muted",
            )}
          >
            {METRIC_LABELS[metric]}
          </button>
        ))}
      </div>

      <div className="grid gap-1.5 sm:grid-cols-2">
        {activeMetricKeys.map((metric) => {
          const isEditing = editingMetric === metric;
          const displayValue = metricDisplay(metric, values);

          return (
            <div key={metric} className={cn(statCellClassName, isEditing ? "border-emerald-300/45 bg-emerald-400/8" : "")} onBlur={isEditing ? closeIfLeavingMetric : undefined}>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">{METRIC_LABELS[metric]}</p>

              {isEditing ? (
                <>
                  {metric === "reps" ? (
                    "repsMax" in values ? (
                      <div className="mt-1 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5">
                        <InlineHintInput ref={(node) => { editRefs.current.reps = node; }} name={names?.reps} type="number" min={0} value={values.reps} onChange={(event) => onChange({ reps: event.target.value })} hint="min" className={cn("input-no-spinner", metricInputClassName)} onKeyDown={(event) => { if (event.key === "Enter") setEditingMetric(null); }} />
                        <span className="text-sm text-muted">—</span>
                        <InlineHintInput name={names?.repsMax} type="number" min={0} value={values.repsMax ?? ""} onChange={(event) => onChange({ repsMax: event.target.value })} hint="max" className={cn("input-no-spinner", metricInputClassName)} onKeyDown={(event) => { if (event.key === "Enter") setEditingMetric(null); }} />
                      </div>
                    ) : (
                      <InlineHintInput ref={(node) => { editRefs.current.reps = node; }} name={names?.reps} type="number" min={0} value={values.reps} onChange={(event) => onChange({ reps: event.target.value })} hint="reps" className={cn("input-no-spinner", metricInputClassName, "mt-1")} onKeyDown={(event) => { if (event.key === "Enter") setEditingMetric(null); }} />
                    )
                  ) : null}

                  {metric === "weight" ? (
                    <div className="mt-1 grid grid-cols-[minmax(0,1.55fr)_auto] overflow-hidden rounded-md border border-border/45 bg-[rgb(var(--bg)/0.22)] focus-within:border-emerald-300/45 focus-within:ring-2 focus-within:ring-emerald-300/20">
                      <input ref={(node) => { editRefs.current.weight = node; }} name={names?.weight} type="number" min={0} step="0.5" value={values.weight} onChange={(event) => onChange({ weight: event.target.value })} className="input-no-spinner min-h-10 w-full rounded-none border-0 bg-transparent px-3.5 py-1.5 text-base font-semibold tabular-nums text-text focus-visible:outline-none focus-visible:ring-0" onKeyDown={(event) => { if (event.key === "Enter") setEditingMetric(null); }} />
                      <select name={names?.weightUnit} value={values.weightUnit} onChange={(event) => onChange({ weightUnit: event.target.value === "kg" ? "kg" : "lbs" })} className="min-h-10 border-l border-border/45 bg-[rgb(var(--bg)/0.32)] px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted/90 focus-visible:outline-none focus-visible:ring-0">
                        <option value="lbs">lbs</option>
                        <option value="kg">kg</option>
                      </select>
                    </div>
                  ) : null}

                  {metric === "time" ? (
                    <InlineHintInput ref={(node) => { editRefs.current.time = node; }} name={names?.duration} type="text" inputMode="numeric" value={values.duration} onChange={(event) => onChange({ duration: event.target.value })} hint="mm:ss" className={cn(metricInputClassName, "mt-1")} onKeyDown={(event) => { if (event.key === "Enter") setEditingMetric(null); }} />
                  ) : null}

                  {metric === "distance" ? (
                    <div className="mt-1 grid grid-cols-[minmax(0,1.55fr)_auto] overflow-hidden rounded-md border border-border/45 bg-[rgb(var(--bg)/0.22)] focus-within:border-emerald-300/45 focus-within:ring-2 focus-within:ring-emerald-300/20">
                      <input ref={(node) => { editRefs.current.distance = node; }} name={names?.distance} type="number" min={0} step="0.01" value={values.distance} onChange={(event) => onChange({ distance: event.target.value })} className="input-no-spinner min-h-10 w-full rounded-none border-0 bg-transparent px-3.5 py-1.5 text-base font-semibold tabular-nums text-text focus-visible:outline-none focus-visible:ring-0" onKeyDown={(event) => { if (event.key === "Enter") setEditingMetric(null); }} />
                      <select name={names?.distanceUnit} value={values.distanceUnit} onChange={(event) => onChange({ distanceUnit: event.target.value as "mi" | "km" | "m" })} className="min-h-10 border-l border-border/45 bg-[rgb(var(--bg)/0.32)] px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted/90 focus-visible:outline-none focus-visible:ring-0">
                        <option value="mi">mi</option>
                        <option value="km">km</option>
                        <option value="m">m</option>
                      </select>
                    </div>
                  ) : null}

                  {metric === "calories" ? (
                    <InlineHintInput ref={(node) => { editRefs.current.calories = node; }} name={names?.calories} type="number" min={0} step="1" value={values.calories} onChange={(event) => onChange({ calories: event.target.value })} hint="cal" className={cn("input-no-spinner", metricInputClassName, "mt-1")} onKeyDown={(event) => { if (event.key === "Enter") setEditingMetric(null); }} />
                  ) : null}
                </>
              ) : (
                <button
                  type="button"
                  className={cn(statValueButtonClassName, displayValue === "-" ? "text-muted" : "")}
                  onClick={() => setEditingMetric(metric)}
                >
                  {displayValue}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {trailingContent ? <div>{trailingContent}</div> : null}
    </div>
  );
}
