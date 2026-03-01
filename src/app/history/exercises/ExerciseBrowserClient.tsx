"use client";

import { memo, useMemo, useState } from "react";
import { ExerciseAssetImage } from "@/components/ExerciseAssetImage";
import { ExerciseInfoSheet } from "@/components/ExerciseInfoSheet";
import { ExerciseTagFilterControl, type ExerciseTagGroup } from "@/components/ExerciseTagFilterControl";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Input } from "@/components/ui/Input";
import { listShellClasses } from "@/components/ui/listShellClasses";
import { getExerciseIconSrc } from "@/lib/exerciseImages";
import type { ExerciseBrowserRow } from "@/lib/exercises-browser";

type ExerciseBrowserClientProps = {
  rows?: ExerciseBrowserRow[];
};

function formatWeight(weight: number) {
  return Number.isInteger(weight) ? String(weight) : weight.toFixed(1).replace(/\.0$/, "");
}

function formatSetSummary(weight: number | null, reps: number | null, unit: string | null) {
  const weightLabel = typeof weight === "number" && Number.isFinite(weight) && weight > 0 ? formatWeight(weight) : null;
  const repsLabel = typeof reps === "number" && Number.isFinite(reps) && reps > 0 ? String(reps) : null;
  const normalizedUnit = unit === "lb" || unit === "lbs" ? "lb" : unit === "kg" ? "kg" : "";
  const unitSuffix = weightLabel && normalizedUnit ? normalizedUnit : "";

  if (weightLabel && repsLabel) {
    return `${weightLabel}${unitSuffix}×${repsLabel}`;
  }

  if (repsLabel) {
    return `${repsLabel} reps`;
  }

  if (weightLabel) {
    return `${weightLabel}${unitSuffix}`;
  }

  return null;
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
}: {
  row: ExerciseBrowserRow;
  onOpen: (canonicalExerciseId: string) => void;
}) {
  const iconSrc = getExerciseIconSrc({
    name: row.name,
    slug: row.slug,
    image_path: row.image_path,
    image_icon_path: row.image_icon_path,
    image_howto_path: row.image_howto_path,
  });
  const lastSummary = formatSetSummary(row.last_weight, row.last_reps, row.last_unit);
  const lastDate = formatShortDate(row.last_performed_at);
  const actualPrSummary = formatSetSummary(row.actual_pr_weight, row.actual_pr_reps, row.last_unit);
  const actualPrDate = formatShortDate(row.actual_pr_at);
  const e1rmSummary = row.pr_est_1rm && row.pr_est_1rm > 0 ? `${Math.round(row.pr_est_1rm)} e1RM` : null;

  return (
    <li className={`${listShellClasses.card} border-[rgb(var(--glass-tint-rgb)/0.26)] bg-[rgb(var(--glass-tint-rgb)/0.64)] p-3 shadow-[0_6px_14px_-12px_rgba(0,0,0,0.74)]`}>
      <div className="flex items-center gap-3">
        <ExerciseAssetImage src={iconSrc} alt={row.name} className="h-12 w-12 shrink-0 rounded-lg border border-border/35 bg-surface-2-soft object-cover" />

        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-sm font-bold text-slate-50">{row.name}</p>
          <p className="text-xs text-slate-400/85">Last performed: {lastDate ?? "Never"}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            <p className="text-slate-300/90">Last: <span className="text-slate-100">{lastSummary ?? "—"}</span></p>
            <p className="text-slate-300/90">PR: <span className="text-slate-100">{actualPrSummary ?? "—"}</span>{actualPrDate ? <span className="ml-1 text-slate-500">{actualPrDate}</span> : null}</p>
            {e1rmSummary ? <p className="text-slate-400">{e1rmSummary}</p> : null}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpen(row.canonicalExerciseId)}
          aria-label={`Open exercise info for ${row.name}`}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/15 text-xs text-slate-200 transition hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-ring)]"
        >
          ⓘ
        </button>
      </div>
    </li>
  );
});

export function ExerciseBrowserClient({ rows = [] }: ExerciseBrowserClientProps) {
  const [query, setQuery] = useState("");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const exerciseTagsById = useMemo(() => {
    const tagsById = new Map<string, Set<string>>();

    for (const row of rows) {
      const tags = new Set<string>();
      for (const raw of [...toTagArray(row.primary_muscle), ...toTagArray(row.movement_pattern), ...toTagArray(row.equipment)]) {
        tags.add(raw.toLowerCase());
      }
      tagsById.set(row.id, tags);
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
        const tags = exerciseTagsById.get(row.id);
        if (!tags || !selectedTags.every((tag) => tags.has(tag))) {
          return false;
        }
      }

      if (!normalizedQuery) {
        return true;
      }

      const nameMatch = row.name.toLowerCase().includes(normalizedQuery);
      const slugMatch = row.slug?.toLowerCase().includes(normalizedQuery) ?? false;
      return nameMatch || slugMatch;
    });
  }, [exerciseTagsById, query, rows, selectedTags]);

  const selectedRow = useMemo(
    () => (selectedExerciseId ? rows.find((row) => row.canonicalExerciseId === selectedExerciseId) ?? null : null),
    [rows, selectedExerciseId],
  );

  return (
    <div className="space-y-3">
      <div className="sticky top-2 z-20 flex justify-center rounded-xl border border-white/10 bg-[rgb(var(--surface-rgb)/0.52)] px-2 py-1 backdrop-blur-[2px]">
        <SegmentedControl
          options={[
            { label: "Sessions", value: "sessions", href: "/history" },
            { label: "Exercises", value: "exercises", href: "/history/exercises" },
          ]}
          value="exercises"
        />
      </div>

      <div className="space-y-2 px-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Exercise history</p>
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search exercises"
          aria-label="Search exercises"
        />
      </div>

      <ExerciseTagFilterControl selectedTags={selectedTags} onChange={setSelectedTags} groups={availableTagGroups} />

      <ul className={`${listShellClasses.viewport} space-y-2.5 scroll-py-2`} style={{ WebkitOverflowScrolling: "touch" }}>
        {filteredRows.map((row) => (
          <ExerciseHistoryRow key={row.id} row={row} onOpen={setSelectedExerciseId} />
        ))}
      </ul>

      <ExerciseInfoSheet
        exercise={selectedRow ? {
          id: selectedRow.canonicalExerciseId,
          exercise_id: selectedRow.canonicalExerciseId,
          name: selectedRow.name,
          primary_muscle: selectedRow.primary_muscle,
          equipment: selectedRow.equipment,
          movement_pattern: selectedRow.movement_pattern,
          image_icon_path: selectedRow.image_icon_path,
          image_howto_path: selectedRow.image_howto_path,
          how_to_short: selectedRow.how_to_short,
          slug: selectedRow.slug,
        } : null}
        stats={selectedRow ? {
          exercise_id: selectedRow.canonicalExerciseId,
          last_weight: selectedRow.last_weight,
          last_reps: selectedRow.last_reps,
          last_unit: selectedRow.last_unit,
          last_performed_at: selectedRow.last_performed_at,
          pr_weight: selectedRow.pr_weight,
          pr_reps: selectedRow.pr_reps,
          pr_est_1rm: selectedRow.pr_est_1rm,
          actual_pr_weight: selectedRow.actual_pr_weight,
          actual_pr_reps: selectedRow.actual_pr_reps,
          actual_pr_at: selectedRow.actual_pr_at,
        } : null}
        open={Boolean(selectedRow)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedExerciseId(null);
          }
        }}
      />
    </div>
  );
}
