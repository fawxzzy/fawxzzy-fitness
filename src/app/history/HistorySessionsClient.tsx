"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { type ExerciseTagGroup } from "@/components/ExerciseTagFilterControl";
import { DEFAULT_EXERCISE_SEARCH_FILTERS_STACK_CLASSNAME, ExerciseSearchFilters } from "@/components/exercises/ExerciseSearchFilters";
import { HistoryTitleControlShell } from "@/components/history/HistoryShared";
import { HistorySessionCard } from "@/components/history/HistorySessionCard";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { SharedSectionShell } from "@/components/ui/app/SharedSectionShell";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";
import { getWeeklyProgressWeekStart, type WeeklyProgressSummary } from "@/lib/history-weekly-progress";
import { formatDateShort } from "@/lib/formatting";
import { WeeklyProgressSurface } from "@/components/history/WeeklyProgressSurface";
import type { SessionSummary } from "./session-summary";

function normalizeSessionTagValue(prefix: string, value: string) {
  return `${prefix}:${value.trim().toLowerCase()}`;
}

function formatSessionTagLabel(value: string) {
  return value.trim();
}

function buildSessionSearchText(session: SessionSummary) {
  return [
    session.routineTitle,
    session.dayTitle,
    formatDateShort(session.startedAt),
    session.bestLift?.exerciseName,
    session.bestLift?.display,
    session.prLabel,
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
}: {
  query: string;
  onQueryChange: (next: string) => void;
  selectedTags: string[];
  onTagsChange: (next: string[]) => void;
  groups: ExerciseTagGroup[];
  resultCount: number;
  initialOpen?: boolean;
}) {
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
      filterPanelClassName={appTokens.historyExerciseFilterPanel}
      searchInputClassName={appTokens.historyExerciseSearchInput}
      clearButtonClassName={appTokens.exercisePickerSearchClearButton}
      searchPlaceholder="Search sessions"
      resultSingularLabel="session"
      resultPluralLabel="sessions"
      clearSearchAriaLabel="Clear session search"
      toggleFiltersAriaLabel="Toggle session filters"
      defaultFilterOpen={initialOpen}
      chromeVariant="history"
    />
  );
}

export function HistorySessionsClient({
  sessions,
  weeklyProgress,
  weeklyProgressByWeek = [],
  selectedSessionId,
  initialViewMode = "compact",
  initialFiltersOpen = false,
  initialQuery = "",
  initialSelectedTags = [],
  showBottomActions = true,
}: {
  sessions: SessionSummary[];
  weeklyProgress: WeeklyProgressSummary;
  weeklyProgressByWeek?: WeeklyProgressSummary[];
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
  const deferredQuery = useDeferredValue(query);
  const nextViewModeLabel = viewMode === "compact" ? "Detailed" : "Compact";
  const sessionTagsById = useMemo(() => {
    const tagsById = new Map<string, Set<string>>();

    for (const session of sessions) {
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
      if (session.hasNote) {
        tags.add("highlight:notes");
      }
      if (!session.hasSetData) {
        tags.add("highlight:no-set-data");
      }
      tagsById.set(session.id, tags);
    }

    return tagsById;
  }, [sessions]);

  const availableTagGroups = useMemo<ExerciseTagGroup[]>(() => {
    const routines = new Map<string, string>();
    const days = new Map<string, string>();
    const exercises = new Map<string, string>();
    const highlights = new Map<string, string>();

    for (const session of sessions) {
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
      { key: "highlight", label: "Highlight", tags: Array.from(highlights, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)) },
    ].filter((group) => group.tags.length > 0);
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return sessions.filter((session) => {
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
  }, [deferredQuery, selectedTags, sessionTagsById, sessions]);

  const sessionWeekStarts = useMemo(
    () => new Map(filteredSessions.map((session) => [session.id, getWeeklyProgressWeekStart(session.startedAt, weeklyProgress.timezone)])),
    [filteredSessions, weeklyProgress.timezone],
  );
  const weeklyProgressByWeekStart = useMemo(
    () => new Map(weeklyProgressByWeek.map((summary) => [summary.weekStart, summary])),
    [weeklyProgressByWeek],
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
                />
              </HistoryTitleControlShell>
            </div>
          </div>
        </div>
      ) : null}
      <WeeklyProgressSurface summary={weeklyProgress} viewMode={viewMode} />
      {filteredSessions.length > 0 ? (
        <ul className={cn(
          viewMode === "compact"
            ? appTokens.historyBrowserList
            : appTokens.historyBrowserList,
        )}>
          {filteredSessions.map((session, filteredIndex) => {
            const index = sessions.findIndex((entry) => entry.id === session.id);
            const previousFilteredSession = filteredIndex > 0 ? filteredSessions[filteredIndex - 1] : null;
            const sessionWeekStart = sessionWeekStarts.get(session.id) ?? null;
            const previousWeekStart = previousFilteredSession
              ? (sessionWeekStarts.get(previousFilteredSession.id) ?? null)
              : null;
            const startsNewWeekGroup = filteredIndex === 0 || sessionWeekStart !== previousWeekStart;
            const historicalWeeklySummary = sessionWeekStart && sessionWeekStart !== weeklyProgress.weekStart
              ? (weeklyProgressByWeekStart.get(sessionWeekStart) ?? null)
              : null;
            return (
              <li
                key={session.id}
                className={cn(startsNewWeekGroup && historicalWeeklySummary ? "space-y-2.5 pt-6" : undefined)}
              >
                {startsNewWeekGroup && historicalWeeklySummary ? (
                  <WeeklyProgressSurface
                    summary={historicalWeeklySummary}
                    viewMode={viewMode}
                    presentation="historical"
                  />
                ) : null}
                <HistorySessionCard
                  session={session}
                  previousSession={index >= 0 ? (sessions[index + 1] ?? null) : null}
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
              {sessions.length > 0 ? "No matching sessions." : "No completed sessions yet."}
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
                Exercises
              </BottomDockLink>
            )}
          />
        </PublishBottomActions>
      ) : null}
    </div>
  );
}
