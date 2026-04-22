"use client";

import { memo, useDeferredValue, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { EXERCISE_CARD_TERTIARY_TEXT_CLASS_NAME } from "@/components/ExerciseCard";
import { ExerciseTagFilterControl, type ExerciseTagGroup } from "@/components/ExerciseTagFilterControl";
import { StandardExerciseRow } from "@/components/StandardExerciseRow";
import { HistoryExerciseCard } from "@/components/history/HistoryExerciseCard";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { HistoryTitleControlShell } from "@/components/history/HistoryShared";
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
    <div className="space-y-1.5">
      <ExerciseTagFilterControl
        selectedTags={selectedTags}
        onChange={onTagsChange}
        groups={groups}
        countDisplayMode="never"
        headerLabel={`${countLabel} • Filters`}
        variant="compact"
        className="space-y-1.5"
        buttonClassName="min-h-9 rounded-[1rem] px-3.5 py-2 text-[13px] font-semibold"
        panelClassName="space-y-1.5 rounded-[1rem] px-2.5 py-2"
      />
      <div className="relative">
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search exercises"
          className="h-10 rounded-[1rem] pr-9 text-[14px]"
        />
        {query ? (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            aria-label="Clear exercise search"
            className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2-soft hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/25"
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
  const metadata = viewModel.chips.map((chip) => chip.label).join(" | ");
  const badgeText = row.prCount > 0 ? `${row.prCount} PR` : undefined;

  return (
    viewMode === "compact" ? (
      <StandardExerciseRow
        exercise={{
          name: displayName,
          slug: row.slug,
          image_path: row.image_path,
          image_icon_path: row.image_icon_path,
          image_howto_path: row.image_howto_path,
        }}
        summary={primaryLine}
        summaryLabel={viewModel.summaryLabel}
        badgeText={badgeText}
        variant="interactive"
        density="compact"
        semanticTone={viewModel.semanticTone}
        surface="history-browser"
        showLeadingVisual
        onPress={() => onOpen(row.exerciseId)}
      >
        {metadata ? (
          <p className={EXERCISE_CARD_TERTIARY_TEXT_CLASS_NAME}>
            {metadata}
          </p>
        ) : null}
      </StandardExerciseRow>
    ) : (
      <HistoryExerciseCard
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
    )
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
    <div className="flex min-h-0 flex-1 flex-col gap-3">
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

      <div className="relative min-h-0">
        <ul className="space-y-2 scroll-py-2">
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
