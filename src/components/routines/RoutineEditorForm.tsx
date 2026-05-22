"use client";

import { useState, type ReactNode } from "react";
import {
  ACTION_CHROME_CONTROL_CLASS_NAME,
  ACTION_CHROME_RAIL_CLASS_NAME,
  ACTION_CHROME_RAIL_GRID_CLASS_NAME,
  ACTION_CHROME_SEGMENTED_CLASS_NAME,
} from "@/components/ui/actionChrome";
import { ExpandingChoiceRow } from "@/components/ui/ExpandingChoiceRow";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { LabeledEditorField, labeledEditorFieldControlClassName } from "@/components/ui/LabeledEditorField";
import { appTokens } from "@/components/ui/app/tokens";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/Chevrons";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { cn } from "@/lib/cn";
import type { RoutineDetailsScheduleMode } from "@/lib/routine-details-form";
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

const scheduleModeOptions = [
  { value: "weekday_anchored", label: "Week-based" },
  { value: "rolling_n_day", label: "# day-based" },
] as const;

function getTimezoneInfoPayload(value: string): RoutineEditorInfoPayload {
  const label = getRoutineTimezoneLabel(value as (typeof ROUTINE_TIMEZONE_OPTIONS)[number]);
  return {
    title: "Timezone",
    summary: `${label} controls when the routine day rolls over for Today and for cycle day changes.`,
    sectionKey: "routine_setup",
  };
}

function getWeightUnitInfoPayload(value: string): RoutineEditorInfoPayload {
  return {
    title: "Weight Unit",
    summary: value === "kg"
      ? "Kilograms become the default weight unit for routine targets and workout logging."
      : "Pounds become the default weight unit for routine targets and workout logging.",
    sectionKey: "routine_setup",
  };
}

function getDistanceUnitInfoPayload(value: string): RoutineEditorInfoPayload {
  return {
    title: "Distance Unit",
    summary: value === "km"
      ? "Kilometers become the default distance unit for cardio targets and logged workout values."
      : "Miles become the default distance unit for cardio targets and logged workout values.",
    sectionKey: "routine_setup",
  };
}

export type RoutineEditorFieldName =
  | "name"
  | "cycleLengthDays"
  | "scheduleMode"
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
  labelClassName,
}: {
  label: string;
  detail?: ReactNode;
  labelClassName?: string;
}) {
  return (
    <div className="text-center">
      <p className={cn("text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-muted)/0.92)]", labelClassName)}>{label}</p>
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

function RoutineEditorBinaryToggleButton({
  label,
  ariaLabel,
  onClick,
  className,
}: {
  label: string;
  ariaLabel: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        ACTION_CHROME_CONTROL_CLASS_NAME,
        ACTION_CHROME_SEGMENTED_CLASS_NAME,
        "inline-flex min-h-10 items-center justify-center rounded-[var(--action-chrome-segment-radius-compact)] border-[rgb(var(--accent-strong)/0.58)] bg-[linear-gradient(180deg,rgba(71,215,196,0.22),rgba(18,31,48,0.96))] px-4 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-primary))] ring-1 ring-[rgb(var(--accent-strong)/0.22)] shadow-[var(--action-chrome-shadow-hover)] focus-visible:ring-[rgb(var(--accent)/0.2)]",
        className,
      )}
    >
      <span className="flex flex-col items-center justify-center gap-0.5 leading-none">
        <span>{label}</span>
        <ChevronDownIcon className="h-3 w-3 text-[rgb(var(--accent-strong)/0.94)]" />
      </span>
    </button>
  );
}

const routineEditorCycleInputClassName = cn(
  labeledEditorFieldControlClassName,
  "h-11 min-h-11 px-3 py-2 text-center font-semibold leading-none tabular-nums",
);
const routineEditorCycleFieldWidthClassName = "w-[10.5rem]";
const routineEditorCompactExpandingControlWidthClassName = "w-full max-w-[9rem]";

type RoutineEditorInfoPayload = {
  title: string;
  summary: string;
  sectionKey?: "routine_setup";
};

type RoutineEditorInfoSectionKey = "routine_setup" | "progression_method";

function publishRoutineEditorSectionToggle(args: {
  sectionKey: RoutineEditorInfoSectionKey;
  isOpen: boolean;
}) {
  window.dispatchEvent(new CustomEvent("fitness:routine-editor-section-toggle", { detail: args }));
}

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
  getInfoForValue,
  showDivider = true,
  showLabel = true,
  display = "segmented",
  fullWidthWhenExpanded = false,
  toggleWhenBinary = false,
  expandedControlWidthClassName,
}: {
  label: string;
  ariaLabel: string;
  value: string | undefined;
  onChange?: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  detail?: ReactNode;
  info?: RoutineEditorInfoPayload;
  getInfoForValue?: (value: string) => RoutineEditorInfoPayload;
  showDivider?: boolean;
  showLabel?: boolean;
  display?: "segmented" | "expanding";
  fullWidthWhenExpanded?: boolean;
  toggleWhenBinary?: boolean;
  expandedControlWidthClassName?: string;
}) {
  const isExpandingDisplay = display === "expanding";
  const resolvedValue = value ?? options[0]?.value ?? "";
  const shouldToggleWhenBinary = toggleWhenBinary && options.length === 2;
  const resolvedInfo = getInfoForValue ? getInfoForValue(resolvedValue) : info;
  const handleValueChange = (nextValue: string) => {
    if (getInfoForValue) {
      publishRoutineEditorInfo(getInfoForValue(nextValue));
    }
    onChange?.(nextValue);
  };
  const activeOption = options.find((option) => option.value === resolvedValue) ?? options[0];
  const nextToggleOption = shouldToggleWhenBinary
    ? options.find((option) => option.value !== resolvedValue) ?? options[0]
    : null;

  return (
    <div {...(resolvedInfo ? routineEditorInfoHandlers(resolvedInfo) : {})}>
      {showLabel ? <RoutineEditorControlCaption label={label} detail={detail} /> : null}
      <div className={cn(showLabel ? "mt-2" : undefined, "flex justify-center")}>
        <div
          className={cn(
            "max-w-full pb-1",
            isExpandingDisplay
              ? "w-full"
              : "overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          )}
        >
          <div className={cn(isExpandingDisplay ? "mx-auto w-full" : "mx-auto w-max min-w-max")}>
            {isExpandingDisplay ? (
              shouldToggleWhenBinary ? (
                <div className="mx-auto flex justify-center">
                  <RoutineEditorBinaryToggleButton
                    label={activeOption?.label ?? resolvedValue}
                    ariaLabel={ariaLabel}
                    onClick={() => {
                      if (nextToggleOption) {
                        handleValueChange(nextToggleOption.value);
                      }
                    }}
                    className={fullWidthWhenExpanded
                      ? (expandedControlWidthClassName ?? "w-full max-w-[16rem]")
                      : "min-w-[14.75rem]"}
                  />
                </div>
              ) : (
                <ExpandingChoiceRow
                  ariaLabel={ariaLabel}
                  options={options.map((option) => ({ label: option.label, value: option.value }))}
                  value={resolvedValue}
                  onChange={handleValueChange}
                  className={cn(
                    fullWidthWhenExpanded
                      ? (expandedControlWidthClassName ?? "mx-auto w-full")
                      : "mx-auto min-w-[14.75rem]",
                  )}
                />
              )
            ) : (
              <SegmentedControl
                ariaLabel={ariaLabel}
                options={options.map((option) => ({ label: option.label, value: option.value }))}
                value={resolvedValue}
                onChange={handleValueChange}
                size="sm"
                activeIntent="positive"
                fitContent
                className="mx-auto flex-wrap justify-center"
              />
            )}
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
  sectionKey,
}: {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  info?: RoutineEditorInfoPayload;
  sectionKey?: RoutineEditorInfoSectionKey;
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
        onClick={() => {
          setIsExpanded((current) => {
            const nextValue = !current;
            if (sectionKey) {
              publishRoutineEditorSectionToggle({
                sectionKey,
                isOpen: nextValue,
              });
            }
            return nextValue;
          });
        }}
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
  scheduleMode,
  startDate,
  cycleLengthDays,
  onScheduleModeChange,
  onChange,
  trailingControl,
}: {
  scheduleMode: RoutineDetailsScheduleMode;
  startDate: string | undefined;
  cycleLengthDays: number | undefined;
  onScheduleModeChange?: (value: RoutineDetailsScheduleMode) => void;
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
        summary: "Controls the cycle shape: schedule mode, Day 1 anchor, cycle length, and weekday anchor behavior for week-based schedules.",
        sectionKey: "routine_setup",
      }}
    >
      <>
          <RoutineEditorSegmentedField
            label=""
            ariaLabel="Routine schedule mode"
            value={scheduleMode}
            onChange={(value) => onScheduleModeChange?.(value as RoutineDetailsScheduleMode)}
            options={scheduleModeOptions}
            display="expanding"
            fullWidthWhenExpanded
            showLabel={false}
              info={{
                title: "Schedule Mode",
                summary: scheduleMode === "rolling_n_day"
                ? "Day-based schedules repeat every N days from the Day 1 anchor date and do not use a weekday cycle anchor."
                : "Week-based schedules anchor Day 1 to a weekday. If the cycle is shorter than a week, uncovered weekdays stay unscheduled.",
                sectionKey: "routine_setup",
              }}
            showDivider={false}
            toggleWhenBinary
            expandedControlWidthClassName={routineEditorCompactExpandingControlWidthClassName}
          />
          {overflowDays > 0 ? (
            <p className="text-center text-[10px] text-[rgb(var(--text-muted)/0.82)]">
              +{overflowDays} more day{overflowDays === 1 ? "" : "s"} continue into next week
            </p>
          ) : null}
          <div className="mx-auto mt-2 flex w-fit max-w-full flex-wrap items-start justify-center gap-2">
            {trailingControl ? <div className="flex shrink-0 items-start">{trailingControl}</div> : null}
            <div className="flex shrink-0 items-start">
              <RoutineEditorTextField
                label={scheduleMode === "rolling_n_day" ? "Anchor" : "Day 1"}
                className={routineEditorCycleFieldWidthClassName}
                info={{
                  title: scheduleMode === "rolling_n_day" ? "Rolling Anchor" : "Cycle Start",
                  summary: scheduleMode === "rolling_n_day"
                    ? "Calendar date that anchors the repeating N-day cycle."
                    : "Calendar date that places Day 1 inside the current anchored week.",
                  sectionKey: "routine_setup",
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
          </div>
          {scheduleMode === "weekday_anchored" ? (
            <div className="mt-3 space-y-2">
              <RoutineEditorControlCaption
                label="Weekday Cycle Anchor"
                labelClassName="text-[rgb(var(--accent-divider-rgb)/0.98)]"
              />
              <div className="flex justify-center max-w-full overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className={cn(ACTION_CHROME_RAIL_CLASS_NAME, ACTION_CHROME_RAIL_GRID_CLASS_NAME, "mx-auto inline-flex w-max min-w-max")}>
                  {weekdayOptions.map((option, index) => {
                    const isStartDay = index === normalizedStartIndex;
                    const isCoveredDay = coveredIndexSet.has(index);

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          publishRoutineEditorInfo({
                            title: "Weekday Cycle Anchor",
                            summary: "Pick which weekday Day 1 anchors to inside the current calendar week. Covered days show how the current cycle spans forward from that anchor, and extra cycle days continue into the next week.",
                            sectionKey: "routine_setup",
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
          ) : null}
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
      className={routineEditorCycleFieldWidthClassName}
      info={{
        title: "Cycle Length",
        summary: "Total routine days before the cycle repeats. In week-based mode, extra days continue into the next week.",
        sectionKey: "routine_setup",
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
  scheduleModeDefaultValue,
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
  scheduleModeDefaultValue: RoutineDetailsScheduleMode;
  cycleLengthInputValue?: string;
  startWeekdayDefaultValue: string;
  startDateDefaultValue?: string;
  timezoneDefaultValue: string;
  weightUnitDefaultValue: string;
  distanceUnitDefaultValue: string;
  titleInput?: boolean;
  values?: Partial<{ name: string; cycleLengthDays: number; scheduleMode: RoutineDetailsScheduleMode; startDate: string; startWeekday: string; timezone: string; weightUnit: string; distanceUnit: string }>;
  onFieldChange?: (field: string, value: string) => void;
  onCycleLengthInputChange?: (value: string) => void;
  onCycleLengthInputCommit?: () => void;
  fields?: readonly RoutineEditorFieldName[];
}) {
  const visibleFields = new Set<RoutineEditorFieldName>(fields ?? ["name", "cycleLengthDays", "scheduleMode", "startWeekday", "timezone", "weightUnit", "distanceUnit"]);
  const showName = visibleFields.has("name");
  const showCycleLength = visibleFields.has("cycleLengthDays");
  const showScheduleMode = visibleFields.has("scheduleMode");
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
            scheduleMode={showScheduleMode ? (values?.scheduleMode ?? scheduleModeDefaultValue) : "weekday_anchored"}
            startDate={values?.startDate ?? startDateDefaultValue}
            cycleLengthDays={resolvedCycleLength}
            onScheduleModeChange={(nextValue) => onFieldChange?.("scheduleMode", nextValue)}
            onChange={(nextValue) => onFieldChange?.("startDate", nextValue)}
            trailingControl={cycleLengthField}
          />
        </div>
      ) : null}

      {showTimezone ? (
        <RoutineEditorCollapsibleSection
          title="Timezone"
          sectionKey="routine_setup"
          info={{
            title: "Timezone",
            summary: "Controls Today rollover and routine cycle day rollover.",
          }}
        >
          <RoutineEditorSegmentedField
            label="Timezone"
            ariaLabel="Routine timezone"
            value={values?.timezone ?? timezoneDefaultValue}
            onChange={(nextValue) => onFieldChange?.("timezone", nextValue)}
            options={timezoneOptions}
            display="expanding"
            fullWidthWhenExpanded
            getInfoForValue={getTimezoneInfoPayload}
            showLabel={false}
            showDivider={false}
          />
        </RoutineEditorCollapsibleSection>
      ) : null}

      {showWeightUnit || showDistanceUnit ? (
        <RoutineEditorCollapsibleSection
          title="Units"
          sectionKey="routine_setup"
          info={{
            title: "Units",
            summary: "Default measurement units used for routine targets, progression values, and logged workout values.",
          }}
        >
          <div className="space-y-3">
            {showWeightUnit ? (
              <RoutineEditorSegmentedField
                label="Weight"
                ariaLabel="Routine weight unit"
                value={values?.weightUnit ?? weightUnitDefaultValue}
                onChange={(nextValue) => onFieldChange?.("weightUnit", nextValue)}
                options={weightUnitOptions}
                display="expanding"
                fullWidthWhenExpanded
                getInfoForValue={getWeightUnitInfoPayload}
                showDivider={false}
                toggleWhenBinary
                expandedControlWidthClassName={routineEditorCompactExpandingControlWidthClassName}
              />
            ) : null}

            {showDistanceUnit ? (
              <RoutineEditorSegmentedField
                label="Distance"
                ariaLabel="Routine distance unit"
                value={values?.distanceUnit ?? distanceUnitDefaultValue}
                onChange={(nextValue) => onFieldChange?.("distanceUnit", nextValue)}
                options={distanceUnitOptions}
                display="expanding"
                fullWidthWhenExpanded
                getInfoForValue={getDistanceUnitInfoPayload}
                showDivider={false}
                toggleWhenBinary
                expandedControlWidthClassName={routineEditorCompactExpandingControlWidthClassName}
              />
            ) : null}
          </div>
        </RoutineEditorCollapsibleSection>
      ) : null}
    </>
  );
}
