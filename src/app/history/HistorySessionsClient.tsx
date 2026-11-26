"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { type ExerciseTagGroup } from "@/components/ExerciseTagFilterControl";
import { HistoryTitleControlShell } from "@/components/history/HistoryShared";
import { HistoryFilterBar, type HistoryActiveFilterChip, type HistoryFilterGroup } from "@/components/history/HistoryFilterBar";
import { HistorySessionCard } from "@/components/history/HistorySessionCard";
import { buildHistoryWeekStrip } from "@/components/history/historyWeekStrip";
import { HistoryHeaderDensityToggle } from "@/components/history/HistoryHeaderDensityToggle";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import Link from "next/link";
import { AppButton } from "@/components/ui/AppButton";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { CardEmptyState } from "@/components/ui/card-system";
import { SkeletonRow } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";
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

const HISTORY_CYCLE_SEPARATOR_CLASS_NAME = "bg-[linear-gradient(90deg,rgb(var(--accent-yellow-on)/0.16),rgb(var(--accent-yellow-on)/0.92),rgb(var(--accent-yellow-on)/0.16))] shadow-[0_0_14px_rgb(var(--accent-yellow-on)/0.22)]";

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
  onClearAll: () => void;
}) {
  const normalizedFilterState = useMemo(() => normalizeExerciseInfoFilterState(filterState), [filterState]);
  const routineOptions = Array.isArray(filterOptions.routines) ? filterOptions.routines : [];
  const defaultRoutineOption = routineOptions.find((routine) => routine.isActive) ?? routineOptions[0] ?? null;
  const selectedRoutine = normalizedFilterState.routineId
    ? routineOptions.find((routine) => routine.id === normalizedFilterState.routineId) ?? null
    : defaultRoutineOption;
  const selectedCycleStartDate = normalizedFilterState.cycleStartDate;
  const cycleOptions = routineOptions.flatMap((routine) => routine.cycleOptions.map((cycle) => ({
    ...cycle,
    routineId: routine.id,
    routineTitle: routine.title,
  })));

  const applyFilterState = (nextState: Partial<ExerciseInfoFilterState>) => {
    onFilterStateChange(normalizeExerciseInfoFilterState(nextState));
  };
  const resetScope = () => onFilterStateChange(createDefaultExerciseInfoFilterState());

  const handleRoutineSelect = (routine: ExerciseInfoRoutineFilterOption) => {
    if (normalizedFilterState.analyticsScope === "current_cycle") {
      const nextCycle = routine.cycleOptions[0] ?? null;
      if (nextCycle) {
        applyFilterState({ analyticsScope: "current_cycle", routineId: routine.id, cycleStartDate: nextCycle.startDate });
        return;
      }
    }
    applyFilterState({ analyticsScope: "current_routine", routineId: routine.id, cycleStartDate: null });
  };

  const isRoutineScope = normalizedFilterState.analyticsScope !== "all_time";
  const formatCycleLabel = (cycle: (typeof cycleOptions)[number]) => (
    routineOptions.length > 1 ? `${cycle.routineTitle} · ${cycle.label}` : cycle.label
  );
  const groupLabelByTag = new Map<string, string>();
  for (const group of groups) {
    for (const tag of group.tags) {
      groupLabelByTag.set(tag.value, tag.label);
    }
  }
  const toggleTag = (value: string) => {
    onTagsChange(selectedTags.includes(value) ? selectedTags.filter((tag) => tag !== value) : [...selectedTags, value]);
  };

  const sheetGroups: HistoryFilterGroup[] = [];
  if (routineOptions.length > 0) {
    sheetGroups.push({
      key: "scope",
      title: "Show",
      options: [
        { key: "all_time", label: "All workouts", selected: !isRoutineScope, onSelect: resetScope },
        {
          key: "routine",
          label: "One routine",
          selected: isRoutineScope,
          onSelect: () => {
            const nextRoutine = selectedRoutine ?? defaultRoutineOption;
            if (!isRoutineScope && nextRoutine) {
              applyFilterState({ analyticsScope: "current_routine", routineId: nextRoutine.id, cycleStartDate: null });
            }
          },
        },
      ],
    });
  }
  if (isRoutineScope && routineOptions.length > 0) {
    sheetGroups.push({
      key: "routine",
      title: "Routine",
      options: routineOptions.map((routine) => ({
        key: routine.id,
        label: routine.title,
        selected: selectedRoutine?.id === routine.id,
        onSelect: () => handleRoutineSelect(routine),
      })),
    });
  }
  if (cycleOptions.length > 0) {
    sheetGroups.push({
      key: "cycle",
      title: "Cycle",
      collapsedLimit: 6,
      options: cycleOptions.map((cycle) => {
        const isSelected = cycle.startDate === selectedCycleStartDate && cycle.routineId === normalizedFilterState.routineId;
        return {
          key: `${cycle.routineId}:${cycle.startDate}`,
          label: formatCycleLabel(cycle),
          selected: isSelected,
          onSelect: () => {
            if (isSelected) {
              applyFilterState({ analyticsScope: "current_routine", routineId: cycle.routineId, cycleStartDate: null });
              return;
            }
            onCalendarDayChange(null);
            onMonthChange(null);
            applyFilterState({ analyticsScope: "current_cycle", routineId: cycle.routineId, cycleStartDate: cycle.startDate });
          },
        };
      }),
    });
  }
  if (monthOptions.length > 0) {
    sheetGroups.push({
      key: "month",
      title: "Month",
      collapsedLimit: 6,
      options: monthOptions.map((option) => ({
        key: option.key,
        label: option.label,
        selected: option.key === selectedMonthKey,
        onSelect: () => onMonthChange(option.key === selectedMonthKey ? null : option.key),
      })),
    });
  }
  if (calendarDayOptions.length > 0) {
    sheetGroups.push({
      key: "session-date",
      title: "Workout date",
      collapsedLimit: 8,
      options: calendarDayOptions.map((option) => ({
        key: option.key,
        label: option.label,
        selected: option.key === selectedCalendarDayKey,
        onSelect: () => onCalendarDayChange(option.key === selectedCalendarDayKey ? null : option.key),
      })),
    });
  }
  for (const group of groups) {
    sheetGroups.push({
      key: `tag-${group.key}`,
      title: group.label,
      collapsedLimit: 10,
      options: group.tags.map((tag) => ({
        key: tag.value,
        label: tag.label,
        selected: selectedTags.includes(tag.value),
        onSelect: () => toggleTag(tag.value),
      })),
    });
  }

  const activeChips: HistoryActiveFilterChip[] = [];
  if (isRoutineScope) {
    const selectedCycle = cycleOptions.find((cycle) => cycle.startDate === selectedCycleStartDate && cycle.routineId === normalizedFilterState.routineId);
    activeChips.push(selectedCycle
      ? { key: "scope", label: formatCycleLabel(selectedCycle), onRemove: resetScope }
      : { key: "scope", label: selectedRoutine?.title ?? "One routine", onRemove: resetScope });
  }
  const selectedMonth = monthOptions.find((option) => option.key === selectedMonthKey);
  if (selectedMonth) {
    activeChips.push({ key: "month", label: selectedMonth.label, onRemove: () => onMonthChange(null) });
  }
  const selectedDay = calendarDayOptions.find((option) => option.key === selectedCalendarDayKey);
  if (selectedDay) {
    activeChips.push({ key: "session-date", label: selectedDay.label, onRemove: () => onCalendarDayChange(null) });
  }
  for (const tag of selectedTags) {
    activeChips.push({
      key: `tag-${tag}`,
      label: groupLabelByTag.get(tag) ?? tag.slice(tag.indexOf(":") + 1),
      onRemove: () => onTagsChange(selectedTags.filter((value) => value !== tag)),
    });
  }

  return (
    <HistoryFilterBar
      query={query}
      onQueryChange={onQueryChange}
      searchPlaceholder="Search workouts…"
      searchLabel="Search workouts"
      activeFilterCount={activeChips.length}
      activeChips={activeChips}
      onClearAll={onClearAll}
      groups={sheetGroups}
      resultCount={resultCount}
      resultSingularLabel="workout"
      resultPluralLabel="workouts"
      initialSheetOpen={initialOpen}
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
  showHeaderDensityToggle = true,
  sessionHrefOverrides,
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
  /** Portal the Compact / Detailed toggle into the History header (off on dev fixtures without that header). */
  showHeaderDensityToggle?: boolean;
  sessionHrefOverrides?: Record<string, string>;
  /** Unused since the calendar moved to Progress (wave 2); kept so fixture callers still type-check. */
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
  const toast = useToast();
  const toastError = toast.error;
  const deferredQuery = useDeferredValue(query);
  const normalizedFilterState = useMemo(() => normalizeExerciseInfoFilterState(filterState), [filterState]);
  const filterKey = useMemo(() => buildFilterStateKey(normalizedFilterState), [normalizedFilterState]);
  const scopedPayload = useMemo(() => (
    normalizedFilterState.analyticsScope === "all_time"
      ? payloadsByFilterKey[buildFilterStateKey(createDefaultExerciseInfoFilterState())]
      : (payloadsByFilterKey[filterKey] ?? lastVisiblePayload)
  ), [filterKey, lastVisiblePayload, normalizedFilterState.analyticsScope, payloadsByFilterKey]);
  const scopedSessions = scopedPayload?.sessionItems ?? EMPTY_SESSION_ITEMS;
  const scopedPlannedSkippedDayKeys = scopedPayload?.plannedSkippedDayKeys;
  const scopedWeeklyProgress = scopedPayload?.weeklyProgress ?? weeklyProgress;
  const scopedWeeklyProgressByWeek = scopedPayload?.weeklyProgressByWeek ?? weeklyProgressByWeek ?? EMPTY_WEEKLY_PROGRESS_BY_WEEK;
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
        // Errors only go through the in-flow notice (History review item 0c); the list keeps the last results.
        toastError("Could not load that filter. Showing your last results.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsScopeLoading(false);
        }
      });

    return () => controller.abort();
  }, [filterKey, normalizedFilterState, payloadsByFilterKey, toastError]);

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
        highlights.set("highlight:progressed", "Went up");
      }
      if (session.hasNote) {
        highlights.set("highlight:notes", "Notes");
      }
      if (!session.hasSetData) {
        highlights.set("highlight:no-set-data", "No sets logged");
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

  const filteredSessions = useMemo(() => {
    if (!effectiveSelectedDayKey) {
      return monthFilteredSessions;
    }

    return monthFilteredSessions.filter((session) => scopedSessionDayKeysById.get(session.id) === effectiveSelectedDayKey);
  }, [effectiveSelectedDayKey, monthFilteredSessions, scopedSessionDayKeysById]);

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
  const hasStructuredFilters = selectedTags.length > 0
    || normalizedFilterState.analyticsScope !== "all_time"
    || Boolean(effectiveSelectedDayKey)
    || Boolean(selectedMonthKey);

  // Wave 2 (SIMPLIFY #11): one line on top instead of six summary cards under the list (those live on Progress now).
  // Always the whole history, never the filtered rows.
  const weekStrip = useMemo(() => buildHistoryWeekStrip({
    sessionStartedAts: sessions.map((session) => session.startedAt),
    timezone: weeklyProgress.timezone,
    currentWeekStart: weeklyProgress.weekStart,
    completedThisWeek: weeklyProgress.completedWorkoutCount,
    weeklyTarget: weeklyProgress.primaryRoutineTargetCount,
  }), [sessions, weeklyProgress.completedWorkoutCount, weeklyProgress.primaryRoutineTargetCount, weeklyProgress.timezone, weeklyProgress.weekStart]);

  return (
    <div className={cn(appTokens.historyBrowserStack, "!gap-2 pt-2")}>
      {sessions.length > 0 ? (
        <p
          data-history-week-strip="true"
          className="mx-1 rounded-[0.9rem] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-2-rgb)/0.72)] px-3 py-2 text-[13px] font-semibold leading-5 text-[rgb(var(--text-primary)/0.95)]"
        >
          {weekStrip.label}
        </p>
      ) : null}
      {sessions.length > 0 ? (
        <div data-history-sticky-filters="true" className="sticky top-0 z-30 -mx-1 px-1 pt-0">
          {/* Opaque so cards never show through around the search row (History review item 15). */}
          <div className="rounded-b-[1.1rem] bg-[rgb(var(--surface-rgb))] pb-1 shadow-[0_10px_18px_-14px_rgba(0,0,0,0.7)]">
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
                  onClearAll={clearAllFilters}
                />
              </HistoryTitleControlShell>
            </div>
          </div>
        </div>
      ) : null}
      {filteredSessions.length > 0 ? (
        // One 8px rhythm for summary cards and session cards (History review item 14).
        <ul data-history-session-list="true" className="grid gap-2">
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
                className={cn(startsNewWeekGroup && historicalWeeklySummary ? "grid gap-2 pt-4" : undefined)}
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
        <div data-history-list-state={scopedSessions.length > 0 ? "filtered-empty" : "empty"}>
          {scopedSessions.length > 0 ? (
            <CardEmptyState
              headingLevel={2}
              title="No workouts match"
              body="Try a different search or remove a filter."
              action={(
                <AppButton type="button" variant="secondary" size="sm" onClick={clearAllFilters}>
                  Clear filters
                </AppButton>
              )}
            />
          ) : (
            <CardEmptyState
              headingLevel={2}
              title={normalizedFilterState.analyticsScope === "current_cycle"
                ? "No workouts in this cycle yet"
                : normalizedFilterState.analyticsScope === "current_routine"
                  ? "No workouts in this routine yet"
                  : "No workouts yet"}
              body={normalizedFilterState.analyticsScope === "all_time"
                ? "Finish a workout and it lands here with its sets and PRs."
                : "Workouts you finish in this routine land here."}
              action={normalizedFilterState.analyticsScope === "all_time" ? (
                <Link href="/today" className={getAppButtonClassName({ variant: "primary", size: "sm" })}>Go to Today</Link>
              ) : (
                <AppButton type="button" variant="secondary" size="sm" onClick={clearAllFilters}>
                  Show all workouts
                </AppButton>
              )}
            />
          )}
        </div>
      )}
      {isScopeLoading ? (
        <div role="status" aria-label="Loading workouts" data-history-scope-loading="true" className="grid gap-2" aria-busy="true">
          {[0, 1].map((index) => (
            <SkeletonRow key={index} />
          ))}
        </div>
      ) : null}
      {showHeaderDensityToggle ? (
        <HistoryHeaderDensityToggle scope="sessions" viewMode={viewMode} onViewModeChange={setViewMode} />
      ) : null}
    </div>
  );
}
