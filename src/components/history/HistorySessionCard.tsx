"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { SessionSummary } from "@/app/history/session-summary";
import { ExerciseCard, type ExerciseCardVariant } from "@/components/ExerciseCard";
import { type CardSemanticTone } from "@/components/cardSemanticTones";
import { Glass } from "@/components/ui/Glass";
import { ChevronRightIcon } from "@/components/ui/Chevrons";
import { MetricAccentBar, type MetricDatum, MetricGrid } from "@/components/ui/MetricItem";
import { SignatureDot, SignatureMetaTag, SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
import { appTokens } from "@/components/ui/app/tokens";
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

function HistorySessionDetailedMetricGrid({ items }: { items: MetricDatum[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-6 gap-1.25">
      {items.map((item, index) => (
        <div
          key={`${item.label}-${item.value}-${index}`}
          className={cn(
            getAutoMetricSpanClassName(items.length, index),
            appTokens.workoutMetricChrome,
            appTokens.workoutMetricCompact,
            "flex min-h-[2.8rem] flex-col items-center justify-start overflow-hidden border-transparent bg-[linear-gradient(90deg,rgb(var(--metric-accent-rgb)/0.14),rgb(var(--metric-accent-rgb)/0.85),rgb(var(--metric-accent-rgb)/0.14))] bg-[length:100%_1px] bg-no-repeat [background-position:0_100%] px-2.75 py-1 shadow-none ring-0 backdrop-blur-0",
          )}
        >
          <p className="block w-full px-px pt-px text-center text-[10px] font-semibold leading-[1.02] tracking-[0.03em] text-[rgb(var(--accent-divider-rgb)/0.92)]">
            {item.label}
          </p>
          <div className="mt-[2px] flex w-full min-h-0 justify-center self-start pb-[0.7rem]">
            <div className="flex w-fit min-w-0 max-w-full flex-col items-center justify-start text-center">
              <p className={cn(appTokens.workoutMetricValue, appTokens.workoutMetricValueCompact, "mt-0 block px-px leading-[0.98] text-[rgb(var(--text-primary)/0.96)]")}>
                {item.value}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
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
          {weekday ? (
            <span className="inline-flex shrink-0 items-center gap-2">
              <span className="text-[rgb(var(--accent-divider-rgb)/0.96)]">{weekday}</span>
              {dayTitle ? <SignatureDot /> : null}
            </span>
          ) : null}
          {dayTitle ? <span className="min-w-0 shrink truncate">{dayTitle}</span> : null}
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
            {weekday ? (
              <>
                <span className="text-[rgb(var(--accent-divider-rgb)/0.96)]">{weekday}</span>
                {dayTitle ? (
                  <span className="mx-2 inline-flex align-middle">
                    <SignatureDot />
                  </span>
                ) : null}
              </>
            ) : null}
            {dayTitle ? <span>{dayTitle}</span> : null}
          </>
        ) : null}
      <span className="block clear-both h-0" />
    </span>
  );
}

function renderPrExerciseList(exerciseNames: string[]) {
  if (exerciseNames.length === 0) {
    return null;
  }

  return (
    <div className={cn("w-full space-y-1.5 pt-[0.45rem]", THIN_SECTION_TOP_DIVIDER_CLASS_NAME)}>
      <div className="w-full space-y-1">
        <p className={cn(appTokens.workoutMetricLabel, "px-px text-left text-[rgb(var(--accent-divider-rgb)/0.92)]")}>PRs</p>
        <div className="flex w-full flex-wrap items-center gap-x-2.5 gap-y-1.5 pl-px">
          {exerciseNames.map((exerciseName, index) => (
            <div key={`${exerciseName}-${index}`} className="inline-flex min-w-0 items-center gap-2">
              {index > 0 ? <SignatureDot /> : null}
              <span className={cn(appTokens.workoutCardDetailCompact, "text-[rgb(var(--text-primary)/0.95)]")}>{exerciseName}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
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
  detailedHeaderMode?: "default" | "hidden";
  showDetailedDivider?: boolean;
  tone?: CardSemanticTone;
  rightIcon?: ReactNode;
  className?: string;
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
  detailedHeaderMode = "default",
  showDetailedDivider = true,
  tone,
  rightIcon,
  className,
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
  const usesHeaderlessDetailedLayout = viewMode === "detailed" && detailedHeaderMode === "hidden";

  if (viewMode === "compact") {
    const compactContent = (
      <div
        className={cn(
          "relative w-full max-w-none overflow-hidden rounded-[1rem] bg-transparent px-[0.2rem] py-[0.12rem]",
          className,
        )}
      >
        <div
          className={cn(
            "relative rounded-[0.9rem] px-[0.8rem] py-[0.18rem] transition-colors",
            selected ? "bg-[rgb(var(--surface-1-rgb)/0.16)]" : "bg-transparent hover:bg-[rgb(var(--surface-1-rgb)/0.1)]",
          )}
        >
          <div className="flex min-h-[1.84rem] items-center">
            <div className={cn("w-full min-w-0 pl-px text-[rgb(var(--text)/1)]", compactHeaderTextClassName)}>
              {title ?? buildSessionCompactTitleText(session)}
            </div>
          </div>
          <MetricAccentBar variant="thin" className="opacity-85" />
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
          {renderPrExerciseList(resolvedPrExerciseNames)}
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
      >
        {headerlessContent}
      </Link>
    );
  }

  const content = (
    <ExerciseCard
      title={title ?? buildSessionTitleText(session)}
      subtitle={subtitle}
      subtitleLabel={undefined}
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
