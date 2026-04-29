"use client";

import { Fragment, useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { DetailHeader } from "@/components/DetailSurface";
import { ExerciseAssetImage } from "@/components/ExerciseAssetImage";
import { ContentRail } from "@/components/layout/ContentRail";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { SignatureInlineList, SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { appTokens } from "@/components/ui/app/tokens";
import { MetricGrid, type MetricDatum } from "@/components/ui/MetricItem";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { EyebrowText } from "@/components/ui/text-roles";
import { StretchLibraryPanel } from "@/components/stretch/StretchLibraryPanel";
import { Glass } from "@/components/ui/Glass";
import { cn } from "@/lib/cn";
import { getExerciseHowToImageSrc } from "@/lib/exerciseImages";
import { getRecoveryExerciseFallbackDescription } from "@/lib/exercise-metadata";
import { STRETCH_HUB_GUIDE_COPY, STRETCH_HUB_HERO_SRC, isStretchHubExercise } from "@/lib/stretch-library";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

function toTitleCase(value: string) {
  return value.replace(/\b([a-z])/g, (match) => match.toUpperCase());
}

function mergeExerciseInfoSummaryMetrics(
  quickMetrics: MetricDatum[],
  performanceMetrics: MetricDatum[],
) {
  const redundantPerformanceLabels = new Set(["Top Set", "Last"]);
  const seenSignatures = new Set(
    quickMetrics.map((item) => `${item.label.toLowerCase()}::${item.value.toLowerCase()}`),
  );

  const uniquePerformanceMetrics = performanceMetrics.filter((item) => {
    if (redundantPerformanceLabels.has(item.label)) {
      return false;
    }

    const signature = `${item.label.toLowerCase()}::${item.value.toLowerCase()}`;
    if (seenSignatures.has(signature)) {
      return false;
    }

    seenSignatures.add(signature);
    return true;
  });

  return [...quickMetrics, ...uniquePerformanceMetrics];
}

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
    exercise.equipment ? toTitleCase(exercise.equipment) : null,
    exercise.primary_muscle ? toTitleCase(exercise.primary_muscle) : null,
    exercise.movement_pattern ? toTitleCase(exercise.movement_pattern) : null,
  ].filter((item): item is string => Boolean(item));
}

function ExerciseInfoHeaderMetaLine({
  items,
}: {
  items: string[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 pt-[5px] text-center text-[11px] font-medium leading-[1.15] text-[rgb(var(--text-secondary)/0.84)]">
      {items.map((item, index) => (
        <div key={`${item}-${index}`} className="flex min-w-0 items-center gap-2">
          {index > 0 ? <span className="h-[4px] w-[4px] rounded-full bg-[rgb(var(--accent)/0.9)]" /> : null}
          <p className="min-w-0 [text-wrap:balance]">{item}</p>
        </div>
      ))}
    </div>
  );
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
  const fallbackDescription = getRecoveryExerciseFallbackDescription(exercise);
  const overviewCopy = exercise.how_to_short?.trim() || fallbackDescription;

  return (
    <div className={cn(appTokens.detailMediaCard, "gap-0 overflow-hidden border-transparent bg-transparent p-0 shadow-none")}>
      <div className={cn(appTokens.detailMediaFrame, "border-transparent bg-transparent shadow-none")}>
        <ExerciseAssetImage
          src={howToImageSrc}
          alt={`${exercise.name} demonstration`}
          className="h-full w-full"
          preferNaturalAspectRatio
          containerStyle={{ minHeight: "11.4rem", maxHeight: "16.25rem" }}
          imageClassName="object-contain object-center"
          imageStyle={{ padding: "clamp(0.12rem, 0.7vw, 0.26rem)" }}
          sizes="(max-width: 768px) 100vw, 520px"
          priority
        />
      </div>
      <div className="mx-3 mt-1.5 h-px bg-[linear-gradient(90deg,rgba(71,215,196,0),rgba(71,215,196,0.9),rgba(71,215,196,0))]" />
      {overviewCopy ? (
        <p className={cn(appTokens.detailBodyText, "px-3 pb-2 pt-1.5 text-center text-[13px] leading-[1.55] [text-wrap:pretty] text-[rgb(var(--text)/0.94)]")}>
          {overviewCopy}
        </p>
      ) : (
        <p className={cn(appTokens.detailBodyMutedText, "px-3 pb-2 pt-1.5 text-center text-[13px] leading-[1.5]")}>
          Log a few sessions to unlock more specific cues and trends for this exercise.
        </p>
      )}
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
          className={cn(appTokens.detailHistoryRow, "px-2.5 py-2")}
        >
          <EyebrowText as="p" className="min-w-0 px-px pt-px text-[10px] text-[rgb(var(--text-muted)/0.88)]">
            <span className="inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span>{entry.label}</span>
              {entry.context ? (
                <>
                  <span className="h-[4px] w-[4px] rounded-full bg-[rgb(var(--accent)/0.9)]" />
                  <span>{entry.context}</span>
                </>
              ) : null}
            </span>
          </EyebrowText>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <SignatureInlineList
              items={entry.value.split(" | ")}
              separator="pipe"
              itemClassName={cn(appTokens.detailBodyText, "whitespace-nowrap text-[13px] leading-[1.35] text-[rgb(var(--text-primary)/0.95)]")}
            />
          </div>
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
  sourceContext,
}: {
  exercise: ExerciseInfoSheetExercise | null;
  stats: ExerciseInfoSheetStats | null;
  statsLoading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose?: () => void;
  inline?: boolean;
  sourceContext?: string;
}) {
  const router = useRouter();
  const statsPanelId = useId();
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useBodyScrollLock(open && !inline);

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
  const isStretchHub = isStretchHubExercise(exercise);
  const stretchPanelContext = sourceContext === "SessionExerciseFocus" ? "session" : "detail";
  const metadata = exercise && !isStretchHub ? buildExerciseInfoMeta(exercise) : [];
  const howToImageSrc = exercise ? getExerciseHowToImageSrc(exercise) : "/exercises/icons/_placeholder.svg";
  const stretchHeroImageSrc = howToImageSrc.includes("/placeholders/") ? STRETCH_HUB_HERO_SRC : howToImageSrc;
  const detailHeader = (
    <div className="sticky top-[calc(max(var(--app-safe-top),var(--vv-top,0px))+0.25rem)] z-30">
      <DetailHeader
        title={exercise?.name ?? "Exercise"}
        titleClassName="pl-[4px] pt-[5px] pr-3 text-[1.02rem] leading-[1.12]"
        align="center"
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
          <ExerciseInfoHeaderMetaLine items={metadata} />
        ) : undefined}
      />
    </div>
  );

  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !open || !exercise || isStretchHub) return;

    const statsNode = document.getElementById(statsPanelId);
    if (!statsNode) {
      console.error("[ExerciseInfoSheet] invariant violated: stats panel is missing from DOM", {
        exerciseId: canonicalExerciseId,
      });
    }
  }, [canonicalExerciseId, exercise, isStretchHub, open, statsPanelId]);

  if (!open || !exercise || (!inline && !portalTarget)) return null;
  const resolvedPortalTarget = portalTarget;
  const performanceMetrics = stats?.performanceMetrics ?? [];
  const progressMetrics = stats?.progress.metrics ?? [];
  const summaryMetrics = stats ? mergeExerciseInfoSummaryMetrics(stats.quickMetrics, performanceMetrics) : [];
  const combinedMetrics = [...summaryMetrics, ...progressMetrics];

  const sheetBody = (
    <div className="relative isolate min-h-[100dvh] bg-[rgb(var(--bg))]">
      <AmbientBackground />
      <main className="app-page-scroll relative z-10 min-h-[100dvh]">
        <ContentRail className="flex min-h-[100dvh] flex-col gap-2 pt-[calc(max(var(--app-safe-top),var(--vv-top,0px))+0.7rem)]">
          {detailHeader}

          <Glass variant="base" className="overflow-hidden rounded-[34px]">
            <div className="px-3 pb-4 pt-2.5">
              <div className="space-y-2">
                {isStretchHub ? (
                  <StretchLibraryPanel
                    context={stretchPanelContext}
                    heroCopy={STRETCH_HUB_GUIDE_COPY}
                    heroImageSrc={stretchHeroImageSrc}
                  />
                ) : (
                  <>
                    <AppPanel className={cn(appTokens.detailSection, "border-0 bg-transparent p-0 shadow-none")}>
                      <ExerciseInfoOverviewMedia exercise={exercise} howToImageSrc={howToImageSrc} />
                    </AppPanel>

                    <AppPanel className={cn(appTokens.detailSection, "p-2.5")}>
                      <div
                        id={statsPanelId}
                        data-testid="exercise-info-stats-box"
                        className="space-y-2 text-xs text-muted"
                      >
                        {statsLoading ? <ExerciseInfoLoadingMetrics /> : null}
                        {!statsLoading && stats ? (
                          <MetricGrid
                            items={combinedMetrics}
                            className="gap-1"
                            compact
                            autoColumns
                            labelPlacement="top"
                            labelClassName="text-[rgb(var(--accent)/0.92)]"
                          />
                        ) : null}
                        {!statsLoading && !stats ? (
                          <p className={appTokens.detailBodyMutedText}>
                            No stats yet. Log a set to generate performance history for this exercise.
                          </p>
                        ) : null}
                      </div>
                    </AppPanel>

                    {statsLoading || stats ? (
                      <AppPanel className={cn(appTokens.detailSection, "space-y-2 p-2")}>
                        <h3 className={cn(appTokens.detailSectionTitle, "px-2 pt-0.5 text-center text-[1.18rem]")}>Recent History</h3>
                        {statsLoading ? <ExerciseInfoLoadingRows /> : stats ? <ExerciseInfoRecentHistoryList stats={stats} /> : null}
                      </AppPanel>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </Glass>
        </ContentRail>
      </main>
    </div>
  );

  if (inline) {
    return sheetBody;
  }

  if (!resolvedPortalTarget) {
    return null;
  }

  return createPortal(
    <div
      className="pointer-events-auto fixed inset-0 z-50 overflow-y-auto overscroll-none bg-[rgb(var(--bg))]"
      role="dialog"
      aria-modal="true"
      aria-label="Exercise info"
    >
      {sheetBody}
    </div>,
    resolvedPortalTarget,
  );
}
