"use client";

import type { ReactNode } from "react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { type ExerciseTagGroup } from "@/components/ExerciseTagFilterControl";
import { DEFAULT_EXERCISE_SEARCH_FILTERS_STACK_CLASSNAME, ExerciseSearchFilters } from "@/components/exercises/ExerciseSearchFilters";
import { HistoryCalendarSurface } from "@/components/history/HistoryCalendarSurface";
import { MonthlyProgressSurface } from "@/components/history/MonthlyProgressSurface";
import { WorkoutStreakSurface } from "@/components/history/WorkoutStreakSurface";
import { HistoryTitleControlShell } from "@/components/history/HistoryShared";
import { HistorySessionCard } from "@/components/history/HistorySessionCard";
import { HistoryScopeSummarySurface } from "@/components/history/HistoryScopeSummarySurface";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { HorizontalScrollHint } from "@/components/ui/HorizontalScrollHint";
import { PillButton } from "@/components/ui/Pill";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { SharedSectionShell } from "@/components/ui/app/SharedSectionShell";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";
import { buildHistoryCalendarView } from "@/lib/history-calendar";
import { buildHistoryMonthlyProgress } from "@/lib/history-monthly-progress";
import {
  buildHistoryWorkoutStreak,
  filterHistorySkippedDayKeysForTimeline,
  shouldShowHistoryWorkoutStreak,
} from "@/lib/history-workout-streak";
import { getWeeklyProgressDayKey, getWeeklyProgressWeekStart, type WeeklyProgressSummary } from "@/lib/history-weekly-progress";
import { formatDateShort } from "@/lib/formatting";
import { WeeklyProgressSurface } from "@/components/history/WeeklyProgressSurface";
import type { HistoryScopeSummary } from "@/lib/history-scope-summary";
import { buildSessionMetricTagGroup, buildSessionMetricTagValues } from "@/lib/history-metric-filters";
import { rememberHistorySessionSummaries } from "@/lib/history-session-summary-cache";
import {
  createDefaultExerciseInfoFilterState,
  normalizeExerciseInfoFilterState,
  type ExerciseInfoFilterOptions,
  type ExerciseInfoFilterState,
  type ExerciseInfoRoutineFilterOption,
} from "@/lib/exercise-info-scope";
import type { SessionSummary } from "./session-summary";

function normalizeSessionTagValue(prefix: string, value: string) {
  return `${prefix}:${value.trim().toLowerCase()}`;
}

function formatSessionTagLabel(value: string) {
  return value.trim();
}

function formatHistoryTimelineDay(dayKey: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dayKey}T12:00:00.000Z`));
}

function formatHistoryTimelineMonth(monthKey: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${monthKey}-01T12:00:00.000Z`));
}

function buildFilterStateKey(filterState: ExerciseInfoFilterState) {
  return [
    filterState.analyticsScope,
    filterState.routineId ?? "",
    filterState.cycleStartDate ?? "",
  ].join("::");
}

function orderSelectedFirst<T>(options: T[], isSelected: (option: T) => boolean) {
  const selected: T[] = [];
  const unselected: T[] = [];
  for (const option of options) {
    if (isSelected(option)) {
      selected.push(option);
    } else {
      unselected.push(option);
    }
  }

  return [...selected, ...unselected];
}

const HISTORY_CYCLE_SEPARATOR_CLASS_NAME = "bg-[linear-gradient(90deg,rgb(var(--accent-yellow-on)/0.16),rgb(var(--accent-yellow-on)/0.92),rgb(var(--accent-yellow-on)/0.16))] shadow-[0_0_14px_rgb(var(--accent-yellow-on)/0.22)]";
const FILTER_SECTION_STACK_CLASS_NAME = "space-y-1";
const FILTER_SECTION_HEADER_CLASS_NAME = "w-fit max-w-full space-y-[2px] pl-[4px] pt-[2px]";
const FILTER_SECTION_RAIL_CLASS_NAME = "hide-scrollbar -mx-1.5 max-w-none overflow-x-auto overflow-y-visible px-1.5 pb-1 [touch-action:pan-x] [-webkit-overflow-scrolling:touch] [overscroll-behavior-y:auto]";

type HistorySessionsScopePayload = {
  sessionItems: SessionSummary[];
  plannedSkippedDayKeys: string[];
  scopeSummary: HistoryScopeSummary;
  weeklyProgress: WeeklyProgressSummary;
  weeklyProgressByWeek: WeeklyProgressSummary[];
  routineTitle: string | null;
};
type HistoryTimelineFilterOption = {
  key: string;
  label: string;
};
const EMPTY_SESSION_ITEMS: SessionSummary[] = [];
const EMPTY_WEEKLY_PROGRESS_BY_WEEK: WeeklyProgressSummary[] = [];

function HistoryCycleSectionSeparator({ className }: { className?: string }) {
  return (
    <div className={cn("px-1.5 pt-2 pb-1.5", className)}>
      <MetricAccentBar
        variant="thin"
        className={HISTORY_CYCLE_SEPARATOR_CLASS_NAME}
      />
    </div>
  );
}

function FilterSection({
  title,
  showClear = false,
  onClear,
  children,
}: {
  title: string;
  showClear?: boolean;
  onClear?: () => void;
  children: ReactNode;
}) {
  return (
    <div className={FILTER_SECTION_STACK_CLASS_NAME}>
      <div className={FILTER_SECTION_HEADER_CLASS_NAME}>
        <p className={appTokens.exercisePickerFilterGroupLabel}>{title}</p>
        <MetricAccentBar variant="thin" className="w-full opacity-80" />
      </div>
      <HorizontalScrollHint
        scrollClassName={FILTER_SECTION_RAIL_CLASS_NAME}
        contentClassName="flex min-w-max flex-nowrap gap-1.5 pt-0"
      >
          {showClear && onClear ? (
            <button
              type="button"
              onClick={onClear}
              className={cn(
                appTokens.exercisePickerFilterClearButton,
                "!border-[rgb(var(--accent-yellow-on)/0.58)]",
                "mr-2.5 shrink-0 whitespace-nowrap px-2 py-1 text-[10px]",
              )}
            >
              Clear
            </button>
          ) : null}
          {children}
      </HorizontalScrollHint>
      <div className="px-[4px] pt-0.5">
        <MetricAccentBar variant="thin" className="w-full opacity-80" />
      </div>
    </div>
  );
}

function buildSessionSearchText(session: SessionSummary) {
  return [
    session.routineTitle,
    session.dayTitle,
    formatDateShort(session.startedAt),
    session.bestLift?.exerciseName,
    session.bestLift?.display,
    session.prLabel,
    session.progressionSummary?.headline,
    session.progressionSummary?.detail,
    ...(session.exerciseNames ?? []),
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .toLowerCase();
}

function HistorySessionFilters({
  query,
  onQueryChange,
  selectedTags,
  onTagsChange,
  groups,
  resultCount,
  initialOpen = false,
  filterState,
  filterOptions,
  onFilterStateChange,
  selectedCalendarDayKey,
  onCalendarDayChange,
  calendarDayOptions,
  selectedMonthKey,
  onMonthChange,
  monthOptions,
  showClearAll,
  onClearAll,
}: {
  query: string;
  onQueryChange: (next: string) => void;
  selectedTags: string[];
  onTagsChange: (next: string[]) => void;
  groups: ExerciseTagGroup[];
  resultCount: number;
  initialOpen?: boolean;
  filterState: ExerciseInfoFilterState;
  filterOptions: ExerciseInfoFilterOptions;
  onFilterStateChange: (next: ExerciseInfoFilterState) => void;
  selectedCalendarDayKey: string | null;
  onCalendarDayChange: (next: string | null) => void;
  calendarDayOptions: HistoryTimelineFilterOption[];
  selectedMonthKey: string | null;
  onMonthChange: (next: string | null) => void;
  monthOptions: HistoryTimelineFilterOption[];
  showClearAll: boolean;
  onClearAll: () => void;
}) {
  const normalizedFilterState = useMemo(() => normalizeExerciseInfoFilterState(filterState), [filterState]);
  const routineOptions = Array.isArray(filterOptions.routines) ? filterOptions.routines : [];
  const defaultRoutineOption = routineOptions.find((routine) => routine.isActive) ?? routineOptions[0] ?? null;
  const selectedRoutine = normalizedFilterState.routineId
    ? routineOptions.find((routine) => routine.id === normalizedFilterState.routineId) ?? null
    : defaultRoutineOption;
  const selectedCycleStartDate = normalizedFilterState.cycleStartDate;
  const orderedRoutineOptions = orderSelectedFirst(routineOptions, (routine) => routine.id === selectedRoutine?.id);
  const cycleOptions = routineOptions.flatMap((routine) => routine.cycleOptions.map((cycle) => ({
    ...cycle,
    routineId: routine.id,
    routineTitle: routine.title,
  })));
  const orderedCycleOptions = orderSelectedFirst(
    cycleOptions,
    (cycle) => cycle.startDate === selectedCycleStartDate && cycle.routineId === normalizedFilterState.routineId,
  );

  const applyFilterState = (nextState: Partial<ExerciseInfoFilterState>) => {
    onFilterStateChange(normalizeExerciseInfoFilterState(nextState));
  };

  const handleRoutineScopeSelect = () => {
    if (normalizedFilterState.analyticsScope !== "all_time") {
      return;
    }

    const nextRoutine = selectedRoutine ?? defaultRoutineOption;
    if (!nextRoutine) {
      return;
    }

    applyFilterState({
      analyticsScope: "current_routine",
      routineId: nextRoutine.id,
      cycleStartDate: null,
    });
  };

  const handleRoutineSelect = (routine: ExerciseInfoRoutineFilterOption) => {
    if (
      normalizedFilterState.analyticsScope === "current_routine"
      && normalizedFilterState.routineId === routine.id
    ) {
      return;
    }

    if (
      normalizedFilterState.analyticsScope === "current_cycle"
      && normalizedFilterState.routineId === routine.id
      && Boolean(normalizedFilterState.cycleStartDate)
    ) {
      return;
    }

    if (normalizedFilterState.analyticsScope === "current_cycle") {
      const nextCycle = routine.cycleOptions[0] ?? null;
      if (nextCycle) {
        applyFilterState({
          analyticsScope: "current_cycle",
          routineId: routine.id,
          cycleStartDate: nextCycle.startDate,
        });
        return;
      }
    }

    applyFilterState({
      analyticsScope: "current_routine",
      routineId: routine.id,
      cycleStartDate: null,
    });
  };

  const filterExtraContent = (
    <>
      {routineOptions.length > 0 ? (
        <FilterSection
          title="Scope"
          showClear={normalizedFilterState.analyticsScope !== "all_time"}
          onClear={() => onFilterStateChange(createDefaultExerciseInfoFilterState())}
        >
          <PillButton
            type="button"
            active={normalizedFilterState.analyticsScope !== "all_time"}
            className={cn(
              "shrink-0 whitespace-nowrap px-2 py-1 text-[10px]",
              normalizedFilterState.analyticsScope !== "all_time"
                ? "!border-[rgb(var(--accent)/0.82)] !bg-[rgb(var(--accent)/0.42)] !text-[rgb(240_255_251)] shadow-[0_0_0_1px_rgba(71,215,196,0.22),inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                : undefined,
            )}
            onClick={handleRoutineScopeSelect}
          >
            Routine
          </PillButton>
        </FilterSection>
      ) : null}

      {normalizedFilterState.analyticsScope !== "all_time" && orderedRoutineOptions.length > 0 ? (
        <FilterSection
          title="Routine"
          showClear
          onClear={() => onFilterStateChange(createDefaultExerciseInfoFilterState())}
        >
          {orderedRoutineOptions.map((routine) => {
            const isSelected = selectedRoutine?.id === routine.id;
            return (
              <PillButton
                key={routine.id}
                type="button"
                active={isSelected}
                className={cn(
                  "shrink-0 whitespace-nowrap px-2 py-1 text-[10px]",
                  isSelected ? "!border-[rgb(var(--accent)/0.82)] !bg-[rgb(var(--accent)/0.42)] !text-[rgb(240_255_251)] shadow-[0_0_0_1px_rgba(71,215,196,0.22),inset_0_0_0_1px_rgba(255,255,255,0.06)]" : undefined,
                )}
                onClick={() => handleRoutineSelect(routine)}
              >
                {routine.title}
              </PillButton>
            );
          })}
        </FilterSection>
      ) : null}

      {orderedCycleOptions.length > 0 ? (
        <FilterSection
          title="Cycle"
          showClear={Boolean(selectedCycleStartDate)}
          onClear={() => onFilterStateChange(createDefaultExerciseInfoFilterState())}
        >
          {orderedCycleOptions.map((cycle) => {
            const isSelected = cycle.startDate === selectedCycleStartDate && cycle.routineId === normalizedFilterState.routineId;
            return (
              <PillButton
                key={`${cycle.routineId}:${cycle.startDate}`}
                type="button"
                active={isSelected}
                className={cn(
                  "shrink-0 whitespace-nowrap px-2 py-1 text-[10px]",
                  isSelected ? "!border-[rgb(var(--accent)/0.82)] !bg-[rgb(var(--accent)/0.42)] !text-[rgb(240_255_251)] shadow-[0_0_0_1px_rgba(71,215,196,0.22),inset_0_0_0_1px_rgba(255,255,255,0.06)]" : undefined,
                )}
                onClick={() => {
                  onCalendarDayChange(null);
                  onMonthChange(null);
                  applyFilterState({
                    analyticsScope: "current_cycle",
                    routineId: cycle.routineId,
                    cycleStartDate: cycle.startDate,
                  });
                }}
              >
                {routineOptions.length > 1 ? `${cycle.routineTitle}: ${cycle.label}` : cycle.label}
              </PillButton>
            );
          })}
        </FilterSection>
      ) : null}
      {calendarDayOptions.length > 0 ? (
        <FilterSection title="Session Date" showClear={Boolean(selectedCalendarDayKey)} onClear={() => onCalendarDayChange(null)}>
          {calendarDayOptions.map((option) => {
            const isSelected = option.key === selectedCalendarDayKey;
            return (
              <PillButton
                key={option.key}
                type="button"
                active={isSelected}
                className={cn(
                  "shrink-0 whitespace-nowrap px-2 py-1 text-[10px]",
                  isSelected ? "!border-[rgb(var(--accent)/0.82)] !bg-[rgb(var(--accent)/0.42)] !text-[rgb(240_255_251)]" : undefined,
                )}
                onClick={() => onCalendarDayChange(isSelected ? null : option.key)}
              >
                {option.label}
              </PillButton>
            );
          })}
        </FilterSection>
      ) : null}
      {monthOptions.length > 0 ? (
        <FilterSection title="Month" showClear={Boolean(selectedMonthKey)} onClear={() => onMonthChange(null)}>
          {monthOptions.map((option) => {
            const isSelected = option.key === selectedMonthKey;
            return (
              <PillButton
                key={option.key}
                type="button"
                active={isSelected}
                className={cn(
                  "shrink-0 whitespace-nowrap px-2 py-1 text-[10px]",
                  isSelected ? "!border-[rgb(var(--accent)/0.82)] !bg-[rgb(var(--accent)/0.42)] !text-[rgb(240_255_251)]" : undefined,
                )}
                onClick={() => onMonthChange(isSelected ? null : option.key)}
              >
                {option.label}
              </PillButton>
            );
          })}
        </FilterSection>
      ) : null}
    </>
  );

  return (
    <ExerciseSearchFilters
      query={query}
      onQueryChange={onQueryChange}
      selectedTags={selectedTags}
      onTagsChange={onTagsChange}
      groups={groups}
      resultCount={resultCount}
      filterLabel="Filters"
      className={cn(appTokens.historyExerciseFilterStack, DEFAULT_EXERCISE_SEARCH_FILTERS_STACK_CLASSNAME)}
      filterClassName="space-y-1.5"
      filterButtonClassName={appTokens.historyExerciseFilterButton}
      filterPanelClassName={cn(
        appTokens.historyExerciseFilterPanel,
        "!overflow-visible !bg-[rgb(var(--surface-1-rgb))] !backdrop-blur-none",
      )}
      filterHorizontalRailOverrideClassName="-mx-1.5 px-1.5"
      filterCompactDensity="tight"
      searchInputClassName={appTokens.historyExerciseSearchInput}
      clearButtonClassName={appTokens.exercisePickerSearchClearButton}
      searchPlaceholder="Search sessions"
      resultSingularLabel="session"
      resultPluralLabel="sessions"
      clearSearchAriaLabel="Clear session search"
      toggleFiltersAriaLabel="Toggle session filters"
      additionalFilterCount={(normalizedFilterState.analyticsScope !== "all_time" ? 1 : 0) + (selectedCalendarDayKey ? 1 : 0) + (selectedMonthKey ? 1 : 0)}
      trailingControls={showClearAll ? (
        <button
          type="button"
          onClick={onClearAll}
          aria-label="Clear all History filters"
          title="Clear all filters"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[rgb(var(--success-rgb)/0.46)] bg-[rgb(var(--surface-2-rgb)/0.62)] text-[1rem] leading-none text-[rgb(var(--success-rgb)/0.96)] shadow-[0_0_10px_rgb(var(--success-rgb)/0.1)] transition-colors hover:bg-[rgb(var(--success-rgb)/0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.3)]"
        >
          &times;
        </button>
      ) : null}
      defaultFilterOpen={initialOpen}
      chromeVariant="history"
      filterExtraContent={filterExtraContent}
    />
  );
}

export function HistorySessionsClient({
  sessions,
  filterOptions = { routines: [] },
  currentRoutineSessions = [],
  currentCycleSessions = [],
  plannedSkippedDayKeys = [],
  currentRoutinePlannedSkippedDayKeys = [],
  currentCyclePlannedSkippedDayKeys = [],
  activeRoutineTitle = null,
  scopeSummary,
  currentRoutineScopeSummary,
  currentCycleScopeSummary,
  weeklyProgress,
  currentRoutineWeeklyProgress,
  currentCycleWeeklyProgress,
  weeklyProgressByWeek = [],
  currentRoutineWeeklyProgressByWeek = [],
  currentCycleWeeklyProgressByWeek = [],
  selectedSessionId,
  initialViewMode = "compact",
  initialFiltersOpen = false,
  initialSelectedDayKey = null,
  initialQuery = "",
  initialSelectedTags = [],
  showBottomActions = true,
  sessionHrefOverrides,
  calendarNow,
}: {
  sessions: SessionSummary[];
  filterOptions?: ExerciseInfoFilterOptions;
  currentRoutineSessions?: SessionSummary[];
  currentCycleSessions?: SessionSummary[];
  plannedSkippedDayKeys?: string[];
  currentRoutinePlannedSkippedDayKeys?: string[];
  currentCyclePlannedSkippedDayKeys?: string[];
  activeRoutineTitle?: string | null;
  scopeSummary: HistoryScopeSummary;
  currentRoutineScopeSummary: HistoryScopeSummary;
  currentCycleScopeSummary: HistoryScopeSummary;
  weeklyProgress: WeeklyProgressSummary;
  currentRoutineWeeklyProgress: WeeklyProgressSummary;
  currentCycleWeeklyProgress: WeeklyProgressSummary;
  weeklyProgressByWeek?: WeeklyProgressSummary[];
  currentRoutineWeeklyProgressByWeek?: WeeklyProgressSummary[];
  currentCycleWeeklyProgressByWeek?: WeeklyProgressSummary[];
  selectedSessionId?: string;
  initialViewMode?: "compact" | "detailed";
  initialFiltersOpen?: boolean;
  initialSelectedDayKey?: string | null;
  initialQuery?: string;
  initialSelectedTags?: string[];
  showBottomActions?: boolean;
  sessionHrefOverrides?: Record<string, string>;
  calendarNow?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialSelectedTags);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(initialSelectedDayKey);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"compact" | "detailed">(initialViewMode);
  const [filterState, setFilterState] = useState<ExerciseInfoFilterState>(createDefaultExerciseInfoFilterState());
  const [payloadsByFilterKey, setPayloadsByFilterKey] = useState<Record<string, HistorySessionsScopePayload>>(() => {
    const initialPayloads: Record<string, HistorySessionsScopePayload> = {
      [buildFilterStateKey(createDefaultExerciseInfoFilterState())]: {
        sessionItems: sessions,
        plannedSkippedDayKeys,
        scopeSummary,
        weeklyProgress,
        weeklyProgressByWeek,
        routineTitle: null,
      },
    };
    const activeRoutine = filterOptions.routines.find((routine) => routine.isActive) ?? null;
    if (activeRoutine) {
      initialPayloads[buildFilterStateKey({
        analyticsScope: "current_routine",
        routineId: activeRoutine.id,
        cycleStartDate: null,
      })] = {
        sessionItems: currentRoutineSessions,
        plannedSkippedDayKeys: currentRoutinePlannedSkippedDayKeys,
        scopeSummary: currentRoutineScopeSummary,
        weeklyProgress: currentRoutineWeeklyProgress,
        weeklyProgressByWeek: currentRoutineWeeklyProgressByWeek,
        routineTitle: activeRoutine.title,
      };

      const activeCycleStartDate = activeRoutine.cycleOptions.find((cycle) => cycle.startDate === currentCycleWeeklyProgress.weekStart)?.startDate
        ?? null;
      if (activeCycleStartDate) {
        initialPayloads[buildFilterStateKey({
          analyticsScope: "current_cycle",
          routineId: activeRoutine.id,
          cycleStartDate: activeCycleStartDate,
        })] = {
          sessionItems: currentCycleSessions,
          plannedSkippedDayKeys: currentCyclePlannedSkippedDayKeys,
          scopeSummary: currentCycleScopeSummary,
          weeklyProgress: currentCycleWeeklyProgress,
          weeklyProgressByWeek: currentCycleWeeklyProgressByWeek,
          routineTitle: activeRoutine.title,
        };
      }
    }

    return initialPayloads;
  });
  const [lastVisiblePayload, setLastVisiblePayload] = useState<HistorySessionsScopePayload>({
    sessionItems: sessions,
    plannedSkippedDayKeys,
    scopeSummary,
    weeklyProgress,
    weeklyProgressByWeek,
    routineTitle: null,
  });
  const [isScopeLoading, setIsScopeLoading] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const nextViewModeLabel = viewMode === "compact" ? "View Detailed" : "View Compact";
  const normalizedFilterState = useMemo(() => normalizeExerciseInfoFilterState(filterState), [filterState]);
  const filterKey = useMemo(() => buildFilterStateKey(normalizedFilterState), [normalizedFilterState]);
  const scopedPayload = useMemo(() => (
    normalizedFilterState.analyticsScope === "all_time"
      ? payloadsByFilterKey[buildFilterStateKey(createDefaultExerciseInfoFilterState())]
      : (payloadsByFilterKey[filterKey] ?? lastVisiblePayload)
  ), [filterKey, lastVisiblePayload, normalizedFilterState.analyticsScope, payloadsByFilterKey]);
  const scopedSessions = scopedPayload?.sessionItems ?? EMPTY_SESSION_ITEMS;
  const scopedPlannedSkippedDayKeys = scopedPayload?.plannedSkippedDayKeys;
  const scopedScopeSummary = scopedPayload?.scopeSummary ?? scopeSummary;
  const scopedWeeklyProgress = scopedPayload?.weeklyProgress ?? weeklyProgress;
  const scopedWeeklyProgressByWeek = scopedPayload?.weeklyProgressByWeek ?? weeklyProgressByWeek ?? EMPTY_WEEKLY_PROGRESS_BY_WEEK;
  const scopedRoutineTitle = scopedPayload?.routineTitle ?? activeRoutineTitle;
  const handleCalendarDayChange = (nextDayKey: string | null) => {
    setSelectedDayKey(nextDayKey);
    if (nextDayKey) {
      setSelectedMonthKey(null);
      setFilterState(createDefaultExerciseInfoFilterState());
    }
  };
  const handleMonthChange = (nextMonthKey: string | null) => {
    setSelectedMonthKey(nextMonthKey);
    if (nextMonthKey) {
      setSelectedDayKey(null);
      setFilterState(createDefaultExerciseInfoFilterState());
    }
  };
  const clearAllFilters = () => {
    setQuery("");
    setSelectedTags([]);
    setSelectedDayKey(null);
    setSelectedMonthKey(null);
    setFilterState(createDefaultExerciseInfoFilterState());
  };

  useEffect(() => {
    const summaries: SessionSummary[] = [];
    for (const payload of Object.values(payloadsByFilterKey)) {
      summaries.push(...payload.sessionItems);
    }
    rememberHistorySessionSummaries(summaries);
  }, [payloadsByFilterKey]);

  useEffect(() => {
    if (normalizedFilterState.analyticsScope === "all_time" || payloadsByFilterKey[filterKey]) {
      setIsScopeLoading(false);
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({ scope: normalizedFilterState.analyticsScope });
    if (normalizedFilterState.routineId) {
      params.set("routineId", normalizedFilterState.routineId);
    }
    if (normalizedFilterState.cycleStartDate) {
      params.set("cycleStartDate", normalizedFilterState.cycleStartDate);
    }

    setIsScopeLoading(true);
    void fetch(`/api/history/sessions?${params.toString()}`, {
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.ok || !payload?.payload || !Array.isArray(payload.payload.sessionItems)) {
          throw new Error(typeof payload?.error === "string" ? payload.error : "Failed to load filtered session history.");
        }

        setPayloadsByFilterKey((current) => ({
          ...current,
          [filterKey]: payload.payload as HistorySessionsScopePayload,
        }));
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }

        console.error("[history/sessions] failed to load scoped rows", {
          filterState: normalizedFilterState,
          error,
        });
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsScopeLoading(false);
        }
      });

    return () => controller.abort();
  }, [filterKey, normalizedFilterState, payloadsByFilterKey]);

  useEffect(() => {
    if (normalizedFilterState.analyticsScope === "all_time") {
      setLastVisiblePayload(payloadsByFilterKey[buildFilterStateKey(createDefaultExerciseInfoFilterState())]);
      return;
    }

    const cachedPayload = payloadsByFilterKey[filterKey];
    if (cachedPayload) {
      setLastVisiblePayload(cachedPayload);
    }
  }, [filterKey, normalizedFilterState.analyticsScope, payloadsByFilterKey]);

  const sessionTagsById = useMemo(() => {
    const tagsById = new Map<string, Set<string>>();

    for (const session of scopedSessions) {
      const tags = new Set<string>();
      if (session.routineTitle?.trim()) {
        tags.add(normalizeSessionTagValue("routine", session.routineTitle));
      }
      if (session.dayTitle?.trim()) {
        tags.add(normalizeSessionTagValue("day", session.dayTitle));
      }
      for (const exerciseName of session.exerciseNames ?? []) {
        if (exerciseName.trim()) {
          tags.add(normalizeSessionTagValue("exercise", exerciseName));
        }
      }
      if (session.prCounts.total > 0) {
        tags.add("highlight:prs");
      }
      for (const metricTag of buildSessionMetricTagValues(session)) {
        tags.add(metricTag);
      }
      if (session.progressionSummary?.promotionCount) {
        tags.add("highlight:progressed");
      }
      if (session.hasNote) {
        tags.add("highlight:notes");
      }
      if (!session.hasSetData) {
        tags.add("highlight:no-set-data");
      }
      tagsById.set(session.id, tags);
    }

    return tagsById;
  }, [scopedSessions]);

  const availableTagGroups = useMemo<ExerciseTagGroup[]>(() => {
    const routines = new Map<string, string>();
    const days = new Map<string, string>();
    const exercises = new Map<string, string>();
    const highlights = new Map<string, string>();
    const metricGroup = buildSessionMetricTagGroup(scopedSessions);

    for (const session of scopedSessions) {
      if (session.routineTitle?.trim()) {
        routines.set(normalizeSessionTagValue("routine", session.routineTitle), formatSessionTagLabel(session.routineTitle));
      }
      if (session.dayTitle?.trim()) {
        days.set(normalizeSessionTagValue("day", session.dayTitle), formatSessionTagLabel(session.dayTitle));
      }
      for (const exerciseName of session.exerciseNames ?? []) {
        if (exerciseName.trim()) {
          exercises.set(normalizeSessionTagValue("exercise", exerciseName), formatSessionTagLabel(exerciseName));
        }
      }
      if (session.prCounts.total > 0) {
        highlights.set("highlight:prs", "PRs");
      }
      if (session.progressionSummary?.promotionCount) {
        highlights.set("highlight:progressed", "Progressed");
      }
      if (session.hasNote) {
        highlights.set("highlight:notes", "Notes");
      }
      if (!session.hasSetData) {
        highlights.set("highlight:no-set-data", "No Set Data");
      }
    }

    return [
      { key: "routine", label: "Routine", tags: Array.from(routines, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)) },
      { key: "exercise", label: "Exercise", tags: Array.from(exercises, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)) },
      { key: "day", label: "Day", tags: Array.from(days, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)) },
      metricGroup,
      { key: "highlight", label: "Highlight", tags: Array.from(highlights, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)) },
    ].filter((group): group is ExerciseTagGroup => group !== null && group.tags.length > 0);
  }, [scopedSessions]);

  const scopedSessionDayKeysById = useMemo(() => {
    const dayKeys = new Map<string, string | null>();
    for (const session of scopedSessions) {
      dayKeys.set(session.id, getWeeklyProgressDayKey(session.startedAt, scopedWeeklyProgress.timezone));
    }
    return dayKeys;
  }, [scopedSessions, scopedWeeklyProgress.timezone]);

  const queryFilteredSessions = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return scopedSessions.filter((session) => {
      if (selectedTags.length > 0) {
        const tags = sessionTagsById.get(session.id);
        if (!tags || !selectedTags.every((tag) => tags.has(tag))) {
          return false;
        }
      }

      if (!normalizedQuery) {
        return true;
      }

      return buildSessionSearchText(session).includes(normalizedQuery);
    });
  }, [deferredQuery, scopedSessions, selectedTags, sessionTagsById]);

  const calendarDayOptions = useMemo<HistoryTimelineFilterOption[]>(() => {
    const dayKeys = new Set<string>();
    for (const session of scopedSessions) {
      const dayKey = scopedSessionDayKeysById.get(session.id);
      if (dayKey) dayKeys.add(dayKey);
    }
    return [...dayKeys]
      .sort((left, right) => right.localeCompare(left))
      .map((dayKey) => ({ key: dayKey, label: formatHistoryTimelineDay(dayKey) }));
  }, [scopedSessionDayKeysById, scopedSessions]);

  const monthOptions = useMemo<HistoryTimelineFilterOption[]>(() => {
    const monthKeys = new Set(calendarDayOptions.map((option) => option.key.slice(0, 7)));
    return [...monthKeys]
      .sort((left, right) => right.localeCompare(left))
      .map((monthKey) => ({ key: monthKey, label: formatHistoryTimelineMonth(monthKey) }));
  }, [calendarDayOptions]);

  const monthFilteredSessions = useMemo(() => {
    if (!selectedMonthKey) {
      return queryFilteredSessions;
    }
    return queryFilteredSessions.filter((session) => scopedSessionDayKeysById.get(session.id)?.startsWith(selectedMonthKey));
  }, [queryFilteredSessions, scopedSessionDayKeysById, selectedMonthKey]);

  const selectableDayKeys = useMemo(() => {
    const dayKeys = new Set<string>();
    for (const session of monthFilteredSessions) {
      const dayKey = scopedSessionDayKeysById.get(session.id);
      if (dayKey) {
        dayKeys.add(dayKey);
      }
    }
    return dayKeys;
  }, [monthFilteredSessions, scopedSessionDayKeysById]);

  const effectiveSelectedDayKey = selectedDayKey && selectableDayKeys.has(selectedDayKey)
    ? selectedDayKey
    : null;

  useEffect(() => {
    if (selectedDayKey && !selectableDayKeys.has(selectedDayKey)) {
      setSelectedDayKey(null);
    }
  }, [selectableDayKeys, selectedDayKey]);

  const calendarView = useMemo(() => buildHistoryCalendarView({
    sessions: monthFilteredSessions,
    timezone: scopedWeeklyProgress.timezone,
    selectedDayKey: effectiveSelectedDayKey,
    selectedMonthKey,
    skippedDayKeys: scopedPlannedSkippedDayKeys ?? [],
    now: calendarNow,
  }), [calendarNow, effectiveSelectedDayKey, monthFilteredSessions, scopedPlannedSkippedDayKeys, scopedWeeklyProgress.timezone, selectedMonthKey]);

  const monthlyProgress = useMemo(() => buildHistoryMonthlyProgress({
    sessions: queryFilteredSessions,
    timezone: scopedWeeklyProgress.timezone,
    monthKey: selectedMonthKey,
  }), [queryFilteredSessions, scopedWeeklyProgress.timezone, selectedMonthKey]);

  const workoutStreak = useMemo(() => buildHistoryWorkoutStreak({
    sessions: queryFilteredSessions,
    timezone: scopedWeeklyProgress.timezone,
    skippedDayKeys: scopedPlannedSkippedDayKeys ?? [],
  }), [queryFilteredSessions, scopedPlannedSkippedDayKeys, scopedWeeklyProgress.timezone]);

  const filteredSessions = useMemo(() => {
    if (!effectiveSelectedDayKey) {
      return monthFilteredSessions;
    }

    return monthFilteredSessions.filter((session) => scopedSessionDayKeysById.get(session.id) === effectiveSelectedDayKey);
  }, [effectiveSelectedDayKey, monthFilteredSessions, scopedSessionDayKeysById]);

  const filteredTimelineSkippedDayKeys = useMemo(() => {
    return filterHistorySkippedDayKeysForTimeline({
      skippedDayKeys: scopedPlannedSkippedDayKeys ?? [],
      selectedDayKey: effectiveSelectedDayKey,
      selectedMonthKey,
    });
  }, [effectiveSelectedDayKey, scopedPlannedSkippedDayKeys, selectedMonthKey]);

  const filteredTimelineWorkoutStreak = useMemo(() => buildHistoryWorkoutStreak({
    sessions: filteredSessions,
    timezone: scopedWeeklyProgress.timezone,
    skippedDayKeys: filteredTimelineSkippedDayKeys,
  }), [filteredSessions, filteredTimelineSkippedDayKeys, scopedWeeklyProgress.timezone]);

  const sessionWeekStarts = useMemo(
    () => new Map(filteredSessions.map((session) => [session.id, getWeeklyProgressWeekStart(session.startedAt, scopedWeeklyProgress.timezone)])),
    [filteredSessions, scopedWeeklyProgress.timezone],
  );
  const scopedSessionIndexById = useMemo(
    () => new Map(scopedSessions.map((session, index) => [session.id, index])),
    [scopedSessions],
  );
  const weeklyProgressByWeekStart = useMemo(
    () => new Map(scopedWeeklyProgressByWeek.map((summary) => [summary.weekStart, summary])),
    [scopedWeeklyProgressByWeek],
  );
  const hasCycleTimelineFilter = normalizedFilterState.analyticsScope === "current_cycle";
  const hasSpecificTimelineFilter = Boolean(effectiveSelectedDayKey || selectedMonthKey || hasCycleTimelineFilter);
  const displayedWorkoutStreak = hasSpecificTimelineFilter ? filteredTimelineWorkoutStreak : workoutStreak;
  const showWorkoutStreak = shouldShowHistoryWorkoutStreak({
    hasSpecificTimelineFilter,
    visibleSessionCount: filteredSessions.length,
  });
  const hasStructuredFilters = selectedTags.length > 0
    || normalizedFilterState.analyticsScope !== "all_time"
    || Boolean(effectiveSelectedDayKey)
    || Boolean(selectedMonthKey);

  return (
    <div className={cn(appTokens.historyBrowserStack, "gap-4 pt-2")}>
      {sessions.length > 0 ? (
        <div className="sticky top-0 z-30 -mx-1 px-1 pt-0">
          <div className="rounded-b-[1.1rem] bg-[linear-gradient(180deg,rgba(var(--surface-rgb),0.96)_0%,rgba(var(--surface-rgb),0.92)_72%,rgba(var(--surface-rgb),0)_100%)] backdrop-blur-md">
            <div className={cn(appTokens.historyFloatingHeaderRail, "overflow-visible")}>
              <HistoryTitleControlShell
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                showViewModeToggle={false}
              >
                <HistorySessionFilters
                  query={query}
                  onQueryChange={setQuery}
                  selectedTags={selectedTags}
                  onTagsChange={setSelectedTags}
                  groups={availableTagGroups}
                  resultCount={filteredSessions.length}
                  initialOpen={initialFiltersOpen}
                  filterState={filterState}
                  filterOptions={filterOptions}
                  onFilterStateChange={setFilterState}
                  selectedCalendarDayKey={effectiveSelectedDayKey}
                  onCalendarDayChange={handleCalendarDayChange}
                  calendarDayOptions={calendarDayOptions}
                  selectedMonthKey={selectedMonthKey}
                  onMonthChange={handleMonthChange}
                  monthOptions={monthOptions}
                  showClearAll={hasStructuredFilters}
                  onClearAll={clearAllFilters}
                />
              </HistoryTitleControlShell>
            </div>
          </div>
        </div>
      ) : null}
      {queryFilteredSessions.length > 0 ? (
        <div data-history-retention-surface="calendar">
          <HistoryCalendarSurface
            calendarView={calendarView}
            onSelectDayKey={handleCalendarDayChange}
            viewMode={viewMode}
          />
        </div>
      ) : null}
      {showWorkoutStreak ? (
        <div data-history-retention-surface="streak">
          <WorkoutStreakSurface summary={displayedWorkoutStreak} viewMode={viewMode} />
        </div>
      ) : null}
      {!effectiveSelectedDayKey && !selectedMonthKey ? (
        <HistoryScopeSummarySurface summary={scopedScopeSummary} viewMode={viewMode} titleRoutineOverride={scopedRoutineTitle} />
      ) : null}
      {!effectiveSelectedDayKey && !hasCycleTimelineFilter ? (
        <div data-history-retention-surface="monthly">
          <MonthlyProgressSurface summary={monthlyProgress} viewMode={viewMode} />
        </div>
      ) : null}
      {!effectiveSelectedDayKey && !selectedMonthKey ? (
        <div data-history-retention-surface="current-week-progression">
          <WeeklyProgressSurface summary={scopedWeeklyProgress} viewMode={viewMode} titleRoutineOverride={scopedRoutineTitle} />
        </div>
      ) : null}
      {filteredSessions.length > 0 ? <HistoryCycleSectionSeparator /> : null}
      {filteredSessions.length > 0 ? (
        <ul className={cn(
          viewMode === "compact"
            ? appTokens.historyBrowserList
            : appTokens.historyBrowserList,
        )}>
          {filteredSessions.map((session, filteredIndex) => {
            const index = scopedSessionIndexById.get(session.id) ?? -1;
            const previousFilteredSession = filteredIndex > 0 ? filteredSessions[filteredIndex - 1] : null;
            const sessionWeekStart = sessionWeekStarts.get(session.id) ?? null;
            const previousWeekStart = previousFilteredSession
              ? (sessionWeekStarts.get(previousFilteredSession.id) ?? null)
              : null;
            const startsNewWeekGroup = filteredIndex === 0 || sessionWeekStart !== previousWeekStart;
            const historicalWeeklySummary = sessionWeekStart && sessionWeekStart !== scopedWeeklyProgress.weekStart
              ? (weeklyProgressByWeekStart.get(sessionWeekStart) ?? null)
              : null;
            return (
              <li
                key={session.id}
                className={cn(startsNewWeekGroup && historicalWeeklySummary ? "space-y-2.5 pt-6" : undefined)}
              >
                {startsNewWeekGroup && historicalWeeklySummary ? (
                  <>
                    <WeeklyProgressSurface
                      summary={historicalWeeklySummary}
                      viewMode={viewMode}
                      presentation="historical"
                    />
                    <HistoryCycleSectionSeparator />
                  </>
                ) : null}
                <HistorySessionCard
                  session={session}
                  previousSession={index >= 0 ? (scopedSessions[index + 1] ?? null) : null}
                  selected={session.id === selectedSessionId}
                  viewMode={viewMode}
                  href={sessionHrefOverrides?.[session.id] ?? `/history/${session.id}?returnTab=sessions`}
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <SharedSectionShell
          recipe="historyDetail"
          listState={(
            <p className={appTokens.historyBrowserEmptyState}>
              {scopedSessions.length > 0
                ? "No matching sessions."
                : normalizedFilterState.analyticsScope === "current_routine"
                  ? "No completed sessions in the current routine yet."
                  : normalizedFilterState.analyticsScope === "current_cycle"
                    ? "No completed sessions in the current cycle yet."
                    : "No completed sessions yet."}
            </p>
          )}
        />
      )}
      {isScopeLoading ? (
        <div className="px-1 pt-2 text-[11px] uppercase tracking-[0.12em] text-[rgb(var(--text-muted)/0.72)]">
          Updating scope...
        </div>
      ) : null}
      {showBottomActions ? (
        <PublishBottomActions>
          <BottomActionSplit
            secondary={(
              <BottomDockButton
                type="button"
                intent="toggleActive"
                data-history-density-toggle="sessions"
                onClick={() => setViewMode((current) => (current === "compact" ? "detailed" : "compact"))}
              >
                {nextViewModeLabel}
              </BottomDockButton>
            )}
            primary={(
              <BottomDockLink href="/history/exercises" intent="positive">
                View Exercises
              </BottomDockLink>
            )}
          />
        </PublishBottomActions>
      ) : null}
    </div>
  );
}
