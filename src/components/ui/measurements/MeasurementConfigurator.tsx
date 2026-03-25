"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { MeasurementMetrics, MeasurementValues } from "@/components/ui/measurements/ModifyMeasurements";

const METRIC_LABELS: Record<keyof MeasurementMetrics, string> = {
  reps: "Reps",
  weight: "Weight",
  time: "Time",
  distance: "Distance",
  calories: "Calories",
};

const statCellClassName = "rounded-lg border border-border/28 bg-[rgb(var(--bg)/0.08)] px-3 py-2.5";
const statInputClassName = "input-no-spinner mt-1 min-h-10 w-full rounded-md border border-border/35 bg-[rgb(var(--bg)/0.2)] px-3 py-1.5 text-base font-semibold tabular-nums text-text placeholder:text-[rgb(var(--text)/0.33)] focus-visible:border-emerald-300/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/20";
const pairedValueRowClassName = "mt-1 grid grid-cols-[minmax(0,1fr)_auto] items-stretch overflow-hidden rounded-md border border-border/35 bg-[rgb(var(--bg)/0.2)] focus-within:border-emerald-300/45 focus-within:ring-2 focus-within:ring-emerald-300/20";
const pairedValueInputClassName = "input-no-spinner min-h-10 w-full border-0 bg-transparent px-3 py-1.5 text-base font-semibold tabular-nums text-text placeholder:text-[rgb(var(--text)/0.33)] focus-visible:outline-none focus-visible:ring-0";
const pairedValueUnitClassName = "min-h-10 border-l border-border/35 bg-[rgb(var(--bg)/0.3)] px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted/90 focus-visible:outline-none focus-visible:ring-0";

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
  const ensureMetricActive = (metric: keyof MeasurementMetrics) => {
    if (!activeMetrics[metric]) {
      onMetricToggle(metric);
    }
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

      <div className="grid gap-2 sm:grid-cols-2">
        <div className={statCellClassName}>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">{METRIC_LABELS.reps}</p>
          {"repsMax" in values ? (
            <div className="mt-1 grid grid-cols-2 gap-2">
              <div className="relative">
                <input
                  name={names?.reps}
                  type="number"
                  min={0}
                  value={values.reps}
                  onChange={(event) => {
                    ensureMetricActive("reps");
                    onChange({ reps: event.target.value });
                  }}
                  className={statInputClassName}
                  placeholder="min"
                />
              </div>
              <div className="relative">
                <input
                  name={names?.repsMax}
                  type="number"
                  min={0}
                  value={values.repsMax ?? ""}
                  onChange={(event) => {
                    ensureMetricActive("reps");
                    onChange({ repsMax: event.target.value });
                  }}
                  className={statInputClassName}
                  placeholder="max"
                />
              </div>
            </div>
          ) : (
            <input
              name={names?.reps}
              type="number"
              min={0}
              value={values.reps}
              onChange={(event) => {
                ensureMetricActive("reps");
                onChange({ reps: event.target.value });
              }}
              className={statInputClassName}
              placeholder="-"
            />
          )}
        </div>

        <div className={statCellClassName}>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">{METRIC_LABELS.weight}</p>
          <div className={pairedValueRowClassName}>
            <input
              name={names?.weight}
              type="number"
              min={0}
              step="0.5"
              value={values.weight}
              onChange={(event) => {
                ensureMetricActive("weight");
                onChange({ weight: event.target.value });
              }}
              className={pairedValueInputClassName}
              placeholder="-"
            />
            <select
              name={names?.weightUnit}
              value={values.weightUnit}
              onChange={(event) => onChange({ weightUnit: event.target.value === "kg" ? "kg" : "lbs" })}
              className={pairedValueUnitClassName}
            >
              <option value="lbs">lbs</option>
              <option value="kg">kg</option>
            </select>
          </div>
        </div>

        <div className={statCellClassName}>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">{METRIC_LABELS.time}</p>
          <input
            name={names?.duration}
            type="text"
            inputMode="numeric"
            value={values.duration}
            onChange={(event) => {
              ensureMetricActive("time");
              onChange({ duration: event.target.value });
            }}
            className={statInputClassName}
            placeholder="-"
          />
        </div>

        <div className={statCellClassName}>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">{METRIC_LABELS.distance}</p>
          <div className={pairedValueRowClassName}>
            <input
              name={names?.distance}
              type="number"
              min={0}
              step="0.01"
              value={values.distance}
              onChange={(event) => {
                ensureMetricActive("distance");
                onChange({ distance: event.target.value });
              }}
              className={pairedValueInputClassName}
              placeholder="-"
            />
            <select
              name={names?.distanceUnit}
              value={values.distanceUnit}
              onChange={(event) => onChange({ distanceUnit: event.target.value as "mi" | "km" | "m" })}
              className={pairedValueUnitClassName}
            >
              <option value="mi">mi</option>
              <option value="km">km</option>
              <option value="m">m</option>
            </select>
          </div>
        </div>

        <div className={statCellClassName}>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">{METRIC_LABELS.calories}</p>
          <input
            name={names?.calories}
            type="number"
            min={0}
            step="1"
            value={values.calories}
            onChange={(event) => {
              ensureMetricActive("calories");
              onChange({ calories: event.target.value });
            }}
            className={statInputClassName}
            placeholder="-"
          />
        </div>
      </div>
      {trailingContent ? <div>{trailingContent}</div> : null}
    </div>
  );
}
