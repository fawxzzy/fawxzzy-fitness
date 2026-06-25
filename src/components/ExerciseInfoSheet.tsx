"use client";

import { Fragment, type ReactNode, useCallback, useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { DetailHeader } from "@/components/DetailSurface";
import { ExerciseAssetImage } from "@/components/ExerciseAssetImage";
import { ExerciseSurfaceMetricGrid } from "@/components/exercises/ExerciseSurfaceMetricGrid";
import { ContentRail } from "@/components/layout/ContentRail";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import {
  BottomActionUtilityCluster,
  BOTTOM_ACTION_SHELL_CLASSNAME,
  BOTTOM_ACTION_SURFACE_OUTER_CLASSNAME,
} from "@/components/layout/CanonicalBottomActions";
import {
  SHARED_OVERLAY_PANEL_BREAKOUT_WIDTH_CLASS_NAME,
  SHARED_OVERLAY_PANEL_COMPACT_VIEWPORT_CLASS_NAME,
  SHARED_OVERLAY_PANEL_MAX_WIDTH_CLASS_NAME,
} from "@/components/ui/app/overlayPanelTokens";
import { ACTION_CHROME_CONTROL_CLASS_NAME, ACTION_CHROME_SEGMENTED_CLASS_NAME } from "@/components/ui/actionChrome";
import { ChevronRightIcon } from "@/components/ui/Chevrons";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { appTokens } from "@/components/ui/app/tokens";
import { FilterToggleButton } from "@/components/ui/FilterToggleButton";
import { DetailSectionBlock, DetailSectionBlocks, DetailSectionItems, type DetailSectionListItem, type DetailSectionListItemInput } from "@/components/ui/DetailSectionList";
import { FilterScrollPanel } from "@/components/ui/FilterScrollPanel";
import { HorizontalScrollHint } from "@/components/ui/HorizontalScrollHint";
import { MetricAccentBar, type MetricDatum } from "@/components/ui/MetricItem";
import { Pill, PillButton } from "@/components/ui/Pill";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { VerticalScrollHint } from "@/components/ui/VerticalScrollHint";
import { StretchLibraryPanel } from "@/components/stretch/StretchLibraryPanel";
import { Glass } from "@/components/ui/Glass";
import { cn } from "@/lib/cn";
import { formatCalories, formatDistance, formatDurationShort } from "@/lib/exercise-stats-formatting";
import { formatDateShort } from "@/lib/formatting";
import {
  createDefaultExerciseInfoFilterState,
  normalizeExerciseInfoFilterState,
  type ExerciseInfoAnalyticsScope,
  type ExerciseInfoFilterOptions,
  type ExerciseInfoFilterState,
  type ExerciseInfoRoutineFilterOption,
  type ExerciseInfoSectionScopeKey,
} from "@/lib/exercise-info-scope";
import type { HistoryGraphMetricKey } from "@/lib/exercise-info-history-axis";
import { buildHistoryDayBandLayout, buildHistoryValueGridTicks, resolveHistorySetPlotY, resolveHistorySetSlotX } from "@/lib/exercise-info-history-layout";
import { buildHistoryPointComparisonMetric } from "@/lib/exercise-info-history-metrics";
import { getExerciseHowToImageSrc } from "@/lib/exerciseImages";
import type { ExerciseHistoryDayGroup, ExerciseHistoryPoint } from "@/lib/exercise-info";
import { buildExerciseInfoSurfaceMetrics, type ExerciseInfoReviewSection } from "@/lib/exercise-info-presentation";
import { getRecoveryExerciseFallbackDescription } from "@/lib/exercise-metadata";
import type { ExerciseProgressionLifelineSummary } from "@/lib/progression-lifeline-summary";
import { STRETCH_HUB_GUIDE_COPY, STRETCH_HUB_HERO_SRC, isStretchHubExercise } from "@/lib/stretch-library";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import {
  dispatchFitnessOverlayExclusiveOpen,
  FITNESS_OVERLAY_EXCLUSIVE_OPEN_EVENT,
  type FitnessOverlayExclusiveDetail,
} from "@/lib/fitness-overlay-mutual-exclusion";

const exerciseInfoBorderlessPanelClassName = "![border-width:0] !bg-transparent !shadow-none";
const exerciseInfoBorderlessHistoryRowClassName = "![border-width:0]";

function toTitleCase(value: string) {
  return value.replace(/\b([a-z])/g, (match) => match.toUpperCase());
}

function normalizeExerciseInfoTagValue(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");
}

export type ExerciseInfoSheetExercise = {
  id: string;
  exercise_id?: string | null;
  name: string;
  primary_muscle: string | null;
  primary_muscles?: string[] | null;
  secondary_muscles?: string[] | null;
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
  filterOptions?: ExerciseInfoFilterOptions;
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
    graphMetricKey?: HistoryGraphMetricKey;
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
    graphMetricKey: progress?.graphMetricKey,
    performances,
    historyGroups,
    historyPoints,
  };
}

function normalizeMetricKey(label: string | null | undefined) {
  return String(label ?? "").trim().toLowerCase();
}

function isThirtyDayFrequencyMetric(item: MetricDatum) {
  const label = normalizeMetricKey(item.label).replace(/\s+/g, " ");
  const timeframe = normalizeMetricKey(item.timeframe).replace(/\s+/g, " ");

  return label === "30d"
    || label === "30 days"
    || label === "30d frequency"
    || label === "30 day frequency"
    || label === "30-day frequency"
    || (label.includes("frequency") && label.includes("30"))
    || timeframe === "30d"
    || timeframe === "30 days"
    || timeframe.includes("recent window")
    || (timeframe.includes("30") && timeframe.includes("day"));
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
  return Array.from(new Set([
    exercise.equipment ? toTitleCase(exercise.equipment) : null,
    exercise.movement_pattern ? toTitleCase(exercise.movement_pattern) : null,
  ].filter((item): item is string => Boolean(item))));
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
    <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 px-[3.15rem] pt-[5px] text-center text-[11px] font-medium leading-[1.15] text-[rgb(var(--text-secondary)/0.84)]">
      {items.map((item, index) => (
        <div key={`${item}-${index}`} className="flex min-w-0 max-w-full items-center gap-2">
          {index > 0 ? <SignatureMiniPipe /> : null}
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
          {index > 0 ? <SignatureMiniPipe /> : null}
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
  return compactProgressionMetricValue(value).toLowerCase().replace(/\s+/g, " ").trim();
}

const exerciseInfoSectionTitleClassName = "px-0 pt-0.5 text-[1.18rem] text-[rgb(var(--accent-divider-rgb)/0.96)]";
const exerciseInfoSubsectionTitleClassName = "text-[rgb(var(--accent-divider-rgb)/0.92)]";
const exerciseInfoHeaderTitleClassName = "px-[3.45rem] pt-[5px] text-[1.02rem] leading-[1.12] text-[rgb(var(--accent-divider-rgb)/0.98)]";
const exerciseInfoSectionTitleStyle = { color: "rgb(var(--accent-divider-rgb) / 0.96)" } as const;
const exerciseInfoHeaderTitleStyle = { color: "rgb(var(--accent-divider-rgb) / 0.98)" } as const;
const exerciseInfoTightLabelSlotClassName = "min-h-[1.45rem]";
const exerciseInfoDenseLabelClassName = "text-[9px] tracking-[0.11em]";
const exerciseInfoSubsectionHeadingClassName = "px-2 text-center text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-divider-rgb)/0.92)]";
const exerciseInfoFilterCompactSectionStackClassName = "space-y-1";
const exerciseInfoFilterCompactHeaderWrapClassName = "w-fit max-w-full space-y-[2px] pl-[4px] pt-[2px]";
const exerciseInfoFilterCompactRailClassName = "hide-scrollbar -mx-1 max-w-none overflow-x-auto overflow-y-visible px-1 pb-0.5 [touch-action:pan-x] [-webkit-overflow-scrolling:touch] [overscroll-behavior-y:auto]";
const exerciseInfoFilterCompactRailTopPaddingClassName = "pt-0";
const exerciseInfoStripCardClassName = "rounded-[1.35rem] border border-[rgb(var(--border-strong)/0.16)] bg-[linear-gradient(180deg,rgb(var(--surface-1-rgb)/0.24),rgb(var(--surface-1-rgb)/0.12))] shadow-none";

type ExerciseInfoMetricGridVariant = "default" | "progression";

function getCompactMetricArrowToneClassName(value: string) {
  const normalized = value.toLowerCase();
  const transitionMatch = normalized.match(/(.+?)(?:->|→|â†’|Ã¢â€ â€™)(.+)/);
  if (transitionMatch) {
    const leftScore = (transitionMatch[1].match(/-?\d+(?:\.\d+)?/g) ?? []).reduce((sum, part) => sum + Number(part), 0);
    const rightScore = (transitionMatch[2].match(/-?\d+(?:\.\d+)?/g) ?? []).reduce((sum, part) => sum + Number(part), 0);
    if (Number.isFinite(leftScore) && Number.isFinite(rightScore) && rightScore !== leftScore) {
      return rightScore > leftScore ? "text-[rgb(var(--success-rgb)/0.94)]" : "text-[rgb(255,116,116)]";
    }
  }

  if (/\b(matched|match|same|flat|steady|held|no change)\b/.test(normalized)) {
    return "text-[rgb(var(--accent-yellow-on)/0.96)]";
  }

  if (/\b(reduced|removed|regression|regressed|revert|reverted|deload|decreased|down|below|slipped)\b/.test(normalized)) {
    return "text-[rgb(255,116,116)]";
  }

  if (/\b(increased|added|promotion|promoted|improved|up|new best|pr)\b/.test(normalized)) {
    return "text-[rgb(var(--success-rgb)/0.94)]";
  }

  return "text-[rgb(var(--text-primary)/0.95)]";
}

function buildCompactMetricValueNode(value: string) {
  const normalized = String(value)
    .replaceAll("ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢", "•")
    .replaceAll("Ã¢â‚¬Â¢", "•")
    .trim();
  const hasDivider = /\s+\|\s+|\s+\u2022\s+/.test(normalized);
  const hasTransition = /(?:->|\u2192)/.test(normalized);
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
        "inline-flex min-w-0 max-w-full items-center justify-center gap-x-2 gap-y-1 [text-wrap:pretty]",
        hasDivider && hasTransition
          ? "flex-wrap whitespace-normal"
          : normalized.length <= 24
            ? "flex-nowrap whitespace-nowrap"
            : "flex-wrap whitespace-normal",
      )}
    >
      {tokens.map((part, index) => {
        if (part === "|" || part === "•") {
          return <SignatureMiniPipe key={`pipe-${index}`} />;
        }

        if (part.includes("→") || part.includes("->") || part.includes("â†’") || part.includes("Ã¢â€ â€™")) {
          const arrowParts = part.split(/(?:→|->|â†’|Ã¢â€ â€™)/);
          return (
            <span key={`${part}-${index}`} className="inline-flex min-w-0 max-w-full flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
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
    accentBarVariant: variant === "progression" ? "none" as const : undefined,
    autoColumns: true as const,
    scrollable: false,
  };
}

function ExerciseInfoSectionHeader({
  title,
  subtitle,
  align = "center",
}: {
  title: string;
  subtitle?: string | null;
  align?: "start" | "center";
  section?: ExerciseInfoSectionScopeKey;
  analyticsScope?: ExerciseInfoAnalyticsScope;
  activeRoutineTitle?: string | null;
  onScopeClick?: (section: ExerciseInfoSectionScopeKey) => void;
  resyncActive?: boolean;
}) {
  return (
    <div className={cn(
      "flex min-h-[2.1rem] flex-col justify-center gap-0.5",
      align === "center" ? "items-center text-center" : "items-start text-left",
    )}>
      <div className={cn("flex w-full", align === "center" ? "justify-center" : "justify-start")}>
        <div className={cn("flex max-w-full flex-col gap-1", align === "center" ? "items-center text-center" : "items-start text-left")}>
          <h3 className={cn(appTokens.detailSectionTitle, exerciseInfoSectionTitleClassName)} style={exerciseInfoSectionTitleStyle}>
            {title}
          </h3>
          <MetricAccentBar variant="thin" className="w-full max-w-full opacity-85" />
        </div>
      </div>
      {subtitle ? (
        <p className={cn(
          "text-[10px] font-medium uppercase tracking-[0.12em] text-[rgb(var(--text-secondary)/0.7)]",
          align === "center" ? "px-2 text-center" : "text-left",
        )}>
          {subtitle}
        </p>
      ) : null}
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
    <div className={cn(appTokens.detailMediaCard, "gap-0 overflow-hidden rounded-[1.4rem] border border-[rgb(var(--border-strong)/0.16)] bg-[linear-gradient(180deg,rgb(var(--surface-1-rgb)/0.28),rgb(var(--surface-1-rgb)/0.12))] p-0 shadow-none")}>
      <div className={cn(appTokens.detailMediaFrame, "border-transparent bg-transparent px-2 pt-2 shadow-none")}>
        <ExerciseAssetImage
          src={howToImageSrc}
          alt={`${exercise.name} demonstration`}
          className="h-full w-full"
          preferNaturalAspectRatio
          containerStyle={{ minHeight: "10.6rem", maxHeight: "15.5rem" }}
          imageClassName="object-contain object-center"
          imageStyle={{ padding: "clamp(0.08rem, 0.55vw, 0.22rem)" }}
          sizes="(max-width: 768px) 100vw, 520px"
          priority
        />
      </div>
      <div className="px-3 pb-3 pt-1.5">
        <div className="flex w-full justify-center">
          <div className="flex max-w-full flex-col items-center gap-1 text-center">
            <p className={cn(exerciseInfoSubsectionHeadingClassName, "px-0 pt-0.5 text-center")}>How To</p>
            <MetricAccentBar variant="thin" className="w-full max-w-full opacity-85" />
          </div>
        </div>
      </div>
      {overviewCopy ? (
        <p className={cn(appTokens.detailBodyText, "px-3 pb-3 pt-0 text-center text-[13px] leading-[1.55] [text-wrap:pretty] text-[rgb(var(--text)/0.94)]")}>
          {overviewCopy}
        </p>
      ) : (
        <p className={cn(appTokens.detailBodyMutedText, "px-3 pb-3 pt-0 text-center text-[13px] leading-[1.5]")}>
          Log a few sessions to unlock more specific cues and trends for this exercise.
        </p>
      )}
    </div>
  );
}

function ExerciseInfoSummaryPanel({
  panelId,
  loading,
  metrics,
  subtitle,
  title = "At a Glance",
  className,
  titleVariant = "section",
}: {
  panelId: string;
  loading: boolean;
  metrics: MetricDatum[];
  subtitle?: string | null;
  title?: string;
  className?: string;
  titleVariant?: "section" | "strip";
}) {
  return (
    <div
      id={panelId}
      data-testid="exercise-info-stats-box"
      className={cn(
        "rounded-[1.4rem] border border-[rgb(var(--border-strong)/0.16)] bg-[linear-gradient(180deg,rgb(var(--surface-1-rgb)/0.22),rgb(var(--surface-1-rgb)/0.1))] px-3 py-3 text-xs text-muted",
        className,
      )}
    >
      <div className="space-y-2">
        {titleVariant === "strip" ? (
          <div className="space-y-1 text-center">
            <div className="flex w-full justify-center">
              <div className="flex max-w-full flex-col items-center gap-1 text-center">
                <p className={cn(exerciseInfoSubsectionHeadingClassName, "px-0 text-center text-[0.72rem]")}>{title}</p>
                <MetricAccentBar variant="thin" className="w-full max-w-full opacity-85" />
              </div>
            </div>
            {subtitle ? (
              <p className="px-2 text-center text-[10px] font-medium uppercase tracking-[0.12em] text-[rgb(var(--text-secondary)/0.7)]">
                {subtitle}
              </p>
            ) : null}
          </div>
        ) : (
          <ExerciseInfoSectionHeader title={title} subtitle={subtitle} />
        )}
        {loading ? <ExerciseInfoLoadingMetrics /> : null}
        {!loading && metrics.length > 0 ? (
          <ExerciseSurfaceMetricGrid
            items={metrics}
            {...getExerciseInfoMetricGridProps(metrics)}
          />
        ) : null}
        {!loading && metrics.length === 0 ? (
          <p className={appTokens.detailBodyMutedText}>
            No stats yet. Log a set to generate performance history for this exercise.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function prioritizeExerciseInfoSummaryMetrics(items: MetricDatum[]) {
  const scoreMetric = (item: MetricDatum) => {
    const label = normalizeMetricKey(item.label).replace(/\s+/g, " ");
    const timeframe = normalizeMetricKey(item.timeframe).replace(/\s+/g, " ");
    if (label === "last" || label.includes("last")) return 0;
    if (label === "best" || label.includes("best")) return 1;
    if (label === "sessions" || label.includes("sessions")) return 2;
    if (label === "sets" || label.includes("sets")) return 3;
    if (label === "prs" || label === "prs" || label.includes("pr")) return 4;
    if (label === "30d" || label.includes("30 day") || timeframe.includes("30")) return 5;
    if (label === "current") return 6;
    return 99;
  };

  return [...items]
    .sort((left, right) => {
      const scoreDelta = scoreMetric(left) - scoreMetric(right);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return left.label.localeCompare(right.label);
    })
    .slice(0, 6);
}

function ExerciseInfoStripCard({
  title,
  children,
  className,
  widthClassName = "w-[19rem] min-w-[19rem]",
}: {
  title: string;
  children: ReactNode;
  className?: string;
  widthClassName?: string;
}) {
  return (
    <div className={cn(exerciseInfoStripCardClassName, widthClassName, "shrink-0 px-3 py-3", className)}>
      <div className="space-y-2">
        <div className="flex w-full justify-center">
          <div className="flex max-w-full flex-col items-center gap-1 text-center">
            <p className={cn(exerciseInfoSubsectionHeadingClassName, "px-0 text-center text-[0.72rem]")}>{title}</p>
            <MetricAccentBar variant="thin" className="w-full max-w-full opacity-85" />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function buildHistoryPointMetrics(point: ExerciseHistoryPoint): MetricDatum[] {
  const pointTypeValue = point.type === "progression-event"
    ? (() => {
      const tags = new Set((point.tagLabels ?? []).map((tag) => tag.trim().toUpperCase()));
      if (tags.has("MANUAL")) return "Manual";
      if ((point.signals ?? []).includes("promotion")) return "Promotion";
      if ((point.signals ?? []).includes("regression")) return "Regression";
      if ((point.signals ?? []).includes("watch")) return "Watch";
      return "Update";
    })()
    : point.type === "day"
      ? "Day"
      : "Set";
  if (point.type === "progression-event") {
    return [{ label: "Change", value: pointTypeValue }];
  }
  const orderedValues = point.type === "day"
    ? [
        ...point.values.filter((value) => value.label === "Promotions"),
        ...point.values.filter((value) => value.label === "Regressions"),
        ...point.values.filter((value) => value.label === "Manual"),
        ...point.values.filter((value) => !["Promotions", "Regressions", "Manual", "Updates"].includes(value.label)),
      ]
    : point.values.filter((value) => value.label !== "Updates");
  const normalizedValues = orderedValues.map((value) => ({
    label: value.label === "Top" ? "Top Set" : value.label,
    value: value.value,
  }));
  const metrics = normalizedValues;

  return filterUniqueMetricItems(metrics).slice(0, 8);
}

function buildSelectedHistoryPointStatsSubtitle(point: ExerciseHistoryPoint | null) {
  if (!point) {
    return null;
  }

  if (point.type === "day") {
    return `Selected day | ${point.label}`;
  }

  if (point.type === "set") {
    return point.meta ? `Selected set | ${point.label} | ${point.meta}` : `Selected set | ${point.label}`;
  }

  const tags = new Set((point.tagLabels ?? []).map((tag) => tag.trim().toUpperCase()));
  const changeLabel = tags.has("MANUAL")
    ? "manual change"
    : (point.signals ?? []).includes("promotion")
      ? "promotion"
      : (point.signals ?? []).includes("regression")
        ? "regression"
        : (point.signals ?? []).includes("watch")
          ? "watch"
          : "update";
  return `Selected ${changeLabel} | ${point.label}`;
}

function buildExerciseInfoHistoryRangeLabel(stats: ExerciseInfoSheetStats | null | undefined) {
  const historyGroups = getExerciseInfoProgressState(stats).historyGroups;
  const dayKeys = historyGroups
    .map((group) => group.dayKey)
    .filter((dayKey, index, values) => dayKey.length > 0 && values.indexOf(dayKey) === index)
    .sort();

  if (dayKeys.length === 0) {
    return null;
  }

  const startDayKey = dayKeys[0]!;
  const endDayKey = dayKeys[dayKeys.length - 1]!;
  const startLabel = formatDateShort(`${startDayKey}T12:00:00.000Z`);
  const endLabel = formatDateShort(`${endDayKey}T12:00:00.000Z`);

  return startDayKey === endDayKey ? startLabel : `${startLabel} - ${endLabel}`;
}

function getHistoryChangeSignal(point: ExerciseHistoryPoint): "promotion" | "regression" | "watch" {
  const signals = point.signals ?? [];
  if (signals.includes("promotion")) return "promotion";
  if (signals.includes("regression")) return "regression";
  if (signals.includes("watch")) return "watch";
  return "watch";
}

function getHistoryChangePointFill(signal: "promotion" | "regression" | "watch") {
  if (signal === "promotion") return "rgb(var(--success-rgb) / 0.94)";
  if (signal === "regression") return "rgb(255 116 116 / 0.94)";
  return "rgb(var(--accent-yellow-on) / 0.95)";
}

function getOrderedHistoryGraphPoints(points: ExerciseHistoryPoint[]) {
  return points
    .filter((point) => Number.isFinite(Date.parse(point.performedAt)))
    .sort((left, right) => {
      if (left.performedAt !== right.performedAt) return left.performedAt.localeCompare(right.performedAt);
      return left.id.localeCompare(right.id);
    });
}

function getAdjacentHistoryGraphPointId(points: ExerciseHistoryPoint[], selectedPointId: string | null, direction: -1 | 1) {
  if (!selectedPointId) {
    return null;
  }

  const orderedPoints = getOrderedHistoryGraphPoints(points);
  if (orderedPoints.length < 2) {
    return null;
  }

  const selectedIndex = orderedPoints.findIndex((point) => point.id === selectedPointId);
  if (selectedIndex < 0) {
    return null;
  }

  const nextIndex = direction < 0
    ? selectedIndex > 0 ? selectedIndex - 1 : orderedPoints.length - 1
    : selectedIndex < orderedPoints.length - 1 ? selectedIndex + 1 : 0;

  return orderedPoints[nextIndex]?.id ?? null;
}

function buildSunPath(cx: number, cy: number, outerRadius: number, innerRadius: number, points = 10) {
  const commands: string[] = [];
  const total = points * 2;

  for (let index = 0; index < total; index += 1) {
    const angle = (-Math.PI / 2) + ((Math.PI * 2 * index) / total);
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const x = cx + (Math.cos(angle) * radius);
    const y = cy + (Math.sin(angle) * radius);
    commands.push(`${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }

  return `${commands.join(" ")} Z`;
}

function formatHistoryChartNumber(value: number) {
  if (Math.abs(value) >= 100) {
    return String(Math.round(value));
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function getFallbackHistoryGraphMetricKey(stats: ExerciseInfoSheetStats, points: ExerciseHistoryPoint[]): HistoryGraphMetricKey {
  if (stats.kind === "cardio") {
    if ((stats.recent.lastDurationSeconds ?? 0) > 0) {
      return "time";
    }

    if ((stats.recent.lastDistance ?? 0) > 0) {
      return "distance";
    }

    if ((stats.recent.lastCalories ?? 0) > 0) {
      return "calories";
    }
  } else if ((stats.bests.bestWeight ?? 0) > 0) {
    return "weight";
  }

  const orderedPoints = [...points].sort((left, right) => {
    if (left.performedAt !== right.performedAt) {
      return right.performedAt.localeCompare(left.performedAt);
    }

    return right.id.localeCompare(left.id);
  });

  for (const point of orderedPoints) {
    const labels = new Set(point.values.map((value) => value.label));
    if (labels.has("Time")) return "time";
    if (labels.has("Distance")) return "distance";
    if (labels.has("Calories")) return "calories";
    if (labels.has("Weight")) return "weight";
    if (labels.has("Reps")) return "reps";
  }

  return stats.kind === "cardio" ? "time" : "reps";
}

function readHistoryPointMetricNumericValue(point: ExerciseHistoryPoint, metricKey: HistoryGraphMetricKey) {
  const primaryLabel = metricKey === "weight"
    ? "Weight"
    : metricKey === "reps"
      ? "Reps"
      : metricKey === "distance"
        ? "Distance"
        : metricKey === "calories"
          ? "Calories"
          : "Time";
  const fallbackLabel = metricKey === "weight"
    ? "Reps"
    : metricKey === "reps"
      ? "Weight"
      : metricKey === "distance"
        ? "Time"
        : metricKey === "calories"
          ? "Distance"
          : "Distance";
  const primary = point.values.find((value) => value.label === primaryLabel)?.numericValue;
  const fallback = point.values.find((value) => value.label === fallbackLabel)?.numericValue;
  const numericValue = typeof primary === "number" && Number.isFinite(primary)
    ? primary
    : typeof fallback === "number" && Number.isFinite(fallback)
      ? fallback
      : point.numericValue;

  return typeof numericValue === "number" && Number.isFinite(numericValue) ? numericValue : null;
}

function getHistoryChartValueSuffix(points: ExerciseHistoryPoint[], metricKey: HistoryGraphMetricKey) {
  if (metricKey === "time") {
    return "";
  }

  if (metricKey === "calories") {
    return " cal";
  }

  if (metricKey === "reps") {
    return " reps";
  }

  for (const point of points) {
    const pointMetricValue = readHistoryPointMetricNumericValue(point, metricKey);
    if (typeof pointMetricValue !== "number" || !Number.isFinite(pointMetricValue)) {
      continue;
    }

    for (const part of point.values) {
      const matchesMetric = metricKey === "weight"
        ? part.label === "Weight"
        : metricKey === "distance"
          ? part.label === "Distance"
          : true;
      if (!matchesMetric) {
        continue;
      }

      const numericMatch = part.value.trim().match(/^(-?\d+(?:\.\d+)?)(.*)$/);
      const parsedValue = numericMatch ? Number(numericMatch[1]) : NaN;
      if (
        numericMatch
        && Number.isFinite(parsedValue)
        && Math.abs(parsedValue - pointMetricValue) < 0.001
        && numericMatch[2]?.trim()
      ) {
        return ` ${numericMatch[2].trim()}`;
      }
    }
  }

  return "";
}

function formatHistoryChartAxisValue(value: number, metricKey: HistoryGraphMetricKey, tickSuffix: string) {
  if (metricKey === "time") {
    return formatDurationShort(value) ?? `${Math.round(value)}s`;
  }

  if (metricKey === "distance") {
    return formatDistance(value, tickSuffix.trim() || null) ?? `${formatHistoryChartNumber(value)}${tickSuffix}`;
  }

  if (metricKey === "calories") {
    return formatCalories(value) ?? `${formatHistoryChartNumber(value)}${tickSuffix}`;
  }

  return `${formatHistoryChartNumber(value)}${tickSuffix}`;
}

function selectHistoryAxisDayKeys(dayKeys: string[], maxGridLines = 5) {
  if (dayKeys.length <= maxGridLines) {
    return dayKeys;
  }

  const selected = new Set<string>();
  selected.add(dayKeys[0]!);
  selected.add(dayKeys[dayKeys.length - 1]!);

  const interiorCount = Math.max(maxGridLines - 2, 1);
  for (let index = 1; index <= interiorCount; index += 1) {
    const dayIndex = Math.round((index * (dayKeys.length - 1)) / (interiorCount + 1));
    const dayKey = dayKeys[dayIndex];
    if (dayKey) {
      selected.add(dayKey);
    }
  }

  return dayKeys.filter((dayKey) => selected.has(dayKey));
}

function selectHistoryAxisNumericTickValues(values: number[], maxLabels = 5) {
  if (values.length <= maxLabels) {
    return values;
  }

  const selected = new Set<number>();
  selected.add(values[0]!);
  selected.add(values[values.length - 1]!);

  const interiorCount = Math.max(maxLabels - 2, 1);
  for (let index = 1; index <= interiorCount; index += 1) {
    const valueIndex = Math.round((index * (values.length - 1)) / (interiorCount + 1));
    const value = values[valueIndex];
    if (typeof value === "number" && Number.isFinite(value)) {
      selected.add(value);
    }
  }

  return values.filter((value) => selected.has(value));
}

function formatHistoryAxisDayLabel(dayKey: string) {
  const date = new Date(`${dayKey}T12:00:00.000Z`);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function buildHistoryCalendarDayKeys(dayKeys: string[]) {
  const sortedKeys = dayKeys
    .filter((dayKey, index, values) => Boolean(dayKey) && values.indexOf(dayKey) === index)
    .sort();
  const firstDayKey = sortedKeys[0];
  const lastDayKey = sortedKeys.at(-1);
  if (!firstDayKey || !lastDayKey) {
    return [];
  }

  const firstTime = Date.parse(`${firstDayKey}T00:00:00.000Z`);
  const lastTime = Date.parse(`${lastDayKey}T00:00:00.000Z`);
  if (!Number.isFinite(firstTime) || !Number.isFinite(lastTime) || lastTime < firstTime) {
    return sortedKeys;
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const dayCount = Math.round((lastTime - firstTime) / dayMs) + 1;
  if (dayCount > 370) {
    return sortedKeys;
  }

  return Array.from({ length: dayCount }, (_, index) => new Date(firstTime + (index * dayMs)).toISOString().slice(0, 10));
}

type HistoryGraphLegendKind = "set" | "day" | "skipped-day" | "promotion" | "regression" | "manual" | "watch";

function HistoryGraphLegendIcon({ kind }: { kind: HistoryGraphLegendKind }) {
  if (kind === "set") {
    return (
      <svg viewBox="0 0 28 14" className="h-3.5 w-7" aria-hidden="true">
        <line x1="4" x2="24" y1="9" y2="5" stroke="rgb(var(--accent-strong) / 0.78)" strokeWidth="1.35" strokeLinecap="round" />
        <circle cx="7" cy="8.4" r="2" fill="rgb(var(--surface-1-rgb) / 0.96)" stroke="rgb(var(--accent-strong) / 0.9)" strokeWidth="1" />
        <circle cx="21" cy="5.6" r="2" fill="rgb(var(--surface-1-rgb) / 0.96)" stroke="rgb(var(--accent-strong) / 0.9)" strokeWidth="1" />
      </svg>
    );
  }

  if (kind === "day" || kind === "skipped-day") {
    return (
      <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
        <path
          d={buildSunPath(8, 8, 4.2, 2.7)}
          fill={kind === "skipped-day" ? "rgb(var(--accent-yellow-on) / 0.96)" : "rgb(var(--text-primary) / 0.9)"}
          stroke="rgb(var(--accent-strong) / 0.92)"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  const fill = kind === "promotion"
    ? getHistoryChangePointFill("promotion")
    : kind === "regression"
      ? getHistoryChangePointFill("regression")
      : kind === "watch"
        ? getHistoryChangePointFill("watch")
      : getHistoryChangePointFill("watch");

  return (
    <span
      aria-hidden="true"
      className="block h-1.5 w-1.5 rounded-full"
      style={{ backgroundColor: fill }}
    />
  );
}

function HistoryGraphLegend({
  items,
}: {
  items: Array<{ kind: HistoryGraphLegendKind; label: string }>;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-[0.9rem] border border-[rgb(var(--accent-strong)/0.34)] bg-[rgb(var(--surface-1-rgb)/0.14)] px-2.5 py-2">
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {items.map((item) => (
          <div key={item.kind} className="flex min-w-0 items-start gap-2">
            <span className="flex h-5 w-8 shrink-0 items-center justify-center pt-[1px]">
              <HistoryGraphLegendIcon kind={item.kind} />
            </span>
            <span className="min-w-0 whitespace-normal break-words text-[0.68rem] font-semibold uppercase leading-[1.3] tracking-[0.12em] text-[rgb(var(--text-secondary)/0.84)]">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildHistoryDayTagLabels(group: ExerciseHistoryDayGroup) {
  const signalLabels = (group.signals ?? []).map((signal) => {
    if (signal === "promotion") return "PROMO";
    if (signal === "regression") return "REGRESSION";
    if (signal === "watch") return "WATCH";
    if (signal === "pr") return "PR";
    return null;
  });

  return [...(group.isSkipped ? ["SKIPPED"] : []), ...(group.tagLabels ?? []), ...signalLabels]
    .filter((label, index, labels): label is string => Boolean(label) && labels.indexOf(label) === index);
}

function formatHistoryDayPrimaryLabel(group: ExerciseHistoryDayGroup, analyticsScope: ExerciseInfoAnalyticsScope) {
  if (analyticsScope !== "all_time") {
    return group.label;
  }

  const routineTitles = (group.routineTitles ?? []).filter((title, index, titles) => title.trim().length > 0 && titles.indexOf(title) === index);
  if (routineTitles.length === 0) {
    return group.label;
  }

  const routinePrefix = routineTitles.length === 1
    ? routineTitles[0]!
    : routineTitles.length === 2
      ? routineTitles.join(" / ")
      : `${routineTitles[0]} +${routineTitles.length - 1}`;

  return `${routinePrefix} | ${group.label}`;
}

function ExerciseHistoryGraph({
  stats,
  points,
  graphMetricKey,
  selectedPointId,
  onSelectedPointChange,
}: {
  stats: ExerciseInfoSheetStats;
  points: ExerciseHistoryPoint[];
  graphMetricKey?: HistoryGraphMetricKey | null;
  selectedPointId: string | null;
  onSelectedPointChange: (pointId: string | null) => void;
}) {
  const orderedPoints = getOrderedHistoryGraphPoints(points);

  if (orderedPoints.length === 0) {
    return null;
  }

  const selectedPoint = orderedPoints.find((point) => point.id === selectedPointId) ?? null;
  const setPoints = orderedPoints.filter((point) => point.type === "set" && !point.isSkipped);
  const dayPoints = orderedPoints.filter((point) => point.type === "day");
  const changePoints = orderedPoints.filter((point) => point.type === "progression-event");
  const resolvedGraphMetricKey = graphMetricKey ?? getFallbackHistoryGraphMetricKey(stats, setPoints);
  const resolvedSetPointValues = setPoints.map((point) => ({
    point,
    graphValue: readHistoryPointMetricNumericValue(point, resolvedGraphMetricKey),
    secondaryReps: readHistoryPointMetricNumericValue(point, "reps"),
  }));
  const numericValues = setPoints
    .map((point) => readHistoryPointMetricNumericValue(point, resolvedGraphMetricKey))
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const primaryLevelsDesc = resolvedGraphMetricKey === "weight"
    ? Array.from(new Set(numericValues.map((value) => Number(value.toFixed(3))))).sort((left, right) => right - left)
    : [];
  const maxSecondaryReps = resolvedGraphMetricKey === "weight"
    ? resolvedSetPointValues.reduce((max, entry) => {
        const reps = entry.secondaryReps;
        return typeof reps === "number" && Number.isFinite(reps) ? Math.max(max, reps) : max;
      }, 0)
    : 0;
  const rawMinValue = numericValues.length > 0 ? Math.min(...numericValues) : 0;
  const rawMaxValue = numericValues.length > 0 ? Math.max(...numericValues) : 1;
  const rawValueRange = Math.max(rawMaxValue - rawMinValue, 1);
  const valuePadding = rawValueRange * 0.14;
  const minValue = rawMinValue - valuePadding;
  const maxValue = rawMaxValue + valuePadding;
  const valueRange = Math.max(maxValue - minValue, 1);
  const startTime = Date.parse(orderedPoints[0]!.performedAt);
  const endTime = Date.parse(orderedPoints[orderedPoints.length - 1]!.performedAt);
  const timeRange = Math.max(endTime - startTime, 1);
  const chartWidth = 500;
  const chartHeight = 392;
  const leftGutter = 42;
  const rightGutter = 6;
  const yAxisX = 1;
  const xAxisY = chartHeight - 1;
  const setLaneTop = 16;
  const setLaneBottom = 284;
  const changeLaneCenterY = 326;
  const dayLaneY = 356;
  const innerWidth = chartWidth - leftGutter - rightGutter;
  const setLaneHeight = setLaneBottom - setLaneTop;
  const dayKeys = Array.from(new Set(orderedPoints.map((point) => point.dayKey).filter(Boolean))).sort();
  const calendarDayKeys = buildHistoryCalendarDayKeys(dayKeys);
  const timelineDayKeys = calendarDayKeys.length > 0 ? calendarDayKeys : dayKeys;
  const setCountsByDay = new Map<string, number>();
  const changeCountsByDay = new Map<string, number>();
  const actualDayKeys = new Set(dayPoints.map((point) => point.dayKey));
  for (const point of setPoints) {
    setCountsByDay.set(point.dayKey, (setCountsByDay.get(point.dayKey) ?? 0) + 1);
  }
  for (const point of changePoints) {
    changeCountsByDay.set(point.dayKey, (changeCountsByDay.get(point.dayKey) ?? 0) + 1);
  }
  const axisDayKeys = selectHistoryAxisDayKeys(
    dayKeys,
    dayKeys.length > 18 ? 4 : 5,
  );
  const { bandByDayKey: dayBandByDayKey, xByDayKey, slotWidthByDayKey: daySlotWidthByDayKey } = buildHistoryDayBandLayout({
    dayKeys: timelineDayKeys,
    actualDayKeys,
    leftGutter,
    innerWidth,
    setCountsByDay,
    changeCountsByDay,
  });
  const setPointsByDay = new Map<string, ExerciseHistoryPoint[]>();
  for (const point of setPoints) {
    const current = setPointsByDay.get(point.dayKey) ?? [];
    current.push(point);
    setPointsByDay.set(point.dayKey, current);
  }
  const xForPoint = (point: ExerciseHistoryPoint) => {
    const dayX = xByDayKey.get(point.dayKey);
    if (typeof dayX === "number") {
      return dayX;
    }

    const timestamp = Date.parse(point.type === "set" ? point.performedAt : `${point.dayKey}T12:00:00.000Z`);
    return orderedPoints.length === 1 ? leftGutter + (innerWidth / 2) : leftGutter + (((timestamp - startTime) / timeRange) * innerWidth);
  };
  const xForSetPoint = (point: ExerciseHistoryPoint) => {
    const baseX = xForPoint(point);
    const sameDayPoints = setPointsByDay.get(point.dayKey) ?? [point];
    const index = Math.max(sameDayPoints.findIndex((sameDayPoint) => sameDayPoint.id === point.id), 0);
    return resolveHistorySetSlotX({
      band: dayBandByDayKey.get(point.dayKey),
      baseX,
      daySlotWidth: daySlotWidthByDayKey.get(point.dayKey),
      pointIndex: index,
      pointsInDay: sameDayPoints.length,
    });
  };
  const eventsByDay = new Map<string, ExerciseHistoryPoint[]>();
  for (const point of changePoints) {
    const current = eventsByDay.get(point.dayKey) ?? [];
    current.push(point);
    eventsByDay.set(point.dayKey, current);
  }
  const plottedSetPoints = resolvedSetPointValues.map(({ point, graphValue, secondaryReps }) => {
    const x = xForSetPoint(point);
    const hasNumericValue = typeof graphValue === "number" && Number.isFinite(graphValue);
    const y = hasNumericValue
      ? resolveHistorySetPlotY({
          metricKey: resolvedGraphMetricKey,
          maxSecondaryReps,
          minValue,
          primaryLevelsDesc,
          primaryValue: graphValue!,
          secondaryReps,
          setLaneHeight,
          setLaneTop,
          valueRange,
        })
      : setLaneBottom;

    return {
      point,
      graphValue,
      x,
      y,
      selected: point.id === selectedPointId,
      leftPercent: (x / chartWidth) * 100,
      topPercent: (y / chartHeight) * 100,
    };
  });
  const plottedDayPoints = dayPoints.map((point) => {
    const x = xForPoint(point);

    return {
      point,
      x,
      y: dayLaneY,
      selected: point.id === selectedPointId,
      leftPercent: (x / chartWidth) * 100,
      topPercent: (dayLaneY / chartHeight) * 100,
    };
  });
  const plottedChangePoints = changePoints.map((point) => {
    const dayEvents = eventsByDay.get(point.dayKey) ?? [point];
    const dayIndex = Math.max(dayEvents.findIndex((eventPoint) => eventPoint.id === point.id), 0);
    const yOffsets = dayEvents.length <= 1 ? [0] : dayEvents.length === 2 ? [-4, 4] : [-6, 0, 6];
    const y = changeLaneCenterY + (yOffsets[Math.min(dayIndex, yOffsets.length - 1)] ?? 0);
    const x = xForPoint(point);

    return {
      point,
      x,
      y,
      selected: point.id === selectedPointId,
      signal: getHistoryChangeSignal(point),
      leftPercent: (x / chartWidth) * 100,
      topPercent: (y / chartHeight) * 100,
    };
  });
  const plottedPoints = [...plottedSetPoints, ...plottedDayPoints, ...plottedChangePoints];
  const selectionActive = Boolean(selectedPointId);
  const selectedPlottedPoint = selectedPointId
    ? plottedPoints.find((point) => point.point.id === selectedPointId) ?? null
    : null;
  const selectedDayKey = selectedPoint?.type === "day" ? selectedPoint.dayKey : null;
  const selectedDayLinePoints = selectedDayKey
    ? (setPointsByDay.get(selectedDayKey) ?? [])
        .map((point) => plottedSetPoints.find((plottedPoint) => plottedPoint.point.id === point.id) ?? null)
        .filter((point): point is NonNullable<(typeof plottedSetPoints)[number]> => Boolean(point && typeof point.graphValue === "number"))
        .map((point) => `${point.x},${point.y}`)
        .join(" ")
    : "";
  const linePoints = plottedSetPoints
    .filter((point) => typeof point.graphValue === "number")
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
  const visibleLegendItems: Array<{ kind: HistoryGraphLegendKind; label: string }> = [
    ...(plottedDayPoints.some(({ point }) => !point.isSkipped) ? [{ kind: "day" as const, label: "Logged days" }] : []),
    ...(plottedDayPoints.some(({ point }) => point.isSkipped) ? [{ kind: "skipped-day" as const, label: "Skipped days" }] : []),
    ...(plottedSetPoints.length > 0 ? [{ kind: "set" as const, label: "Logged sets" }] : []),
    ...(plottedChangePoints.some(({ point }) => (point.signals ?? []).includes("promotion")) ? [{ kind: "promotion" as const, label: "Promotions" }] : []),
    ...(plottedChangePoints.some(({ point }) => (point.signals ?? []).includes("regression")) ? [{ kind: "regression" as const, label: "Regressions" }] : []),
    ...(plottedChangePoints.some(({ point }) => (point.signals ?? []).includes("watch")) ? [{ kind: "watch" as const, label: "Watch" }] : []),
    ...(plottedChangePoints.some(({ point }) => (point.tagLabels ?? []).includes("MANUAL")) ? [{ kind: "manual" as const, label: "Manual changes" }] : []),
  ];
  const yGridTicks = numericValues.length > 0
    ? buildHistoryValueGridTicks({
        metricKey: resolvedGraphMetricKey,
        numericValues,
      })
    : [];
  const labeledTickValues = numericValues.length > 0
    ? resolvedGraphMetricKey === "weight"
      ? selectHistoryAxisNumericTickValues(yGridTicks, 5)
      : Array.from(new Set([rawMaxValue, rawMinValue + ((rawMaxValue - rawMinValue) / 2), rawMinValue].map((value) => Number(value.toFixed(3)))))
    : [];
  const labeledTickSet = new Set(labeledTickValues);
  const weightRepAnchorTicks = resolvedGraphMetricKey === "weight"
    ? (yGridTicks.length > 1 ? yGridTicks.slice(1) : yGridTicks)
    : [];
  const weightRepSubticks = resolvedGraphMetricKey === "weight" && maxSecondaryReps > 1
    ? weightRepAnchorTicks.flatMap((tickValue) => Array.from({ length: Math.max(maxSecondaryReps - 1, 0) }, (_, index) => {
        const repCount = index + 2;
        const y = resolveHistorySetPlotY({
          metricKey: "weight",
          maxSecondaryReps,
          minValue,
          primaryLevelsDesc,
          primaryValue: tickValue,
          secondaryReps: repCount,
          setLaneHeight,
          setLaneTop,
          valueRange,
        });
        return Number.isFinite(y) ? [{
          id: `${tickValue}-${repCount}`,
          repCount,
          y,
        }] : [];
      }).flat())
    : [];
  const tickSuffix = getHistoryChartValueSuffix(setPoints, resolvedGraphMetricKey);
  return (
    <div className="w-full space-y-2 bg-[rgb(var(--surface-2-rgb)/0.14)] pb-2 pt-1.5">
      <div className="relative w-full" style={{ aspectRatio: `${chartWidth} / ${chartHeight}` }}>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-full w-full" aria-hidden="true">
          <rect
            x={yAxisX}
            y={setLaneTop}
            width={chartWidth - yAxisX}
            height={setLaneBottom - setLaneTop}
            fill="rgb(var(--surface-1-rgb) / 0.05)"
            stroke="rgb(var(--border-rgb) / 0.42)"
            strokeWidth="1"
          />
          <line
            x1={yAxisX}
            x2={yAxisX}
            y1={setLaneTop}
            y2={xAxisY}
            stroke="rgb(var(--accent-strong) / 0.9)"
            strokeWidth="1.5"
          />
          <line
            x1={yAxisX}
            x2={chartWidth}
            y1={xAxisY}
            y2={xAxisY}
            stroke="rgb(var(--accent-strong) / 0.9)"
            strokeWidth="1.5"
          />
          {selectedPlottedPoint ? (
            <line
              x1={selectedPlottedPoint.x}
              x2={selectedPlottedPoint.x}
              y1={setLaneTop}
              y2={xAxisY}
              stroke="rgb(var(--accent-strong) / 0.28)"
              strokeWidth="1.15"
              strokeDasharray="4 4"
            />
          ) : null}
          {timelineDayKeys.map((dayKey) => {
            const x = xByDayKey.get(dayKey);
            if (typeof x !== "number") return null;
            return (
              <g key={`day-tick-${dayKey}`}>
                <line
                  x1={x}
                  x2={x}
                  y1={dayLaneY - 4}
                  y2={xAxisY}
                  stroke="rgb(var(--border-rgb) / 0.42)"
                  strokeWidth="1"
                />
                <line
                  x1={x - 1.6}
                  x2={x + 1.4}
                  y1={xAxisY}
                  y2={xAxisY - 4}
                  stroke="rgb(var(--accent-strong) / 0.7)"
                  strokeWidth="0.8"
                  strokeLinecap="round"
                />
              </g>
            );
          })}
          {axisDayKeys.map((dayKey, index) => {
            const x = xByDayKey.get(dayKey);
            if (typeof x !== "number") return null;
            const isFirst = index === 0;
            const isLast = index === axisDayKeys.length - 1;
            const labelX = isFirst ? x + 5 : isLast ? x - 5 : x;
            return (
              <g key={`day-grid-${dayKey}`}>
                <line
                  x1={x}
                  x2={x}
                  y1={setLaneTop}
                  y2={xAxisY}
                  stroke="rgb(var(--border-rgb) / 0.36)"
                  strokeWidth="1"
                />
                <text
                  x={labelX}
                  y={xAxisY - 10}
                  textAnchor={isFirst ? "start" : isLast ? "end" : "middle"}
                  fill="rgb(var(--text-secondary) / 0.64)"
                  fontSize="7.2"
                  fontWeight="600"
                >
                  {formatHistoryAxisDayLabel(dayKey)}
                </text>
              </g>
            );
          })}
          {yGridTicks.map((tickValue) => {
            const y = setLaneTop + ((1 - ((tickValue - minValue) / valueRange)) * setLaneHeight);
            const shouldLabel = labeledTickSet.has(Number(tickValue.toFixed(3)));
            return (
              <g key={`tick-${tickValue}`}>
                <line
                  x1={yAxisX}
                  x2={chartWidth}
                  y1={y}
                  y2={y}
                  stroke={shouldLabel ? "rgb(var(--border-rgb) / 0.42)" : "rgb(var(--border-rgb) / 0.28)"}
                  strokeWidth="1"
                  strokeDasharray={shouldLabel ? undefined : "2 4"}
                />
                <line
                  x1={yAxisX}
                  x2={yAxisX + 4.2}
                  y1={y}
                  y2={y - 1.6}
                  stroke="rgb(var(--accent-strong) / 0.7)"
                  strokeWidth="0.8"
                  strokeLinecap="round"
                />
                {shouldLabel ? (
                  <text
                    x={yAxisX + 5.5}
                    y={y + 2.5}
                    textAnchor="start"
                    fill="rgb(var(--text-secondary) / 0.62)"
                    fontSize="7.5"
                    fontWeight="600"
                  >
                    {formatHistoryChartAxisValue(tickValue, resolvedGraphMetricKey, tickSuffix)}
                  </text>
                ) : null}
              </g>
            );
          })}
          {weightRepSubticks.map((tick) => (
            <line
              key={`rep-subgrid-${tick.id}`}
              x1={yAxisX + 5.5}
              x2={chartWidth}
              y1={tick.y}
              y2={tick.y}
              stroke="rgb(var(--accent-strong) / 0.14)"
              strokeWidth="0.7"
              strokeDasharray="1.5 5"
            />
          ))}
          {weightRepSubticks.map((tick) => (
            <g key={`rep-subtick-${tick.id}`}>
              <line
                x1={yAxisX}
                x2={yAxisX + 4.8}
                y1={tick.y}
                y2={tick.y - 1.7}
                stroke="rgb(var(--accent-strong) / 0.58)"
                strokeWidth="0.82"
                strokeLinecap="round"
              />
            </g>
          ))}
          <line x1={0} x2={chartWidth} y1={changeLaneCenterY} y2={changeLaneCenterY} stroke="rgb(var(--border-rgb) / 0.42)" strokeWidth="1" strokeDasharray="2 6" />
          {linePoints ? (
            <polyline
              fill="none"
              stroke={selectionActive ? "rgb(var(--accent-strong) / 0.38)" : "rgb(var(--accent-strong) / 0.82)"}
              strokeWidth="2.25"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={linePoints}
            />
          ) : null}
          {selectedDayLinePoints ? (
            <polyline
              fill="none"
              stroke="rgb(255 255 255 / 0.92)"
              strokeWidth="2.85"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={selectedDayLinePoints}
            />
          ) : null}
          {plottedSetPoints.map(({ point, x, y, selected }) => (
            <circle
              key={point.id}
              cx={x}
              cy={y}
              r={selected ? 4.1 : 2.55}
              fill={selected
                ? "rgb(var(--accent-strong) / 0.96)"
                : selectionActive
                  ? "rgb(var(--surface-1-rgb) / 0.52)"
                  : "rgb(var(--surface-1-rgb) / 0.96)"}
              stroke={selected
                ? "rgb(var(--accent-strong) / 0.96)"
                : selectionActive
                  ? "rgb(var(--accent-strong) / 0.42)"
                  : "rgb(var(--accent-strong) / 0.9)"}
              strokeWidth={selected ? 1.6 : 1.15}
            />
          ))}
          {plottedChangePoints.map(({ point, x, y, selected, signal }) => (
            <g key={point.id}>
              {selected ? (
                <circle
                  cx={x}
                  cy={y}
                  r={6.6}
                  fill="rgb(var(--surface-1-rgb) / 0.12)"
                  stroke={getHistoryChangePointFill(signal)}
                  strokeWidth="1.4"
                />
              ) : null}
              <circle
                cx={x}
                cy={y}
                r={selected ? 4.1 : selectionActive ? 2.45 : 2.9}
                fill={selected
                  ? getHistoryChangePointFill(signal)
                  : selectionActive
                    ? getHistoryChangePointFill(signal).replace("0.94", "0.45").replace("0.95", "0.45")
                    : getHistoryChangePointFill(signal)}
              />
            </g>
          ))}
          {plottedDayPoints.map(({ point, x, y, selected }) => (
            <path
              key={point.id}
              d={buildSunPath(x, y, selected ? 5.4 : 4.25, selected ? 3.5 : 2.65)}
              fill={point.isSkipped
                ? (selectionActive && !selected ? "rgb(var(--accent-yellow-on) / 0.44)" : "rgb(var(--accent-yellow-on) / 0.96)")
                : (selectionActive && !selected ? "rgb(var(--text-primary) / 0.42)" : "rgb(var(--text-primary) / 0.9)")}
              stroke={selectionActive && !selected ? "rgb(var(--accent-strong) / 0.44)" : "rgb(var(--accent-strong) / 0.92)"}
              strokeWidth={selected ? 1.35 : 1}
              strokeLinejoin="round"
            />
          ))}
        </svg>
        {plottedPoints.map((point) => (
          <button
            key={`hit-${point.point.id}`}
            type="button"
            onClick={() => onSelectedPointChange(point.point.id)}
            className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 appearance-none rounded-full !border-0 !border-transparent !bg-transparent !p-0 !shadow-none outline-none ring-0 [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-strong)/0.34)]"
            style={{
              left: `${point.leftPercent}%`,
              top: `${point.topPercent}%`,
              background: "transparent",
              border: 0,
              boxShadow: "none",
              padding: 0,
            }}
            aria-label={`Select ${point.point.label} history point`}
          />
        ))}
      </div>
      <div className="px-3">
        <HistoryGraphLegend items={visibleLegendItems} />
      </div>
    </div>
  );
}

function ExerciseInfoHistoryList({
  stats,
  analyticsScope,
  selectedPointId,
  onSelectedPointChange,
}: {
  stats: ExerciseInfoSheetStats;
  analyticsScope: ExerciseInfoAnalyticsScope;
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
        .filter((group) => selectedPoint.rowId ? group.rows.length > 0 : true)
    : historyGroups;
  const structuredItems = activeGroups.flatMap((group) => {
    const dayItem: DetailSectionListItem = {
      id: group.id,
      primary: formatHistoryDayPrimaryLabel(group, analyticsScope),
      value: `${group.rows.length} ${group.rows.length === 1 ? "set" : "sets"}`,
      contentClassName: "inline-block w-fit max-w-full pb-[3px] bg-[linear-gradient(90deg,rgb(var(--metric-accent-rgb)/0.14),rgb(var(--metric-accent-rgb)/0.85),rgb(var(--metric-accent-rgb)/0.14))] bg-[length:100%_1px] bg-no-repeat [background-position:0_100%]",
      tagLabels: buildHistoryDayTagLabels(group),
      layout: "single-column",
    };
    const setItems = group.rows.map((row, rowIndex): DetailSectionListItem => ({
      id: row.id,
      primary: row.primary,
      meta: row.meta,
      signals: row.signals,
      tagLabels: row.tagLabels,
      rowClassName: rowIndex === group.rows.length - 1
        ? "pb-2 bg-[linear-gradient(90deg,rgb(var(--metric-accent-rgb)/0.14),rgb(var(--metric-accent-rgb)/0.85),rgb(var(--metric-accent-rgb)/0.14))] bg-[length:100%_1px] bg-no-repeat [background-position:0_100%]"
        : undefined,
      layout: "single-column",
    }));

    return [dayItem, ...setItems];
  });

  if (historyPoints.length > 0) {
    return (
      <div className="space-y-2">
        <ExerciseHistoryGraph
          stats={stats}
          points={historyPoints}
          graphMetricKey={historyState.graphMetricKey}
          selectedPointId={selectedPointId}
          onSelectedPointChange={onSelectedPointChange}
        />
        {structuredItems.length > 0 ? (
          <div className={cn(appTokens.detailHistoryRow, exerciseInfoBorderlessHistoryRowClassName, "px-2 py-2")}>
            <VerticalScrollHint
              className="w-full rounded-[0.65rem]"
              scrollClassName={cn(
                "w-full",
                structuredItems.length > HISTORY_VISIBLE_ROW_COUNT ? "max-h-[18rem]" : "overflow-visible",
              )}
              showRail={structuredItems.length > HISTORY_VISIBLE_ROW_COUNT}
            >
              <DetailSectionItems items={structuredItems} className="pl-0.5" showBullets={false} />
            </VerticalScrollHint>
          </div>
        ) : null}
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
      <div className={cn(appTokens.detailHistoryRow, exerciseInfoBorderlessHistoryRowClassName, "px-2 py-2")}>
        <div className="w-full">
          <DetailSectionItems items={prHistorySection.items} className="pl-0.5" showBullets={false} />
        </div>
      </div>
    );
  }

  if (historyItems.length === 0 && stats.prCount > 0) {
    return (
      <div className={cn(appTokens.detailHistoryRow, exerciseInfoBorderlessHistoryRowClassName, "px-2 py-2")}>
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
    <div className={cn(appTokens.detailHistoryRow, exerciseInfoBorderlessHistoryRowClassName, "px-2 py-2")}>
      <VerticalScrollHint
        className="w-full rounded-[0.65rem]"
        scrollClassName={cn(
          "w-full",
          historyItems.length > HISTORY_VISIBLE_ROW_COUNT ? "max-h-[30rem]" : "overflow-visible",
        )}
        showRail={historyItems.length > HISTORY_VISIBLE_ROW_COUNT}
      >
        <DetailSectionItems items={historyItems} className="pl-0.5" showBullets={false} />
      </VerticalScrollHint>
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
  const regressionCount = progression.deloadCount + progression.revertCount;
  const watchCount = progression.watchCount ?? 0;
  const progressionMetricCandidates: Array<MetricDatum | null> = [
    progression.firstTargetLabel && !startedMatchesCurrent ? (() => {
      const value = startedTargetValue;
      return { label: "Started", value, valueNode: buildCompactMetricValueNode(value) } satisfies MetricDatum;
    })() : null,
    progression.currentTargetLabel ? (() => {
      const value = currentTargetValue;
      return { label: "Current", value, valueNode: buildCompactMetricValueNode(value) } satisfies MetricDatum;
    })() : null,
    progression.latestChangeSummary ? (() => {
      const value = compactProgressionMetricValue(progression.latestChangeSummary);
      return { label: "Latest Change", value, valueNode: buildCompactMetricValueNode(value) } satisfies MetricDatum;
    })() : null,
    { label: "Promotions", value: `${progression.promotionCount}`, valueTone: progression.promotionCount > 0 ? "success" : "muted" },
    regressionCount > 0 ? { label: "Regressions", value: `${regressionCount}`, valueTone: "danger" } : null,
    watchCount > 0 ? { label: "Watch", value: `${watchCount}`, valueTone: "warning" } : null,
    progression.manualChangeCount > 0 ? { label: "Manual", value: `${progression.manualChangeCount}`, valueTone: "warning" } : null,
  ];
  const metrics = filterUniqueMetricItems(
    progressionMetricCandidates.filter((item): item is MetricDatum => item !== null),
    usedMetricKeys,
  );
  if (
    metrics.length === 0
    && !progression.latestChangeSummary
  ) {
    return null;
  }

  return (
    <AppPanel className={cn(appTokens.detailSection, exerciseInfoBorderlessPanelClassName, "space-y-2 p-2")}>
      <ExerciseInfoSectionHeader
        title="Progression"
        section="progression"
        analyticsScope={analyticsScope}
        activeRoutineTitle={activeRoutineTitle}
        onScopeClick={onScopeClick}
      />
      {metrics.length > 0 ? <ExerciseSurfaceMetricGrid items={metrics} {...getExerciseInfoMetricGridProps(metrics, "progression")} /> : null}
    </AppPanel>
  );
}

export function ExerciseInfoSheet({
  exercise,
  statsByScope,
  statsLoadingByScope,
  filterState,
  onFilterStateChange,
  open,
  onOpenChange,
  onClose,
  inline = false,
  sourceContext,
}: {
  exercise: ExerciseInfoSheetExercise | null;
  statsByScope: Partial<Record<ExerciseInfoAnalyticsScope, ExerciseInfoSheetStats | null>>;
  statsLoadingByScope: Partial<Record<ExerciseInfoAnalyticsScope, boolean>>;
  filterState: ExerciseInfoFilterState;
  onFilterStateChange: (state: ExerciseInfoFilterState) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose?: () => void;
  inline?: boolean;
  sourceContext?: string;
}) {
  const router = useRouter();
  const statsPanelId = useId();
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [selectedHistoryPointId, setSelectedHistoryPointId] = useState<string | null>(null);
  const [selectedPointFilterSnapshot, setSelectedPointFilterSnapshot] = useState<ExerciseInfoFilterState | null>(null);
  const [isHeaderFilterOpen, setIsHeaderFilterOpen] = useState(false);
  const normalizedFilterState = useMemo(() => normalizeExerciseInfoFilterState(filterState), [filterState]);
  const [headerFilterMode, setHeaderFilterMode] = useState<ExerciseInfoAnalyticsScope>(normalizedFilterState.analyticsScope);
  const [pendingCycleRoutineId, setPendingCycleRoutineId] = useState<string | null>(normalizedFilterState.routineId);
  const [pendingCycleStartDate, setPendingCycleStartDate] = useState<string | null>(normalizedFilterState.cycleStartDate);
  const canonicalExerciseId = exercise ? (exercise.exercise_id ?? exercise.id) : null;
  useBodyScrollLock(open && !inline);

  useEffect(() => {
    if (!open) {
      setSelectedHistoryPointId(null);
      setSelectedPointFilterSnapshot(null);
      setIsHeaderFilterOpen(false);
      setHeaderFilterMode("all_time");
      setPendingCycleRoutineId(null);
      setPendingCycleStartDate(null);
    }
  }, [open]);

  useEffect(() => {
    setSelectedHistoryPointId(null);
    setSelectedPointFilterSnapshot(null);
    setHeaderFilterMode(normalizedFilterState.analyticsScope);
    setPendingCycleRoutineId(normalizedFilterState.routineId);
    setPendingCycleStartDate(normalizedFilterState.cycleStartDate);
  }, [
    canonicalExerciseId,
    normalizedFilterState.analyticsScope,
    normalizedFilterState.cycleStartDate,
    normalizedFilterState.routineId,
  ]);

  useEffect(() => {
    if (selectedHistoryPointId) {
      setSelectedPointFilterSnapshot((current) => current ?? normalizedFilterState);
      setIsHeaderFilterOpen(false);
      return;
    }

    setSelectedPointFilterSnapshot(null);
  }, [normalizedFilterState, selectedHistoryPointId]);

  useEffect(() => {
    const handleExclusiveOverlayOpen = (event: Event) => {
      const payload = (event as CustomEvent<FitnessOverlayExclusiveDetail>).detail;
      if (payload?.source === "info") {
        return;
      }

      setIsHeaderFilterOpen(false);
    };

    window.addEventListener(FITNESS_OVERLAY_EXCLUSIVE_OPEN_EVENT, handleExclusiveOverlayOpen);
    return () => window.removeEventListener(FITNESS_OVERLAY_EXCLUSIVE_OPEN_EVENT, handleExclusiveOverlayOpen);
  }, []);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  const currentScope = normalizedFilterState.analyticsScope;
  const currentStats = statsByScope[currentScope] ?? null;
  const fallbackStats = statsByScope.all_time ?? null;
  const filterOptions = currentStats?.filterOptions ?? fallbackStats?.filterOptions ?? { routines: [] };
  const routineOptions = Array.isArray(filterOptions.routines) ? filterOptions.routines : [];
  const orderOptionsWithSelectedFirst = useCallback(<T,>(options: T[], isSelected: (option: T) => boolean) => {
    const selected: T[] = [];
    const unselected: T[] = [];
    for (const option of options) {
      if (isSelected(option)) {
        selected.push(option);
      } else {
        unselected.push(option);
      }
    }

    return [...selected, ...unselected];
  }, []);
  const defaultRoutineOption = routineOptions.find((routine) => routine.isActive) ?? routineOptions[0] ?? null;
  const appliedRoutineOption = normalizedFilterState.routineId
    ? routineOptions.find((routine) => routine.id === normalizedFilterState.routineId) ?? null
    : null;
  const routineModeSelectedRoutine = appliedRoutineOption ?? (headerFilterMode === "current_routine" ? defaultRoutineOption : null);
  const cycleModeSelectedRoutine = pendingCycleRoutineId
    ? routineOptions.find((routine) => routine.id === pendingCycleRoutineId) ?? null
    : null;
  const selectedCycleOption = cycleModeSelectedRoutine?.cycleOptions.find((cycle) => cycle.startDate === normalizedFilterState.cycleStartDate) ?? null;
  const pendingCycleOption = cycleModeSelectedRoutine?.cycleOptions.find((cycle) => cycle.startDate === pendingCycleStartDate) ?? null;
  const orderedScopeOptions = orderOptionsWithSelectedFirst([
    { label: "Routine", value: "current_routine" as const },
    { label: "Cycle", value: "current_cycle" as const },
  ], (option) => headerFilterMode === option.value);
  const orderedRoutineOptions = orderOptionsWithSelectedFirst(routineOptions, (routine) => (
    headerFilterMode === "current_cycle"
      ? pendingCycleRoutineId === routine.id
      : routineModeSelectedRoutine?.id === routine.id
  ));
  const orderedCycleOptions = orderOptionsWithSelectedFirst(cycleModeSelectedRoutine?.cycleOptions ?? [], (cycle) => (
    (selectedCycleOption ?? pendingCycleOption)?.startDate === cycle.startDate
  ));
  const hasAppliedFilter = currentScope !== "all_time";
  const appliedFilterCount = currentScope === "current_cycle"
    ? 2
    : currentScope === "current_routine"
      ? 1
      : 0;
  const showFilterClearButton = hasAppliedFilter || headerFilterMode !== "all_time";
  const showRoutineClearButton = headerFilterMode === "current_routine"
    ? Boolean(routineModeSelectedRoutine)
    : Boolean(pendingCycleRoutineId);
  const showCycleClearButton = Boolean(pendingCycleStartDate);

  const applyFilterState = useCallback((nextState: Partial<ExerciseInfoFilterState>) => {
    onFilterStateChange(normalizeExerciseInfoFilterState(nextState));
  }, [onFilterStateChange]);

  const handleHeaderFilterModeSelect = useCallback((mode: ExerciseInfoAnalyticsScope) => {
    setHeaderFilterMode(mode);
    if (mode === "current_routine") {
      const nextRoutineId = normalizedFilterState.routineId ?? pendingCycleRoutineId ?? defaultRoutineOption?.id ?? null;
      setPendingCycleRoutineId(nextRoutineId);
      if (nextRoutineId) {
        applyFilterState({
          analyticsScope: "current_routine",
          routineId: nextRoutineId,
          cycleStartDate: null,
        });
      }
      return;
    }

    if (mode === "current_cycle") {
      const nextRoutineId = pendingCycleRoutineId ?? normalizedFilterState.routineId ?? defaultRoutineOption?.id ?? null;
      setPendingCycleRoutineId(nextRoutineId);
      if (nextRoutineId && pendingCycleStartDate) {
        applyFilterState({
          analyticsScope: "current_cycle",
          routineId: nextRoutineId,
          cycleStartDate: pendingCycleStartDate,
        });
      }
      return;
    }

    setPendingCycleRoutineId(null);
    setPendingCycleStartDate(null);
  }, [
    applyFilterState,
    defaultRoutineOption,
    normalizedFilterState.routineId,
    pendingCycleRoutineId,
    pendingCycleStartDate,
  ]);

  const handleFilterClear = useCallback(() => {
    setHeaderFilterMode("all_time");
    setPendingCycleRoutineId(null);
    setPendingCycleStartDate(null);
    applyFilterState(createDefaultExerciseInfoFilterState());
  }, [applyFilterState]);

  const handleRoutineFilterSelect = useCallback((routine: ExerciseInfoRoutineFilterOption) => {
    if (headerFilterMode === "current_cycle") {
      setPendingCycleRoutineId(routine.id);
      if (pendingCycleStartDate && !routine.cycleOptions.some((cycle) => cycle.startDate === pendingCycleStartDate)) {
        setPendingCycleStartDate(null);
      }
      return;
    }

    applyFilterState({
      analyticsScope: "current_routine",
      routineId: routine.id,
      cycleStartDate: null,
    });
  }, [applyFilterState, headerFilterMode, pendingCycleStartDate]);

  const handleRoutineFilterClear = useCallback(() => {
    setPendingCycleRoutineId(null);
    if (headerFilterMode === "current_cycle") {
      setPendingCycleStartDate(null);
      applyFilterState(createDefaultExerciseInfoFilterState());
      return;
    }

    applyFilterState(createDefaultExerciseInfoFilterState());
  }, [applyFilterState, headerFilterMode]);

  const handleCycleFilterSelect = useCallback((cycleStartDate: string) => {
    if (!pendingCycleRoutineId) {
      return;
    }

    setPendingCycleStartDate(cycleStartDate);
    applyFilterState({
      analyticsScope: "current_cycle",
      routineId: pendingCycleRoutineId,
      cycleStartDate,
    });
  }, [applyFilterState, pendingCycleRoutineId]);

  const handleCycleFilterClear = useCallback(() => {
    setPendingCycleStartDate(null);
    if (pendingCycleRoutineId) {
      applyFilterState({
        analyticsScope: "current_routine",
        routineId: pendingCycleRoutineId,
        cycleStartDate: null,
      });
      return;
    }

    applyFilterState(createDefaultExerciseInfoFilterState());
  }, [applyFilterState, pendingCycleRoutineId]);

  const handlePointSelectionResync = useCallback(() => {
    const snapshot = selectedPointFilterSnapshot;
    setIsHeaderFilterOpen(false);
    setSelectedHistoryPointId(null);
    setSelectedPointFilterSnapshot(null);
    if (
      snapshot
      && (
        snapshot.analyticsScope !== normalizedFilterState.analyticsScope
        || snapshot.routineId !== normalizedFilterState.routineId
        || snapshot.cycleStartDate !== normalizedFilterState.cycleStartDate
      )
    ) {
      onFilterStateChange(snapshot);
    }
  }, [normalizedFilterState, onFilterStateChange, selectedPointFilterSnapshot]);

  const handleSectionScopeToggle = useCallback((section: ExerciseInfoSectionScopeKey) => {
    void section;
    setSelectedHistoryPointId(null);
  }, []);

  const getSectionStats = useCallback((section: ExerciseInfoSectionScopeKey) => {
    void section;
    const scope = currentScope;
    return {
      scope,
      stats: statsByScope[scope] ?? null,
      loading: Boolean(statsLoadingByScope[scope]),
    };
  }, [currentScope, statsByScope, statsLoadingByScope]);

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
  const filterResyncActive = Boolean(selectedHistoryPointId);
  const toggleHeaderFilterOpen = () => {
    setIsHeaderFilterOpen((previous) => {
      const nextValue = !previous;
      if (nextValue) {
        setHeaderFilterMode(normalizedFilterState.analyticsScope);
        setPendingCycleRoutineId(normalizedFilterState.routineId);
        setPendingCycleStartDate(normalizedFilterState.cycleStartDate);
        dispatchFitnessOverlayExclusiveOpen("info");
      }
      return nextValue;
    });
  };
  const detailHeader = (
    <div className="sticky top-[calc(max(var(--app-safe-top),var(--vv-top,0px))+0.25rem)] z-30">
      <div className="pointer-events-none absolute inset-x-0 inset-y-0 z-10 flex items-center justify-start px-2">
        <div className="pointer-events-auto flex items-center gap-1.5">
          {filterResyncActive ? (
            <button
              type="button"
              onClick={handlePointSelectionResync}
              aria-label="Re-sync exercise info filters"
              data-action-chrome-intent="toggleActive"
              data-action-chrome-selected="true"
              className={cn(
                ACTION_CHROME_CONTROL_CLASS_NAME,
                ACTION_CHROME_SEGMENTED_CLASS_NAME,
                "inline-flex h-8 min-w-[3.55rem] items-center justify-center gap-1 rounded-[999px] px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] focus-visible:ring-[rgb(var(--accent)/0.22)]",
              )}
            >
              <span>Re-sync</span>
            </button>
          ) : (
            <FilterToggleButton
              open={isHeaderFilterOpen}
              active={hasAppliedFilter}
              onClick={toggleHeaderFilterOpen}
              ariaLabel="Open exercise info filters"
              countBadge={appliedFilterCount > 0 ? appliedFilterCount : null}
              className={cn(
                appTokens.exercisePickerFilterToggle,
                "!w-auto !min-w-[3.45rem] !border-[rgb(var(--accent)/0.52)] !bg-[rgb(var(--surface-2-rgb)/0.28)] !px-2.5 !pl-3 !pr-1.5",
              )}
            />
          )}
        </div>
        {isHeaderFilterOpen && !filterResyncActive ? (
          <div
            className={cn(
              "pointer-events-auto fixed left-1/2 top-[calc(max(var(--app-safe-top),var(--vv-top,0px))+3.75rem)] z-60 -translate-x-1/2",
              SHARED_OVERLAY_PANEL_BREAKOUT_WIDTH_CLASS_NAME,
            )}
          >
            <div
              aria-label="Exercise info filters"
              className={cn(
                appTokens.exercisePickerFilterPanel,
                `mx-auto w-full ${SHARED_OVERLAY_PANEL_MAX_WIDTH_CLASS_NAME} !space-y-1.5 !border-[rgb(var(--accent)/0.42)] !bg-[rgb(var(--bg-app)/0.92)] !px-2 !py-2 !shadow-none !backdrop-blur-[18px]`,
              )}
            >
              <FilterScrollPanel
                className="relative z-[1] !bg-transparent"
                showEdgeFades={false}
                viewportClassName={`${SHARED_OVERLAY_PANEL_COMPACT_VIEWPORT_CLASS_NAME} pr-0`}
              >
                <div className={exerciseInfoFilterCompactSectionStackClassName}>
                  <div className={exerciseInfoFilterCompactHeaderWrapClassName}>
                    <p className={appTokens.exercisePickerFilterGroupLabel}>Scope</p>
                    <MetricAccentBar variant="thin" className="w-full opacity-80" />
                  </div>
                  <HorizontalScrollHint
                    scrollClassName={cn(exerciseInfoFilterCompactRailClassName, exerciseInfoFilterCompactRailTopPaddingClassName)}
                    contentClassName="flex min-w-max flex-nowrap gap-1.5"
                  >
                      {showFilterClearButton ? (
                        <button
                          type="button"
                          onClick={handleFilterClear}
                          className={cn(
                            appTokens.exercisePickerFilterClearButton,
                            "!border-[rgb(var(--accent-yellow-on)/0.58)]",
                            "mr-2.5 shrink-0 whitespace-nowrap px-2 py-1 text-[10px]",
                          )}
                        >
                          Clear
                        </button>
                      ) : null}
                      {orderedScopeOptions.map((option) => (
                        <PillButton
                          key={option.value}
                          type="button"
                          active={headerFilterMode === option.value}
                          className={cn(
                            "shrink-0 whitespace-nowrap px-2 py-1 text-[10px]",
                            headerFilterMode === option.value
                              ? "!border-[rgb(var(--accent)/0.82)] !bg-[rgb(var(--accent)/0.42)] !text-[rgb(240_255_251)] shadow-[0_0_0_1px_rgba(71,215,196,0.22),inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                              : undefined,
                          )}
                          onClick={() => handleHeaderFilterModeSelect(option.value)}
                        >
                          {option.label}
                        </PillButton>
                      ))}
                  </HorizontalScrollHint>
                </div>

                {headerFilterMode === "current_routine" || headerFilterMode === "current_cycle" ? (
                  <div className={exerciseInfoFilterCompactSectionStackClassName}>
                    <div className={exerciseInfoFilterCompactHeaderWrapClassName}>
                      <p className={appTokens.exercisePickerFilterGroupLabel}>Routine</p>
                      <MetricAccentBar variant="thin" className="w-full opacity-80" />
                    </div>
                    <HorizontalScrollHint
                      scrollClassName={cn(exerciseInfoFilterCompactRailClassName, exerciseInfoFilterCompactRailTopPaddingClassName)}
                      contentClassName="flex min-w-max flex-nowrap gap-1.5"
                    >
                        {showRoutineClearButton ? (
                          <button
                            type="button"
                            onClick={handleRoutineFilterClear}
                            className={cn(
                              appTokens.exercisePickerFilterClearButton,
                              "!border-[rgb(var(--accent-yellow-on)/0.58)]",
                              "mr-2.5 shrink-0 whitespace-nowrap px-2 py-1 text-[10px]",
                            )}
                          >
                            Clear
                          </button>
                        ) : null}
                        {routineOptions.length === 0 ? (
                          <p className="px-1 text-[11px] text-[rgb(var(--text-muted))]">
                            No routine history available yet.
                          </p>
                        ) : orderedRoutineOptions.map((routine) => {
                          const isSelected = headerFilterMode === "current_cycle"
                            ? pendingCycleRoutineId === routine.id
                            : routineModeSelectedRoutine?.id === routine.id;
                          return (
                            <PillButton
                              key={routine.id}
                              type="button"
                              active={isSelected}
                              className={cn(
                                "shrink-0 whitespace-nowrap px-2 py-1 text-[10px]",
                                isSelected
                                  ? "!border-[rgb(var(--accent)/0.82)] !bg-[rgb(var(--accent)/0.42)] !text-[rgb(240_255_251)] shadow-[0_0_0_1px_rgba(71,215,196,0.22),inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                                  : undefined,
                              )}
                              onClick={() => handleRoutineFilterSelect(routine)}
                            >
                            {routine.title}
                          </PillButton>
                        );
                      })}
                    </HorizontalScrollHint>
                  </div>
                ) : null}

                {headerFilterMode === "current_cycle" ? (
                  <div className={exerciseInfoFilterCompactSectionStackClassName}>
                    <div className={exerciseInfoFilterCompactHeaderWrapClassName}>
                      <p className={appTokens.exercisePickerFilterGroupLabel}>Cycle</p>
                      <MetricAccentBar variant="thin" className="w-full opacity-80" />
                    </div>
                    {!pendingCycleRoutineId ? (
                      <p className="px-1 text-[11px] text-[rgb(var(--text-muted))]">
                        Choose a routine first.
                      </p>
                    ) : (
                      <HorizontalScrollHint
                        scrollClassName={cn(exerciseInfoFilterCompactRailClassName, exerciseInfoFilterCompactRailTopPaddingClassName)}
                        contentClassName="flex min-w-max flex-nowrap gap-1.5"
                      >
                          {showCycleClearButton ? (
                            <button
                              type="button"
                              onClick={handleCycleFilterClear}
                              className={cn(
                                appTokens.exercisePickerFilterClearButton,
                                "!border-[rgb(var(--accent-yellow-on)/0.58)]",
                                "mr-2.5 shrink-0 whitespace-nowrap px-2 py-1 text-[10px]",
                              )}
                            >
                              Clear
                            </button>
                          ) : null}
                          {orderedCycleOptions.length ? orderedCycleOptions.map((cycle) => {
                              const isSelected = (selectedCycleOption ?? pendingCycleOption)?.startDate === cycle.startDate;
                              return (
                              <PillButton
                                key={cycle.startDate}
                                type="button"
                                active={isSelected}
                                className={cn(
                                  "shrink-0 whitespace-nowrap px-2 py-1 text-[10px]",
                                  isSelected
                                    ? "!border-[rgb(var(--accent)/0.82)] !bg-[rgb(var(--accent)/0.42)] !text-[rgb(240_255_251)] shadow-[0_0_0_1px_rgba(71,215,196,0.22),inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                                    : undefined,
                                )}
                                onClick={() => handleCycleFilterSelect(cycle.startDate)}
                              >
                                {cycle.label}
                              </PillButton>
                            );
                          }) : (
                            <p className="px-1 text-[11px] text-[rgb(var(--text-muted))]">
                              No saved cycles for this routine yet.
                            </p>
                          )}
                      </HorizontalScrollHint>
                    )}
                  </div>
                ) : null}
              </FilterScrollPanel>
            </div>
          </div>
        ) : null}
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
  const progressionSectionState = getSectionStats("progression");
  const historySectionState = getSectionStats("history");

  const baseSurfaceMetrics = Array.isArray(statsSectionState.stats?.surfaceMetrics)
    ? statsSectionState.stats.surfaceMetrics.filter((item): item is MetricDatum => Boolean(item && typeof item.label === "string" && typeof item.value === "string"))
    : [];
  const statsQuickMetrics = Array.isArray(statsSectionState.stats?.quickMetrics)
    ? statsSectionState.stats.quickMetrics.filter((item): item is MetricDatum => Boolean(item && typeof item.label === "string" && typeof item.value === "string"))
    : [];
  const statsPerformanceMetrics = Array.isArray(statsSectionState.stats?.performanceMetrics)
    ? statsSectionState.stats.performanceMetrics.filter((item): item is MetricDatum => Boolean(item && typeof item.label === "string" && typeof item.value === "string"))
    : [];
  const statsProgressState = getExerciseInfoProgressState(statsSectionState.stats);
  const statsProgressMetrics = statsProgressState.metrics.filter((item) => !isThirtyDayFrequencyMetric(item));
  const progressReviewSections = statsProgressState.reviewSections;
  const surfaceMetrics = buildExerciseInfoSurfaceMetrics({
    quickMetrics: statsQuickMetrics.length > 0 ? statsQuickMetrics : baseSurfaceMetrics,
    performanceMetrics: statsPerformanceMetrics,
    progressMetrics: statsProgressMetrics,
  });
  const usedMetricKeys = new Set(surfaceMetrics.map((item) => normalizeMetricKey(item.label)));
  const historyState = getExerciseInfoProgressState(historySectionState.stats);
  const selectedHistoryPoint = selectedHistoryPointId
    ? historyState.historyPoints.find((point) => point.id === selectedHistoryPointId) ?? null
    : null;
  const graphSelectionActive = Boolean(selectedHistoryPoint);
  const selectedHistoryContextPoint = selectedHistoryPoint?.type === "progression-event"
    ? historyState.historyPoints.find((point) => point.type === "day" && point.dayKey === selectedHistoryPoint.dayKey) ?? null
    : selectedHistoryPoint;
  const selectedPointMetrics = selectedHistoryPoint
    ? filterUniqueMetricItems([
        ...buildHistoryPointMetrics(selectedHistoryPoint),
        ...(selectedHistoryContextPoint && selectedHistoryContextPoint.id !== selectedHistoryPoint.id
          ? buildHistoryPointMetrics(selectedHistoryContextPoint)
          : []),
        buildHistoryPointComparisonMetric({
          points: historyState.historyPoints,
          selectedPoint: selectedHistoryContextPoint,
        }),
      ].filter((item): item is MetricDatum => Boolean(item)))
    : [];
  const displayedSurfaceMetrics = graphSelectionActive ? selectedPointMetrics : surfaceMetrics;
  const summaryRailMetrics = prioritizeExerciseInfoSummaryMetrics(displayedSurfaceMetrics);
  const selectedHistoryPointStatsSubtitle = graphSelectionActive
    ? buildSelectedHistoryPointStatsSubtitle(selectedHistoryPoint)
    : null;
  const previousHistoryPointId = graphSelectionActive
    ? getAdjacentHistoryGraphPointId(historyState.historyPoints, selectedHistoryPointId, -1)
    : null;
  const nextHistoryPointId = graphSelectionActive
    ? getAdjacentHistoryGraphPointId(historyState.historyPoints, selectedHistoryPointId, 1)
    : null;
  const historyPointNavigationActions = previousHistoryPointId && nextHistoryPointId ? (
    <BottomActionUtilityCluster>
      <BottomDockButton
        type="button"
        intent="info"
        aria-label="Previous history point"
        onClick={() => setSelectedHistoryPointId(previousHistoryPointId)}
      >
        <span className="inline-flex items-center justify-center gap-2">
          <ChevronRightIcon className="h-4 w-4 rotate-180" />
          <span>Previous</span>
        </span>
      </BottomDockButton>
      <BottomDockButton
        type="button"
        intent="info"
        aria-label="Next history point"
        onClick={() => setSelectedHistoryPointId(nextHistoryPointId)}
      >
        <span className="inline-flex items-center justify-center gap-2">
          <span>Next</span>
          <ChevronRightIcon className="h-4 w-4" />
        </span>
      </BottomDockButton>
    </BottomActionUtilityCluster>
  ) : null;
  const progression = progressionSectionState.stats?.progression ?? null;
  const progressionDerived = statsSectionState.stats?.progressionDerived ?? null;
  const overviewCopy = exercise ? (exercise.how_to_short?.trim() || getRecoveryExerciseFallbackDescription(exercise)) : "";
  const normalizedPresentationKind = normalizeExerciseInfoTagValue(statsSectionState.stats?.presentationKind ?? null);
  const normalizedEquipment = normalizeExerciseInfoTagValue(exercise?.equipment ?? null);
  const showEquipmentOverviewTag = Boolean(normalizedEquipment) && normalizedEquipment !== normalizedPresentationKind;
  const overviewTags = filterUniqueMetricItems([
    statsSectionState.stats?.presentationKind ? { label: "Style", value: toTitleCase(statsSectionState.stats.presentationKind) } : null,
    showEquipmentOverviewTag && exercise?.equipment ? { label: "Equipment", value: toTitleCase(exercise.equipment) } : null,
    exercise?.primary_muscle ? { label: "Primary Muscle", value: toTitleCase(exercise.primary_muscle) } : null,
    ...(exercise?.secondary_muscles ?? []).map((value) => ({ label: "Secondary Muscle", value: toTitleCase(value) } satisfies MetricDatum)),
    exercise?.movement_pattern ? { label: "Pattern", value: toTitleCase(exercise.movement_pattern) } : null,
  ].filter((item): item is MetricDatum => Boolean(item)));
  const hasProgressionLoadingPanel = progressionSectionState.loading;
  const hasHistoryPanel = historySectionState.loading || Boolean(historySectionState.stats);
  const progressionPanelMetrics = progression ? (() => {
    const currentTargetValue = compactProgressionMetricValue(progression.currentTargetLabel);
    const startedTargetValue = compactProgressionMetricValue(progression.firstTargetLabel);
    const startedMatchesCurrent = Boolean(startedTargetValue)
      && normalizeCompactProgressionComparisonValue(startedTargetValue) === normalizeCompactProgressionComparisonValue(currentTargetValue);
    const regressionCount = progression.deloadCount + progression.revertCount;
    const watchCount = progression.watchCount ?? 0;
    const items: MetricDatum[] = [];
    if (progression.firstTargetLabel && !startedMatchesCurrent) {
      items.push((() => {
        const value = startedTargetValue;
        return { label: "Started", value, valueNode: buildCompactMetricValueNode(value) } satisfies MetricDatum;
      })());
    }
    if (progression.currentTargetLabel) {
      items.push((() => {
        const value = currentTargetValue;
        return { label: "Current", value, valueNode: buildCompactMetricValueNode(value) } satisfies MetricDatum;
      })());
    }
    if (progression.latestChangeSummary) {
      items.push((() => {
        const value = compactProgressionMetricValue(progression.latestChangeSummary);
        return { label: "Latest Change", value, valueNode: buildCompactMetricValueNode(value) } satisfies MetricDatum;
      })());
    }
    items.push({ label: "Promotions", value: `${progression.promotionCount}`, valueTone: progression.promotionCount > 0 ? "success" : "muted" } satisfies MetricDatum);
    if (regressionCount > 0) {
      items.push({ label: "Regressions", value: `${regressionCount}`, valueTone: "danger" } satisfies MetricDatum);
    }
    if (watchCount > 0) {
      items.push({ label: "Watch", value: `${watchCount}`, valueTone: "warning" } satisfies MetricDatum);
    }
    if (progression.manualChangeCount > 0) {
      items.push({ label: "Manual", value: `${progression.manualChangeCount}`, valueTone: "warning" } satisfies MetricDatum);
    }
    return filterUniqueMetricItems(items);
  })() : [];

  const sheetBody = (
    <div className="relative isolate min-h-[100dvh] bg-[rgb(var(--bg))]">
      <AmbientBackground />
      <main className="app-page-scroll relative z-10 min-h-[100dvh]">
        <ContentRail className={cn(
          "flex min-h-[100dvh] flex-col gap-2 pt-[calc(max(var(--app-safe-top),var(--vv-top,0px))+0.7rem)]",
          !inline && historyPointNavigationActions ? "pb-24" : undefined,
        )}>
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
                    <AppPanel className={cn(appTokens.detailSection, exerciseInfoBorderlessPanelClassName, "p-2.5")}>
                      <div className="grid gap-2.5 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-stretch">
                        <div className={cn(exerciseInfoStripCardClassName, "min-w-0 px-3 py-3 lg:flex lg:h-full lg:flex-col lg:justify-between")}>
                          <div className="space-y-2">
                            <div className="overflow-hidden rounded-[1rem] border border-[rgb(var(--border-strong)/0.12)] bg-[rgb(var(--surface-1-rgb)/0.12)]">
                              <ExerciseAssetImage
                                src={howToImageSrc}
                                alt={`${exercise.name} demonstration`}
                                className="h-full w-full"
                                preferNaturalAspectRatio
                                containerStyle={{ minHeight: "8.4rem", maxHeight: "9.8rem" }}
                                imageClassName="object-contain object-center"
                                imageStyle={{ padding: "0.28rem" }}
                                sizes="220px"
                                priority
                              />
                            </div>
                            {overviewTags.length > 0 ? (
                              <div className="flex flex-wrap items-center justify-center gap-1.5">
                                {overviewTags.slice(0, 3).map((item) => (
                                  <Pill key={`${item.label}-${item.value}`} className="normal-case tracking-[0.08em]">
                                    {item.value}
                                  </Pill>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <div className={cn(exerciseInfoStripCardClassName, "min-w-0 px-3 py-3 lg:flex lg:h-full lg:flex-col")}>
                          <div className="space-y-2 lg:flex lg:h-full lg:flex-col">
                            <ExerciseInfoSectionHeader title="Overview" />
                            <HorizontalScrollHint
                              scrollClassName="hide-scrollbar -mx-0.5 overflow-x-auto overflow-y-visible px-0.5 pb-1 [touch-action:pan-x] lg:flex-1"
                              contentClassName="flex w-full min-w-0 flex-col gap-2 lg:min-w-0 lg:w-full lg:flex-nowrap lg:flex-row lg:items-stretch"
                            >
                              <ExerciseInfoStripCard title="How To" className="h-full" widthClassName="w-full min-w-0 lg:h-full lg:w-auto lg:min-w-0 lg:flex-[1.12]">
                                <p className="text-[13px] leading-[1.55] text-[rgb(var(--text)/0.94)] [text-wrap:pretty]">
                                  {overviewCopy || "Log a few sessions to unlock more specific cues and trends for this exercise."}
                                </p>
                              </ExerciseInfoStripCard>
                              <ExerciseInfoStripCard title="Context" className="h-full" widthClassName="w-full min-w-0 lg:h-full lg:w-auto lg:min-w-0 lg:flex-[0.92]">
                                {overviewTags.length > 0 ? (
                                  <ExerciseSurfaceMetricGrid
                                    items={overviewTags}
                                    {...getExerciseInfoMetricGridProps(overviewTags)}
                                  />
                                ) : (
                                  <p className={appTokens.detailBodyMutedText}>No exercise context available yet.</p>
                                )}
                              </ExerciseInfoStripCard>
                              {progressionDerived ? (
                                <ExerciseInfoStripCard title="Current State" className="h-full" widthClassName="w-full min-w-0 lg:h-full lg:w-auto lg:min-w-0 lg:flex-1">
                                  {(() => {
                                    const items: DetailSectionListItemInput[] = [
                                      { id: "state-signal", primary: progressionDerived.signalLabel, value: progressionDerived.methodLabel },
                                    ];
                                    if (progressionDerived.currentTargetLabel) {
                                      items.push({ id: "state-current", primary: "Current", value: progressionDerived.currentTargetLabel });
                                    }
                                    if (progressionDerived.nextTargetLabel) {
                                      items.push({ id: "state-next", primary: "Next", value: progressionDerived.nextTargetLabel });
                                    }
                                    items.push({ id: "state-reason", primary: progressionDerived.reason });

                                    return (
                                      <DetailSectionItems
                                        items={items}
                                        className="pl-0"
                                        showBullets={false}
                                      />
                                    );
                                  })()}
                                </ExerciseInfoStripCard>
                              ) : null}
                            </HorizontalScrollHint>
                          </div>
                        </div>
                      </div>
                    </AppPanel>

                    <AppPanel className={cn(appTokens.detailSection, exerciseInfoBorderlessPanelClassName, "p-2.5")}>
                      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-stretch">
                        <div className="min-w-0">
                          <ExerciseInfoSummaryPanel
                            panelId={statsPanelId}
                            loading={statsSectionState.loading}
                            metrics={summaryRailMetrics}
                            subtitle={selectedHistoryPointStatsSubtitle}
                            title="Progress"
                            className="h-full"
                            titleVariant="strip"
                          />
                        </div>
                        {!graphSelectionActive && (hasProgressionLoadingPanel || progressReviewSections.length > 0 || statsProgressMetrics.length > 0) ? (
                          hasProgressionLoadingPanel ? (
                            <div className={cn(exerciseInfoStripCardClassName, "h-full px-3 py-3")}>
                              <div className="inline-flex max-w-full flex-col items-center gap-1 text-center">
                                <p className={cn(exerciseInfoSubsectionHeadingClassName, "px-0 text-center text-[0.72rem]")}>Review</p>
                                <MetricAccentBar variant="thin" className="w-full max-w-full opacity-85" />
                              </div>
                              <div className="pt-2">
                                <ExerciseInfoLoadingRows />
                              </div>
                            </div>
                          ) : (
                            <ExerciseInfoStripCard title="Review" className="h-full" widthClassName="w-full min-w-0 lg:h-full">
                              <ExerciseInfoProgressReview metrics={statsProgressMetrics} sections={progressReviewSections} />
                            </ExerciseInfoStripCard>
                          )
                        ) : null}
                      </div>
                    </AppPanel>

                    {!graphSelectionActive && (hasProgressionLoadingPanel || progressionPanelMetrics.length > 0) ? (
                      <AppPanel className={cn(appTokens.detailSection, exerciseInfoBorderlessPanelClassName, "space-y-2 p-2.5")}>
                        <ExerciseInfoSectionHeader title="Signals" />
                        {hasProgressionLoadingPanel ? (
                          <ExerciseInfoLoadingRows />
                        ) : (
                          <HorizontalScrollHint
                            scrollClassName="hide-scrollbar -mx-0.5 overflow-x-auto overflow-y-visible px-0.5 pb-1 [touch-action:pan-x]"
                            contentClassName="flex min-w-max gap-2 lg:min-w-0 lg:w-full"
                          >
                            {progressionPanelMetrics.length > 0 ? (
                              <ExerciseInfoStripCard title="Signal" widthClassName="w-[22rem] min-w-[22rem] lg:w-full lg:min-w-0">
                                <ExerciseSurfaceMetricGrid
                                  items={progressionPanelMetrics}
                                  {...getExerciseInfoMetricGridProps(progressionPanelMetrics, "progression")}
                                />
                              </ExerciseInfoStripCard>
                            ) : null}
                          </HorizontalScrollHint>
                        )}
                      </AppPanel>
                    ) : null}

                    {hasHistoryPanel ? (
                      <AppPanel className={cn(appTokens.detailSection, exerciseInfoBorderlessPanelClassName, "space-y-2 p-2.5")}>
                        <ExerciseInfoSectionHeader title="History" />
                        <div className={cn(exerciseInfoStripCardClassName, "px-2 py-2")}>
                          {historySectionState.loading ? <ExerciseInfoLoadingRows /> : historySectionState.stats ? (
                            <ExerciseInfoHistoryList
                              stats={historySectionState.stats}
                              analyticsScope={historySectionState.scope}
                              selectedPointId={selectedHistoryPoint?.id ?? null}
                              onSelectedPointChange={setSelectedHistoryPointId}
                            />
                          ) : null}
                        </div>
                      </AppPanel>
                    ) : null}

                  </>
                )}
              </div>
            </div>
          </Glass>
        </ContentRail>
      </main>
      {!inline && historyPointNavigationActions ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] bg-[linear-gradient(180deg,rgba(var(--bg-app),0)_0%,rgba(var(--bg-app),0.86)_22%,rgba(var(--bg-app),0.985)_100%)] backdrop-blur-[14px]">
          <div className={cn(BOTTOM_ACTION_SHELL_CLASSNAME, "pointer-events-auto")}>
            <div className={BOTTOM_ACTION_SURFACE_OUTER_CLASSNAME}>
              {historyPointNavigationActions}
            </div>
          </div>
        </div>
      ) : null}
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
      className="pointer-events-auto fixed inset-0 z-50 hide-scrollbar overflow-y-auto overscroll-none bg-[rgb(var(--bg))]"
      role="dialog"
      aria-modal="true"
      aria-label="Exercise info"
    >
      {sheetBody}
    </div>,
    resolvedPortalTarget,
  );
}
