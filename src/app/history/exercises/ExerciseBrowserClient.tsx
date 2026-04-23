"use client";

import { memo, useDeferredValue, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { ExerciseTagFilterControl, type ExerciseTagGroup } from "@/components/ExerciseTagFilterControl";
import { HistoryExerciseCard } from "@/components/history/HistoryExerciseCard";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { HistoryTitleControlShell } from "@/components/history/HistoryShared";
import { appTokens } from "@/components/ui/app/tokens";
import { Input } from "@/components/ui/Input";
import type { ExerciseBrowserRow } from "@/lib/exercises-browser";
import { buildHistoryExerciseCardViewModel } from "@/lib/workout-card-view-models";

const HISTORY_EXERCISE_VIEW_MODE_COOKIE = "history-exercises-view-mode";

type ExerciseBrowserClientProps = {
  rows?: ExerciseBrowserRow[];
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

function formatShortDate(dateValue: string | null) {
  if (!dateValue) return null;

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

function toTagArray(value: string | null | undefined) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatTagLabel(tag: string) {
  return tag
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function HistoryExerciseFilters({
  countLabel,
  query,
  onQueryChange,
  selectedTags,
  onTagsChange,
  groups,
}: {
  countLabel: string;
  query: string;
  onQueryChange: (next: string) => void;
  selectedTags: string[];
  onTagsChange: (next: string[]) => void;
  groups: ExerciseTagGroup[];
}) {
  return (
    <div className={appTokens.historyExerciseFilterStack}>
      <ExerciseTagFilterControl
        selectedTags={selectedTags}
        onChange={onTagsChange}
        groups={groups}
        countDisplayMode="never"
        headerLabel={`${countLabel} \u00b7 Filters`}
        variant="compact"
        className={appTokens.historyExerciseFilterStack}
        buttonClassName={appTokens.historyExerciseFilterButton}
        panelClassName={appTokens.historyExerciseFilterPanel}
      />
      <div className="relative">
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search exercises"
          className={appTokens.historyExerciseSearchInput}
        />
        {query ? (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            aria-label="Clear exercise search"
            className={appTokens.exercisePickerSearchClearButton}
          >
            ×
          </button>
        ) : null}
      </div>
    </div>
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
  const lastDate = formatShortDate(row.last_performed_at);
  const viewModel = buildHistoryExerciseCardViewModel(row);
  const primaryLine = row.lastSummary ? `${lastDate ? `${lastDate} | ` : ""}${viewModel.summary}` : viewModel.summary;
  const metadata = viewModel.chips.map((chip) => chip.label).join(" \u00b7 ");
  const badgeText = row.prCount > 0 ? `${row.prCount} PR` : undefined;

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
      summary={primaryLine}
      metadata={metadata || undefined}
      badgeText={badgeText}
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
}: ExerciseBrowserClientProps & { inlineHeaderControls?: boolean; initialViewMode?: "compact" | "detailed" }) {
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
      tagsById.set(row.exerciseId, tags);
    }

    return tagsById;
  }, [rows]);

  const availableTagGroups = useMemo<ExerciseTagGroup[]>(() => {
    const muscles = new Map<string, string>();
    const movements = new Map<string, string>();
    const equipment = new Map<string, string>();

    for (const row of rows) {
      for (const item of toTagArray(row.primary_muscle)) muscles.set(item.toLowerCase(), formatTagLabel(item));
      for (const item of toTagArray(row.movement_pattern)) movements.set(item.toLowerCase(), formatTagLabel(item));
      for (const item of toTagArray(row.equipment)) equipment.set(item.toLowerCase(), formatTagLabel(item));
    }

    return [
      { key: "muscle", label: "Muscle", tags: Array.from(muscles, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)) },
      { key: "movement", label: "Movement", tags: Array.from(movements, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)) },
      { key: "equipment", label: "Equipment", tags: Array.from(equipment, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)) },
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
            countLabel={`${filteredRows.length} shown`}
            query={query}
            onQueryChange={setQuery}
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
            groups={availableTagGroups}
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
                countLabel={`${filteredRows.length} shown`}
                query={query}
                onQueryChange={setQuery}
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
                groups={availableTagGroups}
              />
            </HistoryTitleControlShell>,
            floatingHeaderContainer,
          )
        : null}

      <div className={appTokens.historyExerciseResultsViewport}>
        <ul className={appTokens.historyExerciseResults}>
          {filteredRows.map((row) => (
            <li key={row.exerciseId}>
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
      <PublishBottomActions>
        <BottomActionSplit
          secondary={(
            <BottomDockButton
              type="button"
              intent="info"
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
    </div>
  );
}
