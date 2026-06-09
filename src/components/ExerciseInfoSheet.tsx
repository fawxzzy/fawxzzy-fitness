"use client";

import { Fragment, useCallback, useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { DetailHeader } from "@/components/DetailSurface";
import { ExerciseAssetImage } from "@/components/ExerciseAssetImage";
import { ExerciseSurfaceMetricGrid } from "@/components/exercises/ExerciseSurfaceMetricGrid";
import { ContentRail } from "@/components/layout/ContentRail";
import { ChevronRightIcon } from "@/components/ui/Chevrons";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { AccentDotSeparatedText, SignatureDot, SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
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
  getNextExerciseInfoAnalyticsScope,
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
  progressionDerived?: {
    signalLabel: string;
    signalTone?: "default" | "success" | "danger" | "muted";
    methodLabel: string;
    currentTargetLabel?: string | null;
    nextTargetLabel?: string | null;
    reason: string;
    historySessionCount: number;
    historySetCount: number;
    sourcePerformedAt?: string | null;
  } | null;
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
  return sections.length >= 2 && sections.length <= 4 && sections.every((section) => (
    section.items.length === 1
    && isCompactSingleLineValue(section.title, 20)
    && isCompactSingleLineValue(section.items[0], 34)
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

function compactProgressionMetricValue(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return normalized;
  }

  return normalized
    .replace(/\s*[•|]\s*/g, " | ")
    .replace(/\s+\|\s+/g, " | ");
}

function normalizeCompactProgressionComparisonValue(value: string | null | undefined) {
  return compactProgressionMetricValue(value)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isSameCalendarDay(left: string | null | undefined, right: string | null | undefined) {
  if (!left || !right) {
    return false;
  }

  return left.slice(0, 10) === right.slice(0, 10);
}

const exerciseInfoSectionTitleClassName = "px-2 pt-0.5 text-center text-[1.18rem] text-[rgb(var(--accent-divider-rgb)/0.96)]";
const exerciseInfoSubsectionTitleClassName = "text-[rgb(var(--accent-divider-rgb)/0.92)]";
const exerciseInfoHeaderTitleClassName = "pl-[4px] pt-[5px] pr-3 text-[1.02rem] leading-[1.12] text-[rgb(var(--accent-divider-rgb)/0.98)]";
const exerciseInfoSectionTitleStyle = { color: "rgb(var(--accent-divider-rgb) / 0.96)" } as const;
const exerciseInfoHeaderTitleStyle = { color: "rgb(var(--accent-divider-rgb) / 0.98)" } as const;
const exerciseInfoTightLabelSlotClassName = "min-h-[1.45rem]";
const exerciseInfoDenseLabelClassName = "text-[9px] tracking-[0.11em]";
const exerciseInfoScopeChipClassName = "min-h-[1.85rem] min-w-[5.4rem] justify-center px-2 py-[4px] text-[9px] tracking-[0.16em]";
const exerciseInfoSubsectionHeadingClassName = "px-2 text-center text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-divider-rgb)/0.92)]";

type ExerciseInfoMetricGridVariant = "default" | "progression";

function getCompactMetricArrowToneClassName(value: string) {
  const normalized = value.toLowerCase();
  if (/\b(reduced|removed|regression|deload)\b/.test(normalized)) {
    return "text-[rgb(255,116,116)]";
  }

  if (/\b(increased|added|promotion|promoted)\b/.test(normalized)) {
    return "text-[rgb(var(--success-rgb)/0.94)]";
  }

  const transitionMatch = normalized.match(/(.+?)(?:->|→|â†’|Ã¢â€ â€™)(.+)/);
  if (transitionMatch) {
    const leftScore = (transitionMatch[1].match(/-?\d+(?:\.\d+)?/g) ?? []).reduce((sum, part) => sum + Number(part), 0);
    const rightScore = (transitionMatch[2].match(/-?\d+(?:\.\d+)?/g) ?? []).reduce((sum, part) => sum + Number(part), 0);
    if (Number.isFinite(leftScore) && Number.isFinite(rightScore) && rightScore !== leftScore) {
      return rightScore > leftScore ? "text-[rgb(var(--success-rgb)/0.94)]" : "text-[rgb(255,116,116)]";
    }
  }

  return "text-[rgb(var(--text-primary)/0.95)]";
}

function buildCompactMetricValueNode(value: string) {
  const normalized = String(value)
    .replaceAll("ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢", "•")
    .replaceAll("Ã¢â‚¬Â¢", "•")
    .trim();
  const tokens = normalized
    .split(/(\s+\|\s+|\s+•\s+)/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return null;
  }

  const arrowToneClassName = getCompactMetricArrowToneClassName(normalized);

  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-x-2 gap-y-1 [text-wrap:pretty]",
        normalized.length <= 32 ? "flex-nowrap whitespace-nowrap" : "flex-wrap",
      )}
    >
      {tokens.map((part, index) => {
        if (part === "|" || part === "•") {
          return <SignatureMiniPipe key={`pipe-${index}`} />;
        }

        if (part.includes("→") || part.includes("->") || part.includes("â†’") || part.includes("Ã¢â€ â€™")) {
          const arrowParts = part.split(/(?:→|->|â†’|Ã¢â€ â€™)/);
          return (
            <span key={`${part}-${index}`} className="min-w-0">
              {arrowParts.map((arrowPart, arrowIndex) => (
                <Fragment key={`${arrowPart}-${arrowIndex}`}>
                  {arrowIndex > 0 ? <span className={cn("px-1", arrowToneClassName)}>&rarr;</span> : null}
                  {arrowPart ? <span className="whitespace-nowrap">{arrowPart.trim()}</span> : null}
                </Fragment>
              ))}
            </span>
          );
        }

        return <span key={`${part}-${index}`} className="min-w-0 whitespace-nowrap">{part}</span>;
      })}
    </span>
  );
}

function shouldUseDenseExerciseInfoMetricLabels(items: MetricDatum[]) {
  return items.length >= 4 || items.some((item) => item.label.trim().length >= 14);
}

function getExerciseInfoMetricGridGapClassName(count: number) {
  if (count <= 1) {
    return "!gap-[0.55rem]";
  }

  if (count === 2) {
    return "!gap-[0.45rem]";
  }

  return "!gap-[0.55rem]";
}

function getExerciseInfoMetricGridProps(items: MetricDatum[], variant: ExerciseInfoMetricGridVariant = "default") {
  return {
    className: items.length > 0 ? getExerciseInfoMetricGridGapClassName(items.length) : undefined,
    itemClassName: undefined,
    labelClassName: shouldUseDenseExerciseInfoMetricLabels(items) ? exerciseInfoDenseLabelClassName : undefined,
    labelSlotClassName: exerciseInfoTightLabelSlotClassName,
    autoColumns: true as const,
  };
}

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
    <div className="relative flex min-h-[2.1rem] items-center justify-center">
      <div className="absolute left-0 top-1/2 -translate-y-1/2">
        <PillButton
          active
          className={exerciseInfoScopeChipClassName}
          onClick={() => onScopeClick(section)}
        >
          {getExerciseInfoSectionScopeLabel(section, analyticsScope, activeRoutineTitle)}
        </PillButton>
      </div>
      <h3 className={cn(appTokens.detailSectionTitle, exerciseInfoSectionTitleClassName)} style={exerciseInfoSectionTitleStyle}>
        {title}
      </h3>
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
      <p className={cn(exerciseInfoSubsectionHeadingClassName, "pt-2")}>How To</p>
      {overviewCopy ? (
        <p className={cn(appTokens.detailBodyText, "px-3 pb-2 pt-1 text-center text-[13px] leading-[1.55] [text-wrap:pretty] text-[rgb(var(--text)/0.94)]")}>
          {overviewCopy}
        </p>
      ) : (
        <p className={cn(appTokens.detailBodyMutedText, "px-3 pb-2 pt-1 text-center text-[13px] leading-[1.5]")}>
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
        {...getExerciseInfoMetricGridProps(performanceMetrics)}
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
  if (sections.length === 0) {
    return metrics.length > 0 ? (
      <ExerciseSurfaceMetricGrid
        items={metrics}
        {...getExerciseInfoMetricGridProps(metrics)}
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
        <ExerciseSurfaceMetricGrid items={summaryMetrics} {...getExerciseInfoMetricGridProps(summaryMetrics)} />
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
    const summaryMetrics = [
      ...metrics,
      ...stackedSections.map((section) => ({
        label: section.title,
        value: section.items[0]!,
      })),
      ...(prSection && prSection.items.length === 1 ? [{ label: prSection.title, value: prSection.items[0]! }] : []),
    ];
    const combinedMetrics = filterUniqueMetricItems(summaryMetrics);

    return (
      <div className="space-y-2">
        {combinedMetrics.length > 0 ? (
          <ExerciseSurfaceMetricGrid
            items={combinedMetrics}
            {...getExerciseInfoMetricGridProps(combinedMetrics)}
          />
        ) : null}
        {prSection && prSection.items.length > 1 ? (
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
      {(() => {
        const summaryMetrics = filterUniqueMetricItems([
          ...metrics,
          ...stackedSections.map((section) => ({
            label: section.title,
            value: section.items[0]!,
          })),
          ...(prSection && prSection.items.length === 1 ? [{ label: prSection.title, value: prSection.items[0]! }] : []),
        ]);

        return summaryMetrics.length > 0 ? (
          <ExerciseSurfaceMetricGrid items={summaryMetrics} {...getExerciseInfoMetricGridProps(summaryMetrics)} />
        ) : null;
      })()}
      <div
        className={cn(
          appTokens.detailHistoryRow,
          "px-2 py-2",
        )}
      >
        <DetailSectionItems items={progressSection.items} className="pl-0.5" showBullets={false} />
      </div>
      {prSection && prSection.items.length > 1 ? (
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

function buildProgressionChangeMixMetrics(args: {
  promotionCount: number;
  deloadCount: number;
  manualChangeCount: number;
  revertCount: number;
}) {
  return [
    {
      label: "Promotions",
      value: String(args.promotionCount),
      valueTone: args.promotionCount > 0 ? "success" : "muted",
    },
    {
      label: "Regressed",
      value: String(args.deloadCount),
      valueTone: args.deloadCount > 0 ? "danger" : "muted",
    },
    {
      label: "Manual",
      value: String(args.manualChangeCount),
      valueTone: args.manualChangeCount > 0 ? "default" : "muted",
    },
    {
      label: "Reverted",
      value: String(args.revertCount),
      valueTone: args.revertCount > 0 ? "default" : "muted",
    },
  ] satisfies MetricDatum[];
}

function ExerciseInfoProgressionActivityPanel({
  progression,
  analyticsScope,
}: {
  progression: ExerciseProgressionLifelineSummary;
  analyticsScope: ExerciseInfoAnalyticsScope;
}) {
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const activityDays = progression.activityDays ?? [];

  useEffect(() => {
    setSelectedDayId(null);
  }, [analyticsScope, progression.latestChangeAt]);

  const selectedDay = activityDays.find((day) => day.id === selectedDayId) ?? null;
  const maxEventCount = activityDays.reduce((current, day) => Math.max(current, day.eventCount), 0);
  const changeMixMetrics = buildProgressionChangeMixMetrics({
    promotionCount: selectedDay?.promotionCount ?? progression.promotionCount,
    deloadCount: selectedDay?.deloadCount ?? progression.deloadCount,
    manualChangeCount: selectedDay?.manualChangeCount ?? progression.manualChangeCount,
    revertCount: selectedDay?.revertCount ?? progression.revertCount,
  });
  const activityTitle = analyticsScope === "current_cycle" ? "Cycle Activity" : "Progression Activity";
  const changeTitle = selectedDay ? `${selectedDay.label} Changes` : "Changes";

  if (activityDays.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 px-1 pb-1">
      <MetricAccentBar variant="thin" className="mx-1" />
      <div className="space-y-2">
        <div className="relative min-h-[1.9rem] px-2">
          <p className={cn(exerciseInfoSubsectionHeadingClassName, "px-0 pt-0.5")}>
            {activityTitle}
          </p>
          {selectedDay ? (
            <PillButton
              active
              type="button"
              onClick={() => setSelectedDayId(null)}
              className="absolute right-0 top-1/2 min-h-[1.7rem] -translate-y-1/2 px-2 py-[3px] text-[9px] tracking-[0.14em]"
            >
              <ChevronRightIcon className="h-3.5 w-3.5 rotate-180 text-[rgb(var(--accent-divider-rgb)/0.96)]" />
              Back
            </PillButton>
          ) : null}
        </div>
        {selectedDay ? (
          <div className={cn(appTokens.detailHistoryRow, "px-2 py-2")}>
            <div className="space-y-2">
              <p className={cn(exerciseInfoSubsectionHeadingClassName, "px-0.5 pt-0.5")}>
                {selectedDay.label}
              </p>
              <DetailSectionItems items={selectedDay.items} className="pl-0.5" />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {activityDays.map((day) => {
              const widthPercent = maxEventCount > 0
                ? Math.max((day.eventCount / maxEventCount) * 100, day.eventCount > 0 ? 8 : 0)
                : 0;

              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => setSelectedDayId(day.id)}
                  className="w-full rounded-[1rem] border border-[rgb(var(--border-rgb)/0.42)] bg-[rgb(var(--surface-2-rgb)/0.14)] px-3.5 py-3 text-left transition-colors hover:border-[rgb(var(--accent-strong)/0.45)] hover:bg-[rgb(var(--surface-2-rgb)/0.22)]"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-0.5">
                        <p className="truncate text-sm font-semibold text-[rgb(var(--text-primary)/0.95)]">
                          {day.label}
                        </p>
                        {day.detail ? (
                          <p className="text-[0.75rem] leading-5 text-[rgb(var(--text-muted)/0.88)]">
                            {day.detail}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <p className="text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-secondary)/0.86)]">
                          {day.valueLabel}
                        </p>
                        <ChevronRightIcon className="h-4 w-4 text-[rgb(var(--text-muted)/0.92)]" />
                      </div>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-[rgb(var(--surface-3-rgb)/0.42)]">
                      <div
                        className="h-full rounded-full bg-[rgb(var(--accent-strong)/0.72)] transition-[width] duration-300"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <p className={exerciseInfoSubsectionHeadingClassName}>
          {changeTitle}
        </p>
        <ExerciseSurfaceMetricGrid
          items={changeMixMetrics}
          {...getExerciseInfoMetricGridProps(changeMixMetrics)}
        />
      </div>
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
  const isCycleScope = analyticsScope === "current_cycle";
  const recentWindowDays = progression.recentWindowDays ?? 30;
  const currentTargetValue = compactProgressionMetricValue(progression.currentTargetLabel);
  const startedTargetValue = compactProgressionMetricValue(progression.firstTargetLabel);
  const startedMatchesCurrent = Boolean(startedTargetValue)
    && normalizeCompactProgressionComparisonValue(startedTargetValue) === normalizeCompactProgressionComparisonValue(currentTargetValue);
  const latestChangeWasPromotion = progression.latestEventLabel === "Promotion applied";
  const shouldHideLastPromotion = latestChangeWasPromotion
    && isSameCalendarDay(progression.lastPromotionAt, progression.latestChangeAt);
  const progressionMetricCandidates: Array<MetricDatum | null> = [
    progression.currentTargetLabel ? (() => {
      const value = currentTargetValue;
      return { label: "Current", value, valueNode: buildCompactMetricValueNode(value) } satisfies MetricDatum;
    })() : null,
    progression.firstTargetLabel && !startedMatchesCurrent ? (() => {
      const value = startedTargetValue;
      return { label: "Started", value, valueNode: buildCompactMetricValueNode(value) } satisfies MetricDatum;
    })() : null,
    { label: "Promotions", value: `${progression.promotionCount}`, valueTone: progression.promotionCount > 0 ? "success" : "muted" },
  ];
  const metrics = filterUniqueMetricItems(
    progressionMetricCandidates.filter((item): item is MetricDatum => item !== null),
    usedMetricKeys,
  ).slice(0, 4);
  const sections = [
    progression.latestChangeSummary ? { title: "Latest Change", items: [progression.latestChangeSummary] } : null,
    progression.recentFocusSummary ? { title: "Recent Focus", items: [progression.recentFocusSummary] } : null,
    progression.lastPromotionAt && !shouldHideLastPromotion
      ? { title: "Last Promotion", items: [formatDateShort(progression.lastPromotionAt)] }
      : null,
  ].filter((section): section is ExerciseInfoReviewSection => Boolean(section));

  if (metrics.length === 0 && sections.length === 0 && (progression.activityDays?.length ?? 0) === 0) {
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
      {metrics.length > 0 ? <ExerciseSurfaceMetricGrid items={metrics} {...getExerciseInfoMetricGridProps(metrics, "progression")} /> : null}
      {sections.length > 0 ? (
        <div className={cn(appTokens.detailHistoryRow, "px-2 py-2")}>
          <DetailSectionBlocks sections={sections} titleClassName={exerciseInfoSubsectionTitleClassName} />
        </div>
      ) : null}
      <ExerciseInfoProgressionActivityPanel
        progression={progression}
        analyticsScope={analyticsScope}
      />
    </AppPanel>
  );
}

function buildDerivedProgressionMetrics(
  derived: NonNullable<ExerciseInfoSheetStats["progressionDerived"]>,
): MetricDatum[] {
  return [
    {
      label: "Signal",
      value: derived.signalLabel,
      valueTone: derived.signalTone ?? "default",
    },
    {
      label: "Method",
      value: derived.methodLabel,
      valueTone: derived.methodLabel === "Manual" ? "muted" : "default",
    },
    {
      label: "History",
      value: derived.historySessionCount === 1 ? "1 session" : `${derived.historySessionCount} sessions`,
      valueTone: derived.historySessionCount > 0 ? "default" : "muted",
    },
  ];
}

function buildDerivedProgressionSections(
  derived: NonNullable<ExerciseInfoSheetStats["progressionDerived"]>,
): ExerciseInfoReviewSection[] {
  return [
    derived.currentTargetLabel ? {
      title: "Current Target",
      items: [derived.currentTargetLabel],
    } : null,
    derived.nextTargetLabel ? {
      title: "Next Update",
      items: [derived.nextTargetLabel],
    } : null,
    {
      title: "Readiness",
      items: [derived.reason],
    },
    {
      title: "Basis",
      items: [
        derived.historySessionCount === 1 ? "1 scoped session reviewed." : `${derived.historySessionCount} scoped sessions reviewed.`,
        derived.sourcePerformedAt ? `Source session ${formatDateShort(derived.sourcePerformedAt)}` : null,
      ].filter((item): item is string => Boolean(item)),
    },
  ].filter((section): section is ExerciseInfoReviewSection => Boolean(section));
}

function getExerciseInfoProgressionEmptyStateCopy(scope: ExerciseInfoAnalyticsScope) {
  if (scope === "current_cycle") {
    return "No progression changes have been recorded in this cycle yet. This lane only fills after promotions, regressions, reverts, or manual target edits.";
  }

  if (scope === "current_routine") {
    return "No progression changes have been recorded for this routine yet. Logged sets alone do not create progression activity until a target actually changes.";
  }

  return "No progression changes have been recorded for this exercise yet. Logged history can exist without progression activity until a target changes.";
}

function ExerciseInfoProgressionEmptyPanel({
  analyticsScope,
  activeRoutineTitle,
  derivedProgression,
  onScopeClick,
}: {
  analyticsScope: ExerciseInfoAnalyticsScope;
  activeRoutineTitle?: string | null;
  derivedProgression?: ExerciseInfoSheetStats["progressionDerived"];
  onScopeClick: (section: ExerciseInfoSectionScopeKey) => void;
}) {
  const fallbackMetrics = derivedProgression ? buildDerivedProgressionMetrics(derivedProgression) : [];
  const fallbackSections = derivedProgression ? buildDerivedProgressionSections(derivedProgression) : [];

  return (
    <AppPanel className={cn(appTokens.detailSection, "space-y-2 p-2")}>
      <ExerciseInfoSectionHeader
        title="Progression"
        section="progression"
        analyticsScope={analyticsScope}
        activeRoutineTitle={activeRoutineTitle}
        onScopeClick={onScopeClick}
      />
      {fallbackMetrics.length > 0 ? (
        <ExerciseSurfaceMetricGrid
          items={fallbackMetrics}
          {...getExerciseInfoMetricGridProps(fallbackMetrics, "progression")}
        />
      ) : null}
      {fallbackSections.length > 0 ? (
        <div className={cn(appTokens.detailHistoryRow, "px-2 py-2")}>
          <DetailSectionBlocks sections={fallbackSections} titleClassName={exerciseInfoSubsectionTitleClassName} />
        </div>
      ) : null}
      <div className={cn(appTokens.detailHistoryRow, "px-2 py-2")}>
        <p className={appTokens.detailBodyMutedText}>
          {getExerciseInfoProgressionEmptyStateCopy(analyticsScope)}
        </p>
      </div>
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
    const nextScope = getNextExerciseInfoAnalyticsScope(currentScope);
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
      <div className="pointer-events-none absolute inset-x-0 inset-y-0 z-10 flex items-center justify-start px-2">
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
              onAnalyticsScopeChange(getNextExerciseInfoAnalyticsScope(analyticsScope));
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
  const derivedProgression = progressionSectionState.stats?.progressionDerived ?? null;

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
                            {...getExerciseInfoMetricGridProps(surfaceMetrics)}
                          />
                        ) : null}
                        {!statsSectionState.loading && !statsSectionState.stats ? (
                          <p className={appTokens.detailBodyMutedText}>
                            No stats yet. Log a set to generate performance history for this exercise.
                          </p>
                        ) : null}
                      </div>
                    </AppPanel>

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

                    {!performanceSectionState.loading && performanceMetrics.length > 0 ? (
                      <AppPanel className={cn(appTokens.detailSection, "space-y-1.5 p-2")}>
                        <ExerciseInfoSectionHeader
                          title="Performance"
                          section="performance"
                          analyticsScope={performanceSectionState.scope}
                          activeRoutineTitle={activeRoutineTitle}
                          onScopeClick={handleSectionScopeToggle}
                        />
                        <ExerciseSurfaceMetricGrid items={performanceMetrics} {...getExerciseInfoMetricGridProps(performanceMetrics)} />
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

                    {progressionSectionState.loading ? (
                      <AppPanel className={cn(appTokens.detailSection, "space-y-2 p-2")}>
                        <ExerciseInfoSectionHeader
                          title="Progression"
                          section="progression"
                          analyticsScope={progressionSectionState.scope}
                          activeRoutineTitle={activeRoutineTitle}
                          onScopeClick={handleSectionScopeToggle}
                        />
                        <ExerciseInfoLoadingRows />
                      </AppPanel>
                    ) : progression ? (
                      <ExerciseInfoProgressionPanel
                        progression={progression}
                        excludedMetricKeys={[...usedMetricKeys]}
                        analyticsScope={progressionSectionState.scope}
                        activeRoutineTitle={activeRoutineTitle}
                        onScopeClick={handleSectionScopeToggle}
                      />
                    ) : progressionSectionState.stats ? (
                      <ExerciseInfoProgressionEmptyPanel
                        analyticsScope={progressionSectionState.scope}
                        activeRoutineTitle={activeRoutineTitle}
                        derivedProgression={derivedProgression}
                        onScopeClick={handleSectionScopeToggle}
                      />
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
