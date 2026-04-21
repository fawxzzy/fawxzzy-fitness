"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { DetailHeader, DetailMetaChip, DetailMetaRow, DetailSection } from "@/components/DetailSurface";
import { ExerciseAssetImage } from "@/components/ExerciseAssetImage";
import { ContentRail } from "@/components/layout/ContentRail";
import { appTokens } from "@/components/ui/app/tokens";
import { MetricGrid, MetricStrip, type MetricDatum } from "@/components/ui/MetricItem";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { EyebrowText } from "@/components/ui/text-roles";
import { Glass } from "@/components/ui/Glass";
import { cn } from "@/lib/cn";
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
  presentationKind?: "strength" | "bodyweight" | "cardio" | "timed";
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
  performanceMetrics?: MetricDatum[];
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

function describeOverview(stats: ExerciseInfoSheetStats | null) {
  switch (stats?.presentationKind ?? stats?.kind) {
    case "bodyweight":
      return "Rep PRs, recent totals, and repeatable bodyweight work.";
    case "timed":
      return "Best holds, recent work time, and repeatability.";
    case "cardio":
      return "Pace, distance, duration, and recent effort.";
    default:
      return "Top sets, estimated max, volume, and recent progression.";
  }
}

function ExerciseInfoLoadingMetrics() {
  return (
    <div className="space-y-2 pt-0.5" aria-live="polite" aria-busy="true" aria-label="Loading stats">
      <div className="grid grid-cols-2 gap-2">
        <div className="h-20 animate-pulse rounded-[1rem] bg-surface-2-soft" />
        <div className="h-20 animate-pulse rounded-[1rem] bg-surface-2-soft" />
        <div className="h-20 animate-pulse rounded-[1rem] bg-surface-2-soft" />
        <div className="h-20 animate-pulse rounded-[1rem] bg-surface-2-soft" />
      </div>
    </div>
  );
}

function ExerciseInfoLoadingRows() {
  return (
    <div className="space-y-2" aria-hidden="true">
      <div className="h-14 animate-pulse rounded-[1rem] bg-surface-2-soft" />
      <div className="h-14 animate-pulse rounded-[1rem] bg-surface-2-soft" />
      <div className="h-14 animate-pulse rounded-[1rem] bg-surface-2-soft" />
    </div>
  );
}

function ExerciseInfoOverviewMedia({
  exercise,
  howToImageSrc,
}: {
  exercise: ExerciseInfoSheetExercise;
  howToImageSrc: string;
}) {
  return (
    <div className={appTokens.detailMediaCard}>
      {exercise.how_to_short ? (
        <p className={cn(appTokens.detailBodyText, "[text-wrap:pretty] text-[rgb(var(--text)/0.94)]")}>
          {exercise.how_to_short}
        </p>
      ) : (
        <p className={appTokens.detailBodyMutedText}>
          Log a few sessions to unlock more specific cues and trends for this exercise.
        </p>
      )}
      <div className={appTokens.detailMediaFrame}>
        <ExerciseAssetImage
          src={howToImageSrc}
          alt={`${exercise.name} demonstration`}
          className="h-full w-full"
          imageClassName="object-contain object-center"
          sizes="(max-width: 768px) 100vw, 520px"
          priority
        />
      </div>
    </div>
  );
}

function ExerciseInfoRecentHistoryList({ stats }: { stats: ExerciseInfoSheetStats }) {
  if (stats.progress.performances.length === 0) {
    return <p className={appTokens.detailBodyMutedText}>No recent performances logged yet.</p>;
  }

  return (
    <div className="space-y-2">
      {stats.progress.performances.map((entry) => (
        <div
          key={`${entry.label}-${entry.value}`}
          className={appTokens.detailHistoryRow}
        >
          <div className="flex min-w-0 flex-wrap items-start gap-2">
            <EyebrowText as="p" className="min-w-0 flex-1 text-[rgb(var(--text-muted)/0.88)]">
              {entry.label}
            </EyebrowText>
            {entry.context ? (
              <p className="min-w-0 max-w-full text-[11px] leading-[1.35] text-[rgb(var(--text-secondary)/0.72)] [text-wrap:pretty]">
                {entry.context}
              </p>
            ) : null}
          </div>
          <p className={cn(appTokens.detailBodyText, "mt-1 min-w-0 text-[rgb(var(--text-primary)/0.95)] [text-wrap:pretty]")}>
            {entry.value}
          </p>
        </div>
      ))}
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
  const performanceMetrics = stats?.performanceMetrics ?? [];
  const progressMetrics = stats?.progress.metrics ?? [];
  const historyCount = stats?.progress.performances.length ?? 0;

  const sheetBody = (
    <main className="app-page-scroll min-h-[100dvh]">
      <ContentRail className="flex min-h-[100dvh] flex-col gap-3 pt-[calc(max(var(--app-safe-top),var(--vv-top,0px))+0.75rem)]">
        {detailHeader}

        <Glass variant="base" className="overflow-hidden rounded-[34px]">
          <div className="px-4 pb-6 pt-4">
            <div className="space-y-3">
              <DetailSection title="Overview" description={describeOverview(stats)}>
                <div
                  id={statsPanelId}
                  data-testid="exercise-info-stats-box"
                  className="min-h-[140px] space-y-3 text-xs text-muted"
                >
                  {statsLoading ? <ExerciseInfoLoadingMetrics /> : null}
                  {!statsLoading && stats ? <MetricGrid items={stats.quickMetrics} className="gap-2.5" /> : null}
                  {!statsLoading && !stats ? (
                    <p className={appTokens.detailBodyMutedText}>
                      No stats yet. Log a set to generate performance history for this exercise.
                    </p>
                  ) : null}
                  <ExerciseInfoOverviewMedia exercise={exercise} howToImageSrc={howToImageSrc} />
                </div>
              </DetailSection>

              {statsLoading || stats ? (
                <DetailSection
                  title="Performance"
                  description="Key metrics for this exercise type."
                >
                  {statsLoading ? (
                    <ExerciseInfoLoadingMetrics />
                  ) : performanceMetrics.length > 0 ? (
                    <MetricGrid items={performanceMetrics} className="gap-2.5" compact />
                  ) : (
                    <p className={appTokens.detailBodyMutedText}>
                      No performance metrics available yet.
                    </p>
                  )}
                </DetailSection>
              ) : null}

              {statsLoading || stats ? (
                <DetailSection
                  title="Progress"
                  description="Recent comparisons and training frequency."
                >
                  {statsLoading ? (
                    <ExerciseInfoLoadingMetrics />
                  ) : progressMetrics.length > 0 ? (
                    <MetricStrip items={progressMetrics} />
                  ) : (
                    <p className={appTokens.detailBodyMutedText}>
                      No progress comparisons available yet.
                    </p>
                  )}
                </DetailSection>
              ) : null}

              {statsLoading || stats ? (
                <DetailSection
                  title="Recent History"
                  description={historyCount > 0 ? `Last ${Math.min(historyCount, 3)} logged performances.` : "Most recent logged performances."}
                >
                  {statsLoading ? <ExerciseInfoLoadingRows /> : stats ? <ExerciseInfoRecentHistoryList stats={stats} /> : null}
                </DetailSection>
              ) : null}
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
