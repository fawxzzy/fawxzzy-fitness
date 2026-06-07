"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { DetailHeader } from "@/components/DetailSurface";
import { ExerciseAssetImage } from "@/components/ExerciseAssetImage";
import { ExerciseSurfaceMetricGrid } from "@/components/exercises/ExerciseSurfaceMetricGrid";
import { ContentRail } from "@/components/layout/ContentRail";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { AccentDotSeparatedText, SignatureDot } from "@/components/ui/app/SignatureSeparator";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { appTokens } from "@/components/ui/app/tokens";
import { DetailSectionBlock, DetailSectionBlocks, DetailSectionItems } from "@/components/ui/DetailSectionList";
import { MetricAccentBar, type MetricDatum } from "@/components/ui/MetricItem";
import { Pill, PillButton } from "@/components/ui/Pill";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { EyebrowText } from "@/components/ui/text-roles";
import { StretchLibraryPanel } from "@/components/stretch/StretchLibraryPanel";
import { Glass } from "@/components/ui/Glass";
import { cn } from "@/lib/cn";
import { formatDateShort } from "@/lib/formatting";
import {
  EXERCISE_INFO_SECTION_SCOPE_KEYS,
  getExerciseInfoAnalyticsScopeDisplayLabel,
  type ExerciseInfoAnalyticsScope,
  type ExerciseInfoSectionScopeKey,
} from "@/lib/exercise-info-scope";
import { getExerciseHowToImageSrc } from "@/lib/exerciseImages";
import type { ExerciseInfoReviewSection } from "@/lib/exercise-info-presentation";
import { getRecoveryExerciseFallbackDescription } from "@/lib/exercise-metadata";
import type { ExerciseProgressionLifelineSummary } from "@/lib/progression-lifeline-summary";
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
  activeRoutineTitle?: string | null;
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
  progress?: {
    metrics?: MetricDatum[];
    reviewSections?: ExerciseInfoReviewSection[];
    performances?: Array<{
      label: string;
      value: string;
      context?: string | null;
    }>;
  };
  progression?: ExerciseProgressionLifelineSummary | null;
};

type ExerciseInfoPerformanceEntry = NonNullable<NonNullable<ExerciseInfoSheetStats["progress"]>["performances"]>[number];

function getExerciseInfoProgressState(stats: ExerciseInfoSheetStats | null | undefined) {
  const progress = stats?.progress;
  const metrics = Array.isArray(progress?.metrics)
    ? progress.metrics.filter((item): item is MetricDatum => Boolean(item && typeof item.label === "string" && typeof item.value === "string"))
    : [];
  const reviewSections = Array.isArray(progress?.reviewSections)
    ? progress.reviewSections
        .filter((section): section is ExerciseInfoReviewSection => Boolean(section && typeof section.title === "string" && Array.isArray(section.items)))
        .map((section) => ({
          ...section,
          items: section.items.filter((item): item is string => typeof item === "string" && item.trim().length > 0),
        }))
        .filter((section) => section.items.length > 0)
    : [];
  const performances = Array.isArray(progress?.performances)
    ? progress.performances.filter((entry): entry is NonNullable<NonNullable<ExerciseInfoSheetStats["progress"]>["performances"]>[number] => (
      Boolean(entry)
      && typeof entry.label === "string"
      && typeof entry.value === "string"
    ))
    : [];

  return {
    metrics,
    reviewSections,
    performances,
  };
}

function normalizeMetricKey(label: string | null | undefined) {
  return String(label ?? "").trim().toLowerCase();
}

function isCompactSingleLineValue(value: string | null | undefined, maxLength: number) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 && normalized.length <= maxLength && !normalized.includes("\n");
}

function shouldPromoteMetricValueToOwnRow(item: MetricDatum) {
  const normalizedValue = item.value.trim();
  const pipeSegments = normalizedValue
    .split("|")
    .map((segment) => segment.trim())
    .filter(Boolean);

  return pipeSegments.length >= 4
    || (pipeSegments.length >= 3 && normalizedValue.length >= 24)
    || pipeSegments.some((segment) => segment.length >= 14);
}

function hasPromotedMetricValue(items: MetricDatum[]) {
  return items.some((item) => shouldPromoteMetricValueToOwnRow(item));
}

function shouldUseCompactProgressionStrip(sections: ExerciseInfoReviewSection[]) {
  return sections.length >= 2 && sections.length <= 3 && sections.every((section) => (
    section.items.length === 1
    && isCompactSingleLineValue(section.title, 18)
    && isCompactSingleLineValue(section.items[0], 28)
  ));
}

function shouldUseCompactRecentHistoryStrip(performances: ExerciseInfoPerformanceEntry[]) {
  return performances.length >= 1 && performances.length <= 6 && performances.every((entry) => (
    isCompactSingleLineValue(entry.label, 12)
    && (!entry.context || isCompactSingleLineValue(entry.context, 12))
    && isCompactSingleLineValue(entry.value, 26)
  ));
}

function shouldUseCompactProgressReviewLayout(args: {
  lastSection: ExerciseInfoReviewSection | null;
  bestSection: ExerciseInfoReviewSection | null;
  progressSection: ExerciseInfoReviewSection | null;
  prSection: ExerciseInfoReviewSection | null;
}) {
  const leftSections = [args.lastSection, args.bestSection].filter((section): section is ExerciseInfoReviewSection => Boolean(section));
  if (leftSections.length === 0 || !args.progressSection) {
    return false;
  }

  const leftFits = leftSections.every((section) => (
    section.items.length === 1
    && isCompactSingleLineValue(section.title, 12)
    && isCompactSingleLineValue(section.items[0], 18)
  ));
  const progressFits = args.progressSection.items.length > 0
    && args.progressSection.items.length <= 3
    && isCompactSingleLineValue(args.progressSection.title, 12)
    && args.progressSection.items.every((item) => isCompactSingleLineValue(item, 28));
  const prFits = !args.prSection || (
    args.prSection.items.length === 1
    && isCompactSingleLineValue(args.prSection.title, 12)
    && isCompactSingleLineValue(args.prSection.items[0], 24)
  );

  return leftFits && progressFits && prFits;
}

function filterUniqueMetricItems(items: MetricDatum[], usedKeys?: Set<string>) {
  const seen = usedKeys ?? new Set<string>();
  return items.filter((item) => {
    const key = normalizeMetricKey(item.label);
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

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

function ExerciseInfoDetailedMetricGrid({ items: _items }: { items: MetricDatum[] }) {
  return null;
}

const exerciseInfoSectionTitleClassName = "px-2 pt-0.5 text-center text-[1.18rem] text-[rgb(var(--accent-divider-rgb)/0.96)]";
const exerciseInfoSubsectionTitleClassName = "text-[rgb(var(--accent-divider-rgb)/0.92)]";
const exerciseInfoHeaderTitleClassName = "pl-[4px] pt-[5px] pr-3 text-[1.02rem] leading-[1.12] text-[rgb(var(--accent-divider-rgb)/0.98)]";
const exerciseInfoSectionTitleStyle = { color: "rgb(var(--accent-divider-rgb) / 0.96)" } as const;
const exerciseInfoHeaderTitleStyle = { color: "rgb(var(--accent-divider-rgb) / 0.98)" } as const;
const exerciseInfoTightLabelSlotClassName = "min-h-[1.45rem]";
const exerciseInfoDenseLabelClassName = "text-[9px] tracking-[0.11em]";
const exerciseInfoStatsTightWidthClassName = "!basis-[5.55rem] !px-1.5";
const exerciseInfoStatsDenseWidthClassName = "!basis-[4.05rem] !px-1.5";
const exerciseInfoProgressSoloWidthClassName = "!basis-[5.35rem] !px-1.4";
const exerciseInfoProgressTightWidthClassName = "!px-1.2";
const exerciseInfoProgressDenseWidthClassName = "!basis-[min(4.35rem,calc(25%-0.48rem))] !px-1.5";
const exerciseInfoProgressionTightWidthClassName = "!basis-[4.85rem] !px-1.35";
const exerciseInfoRecentHistorySoloWidthClassName = "!basis-[10.8rem] !px-1.3";
const exerciseInfoRecentHistoryDenseWidthClassName = "!basis-[4.3rem] !px-1";
const exerciseInfoScopeChipClassName = "min-h-[1.85rem] min-w-[5.4rem] justify-center px-2 py-[4px] text-[9px] tracking-[0.16em]";

function getExerciseInfoSectionScopeLabel(
  section: ExerciseInfoSectionScopeKey,
  analyticsScope: ExerciseInfoAnalyticsScope,
  activeRoutineTitle?: string | null,
) {
  return getExerciseInfoAnalyticsScopeDisplayLabel(analyticsScope, activeRoutineTitle);
}

function ExerciseInfoSectionHeader({
  title,
  section,
  analyticsScope,
  activeRoutineTitle,
  onScopeClick,
}: {
  title: string;
  section: ExerciseInfoSectionScopeKey;
  analyticsScope: ExerciseInfoAnalyticsScope;
  activeRoutineTitle?: string | null;
  onScopeClick: (section: ExerciseInfoSectionScopeKey) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <h3 className={cn(appTokens.detailSectionTitle, exerciseInfoSectionTitleClassName)} style={exerciseInfoSectionTitleStyle}>
        {title}
      </h3>
      <PillButton
        active
        className={exerciseInfoScopeChipClassName}
        onClick={() => onScopeClick(section)}
      >
        {getExerciseInfoSectionScopeLabel(section, analyticsScope, activeRoutineTitle)}
      </PillButton>
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
  const performances = getExerciseInfoProgressState(stats).performances;
  const performanceMetrics = performances.map((entry) => ({
    label: entry.label,
    value: entry.value,
    timeframe: entry.context ?? null,
  }));

  if (performances.length === 0) {
    return <p className={appTokens.detailBodyMutedText}>No recent performances logged yet.</p>;
  }

  if (shouldUseCompactRecentHistoryStrip(performances) && !hasPromotedMetricValue(performanceMetrics)) {
    return (
      <ExerciseSurfaceMetricGrid
        items={performanceMetrics}
        className={performances.length === 1 ? "!gap-0" : "!gap-[0.55rem]"}
        itemClassName={performances.length === 1 ? exerciseInfoRecentHistorySoloWidthClassName : exerciseInfoRecentHistoryDenseWidthClassName}
        labelSlotClassName={exerciseInfoTightLabelSlotClassName}
        autoColumns
      />
    );
  }

  return (
    <div className="space-y-2">
      {performances.map((entry) => (
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
  metrics,
  sections,
}: {
  metrics: MetricDatum[];
  sections: ExerciseInfoReviewSection[];
}) {
  const hasPromotedMetric = hasPromotedMetricValue(metrics);

  if (sections.length === 0) {
    return metrics.length > 0 ? (
      <ExerciseSurfaceMetricGrid
        items={metrics}
        className={metrics.length === 1 ? "!gap-[0.55rem]" : metrics.length === 2 ? "!gap-[0.4rem]" : metrics.length === 3 ? "!gap-[0.5rem]" : metrics.length === 4 ? "!gap-[0.55rem]" : undefined}
        itemClassName={metrics.length === 1
          ? exerciseInfoProgressSoloWidthClassName
          : metrics.length === 2
            ? exerciseInfoProgressTightWidthClassName
            : metrics.length === 4 && !hasPromotedMetric
              ? exerciseInfoProgressDenseWidthClassName
              : undefined}
        itemStyle={metrics.length === 2 ? { flexBasis: "6.6rem", width: "6.6rem" } : undefined}
        labelClassName={metrics.length === 2 ? exerciseInfoDenseLabelClassName : undefined}
        autoColumns={metrics.length >= 1 && metrics.length <= 4}
      />
    ) : null;
  }

  const lastSection = sections.find((section) => section.title === "Last") ?? null;
  const bestSection = sections.find((section) => section.title === "Best") ?? null;
  const progressSection = sections.find((section) => section.title === "Trend" || section.title === "Progress") ?? null;
  const prSection = sections.find((section) => section.title === "PRs" || section.title === "PR History") ?? null;
  const stackedSections = [lastSection, bestSection].filter((section): section is ExerciseInfoReviewSection => Boolean(section));
  const useCompactLayout = shouldUseCompactProgressReviewLayout({
    lastSection,
    bestSection,
    progressSection,
    prSection,
  });

  if (useCompactLayout && progressSection) {
    const summaryMetrics = [lastSection, bestSection, prSection]
      .filter((section): section is ExerciseInfoReviewSection => Boolean(section))
      .map((section) => ({
        label: section.title,
        value: section.items[0]!,
      }));

    return (
      <div className="space-y-2">
        <ExerciseSurfaceMetricGrid items={summaryMetrics} />
        <div
          className={cn(
            appTokens.detailHistoryRow,
            "px-2 py-2",
          )}
        >
          <DetailSectionItems items={progressSection.items} className="pl-0.5" showBullets={false} />
        </div>
      </div>
    );
  }

  if (!progressSection) {
    const summaryMetrics = stackedSections.map((section) => ({
      label: section.title,
      value: section.items[0]!,
    }));
    const combinedMetrics = [...metrics, ...summaryMetrics];

    return (
      <div className="space-y-2">
        {combinedMetrics.length > 0 ? (
          <ExerciseSurfaceMetricGrid
            items={combinedMetrics}
            className={combinedMetrics.length === 1 ? "!gap-[0.55rem]" : combinedMetrics.length === 2 ? "!gap-[0.4rem]" : combinedMetrics.length === 3 ? "!gap-[0.5rem]" : combinedMetrics.length === 4 ? "!gap-[0.55rem]" : undefined}
            itemClassName={combinedMetrics.length === 1
              ? exerciseInfoProgressSoloWidthClassName
              : combinedMetrics.length === 2
              ? exerciseInfoProgressTightWidthClassName
              : combinedMetrics.length === 4 && !hasPromotedMetricValue(combinedMetrics)
                ? exerciseInfoProgressDenseWidthClassName
                : undefined}
            itemStyle={combinedMetrics.length === 2 ? { flexBasis: "6.6rem", width: "6.6rem" } : undefined}
            labelClassName={combinedMetrics.length === 2 ? exerciseInfoDenseLabelClassName : undefined}
            autoColumns={combinedMetrics.length >= 1 && combinedMetrics.length <= 4}
          />
        ) : null}
        {prSection ? (
          <div
            className={cn(
              appTokens.detailHistoryRow,
              "px-2 py-2",
            )}
          >
            <div className="w-full">
              <DetailSectionBlock
                title={prSection.title}
                items={prSection.items}
                divider={false}
                titleClassName={cn("px-0.5 text-center text-[0.72rem] tracking-[0.16em]", exerciseInfoSubsectionTitleClassName)}
              />
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-4 flex flex-col gap-2">
          {stackedSections.map((section) => (
            <div
              key={section.title}
              className={cn(
                appTokens.detailHistoryRow,
                "px-2 py-2",
              )}
            >
              <DetailSectionBlock
                title={section.title}
                items={section.items}
                divider={false}
                titleClassName={cn("px-0.5 text-left text-[0.68rem] tracking-[0.15em]", exerciseInfoSubsectionTitleClassName)}
              />
            </div>
          ))}
        </div>
        {progressSection ? (
          <div className="col-span-8 pl-0.5">
            <div
              className={cn(
                appTokens.detailHistoryRow,
                "px-2 py-2",
              )}
            >
              <DetailSectionItems items={progressSection.items} className="pl-0.5" showBullets={false} />
            </div>
          </div>
        ) : null}
      </div>
      {prSection ? (
        <div
          className={cn(
            appTokens.detailHistoryRow,
            "px-2 py-2",
          )}
        >
          <div
            className="w-full"
          >
              <DetailSectionBlock
                title={prSection.title}
                items={prSection.items}
                divider={false}
                titleClassName={cn("px-0.5 text-center text-[0.72rem] tracking-[0.16em]", exerciseInfoSubsectionTitleClassName)}
              />
            </div>
          </div>
      ) : null}
    </div>
  );
}

function ExerciseInfoProgressionPanel({
  progression,
  excludedMetricKeys = [],
  analyticsScope,
  activeRoutineTitle,
  onScopeClick,
}: {
  progression: ExerciseProgressionLifelineSummary;
  excludedMetricKeys?: string[];
  analyticsScope: ExerciseInfoAnalyticsScope;
  activeRoutineTitle?: string | null;
  onScopeClick: (section: ExerciseInfoSectionScopeKey) => void;
}) {
  const usedMetricKeys = new Set(excludedMetricKeys.map((key) => normalizeMetricKey(key)));
  const progressionMetricCandidates: Array<MetricDatum | null> = [
    progression.currentTargetLabel ? { label: "Current", value: progression.currentTargetLabel } : null,
    progression.firstTargetLabel ? { label: "Started", value: progression.firstTargetLabel } : null,
    { label: "Promoted", value: `${progression.promotionCount}`, valueTone: progression.promotionCount > 0 ? "success" : "muted" },
    progression.latestEventLabel ? {
      label: "Latest",
      value: progression.latestEventLabel,
      timeframe: progression.latestChangeAt ? formatDateShort(progression.latestChangeAt) : null,
    } : null,
  ];
  const metrics = filterUniqueMetricItems(
    progressionMetricCandidates.filter((item): item is MetricDatum => item !== null),
    usedMetricKeys,
  ).slice(0, 4);
  const sections = [
    progression.latestChangeSummary ? { title: "Latest Change", items: [progression.latestChangeSummary] } : null,
    progression.lastPromotionAt ? { title: "Last Promotion", items: [formatDateShort(progression.lastPromotionAt)] } : null,
  ].filter((section): section is ExerciseInfoReviewSection => Boolean(section));
  const compactSectionMetrics = shouldUseCompactProgressionStrip(sections)
    ? sections.map((section) => ({
        label: section.title,
        value: section.items[0]!,
      }))
    : [];

  if (metrics.length === 0 && sections.length === 0) {
    return null;
  }

  return (
    <AppPanel className={cn(appTokens.detailSection, "space-y-2 p-2")}>
      <ExerciseInfoSectionHeader
        title="Progression"
        section="progression"
        analyticsScope={analyticsScope}
        activeRoutineTitle={activeRoutineTitle}
        onScopeClick={onScopeClick}
      />
      {metrics.length > 0 ? <ExerciseSurfaceMetricGrid items={metrics} labelSlotClassName={exerciseInfoTightLabelSlotClassName} /> : null}
      {compactSectionMetrics.length > 0 ? (
        <ExerciseSurfaceMetricGrid
          items={compactSectionMetrics}
          className={compactSectionMetrics.length === 2 ? "!gap-[0.55rem]" : undefined}
          itemClassName={compactSectionMetrics.length === 2 ? exerciseInfoProgressionTightWidthClassName : undefined}
          labelSlotClassName={exerciseInfoTightLabelSlotClassName}
          autoColumns={compactSectionMetrics.length === 2}
        />
      ) : null}
      {sections.length > 0 && compactSectionMetrics.length === 0 ? (
        <div className={cn(appTokens.detailHistoryRow, "px-2 py-2")}>
          <DetailSectionBlocks sections={sections} titleClassName={exerciseInfoSubsectionTitleClassName} />
        </div>
      ) : null}
    </AppPanel>
  );
}

export function ExerciseInfoSheet({
  exercise,
  statsByScope,
  statsLoadingByScope,
  analyticsScope,
  onAnalyticsScopeChange,
  open,
  onOpenChange,
  onClose,
  inline = false,
  sourceContext,
}: {
  exercise: ExerciseInfoSheetExercise | null;
  statsByScope: Partial<Record<ExerciseInfoAnalyticsScope, ExerciseInfoSheetStats | null>>;
  statsLoadingByScope: Partial<Record<ExerciseInfoAnalyticsScope, boolean>>;
  analyticsScope: ExerciseInfoAnalyticsScope;
  onAnalyticsScopeChange: (scope: ExerciseInfoAnalyticsScope) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose?: () => void;
  inline?: boolean;
  sourceContext?: string;
}) {
  const router = useRouter();
  const statsPanelId = useId();
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [sectionScopeOverrides, setSectionScopeOverrides] = useState<Partial<Record<ExerciseInfoSectionScopeKey, ExerciseInfoAnalyticsScope>>>({});
  useBodyScrollLock(open && !inline);

  useEffect(() => {
    if (!open) {
      setSectionScopeOverrides({});
    }
  }, [open]);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  const hasUnsyncedSections = useMemo(
    () => EXERCISE_INFO_SECTION_SCOPE_KEYS.some((section) => sectionScopeOverrides[section] !== undefined),
    [sectionScopeOverrides],
  );

  const getSectionScope = useCallback((section: ExerciseInfoSectionScopeKey) => (
    sectionScopeOverrides[section] ?? analyticsScope
  ), [analyticsScope, sectionScopeOverrides]);

  const handleScopeResync = useCallback(() => {
    setSectionScopeOverrides({});
  }, []);

  const handleSectionScopeToggle = useCallback((section: ExerciseInfoSectionScopeKey) => {
    const currentScope = getSectionScope(section);
    const nextScope: ExerciseInfoAnalyticsScope = currentScope === "all_time" ? "current_routine" : "all_time";
    setSectionScopeOverrides((current) => {
      const nextOverrides = { ...current };
      if (nextScope === analyticsScope) {
        delete nextOverrides[section];
      } else {
        nextOverrides[section] = nextScope;
      }
      return nextOverrides;
    });
  }, [analyticsScope, getSectionScope]);

  const getSectionStats = useCallback((section: ExerciseInfoSectionScopeKey) => {
    const scope = getSectionScope(section);
    return {
      scope,
      stats: statsByScope[scope] ?? null,
      loading: Boolean(statsLoadingByScope[scope]),
    };
  }, [getSectionScope, statsByScope, statsLoadingByScope]);

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
  const activeRoutineTitle = statsByScope.current_routine?.activeRoutineTitle ?? statsByScope.all_time?.activeRoutineTitle ?? null;
  const activeScopeLabel = getExerciseInfoAnalyticsScopeDisplayLabel(analyticsScope, activeRoutineTitle);
  const detailHeader = (
    <div className="sticky top-[calc(max(var(--app-safe-top),var(--vv-top,0px))+0.25rem)] z-30">
      <div className="pointer-events-none absolute inset-x-0 inset-y-0 z-10 flex items-center justify-start px-1">
        <div className="pointer-events-auto">
          <PillButton
            active
            className={cn(exerciseInfoScopeChipClassName, "max-w-[9.6rem] whitespace-normal text-center leading-[1.05]")}
            aria-label={hasUnsyncedSections ? "Re-sync section analytics scopes" : "Toggle analytics scope"}
            onClick={() => {
              if (hasUnsyncedSections) {
                handleScopeResync();
                return;
              }
              onAnalyticsScopeChange(analyticsScope === "all_time" ? "current_routine" : "all_time");
            }}
          >
            {hasUnsyncedSections ? "Re-Sync" : activeScopeLabel}
          </PillButton>
        </div>
      </div>
      <DetailHeader
        title={(
          <span
            data-app-header-raw-title="true"
            className={exerciseInfoHeaderTitleClassName}
            style={exerciseInfoHeaderTitleStyle}
          >
            {exercise?.name ?? "Exercise"}
          </span>
        )}
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
  const statsSectionState = getSectionStats("stats");
  const performanceSectionState = getSectionStats("performance");
  const progressSectionState = getSectionStats("progress");
  const progressionSectionState = getSectionStats("progression");
  const prHistorySectionState = getSectionStats("pr-history");
  const recentHistorySectionState = getSectionStats("recent-history");

  const surfaceMetrics = Array.isArray(statsSectionState.stats?.surfaceMetrics)
    ? statsSectionState.stats.surfaceMetrics.filter((item): item is MetricDatum => Boolean(item && typeof item.label === "string" && typeof item.value === "string"))
    : [];
  const rawPerformanceMetrics = Array.isArray(performanceSectionState.stats?.performanceMetrics)
    ? performanceSectionState.stats.performanceMetrics.filter((item): item is MetricDatum => Boolean(item && typeof item.label === "string" && typeof item.value === "string"))
    : [];
  const usedMetricKeys = new Set(surfaceMetrics.map((item) => normalizeMetricKey(item.label)));
  const performanceMetrics = filterUniqueMetricItems(rawPerformanceMetrics, usedMetricKeys);
  const progressState = getExerciseInfoProgressState(progressSectionState.stats);
  const progressMetrics = filterUniqueMetricItems(progressState.metrics, usedMetricKeys);
  const reviewSections = progressState.reviewSections.filter((section) => section.title !== "PR History");
  const prHistoryState = getExerciseInfoProgressState(prHistorySectionState.stats);
  const prHistorySection = prHistoryState.reviewSections.find((section) => section.title === "PR History") ?? null;
  const progression = progressionSectionState.stats?.progression ?? null;
  const hasPromotedSurfaceMetric = hasPromotedMetricValue(surfaceMetrics);

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
                        <ExerciseInfoSectionHeader
                          title="Stats"
                          section="stats"
                          analyticsScope={statsSectionState.scope}
                          activeRoutineTitle={activeRoutineTitle}
                          onScopeClick={handleSectionScopeToggle}
                        />
                        {statsSectionState.loading ? <ExerciseInfoLoadingMetrics /> : null}
                        {!statsSectionState.loading && statsSectionState.stats ? (
                          <ExerciseSurfaceMetricGrid
                            items={surfaceMetrics}
                            className={surfaceMetrics.length === 2 ? "!gap-[0.55rem]" : surfaceMetrics.length === 4 ? "!gap-2" : undefined}
                            itemClassName={surfaceMetrics.length === 2
                              ? exerciseInfoStatsTightWidthClassName
                              : surfaceMetrics.length === 4 && !hasPromotedSurfaceMetric
                                ? exerciseInfoStatsDenseWidthClassName
                                : undefined}
                            labelClassName={surfaceMetrics.length === 4 ? exerciseInfoDenseLabelClassName : undefined}
                            labelSlotClassName={exerciseInfoTightLabelSlotClassName}
                            autoColumns={surfaceMetrics.length === 2 || surfaceMetrics.length === 4}
                          />
                        ) : null}
                        {!statsSectionState.loading && !statsSectionState.stats ? (
                          <p className={appTokens.detailBodyMutedText}>
                            No stats yet. Log a set to generate performance history for this exercise.
                          </p>
                        ) : null}
                      </div>
                    </AppPanel>

                    {!performanceSectionState.loading && performanceMetrics.length > 0 ? (
                      <AppPanel className={cn(appTokens.detailSection, "space-y-1.5 p-2")}>
                        <ExerciseInfoSectionHeader
                          title="Performance"
                          section="performance"
                          analyticsScope={performanceSectionState.scope}
                          activeRoutineTitle={activeRoutineTitle}
                          onScopeClick={handleSectionScopeToggle}
                        />
                        <ExerciseSurfaceMetricGrid items={performanceMetrics} />
                      </AppPanel>
                    ) : null}

                    {progressSectionState.loading || progressMetrics.length > 0 || reviewSections.length > 0 ? (
                      <AppPanel className={cn(appTokens.detailSection, "space-y-2 p-2")}>
                        <ExerciseInfoSectionHeader
                          title="Progress"
                          section="progress"
                          analyticsScope={progressSectionState.scope}
                          activeRoutineTitle={activeRoutineTitle}
                          onScopeClick={handleSectionScopeToggle}
                        />
                        {progressSectionState.loading ? <ExerciseInfoLoadingRows /> : <ExerciseInfoProgressReview metrics={progressMetrics} sections={reviewSections} />}
                      </AppPanel>
                    ) : null}

                    {!progressionSectionState.loading && progression ? (
                      <ExerciseInfoProgressionPanel
                        progression={progression}
                        excludedMetricKeys={[...usedMetricKeys]}
                        analyticsScope={progressionSectionState.scope}
                        activeRoutineTitle={activeRoutineTitle}
                        onScopeClick={handleSectionScopeToggle}
                      />
                    ) : null}

                    {!prHistorySectionState.loading && prHistorySection ? (
                      <AppPanel className={cn(appTokens.detailSection, "space-y-2 p-2")}>
                        <ExerciseInfoSectionHeader
                          title="PR History"
                          section="pr-history"
                          analyticsScope={prHistorySectionState.scope}
                          activeRoutineTitle={activeRoutineTitle}
                          onScopeClick={handleSectionScopeToggle}
                        />
                        <div className={cn(appTokens.detailHistoryRow, "px-2 py-2")}>
                          <div className="w-full">
                            <DetailSectionItems items={prHistorySection.items} className="pl-0.5" />
                          </div>
                        </div>
                      </AppPanel>
                    ) : null}

                    {recentHistorySectionState.loading || recentHistorySectionState.stats ? (
                      <AppPanel className={cn(appTokens.detailSection, "space-y-1.5 p-2")}>
                        <ExerciseInfoSectionHeader
                          title="Recent History"
                          section="recent-history"
                          analyticsScope={recentHistorySectionState.scope}
                          activeRoutineTitle={activeRoutineTitle}
                          onScopeClick={handleSectionScopeToggle}
                        />
                        {recentHistorySectionState.loading ? <ExerciseInfoLoadingRows /> : recentHistorySectionState.stats ? <ExerciseInfoRecentHistoryList stats={recentHistorySectionState.stats} /> : null}
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
