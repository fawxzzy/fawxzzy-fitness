"use client";

import { useCallback, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ExerciseAssetImage } from "@/components/ExerciseAssetImage";
import { DetailHeader, DetailMetaChip, DetailMetaRow, DetailSection } from "@/components/DetailSurface";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
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

type ExerciseInfoStatRow = {
  label: string;
  value: string | null;
};

function buildExerciseInfoMeta(exercise: ExerciseInfoSheetExercise) {
  return [
    exercise.equipment ? { label: "Equipment", value: exercise.equipment } : null,
    exercise.primary_muscle ? { label: "Primary", value: exercise.primary_muscle } : null,
    exercise.movement_pattern ? { label: "Pattern", value: exercise.movement_pattern } : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));
}

function buildExerciseInfoStatSections(stats: ExerciseInfoSheetStats | null) {
  if (!stats) return [] as Array<{ title: string; rows: ExerciseInfoStatRow[] }>;

  const bestWeightLabel = stats.bests.bestWeight ? formatWeight(stats.bests.bestWeight, null) : null;

  return [
    {
      title: "Recent",
      rows: [
        { label: "Last performed", value: stats.recent.lastPerformedAt ? formatDateShort(stats.recent.lastPerformedAt) : null },
        { label: stats.kind === "cardio" ? "Last effort" : "Last", value: stats.recent.lastSummary ?? null },
        ...(stats.kind === "strength" ? [{ label: "PRs", value: stats.prLabel || null }] : []),
      ],
    },
    {
      title: "Totals",
      rows: [
        { label: "Sessions", value: stats.totals.sessions > 0 ? formatCount(stats.totals.sessions, "session") : null },
        { label: "Sets", value: stats.totals.sets > 0 ? formatCount(stats.totals.sets, "set") : null },
        ...(stats.kind === "strength"
          ? [{ label: "Reps", value: stats.totals.reps ? formatCount(stats.totals.reps, "rep") : null }]
          : [
            { label: "Duration", value: formatDurationShort(stats.totals.durationSeconds) },
            { label: "Distance", value: formatDistance(stats.totals.distance, stats.bests.bestDistanceUnit) },
            { label: "Calories", value: formatCalories(stats.totals.calories) },
          ]),
      ],
    },
    {
      title: "Bests",
      rows: stats.kind === "cardio"
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
        ],
    },
  ];
}

function ExerciseInfoStatGrid({ title, rows }: { title: string; rows: ExerciseInfoStatRow[] }) {
  const visibleRows = rows.filter((row): row is { label: string; value: string } => Boolean(row.value));
  if (!visibleRows.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text)/0.56)]">{title}</p>
      <div className="grid gap-2 text-left sm:grid-cols-2">
        {visibleRows.map((row) => (
          <div key={`${title}-${row.label}`} className="rounded-[1rem] border border-white/8 bg-black/10 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text)/0.56)]">{row.label}</p>
            <p className="mt-1 break-words text-sm leading-5 text-[rgb(var(--text)/0.95)]">{row.value}</p>
          </div>
        ))}
      </div>
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
  const metadata = exercise ? buildExerciseInfoMeta(exercise) : [];
  const statSections = buildExerciseInfoStatSections(stats);

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
            <div className="mx-auto flex w-full max-w-xl justify-end px-4 py-2.5">
              <TopRightBackButton
                onClick={(event) => {
                  event.preventDefault();
                  if (onClose) {
                    onClose();
                    return;
                  }

                  router.back();
                }}
                ariaLabel="Back"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="mx-auto w-full max-w-xl space-y-4 px-4 pb-[calc(var(--app-safe-bottom)+1rem)] pt-4">
              <DetailHeader
                eyebrow="Exercise"
                title={exercise.name}
                subtitle={stats ? `${stats.kind === "cardio" ? "Cardio" : "Strength"} details` : "Exercise details"}
                meta={metadata.length > 0 ? (
                  <DetailMetaRow>
                    {metadata.map((item) => (
                      <DetailMetaChip key={`${item.label}-${item.value}`} label={item.label} value={item.value} />
                    ))}
                  </DetailMetaRow>
                ) : undefined}
              >
                {exercise.how_to_short ? <p className="text-sm text-[rgb(var(--text)/0.94)]">{exercise.how_to_short}</p> : null}
              </DetailHeader>

              <DetailSection title="Stats" description="Recent activity, totals, and bests for this exercise.">
                <div
                  id={statsPanelId}
                  data-testid="exercise-info-stats-box"
                  className="min-h-[94px] space-y-3 text-xs text-muted"
                >
                  {statsLoading ? (
                    <div className="space-y-1.5 pt-0.5" aria-live="polite" aria-busy="true" aria-label="Loading stats">
                      <div className="h-3 w-4/5 animate-pulse rounded bg-surface-2-soft" />
                      <div className="h-3 w-3/5 animate-pulse rounded bg-surface-2-soft" />
                      <div className="h-3 w-2/3 animate-pulse rounded bg-surface-2-soft" />
                    </div>
                  ) : stats ? (
                    statSections.map((section) => <ExerciseInfoStatGrid key={section.title} title={section.title} rows={section.rows} />)
                  ) : (
                    <p className="text-muted">No stats yet — log a set to generate stats.</p>
                  )}
                </div>
              </DetailSection>

              <DetailSection title="How to" description="Reference visual for movement setup and execution.">
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
              </DetailSection>
            </div>
          </div>
        </section>
      </div>
    </div>,
    document.body,
  );
}
