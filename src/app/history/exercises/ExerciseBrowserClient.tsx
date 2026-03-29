"use client";

import { memo, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { ExerciseAssetImage } from "@/components/ExerciseAssetImage";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { ExerciseTagFilterControl, type ExerciseTagGroup } from "@/components/ExerciseTagFilterControl";
import { Input } from "@/components/ui/Input";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { ChevronRightIcon } from "@/components/ui/Chevrons";
import { HistoryControlGroup, HistoryTitleControlShell } from "@/components/history/HistoryShared";
import { cn } from "@/lib/cn";
import { getExerciseIconSrc } from "@/lib/exerciseImages";
import type { ExerciseBrowserRow } from "@/lib/exercises-browser";

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
    .split(/[\_\s-]+/)
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
  const iconSrc = getExerciseIconSrc({
    name: displayName,
    slug: row.slug,
    image_path: row.image_path,
    image_icon_path: row.image_icon_path,
    image_howto_path: row.image_howto_path,
  });
  const lastDate = formatShortDate(row.last_performed_at);
  const strengthPrSummary = typeof row.pr_est_1rm === "number" && Number.isFinite(row.pr_est_1rm) && row.pr_est_1rm > 0
    ? `${row.pr_est_1rm.toFixed(0)}${row.last_unit === "kg" ? "kg" : row.last_unit === "lb" || row.last_unit === "lbs" ? "lb" : ""}`
    : null;
  const hasSignal = Boolean(row.bestSummary || row.prLabel || strengthPrSummary);
  const primaryLine = row.kind === "strength"
    ? [lastDate ? `Last ${lastDate}` : null, row.lastSummary].filter(Boolean).join(" • ")
    : [lastDate ? `Last ${lastDate}` : null, row.lastSummary].filter(Boolean).join(" • ");
  const secondaryLine = row.kind === "strength"
    ? [row.bestSummary ? `Best ${row.bestSummary}` : null, row.prLabel ? `PRs ${row.prLabel}` : null, strengthPrSummary ? `1RM ${strengthPrSummary}` : null].filter(Boolean).join(" • ")
    : row.bestSummary ? `Best ${row.bestSummary}` : null;

  return (
    <button
      type="button"
      onClick={() => {
        if (process.env.NODE_ENV === "development") {
          console.debug("[ExerciseInfo:open] HistoryExercises", { exerciseId: row.exerciseId, row });
        }
        onOpen(row.exerciseId);
      }}
      className="block w-full rounded-[1.25rem] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-ring)]"
    >
      <AppPanel
        className={cn(
          "p-3 transition-colors hover:border-border/85 hover:bg-[rgb(var(--surface-rgb)/0.48)]",
          hasSignal ? "border-emerald-400/30 bg-[rgb(var(--surface-rgb)/0.56)]" : undefined,
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            {viewMode === "compact" ? null : (
              <div className="mb-1">
                <ExerciseAssetImage
                  src={iconSrc}
                  alt={displayName}
                  className="h-11 w-11 rounded-lg border border-border/25 bg-black/10"
                  imageClassName="object-cover object-center"
                  sizes="44px"
                />
              </div>
            )}
            <p className="line-clamp-1 text-sm font-semibold text-slate-50">{displayName}</p>
            <p className="line-clamp-1 text-xs text-slate-300">
              {primaryLine || (row.kind === "strength" ? "Strength history" : "Cardio history")}
            </p>
            {viewMode === "detailed" && secondaryLine ? (
              <p className="line-clamp-1 text-xs text-[rgb(var(--text)/0.62)]">{secondaryLine}</p>
            ) : null}
          </div>
          <ChevronRightIcon className="h-5 w-5 shrink-0 self-center text-[rgb(var(--text)/0.6)]" />
        </div>
      </AppPanel>
    </button>
  );
});

export function ExerciseBrowserClient({ rows = [] }: ExerciseBrowserClientProps) {
  const [query, setQuery] = useState("");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"compact" | "detailed">("compact");
  const router = useRouter();

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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <HistoryTitleControlShell viewMode={viewMode} onViewModeChange={setViewMode}>
        <HistoryControlGroup label="Search" summary={`${filteredRows.length} ${filteredRows.length === 1 ? "exercise" : "exercises"}`}>
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search exercises"
            aria-label="Search exercises"
          />
        </HistoryControlGroup>

        <HistoryControlGroup label="Filters" summary={selectedTags.length > 0 ? `${selectedTags.length} active` : "No filters active"}>
          <ExerciseTagFilterControl
            selectedTags={selectedTags}
            onChange={setSelectedTags}
            groups={availableTagGroups}
            className="space-y-2"
          />
        </HistoryControlGroup>
      </HistoryTitleControlShell>

      <div className="relative min-h-0">
        <ul className="space-y-1.5 scroll-py-2 pb-24">
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
        <BottomActionSingle>
          <BottomDockButton type="button" variant="secondary" onClick={() => router.push("/history")}>
            View Sessions
          </BottomDockButton>
        </BottomActionSingle>
      </PublishBottomActions>
    </div>
  );
}
