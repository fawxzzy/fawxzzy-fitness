"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { SessionSummary } from "@/app/history/session-summary";
import { ExerciseCard, type ExerciseCardVariant } from "@/components/ExerciseCard";
import { type CardSemanticTone } from "@/components/cardSemanticTones";
import { Glass } from "@/components/ui/Glass";
import { ChevronRightIcon } from "@/components/ui/Chevrons";
import { MetricAccentBar, type MetricDatum, MetricGrid, SurfaceMetricGrid } from "@/components/ui/MetricItem";
import { SignatureDot, SignatureMetaTag, SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
import { appTokens } from "@/components/ui/app/tokens";
import { HistoryMetaLine } from "@/components/history/HistoryMetaLine";
import { cn } from "@/lib/cn";
import { formatDateShort } from "@/lib/formatting";
import { buildHistorySessionCardViewModel } from "@/lib/workout-card-view-models";

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

const THIN_SECTION_TOP_DIVIDER_CLASS_NAME = "bg-[linear-gradient(90deg,rgb(var(--metric-accent-rgb)/0.14),rgb(var(--metric-accent-rgb)/0.85),rgb(var(--metric-accent-rgb)/0.14))] bg-[length:100%_1px] bg-no-repeat [background-position:0_0]";

function HistorySessionDetailedMetricGrid({ items }: { items: MetricDatum[] }) {
  return <SurfaceMetricGrid items={items} />;
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
  { showChevron = true, centeredTitle = false }: { showChevron?: boolean; centeredTitle?: boolean } = {},
) {
  const { weekday, routineTitle, dayTitle } = buildSessionTitleParts(session);
  const dateText = formatDateBadgeText(session);
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
    <div className={cn("w-full space-y-1.5 pt-[0.45rem]", THIN_SECTION_TOP_DIVIDER_CLASS_NAME)}>
      <div className="w-full space-y-1">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.92)]">
          PRs
        </p>
        {renderHistorySessionSectionItems(
          exerciseNames.length > 0 ? exerciseNames : ["No PRs recorded in this session."],
          exerciseNames.length > 0 ? "primary" : "muted",
        )}
      </div>
    </div>
  );
}

function renderSessionExerciseRecap(exerciseNames: string[]) {
  if (exerciseNames.length === 0) {
    return null;
  }

  return (
    <div className={cn("w-full space-y-1.5 pt-[0.45rem]", THIN_SECTION_TOP_DIVIDER_CLASS_NAME)}>
      <div className="w-full space-y-1">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.92)]">
          Recap
        </p>
        {renderHistorySessionSectionItems(exerciseNames)}
      </div>
    </div>
  );
}

function renderBestLift(bestLift: SessionSummary["bestLift"]) {
  return (
    <div className={cn("w-full space-y-1.5 pt-[0.45rem]", THIN_SECTION_TOP_DIVIDER_CLASS_NAME)}>
      <div className="w-full space-y-1">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.92)]">
          Best
        </p>
        {renderHistorySessionSectionItems(
          bestLift ? [`${bestLift.exerciseName} | ${bestLift.display}`] : ["No best lift recorded in this session."],
          bestLift ? "primary" : "muted",
        )}
      </div>
    </div>
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
    <div className={cn("w-full space-y-1.5 pt-[0.45rem]", THIN_SECTION_TOP_DIVIDER_CLASS_NAME)}>
      <div className="w-full space-y-1">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.92)]">
          Progression
        </p>
        {renderHistorySessionSectionItems(items)}
      </div>
    </div>
  );
}

export type HistorySessionDetailSection = {
  title: string;
  items: string[];
};

function renderHistorySessionSectionItems(
  items: string[],
  tone: "primary" | "muted" = "primary",
) {
  const shouldUseTwoColumnGrid = items.length > 1;

  return (
    <div className={cn(shouldUseTwoColumnGrid ? "grid grid-cols-2 gap-x-3 gap-y-1.5 pl-px" : "space-y-1.5 pl-px")}>
      {items.map((item, index) => {
        const normalizedItem = item.trim();
        const shouldSpanFullWidth = !shouldUseTwoColumnGrid
          || normalizedItem.length > 30
          || normalizedItem.includes("|")
          || normalizedItem.includes(":");

        return (
        <div
          key={`${item}-${index}`}
          className={cn(
            "flex min-w-0 items-start gap-2.5",
            shouldSpanFullWidth ? "col-span-2" : "col-span-1",
          )}
        >
          <div className="flex h-[1.05rem] shrink-0 items-center pt-[0.08rem]">
            <SignatureDot />
          </div>
          <span
            className={cn(
              appTokens.workoutCardDetailCompact,
              "min-w-0 flex-1 text-[12.5px] leading-[1.28] [text-wrap:pretty]",
              tone === "muted" ? "text-[rgb(var(--text-secondary)/0.9)]" : "text-[rgb(var(--text-primary)/0.95)]",
            )}
          >
            {item}
          </span>
        </div>
      )})}
    </div>
  );
}

function renderHistorySessionDetailSections(sections: HistorySessionDetailSection[]) {
  return sections.map((section) => {
    if (!section || typeof section.title !== "string" || !Array.isArray(section.items)) {
      return null;
    }

    const items = section.items.filter(Boolean);
    if (items.length === 0) {
      return null;
    }

    return (
      <div key={section.title} className={cn("w-full space-y-1.5 pt-[0.45rem]", THIN_SECTION_TOP_DIVIDER_CLASS_NAME)}>
        <div className="w-full space-y-1">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.92)]">
            {section.title}
          </p>
          {renderHistorySessionSectionItems(items)}
        </div>
      </div>
    );
  });
}

function buildDefaultHistorySessionDetailSections(session: SessionSummary, prExerciseNames: string[]) {
  return [
    ...(
      session.progressionSummary?.eventCount
        ? [{
            title: "Progression",
            items: [
              session.progressionSummary.headline,
              session.progressionSummary.detail && session.progressionSummary.detail !== session.progressionSummary.headline
                ? session.progressionSummary.detail
                : null,
              session.progressionSummary.lastPromotionAt ? `Last promotion ${formatDateShort(session.progressionSummary.lastPromotionAt)}` : null,
            ].filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index),
          }]
        : []
    ),
    ...(session.exerciseNames?.length
      ? [{
          title: "Recap",
          items: session.exerciseNames,
        }]
      : []),
    {
      title: "PRs",
      items: prExerciseNames.length > 0
        ? prExerciseNames
        : ["No PRs recorded in this session."],
    },
    {
      title: "Best",
      items: session.bestLift
        ? [`${session.bestLift.exerciseName} | ${session.bestLift.display}`]
        : ["No best lift recorded in this session."],
    },
  ];
}

function formatDateBadgeText(session: SessionSummary) {
  return formatDateShort(session.startedAt).toUpperCase();
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
  const resolvedDetailedSections = detailedSections ?? buildDefaultHistorySessionDetailSections(session, resolvedPrExerciseNames);
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
              {title ?? buildSessionCompactTitleText(session)}
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
      style={accentStyle}
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
