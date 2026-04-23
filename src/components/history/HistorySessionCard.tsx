"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { SessionSummary } from "@/app/history/session-summary";
import { ExerciseCard, type ExerciseCardVariant } from "@/components/ExerciseCard";
import { type CardSemanticTone } from "@/components/cardSemanticTones";
import { ChevronRightIcon } from "@/components/ui/Chevrons";
import { MetricStrip, type MetricDatum } from "@/components/ui/MetricItem";
import { appTokens } from "@/components/ui/app/tokens";
import { WorkoutCardChipRow } from "@/components/workout/WorkoutCardChipRow";
import { cn } from "@/lib/cn";
import { formatDateShort, formatDurationShort } from "@/lib/formatting";
import { buildHistorySessionCardViewModel } from "@/lib/workout-card-view-models";

const defaultChevron = <ChevronRightIcon className="h-5 w-5 text-[rgb(var(--text-muted)/0.92)]" />;

const densityStyles: Record<"compact" | "detailed", {
  content: string;
  summary: string;
  detail: string;
  variant: ExerciseCardVariant;
}> = {
  compact: {
    content: appTokens.workoutCardContentCompact,
    summary: appTokens.workoutCardSummaryCompact,
    detail: appTokens.workoutCardDetailCompact,
    variant: "list",
  },
  detailed: {
    content: appTokens.workoutCardContentDetailed,
    summary: appTokens.workoutCardSummaryDetailed,
    detail: appTokens.workoutCardDetailDetailed,
    variant: "standard",
  },
};

function formatSummaryLine(session: SessionSummary) {
  const duration = session.durationSec ? formatDurationShort(session.durationSec) : "0m";
  return `${duration} | ${session.exerciseCount} ${session.exerciseCount === 1 ? "exercise" : "exercises"} | ${session.setCount} ${session.setCount === 1 ? "set" : "sets"}`;
}

function formatSubtitle(session: SessionSummary) {
  const dateLabel = formatDateShort(session.startedAt);
  return session.dayTitle ? `${session.dayTitle} | ${dateLabel}` : dateLabel;
}

type HistorySessionCardProps = {
  session: SessionSummary;
  previousSession?: SessionSummary | null;
  selected?: boolean;
  viewMode: "compact" | "detailed";
  href?: string;
  title?: string;
  subtitle?: ReactNode;
  badgeText?: string;
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
  tone,
  rightIcon,
  className,
}: HistorySessionCardProps) {
  const viewModel = buildHistorySessionCardViewModel(session, previousSession);
  const styles = densityStyles[viewMode];
  const resolvedRightIcon = rightIcon === undefined ? defaultChevron : rightIcon;
  const detail = viewMode === "detailed" ? (viewModel.progress ?? formatSummaryLine(session)) : undefined;
  const supportingContent = (
    <div className={styles.content}>
      <p className={cn("[text-wrap:pretty]", styles.summary)}>{viewModel.outcome}</p>
      {detail ? <p className={cn("[text-wrap:pretty]", styles.detail)}>{detail}</p> : null}
      {viewMode === "detailed" ? (
        <MetricStrip items={viewModel.detailedMetrics as MetricDatum[]} />
      ) : (
        <WorkoutCardChipRow chips={viewModel.compactChips} />
      )}
    </div>
  );
  const content = (
    <ExerciseCard
      title={title ?? session.routineTitle ?? "Unknown routine"}
      subtitle={subtitle ?? formatSubtitle(session)}
      subtitleLabel={subtitle === null ? undefined : "Session"}
      badgeText={badgeText ?? (session.prCounts.total > 0 ? `${session.prCounts.total} PR` : undefined)}
      semanticTone={tone ?? viewModel.tone}
      density={viewMode}
      variant={styles.variant}
      rightIcon={resolvedRightIcon}
      className={cn(
        "shadow-none",
        appTokens.historyExerciseCardShell,
        selected ? appTokens.historySessionSelected : undefined,
        className,
      )}
      titleClassName="[text-wrap:pretty]"
      subtitleClassName="[text-wrap:pretty]"
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
