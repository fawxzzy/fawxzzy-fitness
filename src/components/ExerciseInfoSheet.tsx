"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { DetailHeader, DetailMetaChip, DetailMetaRow, DetailSection } from "@/components/DetailSurface";
import { ExerciseAssetImage } from "@/components/ExerciseAssetImage";
import { ContentRail } from "@/components/layout/ContentRail";
import { MetricGrid, MetricStrip, type MetricDatum } from "@/components/ui/MetricItem";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { Glass } from "@/components/ui/Glass";
import { getExerciseHowToImageSrc } from "@/lib/exerciseImages";
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
  prCount: number;
  quickMetrics: MetricDatum[];
  progress: {
    metrics: MetricDatum[];
    performances: Array<{
      label: string;
      value: string;
      context?: string | null;
    }>;
  };
};

function buildExerciseInfoMeta(exercise: ExerciseInfoSheetExercise) {
  return [
    exercise.equipment ? { label: "Equipment", value: exercise.equipment } : null,
    exercise.primary_muscle ? { label: "Primary", value: exercise.primary_muscle } : null,
    exercise.movement_pattern ? { label: "Pattern", value: exercise.movement_pattern } : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));
}

function ExerciseInfoProgressCard({ stats }: { stats: ExerciseInfoSheetStats }) {
  const progressItems = stats.progress.metrics;
  const performances = stats.progress.performances;

  if (progressItems.length === 0 && performances.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-[1.15rem] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-2-rgb)/0.54)] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.9)]">Progress</p>
        <p className="text-[11px] text-[rgb(var(--text-secondary)/0.72)]">
          Last {Math.min(performances.length, 3)} {Math.min(performances.length, 3) === 1 ? "performance" : "performances"}
        </p>
      </div>
      {progressItems.length > 0 ? <MetricStrip items={progressItems} /> : null}
      {performances.length > 0 ? (
        <div className="space-y-2">
          {performances.map((entry) => (
            <div
              key={`${entry.label}-${entry.value}`}
              className="rounded-[0.95rem] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-1-rgb)/0.52)] px-3 py-2.5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-muted)/0.88)]">{entry.label}</p>
                {entry.context ? <p className="text-[11px] text-[rgb(var(--text-secondary)/0.72)]">{entry.context}</p> : null}
              </div>
              <p className="mt-1 text-sm leading-[1.4] text-[rgb(var(--text-primary)/0.95)] [text-wrap:pretty]">{entry.value}</p>
            </div>
          ))}
        </div>
      ) : null}
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
  inline = false,
}: {
  exercise: ExerciseInfoSheetExercise | null;
  stats: ExerciseInfoSheetStats | null;
  statsLoading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose?: () => void;
  inline?: boolean;
}) {
  const router = useRouter();
  const statsPanelId = useId();
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useBodyScrollLock(open);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

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

  const canonicalExerciseId = exercise ? (exercise.exercise_id ?? exercise.id) : null;
  const metadata = exercise ? buildExerciseInfoMeta(exercise) : [];
  const howToImageSrc = exercise ? getExerciseHowToImageSrc(exercise) : "/exercises/icons/_placeholder.svg";
  const detailHeader = (
    <DetailHeader
      title={exercise?.name ?? "Exercise"}
      action={(
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
      )}
      meta={metadata.length > 0 ? (
        <DetailMetaRow>
          {metadata.map((item) => (
            <DetailMetaChip key={`${item.label}-${item.value}`} label={item.label} value={item.value} />
          ))}
        </DetailMetaRow>
      ) : undefined}
    />
  );

  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !open || !exercise) return;

    const statsNode = document.getElementById(statsPanelId);
    if (!statsNode) {
      console.error("[ExerciseInfoSheet] invariant violated: stats panel is missing from DOM", {
        exerciseId: canonicalExerciseId,
      });
    }
  }, [canonicalExerciseId, exercise, open, statsPanelId]);

  if (!open || !exercise || (!inline && !portalTarget)) return null;
  const resolvedPortalTarget = portalTarget;

  const sheetBody = (
    <main className="app-page-scroll min-h-[100dvh]">
      <ContentRail className="flex min-h-[100dvh] flex-col gap-3 pt-[calc(max(var(--app-safe-top),var(--vv-top,0px))+0.75rem)]">
        {detailHeader}

        <Glass variant="base" className="overflow-hidden rounded-[34px]">
          <div className="px-4 pb-6 pt-4">
            <div className="space-y-3">
              <DetailSection title="How to">
                {exercise.how_to_short ? <p className="text-sm leading-6 text-[rgb(var(--text)/0.94)]">{exercise.how_to_short}</p> : null}
                <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-[1.15rem] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-2-rgb)/0.48)] p-3">
                  <ExerciseAssetImage
                    src={howToImageSrc}
                    alt={`${exercise.name} demonstration`}
                    className="h-full w-full"
                    imageClassName="object-contain object-center"
                    sizes="(max-width: 768px) 100vw, 520px"
                    priority
                  />
                </div>
              </DetailSection>

              <DetailSection title="Stats">
                <div
                  id={statsPanelId}
                  data-testid="exercise-info-stats-box"
                  className="min-h-[140px] space-y-3 text-xs text-muted"
                >
                  {statsLoading ? (
                    <div className="space-y-2 pt-0.5" aria-live="polite" aria-busy="true" aria-label="Loading stats">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-20 animate-pulse rounded-[1rem] bg-surface-2-soft" />
                        <div className="h-20 animate-pulse rounded-[1rem] bg-surface-2-soft" />
                        <div className="h-20 animate-pulse rounded-[1rem] bg-surface-2-soft" />
                        <div className="h-20 animate-pulse rounded-[1rem] bg-surface-2-soft" />
                      </div>
                      <div className="h-28 animate-pulse rounded-[1.15rem] bg-surface-2-soft" />
                    </div>
                  ) : stats ? (
                    <>
                      <MetricGrid items={stats.quickMetrics} className="gap-2.5" />
                      <ExerciseInfoProgressCard stats={stats} />
                    </>
                  ) : (
                    <p className="text-muted">No stats yet - log a set to generate stats.</p>
                  )}
                </div>
              </DetailSection>
            </div>
          </div>
        </Glass>
      </ContentRail>
    </main>
  );

  if (inline) {
    return sheetBody;
  }

  if (!resolvedPortalTarget) {
    return null;
  }

  return createPortal(
    <div
      className="pointer-events-auto fixed inset-0 z-50 scroll-y bg-[rgb(var(--bg))]"
      role="dialog"
      aria-modal="true"
      aria-label="Exercise info"
    >
      {sheetBody}
    </div>,
    resolvedPortalTarget,
  );
}
