"use client";

import type { MouseEvent, ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { MeasurementMetrics, MeasurementValues } from "@/components/ui/measurements/ModifyMeasurements";
import { resolveScreenContract } from "@/components/ui/app/screenContract";
import { StatFieldLabel } from "@/components/ui/measurements/StatFieldLabel";

const METRICS: Array<{
  key: keyof MeasurementMetrics;
  title: string;
  suffix: (values: MeasurementValues) => string;
}> = [
  { key: "reps", title: "REPS", suffix: () => "min/max" },
  { key: "weight", title: "WEIGHT", suffix: (values) => values.weightUnit },
  { key: "time", title: "TIME", suffix: () => "mm:ss" },
  { key: "distance", title: "DISTANCE", suffix: (values) => (values.distanceUnit === "km" ? "km" : "mi") },
  { key: "calories", title: "CALORIES", suffix: () => "cal" },
];

const shellClassName = "space-y-2.5";
const metricCardClassName = "min-h-[5.2rem] rounded-xl border px-3 py-2.5 transition-colors";
const valueInputClassName = "input-no-spinner mt-1 h-10 w-full rounded-lg border border-emerald-300/30 bg-[rgb(var(--bg)/0.48)] px-3 text-base font-semibold tabular-nums text-text placeholder:text-[rgb(var(--text)/0.24)] focus-visible:border-emerald-300/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/25";
function MetricHeader({ title, suffix }: { title: string; suffix: string }) {
  return <StatFieldLabel title={title} suffix={suffix} emphasis="default" />;
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
  const isTextInputTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(target.closest("input, textarea, select, button, a, label"));
  };
  const handleMetricCardClick = (metric: keyof MeasurementMetrics) => (event: MouseEvent<HTMLDivElement>) => {
    if (isTextInputTarget(event.target)) return;
    onMetricToggle(metric);
  };

  const hasRpeInput = typeof onRpeChange === "function";
  const contract = resolveScreenContract("exerciseLog");

  return (
    <section className={cn("space-y-2.5", className)} data-field-label-style={contract.fieldLabelStyle}>
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
            <div className={cn(metricCardClassName, "col-span-2 border-emerald-300/22 bg-[rgb(var(--bg)/0.32)]")}>
              <StatFieldLabel title={topField.title} suffix={topField.suffix} emphasis="target" />
              <div className="mt-1">{topField.input}</div>
            </div>
          ) : null}

          <div
            className={cn(metricCardClassName, activeMetrics.reps ? "border-emerald-300/26 bg-[rgb(var(--bg)/0.34)]" : "border-emerald-300/16 bg-[rgb(var(--bg)/0.28)]")}
            onClick={handleMetricCardClick("reps")}
          >
            <MetricHeader title={METRICS[0].title} suffix={METRICS[0].suffix(values)} />
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

          <div
            className={cn(metricCardClassName, activeMetrics.weight ? "border-emerald-300/26 bg-[rgb(var(--bg)/0.34)]" : "border-emerald-300/16 bg-[rgb(var(--bg)/0.28)]")}
            onClick={handleMetricCardClick("weight")}
          >
            <MetricHeader title={METRICS[1].title} suffix={METRICS[1].suffix(values)} />
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

          <div
            className={cn(metricCardClassName, activeMetrics.time ? "border-emerald-300/26 bg-[rgb(var(--bg)/0.34)]" : "border-emerald-300/16 bg-[rgb(var(--bg)/0.28)]")}
            onClick={handleMetricCardClick("time")}
          >
            <MetricHeader title={METRICS[2].title} suffix={METRICS[2].suffix(values)} />
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

          <div
            className={cn(metricCardClassName, activeMetrics.distance ? "border-emerald-300/26 bg-[rgb(var(--bg)/0.34)]" : "border-emerald-300/16 bg-[rgb(var(--bg)/0.28)]")}
            onClick={handleMetricCardClick("distance")}
          >
            <MetricHeader title={METRICS[3].title} suffix={METRICS[3].suffix(values)} />
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

          <div
            className={cn(metricCardClassName, "col-span-2", activeMetrics.calories ? "border-emerald-300/26 bg-[rgb(var(--bg)/0.34)]" : "border-emerald-300/16 bg-[rgb(var(--bg)/0.28)]")}
            onClick={handleMetricCardClick("calories")}
          >
            <MetricHeader title={METRICS[4].title} suffix={METRICS[4].suffix(values)} />
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
            <div className={cn(metricCardClassName, "col-span-2 border-emerald-300/22 bg-[rgb(var(--bg)/0.32)]")}>
              <StatFieldLabel title="RPE" suffix="0–10" />
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
