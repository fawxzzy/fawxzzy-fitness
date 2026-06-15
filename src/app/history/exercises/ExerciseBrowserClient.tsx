"use client";

import type { ReactNode } from "react";
import { memo, useDeferredValue, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { type ExerciseTagGroup } from "@/components/ExerciseTagFilterControl";
import { DEFAULT_EXERCISE_SEARCH_FILTERS_STACK_CLASSNAME, ExerciseSearchFilters } from "@/components/exercises/ExerciseSearchFilters";
import { HistoryExerciseCard } from "@/components/history/HistoryExerciseCard";
import { HistoryMetaLine } from "@/components/history/HistoryMetaLine";
import { HistoryTitleControlShell } from "@/components/history/HistoryShared";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { HorizontalScrollHint } from "@/components/ui/HorizontalScrollHint";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { PillButton } from "@/components/ui/Pill";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";
import {
  buildScopedExerciseCurationTagValue,
  EXERCISE_CURATION_GROUPS,
  flattenExerciseCurationTagValues,
  formatExerciseTagLabel,
  normalizeExerciseCurationTags,
} from "@/lib/exercise-curation";
import { buildExerciseInfoSeedFromHistoryRow } from "@/lib/exercise-info-history-seed";
import {
  createDefaultExerciseInfoFilterState,
  normalizeExerciseInfoFilterState,
  type ExerciseInfoAnalyticsScope,
  type ExerciseInfoFilterOptions,
  type ExerciseInfoFilterState,
  type ExerciseInfoRoutineFilterOption,
} from "@/lib/exercise-info-scope";
import type { ExerciseBrowserRow } from "@/lib/exercises-browser";
import { buildExerciseMetricTagGroup, buildExerciseMetricTagValues } from "@/lib/history-metric-filters";
import { getStretchHubMetaItems, isStretchHubExercise } from "@/lib/stretch-library";
import { buildHistoryExerciseCardViewModel } from "@/lib/workout-card-view-models";

const HISTORY_EXERCISE_VIEW_MODE_COOKIE = "history-exercises-view-mode";
const FILTER_SECTION_STACK_CLASS_NAME = "space-y-1";
const FILTER_SECTION_HEADER_CLASS_NAME = "w-fit max-w-full space-y-[2px] pl-[4px] pt-[2px]";
const FILTER_SECTION_RAIL_CLASS_NAME = "hide-scrollbar -mx-1.5 max-w-none overflow-x-auto overflow-y-visible px-1.5 pb-1 [touch-action:pan-x] [-webkit-overflow-scrolling:touch] [overscroll-behavior-y:auto]";

type ExerciseBrowserClientProps = {
  initialRows?: ExerciseBrowserRow[];
  filterOptions?: ExerciseInfoFilterOptions;
  activeRoutineTitle?: string | null;
  showBottomActions?: boolean;
};

function buildFilterStateKey(filterState: ExerciseInfoFilterState) {
  return [
    filterState.analyticsScope,
    filterState.routineId ?? "",
    filterState.cycleStartDate ?? "",
  ].join("::");
}

function getExerciseDisplayName(row: ExerciseBrowserRow) {
  const candidates = [
    row.name,
    (row as ExerciseBrowserRow & { exercise_name?: string | null }).exercise_name,
    (row as ExerciseBrowserRow & { title?: string | null }).title,
    (row as ExerciseBrowserRow & { exercise?: { name?: string | null } | null }).exercise?.name,
    (row as ExerciseBrowserRow & { canonical?: { name?: string | null } | null }).canonical?.name,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return "Unknown exercise";
}

function toTagArray(value: string | null | undefined) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildExerciseHeaderMetaItems(row: ExerciseBrowserRow) {
  if (isStretchHubExercise(row)) {
    return getStretchHubMetaItems();
  }

  return [row.equipment, row.primary_muscle, row.movement_pattern]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => formatExerciseTagLabel(value));
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

function HistoryExerciseFilters({
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
}) {
  const normalizedFilterState = useMemo(() => normalizeExerciseInfoFilterState(filterState), [filterState]);
  const routineOptions = Array.isArray(filterOptions.routines) ? filterOptions.routines : [];
  const defaultRoutineOption = routineOptions.find((routine) => routine.isActive) ?? routineOptions[0] ?? null;
  const selectedRoutine = normalizedFilterState.routineId
    ? routineOptions.find((routine) => routine.id === normalizedFilterState.routineId) ?? null
    : defaultRoutineOption;
  const selectedCycleStartDate = normalizedFilterState.cycleStartDate;
  const orderedRoutineOptions = orderSelectedFirst(routineOptions, (routine) => routine.id === selectedRoutine?.id);
  const orderedCycleOptions = orderSelectedFirst(selectedRoutine?.cycleOptions ?? [], (cycle) => cycle.startDate === selectedCycleStartDate);

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

      {normalizedFilterState.analyticsScope !== "all_time" && selectedRoutine?.cycleOptions.length ? (
        <FilterSection
          title="Cycle"
          showClear={Boolean(selectedCycleStartDate)}
          onClear={() => applyFilterState({
            analyticsScope: "current_routine",
            routineId: selectedRoutine.id,
            cycleStartDate: null,
          })}
        >
          {orderedCycleOptions.map((cycle) => {
            const isSelected = cycle.startDate === selectedCycleStartDate;
            return (
              <PillButton
                key={cycle.startDate}
                type="button"
                active={isSelected}
                className={cn(
                  "shrink-0 whitespace-nowrap px-2 py-1 text-[10px]",
                  isSelected ? "!border-[rgb(var(--accent)/0.82)] !bg-[rgb(var(--accent)/0.42)] !text-[rgb(240_255_251)] shadow-[0_0_0_1px_rgba(71,215,196,0.22),inset_0_0_0_1px_rgba(255,255,255,0.06)]" : undefined,
                )}
                onClick={() => applyFilterState({
                  analyticsScope: "current_cycle",
                  routineId: selectedRoutine.id,
                  cycleStartDate: cycle.startDate,
                })}
              >
                {cycle.label}
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
      defaultFilterOpen={initialOpen}
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
      searchPlaceholder="Search exercises"
      resultSingularLabel="exercise"
      resultPluralLabel="exercises"
      clearSearchAriaLabel="Clear exercise search"
      toggleFiltersAriaLabel="Toggle exercise filters"
      chromeVariant="history"
      filterExtraContent={filterExtraContent}
    />
  );
}

const ExerciseHistoryRow = memo(function ExerciseHistoryRow({
  row,
  onOpen,
  viewMode,
}: {
  row: ExerciseBrowserRow;
  onOpen: (exerciseId: string) => void;
  viewMode: "compact" | "detailed";
}) {
  const displayName = getExerciseDisplayName(row);
  const viewModel = buildHistoryExerciseCardViewModel(row);
  const headerMetaItems = buildExerciseHeaderMetaItems(row);
  const metadata = headerMetaItems.length > 0 ? <HistoryMetaLine items={headerMetaItems} /> : undefined;

  return (
    <HistoryExerciseCard
      exercise={{
        name: displayName,
        slug: row.slug,
        image_path: row.image_path,
        image_icon_path: row.image_icon_path,
        image_howto_path: row.image_howto_path,
      }}
      title={displayName}
      summaryLabel={viewModel.summaryLabel}
      summary={viewModel.summary}
      comparison={viewModel.comparison}
      metadata={metadata}
      badgeText={viewModel.badgeText}
      badgeItems={viewModel.badgeItems}
      metrics={viewModel.detailedMetrics}
      trendPreview={row.trendPreview}
      detailSections={viewModel.detailedSections}
      density={viewMode}
      tone={viewModel.semanticTone}
      onPress={() => onOpen(row.exerciseId)}
    />
  );
});

export function ExerciseBrowserClient({
  initialRows = [],
  filterOptions = { routines: [] },
  inlineHeaderControls = false,
  initialViewMode = "compact",
  initialFiltersOpen = false,
  showBottomActions = true,
}: ExerciseBrowserClientProps & { inlineHeaderControls?: boolean; initialViewMode?: "compact" | "detailed"; initialFiltersOpen?: boolean }) {
  const [query, setQuery] = useState("");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"compact" | "detailed">(initialViewMode);
  const [filterState, setFilterState] = useState<ExerciseInfoFilterState>(createDefaultExerciseInfoFilterState());
  const [rowsByFilterKey, setRowsByFilterKey] = useState<Record<string, ExerciseBrowserRow[]>>(() => ({
    [buildFilterStateKey(createDefaultExerciseInfoFilterState())]: initialRows,
  }));
  const [lastVisibleScopedRows, setLastVisibleScopedRows] = useState<ExerciseBrowserRow[]>(initialRows);
  const [isScopeLoading, setIsScopeLoading] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const nextViewModeLabel = viewMode === "compact" ? "View Detailed" : "View Compact";
  const normalizedFilterState = useMemo(() => normalizeExerciseInfoFilterState(filterState), [filterState]);
  const filterKey = useMemo(() => buildFilterStateKey(normalizedFilterState), [normalizedFilterState]);
  const scopedRows = useMemo(() => (
    normalizedFilterState.analyticsScope === "all_time"
      ? initialRows
      : (rowsByFilterKey[filterKey] ?? lastVisibleScopedRows)
  ), [filterKey, initialRows, lastVisibleScopedRows, normalizedFilterState.analyticsScope, rowsByFilterKey]);

  const applyViewMode = (nextMode: "compact" | "detailed") => {
    setViewMode(nextMode);
    document.cookie = `${HISTORY_EXERCISE_VIEW_MODE_COOKIE}=${nextMode}; Max-Age=31536000; Path=/; SameSite=Lax`;
  };

  useEffect(() => {
    if (normalizedFilterState.analyticsScope === "all_time" || rowsByFilterKey[filterKey]) {
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
    void fetch(`/api/history/exercises?${params.toString()}`, {
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.ok || !Array.isArray(payload.rows)) {
          throw new Error(typeof payload?.error === "string" ? payload.error : "Failed to load filtered exercise history.");
        }

        setRowsByFilterKey((current) => ({
          ...current,
          [filterKey]: payload.rows,
        }));
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }

        console.error("[history/exercises] failed to load scoped rows", {
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
  }, [filterKey, normalizedFilterState, rowsByFilterKey]);

  useEffect(() => {
    if (normalizedFilterState.analyticsScope === "all_time") {
      setLastVisibleScopedRows(initialRows);
      return;
    }

    const cachedRows = rowsByFilterKey[filterKey];
    if (cachedRows) {
      setLastVisibleScopedRows(cachedRows);
    }
  }, [filterKey, initialRows, normalizedFilterState.analyticsScope, rowsByFilterKey]);

  const exerciseTagsById = useMemo(() => {
    const tagsById = new Map<string, Set<string>>();

    for (const row of scopedRows) {
      const tags = new Set<string>();
      for (const raw of [...toTagArray(row.primary_muscle), ...toTagArray(row.movement_pattern), ...toTagArray(row.equipment)]) {
        tags.add(raw.toLowerCase());
      }
      for (const metricTag of buildExerciseMetricTagValues(row)) {
        tags.add(metricTag);
      }
      for (const raw of flattenExerciseCurationTagValues(normalizeExerciseCurationTags(row.curation_tags))) {
        tags.add(raw);
      }
      tagsById.set(row.exerciseId, tags);
    }

    return tagsById;
  }, [scopedRows]);

  const availableTagGroups = useMemo<ExerciseTagGroup[]>(() => {
    const muscles = new Map<string, string>();
    const movements = new Map<string, string>();
    const equipment = new Map<string, string>();
    const curationGroups = new Map(
      EXERCISE_CURATION_GROUPS.map((group) => [group.key, { label: group.label, tags: new Map<string, string>() }]),
    );
    const metricGroup = buildExerciseMetricTagGroup(scopedRows);

    for (const row of scopedRows) {
      for (const item of toTagArray(row.primary_muscle)) muscles.set(item.toLowerCase(), formatExerciseTagLabel(item));
      for (const item of toTagArray(row.movement_pattern)) movements.set(item.toLowerCase(), formatExerciseTagLabel(item));
      for (const item of toTagArray(row.equipment)) equipment.set(item.toLowerCase(), formatExerciseTagLabel(item));

      const curationTags = normalizeExerciseCurationTags(row.curation_tags);
      if (!curationTags) {
        continue;
      }

      for (const group of EXERCISE_CURATION_GROUPS) {
        const values = curationTags[group.key] ?? [];
        const targetGroup = curationGroups.get(group.key);
        if (!targetGroup) {
          continue;
        }

        for (const value of values) {
          targetGroup.tags.set(buildScopedExerciseCurationTagValue(group.key, value), formatExerciseTagLabel(value));
        }
      }
    }

    return [
      { key: "muscle", label: "Muscle", tags: Array.from(muscles, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)) },
      { key: "movement", label: "Movement", tags: Array.from(movements, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)) },
      { key: "equipment", label: "Equipment", tags: Array.from(equipment, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)) },
      metricGroup,
      ...EXERCISE_CURATION_GROUPS.map((group) => {
        const targetGroup = curationGroups.get(group.key);
        return {
          key: group.key,
          label: group.label,
          tags: Array.from(targetGroup?.tags ?? [], ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)),
        };
      }),
    ].filter((group): group is ExerciseTagGroup => group !== null && group.tags.length > 0);
  }, [scopedRows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return scopedRows.filter((row) => {
      if (selectedTags.length > 0) {
        const tags = exerciseTagsById.get(row.exerciseId);
        if (!tags || !selectedTags.every((tag) => tags.has(tag))) {
          return false;
        }
      }

      if (!normalizedQuery) {
        return true;
      }

      const displayName = getExerciseDisplayName(row);
      const nameMatch = displayName.toLowerCase().includes(normalizedQuery);
      const slugMatch = row.slug?.toLowerCase().includes(normalizedQuery) ?? false;
      return nameMatch || slugMatch;
    });
  }, [deferredQuery, exerciseTagsById, scopedRows, selectedTags]);

  useEffect(() => {
    if (selectedExerciseId && !scopedRows.some((row) => row.exerciseId === selectedExerciseId)) {
      setSelectedExerciseId(null);
    }
  }, [scopedRows, selectedExerciseId]);

  const selectedRow = useMemo(
    () => (selectedExerciseId ? scopedRows.find((row) => row.exerciseId === selectedExerciseId) ?? null : null),
    [scopedRows, selectedExerciseId],
  );
  const selectedExerciseInfoSeed = useMemo(
    () => (selectedRow ? buildExerciseInfoSeedFromHistoryRow(selectedRow) : null),
    [selectedRow],
  );
  const [floatingHeaderContainer, setFloatingHeaderContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setFloatingHeaderContainer(document.getElementById("history-exercises-floating-header"));
  }, []);

  const filterNode = (
    <HistoryExerciseFilters
      query={query}
      onQueryChange={setQuery}
      selectedTags={selectedTags}
      onTagsChange={setSelectedTags}
      groups={availableTagGroups}
      resultCount={filteredRows.length}
      initialOpen={initialFiltersOpen}
      filterState={filterState}
      filterOptions={filterOptions}
      onFilterStateChange={setFilterState}
    />
  );

  return (
    <div className={appTokens.historyBrowserStack}>
      {inlineHeaderControls ? (
        <HistoryTitleControlShell
          viewMode={viewMode}
          onViewModeChange={applyViewMode}
          showViewModeToggle={false}
        >
          {filterNode}
        </HistoryTitleControlShell>
      ) : floatingHeaderContainer
        ? createPortal(
            <HistoryTitleControlShell
              viewMode={viewMode}
              onViewModeChange={applyViewMode}
              showViewModeToggle={false}
            >
              {filterNode}
            </HistoryTitleControlShell>,
            floatingHeaderContainer,
          )
        : null}

      <div className={cn(appTokens.historyExerciseResultsViewport, "pt-2")}>
        <ul className={appTokens.historyExerciseResults}>
          {filteredRows.map((row) => (
            <li key={row.exerciseId}>
              <ExerciseHistoryRow row={row} onOpen={setSelectedExerciseId} viewMode={viewMode} />
            </li>
          ))}
        </ul>
        {isScopeLoading ? <div className="px-1 pt-2 text-[11px] uppercase tracking-[0.12em] text-[rgb(var(--text-muted)/0.72)]">Updating scope...</div> : null}
      </div>

      <ExerciseInfo
        exerciseId={selectedRow?.exerciseId ?? null}
        initialExercise={selectedExerciseInfoSeed?.exercise ?? null}
        initialStats={selectedExerciseInfoSeed?.stats ?? null}
        initialFilterState={normalizedFilterState}
        open={Boolean(selectedRow)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedExerciseId(null);
          }
        }}
        onClose={() => {
          setSelectedExerciseId(null);
        }}
        sourceContext="ExerciseBrowserClient"
      />
      {showBottomActions ? (
        <PublishBottomActions>
          <BottomActionSplit
            secondary={(
              <BottomDockButton
                type="button"
                intent="toggleActive"
                data-history-density-toggle="exercises"
                onClick={() => applyViewMode(viewMode === "compact" ? "detailed" : "compact")}
              >
                {nextViewModeLabel}
              </BottomDockButton>
            )}
            primary={(
              <BottomDockLink href="/history" intent="positive">
                View History
              </BottomDockLink>
            )}
          />
        </PublishBottomActions>
      ) : null}
    </div>
  );
}
