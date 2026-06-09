"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { type ExerciseTagGroup } from "@/components/ExerciseTagFilterControl";
import { DEFAULT_EXERCISE_SEARCH_FILTERS_STACK_CLASSNAME, ExerciseSearchFilters } from "@/components/exercises/ExerciseSearchFilters";
import { HistoryTitleControlShell } from "@/components/history/HistoryShared";
import { HistorySessionCard } from "@/components/history/HistorySessionCard";
import { ThirtyDayHistorySurface } from "@/components/history/ThirtyDayHistorySurface";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { PillButton } from "@/components/ui/Pill";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { SharedSectionShell } from "@/components/ui/app/SharedSectionShell";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";
import { getWeeklyProgressWeekStart, type WeeklyProgressSummary } from "@/lib/history-weekly-progress";
import { formatDateShort } from "@/lib/formatting";
import { WeeklyProgressSurface } from "@/components/history/WeeklyProgressSurface";
import type { ThirtyDayHistorySummary } from "@/lib/history-30-day-summary";
import { buildSessionMetricTagGroup, buildSessionMetricTagValues } from "@/lib/history-metric-filters";
import { rememberHistorySessionSummary } from "@/lib/history-session-summary-cache";
import type { ExerciseInfoAnalyticsScope } from "@/lib/exercise-info-scope";
import { getExerciseInfoAnalyticsScopeDisplayLabel, getNextExerciseInfoAnalyticsScope } from "@/lib/exercise-info-scope";
import type { SessionSummary } from "./session-summary";

function normalizeSessionTagValue(prefix: string, value: string) {
  return `${prefix}:${value.trim().toLowerCase()}`;
}

function formatSessionTagLabel(value: string) {
  return value.trim();
}

const HISTORY_CYCLE_SEPARATOR_CLASS_NAME = "bg-[linear-gradient(90deg,rgb(var(--accent-yellow-on)/0.16),rgb(var(--accent-yellow-on)/0.92),rgb(var(--accent-yellow-on)/0.16))] shadow-[0_0_14px_rgb(var(--accent-yellow-on)/0.22)]";

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
  analyticsScope,
  activeRoutineTitle,
  onAnalyticsScopeToggle,
}: {
  query: string;
  onQueryChange: (next: string) => void;
  selectedTags: string[];
  onTagsChange: (next: string[]) => void;
  groups: ExerciseTagGroup[];
  resultCount: number;
  initialOpen?: boolean;
  analyticsScope: ExerciseInfoAnalyticsScope;
  activeRoutineTitle?: string | null;
  onAnalyticsScopeToggle: () => void;
}) {
  const scopeLabel = getExerciseInfoAnalyticsScopeDisplayLabel(analyticsScope, activeRoutineTitle);

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
      defaultFilterOpen={initialOpen}
      chromeVariant="history"
      trailingControls={(
        <PillButton
          active
          type="button"
          onClick={onAnalyticsScopeToggle}
          className="inline-flex h-8 max-w-[12.75rem] items-center justify-center whitespace-nowrap px-3 py-0 text-[10px] font-semibold uppercase tracking-[0.12em] leading-none"
          title={scopeLabel}
          aria-label={`Toggle session history metric scope. Current scope: ${scopeLabel}`}
        >
          <span className="block max-w-full truncate">{scopeLabel}</span>
        </PillButton>
      )}
    />
  );
}

export function HistorySessionsClient({
  sessions,
  currentRoutineSessions = [],
  currentCycleSessions = [],
  activeRoutineTitle = null,
  thirtyDaySummary,
  currentRoutineThirtyDaySummary,
  currentCycleThirtyDaySummary,
  weeklyProgress,
  currentRoutineWeeklyProgress,
  currentCycleWeeklyProgress,
  weeklyProgressByWeek = [],
  currentRoutineWeeklyProgressByWeek = [],
  currentCycleWeeklyProgressByWeek = [],
  selectedSessionId,
  initialViewMode = "compact",
  initialFiltersOpen = false,
  initialQuery = "",
  initialSelectedTags = [],
  showBottomActions = true,
}: {
  sessions: SessionSummary[];
  currentRoutineSessions?: SessionSummary[];
  currentCycleSessions?: SessionSummary[];
  activeRoutineTitle?: string | null;
  thirtyDaySummary: ThirtyDayHistorySummary;
  currentRoutineThirtyDaySummary: ThirtyDayHistorySummary;
  currentCycleThirtyDaySummary: ThirtyDayHistorySummary;
  weeklyProgress: WeeklyProgressSummary;
  currentRoutineWeeklyProgress: WeeklyProgressSummary;
  currentCycleWeeklyProgress: WeeklyProgressSummary;
  weeklyProgressByWeek?: WeeklyProgressSummary[];
  currentRoutineWeeklyProgressByWeek?: WeeklyProgressSummary[];
  currentCycleWeeklyProgressByWeek?: WeeklyProgressSummary[];
  selectedSessionId?: string;
  initialViewMode?: "compact" | "detailed";
  initialFiltersOpen?: boolean;
  initialQuery?: string;
  initialSelectedTags?: string[];
  showBottomActions?: boolean;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialSelectedTags);
  const [viewMode, setViewMode] = useState<"compact" | "detailed">(initialViewMode);
  const [analyticsScope, setAnalyticsScope] = useState<ExerciseInfoAnalyticsScope>("all_time");
  const deferredQuery = useDeferredValue(query);
  const nextViewModeLabel = viewMode === "compact" ? "View Detailed" : "View Compact";
  const scopedSessions = analyticsScope === "current_routine"
    ? currentRoutineSessions
    : analyticsScope === "current_cycle"
      ? currentCycleSessions
      : sessions;
  const scopedThirtyDaySummary = analyticsScope === "current_routine"
    ? currentRoutineThirtyDaySummary
    : analyticsScope === "current_cycle"
      ? currentCycleThirtyDaySummary
      : thirtyDaySummary;
  const scopedWeeklyProgress = analyticsScope === "current_routine"
    ? currentRoutineWeeklyProgress
    : analyticsScope === "current_cycle"
      ? currentCycleWeeklyProgress
      : weeklyProgress;
  const scopedWeeklyProgressByWeek = analyticsScope === "current_routine"
    ? currentRoutineWeeklyProgressByWeek
    : analyticsScope === "current_cycle"
      ? currentCycleWeeklyProgressByWeek
      : weeklyProgressByWeek;

  useEffect(() => {
    for (const session of [...sessions, ...currentRoutineSessions, ...currentCycleSessions]) {
      rememberHistorySessionSummary(session);
    }
  }, [currentCycleSessions, currentRoutineSessions, sessions]);

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

  const filteredSessions = useMemo(() => {
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

  const sessionWeekStarts = useMemo(
    () => new Map(filteredSessions.map((session) => [session.id, getWeeklyProgressWeekStart(session.startedAt, scopedWeeklyProgress.timezone)])),
    [filteredSessions, scopedWeeklyProgress.timezone],
  );
  const weeklyProgressByWeekStart = useMemo(
    () => new Map(scopedWeeklyProgressByWeek.map((summary) => [summary.weekStart, summary])),
    [scopedWeeklyProgressByWeek],
  );

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
                  analyticsScope={analyticsScope}
                  activeRoutineTitle={activeRoutineTitle}
                  onAnalyticsScopeToggle={() => setAnalyticsScope((current) => getNextExerciseInfoAnalyticsScope(current))}
                />
              </HistoryTitleControlShell>
            </div>
          </div>
        </div>
      ) : null}
      <ThirtyDayHistorySurface summary={scopedThirtyDaySummary} viewMode={viewMode} titleRoutineOverride={activeRoutineTitle} />
      <WeeklyProgressSurface summary={scopedWeeklyProgress} viewMode={viewMode} titleRoutineOverride={activeRoutineTitle} />
      {filteredSessions.length > 0 ? <HistoryCycleSectionSeparator /> : null}
      {filteredSessions.length > 0 ? (
        <ul className={cn(
          viewMode === "compact"
            ? appTokens.historyBrowserList
            : appTokens.historyBrowserList,
        )}>
          {filteredSessions.map((session, filteredIndex) => {
            const index = scopedSessions.findIndex((entry) => entry.id === session.id);
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
                  href={`/history/${session.id}?returnTab=sessions`}
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
                : analyticsScope === "current_routine"
                  ? "No completed sessions in the current routine yet."
                  : analyticsScope === "current_cycle"
                    ? "No completed sessions in the current cycle yet."
                    : "No completed sessions yet."}
            </p>
          )}
        />
      )}
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
