"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { SessionSummary } from "@/app/history/session-summary";
import { ExerciseCard, type ExerciseCardVariant } from "@/components/ExerciseCard";
import { cardAccentRailClassNames, cardShellToneClassNames, type CardSemanticTone } from "@/components/cardSemanticTones";
import { Glass } from "@/components/ui/Glass";
import { ChevronRightIcon } from "@/components/ui/Chevrons";
import { MetricGrid } from "@/components/ui/MetricItem";
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
              <span className="text-[rgb(var(--accent)/0.96)]">{weekday}</span>
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
          {renderDateMetaTag(dateText, "text-[8px] tracking-[0.12em]")}
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
        {renderDateMetaTag(dateText, "text-[8px] tracking-[0.12em]")}
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
  const dateTag = renderDateMetaTag(dateText, "text-[8px] tracking-[0.12em]");
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
                <span className="text-[rgb(var(--accent)/0.96)]">{weekday}</span>
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
    <div className="w-full space-y-1.5 pt-0.5">
      <div className="h-px w-full bg-[linear-gradient(90deg,rgba(71,215,196,0),rgba(71,215,196,0.92),rgba(71,215,196,0))]" />
      <div className="w-full space-y-1">
        <p className={cn(appTokens.workoutMetricLabel, "px-px text-left text-[rgb(var(--accent)/0.92)]")}>PRs</p>
        <div className="flex w-full flex-wrap items-center gap-x-2.5 gap-y-1.5 pl-px">
          {exerciseNames.map((exerciseName, index) => (
            <div key={`${exerciseName}-${index}`} className="inline-flex min-w-0 items-center gap-2">
              {index > 0 ? <span aria-hidden="true" className="h-[4px] w-[4px] shrink-0 rounded-full bg-[rgb(var(--accent)/0.9)]" /> : null}
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
      <Glass
        variant="base"
        className={cn(
          "w-full max-w-none overflow-hidden rounded-[var(--card-radius)] border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-1-rgb)/0.88)] shadow-none",
          appTokens.historyExerciseCardShell,
          cardShellToneClassNames[resolvedTone],
          selected ? appTokens.historySessionSelected : undefined,
          className,
        )}
      >
        <div
          className="relative flex min-h-[1.84rem] items-center px-[0.8rem] py-[0.12rem]"
        >
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute bottom-px left-px top-px w-[4px] rounded-r-full",
              cardAccentRailClassNames[resolvedTone],
            )}
          />
          <div className={cn("w-full min-w-0 pl-px text-[rgb(var(--text)/1)]", compactHeaderTextClassName)}>
            {title ?? buildSessionCompactTitleText(session)}
          </div>
        </div>
      </Glass>
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
          {showDetailedDivider ? <div className="h-px w-full bg-[linear-gradient(90deg,rgba(71,215,196,0),rgba(71,215,196,0.92),rgba(71,215,196,0))]" /> : null}
          <MetricGrid
            items={resolvedDetailedMetrics}
            compact
            autoColumns
            className="gap-1.25"
            labelPlacement="top"
            labelClassName="text-[8.5px] tracking-[0.03em] text-[rgb(var(--accent)/0.92)]"
            itemClassName="min-h-[2.8rem] px-2.75 py-1"
          />
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
            className="pointer-events-none absolute bottom-px left-px top-px w-[4px] rounded-r-full bg-[linear-gradient(180deg,rgba(71,215,196,0.96),rgba(71,215,196,0.58))]"
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
