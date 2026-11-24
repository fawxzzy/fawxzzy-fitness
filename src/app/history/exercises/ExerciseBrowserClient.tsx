"use client";

import { memo, useDeferredValue, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { type ExerciseTagGroup } from "@/components/ExerciseTagFilterControl";
import { HistoryExerciseCard } from "@/components/history/HistoryExerciseCard";
import { HistoryTitleControlShell } from "@/components/history/HistoryShared";
import { HistoryFilterBar, type HistoryActiveFilterChip, type HistoryFilterGroup } from "@/components/history/HistoryFilterBar";
import { HistoryHeaderDensityToggle } from "@/components/history/HistoryHeaderDensityToggle";
import { AppButton } from "@/components/ui/AppButton";
import { CardEmptyState } from "@/components/ui/card-system";
import { useToast } from "@/components/ui/ToastProvider";
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
type HistoryFilterTagGroup = "primary_muscle" | "secondary_muscle" | "movement" | "equipment" | "other";

type ExerciseBrowserClientProps = {
  initialRows?: ExerciseBrowserRow[];
  filterOptions?: ExerciseInfoFilterOptions;
  activeRoutineTitle?: string | null;
  /** Portal the Compact / Detailed toggle into the History header (off on dev fixtures without that header). */
  showHeaderDensityToggle?: boolean;
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

function buildScopedHistoryFilterTagValue(group: HistoryFilterTagGroup, value: string) {
  return `${group}:${value.trim().toLowerCase()}`;
}

function appendScopedHistoryFilterTags(
  target: Set<string>,
  values: string[] | string | null | undefined,
  group: HistoryFilterTagGroup,
) {
  const items = Array.isArray(values) ? values : toTagArray(values);
  for (const value of items) {
    target.add(buildScopedHistoryFilterTagValue(group, value));
  }
}

function buildExerciseHeaderMetaItems(row: ExerciseBrowserRow) {
  if (isStretchHubExercise(row)) {
    return getStretchHubMetaItems();
  }

  const items = [
    row.primary_muscle,
    row.movement_pattern,
    row.equipment,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => formatExerciseTagLabel(value));

  return Array.from(new Set(items));
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

  const applyFilterState = (nextState: Partial<ExerciseInfoFilterState>) => {
    onFilterStateChange(normalizeExerciseInfoFilterState(nextState));
  };
  const resetScope = () => onFilterStateChange(createDefaultExerciseInfoFilterState());
  const isRoutineScope = normalizedFilterState.analyticsScope !== "all_time";
  const cycleOptions = selectedRoutine?.cycleOptions ?? [];

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

  const tagLabelByValue = new Map<string, string>();
  for (const group of groups) {
    for (const tag of group.tags) {
      tagLabelByValue.set(tag.value, tag.label);
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
        { key: "all_time", label: "All sessions", selected: !isRoutineScope, onSelect: resetScope },
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
  if (isRoutineScope && selectedRoutine && cycleOptions.length > 0) {
    sheetGroups.push({
      key: "cycle",
      title: "Cycle",
      collapsedLimit: 6,
      options: cycleOptions.map((cycle) => {
        const isSelected = cycle.startDate === selectedCycleStartDate;
        return {
          key: cycle.startDate,
          label: cycle.label,
          selected: isSelected,
          onSelect: () => applyFilterState(isSelected
            ? { analyticsScope: "current_routine", routineId: selectedRoutine.id, cycleStartDate: null }
            : { analyticsScope: "current_cycle", routineId: selectedRoutine.id, cycleStartDate: cycle.startDate }),
        };
      }),
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
    const selectedCycle = cycleOptions.find((cycle) => cycle.startDate === selectedCycleStartDate);
    const routineLabel = selectedRoutine?.title ?? "One routine";
    activeChips.push({
      key: "scope",
      label: selectedCycle ? `${routineLabel} · ${selectedCycle.label}` : routineLabel,
      onRemove: resetScope,
    });
  }
  for (const tag of selectedTags) {
    activeChips.push({
      key: `tag-${tag}`,
      label: tagLabelByValue.get(tag) ?? tag.slice(tag.indexOf(":") + 1),
      onRemove: () => onTagsChange(selectedTags.filter((value) => value !== tag)),
    });
  }

  return (
    <HistoryFilterBar
      query={query}
      onQueryChange={onQueryChange}
      searchPlaceholder="Search exercises…"
      searchLabel="Search exercises"
      activeFilterCount={activeChips.length}
      activeChips={activeChips}
      onClearAll={() => {
        onQueryChange("");
        onTagsChange([]);
        resetScope();
      }}
      groups={sheetGroups}
      resultCount={resultCount}
      resultSingularLabel="exercise"
      resultPluralLabel="exercises"
      initialSheetOpen={initialOpen}
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
      metaItems={headerMetaItems}
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
  showHeaderDensityToggle = true,
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
  const toastError = useToast().error;
  const deferredQuery = useDeferredValue(query);
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
        // Errors only go through the in-flow notice (History review item 0c); the list keeps the last results.
        toastError("Could not load that filter. Showing your last results.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsScopeLoading(false);
        }
      });

    return () => controller.abort();
  }, [filterKey, normalizedFilterState, rowsByFilterKey, toastError]);

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
      appendScopedHistoryFilterTags(tags, row.primary_muscle, "primary_muscle");
      appendScopedHistoryFilterTags(tags, row.primary_muscles, "primary_muscle");
      appendScopedHistoryFilterTags(tags, row.secondary_muscles, "secondary_muscle");
      appendScopedHistoryFilterTags(tags, row.movement_pattern, "movement");
      appendScopedHistoryFilterTags(tags, row.equipment, "equipment");
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
    const primaryMuscles = new Map<string, string>();
    const secondaryMuscles = new Map<string, string>();
    const movements = new Map<string, string>();
    const equipment = new Map<string, string>();
    const curationGroups = new Map(
      EXERCISE_CURATION_GROUPS.map((group) => [group.key, { label: group.label, tags: new Map<string, string>() }]),
    );
    const metricGroup = buildExerciseMetricTagGroup(scopedRows);

    for (const row of scopedRows) {
      for (const item of [...toTagArray(row.primary_muscle), ...(row.primary_muscles ?? [])]) {
        primaryMuscles.set(item.toLowerCase(), formatExerciseTagLabel(item));
      }
      for (const item of [...toTagArray(row.primary_muscle), ...(row.primary_muscles ?? []), ...(row.secondary_muscles ?? [])]) {
        secondaryMuscles.set(item.toLowerCase(), formatExerciseTagLabel(item));
      }
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
      { key: "primary_muscle", label: "Primary Muscle", tags: Array.from(primaryMuscles, ([value, label]) => ({ value: buildScopedHistoryFilterTagValue("primary_muscle", value), label })).sort((a, b) => a.label.localeCompare(b.label)) },
      { key: "secondary_muscle", label: "Secondary Muscle", tags: Array.from(secondaryMuscles, ([value, label]) => ({ value: buildScopedHistoryFilterTagValue("secondary_muscle", value), label })).sort((a, b) => a.label.localeCompare(b.label)) },
      { key: "movement", label: "Movement", tags: Array.from(movements, ([value, label]) => ({ value: buildScopedHistoryFilterTagValue("movement", value), label })).sort((a, b) => a.label.localeCompare(b.label)) },
      { key: "equipment", label: "Equipment", tags: Array.from(equipment, ([value, label]) => ({ value: buildScopedHistoryFilterTagValue("equipment", value), label })).sort((a, b) => a.label.localeCompare(b.label)) },
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
        {filteredRows.length > 0 ? (
          <ul className={appTokens.historyExerciseResults}>
            {filteredRows.map((row) => (
              <li key={row.exerciseId}>
                <ExerciseHistoryRow row={row} onOpen={setSelectedExerciseId} viewMode={viewMode} />
              </li>
            ))}
          </ul>
        ) : isScopeLoading ? null : (
          <div data-history-list-state={scopedRows.length > 0 ? "filtered-empty" : "empty"}>
            {scopedRows.length > 0 ? (
              <CardEmptyState
                headingLevel={2}
                title="No exercises match"
                body="Try a different search or remove a filter."
                action={(
                  <AppButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setQuery("");
                      setSelectedTags([]);
                      setFilterState(createDefaultExerciseInfoFilterState());
                    }}
                  >
                    Clear filters
                  </AppButton>
                )}
              />
            ) : (
              <CardEmptyState
                headingLevel={2}
                title="No exercises yet"
                body="Exercises show here once you log sets for them in a workout."
              />
            )}
          </div>
        )}
        {isScopeLoading ? (
          <div role="status" aria-label="Loading exercises" aria-busy="true" data-history-scope-loading="true" className="grid gap-2 pt-2">
            {[0, 1].map((index) => (
              <div key={index} className="h-[4.5rem] animate-pulse rounded-[var(--radius-lg)] border border-[rgb(var(--border-strong)/0.12)] bg-[rgb(var(--surface-2-rgb)/0.42)] motion-reduce:animate-none" />
            ))}
          </div>
        ) : null}
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
      {showHeaderDensityToggle ? (
        <HistoryHeaderDensityToggle scope="exercises" viewMode={viewMode} onViewModeChange={applyViewMode} />
      ) : null}
    </div>
  );
}
