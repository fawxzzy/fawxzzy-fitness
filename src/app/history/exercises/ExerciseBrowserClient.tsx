"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { StandardExerciseRow } from "@/components/StandardExerciseRow";
import type { ExerciseTagGroup } from "@/components/ExerciseTagFilterControl";
import { ExerciseSearchFilters } from "@/components/exercises/ExerciseSearchFilters";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { ChevronRightIcon } from "@/components/ui/Chevrons";
import { HistoryTitleControlShell } from "@/components/history/HistoryShared";
import { WorkoutExerciseCardDetails } from "@/components/workout/WorkoutExerciseCardDetails";
import type { ExerciseBrowserRow } from "@/lib/exercises-browser";
import { buildHistoryExerciseCardViewModel } from "@/lib/workout-card-view-models";

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
  const primaryLine = row.lastSummary
    ? `${lastDate ? `${lastDate} | ` : ""}${viewModel.summary}`
    : viewModel.summary;

  return (
    <StandardExerciseRow
      exercise={{ name: displayName, slug: row.slug, image_path: row.image_path, image_icon_path: row.image_icon_path, image_howto_path: row.image_howto_path }}
      summary={primaryLine}
      summaryLabel={viewModel.summaryLabel}
      variant="interactive"
      density={viewMode}
      onPress={() => {
        if (process.env.NODE_ENV === "development") {
          console.debug("[ExerciseInfo:open] HistoryExercises", { exerciseId: row.exerciseId, row });
        }
        onOpen(row.exerciseId);
      }}
      rightIcon={<ChevronRightIcon className="h-5 w-5 shrink-0 self-center text-[rgb(var(--text)/0.6)]" />}
      state="default"
      semanticTone={viewModel.semanticTone}
      className="shadow-none"
    >
      <WorkoutExerciseCardDetails
        density={viewMode}
        chips={viewModel.chips}
        detailedMetrics={viewModel.detailedMetrics}
      />
    </StandardExerciseRow>
  );
});

export function ExerciseBrowserClient({
  rows = [],
  inlineHeaderControls = false,
  initialViewMode = "detailed",
}: ExerciseBrowserClientProps & { inlineHeaderControls?: boolean; initialViewMode?: "compact" | "detailed" }) {
  const [query, setQuery] = useState("");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"compact" | "detailed">(initialViewMode);
  const nextViewModeLabel = viewMode === "compact" ? "Detailed" : "Compact";

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
    const normalizedQuery = query.trim().toLowerCase();

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
  }, [exerciseTagsById, query, rows, selectedTags]);

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
          caption={`${filteredRows.length} ${filteredRows.length === 1 ? "exercise" : "exercises"} shown`}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showViewModeToggle={false}
        >
          <ExerciseSearchFilters
            query={query}
            onQueryChange={setQuery}
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
            groups={availableTagGroups}
            className="space-y-1.5"
            filterClassName="space-y-1"
          />
        </HistoryTitleControlShell>
      ) : floatingHeaderContainer
        ? createPortal(
            <HistoryTitleControlShell
              caption={`${filteredRows.length} ${filteredRows.length === 1 ? "exercise" : "exercises"} shown`}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              showViewModeToggle={false}
            >
              <ExerciseSearchFilters
                query={query}
                onQueryChange={setQuery}
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
                groups={availableTagGroups}
                className="space-y-1.5"
                filterClassName="space-y-1"
              />
            </HistoryTitleControlShell>,
            floatingHeaderContainer,
          )
        : null}

      <div className="relative min-h-0">
        <ul className="space-y-1.5 scroll-py-2">
          {filteredRows.map((row) => (
            <li key={row.exerciseId}>
              <ExerciseHistoryRow row={row} onOpen={setSelectedExerciseId} viewMode={viewMode} />
            </li>
          ))}
        </ul>
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[rgb(var(--surface-2-soft)/0.98)] to-transparent" aria-hidden="true" />
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
              onClick={() => setViewMode((current) => (current === "compact" ? "detailed" : "compact"))}
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
