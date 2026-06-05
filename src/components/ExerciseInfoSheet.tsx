"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { DetailHeader } from "@/components/DetailSurface";
import { ExerciseAssetImage } from "@/components/ExerciseAssetImage";
import { ContentRail } from "@/components/layout/ContentRail";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { AccentDotSeparatedText, SignatureDot } from "@/components/ui/app/SignatureSeparator";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { appTokens } from "@/components/ui/app/tokens";
import { MetricAccentBar, type MetricDatum } from "@/components/ui/MetricItem";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { EyebrowText } from "@/components/ui/text-roles";
import { StretchLibraryPanel } from "@/components/stretch/StretchLibraryPanel";
import { Glass } from "@/components/ui/Glass";
import { cn } from "@/lib/cn";
import { getExerciseHowToImageSrc } from "@/lib/exerciseImages";
import type { ExerciseInfoReviewSection } from "@/lib/exercise-info-presentation";
import { getRecoveryExerciseFallbackDescription } from "@/lib/exercise-metadata";
import { STRETCH_HUB_GUIDE_COPY, STRETCH_HUB_HERO_SRC, isStretchHubExercise } from "@/lib/stretch-library";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

function toTitleCase(value: string) {
  return value.replace(/\b([a-z])/g, (match) => match.toUpperCase());
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
  surfaceMetrics?: MetricDatum[];
  progress: {
    metrics: MetricDatum[];
    reviewSections?: ExerciseInfoReviewSection[];
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
    <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 pt-[5px] text-center text-[11px] font-medium leading-[1.15] text-[rgb(var(--text-secondary)/0.84)]">
      {items.map((item, index) => (
        <div key={`${item}-${index}`} className="flex min-w-0 max-w-full items-center gap-2">
          {index > 0 ? <SignatureDot /> : null}
          <p className="min-w-0 [text-wrap:balance]">{item}</p>
        </div>
      ))}
    </div>
  );
}

function getAutoMetricSpanClassName(totalItems: number, index: number) {
  if (totalItems <= 1) return "col-span-6";
  if (totalItems === 2) return "col-span-3";
  if (totalItems === 3) return "col-span-2";

  const remainder = totalItems % 3;
  const tailStart = totalItems - remainder;

  if (remainder === 1 && index === totalItems - 1) {
    return "col-span-2 col-start-3";
  }

  if (remainder === 2 && index >= tailStart) {
    return "col-span-3";
  }

  return "col-span-2";
}

function resolveMetricValueToneClassName(tone: MetricDatum["valueTone"]) {
  switch (tone) {
    case "success":
      return "text-[rgb(var(--success-rgb)/0.94)]";
    case "danger":
      return "text-[rgb(255,116,116)]";
    case "muted":
      return "text-[rgb(var(--text-secondary)/0.82)]";
    default:
      return "text-[rgb(var(--text-primary)/0.96)]";
  }
}

function renderMetricValuePrefix(valuePrefix: string | null | undefined) {
  if (!valuePrefix) {
    return null;
  }

  if (valuePrefix === "\u2191" || valuePrefix === "â†‘") {
    return <span aria-hidden="true" className="inline-block h-0 w-0 border-x-[5px] border-x-transparent border-b-[7px] border-b-current translate-y-[-1px]" />;
  }

  if (valuePrefix === "\u2193" || valuePrefix === "â†“") {
    return <span aria-hidden="true" className="inline-block h-0 w-0 border-x-[5px] border-x-transparent border-t-[7px] border-t-current translate-y-[1px]" />;
  }

  if (valuePrefix === "\u2192" || valuePrefix === "â†’") {
    return <span aria-hidden="true" className="inline-block h-[2px] w-[10px] rounded-full bg-[rgb(var(--accent-yellow-on))]" />;
  }

  return <span aria-hidden="true">{valuePrefix}</span>;
}

function renderMetricMetaLine(parts: string[]) {
  if (parts.length === 0) {
    return null;
  }

  return (
    <div className={cn(appTokens.workoutMetricMeta, "mt-0 justify-center px-px leading-[1.02] flex flex-wrap items-center gap-x-2 gap-y-1")}>
      {parts.map((part, index) => (
        <div key={`${part}-${index}`} className="flex min-w-0 items-center gap-2">
          {index > 0 ? <SignatureDot /> : null}
          <p className="min-w-0">{part}</p>
        </div>
      ))}
    </div>
  );
}

function ExerciseInfoDetailedMetricGrid({ items }: { items: MetricDatum[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-6 gap-1">
      {items.map((item, index) => {
        const metaParts = [item.delta, item.timeframe, item.trend].filter((part): part is string => Boolean(part));

        return (
          <div
            key={`${item.label}-${item.value}-${index}`}
            className={cn(
              getAutoMetricSpanClassName(items.length, index),
              appTokens.workoutMetricChrome,
              appTokens.workoutMetricCompact,
              "flex min-h-[2.8rem] flex-col items-center justify-start overflow-hidden border-transparent bg-[linear-gradient(90deg,rgb(var(--metric-accent-rgb)/0.14),rgb(var(--metric-accent-rgb)/0.85),rgb(var(--metric-accent-rgb)/0.14))] bg-[length:100%_1px] bg-no-repeat [background-position:0_100%] px-2.75 py-1 shadow-none ring-0 backdrop-blur-0",
            )}
          >
            <p className={cn(appTokens.workoutMetricLabel, "block w-full px-px pt-px text-center leading-[1.02] text-[rgb(var(--accent)/0.92)]")}>
              {item.label}
            </p>
            <div className="mt-[2px] flex w-full min-h-0 justify-center self-start pb-[0.7rem]">
              <div className="flex w-fit min-w-0 max-w-full flex-col items-center justify-start text-center">
                <p className={cn(appTokens.workoutMetricValue, appTokens.workoutMetricValueCompact, "mt-0 block px-px leading-[0.98]")}>
                  <span className={cn("inline-flex flex-wrap items-center gap-1.5", resolveMetricValueToneClassName(item.valueTone))}>
                    {renderMetricValuePrefix(item.valuePrefix)}
                    <span>{item.value}</span>
                  </span>
                </p>
                {renderMetricMetaLine(metaParts)}
              </div>
            </div>
          </div>
        );
      })}
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
      <MetricAccentBar variant="thin" className="mx-3 mt-1.5" />
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
                  <SignatureDot />
                  <span>{entry.context}</span>
                </>
              ) : null}
            </span>
          </EyebrowText>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <AccentDotSeparatedText
              text={entry.value}
              className={cn(appTokens.detailBodyText, "inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-[1.35] text-[rgb(var(--text-primary)/0.95)]")}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ExerciseInfoProgressReview({
  sections,
}: {
  sections: ExerciseInfoReviewSection[];
}) {
  if (sections.length === 0) {
    return null;
  }

  const lastSection = sections.find((section) => section.title === "Last") ?? sections[0] ?? null;
  const bestSection = sections.find((section) => section.title === "Best") ?? sections[1] ?? null;
  const progressSection = sections.find((section) => section.title === "Progress") ?? sections[2] ?? null;
  const stackedSections = [lastSection, bestSection].filter((section): section is ExerciseInfoReviewSection => Boolean(section));
  const displayTitle = (title: string) => (title === "Progress" ? "Trend" : title);

  const renderSection = (section: ExerciseInfoReviewSection, options?: { compactTitle?: boolean }) => (
    <div
      key={section.title}
      className={cn(
        appTokens.detailHistoryRow,
        "flex flex-col gap-1.5 px-2 py-2",
      )}
    >
      <h4
        className={cn(
          appTokens.detailSectionTitle,
          options?.compactTitle ? "px-0.5 text-left text-[0.68rem] tracking-[0.15em]" : "px-0.5 text-left text-[0.72rem] tracking-[0.16em]",
        )}
      >
        {displayTitle(section.title)}
      </h4>
      <div className="space-y-2 px-0.5">
        {section.items.map((item, index) => (
          <div key={`${section.title}-${index}-${item}`} className="flex min-w-0 items-start gap-2.5">
            <div className="flex h-[1.05rem] shrink-0 items-center">
              <SignatureDot />
            </div>
            <div className={cn(appTokens.detailBodyText, "min-w-0 flex-1 text-[12.5px] leading-[1.24] text-[rgb(var(--text-primary)/0.95)] [text-wrap:pretty]")}>
              {section.title === "Last" && item.includes("|") ? (
                <AccentDotSeparatedText text={item} />
              ) : (
                <p>{item}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-12 gap-2">
      <div className="col-span-4 flex flex-col gap-2">
        {stackedSections.map((section) => renderSection(section, { compactTitle: true }))}
      </div>
      {progressSection ? (
        <div className="col-span-8 pl-0.5">
          {renderSection(progressSection)}
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
        className="!border-transparent !bg-[rgba(var(--bg-app),0.48)] !shadow-none backdrop-blur-[14px]"
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
  const surfaceMetrics = stats?.surfaceMetrics ?? [];
  const reviewSections = stats?.progress.reviewSections ?? [];

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
                          <ExerciseInfoDetailedMetricGrid items={surfaceMetrics} />
                        ) : null}
                        {!statsLoading && !stats ? (
                          <p className={appTokens.detailBodyMutedText}>
                            No stats yet. Log a set to generate performance history for this exercise.
                          </p>
                        ) : null}
                      </div>
                    </AppPanel>

                    {statsLoading || reviewSections.length > 0 ? (
                      <AppPanel className={cn(appTokens.detailSection, "space-y-2 p-2")}>
                        <h3 className={cn(appTokens.detailSectionTitle, "px-2 pt-0.5 text-center text-[1.18rem]")}>Progress</h3>
                        {statsLoading ? <ExerciseInfoLoadingRows /> : <ExerciseInfoProgressReview sections={reviewSections} />}
                      </AppPanel>
                    ) : null}

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
