"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExerciseAssetImage } from "@/components/ExerciseAssetImage";
import { Input } from "@/components/ui/Input";
import { listShellClasses } from "@/components/ui/listShellClasses";
import { getExerciseIconSrc } from "@/lib/exerciseImages";
import type { ExerciseBrowserRow } from "@/lib/exercises-browser";

type ExerciseBrowserClientProps = {
  rows: ExerciseBrowserRow[];
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

export function ExerciseBrowserClient({ rows }: ExerciseBrowserClientProps) {
  const [query, setQuery] = useState("");

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return rows;
    }

    return rows.filter((row) => {
      const nameMatch = row.name.toLowerCase().includes(normalizedQuery);
      const slugMatch = row.slug?.toLowerCase().includes(normalizedQuery) ?? false;
      return nameMatch || slugMatch;
    });
  }, [query, rows]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-slate-100">Exercises</h1>
        <div className="inline-flex rounded-lg border border-[rgb(var(--glass-tint-rgb)/0.22)] bg-[rgb(var(--glass-tint-rgb)/0.38)] p-1">
          <Link href="/history" className="inline-flex min-h-9 items-center rounded-md px-3 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white">
            Sessions
          </Link>
          <span className="inline-flex min-h-9 items-center rounded-md bg-[rgb(var(--glass-tint-rgb)/0.9)] px-3 text-xs font-semibold text-slate-100">
            Exercises
          </span>
        </div>
      </div>

      <Input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search exercises"
        aria-label="Search exercises"
      />

      <ul className={`${listShellClasses.viewport} ${listShellClasses.list}`}>
        {filteredRows.map((row) => {
          const iconSrc = getExerciseIconSrc({
            name: row.name,
            slug: row.slug,
            image_path: row.image_path,
            image_icon_path: row.image_icon_path,
          });
          const lastSummary = formatSetSummary(row.last_weight, row.last_reps, row.last_unit);
          const lastDate = formatShortDate(row.last_performed_at);
          const prSummary = row.pr_est_1rm && row.pr_est_1rm > 0
            ? `${Math.round(row.pr_est_1rm)} e1RM`
            : formatSetSummary(row.pr_weight, row.pr_reps, row.last_unit);

          return (
            <li key={row.id} className={`${listShellClasses.card} p-0`}>
              <Link
                href={`/exercises/${row.id}?returnTo=${encodeURIComponent("/history/exercises")}`}
                className="flex min-h-11 items-center gap-3 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-ring)]"
              >
                <ExerciseAssetImage src={iconSrc} alt={row.name} className="h-9 w-9 shrink-0 rounded-md border border-border/40 bg-surface-2-soft object-cover" />

                <div className="min-w-0 flex-1">
                  <p
                    className="overflow-hidden text-sm font-medium text-slate-100"
                    style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
                  >
                    {row.name}
                  </p>
                </div>

                <div className="min-w-0 shrink-0 text-right text-xs">
                  {lastSummary || prSummary ? (
                    <>
                      <p className="font-semibold text-slate-100">
                        Last: {lastSummary ?? "—"}
                        {lastDate ? <span className="ml-1 font-normal text-slate-400">{lastDate}</span> : null}
                      </p>
                      <p className="text-slate-300">{prSummary ? `PR: ${prSummary}` : "PR: —"}</p>
                    </>
                  ) : (
                    <p className="text-slate-400">No history yet</p>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
