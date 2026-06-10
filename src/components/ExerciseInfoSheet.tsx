"use client";

import { Fragment, useCallback, useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { DetailHeader } from "@/components/DetailSurface";
import { ExerciseAssetImage } from "@/components/ExerciseAssetImage";
import { ExerciseProgressionActivityPanel } from "@/components/ExerciseProgressionActivityPanel";
import { ExerciseSurfaceMetricGrid } from "@/components/exercises/ExerciseSurfaceMetricGrid";
import { ContentRail } from "@/components/layout/ContentRail";
import { ChevronRightIcon } from "@/components/ui/Chevrons";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { AccentDotSeparatedText, SignatureDot, SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { appTokens } from "@/components/ui/app/tokens";
import { DetailSectionBadge, DetailSectionBlock, DetailSectionBlocks, DetailSectionItems, type DetailSectionListItem, type DetailSectionListItemInput } from "@/components/ui/DetailSectionList";
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
import type { ExerciseHistoryDayGroup, ExerciseHistoryPoint } from "@/lib/exercise-info";
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
      sessionId?: string;
      performedAt?: string;
      label: string;
      value: string;
      setCount?: number;
      setSummaries?: string[];
      displayKind?: "session-summary" | "set-list" | "condensed-session";
      context?: string | null;
      summary?: string | null;
    }>;
    historyGroups?: ExerciseHistoryDayGroup[];
    historyPoints?: ExerciseHistoryPoint[];
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
          items: section.items.filter((item): item is DetailSectionListItemInput => (
            (typeof item === "string" && item.trim().length > 0)
            || (isDetailSectionListItem(item) && item.primary.trim().length > 0)
          )),
        }))
        .filter((section) => section.items.length > 0)
    : [];
  const performances = Array.isArray(progress?.performances)
    ? progress.performances
        .filter((entry): entry is NonNullable<NonNullable<ExerciseInfoSheetStats["progress"]>["performances"]>[number] => (
          Boolean(entry)
          && typeof entry.label === "string"
          && typeof entry.value === "string"
        ))
        .map((entry) => ({
          ...entry,
          sessionId: entry.sessionId ?? `legacy-${entry.label}`,
          performedAt: entry.performedAt ?? entry.label,
          setCount: entry.setCount ?? 1,
          setSummaries: entry.setSummaries ?? [entry.value],
          displayKind: entry.displayKind ?? "session-summary",
        }))
    : [];
  const historyGroups = Array.isArray(progress?.historyGroups)
    ? progress.historyGroups.filter((group): group is ExerciseHistoryDayGroup => Boolean(group && typeof group.id === "string" && Array.isArray(group.rows)))
    : [];
  const historyPoints = Array.isArray(progress?.historyPoints)
    ? progress.historyPoints.filter((point): point is ExerciseHistoryPoint => Boolean(point && typeof point.id === "string" && typeof point.type === "string"))
    : [];

  return {
    metrics,
    reviewSections,
    performances,
    historyGroups,
    historyPoints,
  };
}

function normalizeMetricKey(label: string | null | undefined) {
  return String(label ?? "").trim().toLowerCase();
}

function isDetailSectionListItem(value: DetailSectionListItemInput): value is DetailSectionListItem {
  return typeof value === "object" && value !== null && typeof value.primary === "string";
}

function getDetailSectionItemText(value: DetailSectionListItemInput) {
  if (typeof value === "string") {
    return value;
  }

  return [value.primary, value.value].filter((part): part is string => Boolean(part?.trim())).join(" | ");
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

function shouldUseCompactProgressionStrip(sections: ExerciseInfoReviewSection[]) {
  return sections.length >= 2 && sections.length <= 4 && sections.every((section) => (
    section.items.length === 1
    && isCompactSingleLineValue(section.title, 20)
    && isCompactSingleLineValue(getDetailSectionItemText(section.items[0]!), 34)
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
    && isCompactSingleLineValue(getDetailSectionItemText(section.items[0]!), 18)
  ));
  const progressFits = args.progressSection.items.length > 0
    && args.progressSection.items.length <= 3
    && isCompactSingleLineValue(args.progressSection.title, 12)
    && args.progressSection.items.every((item) => isCompactSingleLineValue(getDetailSectionItemText(item), 28));
  const prFits = !args.prSection || (
    args.prSection.items.length === 1
    && isCompactSingleLineValue(args.prSection.title, 12)
    && isCompactSingleLineValue(getDetailSectionItemText(args.prSection.items[0]!), 24)
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

function normalizeExerciseInfoComparisonValue(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
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
            <span key={`${part}-${index}`} className="inline-flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
              {arrowParts.map((arrowPart, arrowIndex) => (
                <Fragment key={`${arrowPart}-${arrowIndex}`}>
                  {arrowIndex > 0 ? <span className={cn("px-1", arrowToneClassName)}>&rarr;</span> : null}
                  {arrowPart ? <span className="min-w-0 whitespace-nowrap">{arrowPart.trim()}</span> : null}
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
  resyncActive = false,
}: {
  title: string;
  section: ExerciseInfoSectionScopeKey;
  analyticsScope: ExerciseInfoAnalyticsScope;
  activeRoutineTitle?: string | null;
  onScopeClick: (section: ExerciseInfoSectionScopeKey) => void;
  resyncActive?: boolean;
}) {
  return (
    <div className="relative flex min-h-[2.1rem] items-center justify-center">
      <div className="absolute left-0 top-1/2 -translate-y-1/2">
        <PillButton
          active
          className={exerciseInfoScopeChipClassName}
          onClick={() => onScopeClick(section)}
        >
          {resyncActive ? "Re-sync" : getExerciseInfoSectionScopeLabel(section, analyticsScope, activeRoutineTitle)}
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

function renderHistoryPointBadges(point: Pick<ExerciseHistoryPoint, "signals" | "tagLabels">) {
  const signals = point.signals ?? [];
  const tagLabels = point.tagLabels ?? [];
  const signalLabels = signals.map((signal) => {
    if (signal === "pr") return "PR";
    if (signal === "promotion") return "PROMO";
    if (signal === "regression") return "REGRESS";
    return "WATCH";
  });
  const labels = [...signalLabels, ...tagLabels].filter((value, index, all) => value && all.indexOf(value) === index);

  if (labels.length === 0) {
    return null;
  }

  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-1">
      {labels.map((label) => (
        <DetailSectionBadge key={label} label={label} />
      ))}
    </span>
  );
}

function buildHistoryPointMetrics(point: ExerciseHistoryPoint): MetricDatum[] {
  const metrics = [
    { label: "Point", value: point.type === "progression-event" ? "Progression" : point.type === "day" ? "Day" : "Set" },
    { label: "Date", value: point.label },
    ...point.values.slice(0, 4).map((value) => ({ label: value.label, value: value.value })),
  ];

  return filterUniqueMetricItems(metrics).slice(0, 6);
}

function ExerciseHistoryGraph({
  points,
  selectedPointId,
  onSelectedPointChange,
}: {
  points: ExerciseHistoryPoint[];
  selectedPointId: string | null;
  onSelectedPointChange: (pointId: string | null) => void;
}) {
  const orderedPoints = points
    .filter((point) => Number.isFinite(Date.parse(point.performedAt)))
    .sort((left, right) => {
      if (left.performedAt !== right.performedAt) return left.performedAt.localeCompare(right.performedAt);
      return left.id.localeCompare(right.id);
    });

  if (orderedPoints.length === 0) {
    return null;
  }

  const selectedPoint = orderedPoints.find((point) => point.id === selectedPointId) ?? null;
  const selectedIndex = selectedPoint ? orderedPoints.findIndex((point) => point.id === selectedPoint.id) : -1;
  const numericValues = orderedPoints
    .map((point) => point.numericValue)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const minValue = numericValues.length > 0 ? Math.min(...numericValues) : 0;
  const maxValue = numericValues.length > 0 ? Math.max(...numericValues) : 1;
  const valueRange = Math.max(maxValue - minValue, 1);
  const startTime = Date.parse(orderedPoints[0]!.performedAt);
  const endTime = Date.parse(orderedPoints[orderedPoints.length - 1]!.performedAt);
  const timeRange = Math.max(endTime - startTime, 1);
  const chartWidth = 320;
  const chartHeight = 132;
  const paddingX = 18;
  const paddingTop = 16;
  const paddingBottom = 26;
  const innerWidth = chartWidth - (paddingX * 2);
  const innerHeight = chartHeight - paddingTop - paddingBottom;
  const plottedPoints = orderedPoints.map((point, index) => {
    const timestamp = Date.parse(point.performedAt);
    const x = orderedPoints.length === 1 ? chartWidth / 2 : paddingX + (((timestamp - startTime) / timeRange) * innerWidth);
    const hasNumericValue = typeof point.numericValue === "number" && Number.isFinite(point.numericValue);
    const y = hasNumericValue
      ? paddingTop + ((1 - ((point.numericValue! - minValue) / valueRange)) * innerHeight)
      : chartHeight - paddingBottom;

    return {
      point,
      x,
      y,
      selected: point.id === selectedPointId,
      leftPercent: (x / chartWidth) * 100,
      topPercent: (y / chartHeight) * 100,
      index,
    };
  });
  const linePoints = plottedPoints
    .filter((point) => point.point.type !== "progression-event" && typeof point.point.numericValue === "number")
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
  const selectedDisplayPoint = selectedPoint ?? orderedPoints[orderedPoints.length - 1]!;
  const selectedMetrics = buildHistoryPointMetrics(selectedDisplayPoint);

  return (
    <div className="space-y-2 rounded-[1rem] border border-[rgb(var(--border-rgb)/0.42)] bg-[rgb(var(--surface-2-rgb)/0.14)] px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[rgb(var(--border-rgb)/0.42)] text-[rgb(var(--accent-divider-rgb)/0.95)]"
          onClick={() => {
            const nextIndex = selectedIndex > 0 ? selectedIndex - 1 : orderedPoints.length - 1;
            onSelectedPointChange(orderedPoints[nextIndex]?.id ?? null);
          }}
          aria-label="Previous history point"
        >
          <ChevronRightIcon className="h-4 w-4 rotate-180" />
        </button>
        <div className="min-w-0 text-center">
          <p className="truncate text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-secondary)/0.82)]">
            {selectedPoint ? selectedPoint.label : "All Time"}
          </p>
          <p className="truncate text-sm font-semibold text-[rgb(var(--text-primary)/0.95)]">
            {selectedPoint ? selectedPoint.summary : `${orderedPoints.length} points`}
          </p>
        </div>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[rgb(var(--border-rgb)/0.42)] text-[rgb(var(--accent-divider-rgb)/0.95)]"
          onClick={() => {
            const nextIndex = selectedIndex >= 0 && selectedIndex < orderedPoints.length - 1 ? selectedIndex + 1 : 0;
            onSelectedPointChange(orderedPoints[nextIndex]?.id ?? null);
          }}
          aria-label="Next history point"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-[8.25rem] w-full" aria-hidden="true">
          <line x1={paddingX} x2={chartWidth - paddingX} y1={chartHeight - paddingBottom} y2={chartHeight - paddingBottom} stroke="rgb(var(--border-rgb) / 0.34)" strokeWidth="1.2" />
          <line x1={paddingX} x2={paddingX} y1={paddingTop} y2={chartHeight - paddingBottom} stroke="rgb(var(--border-rgb) / 0.2)" strokeWidth="1" />
          {linePoints ? (
            <polyline
              fill="none"
              stroke="rgb(var(--accent-strong) / 0.82)"
              strokeWidth="2.4"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={linePoints}
            />
          ) : null}
          {plottedPoints.map(({ point, x, y, selected }) => (
            <circle
              key={point.id}
              cx={x}
              cy={y}
              r={selected ? 6.5 : point.type === "progression-event" ? 4.5 : 5}
              fill={point.type === "progression-event" ? "rgb(var(--accent-yellow-on) / 0.92)" : selected ? "rgb(var(--accent-strong) / 0.96)" : "rgb(var(--surface-1-rgb) / 0.96)"}
              stroke={point.signals?.includes("regression") ? "rgb(255 116 116 / 0.92)" : "rgb(var(--accent-strong) / 0.9)"}
              strokeWidth={selected ? 2.5 : 1.7}
            />
          ))}
        </svg>
        {plottedPoints.map((point) => (
          <button
            key={`hit-${point.point.id}`}
            type="button"
            onClick={() => onSelectedPointChange(point.point.id)}
            className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ left: `${point.leftPercent}%`, top: `${point.topPercent}%` }}
            aria-label={`Select ${point.point.label} history point`}
          />
        ))}
      </div>
      <div className="space-y-2 rounded-[0.9rem] border border-[rgb(var(--border-rgb)/0.34)] bg-[rgb(var(--surface-1-rgb)/0.16)] px-2.5 py-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-muted)/0.9)]">
              {selectedPoint ? selectedPoint.type.replace("-", " ") : "Scope"}
            </p>
            <p className="text-sm font-semibold leading-5 text-[rgb(var(--text-primary)/0.96)]">
              {selectedDisplayPoint.summary}
            </p>
            {selectedDisplayPoint.meta ? (
              <p className="text-[0.74rem] leading-5 text-[rgb(var(--text-secondary)/0.82)]">
                {selectedDisplayPoint.meta}
              </p>
            ) : null}
          </div>
          {renderHistoryPointBadges(selectedDisplayPoint)}
        </div>
        {selectedMetrics.length > 0 ? (
          <ExerciseSurfaceMetricGrid items={selectedMetrics} {...getExerciseInfoMetricGridProps(selectedMetrics)} />
        ) : null}
      </div>
    </div>
  );
}

function ExerciseInfoHistoryList({
  stats,
  selectedPointId,
  onSelectedPointChange,
}: {
  stats: ExerciseInfoSheetStats;
  selectedPointId: string | null;
  onSelectedPointChange: (pointId: string | null) => void;
}) {
  const HISTORY_VISIBLE_ROW_COUNT = 5;
  const historyState = getExerciseInfoProgressState(stats);
  const historyGroups = historyState.historyGroups;
  const historyPoints = historyState.historyPoints;
  const selectedPoint = selectedPointId ? historyPoints.find((point) => point.id === selectedPointId) ?? null : null;
  const activeGroups = selectedPoint
    ? historyGroups
        .filter((group) => group.dayKey === selectedPoint.dayKey)
        .map((group) => selectedPoint.rowId
          ? { ...group, rows: group.rows.filter((row) => row.id === selectedPoint.rowId) }
          : group)
        .filter((group) => group.rows.length > 0)
    : historyGroups;
  const structuredItems = activeGroups.flatMap((group) => {
    const dayItem: DetailSectionListItem = {
      id: group.id,
      primary: group.label,
      value: `${group.rows.length} ${group.rows.length === 1 ? "set" : "sets"}`,
      signals: group.signals,
      tagLabels: group.tagLabels,
      layout: "single-column",
    };
    const setItems = group.rows.map((row): DetailSectionListItem => ({
      id: row.id,
      primary: row.primary,
      meta: row.meta,
      signals: row.signals,
      tagLabels: row.tagLabels,
      layout: "single-column",
    }));

    return [dayItem, ...setItems];
  });

  if (structuredItems.length > 0) {
    return (
      <div className="space-y-2">
        <ExerciseHistoryGraph
          points={historyPoints}
          selectedPointId={selectedPointId}
          onSelectedPointChange={onSelectedPointChange}
        />
        <div className={cn(appTokens.detailHistoryRow, "px-2 py-2")}>
          <div
            className={cn(
              "w-full",
              structuredItems.length > HISTORY_VISIBLE_ROW_COUNT ? "max-h-[18rem] overflow-y-auto pr-1" : undefined,
            )}
          >
            <DetailSectionItems items={structuredItems} className="pl-0.5" showBullets={false} />
          </div>
        </div>
      </div>
    );
  }

  const performances = historyState.performances;
  const prHistorySection = historyState.reviewSections.find((section) => section.title === "PR History") ?? null;
  const prHistoryDates = new Set(
    (prHistorySection?.items ?? [])
      .map((item) => {
        const rawText = typeof item === "string"
          ? item
          : [item.primary, item.value].filter((part): part is string => Boolean(part?.trim())).join(" | ");
        const dateText = rawText.split("|")[0]?.trim() || "";
        return dateText;
      })
      .filter(Boolean),
  );
  const normalizedBestSummary = normalizeExerciseInfoComparisonValue(stats.bests.bestSetSummary);
  const buildHistoryRowValue = (entry: NonNullable<NonNullable<ExerciseInfoSheetStats["progress"]>["performances"]>[number]) => {
    const uniqueSetSummaries = Array.from(new Set(
      (entry.setSummaries ?? [entry.value])
        .map((item) => item.trim())
        .filter(Boolean),
    ));

    const displayKind = entry.displayKind ?? "session-summary";

    if (displayKind === "set-list" && uniqueSetSummaries.length > 0) {
      return uniqueSetSummaries.join(" | ");
    }

    if (displayKind === "condensed-session" && uniqueSetSummaries.length > 0) {
      const visibleSummaries = uniqueSetSummaries.slice(0, 3);
      const remainingCount = uniqueSetSummaries.length - visibleSummaries.length;
      return remainingCount > 0
        ? `${visibleSummaries.join(" | ")} | +${remainingCount} more`
        : visibleSummaries.join(" | ");
    }

    return entry.summary?.trim() || entry.value;
  };
  const historyItems = performances.map((entry, index) => {
    const primaryValue = buildHistoryRowValue(entry);
    const normalizedEntryValue = normalizeExerciseInfoComparisonValue(primaryValue);
    const valueParts = primaryValue
      .split("|")
      .map((part) => normalizeExerciseInfoComparisonValue(part))
      .filter(Boolean);
    const isBestEntry = Boolean(
      normalizedBestSummary
      && (normalizedEntryValue === normalizedBestSummary || valueParts.includes(normalizedBestSummary)),
    );
    const tagLabels = [
      index === 0 ? "LAST" : null,
      isBestEntry ? "BEST" : null,
    ].filter((value): value is string => Boolean(value));
    const metaParts = [entry.label];
    if ((entry.displayKind ?? "session-summary") !== "session-summary" && entry.summary?.trim()) {
      const normalizedSummary = normalizeExerciseInfoComparisonValue(entry.summary);
      if (normalizedSummary && normalizedSummary !== normalizedEntryValue) {
        metaParts.push(entry.summary);
      }
    }
    if (entry.context?.trim()) {
      metaParts.push(entry.context);
    }

    return {
      id: `history-${entry.sessionId}-${index}`,
      primary: primaryValue,
      meta: metaParts.join(" | "),
      signals: prHistoryDates.has(entry.label) ? ("pr" as const) : undefined,
      tagLabels,
      layout: "single-column" as const,
    };
  });

  if (historyItems.length === 0 && prHistorySection?.items.length) {
    return (
      <div className={cn(appTokens.detailHistoryRow, "px-2 py-2")}>
        <div className="w-full">
          <DetailSectionItems items={prHistorySection.items} className="pl-0.5" showBullets={false} />
        </div>
      </div>
    );
  }

  if (historyItems.length === 0 && stats.prCount > 0) {
    return (
      <div className={cn(appTokens.detailHistoryRow, "px-2 py-2")}>
        <div className="w-full">
          <DetailSectionItems
            items={[{
              id: "history-pr-fallback",
              primary: stats.prCount === 1 ? "1 PR recorded in scoped history." : `${stats.prCount} PRs recorded in scoped history.`,
              meta: stats.prLabel?.trim() || null,
              signals: "pr",
              layout: "single-column",
            }]}
            className="pl-0.5"
            showBullets={false}
          />
        </div>
      </div>
    );
  }

  if (historyItems.length === 0) {
    return <p className={appTokens.detailBodyMutedText}>No logged history for this scope yet.</p>;
  }

  return (
    <div className={cn(appTokens.detailHistoryRow, "px-2 py-2")}>
      <div
        className={cn(
          "w-full",
          historyItems.length > HISTORY_VISIBLE_ROW_COUNT ? "max-h-[30rem] overflow-y-auto pr-1" : undefined,
        )}
      >
        <DetailSectionItems items={historyItems} className="pl-0.5" showBullets={false} />
      </div>
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
        value: getDetailSectionItemText(section.items[0]!),
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
          value: getDetailSectionItemText(section.items[0]!),
        })),
        ...(prSection && prSection.items.length === 1 ? [{ label: prSection.title, value: getDetailSectionItemText(prSection.items[0]!) }] : []),
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
            value: getDetailSectionItemText(section.items[0]!),
          })),
          ...(prSection && prSection.items.length === 1 ? [{ label: prSection.title, value: getDetailSectionItemText(prSection.items[0]!) }] : []),
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

function ExerciseInfoProgressionPanel({
  progression,
  excludedMetricKeys = [],
  analyticsScope,
  activeRoutineTitle,
  onScopeClick,
  resyncActive = false,
}: {
  progression: ExerciseProgressionLifelineSummary;
  excludedMetricKeys?: string[];
  analyticsScope: ExerciseInfoAnalyticsScope;
  activeRoutineTitle?: string | null;
  onScopeClick: (section: ExerciseInfoSectionScopeKey) => void;
  resyncActive?: boolean;
}) {
  const usedMetricKeys = new Set(excludedMetricKeys.map((key) => normalizeMetricKey(key)));
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
  if (
    metrics.length === 0
    && (progression.activityDays?.length ?? 0) === 0
    && !progression.latestChangeSummary
    && !progression.recentActivitySummary
    && !progression.lastPromotionAt
  ) {
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
      <ExerciseProgressionActivityPanel
        progression={progression}
        activityTitle={analyticsScope === "current_cycle" ? "Cycle Activity" : "Progression Activity"}
        headingClassName={cn(exerciseInfoSubsectionHeadingClassName, "px-0 pt-0.5")}
        subsectionTitleClassName={exerciseInfoSubsectionTitleClassName}
        renderMetaLine={renderMetricMetaLine}
        metricGridProps={getExerciseInfoMetricGridProps([
          { label: "Promotions", value: "0" },
          { label: "Regressed", value: "0" },
          { label: "Manual", value: "0" },
          { label: "Reverted", value: "0" },
        ])}
        topDividerClassName="mx-1"
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
  const sections: Array<ExerciseInfoReviewSection | null> = [
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
  ];

  return sections.filter((section): section is ExerciseInfoReviewSection => section !== null);
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
  resyncActive = false,
}: {
  analyticsScope: ExerciseInfoAnalyticsScope;
  activeRoutineTitle?: string | null;
  derivedProgression?: ExerciseInfoSheetStats["progressionDerived"];
  onScopeClick: (section: ExerciseInfoSectionScopeKey) => void;
  resyncActive?: boolean;
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
        resyncActive={resyncActive}
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
  const [selectedHistoryPointId, setSelectedHistoryPointId] = useState<string | null>(null);
  const canonicalExerciseId = exercise ? (exercise.exercise_id ?? exercise.id) : null;
  useBodyScrollLock(open && !inline);

  useEffect(() => {
    if (!open) {
      setSectionScopeOverrides({});
      setSelectedHistoryPointId(null);
    }
  }, [open]);

  useEffect(() => {
    setSelectedHistoryPointId(null);
  }, [analyticsScope, canonicalExerciseId]);

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
    setSelectedHistoryPointId(null);
  }, []);

  const handleSectionScopeToggle = useCallback((section: ExerciseInfoSectionScopeKey) => {
    if (selectedHistoryPointId) {
      setSelectedHistoryPointId(null);
      return;
    }

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
  }, [analyticsScope, getSectionScope, selectedHistoryPointId]);

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

  const isStretchHub = isStretchHubExercise(exercise);
  const stretchPanelContext = sourceContext === "SessionExerciseFocus" ? "session" : "detail";
  const metadata = exercise && !isStretchHub ? buildExerciseInfoMeta(exercise) : [];
  const howToImageSrc = exercise ? getExerciseHowToImageSrc(exercise) : "/exercises/icons/_placeholder.svg";
  const stretchHeroImageSrc = howToImageSrc.includes("/placeholders/") ? STRETCH_HUB_HERO_SRC : howToImageSrc;
  const activeRoutineTitle = statsByScope.current_routine?.activeRoutineTitle ?? statsByScope.all_time?.activeRoutineTitle ?? null;
  const activeScopeLabel = getExerciseInfoAnalyticsScopeDisplayLabel(analyticsScope, activeRoutineTitle);
  const scopeResyncActive = hasUnsyncedSections || Boolean(selectedHistoryPointId);
  const detailHeader = (
    <div className="sticky top-[calc(max(var(--app-safe-top),var(--vv-top,0px))+0.25rem)] z-30">
      <div className="pointer-events-none absolute inset-x-0 inset-y-0 z-10 flex items-center justify-start px-2">
        <div className="pointer-events-auto">
          <PillButton
            active
            className={cn(exerciseInfoScopeChipClassName, "max-w-[9.6rem] whitespace-normal text-center leading-[1.05]")}
            aria-label={scopeResyncActive ? "Re-sync analytics scope" : "Toggle analytics scope"}
            onClick={() => {
              if (scopeResyncActive) {
                handleScopeResync();
                return;
              }
              onAnalyticsScopeChange(getNextExerciseInfoAnalyticsScope(analyticsScope));
            }}
          >
            {scopeResyncActive ? "Re-sync" : activeScopeLabel}
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
  const historySectionState = getSectionStats("history");

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
  const historyState = getExerciseInfoProgressState(historySectionState.stats);
  const selectedHistoryPoint = selectedHistoryPointId
    ? historyState.historyPoints.find((point) => point.id === selectedHistoryPointId) ?? null
    : null;
  const graphSelectionActive = Boolean(selectedHistoryPoint);
  const selectedPointMetrics = selectedHistoryPoint ? buildHistoryPointMetrics(selectedHistoryPoint) : [];
  const displayedSurfaceMetrics = graphSelectionActive ? selectedPointMetrics : surfaceMetrics;
  const displayedPerformanceMetrics = graphSelectionActive ? selectedPointMetrics : performanceMetrics;
  const displayedProgressMetrics = graphSelectionActive
    ? filterUniqueMetricItems([
        { label: "Selected", value: selectedHistoryPoint!.summary },
        ...(selectedHistoryPoint!.meta ? [{ label: "Context", value: selectedHistoryPoint!.meta }] : []),
      ])
    : progressMetrics;
  const progression = progressionSectionState.stats?.progression ?? null;
  const derivedProgression = progressionSectionState.stats?.progressionDerived ?? null;
  const hasPerformancePanel = graphSelectionActive || (!performanceSectionState.loading && performanceMetrics.length > 0);
  const hasProgressPanel = graphSelectionActive || progressSectionState.loading || progressMetrics.length > 0 || reviewSections.length > 0;
  const hasCombinedPerformanceProgressPanel = hasPerformancePanel || hasProgressPanel;
  const hasProgressionLoadingPanel = progressionSectionState.loading;
  const hasProgressionPanel = Boolean(progression);
  const hasProgressionEmptyPanel = !progressionSectionState.loading && !progression && Boolean(progressionSectionState.stats);
  const hasHistoryPanel = historySectionState.loading || Boolean(historySectionState.stats);

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
                          resyncActive={graphSelectionActive}
                        />
                        {statsSectionState.loading ? <ExerciseInfoLoadingMetrics /> : null}
                        {!statsSectionState.loading && statsSectionState.stats ? (
                          <ExerciseSurfaceMetricGrid
                            items={displayedSurfaceMetrics}
                            {...getExerciseInfoMetricGridProps(displayedSurfaceMetrics)}
                          />
                        ) : null}
                        {!statsSectionState.loading && !statsSectionState.stats ? (
                          <p className={appTokens.detailBodyMutedText}>
                            No stats yet. Log a set to generate performance history for this exercise.
                          </p>
                        ) : null}
                      </div>
                    </AppPanel>

                    {hasHistoryPanel ? (
                      <AppPanel className={cn(appTokens.detailSection, "space-y-1.5 p-2")}>
                        <ExerciseInfoSectionHeader
                          title="History"
                          section="history"
                          analyticsScope={historySectionState.scope}
                          activeRoutineTitle={activeRoutineTitle}
                          onScopeClick={handleSectionScopeToggle}
                          resyncActive={graphSelectionActive}
                        />
                        {historySectionState.loading ? <ExerciseInfoLoadingRows /> : historySectionState.stats ? (
                          <ExerciseInfoHistoryList
                            stats={historySectionState.stats}
                            selectedPointId={selectedHistoryPoint?.id ?? null}
                            onSelectedPointChange={setSelectedHistoryPointId}
                          />
                        ) : null}
                      </AppPanel>
                    ) : null}

                    {hasCombinedPerformanceProgressPanel ? (
                      <AppPanel className={cn(appTokens.detailSection, "space-y-2 p-2")}>
                        {hasPerformancePanel ? (
                          <>
                            <ExerciseInfoSectionHeader
                              title="Performance"
                              section="performance"
                              analyticsScope={performanceSectionState.scope}
                              activeRoutineTitle={activeRoutineTitle}
                              onScopeClick={handleSectionScopeToggle}
                              resyncActive={graphSelectionActive}
                            />
                            <ExerciseSurfaceMetricGrid items={displayedPerformanceMetrics} {...getExerciseInfoMetricGridProps(displayedPerformanceMetrics)} />
                          </>
                        ) : null}
                        {hasPerformancePanel && hasProgressPanel ? <MetricAccentBar variant="thin" className="mx-1" /> : null}
                        {hasProgressPanel ? (
                          <>
                            <ExerciseInfoSectionHeader
                              title="Progress"
                              section="progress"
                              analyticsScope={progressSectionState.scope}
                              activeRoutineTitle={activeRoutineTitle}
                              onScopeClick={handleSectionScopeToggle}
                              resyncActive={graphSelectionActive}
                            />
                            {progressSectionState.loading ? <ExerciseInfoLoadingRows /> : <ExerciseInfoProgressReview metrics={displayedProgressMetrics} sections={graphSelectionActive ? [] : reviewSections} />}
                          </>
                        ) : null}
                      </AppPanel>
                    ) : null}

                    {hasProgressionLoadingPanel ? (
                      <AppPanel className={cn(appTokens.detailSection, "space-y-2 p-2")}>
                        <ExerciseInfoSectionHeader
                          title="Progression"
                          section="progression"
                          analyticsScope={progressionSectionState.scope}
                          activeRoutineTitle={activeRoutineTitle}
                          onScopeClick={handleSectionScopeToggle}
                          resyncActive={graphSelectionActive}
                        />
                        <ExerciseInfoLoadingRows />
                      </AppPanel>
                    ) : hasProgressionPanel ? (
                      <ExerciseInfoProgressionPanel
                        progression={progression!}
                        excludedMetricKeys={[...usedMetricKeys]}
                        analyticsScope={progressionSectionState.scope}
                        activeRoutineTitle={activeRoutineTitle}
                        onScopeClick={handleSectionScopeToggle}
                        resyncActive={graphSelectionActive}
                      />
                    ) : hasProgressionEmptyPanel ? (
                      <ExerciseInfoProgressionEmptyPanel
                        analyticsScope={progressionSectionState.scope}
                        activeRoutineTitle={activeRoutineTitle}
                        derivedProgression={derivedProgression}
                        onScopeClick={handleSectionScopeToggle}
                        resyncActive={graphSelectionActive}
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
