"use client";

import { useCallback, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ExerciseAssetImage } from "@/components/ExerciseAssetImage";
import { BackButton } from "@/components/ui/BackButton";
import { getExerciseHowToImageSrc } from "@/lib/exerciseImages";
import { formatCount, formatDateShort, formatWeight } from "@/lib/formatting";
import { formatCalories, formatDistance, formatDurationShort, formatPace } from "@/lib/exercise-stats-formatting";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

export type ExerciseInfoSheetExercise = {
  id: string;
  exercise_id?: string | null;
  name: string;
  primary_muscle: string | null;
  equipment: string | null;
  movement_pattern: string | null;
  image_howto_path?: string | null;
  how_to_short?: string | null;
  image_icon_path?: string | null;
  slug?: string | null;
};

export type ExerciseInfoSheetStats = {
  exercise_id?: string;
  kind: "strength" | "cardio";
  recent: {
    lastPerformedAt: string | null;
    lastSummary: string | null;
    lastDurationSeconds?: number;
    lastDistance?: number;
    lastCalories?: number;
    lastPaceSecondsPerUnit?: number;
    lastDistanceUnit?: string | null;
  };
  totals: {
    sessions: number;
    sets: number;
    reps?: number;
    durationSeconds?: number;
    distance?: number;
    calories?: number;
  };
  bests: {
    bestBodyweightReps?: number;
    bestWeight?: number;
    bestRepsAtBestWeight?: number;
    bestSetSummary?: string;
    bestDurationSeconds?: number;
    bestDistance?: number;
    bestPace?: number;
    bestDistanceUnit?: string | null;
    bestCalories?: number;
  };
  prLabel: string;
};

const tagClassName = "rounded-full border border-border/50 bg-surface-2-soft px-2 py-0.5 text-[11px] uppercase tracking-[0.18em] text-muted";
const sectionTitleClassName = "text-xs font-semibold uppercase tracking-wide text-muted";

function MetaTag({ value }: { value: string | null }) {
  if (!value) return null;
  return <span className={tagClassName}>{value}</span>;
}


function StatSection({ title, rows }: { title: string; rows: Array<{ label: string; value: string | null }> }) {
  const visibleRows = rows.filter((row): row is { label: string; value: string } => Boolean(row.value));
  if (!visibleRows.length) return null;

  return (
    <div className="space-y-2">
      <p className={sectionTitleClassName}>{title}</p>
      <div className="grid gap-2 text-left sm:grid-cols-2">
        {visibleRows.map((row) => (
          <StatLine key={`${title}-${row.label}`} label={row.label} value={row.value} />
        ))}
      </div>
    </div>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/45 bg-[rgb(var(--bg)/0.34)] px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-1 break-words text-sm leading-5 text-[rgb(var(--text)/0.95)]">{value}</p>
    </div>
  );
}

export function ExerciseInfoSheet({
  exercise,
  stats,
  statsLoading,
  open,
  onOpenChange,
  onClose,
}: {
  exercise: ExerciseInfoSheetExercise | null;
  stats: ExerciseInfoSheetStats | null;
  statsLoading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose?: () => void;
}) {
  const router = useRouter();
  const statsPanelId = useId();
  useBodyScrollLock(open);

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
      return;
    }

    onOpenChange(false);
  }, [onClose, onOpenChange]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [handleClose, open]);

  const resolvedHowToSrc = exercise ? getExerciseHowToImageSrc(exercise) : "/exercises/icons/_placeholder.svg";
  const canonicalExerciseId = exercise ? (exercise.exercise_id ?? exercise.id) : null;

  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !open || !exercise) return;

    const statsNode = document.getElementById(statsPanelId);
    if (!statsNode) {
      console.error("[ExerciseInfoSheet] invariant violated: stats panel is missing from DOM", {
        exerciseId: canonicalExerciseId,
      });
    }
  }, [canonicalExerciseId, exercise, open, statsPanelId]);

  if (!open || !exercise) return null;

  const recentRows = stats ? [
    { label: "Last performed", value: stats.recent.lastPerformedAt ? formatDateShort(stats.recent.lastPerformedAt) : null },
    { label: stats.kind === "cardio" ? "Last effort" : "Last", value: stats.recent.lastSummary ?? null },
    ...(stats.kind === "strength" ? [{ label: "PRs", value: stats.prLabel || null }] : []),
  ] : [];

  const totalsRows = stats ? [
    { label: "Sessions", value: stats.totals.sessions > 0 ? formatCount(stats.totals.sessions, "session") : null },
    { label: "Sets", value: stats.totals.sets > 0 ? formatCount(stats.totals.sets, "set") : null },
    ...(stats.kind === "strength"
      ? [{ label: "Reps", value: stats.totals.reps ? formatCount(stats.totals.reps, "rep") : null }]
      : [
        { label: "Duration", value: formatDurationShort(stats.totals.durationSeconds) },
        { label: "Distance", value: formatDistance(stats.totals.distance, stats.bests.bestDistanceUnit) },
        { label: "Calories", value: formatCalories(stats.totals.calories) },
      ]),
  ] : [];

  const bestWeightLabel = stats?.bests.bestWeight ? formatWeight(stats.bests.bestWeight, null) : null;
  const bestRows = stats ? (stats.kind === "cardio"
    ? [
      { label: "Best effort", value: stats.bests.bestSetSummary ?? null },
      { label: "Best duration", value: formatDurationShort(stats.bests.bestDurationSeconds) },
      { label: "Best distance", value: formatDistance(stats.bests.bestDistance, stats.bests.bestDistanceUnit) },
      { label: "Best pace", value: formatPace(stats.bests.bestPace, stats.bests.bestDistanceUnit) },
      { label: "Best calories", value: formatCalories(stats.bests.bestCalories) },
    ]
    : [
      { label: "Best bodyweight reps", value: stats.bests.bestBodyweightReps ? formatCount(stats.bests.bestBodyweightReps, "rep") : null },
      { label: "Best weight", value: bestWeightLabel },
      { label: "Best reps at best weight", value: stats.bests.bestRepsAtBestWeight ? formatCount(stats.bests.bestRepsAtBestWeight, "rep") : null },
      { label: "Best set", value: stats.bests.bestSetSummary ?? null },
      { label: "PRs", value: stats.prLabel || null },
    ]) : [];

  return createPortal(
    <div
      className="fixed inset-0 z-50 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Exercise info"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className="absolute inset-0 h-[100dvh] w-full bg-[rgb(var(--bg))]">
        <section className="flex h-full w-full flex-col">
          <div className="sticky top-0 z-10 border-b border-border bg-[rgb(var(--bg))] pt-[max(var(--app-safe-top),0px)]">
            <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-2 px-4 py-2.5">
              <h2 className="text-xl font-semibold tracking-tight">Exercise info</h2>
              <BackButton
                onClick={(event) => {
                  event.preventDefault();
                  if (onClose) {
                    onClose();
                    return;
                  }

                  router.back();
                }}
                label="Back"
                ariaLabel="Back"
                iconOnly
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="mx-auto w-full max-w-xl space-y-4 px-4 pb-[calc(var(--app-safe-bottom)+1rem)] pt-4">
              <div className="space-y-2">
                <div>
                  <p className="text-xl font-semibold leading-tight text-text">{exercise.name}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <MetaTag value={exercise.equipment} />
                  <MetaTag value={exercise.primary_muscle} />
                  <MetaTag value={exercise.movement_pattern} />
                </div>
              </div>

              {exercise.how_to_short ? (
                <div className="rounded-xl border border-border/60 bg-[rgb(var(--bg)/0.38)] px-3 py-3">
                  <p className="text-sm text-text">{exercise.how_to_short}</p>
                </div>
              ) : null}

              <div
                id={statsPanelId}
                data-testid="exercise-info-stats-box"
                className="min-h-[94px] space-y-3 rounded-xl border border-border/60 bg-[rgb(var(--bg)/0.28)] px-3.5 py-3 text-xs text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
              >
                <p className={sectionTitleClassName}>Stats</p>
                {statsLoading ? (
                  <div className="space-y-1.5 pt-0.5" aria-live="polite" aria-busy="true" aria-label="Loading stats">
                    <div className="h-3 w-4/5 animate-pulse rounded bg-surface-2-soft" />
                    <div className="h-3 w-3/5 animate-pulse rounded bg-surface-2-soft" />
                    <div className="h-3 w-2/3 animate-pulse rounded bg-surface-2-soft" />
                  </div>
                ) : stats ? (
                  <>
                    <StatSection title="Recent" rows={recentRows} />
                    <StatSection title="Totals" rows={totalsRows} />
                    <StatSection title="Bests" rows={bestRows} />
                  </>
                ) : (
                  <p className="text-muted">No stats yet — log a set to generate stats.</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-md border border-border/60 bg-[rgb(var(--bg)/0.28)] p-3">
                  <ExerciseAssetImage
                    key={exercise.id ?? exercise.slug ?? resolvedHowToSrc}
                    src={resolvedHowToSrc}
                    alt="How-to visual"
                    className="h-full w-full"
                    imageClassName="object-contain object-center"
                    sizes="(max-width: 768px) 100vw, 480px"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>,
    document.body,
  );
}
