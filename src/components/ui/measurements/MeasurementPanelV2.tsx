"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { MeasurementMetrics, MeasurementValues } from "@/components/ui/measurements/ModifyMeasurements";
import { resolveScreenContract } from "@/components/ui/app/screenContract";
import { StatFieldLabel } from "@/components/ui/measurements/StatFieldLabel";

const METRICS: Array<{
  key: keyof MeasurementMetrics;
  title: string;
  suffix: (values: MeasurementValues) => string;
}> = [
  { key: "reps", title: "REPS", suffix: () => "range" },
  { key: "weight", title: "WEIGHT", suffix: (values) => values.weightUnit },
  { key: "time", title: "TIME", suffix: () => "mm:ss" },
  { key: "distance", title: "DISTANCE", suffix: (values) => (values.distanceUnit === "km" || values.distanceUnit === "m" ? values.distanceUnit : "mi") },
  { key: "calories", title: "CALORIES", suffix: () => "cal" },
];

const shellClassName = "space-y-2";
const metricCardClassName = "min-h-[5.15rem] rounded-[1rem] border px-3 py-3 transition-colors";
const valueInputClassName = "input-no-spinner mt-2 h-11 w-full rounded-[0.9rem] border border-[rgb(var(--button-primary-border)/0.24)] bg-[rgb(var(--bg)/0.46)] px-3 text-[15px] font-semibold tabular-nums text-text placeholder:text-[rgb(var(--text)/0.24)] focus-visible:border-[rgb(var(--button-primary-border)/0.52)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--button-primary-border)/0.22)]";

type FieldWidth = "compact" | "standard" | "wide";

function MetricHeader({ title, suffix }: { title: string; suffix: string }) {
  return <StatFieldLabel title={title} suffix={suffix} emphasis="default" />;
}

function getFieldSpanClassName(width: FieldWidth) {
  return width === "wide" ? "min-[360px]:col-span-2" : undefined;
}

function getFieldChromeClassName(width: FieldWidth) {
  if (width === "compact") {
    return "border-[rgb(var(--button-primary-border)/0.18)] bg-[rgb(var(--bg)/0.26)]";
  }

  if (width === "wide") {
    return "border-[rgb(var(--button-primary-border)/0.22)] bg-[rgb(var(--bg)/0.34)]";
  }

  return "border-[rgb(var(--button-primary-border)/0.18)] bg-[rgb(var(--bg)/0.28)]";
}

function renderMetricCard({
  testId,
  width,
  children,
}: {
  testId: string;
  width: FieldWidth;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(metricCardClassName, getFieldSpanClassName(width), getFieldChromeClassName(width))}
      data-testid={testId}
      data-field-width={width}
    >
      {children}
    </div>
  );
}

export function MeasurementPanelV2({
  values,
  activeMetrics,
  onChange,
  names,
  className,
  description,
  showHeader = false,
  leadingContent,
  trailingContent,
  belowRpeContent,
  belowRpeField,
  rpe,
  onRpeChange,
  footerContent,
  showInnerHeader = false,
  topField,
  visibleMetrics,
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
  belowRpeContent?: ReactNode;
  belowRpeField?: {
    title: string;
    suffix?: string;
    width?: FieldWidth;
  };
  rpe?: string;
  onRpeChange?: (value: string) => void;
  footerContent?: ReactNode;
  showInnerHeader?: boolean;
  topField?: {
    title: string;
    suffix?: string;
    input: ReactNode;
  };
  visibleMetrics?: Array<keyof MeasurementMetrics>;
}) {
  const enabledCount = Object.values(activeMetrics).filter(Boolean).length;
  const resolvedDistanceUnit = values.distanceUnit === "km" || values.distanceUnit === "m" ? values.distanceUnit : "mi";

  const hasRpeInput = typeof onRpeChange === "function";
  const contract = resolveScreenContract("exerciseLog");
  const allowedMetrics = new Set<keyof MeasurementMetrics>(visibleMetrics ?? ["reps", "weight", "time", "distance", "calories"]);
  const standardMetrics = (["reps", "weight", "time", "distance", "calories"] as const).filter((metric) => allowedMetrics.has(metric));
  const singlePrimaryMetric = standardMetrics.length === 1 ? standardMetrics[0] : null;

  return (
    <section className={cn("space-y-2.5", className)} data-field-label-style={contract.fieldLabelStyle} data-testid="measurement-panel">
      {showHeader ? <div className="space-y-0.5">{description ? <p className="text-xs text-muted">{description}</p> : null}</div> : null}

      {leadingContent}

      <div className={shellClassName}>
        {showInnerHeader ? (
          <div className="mb-1.5 flex items-center justify-end gap-2">
            <p className="text-[11px] text-muted">{enabledCount}/{hasRpeInput ? "6" : "5"} active</p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-2.5 min-[360px]:grid-cols-2" data-testid="measurement-grid">
          {topField ? renderMetricCard({
            testId: "measurement-field-summary",
            width: "wide",
            children: (
              <>
                <StatFieldLabel title={topField.title} suffix={topField.suffix} emphasis="target" />
                <div className="mt-2">{topField.input}</div>
              </>
            ),
          }) : null}

          {allowedMetrics.has("reps") ? renderMetricCard({
            testId: "measurement-field-reps",
            width: "repsMax" in values || singlePrimaryMetric === "reps" ? "wide" : "standard",
            children: (
              <>
                <MetricHeader title={METRICS[0].title} suffix={METRICS[0].suffix(values)} />
                {"repsMax" in values ? (
                  <div className="mt-2 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
                    <label className="space-y-1 text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
                      <span>Min</span>
                      <input
                        name={names?.reps}
                        type="number"
                        min={0}
                        value={values.reps}
                        onChange={(event) => {
                          onChange({ reps: event.target.value });
                        }}
                        className={valueInputClassName}
                        placeholder="Required"
                      />
                    </label>
                    <label className="space-y-1 text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
                      <span>Max</span>
                      <input
                        name={names?.repsMax}
                        type="number"
                        min={0}
                        value={values.repsMax ?? ""}
                        onChange={(event) => {
                          onChange({ repsMax: event.target.value });
                        }}
                        className={valueInputClassName}
                        placeholder="Optional"
                      />
                    </label>
                  </div>
                ) : (
                  <input
                    name={names?.reps}
                    type="number"
                    min={0}
                    value={values.reps}
                    onChange={(event) => {
                      onChange({ reps: event.target.value });
                    }}
                    className={valueInputClassName}
                    placeholder="-"
                  />
                )}
              </>
            ),
          }) : null}

          {allowedMetrics.has("weight") ? renderMetricCard({
            testId: "measurement-field-weight",
            width: singlePrimaryMetric === "weight" ? "wide" : "standard",
            children: (
              <>
                <MetricHeader title={METRICS[1].title} suffix={METRICS[1].suffix(values)} />
                <input
                  name={names?.weight}
                  type="number"
                  min={0}
                  step="0.5"
                  value={values.weight}
                  onChange={(event) => {
                    onChange({ weight: event.target.value });
                  }}
                  className={valueInputClassName}
                  placeholder="-"
                />
                {names?.weightUnit ? <input type="hidden" name={names.weightUnit} value={values.weightUnit} /> : null}
              </>
            ),
          }) : null}

          {allowedMetrics.has("time") ? renderMetricCard({
            testId: "measurement-field-time",
            width: singlePrimaryMetric === "time" ? "wide" : "standard",
            children: (
              <>
                <MetricHeader title={METRICS[2].title} suffix={METRICS[2].suffix(values)} />
                <input
                  name={names?.duration}
                  type="text"
                  inputMode="numeric"
                  value={values.duration}
                  onChange={(event) => {
                    onChange({ duration: event.target.value });
                  }}
                  className={valueInputClassName}
                  placeholder="-"
                />
              </>
            ),
          }) : null}

          {allowedMetrics.has("distance") ? renderMetricCard({
            testId: "measurement-field-distance",
            width: singlePrimaryMetric === "distance" ? "wide" : "standard",
            children: (
              <>
                <MetricHeader title={METRICS[3].title} suffix={METRICS[3].suffix(values)} />
                <input
                  name={names?.distance}
                  type="number"
                  min={0}
                  step="0.01"
                  value={values.distance}
                  onChange={(event) => {
                    onChange({ distance: event.target.value });
                  }}
                  className={valueInputClassName}
                  placeholder="-"
                />
                {names?.distanceUnit ? <input type="hidden" name={names.distanceUnit} value={resolvedDistanceUnit} /> : null}
              </>
            ),
          }) : null}

          {allowedMetrics.has("calories") ? renderMetricCard({
            testId: "measurement-field-calories",
            width: singlePrimaryMetric === "calories" ? "wide" : "standard",
            children: (
              <>
                <MetricHeader title={METRICS[4].title} suffix={METRICS[4].suffix(values)} />
                <input
                  name={names?.calories}
                  type="number"
                  min={0}
                  step="1"
                  value={values.calories}
                  onChange={(event) => {
                    onChange({ calories: event.target.value });
                  }}
                  className={valueInputClassName}
                  placeholder="-"
                />
              </>
            ),
          }) : null}

          {hasRpeInput ? renderMetricCard({
            testId: "measurement-field-rpe",
            width: "compact",
            children: (
              <>
                <StatFieldLabel title="RPE" suffix="0-10" />
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={rpe ?? ""}
                  onChange={(event) => onRpeChange(event.target.value)}
                  className={valueInputClassName}
                  placeholder="-"
                />
              </>
            ),
          }) : null}

          {belowRpeContent ? renderMetricCard({
            testId: "measurement-field-secondary",
            width: belowRpeField?.width ?? (hasRpeInput ? "compact" : "wide"),
            children: (
              <>
                <StatFieldLabel title={belowRpeField?.title ?? "SET TYPE"} suffix={belowRpeField?.suffix ?? "toggle"} />
                <div className="mt-2">{belowRpeContent}</div>
              </>
            ),
          }) : null}
        </div>

        {footerContent ? <div className="mt-2">{footerContent}</div> : null}
      </div>

      {trailingContent ? <div>{trailingContent}</div> : null}
    </section>
  );
}
