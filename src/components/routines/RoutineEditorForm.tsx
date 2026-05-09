"use client";

import { useState, type ReactNode } from "react";
import {
  ACTION_CHROME_CONTROL_CLASS_NAME,
  ACTION_CHROME_RAIL_CLASS_NAME,
  ACTION_CHROME_RAIL_GRID_CLASS_NAME,
  ACTION_CHROME_SEGMENTED_CLASS_NAME,
} from "@/components/ui/actionChrome";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { LabeledEditorField, labeledEditorFieldControlClassName } from "@/components/ui/LabeledEditorField";
import { appTokens } from "@/components/ui/app/tokens";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/Chevrons";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { cn } from "@/lib/cn";
import { getRoutineStartWeekdayFromDate, ROUTINE_START_WEEKDAYS } from "@/lib/routines";
import { getRoutineTimezoneLabel, ROUTINE_TIMEZONE_OPTIONS } from "@/lib/timezones";

const weekdayOptions = ROUTINE_START_WEEKDAYS.map((weekday) => ({
  value: weekday,
  label: weekday.slice(0, 1).toUpperCase() + weekday.slice(1, 3),
}));

const timezoneOptions = ROUTINE_TIMEZONE_OPTIONS.map((timeZoneOption) => ({
  value: timeZoneOption,
  label: getRoutineTimezoneLabel(timeZoneOption),
}));

const weightUnitOptions = [
  { value: "lbs", label: "lbs" },
  { value: "kg", label: "kg" },
] as const;

const distanceUnitOptions = [
  { value: "mi", label: "mi" },
  { value: "km", label: "km" },
] as const;

export type RoutineEditorFieldName =
  | "name"
  | "cycleLengthDays"
  | "startDate"
  | "startWeekday"
  | "timezone"
  | "weightUnit"
  | "distanceUnit";

function buildCoveredWeekdayIndexes(startWeekday: string | undefined, cycleLengthDays: number | undefined) {
  const startIndex = ROUTINE_START_WEEKDAYS.findIndex((weekday) => weekday === startWeekday);
  const normalizedStartIndex = startIndex >= 0 ? startIndex : 0;
  const normalizedCycleLength = Number.isFinite(cycleLengthDays) ? Math.max(1, Math.floor(cycleLengthDays as number)) : 1;
  const coveredIndexSet = new Set<number>();
  const visibleCoveredDays = Math.min(normalizedCycleLength, ROUTINE_START_WEEKDAYS.length);

  for (let offset = 0; offset < visibleCoveredDays; offset += 1) {
    coveredIndexSet.add((normalizedStartIndex + offset) % ROUTINE_START_WEEKDAYS.length);
  }

  return {
    coveredIndexSet,
    normalizedStartIndex,
    overflowDays: Math.max(0, normalizedCycleLength - ROUTINE_START_WEEKDAYS.length),
  };
}

function formatUtcDateFromTimestamp(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function getDateForSelectedWeekdayInCurrentCalendarWeek(startDate: string | undefined, targetWeekday: string) {
  const currentWeekday = getRoutineStartWeekdayFromDate(startDate);
  const currentTimestamp = startDate ? Date.parse(`${startDate}T00:00:00Z`) : Number.NaN;
  const currentIndex = currentWeekday ? ROUTINE_START_WEEKDAYS.indexOf(currentWeekday) : -1;
  const targetIndex = ROUTINE_START_WEEKDAYS.indexOf(targetWeekday as (typeof ROUTINE_START_WEEKDAYS)[number]);

  if (!Number.isFinite(currentTimestamp) || currentIndex < 0 || targetIndex < 0) {
    return null;
  }

  return formatUtcDateFromTimestamp(currentTimestamp + ((targetIndex - currentIndex) * 24 * 60 * 60 * 1000));
}

function RoutineEditorControlCaption({
  label,
  detail,
}: {
  label: string;
  detail?: ReactNode;
}) {
  return (
    <div className="text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-muted)/0.92)]">{label}</p>
      {detail ? <p className="mt-1 text-[10px] text-[rgb(var(--text-muted)/0.82)]">{detail}</p> : null}
    </div>
  );
}

function RoutineEditorSectionDivider({
  className,
}: {
  className?: string;
}) {
  return (
    <div className={cn("mt-2 flex items-center justify-center py-0.5", className)}>
      <MetricAccentBar variant="thin" className="w-full opacity-85" />
    </div>
  );
}

const routineEditorCycleInputClassName = cn(
  labeledEditorFieldControlClassName,
  "h-11 min-h-11 px-3 py-2 text-center font-semibold leading-none tabular-nums",
);

type RoutineEditorInfoPayload = {
  title: string;
  summary: string;
};

function publishRoutineEditorInfo(payload: RoutineEditorInfoPayload) {
  window.dispatchEvent(new CustomEvent("fitness:routine-editor-info", { detail: payload }));
}

function routineEditorInfoHandlers(payload: RoutineEditorInfoPayload) {
  return {
    onFocusCapture: () => publishRoutineEditorInfo(payload),
    onPointerDownCapture: () => publishRoutineEditorInfo(payload),
  };
}

function RoutineEditorSegmentedField({
  label,
  ariaLabel,
  value,
  onChange,
  options,
  detail,
  info,
  showDivider = true,
  showLabel = true,
}: {
  label: string;
  ariaLabel: string;
  value: string | undefined;
  onChange?: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  detail?: ReactNode;
  info?: RoutineEditorInfoPayload;
  showDivider?: boolean;
  showLabel?: boolean;
}) {
  return (
    <div {...(info ? routineEditorInfoHandlers(info) : {})}>
      {showLabel ? <RoutineEditorControlCaption label={label} detail={detail} /> : null}
      <div className={cn(showLabel ? "mt-2" : undefined, "flex justify-center")}>
        <div className="max-w-full overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="mx-auto w-max min-w-max">
            <SegmentedControl
              ariaLabel={ariaLabel}
              options={options.map((option) => ({ label: option.label, value: option.value }))}
              value={value ?? options[0]?.value ?? ""}
              onChange={onChange}
              size="sm"
              activeIntent="positive"
              fitContent
              className="mx-auto flex-wrap justify-center"
            />
            {showDivider ? <RoutineEditorSectionDivider className="mx-auto w-[calc(100%+0.65rem)] max-w-full" /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function RoutineEditorCollapsibleSection({
  title,
  children,
  defaultExpanded = false,
  info,
}: {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  info?: RoutineEditorInfoPayload;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div>
      <button
        type="button"
        className={cn(
          "group relative block w-full select-none appearance-none !border-0 !bg-transparent px-0 text-center caret-transparent shadow-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-ring)]",
          appTokens.routineEditorInlineTitle,
        )}
        onClick={() => setIsExpanded((current) => !current)}
        aria-expanded={isExpanded}
        {...(info ? routineEditorInfoHandlers(info) : {})}
      >
        <span className="grid min-h-[2rem] grid-cols-[2rem_minmax(0,1fr)_2rem] items-end px-4 pb-3">
          <span aria-hidden="true" />
          <span className="min-w-0 w-full text-center">
            <span className="block text-[0.82rem] font-semibold leading-tight text-[rgb(var(--text-primary)/0.98)]">{title}</span>
          </span>
          <span
            className={cn(
              "flex items-center justify-end transition-colors group-hover:text-[rgb(var(--text-secondary)/0.96)]",
              isExpanded ? "text-[rgb(var(--accent-divider-rgb)/0.98)]" : "text-[rgb(var(--text-muted)/0.84)]",
            )}
          >
            {isExpanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
          </span>
        </span>
        <MetricAccentBar variant="thin" className="opacity-85 transition-opacity group-hover:opacity-100" />
      </button>

      {isExpanded ? (
        <div className={cn(appTokens.routineEditorCompactStack, "pt-2")}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

function RoutineEditorWeekdayField({
  startDate,
  cycleLengthDays,
  onChange,
  trailingControl,
}: {
  startDate: string | undefined;
  cycleLengthDays: number | undefined;
  onChange?: (value: string) => void;
  trailingControl?: ReactNode;
}) {
  const startWeekday = getRoutineStartWeekdayFromDate(startDate) ?? ROUTINE_START_WEEKDAYS[0];
  const { coveredIndexSet, normalizedStartIndex, overflowDays } = buildCoveredWeekdayIndexes(startWeekday, cycleLengthDays);

  return (
    <RoutineEditorCollapsibleSection
      title="Cycle"
      info={{
        title: "Cycle",
        summary: "Controls when Day 1 starts and how many days the routine runs before repeating.",
      }}
    >
      <>
          {overflowDays > 0 ? (
            <p className="text-center text-[10px] text-[rgb(var(--text-muted)/0.82)]">
              +{overflowDays} more day{overflowDays === 1 ? "" : "s"} continue into next week
            </p>
          ) : null}
          <div className="mx-auto mt-2 flex w-fit max-w-full flex-wrap items-start justify-center gap-2">
            {trailingControl ? <div className="flex shrink-0 items-start">{trailingControl}</div> : null}
            <div className="flex shrink-0 items-start">
              <RoutineEditorTextField
                label="Day 1"
                className="w-[10.5rem]"
                info={{
                  title: "Cycle Start",
                  summary: "Calendar date that anchors Day 1 of the routine cycle.",
                }}
              >
                <input
                  type="date"
                  name="startDate"
                  required
                  value={startDate ?? ""}
                  onChange={(event) => onChange?.(event.target.value)}
                  className={cn(
                    routineEditorCycleInputClassName,
                    "[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-80",
                  )}
                />
              </RoutineEditorTextField>
            </div>
            <div className="max-w-full overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className={cn(ACTION_CHROME_RAIL_CLASS_NAME, ACTION_CHROME_RAIL_GRID_CLASS_NAME, "inline-flex w-max min-w-max")}>
                {weekdayOptions.map((option, index) => {
                  const isStartDay = index === normalizedStartIndex;
                  const isCoveredDay = coveredIndexSet.has(index);

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        publishRoutineEditorInfo({
                          title: "Cycle Start",
                          summary: "Pick a weekday to move Day 1 within the current calendar week.",
                        });
                        const nextStartDate = getDateForSelectedWeekdayInCurrentCalendarWeek(startDate, option.value);
                        if (nextStartDate) {
                          onChange?.(nextStartDate);
                        }
                      }}
                      data-action-chrome-intent={isStartDay ? "positive" : isCoveredDay ? "info" : "neutral"}
                      data-action-chrome-selected={isStartDay || isCoveredDay ? "true" : undefined}
                      data-action-chrome-segmented="true"
                      className={cn(
                        ACTION_CHROME_CONTROL_CLASS_NAME,
                        ACTION_CHROME_SEGMENTED_CLASS_NAME,
                        "flex min-h-10 min-w-[3.35rem] items-center justify-center rounded-[var(--action-chrome-segment-radius-compact)] px-3 text-[11px] font-semibold uppercase tracking-[0.14em]",
                        isStartDay
                          ? "border-[rgb(var(--accent-strong)/0.58)] bg-[linear-gradient(180deg,rgba(71,215,196,0.22),rgba(18,31,48,0.96))] ring-1 ring-[rgb(var(--accent-strong)/0.22)] text-[rgb(var(--text-primary))] shadow-[var(--action-chrome-shadow-hover)]"
                          : isCoveredDay
                            ? "border-[rgb(var(--accent)/0.46)] bg-[linear-gradient(180deg,rgba(71,215,196,0.18),rgba(18,31,48,0.94))] ring-1 ring-[rgb(var(--accent)/0.12)] text-[rgb(var(--text-primary)/0.96)] shadow-[0_8px_18px_rgb(0_0_0_/0.18)]"
                            : "text-[rgb(var(--text-secondary)/0.9)]",
                      )}
                      aria-pressed={isStartDay}
                      aria-label={`Set cycle start to ${option.value}`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
      </>
    </RoutineEditorCollapsibleSection>
  );
}

function RoutineEditorTextField({
  label,
  children,
  className,
  info,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  info?: RoutineEditorInfoPayload;
}) {
  return (
    <label className="block" {...(info ? routineEditorInfoHandlers(info) : {})}>
      <LabeledEditorField label={label} className={className}>
        {children}
      </LabeledEditorField>
    </label>
  );
}

function RoutineEditorCycleLengthField({
  value,
  onCycleLengthInputChange,
  onCycleLengthInputCommit,
  onFieldChange,
}: {
  value: string;
  onCycleLengthInputChange?: (value: string) => void;
  onCycleLengthInputCommit?: () => void;
  onFieldChange?: (field: string, value: string) => void;
}) {
  return (
    <RoutineEditorTextField
      label="Length"
      className="w-[5.25rem]"
      info={{
        title: "Cycle Length",
        summary: "Days before the routine repeats.",
      }}
    >
      <input
        type="text"
        inputMode="numeric"
        enterKeyHint="done"
        pattern="[0-9]*"
        name="cycleLengthDays"
        min={1}
        max={365}
        required
        value={value}
        onChange={(event) => {
          if (onCycleLengthInputChange) {
            onCycleLengthInputChange(event.target.value);
            return;
          }

          onFieldChange?.("cycleLengthDays", event.target.value);
        }}
        onBlur={() => onCycleLengthInputCommit?.()}
        onKeyDown={(event) => {
          if (event.key !== "Enter") {
            return;
          }

          event.preventDefault();
          onCycleLengthInputCommit?.();
        }}
        className={cn(
          routineEditorCycleInputClassName,
        )}
      />
    </RoutineEditorTextField>
  );
}

export function RoutineEditorFormFields({
  nameDefaultValue,
  cycleLengthDefaultValue,
  cycleLengthInputValue,
  startWeekdayDefaultValue,
  startDateDefaultValue,
  timezoneDefaultValue,
  weightUnitDefaultValue,
  distanceUnitDefaultValue,
  titleInput = false,
  values,
  onFieldChange,
  onCycleLengthInputChange,
  onCycleLengthInputCommit,
  fields,
}: {
  nameDefaultValue?: string;
  cycleLengthDefaultValue: number;
  cycleLengthInputValue?: string;
  startWeekdayDefaultValue: string;
  startDateDefaultValue?: string;
  timezoneDefaultValue: string;
  weightUnitDefaultValue: string;
  distanceUnitDefaultValue: string;
  titleInput?: boolean;
  values?: Partial<{ name: string; cycleLengthDays: number; startDate: string; startWeekday: string; timezone: string; weightUnit: string; distanceUnit: string }>;
  onFieldChange?: (field: string, value: string) => void;
  onCycleLengthInputChange?: (value: string) => void;
  onCycleLengthInputCommit?: () => void;
  fields?: readonly RoutineEditorFieldName[];
}) {
  const visibleFields = new Set<RoutineEditorFieldName>(fields ?? ["name", "cycleLengthDays", "startWeekday", "timezone", "weightUnit", "distanceUnit"]);
  const showName = visibleFields.has("name");
  const showCycleLength = visibleFields.has("cycleLengthDays");
  const showStartWeekday = visibleFields.has("startWeekday") || visibleFields.has("startDate");
  const showTimezone = visibleFields.has("timezone");
  const showWeightUnit = visibleFields.has("weightUnit");
  const showDistanceUnit = visibleFields.has("distanceUnit");
  const resolvedCycleLength = values?.cycleLengthDays ?? cycleLengthDefaultValue;
  const cycleLengthField = showCycleLength ? (
    <RoutineEditorCycleLengthField
      value={cycleLengthInputValue ?? String(values?.cycleLengthDays ?? cycleLengthDefaultValue)}
      onCycleLengthInputChange={onCycleLengthInputChange}
      onCycleLengthInputCommit={onCycleLengthInputCommit}
      onFieldChange={onFieldChange}
    />
  ) : null;

  return (
    <>
      {showName || (showCycleLength && !showStartWeekday) ? (
        <div className={cn(showName && showCycleLength && !showStartWeekday ? "grid grid-cols-12 gap-3 items-start" : "space-y-3")}>
          {showName ? (
            <div className={showCycleLength && !showStartWeekday ? "col-span-7" : undefined}>
              <RoutineEditorTextField
                label="Routine"
                className="mx-auto w-full max-w-[24rem]"
                info={{
                  title: "Routine Name",
                  summary: "Name shown on Today, Routines, and edit screens.",
                }}
              >
                <input
                  name="name"
                  required
                  maxLength={15}
                  defaultValue={nameDefaultValue}
                  value={values?.name}
                  onChange={(event) => onFieldChange?.("name", event.target.value)}
                  aria-label="Routine Name"
                  placeholder="Push/Pull/Legs"
                  className={cn(
                    labeledEditorFieldControlClassName,
                    "h-14 px-[10px] py-3 text-center",
                    titleInput ? "text-base" : undefined,
                  )}
                />
              </RoutineEditorTextField>
            </div>
          ) : null}

          {showCycleLength && !showStartWeekday ? (
            <div className={showName ? "col-span-5" : undefined}>
              {cycleLengthField}
            </div>
          ) : null}
        </div>
      ) : null}

      {showStartWeekday ? (
        <div className="pt-2">
          <RoutineEditorWeekdayField
            startDate={values?.startDate ?? startDateDefaultValue}
            cycleLengthDays={resolvedCycleLength}
            onChange={(nextValue) => onFieldChange?.("startDate", nextValue)}
            trailingControl={cycleLengthField}
          />
        </div>
      ) : null}

      {showTimezone ? (
        <RoutineEditorCollapsibleSection
          title="Timezone"
          info={{
            title: "Timezone",
            summary: "Day rollover for Today and routine cycle scheduling.",
          }}
        >
          <RoutineEditorSegmentedField
            label="Timezone"
            ariaLabel="Routine timezone"
            value={values?.timezone ?? timezoneDefaultValue}
            onChange={(nextValue) => onFieldChange?.("timezone", nextValue)}
            options={timezoneOptions}
            info={{
              title: "Timezone",
              summary: "Day rollover for Today and routine cycle scheduling.",
            }}
            showLabel={false}
            showDivider={false}
          />
        </RoutineEditorCollapsibleSection>
      ) : null}

      {showWeightUnit || showDistanceUnit ? (
        <RoutineEditorCollapsibleSection
          title="Units"
          info={{
            title: "Units",
            summary: "Default measurement units used for routine targets and logged workout values.",
          }}
        >
          <div className="flex justify-center">
            <div className="flex w-fit max-w-full flex-wrap items-start justify-center gap-2">
              {showWeightUnit ? (
                <RoutineEditorSegmentedField
                  label="Weight"
                  ariaLabel="Routine weight unit"
                  value={values?.weightUnit ?? weightUnitDefaultValue}
                  onChange={(nextValue) => onFieldChange?.("weightUnit", nextValue)}
                  options={weightUnitOptions}
                  info={{
                    title: "Weight",
                    summary: "Default load unit for strength targets and logged sets.",
                  }}
                  showDivider={false}
                />
              ) : null}

              {showDistanceUnit ? (
                <RoutineEditorSegmentedField
                  label="Distance"
                  ariaLabel="Routine distance unit"
                  value={values?.distanceUnit ?? distanceUnitDefaultValue}
                  onChange={(nextValue) => onFieldChange?.("distanceUnit", nextValue)}
                  options={distanceUnitOptions}
                  info={{
                    title: "Distance",
                    summary: "Default distance unit for cardio targets and logged distance work.",
                  }}
                  showDivider={false}
                />
              ) : null}
            </div>
          </div>
        </RoutineEditorCollapsibleSection>
      ) : null}
    </>
  );
}
