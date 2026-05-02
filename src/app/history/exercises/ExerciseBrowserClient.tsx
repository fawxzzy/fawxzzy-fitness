"use client";

import { memo, useDeferredValue, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { type ExerciseTagGroup } from "@/components/ExerciseTagFilterControl";
import { DEFAULT_EXERCISE_SEARCH_FILTERS_STACK_CLASSNAME, ExerciseSearchFilters } from "@/components/exercises/ExerciseSearchFilters";
import { HistoryExerciseCard } from "@/components/history/HistoryExerciseCard";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { HistoryMetaLine } from "@/components/history/HistoryMetaLine";
import { HistoryTitleControlShell } from "@/components/history/HistoryShared";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";
import type { ExerciseBrowserRow } from "@/lib/exercises-browser";
import {
  EXERCISE_CURATION_GROUPS,
  flattenExerciseCurationTagValues,
  formatExerciseTagLabel,
  normalizeExerciseCurationTags,
  buildScopedExerciseCurationTagValue,
} from "@/lib/exercise-curation";
import { getStretchHubMetaItems, isStretchHubExercise } from "@/lib/stretch-library";
import { buildHistoryExerciseCardViewModel } from "@/lib/workout-card-view-models";

const HISTORY_EXERCISE_VIEW_MODE_COOKIE = "history-exercises-view-mode";

type ExerciseBrowserClientProps = {
  rows?: ExerciseBrowserRow[];
  showBottomActions?: boolean;
};

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

function HistoryExerciseFilters({
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
      defaultFilterOpen={initialOpen}
      className={cn(appTokens.historyExerciseFilterStack, DEFAULT_EXERCISE_SEARCH_FILTERS_STACK_CLASSNAME)}
      filterClassName="space-y-1.5"
      filterButtonClassName={appTokens.historyExerciseFilterButton}
      filterPanelClassName={appTokens.historyExerciseFilterPanel}
      searchInputClassName={appTokens.historyExerciseSearchInput}
      clearButtonClassName={appTokens.exercisePickerSearchClearButton}
      searchPlaceholder="Search exercises"
      resultSingularLabel="exercise"
      resultPluralLabel="exercises"
      clearSearchAriaLabel="Clear exercise search"
      toggleFiltersAriaLabel="Toggle exercise filters"
      chromeVariant="history"
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
      metadata={metadata}
      badgeText={viewModel.badgeText}
      metrics={viewModel.detailedMetrics}
      density={viewMode}
      tone={viewModel.semanticTone}
      onPress={() => onOpen(row.exerciseId)}
    />
  );
});

export function ExerciseBrowserClient({
  rows = [],
  inlineHeaderControls = false,
  initialViewMode = "compact",
  initialFiltersOpen = false,
  showBottomActions = true,
}: ExerciseBrowserClientProps & { inlineHeaderControls?: boolean; initialViewMode?: "compact" | "detailed"; initialFiltersOpen?: boolean }) {
  const [query, setQuery] = useState("");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"compact" | "detailed">(initialViewMode);
  const deferredQuery = useDeferredValue(query);
  const nextViewModeLabel = viewMode === "compact" ? "Detailed" : "Compact";

  const applyViewMode = (nextMode: "compact" | "detailed") => {
    setViewMode(nextMode);
    document.cookie = `${HISTORY_EXERCISE_VIEW_MODE_COOKIE}=${nextMode}; Max-Age=31536000; Path=/; SameSite=Lax`;
  };

  const exerciseTagsById = useMemo(() => {
    const tagsById = new Map<string, Set<string>>();

    for (const row of rows) {
      const tags = new Set<string>();
      for (const raw of [...toTagArray(row.primary_muscle), ...toTagArray(row.movement_pattern), ...toTagArray(row.equipment)]) {
        tags.add(raw.toLowerCase());
      }
      for (const raw of flattenExerciseCurationTagValues(normalizeExerciseCurationTags(row.curation_tags))) {
        tags.add(raw);
      }
      tagsById.set(row.exerciseId, tags);
    }

    return tagsById;
  }, [rows]);

  const availableTagGroups = useMemo<ExerciseTagGroup[]>(() => {
    const muscles = new Map<string, string>();
    const movements = new Map<string, string>();
    const equipment = new Map<string, string>();
    const curationGroups = new Map(
      EXERCISE_CURATION_GROUPS.map((group) => [group.key, { label: group.label, tags: new Map<string, string>() }]),
    );

    for (const row of rows) {
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
      ...EXERCISE_CURATION_GROUPS.map((group) => {
        const targetGroup = curationGroups.get(group.key);
        return {
          key: group.key,
          label: group.label,
          tags: Array.from(targetGroup?.tags ?? [], ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)),
        };
      }),
    ].filter((group) => group.tags.length > 0);
  }, [rows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return rows.filter((row) => {
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
  }, [deferredQuery, exerciseTagsById, rows, selectedTags]);

  const selectedRow = useMemo(
    () => (selectedExerciseId ? rows.find((row) => row.exerciseId === selectedExerciseId) ?? null : null),
    [rows, selectedExerciseId],
  );
  const [floatingHeaderContainer, setFloatingHeaderContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setFloatingHeaderContainer(document.getElementById("history-exercises-floating-header"));
  }, []);

  return (
    <div className={appTokens.historyBrowserStack}>
      {inlineHeaderControls ? (
        <HistoryTitleControlShell
          viewMode={viewMode}
          onViewModeChange={applyViewMode}
          showViewModeToggle={false}
        >
          <HistoryExerciseFilters
            query={query}
            onQueryChange={setQuery}
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
            groups={availableTagGroups}
            resultCount={filteredRows.length}
            initialOpen={initialFiltersOpen}
          />
        </HistoryTitleControlShell>
      ) : floatingHeaderContainer
        ? createPortal(
            <HistoryTitleControlShell
              viewMode={viewMode}
              onViewModeChange={applyViewMode}
              showViewModeToggle={false}
            >
              <HistoryExerciseFilters
                query={query}
                onQueryChange={setQuery}
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
                groups={availableTagGroups}
                resultCount={filteredRows.length}
                initialOpen={initialFiltersOpen}
              />
            </HistoryTitleControlShell>,
            floatingHeaderContainer,
          )
        : null}

      <div className={cn(appTokens.historyExerciseResultsViewport, "pt-2")}>
        <ul className={appTokens.historyExerciseResults}>
          {filteredRows.map((row) => (
            <li key={`${viewMode}:${row.exerciseId}`}>
              <ExerciseHistoryRow row={row} onOpen={setSelectedExerciseId} viewMode={viewMode} />
            </li>
          ))}
        </ul>
      </div>

      <ExerciseInfo
        exerciseId={selectedRow?.exerciseId ?? null}
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
                Sessions
              </BottomDockLink>
            )}
          />
        </PublishBottomActions>
      ) : null}
    </div>
  );
}

