"use client";

import { type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import type { SessionRecapSignal, SessionSummary } from "@/app/history/session-summary";
import { ExerciseCard, type ExerciseCardVariant } from "@/components/ExerciseCard";
import { type CardSemanticTone } from "@/components/cardSemanticTones";
import { Glass } from "@/components/ui/Glass";
import { ChevronRightIcon } from "@/components/ui/Chevrons";
import { DetailSectionBlock, DetailSectionBlocks, THIN_SECTION_TOP_DIVIDER_CLASS_NAME, type DetailSectionListItem, type DetailSectionListSection } from "@/components/ui/DetailSectionList";
import { MetricAccentBar, type MetricDatum, MetricGrid, SurfaceMetricGrid } from "@/components/ui/MetricItem";
import { SignatureDot, SignatureMetaTag, SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
import { appTokens } from "@/components/ui/app/tokens";
import { HistoryMetaLine } from "@/components/history/HistoryMetaLine";
import { cn } from "@/lib/cn";
import { formatDateShort } from "@/lib/formatting";
import { buildHistorySessionCardViewModel, type HistorySessionCardViewModel } from "@/lib/workout-card-view-models";

const defaultChevron = <ChevronRightIcon className="h-5 w-5 text-[rgb(var(--text-muted)/0.92)]" />;

const densityStyles = {
  compact: {
    content: appTokens.workoutCardContentCompact,
    variant: "list" as ExerciseCardVariant,
  },
  detailed: {
    content: appTokens.workoutCardContentDetailed,
    variant: "standard" as ExerciseCardVariant,
  },
};

function HistorySessionDetailedMetricGrid({ items }: { items: MetricDatum[] }) {
  return <SurfaceMetricGrid items={items} scrollable />;
}

function formatWeekdayShort(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
}

function buildSessionTitleParts(session: SessionSummary) {
  const weekday = formatWeekdayShort(session.startedAt);
  const routineTitle = session.routineTitle?.trim() || "Unknown routine";
  const dayTitle = session.dayTitle?.trim() || null;
  return { weekday, routineTitle, dayTitle };
}

export function buildSessionTitleText(session: SessionSummary) {
  return <SessionTitleFlow session={session} />;
}

export function buildSessionCompactTitleText(
  session: SessionSummary,
  { showChevron = true, centeredTitle = false, metaTagText }: { showChevron?: boolean; centeredTitle?: boolean; metaTagText?: string | null } = {},
) {
  const { weekday, routineTitle, dayTitle } = buildSessionTitleParts(session);
  const dateText = metaTagText?.trim() || formatDateBadgeText(session);
  const hasMetadata = Boolean(dayTitle || weekday);

  const titleCluster = (
    <span className={cn("flex min-w-0 items-center overflow-hidden whitespace-nowrap", centeredTitle ? "justify-center" : "flex-1")}>
      <span className="min-w-0 shrink truncate">{routineTitle}</span>
      {hasMetadata ? (
        <span className="ml-2 inline-flex min-w-0 items-center gap-x-2 overflow-hidden text-[0.73rem] font-medium text-[rgb(var(--text-secondary)/0.92)]">
          <SignatureMiniPipe className="w-[0.35rem] shrink-0" />
          {dayTitle ? <span className="min-w-0 shrink truncate">{dayTitle}</span> : null}
          {weekday ? (
            <span className="inline-flex shrink-0 items-center gap-2">
              {dayTitle ? <SignatureDot /> : null}
              <span className="text-[rgb(var(--accent-divider-rgb)/0.96)]">{weekday}</span>
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );

  if (centeredTitle) {
    return (
      <span className="relative flex w-full min-w-0 items-center justify-center leading-[1.08]">
        <span className="min-w-0 max-w-[calc(100%-4.75rem)]">
          {titleCluster}
        </span>
        <span className="absolute right-0 top-1/2 inline-flex -translate-y-1/2 items-center gap-2 whitespace-nowrap align-middle">
          {renderDateMetaTag(dateText, "text-[10px] tracking-[0.08em]")}
          {showChevron ? (
            <span className="inline-flex h-4 w-4 items-center justify-center">
              <ChevronRightIcon className="h-4 w-4 text-[rgb(var(--text-muted)/0.92)]" />
            </span>
          ) : null}
        </span>
      </span>
    );
  }

  return (
    <span className="flex w-full min-w-0 items-center gap-3 leading-[1.08]">
      {titleCluster}
      <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap align-middle">
        {renderDateMetaTag(dateText, "text-[10px] tracking-[0.08em]")}
        {showChevron ? (
          <span className="inline-flex h-4 w-4 items-center justify-center">
            <ChevronRightIcon className="h-4 w-4 text-[rgb(var(--text-muted)/0.92)]" />
          </span>
        ) : null}
      </span>
    </span>
  );
}

function SessionTitleFlow({
  session,
  showChevron = false,
}: {
  session: SessionSummary;
  showChevron?: boolean;
}) {
  const { weekday, routineTitle, dayTitle } = buildSessionTitleParts(session);
  const dateText = formatDateBadgeText(session);
  const hasMetadata = Boolean(dayTitle || weekday);
  const dateTag = renderDateMetaTag(dateText, "text-[10px] tracking-[0.08em]");
  const chevron = showChevron ? <ChevronRightIcon className="h-4 w-4 text-[rgb(var(--text-muted)/0.92)]" /> : null;

  return (
    <span className="block min-w-0 leading-[1.08] [text-wrap:pretty]">
      <span className="float-right ml-3 inline-flex items-start gap-x-2 whitespace-nowrap pl-2">
        {dateTag}
        {chevron ? <span className="inline-flex h-4 w-4 items-center justify-center">{chevron}</span> : null}
      </span>
      <span>{routineTitle}</span>
        {hasMetadata ? (
          <>
            <span className="mx-2 inline-flex align-middle">
              <SignatureMiniPipe className="w-[0.35rem]" />
            </span>
            {dayTitle ? <span>{dayTitle}</span> : null}
            {weekday ? (
              <>
                {dayTitle ? (
                  <span className="mx-2 inline-flex align-middle">
                    <SignatureDot />
                  </span>
                ) : null}
                <span className="text-[rgb(var(--accent-divider-rgb)/0.96)]">{weekday}</span>
              </>
            ) : null}
          </>
        ) : null}
      <span className="block clear-both h-0" />
    </span>
  );
}

function renderPrExerciseList(exerciseNames: string[]) {
  return (
    <DetailSectionBlock
      title="PRs"
      items={exerciseNames.length > 0 ? exerciseNames : ["No PRs recorded in this session."]}
      tone={exerciseNames.length > 0 ? "primary" : "muted"}
    />
  );
}

function renderSessionExerciseRecap(exerciseNames: string[]) {
  if (exerciseNames.length === 0) {
    return null;
  }

  return (
    <DetailSectionBlock title="Recap" items={exerciseNames} />
  );
}

function renderBestLift(bestLift: SessionSummary["bestLift"]) {
  return (
    <DetailSectionBlock
      title="Best"
      items={bestLift ? [`${bestLift.exerciseName} | ${bestLift.display}`] : ["No best lift recorded in this session."]}
      tone={bestLift ? "primary" : "muted"}
    />
  );
}

function renderProgressionSummary(session: SessionSummary) {
  const summary = session.progressionSummary;
  if (!summary || summary.eventCount === 0) {
    return null;
  }

  const items = [
    summary.headline,
    summary.detail && summary.detail !== summary.headline ? summary.detail : null,
    summary.lastPromotionAt ? `Last promotion ${formatDateShort(summary.lastPromotionAt)}` : null,
  ].filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index);

  if (items.length === 0) {
    return null;
  }

  return (
    <DetailSectionBlock title="Progression" items={items} />
  );
}

export type HistorySessionDetailSection = DetailSectionListSection;
export type HistorySessionRecapItemMeta = {
  exerciseName: string;
  value?: string | null;
  meta?: string | null;
  signals?: Array<"pr" | "promotion" | "regression" | "watch">;
  tagLabels?: string[];
};

function renderHistorySessionDetailSections(sections: HistorySessionDetailSection[]) {
  return <DetailSectionBlocks sections={sections} />;
}

export function buildRecapOnlyHistorySessionDetailSections(
  session: SessionSummary,
  prExerciseNames: string[],
  recapItemMeta?: HistorySessionRecapItemMeta[],
): HistorySessionDetailSection[] {
  const prExerciseNameSet = new Set(prExerciseNames.map((name) => name.trim()).filter(Boolean));
  const progressionSummary = session.progressionSummary ?? null;
  const progressionExerciseNameSet = new Set((progressionSummary?.affectedExerciseNames ?? []).map((name) => name.trim()).filter(Boolean));
  const bestExerciseName = session.bestLift?.exerciseName?.trim() || null;
  const recapMetaByName = new Map<string, HistorySessionRecapItemMeta | SessionRecapSignal>();
  for (const item of (recapItemMeta ?? session.recapSignals ?? [])) {
    const normalizedName = item.exerciseName.trim();
    if (normalizedName) {
      recapMetaByName.set(normalizedName, item);
    }
  }
  const recapItems: DetailSectionListItem[] = (session.exerciseNames ?? [])
    .map((name, index): DetailSectionListItem | null => {
      const normalizedName = name.trim();
      if (!normalizedName) {
        return null;
      }

      const explicitMeta = recapMetaByName.get(normalizedName);
      const signals = explicitMeta?.signals?.length
        ? explicitMeta.signals.filter((value, signalIndex, values) => values.indexOf(value) === signalIndex)
        : [
            prExerciseNameSet.has(normalizedName) ? "pr" : null,
            progressionExerciseNameSet.has(normalizedName) && (progressionSummary?.promotionCount ?? 0) > 0 ? "promotion" : null,
            progressionExerciseNameSet.has(normalizedName) && (progressionSummary?.deloadCount ?? 0) > 0 ? "regression" : null,
            progressionExerciseNameSet.has(normalizedName) && ((progressionSummary?.manualChangeCount ?? 0) > 0 || (progressionSummary?.revertCount ?? 0) > 0) ? "watch" : null,
          ].filter((value, signalIndex, values): value is "pr" | "promotion" | "regression" | "watch" => Boolean(value) && values.indexOf(value) === signalIndex);
      const tagLabels = explicitMeta?.tagLabels?.length
        ? explicitMeta.tagLabels.filter((value, tagIndex, values) => Boolean(value) && values.indexOf(value) === tagIndex)
        : [
            bestExerciseName === normalizedName ? "BEST" : null,
          ].filter((value): value is string => Boolean(value));

      return {
        id: `session-recap-${index}`,
        primary: normalizedName,
        value: explicitMeta?.value ?? null,
        meta: explicitMeta?.meta ?? null,
        signals,
        tagLabels,
        layout: signals.length + tagLabels.length > 1 ? "single-column" : "auto",
      } satisfies DetailSectionListItem;
    })
    .filter((item): item is DetailSectionListItem => item !== null);

  return recapItems.length > 0
      ? [{
        title: "Recap",
        items: recapItems,
        layout: "inline",
      } satisfies HistorySessionDetailSection]
    : [];
}

function formatDateBadgeText(session: SessionSummary) {
  return formatDateShort(session.startedAt).toUpperCase();
}

function formatCompactCountBadge(count: number | null | undefined, label: string) {
  return typeof count === "number" && count > 0 ? `${count} ${label}` : null;
}

function buildSessionProgressionBadgeItems(session: SessionSummary) {
  const summary = session.progressionSummary ?? null;
  if (!summary || summary.eventCount <= 0) {
    return [];
  }

  const regressionCount = (summary.deloadCount ?? 0) + (summary.revertCount ?? 0);
  const knownProgressionCount = summary.promotionCount + regressionCount + (summary.watchCount ?? 0) + summary.manualChangeCount;

  return [
    formatCompactCountBadge(summary.promotionCount, "PROMO"),
    formatCompactCountBadge(regressionCount, "REG"),
    formatCompactCountBadge(summary.watchCount, "WATCH"),
    formatCompactCountBadge(summary.manualChangeCount, "MANUAL"),
    knownProgressionCount === 0 ? formatCompactCountBadge(summary.eventCount, "EVENT") : null,
  ].filter((item): item is string => Boolean(item));
}

function buildSessionCompactBadgeItems(session: SessionSummary, viewModel: HistorySessionCardViewModel) {
  const dateText = formatDateBadgeText(session);
  const prLabel = session.prCounts.total > 0
    ? `${session.prCounts.total} ${session.prCounts.total === 1 ? "PR" : "PRS"}`
    : null;
  const progressionLabels = buildSessionProgressionBadgeItems(session);
  const compactChipLabels = viewModel.compactChips
    .map((chip) => chip.label.trim())
    .filter(Boolean);

  return [dateText, prLabel, ...progressionLabels, ...compactChipLabels]
    .filter((item): item is string => Boolean(item?.trim()))
    .map((item) => item.toUpperCase())
    .filter((item, index, items) => items.indexOf(item) === index);
}

function renderDateMetaTag(value: string, className?: string) {
  return (
    <SignatureMetaTag className={className}>
      {value}
    </SignatureMetaTag>
  );
}

type HistorySessionCardProps = {
  session: SessionSummary;
  previousSession?: SessionSummary | null;
  selected?: boolean;
  viewMode: "compact" | "detailed";
  href?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  badgeText?: string;
  detailedMetrics?: Parameters<typeof MetricGrid>[0]["items"];
  prExerciseNames?: string[];
  detailedSections?: HistorySessionDetailSection[];
  detailedHeaderMode?: "default" | "hidden";
  showDetailedDivider?: boolean;
  tone?: CardSemanticTone;
  rightIcon?: ReactNode;
  className?: string;
  metricAccentRgb?: string | null;
};

export function HistorySessionCard({
  session,
  previousSession,
  selected = false,
  viewMode,
  href,
  title,
  subtitle,
  badgeText,
  detailedMetrics,
  prExerciseNames,
  detailedSections,
  detailedHeaderMode = "default",
  showDetailedDivider = true,
  tone,
  rightIcon,
  className,
  metricAccentRgb,
}: HistorySessionCardProps) {
  const viewModel = buildHistorySessionCardViewModel(session, previousSession);
  const compactBadgeItems = buildSessionCompactBadgeItems(session, viewModel);
  const compactBadgeKey = compactBadgeItems.join("|");
  const [compactBadgeIndex, setCompactBadgeIndex] = useState(0);
  const styles = densityStyles[viewMode];
  const resolvedTone = tone ?? viewModel.tone;
  const compactHeaderTextClassName = "text-[0.79rem] font-semibold leading-[1] tracking-[-0.01em]";
  const resolvedRightIcon = rightIcon === undefined
    ? (
      viewMode === "compact"
        ? null
        : defaultChevron
    )
    : rightIcon;
  const resolvedDetailedMetrics = detailedMetrics ?? viewModel.detailedMetrics;
  const resolvedPrExerciseNames = prExerciseNames ?? session.prExerciseNames ?? [];
  const resolvedDetailedSections = detailedSections ?? buildRecapOnlyHistorySessionDetailSections(session, resolvedPrExerciseNames);
  const usesHeaderlessDetailedLayout = viewMode === "detailed" && detailedHeaderMode === "hidden";
  const accentStyle = metricAccentRgb
    ? { ["--metric-accent-rgb" as string]: metricAccentRgb }
    : undefined;
  const resolvedCompactMetaItems = viewModel.compactChips.map((chip) => chip.label).filter(Boolean);
  const resolvedSubtitleItems = [viewModel.outcome, viewModel.progress].filter((item): item is string => Boolean(item));
  const resolvedDetailedSubtitle = viewMode === "detailed" ? undefined : (
    resolvedSubtitleItems.length > 0
      ? <HistoryMetaLine items={resolvedSubtitleItems} />
      : undefined
  );
  const resolvedSubtitle = subtitle ?? (
    resolvedDetailedSubtitle
  );
  const activeCompactBadge = compactBadgeItems[compactBadgeIndex] ?? compactBadgeItems[0] ?? formatDateBadgeText(session);

  useEffect(() => {
    setCompactBadgeIndex(0);

    if (viewMode !== "compact" || compactBadgeItems.length <= 1) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setCompactBadgeIndex((current) => (current + 1) % compactBadgeItems.length);
    }, 3200);

    return () => window.clearInterval(timer);
  }, [compactBadgeItems.length, compactBadgeKey, viewMode]);

  if (viewMode === "compact") {
    const compactContent = (
      <div
        className={cn(
          "relative w-full max-w-none overflow-hidden rounded-[1rem] bg-transparent px-[3px] py-[2px]",
          className,
        )}
        style={accentStyle}
      >
        <div
          className={cn(
            "relative rounded-[0.9rem] px-[13px] py-[3px] transition-colors",
            selected ? "bg-[rgb(var(--surface-1-rgb)/0.16)] hover:bg-[rgb(var(--surface-1-rgb)/0.16)]" : "bg-transparent hover:bg-[rgb(var(--surface-1-rgb)/0.1)]",
          )}
        >
          <div className="flex min-h-[30px] items-center">
            <div className={cn("w-full min-w-0 pl-px text-[rgb(var(--text)/1)]", compactHeaderTextClassName)}>
              {title ?? buildSessionCompactTitleText(session, { metaTagText: activeCompactBadge })}
            </div>
          </div>
          {resolvedCompactMetaItems.length > 0 ? (
            <div className="px-px pt-[2px] text-[rgb(var(--text-secondary)/0.86)]">
              <HistoryMetaLine items={resolvedCompactMetaItems} className="text-[10.5px] font-semibold tracking-[0.01em] text-inherit" />
            </div>
          ) : null}
          <div className="px-px pt-[3px]">
            <MetricAccentBar variant="compact" />
          </div>
        </div>
      </div>
    );

    if (!href) {
      return (
        <div data-history-card="session" data-history-density={viewMode}>
          {compactContent}
        </div>
      );
    }

    return (
      <Link
        href={href}
        aria-current={selected ? "page" : undefined}
        className={appTokens.historySessionLink}
        data-history-card="session"
        data-history-density={viewMode}
        style={accentStyle}
      >
        {compactContent}
      </Link>
    );
  }

  const supportingContent = (
    <div className={cn(styles.content, usesHeaderlessDetailedLayout ? "gap-2.5 pl-px" : "gap-2.5 pl-px pt-1")}>
      {viewMode === "detailed" ? (
        <>
          <div className={cn("pt-[0.45rem]", showDetailedDivider ? THIN_SECTION_TOP_DIVIDER_CLASS_NAME : undefined)}>
            <HistorySessionDetailedMetricGrid items={resolvedDetailedMetrics} />
          </div>
          {renderHistorySessionDetailSections(resolvedDetailedSections)}
        </>
      ) : null}
    </div>
  );

  if (usesHeaderlessDetailedLayout) {
    const headerlessContent = (
      <Glass
        variant="base"
        className={cn(
          "w-full max-w-none overflow-hidden rounded-[var(--card-radius)] border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-1-rgb)/0.88)] shadow-none",
          appTokens.historyExerciseCardShell,
          className,
        )}
        style={accentStyle}
      >
        <div className="relative px-[0.92rem] py-[0.88rem]">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-px left-px top-px w-[4px] rounded-r-full bg-[linear-gradient(180deg,rgb(var(--metric-accent-rgb)/0.96),rgb(var(--metric-accent-rgb)/0.58))]"
          />
          {supportingContent}
        </div>
      </Glass>
    );

    if (!href) {
      return (
        <div data-history-card="session" data-history-density={viewMode}>
          {headerlessContent}
        </div>
      );
    }

    return (
      <Link
        href={href}
        aria-current={selected ? "page" : undefined}
        className={appTokens.historySessionLink}
        data-history-card="session"
        data-history-density={viewMode}
        style={accentStyle}
      >
        {headerlessContent}
      </Link>
    );
  }

  const content = (
    <ExerciseCard
      title={title ?? buildSessionTitleText(session)}
      subtitle={resolvedSubtitle}
      subtitleLabel={resolvedSubtitle ? "Recap" : undefined}
      subtitleTone="plain"
      semanticTone={resolvedTone}
      density={viewMode}
      variant={styles.variant}
      rightIcon={resolvedRightIcon}
      rightIconMode="overlay"
      titleContainerClassName="pr-[2.7rem] space-y-0.5"
      trailingStackClassName="h-4.5 w-4.5"
      rightRailClassName="right-[0.85rem] top-1/2 -translate-y-1/2"
      className={cn(
        "shadow-none",
        appTokens.historyExerciseCardShell,
        selected ? appTokens.historySessionSelected : undefined,
        className,
      )}
      shellStyle={accentStyle}
      titleClassName="line-clamp-none [text-wrap:pretty]"
      subtitleClassName="pt-px [text-wrap:pretty] text-[rgb(var(--text-secondary)/0.9)]"
    >
      {supportingContent}
    </ExerciseCard>
  );

  if (!href) {
    return (
      <div data-history-card="session" data-history-density={viewMode}>
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      aria-current={selected ? "page" : undefined}
      className={appTokens.historySessionLink}
      data-history-card="session"
      data-history-density={viewMode}
    >
      {content}
    </Link>
  );
}
