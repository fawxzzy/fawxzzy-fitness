"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { MeasurementMetrics, MeasurementValues } from "@/components/ui/measurements/ModifyMeasurements";

const METRICS: Array<{
  key: keyof MeasurementMetrics;
  title: string;
  suffix: (values: MeasurementValues) => string;
}> = [
  { key: "reps", title: "Reps", suffix: () => "min/max" },
  { key: "weight", title: "Weight", suffix: (values) => values.weightUnit },
  { key: "time", title: "Time", suffix: () => "mm:ss" },
  { key: "distance", title: "Distance", suffix: (values) => (values.distanceUnit === "km" ? "km" : "mi") },
  { key: "calories", title: "Calories", suffix: () => "cal" },
];

const shellClassName = "space-y-2.5";
const metricCardClassName = "min-h-[5.2rem] rounded-xl border border-emerald-300/16 bg-[rgb(var(--bg)/0.28)] px-3 py-2.5";
const valueInputClassName = "input-no-spinner mt-1 h-10 w-full rounded-lg border border-emerald-300/30 bg-[rgb(var(--bg)/0.48)] px-3 text-base font-semibold tabular-nums text-text placeholder:text-[rgb(var(--text)/0.24)] focus-visible:border-emerald-300/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/25";

function StatFieldLabel({
  title,
  suffix,
  tone = "muted",
  variant = "standard",
}: {
  title: string;
  suffix?: string;
  tone?: "muted" | "active";
  variant?: "standard" | "target";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.16em] transition",
        tone === "active" ? "text-emerald-100" : "text-muted/85",
        variant === "target" ? "text-emerald-100" : undefined,
      )}
    >
      <span>{title}</span>
      {suffix ? (
        <span
          className={cn(
            "text-[10px] font-medium tracking-[0.1em]",
            variant === "target" ? "text-emerald-200/80" : "text-muted/70",
          )}
        >
          ({suffix})
        </span>
      ) : null}
    </span>
  );
}

function MetricHeader({ title, suffix, active, onToggle }: { title: string; suffix: string; active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={cn(
        "inline-flex text-left",
        active ? "text-emerald-100" : "text-muted/85 hover:text-emerald-100",
      )}
    >
      <StatFieldLabel title={title} suffix={suffix} tone={active ? "active" : "muted"} />
    </button>
  );
}

export function MeasurementPanelV2({
  values,
  activeMetrics,
  onMetricToggle,
  onChange,
  names,
  className,
  description,
  showHeader = false,
  leadingContent,
  trailingContent,
  rpe,
  onRpeChange,
  footerContent,
  showInnerHeader = false,
  topField,
}: {
  values: MeasurementValues;
  activeMetrics: MeasurementMetrics;
  isExpanded: boolean;
  onExpandedChange: (nextValue: boolean) => void;
  onMetricToggle: (metric: keyof MeasurementMetrics) => void;
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
  rpe?: string;
  onRpeChange?: (value: string) => void;
  footerContent?: ReactNode;
  showInnerHeader?: boolean;
  topField?: {
    title: string;
    suffix?: string;
    input: ReactNode;
  };
}) {
  const enabledCount = Object.values(activeMetrics).filter(Boolean).length;
  const resolvedDistanceUnit = values.distanceUnit === "km" ? "km" : "mi";

  const ensureMetricActive = (metric: keyof MeasurementMetrics) => {
    if (!activeMetrics[metric]) onMetricToggle(metric);
  };

  const hasRpeInput = typeof onRpeChange === "function";

  return (
    <section className={cn("space-y-2.5", className)}>
      {showHeader ? <div className="space-y-0.5">{description ? <p className="text-xs text-muted">{description}</p> : null}</div> : null}

      {leadingContent}

      <div className={shellClassName}>
        {showInnerHeader ? (
          <div className="mb-1.5 flex items-center justify-end gap-2">
            <p className="text-[11px] text-muted">{enabledCount}/{hasRpeInput ? "6" : "5"} active</p>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          {topField ? (
            <div className={cn(metricCardClassName, "col-span-2")}>
              <StatFieldLabel title={topField.title} suffix={topField.suffix} tone="active" variant="target" />
              <div className="mt-1">{topField.input}</div>
            </div>
          ) : null}

          <div className={metricCardClassName}>
            <MetricHeader title={METRICS[0].title} suffix={METRICS[0].suffix(values)} active={activeMetrics.reps} onToggle={() => onMetricToggle("reps")} />
            {"repsMax" in values ? (
              <div className="mt-1 grid grid-cols-2 gap-2">
                <input
                  name={names?.reps}
                  type="number"
                  min={0}
                  value={values.reps}
                  onChange={(event) => {
                    ensureMetricActive("reps");
                    onChange({ reps: event.target.value });
                  }}
                  className={valueInputClassName}
                  placeholder="min"
                />
                <input
                  name={names?.repsMax}
                  type="number"
                  min={0}
                  value={values.repsMax ?? ""}
                  onChange={(event) => {
                    ensureMetricActive("reps");
                    onChange({ repsMax: event.target.value });
                  }}
                  className={valueInputClassName}
                  placeholder="max"
                />
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
                className={valueInputClassName}
                placeholder="-"
              />
            )}
          </div>

          <div className={metricCardClassName}>
            <MetricHeader title={METRICS[1].title} suffix={METRICS[1].suffix(values)} active={activeMetrics.weight} onToggle={() => onMetricToggle("weight")} />
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
              className={valueInputClassName}
              placeholder="-"
            />
            {names?.weightUnit ? <input type="hidden" name={names.weightUnit} value={values.weightUnit} /> : null}
          </div>

          <div className={metricCardClassName}>
            <MetricHeader title={METRICS[2].title} suffix={METRICS[2].suffix(values)} active={activeMetrics.time} onToggle={() => onMetricToggle("time")} />
            <input
              name={names?.duration}
              type="text"
              inputMode="numeric"
              value={values.duration}
              onChange={(event) => {
                ensureMetricActive("time");
                onChange({ duration: event.target.value });
              }}
              className={valueInputClassName}
              placeholder="-"
            />
          </div>

          <div className={metricCardClassName}>
            <MetricHeader title={METRICS[3].title} suffix={METRICS[3].suffix(values)} active={activeMetrics.distance} onToggle={() => onMetricToggle("distance")} />
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
              className={valueInputClassName}
              placeholder="-"
            />
            {names?.distanceUnit ? <input type="hidden" name={names.distanceUnit} value={resolvedDistanceUnit} /> : null}
          </div>

          <div className={cn(metricCardClassName, "col-span-2")}> 
            <MetricHeader title={METRICS[4].title} suffix={METRICS[4].suffix(values)} active={activeMetrics.calories} onToggle={() => onMetricToggle("calories")} />
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
              className={valueInputClassName}
              placeholder="-"
            />
          </div>

          {hasRpeInput ? (
            <div className={cn(metricCardClassName, "col-span-2")}>
              <StatFieldLabel title="RPE" suffix="0–10" tone="active" />
              <input
                type="number"
                min={0}
                step="0.5"
                value={rpe ?? ""}
                onChange={(event) => onRpeChange(event.target.value)}
                className={valueInputClassName}
                placeholder="-"
              />
            </div>
          ) : null}
        </div>

        {footerContent ? <div className="mt-2">{footerContent}</div> : null}
      </div>

      {trailingContent ? <div>{trailingContent}</div> : null}
    </section>
  );
}
